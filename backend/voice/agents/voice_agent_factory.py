"""
Agent Forge - Voice Agent Factory
Creates voice agents using the factory pattern.

This factory instantiates any of the 20 specialized voice agent types,
applying the correct configuration, templates, and capabilities.
"""

import logging
from typing import Dict, Type, List, Any, Optional
from dataclasses import asdict

from .voice_agent_types import (
    VoiceAgentType,
    VoiceAgentCapability,
    VOICE_AGENT_METADATA,
    get_agent_metadata,
    get_agents_by_category,
    get_all_categories,
)
from .voice_agent_config import VoiceAgentConfig
from .voice_agent_templates import (
    get_template,
    get_system_prompt,
    get_greeting,
    get_fallback_responses,
    get_transfer_phrases,
    get_closing_phrases,
)

logger = logging.getLogger('AgentForge.VoiceFactory')


# ============================================
# Base Voice Agent Class
# ============================================

class BaseVoiceAgent:
    """
    Base class for all voice agents.
    Each specialized agent type inherits from this.
    """

    agent_type: VoiceAgentType = VoiceAgentType.VOICE_CUSTOMER_SUPPORT

    def __init__(self, config: VoiceAgentConfig):
        """
        Initialize voice agent with configuration.

        Args:
            config: VoiceAgentConfig instance with all settings
        """
        self.config = config
        self.agent_type = config.agent_type if hasattr(config, 'agent_type') else self.agent_type
        self.metadata = get_agent_metadata(self.get_voice_agent_type())
        self.template = get_template(self.get_voice_agent_type())

        # Apply template defaults if not set in config
        self._apply_template_defaults()

        logger.info(f"Initialized {self.__class__.__name__} with config ID: {config.id}")

    def get_voice_agent_type(self) -> VoiceAgentType:
        """Get the VoiceAgentType enum for this agent"""
        return self.agent_type

    def _apply_template_defaults(self):
        """Apply template defaults to config if not already set"""
        voice_type = self.get_voice_agent_type()

        # Set system prompt from template if not custom
        template_prompt = get_system_prompt(voice_type)
        if template_prompt and (not self.config.behavior.system_prompt or
                                self.config.behavior.system_prompt == "You are a helpful AI assistant."):
            self.config.behavior.system_prompt = template_prompt

        # Set greeting from template if not custom
        template_greeting = get_greeting(voice_type)
        if template_greeting and (not self.config.behavior.greeting_text or
                                  self.config.behavior.greeting_text == "Hello! How can I help you today?"):
            self.config.behavior.greeting_text = template_greeting

        # Set default voice from metadata
        if self.metadata.get('default_voice'):
            if self.config.voice.voice_id == "default":
                self.config.voice.voice_id = self.metadata['default_voice']

        # Set default capabilities from metadata
        if self.metadata.get('default_capabilities'):
            if not self.config.capabilities:
                self.config.capabilities = [
                    cap.value for cap in self.metadata['default_capabilities']
                ]

    def get_metadata(self) -> Dict[str, Any]:
        """Get agent metadata"""
        return {
            'agent_type': self.get_voice_agent_type().value,
            'name': self.metadata.get('name', 'Voice Agent'),
            'description': self.metadata.get('description', ''),
            'category': self.metadata.get('category', 'unknown'),
            'capabilities': [cap.value for cap in self.metadata.get('default_capabilities', [])],
            'avg_call_duration': self.metadata.get('avg_call_duration', 180),
            'default_voice': self.metadata.get('default_voice', 'alloy'),
        }

    def get_config(self) -> Dict[str, Any]:
        """Get agent configuration as dictionary"""
        return self.config.to_dict()

    def get_system_prompt(self) -> str:
        """Get the system prompt for this agent"""
        return self.config.behavior.system_prompt

    def get_greeting(self) -> str:
        """Get the greeting message"""
        return self.config.behavior.greeting_text

    def get_fallback_responses(self) -> List[str]:
        """Get fallback responses for this agent type"""
        return get_fallback_responses(self.get_voice_agent_type())

    def get_transfer_phrases(self) -> List[str]:
        """Get transfer phrases for this agent type"""
        return get_transfer_phrases(self.get_voice_agent_type())

    def get_closing_phrases(self) -> List[str]:
        """Get closing phrases for this agent type"""
        return get_closing_phrases(self.get_voice_agent_type())

    def __repr__(self) -> str:
        """String representation"""
        return f"{self.__class__.__name__}(id={self.config.id}, name={self.config.name})"


