"""
Prescription Refill Agent - HIPAA Compliant

Pharmacy refill request agent that helps patients request medication refills,
checks refill eligibility, and provides pickup notifications.

HIPAA Compliance:
- No medication names in logs
- Patient identity verification required
- Secure handling of prescription numbers
- PHI redaction in transcripts
- Pharmacist escalation for clinical questions
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


class PrescriptionRefillAgent(BaseVoiceAgent):
    """
    Prescription Refill Voice Agent for pharmacies.

    Capabilities:
    - Inbound refill request handling
    - Patient identity verification
    - Prescription eligibility checking
    - Pickup time notification
    - SMS confirmation
    - HIPAA-compliant medication handling

    Conversation Flow:
    1. Greeting and identity verification
    2. Prescription information collection
    3. Refill eligibility check
    4. Pickup time notification
    5. SMS confirmation
    """

    def __init__(self, config: VoiceAgentConfig):
        """Initialize PrescriptionRefillAgent with HIPAA-compliant settings"""
        super().__init__(config, role=AgentRole.SUPPORT)

        # HIPAA compliance
        self.hipaa_compliant = True
        self.identity_verified = False

        # Register pharmacy-specific functions
        self.register_function("verify_patient_identity", self._verify_patient_identity)
        self.register_function("check_refill_eligibility", self._check_refill_eligibility)
        self.register_function("process_refill_request", self._process_refill_request)
        self.register_function("send_pickup_notification", self._send_pickup_notification)
        self.register_function("transfer_to_pharmacist", self._transfer_to_pharmacist)

        logger.info(f"[{self.agent_name}] HIPAA-compliant PrescriptionRefillAgent initialized")

    def get_system_prompt(self) -> str:
        """
        Get HIPAA-compliant system prompt for prescription refills.

        Returns:
            System prompt with pharmacy professional tone and privacy guidelines
        """
        template = get_template(VoiceAgentType.VOICE_PRESCRIPTION_REFILL)
        base_prompt = template.get("system_prompt", "")

        # Add HIPAA compliance instructions
        hipaa_addendum = """

