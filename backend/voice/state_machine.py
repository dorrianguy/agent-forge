"""
State Machine for Agent Forge Voice

Handles multi-prompt conversation flows with conditional transitions.
Enables complex dialogue management with state-dependent behavior.
"""

import os
import re
import json
import logging
import asyncio
from enum import Enum
from dataclasses import dataclass, field, asdict
from typing import Dict, Any, Optional, List, Tuple, Callable
from datetime import datetime
import uuid

logger = logging.getLogger(__name__)


# ==================== Data Classes ====================

@dataclass
class StateTransition:
    """
    Represents a conditional transition between conversation states.

    Attributes:
        target_state: The state ID to transition to
        condition: Expression or LLM-evaluated condition
        priority: Lower numbers = higher priority (evaluated first)
    """
    target_state: str
    condition: str
    priority: int = 100

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization"""
        return {
            'target_state': self.target_state,
            'condition': self.condition,
            'priority': self.priority
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'StateTransition':
        """Create from dictionary"""
        return cls(
            target_state=data['target_state'],
            condition=data['condition'],
            priority=data.get('priority', 100)
        )


@dataclass
class ConversationState:
    """
    Represents a single state in the conversation flow.

    Attributes:
        id: Unique state identifier
        name: Human-readable state name
        prompt: System prompt for this state
        functions: Available function tools in this state
        transitions: List of possible transitions
        on_enter: Optional action/function to execute on entering state
        on_exit: Optional action/function to execute on exiting state
        is_terminal: Whether this state ends the conversation
        max_turns: Optional limit on turns in this state
    """
    id: str
    name: str
    prompt: str
    functions: List[str] = field(default_factory=list)
    transitions: List[StateTransition] = field(default_factory=list)
    on_enter: Optional[str] = None
    on_exit: Optional[str] = None
    is_terminal: bool = False
    max_turns: Optional[int] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for serialization"""
        return {
            'id': self.id,
            'name': self.name,
            'prompt': self.prompt,
            'functions': self.functions,
            'transitions': [t.to_dict() for t in self.transitions],
            'on_enter': self.on_enter,
            'on_exit': self.on_exit,
            'is_terminal': self.is_terminal,
            'max_turns': self.max_turns,
            'metadata': self.metadata
        }

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'ConversationState':
        """Create from dictionary"""
        return cls(
            id=data['id'],
            name=data['name'],
            prompt=data['prompt'],
            functions=data.get('functions', []),
            transitions=[StateTransition.from_dict(t) for t in data.get('transitions', [])],
            on_enter=data.get('on_enter'),
            on_exit=data.get('on_exit'),
            is_terminal=data.get('is_terminal', False),
            max_turns=data.get('max_turns'),
            metadata=data.get('metadata', {})
        )


class TransitionResult(Enum):
    """Result of a transition evaluation"""
    CONTINUE = "continue"  # Stay in current state
    TRANSITION = "transition"  # Move to new state
    TERMINAL = "terminal"  # End conversation


# ==================== State Condition Evaluator ====================

