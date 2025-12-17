"""
Voice Playground for Agent Forge Voice

Interactive testing environment for voice agents.
Provides comprehensive testing capabilities for prompts, conversations,
function calls, audio transcription, and TTS.
"""

import os
import asyncio
import logging
import json
import uuid
from enum import Enum
from dataclasses import dataclass, field, asdict
from datetime import datetime
from typing import Dict, Any, Optional, List, Callable
from collections import defaultdict

logger = logging.getLogger(__name__)


class TestOutcome(Enum):
    """Test execution outcomes"""
    PASS = "pass"
    FAIL = "fail"
    PARTIAL = "partial"
    ERROR = "error"


@dataclass
class PlaygroundSession:
    """
    Represents an interactive playground session for a voice agent.

    Tracks conversation history, context state, function calls,
    and provides export capabilities for debugging.
    """
    id: str
    agent_id: str
    conversation_history: List[Dict[str, Any]] = field(default_factory=list)
    context: Dict[str, Any] = field(default_factory=dict)
    current_state_id: Optional[str] = None
    function_calls: List[Dict[str, Any]] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """Export session to dictionary"""
        return {
            'id': self.id,
            'agent_id': self.agent_id,
            'conversation_history': self.conversation_history,
            'context': self.context,
            'current_state_id': self.current_state_id,
            'function_calls': self.function_calls,
            'created_at': self.created_at.isoformat(),
            'metadata': self.metadata,
            'stats': {
                'total_messages': len(self.conversation_history),
                'total_function_calls': len(self.function_calls),
                'duration_minutes': (datetime.now() - self.created_at).total_seconds() / 60
            }
        }


@dataclass
class TestScenario:
    """
    Defines a test scenario with expected outcomes.

    Used to validate agent behavior across different conversation flows.
    """
    id: str
    name: str
    description: str
    agent_id: str
    steps: List[Dict[str, Any]]  # List of user messages and expected responses
    expected_outcomes: Dict[str, Any]  # What should happen
    initial_context: Dict[str, Any] = field(default_factory=dict)
    tags: List[str] = field(default_factory=list)

    def to_dict(self) -> Dict[str, Any]:
        """Export scenario to dictionary"""
        return asdict(self)


@dataclass
class TestResult:
    """Results from running a test scenario"""
    scenario_id: str
    outcome: TestOutcome
    transcript: List[Dict[str, Any]]
    expected_vs_actual: Dict[str, Any]
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    execution_time_seconds: float = 0.0
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """Export result to dictionary"""
        return {
            'scenario_id': self.scenario_id,
            'outcome': self.outcome.value,
            'transcript': self.transcript,
            'expected_vs_actual': self.expected_vs_actual,
            'errors': self.errors,
            'warnings': self.warnings,
            'execution_time_seconds': self.execution_time_seconds,
            'metadata': self.metadata
        }


