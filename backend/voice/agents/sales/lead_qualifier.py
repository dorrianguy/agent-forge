"""
Lead Qualifier Voice Agent
Handles inbound lead qualification with BANT scoring and demo scheduling.
"""

from typing import Dict, Any, List, Optional
from datetime import datetime
import logging

from ..voice_agent_types import VoiceAgentType, VoiceAgentCapability
from ...state_machine import VoiceStateMachine, ConversationState, StateTransition, create_simple_state_machine
from ...functions import VoiceFunctionRegistry

logger = logging.getLogger(__name__)


class LeadQualifierAgent:
    """
    Lead Qualification Agent

    Handles inbound leads with BANT scoring:
    - Budget: Qualify financial capability
    - Authority: Identify decision maker
    - Need: Understand pain points
    - Timeline: Determine urgency

    Capabilities:
    - BANT qualification
    - Demo scheduling via Cal.com
    - CRM integration
    - Lead scoring and routing
    """

    agent_type = VoiceAgentType.VOICE_LEAD_QUALIFIER

    def __init__(self, agent_id: str, config: Optional[Dict[str, Any]] = None):
        """
        Initialize Lead Qualifier Agent.

        Args:
            agent_id: Unique agent identifier
            config: Optional configuration overrides
        """
        self.agent_id = agent_id
        self.config = config or {}
        self.function_registry = VoiceFunctionRegistry()

        # BANT scoring weights
        self.bant_weights = {
            "budget": 0.3,
            "authority": 0.25,
            "need": 0.3,
            "timeline": 0.15
        }

        # Initialize state machine
        self.state_machine = self._build_state_machine()

    def get_system_prompt(self, state: Optional[str] = None) -> str:
        """
        Get system prompt for the current conversation state.

        Args:
            state: Optional specific state to get prompt for

        Returns:
            System prompt string
        """
        if state == "greeting":
            return """You are a professional lead qualification specialist for our company.

Your role is to:
1. Greet inbound leads warmly and professionally
2. Understand what brought them to contact us
3. Begin the qualification process naturally

Keep the conversation friendly and consultative. You're here to help determine if we're a good fit for their needs.

Start by introducing yourself and asking how you can help them today."""

        elif state == "discover_need":
            return """You are gathering information about the lead's needs and pain points.

Ask open-ended questions to understand:
- What challenges are they facing?
- What are they trying to accomplish?
- What solutions have they tried?
- What would success look like?

Be empathetic and genuinely curious. Take notes on specific pain points that our solution addresses.

Extract and confirm their primary need before moving to budget discussion."""

        elif state == "qualify_budget":
            return """You are qualifying the lead's budget and financial capability.

Ask tactfully about:
- What budget range they've allocated for solving this problem
- Whether budget has been approved
- Who controls the budget
- What ROI they expect

Be professional and matter-of-fact. Budget is a normal part of business discussion.

IMPORTANT: Extract budget_range (low/medium/high) and budget_approved (yes/no)."""

        elif state == "identify_authority":
            return """You are identifying the decision-making authority.

Determine:
- Who will make the final decision?
- Are they the decision maker or influencer?
- Who else needs to be involved?
- What's the approval process?

Be respectful and collaborative. Frame it as understanding how to best serve them.

Extract decision_maker_role and stakeholders_count."""

        elif state == "assess_timeline":
            return """You are assessing the lead's timeline and urgency.

Understand:
- When do they need a solution in place?
- What's driving the timeline?
- Are there any deadlines or events?
- What happens if they don't solve this soon?

Extract timeline_urgency (immediate/weeks/months/exploring) and deadline if applicable."""

        elif state == "calculate_score":
            return """You are calculating the BANT lead score and determining next steps.

Based on the qualification:
- High score (70-100): Qualified lead, schedule demo immediately
- Medium score (40-69): Nurture lead, schedule exploratory call
- Low score (0-39): Not qualified, provide resources

Be transparent about the next steps and why they make sense.

Use the lookup_customer and update_crm functions to record the qualification."""

        elif state == "schedule_demo":
            return """You are scheduling a product demo with a qualified lead.

Steps:
1. Check available time slots using check_availability
2. Offer 3-5 options in their preferred timeframe
3. Confirm their contact details (email, phone)
4. Book the appointment using book_appointment
5. Send confirmation via SMS

Be enthusiastic about the demo. This is a high-value lead!

After booking, thank them and set expectations for the demo."""

        elif state == "nurture":
            return """You are setting up a nurture sequence for a medium-qualified lead.

Actions:
1. Acknowledge they're exploring options
2. Offer to send relevant resources
3. Suggest a follow-up call in 1-2 weeks
4. Get permission for email/SMS follow-up

Update CRM with nurture status and follow-up date.

Keep the door open and be helpful."""

        elif state == "disqualify":
            return """You are politely disqualifying a low-scoring lead.

Be professional and helpful:
1. Thank them for their time
2. Explain why it might not be the right fit (if appropriate)
3. Offer alternative resources or referrals
4. Leave the door open for future contact

Update CRM with disqualified status and reason.

End the call gracefully."""

        else:
            return """You are a lead qualification specialist helping determine if prospects are a good fit for our solution.

Use the BANT framework (Budget, Authority, Need, Timeline) to qualify leads effectively.

Your goal is to:
1. Build rapport quickly
2. Uncover genuine needs
3. Assess fit objectively
4. Schedule demos with qualified leads
5. Nurture or politely decline others

Be professional, empathetic, and consultative. Quality over quantity."""

    def get_greeting(self) -> str:
        """Get the agent's initial greeting."""
        return "Hi! Thanks for reaching out. My name is Sarah, and I'm with the sales team. I'd love to learn more about what brought you to us today and see how we might be able to help. How are you doing?"

    def get_available_functions(self, state: Optional[str] = None) -> List[str]:
        """
        Get available function tools for the current state.

        Args:
            state: Optional specific state

        Returns:
            List of function names available in this state
        """
        # Base functions available in all states
        base_functions = [
            "extract_variable",
            "lookup_customer",
            "update_crm",
        ]

        # State-specific functions
        state_functions = {
            "schedule_demo": [
                "check_availability",
                "book_appointment",
                "send_sms",
            ],
            "calculate_score": [
                "call_api",  # For custom scoring webhooks
            ],
            "nurture": [
                "send_sms",
                "call_api",  # For adding to nurture sequence
            ],
            "disqualify": [
                "send_sms",
            ],
        }

        functions = base_functions.copy()
        if state and state in state_functions:
            functions.extend(state_functions[state])

        return functions

    def _build_state_machine(self) -> VoiceStateMachine:
        """Build the lead qualification conversation flow state machine."""

        states = [
            {
                "id": "greeting",
                "name": "Greeting & Discovery",
                "prompt": self.get_system_prompt("greeting"),
                "functions": self.get_available_functions("greeting"),
                "max_turns": 3,
            },
            {
                "id": "discover_need",
                "name": "Discover Need",
                "prompt": self.get_system_prompt("discover_need"),
                "functions": self.get_available_functions("discover_need"),
                "max_turns": 5,
            },
            {
                "id": "qualify_budget",
                "name": "Qualify Budget",
                "prompt": self.get_system_prompt("qualify_budget"),
                "functions": self.get_available_functions("qualify_budget"),
                "max_turns": 4,
            },
            {
                "id": "identify_authority",
                "name": "Identify Authority",
                "prompt": self.get_system_prompt("identify_authority"),
                "functions": self.get_available_functions("identify_authority"),
                "max_turns": 3,
            },
            {
                "id": "assess_timeline",
                "name": "Assess Timeline",
                "prompt": self.get_system_prompt("assess_timeline"),
                "functions": self.get_available_functions("assess_timeline"),
                "max_turns": 3,
            },
            {
                "id": "calculate_score",
                "name": "Calculate BANT Score",
                "prompt": self.get_system_prompt("calculate_score"),
                "functions": self.get_available_functions("calculate_score"),
                "max_turns": 1,
            },
            {
                "id": "schedule_demo",
                "name": "Schedule Demo",
                "prompt": self.get_system_prompt("schedule_demo"),
                "functions": self.get_available_functions("schedule_demo"),
                "max_turns": 5,
                "is_terminal": True,
            },
            {
                "id": "nurture",
                "name": "Nurture Lead",
                "prompt": self.get_system_prompt("nurture"),
                "functions": self.get_available_functions("nurture"),
                "max_turns": 3,
                "is_terminal": True,
            },
            {
                "id": "disqualify",
                "name": "Disqualify Lead",
                "prompt": self.get_system_prompt("disqualify"),
                "functions": self.get_available_functions("disqualify"),
                "max_turns": 2,
                "is_terminal": True,
            },
        ]

        transitions = [
            # From greeting to need discovery
            {
                "from": "greeting",
                "to": "discover_need",
                "condition": "intent == 'interested' or turn_count >= 2",
                "priority": 1,
            },

            # From need to budget
            {
                "from": "discover_need",
                "to": "qualify_budget",
                "condition": "has_need == True",
                "priority": 1,
            },

            # From budget to authority
            {
                "from": "qualify_budget",
                "to": "identify_authority",
                "condition": "budget_range is not None",
                "priority": 1,
            },

            # From authority to timeline
            {
                "from": "identify_authority",
                "to": "assess_timeline",
                "condition": "decision_maker_role is not None",
                "priority": 1,
            },

            # From timeline to scoring
            {
                "from": "assess_timeline",
                "to": "calculate_score",
                "condition": "timeline_urgency is not None",
                "priority": 1,
            },

            # From scoring to outcomes
            {
                "from": "calculate_score",
                "to": "schedule_demo",
                "condition": "bant_score >= 70",
                "priority": 1,
            },
            {
                "from": "calculate_score",
                "to": "nurture",
                "condition": "bant_score >= 40 and bant_score < 70",
                "priority": 2,
            },
            {
                "from": "calculate_score",
                "to": "disqualify",
                "condition": "bant_score < 40",
                "priority": 3,
            },
        ]

        return create_simple_state_machine(
            agent_id=self.agent_id,
            states=states,
            transitions=transitions,
            initial_state_id="greeting"
        )

    def calculate_bant_score(self, context: Dict[str, Any]) -> int:
        """
        Calculate BANT score from 0-100 based on qualification data.

        Args:
            context: Conversation context with extracted variables

        Returns:
            BANT score (0-100)
        """
        score = 0

        # Budget scoring (30 points)
        budget_range = context.get("budget_range", "").lower()
        budget_approved = context.get("budget_approved", False)

        if budget_range == "high":
            score += 25
        elif budget_range == "medium":
            score += 15
        elif budget_range == "low":
            score += 5

        if budget_approved:
            score += 5

        # Authority scoring (25 points)
        decision_maker = context.get("decision_maker_role", "").lower()

        if "ceo" in decision_maker or "founder" in decision_maker or "owner" in decision_maker:
            score += 25
        elif "vp" in decision_maker or "director" in decision_maker or "head" in decision_maker:
            score += 20
        elif "manager" in decision_maker:
            score += 15
        else:
            score += 5

        # Need scoring (30 points)
        has_need = context.get("has_need", False)
        pain_level = context.get("pain_level", "").lower()

        if has_need:
            score += 10

        if pain_level == "critical":
            score += 20
        elif pain_level == "high":
            score += 15
        elif pain_level == "medium":
            score += 10
        else:
            score += 5

        # Timeline scoring (15 points)
        timeline = context.get("timeline_urgency", "").lower()

        if timeline == "immediate":
            score += 15
        elif timeline == "weeks":
            score += 12
        elif timeline == "months":
            score += 8
        else:
            score += 3

        return min(score, 100)  # Cap at 100

    def get_capabilities(self) -> List[VoiceAgentCapability]:
        """Get the capabilities of this agent."""
        return [
            VoiceAgentCapability.INBOUND_CALLS,
            VoiceAgentCapability.CALENDAR_BOOKING,
            VoiceAgentCapability.CRM_INTEGRATION,
            VoiceAgentCapability.SENTIMENT_ANALYSIS,
            VoiceAgentCapability.INTENT_DETECTION,
            VoiceAgentCapability.SMS_FOLLOWUP,
        ]

    def get_metadata(self) -> Dict[str, Any]:
        """Get agent metadata."""
        return {
            "name": "Lead Qualifier Agent",
            "description": "Inbound lead qualification with BANT scoring and demo scheduling",
            "category": "sales",
            "avg_call_duration": 300,  # 5 minutes
            "default_voice": "onyx",
            "qualification_framework": "BANT",
        }
