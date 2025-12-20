"""
Outbound Sales Voice Agent
Handles cold calling, product pitches, and objection handling.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime
import logging

from ..voice_agent_types import VoiceAgentType, VoiceAgentCapability
from ...state_machine import VoiceStateMachine, ConversationState, StateTransition, create_simple_state_machine
from ...functions import VoiceFunctionRegistry

logger = logging.getLogger(__name__)


class OutboundSalesAgent:
    """
    Outbound Sales Agent

    Handles cold calling and outbound sales with:
    - Permission-based calling (TCPA compliant)
    - Answering machine detection
    - Value proposition delivery
    - Objection handling
    - Appointment setting

    Capabilities:
    - Outbound cold calling
    - Multi-touch follow-up
    - AMD handling
    - Call consent tracking
    - CRM integration
    """

    agent_type = VoiceAgentType.VOICE_OUTBOUND_SALES

    def __init__(self, agent_id: str, config: Optional[Dict[str, Any]] = None):
        """
        Initialize Outbound Sales Agent.

        Args:
            agent_id: Unique agent identifier
            config: Optional configuration overrides
        """
        self.agent_id = agent_id
        self.config = config or {}
        self.function_registry = VoiceFunctionRegistry()

        # Common objections and responses
        self.objection_handlers = {
            "not_interested": "I understand. Can I ask what specifically doesn't interest you? That helps us serve you better in the future.",
            "too_busy": "I completely understand - everyone's busy these days. That's actually why I'm calling. Would a quick 2-minute overview work, or should I schedule a better time?",
            "already_have_solution": "Great! I'm glad you have something in place. Can I ask what you're currently using? I'd love to see if we might complement what you already have.",
            "no_budget": "Budget is always a consideration. Can I ask - if budget weren't an issue, would this be something worth exploring?",
            "send_info": "I'd be happy to send information. To make sure I send the most relevant materials, can I ask you 2 quick questions about your situation?",
            "call_back": "Of course! When would be a better time to reach you? I want to make sure we connect when you have a few minutes to chat.",
        }

        # Initialize state machine
        self.state_machine = self._build_state_machine()

    def get_system_prompt(self, state: Optional[str] = None) -> str:
        """Get system prompt for the current conversation state."""

        if state == "intro":
            return """You are a professional outbound sales representative making a cold call.

Your opening should:
1. Introduce yourself and company briefly (under 10 seconds)
2. Ask permission to continue the call
3. State the purpose clearly and concisely
4. Create curiosity without overselling

Example structure:
"Hi [Name], this is [Your Name] with [Company]. Do you have a quick moment? I'm calling because [brief value prop]. Is this something you might be interested in hearing more about?"

CRITICAL: If they say "no" or seem rushed, respect that immediately. Offer to call back at a better time.

Extract call_consent (yes/no) and continue only if yes."""

        elif state == "qualify":
            return """You are qualifying the prospect to ensure they're a good fit.

Quick qualification questions:
1. Do they have the problem you solve?
2. Are they the right contact?
3. Is timing appropriate?

Be brief and conversational. This isn't an interrogation - you're trying to help them determine if this is worth their time.

Extract is_qualified (yes/no) and qualification_reason."""

        elif state == "pitch":
            return """You are delivering your value proposition pitch.

Structure:
1. Problem: What challenge they're likely facing
2. Agitate: Why this matters and costs of inaction
3. Solution: How your product solves it
4. Proof: Quick credibility (customer results, data)
5. Call to action: Next step

Keep it under 60 seconds. Focus on outcomes, not features.

Be conversational and pause for questions. This is a dialogue, not a monologue.

Watch for buying signals or objections."""

        elif state == "handle_objection":
            return """You are handling objections professionally and empathetically.

Framework:
1. Listen: Let them finish completely
2. Acknowledge: "I understand..." or "That's a fair point..."
3. Clarify: Ask a question to understand the real concern
4. Respond: Address the underlying issue
5. Confirm: "Does that make sense?" or "How does that sound?"