# ============================================
# Customer Service Agents (1-5)
# ============================================

class VoiceCustomerSupportAgent(BaseVoiceAgent):
    """General customer service, FAQ handling, and issue resolution"""
    agent_type = VoiceAgentType.VOICE_CUSTOMER_SUPPORT


class VoiceTechnicalSupportAgent(BaseVoiceAgent):
    """Tier 1 tech support, troubleshooting, guided diagnostics"""
    agent_type = VoiceAgentType.VOICE_TECHNICAL_SUPPORT


class VoiceBillingSupportAgent(BaseVoiceAgent):
    """Payment inquiries, account balance, payment processing"""
    agent_type = VoiceAgentType.VOICE_BILLING_SUPPORT


class VoiceOrderStatusAgent(BaseVoiceAgent):
    """Order tracking, shipping updates, delivery rescheduling"""
    agent_type = VoiceAgentType.VOICE_ORDER_STATUS


class VoiceReturnsExchangesAgent(BaseVoiceAgent):
    """Return initiation, exchange processing, refund status"""
    agent_type = VoiceAgentType.VOICE_RETURNS_EXCHANGES


# ============================================
# Sales & Lead Generation Agents (6-10)
# ============================================

class VoiceLeadQualifierAgent(BaseVoiceAgent):
    """Inbound lead qualification, BANT scoring, demo scheduling"""
    agent_type = VoiceAgentType.VOICE_LEAD_QUALIFIER


class VoiceOutboundSalesAgent(BaseVoiceAgent):
    """Cold calling, product pitches, objection handling"""
    agent_type = VoiceAgentType.VOICE_OUTBOUND_SALES


class VoiceAppointmentSetterAgent(BaseVoiceAgent):
    """Demo scheduling, calendar management, confirmation calls"""
    agent_type = VoiceAgentType.VOICE_APPOINTMENT_SETTER


class VoiceRenewalAgent(BaseVoiceAgent):
    """Subscription renewals, upselling, win-back campaigns"""
    agent_type = VoiceAgentType.VOICE_RENEWAL_AGENT


class VoiceSurveyAgent(BaseVoiceAgent):
    """Customer satisfaction surveys, NPS collection, feedback"""
    agent_type = VoiceAgentType.VOICE_SURVEY_AGENT


# ============================================
# Healthcare Agents (11-13)
# ============================================

class VoiceAppointmentReminderAgent(BaseVoiceAgent):
    """Medical appointment reminders, rescheduling, pre-visit info"""
    agent_type = VoiceAgentType.VOICE_APPOINTMENT_REMINDER


class VoicePrescriptionRefillAgent(BaseVoiceAgent):
    """Pharmacy refill requests, pickup notifications"""
    agent_type = VoiceAgentType.VOICE_PRESCRIPTION_REFILL


class VoicePatientIntakeAgent(BaseVoiceAgent):
    """Pre-visit information gathering, insurance verification"""
    agent_type = VoiceAgentType.VOICE_PATIENT_INTAKE


# ============================================
# Financial Services Agents (14-16)
# ============================================

class VoiceFraudVerificationAgent(BaseVoiceAgent):
    """Transaction verification, suspicious activity alerts"""
    agent_type = VoiceAgentType.VOICE_FRAUD_VERIFICATION


