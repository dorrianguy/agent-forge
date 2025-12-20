"""
Agent Forge - Fraud Verification Agent
Handles transaction verification and suspicious activity alerts with PCI compliance.
"""

from typing import Dict, List, Any
from .base_voice_agent import BaseVoiceAgent
from ..voice_agent_types import VoiceAgentType, VoiceAgentCapability


class FraudVerificationAgent(BaseVoiceAgent):
    """
    Fraud Verification Voice Agent.

    Calls customers about suspicious transactions with PCI-compliant
    verification methods. Never asks for full card numbers or PINs.
    """

    def get_agent_type(self) -> VoiceAgentType:
        """Return fraud verification agent type."""
        return VoiceAgentType.VOICE_FRAUD_VERIFICATION

    def get_capabilities(self) -> List[VoiceAgentCapability]:
        """Return fraud verification capabilities."""
        return [
            VoiceAgentCapability.OUTBOUND_CALLS,
            VoiceAgentCapability.PCI_COMPLIANT,
            VoiceAgentCapability.CALL_RECORDING,
            VoiceAgentCapability.DTMF_NAVIGATION,
            VoiceAgentCapability.SENTIMENT_ANALYSIS,
            VoiceAgentCapability.INTENT_DETECTION,
        ]

    def get_system_prompt(self) -> str:
        """
        Get PCI-compliant system prompt for fraud verification.

        Returns:
            System prompt with fraud verification guidelines
        """
        return """You are a fraud verification agent for a financial institution. Your role is to protect customers by verifying suspicious transactions.

CRITICAL PCI COMPLIANCE RULES:
- NEVER ask for full card numbers, only last 4 digits
- NEVER ask for PINs, CVV codes, or full SSN
- NEVER share full account numbers over the phone
- ONLY use approved identity verification methods

Your responsibilities:
- Verify customer identity using security questions
- Explain suspicious activity clearly and calmly
- Get confirmation to approve or decline transactions
- Maintain a professional, reassuring tone
- Handle customer concerns with patience
- Document all responses accurately

Verification process:
1. Confirm you're speaking with the account holder
2. Verify identity using last 4 of account, date of birth, or security questions
3. Describe the suspicious transaction (amount, merchant, date)
4. Ask if they authorized the transaction
5. Take appropriate action based on their response
6. Provide case number for their records

Keep responses short and clear. Use a formal but friendly tone. If the customer seems confused or concerned, take extra time to explain. Never rush them. If fraud is confirmed, reassure them their account will be secured immediately.

Transfer to specialist if:
- Customer disputes multiple transactions
- Complex fraud pattern detected
- Customer requests to speak with fraud investigator
- Legal or regulatory questions arise"""

    def get_greeting(self) -> str:
        """
        Get fraud verification greeting with disclosure.

        Returns:
            Greeting string with required disclosure
        """
        return """Hello, this is calling from your financial institution's fraud prevention department. We detected some unusual activity on your account and need to verify some transactions with you. This call may be recorded for quality and security purposes. Do you have a moment to speak securely about your account?"""

    def get_available_functions(self) -> List[Dict[str, Any]]:
        """
        Get available functions for fraud verification.

        Returns:
            List of function definitions
        """
        return [
            {
                "name": "verify_identity",
                "description": "Verify customer identity using approved methods",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "verification_method": {
                            "type": "string",
                            "enum": ["last_4_account", "date_of_birth", "security_question", "phone_verification"],
                            "description": "Method used to verify identity"
                        },
                        "verification_value": {
                            "type": "string",
                            "description": "Value provided by customer (redacted in logs)"
                        }
                    },
                    "required": ["verification_method", "verification_value"]
                }
            },
            {
                "name": "check_transaction",
                "description": "Check if a specific transaction is suspicious",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "transaction_id": {
                            "type": "string",
                            "description": "Transaction identifier"
                        }
                    },
                    "required": ["transaction_id"]
                }
            },
            {
                "name": "confirm_transaction",
                "description": "Mark transaction as authorized by customer",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "transaction_id": {
                            "type": "string",
                            "description": "Transaction identifier"
                        },
                        "customer_authorized": {
                            "type": "boolean",
                            "description": "Whether customer confirms they made this transaction"
                        },
                        "notes": {
                            "type": "string",
                            "description": "Additional notes from conversation"
                        }
                    },
                    "required": ["transaction_id", "customer_authorized"]
                }
            },
            {
                "name": "block_card",
                "description": "Immediately block card due to confirmed fraud",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "card_last_4": {
                            "type": "string",
                            "description": "Last 4 digits of card to block"
                        },
                        "reason": {
                            "type": "string",
                            "description": "Reason for blocking card"
                        },
                        "issue_replacement": {
                            "type": "boolean",
                            "description": "Whether to issue replacement card"
                        }
                    },
                    "required": ["card_last_4", "reason"]
                }
            },
            {
                "name": "create_fraud_case",
                "description": "Create fraud investigation case",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "transaction_ids": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "List of suspicious transaction IDs"
                        },
                        "customer_statement": {
                            "type": "string",
                            "description": "Customer's statement about the fraud"
                        },
                        "estimated_loss": {
                            "type": "number",
                            "description": "Estimated dollar amount of fraudulent charges"
                        }
                    },
                    "required": ["transaction_ids", "customer_statement"]
                }
            },
            {
                "name": "send_fraud_alert",
                "description": "Send fraud alert notification to customer",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "notification_type": {
                            "type": "string",
                            "enum": ["sms", "email", "both"],
                            "description": "Type of notification to send"
                        },
                        "case_number": {
                            "type": "string",
                            "description": "Fraud case number for reference"
                        }
                    },
                    "required": ["notification_type", "case_number"]
                }
            },
            {
                "name": "transfer_to_specialist",
                "description": "Transfer call to fraud specialist",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "reason": {
                            "type": "string",
                            "description": "Reason for transfer"
                        },
                        "urgency": {
                            "type": "string",
                            "enum": ["low", "medium", "high", "critical"],
                            "description": "Transfer urgency level"
                        }
                    },
                    "required": ["reason"]
                }
            }
        ]

    def get_fallback_responses(self) -> List[str]:
        """Get fraud-specific fallback responses."""
        return [
            "I understand your concern. For your security, can you verify the last four digits of your account number?",
            "No problem. Let me ask that a different way for clarity.",
            "I see. To help protect your account, I just need to confirm a few details.",
            "That's okay. Security is important, so let me make sure I have this right.",
        ]

    def get_transfer_phrases(self) -> List[str]:
        """Get fraud-specific transfer phrases."""
        return [
            "This situation requires our fraud investigation team. I'm transferring you to a specialist right away.",
            "For that level of activity, I need to connect you with a fraud investigator immediately.",
            "Let me get you to our security team who can handle this more thoroughly.",
        ]

    def get_closing_phrases(self) -> List[str]:
        """Get fraud-specific closing phrases."""
        return [
            "Perfect! I've secured your account. You should see the charges reversed in 3 to 5 business days. Your case number is... Is there anything else?",
            "Great! Your account is safe now. We'll monitor it closely. You'll receive email confirmation shortly with your case number.",
            "All set! If you notice any other suspicious activity, please call us immediately at the number on your card. Have a safe day!",
        ]

    def validate_compliance(self) -> List[str]:
        """
        Validate PCI compliance for fraud verification.

        Returns:
            List of compliance warnings/errors
        """
        warnings = []

        # Check required capabilities
        required_caps = [
            VoiceAgentCapability.PCI_COMPLIANT,
            VoiceAgentCapability.CALL_RECORDING
        ]

        for cap in required_caps:
            if cap not in self.get_capabilities():
                warnings.append(f"Missing required capability: {cap.value}")

        # Verify system prompt contains PCI warnings
        prompt = self.get_system_prompt()
        if "NEVER ask for full card numbers" not in prompt:
            warnings.append("System prompt missing PCI compliance warnings")

        return warnings