Common objections you might hear:
- Not interested
- Too busy right now
- Already have a solution
- No budget
- Just send me information
- Call me back later

Never argue. Your goal is to understand and guide, not to win a debate.

Extract objection_type and objection_handled (yes/no)."""

        elif state == "close":
            return """You are closing for the next step (not the sale).

Next steps might be:
- Schedule a demo
- Set up a discovery call
- Send a proposal
- Introduce them to account executive
- Trial signup

Use assumptive closing:
"Let me get you on the calendar for a quick demo. I have Thursday at 2pm or Friday at 11am - which works better for you?"

If they resist, use trial close:
"On a scale of 1-10, how interested are you in solving [problem]? What would it take to get you to a 10?"

Be direct but not pushy. Confidence, not aggression.

Use book_appointment if they agree to next steps."""

        elif state == "voicemail":
            return """You've reached a voicemail. Leave a compelling message.

Voicemail structure (under 30 seconds):
1. Name and company
2. Brief reason for calling (value-focused)
3. Call to action
4. Your phone number (say it slowly, twice)

Example:
"Hi [Name], this is [You] with [Company]. I'm calling because we've helped companies like yours [specific outcome]. I'd love to share how we might do the same for you. Give me a call back at [number], that's [number again]. Thanks!"

Use send_sms to follow up with a text message after leaving voicemail.

Mark the call for follow-up in 2-3 days."""

        elif state == "followup":
            return """You are following up on a previous call, voicemail, or interest.

Reference the previous interaction:
"Hi [Name], it's [You] again from [Company]. I called a few days ago about [topic]. Do you have a moment now to chat briefly?"

OR if they requested a callback:
"Hi [Name], you asked me to call back today. Is now still a good time?"

Be persistent but respectful. If this is touch #3+ with no engagement, consider offering to remove them from your list.

Track follow-up attempts in CRM."""

        else:
            return """You are an outbound sales representative making cold calls to generate interest and book appointments.

