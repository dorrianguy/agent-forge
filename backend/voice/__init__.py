"""
Agent Forge - Voice Module

Provides voice agent capabilities including:
- Telephony integration (Twilio/Telnyx)
- Speech-to-Text (Deepgram, Whisper)
- Text-to-Speech (ElevenLabs, Deepgram, OpenAI)
- Real-time voice pipeline orchestration
- WebSocket streaming
- Voice analytics and call management
"""

from .telephony import (
    TelephonyManager,
    TelephonyProvider,
    get_telephony_manager,
    PhoneNumber,
    Call,
    CallStatus,
    CallDirection
)
from .asr import (
    ASRManager,
    ASRProvider,
    ASRStream,
    get_asr_manager,
    TranscriptResult
)
from .tts import (
    TTSManager,
    TTSProvider,
    TTSVoice,
    get_tts_manager
)
from .pipeline import (
    VoicePipeline,
    VoiceSessionManager,
    get_voice_session_manager,
    PipelineState
)
from .websocket import (
    VoiceWebSocketManager,
    get_voice_ws_manager
)
from .state_machine import (
    VoiceStateMachine,
    ConversationState,
    StateTransition
)
from .functions import (
    VoiceFunctionRegistry,
    get_voice_function_registry,
    VoiceFunction
)
from .analytics import (
    VoiceAnalyticsManager,
    PostCallAnalyzer,
    CallMetrics,
    get_voice_analytics_manager
)
from .campaigns import (
    CampaignManager,
    CallCampaign,
    CampaignStatus,
    CampaignContact,
    get_campaign_manager
)
from .sms import (
    SMSManager,
    get_sms_manager,
    SMSMessage
)
from .webhooks import (
    VoiceWebhookManager,
    get_voice_webhook_manager,
    VoiceWebhook,
    WebhookEvent
)
from .versioning import (
    AgentVersionManager,
    AgentVersion,
    get_agent_version_manager
)
from .playground import (
    VoicePlayground,
    get_voice_playground
)
from .testing import (
    VoiceTestRunner,
    TestScenario,
    TestResult
)

__all__ = [
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
    # TTS
    'TTSManager',
    'TTSProvider',
    'TTSVoice',
    'get_tts_manager',
    # Pipeline
    'VoicePipeline',
    'VoiceSessionManager',
    'get_voice_session_manager',
    'PipelineState',
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
