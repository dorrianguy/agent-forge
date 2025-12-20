"""
Test script for VoiceAgentFactory
Validates factory functionality and agent creation
"""

import sys
from voice_agent_factory import (
    VoiceAgentFactory,
    get_factory,
    create_agent,
    list_agent_types,
    get_agent_info,
)
from voice_agent_types import VoiceAgentType
from voice_agent_config import VoiceAgentConfig


def test_factory_initialization():
    """Test factory initialization"""
    print("🧪 Test 1: Factory Initialization")
    factory = VoiceAgentFactory()
    assert len(factory.list_available_types()) == 20, "Should have 20 agent types"
    print(f"✅ Factory initialized with {len(factory.list_available_types())} agent types")


def test_create_all_agent_types():
    """Test creating all agent types"""
    print("\n🧪 Test 2: Creating All Agent Types")
    factory = get_factory()

    for agent_type in factory.list_available_types():
        config = VoiceAgentConfig(
            name=f"Test {agent_type.value}",
            user_id="test_user"
        )
        agent = factory.create(agent_type, config)
        assert agent is not None, f"Agent {agent_type.value} should be created"
        print(f"✅ Created {agent_type.value}")


def test_agent_metadata():
    """Test getting agent metadata"""
    print("\n🧪 Test 3: Agent Metadata")
    factory = get_factory()

    info = factory.get_agent_info(VoiceAgentType.VOICE_CUSTOMER_SUPPORT)
    assert 'name' in info, "Should have name"
    assert 'description' in info, "Should have description"
    assert 'category' in info, "Should have category"
    print(f"✅ Metadata: {info['name']} - {info['description']}")


def test_categories():
    """Test category organization"""
    print("\n🧪 Test 4: Categories")
    factory = get_factory()

    categories = factory.get_all_categories()
    assert 'customer_service' in categories, "Should have customer_service category"
    assert 'sales' in categories, "Should have sales category"
    assert 'healthcare' in categories, "Should have healthcare category"
    assert 'financial' in categories, "Should have financial category"
    assert 'hospitality' in categories, "Should have hospitality category"

    for category in categories:
        agents = factory.get_agents_by_category(category)
        print(f"✅ {category}: {len(agents)} agents")


def test_agent_template_application():
    """Test that templates are applied correctly"""
    print("\n🧪 Test 5: Template Application")
    factory = get_factory()

    config = VoiceAgentConfig(
        name="Template Test",
        user_id="test_user"
    )

    agent = factory.create(VoiceAgentType.VOICE_TECHNICAL_SUPPORT, config)
    system_prompt = agent.get_system_prompt()
    greeting = agent.get_greeting()

    assert system_prompt != "You are a helpful AI assistant.", "Should have custom prompt"
    assert "tech" in system_prompt.lower() or "technical" in system_prompt.lower(), \
        "Should be tech support prompt"
    print(f"✅ Template applied - Greeting: {greeting[:50]}...")


def test_custom_agent_registration():
    """Test registering custom agent types"""
    print("\n🧪 Test 6: Custom Agent Registration")
    from voice_agent_factory import BaseVoiceAgent

    class CustomAgent(BaseVoiceAgent):
        agent_type = VoiceAgentType.VOICE_CUSTOMER_SUPPORT

    factory = VoiceAgentFactory()
    factory.register(VoiceAgentType.VOICE_CUSTOMER_SUPPORT, CustomAgent)

    config = VoiceAgentConfig(name="Custom", user_id="test")
    agent = factory.create(VoiceAgentType.VOICE_CUSTOMER_SUPPORT, config)

    assert isinstance(agent, CustomAgent), "Should create custom agent"
    print("✅ Custom agent registered and created")


def test_convenience_functions():
    """Test convenience functions"""
    print("\n🧪 Test 7: Convenience Functions")

    types = list_agent_types()
    assert len(types) == 20, "Should list all types"

    info = get_agent_info(VoiceAgentType.VOICE_LEAD_QUALIFIER)
    assert info['category'] == 'sales', "Should be sales category"

    config = VoiceAgentConfig(name="Convenience Test", user_id="test")
    agent = create_agent(VoiceAgentType.VOICE_OUTBOUND_SALES, config)
    assert agent is not None, "Should create agent"

    print("✅ Convenience functions work")


def run_all_tests():
    """Run all tests"""
    print("""
    ╔═══════════════════════════════════════════════════════════════╗
    ║       🧪 Voice Agent Factory Test Suite 🧪                    ║
    ╚═══════════════════════════════════════════════════════════════╝
    """)

    try:
        test_factory_initialization()
        test_create_all_agent_types()
        test_agent_metadata()
        test_categories()
        test_agent_template_application()
        test_custom_agent_registration()
        test_convenience_functions()

        print("\n" + "="*65)
        print("✅ ALL TESTS PASSED!")
        print("="*65)
        return True

    except AssertionError as e:
        print(f"\n❌ TEST FAILED: {e}")
        return False
    except Exception as e:
        print(f"\n❌ ERROR: {e}")
        import traceback
        traceback.print_exc()
        return False


if __name__ == "__main__":
    success = run_all_tests()
    sys.exit(0 if success else 1)