class StateConditionEvaluator:
    """
    Evaluates state transition conditions.

    Supports:
    - Simple expressions: "intent == 'book_appointment'"
    - Logical operators: "intent == 'book' and confirmed == True"
    - Comparison operators: >, <, >=, <=, ==, !=
    - In operator: "intent in ['book', 'schedule']"
    - LLM evaluation for complex natural language conditions
    """

    def __init__(self, llm_evaluator: Optional[Callable] = None):
        """
        Initialize evaluator.

        Args:
            llm_evaluator: Optional async function for LLM-based evaluation
                          Should accept (condition: str, context: Dict) and return bool
        """
        self.llm_evaluator = llm_evaluator

        # Safe operators for eval
        self._safe_operators = {
            'and': lambda a, b: a and b,
            'or': lambda a, b: a or b,
            'not': lambda a: not a,
            'in': lambda a, b: a in b,
            '==': lambda a, b: a == b,
            '!=': lambda a, b: a != b,
            '>': lambda a, b: a > b,
            '<': lambda a, b: a < b,
            '>=': lambda a, b: a >= b,
            '<=': lambda a, b: a <= b,
        }

    async def evaluate(self, condition: str, context: Dict[str, Any]) -> bool:
        """
        Evaluate a condition against the context.

        Args:
            condition: Condition expression or natural language
            context: Context dictionary with variables

        Returns:
            True if condition is met, False otherwise
        """
        if not condition or condition.strip() == '':
            return True

        # Try simple expression evaluation first
        try:
            result = self._evaluate_simple_expression(condition, context)
            if result is not None:
                return result
        except Exception as e:
            logger.debug(f"Simple expression evaluation failed: {e}")

        # Fall back to LLM evaluation for complex conditions
        if self.llm_evaluator:
            try:
                return await self.llm_evaluator(condition, context)
            except Exception as e:
                logger.error(f"LLM condition evaluation failed: {e}")
                return False

        logger.warning(f"Could not evaluate condition: {condition}")
        return False

    def _evaluate_simple_expression(
        self,
        expression: str,
        context: Dict[str, Any]
    ) -> Optional[bool]:
        """
        Evaluate a simple expression using safe operations.

        Returns None if expression is too complex for simple evaluation.
        """
        # Normalize expression
        expr = expression.strip()

        # Handle boolean literals
        if expr.lower() == 'true':
            return True
        if expr.lower() == 'false':
            return False

        # Handle direct variable references
        if expr.isidentifier() and expr in context:
            value = context[expr]
            return bool(value) if not isinstance(value, bool) else value

        # Handle equality checks
        if '==' in expr:
            parts = [p.strip() for p in expr.split('==', 1)]
            if len(parts) == 2:
                left = self._resolve_value(parts[0], context)
                right = self._resolve_value(parts[1], context)
                return left == right

        # Handle inequality checks
        if '!=' in expr:
            parts = [p.strip() for p in expr.split('!=', 1)]
            if len(parts) == 2:
                left = self._resolve_value(parts[0], context)
                right = self._resolve_value(parts[1], context)
                return left != right

        # Handle 'in' operator
        if ' in ' in expr:
            parts = expr.split(' in ', 1)
            if len(parts) == 2:
                left = self._resolve_value(parts[0].strip(), context)
                right = self._resolve_value(parts[1].strip(), context)
                if isinstance(right, (list, tuple, set, str)):
                    return left in right

        # Handle comparison operators
        for op in ['>=', '<=', '>', '<']:
            if op in expr:
                parts = [p.strip() for p in expr.split(op, 1)]
                if len(parts) == 2:
                    left = self._resolve_value(parts[0], context)
                    right = self._resolve_value(parts[1], context)
                    if isinstance(left, (int, float)) and isinstance(right, (int, float)):
                        return self._safe_operators[op](left, right)

        # Handle logical AND
        if ' and ' in expr.lower():
            parts = re.split(r'\s+and\s+', expr, flags=re.IGNORECASE)
            results = []
            for part in parts:
                result = self._evaluate_simple_expression(part.strip(), context)
                if result is None:
                    return None
                results.append(result)
            return all(results)

        # Handle logical OR
        if ' or ' in expr.lower():
            parts = re.split(r'\s+or\s+', expr, flags=re.IGNORECASE)
            results = []
            for part in parts:
                result = self._evaluate_simple_expression(part.strip(), context)
                if result is None:
                    return None
                results.append(result)
            return any(results)

        # Handle logical NOT
        if expr.lower().startswith('not '):
            inner = expr[4:].strip()
            result = self._evaluate_simple_expression(inner, context)
            if result is not None:
                return not result

        # Too complex for simple evaluation
        return None

    def _resolve_value(self, expr: str, context: Dict[str, Any]) -> Any:
        """Resolve a value from expression or context"""
        expr = expr.strip()

        # Boolean literals
        if expr.lower() == 'true':
            return True
        if expr.lower() == 'false':
            return False

        # None/null
        if expr.lower() in ('none', 'null'):
            return None

        # String literals
        if (expr.startswith('"') and expr.endswith('"')) or \
           (expr.startswith("'") and expr.endswith("'")):
            return expr[1:-1]

        # Number literals
        try:
            if '.' in expr:
                return float(expr)
            return int(expr)
        except ValueError:
            pass

        # List literals
        if expr.startswith('[') and expr.endswith(']'):
            try:
                return json.loads(expr)
            except:
                pass

        # Variable reference
        if expr.isidentifier() and expr in context:
            return context[expr]

        # Nested attribute access (e.g., "user.name")
        if '.' in expr:
            parts = expr.split('.')
            value = context
            for part in parts:
                if isinstance(value, dict) and part in value:
                    value = value[part]
                elif hasattr(value, part):
                    value = getattr(value, part)
                else:
                    return None
            return value

        # Return as-is if can't resolve
        return expr


