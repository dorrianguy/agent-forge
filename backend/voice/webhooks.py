"""
Webhooks Manager for Agent Forge Voice

Handles webhook registration and delivery for voice events with retry logic,
HMAC signing, and delivery tracking.
"""

import asyncio
import hmac
import hashlib
import logging
import uuid
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
from typing import Dict, List, Optional, Any
import aiohttp
import json
from threading import Lock

logger = logging.getLogger(__name__)


class WebhookEvent(str, Enum):
    """Voice webhook event types."""

    # Call lifecycle events
    CALL_STARTED = "call.started"
    CALL_ENDED = "call.ended"
    CALL_ANALYZED = "call.analyzed"

    # Transcript events
    TRANSCRIPT_READY = "transcript.ready"
    TRANSCRIPT_PARTIAL = "transcript.partial"

    # Function execution events
    FUNCTION_CALLED = "function.called"

    # Detection events
    VOICEMAIL_DETECTED = "voicemail.detected"

    # Transfer events
    TRANSFER_INITIATED = "transfer.initiated"
    TRANSFER_COMPLETED = "transfer.completed"

    # Campaign events
    CAMPAIGN_STARTED = "campaign.started"
    CAMPAIGN_COMPLETED = "campaign.completed"

    # SMS events
    SMS_RECEIVED = "sms.received"
    SMS_SENT = "sms.sent"


@dataclass
class VoiceWebhook:
    """Voice webhook configuration."""

    id: str
    user_id: str
    url: str
    events: List[WebhookEvent]
    secret: str
    is_active: bool = True
    last_delivery_at: Optional[datetime] = None
    failure_count: int = 0
    created_at: datetime = field(default_factory=datetime.utcnow)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "id": self.id,
            "user_id": self.user_id,
            "url": self.url,
            "events": [e.value for e in self.events],
            "is_active": self.is_active,
            "last_delivery_at": self.last_delivery_at.isoformat() if self.last_delivery_at else None,
            "failure_count": self.failure_count,
            "created_at": self.created_at.isoformat(),
        }


@dataclass
class WebhookDelivery:
    """Webhook delivery record."""

    id: str
    webhook_id: str
    event_type: WebhookEvent
    payload: Dict[str, Any]
    status: str  # pending/delivered/failed
    response_status_code: Optional[int] = None
    response_body: Optional[str] = None
    attempts: int = 0
    created_at: datetime = field(default_factory=datetime.utcnow)
    delivered_at: Optional[datetime] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            "id": self.id,
            "webhook_id": self.webhook_id,
            "event_type": self.event_type.value,
            "payload": self.payload,
            "status": self.status,
            "response_status_code": self.response_status_code,
            "response_body": self.response_body,
            "attempts": self.attempts,
            "created_at": self.created_at.isoformat(),
            "delivered_at": self.delivered_at.isoformat() if self.delivered_at else None,
        }


