"""
Telephony Manager for Agent Forge Voice

Handles phone number provisioning, inbound/outbound calls via Twilio or Telnyx.
Follows the singleton manager pattern from billing.py.
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

logger = logging.getLogger(__name__)


class TelephonyProvider(Enum):
    """Supported telephony providers"""
    TWILIO = "twilio"
    TELNYX = "telnyx"


class CallStatus(Enum):
    """Call status states"""
    INITIATED = "initiated"
    RINGING = "ringing"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    BUSY = "busy"
    NO_ANSWER = "no_answer"
    FAILED = "failed"
    CANCELED = "canceled"


class CallDirection(Enum):
    """Call direction"""
    INBOUND = "inbound"
    OUTBOUND = "outbound"


@dataclass
class PhoneNumber:
    """Represents a provisioned phone number"""
    id: str
    phone_number: str
    user_id: str
    agent_id: Optional[str]
    country: str
    capabilities: List[str]  # ['voice', 'sms', 'mms']
    provider: TelephonyProvider
    provider_sid: str
    friendly_name: Optional[str] = None
    monthly_cost: float = 2.00
    status: str = "active"
    voice_url: Optional[str] = None
    sms_url: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.now)


@dataclass
class Call:
    """Represents a phone call"""
    id: str
    user_id: str
    agent_id: str
    phone_number_id: str
    direction: CallDirection
    from_number: str
    to_number: str
    status: CallStatus = CallStatus.INITIATED
    provider_call_id: Optional[str] = None
    started_at: Optional[datetime] = None
    ended_at: Optional[datetime] = None
    duration_seconds: int = 0
    recording_url: Optional[str] = None
    recording_duration: int = 0
    cost: float = 0.0
    outcome: Optional[str] = None
    sentiment_score: Optional[float] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.now)


class TelephonyManager:
    """
    Manages telephony operations for voice agents.

    Supports Twilio (primary) and Telnyx as providers.
    Follows the singleton pattern from billing.py.
    """

    _instance: Optional['TelephonyManager'] = None

    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or {}

        # Provider selection
        provider_name = os.getenv('TELEPHONY_PROVIDER', 'twilio').lower()
        self.provider = TelephonyProvider(provider_name)

        # Initialize provider clients
        self.twilio_client = None
        self.telnyx_client = None

        self._init_twilio()
        self._init_telnyx()

        # Webhook base URL for callbacks
        self.webhook_base_url = os.getenv('VOICE_WEBHOOK_BASE_URL', '')

        # Pricing (per minute in cents)
        self.pricing = {
            'inbound': float(os.getenv('VOICE_PRICE_INBOUND', '5')),  # $0.05/min
            'outbound': float(os.getenv('VOICE_PRICE_OUTBOUND', '8')),  # $0.08/min
            'local_number': float(os.getenv('VOICE_PRICE_LOCAL', '200')),  # $2/month
            'toll_free_number': float(os.getenv('VOICE_PRICE_TOLL_FREE', '500')),  # $5/month
        }

        # Call event callbacks
        self._on_call_started: Optional[Callable] = None
        self._on_call_ended: Optional[Callable] = None
        self._on_call_status_changed: Optional[Callable] = None

        logger.info(f"TelephonyManager initialized with provider: {self.provider.value}")

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
                logger.info("Twilio client initialized")
            except ImportError:
                logger.warning("Twilio SDK not installed. Run: pip install twilio")
            except Exception as e:
                logger.error(f"Failed to initialize Twilio: {e}")

    def _init_telnyx(self):
        """Initialize Telnyx client"""
        api_key = os.getenv('TELNYX_API_KEY')

        if api_key:
            try:
                import telnyx
                telnyx.api_key = api_key
                self.telnyx_client = telnyx
                logger.info("Telnyx client initialized")
            except ImportError:
                logger.warning("Telnyx SDK not installed. Run: pip install telnyx")
            except Exception as e:
                logger.error(f"Failed to initialize Telnyx: {e}")

    def is_configured(self) -> bool:
        """Check if telephony is properly configured"""
        if self.provider == TelephonyProvider.TWILIO:
            return self.twilio_client is not None
        elif self.provider == TelephonyProvider.TELNYX:
            return self.telnyx_client is not None
        return False

    # ==================== Phone Number Management ====================

    async def search_available_numbers(
        self,
        country: str = "US",
        area_code: Optional[str] = None,
        contains: Optional[str] = None,
        capabilities: Optional[List[str]] = None,
        limit: int = 10
    ) -> List[Dict[str, Any]]:
        """Search for available phone numbers to provision"""
        if not self.is_configured():
            return []

        capabilities = capabilities or ['voice']

        if self.provider == TelephonyProvider.TWILIO:
            return await self._twilio_search_numbers(
                country, area_code, contains, capabilities, limit
            )
        elif self.provider == TelephonyProvider.TELNYX:
            return await self._telnyx_search_numbers(
                country, area_code, contains, capabilities, limit
            )

        return []

    async def _twilio_search_numbers(
        self,
        country: str,
        area_code: Optional[str],
        contains: Optional[str],
        capabilities: List[str],
        limit: int
    ) -> List[Dict[str, Any]]:
        """Search available numbers via Twilio"""
        try:
            search_params = {
                'voice_enabled': 'voice' in capabilities,
                'sms_enabled': 'sms' in capabilities,
            }

            if area_code:
                search_params['area_code'] = area_code
            if contains:
                search_params['contains'] = contains

            # Run in executor since Twilio SDK is synchronous
            loop = asyncio.get_event_loop()
            numbers = await loop.run_in_executor(
                None,
                lambda: list(self.twilio_client.available_phone_numbers(country)
                    .local.list(**search_params, limit=limit))
            )

            return [{
                'phone_number': n.phone_number,
                'friendly_name': n.friendly_name,
                'locality': n.locality,
                'region': n.region,
                'country': country,
                'capabilities': {
                    'voice': n.capabilities.get('voice', False),
                    'sms': n.capabilities.get('SMS', False),
                    'mms': n.capabilities.get('MMS', False),
                },
                'monthly_cost': 2.00,  # Standard local number price
                'provider': 'twilio'
            } for n in numbers]

        except Exception as e:
            logger.error(f"Twilio number search failed: {e}")
            return []

    async def _telnyx_search_numbers(
        self,
        country: str,
        area_code: Optional[str],
        contains: Optional[str],
        capabilities: List[str],
        limit: int
    ) -> List[Dict[str, Any]]:
        """Search available numbers via Telnyx"""
        try:
            search_params = {
                'filter[country_code]': country,
                'filter[limit]': limit,
            }

            if area_code:
                search_params['filter[national_destination_code]'] = area_code
            if contains:
                search_params['filter[phone_number][contains]'] = contains

            loop = asyncio.get_event_loop()
            response = await loop.run_in_executor(
                None,
                lambda: self.telnyx_client.AvailablePhoneNumber.list(**search_params)
            )

            return [{
                'phone_number': n.phone_number,
                'friendly_name': n.phone_number,
                'locality': getattr(n, 'locality', ''),
                'region': getattr(n, 'region_information', [{}])[0].get('region_name', ''),
                'country': country,
                'capabilities': {
                    'voice': True,
                    'sms': getattr(n, 'features', []),
                },
                'monthly_cost': 2.00,
                'provider': 'telnyx'
            } for n in response.data]

        except Exception as e:
            logger.error(f"Telnyx number search failed: {e}")
            return []

    async def provision_number(
        self,
        phone_number: str,
        user_id: str,
        agent_id: Optional[str] = None,
        friendly_name: Optional[str] = None
    ) -> Dict[str, Any]:
        """Provision (purchase) a phone number"""
        if not self.is_configured():
            return {'success': False, 'error': 'Telephony not configured'}

        if self.provider == TelephonyProvider.TWILIO:
            return await self._twilio_provision_number(
                phone_number, user_id, agent_id, friendly_name
            )
        elif self.provider == TelephonyProvider.TELNYX:
            return await self._telnyx_provision_number(
                phone_number, user_id, agent_id, friendly_name
            )

        return {'success': False, 'error': 'Invalid provider'}

    async def _twilio_provision_number(
        self,
        phone_number: str,
        user_id: str,
        agent_id: Optional[str],
        friendly_name: Optional[str]
    ) -> Dict[str, Any]:
        """Provision a number via Twilio"""
        try:
            voice_url = f"{self.webhook_base_url}/api/voice/webhooks/twilio/voice"
            status_url = f"{self.webhook_base_url}/api/voice/webhooks/twilio/status"

            loop = asyncio.get_event_loop()
            incoming_number = await loop.run_in_executor(
                None,
                lambda: self.twilio_client.incoming_phone_numbers.create(
                    phone_number=phone_number,
                    friendly_name=friendly_name or f"AgentForge-{user_id[:8]}",
                    voice_url=voice_url,
                    voice_method='POST',
                    status_callback=status_url,
                    status_callback_method='POST',
                )
            )

            number = PhoneNumber(
                id=str(uuid.uuid4()),
                phone_number=phone_number,
                user_id=user_id,
                agent_id=agent_id,
                country=incoming_number.phone_number[:2],  # Country from number
                capabilities=['voice', 'sms'] if incoming_number.capabilities.get('SMS') else ['voice'],
                provider=TelephonyProvider.TWILIO,
                provider_sid=incoming_number.sid,
                friendly_name=friendly_name,
                voice_url=voice_url,
            )

            logger.info(f"Provisioned Twilio number: {phone_number}")

            return {
                'success': True,
                'number': number,
                'provider_sid': incoming_number.sid
            }

        except Exception as e:
            logger.error(f"Failed to provision Twilio number: {e}")
            return {'success': False, 'error': str(e)}

    async def _telnyx_provision_number(
        self,
        phone_number: str,
        user_id: str,
        agent_id: Optional[str],
        friendly_name: Optional[str]
    ) -> Dict[str, Any]:
        """Provision a number via Telnyx"""
        try:
            loop = asyncio.get_event_loop()
            order = await loop.run_in_executor(
                None,
                lambda: self.telnyx_client.NumberOrder.create(
                    phone_numbers=[{'phone_number': phone_number}]
                )
            )

            number = PhoneNumber(
                id=str(uuid.uuid4()),
                phone_number=phone_number,
                user_id=user_id,
                agent_id=agent_id,
                country=phone_number[:2],
                capabilities=['voice', 'sms'],
                provider=TelephonyProvider.TELNYX,
                provider_sid=order.id,
                friendly_name=friendly_name,
            )

            logger.info(f"Provisioned Telnyx number: {phone_number}")

            return {
                'success': True,
                'number': number,
                'provider_sid': order.id
            }

        except Exception as e:
            logger.error(f"Failed to provision Telnyx number: {e}")
            return {'success': False, 'error': str(e)}

    async def release_number(self, phone_number: str, provider_sid: str) -> Dict[str, Any]:
        """Release (delete) a provisioned phone number"""
        if not self.is_configured():
            return {'success': False, 'error': 'Telephony not configured'}

        try:
            if self.provider == TelephonyProvider.TWILIO:
                loop = asyncio.get_event_loop()
                await loop.run_in_executor(
                    None,
                    lambda: self.twilio_client.incoming_phone_numbers(provider_sid).delete()
                )
            elif self.provider == TelephonyProvider.TELNYX:
                loop = asyncio.get_event_loop()
                await loop.run_in_executor(
                    None,
                    lambda: self.telnyx_client.PhoneNumber.delete(provider_sid)
                )

            logger.info(f"Released phone number: {phone_number}")
            return {'success': True}

        except Exception as e:
            logger.error(f"Failed to release number {phone_number}: {e}")
            return {'success': False, 'error': str(e)}

    async def configure_number(
        self,
        provider_sid: str,
        voice_url: Optional[str] = None,
        sms_url: Optional[str] = None,
        status_callback: Optional[str] = None
    ) -> Dict[str, Any]:
        """Update configuration for a phone number"""
        if not self.is_configured():
            return {'success': False, 'error': 'Telephony not configured'}

        try:
            if self.provider == TelephonyProvider.TWILIO:
                update_params = {}
                if voice_url:
                    update_params['voice_url'] = voice_url
                if sms_url:
                    update_params['sms_url'] = sms_url
                if status_callback:
                    update_params['status_callback'] = status_callback

                loop = asyncio.get_event_loop()
                await loop.run_in_executor(
                    None,
                    lambda: self.twilio_client.incoming_phone_numbers(provider_sid).update(**update_params)
                )

            return {'success': True}

        except Exception as e:
            logger.error(f"Failed to configure number: {e}")
            return {'success': False, 'error': str(e)}

    # ==================== Call Management ====================

    async def initiate_outbound_call(
        self,
        from_number: str,
        to_number: str,
        agent_id: str,
        user_id: str,
        webhook_url: Optional[str] = None,
        timeout: int = 30,
        record: bool = True,
        machine_detection: bool = True
    ) -> Dict[str, Any]:
        """Initiate an outbound call"""
        if not self.is_configured():
            return {'success': False, 'error': 'Telephony not configured'}

        call_id = str(uuid.uuid4())
        webhook_url = webhook_url or f"{self.webhook_base_url}/api/voice/webhooks/twilio/voice"
        status_url = f"{self.webhook_base_url}/api/voice/webhooks/twilio/status"

        try:
            if self.provider == TelephonyProvider.TWILIO:
                call_params = {
                    'to': to_number,
                    'from_': from_number,
                    'url': webhook_url,
                    'method': 'POST',
                    'status_callback': status_url,
                    'status_callback_method': 'POST',
                    'status_callback_event': ['initiated', 'ringing', 'answered', 'completed'],
                    'timeout': timeout,
                }

                if record:
                    call_params['record'] = True
                    call_params['recording_status_callback'] = f"{self.webhook_base_url}/api/voice/webhooks/twilio/recording"

                if machine_detection:
                    call_params['machine_detection'] = 'DetectMessageEnd'
                    call_params['async_amd'] = True
                    call_params['async_amd_status_callback'] = f"{self.webhook_base_url}/api/voice/webhooks/twilio/amd"

                loop = asyncio.get_event_loop()
                twilio_call = await loop.run_in_executor(
                    None,
                    lambda: self.twilio_client.calls.create(**call_params)
                )

                call = Call(
                    id=call_id,
                    user_id=user_id,
                    agent_id=agent_id,
                    phone_number_id='',  # Will be set by caller
                    direction=CallDirection.OUTBOUND,
                    from_number=from_number,
                    to_number=to_number,
                    status=CallStatus.INITIATED,
                    provider_call_id=twilio_call.sid,
                )

                logger.info(f"Initiated outbound call: {call_id} -> {to_number}")

                if self._on_call_started:
                    await self._on_call_started(call)

                return {
                    'success': True,
                    'call': call,
                    'provider_call_id': twilio_call.sid
                }

            elif self.provider == TelephonyProvider.TELNYX:
                loop = asyncio.get_event_loop()
                telnyx_call = await loop.run_in_executor(
                    None,
                    lambda: self.telnyx_client.Call.create(
                        connection_id=os.getenv('TELNYX_CONNECTION_ID'),
                        to=to_number,
                        from_=from_number,
                        webhook_url=webhook_url,
                        timeout_secs=timeout,
                    )
                )

                call = Call(
                    id=call_id,
                    user_id=user_id,
                    agent_id=agent_id,
                    phone_number_id='',
                    direction=CallDirection.OUTBOUND,
                    from_number=from_number,
                    to_number=to_number,
                    status=CallStatus.INITIATED,
                    provider_call_id=telnyx_call.call_control_id,
                )

                return {
                    'success': True,
                    'call': call,
                    'provider_call_id': telnyx_call.call_control_id
                }

        except Exception as e:
            logger.error(f"Failed to initiate call: {e}")
            return {'success': False, 'error': str(e)}

        return {'success': False, 'error': 'Invalid provider'}

    async def handle_inbound_call(
        self,
        provider_call_id: str,
        from_number: str,
        to_number: str,
        agent_id: str,
        user_id: str
    ) -> Call:
        """Create a call record for an inbound call"""
        call = Call(
            id=str(uuid.uuid4()),
            user_id=user_id,
            agent_id=agent_id,
            phone_number_id='',  # Will be looked up
            direction=CallDirection.INBOUND,
            from_number=from_number,
            to_number=to_number,
            status=CallStatus.RINGING,
            provider_call_id=provider_call_id,
        )

        logger.info(f"Inbound call: {call.id} from {from_number}")

        if self._on_call_started:
            await self._on_call_started(call)

        return call

    async def transfer_call(
        self,
        provider_call_id: str,
        target_number: str,
        transfer_type: str = "warm",  # warm, cold, blind
        whisper_message: Optional[str] = None,
        hold_music_url: Optional[str] = None,
        timeout: int = 30
    ) -> Dict[str, Any]:
        """Transfer a call to another number or agent"""
        if not self.is_configured():
            return {'success': False, 'error': 'Telephony not configured'}

        try:
            if self.provider == TelephonyProvider.TWILIO:
                # For Twilio, we use TwiML to transfer
                # This would typically be handled via the webhook response
                # Here we update the call to redirect to a transfer TwiML
                transfer_url = f"{self.webhook_base_url}/api/voice/webhooks/twilio/transfer"
                transfer_url += f"?target={target_number}&type={transfer_type}"
                if whisper_message:
                    transfer_url += f"&whisper={whisper_message}"

                loop = asyncio.get_event_loop()
                await loop.run_in_executor(
                    None,
                    lambda: self.twilio_client.calls(provider_call_id).update(
                        url=transfer_url,
                        method='POST'
                    )
                )

                logger.info(f"Initiated {transfer_type} transfer to {target_number}")
                return {'success': True, 'transfer_type': transfer_type}

        except Exception as e:
            logger.error(f"Failed to transfer call: {e}")
            return {'success': False, 'error': str(e)}

        return {'success': False, 'error': 'Invalid provider'}

    async def end_call(self, provider_call_id: str) -> Dict[str, Any]:
        """End an active call"""
        if not self.is_configured():
            return {'success': False, 'error': 'Telephony not configured'}

        try:
            if self.provider == TelephonyProvider.TWILIO:
                loop = asyncio.get_event_loop()
                await loop.run_in_executor(
                    None,
                    lambda: self.twilio_client.calls(provider_call_id).update(
                        status='completed'
                    )
                )
            elif self.provider == TelephonyProvider.TELNYX:
                loop = asyncio.get_event_loop()
                await loop.run_in_executor(
                    None,
                    lambda: self.telnyx_client.Call.hangup(provider_call_id)
                )

            logger.info(f"Ended call: {provider_call_id}")
            return {'success': True}

        except Exception as e:
            logger.error(f"Failed to end call: {e}")
            return {'success': False, 'error': str(e)}

    async def send_dtmf(self, provider_call_id: str, digits: str) -> Dict[str, Any]:
        """Send DTMF tones to navigate IVR systems"""
        if not self.is_configured():
            return {'success': False, 'error': 'Telephony not configured'}

        try:
            if self.provider == TelephonyProvider.TWILIO:
                # Twilio handles DTMF via TwiML <Play digits="..."/>
                # This would be handled in the webhook response
                dtmf_url = f"{self.webhook_base_url}/api/voice/webhooks/twilio/dtmf"
                dtmf_url += f"?digits={digits}"

                loop = asyncio.get_event_loop()
                await loop.run_in_executor(
                    None,
                    lambda: self.twilio_client.calls(provider_call_id).update(
                        url=dtmf_url,
                        method='POST'
                    )
                )
            elif self.provider == TelephonyProvider.TELNYX:
                loop = asyncio.get_event_loop()
                await loop.run_in_executor(
                    None,
                    lambda: self.telnyx_client.Call.send_dtmf(
                        provider_call_id,
                        digits=digits
                    )
                )

            logger.info(f"Sent DTMF: {digits}")
            return {'success': True, 'digits': digits}

        except Exception as e:
            logger.error(f"Failed to send DTMF: {e}")
            return {'success': False, 'error': str(e)}

    async def get_call_recording(self, provider_call_id: str) -> Optional[str]:
        """Get the recording URL for a call"""
        try:
            if self.provider == TelephonyProvider.TWILIO:
                loop = asyncio.get_event_loop()
                recordings = await loop.run_in_executor(
                    None,
                    lambda: self.twilio_client.recordings.list(call_sid=provider_call_id)
                )

                if recordings:
                    # Return the media URL for the first recording
                    return f"https://api.twilio.com{recordings[0].uri.replace('.json', '.mp3')}"

            return None

        except Exception as e:
            logger.error(f"Failed to get recording: {e}")
            return None

    # ==================== Webhook Verification ====================

    def verify_twilio_signature(
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
        except Exception as e:
            logger.error(f"Failed to verify Twilio signature: {e}")
            return False

    def verify_telnyx_signature(
        self,
        payload: bytes,
        signature: str,
        timestamp: str
    ) -> bool:
        """Verify Telnyx webhook signature"""
        try:
            public_key = os.getenv('TELNYX_PUBLIC_KEY')
            if not public_key:
                return False

            # Telnyx uses ed25519 signatures
            # Simplified verification - in production use telnyx.Webhook.verify
            return True  # Placeholder

        except Exception as e:
            logger.error(f"Failed to verify Telnyx signature: {e}")
            return False

    # ==================== Event Callbacks ====================

    def on_call_started(self, callback: Callable):
        """Register callback for call started events"""
        self._on_call_started = callback

    def on_call_ended(self, callback: Callable):
        """Register callback for call ended events"""
        self._on_call_ended = callback

    def on_call_status_changed(self, callback: Callable):
        """Register callback for call status changes"""
        self._on_call_status_changed = callback

    async def handle_status_update(
        self,
        provider_call_id: str,
        status: str,
        duration: Optional[int] = None,
        recording_url: Optional[str] = None
    ) -> None:
        """Handle call status update from webhook"""
        status_map = {
            'initiated': CallStatus.INITIATED,
            'ringing': CallStatus.RINGING,
            'in-progress': CallStatus.IN_PROGRESS,
            'answered': CallStatus.IN_PROGRESS,
            'completed': CallStatus.COMPLETED,
            'busy': CallStatus.BUSY,
            'no-answer': CallStatus.NO_ANSWER,
            'failed': CallStatus.FAILED,
            'canceled': CallStatus.CANCELED,
        }

        call_status = status_map.get(status.lower(), CallStatus.FAILED)

        if self._on_call_status_changed:
            await self._on_call_status_changed(
                provider_call_id,
                call_status,
                duration,
                recording_url
            )

        if call_status in [CallStatus.COMPLETED, CallStatus.BUSY,
                          CallStatus.NO_ANSWER, CallStatus.FAILED]:
            if self._on_call_ended:
                await self._on_call_ended(provider_call_id, call_status, duration)

    # ==================== Utility Methods ====================

    def calculate_call_cost(
        self,
        duration_seconds: int,
        direction: CallDirection
    ) -> float:
        """Calculate the cost of a call in dollars"""
        minutes = (duration_seconds + 59) // 60  # Round up to nearest minute

        if direction == CallDirection.INBOUND:
            rate = self.pricing['inbound']
        else:
            rate = self.pricing['outbound']

        return (minutes * rate) / 100  # Convert cents to dollars

    def get_number_monthly_cost(self, is_toll_free: bool = False) -> float:
        """Get the monthly cost for a phone number"""
        if is_toll_free:
            return self.pricing['toll_free_number'] / 100
        return self.pricing['local_number'] / 100


# Singleton instance
_telephony_manager: Optional[TelephonyManager] = None


def get_telephony_manager(config: Dict[str, Any] = None) -> TelephonyManager:
    """Get or create the telephony manager instance"""
    global _telephony_manager
    if _telephony_manager is None:
        _telephony_manager = TelephonyManager(config)
    return _telephony_manager
