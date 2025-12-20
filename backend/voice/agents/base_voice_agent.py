"""
Base Voice Agent - Abstract base class for all voice agents in Agent Forge.

This module provides the foundational architecture for voice agents,
integrating collaboration capabilities, learning engine, and state machine management.
"""

import asyncio
import logging
import uuid
from abc import ABC, abstractmethod
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional, Tuple
from enum import Enum

from backend.collaboration import CollaborativeAgentMixin, AgentRole, get_collaboration_hub
from backend.learning import (
    LearningEngine,
    get_learning_engine,
    OutcomeType,
    StrategyType,
    record_outcome,
    select_strategy
)
from backend.voice.agents.voice_agent_config import VoiceAgentConfig
from backend.voice.state_machine import VoiceStateMachine, create_simple_state_machine


logger = logging.getLogger(__name__)


class CallState(Enum):
    """States of a voice call"""
    IDLE = "idle"
    CONNECTING = "connecting"
    ACTIVE = "active"
    ON_HOLD = "on_hold"
    TRANSFERRING = "transferring"
    ENDING = "ending"
    ENDED = "ended"
    FAILED = "failed"


class ConversationTurn:
    """Represents a single turn in the conversation"""

    def __init__(
        self,
        turn_id: str,
        speaker: str,
        message: str,
        timestamp: datetime,
        metadata: Optional[Dict[str, Any]] = None
    ):
        self.turn_id = turn_id
        self.speaker = speaker  # "user" or "agent"
        self.message = message
        self.timestamp = timestamp
        self.metadata = metadata or {}

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            'turn_id': self.turn_id,
            'speaker': self.speaker,
            'message': self.message,
            'timestamp': self.timestamp.isoformat(),
            'metadata': self.metadata
        }


class CallMetrics:
    """Metrics tracked during a call"""

    def __init__(self):
        self.started_at: Optional[datetime] = None
        self.ended_at: Optional[datetime] = None
        self.total_turns: int = 0
        self.user_turns: int = 0
        self.agent_turns: int = 0
        self.interruptions: int = 0
        self.errors: int = 0
        self.function_calls: int = 0
        self.state_transitions: int = 0
        self.sentiment_scores: List[float] = []
        self.silence_periods: List[Tuple[datetime, float]] = []  # (timestamp, duration)
        self.latency_ms: List[float] = []

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        duration = 0.0
        if self.started_at and self.ended_at:
            duration = (self.ended_at - self.started_at).total_seconds()

        avg_latency = sum(self.latency_ms) / len(self.latency_ms) if self.latency_ms else 0.0
        avg_sentiment = sum(self.sentiment_scores) / len(self.sentiment_scores) if self.sentiment_scores else 0.0

        return {
            'started_at': self.started_at.isoformat() if self.started_at else None,
            'ended_at': self.ended_at.isoformat() if self.ended_at else None,
            'duration_seconds': duration,
            'total_turns': self.total_turns,
            'user_turns': self.user_turns,
            'agent_turns': self.agent_turns,
            'interruptions': self.interruptions,
            'errors': self.errors,
            'function_calls': self.function_calls,
            'state_transitions': self.state_transitions,
            'avg_sentiment': avg_sentiment,
            'avg_latency_ms': avg_latency,
            'silence_periods': len(self.silence_periods)
        }