class VoiceWebhookManager:
    """
    Manager for voice webhooks with delivery tracking and retry logic.

    Features:
    - Webhook registration and management
    - HMAC-SHA256 payload signing
    - Async delivery with retry logic
    - Exponential backoff for failed deliveries
    - Delivery history tracking
    """

    # Retry configuration
    MAX_RETRIES = 5
    INITIAL_RETRY_DELAY = 1  # seconds
    MAX_RETRY_DELAY = 300  # 5 minutes
    RETRY_MULTIPLIER = 2

    # Webhook configuration
    TIMEOUT_SECONDS = 30
    MAX_FAILURES_BEFORE_DISABLE = 10

    def __init__(self):
        """Initialize the webhook manager."""
        self._webhooks: Dict[str, VoiceWebhook] = {}
        self._deliveries: Dict[str, WebhookDelivery] = {}
        self._lock = Lock()
        self._retry_task: Optional[asyncio.Task] = None
        self._session: Optional[aiohttp.ClientSession] = None

        logger.info("VoiceWebhookManager initialized")

    async def __aenter__(self):
        """Async context manager entry."""
        await self._ensure_session()
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """Async context manager exit."""
        await self._close_session()

    async def _ensure_session(self):
        """Ensure aiohttp session exists."""
        if self._session is None or self._session.closed:
            self._session = aiohttp.ClientSession()

    async def _close_session(self):
        """Close aiohttp session."""
        if self._session and not self._session.closed:
            await self._session.close()
            self._session = None

    def register_webhook(
        self,
        user_id: str,
        url: str,
        events: List[WebhookEvent],
        secret: Optional[str] = None
    ) -> VoiceWebhook:
        """
        Register a new webhook.

        Args:
            user_id: User ID
            url: Webhook URL
            events: List of events to subscribe to
            secret: Optional secret for HMAC signing (auto-generated if not provided)

        Returns:
            VoiceWebhook: Created webhook
        """
        webhook_id = str(uuid.uuid4())

        # Generate secret if not provided
        if secret is None:
            secret = self._generate_secret()

        webhook = VoiceWebhook(
            id=webhook_id,
            user_id=user_id,
            url=url,
            events=events,
            secret=secret
        )

        with self._lock:
            self._webhooks[webhook_id] = webhook

        logger.info(f"Registered webhook {webhook_id} for user {user_id} with {len(events)} events")

        return webhook

    def update_webhook(
        self,
        webhook_id: str,
        url: Optional[str] = None,
        events: Optional[List[WebhookEvent]] = None,
        is_active: Optional[bool] = None
    ) -> Optional[VoiceWebhook]:
        """
        Update an existing webhook.

        Args:
            webhook_id: Webhook ID
            url: New URL (optional)
            events: New events list (optional)
            is_active: New active status (optional)

        Returns:
            Updated webhook or None if not found
        """
        with self._lock:
            webhook = self._webhooks.get(webhook_id)

            if webhook is None:
                logger.warning(f"Webhook {webhook_id} not found for update")
                return None

            if url is not None:
                webhook.url = url

            if events is not None:
                webhook.events = events

            if is_active is not None:
                webhook.is_active = is_active
                if is_active:
                    # Reset failure count when re-enabling
                    webhook.failure_count = 0

        logger.info(f"Updated webhook {webhook_id}")

        return webhook

    def delete_webhook(self, webhook_id: str) -> bool:
        """
        Delete a webhook.

        Args:
            webhook_id: Webhook ID

        Returns:
            True if deleted, False if not found
        """
        with self._lock:
            if webhook_id in self._webhooks:
                del self._webhooks[webhook_id]
                logger.info(f"Deleted webhook {webhook_id}")
                return True

        logger.warning(f"Webhook {webhook_id} not found for deletion")
        return False

    def list_webhooks(self, user_id: str) -> List[VoiceWebhook]:
        """
        List all webhooks for a user.

        Args:
            user_id: User ID

        Returns:
            List of webhooks
        """
        with self._lock:
            webhooks = [
                webhook for webhook in self._webhooks.values()
                if webhook.user_id == user_id
            ]

        return webhooks

    async def deliver_webhook(
        self,
        user_id: str,
        event_type: WebhookEvent,
        payload: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Deliver a webhook event to all matching webhooks.

        Args:
            user_id: User ID
            event_type: Event type
            payload: Event payload

        Returns:
            Dict with delivery status for each webhook
        """
        await self._ensure_session()

        # Find matching webhooks
        matching_webhooks = []
        with self._lock:
            for webhook in self._webhooks.values():
                if (webhook.user_id == user_id and
                    webhook.is_active and
                    event_type in webhook.events):
                    matching_webhooks.append(webhook)

        if not matching_webhooks:
            logger.debug(f"No active webhooks found for user {user_id} and event {event_type.value}")
            return {"delivered": 0, "failed": 0, "deliveries": []}

        # Deliver to all matching webhooks
        delivery_tasks = [
            self._deliver_single(webhook, event_type, payload)
            for webhook in matching_webhooks
        ]

        deliveries = await asyncio.gather(*delivery_tasks, return_exceptions=True)

        # Count results
        delivered = sum(1 for d in deliveries if isinstance(d, WebhookDelivery) and d.status == "delivered")
        failed = sum(1 for d in deliveries if isinstance(d, WebhookDelivery) and d.status == "failed")
        errors = sum(1 for d in deliveries if isinstance(d, Exception))

        logger.info(
            f"Delivered webhook event {event_type.value} for user {user_id}: "
            f"{delivered} delivered, {failed} failed, {errors} errors"
        )

        return {
            "delivered": delivered,
            "failed": failed + errors,
            "deliveries": [d.to_dict() for d in deliveries if isinstance(d, WebhookDelivery)]
        }

    async def _deliver_single(
        self,
        webhook: VoiceWebhook,
        event_type: WebhookEvent,
        payload: Dict[str, Any]
    ) -> WebhookDelivery:
        """
        Deliver a webhook to a single endpoint.

        Args:
            webhook: Webhook configuration
            event_type: Event type
            payload: Event payload

        Returns:
            WebhookDelivery record
        """
        delivery_id = str(uuid.uuid4())

        # Prepare payload
        full_payload = {
            "id": str(uuid.uuid4()),
            "event": event_type.value,
            "timestamp": datetime.utcnow().isoformat(),
            "data": payload
        }

        # Create delivery record
        delivery = WebhookDelivery(
            id=delivery_id,
            webhook_id=webhook.id,
            event_type=event_type,
            payload=full_payload,
            status="pending"
        )

        with self._lock:
            self._deliveries[delivery_id] = delivery

        # Attempt delivery
        try:
            success = await self._attempt_delivery(webhook, delivery, full_payload)

            if success:
                delivery.status = "delivered"
                delivery.delivered_at = datetime.utcnow()

                with self._lock:
                    webhook.last_delivery_at = delivery.delivered_at
                    webhook.failure_count = 0
            else:
                delivery.status = "failed"

                with self._lock:
                    webhook.failure_count += 1

                    # Disable webhook if too many failures
                    if webhook.failure_count >= self.MAX_FAILURES_BEFORE_DISABLE:
                        webhook.is_active = False
                        logger.warning(
                            f"Disabled webhook {webhook.id} after {webhook.failure_count} failures"
                        )

        except Exception as e:
            logger.error(f"Error delivering webhook {webhook.id}: {e}")
            delivery.status = "failed"
            delivery.response_body = str(e)

            with self._lock:
                webhook.failure_count += 1

        return delivery

    async def _attempt_delivery(
        self,
        webhook: VoiceWebhook,
        delivery: WebhookDelivery,
        payload: Dict[str, Any]
    ) -> bool:
        """
        Attempt to deliver a webhook with retries.

        Args:
            webhook: Webhook configuration
            delivery: Delivery record
            payload: Event payload

        Returns:
            True if delivered successfully
        """
        payload_bytes = json.dumps(payload).encode('utf-8')
        signature = self.sign_payload(payload_bytes, webhook.secret)

        headers = {
            "Content-Type": "application/json",
            "X-Webhook-Signature": signature,
            "X-Webhook-ID": webhook.id,
            "User-Agent": "AgentForge-Voice/1.0"
        }

        delay = self.INITIAL_RETRY_DELAY

        for attempt in range(1, self.MAX_RETRIES + 1):
            delivery.attempts = attempt

            try:
                async with self._session.post(
                    webhook.url,
                    data=payload_bytes,
                    headers=headers,
                    timeout=aiohttp.ClientTimeout(total=self.TIMEOUT_SECONDS)
                ) as response:
                    delivery.response_status_code = response.status
                    delivery.response_body = await response.text()

                    if 200 <= response.status < 300:
                        logger.info(
                            f"Webhook {webhook.id} delivered successfully on attempt {attempt}"
                        )
                        return True
                    else:
                        logger.warning(
                            f"Webhook {webhook.id} delivery failed with status {response.status} "
                            f"on attempt {attempt}"
                        )

            except asyncio.TimeoutError:
                logger.warning(f"Webhook {webhook.id} delivery timed out on attempt {attempt}")
                delivery.response_body = "Request timed out"

            except Exception as e:
                logger.warning(f"Webhook {webhook.id} delivery error on attempt {attempt}: {e}")
                delivery.response_body = str(e)

            # Retry with exponential backoff
            if attempt < self.MAX_RETRIES:
                await asyncio.sleep(delay)
                delay = min(delay * self.RETRY_MULTIPLIER, self.MAX_RETRY_DELAY)

        logger.error(f"Webhook {webhook.id} delivery failed after {self.MAX_RETRIES} attempts")
        return False

    def sign_payload(self, payload: bytes, secret: str) -> str:
        """
        Sign a payload using HMAC-SHA256.

        Args:
            payload: Payload bytes
            secret: Secret key

        Returns:
            Hex-encoded signature
        """
        signature = hmac.new(
            secret.encode('utf-8'),
            payload,
            hashlib.sha256
        ).hexdigest()

        return signature

    def verify_signature(self, payload: bytes, signature: str, secret: str) -> bool:
        """
        Verify a webhook signature.

        Args:
            payload: Payload bytes
            signature: Provided signature
            secret: Secret key

        Returns:
            True if signature is valid
        """
        expected_signature = self.sign_payload(payload, secret)
        return hmac.compare_digest(signature, expected_signature)

    async def _retry_failed_deliveries(self):
        """
        Background task to retry failed webhook deliveries.

        Runs periodically to retry deliveries that failed due to transient errors.
        """
        logger.info("Starting webhook retry background task")

        while True:
            try:
                # Wait between retry cycles
                await asyncio.sleep(60)  # Check every minute

                failed_deliveries = []

                with self._lock:
                    # Find deliveries that need retry
                    for delivery in self._deliveries.values():
                        if (delivery.status == "failed" and
                            delivery.attempts < self.MAX_RETRIES):

                            # Only retry if not too old (1 hour)
                            age = datetime.utcnow() - delivery.created_at
                            if age < timedelta(hours=1):
                                failed_deliveries.append(delivery)

                if failed_deliveries:
                    logger.info(f"Retrying {len(failed_deliveries)} failed webhook deliveries")

                    for delivery in failed_deliveries:
                        webhook = self._webhooks.get(delivery.webhook_id)

                        if webhook and webhook.is_active:
                            try:
                                await self._attempt_delivery(
                                    webhook,
                                    delivery,
                                    delivery.payload
                                )
                            except Exception as e:
                                logger.error(f"Error retrying delivery {delivery.id}: {e}")

            except Exception as e:
                logger.error(f"Error in webhook retry task: {e}")

    def start_retry_task(self, loop: Optional[asyncio.AbstractEventLoop] = None):
        """
        Start the background retry task.

        Args:
            loop: Event loop (uses current loop if not provided)
        """
        if self._retry_task is not None:
            logger.warning("Retry task already running")
            return

        if loop is None:
            try:
                loop = asyncio.get_running_loop()
            except RuntimeError:
                loop = asyncio.new_event_loop()
                asyncio.set_event_loop(loop)

        self._retry_task = loop.create_task(self._retry_failed_deliveries())
        logger.info("Webhook retry task started")

    def stop_retry_task(self):
        """Stop the background retry task."""
        if self._retry_task is not None:
            self._retry_task.cancel()
            self._retry_task = None
            logger.info("Webhook retry task stopped")

    def get_delivery_history(
        self,
        webhook_id: str,
        limit: int = 100
    ) -> List[WebhookDelivery]:
        """
        Get delivery history for a webhook.

        Args:
            webhook_id: Webhook ID
            limit: Maximum number of deliveries to return

        Returns:
            List of deliveries, newest first
        """
        with self._lock:
            deliveries = [
                delivery for delivery in self._deliveries.values()
                if delivery.webhook_id == webhook_id
            ]

        # Sort by creation time, newest first
        deliveries.sort(key=lambda d: d.created_at, reverse=True)

        return deliveries[:limit]

    def get_webhook(self, webhook_id: str) -> Optional[VoiceWebhook]:
        """
        Get a webhook by ID.

        Args:
            webhook_id: Webhook ID

        Returns:
            Webhook or None if not found
        """
        with self._lock:
            return self._webhooks.get(webhook_id)

    def _generate_secret(self) -> str:
        """
        Generate a random webhook secret.

        Returns:
            Random hex string
        """
        return uuid.uuid4().hex + uuid.uuid4().hex  # 64 characters

    def get_stats(self, user_id: Optional[str] = None) -> Dict[str, Any]:
        """
        Get webhook statistics.

        Args:
            user_id: Optional user ID to filter by

        Returns:
            Statistics dictionary
        """
        with self._lock:
            webhooks = [
                w for w in self._webhooks.values()
                if user_id is None or w.user_id == user_id
            ]

            deliveries = [
                d for d in self._deliveries.values()
                if user_id is None or self._webhooks.get(d.webhook_id, {}).user_id == user_id
            ]

        total_webhooks = len(webhooks)
        active_webhooks = sum(1 for w in webhooks if w.is_active)

        total_deliveries = len(deliveries)
        successful_deliveries = sum(1 for d in deliveries if d.status == "delivered")
        failed_deliveries = sum(1 for d in deliveries if d.status == "failed")
        pending_deliveries = sum(1 for d in deliveries if d.status == "pending")

        return {
            "webhooks": {
                "total": total_webhooks,
                "active": active_webhooks,
                "inactive": total_webhooks - active_webhooks
            },
            "deliveries": {
                "total": total_deliveries,
                "delivered": successful_deliveries,
                "failed": failed_deliveries,
                "pending": pending_deliveries,
                "success_rate": (successful_deliveries / total_deliveries * 100)
                    if total_deliveries > 0 else 0
            }
        }


# Singleton instance
_webhook_manager_instance: Optional[VoiceWebhookManager] = None
_webhook_manager_lock = Lock()


def get_voice_webhook_manager() -> VoiceWebhookManager:
    """
    Get the singleton VoiceWebhookManager instance.

    Returns:
        VoiceWebhookManager instance
    """
    global _webhook_manager_instance

    if _webhook_manager_instance is None:
        with _webhook_manager_lock:
            if _webhook_manager_instance is None:
                _webhook_manager_instance = VoiceWebhookManager()

    return _webhook_manager_instance


# Example usage
if __name__ == "__main__":
    async def main():
        """Example usage of webhook manager."""
        manager = get_voice_webhook_manager()

        # Register a webhook
        webhook = manager.register_webhook(
            user_id="user123",
            url="https://example.com/webhooks/voice",
            events=[
                WebhookEvent.CALL_STARTED,
                WebhookEvent.CALL_ENDED,
                WebhookEvent.TRANSCRIPT_READY
            ]
        )

        print(f"Registered webhook: {webhook.id}")
        print(f"Secret: {webhook.secret}")

        # Deliver an event
        result = await manager.deliver_webhook(
            user_id="user123",
            event_type=WebhookEvent.CALL_STARTED,
            payload={
                "call_id": "call123",
                "from": "+1234567890",
                "to": "+0987654321",
                "timestamp": datetime.utcnow().isoformat()
            }
        )

        print(f"Delivery result: {result}")

        # Get delivery history
        history = manager.get_delivery_history(webhook.id)
        print(f"Delivery history: {len(history)} deliveries")

        # Get stats
        stats = manager.get_stats(user_id="user123")
        print(f"Stats: {stats}")

        await manager._close_session()

    asyncio.run(main())
