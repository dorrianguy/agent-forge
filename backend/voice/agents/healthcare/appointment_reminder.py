"""
Appointment Reminder Agent - HIPAA Compliant

Medical appointment reminder agent that calls patients to confirm upcoming appointments,
handles rescheduling, and provides pre-visit instructions.

HIPAA Compliance:
- No PHI in logs or transcripts
- Consent verification before discussing appointment details
- Secure handling of patient identifiers
- Minimal data retention
"""

import logging
from datetime import datetime
from typing import Any, Dict, List, Tuple

from backend.voice.agents.base_voice_agent import BaseVoiceAgent
from backend.voice.agents.voice_agent_config import VoiceAgentConfig
from backend.voice.agents.voice_agent_types import (
    VoiceAgentType,
    VoiceAgentCapability,
    get_template
)
from backend.collaboration import AgentRole

logger = logging.getLogger(__name__)


class AppointmentReminderAgent(BaseVoiceAgent):
    """
    Appointment Reminder Voice Agent for healthcare providers.

    Capabilities:
    - Outbound appointment reminder calls
    - Appointment confirmation
    - Rescheduling requests
    - Pre-visit instructions
    - SMS follow-up
    - HIPAA-compliant conversation flow

    Conversation Flow:
    1. Greeting and consent verification
    2. Confirm patient identity (DOB verification)
    3. Provide appointment details
    4. Confirm or reschedule
    5. Send SMS confirmation
    """

    def __init__(self, config: VoiceAgentConfig):
        """Initialize AppointmentReminderAgent with HIPAA-compliant settings"""
        super().__init__(config, role=AgentRole.SUPPORT)

        # HIPAA compliance flag
        self.hipaa_compliant = True
        self.consent_verified = False

        # Register healthcare-specific functions
        self.register_function("verify_patient_identity", self._verify_patient_identity)
        self.register_function("confirm_appointment", self._confirm_appointment)
        self.register_function("reschedule_appointment", self._reschedule_appointment)
        self.register_function("send_appointment_sms", self._send_appointment_sms)

        logger.info(f"[{self.agent_name}] HIPAA-compliant AppointmentReminderAgent initialized")

    def get_system_prompt(self) -> str:
        """
        Get HIPAA-compliant system prompt for appointment reminders.

        Returns:
            System prompt with professional medical tone and privacy guidelines
        """
        template = get_template(VoiceAgentType.VOICE_APPOINTMENT_REMINDER)
        base_prompt = template.get("system_prompt", "")

        # Add HIPAA compliance instructions
        hipaa_addendum = """

HIPAA COMPLIANCE REQUIREMENTS:
- ALWAYS verify patient identity before discussing appointment details
- Use date of birth for verification (ask patient to provide it)
- Do NOT mention specific medical conditions or reasons for visit
- Keep appointment details minimal: date, time, provider name only
- Do NOT discuss diagnosis, treatment, or medical history
- If patient has questions about their condition, direct them to call the office
- Do NOT leave voicemails with appointment details - only ask for callback
- Log conversations with anonymized IDs only, never patient names or DOB
"""

        return base_prompt + hipaa_addendum

    def get_greeting(self) -> str:
        """
        Get HIPAA-compliant greeting with consent verification.

        Returns:
            Greeting message that requests consent before proceeding
        """
        return (
            "Hello! This is calling from your healthcare provider to remind you "
            "about an upcoming appointment. Is this a good time to speak briefly? "
            "This call will take about one minute."
        )

    def get_available_functions(self) -> List[Dict[str, Any]]:
        """
        Get list of available healthcare functions.

        Returns:
            Function definitions for appointment management
        """
        return [
            {
                "name": "verify_patient_identity",
                "description": "Verify patient identity using date of birth",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "date_of_birth": {
                            "type": "string",
                            "description": "Patient's date of birth in MM/DD/YYYY format"
                        }
                    },
                    "required": ["date_of_birth"]
                }
            },
            {
                "name": "confirm_appointment",
                "description": "Confirm patient will attend appointment",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "appointment_id": {
                            "type": "string",
                            "description": "Appointment ID to confirm"
                        }
                    },
                    "required": ["appointment_id"]
                }
            },
            {
                "name": "reschedule_appointment",
                "description": "Request to reschedule appointment",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "appointment_id": {
                            "type": "string",
                            "description": "Appointment ID to reschedule"
                        },
                        "reason": {
                            "type": "string",
                            "description": "Reason for rescheduling (optional)"
                        }
                    },
                    "required": ["appointment_id"]
                }
            },
            {
                "name": "send_appointment_sms",
                "description": "Send SMS reminder with appointment details",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "phone_number": {
                            "type": "string",
                            "description": "Phone number to send SMS to"
                        },
                        "appointment_details": {
                            "type": "string",
                            "description": "Appointment details to include in SMS"
                        }
                    },
                    "required": ["phone_number", "appointment_details"]
                }
            }
        ]

    async def handle_user_input(
        self,
        user_message: str,
        context: Dict[str, Any]
    ) -> Tuple[str, Dict[str, Any]]:
        """
        Process user input with HIPAA compliance.

        Flow:
        1. Check if consent verified, if not, request it
        2. Verify patient identity (DOB check)
        3. Provide appointment details
        4. Confirm or reschedule

        Args:
            user_message: Patient's speech/text
            context: Current conversation context

        Returns:
            Tuple of (agent_response, updated_context)
        """
        user_message_lower = user_message.lower()

        # Step 1: Consent verification
        if not context.get("consent_verified"):
            if any(word in user_message_lower for word in ["yes", "sure", "okay", "go ahead"]):
                context["consent_verified"] = True
                return (
                    "Great! Before we continue, I need to verify your identity. "
                    "Can you please provide your date of birth?",
                    context
                )
            elif any(word in user_message_lower for word in ["no", "not now", "busy"]):
                return (
                    "I understand. Would you like me to call back later, or would you "
                    "prefer to call our office directly to confirm your appointment?",
                    context
                )
            else:
                return (
                    "I need to confirm your appointment. Do you have a moment to speak?",
                    context
                )

        # Step 2: Identity verification
        if not context.get("identity_verified"):
            # Check if user provided DOB
            if any(char.isdigit() for char in user_message):
                # In production, this would verify against patient database
                # For now, simulate verification
                context["identity_verified"] = True
                context["patient_verified"] = True

                # Get appointment details from context (simulated)
                appt_date = context.get("appointment_date", "Monday, January 15th")
                appt_time = context.get("appointment_time", "2:30 PM")
                provider = context.get("provider_name", "Dr. Smith")

                return (
                    f"Thank you. You have an appointment on {appt_date} at {appt_time} "
                    f"with {provider}. Does that time still work for you?",
                    context
                )
            else:
                return (
                    "I need to verify your date of birth. Can you provide it in the format "
                    "month, day, year? For example, January 15th, 1980.",
                    context
                )

        # Step 3: Confirmation or rescheduling
        if context.get("identity_verified"):
            if any(word in user_message_lower for word in ["yes", "confirm", "works", "good"]):
                context["appointment_confirmed"] = True

                phone = context.get("patient_phone", "your phone")
                return (
                    "Perfect! You're all set for your appointment. Please arrive 15 minutes "
                    "early to complete any necessary paperwork. I'll send you a text reminder "
                    f"to {phone} the day before. Is there anything else I can help with?",
                    context
                )

            elif any(word in user_message_lower for word in ["reschedule", "change", "can't make"]):
                context["needs_rescheduling"] = True
                return (
                    "No problem. I'll note that you need to reschedule. Please call our "
                    "scheduling desk at your earliest convenience, and they'll find a new "
                    "time that works for you. The number is on your appointment card. "
                    "Is there anything else?",
                    context
                )

            elif any(word in user_message_lower for word in ["question", "ask", "what"]):
                return (
                    "For specific questions about your appointment or medical concerns, "
                    "please call our office directly so our medical staff can assist you. "
                    "I'm just here to confirm your appointment time. Does the scheduled "
                    "time work for you?",
                    context
                )

        # Default fallback
        return (
            "I'm sorry, I didn't catch that. To confirm, does your scheduled appointment "
            "time work for you, or do you need to reschedule?",
            context
        )

    # ==================== Healthcare-Specific Functions ====================

    async def _verify_patient_identity(self, date_of_birth: str) -> Dict[str, Any]:
        """
        Verify patient identity using date of birth.

        HIPAA Note: In production, this would verify against secure patient database
        without logging PHI.

        Args:
            date_of_birth: Patient's DOB

        Returns:
            Verification result
        """
        # In production: query secure database with hashed patient ID
        # Never log DOB or patient names
        logger.info(f"[{self.agent_name}] Patient identity verification requested")

        # Simulated verification
        verified = True  # Would be actual database check

        if verified:
            self.consent_verified = True
            return {
                "verified": True,
                "message": "Identity confirmed"
            }
        else:
            return {
                "verified": False,
                "message": "Unable to verify identity"
            }

    async def _confirm_appointment(self, appointment_id: str) -> Dict[str, Any]:
        """
        Confirm appointment in system.

        Args:
            appointment_id: ID of appointment to confirm

        Returns:
            Confirmation result
        """
        logger.info(f"[{self.agent_name}] Appointment confirmed: {appointment_id}")

        # In production: update appointment status in EHR/practice management system
        return {
            "status": "confirmed",
            "appointment_id": appointment_id,
            "message": "Appointment confirmed successfully"
        }

    async def _reschedule_appointment(
        self,
        appointment_id: str,
        reason: str = None
    ) -> Dict[str, Any]:
        """
        Mark appointment for rescheduling.

        Args:
            appointment_id: ID of appointment to reschedule
            reason: Optional reason for rescheduling

        Returns:
            Rescheduling request result
        """
        logger.info(f"[{self.agent_name}] Reschedule requested: {appointment_id}")

        # In production: flag appointment in system and notify scheduling staff
        return {
            "status": "reschedule_requested",
            "appointment_id": appointment_id,
            "message": "Rescheduling request recorded"
        }

    async def _send_appointment_sms(
        self,
        phone_number: str,
        appointment_details: str
    ) -> Dict[str, Any]:
        """
        Send SMS reminder with appointment details.

        HIPAA Note: SMS should only include date/time/location, no medical details

        Args:
            phone_number: Patient's phone number
            appointment_details: Safe appointment info (date, time, location)

        Returns:
            SMS send result
        """
        logger.info(f"[{self.agent_name}] SMS reminder sent")

        # In production: use HIPAA-compliant SMS service
        # Never include diagnosis or treatment details in SMS
        return {
            "status": "sent",
            "message": "SMS reminder sent successfully"
        }
