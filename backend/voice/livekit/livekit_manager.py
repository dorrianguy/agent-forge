"""
LiveKit Manager for Agent Forge Voice

Manages LiveKit rooms, token generation, and participant tracking.
Follows the singleton pattern from telephony.py and collaboration.py.
"""

import os
import asyncio
import logging
from datetime import datetime, timedelta
from enum import Enum
from dataclasses import dataclass, field
from typing import Dict, Any, Optional, List, Set, Callable
import uuid

logger = logging.getLogger(__name__)


class RoomStatus(Enum):
    """LiveKit room status"""
    CREATING = "creating"
    ACTIVE = "active"
    CLOSING = "closing"
    CLOSED = "closed"


class ParticipantRole(Enum):
    """Participant role in LiveKit room"""
    AGENT = "agent"
    CALLER = "caller"
    OBSERVER = "observer"
    HUMAN_AGENT = "human_agent"


@dataclass
class ParticipantInfo:
    """Information about a room participant"""
    id: str
    identity: str
    name: str
    role: ParticipantRole
    room_id: str
    joined_at: datetime = field(default_factory=datetime.now)
    left_at: Optional[datetime] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    is_connected: bool = False
    tracks: List[str] = field(default_factory=list)


@dataclass
class LiveKitRoom:
    """Represents a LiveKit room"""
    id: str
    name: str
    user_id: str
    agent_id: Optional[str]
    call_id: Optional[str]
    status: RoomStatus = RoomStatus.CREATING
    created_at: datetime = field(default_factory=datetime.now)
    closed_at: Optional[datetime] = None
    participants: Dict[str, ParticipantInfo] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)
    max_participants: int = 10
    empty_timeout: int = 300  # Close room after 5 minutes if empty


