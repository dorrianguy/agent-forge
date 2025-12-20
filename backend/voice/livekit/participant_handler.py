"""
Participant Handler for Agent Forge LiveKit Integration

Manages participant lifecycle, audio track handling, and connection state.
Handles both agent participants and caller participants.
"""

import asyncio
import logging
from enum import Enum
from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, Any, Optional, Callable, List
import uuid

logger = logging.getLogger(__name__)


class ParticipantState(Enum):
    """Participant connection state"""
    CONNECTING = "connecting"
    CONNECTED = "connected"
    RECONNECTING = "reconnecting"
    DISCONNECTING = "disconnecting"
    DISCONNECTED = "disconnected"
    FAILED = "failed"


class TrackType(Enum):
    """Audio track type"""
    AUDIO_INPUT = "audio_input"
    AUDIO_OUTPUT = "audio_output"


@dataclass
class AudioTrack:
    """Represents an audio track"""
    id: str
    participant_id: str
    track_type: TrackType
    track_sid: Optional[str] = None
    enabled: bool = True
    muted: bool = False
    volume: float = 1.0
    created_at: datetime = field(default_factory=datetime.now)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ParticipantMetrics:
    """Metrics for a participant"""
    packets_sent: int = 0
    packets_received: int = 0
    bytes_sent: int = 0
    bytes_received: int = 0
    packet_loss: float = 0.0
    jitter: float = 0.0
    latency_ms: float = 0.0
    audio_level: float = 0.0
    last_updated: datetime = field(default_factory=datetime.now)


