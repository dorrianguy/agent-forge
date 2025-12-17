"""
Agent Forge Voice - FastAPI Routes
Complete REST API for voice agent capabilities

Includes:
- Phone number management
- Voice agent configuration
- Call management
- Campaign orchestration
- Analytics and reporting
- Webhook management
- Testing and playground
"""

import os
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime
from enum import Enum

from fastapi import APIRouter, HTTPException, Depends, Request, Query, Body, UploadFile, File
from fastapi.responses import JSONResponse, StreamingResponse
from pydantic import BaseModel, Field, validator, EmailStr

from .auth import get_api_key_auth, AuthResult
from .voice import (
    get_telephony_manager,
    get_asr_manager,
    get_tts_manager,
    get_voice_session_manager,
    get_voice_analytics_manager,
    get_campaign_manager,
    get_voice_webhook_manager,
    get_voice_playground,
    TelephonyManager,
    ASRManager,
    TTSManager,
    VoiceSessionManager,
    VoiceAnalyticsManager,
    CampaignManager,
    VoiceWebhookManager,
    VoicePlayground,
    PhoneNumber,
    Call,
    CallStatus,
    CallDirection,
    CallCampaign,
    CampaignStatus,
    VoiceWebhook,
    WebhookEvent,
    VoiceTestRunner,
    TestScenario
)

logger = logging.getLogger('AgentForge.VoiceAPI')

# Create router
router = APIRouter(prefix="/api/voice", tags=["voice"])


# ==================== Pydantic Models ====================

# Phone Numbers
class NumberSearchRequest(BaseModel):
    """Search for available phone numbers"""
    country: str = Field(default="US", description="Country code (ISO 3166-1 alpha-2)")
    area_code: Optional[str] = Field(None, description="Preferred area code")
    contains: Optional[str] = Field(None, description="Number must contain these digits")
    type: str = Field(default="local", description="Number type: local or toll_free")
    limit: int = Field(default=10, ge=1, le=50, description="Max results")


class NumberProvisionRequest(BaseModel):
    """Provision a phone number"""
    phone_number: str = Field(..., description="Phone number to provision (E.164 format)")
    friendly_name: Optional[str] = Field(None, description="Human-readable name")
    agent_id: Optional[str] = Field(None, description="Agent to attach this number to")


class NumberUpdateRequest(BaseModel):
    """Update phone number configuration"""
    friendly_name: Optional[str] = None
    agent_id: Optional[str] = None
    voice_url: Optional[str] = None
    sms_url: Optional[str] = None
    status: Optional[str] = Field(None, description="active or inactive")


class PhoneNumberResponse(BaseModel):
    """Phone number response"""
    id: str
    phone_number: str
    user_id: str
    agent_id: Optional[str]
    country: str
    capabilities: List[str]
    provider: str
    friendly_name: Optional[str]
    monthly_cost: float
    status: str
    created_at: datetime


# Voice Agent Configuration
class VoiceConfig(BaseModel):
    """Voice agent configuration"""
    tts_provider: str = Field(default="elevenlabs", description="TTS provider: elevenlabs, deepgram, openai")
    voice_id: str = Field(default="", description="Voice ID from provider")
    voice_stability: float = Field(default=0.5, ge=0, le=1)
    voice_similarity_boost: float = Field(default=0.75, ge=0, le=1)
    asr_provider: str = Field(default="deepgram", description="ASR provider: deepgram, whisper")
    asr_model: str = Field(default="nova-2", description="ASR model")
    language: str = Field(default="en-US", description="Language code")
    interruption_threshold: int = Field(default=300, description="Milliseconds before interruption")
    max_silence_ms: int = Field(default=2000, description="Max silence before ending turn")
    enable_sentiment_analysis: bool = Field(default=True)
    enable_function_calling: bool = Field(default=True)
    record_calls: bool = Field(default=True)
    answering_machine_detection: bool = Field(default=False)


class VoiceConfigResponse(BaseModel):
    """Voice configuration response"""
    agent_id: str
    config: VoiceConfig
    updated_at: datetime


