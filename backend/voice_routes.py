"""
Agent Forge - Voice API Routes
FastAPI router module for voice agent capabilities

This module provides RESTful API endpoints for:
- Voice agent management
- Phone number provisioning
- Call management and control
- Call history and analytics
- Twilio webhook handlers

All routes require API key authentication unless marked as public.
"""

import logging
from typing import Dict, Any, Optional, List
from datetime import datetime

from fastapi import APIRouter, HTTPException, Depends, Request, Query
from fastapi.responses import JSONResponse
from pydantic import BaseModel, Field, validator

from .auth import get_api_key_auth, AuthResult
from . import database as db

logger = logging.getLogger('AgentForge.VoiceRoutes')

# Create router with prefix
router = APIRouter(prefix="/api/voice", tags=["voice"])


# ==================== Request/Response Models ====================

# Agent Models
class VoiceAgentCreate(BaseModel):
    """Create a voice agent"""
    name: str = Field(..., min_length=1, max_length=200, description="Agent name")
    description: Optional[str] = Field(None, max_length=1000)
    system_prompt: str = Field(..., min_length=10, description="System prompt for the agent")
    voice_provider: str = Field(default="elevenlabs", description="TTS provider: elevenlabs, deepgram, openai")
    voice_id: str = Field(..., description="Voice ID from provider")
    language: str = Field(default="en-US", description="Language code")
    asr_provider: str = Field(default="deepgram", description="ASR provider: deepgram, whisper")
    enable_function_calling: bool = Field(default=True)
    metadata: Dict[str, Any] = Field(default_factory=dict)

    @validator('voice_provider')
    def validate_voice_provider(cls, v):
        valid = ['elevenlabs', 'deepgram', 'openai', 'playht']
        if v not in valid:
            raise ValueError(f"Invalid voice_provider. Must be one of: {valid}")
        return v

    @validator('asr_provider')
    def validate_asr_provider(cls, v):
        valid = ['deepgram', 'whisper', 'assemblyai']
        if v not in valid:
            raise ValueError(f"Invalid asr_provider. Must be one of: {valid}")
        return v


class VoiceAgentUpdate(BaseModel):
    """Update voice agent configuration"""
    name: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = Field(None, max_length=1000)
    system_prompt: Optional[str] = Field(None, min_length=10)
    voice_provider: Optional[str] = None
    voice_id: Optional[str] = None
    language: Optional[str] = None
    asr_provider: Optional[str] = None
    enable_function_calling: Optional[bool] = None
    metadata: Optional[Dict[str, Any]] = None


class VoiceAgentResponse(BaseModel):
    """Voice agent response"""
    id: str
    user_id: str
    name: str
    description: Optional[str]
    system_prompt: str
    voice_provider: str
    voice_id: str
    language: str
    asr_provider: str
    enable_function_calling: bool
    metadata: Dict[str, Any]
    created_at: datetime
    updated_at: datetime
    is_active: bool


# Phone Number Models
class NumberSearchRequest(BaseModel):
    """Search available phone numbers"""
    country: str = Field(default="US", description="Country code (ISO 3166-1 alpha-2)")
    area_code: Optional[str] = Field(None, description="Preferred area code")
    contains: Optional[str] = Field(None, description="Number must contain these digits")
    number_type: str = Field(default="local", description="Number type: local, toll_free, mobile")
    limit: int = Field(default=10, ge=1, le=50)

    @validator('country')
    def validate_country(cls, v):
        return v.upper()


class NumberProvisionRequest(BaseModel):
    """Provision a phone number"""
    phone_number: str = Field(..., description="E.164 format phone number")
    friendly_name: Optional[str] = Field(None, max_length=100)
    voice_agent_id: Optional[str] = Field(None, description="Agent to attach to this number")

    @validator('phone_number')
    def validate_phone_number(cls, v):
        # Basic E.164 validation
        if not v.startswith('+'):
            raise ValueError("Phone number must be in E.164 format (start with +)")
        if not v[1:].isdigit():
            raise ValueError("Phone number must contain only digits after +")
        if len(v) < 8 or len(v) > 16:
            raise ValueError("Phone number length must be between 8 and 16 characters")
        return v


class PhoneNumberResponse(BaseModel):
    """Phone number response"""
    id: str
    user_id: str
    phone_number: str
    friendly_name: Optional[str]
    country: str
    voice_agent_id: Optional[str]
    provider: str
    provider_sid: str
    capabilities: List[str]
    monthly_cost: float
    status: str
    created_at: datetime


