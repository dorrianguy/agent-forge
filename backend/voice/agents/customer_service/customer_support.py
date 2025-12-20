"""
Customer Support Voice Agent

General customer service agent for FAQ handling and issue resolution.
Handles inbound calls with empathy and transfers to specialists when needed.
"""

from typing import List, Dict, Any
from ..voice_agent_types import VoiceAgentType
from ...state_machine import ConversationState, StateTransition, create_simple_state_machine


class CustomerSupportAgent:
    """
    General customer support voice agent.

    Capabilities:
    - General customer service and FAQ handling
    - Issue identification and triage
    - Empathetic conversation handling
    - Transfer to specialist teams when needed
    - Sentiment analysis for escalation
    - CRM integration for customer lookup
    """

    agent_type = VoiceAgentType.VOICE_CUSTOMER_SUPPORT

    def __init__(self):
        self.agent_id = "customer_support_001"
        self.name = "Customer Support Agent"

    def get_system_prompt(self) -> str:
        """
        Get voice-optimized system prompt.
        Short, conversational, natural.
        """
        return """You are a friendly customer support agent. You help customers with their questions and issues. Keep your answers short and clear. Use a warm, helpful tone. Listen carefully to what the customer needs. If you can't solve their issue, transfer them to a specialist. Always confirm you understand before taking action."""

    def get_greeting(self) -> str:
        """Get initial greeting message."""
        return "Hi there! Thanks for calling. I'm here to help you today. What can I do for you?"

    def get_available_functions(self) -> List[str]:
        """
        Get list of available functions for this agent.
        Functions from voice/functions.py registry.
        """
        return [
            "lookup_customer",      # Look up customer in CRM
            "update_crm",          # Update customer record
            "extract_variable",    # Extract info from conversation
            "transfer_call",       # Transfer to human agent
            "agent_transfer",      # Transfer to specialist AI agent
            "send_sms",           # Send confirmation SMS
            "call_api",           # Call external API for data
        ]

    def get_state_machine_config(self) -> Dict[str, Any]:
        """
        Get state machine configuration for conversation flow.

        States:
        - greeting: Initial customer greeting and intent detection
        - identify_issue: Understand the customer's problem
        - resolve_issue: Attempt to resolve or provide information
        - transfer_decision: Decide if transfer is needed
        - closing: Thank customer and end call
        """
        states = [
            {
                'id': 'greeting',
                'name': 'Greeting',
                'prompt': 'Greet the customer warmly. Ask how you can help them today. Listen for their main concern.',
                'functions': ['lookup_customer', 'extract_variable'],
                'max_turns': 2
            },
            {
                'id': 'identify_issue',
                'name': 'Identify Issue',
                'prompt': 'Listen carefully to understand the customer issue. Ask clarifying questions if needed. Determine if you can help or if they need a specialist.',
                'functions': ['lookup_customer', 'extract_variable', 'call_api'],
                'max_turns': 4
            },
            {
                'id': 'resolve_issue',
                'name': 'Resolve Issue',
                'prompt': 'Provide clear, helpful information to resolve the customer issue. Confirm they understand. Ask if the solution works for them.',
                'functions': ['update_crm', 'send_sms', 'call_api'],
                'max_turns': 5
            },
            {
                'id': 'transfer_decision',
                'name': 'Transfer Decision',
                'prompt': 'The issue requires specialist help. Explain you will transfer them to someone who can better assist. Make the transfer warm and reassuring.',
                'functions': ['transfer_call', 'agent_transfer'],
                'max_turns': 2
            },
            {
                'id': 'closing',
                'name': 'Closing',
                'prompt': 'Thank the customer for calling. Ask if there is anything else you can help with. End the call politely.',
                'functions': ['send_sms', 'update_crm'],
                'is_terminal': True,
                'max_turns': 1
            }
        ]

        transitions = [
            # From greeting
            {
                'from': 'greeting',
                'to': 'identify_issue',
                'condition': 'intent_detected == True',
                'priority': 1
            },

            # From identify_issue
            {
                'from': 'identify_issue',
                'to': 'resolve_issue',
                'condition': 'can_resolve == True',
                'priority': 1
            },
            {
                'from': 'identify_issue',
                'to': 'transfer_decision',
                'condition': 'needs_specialist == True',
                'priority': 2
            },

            # From resolve_issue
            {
                'from': 'resolve_issue',
                'to': 'closing',
                'condition': 'issue_resolved == True',
                'priority': 1
            },
            {
                'from': 'resolve_issue',
                'to': 'transfer_decision',
                'condition': 'issue_resolved == False and attempts >= 3',
                'priority': 2
            },

            # From transfer_decision
            {
                'from': 'transfer_decision',
                'to': 'closing',
                'condition': 'transfer_completed == True',
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
            "I'm sorry, I didn't quite catch that. Could you say that again?",
            "Hmm, I'm not sure I understood. Can you rephrase that for me?",
            "Let me make sure I got that right. You said...",
            "I want to help, but I need a bit more information. Can you tell me more?",
        ]

    def get_transfer_phrases(self) -> List[str]:
        """Get phrases for transferring calls."""
        return [
            "You know what, this sounds like something our specialist team should handle. Let me connect you with them right now.",
            "I want to make sure you get the best help possible. I'm going to transfer you to someone who can assist you better.",
            "This is a bit outside what I can do, but I have a colleague who's perfect for this. One moment while I connect you.",
        ]

    def get_closing_phrases(self) -> List[str]:
        """Get phrases for ending calls."""
        return [
            "Is there anything else I can help you with today?",
            "Great! I'm glad I could help. Have a wonderful day!",
            "Perfect. If you need anything else, just give us a call. Take care!",
        ]
