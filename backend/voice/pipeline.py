"""
Voice Pipeline Orchestrator for Agent Forge Voice.

Orchestrates the ASR → LLM → TTS pipeline with target <600ms latency.
Handles conversation flow, interruptions, back-channeling, and state management.
"""

import asyncio
import time
from enum import Enum
from typing import Optional, Dict, List, AsyncIterator
from dataclasses import dataclass, field
from datetime import datetime
import anthropic
import logging

logger = logging.getLogger(__name__)


class PipelineState(Enum):
    """Voice pipeline state machine."""
    IDLE = "idle"
    LISTENING = "listening"
    PROCESSING = "processing"
    SPEAKING = "speaking"
    TRANSFERRING = "transferring"
    ENDED = "ended"


@dataclass
class ConversationMessage:
    """A single message in the conversation."""
    role: str  # "user" or "assistant"
    content: str
    timestamp: float = field(default_factory=time.time)
    latency_ms: Optional[float] = None


@dataclass
class LatencyMetrics:
    """Latency tracking for pipeline stages."""
    asr_latency_ms: List[float] = field(default_factory=list)
    llm_latency_ms: List[float] = field(default_factory=list)
    tts_latency_ms: List[float] = field(default_factory=list)
    total_latency_ms: List[float] = field(default_factory=list)

    def add_asr(self, latency_ms: float):
        self.asr_latency_ms.append(latency_ms)

    def add_llm(self, latency_ms: float):
        self.llm_latency_ms.append(latency_ms)

    def add_tts(self, latency_ms: float):
        self.tts_latency_ms.append(latency_ms)

    def add_total(self, latency_ms: float):
        self.total_latency_ms.append(latency_ms)

    def get_averages(self) -> Dict[str, float]:
        """Get average latencies for all stages."""
        return {
            "asr_avg_ms": sum(self.asr_latency_ms) / len(self.asr_latency_ms) if self.asr_latency_ms else 0,
            "llm_avg_ms": sum(self.llm_latency_ms) / len(self.llm_latency_ms) if self.llm_latency_ms else 0,
            "tts_avg_ms": sum(self.tts_latency_ms) / len(self.tts_latency_ms) if self.tts_latency_ms else 0,
            "total_avg_ms": sum(self.total_latency_ms) / len(self.total_latency_ms) if self.total_latency_ms else 0,
        }


