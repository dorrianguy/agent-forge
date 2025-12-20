"""
Twilio-LiveKit SIP Bridge for Agent Forge Voice

Bridges Twilio phone calls to LiveKit rooms via SIP.
Generates TwiML for SIP connections and manages call routing.
"""

import os
import logging
from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, Any, Optional, Callable
from enum import Enum
import uuid

from .livekit_manager import get_livekit_manager, ParticipantRole

logger = logging.getLogger(__name__)


class SIPConnectionStatus(Enum):
    """SIP connection status"""
    CONNECTING = "connecting"
    CONNECTED = "connected"
    DISCONNECTED = "disconnected"
    FAILED = "failed"


@dataclass
class SIPConnection:
    """Represents a SIP connection between Twilio and LiveKit"""
    id: str
    call_id: str
    room_id: str
    from_number: str
    to_number: str
    status: SIPConnectionStatus = SIPConnectionStatus.CONNECTING
    twilio_call_sid: Optional[str] = None
    sip_domain: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.now)
    connected_at: Optional[datetime] = None
    disconnected_at: Optional[datetime] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


class TwilioLiveKitBridge:
    """
    Bridges Twilio phone calls to LiveKit rooms via SIP.

    Workflow:
    1. Twilio receives inbound call
    2. Bridge generates TwiML with <Dial><Sip> to LiveKit SIP endpoint
    3. LiveKit SIP participant joins room
    4. Agent connects to same room
    5. Audio flows: Caller <-> Twilio <-> SIP <-> LiveKit <-> Agent

    Follows the singleton pattern from collaboration.py.
    """

    _instance: Optional['TwilioLiveKitBridge'] = None

    def __new__(cls) -> 'TwilioLiveKitBridge':
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return

        # LiveKit SIP configuration
        self.livekit_sip_uri = os.getenv(
            'LIVEKIT_SIP_URI',
            'sip:dispatcher@sip.livekit.io'
        )

        # SIP domain for routing
        self.sip_domain = os.getenv('LIVEKIT_SIP_DOMAIN', 'sip.livekit.io')

        # Active SIP connections (connection_id -> SIPConnection)
        self._connections: Dict[str, SIPConnection] = {}

        # LiveKit manager reference
        self.livekit_manager = get_livekit_manager()

        # Event callbacks
        self._on_connection_established: Optional[Callable] = None
        self._on_connection_failed: Optional[Callable] = None
        self._on_connection_ended: Optional[Callable] = None

        # Stats
        self.stats = {
            "connections_created": 0,
            "connections_successful": 0,
            "connections_failed": 0,
            "total_duration_seconds": 0
        }

        self._initialized = True
        logger.info('[TwilioLiveKitBridge] Initialized')

    def is_configured(self) -> bool:
        """Check if bridge is properly configured"""
        return bool(self.livekit_sip_uri and self.livekit_manager.is_configured())

    # ==================== TwiML Generation ====================

    def generate_twiml_for_inbound(
        self,
        room_name: str,
        from_number: str,
        to_number: str,
        call_id: str,
        agent_id: Optional[str] = None,
        record: bool = True,
        timeout: int = 30
    ) -> str:
        """
        Generate TwiML to connect inbound Twilio call to LiveKit room via SIP.

        Returns TwiML that:
        1. Dials LiveKit SIP endpoint
        2. Passes room name and participant metadata as SIP headers
        3. Enables recording if requested
        """
        from twilio.twiml.voice_response import VoiceResponse, Dial, Sip

        response = VoiceResponse()

        # Optional: Play a brief message while connecting
        # response.say("Connecting you to an agent. Please hold.")

        # Create dial verb with timeout
        dial = Dial(
            timeout=timeout,
            action=f"{os.getenv('VOICE_WEBHOOK_BASE_URL', '')}/api/voice/webhooks/twilio/sip-status",
            record="record-from-answer" if record else "do-not-record"
        )

        # Build SIP URI with room and participant info
        sip_uri = self._build_sip_uri(
            room_name=room_name,
            participant_identity=f"caller-{call_id[:8]}",
            participant_name=f"Caller {from_number[-4:]}",
            metadata={
                'call_id': call_id,
                'from_number': from_number,
                'to_number': to_number,
                'agent_id': agent_id
            }
        )

        # Add SIP endpoint
        sip = Sip(
            sip_uri,
            username=os.getenv('LIVEKIT_SIP_USERNAME', ''),
            password=os.getenv('LIVEKIT_SIP_PASSWORD', '')
        )

        dial.append(sip)
        response.append(dial)

        # Fallback if SIP connection fails
        response.say("We're sorry, but we're unable to connect your call at this time. Please try again later.")
        response.hangup()

        twiml = str(response)
        logger.debug(f"[TwilioLiveKitBridge] Generated TwiML for call {call_id}")

        return twiml

    def generate_twiml_for_outbound(
        self,
        room_name: str,
        from_number: str,
        to_number: str,
        call_id: str,
        agent_id: Optional[str] = None,
        record: bool = True
    ) -> str:
        """
        Generate TwiML to connect outbound call to LiveKit room via SIP.

        Similar to inbound but optimized for agent-initiated calls.
        """
        from twilio.twiml.voice_response import VoiceResponse, Dial, Sip

        response = VoiceResponse()

        dial = Dial(
            timeout=30,
            action=f"{os.getenv('VOICE_WEBHOOK_BASE_URL', '')}/api/voice/webhooks/twilio/sip-status",
            record="record-from-answer" if record else "do-not-record"
        )

        sip_uri = self._build_sip_uri(
            room_name=room_name,
            participant_identity=f"outbound-{call_id[:8]}",
            participant_name=f"Customer {to_number[-4:]}",
            metadata={
                'call_id': call_id,
                'from_number': from_number,
                'to_number': to_number,
                'agent_id': agent_id,
                'direction': 'outbound'
            }
        )

        sip = Sip(
            sip_uri,
            username=os.getenv('LIVEKIT_SIP_USERNAME', ''),
            password=os.getenv('LIVEKIT_SIP_PASSWORD', '')
        )

        dial.append(sip)
        response.append(dial)

        response.say("We're unable to complete your call. Please try again.")
        response.hangup()

        return str(response)

    def _build_sip_uri(
        self,
        room_name: str,
        participant_identity: str,
        participant_name: str,
        metadata: Dict[str, Any]
    ) -> str:
        """
        Build SIP URI with LiveKit room and participant info.

        Format: sip:room_name@sip.livekit.io
        Metadata passed via SIP headers (handled by LiveKit)
        """
        # For LiveKit, the SIP URI format is:
        # sip:{room_name}@{sip_domain}
        # Additional params like participant identity are passed via headers

        base_uri = f"{room_name}@{self.sip_domain}"

        # Add query parameters for participant info
        # Note: LiveKit expects these as SIP headers, but we can encode them in URI for some SIP servers
        params = []
        params.append(f"identity={participant_identity}")
        params.append(f"name={participant_name}")

        # Join params
        if params:
            uri = f"sip:{base_uri}?{'&'.join(params)}"
        else:
            uri = f"sip:{base_uri}"

        logger.debug(f"[TwilioLiveKitBridge] Built SIP URI: {uri}")
        return uri

    # ==================== Connection Management ====================

    async def create_sip_connection(
        self,
        call_id: str,
        room_id: str,
        from_number: str,
        to_number: str,
        twilio_call_sid: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> SIPConnection:
        """Create a SIP connection record"""
        connection_id = str(uuid.uuid4())

        connection = SIPConnection(
            id=connection_id,
            call_id=call_id,
            room_id=room_id,
            from_number=from_number,
            to_number=to_number,
            status=SIPConnectionStatus.CONNECTING,
            twilio_call_sid=twilio_call_sid,
            sip_domain=self.sip_domain,
            metadata=metadata or {}
        )

        self._connections[connection_id] = connection
        self.stats["connections_created"] += 1

        logger.info(f"[TwilioLiveKitBridge] SIP connection created: {connection_id} for call {call_id}")
        return connection

    async def update_connection_status(
        self,
        connection_id: str,
        status: SIPConnectionStatus
    ):
        """Update SIP connection status"""
        connection = self._connections.get(connection_id)
        if not connection:
            logger.warning(f"[TwilioLiveKitBridge] Connection not found: {connection_id}")
            return

        connection.status = status

        if status == SIPConnectionStatus.CONNECTED:
            connection.connected_at = datetime.now()
            self.stats["connections_successful"] += 1
            logger.info(f"[TwilioLiveKitBridge] SIP connection established: {connection_id}")

            if self._on_connection_established:
                await self._on_connection_established(connection)

        elif status == SIPConnectionStatus.FAILED:
            connection.disconnected_at = datetime.now()
            self.stats["connections_failed"] += 1
            logger.warning(f"[TwilioLiveKitBridge] SIP connection failed: {connection_id}")

            if self._on_connection_failed:
                await self._on_connection_failed(connection)

        elif status == SIPConnectionStatus.DISCONNECTED:
            connection.disconnected_at = datetime.now()

            # Calculate duration
            if connection.connected_at and connection.disconnected_at:
                duration = (connection.disconnected_at - connection.connected_at).total_seconds()
                self.stats["total_duration_seconds"] += int(duration)

            logger.info(f"[TwilioLiveKitBridge] SIP connection ended: {connection_id}")

            if self._on_connection_ended:
                await self._on_connection_ended(connection)

            # Remove from active connections
            del self._connections[connection_id]

    async def get_connection_by_call_id(self, call_id: str) -> Optional[SIPConnection]:
        """Get SIP connection by call ID"""
        for connection in self._connections.values():
            if connection.call_id == call_id:
                return connection
        return None

    async def get_connection_by_twilio_sid(self, twilio_call_sid: str) -> Optional[SIPConnection]:
        """Get SIP connection by Twilio call SID"""
        for connection in self._connections.values():
            if connection.twilio_call_sid == twilio_call_sid:
                return connection
        return None

    # ==================== Call Routing ====================

    async def route_call_to_room(
        self,
        call_id: str,
        user_id: str,
        agent_id: str,
        from_number: str,
        to_number: str,
        twilio_call_sid: str
    ) -> Dict[str, Any]:
        """
        Route a Twilio call to a LiveKit room.

        Returns:
        - room: LiveKitRoom
        - connection: SIPConnection
        - twiml: TwiML response string
        """
        if not self.is_configured():
            raise ValueError("TwilioLiveKitBridge not configured")

        try:
            # Create LiveKit room for this call
            room = await self.livekit_manager.create_room(
                user_id=user_id,
                agent_id=agent_id,
                call_id=call_id,
                room_name=f"call-{call_id[:8]}",
                max_participants=5,
                empty_timeout=60,  # Close after 1 minute if empty
                metadata={
                    'call_id': call_id,
                    'from_number': from_number,
                    'to_number': to_number
                }
            )

            # Create SIP connection
            connection = await self.create_sip_connection(
                call_id=call_id,
                room_id=room.id,
                from_number=from_number,
                to_number=to_number,
                twilio_call_sid=twilio_call_sid,
                metadata={'agent_id': agent_id}
            )

            # Generate TwiML to connect call to room
            twiml = self.generate_twiml_for_inbound(
                room_name=room.name,
                from_number=from_number,
                to_number=to_number,
                call_id=call_id,
                agent_id=agent_id,
                record=True
            )

            logger.info(f"[TwilioLiveKitBridge] Routed call {call_id} to room {room.name}")

            return {
                'success': True,
                'room': room,
                'connection': connection,
                'twiml': twiml
            }

        except Exception as e:
            logger.error(f"[TwilioLiveKitBridge] Failed to route call: {e}")
            return {
                'success': False,
                'error': str(e)
            }

    async def generate_agent_token(
        self,
        room_name: str,
        agent_id: str
    ) -> str:
        """
        Generate LiveKit access token for agent to join room.

        Agent joins the same room as the SIP participant to handle the call.
        """
        token = self.livekit_manager.generate_token(
            room_name=room_name,
            participant_identity=f"agent-{agent_id}",
            participant_name=f"Agent {agent_id[:8]}",
            metadata={'role': 'agent', 'agent_id': agent_id},
            ttl=3600,
            can_publish=True,
            can_subscribe=True,
            can_publish_data=True
        )

        logger.debug(f"[TwilioLiveKitBridge] Generated agent token for room {room_name}")
        return token

    # ==================== Event Callbacks ====================

    def on_connection_established(self, callback: Callable):
        """Register callback for when SIP connection is established"""
        self._on_connection_established = callback

    def on_connection_failed(self, callback: Callable):
        """Register callback for when SIP connection fails"""
        self._on_connection_failed = callback

    def on_connection_ended(self, callback: Callable):
        """Register callback for when SIP connection ends"""
        self._on_connection_ended = callback

    # ==================== Status and Metrics ====================

    def get_active_connections(self) -> list[SIPConnection]:
        """Get all active SIP connections"""
        return [
            c for c in self._connections.values()
            if c.status in [SIPConnectionStatus.CONNECTING, SIPConnectionStatus.CONNECTED]
        ]

    def get_connection_count(self) -> int:
        """Get count of active connections"""
        return len(self._connections)

    def get_stats(self) -> Dict[str, Any]:
        """Get bridge statistics"""
        return {
            **self.stats,
            "active_connections": self.get_connection_count()
        }


# Singleton accessor
_twilio_livekit_bridge: Optional[TwilioLiveKitBridge] = None


def get_twilio_livekit_bridge() -> TwilioLiveKitBridge:
    """Get the singleton TwilioLiveKitBridge instance"""
    global _twilio_livekit_bridge
    if _twilio_livekit_bridge is None:
        _twilio_livekit_bridge = TwilioLiveKitBridge()
    return _twilio_livekit_bridge
