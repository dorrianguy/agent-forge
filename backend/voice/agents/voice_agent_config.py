"""
Voice Agent Configuration
Dataclass-based configuration for voice agents in Agent Forge.

This module defines the complete configuration structure for voice agents,
including voice settings, LLM configuration, behavior parameters, and integrations.
"""

import uuid
from dataclasses import dataclass, field
from typing import Any, Dict, List, Optional
from datetime import datetime
from enum import Enum


class AgentType(Enum):
    """Types of voice agents"""
    SALES = "sales"
    SUPPORT = "support"
    APPOINTMENT_BOOKING = "appointment_booking"
    LEAD_QUALIFICATION = "lead_qualification"
    OUTBOUND_SALES = "outbound_sales"
    INBOUND_SUPPORT = "inbound_support"
    FAQ_BOT = "faq_bot"
    SURVEY = "survey"
    REMINDER = "reminder"
    CUSTOM = "custom"


class LLMProvider(Enum):
    """Supported LLM providers"""
    OPENAI = "openai"
    GEMINI = "gemini"
    ANTHROPIC = "anthropic"


class VoiceProvider(Enum):
    """Supported voice/TTS providers"""
    ELEVENLABS = "elevenlabs"
    DEEPGRAM = "deepgram"
    OPENAI = "openai"
    CARTESIA = "cartesia"


class PhoneProvider(Enum):
    """Phone/telephony providers"""
    TWILIO = "twilio"
    VAPI = "vapi"
    RETELL = "retell"


@dataclass
class VoiceSettings:
    """Voice and speech configuration"""
    # Voice identity
    voice_id: str = "default"
    voice_provider: VoiceProvider = VoiceProvider.ELEVENLABS

    # Speech parameters
    language: str = "en-US"
    speech_speed: float = 1.0  # 0.5 to 2.0
    pitch: float = 1.0  # 0.5 to 2.0
    stability: float = 0.5  # 0.0 to 1.0 (ElevenLabs)
    similarity_boost: float = 0.75  # 0.0 to 1.0 (ElevenLabs)

    # Audio settings
    sample_rate: int = 24000
    enable_ssml: bool = True
    optimize_streaming_latency: int = 3  # 0-4 (ElevenLabs)

    # Interruption handling
    enable_interruptions: bool = True
    interruption_threshold: float = 0.5  # Sensitivity 0.0-1.0

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            'voice_id': self.voice_id,
            'voice_provider': self.voice_provider.value,
            'language': self.language,
            'speech_speed': self.speech_speed,
            'pitch': self.pitch,
            'stability': self.stability,
            'similarity_boost': self.similarity_boost,
            'sample_rate': self.sample_rate,
            'enable_ssml': self.enable_ssml,
            'optimize_streaming_latency': self.optimize_streaming_latency,
            'enable_interruptions': self.enable_interruptions,
            'interruption_threshold': self.interruption_threshold
        }


@dataclass
class LLMSettings:
    """LLM configuration for the agent"""
    # Provider and model
    provider: LLMProvider = LLMProvider.OPENAI
    model: str = "gpt-4o-realtime-preview"

    # Generation parameters
    temperature: float = 0.7
    max_tokens: int = 150
    top_p: float = 1.0
    frequency_penalty: float = 0.0
    presence_penalty: float = 0.0

    # Context management
    max_context_messages: int = 20
    context_window: int = 8000

    # Response behavior
    enable_thinking: bool = False
    response_format: Optional[str] = None  # "json_object" if structured output needed

    # Streaming
    enable_streaming: bool = True
    stream_options: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            'provider': self.provider.value,
            'model': self.model,
            'temperature': self.temperature,
            'max_tokens': self.max_tokens,
            'top_p': self.top_p,
            'frequency_penalty': self.frequency_penalty,
            'presence_penalty': self.presence_penalty,
            'max_context_messages': self.max_context_messages,
            'context_window': self.context_window,
            'enable_thinking': self.enable_thinking,
            'response_format': self.response_format,
            'enable_streaming': self.enable_streaming,
            'stream_options': self.stream_options
        }