# Call Models
class CallInitiateRequest(BaseModel):
    """Initiate outbound call"""
    voice_agent_id: str = Field(..., description="Voice agent to use")
    to_number: str = Field(..., description="Number to call (E.164 format)")
    from_number_id: Optional[str] = Field(None, description="Phone number ID to call from")
    metadata: Dict[str, Any] = Field(default_factory=dict)

    @validator('to_number')
    def validate_to_number(cls, v):
        if not v.startswith('+'):
            raise ValueError("to_number must be in E.164 format (start with +)")
        return v


class CallResponse(BaseModel):
    """Call response"""
    id: str
    user_id: str
    voice_agent_id: str
    phone_number_id: str
    direction: str  # inbound, outbound
    from_number: str
    to_number: str
    status: str  # queued, ringing, in-progress, completed, failed, busy, no-answer
    started_at: Optional[datetime]
    ended_at: Optional[datetime]
    duration_seconds: int
    recording_url: Optional[str]
    transcript_available: bool
    cost: float
    provider: str
    provider_call_sid: str
    metadata: Dict[str, Any]
    created_at: datetime


class TranscriptSegment(BaseModel):
    """Call transcript segment"""
    speaker: str  # 'agent' or 'caller'
    text: str
    timestamp: float
    confidence: Optional[float]


class TranscriptResponse(BaseModel):
    """Call transcript"""
    call_id: str
    segments: List[TranscriptSegment]
    duration_seconds: int
    word_count: int
    created_at: datetime


# ==================== Agent Management Routes ====================

@router.post("/agents", response_model=VoiceAgentResponse, status_code=201)
async def create_voice_agent(
    request: VoiceAgentCreate,
    auth: AuthResult = Depends(get_api_key_auth)
):
    """Create a new voice agent"""
    if not auth.authenticated:
        raise HTTPException(status_code=401, detail=auth.error or "Authentication required")

    if 'write' not in auth.permissions:
        raise HTTPException(status_code=403, detail="Write permission required")

    try:
        # Create agent in database
        agent_data = {
            'user_id': auth.key_id,
            'name': request.name,
            'description': request.description,
            'system_prompt': request.system_prompt,
            'voice_provider': request.voice_provider,
            'voice_id': request.voice_id,
            'language': request.language,
            'asr_provider': request.asr_provider,
            'enable_function_calling': request.enable_function_calling,
            'metadata': request.metadata,
            'is_active': True
        }

        agent_id = db.create_voice_agent(agent_data)
        agent = db.get_voice_agent(agent_id)

        logger.info(f"Voice agent created: {agent_id} by {auth.key_id}")

        return VoiceAgentResponse(**agent)

    except Exception as e:
        logger.error(f"Failed to create voice agent: {e}")
        raise HTTPException(status_code=500, detail=f"Failed to create voice agent: {str(e)}")


@router.get("/agents", response_model=List[VoiceAgentResponse])
async def list_voice_agents(
    auth: AuthResult = Depends(get_api_key_auth),
    is_active: Optional[bool] = Query(None, description="Filter by active status"),
    limit: int = Query(50, ge=1, le=200)
):
    """List user's voice agents"""
    if not auth.authenticated:
        raise HTTPException(status_code=401, detail=auth.error or "Authentication required")

    try:
        agents = db.list_voice_agents(
            user_id=auth.key_id,
            is_active=is_active,
            limit=limit
        )

        return [VoiceAgentResponse(**agent) for agent in agents]

    except Exception as e:
        logger.error(f"Failed to list voice agents: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/agents/{agent_id}", response_model=VoiceAgentResponse)
async def get_voice_agent(
    agent_id: str,
    auth: AuthResult = Depends(get_api_key_auth)
):
    """Get voice agent details"""
    if not auth.authenticated:
        raise HTTPException(status_code=401, detail=auth.error or "Authentication required")

    try:
        agent = db.get_voice_agent(agent_id)

        if not agent:
            raise HTTPException(status_code=404, detail="Voice agent not found")

        # Verify ownership
        if agent['user_id'] != auth.key_id and 'admin' not in auth.permissions:
            raise HTTPException(status_code=403, detail="Access denied")

        return VoiceAgentResponse(**agent)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get voice agent: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/agents/{agent_id}", response_model=VoiceAgentResponse)