class VoiceDebtCollectionAgent(BaseVoiceAgent):
    """Payment reminders, payment plan setup, compliance handling"""
    agent_type = VoiceAgentType.VOICE_DEBT_COLLECTION


class VoiceLoanApplicationAgent(BaseVoiceAgent):
    """Pre-qualification, application intake, document collection"""
    agent_type = VoiceAgentType.VOICE_LOAN_APPLICATION


# ============================================
# Hospitality & Services Agents (17-20)
# ============================================

class VoiceRestaurantBookingAgent(BaseVoiceAgent):
    """Reservation booking, modification, waitlist management"""
    agent_type = VoiceAgentType.VOICE_RESTAURANT_BOOKING


class VoiceHotelConciergeAgent(BaseVoiceAgent):
    """Room service, amenity requests, local recommendations"""
    agent_type = VoiceAgentType.VOICE_HOTEL_CONCIERGE


class VoicePropertyShowingAgent(BaseVoiceAgent):
    """Real estate showing scheduling, property information"""
    agent_type = VoiceAgentType.VOICE_PROPERTY_SHOWING


class VoiceServiceDispatchAgent(BaseVoiceAgent):
    """Field service scheduling, technician dispatch, ETAs"""
    agent_type = VoiceAgentType.VOICE_SERVICE_DISPATCH


# ============================================
# Voice Agent Factory
# ============================================