@dataclass
class BehaviorSettings:
    """Agent behavior configuration"""
    # Greeting
    greeting_text: str = "Hello! How can I help you today?"
    greeting_enabled: bool = True

    # System prompt
    system_prompt: str = "You are a helpful AI assistant."

    # Conversation control
    max_call_duration: int = 300  # seconds (5 minutes)
    max_silence_duration: int = 10  # seconds before prompting
    idle_timeout: int = 30  # seconds of silence before ending

    # Goodbye handling
    goodbye_messages: List[str] = field(default_factory=lambda: [
        "Thank you for calling. Goodbye!",
        "Have a great day!"
    ])
    end_call_on_goodbye: bool = True

    # Error handling
    error_message: str = "I'm sorry, I didn't understand that. Could you please repeat?"
    max_error_retries: int = 3
    fallback_to_human: bool = True
    human_handoff_message: str = "Let me transfer you to a human agent."

    # Response style
    conversational_filler: bool = True  # "Um", "Let me check", etc.
    use_personality: bool = True
    personality_traits: List[str] = field(default_factory=lambda: ["friendly", "professional"])

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            'greeting_text': self.greeting_text,
            'greeting_enabled': self.greeting_enabled,
            'system_prompt': self.system_prompt,
            'max_call_duration': self.max_call_duration,
            'max_silence_duration': self.max_silence_duration,
            'idle_timeout': self.idle_timeout,
            'goodbye_messages': self.goodbye_messages,
            'end_call_on_goodbye': self.end_call_on_goodbye,
            'error_message': self.error_message,
            'max_error_retries': self.max_error_retries,
            'fallback_to_human': self.fallback_to_human,
            'human_handoff_message': self.human_handoff_message,
            'conversational_filler': self.conversational_filler,
            'use_personality': self.use_personality,
            'personality_traits': self.personality_traits
        }


@dataclass
class IntegrationSettings:
    """External integration configuration"""
    # CRM
    crm_enabled: bool = False
    crm_provider: Optional[str] = None  # "hubspot", "salesforce", etc.
    crm_config: Dict[str, Any] = field(default_factory=dict)

    # Calendar
    calendar_enabled: bool = False
    calendar_provider: Optional[str] = None  # "google", "calendly", etc.
    calendar_config: Dict[str, Any] = field(default_factory=dict)

    # Payment
    payment_enabled: bool = False
    payment_provider: Optional[str] = None  # "stripe", etc.
    payment_config: Dict[str, Any] = field(default_factory=dict)

    # Webhooks
    webhook_url: Optional[str] = None
    webhook_events: List[str] = field(default_factory=list)

    # Knowledge base
    knowledge_base_enabled: bool = False
    knowledge_base_id: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            'crm_enabled': self.crm_enabled,
            'crm_provider': self.crm_provider,
            'crm_config': self.crm_config,
            'calendar_enabled': self.calendar_enabled,
            'calendar_provider': self.calendar_provider,
            'calendar_config': self.calendar_config,
            'payment_enabled': self.payment_enabled,
            'payment_provider': self.payment_provider,
            'payment_config': self.payment_config,
            'webhook_url': self.webhook_url,
            'webhook_events': self.webhook_events,
            'knowledge_base_enabled': self.knowledge_base_enabled,
            'knowledge_base_id': self.knowledge_base_id
        }


@dataclass
class AnalyticsSettings:
    """Analytics and monitoring configuration"""
    # Recording
    enable_recording: bool = True
    enable_transcription: bool = True

    # Analytics
    track_metrics: bool = True
    track_sentiment: bool = True
    track_intent: bool = True

    # Privacy
    pii_redaction: bool = False
    data_retention_days: int = 90

    # Logging
    log_level: str = "INFO"
    log_conversations: bool = True

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            'enable_recording': self.enable_recording,
            'enable_transcription': self.enable_transcription,
            'track_metrics': self.track_metrics,
            'track_sentiment': self.track_sentiment,
            'track_intent': self.track_intent,
            'pii_redaction': self.pii_redaction,
            'data_retention_days': self.data_retention_days,
            'log_level': self.log_level,
            'log_conversations': self.log_conversations
        }


@dataclass
class StateMachineConfig:
    """State machine configuration"""
    enabled: bool = False
    states: List[Dict[str, Any]] = field(default_factory=list)
    transitions: List[Dict[str, Any]] = field(default_factory=list)
    initial_state_id: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            'enabled': self.enabled,
            'states': self.states,
            'transitions': self.transitions,
            'initial_state_id': self.initial_state_id
        }