class ConversationFlowNode(BaseModel):
    """Node in conversation flow"""
    id: str
    type: str = Field(..., description="greeting, question, response, branch, action, end")
    content: Optional[str] = Field(None, description="Text content for the node")
    conditions: Optional[Dict[str, Any]] = Field(default_factory=dict)
    next_nodes: List[str] = Field(default_factory=list)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class ConversationFlow(BaseModel):
    """Complete conversation flow"""
    nodes: List[ConversationFlowNode]
    start_node_id: str
    metadata: Dict[str, Any] = Field(default_factory=dict)


class VoiceOption(BaseModel):
    """Available TTS voice"""
    voice_id: str
    name: str
    provider: str
    language: str
    gender: Optional[str]
    age: Optional[str]
    preview_url: Optional[str]


# Calls
class CallInitiateRequest(BaseModel):
    """Initiate an outbound call"""
    agent_id: str = Field(..., description="Agent to use for the call")
    to_number: str = Field(..., description="Number to call (E.164 format)")
    from_number: Optional[str] = Field(None, description="Phone number ID to call from")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Custom metadata")


class CallTransferRequest(BaseModel):
    """Transfer an active call"""
    to_number: str = Field(..., description="Number to transfer to")
    announcement: Optional[str] = Field(None, description="Message before transfer")


class CallResponse(BaseModel):
    """Call response"""
    id: str
    agent_id: str
    phone_number_id: str
    direction: str
    from_number: str
    to_number: str
    status: str
    started_at: Optional[datetime]
    ended_at: Optional[datetime]
    duration_seconds: int
    recording_url: Optional[str]
    cost: float
    outcome: Optional[str]
    sentiment_score: Optional[float]
    metadata: Dict[str, Any]
    created_at: datetime


class TranscriptSegment(BaseModel):
    """Transcript segment"""
    speaker: str  # 'agent' or 'caller'
    text: str
    timestamp: float
    confidence: Optional[float]
    sentiment: Optional[str]


class TranscriptResponse(BaseModel):
    """Call transcript"""
    call_id: str
    segments: List[TranscriptSegment]
    duration_seconds: int
    word_count: int
    average_sentiment: Optional[float]


# Campaigns
class CampaignContact(BaseModel):
    """Campaign contact"""
    phone_number: str
    first_name: Optional[str]
    last_name: Optional[str]
    email: Optional[str]
    metadata: Dict[str, Any] = Field(default_factory=dict)


class CampaignCreateRequest(BaseModel):
    """Create a campaign"""
    name: str = Field(..., min_length=1, max_length=200)
    agent_id: str
    phone_number_id: str
    description: Optional[str]
    schedule_type: str = Field(default="immediate", description="immediate, scheduled, throttled")
    schedule_start: Optional[datetime] = None
    schedule_end: Optional[datetime] = None
    max_concurrent_calls: int = Field(default=5, ge=1, le=50)
    retry_failed: bool = Field(default=True)
    max_retries: int = Field(default=2, ge=0, le=5)
    metadata: Dict[str, Any] = Field(default_factory=dict)


class CampaignUpdateRequest(BaseModel):
    """Update campaign"""
    name: Optional[str] = None
    description: Optional[str] = None
    schedule_type: Optional[str] = None
    schedule_start: Optional[datetime] = None
    schedule_end: Optional[datetime] = None
    max_concurrent_calls: Optional[int] = Field(None, ge=1, le=50)
    retry_failed: Optional[bool] = None
    max_retries: Optional[int] = Field(None, ge=0, le=5)


class CampaignResponse(BaseModel):
    """Campaign response"""
    id: str
    name: str
    agent_id: str
    phone_number_id: str
    status: str
    total_contacts: int
    completed_calls: int
    failed_calls: int
    pending_calls: int
    success_rate: float
    created_at: datetime
    started_at: Optional[datetime]
    completed_at: Optional[datetime]


class CampaignStatsResponse(BaseModel):
    """Campaign statistics"""
    campaign_id: str
    total_contacts: int
    calls_completed: int
    calls_failed: int
    calls_pending: int
    calls_in_progress: int
    success_rate: float
    average_duration: float
    total_cost: float
    outcomes: Dict[str, int]
    sentiment_distribution: Dict[str, int]


