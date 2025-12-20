"""
Agent Forge Voice Agents Module

Provides 20 specialized voice agent types across 5 categories:
- Customer Service (5 types)
- Sales & Lead Generation (5 types)
- Healthcare (3 types)
- Financial Services (3 types)
- Hospitality & Services (4 types)

Each agent type has pre-configured capabilities, default voices,
and optimized behavior for specific use cases.
"""

__version__ = "1.0.0"

# Agent Types and Metadata
from .voice_agent_types import (
    VoiceAgentType,
    VoiceAgentCapability,
    LLMProvider,
    ASRProvider,
    TTSProvider,
    VOICE_AGENT_METADATA,
    get_agent_metadata,
    get_agents_by_category,
    get_all_categories
)

# Agent Configuration
from .voice_agent_config import (
    VoiceAgentConfig,
    VoiceSettings,
    LLMSettings,
    BehaviorSettings,
    IntegrationSettings,
    AnalyticsSettings,
    StateMachineConfig,
    AgentType,
    LLMProvider as ConfigLLMProvider,
    VoiceProvider,
    PhoneProvider
)

# Base Agent Class
from .base_voice_agent import (
    BaseVoiceAgent,
    CallState,
    ConversationTurn,
    CallMetrics
)

# Agent Factory
from .voice_agent_factory import (
    VoiceAgentFactory,
    create_agent,
    get_agent_class
)

# Agent Templates
from .voice_agent_templates import (
    VOICE_AGENT_TEMPLATES,
    get_template,
    get_system_prompt,
    get_greeting,
    get_fallback_responses,
    get_transfer_phrases,
    get_closing_phrases
)

__all__ = [
    # Version
    '__version__',

    # Agent Types and Enums
    'VoiceAgentType',
    'VoiceAgentCapability',
    'LLMProvider',
    'ASRProvider',
    'TTSProvider',

    # Metadata
    'VOICE_AGENT_METADATA',
    'get_agent_metadata',
    'get_agents_by_category',
    'get_all_categories',

    # Config Classes
    'VoiceAgentConfig',
    'VoiceSettings',
    'LLMSettings',
    'BehaviorSettings',
    'IntegrationSettings',
    'AnalyticsSettings',
    'StateMachineConfig',

    # Config Enums
    'AgentType',
    'ConfigLLMProvider',
    'VoiceProvider',
    'PhoneProvider',
    'CallState',

    # Base Agent
    'BaseVoiceAgent',
    'ConversationTurn',
    'CallMetrics',

    # Factory
    'VoiceAgentFactory',
    'create_agent',
    'get_agent_class',

    # Templates
    'VOICE_AGENT_TEMPLATES',
    'get_template',
    'get_system_prompt',
    'get_greeting',
    'get_fallback_responses',
    'get_transfer_phrases',
    'get_closing_phrases',
]


# ============================================
# Quick Access Functions
# ============================================

def get_customer_service_agents():
    """
    Get all customer service agent types.

    Returns:
        list: List of VoiceAgentType values for customer service

    Example:
        agents = get_customer_service_agents()
        # [VoiceAgentType.VOICE_CUSTOMER_SUPPORT, ...]
    """
    return get_agents_by_category("customer_service")


def get_sales_agents():
    """
    Get all sales and lead generation agent types.

    Returns:
        list: List of VoiceAgentType values for sales

    Example:
        agents = get_sales_agents()
        # [VoiceAgentType.VOICE_LEAD_QUALIFIER, ...]
    """
    return get_agents_by_category("sales")


def get_healthcare_agents():
    """
    Get all healthcare agent types.

    Returns:
        list: List of VoiceAgentType values for healthcare

    Example:
        agents = get_healthcare_agents()
        # [VoiceAgentType.VOICE_APPOINTMENT_REMINDER, ...]
    """
    return get_agents_by_category("healthcare")


def get_financial_agents():
    """
    Get all financial services agent types.

    Returns:
        list: List of VoiceAgentType values for financial services

    Example:
        agents = get_financial_agents()
        # [VoiceAgentType.VOICE_FRAUD_VERIFICATION, ...]
    """
    return get_agents_by_category("financial")