class LiveKitManager:
    """
    Manages LiveKit rooms and participant connections.

    Provides:
    - Room creation and lifecycle management
    - Access token generation for participants
    - Participant tracking and state management
    - WebRTC connection coordination

    Follows the singleton pattern from collaboration.py.
    """

    _instance: Optional['LiveKitManager'] = None

    def __new__(cls) -> 'LiveKitManager':
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return

        # LiveKit credentials from environment
        self.api_key = os.getenv('LIVEKIT_API_KEY', '')
        self.api_secret = os.getenv('LIVEKIT_API_SECRET', '')
        self.livekit_url = os.getenv('LIVEKIT_URL', 'wss://livekit.example.com')

        # Active rooms (room_id -> LiveKitRoom)
        self._rooms: Dict[str, LiveKitRoom] = {}

        # Event callbacks
        self._on_room_created: Optional[Callable] = None
        self._on_room_closed: Optional[Callable] = None
        self._on_participant_joined: Optional[Callable] = None
        self._on_participant_left: Optional[Callable] = None

        # Background task for cleanup
        self._cleanup_task: Optional[asyncio.Task] = None
        self._running = False

        # Stats tracking
        self.stats = {
            "rooms_created": 0,
            "rooms_closed": 0,
            "participants_joined": 0,
            "participants_left": 0,
            "total_duration_minutes": 0
        }

        self._initialized = True
        logger.info('[LiveKitManager] Initialized')

    def is_configured(self) -> bool:
        """Check if LiveKit is properly configured"""
        return bool(self.api_key and self.api_secret and self.livekit_url)

    async def start(self):
        """Start the LiveKit manager"""
        self._running = True
        self._cleanup_task = asyncio.create_task(self._cleanup_loop())
        logger.info('[LiveKitManager] Started')

    async def stop(self):
        """Stop the LiveKit manager"""
        self._running = False
        if self._cleanup_task:
            self._cleanup_task.cancel()
            try:
                await self._cleanup_task
            except asyncio.CancelledError:
                pass

        # Close all active rooms
        for room in list(self._rooms.values()):
            await self.close_room(room.id)

        logger.info('[LiveKitManager] Stopped')

    # ==================== Room Management ====================

    async def create_room(
        self,
        user_id: str,
        agent_id: Optional[str] = None,
        call_id: Optional[str] = None,
        room_name: Optional[str] = None,
        max_participants: int = 10,
        empty_timeout: int = 300,
        metadata: Optional[Dict[str, Any]] = None
    ) -> LiveKitRoom:
        """Create a new LiveKit room"""
        if not self.is_configured():
            raise ValueError("LiveKit not configured. Set LIVEKIT_API_KEY, LIVEKIT_API_SECRET, LIVEKIT_URL")

        room_id = str(uuid.uuid4())
        room_name = room_name or f"room-{room_id[:8]}"

        room = LiveKitRoom(
            id=room_id,
            name=room_name,
            user_id=user_id,
            agent_id=agent_id,
            call_id=call_id,
            status=RoomStatus.CREATING,
            max_participants=max_participants,
            empty_timeout=empty_timeout,
            metadata=metadata or {}
        )

        try:
            # Create room using LiveKit API
            await self._livekit_create_room(room)

            room.status = RoomStatus.ACTIVE
            self._rooms[room_id] = room
            self.stats["rooms_created"] += 1

            logger.info(f"[LiveKitManager] Created room: {room_name} ({room_id})")

            if self._on_room_created:
                await self._on_room_created(room)

            return room

        except Exception as e:
            logger.error(f"[LiveKitManager] Failed to create room: {e}")
            raise

    async def _livekit_create_room(self, room: LiveKitRoom):
        """Create room via LiveKit API"""
        try:
            from livekit import api

            # Create LiveKit API client
            livekit_api = api.LiveKitAPI(
                url=self.livekit_url,
                api_key=self.api_key,
                api_secret=self.api_secret
            )

            # Create room with configuration
            await livekit_api.room.create_room(
                api.CreateRoomRequest(
                    name=room.name,
                    empty_timeout=room.empty_timeout,
                    max_participants=room.max_participants,
                    metadata=str(room.metadata)
                )
            )

            logger.debug(f"[LiveKitManager] LiveKit room created: {room.name}")

        except ImportError:
            logger.warning("[LiveKitManager] LiveKit SDK not installed. Run: pip install livekit")
            # Allow room to be created in memory even without SDK for development
        except Exception as e:
            logger.error(f"[LiveKitManager] LiveKit API error: {e}")
            raise

    async def get_room(self, room_id: str) -> Optional[LiveKitRoom]:
        """Get a room by ID"""
        return self._rooms.get(room_id)

    async def get_room_by_call_id(self, call_id: str) -> Optional[LiveKitRoom]:
        """Get a room by associated call ID"""
        for room in self._rooms.values():
            if room.call_id == call_id:
                return room
        return None

    async def close_room(self, room_id: str) -> bool:
        """Close a LiveKit room"""
        room = self._rooms.get(room_id)
        if not room:
            return False

        try:
            room.status = RoomStatus.CLOSING

            # Delete room via LiveKit API
            await self._livekit_delete_room(room.name)

            # Disconnect all participants
            for participant in room.participants.values():
                participant.is_connected = False
                participant.left_at = datetime.now()

            room.status = RoomStatus.CLOSED
            room.closed_at = datetime.now()

            # Calculate duration
            if room.created_at and room.closed_at:
                duration_minutes = (room.closed_at - room.created_at).total_seconds() / 60
                self.stats["total_duration_minutes"] += int(duration_minutes)

            self.stats["rooms_closed"] += 1

            # Remove from active rooms
            del self._rooms[room_id]

            logger.info(f"[LiveKitManager] Closed room: {room.name} ({room_id})")

            if self._on_room_closed:
                await self._on_room_closed(room)

            return True

        except Exception as e:
            logger.error(f"[LiveKitManager] Failed to close room {room_id}: {e}")
            return False

    async def _livekit_delete_room(self, room_name: str):
        """Delete room via LiveKit API"""
        try:
            from livekit import api

            livekit_api = api.LiveKitAPI(
                url=self.livekit_url,
                api_key=self.api_key,
                api_secret=self.api_secret
            )

            await livekit_api.room.delete_room(
                api.DeleteRoomRequest(room=room_name)
            )

            logger.debug(f"[LiveKitManager] LiveKit room deleted: {room_name}")

        except ImportError:
            logger.debug("[LiveKitManager] LiveKit SDK not installed, skipping API deletion")
        except Exception as e:
            logger.warning(f"[LiveKitManager] Failed to delete LiveKit room: {e}")

    # ==================== Token Generation ====================

    def generate_token(
        self,
        room_name: str,
        participant_identity: str,
        participant_name: str,
        metadata: Optional[Dict[str, Any]] = None,
        ttl: int = 3600,
        can_publish: bool = True,
        can_subscribe: bool = True,
        can_publish_data: bool = True
    ) -> str:
        """Generate an access token for a participant"""
        if not self.is_configured():
            raise ValueError("LiveKit not configured")

        try:
            from livekit import api

            # Create access token
            token = api.AccessToken(
                api_key=self.api_key,
                api_secret=self.api_secret
            )

            # Set grants
            token.with_identity(participant_identity)
            token.with_name(participant_name)
            token.with_ttl(timedelta(seconds=ttl))

            if metadata:
                token.with_metadata(str(metadata))

            # Room permissions
            token.with_grants(
                api.VideoGrants(
                    room_join=True,
                    room=room_name,
                    can_publish=can_publish,
                    can_subscribe=can_subscribe,
                    can_publish_data=can_publish_data
                )
            )

            jwt_token = token.to_jwt()
            logger.debug(f"[LiveKitManager] Generated token for {participant_identity} in {room_name}")

            return jwt_token

        except ImportError:
            logger.error("[LiveKitManager] LiveKit SDK not installed. Run: pip install livekit")
            raise
        except Exception as e:
            logger.error(f"[LiveKitManager] Failed to generate token: {e}")
            raise

    # ==================== Participant Management ====================

    async def add_participant(
        self,
        room_id: str,
        identity: str,
        name: str,
        role: ParticipantRole,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Optional[ParticipantInfo]:
        """Add a participant to a room"""
        room = self._rooms.get(room_id)
        if not room:
            logger.warning(f"[LiveKitManager] Room not found: {room_id}")
            return None

        if len(room.participants) >= room.max_participants:
            logger.warning(f"[LiveKitManager] Room {room_id} is full")
            return None

        participant = ParticipantInfo(
            id=str(uuid.uuid4()),
            identity=identity,
            name=name,
            role=role,
            room_id=room_id,
            metadata=metadata or {},
            is_connected=True
        )

        room.participants[participant.id] = participant
        self.stats["participants_joined"] += 1

        logger.info(f"[LiveKitManager] Participant joined: {name} ({identity}) in room {room.name}")

        if self._on_participant_joined:
            await self._on_participant_joined(participant)

        return participant

    async def remove_participant(
        self,
        room_id: str,
        participant_id: str
    ) -> bool:
        """Remove a participant from a room"""
        room = self._rooms.get(room_id)
        if not room:
            return False

        participant = room.participants.get(participant_id)
        if not participant:
            return False

        participant.is_connected = False
        participant.left_at = datetime.now()

        del room.participants[participant_id]
        self.stats["participants_left"] += 1

        logger.info(f"[LiveKitManager] Participant left: {participant.name} from room {room.name}")

        if self._on_participant_left:
            await self._on_participant_left(participant)

        # Check if room should be closed (empty timeout)
        if len(room.participants) == 0:
            asyncio.create_task(self._schedule_room_closure(room_id, room.empty_timeout))

        return True

    async def get_participant(
        self,
        room_id: str,
        participant_id: str
    ) -> Optional[ParticipantInfo]:
        """Get participant info"""
        room = self._rooms.get(room_id)
        if not room:
            return None
        return room.participants.get(participant_id)

    async def get_room_participants(
        self,
        room_id: str
    ) -> List[ParticipantInfo]:
        """Get all participants in a room"""
        room = self._rooms.get(room_id)
        if not room:
            return []
        return list(room.participants.values())

    # ==================== Room Cleanup ====================

    async def _schedule_room_closure(self, room_id: str, delay_seconds: int):
        """Schedule room closure after delay if still empty"""
        await asyncio.sleep(delay_seconds)

        room = self._rooms.get(room_id)
        if room and len(room.participants) == 0:
            logger.info(f"[LiveKitManager] Closing empty room: {room.name}")
            await self.close_room(room_id)

    async def _cleanup_loop(self):
        """Background task to clean up stale rooms"""
        while self._running:
            try:
                await asyncio.sleep(60)  # Check every minute

                now = datetime.now()
                rooms_to_close = []

                for room_id, room in self._rooms.items():
                    # Close rooms that have been empty for too long
                    if len(room.participants) == 0:
                        age_seconds = (now - room.created_at).total_seconds()
                        if age_seconds > room.empty_timeout:
                            rooms_to_close.append(room_id)

                    # Close rooms older than 24 hours regardless
                    age_hours = (now - room.created_at).total_seconds() / 3600
                    if age_hours > 24:
                        rooms_to_close.append(room_id)

                for room_id in rooms_to_close:
                    logger.info(f"[LiveKitManager] Cleaning up stale room: {room_id}")
                    await self.close_room(room_id)

            except asyncio.CancelledError:
                break
            except Exception as e:
                logger.error(f"[LiveKitManager] Cleanup error: {e}")

    # ==================== Event Callbacks ====================

    def on_room_created(self, callback: Callable):
        """Register callback for room creation"""
        self._on_room_created = callback

    def on_room_closed(self, callback: Callable):
        """Register callback for room closure"""
        self._on_room_closed = callback

    def on_participant_joined(self, callback: Callable):
        """Register callback for participant join"""
        self._on_participant_joined = callback

    def on_participant_left(self, callback: Callable):
        """Register callback for participant leave"""
        self._on_participant_left = callback

    # ==================== Status and Metrics ====================

    def get_active_rooms(self) -> List[LiveKitRoom]:
        """Get all active rooms"""
        return [r for r in self._rooms.values() if r.status == RoomStatus.ACTIVE]

    def get_room_count(self) -> int:
        """Get count of active rooms"""
        return len(self._rooms)

    def get_total_participants(self) -> int:
        """Get total participant count across all rooms"""
        return sum(len(room.participants) for room in self._rooms.values())

    def get_stats(self) -> Dict[str, Any]:
        """Get manager statistics"""
        return {
            **self.stats,
            "active_rooms": self.get_room_count(),
            "total_participants": self.get_total_participants()
        }


# Singleton accessor
_livekit_manager: Optional[LiveKitManager] = None


def get_livekit_manager() -> LiveKitManager:
    """Get the singleton LiveKitManager instance"""
    global _livekit_manager
    if _livekit_manager is None:
        _livekit_manager = LiveKitManager()
    return _livekit_manager