async def update_voice_agent(
    agent_id: str,
    request: VoiceAgentUpdate,
    auth: AuthResult = Depends(get_api_key_auth)
):
    """Update voice agent configuration"""
    if not auth.authenticated:
        raise HTTPException(status_code=401, detail=auth.error or "Authentication required")

    if 'write' not in auth.permissions:
        raise HTTPException(status_code=403, detail="Write permission required")

    try:
        # Verify agent exists and user owns it
        agent = db.get_voice_agent(agent_id)
        if not agent:
            raise HTTPException(status_code=404, detail="Voice agent not found")

        if agent['user_id'] != auth.key_id and 'admin' not in auth.permissions:
            raise HTTPException(status_code=403, detail="Access denied")

        # Update agent
        updates = request.dict(exclude_unset=True)
        if updates:
            db.update_voice_agent(agent_id, updates)

        # Get updated agent
        updated_agent = db.get_voice_agent(agent_id)

        logger.info(f"Voice agent updated: {agent_id} by {auth.key_id}")

        return VoiceAgentResponse(**updated_agent)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to update voice agent: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/agents/{agent_id}")
async def delete_voice_agent(
    agent_id: str,
    auth: AuthResult = Depends(get_api_key_auth)
):
    """Delete voice agent"""
    if not auth.authenticated:
        raise HTTPException(status_code=401, detail=auth.error or "Authentication required")

    if 'write' not in auth.permissions:
        raise HTTPException(status_code=403, detail="Write permission required")

    try:
        # Verify agent exists and user owns it
        agent = db.get_voice_agent(agent_id)
        if not agent:
            raise HTTPException(status_code=404, detail="Voice agent not found")

        if agent['user_id'] != auth.key_id and 'admin' not in auth.permissions:
            raise HTTPException(status_code=403, detail="Access denied")

        # Delete agent
        db.delete_voice_agent(agent_id)

        logger.info(f"Voice agent deleted: {agent_id} by {auth.key_id}")

        return {"success": True, "message": f"Voice agent {agent_id} deleted"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to delete voice agent: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Phone Number Routes ====================

@router.get("/numbers/search")
async def search_available_numbers(
    auth: AuthResult = Depends(get_api_key_auth),
    country: str = Query("US", description="Country code"),
    area_code: Optional[str] = Query(None, description="Area code"),
    contains: Optional[str] = Query(None, description="Digits to search for"),
    number_type: str = Query("local", description="local, toll_free, or mobile"),
    limit: int = Query(10, ge=1, le=50)
):
    """Search for available phone numbers"""
    if not auth.authenticated:
        raise HTTPException(status_code=401, detail=auth.error or "Authentication required")

    try:
        # This would integrate with Twilio/Telnyx API
        # For now, return mock data structure
        available_numbers = []

        logger.info(f"Number search by {auth.key_id}: country={country}, area_code={area_code}")

        return {
            "available_numbers": available_numbers,
            "count": len(available_numbers),
            "search_params": {
                "country": country,
                "area_code": area_code,
                "contains": contains,
                "type": number_type
            }
        }

    except Exception as e:
        logger.error(f"Failed to search numbers: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/numbers", response_model=PhoneNumberResponse, status_code=201)
async def provision_phone_number(
    request: NumberProvisionRequest,
    auth: AuthResult = Depends(get_api_key_auth)
):
    """Provision a phone number"""
    if not auth.authenticated:
        raise HTTPException(status_code=401, detail=auth.error or "Authentication required")

    if 'write' not in auth.permissions:
        raise HTTPException(status_code=403, detail="Write permission required")

    try:
        # Provision number in telephony provider (Twilio/Telnyx)
        # For now, save to database
        number_data = {
            'user_id': auth.key_id,
            'phone_number': request.phone_number,
            'friendly_name': request.friendly_name,
            'voice_agent_id': request.voice_agent_id,
            'provider': 'twilio',  # Would be determined by config
            'provider_sid': f'PN{auth.key_id[:8]}',  # Mock SID
            'country': request.phone_number[1:3] if len(request.phone_number) > 3 else 'US',
            'capabilities': ['voice', 'sms'],
            'monthly_cost': 1.00,  # Mock cost
            'status': 'active'
        }

        number_id = db.provision_phone_number(number_data)
        number = db.get_phone_number(number_id)

        logger.info(f"Phone number provisioned: {number_id} ({request.phone_number}) by {auth.key_id}")

        return PhoneNumberResponse(**number)

    except Exception as e:
        logger.error(f"Failed to provision number: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/numbers", response_model=List[PhoneNumberResponse])
async def list_phone_numbers(
    auth: AuthResult = Depends(get_api_key_auth),
    status: Optional[str] = Query(None, description="Filter by status"),
    limit: int = Query(50, ge=1, le=200)
):
    """List provisioned phone numbers"""
    if not auth.authenticated:
        raise HTTPException(status_code=401, detail=auth.error or "Authentication required")

    try:
        numbers = db.list_phone_numbers(
            user_id=auth.key_id,
            status=status,
            limit=limit
        )

        return [PhoneNumberResponse(**num) for num in numbers]

    except Exception as e:
        logger.error(f"Failed to list numbers: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/numbers/{number_id}")
async def release_phone_number(
    number_id: str,
    auth: AuthResult = Depends(get_api_key_auth)
):
    """Release a phone number"""
    if not auth.authenticated:
        raise HTTPException(status_code=401, detail=auth.error or "Authentication required")

    if 'write' not in auth.permissions:
        raise HTTPException(status_code=403, detail="Write permission required")

    try:
        # Verify number exists and user owns it
        number = db.get_phone_number(number_id)
        if not number:
            raise HTTPException(status_code=404, detail="Phone number not found")

        if number['user_id'] != auth.key_id and 'admin' not in auth.permissions:
            raise HTTPException(status_code=403, detail="Access denied")

        # Release number from provider and database
        db.release_phone_number(number_id)

        logger.info(f"Phone number released: {number_id} by {auth.key_id}")

        return {"success": True, "message": f"Phone number {number_id} released"}

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to release number: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Calls Routes ====================

@router.post("/calls", response_model=CallResponse, status_code=201)
async def initiate_call(
    request: CallInitiateRequest,
    auth: AuthResult = Depends(get_api_key_auth)
):
    """Initiate an outbound call"""
    if not auth.authenticated:
        raise HTTPException(status_code=401, detail=auth.error or "Authentication required")

    if 'write' not in auth.permissions:
        raise HTTPException(status_code=403, detail="Write permission required")

    try:
        # Verify agent exists
        agent = db.get_voice_agent(request.voice_agent_id)
        if not agent:
            raise HTTPException(status_code=404, detail="Voice agent not found")

        if agent['user_id'] != auth.key_id and 'admin' not in auth.permissions:
            raise HTTPException(status_code=403, detail="Access denied to agent")

        # Get phone number to use
        from_number = None
        if request.from_number_id:
            from_number = db.get_phone_number(request.from_number_id)
            if not from_number or from_number['user_id'] != auth.key_id:
                raise HTTPException(status_code=404, detail="Phone number not found or access denied")
        else:
            # Get first available number for user
            numbers = db.list_phone_numbers(user_id=auth.key_id, status='active', limit=1)
            if numbers:
                from_number = numbers[0]
            else:
                raise HTTPException(status_code=400, detail="No phone numbers available")

        # Initiate call via telephony provider
        call_data = {
            'user_id': auth.key_id,
            'voice_agent_id': request.voice_agent_id,
            'phone_number_id': from_number['id'],
            'direction': 'outbound',
            'from_number': from_number['phone_number'],
            'to_number': request.to_number,
            'status': 'queued',
            'duration_seconds': 0,
            'cost': 0.0,
            'provider': 'twilio',
            'provider_call_sid': f'CA{auth.key_id[:8]}',  # Mock SID
            'metadata': request.metadata,
            'transcript_available': False
        }

        call_id = db.create_call(call_data)
        call = db.get_call(call_id)

        logger.info(f"Call initiated: {call_id} by {auth.key_id} to {request.to_number}")

        return CallResponse(**call)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to initiate call: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/calls", response_model=List[CallResponse])
async def list_calls(
    auth: AuthResult = Depends(get_api_key_auth),
    voice_agent_id: Optional[str] = Query(None, description="Filter by agent"),
    status: Optional[str] = Query(None, description="Filter by status"),
    direction: Optional[str] = Query(None, description="Filter by direction"),
    limit: int = Query(50, ge=1, le=200),
    offset: int = Query(0, ge=0)
):
    """List call history"""
    if not auth.authenticated:
        raise HTTPException(status_code=401, detail=auth.error or "Authentication required")

    try:
        calls = db.list_calls(
            user_id=auth.key_id,
            voice_agent_id=voice_agent_id,
            status=status,
            direction=direction,
            limit=limit,
            offset=offset
        )

        return [CallResponse(**call) for call in calls]

    except Exception as e:
        logger.error(f"Failed to list calls: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/calls/{call_id}", response_model=CallResponse)
async def get_call_details(
    call_id: str,
    auth: AuthResult = Depends(get_api_key_auth)
):
    """Get call details"""
    if not auth.authenticated:
        raise HTTPException(status_code=401, detail=auth.error or "Authentication required")

    try:
        call = db.get_call(call_id)

        if not call:
            raise HTTPException(status_code=404, detail="Call not found")

        # Verify ownership
        if call['user_id'] != auth.key_id and 'admin' not in auth.permissions:
            raise HTTPException(status_code=403, detail="Access denied")

        return CallResponse(**call)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get call: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/calls/{call_id}/transcript", response_model=TranscriptResponse)
async def get_call_transcript(
    call_id: str,
    auth: AuthResult = Depends(get_api_key_auth)
):
    """Get call transcript"""
    if not auth.authenticated:
        raise HTTPException(status_code=401, detail=auth.error or "Authentication required")

    try:
        # Verify call exists and user owns it
        call = db.get_call(call_id)
        if not call:
            raise HTTPException(status_code=404, detail="Call not found")

        if call['user_id'] != auth.key_id and 'admin' not in auth.permissions:
            raise HTTPException(status_code=403, detail="Access denied")

        # Get transcript
        transcript = db.get_call_transcript(call_id)

        if not transcript:
            raise HTTPException(status_code=404, detail="Transcript not available")

        return TranscriptResponse(**transcript)

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get transcript: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/calls/{call_id}/recording")
async def get_call_recording(
    call_id: str,
    auth: AuthResult = Depends(get_api_key_auth)
):
    """Get call recording URL"""
    if not auth.authenticated:
        raise HTTPException(status_code=401, detail=auth.error or "Authentication required")

    try:
        # Verify call exists and user owns it
        call = db.get_call(call_id)
        if not call:
            raise HTTPException(status_code=404, detail="Call not found")

        if call['user_id'] != auth.key_id and 'admin' not in auth.permissions:
            raise HTTPException(status_code=403, detail="Access denied")

        # Get recording URL
        recording_url = call.get('recording_url')

        if not recording_url:
            raise HTTPException(status_code=404, detail="Recording not available")

        return {
            "recording_url": recording_url,
            "duration_seconds": call['duration_seconds'],
            "call_id": call_id
        }

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Failed to get recording: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Webhook Routes (Twilio) ====================

@router.post("/webhooks/twilio/voice")
async def twilio_voice_webhook(request: Request):
    """Handle incoming Twilio voice webhook (incoming calls)"""
    try:
        form_data = await request.form()
        call_data = dict(form_data)

        logger.info(f"Twilio voice webhook received: {call_data.get('CallSid')}")

        # Process incoming call
        # Return TwiML response
        twiml_response = '''<?xml version="1.0" encoding="UTF-8"?>
<Response>
    <Say voice="alice">Thank you for calling. Please hold while we connect you.</Say>
    <Pause length="1"/>
</Response>'''

        return JSONResponse(
            content=twiml_response,
            media_type="application/xml"
        )

    except Exception as e:
        logger.error(f"Twilio voice webhook error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/webhooks/twilio/status")
async def twilio_status_webhook(request: Request):
    """Handle Twilio call status updates"""
    try:
        form_data = await request.form()
        status_data = dict(form_data)

        call_sid = status_data.get('CallSid')
        call_status = status_data.get('CallStatus')

        logger.info(f"Twilio status update: {call_sid} -> {call_status}")

        # Update call status in database
        # db.update_call_status(call_sid, call_status)

        return {"success": True}

    except Exception as e:
        logger.error(f"Twilio status webhook error: {e}")
        raise HTTPException(status_code=500, detail=str(e))


# ==================== Health Check ====================

@router.get("/health")
async def voice_health_check():
    """Voice API health check (public)"""
    return {
        "status": "healthy",
        "service": "Agent Forge Voice Routes",
        "version": "1.0.0",
        "timestamp": datetime.now().isoformat()
    }


# ==================== Export Router ====================

__all__ = ['router']