Your goals:
1. Get permission to have the conversation
2. Qualify quickly (don't waste their time or yours)
3. Deliver value proposition clearly
4. Handle objections professionally
5. Close for next step

Core principles:
- Respect their time
- Be genuinely helpful
- Listen more than you talk
- No high-pressure tactics
- Track everything in CRM

Remember: You're interrupting their day. Make it worth their time or let them go gracefully.

Compliance: Always honor Do Not Call lists and TCPA regulations."""

    def get_greeting(self) -> str:
        """Get the agent's initial greeting for outbound calls."""
        return "Hi, is this {prospect_name}? This is Mike from {company_name}. How are you doing today?"

    def get_available_functions(self, state: Optional[str] = None) -> List[str]:
        """Get available function tools for the current state."""

        base_functions = [
            "lookup_customer",
            "update_crm",
            "extract_variable",
        ]

        state_functions = {
            "intro": [
                "call_api",  # For call consent logging
            ],
            "close": [
                "book_appointment",
                "check_availability",
                "send_sms",
            ],
            "voicemail": [
                "send_sms",
                "play_audio",  # For pre-recorded voicemail
            ],
            "followup": [
                "send_sms",
                "call_api",  # For updating follow-up sequences
            ],
        }

        functions = base_functions.copy()
        if state and state in state_functions:
            functions.extend(state_functions[state])

        return functions

    def _build_state_machine(self) -> VoiceStateMachine:
        """Build the outbound sales conversation flow state machine."""

        states = [
            {
                "id": "intro",
                "name": "Introduction & Permission",
                "prompt": self.get_system_prompt("intro"),
                "functions": self.get_available_functions("intro"),
                "max_turns": 2,
            },
            {
                "id": "qualify",
                "name": "Quick Qualification",
                "prompt": self.get_system_prompt("qualify"),
                "functions": self.get_available_functions("qualify"),
                "max_turns": 3,
            },
            {
                "id": "pitch",
                "name": "Value Proposition",
                "prompt": self.get_system_prompt("pitch"),
                "functions": self.get_available_functions("pitch"),
                "max_turns": 4,
            },
            {
                "id": "handle_objection",
                "name": "Objection Handling",
                "prompt": self.get_system_prompt("handle_objection"),
                "functions": self.get_available_functions("handle_objection"),
                "max_turns": 3,
            },
            {
                "id": "close",
                "name": "Close for Next Step",
                "prompt": self.get_system_prompt("close"),
                "functions": self.get_available_functions("close"),
                "max_turns": 5,
                "is_terminal": True,
            },
            {
                "id": "voicemail",
                "name": "Voicemail Message",
                "prompt": self.get_system_prompt("voicemail"),
                "functions": self.get_available_functions("voicemail"),
                "max_turns": 1,
                "is_terminal": True,
            },
            {
                "id": "followup",
                "name": "Follow-up Call",
                "prompt": self.get_system_prompt("followup"),
                "functions": self.get_available_functions("followup"),
                "max_turns": 2,
            },
        ]

        transitions = [
            # From intro
            {
                "from": "intro",
                "to": "qualify",
                "condition": "call_consent == True",
                "priority": 1,
            },
            {
                "from": "intro",
                "to": "voicemail",
                "condition": "amd_detected == True",
                "priority": 1,
            },
            {
                "from": "intro",
                "to": "close",
                "condition": "call_consent == False",
                "priority": 2,
            },

            # From qualify
            {
                "from": "qualify",
                "to": "pitch",
                "condition": "is_qualified == True",
                "priority": 1,
            },
            {
                "from": "qualify",
                "to": "close",
                "condition": "is_qualified == False",
                "priority": 2,
            },

            # From pitch
            {
                "from": "pitch",
                "to": "close",
                "condition": "interest_level == 'high'",
                "priority": 1,
            },
            {
                "from": "pitch",
                "to": "handle_objection",
                "condition": "has_objection == True",
                "priority": 2,
            },

            # From objection handling
            {
                "from": "handle_objection",
                "to": "pitch",
                "condition": "objection_handled == True",
                "priority": 1,
            },
            {
                "from": "handle_objection",
                "to": "close",
                "condition": "objection_handled == False",
                "priority": 2,
            },

            # From follow-up
            {
                "from": "followup",
                "to": "qualify",
                "condition": "previous_call_consent == True",
                "priority": 1,
            },
        ]

        return create_simple_state_machine(
            agent_id=self.agent_id,
            states=states,
            transitions=transitions,
            initial_state_id="intro"
        )

    def get_objection_response(self, objection_type: str) -> str:
        """
        Get pre-defined response for common objections.

        Args:
            objection_type: Type of objection raised

        Returns:
            Suggested response
        """
        return self.objection_handlers.get(
            objection_type,
            "I understand. Can you tell me more about that concern?"
        )

    def get_capabilities(self) -> List[VoiceAgentCapability]:
        """Get the capabilities of this agent."""
        return [
            VoiceAgentCapability.OUTBOUND_CALLS,
            VoiceAgentCapability.AMD_DETECTION,
            VoiceAgentCapability.SMS_FOLLOWUP,
            VoiceAgentCapability.CRM_INTEGRATION,
            VoiceAgentCapability.CALL_CONSENT,
            VoiceAgentCapability.SENTIMENT_ANALYSIS,
            VoiceAgentCapability.INTENT_DETECTION,
            VoiceAgentCapability.CALENDAR_BOOKING,
        ]

    def get_metadata(self) -> Dict[str, Any]:
        """Get agent metadata."""
        return {
            "name": "Outbound Sales Agent",
            "description": "Cold calling, product pitches, and objection handling",
            "category": "sales",
            "avg_call_duration": 180,  # 3 minutes
            "default_voice": "fable",
            "call_type": "outbound",
            "compliance": ["TCPA", "Do Not Call Registry"],
        }