# ==================== Voice State Machine ====================

class VoiceStateMachine:
    """
    Manages conversation state and transitions for voice agents.

    Features:
    - Multi-state conversation flows
    - Conditional transitions with priority
    - State-dependent prompts and functions
    - Turn counting and terminal states
    - Enter/exit actions
    - Context management
    """

    def __init__(
        self,
        agent_id: str,
        states: List[ConversationState],
        initial_state_id: Optional[str] = None,
        llm_evaluator: Optional[Callable] = None,
        on_state_changed: Optional[Callable] = None
    ):
        """
        Initialize state machine.

        Args:
            agent_id: Agent this state machine belongs to
            states: List of conversation states
            initial_state_id: Starting state (defaults to first state)
            llm_evaluator: Optional LLM-based condition evaluator
            on_state_changed: Optional callback when state changes
        """
        self.agent_id = agent_id
        self.states: Dict[str, ConversationState] = {s.id: s for s in states}

        if not self.states:
            raise ValueError("State machine must have at least one state")

        self.initial_state_id = initial_state_id or states[0].id
        if self.initial_state_id not in self.states:
            raise ValueError(f"Initial state '{self.initial_state_id}' not found")

        self.current_state_id = self.initial_state_id
        self.previous_state_id: Optional[str] = None

        # State management
        self.turn_count = 0
        self.state_turn_count = 0
        self.conversation_id = str(uuid.uuid4())
        self.started_at = datetime.now()

        # Context for condition evaluation
        self.context: Dict[str, Any] = {}

        # History
        self.state_history: List[Tuple[str, datetime]] = []
        self.state_history.append((self.current_state_id, self.started_at))

        # Evaluator and callbacks
        self.evaluator = StateConditionEvaluator(llm_evaluator)
        self.on_state_changed = on_state_changed

        # Action registry
        self._action_registry: Dict[str, Callable] = {}

        logger.info(f"State machine initialized: {agent_id} starting at {self.initial_state_id}")

    # ==================== State Access ====================

    def get_current_state(self) -> ConversationState:
        """Get the current conversation state"""
        return self.states[self.current_state_id]

    def get_current_prompt(self) -> str:
        """Get the prompt for the current state"""
        return self.get_current_state().prompt

    def get_available_functions(self) -> List[str]:
        """Get available functions for the current state"""
        return self.get_current_state().functions

    def get_state(self, state_id: str) -> Optional[ConversationState]:
        """Get a state by ID"""
        return self.states.get(state_id)

    def is_terminal(self) -> bool:
        """Check if current state is terminal"""
        return self.get_current_state().is_terminal

    # ==================== State Transitions ====================

    async def process_input(
        self,
        user_message: str,
        extracted_data: Optional[Dict[str, Any]] = None
    ) -> Tuple[Optional[str], Optional[str]]:
        """
        Process user input and determine next state.

        Args:
            user_message: User's message
            extracted_data: Extracted entities/intents from message

        Returns:
            Tuple of (response, next_state_id)
            Response may be None if no special message needed
        """
        self.turn_count += 1
        self.state_turn_count += 1

        # Update context with input
        self.context['last_user_message'] = user_message
        self.context['turn_count'] = self.turn_count
        self.context['state_turn_count'] = self.state_turn_count

        if extracted_data:
            self.context.update(extracted_data)

        current_state = self.get_current_state()

        # Check if max turns reached in this state
        if current_state.max_turns and self.state_turn_count >= current_state.max_turns:
            logger.info(f"Max turns ({current_state.max_turns}) reached in state {self.current_state_id}")
            self.context['max_turns_reached'] = True

        # Evaluate transitions
        next_state_id = await self.evaluate_transitions(self.context)

        if next_state_id and next_state_id != self.current_state_id:
            response = await self.transition_to(next_state_id)
            return response, next_state_id

        return None, self.current_state_id

    async def evaluate_transitions(
        self,
        context: Optional[Dict[str, Any]] = None
    ) -> Optional[str]:
        """
        Evaluate all transitions from current state.

        Args:
            context: Optional context override (uses self.context if None)

        Returns:
            Target state ID if transition should occur, None otherwise
        """
        eval_context = context if context is not None else self.context
        current_state = self.get_current_state()

        # Sort transitions by priority (lower = higher priority)
        sorted_transitions = sorted(
            current_state.transitions,
            key=lambda t: t.priority
        )

        # Evaluate each transition
        for transition in sorted_transitions:
            try:
                condition_met = await self.evaluator.evaluate(
                    transition.condition,
                    eval_context
                )

                if condition_met:
                    logger.info(
                        f"Transition condition met: {self.current_state_id} -> "
                        f"{transition.target_state} (condition: {transition.condition})"
                    )
                    return transition.target_state

            except Exception as e:
                logger.error(
                    f"Error evaluating transition to {transition.target_state}: {e}"
                )
                continue

        return None

    async def transition_to(self, target_state_id: str) -> Optional[str]:
        """
        Transition to a new state.

        Args:
            target_state_id: State to transition to

        Returns:
            Optional transition message
        """
        if target_state_id not in self.states:
            logger.error(f"Invalid state transition target: {target_state_id}")
            return None

        current_state = self.get_current_state()
        target_state = self.states[target_state_id]

        # Execute on_exit action
        if current_state.on_exit:
            await self._execute_action(current_state.on_exit, 'exit')

        # Perform transition
        self.previous_state_id = self.current_state_id
        self.current_state_id = target_state_id
        self.state_turn_count = 0

        # Record history
        self.state_history.append((target_state_id, datetime.now()))

        logger.info(
            f"State transition: {self.previous_state_id} -> {self.current_state_id}"
        )

        # Execute on_enter action
        transition_message = None
        if target_state.on_enter:
            transition_message = await self._execute_action(target_state.on_enter, 'enter')

        # Notify callback
        if self.on_state_changed:
            try:
                if asyncio.iscoroutinefunction(self.on_state_changed):
                    await self.on_state_changed(
                        self.previous_state_id,
                        self.current_state_id,
                        target_state
                    )
                else:
                    self.on_state_changed(
                        self.previous_state_id,
                        self.current_state_id,
                        target_state
                    )
            except Exception as e:
                logger.error(f"Error in state changed callback: {e}")

        return transition_message

    async def set_state(self, state_id: str) -> bool:
        """
        Manually set the current state (bypasses on_exit/on_enter).

        Args:
            state_id: State to set

        Returns:
            True if successful
        """
        if state_id not in self.states:
            logger.error(f"Invalid state: {state_id}")
            return False

        self.previous_state_id = self.current_state_id
        self.current_state_id = state_id
        self.state_turn_count = 0
        self.state_history.append((state_id, datetime.now()))

        logger.info(f"State manually set to: {state_id}")
        return True

    def reset(self) -> None:
        """Reset state machine to initial state"""
        self.current_state_id = self.initial_state_id
        self.previous_state_id = None
        self.turn_count = 0
        self.state_turn_count = 0
        self.context = {}
        self.conversation_id = str(uuid.uuid4())
        self.started_at = datetime.now()
        self.state_history = [(self.initial_state_id, self.started_at)]

        logger.info(f"State machine reset to: {self.initial_state_id}")

    # ==================== Context Management ====================

    def get_context(self) -> Dict[str, Any]:
        """Get the full context dictionary"""
        return self.context.copy()

    def update_context(self, key: str, value: Any) -> None:
        """Update a context value"""
        self.context[key] = value

    def update_context_bulk(self, updates: Dict[str, Any]) -> None:
        """Update multiple context values"""
        self.context.update(updates)

    def clear_context(self, keys: Optional[List[str]] = None) -> None:
        """
        Clear context values.

        Args:
            keys: Specific keys to clear (clears all if None)
        """
        if keys:
            for key in keys:
                self.context.pop(key, None)
        else:
            self.context.clear()

    # ==================== Action Registry ====================

    def register_action(self, name: str, action: Callable) -> None:
        """
        Register an action that can be executed on state enter/exit.

        Args:
            name: Action name (referenced in on_enter/on_exit)
            action: Callable action (can be sync or async)
        """
        self._action_registry[name] = action
        logger.debug(f"Registered action: {name}")

    async def _execute_action(
        self,
        action_name: str,
        action_type: str
    ) -> Optional[str]:
        """
        Execute a registered action.

        Args:
            action_name: Name of action to execute
            action_type: 'enter' or 'exit'

        Returns:
            Optional message from action
        """
        if action_name not in self._action_registry:
            logger.warning(f"Action not found: {action_name}")
            return None

        try:
            action = self._action_registry[action_name]

            if asyncio.iscoroutinefunction(action):
                result = await action(self.context, action_type)
            else:
                result = action(self.context, action_type)

            return result if isinstance(result, str) else None

        except Exception as e:
            logger.error(f"Error executing action {action_name}: {e}")
            return None

    # ==================== Serialization ====================

    def to_dict(self) -> Dict[str, Any]:
        """Serialize state machine to dictionary"""
        return {
            'agent_id': self.agent_id,
            'conversation_id': self.conversation_id,
            'current_state_id': self.current_state_id,
            'previous_state_id': self.previous_state_id,
            'initial_state_id': self.initial_state_id,
            'turn_count': self.turn_count,
            'state_turn_count': self.state_turn_count,
            'started_at': self.started_at.isoformat(),
            'context': self.context,
            'state_history': [
                (state_id, timestamp.isoformat())
                for state_id, timestamp in self.state_history
            ],
            'states': [state.to_dict() for state in self.states.values()],
        }

    @classmethod
    def from_dict(
        cls,
        data: Dict[str, Any],
        llm_evaluator: Optional[Callable] = None,
        on_state_changed: Optional[Callable] = None
    ) -> 'VoiceStateMachine':
        """Create state machine from dictionary"""
        states = [ConversationState.from_dict(s) for s in data['states']]

        machine = cls(
            agent_id=data['agent_id'],
            states=states,
            initial_state_id=data['initial_state_id'],
            llm_evaluator=llm_evaluator,
            on_state_changed=on_state_changed
        )

        # Restore state
        machine.conversation_id = data['conversation_id']
        machine.current_state_id = data['current_state_id']
        machine.previous_state_id = data.get('previous_state_id')
        machine.turn_count = data['turn_count']
        machine.state_turn_count = data['state_turn_count']
        machine.started_at = datetime.fromisoformat(data['started_at'])
        machine.context = data['context']
        machine.state_history = [
            (state_id, datetime.fromisoformat(timestamp))
            for state_id, timestamp in data['state_history']
        ]

        return machine

    def to_json(self, indent: int = 2) -> str:
        """Serialize to JSON string"""
        return json.dumps(self.to_dict(), indent=indent)

    @classmethod
    def from_json(
        cls,
        json_str: str,
        llm_evaluator: Optional[Callable] = None,
        on_state_changed: Optional[Callable] = None
    ) -> 'VoiceStateMachine':
        """Create from JSON string"""
        data = json.loads(json_str)
        return cls.from_dict(data, llm_evaluator, on_state_changed)

    # ==================== Utility Methods ====================

    def get_state_duration(self, state_id: Optional[str] = None) -> float:
        """
        Get time spent in a state (in seconds).

        Args:
            state_id: State to check (current state if None)

        Returns:
            Duration in seconds
        """
        state_id = state_id or self.current_state_id

        # Find last entry for this state in history
        for i in range(len(self.state_history) - 1, -1, -1):
            if self.state_history[i][0] == state_id:
                start_time = self.state_history[i][1]

                # Find next different state or use now
                end_time = datetime.now()
                for j in range(i + 1, len(self.state_history)):
                    if self.state_history[j][0] != state_id:
                        end_time = self.state_history[j][1]
                        break

                return (end_time - start_time).total_seconds()

        return 0.0

    def get_visited_states(self) -> List[str]:
        """Get list of all visited state IDs (in order)"""
        return [state_id for state_id, _ in self.state_history]

    def get_state_visit_count(self, state_id: str) -> int:
        """Get number of times a state has been visited"""
        return sum(1 for s, _ in self.state_history if s == state_id)


