"""
WebSocket Manager for Agent Forge Voice

Handles real-time audio streaming between browser/phone and server.
Provides bidirectional communication for voice agents with support for:
- Audio streaming (PCM 16-bit)
- Control messages (mute, unmute, end, transfer)
- Transcript streaming
- Status events
- Session management
"""

import os
import asyncio
import logging
import json
import uuid
from enum import Enum
from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, Any, Optional, List, Callable
from collections import defaultdict

from fastapi import WebSocket, WebSocketDisconnect, APIRouter, Depends, Query
from fastapi.responses import JSONResponse

logger = logging.getLogger(__name__)


# ==================== Message Types ====================

class MessageType(Enum):
    """WebSocket message types"""
    AUDIO = "audio"  # Raw audio bytes
    CONTROL = "control"  # Control commands (mute, unmute, end, transfer)
    TRANSCRIPT = "transcript"  # Speech-to-text results
    STATUS = "status"  # Status updates
    ERROR = "error"  # Error messages
    PING = "ping"  # Keep-alive
    PONG = "pong"  # Keep-alive response


class ControlCommand(Enum):
    """Control command types"""
    MUTE = "mute"
    UNMUTE = "unmute"
    END = "end"
    TRANSFER = "transfer"
    PAUSE = "pause"
    RESUME = "resume"


class SessionState(Enum):
    """Voice session states"""
    CONNECTING = "connecting"
    ACTIVE = "active"
    MUTED = "muted"
    PAUSED = "paused"
    TRANSFERRING = "transferring"
    ENDING = "ending"
    ENDED = "ended"
    ERROR = "error"


# ==================== Data Classes ====================

