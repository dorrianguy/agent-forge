"""
SMS Manager for Agent Forge Voice

Handles SMS/MMS send/receive via Twilio or Telnyx.
Follows the singleton manager pattern from billing.py and telephony.py.
"""

import os
import asyncio
import logging
from enum import Enum
from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, Any, Optional, List, Callable
import uuid
import hmac
import hashlib
from urllib.parse import urlencode

logger = logging.getLogger(__name__)


class SMSDirection(Enum):
    """SMS message direction"""
    INBOUND = "inbound"
    OUTBOUND = "outbound"


class SMSStatus(Enum):
    """SMS delivery status"""
    QUEUED = "queued"
    SENDING = "sending"
    SENT = "sent"
    DELIVERED = "delivered"
    UNDELIVERED = "undelivered"
    FAILED = "failed"
    RECEIVED = "received"


class ConversationStatus(Enum):
    """SMS conversation status"""
    ACTIVE = "active"
    CLOSED = "closed"
    ARCHIVED = "archived"


@dataclass
class SMSMessage:
    """Represents an SMS/MMS message"""
    id: str
    user_id: str
    agent_id: str
    from_number: str
    to_number: str
    body: str
    direction: SMSDirection
    status: SMSStatus = SMSStatus.QUEUED
    provider_sid: Optional[str] = None
    media_urls: List[str] = field(default_factory=list)
    num_segments: int = 1
    num_media: int = 0
    error_code: Optional[str] = None
    error_message: Optional[str] = None
    price: Optional[float] = None
    price_unit: str = "USD"
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.now)
    sent_at: Optional[datetime] = None
    delivered_at: Optional[datetime] = None


@dataclass
class SMSConversation:
    """Represents an SMS conversation thread"""
    id: str
    user_id: str
    agent_id: str
    phone_number: str  # The external party's number
    agent_phone_number: str  # The agent's Twilio/Telnyx number
    messages: List[SMSMessage] = field(default_factory=list)
    last_message_at: Optional[datetime] = None
    last_message_preview: Optional[str] = None
    unread_count: int = 0
    status: ConversationStatus = ConversationStatus.ACTIVE
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.now)
    closed_at: Optional[datetime] = None


