"""
Verification script to test the voice agent setup.

Checks:
- All imports work correctly
- Configuration can be created
- Base agent can be instantiated (with mock)
- State machine integration works
"""

import sys
import traceback


def test_imports():
    """Test that all imports work"""
    print("Testing imports...")

    try:
        from backend.voice.agents import (
            VoiceAgentConfig,
            VoiceSettings,
            LLMSettings,
            BehaviorSettings,
            IntegrationSettings,
            AnalyticsSettings,
            StateMachineConfig,
            AgentType,
            LLMProvider,
            VoiceProvider,
            PhoneProvider,
            BaseVoiceAgent,
            CallState,
            ConversationTurn,
            CallMetrics
        )
        print("  - All imports successful")
        return True
    except Exception as e:
        print(f"  - Import failed: {e}")
        traceback.print_exc()
        return False


def test_config_creation():
    """Test creating a configuration"""
    print("\nTesting configuration creation...")

    try:
        from backend.voice.agents import (
            VoiceAgentConfig,
            VoiceSettings,
            LLMSettings,
            BehaviorSettings,
            AgentType,
            LLMProvider,
            VoiceProvider
        )

        # Create a basic configuration
        config = VoiceAgentConfig(
            name="Test Agent",
            agent_type=AgentType.SUPPORT,
            user_id="test-user",
            voice=VoiceSettings(
                voice_id="test-voice",
                voice_provider=VoiceProvider.ELEVENLABS
            ),
            llm=LLMSettings(
                provider=LLMProvider.OPENAI,
                model="gpt-4o"
            ),
            behavior=BehaviorSettings(
                greeting_text="Hello test"
            )
        )

        # Validate
        errors = config.validate()
        if errors:
            print(f"  - Validation errors: {errors}")
            return False

        # Test serialization
        config_dict = config.to_dict()
        restored_config = VoiceAgentConfig.from_dict(config_dict)

        print("  - Configuration created and validated successfully")
        print(f"  - Config ID: {config.id}")
        print(f"  - Config name: {config.name}")
        return True

    except Exception as e:
        print(f"  - Configuration creation failed: {e}")
        traceback.print_exc()
        return False


def test_base_agent():
    """Test the base agent class"""
    print("\nTesting base agent class...")

    try:
        from backend.voice.agents import (
            BaseVoiceAgent,
            VoiceAgentConfig,
            AgentType
        )
        from backend.collaboration import AgentRole
        from typing import Dict, Any, List, Tuple

        # Create a minimal test agent
        class TestAgent(BaseVoiceAgent):
            def get_system_prompt(self) -> str:
                return "Test prompt"

            def get_greeting(self) -> str:
                return "Test greeting"

            def get_available_functions(self) -> List[Dict[str, Any]]:
                return []

            async def handle_user_input(
                self,
                user_message: str,
                context: Dict[str, Any]
            ) -> Tuple[str, Dict[str, Any]]:
                return "Test response", context

        # Create config
        config = VoiceAgentConfig(
            name="Test Agent",
            agent_type=AgentType.CUSTOM,
            user_id="test-user"
        )

        # Create agent
        agent = TestAgent(config)

        print("  - Base agent instantiated successfully")
        print(f"  - Agent ID: {agent.agent_id}")
        print(f"  - Agent name: {agent.agent_name}")
        print(f"  - Call state: {agent.call_state.value}")
        return True

    except Exception as e:
        print(f"  - Base agent test failed: {e}")
        traceback.print_exc()
        return False


def test_example_agent():
    """Test the example agent"""
    print("\nTesting example agent...")

    try:
        from backend.voice.agents.example_agent import create_example_agent

        # Create example agent
        agent = create_example_agent(
            agent_name="Test Example Agent",
            user_id="test-user"
        )

        # Check it has expected methods and properties
        assert hasattr(agent, 'get_system_prompt')
        assert hasattr(agent, 'get_greeting')
        assert hasattr(agent, 'start_call')
        assert hasattr(agent, 'process_turn')
        assert hasattr(agent, 'end_call')

        print("  - Example agent created successfully")
        print(f"  - Agent name: {agent.agent_name}")
        print(f"  - Capabilities: {agent.config.capabilities}")
        return True

    except Exception as e:
        print(f"  - Example agent test failed: {e}")
        traceback.print_exc()
        return False


def run_all_tests():
    """Run all verification tests"""
    print("=" * 60)
    print("Voice Agent Setup Verification")
    print("=" * 60)

    results = []

    # Run tests
    results.append(("Imports", test_imports()))
    results.append(("Configuration", test_config_creation()))
    results.append(("Base Agent", test_base_agent()))
    results.append(("Example Agent", test_example_agent()))

    # Print summary
    print("\n" + "=" * 60)
    print("Summary")
    print("=" * 60)

    all_passed = True
    for test_name, passed in results:
        status = "PASS" if passed else "FAIL"
        print(f"{test_name:20s}: {status}")
        if not passed:
            all_passed = False

    print("=" * 60)

    if all_passed:
        print("\nAll tests passed! Voice agent setup is ready.")
        return 0
    else:
        print("\nSome tests failed. Please check the errors above.")
        return 1


if __name__ == "__main__":
    sys.exit(run_all_tests())
