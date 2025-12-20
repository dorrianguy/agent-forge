"""
Call Router for Agent Forge Voice

Intelligent call routing engine that selects the optimal voice agent based on:
- Phone number mapping (direct line assignments)
- Time-based routing (business hours, overflow)
- Caller history (previous interactions, sentiment)
- IVR menu navigation (DTMF choices)
- Agent pool availability (capacity management)
"""

import logging
from enum import Enum
from dataclasses import dataclass, field
from datetime import datetime, time
from typing import Dict, Any, Optional, List, Callable
import re

from ..agents.voice_agent_types import VoiceAgentType

logger = logging.getLogger(__name__)


class RoutingStrategy(Enum):
    """Call routing strategies"""
    DIRECT_LINE = "direct_line"                    # Phone number → specific agent
    BUSINESS_HOURS = "business_hours"              # Route by time of day
    ROUND_ROBIN = "round_robin"                    # Distribute evenly across pool
    CALLER_HISTORY = "caller_history"              # Route based on past interactions
    IVR_MENU = "ivr_menu"                          # DTMF-based menu selection
    SKILL_BASED = "skill_based"                    # Match caller needs to agent type
    PRIORITY = "priority"                          # VIP/high-value caller routing
    OVERFLOW = "overflow"                          # Escalate when primary busy
    GEOGRAPHIC = "geographic"                      # Route by caller area code
    LANGUAGE = "language"                          # Route by detected language


class IVRMenuType(Enum):
    """IVR menu types"""
    MAIN_MENU = "main_menu"
    DEPARTMENT_SELECT = "department_select"
    AGENT_SELECT = "agent_select"
    CONFIRMATION = "confirmation"
    CALLBACK_REQUEST = "callback_request"


@dataclass
class RoutingContext:
    """
    Context information for routing decisions.
    Built from Twilio webhook parameters + database lookups.
    """
    # Call identifiers
    call_sid: str
    from_number: str
    to_number: str

    # Caller information
    caller_id: Optional[str] = None                # Database user ID if known
    caller_name: Optional[str] = None
    caller_country: Optional[str] = None
    caller_state: Optional[str] = None
    caller_city: Optional[str] = None

    # Call history
    previous_calls: int = 0
    last_call_date: Optional[datetime] = None
    last_agent_id: Optional[str] = None
    last_agent_type: Optional[VoiceAgentType] = None
    avg_sentiment_score: Optional[float] = None
    total_call_duration: int = 0                   # Lifetime total in seconds

    # Call characteristics
    is_business_hours: bool = True
    caller_timezone: Optional[str] = None
    detected_language: str = "en"

    # IVR navigation
    ivr_digit_input: Optional[str] = None          # DTMF digits pressed
    ivr_menu_level: int = 0                        # Menu depth
    ivr_menu_type: Optional[IVRMenuType] = None

    # Priority flags
    is_vip: bool = False
    is_callback_request: bool = False
    priority_level: int = 0                        # 0=normal, 1=high, 2=urgent

    # Metadata
    custom_data: Dict[str, Any] = field(default_factory=dict)
    timestamp: datetime = field(default_factory=datetime.now)


@dataclass
class RoutingRule:
    """
    A routing rule that maps conditions to agent types.
    Rules are evaluated in priority order.
    """
    name: str
    priority: int                                  # Lower = higher priority
    strategy: RoutingStrategy
    target_agent_type: VoiceAgentType

    # Condition functions (return True if rule applies)
    phone_number_pattern: Optional[str] = None     # Regex for to_number
    business_hours_start: Optional[time] = None
    business_hours_end: Optional[time] = None
    min_previous_calls: Optional[int] = None
    required_vip: bool = False
    required_language: Optional[str] = None
    ivr_digit_match: Optional[str] = None          # Match DTMF input
    area_code_prefix: Optional[str] = None         # Match from_number area code

    # Metadata
    description: str = ""
    enabled: bool = True

    def matches(self, context: RoutingContext) -> bool:
        """Check if this routing rule matches the given context"""
        if not self.enabled:
            return False

        # Phone number pattern match
        if self.phone_number_pattern:
            if not re.match(self.phone_number_pattern, context.to_number):
                return False

        # Business hours check
        if self.business_hours_start and self.business_hours_end:
            now = datetime.now().time()
            if not (self.business_hours_start <= now <= self.business_hours_end):
                return False

        # Previous calls threshold
        if self.min_previous_calls is not None:
            if context.previous_calls < self.min_previous_calls:
                return False

        # VIP requirement
        if self.required_vip and not context.is_vip:
            return False

        # Language requirement
        if self.required_language:
            if context.detected_language != self.required_language:
                return False

        # IVR digit match
        if self.ivr_digit_match is not None:
            if context.ivr_digit_input != self.ivr_digit_match:
                return False

        # Area code match
        if self.area_code_prefix:
            if not context.from_number.startswith(self.area_code_prefix):
                return False

        # All conditions passed
        return True