class VoiceAgentFactory:
    """
    Factory for creating voice agents.

    Provides a centralized registry of all voice agent types and
    creates instances with proper configuration.
    """

    def __init__(self):
        """Initialize the factory with agent registry"""
        self._registry: Dict[VoiceAgentType, Type[BaseVoiceAgent]] = {}
        self._register_default_agents()
        logger.info("VoiceAgentFactory initialized with %d agent types", len(self._registry))

    def _register_default_agents(self):
        """Register all default agent types"""
        # Customer Service (5 agents)
        self._registry[VoiceAgentType.VOICE_CUSTOMER_SUPPORT] = VoiceCustomerSupportAgent
        self._registry[VoiceAgentType.VOICE_TECHNICAL_SUPPORT] = VoiceTechnicalSupportAgent
        self._registry[VoiceAgentType.VOICE_BILLING_SUPPORT] = VoiceBillingSupportAgent
        self._registry[VoiceAgentType.VOICE_ORDER_STATUS] = VoiceOrderStatusAgent
        self._registry[VoiceAgentType.VOICE_RETURNS_EXCHANGES] = VoiceReturnsExchangesAgent

        # Sales (5 agents)
        self._registry[VoiceAgentType.VOICE_LEAD_QUALIFIER] = VoiceLeadQualifierAgent
        self._registry[VoiceAgentType.VOICE_OUTBOUND_SALES] = VoiceOutboundSalesAgent
        self._registry[VoiceAgentType.VOICE_APPOINTMENT_SETTER] = VoiceAppointmentSetterAgent
        self._registry[VoiceAgentType.VOICE_RENEWAL_AGENT] = VoiceRenewalAgent
        self._registry[VoiceAgentType.VOICE_SURVEY_AGENT] = VoiceSurveyAgent

        # Healthcare (3 agents)
        self._registry[VoiceAgentType.VOICE_APPOINTMENT_REMINDER] = VoiceAppointmentReminderAgent
        self._registry[VoiceAgentType.VOICE_PRESCRIPTION_REFILL] = VoicePrescriptionRefillAgent
        self._registry[VoiceAgentType.VOICE_PATIENT_INTAKE] = VoicePatientIntakeAgent

        # Financial (3 agents)
        self._registry[VoiceAgentType.VOICE_FRAUD_VERIFICATION] = VoiceFraudVerificationAgent
        self._registry[VoiceAgentType.VOICE_DEBT_COLLECTION] = VoiceDebtCollectionAgent
        self._registry[VoiceAgentType.VOICE_LOAN_APPLICATION] = VoiceLoanApplicationAgent

        # Hospitality (4 agents)
        self._registry[VoiceAgentType.VOICE_RESTAURANT_BOOKING] = VoiceRestaurantBookingAgent
        self._registry[VoiceAgentType.VOICE_HOTEL_CONCIERGE] = VoiceHotelConciergeAgent
        self._registry[VoiceAgentType.VOICE_PROPERTY_SHOWING] = VoicePropertyShowingAgent
        self._registry[VoiceAgentType.VOICE_SERVICE_DISPATCH] = VoiceServiceDispatchAgent

    def create(
        self,
        agent_type: VoiceAgentType,
        config: VoiceAgentConfig
    ) -> BaseVoiceAgent:
        """
        Create a voice agent instance.

        Args:
            agent_type: The type of voice agent to create
            config: Configuration for the agent

        Returns:
            Initialized voice agent instance

        Raises:
            ValueError: If agent_type is not registered
        """
        if agent_type not in self._registry:
            raise ValueError(
                f"Agent type {agent_type.value} is not registered. "
                f"Available types: {[t.value for t in self._registry.keys()]}"
            )

        agent_class = self._registry[agent_type]

        # Ensure config has correct agent type set
        # Note: VoiceAgentConfig uses a different AgentType enum, so we store it in metadata
        if 'voice_agent_type' not in config.metadata:
            config.metadata['voice_agent_type'] = agent_type.value

        agent = agent_class(config)

        logger.info(f"Created {agent_class.__name__} with ID: {config.id}")

        return agent

    def register(
        self,
        agent_type: VoiceAgentType,
        agent_class: Type[BaseVoiceAgent]
    ):
        """
        Register a custom agent type.

        Args:
            agent_type: The voice agent type enum
            agent_class: The agent class to register

        Raises:
            TypeError: If agent_class is not a subclass of BaseVoiceAgent
        """
        if not issubclass(agent_class, BaseVoiceAgent):
            raise TypeError(
                f"Agent class must be a subclass of BaseVoiceAgent, "
                f"got {agent_class.__name__}"
            )

        self._registry[agent_type] = agent_class
        logger.info(f"Registered custom agent: {agent_type.value} -> {agent_class.__name__}")

    def list_available_types(self) -> List[VoiceAgentType]:
        """
        List all available agent types.

        Returns:
            List of registered VoiceAgentType enums
        """
        return list(self._registry.keys())

    def get_agent_info(self, agent_type: VoiceAgentType) -> Dict[str, Any]:
        """
        Get metadata and information about an agent type.

        Args:
            agent_type: The voice agent type to query

        Returns:
            Dictionary with agent metadata

        Raises:
            ValueError: If agent_type is not registered
        """
        if agent_type not in self._registry:
            raise ValueError(
                f"Agent type {agent_type.value} is not registered. "
                f"Available types: {[t.value for t in self._registry.keys()]}"
            )

        agent_class = self._registry[agent_type]
        metadata = get_agent_metadata(agent_type)
        template = get_template(agent_type)

        return {
            'agent_type': agent_type.value,
            'agent_class': agent_class.__name__,
            'name': metadata.get('name', 'Unknown'),
            'description': metadata.get('description', ''),
            'category': metadata.get('category', 'unknown'),
            'default_capabilities': [
                cap.value for cap in metadata.get('default_capabilities', [])
            ],
            'default_voice': metadata.get('default_voice', 'alloy'),
            'avg_call_duration': metadata.get('avg_call_duration', 180),
            'has_template': bool(template),
            'template_sections': list(template.keys()) if template else [],
        }

    def get_agents_by_category(self, category: str) -> List[Dict[str, Any]]:
        """
        Get all agent types in a specific category.

        Args:
            category: Category name (customer_service, sales, healthcare, financial, hospitality)

        Returns:
            List of agent info dictionaries
        """
        agent_types = get_agents_by_category(category)
        return [self.get_agent_info(agent_type) for agent_type in agent_types]

    def get_all_categories(self) -> List[str]:
        """
        Get list of all agent categories.

        Returns:
            List of category names
        """
        return get_all_categories()

    def create_from_dict(self, config_dict: Dict[str, Any]) -> BaseVoiceAgent:
        """
        Create an agent from a configuration dictionary.

        Args:
            config_dict: Dictionary with agent configuration

        Returns:
            Initialized voice agent instance
        """
        # Parse config
        config = VoiceAgentConfig.from_dict(config_dict)

        # Determine agent type
        if 'voice_agent_type' in config.metadata:
            agent_type_str = config.metadata['voice_agent_type']
            agent_type = VoiceAgentType(agent_type_str)
        else:
            # Default to customer support if not specified
            agent_type = VoiceAgentType.VOICE_CUSTOMER_SUPPORT
            logger.warning(
                "No voice_agent_type in config metadata, defaulting to VOICE_CUSTOMER_SUPPORT"
            )

        return self.create(agent_type, config)

    def __repr__(self) -> str:
        """String representation"""
        return f"VoiceAgentFactory(registered_types={len(self._registry)})"