@dataclass
class AudioFormat:
    """Audio format specification"""
    encoding: str = "pcm"  # pcm, opus, mulaw
    sample_rate: int = 16000  # Hz
    bit_depth: int = 16  # bits per sample
    channels: int = 1  # mono
    chunk_duration_ms: int = 20  # milliseconds

    @property
    def chunk_size_bytes(self) -> int:
        """Calculate chunk size in bytes"""
        samples_per_chunk = (self.sample_rate * self.chunk_duration_ms) // 1000
        return samples_per_chunk * (self.bit_depth // 8) * self.channels


@dataclass
class VoiceSession:
    """Voice session data"""
    session_id: str
    user_id: Optional[str] = None
    agent_id: Optional[str] = None
    state: SessionState = SessionState.CONNECTING
    started_at: datetime = field(default_factory=datetime.now)
    ended_at: Optional[datetime] = None

    # Audio configuration
    input_format: AudioFormat = field(default_factory=lambda: AudioFormat(sample_rate=16000))
    output_format: AudioFormat = field(default_factory=lambda: AudioFormat(sample_rate=24000))

    # Session metadata
    metadata: Dict[str, Any] = field(default_factory=dict)

    # Statistics
    bytes_received: int = 0
    bytes_sent: int = 0
    messages_received: int = 0
    messages_sent: int = 0
    errors: int = 0


@dataclass
class ControlMessage:
    """Control message structure"""
    command: ControlCommand
    params: Dict[str, Any] = field(default_factory=dict)
    timestamp: datetime = field(default_factory=datetime.now)


@dataclass
class TranscriptMessage:
    """Transcript message structure"""
    text: str
    is_final: bool
    confidence: float
    timestamp: datetime = field(default_factory=datetime.now)
    speaker: Optional[str] = None
    language: Optional[str] = None


@dataclass
class StatusMessage:
    """Status message structure"""
    state: SessionState
    message: Optional[str] = None
    details: Dict[str, Any] = field(default_factory=dict)
    timestamp: datetime = field(default_factory=datetime.now)


# ==================== Voice Pipeline Placeholder ====================

class VoicePipeline:
    """
    Placeholder for VoicePipeline class.
    Will be replaced by actual implementation from pipeline.py
    """

    def __init__(self, session_id: str, config: Dict[str, Any] = None):
        self.session_id = session_id
        self.config = config or {}
        self.is_active = False

    async def start(self) -> None:
        """Start the pipeline"""
        self.is_active = True
        logger.info(f"Pipeline started for session: {self.session_id}")

    async def stop(self) -> None:
        """Stop the pipeline"""
        self.is_active = False
        logger.info(f"Pipeline stopped for session: {self.session_id}")

    async def process_audio(self, audio_data: bytes) -> Optional[bytes]:
        """
        Process incoming audio and return response audio.

        Args:
            audio_data: Raw audio bytes (PCM 16-bit, 16kHz mono)

        Returns:
            Response audio bytes (PCM 16-bit, 24kHz mono) or None
        """
        # Placeholder - actual implementation will:
        # 1. Send audio to ASR
        # 2. Process transcript with LLM
        # 3. Generate TTS response
        # 4. Return audio bytes
        return None

    async def handle_control(self, command: ControlCommand, params: Dict[str, Any]) -> Dict[str, Any]:
        """Handle control command"""
        return {"success": True, "command": command.value}


# ==================== WebSocket Manager ====================

class VoiceWebSocketManager:
    """
    Manages WebSocket connections for voice agents.
    Singleton pattern for global access.
    """

    _instance: Optional['VoiceWebSocketManager'] = None

    def __init__(self):
        # Active WebSocket connections
        self.active_connections: Dict[str, WebSocket] = {}

        # Voice pipelines per session
        self.pipelines: Dict[str, VoicePipeline] = {}

        # Session data
        self.sessions: Dict[str, VoiceSession] = {}

        # Event callbacks
        self._on_session_started: Optional[Callable] = None
        self._on_session_ended: Optional[Callable] = None
        self._on_audio_received: Optional[Callable] = None
        self._on_transcript: Optional[Callable] = None
        self._on_error: Optional[Callable] = None

        # Statistics
        self.stats = {
            'total_sessions': 0,
            'active_sessions': 0,
            'total_bytes_received': 0,
            'total_bytes_sent': 0,
            'total_messages': 0,
            'total_errors': 0
        }

        # Keep-alive settings
        self.ping_interval = 30  # seconds
        self.ping_timeout = 10  # seconds

        logger.info("VoiceWebSocketManager initialized")

    @classmethod
    def get_instance(cls) -> 'VoiceWebSocketManager':
        """Get singleton instance"""
        if cls._instance is None:
            cls._instance = cls()
        return cls._instance

    # ==================== Connection Management ====================

    async def connect(
        self,
        websocket: WebSocket,
        session_id: str,
        user_id: Optional[str] = None,
        agent_id: Optional[str] = None,
        config: Dict[str, Any] = None
    ) -> VoiceSession:
        """
        Accept and register a new WebSocket connection.

        Args:
            websocket: FastAPI WebSocket instance
            session_id: Unique session identifier
            user_id: Optional user ID
            agent_id: Optional agent ID
            config: Optional configuration

        Returns:
            VoiceSession instance
        """
        await websocket.accept()

        # Create session
        session = VoiceSession(
            session_id=session_id,
            user_id=user_id,
            agent_id=agent_id,
            metadata=config or {}
        )

        # Store connection and session
        self.active_connections[session_id] = websocket
        self.sessions[session_id] = session

        # Create and start pipeline
        pipeline = VoicePipeline(session_id, config)
        self.pipelines[session_id] = pipeline
        await pipeline.start()

        # Update stats
        self.stats['total_sessions'] += 1
        self.stats['active_sessions'] = len(self.active_connections)

        # Update session state
        session.state = SessionState.ACTIVE

        # Send initial status
        await self.send_status(
            session_id,
            SessionState.ACTIVE,
            "Session connected",
            {"session_id": session_id}
        )

        # Callback
        if self._on_session_started:
            await self._maybe_call_async(self._on_session_started, session)

        logger.info(f"WebSocket connected: {session_id} (user: {user_id}, agent: {agent_id})")

        return session

    async def disconnect(self, session_id: str, reason: str = "Normal closure") -> None:
        """
        Disconnect and cleanup a session.

        Args:
            session_id: Session identifier
            reason: Disconnect reason
        """
        # Get session
        session = self.sessions.get(session_id)
        if not session:
            logger.warning(f"Disconnect called for unknown session: {session_id}")
            return

        # Update session state
        session.state = SessionState.ENDED
        session.ended_at = datetime.now()

        # Stop pipeline
        pipeline = self.pipelines.get(session_id)
        if pipeline:
            await pipeline.stop()
            del self.pipelines[session_id]

        # Close WebSocket
        websocket = self.active_connections.get(session_id)
        if websocket:
            try:
                await websocket.close()
            except Exception as e:
                logger.warning(f"Error closing WebSocket for {session_id}: {e}")
            del self.active_connections[session_id]

        # Update stats
        self.stats['active_sessions'] = len(self.active_connections)

        # Callback
        if self._on_session_ended:
            await self._maybe_call_async(self._on_session_ended, session, reason)

        logger.info(f"WebSocket disconnected: {session_id} - {reason}")

        # Keep session data for analytics (could be moved to database)
        # For now, we keep it in memory

    # ==================== Audio Handling ====================

    async def handle_audio(self, session_id: str, audio_data: bytes) -> Optional[bytes]:
        """
        Process incoming audio data.

        Args:
            session_id: Session identifier
            audio_data: Raw audio bytes (PCM 16-bit, 16kHz mono)

        Returns:
            Response audio bytes (PCM 16-bit, 24kHz mono) or None
        """
        session = self.sessions.get(session_id)
        if not session:
            logger.warning(f"Audio received for unknown session: {session_id}")
            return None

        # Update stats
        session.bytes_received += len(audio_data)
        session.messages_received += 1
        self.stats['total_bytes_received'] += len(audio_data)

        # Get pipeline
        pipeline = self.pipelines.get(session_id)
        if not pipeline or not pipeline.is_active:
            logger.warning(f"No active pipeline for session: {session_id}")
            return None

        # Callback
        if self._on_audio_received:
            await self._maybe_call_async(self._on_audio_received, session_id, audio_data)

        try:
            # Process audio through pipeline
            response_audio = await pipeline.process_audio(audio_data)

            if response_audio:
                # Send response audio back
                await self.send_audio(session_id, response_audio)

            return response_audio

        except Exception as e:
            logger.error(f"Error processing audio for {session_id}: {e}")
            session.errors += 1
            self.stats['total_errors'] += 1
            await self.send_error(session_id, f"Audio processing error: {str(e)}")
            return None

    async def send_audio(self, session_id: str, audio_data: bytes) -> bool:
        """
        Send audio data to client.

        Args:
            session_id: Session identifier
            audio_data: Audio bytes to send (PCM 16-bit, 24kHz mono)

        Returns:
            True if sent successfully
        """
        websocket = self.active_connections.get(session_id)
        session = self.sessions.get(session_id)

        if not websocket or not session:
            return False

        try:
            # Send as binary message
            await websocket.send_bytes(audio_data)

            # Update stats
            session.bytes_sent += len(audio_data)
            session.messages_sent += 1
            self.stats['total_bytes_sent'] += len(audio_data)
            self.stats['total_messages'] += 1

            return True

        except Exception as e:
            logger.error(f"Error sending audio to {session_id}: {e}")
            session.errors += 1
            return False

    # ==================== Control Message Handling ====================

    async def handle_control(
        self,
        session_id: str,
        command: str,
        params: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """
        Handle control command.

        Args:
            session_id: Session identifier
            command: Control command (mute, unmute, end, transfer, etc.)
            params: Command parameters

        Returns:
            Result dictionary
        """
        session = self.sessions.get(session_id)
        if not session:
            return {"success": False, "error": "Session not found"}

        params = params or {}

        try:
            cmd = ControlCommand(command)

            if cmd == ControlCommand.MUTE:
                session.state = SessionState.MUTED
                await self.send_status(session_id, SessionState.MUTED, "Microphone muted")

            elif cmd == ControlCommand.UNMUTE:
                session.state = SessionState.ACTIVE
                await self.send_status(session_id, SessionState.ACTIVE, "Microphone unmuted")

            elif cmd == ControlCommand.PAUSE:
                session.state = SessionState.PAUSED
                await self.send_status(session_id, SessionState.PAUSED, "Session paused")

            elif cmd == ControlCommand.RESUME:
                session.state = SessionState.ACTIVE
                await self.send_status(session_id, SessionState.ACTIVE, "Session resumed")

            elif cmd == ControlCommand.END:
                session.state = SessionState.ENDING
                await self.send_status(session_id, SessionState.ENDING, "Ending session")
                await self.disconnect(session_id, "User requested end")

            elif cmd == ControlCommand.TRANSFER:
                target = params.get('target')
                if not target:
                    return {"success": False, "error": "Transfer target required"}
                session.state = SessionState.TRANSFERRING
                await self.send_status(
                    session_id,
                    SessionState.TRANSFERRING,
                    f"Transferring to {target}",
                    {"target": target}
                )

            # Forward to pipeline
            pipeline = self.pipelines.get(session_id)
            if pipeline:
                await pipeline.handle_control(cmd, params)

            return {"success": True, "command": command, "state": session.state.value}

        except ValueError:
            return {"success": False, "error": f"Unknown command: {command}"}
        except Exception as e:
            logger.error(f"Error handling control command for {session_id}: {e}")
            return {"success": False, "error": str(e)}

    # ==================== Event Sending ====================

    async def send_event(
        self,
        session_id: str,
        event_type: str,
        data: Dict[str, Any]
    ) -> bool:
        """
        Send an event message to client.

        Args:
            session_id: Session identifier
            event_type: Event type (transcript, status, error, etc.)
            data: Event data

        Returns:
            True if sent successfully
        """
        websocket = self.active_connections.get(session_id)
        if not websocket:
            return False

        try:
            message = {
                "type": event_type,
                "timestamp": datetime.now().isoformat(),
                "data": data
            }

            await websocket.send_json(message)

            session = self.sessions.get(session_id)
            if session:
                session.messages_sent += 1

            self.stats['total_messages'] += 1

            return True

        except Exception as e:
            logger.error(f"Error sending event to {session_id}: {e}")
            return False

    async def send_transcript(
        self,
        session_id: str,
        text: str,
        is_final: bool,
        confidence: float,
        speaker: Optional[str] = None,
        language: Optional[str] = None
    ) -> bool:
        """Send transcript message to client"""
        data = {
            "text": text,
            "is_final": is_final,
            "confidence": confidence,
            "speaker": speaker,
            "language": language
        }

        # Callback
        if self._on_transcript:
            await self._maybe_call_async(self._on_transcript, session_id, data)

        return await self.send_event(session_id, MessageType.TRANSCRIPT.value, data)

    async def send_status(
        self,
        session_id: str,
        state: SessionState,
        message: Optional[str] = None,
        details: Dict[str, Any] = None
    ) -> bool:
        """Send status message to client"""
        data = {
            "state": state.value,
            "message": message,
            "details": details or {}
        }
        return await self.send_event(session_id, MessageType.STATUS.value, data)

    async def send_error(
        self,
        session_id: str,
        error_message: str,
        error_code: Optional[str] = None
    ) -> bool:
        """Send error message to client"""
        data = {
            "error": error_message,
            "code": error_code
        }

        # Callback
        if self._on_error:
            await self._maybe_call_async(self._on_error, session_id, error_message)

        return await self.send_event(session_id, MessageType.ERROR.value, data)

    # ==================== Broadcasting ====================

    async def broadcast(
        self,
        event_type: str,
        data: Dict[str, Any],
        exclude: Optional[List[str]] = None
    ) -> int:
        """
        Broadcast an event to all connected clients.

        Args:
            event_type: Event type
            data: Event data
            exclude: Optional list of session IDs to exclude

        Returns:
            Number of clients that received the message
        """
        exclude = exclude or []
        sent_count = 0

        for session_id in list(self.active_connections.keys()):
            if session_id not in exclude:
                if await self.send_event(session_id, event_type, data):
                    sent_count += 1

        return sent_count

    # ==================== Event Callbacks ====================

    def on_session_started(self, callback: Callable) -> None:
        """Register callback for session started events"""
        self._on_session_started = callback

    def on_session_ended(self, callback: Callable) -> None:
        """Register callback for session ended events"""
        self._on_session_ended = callback

    def on_audio_received(self, callback: Callable) -> None:
        """Register callback for audio received events"""
        self._on_audio_received = callback

    def on_transcript(self, callback: Callable) -> None:
        """Register callback for transcript events"""
        self._on_transcript = callback

    def on_error(self, callback: Callable) -> None:
        """Register callback for error events"""
        self._on_error = callback

    # ==================== Utility Methods ====================

    async def _maybe_call_async(self, func: Callable, *args, **kwargs) -> None:
        """Call a function, handling both sync and async callables"""
        if asyncio.iscoroutinefunction(func):
            await func(*args, **kwargs)
        else:
            func(*args, **kwargs)

    def get_session(self, session_id: str) -> Optional[VoiceSession]:
        """Get session by ID"""
        return self.sessions.get(session_id)

    def get_active_sessions(self) -> List[VoiceSession]:
        """Get all active sessions"""
        return [
            session for session in self.sessions.values()
            if session.state in [SessionState.ACTIVE, SessionState.MUTED, SessionState.PAUSED]
        ]

    def get_stats(self) -> Dict[str, Any]:
        """Get manager statistics"""
        return {
            **self.stats,
            "sessions": {
                "total": len(self.sessions),
                "active": len([s for s in self.sessions.values() if s.state == SessionState.ACTIVE]),
                "muted": len([s for s in self.sessions.values() if s.state == SessionState.MUTED]),
                "paused": len([s for s in self.sessions.values() if s.state == SessionState.PAUSED]),
                "ended": len([s for s in self.sessions.values() if s.state == SessionState.ENDED])
            }
        }


# ==================== Singleton Accessor ====================

_voice_ws_manager: Optional[VoiceWebSocketManager] = None


def get_voice_ws_manager() -> VoiceWebSocketManager:
    """Get or create the VoiceWebSocketManager singleton instance"""
    global _voice_ws_manager
    if _voice_ws_manager is None:
        _voice_ws_manager = VoiceWebSocketManager.get_instance()
    return _voice_ws_manager


# ==================== FastAPI Router ====================

router = APIRouter(prefix="/voice/ws", tags=["Voice WebSocket"])


@router.websocket("/ws/voice/{session_id}")
async def voice_websocket(
    websocket: WebSocket,
    session_id: str,
    user_id: Optional[str] = Query(None),
    agent_id: Optional[str] = Query(None)
):
    """
    WebSocket endpoint for real-time voice communication.

    Message Formats:
    ---------------

    Client -> Server:

    1. Audio (binary): Raw PCM audio bytes (16-bit, 16kHz, mono)

    2. Control (JSON):
       {
         "type": "control",
         "command": "mute"|"unmute"|"end"|"transfer"|"pause"|"resume",
         "params": {...}
       }

    3. Ping (JSON):
       {
         "type": "ping"
       }

    Server -> Client:

    1. Audio (binary): Raw PCM audio bytes (16-bit, 24kHz, mono)

    2. Transcript (JSON):
       {
         "type": "transcript",
         "timestamp": "2024-01-01T00:00:00",
         "data": {
           "text": "...",
           "is_final": true|false,
           "confidence": 0.95,
           "speaker": "user"|"agent",
           "language": "en"
         }
       }

    3. Status (JSON):
       {
         "type": "status",
         "timestamp": "2024-01-01T00:00:00",
         "data": {
           "state": "active"|"muted"|"paused"|"ending"|"ended",
           "message": "...",
           "details": {...}
         }
       }

    4. Error (JSON):
       {
         "type": "error",
         "timestamp": "2024-01-01T00:00:00",
         "data": {
           "error": "...",
           "code": "..."
         }
       }

    5. Pong (JSON):
       {
         "type": "pong"
       }
    """
    manager = get_voice_ws_manager()

    try:
        # Connect
        session = await manager.connect(
            websocket,
            session_id,
            user_id=user_id,
            agent_id=agent_id
        )

        logger.info(f"Voice WebSocket session started: {session_id}")

        # Message processing loop
        while True:
            try:
                # Receive message (can be binary or text)
                message = await websocket.receive()

                # Handle binary audio data
                if "bytes" in message:
                    audio_data = message["bytes"]
                    await manager.handle_audio(session_id, audio_data)

                # Handle JSON messages (control, ping, etc.)
                elif "text" in message:
                    try:
                        data = json.loads(message["text"])
                        msg_type = data.get("type")

                        if msg_type == MessageType.CONTROL.value:
                            command = data.get("command")
                            params = data.get("params", {})
                            result = await manager.handle_control(session_id, command, params)

                            # Send result back
                            await manager.send_event(session_id, "control_result", result)

                        elif msg_type == MessageType.PING.value:
                            # Respond to ping
                            await manager.send_event(session_id, MessageType.PONG.value, {})

                        else:
                            logger.warning(f"Unknown message type: {msg_type}")

                    except json.JSONDecodeError:
                        logger.warning(f"Invalid JSON message received for {session_id}")
                        await manager.send_error(session_id, "Invalid JSON format")

            except WebSocketDisconnect:
                logger.info(f"WebSocket disconnected: {session_id}")
                break

            except Exception as e:
                logger.error(f"Error processing message for {session_id}: {e}")
                await manager.send_error(session_id, f"Message processing error: {str(e)}")

    except Exception as e:
        logger.error(f"WebSocket error for {session_id}: {e}")

    finally:
        # Cleanup
        await manager.disconnect(session_id, "Connection closed")


@router.get("/stats")
async def get_websocket_stats():
    """Get WebSocket manager statistics"""
    manager = get_voice_ws_manager()
    return manager.get_stats()


@router.get("/sessions")
async def list_active_sessions():
    """List active WebSocket sessions"""
    manager = get_voice_ws_manager()
    sessions = manager.get_active_sessions()

    return {
        "count": len(sessions),
        "sessions": [
            {
                "session_id": s.session_id,
                "user_id": s.user_id,
                "agent_id": s.agent_id,
                "state": s.state.value,
                "started_at": s.started_at.isoformat(),
                "bytes_received": s.bytes_received,
                "bytes_sent": s.bytes_sent,
                "messages_received": s.messages_received,
                "messages_sent": s.messages_sent,
                "errors": s.errors
            }
            for s in sessions
        ]
    }


@router.get("/sessions/{session_id}")
async def get_session_info(session_id: str):
    """Get information about a specific session"""
    manager = get_voice_ws_manager()
    session = manager.get_session(session_id)

    if not session:
        return JSONResponse(
            status_code=404,
            content={"error": "Session not found"}
        )

    return {
        "session_id": session.session_id,
        "user_id": session.user_id,
        "agent_id": session.agent_id,
        "state": session.state.value,
        "started_at": session.started_at.isoformat(),
        "ended_at": session.ended_at.isoformat() if session.ended_at else None,
        "input_format": {
            "encoding": session.input_format.encoding,
            "sample_rate": session.input_format.sample_rate,
            "bit_depth": session.input_format.bit_depth,
            "channels": session.input_format.channels,
            "chunk_duration_ms": session.input_format.chunk_duration_ms
        },
        "output_format": {
            "encoding": session.output_format.encoding,
            "sample_rate": session.output_format.sample_rate,
            "bit_depth": session.output_format.bit_depth,
            "channels": session.output_format.channels,
            "chunk_duration_ms": session.output_format.chunk_duration_ms
        },
        "stats": {
            "bytes_received": session.bytes_received,
            "bytes_sent": session.bytes_sent,
            "messages_received": session.messages_received,
            "messages_sent": session.messages_sent,
            "errors": session.errors
        },
        "metadata": session.metadata
    }


@router.post("/sessions/{session_id}/control")
async def send_control_command(
    session_id: str,
    command: str,
    params: Dict[str, Any] = None
):
    """Send a control command to a session (server-side control)"""
    manager = get_voice_ws_manager()
    result = await manager.handle_control(session_id, command, params or {})

    if not result.get("success"):
        return JSONResponse(
            status_code=400,
            content=result
        )

    return result


@router.delete("/sessions/{session_id}")
async def end_session(session_id: str):
    """End a WebSocket session"""
    manager = get_voice_ws_manager()
    session = manager.get_session(session_id)

    if not session:
        return JSONResponse(
            status_code=404,
            content={"error": "Session not found"}
        )

    await manager.disconnect(session_id, "Terminated via API")

    return {
        "success": True,
        "message": f"Session {session_id} ended"
    }