def get_hospitality_agents():
    """
    Get all hospitality and services agent types.

    Returns:
        list: List of VoiceAgentType values for hospitality

    Example:
        agents = get_hospitality_agents()
        # [VoiceAgentType.VOICE_RESTAURANT_BOOKING, ...]
    """
    return get_agents_by_category("hospitality")


def get_agent_by_name(name: str):
    """
    Get agent metadata by agent type name.

    Args:
        name: Agent type name (e.g., "voice_customer_support")

    Returns:
        dict: Agent metadata or None if not found

    Example:
        metadata = get_agent_by_name("voice_customer_support")
        print(metadata["name"])  # "Customer Support Agent"
    """
    try:
        agent_type = VoiceAgentType(name)
        return get_agent_metadata(agent_type)
    except ValueError:
        return None


def list_all_agents():
    """
    Get a list of all agent types with their metadata.

    Returns:
        list: List of dicts with agent_type and metadata

    Example:
        agents = list_all_agents()
        for agent in agents:
            print(f"{agent['metadata']['name']} - {agent['metadata']['category']}")
    """
    return [
        {
            "agent_type": agent_type,
            "metadata": get_agent_metadata(agent_type)
        }
        for agent_type in VoiceAgentType
    ]


def get_agents_with_capability(capability: VoiceAgentCapability):
    """
    Get all agent types that have a specific capability.

    Args:
        capability: VoiceAgentCapability to search for

    Returns:
        list: List of VoiceAgentType values that have the capability

    Example:
        agents = get_agents_with_capability(VoiceAgentCapability.HIPAA_COMPLIANT)
        # [VoiceAgentType.VOICE_APPOINTMENT_REMINDER, ...]
    """
    return [
        agent_type
        for agent_type in VoiceAgentType
        if capability in VOICE_AGENT_METADATA.get(agent_type, {}).get("default_capabilities", [])
    ]


def get_agents_by_avg_call_duration(min_duration: int = None, max_duration: int = None):
    """
    Get agent types filtered by average call duration.

    Args:
        min_duration: Minimum average call duration in seconds
        max_duration: Maximum average call duration in seconds

    Returns:
        list: List of VoiceAgentType values matching criteria

    Example:
        # Get agents with quick calls (under 2 minutes)
        quick_agents = get_agents_by_avg_call_duration(max_duration=120)
    """
    results = []
    for agent_type, metadata in VOICE_AGENT_METADATA.items():
        duration = metadata.get("avg_call_duration", 0)
        if min_duration and duration < min_duration:
            continue
        if max_duration and duration > max_duration:
            continue
        results.append(agent_type)
    return results


def search_agents(query: str):
    """
    Search agent types by name, description, or category.

    Args:
        query: Search query string (case-insensitive)

    Returns:
        list: List of matching agent types with metadata

    Example:
        results = search_agents("appointment")
        # Returns agents related to appointments
    """
    query_lower = query.lower()
    results = []

    for agent_type, metadata in VOICE_AGENT_METADATA.items():
        name = metadata.get("name", "").lower()
        description = metadata.get("description", "").lower()
        category = metadata.get("category", "").lower()

        if query_lower in name or query_lower in description or query_lower in category:
            results.append({
                "agent_type": agent_type,
                "metadata": metadata
            })

    return results


# Add quick access functions to __all__
__all__.extend([
    'get_customer_service_agents',
    'get_sales_agents',
    'get_healthcare_agents',
    'get_financial_agents',
    'get_hospitality_agents',
    'get_agent_by_name',
    'list_all_agents',
    'get_agents_with_capability',
    'get_agents_by_avg_call_duration',
    'search_agents',
])


# ============================================
# Module Constants
# ============================================

# Total count of agent types
TOTAL_AGENT_TYPES = len(VoiceAgentType)

# Category counts
CATEGORY_COUNTS = {
    "customer_service": len(get_agents_by_category("customer_service")),
    "sales": len(get_agents_by_category("sales")),
    "healthcare": len(get_agents_by_category("healthcare")),
    "financial": len(get_agents_by_category("financial")),
    "hospitality": len(get_agents_by_category("hospitality")),
}

# Capability counts
CAPABILITY_COUNTS = {
    capability: len(get_agents_with_capability(capability))
    for capability in VoiceAgentCapability
}

__all__.extend([
    'TOTAL_AGENT_TYPES',
    'CATEGORY_COUNTS',
    'CAPABILITY_COUNTS',
])