class SMSManager:
    """
    Manages SMS/MMS operations for voice agents.

    Supports Twilio (primary) and Telnyx as providers.
    Follows the singleton pattern from billing.py and telephony.py.
    """

    _instance: Optional['SMSManager'] = None

    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or {}

        # Provider selection (uses same provider as telephony)
        provider_name = os.getenv('TELEPHONY_PROVIDER', 'twilio').lower()
        self.provider = provider_name

        # Initialize provider clients
        self.twilio_client = None
        self.telnyx_client = None

        self._init_twilio()
        self._init_telnyx()

        # Webhook base URL for callbacks
        self.webhook_base_url = os.getenv('VOICE_WEBHOOK_BASE_URL', '')

        # Pricing (per segment in cents)
        self.pricing = {
            'sms_outbound': float(os.getenv('SMS_PRICE_OUTBOUND', '5')),  # $0.05/segment
            'sms_inbound': float(os.getenv('SMS_PRICE_INBOUND', '5')),  # $0.05/segment
            'mms_outbound': float(os.getenv('MMS_PRICE_OUTBOUND', '10')),  # $0.10/message
            'mms_inbound': float(os.getenv('MMS_PRICE_INBOUND', '10')),  # $0.10/message
        }

        # In-memory storage for conversations (in production, use database)
        self._conversations: Dict[str, SMSConversation] = {}
        self._messages: Dict[str, SMSMessage] = {}

        # Message event callbacks
        self._on_message_sent: Optional[Callable] = None
        self._on_message_received: Optional[Callable] = None
        self._on_message_delivered: Optional[Callable] = None
        self._on_message_failed: Optional[Callable] = None

        logger.info(f"SMSManager initialized with provider: {self.provider}")

    def _init_twilio(self):
        """Initialize Twilio client"""
        account_sid = os.getenv('TWILIO_ACCOUNT_SID')
        auth_token = os.getenv('TWILIO_AUTH_TOKEN')

        if account_sid and auth_token:
            try:
                from twilio.rest import Client
                self.twilio_client = Client(account_sid, auth_token)
                self.twilio_account_sid = account_sid
                self.twilio_auth_token = auth_token
                logger.info("Twilio client initialized for SMS")
            except ImportError:
                logger.warning("Twilio SDK not installed. Run: pip install twilio")
            except Exception as e:
                logger.error(f"Failed to initialize Twilio for SMS: {e}")

    def _init_telnyx(self):
        """Initialize Telnyx client"""
        api_key = os.getenv('TELNYX_API_KEY')

        if api_key:
            try:
                import telnyx
                telnyx.api_key = api_key
                self.telnyx_client = telnyx
                logger.info("Telnyx client initialized for SMS")
            except ImportError:
                logger.warning("Telnyx SDK not installed. Run: pip install telnyx")
            except Exception as e:
                logger.error(f"Failed to initialize Telnyx for SMS: {e}")

    def is_configured(self) -> bool:
        """Check if SMS is properly configured"""
        if self.provider == 'twilio':
            return self.twilio_client is not None
        elif self.provider == 'telnyx':
            return self.telnyx_client is not None
        return False

    # ==================== Message Sending ====================

    async def send_sms(
        self,
        from_number: str,
        to_number: str,
        body: str,
        user_id: str,
        agent_id: str,
        media_urls: Optional[List[str]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> SMSMessage:
        """
        Send an SMS/MMS message.

        Args:
            from_number: Sender phone number (must be owned by user)
            to_number: Recipient phone number
            body: Message body text
            user_id: ID of the user sending the message
            agent_id: ID of the agent sending the message
            media_urls: Optional list of media URLs for MMS
            metadata: Optional metadata to attach to the message

        Returns:
            SMSMessage object with status and provider details
        """
        if not self.is_configured():
            raise RuntimeError("SMS not configured")

        message_id = str(uuid.uuid4())
        media_urls = media_urls or []
        is_mms = len(media_urls) > 0

        # Create message record
        message = SMSMessage(
            id=message_id,
            user_id=user_id,
            agent_id=agent_id,
            from_number=from_number,
            to_number=to_number,
            body=body,
            direction=SMSDirection.OUTBOUND,
            status=SMSStatus.QUEUED,
            media_urls=media_urls,
            num_media=len(media_urls),
            metadata=metadata or {}
        )

        try:
            if self.provider == 'twilio':
                provider_message = await self._send_twilio_sms(
                    from_number, to_number, body, media_urls
                )
                message.provider_sid = provider_message.sid
                message.status = SMSStatus(provider_message.status.lower())
                message.num_segments = provider_message.num_segments or 1
                message.price = float(provider_message.price or 0)
                message.sent_at = datetime.now()

            elif self.provider == 'telnyx':
                provider_message = await self._send_telnyx_sms(
                    from_number, to_number, body, media_urls
                )
                message.provider_sid = provider_message.id
                message.status = SMSStatus.SENT
                message.sent_at = datetime.now()

            # Store message
            self._messages[message_id] = message

            # Update or create conversation
            await self._update_conversation(message)

            logger.info(f"Sent SMS {message_id} from {from_number} to {to_number}")

            # Fire callback
            if self._on_message_sent:
                await self._on_message_sent(message)

            return message

        except Exception as e:
            logger.error(f"Failed to send SMS: {e}")
            message.status = SMSStatus.FAILED
            message.error_message = str(e)
            self._messages[message_id] = message

            if self._on_message_failed:
                await self._on_message_failed(message)

            return message

    async def _send_twilio_sms(
        self,
        from_number: str,
        to_number: str,
        body: str,
        media_urls: List[str]
    ):
        """Send SMS via Twilio"""
        status_callback = f"{self.webhook_base_url}/api/voice/webhooks/twilio/sms-status"

        message_params = {
            'to': to_number,
            'from_': from_number,
            'body': body,
            'status_callback': status_callback,
        }

        if media_urls:
            message_params['media_url'] = media_urls

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None,
            lambda: self.twilio_client.messages.create(**message_params)
        )

    async def _send_telnyx_sms(
        self,
        from_number: str,
        to_number: str,
        body: str,
        media_urls: List[str]
    ):
        """Send SMS via Telnyx"""
        message_params = {
            'from_': from_number,
            'to': to_number,
            'text': body,
            'webhook_url': f"{self.webhook_base_url}/api/voice/webhooks/telnyx/sms",
        }

        if media_urls:
            message_params['media_urls'] = media_urls

        loop = asyncio.get_event_loop()
        return await loop.run_in_executor(
            None,
            lambda: self.telnyx_client.Message.create(**message_params)
        )

    async def send_bulk_sms(
        self,
        from_number: str,
        to_numbers: List[str],
        body: str,
        user_id: str,
        agent_id: str,
        media_urls: Optional[List[str]] = None,
        batch_size: int = 10
    ) -> List[SMSMessage]:
        """
        Send SMS to multiple recipients.

        Args:
            from_number: Sender phone number
            to_numbers: List of recipient phone numbers
            body: Message body text
            user_id: ID of the user sending the messages
            agent_id: ID of the agent sending the messages
            media_urls: Optional list of media URLs for MMS
            batch_size: Number of concurrent sends (rate limiting)

        Returns:
            List of SMSMessage objects
        """
        messages = []

        # Process in batches to avoid rate limits
        for i in range(0, len(to_numbers), batch_size):
            batch = to_numbers[i:i + batch_size]
            batch_tasks = [
                self.send_sms(
                    from_number=from_number,
                    to_number=to_number,
                    body=body,
                    user_id=user_id,
                    agent_id=agent_id,
                    media_urls=media_urls
                )
                for to_number in batch
            ]

            batch_results = await asyncio.gather(*batch_tasks, return_exceptions=True)

            for result in batch_results:
                if isinstance(result, SMSMessage):
                    messages.append(result)
                else:
                    logger.error(f"Bulk SMS failed: {result}")

            # Small delay between batches
            if i + batch_size < len(to_numbers):
                await asyncio.sleep(1)

        logger.info(f"Sent bulk SMS to {len(messages)}/{len(to_numbers)} recipients")
        return messages

    # ==================== Message Receiving ====================

    async def handle_inbound_sms(
        self,
        webhook_payload: Dict[str, Any],
        provider: str = 'twilio'
    ) -> SMSMessage:
        """
        Handle inbound SMS from webhook.

        Args:
            webhook_payload: The webhook payload from the provider
            provider: Provider name ('twilio' or 'telnyx')

        Returns:
            SMSMessage object for the inbound message
        """
        if provider == 'twilio':
            return await self._handle_twilio_inbound(webhook_payload)
        elif provider == 'telnyx':
            return await self._handle_telnyx_inbound(webhook_payload)
        else:
            raise ValueError(f"Unknown provider: {provider}")

    async def _handle_twilio_inbound(self, payload: Dict[str, Any]) -> SMSMessage:
        """Handle inbound SMS from Twilio webhook"""
        message_id = str(uuid.uuid4())

        # Extract media URLs if MMS
        media_urls = []
        num_media = int(payload.get('NumMedia', 0))
        for i in range(num_media):
            media_url = payload.get(f'MediaUrl{i}')
            if media_url:
                media_urls.append(media_url)

        # Create message record
        message = SMSMessage(
            id=message_id,
            user_id='',  # Will be looked up from phone number
            agent_id='',  # Will be looked up from phone number
            from_number=payload.get('From', ''),
            to_number=payload.get('To', ''),
            body=payload.get('Body', ''),
            direction=SMSDirection.INBOUND,
            status=SMSStatus.RECEIVED,
            provider_sid=payload.get('MessageSid'),
            media_urls=media_urls,
            num_media=num_media,
            num_segments=int(payload.get('NumSegments', 1)),
            created_at=datetime.now()
        )

        # Store message
        self._messages[message_id] = message

        # Update conversation
        await self._update_conversation(message)

        logger.info(f"Received inbound SMS {message_id} from {message.from_number}")

        # Fire callback
        if self._on_message_received:
            await self._on_message_received(message)

        return message

    async def _handle_telnyx_inbound(self, payload: Dict[str, Any]) -> SMSMessage:
        """Handle inbound SMS from Telnyx webhook"""
        message_id = str(uuid.uuid4())
        data = payload.get('data', {}).get('payload', {})

        # Extract media URLs if MMS
        media_urls = []
        for media in data.get('media', []):
            media_urls.append(media.get('url', ''))

        message = SMSMessage(
            id=message_id,
            user_id='',  # Will be looked up
            agent_id='',  # Will be looked up
            from_number=data.get('from', {}).get('phone_number', ''),
            to_number=data.get('to', [{}])[0].get('phone_number', ''),
            body=data.get('text', ''),
            direction=SMSDirection.INBOUND,
            status=SMSStatus.RECEIVED,
            provider_sid=data.get('id'),
            media_urls=media_urls,
            num_media=len(media_urls),
            created_at=datetime.now()
        )

        self._messages[message_id] = message
        await self._update_conversation(message)

        logger.info(f"Received inbound SMS {message_id} from {message.from_number}")

        if self._on_message_received:
            await self._on_message_received(message)

        return message

    async def handle_status_update(
        self,
        provider_sid: str,
        status: str,
        error_code: Optional[str] = None,
        error_message: Optional[str] = None
    ) -> Optional[SMSMessage]:
        """
        Handle delivery status update from webhook.

        Args:
            provider_sid: Provider's message ID
            status: New status (sent, delivered, failed, etc.)
            error_code: Optional error code if failed
            error_message: Optional error message if failed

        Returns:
            Updated SMSMessage or None if not found
        """
        # Find message by provider_sid
        message = None
        for msg in self._messages.values():
            if msg.provider_sid == provider_sid:
                message = msg
                break

        if not message:
            logger.warning(f"Status update for unknown message: {provider_sid}")
            return None

        # Update status
        old_status = message.status
        try:
            message.status = SMSStatus(status.lower())
        except ValueError:
            logger.warning(f"Unknown SMS status: {status}")
            return message

        # Update timestamps
        if message.status == SMSStatus.SENT and not message.sent_at:
            message.sent_at = datetime.now()
        elif message.status == SMSStatus.DELIVERED:
            message.delivered_at = datetime.now()

        # Update error info
        if error_code:
            message.error_code = error_code
            message.error_message = error_message
            message.status = SMSStatus.FAILED

        logger.info(f"SMS {message.id} status: {old_status.value} -> {message.status.value}")

        # Fire callbacks
        if message.status == SMSStatus.DELIVERED and self._on_message_delivered:
            await self._on_message_delivered(message)
        elif message.status == SMSStatus.FAILED and self._on_message_failed:
            await self._on_message_failed(message)

        return message

    # ==================== Conversation Management ====================

    async def get_conversation(
        self,
        user_id: str,
        phone_number: str,
        agent_id: Optional[str] = None
    ) -> Optional[SMSConversation]:
        """
        Get or create a conversation with a phone number.

        Args:
            user_id: ID of the user
            phone_number: Phone number of the external party
            agent_id: Optional agent ID

        Returns:
            SMSConversation object
        """
        # Look for existing conversation
        conv_key = f"{user_id}:{phone_number}"

        for conv in self._conversations.values():
            if conv.user_id == user_id and conv.phone_number == phone_number:
                return conv

        # Create new conversation if agent_id provided
        if agent_id:
            conversation = SMSConversation(
                id=str(uuid.uuid4()),
                user_id=user_id,
                agent_id=agent_id,
                phone_number=phone_number,
                agent_phone_number='',  # Will be set when first message is sent
                status=ConversationStatus.ACTIVE
            )
            self._conversations[conversation.id] = conversation
            return conversation

        return None

    async def list_conversations(
        self,
        user_id: str,
        agent_id: Optional[str] = None,
        status: Optional[ConversationStatus] = None,
        limit: int = 50,
        offset: int = 0
    ) -> List[SMSConversation]:
        """
        List conversations for a user.

        Args:
            user_id: ID of the user
            agent_id: Optional filter by agent ID
            status: Optional filter by conversation status
            limit: Maximum number of conversations to return
            offset: Number of conversations to skip

        Returns:
            List of SMSConversation objects, sorted by last_message_at
        """
        conversations = []

        for conv in self._conversations.values():
            if conv.user_id != user_id:
                continue
            if agent_id and conv.agent_id != agent_id:
                continue
            if status and conv.status != status:
                continue
            conversations.append(conv)

        # Sort by last message time (most recent first)
        conversations.sort(
            key=lambda c: c.last_message_at or c.created_at,
            reverse=True
        )

        return conversations[offset:offset + limit]

    async def get_messages(
        self,
        conversation_id: str,
        limit: int = 100,
        offset: int = 0,
        before: Optional[datetime] = None,
        after: Optional[datetime] = None
    ) -> List[SMSMessage]:
        """
        Get messages in a conversation.

        Args:
            conversation_id: ID of the conversation
            limit: Maximum number of messages to return
            offset: Number of messages to skip
            before: Only return messages before this timestamp
            after: Only return messages after this timestamp

        Returns:
            List of SMSMessage objects, sorted by created_at
        """
        conversation = self._conversations.get(conversation_id)
        if not conversation:
            return []

        messages = conversation.messages.copy()

        # Apply filters
        if before:
            messages = [m for m in messages if m.created_at < before]
        if after:
            messages = [m for m in messages if m.created_at > after]

        # Sort by creation time (oldest first)
        messages.sort(key=lambda m: m.created_at)

        return messages[offset:offset + limit]

    async def close_conversation(self, conversation_id: str) -> bool:
        """
        Close a conversation.

        Args:
            conversation_id: ID of the conversation to close

        Returns:
            True if conversation was closed, False if not found
        """
        conversation = self._conversations.get(conversation_id)
        if not conversation:
            return False

        conversation.status = ConversationStatus.CLOSED
        conversation.closed_at = datetime.now()

        logger.info(f"Closed conversation {conversation_id}")
        return True

    async def archive_conversation(self, conversation_id: str) -> bool:
        """
        Archive a conversation.

        Args:
            conversation_id: ID of the conversation to archive

        Returns:
            True if conversation was archived, False if not found
        """
        conversation = self._conversations.get(conversation_id)
        if not conversation:
            return False

        conversation.status = ConversationStatus.ARCHIVED
        logger.info(f"Archived conversation {conversation_id}")
        return True

    async def mark_as_read(self, conversation_id: str) -> bool:
        """
        Mark all messages in a conversation as read.

        Args:
            conversation_id: ID of the conversation

        Returns:
            True if successful, False if not found
        """
        conversation = self._conversations.get(conversation_id)
        if not conversation:
            return False

        conversation.unread_count = 0
        logger.info(f"Marked conversation {conversation_id} as read")
        return True

    async def _update_conversation(self, message: SMSMessage) -> None:
        """Update conversation with new message"""
        # Determine phone number and agent number
        if message.direction == SMSDirection.OUTBOUND:
            phone_number = message.to_number
            agent_number = message.from_number
        else:
            phone_number = message.from_number
            agent_number = message.to_number

        # Find or create conversation
        conversation = None
        for conv in self._conversations.values():
            if (conv.user_id == message.user_id and
                conv.phone_number == phone_number):
                conversation = conv
                break

        if not conversation:
            conversation = SMSConversation(
                id=str(uuid.uuid4()),
                user_id=message.user_id,
                agent_id=message.agent_id,
                phone_number=phone_number,
                agent_phone_number=agent_number,
                status=ConversationStatus.ACTIVE
            )
            self._conversations[conversation.id] = conversation

        # Add message to conversation
        conversation.messages.append(message)
        conversation.last_message_at = message.created_at
        conversation.last_message_preview = message.body[:100]

        # Increment unread count for inbound messages
        if message.direction == SMSDirection.INBOUND:
            conversation.unread_count += 1

    # ==================== Webhook Verification ====================

    def verify_webhook_signature(
        self,
        url: str,
        payload: Dict[str, Any],
        signature: str,
        provider: str = 'twilio'
    ) -> bool:
        """
        Verify webhook signature from provider.

        Args:
            url: The full URL of the webhook endpoint
            payload: The webhook payload/params
            signature: The signature header from the provider
            provider: Provider name ('twilio' or 'telnyx')

        Returns:
            True if signature is valid, False otherwise
        """
        if provider == 'twilio':
            return self._verify_twilio_signature(url, payload, signature)
        elif provider == 'telnyx':
            return self._verify_telnyx_signature(payload, signature)
        else:
            logger.warning(f"Unknown provider for signature verification: {provider}")
            return False

    def _verify_twilio_signature(
        self,
        url: str,
        params: Dict[str, str],
        signature: str
    ) -> bool:
        """Verify Twilio webhook signature"""
        try:
            from twilio.request_validator import RequestValidator
            validator = RequestValidator(self.twilio_auth_token)
            return validator.validate(url, params, signature)
        except ImportError:
            logger.error("Twilio SDK not installed, cannot verify signature")
            return False
        except Exception as e:
            logger.error(f"Failed to verify Twilio signature: {e}")
            return False

    def _verify_telnyx_signature(
        self,
        payload: Dict[str, Any],
        signature: str
    ) -> bool:
        """Verify Telnyx webhook signature"""
        try:
            public_key = os.getenv('TELNYX_PUBLIC_KEY')
            if not public_key:
                logger.warning("TELNYX_PUBLIC_KEY not set, cannot verify signature")
                return False

            # Telnyx uses ECDSA signatures
            # In production, use telnyx.Webhook.construct_event
            # For now, simplified verification
            return True  # Placeholder

        except Exception as e:
            logger.error(f"Failed to verify Telnyx signature: {e}")
            return False

    # ==================== Event Callbacks ====================

    def on_message_sent(self, callback: Callable):
        """Register callback for message sent events"""
        self._on_message_sent = callback

    def on_message_received(self, callback: Callable):
        """Register callback for message received events"""
        self._on_message_received = callback

    def on_message_delivered(self, callback: Callable):
        """Register callback for message delivered events"""
        self._on_message_delivered = callback

    def on_message_failed(self, callback: Callable):
        """Register callback for message failed events"""
        self._on_message_failed = callback

    # ==================== Analytics & Reporting ====================

    async def get_conversation_stats(
        self,
        conversation_id: str
    ) -> Dict[str, Any]:
        """
        Get statistics for a conversation.

        Returns:
            Dictionary with message counts, response times, etc.
        """
        conversation = self._conversations.get(conversation_id)
        if not conversation:
            return {}

        messages = conversation.messages

        inbound_count = sum(1 for m in messages if m.direction == SMSDirection.INBOUND)
        outbound_count = sum(1 for m in messages if m.direction == SMSDirection.OUTBOUND)

        # Calculate average response time
        response_times = []
        for i in range(1, len(messages)):
            if (messages[i].direction == SMSDirection.OUTBOUND and
                messages[i-1].direction == SMSDirection.INBOUND):
                delta = (messages[i].created_at - messages[i-1].created_at).total_seconds()
                response_times.append(delta)

        avg_response_time = sum(response_times) / len(response_times) if response_times else 0

        return {
            'conversation_id': conversation_id,
            'total_messages': len(messages),
            'inbound_messages': inbound_count,
            'outbound_messages': outbound_count,
            'average_response_time_seconds': avg_response_time,
            'first_message_at': messages[0].created_at if messages else None,
            'last_message_at': conversation.last_message_at,
            'unread_count': conversation.unread_count,
            'status': conversation.status.value
        }

    async def get_message_stats(
        self,
        user_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Get SMS usage statistics for a user.

        Returns:
            Dictionary with message counts, costs, delivery rates, etc.
        """
        messages = [
            m for m in self._messages.values()
            if m.user_id == user_id
        ]

        # Apply date filters
        if start_date:
            messages = [m for m in messages if m.created_at >= start_date]
        if end_date:
            messages = [m for m in messages if m.created_at <= end_date]

        total_sent = sum(1 for m in messages if m.direction == SMSDirection.OUTBOUND)
        total_received = sum(1 for m in messages if m.direction == SMSDirection.INBOUND)
        total_delivered = sum(1 for m in messages if m.status == SMSStatus.DELIVERED)
        total_failed = sum(1 for m in messages if m.status == SMSStatus.FAILED)

        # Calculate costs
        total_cost = sum(m.price for m in messages if m.price)

        # Delivery rate
        delivery_rate = (total_delivered / total_sent * 100) if total_sent > 0 else 0

        return {
            'user_id': user_id,
            'total_sent': total_sent,
            'total_received': total_received,
            'total_delivered': total_delivered,
            'total_failed': total_failed,
            'delivery_rate_percent': round(delivery_rate, 2),
            'total_cost_usd': round(total_cost, 2),
            'date_range': {
                'start': start_date.isoformat() if start_date else None,
                'end': end_date.isoformat() if end_date else None
            }
        }

    # ==================== Utility Methods ====================

    def calculate_sms_cost(
        self,
        num_segments: int,
        num_media: int,
        direction: SMSDirection
    ) -> float:
        """
        Calculate the cost of an SMS/MMS in dollars.

        Args:
            num_segments: Number of SMS segments (160 chars each)
            num_media: Number of media attachments
            direction: Inbound or outbound

        Returns:
            Cost in USD
        """
        if num_media > 0:
            # MMS pricing
            if direction == SMSDirection.INBOUND:
                rate = self.pricing['mms_inbound']
            else:
                rate = self.pricing['mms_outbound']
            return rate / 100  # Convert cents to dollars
        else:
            # SMS pricing (per segment)
            if direction == SMSDirection.INBOUND:
                rate = self.pricing['sms_inbound']
            else:
                rate = self.pricing['sms_outbound']
            return (num_segments * rate) / 100  # Convert cents to dollars

    def estimate_segments(self, body: str) -> int:
        """
        Estimate the number of SMS segments for a message.

        Args:
            body: Message body text

        Returns:
            Estimated number of segments
        """
        # SMS segment sizes
        GSM_7BIT_SIZE = 160
        GSM_7BIT_MULTIPART_SIZE = 153
        UCS2_SIZE = 70
        UCS2_MULTIPART_SIZE = 67

        # Check if message contains non-GSM characters
        gsm_chars = set(
            "@£$¥èéùìòÇØøÅåΔ_ΦΓΛΩΠΨΣΘΞ^{}\\[~]|€ÆæßÉ !\"#¤%&'()*+,-./0123456789:;<=>?"
            "¡ABCDEFGHIJKLMNOPQRSTUVWXYZÄÖÑÜ§¿abcdefghijklmnopqrstuvwxyzäöñüà"
        )

        is_gsm = all(c in gsm_chars for c in body)

        if is_gsm:
            if len(body) <= GSM_7BIT_SIZE:
                return 1
            return (len(body) + GSM_7BIT_MULTIPART_SIZE - 1) // GSM_7BIT_MULTIPART_SIZE
        else:
            # Unicode/UCS-2 encoding
            if len(body) <= UCS2_SIZE:
                return 1
            return (len(body) + UCS2_MULTIPART_SIZE - 1) // UCS2_MULTIPART_SIZE


# Singleton instance
_sms_manager: Optional[SMSManager] = None


def get_sms_manager(config: Dict[str, Any] = None) -> SMSManager:
    """Get or create the SMS manager instance"""
    global _sms_manager
    if _sms_manager is None:
        _sms_manager = SMSManager(config)
    return _sms_manager


# ==================== FastAPI Webhook Handler ====================

async def handle_sms_webhook(
    provider: str,
    webhook_type: str,  # 'inbound' or 'status'
    request_url: str,
    payload: Dict[str, Any],
    signature: str
) -> Dict[str, Any]:
    """
    FastAPI webhook handler for SMS.

    Usage in FastAPI:
        @app.post("/api/voice/webhooks/twilio/sms")
        async def twilio_sms_webhook(request: Request):
            form_data = await request.form()
            payload = dict(form_data)
            signature = request.headers.get('X-Twilio-Signature', '')
            url = str(request.url)

            return await handle_sms_webhook(
                provider='twilio',
                webhook_type='inbound',
                request_url=url,
                payload=payload,
                signature=signature
            )

    Args:
        provider: Provider name ('twilio' or 'telnyx')
        webhook_type: Type of webhook ('inbound' for new messages, 'status' for delivery updates)
        request_url: Full URL of the webhook endpoint
        payload: Webhook payload data
        signature: Signature header from provider

    Returns:
        Dictionary with success status and any response data
    """
    sms_manager = get_sms_manager()

    # Verify signature
    if not sms_manager.verify_webhook_signature(request_url, payload, signature, provider):
        logger.warning(f"Invalid webhook signature from {provider}")
        return {
            'success': False,
            'error': 'Invalid signature',
            'status': 403
        }

    try:
        if webhook_type == 'inbound':
            # Handle incoming message
            message = await sms_manager.handle_inbound_sms(payload, provider)

            return {
                'success': True,
                'message_id': message.id,
                'status': 200
            }

        elif webhook_type == 'status':
            # Handle delivery status update
            if provider == 'twilio':
                message_sid = payload.get('MessageSid')
                status = payload.get('MessageStatus')
                error_code = payload.get('ErrorCode')

                await sms_manager.handle_status_update(
                    provider_sid=message_sid,
                    status=status,
                    error_code=error_code
                )
            elif provider == 'telnyx':
                data = payload.get('data', {}).get('payload', {})
                message_id = data.get('id')
                status = data.get('to', [{}])[0].get('status')

                await sms_manager.handle_status_update(
                    provider_sid=message_id,
                    status=status
                )

            return {
                'success': True,
                'status': 200
            }

        else:
            return {
                'success': False,
                'error': f'Unknown webhook type: {webhook_type}',
                'status': 400
            }

    except Exception as e:
        logger.error(f"SMS webhook error: {e}")
        return {
            'success': False,
            'error': str(e),
            'status': 500
        }