class VoicePipeline:
    """
    Orchestrates the complete voice conversation pipeline.

    Flow: Audio → ASR → LLM → TTS → Audio
    Target: <600ms total latency
    """

    def __init__(
        self,
        agent_id: str,
        call_id: str,
        asr_manager,
        tts_manager,
        llm_config: Optional[Dict] = None
    ):
        """
        Initialize voice pipeline.

        Args:
            agent_id: Agent identifier
            call_id: Unique call identifier
            asr_manager: ASR manager instance
            tts_manager: TTS manager instance
            llm_config: LLM configuration (model, temperature, etc.)
        """
        self.agent_id = agent_id
        self.call_id = call_id
        self.asr_manager = asr_manager
        self.tts_manager = tts_manager

        # LLM configuration
        self.llm_config = llm_config or {
            "model": "claude-sonnet-4-5-20250929",
            "max_tokens": 1024,
            "temperature": 0.7,
        }
        self.anthropic_client = anthropic.Anthropic()

        # State management
        self.state = PipelineState.IDLE
        self.conversation_history: List[ConversationMessage] = []
        self.current_transcript_buffer = ""
        self.is_user_speaking = False

        # Interruption handling
        self.current_tts_task: Optional[asyncio.Task] = None
        self.tts_interrupted = False

        # Back-channeling
        self.backchannel_phrases = [
            "uh-huh",
            "I see",
            "mmm-hmm",
            "okay",
            "got it",
            "right"
        ]
        self.backchannel_counter = 0
        self.last_backchannel_time = 0
        self.backchannel_cooldown_seconds = 3

        # Metrics
        self.metrics = LatencyMetrics()
        self.call_start_time = time.time()
        self.turn_count = 0

        # Session metadata
        self.metadata = {
            "agent_id": agent_id,
            "call_id": call_id,
            "start_time": datetime.utcnow().isoformat(),
        }

        logger.info(f"VoicePipeline initialized for call {call_id} with agent {agent_id}")

    async def start(self) -> bytes:
        """
        Start the voice pipeline and return greeting audio.

        Returns:
            bytes: Greeting audio data
        """
        self.state = PipelineState.LISTENING
        self.call_start_time = time.time()

        # Generate greeting
        greeting = self._get_greeting_text()
        self.conversation_history.append(
            ConversationMessage(role="assistant", content=greeting)
        )

        # Convert greeting to speech
        start_time = time.time()
        greeting_audio = await self.tts_manager.synthesize(greeting)
        tts_latency = (time.time() - start_time) * 1000
        self.metrics.add_tts(tts_latency)

        logger.info(f"Pipeline started for call {self.call_id}, greeting TTS latency: {tts_latency:.2f}ms")
        return greeting_audio

    def _get_greeting_text(self) -> str:
        """Get greeting text based on agent configuration."""
        # TODO: Load from agent config
        return "Hello! I'm your AI assistant. How can I help you today?"

    async def process_audio_chunk(self, audio: bytes) -> Optional[bytes]:
        """
        Process incoming audio chunk through the pipeline.

        Args:
            audio: Raw audio data from user

        Returns:
            Optional[bytes]: Response audio if turn complete, None otherwise
        """
        if self.state == PipelineState.ENDED:
            return None

        # Track user speaking state
        if not self.is_user_speaking:
            self.is_user_speaking = True
            self._handle_user_started_speaking()

        # Send to ASR
        asr_start = time.time()
        transcript_result = await self.asr_manager.process_audio(audio)

        if transcript_result:
            asr_latency = (time.time() - asr_start) * 1000
            self.metrics.add_asr(asr_latency)

            return await self.handle_transcript(
                transcript_result.get("text", ""),
                transcript_result.get("is_final", False)
            )

        # Consider back-channeling during long user speech
        if self.is_user_speaking and self._should_inject_backchannel():
            await self._inject_backchannel_async()

        return None

    def _handle_user_started_speaking(self):
        """Handle user starting to speak."""
        # If agent was speaking, interrupt
        if self.state == PipelineState.SPEAKING:
            self.handle_interruption()

    async def handle_transcript(self, transcript: str, is_final: bool) -> Optional[bytes]:
        """
        Handle transcript from ASR.

        Args:
            transcript: Transcribed text
            is_final: Whether this is a final transcript

        Returns:
            Optional[bytes]: Response audio if turn complete
        """
        if not transcript.strip():
            return None

        # Update buffer
        if is_final:
            self.current_transcript_buffer += " " + transcript
            self.current_transcript_buffer = self.current_transcript_buffer.strip()

            # Check if turn is complete (end of utterance)
            if self._is_turn_complete(self.current_transcript_buffer):
                user_message = self.current_transcript_buffer
                self.current_transcript_buffer = ""
                self.is_user_speaking = False

                # Add to conversation history
                self.conversation_history.append(
                    ConversationMessage(role="user", content=user_message)
                )

                # Generate response
                turn_start = time.time()
                response_audio = await self._process_turn(user_message)
                total_latency = (time.time() - turn_start) * 1000
                self.metrics.add_total(total_latency)

                logger.info(
                    f"Turn {self.turn_count} completed: {total_latency:.2f}ms total latency"
                )

                return response_audio
        else:
            # Partial transcript - could use for early processing
            logger.debug(f"Partial transcript: {transcript}")

        return None

    def _is_turn_complete(self, text: str) -> bool:
        """
        Determine if user has completed their turn.

        This is a simplified heuristic. Production systems would use
        more sophisticated VAD (Voice Activity Detection) and silence detection.

        Args:
            text: Current transcript buffer

        Returns:
            bool: True if turn is complete
        """
        # Check for sentence endings
        if text.endswith((".", "?", "!")):
            return True

        # Check for common complete phrases
        complete_phrases = [
            "thank you",
            "thanks",
            "that's all",
            "goodbye",
            "bye",
            "no thanks",
        ]
        text_lower = text.lower().strip()
        if any(text_lower.endswith(phrase) for phrase in complete_phrases):
            return True

        # If buffer is getting long, consider it complete
        if len(text.split()) > 50:
            return True

        return False

    async def _process_turn(self, user_message: str) -> bytes:
        """
        Process a complete user turn through LLM and TTS.

        Args:
            user_message: User's message

        Returns:
            bytes: Response audio
        """
        self.state = PipelineState.PROCESSING
        self.turn_count += 1

        # Generate response text
        llm_start = time.time()
        response_text = await self.generate_response(user_message)
        llm_latency = (time.time() - llm_start) * 1000
        self.metrics.add_llm(llm_latency)

        # Add to conversation history
        self.conversation_history.append(
            ConversationMessage(
                role="assistant",
                content=response_text,
                latency_ms=llm_latency
            )
        )

        # Convert to speech
        self.state = PipelineState.SPEAKING
        tts_start = time.time()
        response_audio = await self.tts_manager.synthesize(response_text)
        tts_latency = (time.time() - tts_start) * 1000
        self.metrics.add_tts(tts_latency)

        # Back to listening
        self.state = PipelineState.LISTENING

        logger.debug(
            f"LLM: {llm_latency:.2f}ms, TTS: {tts_latency:.2f}ms, "
            f"Total: {llm_latency + tts_latency:.2f}ms"
        )

        return response_audio

    async def generate_response(self, user_message: str) -> str:
        """
        Generate response using Claude LLM.

        Args:
            user_message: User's message

        Returns:
            str: Assistant's response
        """
        try:
            # Build conversation context
            messages = []
            for msg in self.conversation_history[-10:]:  # Last 10 messages for context
                messages.append({
                    "role": msg.role,
                    "content": msg.content
                })

            # Add current user message
            messages.append({
                "role": "user",
                "content": user_message
            })

            # System prompt for voice conversations
            system_prompt = """You are a helpful AI voice assistant.

Key guidelines for voice conversations:
- Keep responses concise (1-3 sentences preferred)
- Use natural, conversational language
- Avoid lists, bullet points, or structured formats
- Don't use special characters or formatting
- If asked to do something complex, acknowledge and summarize what you'll do
- Be friendly and engaging
- If you don't know something, say so clearly

Remember: This is a voice conversation, so responses will be spoken aloud."""

            # Call Claude API
            response = await asyncio.to_thread(
                self.anthropic_client.messages.create,
                model=self.llm_config["model"],
                max_tokens=self.llm_config["max_tokens"],
                temperature=self.llm_config["temperature"],
                system=system_prompt,
                messages=messages
            )

            # Extract text from response
            response_text = ""
            for block in response.content:
                if hasattr(block, "text"):
                    response_text += block.text

            # Clean up for voice (remove special characters, etc.)
            response_text = self._clean_for_voice(response_text)

            return response_text

        except Exception as e:
            logger.error(f"Error generating LLM response: {e}", exc_info=True)
            return "I'm sorry, I didn't quite catch that. Could you please repeat?"

    def _clean_for_voice(self, text: str) -> str:
        """
        Clean text for voice output.

        Args:
            text: Raw text from LLM

        Returns:
            str: Cleaned text suitable for TTS
        """
        # Remove markdown formatting
        text = text.replace("**", "")
        text = text.replace("*", "")
        text = text.replace("_", "")
        text = text.replace("#", "")

        # Remove bullet points and list markers
        text = text.replace("- ", "")
        text = text.replace("• ", "")

        # Normalize whitespace
        text = " ".join(text.split())

        # Remove multiple ending punctuation
        text = text.replace("...", ".")
        text = text.replace("!!", "!")
        text = text.replace("??", "?")

        return text.strip()

    async def stream_response_audio(self, text: str) -> AsyncIterator[bytes]:
        """
        Stream response audio in chunks for lower latency.

        This allows sending audio as it's generated rather than
        waiting for complete synthesis.

        Args:
            text: Text to synthesize

        Yields:
            bytes: Audio chunks
        """
        # Split text into sentences for streaming
        sentences = self._split_into_sentences(text)

        for sentence in sentences:
            if self.tts_interrupted:
                logger.info("TTS interrupted, stopping stream")
                break

            # Synthesize sentence
            audio_chunk = await self.tts_manager.synthesize(sentence)
            yield audio_chunk

    def _split_into_sentences(self, text: str) -> List[str]:
        """
        Split text into sentences for streaming synthesis.

        Args:
            text: Text to split

        Returns:
            List[str]: List of sentences
        """
        import re

        # Simple sentence splitting
        sentences = re.split(r'(?<=[.!?])\s+', text)
        return [s.strip() for s in sentences if s.strip()]

    def handle_interruption(self):
        """
        Handle user interrupting the assistant.

        Stops current TTS playback and resets state.
        """
        logger.info(f"Handling interruption on call {self.call_id}")

        # Cancel current TTS task
        if self.current_tts_task and not self.current_tts_task.done():
            self.current_tts_task.cancel()
            self.tts_interrupted = True

        # Reset to listening state
        self.state = PipelineState.LISTENING
        self.tts_interrupted = False

    def _should_inject_backchannel(self) -> bool:
        """
        Determine if back-channel should be injected.

        Back-channels are short acknowledgments ("uh-huh", "I see")
        that show the assistant is listening during long user utterances.

        Returns:
            bool: True if back-channel should be injected
        """
        current_time = time.time()

        # Check cooldown
        if current_time - self.last_backchannel_time < self.backchannel_cooldown_seconds:
            return False

        # Check if user has been speaking long enough
        # TODO: Implement proper timing based on user speech duration

        # Inject occasionally (e.g., 10% chance when conditions are met)
        import random
        return random.random() < 0.1

    async def inject_backchannel(self) -> Optional[bytes]:
        """
        Inject a back-channel response during user speech.

        Returns:
            Optional[bytes]: Back-channel audio
        """
        if not self._should_inject_backchannel():
            return None

        return await self._inject_backchannel_async()

    async def _inject_backchannel_async(self) -> bytes:
        """Internal async back-channel injection."""
        import random

        phrase = random.choice(self.backchannel_phrases)
        self.last_backchannel_time = time.time()
        self.backchannel_counter += 1

        logger.debug(f"Injecting back-channel: {phrase}")

        # Synthesize back-channel
        audio = await self.tts_manager.synthesize(phrase)
        return audio

    def end(self) -> Dict:
        """
        End the voice pipeline and return call summary.

        Returns:
            Dict: Call summary with metrics and metadata
        """
        self.state = PipelineState.ENDED
        call_duration = time.time() - self.call_start_time

        # Build conversation transcript
        transcript = []
        for msg in self.conversation_history:
            transcript.append({
                "role": msg.role,
                "content": msg.content,
                "timestamp": msg.timestamp,
                "latency_ms": msg.latency_ms
            })

        # Get average latencies
        avg_latencies = self.metrics.get_averages()

        summary = {
            "call_id": self.call_id,
            "agent_id": self.agent_id,
            "start_time": self.metadata["start_time"],
            "end_time": datetime.utcnow().isoformat(),
            "duration_seconds": call_duration,
            "turn_count": self.turn_count,
            "message_count": len(self.conversation_history),
            "transcript": transcript,
            "metrics": {
                **avg_latencies,
                "backchannel_count": self.backchannel_counter,
            },
            "status": "completed"
        }

        logger.info(
            f"Pipeline ended for call {self.call_id}. "
            f"Duration: {call_duration:.1f}s, Turns: {self.turn_count}, "
            f"Avg latency: {avg_latencies['total_avg_ms']:.2f}ms"
        )

        return summary


