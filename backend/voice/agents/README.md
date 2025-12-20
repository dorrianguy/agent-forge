# Agent Forge Voice Agents

Base architecture for creating intelligent voice agents with collaboration, learning, and state management capabilities.

## Overview

The voice agents module provides a production-ready foundation for building conversational AI voice agents that can:

- Handle voice calls with natural conversation flow
- Learn and improve from every interaction
- Collaborate with other agents in the system
- Manage complex multi-state conversation flows
- Track metrics and analytics
- Integrate with external systems (CRM, calendar, payment, etc.)

## Architecture

### Core Components

1. **VoiceAgentConfig** (`voice_agent_config.py`)
   - Comprehensive configuration dataclass
   - Voice settings (provider, voice ID, speech parameters)
   - LLM settings (provider, model, generation parameters)
   - Behavior settings (greetings, timeouts, error handling)
   - Integration settings (CRM, calendar, webhooks)
   - Analytics settings (recording, transcription, metrics)
   - State machine configuration

2. **BaseVoiceAgent** (`base_voice_agent.py`)
   - Abstract base class for all voice agents
   - Call lifecycle management (start, process, end)
   - Integration with CollaborativeAgentMixin
   - Learning engine integration
   - State machine support
   - Function/tool calling framework
   - Metrics tracking

## Creating a Custom Voice Agent

### 1. Extend BaseVoiceAgent

```python
from backend.voice.agents import BaseVoiceAgent, VoiceAgentConfig, AgentType
from backend.collaboration import AgentRole

class MyCustomAgent(BaseVoiceAgent):
    def __init__(self, config: VoiceAgentConfig):
        super().__init__(config, role=AgentRole.SALES)

        # Register custom functions
        self.register_function("book_appointment", self._book_appointment)

    # Implement required abstract methods
    def get_system_prompt(self) -> str:
        return "You are a helpful sales agent..."

    def get_greeting(self) -> str:
        return "Hello! How can I help you today?"

    def get_available_functions(self) -> List[Dict[str, Any]]:
        return [
            {
                "name": "book_appointment",
                "description": "Book an appointment",
                "parameters": {...}
            }
        ]

    async def handle_user_input(
        self,
        user_message: str,
        context: Dict[str, Any]
    ) -> Tuple[str, Dict[str, Any]]:
        # Your conversation logic here
        response = "I understand you want to..."
        updated_context = {**context, "intent": "booking"}
        return response, updated_context

    # Custom function implementation
    async def _book_appointment(self, date: str, time: str):
        # Your booking logic
        return {"status": "confirmed", "id": "APT-123"}
```

### 2. Create Configuration

```python
from backend.voice.agents import (
    VoiceAgentConfig,
    AgentType,
    VoiceSettings,
    LLMSettings,
    BehaviorSettings
)

config = VoiceAgentConfig(
    name="Sales Agent",
    agent_type=AgentType.SALES,
    user_id="user-123",

    # Voice configuration
    voice=VoiceSettings(
        voice_id="rachel",
        language="en-US",
        speech_speed=1.0,
        enable_interruptions=True
    ),

    # LLM configuration
    llm=LLMSettings(
        provider=LLMProvider.OPENAI,
        model="gpt-4o-realtime-preview",
        temperature=0.7,
        max_tokens=150
    ),

    # Behavior
    behavior=BehaviorSettings(
        greeting_text="Hi! I'm here to help you find the perfect solution.",
        max_call_duration=600,
        fallback_to_human=True
    ),

    # Capabilities
    capabilities=["appointment_booking", "product_info", "pricing"]
)
```

### 3. Instantiate and Use

```python
# Create agent
agent = MyCustomAgent(config)

# Start a call
call_info = await agent.start_call(
    call_id="call-123",
    initial_context={"customer_id": "cust-456"}
)

# Process conversation turns
response = await agent.process_turn(
    user_message="I'd like to book an appointment",
    metadata={"sentiment": 0.8}
)

# End call
summary = await agent.end_call(reason="completed")
```

## State Machine Integration

For complex multi-step flows, enable the state machine:

```python
config = VoiceAgentConfig(
    # ... other settings ...

    state_machine=StateMachineConfig(
        enabled=True,
        initial_state_id="greeting",
        states=[
            {
                'id': 'greeting',
                'name': 'Greeting',
                'prompt': 'Greet the customer and ask how you can help',
                'functions': ['detect_intent'],
                'max_turns': 3
            },
            {
                'id': 'collect_info',
                'name': 'Collect Information',
                'prompt': 'Collect customer information',
                'functions': ['extract_info', 'validate_phone'],
                'max_turns': 5
            },
            {
                'id': 'complete',
                'name': 'Complete',
                'prompt': 'Thank the customer',
                'is_terminal': True
            }
        ],
        transitions=[
            {
                'from': 'greeting',
                'to': 'collect_info',
                'condition': "intent == 'book_appointment'",
                'priority': 1
            },
            {
                'from': 'collect_info',
                'to': 'complete',
                'condition': "has_all_info == True",
                'priority': 1
            }
        ]
    )
)
```

## Learning Integration

The learning engine automatically tracks outcomes and improves performance:

```python
# The agent automatically records outcomes
# Get insights learned from past interactions
insights = agent.get_learning_insights()

# Apply learned strategies to prompts
strategy_modifier = agent.apply_learned_strategy(StrategyType.SALES_APPROACH)
```

