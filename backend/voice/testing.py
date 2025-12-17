"""
Voice Testing Framework for Agent Forge Voice

Provides automated testing and regression testing capabilities for voice agents.
Includes test scenario definition, execution, and reporting.
"""

import os
import asyncio
import logging
import json
import time
from enum import Enum
from dataclasses import dataclass, field, asdict
from datetime import datetime
from typing import Dict, Any, Optional, List, Callable
import uuid

logger = logging.getLogger(__name__)


class TestStatus(Enum):
    """Test execution status"""
    PENDING = "pending"
    RUNNING = "running"
    PASSED = "passed"
    FAILED = "failed"
    SKIPPED = "skipped"
    ERROR = "error"


@dataclass
class TestScenario:
    """
    Represents a single test scenario for a voice agent.

    Defines the inputs, expected outputs, and success criteria.
    """
    id: str
    name: str
    description: str
    agent_id: str
    user_messages: List[str]  # Sequence of user inputs to simulate
    expected_keywords: List[str] = field(default_factory=list)  # Keywords that should appear in responses
    expected_functions: List[str] = field(default_factory=list)  # Functions that should be called
    expected_outcome: str = ""  # Expected final outcome description
    success_criteria: Dict[str, Any] = field(default_factory=dict)  # {min_confidence, max_latency_ms, required_states}
    timeout_seconds: int = 60
    tags: List[str] = field(default_factory=list)  # For categorization (e.g., "appointment", "faq", "transfer")
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)

    def __post_init__(self):
        """Set default success criteria if not provided"""
        if not self.success_criteria:
            self.success_criteria = {
                'min_confidence': 0.7,
                'max_latency_ms': 3000,
                'required_states': [],
                'min_keyword_matches': len(self.expected_keywords) // 2 if self.expected_keywords else 0,
                'min_function_calls': len(self.expected_functions),
            }

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        data = asdict(self)
        data['created_at'] = self.created_at.isoformat()
        data['updated_at'] = self.updated_at.isoformat()
        return data

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'TestScenario':
        """Create from dictionary"""
        if isinstance(data.get('created_at'), str):
            data['created_at'] = datetime.fromisoformat(data['created_at'])
        if isinstance(data.get('updated_at'), str):
            data['updated_at'] = datetime.fromisoformat(data['updated_at'])
        return cls(**data)


@dataclass
class TestResult:
    """
    Represents the result of executing a test scenario.

    Contains the actual outputs, metrics, and comparison with expected results.
    """
    id: str
    scenario_id: str
    passed: bool
    transcript: List[Dict[str, Any]] = field(default_factory=list)  # [{role, text, timestamp}]
    function_calls: List[Dict[str, Any]] = field(default_factory=list)  # [{name, args, timestamp, result}]
    actual_outcome: str = ""
    latency_ms: float = 0.0  # Average response latency
    errors: List[str] = field(default_factory=list)
    warnings: List[str] = field(default_factory=list)
    duration_seconds: float = 0.0
    metrics: Dict[str, Any] = field(default_factory=dict)  # Additional metrics
    created_at: datetime = field(default_factory=datetime.now)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        data = asdict(self)
        data['created_at'] = self.created_at.isoformat()
        return data

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'TestResult':
        """Create from dictionary"""
        if isinstance(data.get('created_at'), str):
            data['created_at'] = datetime.fromisoformat(data['created_at'])
        return cls(**data)


@dataclass
class TestSuite:
    """
    Collection of related test scenarios.

    Used to group tests for a specific agent or feature area.
    """
    id: str
    name: str
    agent_id: str
    scenarios: List[TestScenario] = field(default_factory=list)
    description: str = ""
    tags: List[str] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        data = asdict(self)
        data['scenarios'] = [s.to_dict() for s in self.scenarios]
        data['created_at'] = self.created_at.isoformat()
        data['updated_at'] = self.updated_at.isoformat()
        return data

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'TestSuite':
        """Create from dictionary"""
        if isinstance(data.get('created_at'), str):
            data['created_at'] = datetime.fromisoformat(data['created_at'])
        if isinstance(data.get('updated_at'), str):
            data['updated_at'] = datetime.fromisoformat(data['updated_at'])
        if 'scenarios' in data:
            data['scenarios'] = [TestScenario.from_dict(s) for s in data['scenarios']]
        return cls(**data)


