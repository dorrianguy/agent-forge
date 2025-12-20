"""
Agent Forge - Base Voice Agent
Base class for all voice agents with common functionality.
"""

from abc import ABC, abstractmethod
from typing import Dict, List, Any, Optional
from datetime import datetime
import uuid

from ..voice_agent_types import VoiceAgentType, VoiceAgentCapability


class BaseVoiceAgent(ABC):
    """
    Base class for all voice agents.

    Provides common functionality for system prompts, greetings,
    available functions, and conversation flow.
    """

    def __init__(
        self,
        agent_id: Optional[str] = None,
        user_id: Optional[str] = None,
        name: Optional[str] = None,
        **kwargs
    ):
        """
        Initialize base voice agent.

        Args:
            agent_id: Unique agent identifier
            user_id: User who owns this agent
            name: Agent name
            **kwargs: Additional configuration
        """
        self.agent_id = agent_id or str(uuid.uuid4())
        self.user_id = user_id or ""
        self.name = name or self.__class__.__name__
        self.created_at = datetime.now()
        self.conversation_history: List[Dict[str, Any]] = []
        self.metadata: Dict[str, Any] = kwargs

    @abstractmethod
    def get_agent_type(self) -> VoiceAgentType:
        """
        Get the agent type enum value.

        Returns:
            VoiceAgentType enum value
        """
        pass

    @abstractmethod
    def get_capabilities(self) -> List[VoiceAgentCapability]:
        """
        Get list of agent capabilities.

        Returns:
            List of VoiceAgentCapability enum values
        """
        pass

    @abstractmethod
    def get_system_prompt(self) -> str:
        """
        Get the system prompt for this agent.

        Returns:
            System prompt string optimized for voice
        """
        pass

    @abstractmethod
    def get_greeting(self) -> str:
        """
        Get the greeting message for this agent.
        Should include any required disclosures.

        Returns:
            Greeting string
        """
        pass

    @abstractmethod
    def get_available_functions(self) -> List[Dict[str, Any]]:
        """
        Get list of functions this agent can call.

        Returns:
            List of function definitions in OpenAI function calling format
        """
        pass

    def get_fallback_responses(self) -> List[str]:
        """
        Get fallback responses when agent doesn't understand.

        Returns:
            List of fallback response strings
        """
        return [
            "I'm sorry, I didn't quite catch that. Could you say that again?",
            "I'm not sure I understood. Can you rephrase that for me?",
            "Let me make sure I got that right. You said...",
            "I want to help, but I need a bit more information. Can you tell me more?",
        ]

    def get_transfer_phrases(self) -> List[str]:
        """
        Get phrases for transferring to a specialist.

        Returns:
            List of transfer phrase strings
        """
        return [
            "Let me connect you with someone who can assist you better.",
            "I'm going to transfer you to a specialist right now.",
            "This needs a specialist's attention. One moment while I connect you.",
        ]

    def get_closing_phrases(self) -> List[str]:
        """
        Get phrases for closing the conversation.

        Returns:
            List of closing phrase strings
        """
        return [
            "Is there anything else I can help you with today?",
            "Great! I'm glad I could help. Have a wonderful day!",
            "Perfect. If you need anything else, just give us a call. Take care!",
        ]

    def add_to_history(
        self,
        role: str,
        content: str,
        metadata: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        Add message to conversation history.

        Args:
            role: Message role (user, assistant, system)
            content: Message content
            metadata: Optional metadata
        """
        self.conversation_history.append({
            "role": role,
            "content": content,
            "timestamp": datetime.now().isoformat(),
            "metadata": metadata or {}
        })

    def get_conversation_context(self, max_messages: int = 20) -> List[Dict[str, Any]]:
        """
        Get recent conversation history for context.

        Args:
            max_messages: Maximum number of messages to return

        Returns:
            List of recent conversation messages
        """
        return self.conversation_history[-max_messages:]

    def clear_history(self) -> None:
        """Clear conversation history."""
        self.conversation_history = []

    def to_dict(self) -> Dict[str, Any]:
        """
        Convert agent to dictionary representation.

        Returns:
            Dictionary with agent configuration
        """
        return {
            "agent_id": self.agent_id,
            "user_id": self.user_id,
            "name": self.name,
            "agent_type": self.get_agent_type().value,
            "capabilities": [cap.value for cap in self.get_capabilities()],
            "created_at": self.created_at.isoformat(),
            "system_prompt": self.get_system_prompt(),
            "greeting": self.get_greeting(),
            "available_functions": self.get_available_functions(),
            "metadata": self.metadata
        }

    def validate_compliance(self) -> List[str]:
        """
        Validate agent compliance requirements.
        Should be overridden by agents with specific compliance needs.

        Returns:
            List of compliance warnings/errors (empty if compliant)
        """
        return []
