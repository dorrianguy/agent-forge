"""
Agent Forge - Voice Agent Types
Defines the 20 specialized voice agent types and their capabilities.
"""

from enum import Enum
from typing import List, Dict, Any


class VoiceAgentType(Enum):
    """
    20 specialized voice agent types organized by industry.
    Each type has specific capabilities, prompts, and behaviors.
    """

    # ============================================
    # Customer Service Category (1-5)
    # ============================================
    VOICE_CUSTOMER_SUPPORT = "voice_customer_support"
    VOICE_TECHNICAL_SUPPORT = "voice_technical_support"
    VOICE_BILLING_SUPPORT = "voice_billing_support"
    VOICE_ORDER_STATUS = "voice_order_status"
    VOICE_RETURNS_EXCHANGES = "voice_returns_exchanges"

    # ============================================
    # Sales & Lead Generation Category (6-10)
    # ============================================
    VOICE_LEAD_QUALIFIER = "voice_lead_qualifier"
    VOICE_OUTBOUND_SALES = "voice_outbound_sales"
    VOICE_APPOINTMENT_SETTER = "voice_appointment_setter"
    VOICE_RENEWAL_AGENT = "voice_renewal_agent"
    VOICE_SURVEY_AGENT = "voice_survey_agent"

    # ============================================
    # Healthcare Category (11-13)
    # ============================================
    VOICE_APPOINTMENT_REMINDER = "voice_appointment_reminder"
    VOICE_PRESCRIPTION_REFILL = "voice_prescription_refill"
    VOICE_PATIENT_INTAKE = "voice_patient_intake"

    # ============================================
    # Financial Services Category (14-16)
    # ============================================
    VOICE_FRAUD_VERIFICATION = "voice_fraud_verification"
    VOICE_DEBT_COLLECTION = "voice_debt_collection"
    VOICE_LOAN_APPLICATION = "voice_loan_application"

    # ============================================
    # Hospitality & Services Category (17-20)
    # ============================================
    VOICE_RESTAURANT_BOOKING = "voice_restaurant_booking"
    VOICE_HOTEL_CONCIERGE = "voice_hotel_concierge"
    VOICE_PROPERTY_SHOWING = "voice_property_showing"
    VOICE_SERVICE_DISPATCH = "voice_service_dispatch"


class VoiceAgentCapability(Enum):
    """
    Voice-specific capabilities that agents can have.
    These extend the base AgentCapability from universal_builder.py
    """

    # Call Handling
    INBOUND_CALLS = "inbound_calls"
    OUTBOUND_CALLS = "outbound_calls"
    CALL_TRANSFER = "call_transfer"
    CALL_RECORDING = "call_recording"
    VOICEMAIL_HANDLING = "voicemail_handling"

    # Audio Features
    DTMF_NAVIGATION = "dtmf_navigation"
    BARGE_IN_DETECTION = "barge_in_detection"
    SILENCE_DETECTION = "silence_detection"
    BACKGROUND_NOISE_FILTER = "background_noise_filter"

    # Detection
    AMD_DETECTION = "amd_detection"  # Answering Machine Detection
    SENTIMENT_ANALYSIS = "sentiment_analysis"
    INTENT_DETECTION = "intent_detection"
    LANGUAGE_DETECTION = "language_detection"

    # Integrations
    SMS_FOLLOWUP = "sms_followup"
    EMAIL_FOLLOWUP = "email_followup"
    CALENDAR_BOOKING = "calendar_booking"
    CRM_INTEGRATION = "crm_integration"
    PAYMENT_COLLECTION = "payment_collection"

    # Compliance
    HIPAA_COMPLIANT = "hipaa_compliant"
    PCI_COMPLIANT = "pci_compliant"
    FDCPA_COMPLIANT = "fdcpa_compliant"
    CALL_CONSENT = "call_consent"

    # Advanced
    MULTI_LANGUAGE = "multi_language"
    REAL_TIME_COACHING = "real_time_coaching"
    SUPERVISOR_BARGE = "supervisor_barge"
    WARM_TRANSFER = "warm_transfer"
    CONFERENCE_CALL = "conference_call"