class VoiceTestRunner:
    """
    Executes voice agent tests and generates reports.

    Provides methods to run individual scenarios, test suites, and
    regression tests across multiple versions.
    """

    def __init__(self, storage_path: Optional[str] = None):
        """
        Initialize the test runner.

        Args:
            storage_path: Directory to store test scenarios and results
        """
        self.storage_path = storage_path or os.getenv('VOICE_TEST_STORAGE', './voice_tests')
        os.makedirs(self.storage_path, exist_ok=True)

        self.scenarios_path = os.path.join(self.storage_path, 'scenarios')
        self.suites_path = os.path.join(self.storage_path, 'suites')
        self.results_path = os.path.join(self.storage_path, 'results')

        os.makedirs(self.scenarios_path, exist_ok=True)
        os.makedirs(self.suites_path, exist_ok=True)
        os.makedirs(self.results_path, exist_ok=True)

        # Test execution callbacks
        self._on_test_started: Optional[Callable] = None
        self._on_test_completed: Optional[Callable] = None
        self._on_test_failed: Optional[Callable] = None

        logger.info(f"VoiceTestRunner initialized with storage at: {self.storage_path}")

    # ==================== Scenario Execution ====================

    async def run_scenario(
        self,
        agent_id: str,
        scenario: TestScenario,
        session_manager=None,
        pipeline=None
    ) -> TestResult:
        """
        Execute a single test scenario.

        Args:
            agent_id: ID of the voice agent to test
            scenario: Test scenario to execute
            session_manager: Optional VoiceSessionManager instance
            pipeline: Optional VoicePipeline instance

        Returns:
            TestResult containing execution details and pass/fail status
        """
        result_id = str(uuid.uuid4())
        start_time = time.time()

        result = TestResult(
            id=result_id,
            scenario_id=scenario.id,
            passed=False,
        )

        try:
            if self._on_test_started:
                await self._maybe_call_async(self._on_test_started, scenario)

            logger.info(f"Running test scenario: {scenario.name} ({scenario.id})")

            # Initialize test session
            session_id = str(uuid.uuid4())
            conversation_transcript = []
            function_calls_log = []
            latencies = []

            # Import managers if not provided
            if session_manager is None or pipeline is None:
                from .pipeline import get_voice_session_manager
                session_manager = get_voice_session_manager()

            # Execute each user message in sequence
            for idx, user_message in enumerate(scenario.user_messages):
                message_start = time.time()

                try:
                    # Add user message to transcript
                    conversation_transcript.append({
                        'role': 'user',
                        'text': user_message,
                        'timestamp': time.time(),
                        'sequence': idx
                    })

                    # Simulate voice agent processing
                    # In real implementation, this would connect to the actual pipeline
                    response = await self._simulate_agent_response(
                        agent_id=agent_id,
                        user_message=user_message,
                        session_id=session_id,
                        scenario=scenario,
                        session_manager=session_manager
                    )

                    message_latency = (time.time() - message_start) * 1000
                    latencies.append(message_latency)

                    # Add agent response to transcript
                    conversation_transcript.append({
                        'role': 'agent',
                        'text': response.get('text', ''),
                        'timestamp': time.time(),
                        'sequence': idx,
                        'confidence': response.get('confidence', 0.0),
                        'latency_ms': message_latency
                    })

                    # Log any function calls
                    if response.get('function_calls'):
                        for func_call in response['function_calls']:
                            function_calls_log.append({
                                'name': func_call.get('name'),
                                'args': func_call.get('args', {}),
                                'timestamp': time.time(),
                                'result': func_call.get('result'),
                                'sequence': idx
                            })

                    # Check for timeout
                    if (time.time() - start_time) > scenario.timeout_seconds:
                        result.errors.append(f"Test timed out after {scenario.timeout_seconds} seconds")
                        break

                    # Small delay between messages to simulate natural conversation
                    await asyncio.sleep(0.5)

                except Exception as e:
                    logger.error(f"Error processing message {idx}: {e}")
                    result.errors.append(f"Message {idx} error: {str(e)}")

            # Store results
            result.transcript = conversation_transcript
            result.function_calls = function_calls_log
            result.latency_ms = sum(latencies) / len(latencies) if latencies else 0.0
            result.duration_seconds = time.time() - start_time

            # Evaluate success criteria
            passed, evaluation = self._evaluate_scenario(scenario, result)
            result.passed = passed
            result.metrics = evaluation

            if not passed:
                result.errors.extend(evaluation.get('failures', []))

            if evaluation.get('warnings'):
                result.warnings.extend(evaluation['warnings'])

            # Generate actual outcome description
            result.actual_outcome = self._generate_outcome_description(result)

            logger.info(f"Test scenario completed: {scenario.name} - {'PASSED' if passed else 'FAILED'}")

            if self._on_test_completed:
                await self._maybe_call_async(self._on_test_completed, scenario, result)

        except Exception as e:
            logger.error(f"Test scenario failed with exception: {e}")
            result.errors.append(f"Unexpected error: {str(e)}")
            result.passed = False
            result.duration_seconds = time.time() - start_time

            if self._on_test_failed:
                await self._maybe_call_async(self._on_test_failed, scenario, result, e)

        # Save result
        await self.save_result(result)

        return result

    async def _simulate_agent_response(
        self,
        agent_id: str,
        user_message: str,
        session_id: str,
        scenario: TestScenario,
        session_manager=None
    ) -> Dict[str, Any]:
        """
        Simulate agent response (placeholder for actual implementation).

        In production, this would connect to the real VoicePipeline and
        process the message through the agent's LLM and function calls.
        """
        # This is a mock implementation
        # Real implementation would use the actual voice pipeline

        response_text = f"Response to: {user_message}"
        confidence = 0.85
        function_calls = []

        # Simulate some function calls based on expected functions
        if scenario.expected_functions:
            for func_name in scenario.expected_functions:
                if any(keyword in user_message.lower() for keyword in ['book', 'schedule', 'appointment']):
                    if func_name == 'book_appointment':
                        function_calls.append({
                            'name': func_name,
                            'args': {'date': '2024-01-15', 'time': '10:00'},
                            'result': {'success': True, 'confirmation': 'APT-12345'}
                        })

        return {
            'text': response_text,
            'confidence': confidence,
            'function_calls': function_calls
        }

    def _evaluate_scenario(
        self,
        scenario: TestScenario,
        result: TestResult
    ) -> tuple[bool, Dict[str, Any]]:
        """
        Evaluate if scenario passed based on success criteria.

        Returns:
            Tuple of (passed: bool, evaluation_details: dict)
        """
        evaluation = {
            'keyword_matches': 0,
            'keyword_coverage': 0.0,
            'function_calls_matched': 0,
            'function_coverage': 0.0,
            'avg_confidence': 0.0,
            'avg_latency_ms': result.latency_ms,
            'failures': [],
            'warnings': []
        }

        criteria = scenario.success_criteria
        passed = True

        # Check keyword matches
        if scenario.expected_keywords:
            full_transcript = ' '.join([t['text'].lower() for t in result.transcript])
            matches = sum(1 for keyword in scenario.expected_keywords
                         if keyword.lower() in full_transcript)
            evaluation['keyword_matches'] = matches
            evaluation['keyword_coverage'] = matches / len(scenario.expected_keywords)

            min_matches = criteria.get('min_keyword_matches', len(scenario.expected_keywords) // 2)
            if matches < min_matches:
                passed = False
                evaluation['failures'].append(
                    f"Expected at least {min_matches} keyword matches, got {matches}"
                )

        # Check function calls
        if scenario.expected_functions:
            called_functions = [fc['name'] for fc in result.function_calls]
            matches = sum(1 for func in scenario.expected_functions if func in called_functions)
            evaluation['function_calls_matched'] = matches
            evaluation['function_coverage'] = matches / len(scenario.expected_functions)

            min_function_calls = criteria.get('min_function_calls', len(scenario.expected_functions))
            if matches < min_function_calls:
                passed = False
                missing = set(scenario.expected_functions) - set(called_functions)
                evaluation['failures'].append(
                    f"Expected functions not called: {', '.join(missing)}"
                )

        # Check confidence
        agent_messages = [t for t in result.transcript if t['role'] == 'agent']
        if agent_messages:
            confidences = [t.get('confidence', 0.0) for t in agent_messages]
            avg_confidence = sum(confidences) / len(confidences)
            evaluation['avg_confidence'] = avg_confidence

            min_confidence = criteria.get('min_confidence', 0.7)
            if avg_confidence < min_confidence:
                evaluation['warnings'].append(
                    f"Average confidence {avg_confidence:.2f} below threshold {min_confidence}"
                )

        # Check latency
        max_latency = criteria.get('max_latency_ms', 3000)
        if result.latency_ms > max_latency:
            evaluation['warnings'].append(
                f"Average latency {result.latency_ms:.0f}ms exceeds {max_latency}ms"
            )

        # Check required states (if provided)
        if criteria.get('required_states'):
            # This would check conversation state transitions
            # Placeholder for now
            pass

        # Check for errors
        if result.errors:
            passed = False
            evaluation['failures'].extend([f"Error: {e}" for e in result.errors])

        return passed, evaluation

    def _generate_outcome_description(self, result: TestResult) -> str:
        """Generate human-readable outcome description"""
        if not result.transcript:
            return "No conversation occurred"

        agent_messages = [t for t in result.transcript if t['role'] == 'agent']
        user_messages = [t for t in result.transcript if t['role'] == 'user']

        description = (
            f"Conversation with {len(user_messages)} user inputs and "
            f"{len(agent_messages)} agent responses. "
        )

        if result.function_calls:
            functions = [fc['name'] for fc in result.function_calls]
            description += f"Functions called: {', '.join(functions)}. "

        if result.passed:
            description += "All success criteria met."
        else:
            description += f"Failed: {len(result.errors)} error(s)."

        return description

    # ==================== Suite Execution ====================

    async def run_suite(
        self,
        suite: TestSuite,
        parallel: bool = False,
        stop_on_failure: bool = False
    ) -> List[TestResult]:
        """
        Execute all scenarios in a test suite.

        Args:
            suite: Test suite to execute
            parallel: Run tests in parallel (default: sequential)
            stop_on_failure: Stop execution on first failure

        Returns:
            List of TestResult objects
        """
        logger.info(f"Running test suite: {suite.name} ({len(suite.scenarios)} scenarios)")

        results = []

        if parallel:
            # Run all scenarios concurrently
            tasks = [
                self.run_scenario(suite.agent_id, scenario)
                for scenario in suite.scenarios
            ]
            results = await asyncio.gather(*tasks, return_exceptions=True)

            # Convert exceptions to error results
            for idx, result in enumerate(results):
                if isinstance(result, Exception):
                    error_result = TestResult(
                        id=str(uuid.uuid4()),
                        scenario_id=suite.scenarios[idx].id,
                        passed=False,
                        errors=[str(result)]
                    )
                    results[idx] = error_result
        else:
            # Run scenarios sequentially
            for scenario in suite.scenarios:
                result = await self.run_scenario(suite.agent_id, scenario)
                results.append(result)

                if stop_on_failure and not result.passed:
                    logger.warning(f"Stopping suite execution after failure: {scenario.name}")
                    break

        # Generate suite summary
        passed = sum(1 for r in results if r.passed)
        failed = sum(1 for r in results if not r.passed)

        logger.info(
            f"Test suite completed: {suite.name} - "
            f"{passed} passed, {failed} failed out of {len(results)}"
        )

        return results

    # ==================== Regression Testing ====================

    async def run_regression(
        self,
        agent_id: str,
        scenarios: Optional[List[TestScenario]] = None,
        tags: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Run regression tests for an agent.

        Args:
            agent_id: ID of the agent to test
            scenarios: Specific scenarios to run (if None, runs all)
            tags: Filter scenarios by tags

        Returns:
            Regression report with results and analysis
        """
        logger.info(f"Running regression tests for agent: {agent_id}")

        # Load scenarios
        if scenarios is None:
            scenarios = await self.list_scenarios(agent_id)

        # Filter by tags if provided
        if tags:
            scenarios = [
                s for s in scenarios
                if any(tag in s.tags for tag in tags)
            ]

        if not scenarios:
            logger.warning(f"No scenarios found for agent {agent_id}")
            return {
                'agent_id': agent_id,
                'total_scenarios': 0,
                'results': [],
                'summary': {
                    'passed': 0,
                    'failed': 0,
                    'error': 0,
                    'pass_rate': 0.0
                }
            }

        # Execute all scenarios
        results = []
        for scenario in scenarios:
            result = await self.run_scenario(agent_id, scenario)
            results.append(result)

        # Generate report
        report = self.generate_report(results, scenarios)
        report['agent_id'] = agent_id

        # Save regression report
        report_path = os.path.join(
            self.results_path,
            f"regression_{agent_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        )
        with open(report_path, 'w') as f:
            json.dump(report, f, indent=2, default=str)

        logger.info(
            f"Regression completed: {report['summary']['passed']} passed, "
            f"{report['summary']['failed']} failed, "
            f"pass rate: {report['summary']['pass_rate']:.1%}"
        )

        return report

    # ==================== Scenario Management ====================

    def create_scenario(
        self,
        agent_id: str,
        name: str,
        description: str,
        user_messages: List[str],
        expected_keywords: Optional[List[str]] = None,
        expected_functions: Optional[List[str]] = None,
        expected_outcome: str = "",
        success_criteria: Optional[Dict[str, Any]] = None,
        timeout_seconds: int = 60,
        tags: Optional[List[str]] = None
    ) -> TestScenario:
        """Create a new test scenario"""
        scenario = TestScenario(
            id=str(uuid.uuid4()),
            name=name,
            description=description,
            agent_id=agent_id,
            user_messages=user_messages,
            expected_keywords=expected_keywords or [],
            expected_functions=expected_functions or [],
            expected_outcome=expected_outcome,
            success_criteria=success_criteria or {},
            timeout_seconds=timeout_seconds,
            tags=tags or []
        )

        logger.info(f"Created test scenario: {name} ({scenario.id})")
        return scenario

    async def save_scenario(self, scenario: TestScenario) -> bool:
        """Save a test scenario to storage"""
        try:
            scenario.updated_at = datetime.now()
            filepath = os.path.join(self.scenarios_path, f"{scenario.id}.json")

            with open(filepath, 'w') as f:
                json.dump(scenario.to_dict(), f, indent=2, default=str)

            logger.info(f"Saved scenario: {scenario.name}")
            return True

        except Exception as e:
            logger.error(f"Failed to save scenario: {e}")
            return False

    async def load_scenario(self, scenario_id: str) -> Optional[TestScenario]:
        """Load a test scenario from storage"""
        try:
            filepath = os.path.join(self.scenarios_path, f"{scenario_id}.json")

            if not os.path.exists(filepath):
                return None

            with open(filepath, 'r') as f:
                data = json.load(f)

            return TestScenario.from_dict(data)

        except Exception as e:
            logger.error(f"Failed to load scenario {scenario_id}: {e}")
            return None

    async def list_scenarios(
        self,
        agent_id: Optional[str] = None,
        tags: Optional[List[str]] = None
    ) -> List[TestScenario]:
        """List all test scenarios, optionally filtered"""
        scenarios = []

        try:
            for filename in os.listdir(self.scenarios_path):
                if filename.endswith('.json'):
                    filepath = os.path.join(self.scenarios_path, filename)
                    with open(filepath, 'r') as f:
                        data = json.load(f)

                    scenario = TestScenario.from_dict(data)

                    # Apply filters
                    if agent_id and scenario.agent_id != agent_id:
                        continue

                    if tags and not any(tag in scenario.tags for tag in tags):
                        continue

                    scenarios.append(scenario)

        except Exception as e:
            logger.error(f"Failed to list scenarios: {e}")

        return sorted(scenarios, key=lambda s: s.created_at, reverse=True)

    async def delete_scenario(self, scenario_id: str) -> bool:
        """Delete a test scenario"""
        try:
            filepath = os.path.join(self.scenarios_path, f"{scenario_id}.json")

            if os.path.exists(filepath):
                os.remove(filepath)
                logger.info(f"Deleted scenario: {scenario_id}")
                return True

            return False

        except Exception as e:
            logger.error(f"Failed to delete scenario {scenario_id}: {e}")
            return False

    # ==================== Suite Management ====================

    def create_suite(
        self,
        agent_id: str,
        name: str,
        scenario_ids: List[str],
        description: str = "",
        tags: Optional[List[str]] = None
    ) -> TestSuite:
        """Create a new test suite from scenario IDs"""
        suite = TestSuite(
            id=str(uuid.uuid4()),
            name=name,
            agent_id=agent_id,
            description=description,
            tags=tags or []
        )

        # Load scenarios
        for scenario_id in scenario_ids:
            scenario = asyncio.run(self.load_scenario(scenario_id))
            if scenario:
                suite.scenarios.append(scenario)

        logger.info(f"Created test suite: {name} with {len(suite.scenarios)} scenarios")
        return suite

    async def save_suite(self, suite: TestSuite) -> bool:
        """Save a test suite to storage"""
        try:
            suite.updated_at = datetime.now()
            filepath = os.path.join(self.suites_path, f"{suite.id}.json")

            with open(filepath, 'w') as f:
                json.dump(suite.to_dict(), f, indent=2, default=str)

            logger.info(f"Saved suite: {suite.name}")
            return True

        except Exception as e:
            logger.error(f"Failed to save suite: {e}")
            return False

    async def load_suite(self, suite_id: str) -> Optional[TestSuite]:
        """Load a test suite from storage"""
        try:
            filepath = os.path.join(self.suites_path, f"{suite_id}.json")

            if not os.path.exists(filepath):
                return None

            with open(filepath, 'r') as f:
                data = json.load(f)

            return TestSuite.from_dict(data)

        except Exception as e:
            logger.error(f"Failed to load suite {suite_id}: {e}")
            return None

    # ==================== Results Management ====================

    async def save_result(self, result: TestResult) -> bool:
        """Save a test result"""
        try:
            filepath = os.path.join(self.results_path, f"{result.id}.json")

            with open(filepath, 'w') as f:
                json.dump(result.to_dict(), f, indent=2, default=str)

            return True

        except Exception as e:
            logger.error(f"Failed to save result: {e}")
            return False

    async def load_result(self, result_id: str) -> Optional[TestResult]:
        """Load a test result"""
        try:
            filepath = os.path.join(self.results_path, f"{result_id}.json")

            if not os.path.exists(filepath):
                return None

            with open(filepath, 'r') as f:
                data = json.load(f)

            return TestResult.from_dict(data)

        except Exception as e:
            logger.error(f"Failed to load result {result_id}: {e}")
            return None

    # ==================== Reporting ====================

    def generate_report(
        self,
        results: List[TestResult],
        scenarios: Optional[List[TestScenario]] = None
    ) -> Dict[str, Any]:
        """
        Generate a comprehensive test report.

        Args:
            results: List of test results
            scenarios: Optional list of scenarios for additional context

        Returns:
            Report dictionary with summary, details, and metrics
        """
        total = len(results)
        passed = sum(1 for r in results if r.passed)
        failed = sum(1 for r in results if not r.passed)

        # Calculate aggregate metrics
        avg_latency = sum(r.latency_ms for r in results) / total if total > 0 else 0
        avg_duration = sum(r.duration_seconds for r in results) / total if total > 0 else 0
        total_errors = sum(len(r.errors) for r in results)
        total_warnings = sum(len(r.warnings) for r in results)

        # Build scenario map
        scenario_map = {}
        if scenarios:
            scenario_map = {s.id: s for s in scenarios}

        # Detailed results
        detailed_results = []
        for result in results:
            scenario = scenario_map.get(result.scenario_id)
            detailed_results.append({
                'result_id': result.id,
                'scenario_id': result.scenario_id,
                'scenario_name': scenario.name if scenario else 'Unknown',
                'passed': result.passed,
                'duration_seconds': result.duration_seconds,
                'latency_ms': result.latency_ms,
                'errors': result.errors,
                'warnings': result.warnings,
                'metrics': result.metrics
            })

        report = {
            'summary': {
                'total_scenarios': total,
                'passed': passed,
                'failed': failed,
                'pass_rate': passed / total if total > 0 else 0.0,
                'avg_latency_ms': avg_latency,
                'avg_duration_seconds': avg_duration,
                'total_errors': total_errors,
                'total_warnings': total_warnings
            },
            'results': detailed_results,
            'generated_at': datetime.now().isoformat()
        }

        return report

    def compare_results(
        self,
        old_results: List[TestResult],
        new_results: List[TestResult]
    ) -> Dict[str, Any]:
        """
        Compare two sets of test results to identify regressions.

        Args:
            old_results: Previous test run results
            new_results: Current test run results

        Returns:
            Comparison report showing regressions and improvements
        """
        # Map results by scenario ID
        old_map = {r.scenario_id: r for r in old_results}
        new_map = {r.scenario_id: r for r in new_results}

        # Find regressions (previously passed, now failed)
        regressions = []
        for scenario_id, new_result in new_map.items():
            old_result = old_map.get(scenario_id)
            if old_result and old_result.passed and not new_result.passed:
                regressions.append({
                    'scenario_id': scenario_id,
                    'old_result': old_result.to_dict(),
                    'new_result': new_result.to_dict(),
                    'error_diff': [e for e in new_result.errors if e not in old_result.errors]
                })

        # Find improvements (previously failed, now passed)
        improvements = []
        for scenario_id, new_result in new_map.items():
            old_result = old_map.get(scenario_id)
            if old_result and not old_result.passed and new_result.passed:
                improvements.append({
                    'scenario_id': scenario_id,
                    'old_result': old_result.to_dict(),
                    'new_result': new_result.to_dict()
                })

        # Performance changes
        performance_changes = []
        for scenario_id in set(old_map.keys()) & set(new_map.keys()):
            old_result = old_map[scenario_id]
            new_result = new_map[scenario_id]

            latency_change = new_result.latency_ms - old_result.latency_ms
            latency_pct_change = (latency_change / old_result.latency_ms * 100) if old_result.latency_ms > 0 else 0

            if abs(latency_pct_change) > 10:  # More than 10% change
                performance_changes.append({
                    'scenario_id': scenario_id,
                    'old_latency_ms': old_result.latency_ms,
                    'new_latency_ms': new_result.latency_ms,
                    'change_ms': latency_change,
                    'change_pct': latency_pct_change
                })

        # Summary
        old_pass_rate = sum(1 for r in old_results if r.passed) / len(old_results) if old_results else 0
        new_pass_rate = sum(1 for r in new_results if r.passed) / len(new_results) if new_results else 0

        return {
            'summary': {
                'old_pass_rate': old_pass_rate,
                'new_pass_rate': new_pass_rate,
                'pass_rate_change': new_pass_rate - old_pass_rate,
                'regressions_count': len(regressions),
                'improvements_count': len(improvements),
                'performance_changes_count': len(performance_changes)
            },
            'regressions': regressions,
            'improvements': improvements,
            'performance_changes': performance_changes,
            'compared_at': datetime.now().isoformat()
        }

    # ==================== Built-in Test Scenarios ====================

    def get_builtin_scenarios(self, agent_id: str) -> List[TestScenario]:
        """
        Get built-in test scenarios for common use cases.

        Returns a list of pre-configured scenarios that can be used
        immediately or customized for specific agents.
        """
        return [
            # Greeting test
            TestScenario(
                id=f"builtin_greeting_{agent_id}",
                name="Greeting Test",
                description="Tests basic greeting and introduction",
                agent_id=agent_id,
                user_messages=["Hello", "How are you?"],
                expected_keywords=["hello", "hi", "help", "assist"],
                expected_outcome="Agent greets user and offers assistance",
                success_criteria={
                    'min_confidence': 0.8,
                    'max_latency_ms': 2000,
                    'min_keyword_matches': 1
                },
                tags=["greeting", "basic", "smoke"]
            ),

            # Appointment booking flow
            TestScenario(
                id=f"builtin_appointment_{agent_id}",
                name="Appointment Booking",
                description="Tests end-to-end appointment scheduling",
                agent_id=agent_id,
                user_messages=[
                    "I'd like to book an appointment",
                    "Next Tuesday at 2pm",
                    "Yes, that works for me"
                ],
                expected_keywords=["appointment", "schedule", "booked", "confirmed"],
                expected_functions=["book_appointment", "check_availability"],
                expected_outcome="Appointment successfully booked with confirmation",
                success_criteria={
                    'min_confidence': 0.75,
                    'max_latency_ms': 3000,
                    'min_keyword_matches': 2,
                    'min_function_calls': 1
                },
                tags=["appointment", "booking", "integration"]
            ),

            # FAQ handling
            TestScenario(
                id=f"builtin_faq_{agent_id}",
                name="FAQ Handling",
                description="Tests handling of frequently asked questions",
                agent_id=agent_id,
                user_messages=[
                    "What are your business hours?",
                    "Do you offer refunds?",
                    "How do I contact support?"
                ],
                expected_keywords=["hours", "open", "refund", "policy", "contact", "support"],
                expected_outcome="Agent provides accurate answers to common questions",
                success_criteria={
                    'min_confidence': 0.8,
                    'max_latency_ms': 2500,
                    'min_keyword_matches': 3
                },
                tags=["faq", "knowledge", "basic"]
            ),

            # Transfer request
            TestScenario(
                id=f"builtin_transfer_{agent_id}",
                name="Transfer to Human",
                description="Tests ability to handle transfer requests",
                agent_id=agent_id,
                user_messages=[
                    "This isn't helping",
                    "I want to speak to a real person",
                    "Can you transfer me?"
                ],
                expected_keywords=["transfer", "human", "person", "agent"],
                expected_functions=["transfer_call", "escalate"],
                expected_outcome="Agent recognizes request and initiates transfer",
                success_criteria={
                    'min_confidence': 0.7,
                    'max_latency_ms': 2000,
                    'min_function_calls': 1
                },
                tags=["transfer", "escalation", "edge-case"]
            ),

            # Error handling
            TestScenario(
                id=f"builtin_error_{agent_id}",
                name="Error Handling",
                description="Tests handling of unclear or invalid inputs",
                agent_id=agent_id,
                user_messages=[
                    "asdfghjkl",
                    "???",
                    "I don't understand what you're asking"
                ],
                expected_keywords=["sorry", "understand", "clarify", "help"],
                expected_outcome="Agent handles confusion gracefully and asks for clarification",
                success_criteria={
                    'min_confidence': 0.6,
                    'max_latency_ms': 2500,
                    'min_keyword_matches': 1
                },
                tags=["error", "edge-case", "robustness"]
            )
        ]

    # ==================== Event Callbacks ====================

    def on_test_started(self, callback: Callable):
        """Register callback for test started events"""
        self._on_test_started = callback

    def on_test_completed(self, callback: Callable):
        """Register callback for test completed events"""
        self._on_test_completed = callback

    def on_test_failed(self, callback: Callable):
        """Register callback for test failed events"""
        self._on_test_failed = callback

    # ==================== Utility Methods ====================

    async def _maybe_call_async(self, func: Callable, *args, **kwargs) -> None:
        """Call a function, handling both sync and async callables"""
        if asyncio.iscoroutinefunction(func):
            await func(*args, **kwargs)
        else:
            func(*args, **kwargs)


# Singleton instance
_voice_test_runner: Optional[VoiceTestRunner] = None


def get_voice_test_runner(storage_path: Optional[str] = None) -> VoiceTestRunner:
    """Get or create the voice test runner instance"""
    global _voice_test_runner
    if _voice_test_runner is None:
        _voice_test_runner = VoiceTestRunner(storage_path)
    return _voice_test_runner