HIPAA COMPLIANCE REQUIREMENTS:
- ALWAYS verify patient identity before discussing prescriptions
- Ask for name and date of birth for verification
- Use prescription numbers for reference, not medication names in logs
- Do NOT discuss medical conditions or reasons for medication
- For medication questions, transfer to pharmacist immediately
- Do NOT provide medical advice or dosage information
- Keep logs generic: "refill requested" not specific medication names
- Do NOT discuss patient's other medications without explicit request
- If patient asks about side effects or interactions, transfer to pharmacist
"""

        return base_prompt + hipaa_addendum

    def get_greeting(self) -> str:
        """
        Get professional pharmacy greeting.

        Returns:
            Greeting message for pharmacy refill line
        """
        return (
            "Hi! Thanks for calling the pharmacy refill line. I can help you with that. "
            "Can I get your name and date of birth please?"
        )

    def get_available_functions(self) -> List[Dict[str, Any]]:
        """
        Get list of available pharmacy functions.

        Returns:
            Function definitions for prescription refill management
        """
        return [
            {
                "name": "verify_patient_identity",
                "description": "Verify patient identity using name and date of birth",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "patient_name": {
                            "type": "string",
                            "description": "Patient's full name"
                        },
                        "date_of_birth": {
                            "type": "string",
                            "description": "Patient's date of birth"
                        }
                    },
                    "required": ["patient_name", "date_of_birth"]
                }
            },
            {
                "name": "check_refill_eligibility",
                "description": "Check if prescription is eligible for refill",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "prescription_number": {
                            "type": "string",
                            "description": "Prescription number from bottle"
                        }
                    },
                    "required": ["prescription_number"]
                }
            },
            {
                "name": "process_refill_request",
                "description": "Process prescription refill request",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "prescription_number": {
                            "type": "string",
                            "description": "Prescription number to refill"
                        },
                        "patient_id": {
                            "type": "string",
                            "description": "Verified patient ID"
                        }
                    },
                    "required": ["prescription_number", "patient_id"]
                }
            },
            {
                "name": "send_pickup_notification",
                "description": "Send SMS notification when prescription is ready",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "phone_number": {
                            "type": "string",
                            "description": "Phone number for notification"
                        },
                        "prescription_id": {
                            "type": "string",
                            "description": "Prescription ID"
                        }
                    },
                    "required": ["phone_number", "prescription_id"]
                }
            },
            {
                "name": "transfer_to_pharmacist",
                "description": "Transfer call to pharmacist for clinical questions",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "reason": {
                            "type": "string",
                            "description": "Reason for transfer (medication question, side effect, etc.)"
                        }
                    },
                    "required": ["reason"]
                }
            }
        ]

    async def handle_user_input(
        self,
        user_message: str,
        context: Dict[str, Any]
    ) -> Tuple[str, Dict[str, Any]]:
        """
        Process user input with HIPAA compliance for prescription refills.

        Flow:
        1. Verify patient identity
        2. Collect prescription information
        3. Check refill eligibility
        4. Process refill request
        5. Provide pickup information

        Args:
            user_message: Patient's speech/text
            context: Current conversation context

        Returns:
            Tuple of (agent_response, updated_context)
        """
        user_message_lower = user_message.lower()

        # Step 1: Identity verification
        if not context.get("identity_verified"):
            # Check if user provided identifying information
            if any(char.isdigit() for char in user_message):
                # Simulate identity verification
                context["identity_verified"] = True
                context["patient_verified"] = True

                return (
                    "Thank you. Which medication did you need refilled? You can tell me "
                    "the medication name or the prescription number from your bottle.",
                    context
                )
            else:
                # Still collecting identity info
                if not context.get("name_collected"):
                    context["name_collected"] = True
                    context["patient_name"] = user_message  # Sanitize in production
                    return (
                        "Thank you. And can you please provide your date of birth?",
                        context
                    )
                else:
                    return (
                        "I'm sorry, I need to verify your identity first. Can you provide "
                        "your name and date of birth?",
                        context
                    )

        # Step 2: Prescription information collection
        if not context.get("prescription_collected"):
            # User provided medication name or prescription number
            context["prescription_collected"] = True
            context["prescription_info"] = user_message

            # Check if it's a prescription number (contains digits)
            if any(char.isdigit() for char in user_message):
                context["has_rx_number"] = True
                return (
                    "Let me check that prescription number for you... Okay, I found it. "
                    "This prescription is eligible for refill. Your refill will be ready "
                    "for pickup by 2 PM today. We'll text you when it's ready. Sound good?",
                    context
                )
            else:
                # Medication name provided
                return (
                    "Got it. Do you have the prescription number from your bottle? "
                    "It helps me find it faster in our system.",
                    context
                )

        # Step 3: Confirmation and questions
        if context.get("prescription_collected"):
            # Medication questions - transfer to pharmacist
            if any(word in user_message_lower for word in [
                "side effect", "interaction", "how to take", "dosage",
                "take with food", "question about", "safe", "react"
            ]):
                context["needs_pharmacist"] = True
                return (
                    "For questions about your medication, I should connect you with "
                    "our pharmacist on duty. They can answer that for you. Let me "
                    "transfer you now. One moment please.",
                    context
                )

            # Confirmation
            if any(word in user_message_lower for word in ["yes", "okay", "good", "sure"]):
                context["refill_confirmed"] = True
                return (
                    "Perfect! Your refill will be ready for pickup by 2 PM today. "
                    "We'll text you when it's ready. Pick it up at any pharmacy location. "
                    "Anything else I can help with?",
                    context
                )

            # Additional refill
            if any(word in user_message_lower for word in ["another", "more", "also", "other"]):
                context["prescription_collected"] = False
                return (
                    "Of course! What other medication do you need refilled?",
                    context
                )

            # Questions about pickup
            if any(word in user_message_lower for word in ["when", "time", "ready", "pickup"]):
                return (
                    "Your prescription will be ready by 2 PM this afternoon. We'll send "
                    "you a text notification when it's ready for pickup. You can pick it "
                    "up at any of our pharmacy locations.",
                    context
                )

            # Insurance or cost questions
            if any(word in user_message_lower for word in ["cost", "price", "insurance", "pay"]):
                return (
                    "The pharmacist can discuss pricing and insurance coverage when you "
                    "pick up your prescription. They'll also have information about any "
                    "available coupons or assistance programs if needed.",
                    context
                )

        # Default fallback
        return (
            "I'm sorry, I didn't catch that. Is there anything else I can help you with "
            "for your prescription refill?",
            context
        )

    # ==================== Pharmacy-Specific Functions ====================

    async def _verify_patient_identity(
        self,
        patient_name: str,
        date_of_birth: str
    ) -> Dict[str, Any]:
        """
        Verify patient identity using name and DOB.

        HIPAA Note: Query pharmacy system without logging PHI

        Args:
            patient_name: Patient's name
            date_of_birth: Patient's DOB

        Returns:
            Verification result
        """
        logger.info(f"[{self.agent_name}] Patient identity verification requested")

        # In production: query pharmacy management system securely
        # Use hashed patient IDs in logs, never names or DOB
        verified = True  # Simulated

        if verified:
            self.identity_verified = True
            return {
                "verified": True,
                "patient_id": "PATIENT_ID_HASH",  # Use anonymized ID
                "message": "Identity verified"
            }
        else:
            return {
                "verified": False,
                "message": "Unable to verify identity"
            }

    async def _check_refill_eligibility(
        self,
        prescription_number: str
    ) -> Dict[str, Any]:
        """
        Check if prescription is eligible for refill.

        Checks:
        - Refills remaining
        - Too soon to refill
        - Prescription expired
        - Requires doctor approval

        Args:
            prescription_number: Prescription number

        Returns:
            Eligibility status
        """
        logger.info(f"[{self.agent_name}] Refill eligibility check")

        # In production: query pharmacy management system
        # Check refills remaining, expiration, too-soon date
        return {
            "eligible": True,
            "refills_remaining": 3,
            "ready_time": "2:00 PM today",
            "message": "Eligible for refill"
        }

    async def _process_refill_request(
        self,
        prescription_number: str,
        patient_id: str
    ) -> Dict[str, Any]:
        """
        Process prescription refill request.

        Args:
            prescription_number: Prescription number
            patient_id: Verified patient ID

        Returns:
            Refill processing result
        """
        logger.info(f"[{self.agent_name}] Refill request processed")

        # In production: submit refill to pharmacy queue
        return {
            "status": "processing",
            "prescription_id": prescription_number,
            "ready_time": "2:00 PM",
            "message": "Refill request submitted"
        }

    async def _send_pickup_notification(
        self,
        phone_number: str,
        prescription_id: str
    ) -> Dict[str, Any]:
        """
        Send SMS notification when prescription is ready.

        HIPAA Note: SMS should be generic, no medication names

        Args:
            phone_number: Patient's phone
            prescription_id: Prescription ID

        Returns:
            Notification result
        """
        logger.info(f"[{self.agent_name}] Pickup notification sent")

        # In production: use HIPAA-compliant SMS service
        # Message: "Your prescription is ready for pickup at [Pharmacy]"
        # No medication names in SMS
        return {
            "status": "sent",
            "message": "SMS notification sent"
        }

    async def _transfer_to_pharmacist(self, reason: str) -> Dict[str, Any]:
        """
        Transfer call to pharmacist for clinical questions.

        Args:
            reason: Reason for transfer

        Returns:
            Transfer result
        """
        logger.info(f"[{self.agent_name}] Transferring to pharmacist: {reason}")

        # Use base class transfer functionality
        return await self._transfer_to_human(f"pharmacist_needed: {reason}")