class VoiceSessionManager:
    """
    Singleton manager for voice pipeline sessions.

    Manages lifecycle of voice conversations across multiple concurrent calls.
    """

    def __init__(self):
        """Initialize session manager."""
        self.sessions: Dict[str, VoicePipeline] = {}
        self.lock = asyncio.Lock()
        logger.info("VoiceSessionManager initialized")

    async def create_session(
        self,
        call_id: str,
        agent_id: str,
        asr_manager,
        tts_manager,
        llm_config: Optional[Dict] = None
    ) -> VoicePipeline:
        """
        Create a new voice pipeline session.

        Args:
            call_id: Unique call identifier
            agent_id: Agent identifier
            asr_manager: ASR manager instance
            tts_manager: TTS manager instance
            llm_config: Optional LLM configuration

        Returns:
            VoicePipeline: New pipeline instance
        """
        async with self.lock:
            if call_id in self.sessions:
                logger.warning(f"Session {call_id} already exists, returning existing")
                return self.sessions[call_id]

            pipeline = VoicePipeline(
                agent_id=agent_id,
                call_id=call_id,
                asr_manager=asr_manager,
                tts_manager=tts_manager,
                llm_config=llm_config
            )

            self.sessions[call_id] = pipeline
            logger.info(f"Created session {call_id} for agent {agent_id}")

            return pipeline

    def get_session(self, call_id: str) -> Optional[VoicePipeline]:
        """
        Get existing voice pipeline session.

        Args:
            call_id: Call identifier

        Returns:
            Optional[VoicePipeline]: Pipeline if exists, None otherwise
        """
        return self.sessions.get(call_id)

    async def end_session(self, call_id: str) -> Dict:
        """
        End a voice pipeline session and return summary.

        Args:
            call_id: Call identifier

        Returns:
            Dict: Call summary
        """
        async with self.lock:
            session = self.sessions.get(call_id)

            if not session:
                logger.warning(f"Attempted to end non-existent session {call_id}")
                return {
                    "call_id": call_id,
                    "status": "not_found"
                }

            # End the pipeline and get summary
            summary = session.end()

            # Remove from active sessions
            del self.sessions[call_id]

            logger.info(f"Ended and removed session {call_id}")

            return summary

    def list_active_sessions(self) -> List[str]:
        """
        List all active session call IDs.

        Returns:
            List[str]: List of active call IDs
        """
        return list(self.sessions.keys())

    def get_session_count(self) -> int:
        """Get count of active sessions."""
        return len(self.sessions)

    def get_all_sessions_summary(self) -> Dict:
        """
        Get summary of all active sessions.

        Returns:
            Dict: Summary of all sessions
        """
        sessions_info = []

        for call_id, pipeline in self.sessions.items():
            sessions_info.append({
                "call_id": call_id,
                "agent_id": pipeline.agent_id,
                "state": pipeline.state.value,
                "turn_count": pipeline.turn_count,
                "duration_seconds": time.time() - pipeline.call_start_time,
                "message_count": len(pipeline.conversation_history)
            })

        return {
            "active_session_count": len(self.sessions),
            "sessions": sessions_info
        }


# Singleton instance
_session_manager: Optional[VoiceSessionManager] = None


def get_voice_session_manager() -> VoiceSessionManager:
    """
    Get singleton voice session manager instance.

    Returns:
        VoiceSessionManager: Singleton instance
    """
    global _session_manager

    if _session_manager is None:
        _session_manager = VoiceSessionManager()

    return _session_manager