# ==================== Utility Functions ====================

def load_state_machine_from_file(
    file_path: str,
    agent_id: str,
    llm_evaluator: Optional[Callable] = None,
    on_state_changed: Optional[Callable] = None
) -> VoiceStateMachine:
    """
    Load state machine from JSON file.

    Args:
        file_path: Path to JSON file
        agent_id: Agent ID for the state machine
        llm_evaluator: Optional LLM evaluator
        on_state_changed: Optional state change callback

    Returns:
        Initialized VoiceStateMachine
    """
    with open(file_path, 'r') as f:
        data = json.load(f)

    # Ensure agent_id is set
    data['agent_id'] = agent_id

    return VoiceStateMachine.from_dict(
        data,
        llm_evaluator=llm_evaluator,
        on_state_changed=on_state_changed
    )


def save_state_machine_to_file(
    state_machine: VoiceStateMachine,
    file_path: str
) -> None:
    """
    Save state machine to JSON file.

    Args:
        state_machine: State machine to save
        file_path: Output file path
    """
    with open(file_path, 'w') as f:
        json.dump(state_machine.to_dict(), f, indent=2)


def create_simple_state_machine(
    agent_id: str,
    states: List[Dict[str, Any]],
    transitions: List[Dict[str, Any]],
    initial_state_id: Optional[str] = None
) -> VoiceStateMachine:
    """
    Create a state machine from simple dictionaries.

    Args:
        agent_id: Agent ID
        states: List of state definitions
        transitions: List of transition definitions
        initial_state_id: Starting state

    Example:
        states = [
            {
                'id': 'greeting',
                'name': 'Greeting',
                'prompt': 'Greet the customer',
                'functions': ['get_customer_info']
            },
            {
                'id': 'booking',
                'name': 'Booking',
                'prompt': 'Help book an appointment',
                'functions': ['book_appointment', 'check_availability']
            }
        ]

        transitions = [
            {
                'from': 'greeting',
                'to': 'booking',
                'condition': "intent == 'book'",
                'priority': 1
            }
        ]

    Returns:
        Initialized VoiceStateMachine
    """
    # Build state objects
    state_objects = []
    for state_def in states:
        state = ConversationState(
            id=state_def['id'],
            name=state_def['name'],
            prompt=state_def['prompt'],
            functions=state_def.get('functions', []),
            transitions=[],
            on_enter=state_def.get('on_enter'),
            on_exit=state_def.get('on_exit'),
            is_terminal=state_def.get('is_terminal', False),
            max_turns=state_def.get('max_turns'),
            metadata=state_def.get('metadata', {})
        )
        state_objects.append(state)

    # Create state lookup
    state_map = {s.id: s for s in state_objects}

    # Add transitions
    for trans_def in transitions:
        from_state = state_map.get(trans_def['from'])
        if not from_state:
            logger.warning(f"Unknown from_state: {trans_def['from']}")
            continue

        transition = StateTransition(
            target_state=trans_def['to'],
            condition=trans_def.get('condition', 'true'),
            priority=trans_def.get('priority', 100)
        )
        from_state.transitions.append(transition)

    return VoiceStateMachine(
        agent_id=agent_id,
        states=state_objects,
        initial_state_id=initial_state_id
    )


