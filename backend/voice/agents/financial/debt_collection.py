"""
Agent Forge - Debt Collection Agent
Handles payment reminders and collection with FDCPA compliance.
"""

from typing import Dict, List, Any
from .base_voice_agent import BaseVoiceAgent
from ..voice_agent_types import VoiceAgentType, VoiceAgentCapability


class DebtCollectionAgent(BaseVoiceAgent):
    """
    Debt Collection Voice Agent.

    Calls customers about overdue payments with strict FDCPA compliance.
    Professional, respectful, and legally compliant at all times.
    """

    def get_agent_type(self) -> VoiceAgentType:
        """Return debt collection agent type."""
        return VoiceAgentType.VOICE_DEBT_COLLECTION

    def get_capabilities(self) -> List[VoiceAgentCapability]:
        """Return debt collection capabilities."""
        return [
            VoiceAgentCapability.OUTBOUND_CALLS,
            VoiceAgentCapability.PAYMENT_COLLECTION,
            VoiceAgentCapability.FDCPA_COMPLIANT,
            VoiceAgentCapability.CALL_RECORDING,
            VoiceAgentCapability.CALL_CONSENT,
            VoiceAgentCapability.DTMF_NAVIGATION,
            VoiceAgentCapability.CRM_INTEGRATION,
        ]

    def get_system_prompt(self) -> str:
        """
        Get FDCPA-compliant system prompt for debt collection.

        Returns:
            System prompt with debt collection guidelines
        """
        return """You are a debt collection agent. Your role is to help customers resolve overdue payments while maintaining strict compliance with the Fair Debt Collection Practices Act (FDCPA).

CRITICAL FDCPA COMPLIANCE RULES:
- ALWAYS give mini-Miranda warning at call start
- NEVER threaten, harass, or use abusive language
- NEVER call before 8am or after 9pm in customer's time zone
- NEVER discuss debt with third parties (except customer's attorney)
- NEVER misrepresent the amount owed or consequences
- NEVER contact customer at work if they request you don't
- STOP all contact if customer requests in writing

Mini-Miranda Warning (REQUIRED):
"This is an attempt to collect a debt. Any information obtained will be used for that purpose."

Your responsibilities:
- Verify you're speaking with the debtor before discussing debt
- Explain the debt amount clearly and accurately
- Offer payment plan options
- Process payments securely
- Document all conversations
- Maintain professional, respectful tone at all times

Approved approaches:
- Ask about customer's ability to pay
- Offer flexible payment arrangements
- Explain consequences of non-payment (factually, without threats)
- Provide account balance and payment history
- Accept partial payments when authorized

Conversation flow:
1. Identify yourself and give mini-Miranda warning
2. Verify debtor's identity
3. State the amount owed clearly
4. Ask about payment options
5. Offer payment plans if full payment not possible
6. Process payment or schedule payment arrangement
7. Provide confirmation number

Keep tone professional and respectful. Listen to hardship explanations. Never argue or become defensive. If customer becomes hostile, remain calm and professional. If they request you stop calling, confirm request and end call.

Transfer to supervisor if:
- Customer disputes the debt
- Customer requests settlement negotiation
- Customer becomes abusive or threatening
- Legal questions arise
- Payment plan needs special approval"""

    def get_greeting(self) -> str:
        """
        Get FDCPA-compliant greeting with mini-Miranda warning.

        Returns:
            Greeting string with required disclosures
        """
        return """Hello, may I speak with [Customer Name]? This is calling from [Company Name] regarding your account. This is an attempt to collect a debt. Any information obtained will be used for that purpose. This call may be recorded. Is this [Customer Name]?"""

    def get_available_functions(self) -> List[Dict[str, Any]]:
        """
        Get available functions for debt collection.

        Returns:
            List of function definitions
        """
        return [
            {
                "name": "verify_debtor_identity",
                "description": "Verify identity before discussing debt details",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "verification_method": {
                            "type": "string",
                            "enum": ["account_number", "date_of_birth", "ssn_last_4", "address"],
                            "description": "Method used to verify identity"
                        },
                        "verified": {
                            "type": "boolean",
                            "description": "Whether identity was successfully verified"
                        }
                    },
                    "required": ["verification_method", "verified"]
                }
            },
            {
                "name": "get_account_balance",
                "description": "Retrieve current account balance and debt details",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "account_number": {
                            "type": "string",
                            "description": "Account number to look up"
                        }
                    },
                    "required": ["account_number"]
                }
            },
            {
                "name": "offer_payment_plan",
                "description": "Present payment plan options to customer",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "total_owed": {
                            "type": "number",
                            "description": "Total amount owed"
                        },
                        "plan_type": {
                            "type": "string",
                            "enum": ["weekly", "biweekly", "monthly", "custom"],
                            "description": "Payment plan frequency"
                        },
                        "down_payment": {
                            "type": "number",
                            "description": "Initial down payment amount"
                        },
                        "installments": {
                            "type": "integer",
                            "description": "Number of installment payments"
                        }
                    },
                    "required": ["total_owed", "plan_type"]
                }
            },
            {
                "name": "process_payment",
                "description": "Process payment via phone",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "payment_method": {
                            "type": "string",
                            "enum": ["card", "bank_account", "check"],
                            "description": "Payment method type"
                        },
                        "amount": {
                            "type": "number",
                            "description": "Payment amount"
                        },
                        "payment_date": {
                            "type": "string",
                            "description": "Date payment will be processed (YYYY-MM-DD)"
                        }
                    },
                    "required": ["payment_method", "amount"]
                }
            },
            {
                "name": "setup_payment_arrangement",
                "description": "Create formal payment arrangement agreement",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "total_amount": {
                            "type": "number",
                            "description": "Total debt amount"
                        },
                        "down_payment": {
                            "type": "number",
                            "description": "Initial payment amount"
                        },
                        "installment_amount": {
                            "type": "number",
                            "description": "Amount per installment"
                        },
                        "installment_frequency": {
                            "type": "string",
                            "enum": ["weekly", "biweekly", "monthly"],
                            "description": "Payment frequency"
                        },
                        "number_of_payments": {
                            "type": "integer",
                            "description": "Total number of payments"
                        },
                        "first_payment_date": {
                            "type": "string",
                            "description": "Date of first payment (YYYY-MM-DD)"
                        }
                    },
                    "required": ["total_amount", "installment_amount", "installment_frequency", "number_of_payments"]
                }
            },
            {
                "name": "record_dispute",
                "description": "Record customer dispute of debt",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "dispute_reason": {
                            "type": "string",
                            "description": "Customer's reason for disputing debt"
                        },
                        "requested_documentation": {
                            "type": "boolean",
                            "description": "Whether customer requested debt validation"
                        }
                    },
                    "required": ["dispute_reason"]
                }
            },
            {
                "name": "record_cease_contact_request",
                "description": "Record customer request to cease contact (FDCPA requirement)",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "request_type": {
                            "type": "string",
                            "enum": ["stop_all_contact", "stop_work_contact", "attorney_only"],
                            "description": "Type of cease contact request"
                        },
                        "attorney_name": {
                            "type": "string",
                            "description": "Attorney name if customer has legal representation"
                        },
                        "attorney_phone": {
                            "type": "string",
                            "description": "Attorney phone number"
                        }
                    },
                    "required": ["request_type"]
                }
            },
            {
                "name": "send_payment_confirmation",
                "description": "Send payment confirmation to customer",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "confirmation_number": {
                            "type": "string",
                            "description": "Payment confirmation number"
                        },
                        "send_method": {
                            "type": "string",
                            "enum": ["email", "sms", "both"],
                            "description": "How to send confirmation"
                        }
                    },
                    "required": ["confirmation_number", "send_method"]
                }
            },
            {
                "name": "transfer_to_supervisor",
                "description": "Transfer to supervisor for settlement or dispute",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "reason": {
                            "type": "string",
                            "enum": ["settlement_request", "dispute", "payment_plan_approval", "customer_escalation"],
                            "description": "Reason for supervisor transfer"
                        },
                        "notes": {
                            "type": "string",
                            "description": "Transfer notes for supervisor"
                        }
                    },
                    "required": ["reason"]
                }
            }
        ]

    def get_fallback_responses(self) -> List[str]:
        """Get FDCPA-compliant fallback responses."""
        return [
            "I understand. Is there a better time I can call you to discuss your account?",
            "That's okay. Are you able to make a payment arrangement today?",
            "I hear you. What payment amount would work for your budget right now?",
            "Fair enough. Would you like me to explain the payment options we have available?",
        ]

    def get_transfer_phrases(self) -> List[str]:
        """Get debt collection transfer phrases."""
        return [
            "For a settlement arrangement, I need to get approval from my supervisor. Let me connect you now.",
            "That payment plan requires special authorization. Hold while I transfer you to someone who can help.",
            "For legal questions about this debt, I should connect you with our compliance department.",
        ]

    def get_closing_phrases(self) -> List[str]:
        """Get FDCPA-compliant closing phrases."""
        return [
            "Perfect! I'm processing that payment now. You'll receive confirmation by email and text shortly. Your confirmation number is... Thank you.",
            "Great! Your payment plan is set up. First payment is due on [date]. You'll receive reminders before each payment. Thank you for your cooperation.",
            "All set! Your account will be updated within 24 hours. We appreciate you taking care of this today.",
        ]

    def validate_compliance(self) -> List[str]:
        """
        Validate FDCPA compliance for debt collection.

        Returns:
            List of compliance warnings/errors
        """
        warnings = []

        # Check required capabilities
        required_caps = [
            VoiceAgentCapability.FDCPA_COMPLIANT,
            VoiceAgentCapability.CALL_RECORDING,
            VoiceAgentCapability.CALL_CONSENT
        ]

        for cap in required_caps:
            if cap not in self.get_capabilities():
                warnings.append(f"Missing required capability: {cap.value}")

        # Verify mini-Miranda warning in greeting
        greeting = self.get_greeting()
        if "attempt to collect a debt" not in greeting.lower():
            warnings.append("Greeting missing required mini-Miranda warning")

        # Verify system prompt contains FDCPA rules
        prompt = self.get_system_prompt()
        fdcpa_keywords = ["FDCPA", "mini-Miranda", "NEVER threaten", "NEVER harass"]
        for keyword in fdcpa_keywords:
            if keyword not in prompt:
                warnings.append(f"System prompt missing FDCPA keyword: {keyword}")

        return warnings
