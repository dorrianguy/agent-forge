"""
Agent Forge - Voice Module

Provides voice agent capabilities including:
- Telephony integration (Twilio/Telnyx)
- Speech-to-Text (Deepgram, Whisper)
- Text-to-Speech (ElevenLabs, Deepgram, OpenAI)
- Real-time voice pipeline orchestration
- WebSocket streaming
- Voice analytics and call management
- 20 specialized voice agent types
"""

__version__ = "1.0.0"

# Agent Types
from .agents import (
    VoiceAgentType,
    VoiceAgentCapability,
    LLMProvider,
    ASRProvider as AgentASRProvider,
    TTSProvider as AgentTTSProvider,
    VOICE_AGENT_METADATA,
    get_agent_metadata,
    get_agents_by_category,
    get_all_categories
)

# Telephony
from .telephony import (
    TelephonyManager,
    TelephonyProvider,
    get_telephony_manager,
    PhoneNumber,
    Call,
    CallStatus,
    CallDirection
)

# ASR (Speech-to-Text)
from .asr import (
    ASRManager,
    ASRProvider,
    ASRStream,
    get_asr_manager,
    TranscriptResult,
    ASRConfig
)

# TTS (Text-to-Speech)
from .tts import (
    TTSManager,
    TTSProvider,
    TTSVoice,
    get_tts_manager,
    TTSConfig
)

# Pipeline
from .pipeline import (
    VoicePipeline,
    VoiceSessionManager,
    get_voice_session_manager,
    PipelineState,
    ConversationMessage,
    LatencyMetrics
)

# WebSocket
from .websocket import (
    VoiceWebSocketManager,
    get_voice_ws_manager
)

# State Machine
from .state_machine import (
    VoiceStateMachine,
    ConversationState,
    StateTransition
)

# Functions
from .functions import (
    VoiceFunctionRegistry,
    get_voice_function_registry,
    VoiceFunction
)

# Analytics
from .analytics import (
    VoiceAnalyticsManager,
    PostCallAnalyzer,
    CallMetrics,
    get_voice_analytics_manager
)

# Campaigns
from .campaigns import (
    CampaignManager,
    CallCampaign,
    CampaignStatus,
    CampaignContact,
    get_campaign_manager
)

# SMS
from .sms import (
    SMSManager,
    get_sms_manager,
    SMSMessage
)

# Webhooks
from .webhooks import (
    VoiceWebhookManager,
    get_voice_webhook_manager,
    VoiceWebhook,
    WebhookEvent
)

# Versioning
from .versioning import (
    AgentVersionManager,
    AgentVersion,
    get_agent_version_manager
)

# Playground
from .playground import (
    VoicePlayground,
    get_voice_playground
)

# Testing
from .testing import (
    VoiceTestRunner,
    TestScenario,
    TestResult
)

__all__ = [
    # Version
    '__version__',

    # Agent Types
    'VoiceAgentType',
    'VoiceAgentCapability',
    'LLMProvider',
    'AgentASRProvider',
    'AgentTTSProvider',
    'VOICE_AGENT_METADATA',
    'get_agent_metadata',
    'get_agents_by_category',
    'get_all_categories',

    # Telephony
    'TelephonyManager',
    'TelephonyProvider',
    'get_telephony_manager',
    'PhoneNumber',
    'Call',
    'CallStatus',
    'CallDirection',

    # ASR
    'ASRManager',
    'ASRProvider',
    'ASRStream',
    'get_asr_manager',
    'TranscriptResult',
    'ASRConfig',

    # TTS
    'TTSManager',
    'TTSProvider',
    'TTSVoice',
    'get_tts_manager',
    'TTSConfig',

    # Pipeline
    'VoicePipeline',
    'VoiceSessionManager',
    'get_voice_session_manager',
    'PipelineState',
    'ConversationMessage',
    'LatencyMetrics',

    # WebSocket
    'VoiceWebSocketManager',
    'get_voice_ws_manager',

    # State Machine
    'VoiceStateMachine',
    'ConversationState',
    'StateTransition',

    # Functions
    'VoiceFunctionRegistry',
    'get_voice_function_registry',
    'VoiceFunction',

    # Analytics
    'VoiceAnalyticsManager',
    'PostCallAnalyzer',
    'CallMetrics',
    'get_voice_analytics_manager',

    # Campaigns
    'CampaignManager',
    'CallCampaign',
    'CampaignStatus',
    'CampaignContact',
    'get_campaign_manager',

    # SMS
    'SMSManager',
    'get_sms_manager',
    'SMSMessage',

    # Webhooks
    'VoiceWebhookManager',
    'get_voice_webhook_manager',
    'VoiceWebhook',
    'WebhookEvent',

    # Versioning
    'AgentVersionManager',
    'AgentVersion',
    'get_agent_version_manager',

    # Playground
    'VoicePlayground',
    'get_voice_playground',

    # Testing
    'VoiceTestRunner',
    'TestScenario',
    'TestResult',
]


# ============================================
# Quick Access Functions
# ============================================

def create_voice_pipeline(agent_id: str, call_id: str, **kwargs):
    """
    Quick helper to create a voice pipeline with default managers.

    Args:
        agent_id: Agent identifier
        call_id: Unique call identifier
        **kwargs: Additional configuration options

    Returns:
        VoicePipeline: Configured voice pipeline instance

    Example:
        pipeline = create_voice_pipeline("agent_123", "call_456")
    """
    asr_mgr = get_asr_manager()
    tts_mgr = get_tts_manager()
    return VoicePipeline(agent_id, call_id, asr_mgr, tts_mgr, **kwargs)


def create_outbound_call(agent_id: str, to_number: str, **kwargs):
    """
    Quick helper to initiate an outbound call.

    Args:
        agent_id: Agent identifier
        to_number: Destination phone number
        **kwargs: Additional call configuration

    Returns:
        Call: Call instance

    Example:
        call = create_outbound_call("agent_123", "+15551234567")
    """
    telephony_mgr = get_telephony_manager()
    return telephony_mgr.initiate_call(agent_id, to_number, **kwargs)


def get_agent_by_type(agent_type: VoiceAgentType):
    """
    Quick helper to get agent metadata by type.

    Args:
        agent_type: VoiceAgentType enum value

    Returns:
        dict: Agent metadata

    Example:
        metadata = get_agent_by_type(VoiceAgentType.VOICE_CUSTOMER_SUPPORT)
    """
    return get_agent_metadata(agent_type)


def list_agent_categories():
    """
    Quick helper to list all available agent categories.

    Returns:
        list: List of category names

    Example:
        categories = list_agent_categories()
        # ['customer_service', 'sales', 'healthcare', 'financial', 'hospitality']
    """
    return get_all_categories()


# Add quick access functions to __all__
__all__.extend([
    'create_voice_pipeline',
    'create_outbound_call',
    'get_agent_by_type',
    'list_agent_categories',
])