class BaseVoiceAgent(ABC, CollaborativeAgentMixin):
    """
    Abstract base class for all voice agents in Agent Forge.

    Provides:
    - Call lifecycle management (start, process, end)
    - Integration with collaboration hub
    - Learning engine for continuous improvement
    - State machine support for complex flows
    - Metrics tracking and analytics
    - Error handling and recovery
    - Function/tool calling framework

    Subclasses must implement:
    - get_system_prompt()
    - get_greeting()
    - get_available_functions()
    - handle_user_input()
    """

    def __init__(
        self,
        config: VoiceAgentConfig,
        role: AgentRole = AgentRole.SUPPORT
    ):
        """
        Initialize base voice agent.

        Args:
            config: Voice agent configuration
            role: Agent role for collaboration
        """
        # Initialize collaborative capabilities
        CollaborativeAgentMixin.__init__(self, role)

        # Configuration
        self.config = config
        self.agent_id = config.id
        self.agent_name = config.name

        # Learning engine
        self.learning_engine = get_learning_engine()

        # State machine (initialized if enabled)
        self.state_machine: Optional[VoiceStateMachine] = None
        if config.state_machine.enabled:
            self._initialize_state_machine()

        # Call state
        self.call_state = CallState.IDLE
        self.current_call_id: Optional[str] = None

        # Conversation history
        self.conversation_history: List[ConversationTurn] = []
        self.current_context: Dict[str, Any] = {}

        # Metrics
        self.metrics = CallMetrics()

        # Error tracking
        self.error_count = 0
        self.last_error: Optional[str] = None

        # Function registry
        self.function_registry: Dict[str, Callable] = {}
        self._register_default_functions()

        # Register for collaboration
        self.register_for_collaboration()

        logger.info(f"[{self.agent_name}] Voice agent initialized: {self.agent_id}")

    # ==================== Abstract Methods ====================

    @abstractmethod
    def get_system_prompt(self) -> str:
        """
        Get the system prompt for the agent.

        This should include:
        - Agent's role and purpose
        - Conversation guidelines
        - Available capabilities
        - Any domain-specific knowledge

        Returns:
            System prompt string
        """
        pass

    @abstractmethod
    def get_greeting(self) -> str:
        """
        Get the greeting message for starting a call.

        Returns:
            Greeting message
        """
        pass

    @abstractmethod
    def get_available_functions(self) -> List[Dict[str, Any]]:
        """
        Get list of available function tools.

        Returns:
            List of function definitions in OpenAI format:
            [
                {
                    "name": "function_name",
                    "description": "What the function does",
                    "parameters": {
                        "type": "object",
                        "properties": {...},
                        "required": [...]
                    }
                }
            ]
        """
        pass

    @abstractmethod
    async def handle_user_input(
        self,
        user_message: str,
        context: Dict[str, Any]
    ) -> Tuple[str, Dict[str, Any]]:
        """
        Process user input and generate response.

        This is the core conversation logic. Should:
        - Understand user intent
        - Execute any necessary business logic
        - Generate appropriate response
        - Update context as needed

        Args:
            user_message: User's speech/text
            context: Current conversation context

        Returns:
            Tuple of (agent_response, updated_context)
        """
        pass

    # ==================== Call Lifecycle ====================

    async def start_call(
        self,
        call_id: Optional[str] = None,
        initial_context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Start a new voice call.

        Args:
            call_id: Optional call ID (generated if not provided)
            initial_context: Optional initial context (e.g., caller info)

        Returns:
            Call info dictionary
        """
        self.current_call_id = call_id or str(uuid.uuid4())
        self.call_state = CallState.ACTIVE
        self.conversation_history = []
        self.current_context = initial_context or {}
        self.metrics = CallMetrics()
        self.metrics.started_at = datetime.now()
        self.error_count = 0

        # Reset state machine if enabled
        if self.state_machine:
            self.state_machine.reset()

        # Get greeting
        greeting = self.get_greeting()

        # Record greeting turn
        self._add_turn("agent", greeting)

        logger.info(f"[{self.agent_name}] Call started: {self.current_call_id}")

        return {
            'call_id': self.current_call_id,
            'status': 'active',
            'greeting': greeting,
            'started_at': self.metrics.started_at.isoformat()
        }

    async def process_turn(
        self,
        user_message: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Process a conversation turn.

        Args:
            user_message: User's speech/text
            metadata: Optional metadata (sentiment, etc.)

        Returns:
            Response dictionary with agent message and actions
        """
        if self.call_state != CallState.ACTIVE:
            raise ValueError(f"Cannot process turn in state: {self.call_state}")

        turn_start = datetime.now()
        self.metrics.total_turns += 1
        self.metrics.user_turns += 1

        # Record user turn
        self._add_turn("user", user_message, metadata)

        # Track sentiment if provided
        if metadata and 'sentiment' in metadata:
            self.metrics.sentiment_scores.append(metadata['sentiment'])

        try:
            # Check for goodbye intent
            if self._is_goodbye_intent(user_message):
                return await self._handle_goodbye()

            # Check for error threshold
            if self.error_count >= self.config.behavior.max_error_retries:
                if self.config.behavior.fallback_to_human:
                    return await self._handle_human_handoff("Too many errors")

            # Process with state machine if enabled
            if self.state_machine:
                response, new_state = await self.state_machine.process_input(
                    user_message,
                    extracted_data=metadata
                )
                if new_state != self.state_machine.current_state_id:
                    self.metrics.state_transitions += 1

                # Use state-specific handler
                if response:
                    agent_response = response
                    updated_context = self.current_context
                else:
                    agent_response, updated_context = await self.handle_user_input(
                        user_message,
                        self.current_context
                    )
            else:
                # Direct handler
                agent_response, updated_context = await self.handle_user_input(
                    user_message,
                    self.current_context
                )

            # Update context
            self.current_context = updated_context

            # Record agent turn
            self._add_turn("agent", agent_response)
            self.metrics.agent_turns += 1

            # Track latency
            latency = (datetime.now() - turn_start).total_seconds() * 1000
            self.metrics.latency_ms.append(latency)

            # Reset error count on successful turn
            self.error_count = 0

            return {
                'status': 'success',
                'message': agent_response,
                'context': self.current_context,
                'latency_ms': latency
            }

        except Exception as e:
            logger.error(f"[{self.agent_name}] Error processing turn: {e}")
            self.error_count += 1
            self.last_error = str(e)
            self.metrics.errors += 1

            error_response = self.config.behavior.error_message

            self._add_turn("agent", error_response, {'error': str(e)})

            return {
                'status': 'error',
                'message': error_response,
                'error': str(e),
                'error_count': self.error_count
            }

    async def end_call(
        self,
        reason: str = "user_ended",
        metadata: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        End the current call.

        Args:
            reason: Reason for ending call
            metadata: Optional metadata

        Returns:
            Call summary
        """
        if self.call_state == CallState.ENDED:
            return {'status': 'already_ended'}

        self.call_state = CallState.ENDED
        self.metrics.ended_at = datetime.now()

        # Calculate final metrics
        summary = self.metrics.to_dict()
        summary['call_id'] = self.current_call_id
        summary['reason'] = reason
        summary['turns'] = len(self.conversation_history)

        # Record outcome for learning
        success = (
            self.error_count == 0 and
            self.metrics.total_turns > 2 and
            reason != "error"
        )

        score = self._calculate_call_score()

        outcome = record_outcome(
            outcome_type=OutcomeType.TASK_COMPLETED if success else OutcomeType.TASK_FAILED,
            task_id=self.current_call_id,
            agent_type=self.config.agent_type.value,
            success=success,
            score=score,
            context={
                'turns': self.metrics.total_turns,
                'duration': summary['duration_seconds'],
                'errors': self.error_count,
                'sentiment': summary['avg_sentiment']
            },
            result=summary
        )

        logger.info(
            f"[{self.agent_name}] Call ended: {self.current_call_id} "
            f"(reason={reason}, turns={summary['turns']}, score={score:.2f})"
        )

        return {
            'status': 'ended',
            'summary': summary,
            'outcome_id': outcome.id
        }

    # ==================== State Machine Integration ====================

    def _initialize_state_machine(self):
        """Initialize state machine from config"""
        if not self.config.state_machine.states:
            logger.warning(f"[{self.agent_name}] State machine enabled but no states defined")
            return

        try:
            self.state_machine = create_simple_state_machine(
                agent_id=self.agent_id,
                states=self.config.state_machine.states,
                transitions=self.config.state_machine.transitions,
                initial_state_id=self.config.state_machine.initial_state_id
            )
            logger.info(f"[{self.agent_name}] State machine initialized with {len(self.state_machine.states)} states")
        except Exception as e:
            logger.error(f"[{self.agent_name}] Failed to initialize state machine: {e}")
            self.state_machine = None

    def get_current_state_prompt(self) -> Optional[str]:
        """Get prompt for current state (if state machine enabled)"""
        if self.state_machine:
            return self.state_machine.get_current_prompt()
        return None

    def get_state_available_functions(self) -> Optional[List[str]]:
        """Get available functions for current state"""
        if self.state_machine:
            return self.state_machine.get_available_functions()
        return None

    # ==================== Function/Tool Management ====================

    def register_function(self, name: str, func: Callable):
        """
        Register a function that can be called during conversation.

        Args:
            name: Function name
            func: Callable function
        """
        self.function_registry[name] = func
        logger.debug(f"[{self.agent_name}] Registered function: {name}")

    def _register_default_functions(self):
        """Register default functions available to all agents"""
        self.register_function("get_current_time", self._get_current_time)
        self.register_function("transfer_to_human", self._transfer_to_human)

    async def call_function(
        self,
        function_name: str,
        arguments: Dict[str, Any]
    ) -> Any:
        """
        Call a registered function.

        Args:
            function_name: Name of function to call
            arguments: Function arguments

        Returns:
            Function result
        """
        if function_name not in self.function_registry:
            raise ValueError(f"Unknown function: {function_name}")

        func = self.function_registry[function_name]
        self.metrics.function_calls += 1

        try:
            if asyncio.iscoroutinefunction(func):
                result = await func(**arguments)
            else:
                result = func(**arguments)

            logger.debug(f"[{self.agent_name}] Function called: {function_name}")
            return result

        except Exception as e:
            logger.error(f"[{self.agent_name}] Function error ({function_name}): {e}")
            raise

    # ==================== Default Functions ====================

    def _get_current_time(self) -> str:
        """Get current time"""
        return datetime.now().strftime("%I:%M %p")

    async def _transfer_to_human(self, reason: str = "user_requested") -> Dict[str, Any]:
        """Transfer call to human agent"""
        logger.info(f"[{self.agent_name}] Transferring to human: {reason}")
        self.call_state = CallState.TRANSFERRING

        # Handoff via collaboration hub
        await self.handoff_to(
            target=AgentRole.SUPPORT,
            context_id=self.current_call_id,
            reason=reason,
            data={
                'conversation_history': [turn.to_dict() for turn in self.conversation_history],
                'context': self.current_context
            }
        )

        return {
            'status': 'transferring',
            'message': self.config.behavior.human_handoff_message
        }

    # ==================== Helper Methods ====================

    def _add_turn(
        self,
        speaker: str,
        message: str,
        metadata: Optional[Dict[str, Any]] = None
    ):
        """Add a turn to conversation history"""
        turn = ConversationTurn(
            turn_id=str(uuid.uuid4()),
            speaker=speaker,
            message=message,
            timestamp=datetime.now(),
            metadata=metadata
        )
        self.conversation_history.append(turn)

    def _is_goodbye_intent(self, message: str) -> bool:
        """Check if user message indicates goodbye"""
        goodbye_phrases = [
            "goodbye", "bye", "thank you bye", "that's all",
            "end call", "hang up", "thanks bye"
        ]
        message_lower = message.lower()
        return any(phrase in message_lower for phrase in goodbye_phrases)

    async def _handle_goodbye(self) -> Dict[str, Any]:
        """Handle goodbye intent"""
        import random
        goodbye_message = random.choice(self.config.behavior.goodbye_messages)

        self._add_turn("agent", goodbye_message)

        if self.config.behavior.end_call_on_goodbye:
            await self.end_call(reason="user_goodbye")

        return {
            'status': 'ending',
            'message': goodbye_message,
            'end_call': self.config.behavior.end_call_on_goodbye
        }

    async def _handle_human_handoff(self, reason: str) -> Dict[str, Any]:
        """Handle handoff to human"""
        return await self._transfer_to_human(reason)

    def _calculate_call_score(self) -> float:
        """
        Calculate overall call quality score (0.0 to 1.0).

        Factors:
        - Error rate
        - Sentiment
        - Conversation length
        - Latency
        """
        score = 1.0

        # Penalize errors
        if self.metrics.total_turns > 0:
            error_rate = self.metrics.errors / self.metrics.total_turns
            score -= error_rate * 0.3

        # Reward positive sentiment
        if self.metrics.sentiment_scores:
            avg_sentiment = sum(self.metrics.sentiment_scores) / len(self.metrics.sentiment_scores)
            score *= (0.7 + avg_sentiment * 0.3)  # 0.7 to 1.0 multiplier

        # Penalize very short conversations (might be unsuccessful)
        if self.metrics.total_turns < 3:
            score *= 0.5

        # Slight penalty for high latency
        if self.metrics.latency_ms:
            avg_latency = sum(self.metrics.latency_ms) / len(self.metrics.latency_ms)
            if avg_latency > 1000:  # Over 1 second
                score *= 0.9

        return max(0.0, min(1.0, score))

    # ==================== Learning Integration ====================

    def get_learning_insights(self) -> List[str]:
        """Get learning insights relevant to this agent"""
        insights = self.learning_engine.get_insights_for_context(
            category=self.config.agent_type.value,
            context=self.current_context
        )
        return [i.insight for i in insights]

    def apply_learned_strategy(self, strategy_type: StrategyType) -> Optional[str]:
        """
        Apply a learned strategy and get prompt modifier.

        Args:
            strategy_type: Type of strategy to apply

        Returns:
            Prompt modifier string or None
        """
        strategy = select_strategy(strategy_type, self.current_context)
        if strategy:
            return self.learning_engine.get_strategy_prompt_modifier(strategy)
        return None

    # ==================== Utility Methods ====================

    def get_conversation_summary(self) -> str:
        """Get summary of conversation so far"""
        if not self.conversation_history:
            return "No conversation yet."

        summary_lines = []
        for turn in self.conversation_history[-10:]:  # Last 10 turns
            speaker = "User" if turn.speaker == "user" else self.agent_name
            summary_lines.append(f"{speaker}: {turn.message}")

        return "\n".join(summary_lines)

    def get_call_info(self) -> Dict[str, Any]:
        """Get current call information"""
        return {
            'call_id': self.current_call_id,
            'agent_id': self.agent_id,
            'agent_name': self.agent_name,
            'state': self.call_state.value,
            'turns': len(self.conversation_history),
            'metrics': self.metrics.to_dict(),
            'current_state': self.state_machine.current_state_id if self.state_machine else None
        }

    def to_dict(self) -> Dict[str, Any]:
        """Serialize agent state to dictionary"""
        return {
            'agent_id': self.agent_id,
            'agent_name': self.agent_name,
            'config': self.config.to_dict(),
            'call_state': self.call_state.value,
            'current_call_id': self.current_call_id,
            'conversation_history': [turn.to_dict() for turn in self.conversation_history],
            'current_context': self.current_context,
            'metrics': self.metrics.to_dict(),
            'error_count': self.error_count,
            'state_machine': self.state_machine.to_dict() if self.state_machine else None
        }