# Analytics
class DashboardDataResponse(BaseModel):
    """Dashboard analytics data"""
    total_calls: int
    total_minutes: int
    total_cost: float
    active_campaigns: int
    success_rate: float
    average_call_duration: float
    calls_by_status: Dict[str, int]
    calls_by_outcome: Dict[str, int]
    sentiment_breakdown: Dict[str, int]
    cost_by_day: List[Dict[str, Any]]
    top_agents: List[Dict[str, Any]]


class CallAnalyticsResponse(BaseModel):
    """Call analytics"""
    call_id: str
    metrics: Dict[str, Any]
    sentiment_timeline: List[Dict[str, Any]]
    interruptions: int
    silence_periods: int
    speech_rate_wpm: float
    talk_time_ratio: float  # Agent vs caller
    key_phrases: List[str]


# Webhooks
class WebhookCreateRequest(BaseModel):
    """Create user webhook"""
    url: str = Field(..., description="Webhook URL to call")
    events: List[str] = Field(..., description="Events to subscribe to")
    secret: Optional[str] = Field(None, description="Secret for signature verification")
    description: Optional[str] = None
    is_active: bool = Field(default=True)


class WebhookUpdateRequest(BaseModel):
    """Update webhook"""
    url: Optional[str] = None
    events: Optional[List[str]] = None
    secret: Optional[str] = None
    description: Optional[str] = None
    is_active: Optional[bool] = None


class WebhookResponse(BaseModel):
    """Webhook response"""
    id: str
    user_id: str
    url: str
    events: List[str]
    description: Optional[str]
    is_active: bool
    created_at: datetime
    last_triggered_at: Optional[datetime]


# Testing
class PlaygroundTestRequest(BaseModel):
    """Test agent prompt in playground"""
    agent_id: str
    test_input: str = Field(..., description="Test user input")
    context: Dict[str, Any] = Field(default_factory=dict)


class PlaygroundCallRequest(BaseModel):
    """Test call from browser"""
    agent_id: str
    phone_number_id: Optional[str] = None


class TestScenariosRequest(BaseModel):
    """Run test scenarios"""
    agent_id: str
    scenarios: List[str] = Field(..., description="Scenario IDs to run")


class TestScenarioResult(BaseModel):
    """Test scenario result"""
    scenario_id: str
    passed: bool
    duration_ms: float
    transcript: str
    expected_outcome: str
    actual_outcome: str
    errors: List[str]


# ==================== Dependency Injection ====================

async def get_telephony(auth: AuthResult = Depends(get_api_key_auth)) -> TelephonyManager:
    """Get telephony manager with auth"""
    if not auth.authenticated:
        raise HTTPException(status_code=401, detail=auth.error or "Authentication required")
    return get_telephony_manager()


async def get_analytics(auth: AuthResult = Depends(get_api_key_auth)) -> VoiceAnalyticsManager:
    """Get analytics manager with auth"""
    if not auth.authenticated:
        raise HTTPException(status_code=401, detail=auth.error or "Authentication required")
    return get_voice_analytics_manager()


async def get_campaigns(auth: AuthResult = Depends(get_api_key_auth)) -> CampaignManager:
    """Get campaign manager with auth"""
    if not auth.authenticated:
        raise HTTPException(status_code=401, detail=auth.error or "Authentication required")
    return get_campaign_manager()


async def get_webhooks(auth: AuthResult = Depends(get_api_key_auth)) -> VoiceWebhookManager:
    """Get webhook manager with auth"""
    if not auth.authenticated:
        raise HTTPException(status_code=401, detail=auth.error or "Authentication required")
    return get_voice_webhook_manager()


async def get_playground(auth: AuthResult = Depends(get_api_key_auth)) -> VoicePlayground:
    """Get playground with auth"""
    if not auth.authenticated:
        raise HTTPException(status_code=401, detail=auth.error or "Authentication required")
    return get_voice_playground()


# ==================== Phone Numbers Routes ====================

@router.get("/numbers", response_model=List[PhoneNumberResponse])
async def list_phone_numbers(
    auth: AuthResult = Depends(get_api_key_auth),
    telephony: TelephonyManager = Depends(get_telephony),
    status: Optional[str] = Query(None, description="Filter by status")
):
    """List user's phone numbers"""
    try:
        numbers = await telephony.list_numbers(user_id=auth.key_id, status=status)
        return [PhoneNumberResponse(**n.to_dict()) for n in numbers]
    except Exception as e:
        logger.error(f"Failed to list numbers: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/numbers/search")
