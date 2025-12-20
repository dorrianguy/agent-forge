"""
Billing Support Voice Agent

Handles payment inquiries, account balances, and payment processing.
PCI-compliant with secure payment handling.
"""

from typing import List, Dict, Any
from ..voice_agent_types import VoiceAgentType


class BillingSupportAgent:
    """
    Billing support voice agent.

    Capabilities:
    - Payment inquiry and processing
    - Account balance lookup
    - Invoice and billing history
    - PCI-compliant payment collection
    - Dispute handling and escalation
    - Payment plan setup
    - CRM integration for account updates
    """

    agent_type = VoiceAgentType.VOICE_BILLING_SUPPORT

    def __init__(self):
        self.agent_id = "billing_support_001"
        self.name = "Billing Support Agent"

    def get_system_prompt(self) -> str:
        """
        Get voice-optimized system prompt.
        Clear about numbers, secure about payment info.
        """
        return """You are a billing support agent. You help customers with payment questions, account balances, and billing issues. Be clear about numbers and dates. Confirm payment details before processing. Keep sensitive information secure. Never share full card numbers. If there's a dispute, escalate to billing specialist. Always provide confirmation numbers."""

    def get_greeting(self) -> str:
        """Get initial greeting message."""
        return "Hi! Thanks for calling our billing department. I can help you with payments, balances, and billing questions. What brings you in today?"

    def get_available_functions(self) -> List[str]:
        """
        Get list of available functions for this agent.
        """
        return [
            "lookup_customer",      # Look up customer account
            "extract_variable",    # Extract account/invoice numbers
            "call_api",           # Check balance, get invoice details
            "send_sms",           # Send payment confirmation
            "transfer_call",      # Transfer to billing specialist
            "agent_transfer",     # Transfer to different AI agent
            "update_crm",         # Update account information
        ]

    def get_state_machine_config(self) -> Dict[str, Any]:
        """
        Get state machine configuration for billing flow.

        States:
        - greeting: Initial greeting and inquiry type
        - verify_account: Verify customer identity
        - billing_inquiry: Handle billing question
        - process_payment: Process payment if needed
        - dispute_handling: Handle billing disputes
        - closing: Provide confirmation and close
        """
        states = [
            {
                'id': 'greeting',
                'name': 'Greeting',
                'prompt': 'Greet the customer warmly. Ask what billing question or payment issue they need help with today.',
                'functions': ['extract_variable'],
                'max_turns': 2
            },
            {
                'id': 'verify_account',
                'name': 'Verify Account',
                'prompt': 'Verify the customer identity for security. Ask for account number, email, or phone number. Confirm their identity before discussing billing details.',
                'functions': ['lookup_customer', 'extract_variable'],
                'max_turns': 3
            },
            {
                'id': 'billing_inquiry',
                'name': 'Billing Inquiry',
                'prompt': 'Look up and explain billing information clearly. Provide account balance, payment due dates, or invoice details. Answer billing questions accurately.',
                'functions': ['call_api', 'lookup_customer', 'extract_variable'],
                'max_turns': 5
            },
            {
                'id': 'process_payment',
                'name': 'Process Payment',
                'prompt': 'Guide the customer through making a payment. Confirm the payment amount. Never ask for full card numbers verbally. Use secure payment processing. Provide confirmation number.',
                'functions': ['call_api', 'extract_variable', 'update_crm'],
                'max_turns': 4
            },
            {
                'id': 'dispute_handling',
                'name': 'Dispute Handling',
                'prompt': 'Listen to the billing dispute or concern. Show empathy. Explain the charges clearly. If you cannot resolve, transfer to billing specialist for review.',
                'functions': ['call_api', 'update_crm', 'transfer_call', 'agent_transfer'],
                'max_turns': 4
            },
            {
                'id': 'closing',
                'name': 'Closing',
                'prompt': 'Provide confirmation number for any payment or update. Summarize what was done. Send confirmation via SMS if appropriate. Thank the customer.',
                'functions': ['send_sms', 'update_crm'],
                'is_terminal': True,
                'max_turns': 2
            }
        ]

        transitions = [
            # From greeting
            {
                'from': 'greeting',
                'to': 'verify_account',
                'condition': 'inquiry_type_identified == True',
                'priority': 1
            },

            # From verify_account
            {
                'from': 'verify_account',
                'to': 'billing_inquiry',
                'condition': 'verified == True and inquiry_type == "question"',
                'priority': 1
            },
            {
                'from': 'verify_account',
                'to': 'process_payment',
                'condition': 'verified == True and inquiry_type == "payment"',
                'priority': 2
            },
            {
                'from': 'verify_account',
                'to': 'dispute_handling',
                'condition': 'verified == True and inquiry_type == "dispute"',
                'priority': 3
            },

            # From billing_inquiry
            {
                'from': 'billing_inquiry',
                'to': 'process_payment',
                'condition': 'wants_to_pay == True',
                'priority': 1
            },
            {
                'from': 'billing_inquiry',
                'to': 'dispute_handling',
                'condition': 'has_dispute == True',
                'priority': 2
            },
            {
                'from': 'billing_inquiry',
                'to': 'closing',
                'condition': 'question_answered == True',
                'priority': 3
            },

            # From process_payment
            {
                'from': 'process_payment',
                'to': 'closing',
                'condition': 'payment_processed == True',
                'priority': 1
            },
            {
                'from': 'process_payment',
                'to': 'dispute_handling',
                'condition': 'payment_failed == True',
                'priority': 2
            },

            # From dispute_handling
            {
                'from': 'dispute_handling',
                'to': 'closing',
                'condition': 'dispute_resolved == True or transferred == True',
                'priority': 1
            },
        ]

        return {
            'states': states,
            'transitions': transitions,
            'initial_state_id': 'greeting'
        }

    def get_fallback_responses(self) -> List[str]:
        """Get fallback responses when agent doesn't understand."""
        return [
            "I'm sorry, I missed that. Which account or invoice number were you referring to?",
            "Let me pull up your account... Can you verify your account number or email for me?",
            "I want to make sure I have this right. You're asking about...",
            "Okay, let me check that for you. One moment...",
        ]

    def get_transfer_phrases(self) -> List[str]:
        """Get phrases for transferring calls."""
        return [
            "This billing issue needs a specialist to review. Let me connect you with our billing team right away.",
            "For a refund like that, I'll need to transfer you to someone with authorization. Hold on just a moment.",
            "This looks like it needs a deeper account review. I'm going to get you to our billing specialist.",
        ]

    def get_closing_phrases(self) -> List[str]:
        """Get phrases for ending calls."""
        return [
            "Alright, your payment is all set. You should see it process within 24 hours. Anything else?",
            "Perfect! Your confirmation number is... Write that down just in case. Need anything else?",
            "Great. Is there anything else about your billing I can help with today?",
        ]