## Collaboration

Voice agents can collaborate with other agents in the system:

```python
# Request help from another agent
response = await agent.request_from(
    target=AgentRole.SUPPORT,
    subject="customer_inquiry",
    data={"customer_id": "123", "issue": "billing"}
)

# Hand off to another agent
await agent.handoff_to(
    target=AgentRole.SALES,
    context_id=call_id,
    reason="upsell_opportunity",
    data={"conversation_history": history}
)

# Share insights with all agents
await agent.share_insight(
    insight_type="customer_pain_point",
    insight_data={"pain_point": "pricing", "frequency": 5}
)
```

## Function/Tool Calling

Register functions that the agent can call:

```python
class MyAgent(BaseVoiceAgent):
    def __init__(self, config):
        super().__init__(config)

        # Register custom functions
        self.register_function("check_inventory", self._check_inventory)
        self.register_function("process_payment", self._process_payment)

    async def _check_inventory(self, product_id: str) -> Dict:
        # Your inventory check logic
        return {"in_stock": True, "quantity": 10}

    async def _process_payment(self, amount: float, method: str) -> Dict:
        # Your payment processing logic
        return {"status": "success", "transaction_id": "txn-123"}

    def get_available_functions(self) -> List[Dict[str, Any]]:
        return [
            {
                "name": "check_inventory",
                "description": "Check product inventory",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "product_id": {"type": "string"}
                    },
                    "required": ["product_id"]
                }
            },
            # ... more function definitions
        ]
```

## Metrics and Analytics

The agent automatically tracks comprehensive metrics:

```python
# Get current call info
info = agent.get_call_info()
# Returns:
# {
#     'call_id': 'call-123',
#     'state': 'active',
#     'turns': 10,
#     'metrics': {
#         'duration_seconds': 120,
#         'total_turns': 10,
#         'errors': 0,
#         'avg_sentiment': 0.85,
#         'avg_latency_ms': 450
#     }
# }

# Get conversation summary
summary = agent.get_conversation_summary()
```

## Configuration Reference

### VoiceSettings

- `voice_id`: Voice identifier (provider-specific)
- `voice_provider`: VoiceProvider enum (ELEVENLABS, DEEPGRAM, OPENAI, CARTESIA)
- `language`: Language code (e.g., "en-US")
- `speech_speed`: 0.5 to 2.0 (default: 1.0)
- `pitch`: 0.5 to 2.0 (default: 1.0)
- `enable_interruptions`: Allow user to interrupt agent
- `interruption_threshold`: Sensitivity 0.0-1.0

### LLMSettings

- `provider`: LLMProvider enum (OPENAI, GEMINI, ANTHROPIC)
- `model`: Model identifier
- `temperature`: 0.0 to 2.0 (default: 0.7)
- `max_tokens`: Maximum response length
- `max_context_messages`: Context window size
- `enable_streaming`: Stream responses

### BehaviorSettings

- `greeting_text`: Initial greeting message
- `system_prompt`: Base system prompt
- `max_call_duration`: Maximum call length in seconds
- `max_silence_duration`: Silence before prompting
- `idle_timeout`: Silence before ending
- `error_message`: Default error response
- `max_error_retries`: Errors before escalation
- `fallback_to_human`: Auto-transfer on errors
- `personality_traits`: List of traits (e.g., ["friendly", "professional"])

### IntegrationSettings

- `crm_enabled`: Enable CRM integration
- `crm_provider`: Provider name ("hubspot", "salesforce", etc.)
- `calendar_enabled`: Enable calendar integration
- `payment_enabled`: Enable payment processing
- `webhook_url`: Webhook endpoint for events
- `knowledge_base_enabled`: Use knowledge base

### AnalyticsSettings

- `enable_recording`: Record calls
- `enable_transcription`: Transcribe calls
- `track_metrics`: Track performance metrics
- `track_sentiment`: Analyze sentiment
- `pii_redaction`: Redact PII from logs
- `data_retention_days`: How long to keep data

## Example: Complete Sales Agent

See `example_agent.py` for a complete working example of a customer service agent with:
- Order status checking
- Troubleshooting guidance
- Callback scheduling
- Human handoff
- Comprehensive error handling

## Best Practices

1. **Keep responses concise** - This is a voice interface, not text chat
2. **Use conversational language** - Sound natural, not robotic
3. **Confirm understanding** - Repeat back important information
4. **Handle errors gracefully** - Don't crash, offer alternatives
5. **Know when to escalate** - Transfer to human for complex issues
6. **Track everything** - Metrics drive improvement
7. **Learn continuously** - Use the learning engine to improve
8. **Test thoroughly** - Voice is unforgiving of errors

## Testing

```python
# Run the example agent
python -m backend.voice.agents.example_agent

# This will simulate a conversation and show:
# - Call initialization
# - Conversation turns
# - Function calls
# - Call summary with metrics
```

## Integration with Agent Forge

Voice agents integrate seamlessly with:

- **Collaboration Hub**: Multi-agent coordination
- **Learning Engine**: Continuous improvement
- **State Machine**: Complex conversation flows
- **Universal Builder**: Agent generation
- **Analytics**: Performance tracking
- **Deployment**: Production deployment

## Support

For questions or issues:
- Check the example agent implementation
- Review the base class documentation
- See the Agent Forge main documentation
- Contact: support@agentforge.ai