class CallRouter:
    """
    Intelligent call routing engine.

    Routes incoming calls to the appropriate voice agent based on:
    - Configured routing rules (priority-ordered)
    - Caller history and context
    - Agent pool availability
    - Business logic
    """

    def __init__(self):
        self.routing_rules: List[RoutingRule] = []
        self.agent_pool: Dict[VoiceAgentType, List[str]] = {}  # agent_type → [agent_ids]
        self.round_robin_counters: Dict[VoiceAgentType, int] = {}

        # Callbacks for external data lookups
        self._caller_lookup_fn: Optional[Callable] = None
        self._agent_availability_fn: Optional[Callable] = None

        # Default fallback agent
        self.default_agent_type = VoiceAgentType.VOICE_CUSTOMER_SUPPORT

        logger.info("CallRouter initialized")

    def add_rule(self, rule: RoutingRule) -> None:
        """Add a routing rule to the router"""
        self.routing_rules.append(rule)
        # Keep rules sorted by priority (ascending)
        self.routing_rules.sort(key=lambda r: r.priority)
        logger.info(f"Added routing rule: {rule.name} (priority={rule.priority})")

    def remove_rule(self, rule_name: str) -> bool:
        """Remove a routing rule by name"""
        original_count = len(self.routing_rules)
        self.routing_rules = [r for r in self.routing_rules if r.name != rule_name]
        removed = len(self.routing_rules) < original_count
        if removed:
            logger.info(f"Removed routing rule: {rule_name}")
        return removed

    def set_caller_lookup(self, lookup_fn: Callable[[str], Optional[Dict[str, Any]]]) -> None:
        """
        Set callback function to lookup caller information.

        Args:
            lookup_fn: Function that takes phone number, returns caller dict or None
        """
        self._caller_lookup_fn = lookup_fn

    def set_agent_availability_check(
        self,
        availability_fn: Callable[[VoiceAgentType], bool]
    ) -> None:
        """
        Set callback function to check agent availability.

        Args:
            availability_fn: Function that takes agent type, returns True if available
        """
        self._agent_availability_fn = availability_fn

    def register_agent_pool(
        self,
        agent_type: VoiceAgentType,
        agent_ids: List[str]
    ) -> None:
        """Register a pool of agents for a given type"""
        self.agent_pool[agent_type] = agent_ids
        self.round_robin_counters[agent_type] = 0
        logger.info(f"Registered agent pool: {agent_type.value} with {len(agent_ids)} agents")

    def route_call(
        self,
        from_number: str,
        to_number: str,
        context: Optional[Dict[str, Any]] = None
    ) -> VoiceAgentType:
        """
        Route a call to the appropriate voice agent type.

        Args:
            from_number: Caller's phone number
            to_number: Dialed phone number
            context: Optional additional context (Twilio params, etc.)

        Returns:
            VoiceAgentType to handle the call
        """
        # Build routing context
        routing_context = self._build_routing_context(
            from_number,
            to_number,
            context or {}
        )

        logger.info(
            f"Routing call from {from_number} to {to_number} "
            f"(VIP={routing_context.is_vip}, history={routing_context.previous_calls} calls)"
        )

        # Evaluate routing rules in priority order
        for rule in self.routing_rules:
            if rule.matches(routing_context):
                # Check if this agent type is available
                if self._is_agent_available(rule.target_agent_type):
                    logger.info(
                        f"Matched routing rule '{rule.name}' → {rule.target_agent_type.value}"
                    )
                    return rule.target_agent_type
                else:
                    logger.warning(
                        f"Rule '{rule.name}' matched but agent {rule.target_agent_type.value} unavailable"
                    )

        # No rules matched or agents unavailable - use default
        logger.info(f"Using default agent type: {self.default_agent_type.value}")
        return self.default_agent_type

    def _build_routing_context(
        self,
        from_number: str,
        to_number: str,
        extra_context: Dict[str, Any]
    ) -> RoutingContext:
        """Build a RoutingContext from available information"""
        context = RoutingContext(
            call_sid=extra_context.get('CallSid', ''),
            from_number=from_number,
            to_number=to_number,
        )

        # Lookup caller information if callback is set
        if self._caller_lookup_fn:
            caller_info = self._caller_lookup_fn(from_number)
            if caller_info:
                context.caller_id = caller_info.get('id')
                context.caller_name = caller_info.get('name')
                context.previous_calls = caller_info.get('call_count', 0)
                context.last_call_date = caller_info.get('last_call_date')
                context.last_agent_type = caller_info.get('last_agent_type')
                context.avg_sentiment_score = caller_info.get('avg_sentiment')
                context.total_call_duration = caller_info.get('total_duration', 0)
                context.is_vip = caller_info.get('is_vip', False)
                context.priority_level = caller_info.get('priority', 0)

        # Extract Twilio location data
        context.caller_country = extra_context.get('FromCountry')
        context.caller_state = extra_context.get('FromState')
        context.caller_city = extra_context.get('FromCity')

        # IVR navigation context
        context.ivr_digit_input = extra_context.get('Digits')

        # Detect language (if available)
        if 'language' in extra_context:
            context.detected_language = extra_context['language']

        # Business hours check (simplified - should use timezone-aware logic)
        now = datetime.now().time()
        context.is_business_hours = (
            time(8, 0) <= now <= time(18, 0)  # 8 AM - 6 PM
        )

        # Custom data passthrough
        context.custom_data = extra_context.get('custom_data', {})

        return context

    def _is_agent_available(self, agent_type: VoiceAgentType) -> bool:
        """Check if the agent type has capacity"""
        if self._agent_availability_fn:
            return self._agent_availability_fn(agent_type)

        # Fallback: check if we have agents in the pool
        return agent_type in self.agent_pool and len(self.agent_pool[agent_type]) > 0

    def select_agent_from_pool(
        self,
        agent_type: VoiceAgentType,
        strategy: str = "round_robin"
    ) -> Optional[str]:
        """
        Select a specific agent ID from the pool for this agent type.

        Args:
            agent_type: The agent type to select from
            strategy: Selection strategy (round_robin, random, least_busy)

        Returns:
            Agent ID or None if pool is empty
        """
        pool = self.agent_pool.get(agent_type, [])
        if not pool:
            return None

        if strategy == "round_robin":
            counter = self.round_robin_counters.get(agent_type, 0)
            agent_id = pool[counter % len(pool)]
            self.round_robin_counters[agent_type] = (counter + 1) % len(pool)
            return agent_id

        # Default to first agent
        return pool[0]

    def handle_ivr_input(
        self,
        menu_type: IVRMenuType,
        digit_input: str,
        context: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Process IVR menu input and determine next action.

        Args:
            menu_type: The current IVR menu type
            digit_input: DTMF digits pressed by caller
            context: Additional context

        Returns:
            Dict with 'action', 'agent_type', 'message', etc.
        """
        context = context or {}

        if menu_type == IVRMenuType.MAIN_MENU:
            # Main menu routing
            menu_map = {
                '1': VoiceAgentType.VOICE_CUSTOMER_SUPPORT,
                '2': VoiceAgentType.VOICE_TECHNICAL_SUPPORT,
                '3': VoiceAgentType.VOICE_BILLING_SUPPORT,
                '4': VoiceAgentType.VOICE_ORDER_STATUS,
                '9': None,  # Repeat menu
                '0': None,  # Operator/transfer
            }

            agent_type = menu_map.get(digit_input)

            if digit_input == '9':
                return {
                    'action': 'repeat_menu',
                    'message': 'Repeating main menu...'
                }
            elif digit_input == '0':
                return {
                    'action': 'transfer',
                    'target': 'operator',
                    'message': 'Transferring to an operator...'
                }
            elif agent_type:
                return {
                    'action': 'route',
                    'agent_type': agent_type,
                    'message': f'Routing to {agent_type.value}...'
                }
            else:
                return {
                    'action': 'invalid_input',
                    'message': 'Invalid selection. Please try again.'
                }

        elif menu_type == IVRMenuType.DEPARTMENT_SELECT:
            # Department selection (industry-specific)
            return {
                'action': 'route',
                'agent_type': VoiceAgentType.VOICE_CUSTOMER_SUPPORT,
                'message': 'Routing to selected department...'
            }

        elif menu_type == IVRMenuType.CONFIRMATION:
            # Yes/No confirmation
            if digit_input == '1':
                return {'action': 'confirm', 'confirmed': True}
            elif digit_input == '2':
                return {'action': 'confirm', 'confirmed': False}
            else:
                return {
                    'action': 'invalid_input',
                    'message': 'Please press 1 for yes or 2 for no.'
                }

        elif menu_type == IVRMenuType.CALLBACK_REQUEST:
            # Callback request handling
            if digit_input == '1':
                return {
                    'action': 'callback',
                    'callback_requested': True,
                    'message': 'We will call you back shortly.'
                }
            else:
                return {
                    'action': 'hold',
                    'message': 'Please hold while we connect you...'
                }

        # Default fallback
        return {
            'action': 'invalid_input',
            'message': 'Invalid input. Returning to main menu.'
        }

    def get_ivr_prompt(self, menu_type: IVRMenuType) -> str:
        """Get the text prompt for an IVR menu"""
        prompts = {
            IVRMenuType.MAIN_MENU: (
                "Thank you for calling. "
                "Press 1 for customer support, "
                "Press 2 for technical support, "
                "Press 3 for billing, "
                "Press 4 for order status, "
                "or press 0 to speak with an operator."
            ),
            IVRMenuType.CONFIRMATION: (
                "Press 1 to confirm, or press 2 to cancel."
            ),
            IVRMenuType.CALLBACK_REQUEST: (
                "All agents are currently busy. "
                "Press 1 to request a callback, or press 2 to hold."
            ),
        }
        return prompts.get(menu_type, "Please make a selection.")

    def get_routing_stats(self) -> Dict[str, Any]:
        """Get statistics about routing configuration and usage"""
        return {
            'total_rules': len(self.routing_rules),
            'enabled_rules': sum(1 for r in self.routing_rules if r.enabled),
            'agent_pool_size': {
                agent_type.value: len(agents)
                for agent_type, agents in self.agent_pool.items()
            },
            'default_agent': self.default_agent_type.value,
        }


def create_default_router() -> CallRouter:
    """
    Create a call router with sensible default routing rules.

    This provides a starting point that can be customized per deployment.
    """
    router = CallRouter()

    # Rule 1: VIP callers get priority routing
    router.add_rule(RoutingRule(
        name="vip_priority",
        priority=1,
        strategy=RoutingStrategy.PRIORITY,
        target_agent_type=VoiceAgentType.VOICE_CUSTOMER_SUPPORT,
        required_vip=True,
        description="Route VIP callers to premium support"
    ))

    # Rule 2: Business hours - main customer support
    router.add_rule(RoutingRule(
        name="business_hours_support",
        priority=10,
        strategy=RoutingStrategy.BUSINESS_HOURS,
        target_agent_type=VoiceAgentType.VOICE_CUSTOMER_SUPPORT,
        business_hours_start=time(8, 0),
        business_hours_end=time(18, 0),
        description="Standard business hours routing"
    ))

    # Rule 3: After hours - appointment setter
    router.add_rule(RoutingRule(
        name="after_hours_callback",
        priority=20,
        strategy=RoutingStrategy.BUSINESS_HOURS,
        target_agent_type=VoiceAgentType.VOICE_APPOINTMENT_SETTER,
        description="After hours - schedule callback"
    ))

    # Rule 4: Returning callers with history
    router.add_rule(RoutingRule(
        name="returning_caller",
        priority=15,
        strategy=RoutingStrategy.CALLER_HISTORY,
        target_agent_type=VoiceAgentType.VOICE_CUSTOMER_SUPPORT,
        min_previous_calls=1,
        description="Route returning callers to same agent type"
    ))

    logger.info("Created default router with 4 base rules")
    return router