@dataclass
class VoiceAgentConfig:
    """
    Complete configuration for a voice agent in Agent Forge.

    This is the single source of truth for all agent settings,
    combining voice, LLM, behavior, integrations, and analytics.
    """
    # Identity
    id: str = field(default_factory=lambda: str(uuid.uuid4()))
    name: str = "Voice Agent"
    agent_type: AgentType = AgentType.CUSTOM
    user_id: str = ""

    # Configuration sections
    voice: VoiceSettings = field(default_factory=VoiceSettings)
    llm: LLMSettings = field(default_factory=LLMSettings)
    behavior: BehaviorSettings = field(default_factory=BehaviorSettings)
    integrations: IntegrationSettings = field(default_factory=IntegrationSettings)
    analytics: AnalyticsSettings = field(default_factory=AnalyticsSettings)
    state_machine: StateMachineConfig = field(default_factory=StateMachineConfig)

    # Capabilities
    capabilities: List[str] = field(default_factory=list)  # ["appointment_booking", "payment", etc.]

    # Phone configuration
    phone_number: Optional[str] = None
    phone_provider: PhoneProvider = PhoneProvider.TWILIO
    phone_config: Dict[str, Any] = field(default_factory=dict)

    # Metadata
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    version: str = "1.0.0"
    metadata: Dict[str, Any] = field(default_factory=dict)

    # Status
    is_active: bool = True
    is_deployed: bool = False
    deployment_url: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert complete config to dictionary"""
        return {
            'id': self.id,
            'name': self.name,
            'agent_type': self.agent_type.value,
            'user_id': self.user_id,
            'voice': self.voice.to_dict(),
            'llm': self.llm.to_dict(),
            'behavior': self.behavior.to_dict(),
            'integrations': self.integrations.to_dict(),
            'analytics': self.analytics.to_dict(),
            'state_machine': self.state_machine.to_dict(),
            'capabilities': self.capabilities,
            'phone_number': self.phone_number,
            'phone_provider': self.phone_provider.value,
            'phone_config': self.phone_config,
            'created_at': self.created_at.isoformat(),
            'updated_at': self.updated_at.isoformat(),
            'version': self.version,
            'metadata': self.metadata,
            'is_active': self.is_active,
            'is_deployed': self.is_deployed,
            'deployment_url': self.deployment_url
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'VoiceAgentConfig':
        """Create config from dictionary"""
        config = cls(
            id=data.get('id', str(uuid.uuid4())),
            name=data.get('name', 'Voice Agent'),
            agent_type=AgentType(data.get('agent_type', 'custom')),
            user_id=data.get('user_id', ''),
            capabilities=data.get('capabilities', []),
            phone_number=data.get('phone_number'),
            phone_provider=PhoneProvider(data.get('phone_provider', 'twilio')),
            phone_config=data.get('phone_config', {}),
            version=data.get('version', '1.0.0'),
            metadata=data.get('metadata', {}),
            is_active=data.get('is_active', True),
            is_deployed=data.get('is_deployed', False),
            deployment_url=data.get('deployment_url')
        )

        # Parse timestamps
        if 'created_at' in data:
            config.created_at = datetime.fromisoformat(data['created_at'])
        if 'updated_at' in data:
            config.updated_at = datetime.fromisoformat(data['updated_at'])

        # Parse nested configs
        if 'voice' in data:
            voice_data = data['voice']
            config.voice = VoiceSettings(
                voice_id=voice_data.get('voice_id', 'default'),
                voice_provider=VoiceProvider(voice_data.get('voice_provider', 'elevenlabs')),
                language=voice_data.get('language', 'en-US'),
                speech_speed=voice_data.get('speech_speed', 1.0),
                pitch=voice_data.get('pitch', 1.0),
                stability=voice_data.get('stability', 0.5),
                similarity_boost=voice_data.get('similarity_boost', 0.75),
                sample_rate=voice_data.get('sample_rate', 24000),
                enable_ssml=voice_data.get('enable_ssml', True),
                optimize_streaming_latency=voice_data.get('optimize_streaming_latency', 3),
                enable_interruptions=voice_data.get('enable_interruptions', True),
                interruption_threshold=voice_data.get('interruption_threshold', 0.5)
            )

        if 'llm' in data:
            llm_data = data['llm']
            config.llm = LLMSettings(
                provider=LLMProvider(llm_data.get('provider', 'openai')),
                model=llm_data.get('model', 'gpt-4o-realtime-preview'),
                temperature=llm_data.get('temperature', 0.7),
                max_tokens=llm_data.get('max_tokens', 150),
                top_p=llm_data.get('top_p', 1.0),
                frequency_penalty=llm_data.get('frequency_penalty', 0.0),
                presence_penalty=llm_data.get('presence_penalty', 0.0),
                max_context_messages=llm_data.get('max_context_messages', 20),
                context_window=llm_data.get('context_window', 8000),
                enable_thinking=llm_data.get('enable_thinking', False),
                response_format=llm_data.get('response_format'),
                enable_streaming=llm_data.get('enable_streaming', True),
                stream_options=llm_data.get('stream_options', {})
            )

        if 'behavior' in data:
            behavior_data = data['behavior']
            config.behavior = BehaviorSettings(
                greeting_text=behavior_data.get('greeting_text', 'Hello! How can I help you today?'),
                greeting_enabled=behavior_data.get('greeting_enabled', True),
                system_prompt=behavior_data.get('system_prompt', 'You are a helpful AI assistant.'),
                max_call_duration=behavior_data.get('max_call_duration', 300),
                max_silence_duration=behavior_data.get('max_silence_duration', 10),
                idle_timeout=behavior_data.get('idle_timeout', 30),
                goodbye_messages=behavior_data.get('goodbye_messages', ['Thank you for calling. Goodbye!', 'Have a great day!']),
                end_call_on_goodbye=behavior_data.get('end_call_on_goodbye', True),
                error_message=behavior_data.get('error_message', "I'm sorry, I didn't understand that. Could you please repeat?"),
                max_error_retries=behavior_data.get('max_error_retries', 3),
                fallback_to_human=behavior_data.get('fallback_to_human', True),
                human_handoff_message=behavior_data.get('human_handoff_message', 'Let me transfer you to a human agent.'),
                conversational_filler=behavior_data.get('conversational_filler', True),
                use_personality=behavior_data.get('use_personality', True),
                personality_traits=behavior_data.get('personality_traits', ['friendly', 'professional'])
            )

        if 'integrations' in data:
            int_data = data['integrations']
            config.integrations = IntegrationSettings(
                crm_enabled=int_data.get('crm_enabled', False),
                crm_provider=int_data.get('crm_provider'),
                crm_config=int_data.get('crm_config', {}),
                calendar_enabled=int_data.get('calendar_enabled', False),
                calendar_provider=int_data.get('calendar_provider'),
                calendar_config=int_data.get('calendar_config', {}),
                payment_enabled=int_data.get('payment_enabled', False),
                payment_provider=int_data.get('payment_provider'),
                payment_config=int_data.get('payment_config', {}),
                webhook_url=int_data.get('webhook_url'),
                webhook_events=int_data.get('webhook_events', []),
                knowledge_base_enabled=int_data.get('knowledge_base_enabled', False),
                knowledge_base_id=int_data.get('knowledge_base_id')
            )

        if 'analytics' in data:
            analytics_data = data['analytics']
            config.analytics = AnalyticsSettings(
                enable_recording=analytics_data.get('enable_recording', True),
                enable_transcription=analytics_data.get('enable_transcription', True),
                track_metrics=analytics_data.get('track_metrics', True),
                track_sentiment=analytics_data.get('track_sentiment', True),
                track_intent=analytics_data.get('track_intent', True),
                pii_redaction=analytics_data.get('pii_redaction', False),
                data_retention_days=analytics_data.get('data_retention_days', 90),
                log_level=analytics_data.get('log_level', 'INFO'),
                log_conversations=analytics_data.get('log_conversations', True)
            )

        if 'state_machine' in data:
            sm_data = data['state_machine']
            config.state_machine = StateMachineConfig(
                enabled=sm_data.get('enabled', False),
                states=sm_data.get('states', []),
                transitions=sm_data.get('transitions', []),
                initial_state_id=sm_data.get('initial_state_id')
            )

        return config

    def validate(self) -> List[str]:
        """
        Validate configuration and return list of errors.

        Returns:
            List of error messages (empty if valid)
        """
        errors = []

        # Required fields
        if not self.name:
            errors.append("Agent name is required")
        if not self.user_id:
            errors.append("User ID is required")

        # Voice settings
        if self.voice.speech_speed < 0.5 or self.voice.speech_speed > 2.0:
            errors.append("Speech speed must be between 0.5 and 2.0")
        if self.voice.pitch < 0.5 or self.voice.pitch > 2.0:
            errors.append("Pitch must be between 0.5 and 2.0")

        # LLM settings
        if self.llm.temperature < 0.0 or self.llm.temperature > 2.0:
            errors.append("Temperature must be between 0.0 and 2.0")
        if self.llm.max_tokens < 1:
            errors.append("Max tokens must be positive")

        # Behavior settings
        if self.behavior.max_call_duration < 10:
            errors.append("Max call duration must be at least 10 seconds")
        if self.behavior.max_silence_duration < 1:
            errors.append("Max silence duration must be at least 1 second")

        # State machine validation
        if self.state_machine.enabled:
            if not self.state_machine.states:
                errors.append("State machine enabled but no states defined")
            if self.state_machine.initial_state_id:
                state_ids = [s.get('id') for s in self.state_machine.states]
                if self.state_machine.initial_state_id not in state_ids:
                    errors.append(f"Initial state '{self.state_machine.initial_state_id}' not found in states")

        return errors

    def __repr__(self) -> str:
        """String representation"""
        return f"VoiceAgentConfig(id={self.id}, name={self.name}, type={self.agent_type.value})"