# ==================== Example State Machine Builder ====================

def create_appointment_booking_flow(agent_id: str) -> VoiceStateMachine:
    """
    Example: Create a multi-state appointment booking flow.

    States:
    - greeting: Initial greeting and intent detection
    - collect_info: Collect customer information
    - check_availability: Check available time slots
    - confirm: Confirm the booking
    - complete: Booking confirmed
    """
    states = [
        {
            'id': 'greeting',
            'name': 'Greeting',
            'prompt': '''You are a friendly appointment booking assistant.
Greet the customer and ask how you can help them today.
Listen for booking-related intents.''',
            'functions': ['detect_intent'],
            'max_turns': 3
        },
        {
            'id': 'collect_info',
            'name': 'Collect Information',
            'prompt': '''Collect the customer's name, phone number, and service type.
Be conversational and natural. Confirm each piece of information.''',
            'functions': ['extract_customer_info', 'validate_phone'],
            'max_turns': 5
        },
        {
            'id': 'check_availability',
            'name': 'Check Availability',
            'prompt': '''Check available appointment slots and present options to the customer.
Ask for their preferred date and time.''',
            'functions': ['get_availability', 'suggest_times'],
            'max_turns': 4
        },
        {
            'id': 'confirm',
            'name': 'Confirm Booking',
            'prompt': '''Confirm all booking details with the customer.
Read back: name, phone, service, date/time.
Ask for final confirmation.''',
            'functions': ['read_back_details'],
            'max_turns': 2
        },
        {
            'id': 'complete',
            'name': 'Complete',
            'prompt': '''Thank the customer and provide confirmation number.
Explain they will receive a confirmation SMS.''',
            'functions': ['create_booking', 'send_confirmation'],
            'is_terminal': True,
            'max_turns': 1
        }
    ]

    transitions = [
        # From greeting
        {
            'from': 'greeting',
            'to': 'collect_info',
            'condition': "intent == 'book_appointment'",
            'priority': 1
        },
        {
            'from': 'greeting',
            'to': 'greeting',
            'condition': "turn_count < 3",
            'priority': 10
        },

        # From collect_info
        {
            'from': 'collect_info',
            'to': 'check_availability',
            'condition': "has_name and has_phone and has_service",
            'priority': 1
        },

        # From check_availability
        {
            'from': 'check_availability',
            'to': 'confirm',
            'condition': "selected_time is not None",
            'priority': 1
        },
        {
            'from': 'check_availability',
            'to': 'collect_info',
            'condition': "intent == 'change_service'",
            'priority': 5
        },

        # From confirm
        {
            'from': 'confirm',
            'to': 'complete',
            'condition': "confirmed == True",
            'priority': 1
        },
        {
            'from': 'confirm',
            'to': 'check_availability',
            'condition': "confirmed == False and intent == 'change_time'",
            'priority': 2
        },
        {
            'from': 'confirm',
            'to': 'collect_info',
            'condition': "confirmed == False and intent == 'change_info'",
            'priority': 3
        },
    ]

    return create_simple_state_machine(
        agent_id=agent_id,
        states=states,
        transitions=transitions,
        initial_state_id='greeting'
    )