async def search_available_numbers(
    request: NumberSearchRequest,
    auth: AuthResult = Depends(get_api_key_auth),
    telephony: TelephonyManager = Depends(get_telephony)
):
    """Search for available phone numbers"""
    try:
        available = await telephony.search_numbers(
            country=request.country,
            area_code=request.area_code,
            contains=request.contains,
            type=request.type,
            limit=request.limit
        )
        return {"available_numbers": available}
    except Exception as e:
        logger.error(f"Failed to search numbers: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/numbers", response_model=PhoneNumberResponse, status_code=201)
async def provision_phone_number(
    request: NumberProvisionRequest,
    auth: AuthResult = Depends(get_api_key_auth),
    telephony: TelephonyManager = Depends(get_telephony)
):
    """Provision a phone number"""
    try:
        number = await telephony.provision_number(
            user_id=auth.key_id,
            phone_number=request.phone_number,
            friendly_name=request.friendly_name,
            agent_id=request.agent_id
        )
        return PhoneNumberResponse(**number.to_dict())
    except Exception as e:
        logger.error(f"Failed to provision number: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/numbers/{number_id}")
async def release_phone_number(
    number_id: str,
    auth: AuthResult = Depends(get_api_key_auth),
    telephony: TelephonyManager = Depends(get_telephony)
):
    """Release a phone number"""
    try:
        await telephony.release_number(number_id=number_id, user_id=auth.key_id)
        return {"success": True, "message": f"Number {number_id} released"}
    except Exception as e:
        logger.error(f"Failed to release number: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/numbers/{number_id}", response_model=PhoneNumberResponse)