class LLMProvider(Enum):
    """Supported LLM providers for voice agents"""
    OPENAI = "openai"           # GPT-4o, GPT-4o-mini
    GEMINI = "gemini"           # Gemini 2.0 Flash


class ASRProvider(Enum):
    """Speech-to-Text providers"""
    DEEPGRAM = "deepgram"
    WHISPER = "whisper"
    ASSEMBLYAI = "assemblyai"


class TTSProvider(Enum):
    """Text-to-Speech providers"""
    ELEVENLABS = "elevenlabs"
    OPENAI_TTS = "openai_tts"
    DEEPGRAM_TTS = "deepgram_tts"


# ============================================
# Agent Type Metadata
# ============================================

VOICE_AGENT_METADATA: Dict[VoiceAgentType, Dict[str, Any]] = {
    # Customer Service
    VoiceAgentType.VOICE_CUSTOMER_SUPPORT: {
        "name": "Customer Support Agent",
        "description": "General customer service, FAQ handling, and issue resolution",
        "category": "customer_service",
        "default_capabilities": [
            VoiceAgentCapability.INBOUND_CALLS,
            VoiceAgentCapability.CALL_TRANSFER,
            VoiceAgentCapability.SENTIMENT_ANALYSIS,
            VoiceAgentCapability.CRM_INTEGRATION,
        ],
        "default_voice": "alloy",
        "avg_call_duration": 180,  # seconds
    },
    VoiceAgentType.VOICE_TECHNICAL_SUPPORT: {
        "name": "Technical Support Agent",
        "description": "Tier 1 tech support, troubleshooting, guided diagnostics",
        "category": "customer_service",
        "default_capabilities": [
            VoiceAgentCapability.INBOUND_CALLS,
            VoiceAgentCapability.CALL_TRANSFER,
            VoiceAgentCapability.DTMF_NAVIGATION,
            VoiceAgentCapability.SMS_FOLLOWUP,
        ],
        "default_voice": "echo",
        "avg_call_duration": 300,
    },
    VoiceAgentType.VOICE_BILLING_SUPPORT: {
        "name": "Billing Support Agent",
        "description": "Payment inquiries, account balance, payment processing",
        "category": "customer_service",
        "default_capabilities": [
            VoiceAgentCapability.INBOUND_CALLS,
            VoiceAgentCapability.PCI_COMPLIANT,
            VoiceAgentCapability.PAYMENT_COLLECTION,
            VoiceAgentCapability.CRM_INTEGRATION,
        ],
        "default_voice": "nova",
        "avg_call_duration": 240,
    },
    VoiceAgentType.VOICE_ORDER_STATUS: {
        "name": "Order Status Agent",
        "description": "Order tracking, shipping updates, delivery rescheduling",
        "category": "customer_service",
        "default_capabilities": [
            VoiceAgentCapability.INBOUND_CALLS,
            VoiceAgentCapability.SMS_FOLLOWUP,
            VoiceAgentCapability.CRM_INTEGRATION,
        ],
        "default_voice": "shimmer",
        "avg_call_duration": 120,
    },
    VoiceAgentType.VOICE_RETURNS_EXCHANGES: {
        "name": "Returns & Exchanges Agent",
        "description": "Return initiation, exchange processing, refund status",
        "category": "customer_service",
        "default_capabilities": [
            VoiceAgentCapability.INBOUND_CALLS,
            VoiceAgentCapability.EMAIL_FOLLOWUP,
            VoiceAgentCapability.CRM_INTEGRATION,
        ],
        "default_voice": "alloy",
        "avg_call_duration": 180,
    },

    # Sales & Lead Gen
    VoiceAgentType.VOICE_LEAD_QUALIFIER: {
        "name": "Lead Qualifier Agent",
        "description": "Inbound lead qualification, BANT scoring, demo scheduling",
        "category": "sales",
        "default_capabilities": [
            VoiceAgentCapability.INBOUND_CALLS,
            VoiceAgentCapability.CALENDAR_BOOKING,
            VoiceAgentCapability.CRM_INTEGRATION,
            VoiceAgentCapability.SENTIMENT_ANALYSIS,
        ],
        "default_voice": "onyx",
        "avg_call_duration": 300,
    },
    VoiceAgentType.VOICE_OUTBOUND_SALES: {
        "name": "Outbound Sales Agent",
        "description": "Cold calling, product pitches, objection handling",
        "category": "sales",
        "default_capabilities": [
            VoiceAgentCapability.OUTBOUND_CALLS,
            VoiceAgentCapability.AMD_DETECTION,
            VoiceAgentCapability.SMS_FOLLOWUP,
            VoiceAgentCapability.CRM_INTEGRATION,
            VoiceAgentCapability.CALL_CONSENT,
        ],
        "default_voice": "fable",
        "avg_call_duration": 180,
    },
    VoiceAgentType.VOICE_APPOINTMENT_SETTER: {
        "name": "Appointment Setter Agent",
        "description": "Demo scheduling, calendar management, confirmation calls",
        "category": "sales",
        "default_capabilities": [
            VoiceAgentCapability.INBOUND_CALLS,
            VoiceAgentCapability.OUTBOUND_CALLS,
            VoiceAgentCapability.CALENDAR_BOOKING,
            VoiceAgentCapability.SMS_FOLLOWUP,
        ],
        "default_voice": "shimmer",
        "avg_call_duration": 150,
    },
    VoiceAgentType.VOICE_RENEWAL_AGENT: {
        "name": "Renewal Agent",
        "description": "Subscription renewals, upselling, win-back campaigns",
        "category": "sales",
        "default_capabilities": [
            VoiceAgentCapability.OUTBOUND_CALLS,
            VoiceAgentCapability.PAYMENT_COLLECTION,
            VoiceAgentCapability.CRM_INTEGRATION,
            VoiceAgentCapability.AMD_DETECTION,
        ],
        "default_voice": "nova",
        "avg_call_duration": 240,
    },
    VoiceAgentType.VOICE_SURVEY_AGENT: {
        "name": "Survey Agent",
        "description": "Customer satisfaction surveys, NPS collection, feedback",
        "category": "sales",
        "default_capabilities": [
            VoiceAgentCapability.OUTBOUND_CALLS,
            VoiceAgentCapability.DTMF_NAVIGATION,
            VoiceAgentCapability.AMD_DETECTION,
        ],
        "default_voice": "alloy",
        "avg_call_duration": 120,
    },

    # Healthcare
    VoiceAgentType.VOICE_APPOINTMENT_REMINDER: {
        "name": "Appointment Reminder Agent",
        "description": "Medical appointment reminders, rescheduling, pre-visit info",
        "category": "healthcare",
        "default_capabilities": [
            VoiceAgentCapability.OUTBOUND_CALLS,
            VoiceAgentCapability.CALENDAR_BOOKING,
            VoiceAgentCapability.SMS_FOLLOWUP,
            VoiceAgentCapability.HIPAA_COMPLIANT,
        ],
        "default_voice": "nova",
        "avg_call_duration": 90,
    },
    VoiceAgentType.VOICE_PRESCRIPTION_REFILL: {
        "name": "Prescription Refill Agent",
        "description": "Pharmacy refill requests, pickup notifications",
        "category": "healthcare",
        "default_capabilities": [
            VoiceAgentCapability.INBOUND_CALLS,
            VoiceAgentCapability.SMS_FOLLOWUP,
            VoiceAgentCapability.HIPAA_COMPLIANT,
        ],
        "default_voice": "shimmer",
        "avg_call_duration": 120,
    },
    VoiceAgentType.VOICE_PATIENT_INTAKE: {
        "name": "Patient Intake Agent",
        "description": "Pre-visit information gathering, insurance verification",
        "category": "healthcare",
        "default_capabilities": [
            VoiceAgentCapability.INBOUND_CALLS,
            VoiceAgentCapability.OUTBOUND_CALLS,
            VoiceAgentCapability.HIPAA_COMPLIANT,
            VoiceAgentCapability.CRM_INTEGRATION,
        ],
        "default_voice": "alloy",
        "avg_call_duration": 300,
    },

    # Financial
    VoiceAgentType.VOICE_FRAUD_VERIFICATION: {
        "name": "Fraud Verification Agent",
        "description": "Transaction verification, suspicious activity alerts",
        "category": "financial",
        "default_capabilities": [
            VoiceAgentCapability.OUTBOUND_CALLS,
            VoiceAgentCapability.PCI_COMPLIANT,
            VoiceAgentCapability.CALL_RECORDING,
            VoiceAgentCapability.DTMF_NAVIGATION,
        ],
        "default_voice": "echo",
        "avg_call_duration": 90,
    },
    VoiceAgentType.VOICE_DEBT_COLLECTION: {
        "name": "Debt Collection Agent",
        "description": "Payment reminders, payment plan setup, compliance handling",
        "category": "financial",
        "default_capabilities": [
            VoiceAgentCapability.OUTBOUND_CALLS,
            VoiceAgentCapability.PAYMENT_COLLECTION,
            VoiceAgentCapability.FDCPA_COMPLIANT,
            VoiceAgentCapability.CALL_RECORDING,
            VoiceAgentCapability.CALL_CONSENT,
        ],
        "default_voice": "onyx",
        "avg_call_duration": 180,
    },
    VoiceAgentType.VOICE_LOAN_APPLICATION: {
        "name": "Loan Application Agent",
        "description": "Pre-qualification, application intake, document collection",
        "category": "financial",
        "default_capabilities": [
            VoiceAgentCapability.INBOUND_CALLS,
            VoiceAgentCapability.PCI_COMPLIANT,
            VoiceAgentCapability.CRM_INTEGRATION,
            VoiceAgentCapability.EMAIL_FOLLOWUP,
        ],
        "default_voice": "nova",
        "avg_call_duration": 420,
    },

    # Hospitality
    VoiceAgentType.VOICE_RESTAURANT_BOOKING: {
        "name": "Restaurant Booking Agent",
        "description": "Reservation booking, modification, waitlist management",
        "category": "hospitality",
        "default_capabilities": [
            VoiceAgentCapability.INBOUND_CALLS,
            VoiceAgentCapability.CALENDAR_BOOKING,
            VoiceAgentCapability.SMS_FOLLOWUP,
        ],
        "default_voice": "shimmer",
        "avg_call_duration": 90,
    },
    VoiceAgentType.VOICE_HOTEL_CONCIERGE: {
        "name": "Hotel Concierge Agent",
        "description": "Room service, amenity requests, local recommendations",
        "category": "hospitality",
        "default_capabilities": [
            VoiceAgentCapability.INBOUND_CALLS,
            VoiceAgentCapability.CRM_INTEGRATION,
            VoiceAgentCapability.MULTI_LANGUAGE,
        ],
        "default_voice": "fable",
        "avg_call_duration": 120,
    },
    VoiceAgentType.VOICE_PROPERTY_SHOWING: {
        "name": "Property Showing Agent",
        "description": "Real estate showing scheduling, property information",
        "category": "hospitality",
        "default_capabilities": [
            VoiceAgentCapability.INBOUND_CALLS,
            VoiceAgentCapability.OUTBOUND_CALLS,
            VoiceAgentCapability.CALENDAR_BOOKING,
            VoiceAgentCapability.SMS_FOLLOWUP,
        ],
        "default_voice": "nova",
        "avg_call_duration": 180,
    },
    VoiceAgentType.VOICE_SERVICE_DISPATCH: {
        "name": "Service Dispatch Agent",
        "description": "Field service scheduling, technician dispatch, ETAs",
        "category": "hospitality",
        "default_capabilities": [
            VoiceAgentCapability.INBOUND_CALLS,
            VoiceAgentCapability.CALENDAR_BOOKING,
            VoiceAgentCapability.SMS_FOLLOWUP,
            VoiceAgentCapability.CRM_INTEGRATION,
        ],
        "default_voice": "echo",
        "avg_call_duration": 150,
    },
}


def get_agent_metadata(agent_type: VoiceAgentType) -> Dict[str, Any]:
    """Get metadata for a voice agent type"""
    return VOICE_AGENT_METADATA.get(agent_type, {})


def get_agents_by_category(category: str) -> List[VoiceAgentType]:
    """Get all voice agent types in a category"""
    return [
        agent_type
        for agent_type, metadata in VOICE_AGENT_METADATA.items()
        if metadata.get("category") == category
    ]


def get_all_categories() -> List[str]:
    """Get list of all agent categories"""
    return list(set(
        metadata.get("category")
        for metadata in VOICE_AGENT_METADATA.values()
    ))
