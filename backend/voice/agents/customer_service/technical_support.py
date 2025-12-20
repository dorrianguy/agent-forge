"""
Technical Support Voice Agent

Tier 1 technical support for troubleshooting and guided diagnostics.
Walks customers through solutions step-by-step with patience.
"""

from typing import List, Dict, Any
from ..voice_agent_types import VoiceAgentType


class TechnicalSupportAgent:
    """
    Technical support voice agent for troubleshooting.

    Capabilities:
    - Step-by-step troubleshooting guidance
    - Technical diagnostics and resolution
    - Clear, jargon-free explanations
    - DTMF navigation for IVR systems
    - SMS follow-up for documentation
    - Escalation to tier 2 support
    """

    agent_type = VoiceAgentType.VOICE_TECHNICAL_SUPPORT

    def __init__(self):
        self.agent_id = "technical_support_001"
        self.name = "Technical Support Agent"

    def get_system_prompt(self) -> str:
        """
        Get voice-optimized system prompt.
        Patient, clear, step-by-step guidance.
        """
        return """You are a technical support agent. You help customers troubleshoot technical issues step by step. Be patient and clear. Use simple language, not jargon. Guide customers through each step carefully. Wait for them to complete each action. If the issue is complex, escalate to tier 2 support. Always summarize what was fixed."""

    def get_greeting(self) -> str:
        """Get initial greeting message."""
        return "Hello! Thanks for reaching out to tech support. I'm here to help you solve this. What's going on with your device or service?"

    def get_available_functions(self) -> List[str]:
        """
        Get list of available functions for this agent.
        """
        return [
            "lookup_customer",      # Look up customer and device info
            "extract_variable",    # Extract error codes, device info
            "call_api",           # Check system status, run diagnostics
            "send_dtmf",          # Navigate IVR systems
            "send_sms",           # Send troubleshooting links/docs
            "transfer_call",      # Transfer to tier 2 or specialist
            "agent_transfer",     # Transfer to different AI agent
            "update_crm",         # Log troubleshooting steps
        ]

    def get_state_machine_config(self) -> Dict[str, Any]:
        """
        Get state machine configuration for troubleshooting flow.

        States:
        - greeting: Initial greeting and issue identification
        - gather_info: Collect device/system information
        - troubleshoot: Step-by-step troubleshooting
        - verify_fix: Confirm issue is resolved
        - escalate: Transfer to tier 2 if needed
        - closing: Summarize fix and close call
        """
        states = [
            {
                'id': 'greeting',
                'name': 'Greeting',
                'prompt': 'Greet the customer warmly. Ask them to describe the technical issue they are experiencing. Listen for key details like error messages or when it started.',
                'functions': ['lookup_customer', 'extract_variable'],
                'max_turns': 2
            },
            {
                'id': 'gather_info',
                'name': 'Gather Information',
                'prompt': 'Ask specific questions to understand the issue: What device? What error messages? When did it start? What have they tried already? Be patient and thorough.',
                'functions': ['extract_variable', 'call_api', 'lookup_customer'],
                'max_turns': 4
            },
            {
                'id': 'troubleshoot',
                'name': 'Troubleshoot',
                'prompt': 'Guide the customer through troubleshooting steps one at a time. Use simple language. Wait for them to complete each step before moving to the next. Confirm what they see or hear at each step.',
                'functions': ['call_api', 'send_dtmf', 'extract_variable'],
                'max_turns': 8
            },
            {
                'id': 'verify_fix',
                'name': 'Verify Fix',
                'prompt': 'Ask the customer to test the device or service. Confirm the issue is fully resolved. If not, continue troubleshooting or escalate.',
                'functions': ['extract_variable', 'call_api'],
                'max_turns': 3
            },
            {
                'id': 'escalate',
                'name': 'Escalate to Tier 2',
                'prompt': 'Explain that this issue needs deeper technical expertise. Summarize what you have tried. Transfer to tier 2 support with context.',
                'functions': ['transfer_call', 'agent_transfer', 'update_crm'],
                'max_turns': 2
            },
            {
                'id': 'closing',
                'name': 'Closing',
                'prompt': 'Summarize what was fixed. Send any helpful documentation via SMS. Thank the customer and ask if they need anything else.',
                'functions': ['send_sms', 'update_crm'],
                'is_terminal': True,
                'max_turns': 2
            }
        ]

        transitions = [
            # From greeting
            {
                'from': 'greeting',
                'to': 'gather_info',
                'condition': 'issue_identified == True',
                'priority': 1
            },

            # From gather_info
            {
                'from': 'gather_info',
                'to': 'troubleshoot',
                'condition': 'has_device_info == True',
                'priority': 1
            },
            {
                'from': 'gather_info',
                'to': 'escalate',
                'condition': 'issue_too_complex == True',
                'priority': 2
            },

            # From troubleshoot
            {
                'from': 'troubleshoot',
                'to': 'verify_fix',
                'condition': 'troubleshooting_complete == True',
                'priority': 1
            },
            {
                'from': 'troubleshoot',
                'to': 'escalate',
                'condition': 'troubleshooting_failed == True or attempts >= 5',
                'priority': 2
            },

            # From verify_fix
            {
                'from': 'verify_fix',
                'to': 'closing',
                'condition': 'issue_resolved == True',
                'priority': 1
            },
            {
                'from': 'verify_fix',
                'to': 'troubleshoot',
                'condition': 'issue_resolved == False and attempts < 3',
                'priority': 2
            },
            {
                'from': 'verify_fix',
                'to': 'escalate',
                'condition': 'issue_resolved == False and attempts >= 3',
                'priority': 3
            },

            # From escalate
            {
                'from': 'escalate',
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
            "Okay, let me think about that for a second... Can you describe what you're seeing on your screen?",
            "Hmm, that's interesting. Walk me through exactly what happened before this started.",
            "I want to make sure I understand the issue. So you're saying...",
            "Got it. Let's try something. Can you...",
        ]

    def get_transfer_phrases(self) -> List[str]:
        """Get phrases for transferring calls."""
        return [
            "This looks like a more advanced issue. I'm going to connect you with our tier 2 team who can dig deeper into this.",
            "Actually, this might need some backend access. Let me transfer you to an engineer who can check that.",
            "I think we need to escalate this. Hold on while I get you to someone with more tools to help.",
        ]

    def get_closing_phrases(self) -> List[str]:
        """Get phrases for ending calls."""
        return [
            "Awesome! It sounds like that fixed it. Is everything working now?",
            "Perfect. Let me know if it acts up again. We're here if you need us!",
            "Great work walking through that with me. Anything else I can help with?",
        ]