class AudioTrackHandler:
    """
    Handles audio track operations for a participant.

    Manages:
    - Track publishing and subscription
    - Audio level monitoring
    - Mute/unmute
    - Volume control
    """

    def __init__(self, participant_id: str):
        self.participant_id = participant_id
        self.tracks: Dict[str, AudioTrack] = {}
        self._audio_callbacks: List[Callable] = []

        logger.debug(f"[AudioTrackHandler] Initialized for participant {participant_id}")

    def add_track(
        self,
        track_type: TrackType,
        track_sid: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> AudioTrack:
        """Add an audio track"""
        track = AudioTrack(
            id=str(uuid.uuid4()),
            participant_id=self.participant_id,
            track_type=track_type,
            track_sid=track_sid,
            metadata=metadata or {}
        )

        self.tracks[track.id] = track
        logger.debug(f"[AudioTrackHandler] Added {track_type.value} track {track.id}")

        return track

    def remove_track(self, track_id: str) -> bool:
        """Remove an audio track"""
        if track_id in self.tracks:
            track = self.tracks[track_id]
            del self.tracks[track_id]
            logger.debug(f"[AudioTrackHandler] Removed track {track_id}")
            return True
        return False

    def get_track(self, track_id: str) -> Optional[AudioTrack]:
        """Get a track by ID"""
        return self.tracks.get(track_id)

    def get_tracks_by_type(self, track_type: TrackType) -> List[AudioTrack]:
        """Get all tracks of a specific type"""
        return [t for t in self.tracks.values() if t.track_type == track_type]

    def mute_track(self, track_id: str) -> bool:
        """Mute an audio track"""
        track = self.tracks.get(track_id)
        if track:
            track.muted = True
            logger.debug(f"[AudioTrackHandler] Muted track {track_id}")
            return True
        return False

    def unmute_track(self, track_id: str) -> bool:
        """Unmute an audio track"""
        track = self.tracks.get(track_id)
        if track:
            track.muted = False
            logger.debug(f"[AudioTrackHandler] Unmuted track {track_id}")
            return True
        return False

    def set_volume(self, track_id: str, volume: float) -> bool:
        """Set track volume (0.0 to 1.0)"""
        track = self.tracks.get(track_id)
        if track:
            track.volume = max(0.0, min(1.0, volume))
            logger.debug(f"[AudioTrackHandler] Set track {track_id} volume to {track.volume}")
            return True
        return False

    def enable_track(self, track_id: str) -> bool:
        """Enable an audio track"""
        track = self.tracks.get(track_id)
        if track:
            track.enabled = True
            logger.debug(f"[AudioTrackHandler] Enabled track {track_id}")
            return True
        return False

    def disable_track(self, track_id: str) -> bool:
        """Disable an audio track"""
        track = self.tracks.get(track_id)
        if track:
            track.enabled = False
            logger.debug(f"[AudioTrackHandler] Disabled track {track_id}")
            return True
        return False

    def on_audio_data(self, callback: Callable):
        """Register callback for audio data"""
        self._audio_callbacks.append(callback)

    async def process_audio_frame(self, frame_data: bytes, track_id: str):
        """Process an audio frame from a track"""
        for callback in self._audio_callbacks:
            try:
                if asyncio.iscoroutinefunction(callback):
                    await callback(track_id, frame_data)
                else:
                    callback(track_id, frame_data)
            except Exception as e:
                logger.error(f"[AudioTrackHandler] Audio callback error: {e}")

    def get_all_tracks(self) -> List[AudioTrack]:
        """Get all tracks"""
        return list(self.tracks.values())

    def clear_tracks(self):
        """Remove all tracks"""
        count = len(self.tracks)
        self.tracks.clear()
        logger.debug(f"[AudioTrackHandler] Cleared {count} tracks")


class ParticipantHandler:
    """
    Manages the lifecycle of a participant in a LiveKit room.

    Handles:
    - Connection state management
    - Audio track publishing/subscription
    - Reconnection logic
    - Metrics collection
    - Event callbacks
    """

    def __init__(
        self,
        participant_id: str,
        room_id: str,
        identity: str,
        name: str,
        is_agent: bool = False
    ):
        self.participant_id = participant_id
        self.room_id = room_id
        self.identity = identity
        self.name = name
        self.is_agent = is_agent

        # Connection state
        self.state = ParticipantState.CONNECTING
        self.connected_at: Optional[datetime] = None
        self.disconnected_at: Optional[datetime] = None

        # Audio track handler
        self.audio_handler = AudioTrackHandler(participant_id)

        # Metrics
        self.metrics = ParticipantMetrics()

        # Metadata
        self.metadata: Dict[str, Any] = {}

        # Event callbacks
        self._on_state_changed: Optional[Callable] = None
        self._on_track_published: Optional[Callable] = None
        self._on_track_unpublished: Optional[Callable] = None
        self._on_track_subscribed: Optional[Callable] = None
        self._on_track_unsubscribed: Optional[Callable] = None
        self._on_speaking_changed: Optional[Callable] = None

        # Reconnection
        self._reconnect_attempts = 0
        self._max_reconnect_attempts = 5
        self._reconnect_task: Optional[asyncio.Task] = None

        # Speaking detection
        self.is_speaking = False
        self._speaking_threshold = 0.1  # Audio level threshold

        logger.info(f"[ParticipantHandler] Initialized for {name} ({identity})")

    # ==================== Connection Management ====================

    async def connect(self):
        """Handle participant connection"""
        self._update_state(ParticipantState.CONNECTING)

        try:
            # Connection logic would be handled by LiveKit SDK
            # This is a placeholder for state management

            self.connected_at = datetime.now()
            self._update_state(ParticipantState.CONNECTED)
            self._reconnect_attempts = 0

            logger.info(f"[ParticipantHandler] {self.name} connected")

        except Exception as e:
            logger.error(f"[ParticipantHandler] Connection failed for {self.name}: {e}")
            self._update_state(ParticipantState.FAILED)

    async def disconnect(self):
        """Handle participant disconnection"""
        self._update_state(ParticipantState.DISCONNECTING)

        # Cancel reconnection if active
        if self._reconnect_task:
            self._reconnect_task.cancel()

        # Clear all tracks
        self.audio_handler.clear_tracks()

        self.disconnected_at = datetime.now()
        self._update_state(ParticipantState.DISCONNECTED)

        logger.info(f"[ParticipantHandler] {self.name} disconnected")

    async def reconnect(self):
        """Handle participant reconnection"""
        if self._reconnect_attempts >= self._max_reconnect_attempts:
            logger.error(f"[ParticipantHandler] Max reconnection attempts reached for {self.name}")
            self._update_state(ParticipantState.FAILED)
            return

        self._reconnect_attempts += 1
        self._update_state(ParticipantState.RECONNECTING)

        logger.info(f"[ParticipantHandler] Reconnecting {self.name} (attempt {self._reconnect_attempts})")

        # Exponential backoff
        delay = min(2 ** self._reconnect_attempts, 30)
        await asyncio.sleep(delay)

        await self.connect()

    def _update_state(self, new_state: ParticipantState):
        """Update participant state and trigger callback"""
        old_state = self.state
        self.state = new_state

        logger.debug(f"[ParticipantHandler] {self.name} state: {old_state.value} -> {new_state.value}")

        if self._on_state_changed:
            asyncio.create_task(self._on_state_changed(old_state, new_state))

    # ==================== Track Management ====================

    async def publish_audio_track(
        self,
        track_sid: Optional[str] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> AudioTrack:
        """Publish an audio track"""
        track = self.audio_handler.add_track(
            track_type=TrackType.AUDIO_OUTPUT,
            track_sid=track_sid,
            metadata=metadata
        )

        logger.info(f"[ParticipantHandler] {self.name} published audio track {track.id}")

        if self._on_track_published:
            await self._on_track_published(track)

        return track

    async def unpublish_audio_track(self, track_id: str) -> bool:
        """Unpublish an audio track"""
        success = self.audio_handler.remove_track(track_id)

        if success:
            logger.info(f"[ParticipantHandler] {self.name} unpublished track {track_id}")

            if self._on_track_unpublished:
                await self._on_track_unpublished(track_id)

        return success

    async def subscribe_to_track(
        self,
        track_sid: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> AudioTrack:
        """Subscribe to another participant's track"""
        track = self.audio_handler.add_track(
            track_type=TrackType.AUDIO_INPUT,
            track_sid=track_sid,
            metadata=metadata
        )

        logger.info(f"[ParticipantHandler] {self.name} subscribed to track {track.id}")

        if self._on_track_subscribed:
            await self._on_track_subscribed(track)

        return track

    async def unsubscribe_from_track(self, track_id: str) -> bool:
        """Unsubscribe from a track"""
        success = self.audio_handler.remove_track(track_id)

        if success:
            logger.info(f"[ParticipantHandler] {self.name} unsubscribed from track {track_id}")

            if self._on_track_unsubscribed:
                await self._on_track_unsubscribed(track_id)

        return success

    # ==================== Audio Control ====================

    def mute(self, track_id: Optional[str] = None) -> bool:
        """Mute participant's audio (specific track or all output tracks)"""
        if track_id:
            return self.audio_handler.mute_track(track_id)
        else:
            # Mute all output tracks
            output_tracks = self.audio_handler.get_tracks_by_type(TrackType.AUDIO_OUTPUT)
            return all(self.audio_handler.mute_track(t.id) for t in output_tracks)

    def unmute(self, track_id: Optional[str] = None) -> bool:
        """Unmute participant's audio"""
        if track_id:
            return self.audio_handler.unmute_track(track_id)
        else:
            # Unmute all output tracks
            output_tracks = self.audio_handler.get_tracks_by_type(TrackType.AUDIO_OUTPUT)
            return all(self.audio_handler.unmute_track(t.id) for t in output_tracks)

    def set_volume(self, volume: float, track_id: Optional[str] = None) -> bool:
        """Set volume for participant's audio"""
        if track_id:
            return self.audio_handler.set_volume(track_id, volume)
        else:
            # Set volume for all input tracks
            input_tracks = self.audio_handler.get_tracks_by_type(TrackType.AUDIO_INPUT)
            return all(self.audio_handler.set_volume(t.id, volume) for t in input_tracks)

    # ==================== Speaking Detection ====================

    def update_audio_level(self, audio_level: float):
        """Update audio level and detect speaking state"""
        self.metrics.audio_level = audio_level
        self.metrics.last_updated = datetime.now()

        # Detect speaking state change
        is_speaking_now = audio_level > self._speaking_threshold
        if is_speaking_now != self.is_speaking:
            self.is_speaking = is_speaking_now

            if self._on_speaking_changed:
                asyncio.create_task(self._on_speaking_changed(self.is_speaking))

    def set_speaking_threshold(self, threshold: float):
        """Set the audio level threshold for speaking detection"""
        self._speaking_threshold = max(0.0, min(1.0, threshold))

    # ==================== Metrics ====================

    def update_metrics(
        self,
        packets_sent: Optional[int] = None,
        packets_received: Optional[int] = None,
        bytes_sent: Optional[int] = None,
        bytes_received: Optional[int] = None,
        packet_loss: Optional[float] = None,
        jitter: Optional[float] = None,
        latency_ms: Optional[float] = None
    ):
        """Update participant metrics"""
        if packets_sent is not None:
            self.metrics.packets_sent = packets_sent
        if packets_received is not None:
            self.metrics.packets_received = packets_received
        if bytes_sent is not None:
            self.metrics.bytes_sent = bytes_sent
        if bytes_received is not None:
            self.metrics.bytes_received = bytes_received
        if packet_loss is not None:
            self.metrics.packet_loss = packet_loss
        if jitter is not None:
            self.metrics.jitter = jitter
        if latency_ms is not None:
            self.metrics.latency_ms = latency_ms

        self.metrics.last_updated = datetime.now()

    def get_metrics(self) -> ParticipantMetrics:
        """Get participant metrics"""
        return self.metrics

    # ==================== Event Callbacks ====================

    def on_state_changed(self, callback: Callable):
        """Register callback for state changes"""
        self._on_state_changed = callback

    def on_track_published(self, callback: Callable):
        """Register callback for track published"""
        self._on_track_published = callback

    def on_track_unpublished(self, callback: Callable):
        """Register callback for track unpublished"""
        self._on_track_unpublished = callback

    def on_track_subscribed(self, callback: Callable):
        """Register callback for track subscribed"""
        self._on_track_subscribed = callback

    def on_track_unsubscribed(self, callback: Callable):
        """Register callback for track unsubscribed"""
        self._on_track_unsubscribed = callback

    def on_speaking_changed(self, callback: Callable):
        """Register callback for speaking state changes"""
        self._on_speaking_changed = callback

    # ==================== Utility Methods ====================

    def get_connection_duration(self) -> Optional[float]:
        """Get connection duration in seconds"""
        if not self.connected_at:
            return None

        end_time = self.disconnected_at or datetime.now()
        return (end_time - self.connected_at).total_seconds()

    def is_connected(self) -> bool:
        """Check if participant is currently connected"""
        return self.state == ParticipantState.CONNECTED

    def get_track_count(self) -> int:
        """Get total track count"""
        return len(self.audio_handler.tracks)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary representation"""
        return {
            'participant_id': self.participant_id,
            'room_id': self.room_id,
            'identity': self.identity,
            'name': self.name,
            'is_agent': self.is_agent,
            'state': self.state.value,
            'is_speaking': self.is_speaking,
            'connected_at': self.connected_at.isoformat() if self.connected_at else None,
            'disconnected_at': self.disconnected_at.isoformat() if self.disconnected_at else None,
            'connection_duration': self.get_connection_duration(),
            'track_count': self.get_track_count(),
            'metrics': {
                'audio_level': self.metrics.audio_level,
                'packet_loss': self.metrics.packet_loss,
                'jitter': self.metrics.jitter,
                'latency_ms': self.metrics.latency_ms
            },
            'metadata': self.metadata
        }