async def update_phone_number(
    number_id: str,
    request: NumberUpdateRequest,
    auth: AuthResult = Depends(get_api_key_auth),
    telephony: TelephonyManager = Depends(get_telephony)
):
    """Update phone number configuration"""
    try:
        updated = await telephony.update_number(
            number_id=number_id,
            user_id=auth.key_id,
            updates=request.dict(exclude_unset=True)
        )
        return PhoneNumberResponse(**updated.to_dict())
    except Exception as e:
        logger.error(f"Failed to update number: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Voice Agent Configuration Routes ====================

@router.post("/agents/{agent_id}/voice-config", response_model=VoiceConfigResponse)
async def configure_voice_settings(
    agent_id: str,
    config: VoiceConfig,
    auth: AuthResult = Depends(get_api_key_auth),
    telephony: TelephonyManager = Depends(get_telephony)
):
    """Configure voice settings for an agent"""
    try:
        updated = await telephony.configure_agent_voice(
            agent_id=agent_id,
            user_id=auth.key_id,
            config=config.dict()
        )
        return VoiceConfigResponse(
            agent_id=agent_id,
            config=VoiceConfig(**updated),
            updated_at=datetime.now()
        )
    except Exception as e:
        logger.error(f"Failed to configure voice: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/agents/{agent_id}/voice-config", response_model=VoiceConfigResponse)
async def get_voice_settings(
    agent_id: str,
    auth: AuthResult = Depends(get_api_key_auth),
    telephony: TelephonyManager = Depends(get_telephony)
):
    """Get voice settings for an agent"""
    try:
        config = await telephony.get_agent_voice_config(agent_id=agent_id, user_id=auth.key_id)
        return VoiceConfigResponse(
            agent_id=agent_id,
            config=VoiceConfig(**config),
            updated_at=datetime.now()
        )
    except Exception as e:
        logger.error(f"Failed to get voice config: {e}")
        raise HTTPException(status_code=404, detail=str(e))


@router.put("/agents/{agent_id}/flow")
async def save_conversation_flow(
    agent_id: str,
    flow: ConversationFlow,
    auth: AuthResult = Depends(get_api_key_auth),
    telephony: TelephonyManager = Depends(get_telephony)
):
    """Save conversation flow for an agent"""
    try:
        await telephony.save_conversation_flow(
            agent_id=agent_id,
            user_id=auth.key_id,
            flow=flow.dict()
        )
        return {"success": True, "message": "Conversation flow saved"}
    except Exception as e:
        logger.error(f"Failed to save flow: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/agents/{agent_id}/flow")
async def get_conversation_flow(
    agent_id: str,
    auth: AuthResult = Depends(get_api_key_auth),
    telephony: TelephonyManager = Depends(get_telephony)
):
    """Get conversation flow for an agent"""
    try:
        flow = await telephony.get_conversation_flow(agent_id=agent_id, user_id=auth.key_id)
        return flow
    except Exception as e:
        logger.error(f"Failed to get flow: {e}")
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/agents/{agent_id}/voices", response_model=List[VoiceOption])
async def list_available_voices(
    agent_id: str,
    auth: AuthResult = Depends(get_api_key_auth),
    provider: Optional[str] = Query(None, description="Filter by provider")
):
    """List available TTS voices"""
    try:
        tts_manager = get_tts_manager()
        voices = await tts_manager.list_voices(provider=provider)
        return [VoiceOption(**v) for v in voices]
    except Exception as e:
        logger.error(f"Failed to list voices: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Calls Routes ====================

@router.post("/calls", response_model=CallResponse, status_code=201)
async def initiate_outbound_call(
    request: CallInitiateRequest,
    auth: AuthResult = Depends(get_api_key_auth),
    telephony: TelephonyManager = Depends(get_telephony)
):
    """Initiate an outbound call"""
    try:
        call = await telephony.initiate_call(
            user_id=auth.key_id,
            agent_id=request.agent_id,
            to_number=request.to_number,
            from_number_id=request.from_number,
            metadata=request.metadata
        )
        return CallResponse(**call.to_dict())
    except Exception as e:
        logger.error(f"Failed to initiate call: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/calls", response_model=List[CallResponse])
async def list_calls(
    auth: AuthResult = Depends(get_api_key_auth),
    telephony: TelephonyManager = Depends(get_telephony),
    agent_id: Optional[str] = Query(None),
    status: Optional[str] = Query(None),
    direction: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0)
):
    """List calls with filtering"""
    try:
        calls = await telephony.list_calls(
            user_id=auth.key_id,
            agent_id=agent_id,
            status=status,
            direction=direction,
            limit=limit,
            offset=offset
        )
        return [CallResponse(**c.to_dict()) for c in calls]
    except Exception as e:
        logger.error(f"Failed to list calls: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/calls/{call_id}", response_model=CallResponse)
async def get_call_details(
    call_id: str,
    auth: AuthResult = Depends(get_api_key_auth),
    telephony: TelephonyManager = Depends(get_telephony)
):
    """Get call details"""
    try:
        call = await telephony.get_call(call_id=call_id, user_id=auth.key_id)
        return CallResponse(**call.to_dict())
    except Exception as e:
        logger.error(f"Failed to get call: {e}")
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/calls/{call_id}/transcript", response_model=TranscriptResponse)
async def get_call_transcript(
    call_id: str,
    auth: AuthResult = Depends(get_api_key_auth),
    analytics: VoiceAnalyticsManager = Depends(get_analytics)
):
    """Get call transcript"""
    try:
        transcript = await analytics.get_transcript(call_id=call_id, user_id=auth.key_id)
        return TranscriptResponse(**transcript)
    except Exception as e:
        logger.error(f"Failed to get transcript: {e}")
        raise HTTPException(status_code=404, detail=str(e))


@router.get("/calls/{call_id}/recording")
async def get_call_recording(
    call_id: str,
    auth: AuthResult = Depends(get_api_key_auth),
    telephony: TelephonyManager = Depends(get_telephony)
):
    """Get call recording URL"""
    try:
        recording = await telephony.get_recording(call_id=call_id, user_id=auth.key_id)
        return {"recording_url": recording["url"], "duration": recording["duration"]}
    except Exception as e:
        logger.error(f"Failed to get recording: {e}")
        raise HTTPException(status_code=404, detail=str(e))


@router.post("/calls/{call_id}/transfer")
async def transfer_call(
    call_id: str,
    request: CallTransferRequest,
    auth: AuthResult = Depends(get_api_key_auth),
    telephony: TelephonyManager = Depends(get_telephony)
):
    """Transfer an active call"""
    try:
        await telephony.transfer_call(
            call_id=call_id,
            user_id=auth.key_id,
            to_number=request.to_number,
            announcement=request.announcement
        )
        return {"success": True, "message": f"Call transferred to {request.to_number}"}
    except Exception as e:
        logger.error(f"Failed to transfer call: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/calls/{call_id}/end")
async def end_call(
    call_id: str,
    auth: AuthResult = Depends(get_api_key_auth),
    telephony: TelephonyManager = Depends(get_telephony)
):
    """End an active call"""
    try:
        await telephony.end_call(call_id=call_id, user_id=auth.key_id)
        return {"success": True, "message": "Call ended"}
    except Exception as e:
        logger.error(f"Failed to end call: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Campaigns Routes ====================

@router.post("/campaigns", response_model=CampaignResponse, status_code=201)
async def create_campaign(
    request: CampaignCreateRequest,
    auth: AuthResult = Depends(get_api_key_auth),
    campaigns: CampaignManager = Depends(get_campaigns)
):
    """Create a new campaign"""
    try:
        campaign = await campaigns.create_campaign(
            user_id=auth.key_id,
            **request.dict()
        )
        return CampaignResponse(**campaign.to_dict())
    except Exception as e:
        logger.error(f"Failed to create campaign: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/campaigns", response_model=List[CampaignResponse])
async def list_campaigns(
    auth: AuthResult = Depends(get_api_key_auth),
    campaigns: CampaignManager = Depends(get_campaigns),
    status: Optional[str] = Query(None),
    limit: int = Query(50, ge=1, le=200)
):
    """List campaigns"""
    try:
        campaign_list = await campaigns.list_campaigns(
            user_id=auth.key_id,
            status=status,
            limit=limit
        )
        return [CampaignResponse(**c.to_dict()) for c in campaign_list]
    except Exception as e:
        logger.error(f"Failed to list campaigns: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/campaigns/{campaign_id}", response_model=CampaignResponse)
async def get_campaign(
    campaign_id: str,
    auth: AuthResult = Depends(get_api_key_auth),
    campaigns: CampaignManager = Depends(get_campaigns)
):
    """Get campaign details"""
    try:
        campaign = await campaigns.get_campaign(campaign_id=campaign_id, user_id=auth.key_id)
        return CampaignResponse(**campaign.to_dict())
    except Exception as e:
        logger.error(f"Failed to get campaign: {e}")
        raise HTTPException(status_code=404, detail=str(e))


@router.put("/campaigns/{campaign_id}", response_model=CampaignResponse)
async def update_campaign(
    campaign_id: str,
    request: CampaignUpdateRequest,
    auth: AuthResult = Depends(get_api_key_auth),
    campaigns: CampaignManager = Depends(get_campaigns)
):
    """Update campaign"""
    try:
        updated = await campaigns.update_campaign(
            campaign_id=campaign_id,
            user_id=auth.key_id,
            updates=request.dict(exclude_unset=True)
        )
        return CampaignResponse(**updated.to_dict())
    except Exception as e:
        logger.error(f"Failed to update campaign: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/campaigns/{campaign_id}")
async def delete_campaign(
    campaign_id: str,
    auth: AuthResult = Depends(get_api_key_auth),
    campaigns: CampaignManager = Depends(get_campaigns)
):
    """Delete a campaign"""
    try:
        await campaigns.delete_campaign(campaign_id=campaign_id, user_id=auth.key_id)
        return {"success": True, "message": f"Campaign {campaign_id} deleted"}
    except Exception as e:
        logger.error(f"Failed to delete campaign: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/campaigns/{campaign_id}/contacts")
async def import_campaign_contacts(
    campaign_id: str,
    contacts: List[CampaignContact],
    auth: AuthResult = Depends(get_api_key_auth),
    campaigns: CampaignManager = Depends(get_campaigns)
):
    """Import contacts for a campaign"""
    try:
        imported = await campaigns.import_contacts(
            campaign_id=campaign_id,
            user_id=auth.key_id,
            contacts=[c.dict() for c in contacts]
        )
        return {"success": True, "imported_count": imported}
    except Exception as e:
        logger.error(f"Failed to import contacts: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/campaigns/{campaign_id}/start")
async def start_campaign(
    campaign_id: str,
    auth: AuthResult = Depends(get_api_key_auth),
    campaigns: CampaignManager = Depends(get_campaigns)
):
    """Start a campaign"""
    try:
        await campaigns.start_campaign(campaign_id=campaign_id, user_id=auth.key_id)
        return {"success": True, "message": "Campaign started"}
    except Exception as e:
        logger.error(f"Failed to start campaign: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/campaigns/{campaign_id}/pause")
async def pause_campaign(
    campaign_id: str,
    auth: AuthResult = Depends(get_api_key_auth),
    campaigns: CampaignManager = Depends(get_campaigns)
):
    """Pause a campaign"""
    try:
        await campaigns.pause_campaign(campaign_id=campaign_id, user_id=auth.key_id)
        return {"success": True, "message": "Campaign paused"}
    except Exception as e:
        logger.error(f"Failed to pause campaign: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/campaigns/{campaign_id}/stats", response_model=CampaignStatsResponse)
async def get_campaign_stats(
    campaign_id: str,
    auth: AuthResult = Depends(get_api_key_auth),
    campaigns: CampaignManager = Depends(get_campaigns)
):
    """Get campaign statistics"""
    try:
        stats = await campaigns.get_stats(campaign_id=campaign_id, user_id=auth.key_id)
        return CampaignStatsResponse(**stats)
    except Exception as e:
        logger.error(f"Failed to get campaign stats: {e}")
        raise HTTPException(status_code=404, detail=str(e))


# ==================== Analytics Routes ====================

@router.get("/analytics/dashboard", response_model=DashboardDataResponse)
async def get_dashboard_analytics(
    auth: AuthResult = Depends(get_api_key_auth),
    analytics: VoiceAnalyticsManager = Depends(get_analytics),
    days: int = Query(30, ge=1, le=365, description="Number of days to analyze")
):
    """Get dashboard analytics data"""
    try:
        data = await analytics.get_dashboard_data(user_id=auth.key_id, days=days)
        return DashboardDataResponse(**data)
    except Exception as e:
        logger.error(f"Failed to get dashboard data: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/analytics/calls", response_model=CallAnalyticsResponse)
async def get_call_analytics(
    call_id: str = Query(..., description="Call ID to analyze"),
    auth: AuthResult = Depends(get_api_key_auth),
    analytics: VoiceAnalyticsManager = Depends(get_analytics)
):
    """Get detailed call analytics"""
    try:
        data = await analytics.analyze_call(call_id=call_id, user_id=auth.key_id)
        return CallAnalyticsResponse(**data)
    except Exception as e:
        logger.error(f"Failed to get call analytics: {e}")
        raise HTTPException(status_code=404, detail=str(e))


# ==================== Webhook Routes (Twilio/Telnyx Callbacks) ====================

@router.post("/webhooks/twilio/voice")
async def twilio_voice_webhook(request: Request, telephony: TelephonyManager = Depends(get_telephony)):
    """Handle incoming Twilio voice webhooks"""
    try:
        form_data = await request.form()
        response = await telephony.handle_incoming_call(dict(form_data))
        return JSONResponse(content=response, media_type="application/xml")
    except Exception as e:
        logger.error(f"Twilio voice webhook error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/webhooks/twilio/status")
async def twilio_status_webhook(request: Request, telephony: TelephonyManager = Depends(get_telephony)):
    """Handle Twilio call status updates"""
    try:
        form_data = await request.form()
        await telephony.handle_status_callback(dict(form_data))
        return {"success": True}
    except Exception as e:
        logger.error(f"Twilio status webhook error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/webhooks/twilio/recording")
async def twilio_recording_webhook(request: Request, telephony: TelephonyManager = Depends(get_telephony)):
    """Handle Twilio recording ready callbacks"""
    try:
        form_data = await request.form()
        await telephony.handle_recording_ready(dict(form_data))
        return {"success": True}
    except Exception as e:
        logger.error(f"Twilio recording webhook error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/webhooks/twilio/amd")
async def twilio_amd_webhook(request: Request, telephony: TelephonyManager = Depends(get_telephony)):
    """Handle Twilio answering machine detection"""
    try:
        form_data = await request.form()
        response = await telephony.handle_amd_callback(dict(form_data))
        return JSONResponse(content=response, media_type="application/xml")
    except Exception as e:
        logger.error(f"Twilio AMD webhook error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/webhooks/twilio/sms")
async def twilio_sms_webhook(request: Request, telephony: TelephonyManager = Depends(get_telephony)):
    """Handle inbound SMS messages"""
    try:
        form_data = await request.form()
        await telephony.handle_inbound_sms(dict(form_data))
        return {"success": True}
    except Exception as e:
        logger.error(f"Twilio SMS webhook error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== User Webhooks Routes ====================

@router.post("/webhooks", response_model=WebhookResponse, status_code=201)
async def create_webhook(
    request: WebhookCreateRequest,
    auth: AuthResult = Depends(get_api_key_auth),
    webhooks: VoiceWebhookManager = Depends(get_webhooks)
):
    """Register a user webhook"""
    try:
        webhook = await webhooks.create_webhook(
            user_id=auth.key_id,
            **request.dict()
        )
        return WebhookResponse(**webhook.to_dict())
    except Exception as e:
        logger.error(f"Failed to create webhook: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/webhooks", response_model=List[WebhookResponse])
async def list_webhooks(
    auth: AuthResult = Depends(get_api_key_auth),
    webhooks: VoiceWebhookManager = Depends(get_webhooks)
):
    """List user webhooks"""
    try:
        webhook_list = await webhooks.list_webhooks(user_id=auth.key_id)
        return [WebhookResponse(**w.to_dict()) for w in webhook_list]
    except Exception as e:
        logger.error(f"Failed to list webhooks: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/webhooks/{webhook_id}", response_model=WebhookResponse)
async def update_webhook(
    webhook_id: str,
    request: WebhookUpdateRequest,
    auth: AuthResult = Depends(get_api_key_auth),
    webhooks: VoiceWebhookManager = Depends(get_webhooks)
):
    """Update a webhook"""
    try:
        updated = await webhooks.update_webhook(
            webhook_id=webhook_id,
            user_id=auth.key_id,
            updates=request.dict(exclude_unset=True)
        )
        return WebhookResponse(**updated.to_dict())
    except Exception as e:
        logger.error(f"Failed to update webhook: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/webhooks/{webhook_id}")
async def delete_webhook(
    webhook_id: str,
    auth: AuthResult = Depends(get_api_key_auth),
    webhooks: VoiceWebhookManager = Depends(get_webhooks)
):
    """Delete a webhook"""
    try:
        await webhooks.delete_webhook(webhook_id=webhook_id, user_id=auth.key_id)
        return {"success": True, "message": f"Webhook {webhook_id} deleted"}
    except Exception as e:
        logger.error(f"Failed to delete webhook: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Testing Routes ====================

@router.post("/playground/test")
async def test_agent_prompt(
    request: PlaygroundTestRequest,
    auth: AuthResult = Depends(get_api_key_auth),
    playground: VoicePlayground = Depends(get_playground)
):
    """Test agent prompt in playground"""
    try:
        result = await playground.test_prompt(
            agent_id=request.agent_id,
            user_id=auth.key_id,
            test_input=request.test_input,
            context=request.context
        )
        return result
    except Exception as e:
        logger.error(f"Failed to test prompt: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/playground/call")
async def test_call_from_browser(
    request: PlaygroundCallRequest,
    auth: AuthResult = Depends(get_api_key_auth),
    playground: VoicePlayground = Depends(get_playground)
):
    """Test call from browser (WebRTC)"""
    try:
        result = await playground.start_browser_call(
            agent_id=request.agent_id,
            user_id=auth.key_id,
            phone_number_id=request.phone_number_id
        )
        return result
    except Exception as e:
        logger.error(f"Failed to start browser call: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/test/scenarios", response_model=List[TestScenarioResult])
async def run_test_scenarios(
    request: TestScenariosRequest,
    auth: AuthResult = Depends(get_api_key_auth),
    playground: VoicePlayground = Depends(get_playground)
):
    """Run test scenarios"""
    try:
        runner = VoiceTestRunner()
        results = await runner.run_scenarios(
            agent_id=request.agent_id,
            user_id=auth.key_id,
            scenario_ids=request.scenarios
        )
        return [TestScenarioResult(**r) for r in results]
    except Exception as e:
        logger.error(f"Failed to run test scenarios: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Health Check ====================

@router.get("/health")
async def health_check():
    """Voice API health check"""
    return {
        "status": "healthy",
        "service": "Agent Forge Voice API",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat()
    }