# ============================================
# Convenience Functions
# ============================================

# Global factory instance
_factory_instance: Optional[VoiceAgentFactory] = None


def get_factory() -> VoiceAgentFactory:
    """Get the global VoiceAgentFactory instance"""
    global _factory_instance
    if _factory_instance is None:
        _factory_instance = VoiceAgentFactory()
    return _factory_instance


def create_agent(
    agent_type: VoiceAgentType,
    config: VoiceAgentConfig
) -> BaseVoiceAgent:
    """
    Convenience function to create a voice agent.

    Args:
        agent_type: The type of voice agent to create
        config: Configuration for the agent

    Returns:
        Initialized voice agent instance
    """
    factory = get_factory()
    return factory.create(agent_type, config)


def list_agent_types() -> List[VoiceAgentType]:
    """
    Convenience function to list all available agent types.

    Returns:
        List of registered VoiceAgentType enums
    """
    factory = get_factory()
    return factory.list_available_types()


def get_agent_info(agent_type: VoiceAgentType) -> Dict[str, Any]:
    """
    Convenience function to get agent metadata.

    Args:
        agent_type: The voice agent type to query

    Returns:
        Dictionary with agent metadata
    """
    factory = get_factory()
    return factory.get_agent_info(agent_type)


# ============================================
# CLI for Testing
# ============================================

if __name__ == "__main__":
    import json

    print("""
    ╔═══════════════════════════════════════════════════════════════╗
    ║        🎙️ AGENT FORGE - Voice Agent Factory 🎙️              ║
    ╚═══════════════════════════════════════════════════════════════╝
    """)

    # Initialize factory
    factory = VoiceAgentFactory()

    print(f"\n✅ Factory initialized with {len(factory.list_available_types())} agent types\n")

    # List all categories
    print("📂 Categories:")
    for category in factory.get_all_categories():
        agents = factory.get_agents_by_category(category)
        print(f"\n  {category.upper().replace('_', ' ')} ({len(agents)} agents):")
        for agent_info in agents:
            print(f"    - {agent_info['name']}")

    # Create a sample agent
    print("\n\n🔨 Creating a sample Customer Support agent...\n")

    config = VoiceAgentConfig(
        name="Test Customer Support",
        user_id="test_user_123"
    )

    agent = factory.create(VoiceAgentType.VOICE_CUSTOMER_SUPPORT, config)

    print(f"✅ Agent created: {agent}")
    print(f"\n📋 Agent Metadata:")
    print(json.dumps(agent.get_metadata(), indent=2))

    print(f"\n💬 System Prompt Preview:")
    print(f"{agent.get_system_prompt()[:200]}...")

    print(f"\n👋 Greeting:")
    print(f"{agent.get_greeting()}")

    print("\n✨ Factory ready for production use!")