class VoicePlayground:
    """
    Interactive testing environment for voice agents.

    Provides capabilities to:
    - Test individual prompts and responses
    - Simulate multi-turn conversations
    - Test function calling behavior
    - Validate audio transcription and TTS
    - Run test scenarios with assertions
    - Export sessions for debugging

    Follows the singleton pattern.
    """

    _instance: Optional['VoicePlayground'] = None

    def __init__(self, config: Dict[str, Any] = None):
        self.config = config or {}

        # Session storage
        self._sessions: Dict[str, PlaygroundSession] = {}
        self._scenarios: Dict[str, TestScenario] = {}

        # Agent registry (would integrate with actual agent manager)
        self._agents: Dict[str, Dict[str, Any]] = {}

        # Function registry for testing
        self._functions: Dict[str, Callable] = {}

        # Test results
        self._test_results: List[TestResult] = []

        # Mock ASR/TTS for testing (would integrate with actual managers)
        self._mock_asr_enabled = self.config.get('mock_asr', True)
        self._mock_tts_enabled = self.config.get('mock_tts', True)

        logger.info("VoicePlayground initialized")

    # ==================== Session Management ====================

    def create_session(
        self,
        agent_id: str,
        initial_context: Optional[Dict[str, Any]] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> PlaygroundSession:
        """
        Create a new playground session for testing an agent.

        Args:
            agent_id: The agent to test
            initial_context: Starting context variables
            metadata: Additional session metadata

        Returns:
            New PlaygroundSession instance
        """
        session_id = str(uuid.uuid4())

        session = PlaygroundSession(
            id=session_id,
            agent_id=agent_id,
            context=initial_context or {},
            metadata=metadata or {}
        )

        self._sessions[session_id] = session

        logger.info(f"Created playground session: {session_id} for agent: {agent_id}")

        return session

    def get_session(self, session_id: str) -> Optional[PlaygroundSession]:
        """Get a session by ID"""
        return self._sessions.get(session_id)

    def clear_session(self, session_id: str) -> bool:
        """
        Clear/delete a session.

        Returns:
            True if session was deleted, False if not found
        """
        if session_id in self._sessions:
            del self._sessions[session_id]
            logger.info(f"Cleared session: {session_id}")
            return True
        return False

    def list_sessions(self, agent_id: Optional[str] = None) -> List[PlaygroundSession]:
        """List all sessions, optionally filtered by agent_id"""
        sessions = list(self._sessions.values())

        if agent_id:
            sessions = [s for s in sessions if s.agent_id == agent_id]

        return sessions

    def export_session(self, session_id: str) -> Optional[Dict[str, Any]]:
        """
        Export a session to dictionary for debugging.

        Includes full conversation history, context state,
        function calls, and statistics.

        Returns:
            Session data as dictionary, or None if not found
        """
        session = self.get_session(session_id)
        if not session:
            return None

        return session.to_dict()

    # ==================== Prompt Testing ====================

    async def test_prompt(
        self,
        session_id: str,
        user_message: str,
        context: Optional[Dict[str, Any]] = None,
        expected_keywords: Optional[List[str]] = None,
        expected_function: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Test a single prompt/message to the agent.

        Args:
            session_id: The session to test in
            user_message: User's message
            context: Optional context to merge
            expected_keywords: Keywords expected in response
            expected_function: Function expected to be called

        Returns:
            Dict with response, function_calls, validation results
        """
        session = self.get_session(session_id)
        if not session:
            return {'success': False, 'error': 'Session not found'}

        # Merge context
        if context:
            session.context.update(context)

        # Add message to history
        session.conversation_history.append({
            'role': 'user',
            'content': user_message,
            'timestamp': datetime.now().isoformat()
        })

        # Generate response (would call actual agent)
        response = await self._generate_agent_response(
            agent_id=session.agent_id,
            message=user_message,
            context=session.context,
            history=session.conversation_history
        )

        # Add response to history
        session.conversation_history.append({
            'role': 'assistant',
            'content': response.get('text', ''),
            'timestamp': datetime.now().isoformat()
        })

        # Track function calls
        function_calls = response.get('function_calls', [])
        for call in function_calls:
            session.function_calls.append({
                'function': call['name'],
                'parameters': call['parameters'],
                'timestamp': datetime.now().isoformat(),
                'message_index': len(session.conversation_history) - 1
            })

        # Validation
        validation = {
            'passed': True,
            'checks': []
        }

        if expected_keywords:
            response_text = response.get('text', '').lower()
            for keyword in expected_keywords:
                found = keyword.lower() in response_text
                validation['checks'].append({
                    'type': 'keyword',
                    'keyword': keyword,
                    'passed': found
                })
                if not found:
                    validation['passed'] = False

        if expected_function:
            function_called = any(
                call['name'] == expected_function
                for call in function_calls
            )
            validation['checks'].append({
                'type': 'function',
                'function': expected_function,
                'passed': function_called
            })
            if not function_called:
                validation['passed'] = False

        return {
            'success': True,
            'response': response.get('text', ''),
            'function_calls': function_calls,
            'context': session.context,
            'validation': validation,
            'session_id': session_id
        }

    # ==================== Conversation Simulation ====================

    async def simulate_conversation(
        self,
        agent_id: str,
        scenario: List[str],
        initial_context: Optional[Dict[str, Any]] = None,
        max_turns: int = 10,
        validate_each_turn: bool = False
    ) -> List[Dict[str, Any]]:
        """
        Simulate a multi-turn conversation with an agent.

        Args:
            agent_id: Agent to converse with
            scenario: List of user messages
            initial_context: Starting context
            max_turns: Maximum turns to simulate
            validate_each_turn: Whether to validate each response

        Returns:
            List of transcript entries (user + assistant messages)
        """
        # Create session
        session = self.create_session(
            agent_id=agent_id,
            initial_context=initial_context,
            metadata={'scenario_type': 'simulation'}
        )

        transcript = []
        turn_count = 0

        for user_message in scenario:
            if turn_count >= max_turns:
                logger.warning(f"Reached max turns ({max_turns}) in simulation")
                break

            turn_count += 1

            # Test this turn
            result = await self.test_prompt(
                session_id=session.id,
                user_message=user_message
            )

            transcript.append({
                'turn': turn_count,
                'user': user_message,
                'assistant': result.get('response', ''),
                'function_calls': result.get('function_calls', []),
                'context': dict(session.context),
                'validation': result.get('validation') if validate_each_turn else None
            })

            # Check if conversation ended
            if self._should_end_conversation(result):
                logger.info(f"Conversation ended naturally at turn {turn_count}")
                break

        logger.info(f"Simulation completed: {turn_count} turns")

        return transcript

    def _should_end_conversation(self, response: Dict[str, Any]) -> bool:
        """Determine if conversation should end based on response"""
        # Check for end indicators
        text = response.get('response', '').lower()

        end_phrases = [
            'goodbye',
            'thank you for calling',
            'have a great day',
            'is there anything else',
        ]

        return any(phrase in text for phrase in end_phrases)

    # ==================== Function Testing ====================

    def register_test_function(
        self,
        name: str,
        handler: Callable,
        schema: Optional[Dict[str, Any]] = None
    ) -> None:
        """
        Register a function for testing.

        Args:
            name: Function name
            handler: Function implementation
            schema: JSON schema for parameters
        """
        self._functions[name] = {
            'handler': handler,
            'schema': schema,
            'calls': []
        }

        logger.info(f"Registered test function: {name}")

    async def test_function_call(
        self,
        function_name: str,
        parameters: Dict[str, Any],
        expected_result: Optional[Any] = None
    ) -> Dict[str, Any]:
        """
        Test a function call with given parameters.

        Args:
            function_name: Name of function to test
            parameters: Parameters to pass
            expected_result: Expected return value (for validation)

        Returns:
            Dict with result, success status, validation
        """
        if function_name not in self._functions:
            return {
                'success': False,
                'error': f'Function not registered: {function_name}'
            }

        func_info = self._functions[function_name]
        handler = func_info['handler']

        try:
            # Call the function
            start_time = datetime.now()

            if asyncio.iscoroutinefunction(handler):
                result = await handler(**parameters)
            else:
                result = handler(**parameters)

            execution_time = (datetime.now() - start_time).total_seconds()

            # Track the call
            func_info['calls'].append({
                'parameters': parameters,
                'result': result,
                'timestamp': datetime.now().isoformat(),
                'execution_time': execution_time
            })

            # Validation
            validation = {'passed': True}
            if expected_result is not None:
                validation['passed'] = result == expected_result
                validation['expected'] = expected_result
                validation['actual'] = result

            return {
                'success': True,
                'result': result,
                'execution_time': execution_time,
                'validation': validation
            }

        except Exception as e:
            logger.error(f"Function call failed: {function_name} - {e}")
            return {
                'success': False,
                'error': str(e),
                'function': function_name,
                'parameters': parameters
            }

    def get_function_call_history(
        self,
        function_name: Optional[str] = None
    ) -> List[Dict[str, Any]]:
        """Get history of function calls, optionally filtered"""
        if function_name:
            if function_name in self._functions:
                return self._functions[function_name]['calls']
            return []

        # Return all calls
        all_calls = []
        for name, info in self._functions.items():
            for call in info['calls']:
                call_copy = dict(call)
                call_copy['function'] = name
                all_calls.append(call_copy)

        return all_calls

    # ==================== Audio Testing ====================

    async def test_audio_transcription(
        self,
        audio_data: bytes,
        expected_text: Optional[str] = None,
        language: str = "en",
        provider: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Test audio transcription.

        Args:
            audio_data: Raw audio bytes
            expected_text: Expected transcript (for validation)
            language: Language code
            provider: ASR provider to use

        Returns:
            Dict with transcript, confidence, validation
        """
        if self._mock_asr_enabled:
            # Mock ASR for testing
            transcript = "This is a mock transcription"
            confidence = 0.95
        else:
            # Would integrate with actual ASR manager
            from .asr import get_asr_manager
            asr = get_asr_manager()

            result = await asr.transcribe_audio(
                audio_data=audio_data,
                language=language
            )

            if not result.get('success'):
                return result

            transcript = result.get('transcript', '')
            confidence = result.get('confidence', 0.0)

        # Validation
        validation = {'passed': True}
        if expected_text:
            # Fuzzy match (normalize and compare)
            normalized_expected = expected_text.lower().strip()
            normalized_actual = transcript.lower().strip()

            validation['passed'] = normalized_expected == normalized_actual
            validation['expected'] = expected_text
            validation['actual'] = transcript
            validation['similarity'] = self._calculate_similarity(
                normalized_expected,
                normalized_actual
            )

        return {
            'success': True,
            'transcript': transcript,
            'confidence': confidence,
            'language': language,
            'validation': validation
        }

    async def test_tts(
        self,
        text: str,
        voice_id: Optional[str] = None,
        provider: Optional[str] = None,
        validate_audio: bool = False
    ) -> Dict[str, Any]:
        """
        Test text-to-speech generation.

        Args:
            text: Text to synthesize
            voice_id: Voice to use
            provider: TTS provider
            validate_audio: Whether to validate audio output

        Returns:
            Dict with audio_bytes, metadata, validation
        """
        if self._mock_tts_enabled:
            # Mock TTS for testing
            audio_bytes = b'MOCK_AUDIO_DATA'
            duration_ms = len(text) * 50  # Rough estimate
        else:
            # Would integrate with actual TTS manager
            # from .tts import get_tts_manager
            # tts = get_tts_manager()
            # result = await tts.synthesize(text=text, voice_id=voice_id)
            audio_bytes = b'AUDIO_DATA'
            duration_ms = 1000

        validation = {'passed': True}
        if validate_audio:
            # Basic validation
            validation['has_audio'] = len(audio_bytes) > 0
            validation['duration_ms'] = duration_ms
            validation['passed'] = len(audio_bytes) > 0

        return {
            'success': True,
            'audio_bytes': audio_bytes,
            'text': text,
            'voice_id': voice_id,
            'duration_ms': duration_ms,
            'validation': validation
        }

    # ==================== Scenario Testing ====================

    def create_scenario(
        self,
        name: str,
        description: str,
        agent_id: str,
        steps: List[Dict[str, Any]],
        expected_outcomes: Dict[str, Any],
        initial_context: Optional[Dict[str, Any]] = None,
        tags: Optional[List[str]] = None
    ) -> TestScenario:
        """
        Create a test scenario.

        Args:
            name: Scenario name
            description: What this scenario tests
            agent_id: Agent to test
            steps: List of conversation steps with expectations
            expected_outcomes: Overall expected outcomes
            initial_context: Starting context
            tags: Tags for categorization

        Returns:
            TestScenario instance
        """
        scenario_id = str(uuid.uuid4())

        scenario = TestScenario(
            id=scenario_id,
            name=name,
            description=description,
            agent_id=agent_id,
            steps=steps,
            expected_outcomes=expected_outcomes,
            initial_context=initial_context or {},
            tags=tags or []
        )

        self._scenarios[scenario_id] = scenario

        logger.info(f"Created test scenario: {name} ({scenario_id})")

        return scenario

    async def run_scenario(
        self,
        scenario_id: str,
        verbose: bool = False
    ) -> TestResult:
        """
        Run a test scenario and validate outcomes.

        Args:
            scenario_id: Scenario to run
            verbose: Whether to log detailed progress

        Returns:
            TestResult with outcome and details
        """
        scenario = self._scenarios.get(scenario_id)
        if not scenario:
            raise ValueError(f"Scenario not found: {scenario_id}")

        start_time = datetime.now()

        # Create session
        session = self.create_session(
            agent_id=scenario.agent_id,
            initial_context=scenario.initial_context,
            metadata={'scenario_id': scenario_id, 'scenario_name': scenario.name}
        )

        transcript = []
        errors = []
        warnings = []

        # Execute steps
        for i, step in enumerate(scenario.steps):
            user_message = step.get('user_message')
            expected_keywords = step.get('expected_keywords', [])
            expected_function = step.get('expected_function')

            if verbose:
                logger.info(f"Step {i+1}: {user_message}")

            try:
                result = await self.test_prompt(
                    session_id=session.id,
                    user_message=user_message,
                    expected_keywords=expected_keywords,
                    expected_function=expected_function
                )

                transcript.append({
                    'step': i + 1,
                    'user': user_message,
                    'assistant': result.get('response'),
                    'validation': result.get('validation'),
                    'function_calls': result.get('function_calls', [])
                })

                # Check validation
                validation = result.get('validation', {})
                if not validation.get('passed', True):
                    warnings.append(f"Step {i+1} validation failed")

            except Exception as e:
                errors.append(f"Step {i+1} failed: {str(e)}")
                transcript.append({
                    'step': i + 1,
                    'user': user_message,
                    'error': str(e)
                })

        # Validate expected outcomes
        expected_vs_actual = self._validate_outcomes(
            session=session,
            expected=scenario.expected_outcomes
        )

        # Determine overall outcome
        if errors:
            outcome = TestOutcome.ERROR
        elif not expected_vs_actual.get('all_passed', True):
            outcome = TestOutcome.FAIL
        elif warnings:
            outcome = TestOutcome.PARTIAL
        else:
            outcome = TestOutcome.PASS

        execution_time = (datetime.now() - start_time).total_seconds()

        result = TestResult(
            scenario_id=scenario_id,
            outcome=outcome,
            transcript=transcript,
            expected_vs_actual=expected_vs_actual,
            errors=errors,
            warnings=warnings,
            execution_time_seconds=execution_time,
            metadata={
                'scenario_name': scenario.name,
                'agent_id': scenario.agent_id,
                'session_id': session.id
            }
        )

        self._test_results.append(result)

        logger.info(
            f"Scenario '{scenario.name}' completed: {outcome.value} "
            f"in {execution_time:.2f}s"
        )

        return result

    def _validate_outcomes(
        self,
        session: PlaygroundSession,
        expected: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Validate expected outcomes against actual session results"""
        validation = {
            'all_passed': True,
            'checks': []
        }

        # Check expected function calls
        if 'function_calls' in expected:
            expected_calls = set(expected['function_calls'])
            actual_calls = set(call['function'] for call in session.function_calls)

            passed = expected_calls.issubset(actual_calls)
            validation['checks'].append({
                'type': 'function_calls',
                'expected': list(expected_calls),
                'actual': list(actual_calls),
                'passed': passed
            })

            if not passed:
                validation['all_passed'] = False

        # Check context values
        if 'context' in expected:
            for key, expected_value in expected['context'].items():
                actual_value = session.context.get(key)
                passed = actual_value == expected_value

                validation['checks'].append({
                    'type': 'context',
                    'key': key,
                    'expected': expected_value,
                    'actual': actual_value,
                    'passed': passed
                })

                if not passed:
                    validation['all_passed'] = False

        # Check conversation length
        if 'min_turns' in expected:
            min_turns = expected['min_turns']
            actual_turns = len(session.conversation_history) // 2  # user + assistant
            passed = actual_turns >= min_turns

            validation['checks'].append({
                'type': 'conversation_length',
                'min_turns': min_turns,
                'actual_turns': actual_turns,
                'passed': passed
            })

            if not passed:
                validation['all_passed'] = False

        return validation

    def get_scenario_results(
        self,
        scenario_id: Optional[str] = None
    ) -> List[TestResult]:
        """Get test results, optionally filtered by scenario"""
        if scenario_id:
            return [r for r in self._test_results if r.scenario_id == scenario_id]
        return self._test_results

    def generate_test_report(
        self,
        scenario_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """
        Generate a test report with statistics.

        Args:
            scenario_id: Optional scenario to report on

        Returns:
            Dict with statistics and results
        """
        results = self.get_scenario_results(scenario_id)

        if not results:
            return {
                'total_tests': 0,
                'message': 'No test results found'
            }

        # Calculate statistics
        outcomes = defaultdict(int)
        total_execution_time = 0
        total_errors = 0
        total_warnings = 0

        for result in results:
            outcomes[result.outcome.value] += 1
            total_execution_time += result.execution_time_seconds
            total_errors += len(result.errors)
            total_warnings += len(result.warnings)

        pass_rate = (outcomes['pass'] / len(results)) * 100 if results else 0

        return {
            'total_tests': len(results),
            'outcomes': dict(outcomes),
            'pass_rate': pass_rate,
            'total_execution_time': total_execution_time,
            'avg_execution_time': total_execution_time / len(results),
            'total_errors': total_errors,
            'total_warnings': total_warnings,
            'results': [r.to_dict() for r in results]
        }

    # ==================== Agent Validation ====================

    def validate_agent_config(self, agent_id: str) -> List[str]:
        """
        Validate an agent's configuration.

        Checks for common issues like:
        - Missing required fields
        - Invalid state transitions
        - Unreachable states
        - Function definitions without implementations

        Args:
            agent_id: Agent to validate

        Returns:
            List of validation issues (empty if all OK)
        """
        issues = []

        # Get agent config (would integrate with actual agent manager)
        agent_config = self._agents.get(agent_id)

        if not agent_config:
            return [f"Agent not found: {agent_id}"]

        # Check required fields
        required_fields = ['name', 'system_prompt', 'states']
        for field in required_fields:
            if field not in agent_config:
                issues.append(f"Missing required field: {field}")

        # Validate states
        states = agent_config.get('states', [])
        if not states:
            issues.append("No states defined")
        else:
            state_ids = {s['id'] for s in states}

            # Check for duplicate state IDs
            if len(state_ids) != len(states):
                issues.append("Duplicate state IDs found")

            # Check initial state
            initial_state = agent_config.get('initial_state')
            if initial_state and initial_state not in state_ids:
                issues.append(f"Initial state not found: {initial_state}")

            # Check transitions
            for state in states:
                transitions = state.get('transitions', [])
                for transition in transitions:
                    target = transition.get('target_state')
                    if target and target not in state_ids:
                        issues.append(
                            f"State '{state['id']}' has transition to "
                            f"non-existent state: {target}"
                        )

            # Check for unreachable states
            reachable = {agent_config.get('initial_state')}
            changed = True
            while changed:
                changed = False
                for state in states:
                    if state['id'] in reachable:
                        for transition in state.get('transitions', []):
                            target = transition.get('target_state')
                            if target and target not in reachable:
                                reachable.add(target)
                                changed = True

            unreachable = state_ids - reachable
            if unreachable:
                issues.append(f"Unreachable states: {', '.join(unreachable)}")

        # Validate functions
        functions = agent_config.get('functions', [])
        for func in functions:
            if 'name' not in func:
                issues.append("Function missing name")

            if 'parameters' not in func:
                issues.append(f"Function '{func.get('name')}' missing parameters")

        # Check for LLM configuration
        if 'model' not in agent_config:
            issues.append("No model specified (will use default)")

        return issues

    # ==================== Helper Methods ====================

    async def _generate_agent_response(
        self,
        agent_id: str,
        message: str,
        context: Dict[str, Any],
        history: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Generate agent response (mock for now, would integrate with actual agent).

        Returns:
            Dict with text, function_calls, context updates
        """
        # Mock response for testing
        response = {
            'text': f"This is a test response to: {message}",
            'function_calls': [],
            'context_updates': {}
        }

        # Simple keyword-based function triggering for testing
        if 'transfer' in message.lower():
            response['function_calls'].append({
                'name': 'transfer_call',
                'parameters': {'target': 'sales'}
            })

        if 'schedule' in message.lower():
            response['function_calls'].append({
                'name': 'schedule_callback',
                'parameters': {'time': 'tomorrow'}
            })

        return response

    def _calculate_similarity(self, text1: str, text2: str) -> float:
        """Calculate similarity between two strings (simple implementation)"""
        # Simple word-based similarity
        words1 = set(text1.split())
        words2 = set(text2.split())

        if not words1 and not words2:
            return 1.0

        if not words1 or not words2:
            return 0.0

        intersection = words1.intersection(words2)
        union = words1.union(words2)

        return len(intersection) / len(union)

    def register_agent(self, agent_id: str, config: Dict[str, Any]) -> None:
        """Register an agent configuration for testing"""
        self._agents[agent_id] = config
        logger.info(f"Registered agent for testing: {agent_id}")

    def clear_all(self) -> None:
        """Clear all sessions, scenarios, and results"""
        self._sessions.clear()
        self._scenarios.clear()
        self._test_results.clear()
        self._functions.clear()
        logger.info("Cleared all playground data")


# Singleton instance
_voice_playground: Optional[VoicePlayground] = None


def get_voice_playground(config: Dict[str, Any] = None) -> VoicePlayground:
    """
    Get or create the voice playground instance.

    Args:
        config: Optional configuration dict

    Returns:
        VoicePlayground singleton instance
    """
    global _voice_playground
    if _voice_playground is None:
        _voice_playground = VoicePlayground(config)
    return _voice_playground
