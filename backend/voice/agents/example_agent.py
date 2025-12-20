"""
Example Voice Agent Implementation

Demonstrates how to create a custom voice agent by extending BaseVoiceAgent.
This example creates a simple customer service agent.
"""

import logging
from typing import Any, Dict, List, Tuple

from backend.collaboration import AgentRole
from backend.voice.agents.base_voice_agent import BaseVoiceAgent
from backend.voice.agents.voice_agent_config import (
    VoiceAgentConfig,
    AgentType,
    VoiceSettings,
    LLMSettings,
    BehaviorSettings
)


logger = logging.getLogger(__name__)


class ExampleCustomerServiceAgent(BaseVoiceAgent):
    """
    Example customer service voice agent.

    Handles:
    - Customer inquiries
    - Basic troubleshooting
    - Order status checks
    - Escalation to human agents
    """

    def __init__(self, config: VoiceAgentConfig):
        """Initialize customer service agent"""
        super().__init__(config, role=AgentRole.SUPPORT)

        # Register custom functions
        self.register_function("check_order_status", self._check_order_status)
        self.register_function("troubleshoot_issue", self._troubleshoot_issue)
        self.register_function("schedule_callback", self._schedule_callback)

        logger.info(f"[{self.agent_name}] Customer service agent ready")

    # ==================== Required Abstract Methods ====================

    def get_system_prompt(self) -> str:
        """Get system prompt for customer service"""
        base_prompt = f"""You are {self.agent_name}, a friendly and professional customer service agent.

Your role is to:
- Help customers with their questions and concerns
- Provide accurate information about products and services
- Troubleshoot common issues
- Check order statuses
- Escalate complex issues to human agents when needed

Guidelines:
- Always be polite, patient, and empathetic
- Listen carefully to understand the customer's needs
- Ask clarifying questions when needed
- Provide clear, concise answers
- Apologize for any inconvenience
- Offer alternatives when you can't help directly
- Know when to transfer to a human agent

Available Functions:
- check_order_status: Check the status of a customer's order
- troubleshoot_issue: Guide customer through common troubleshooting steps
- schedule_callback: Schedule a callback from support team
- transfer_to_human: Transfer to a human agent

Remember:
- Keep responses brief and conversational (this is a voice call)
- Don't read long lists - offer to send information via email instead
- Confirm understanding before moving on
- End with a clear next step or resolution
"""

        # Add state-specific prompt if using state machine
        state_prompt = self.get_current_state_prompt()
        if state_prompt:
            base_prompt += f"\n\nCurrent State Instructions:\n{state_prompt}"

        return base_prompt

    def get_greeting(self) -> str:
        """Get greeting message"""
        if self.config.behavior.greeting_enabled:
            return self.config.behavior.greeting_text
        return "Hello! I'm here to help you today. What can I assist you with?"

    def get_available_functions(self) -> List[Dict[str, Any]]:
        """Get function definitions for LLM"""
        functions = [
            {
                "name": "check_order_status",
                "description": "Check the status of a customer's order",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "order_id": {
                            "type": "string",
                            "description": "The order ID or number"
                        }
                    },
                    "required": ["order_id"]
                }
            },
            {
                "name": "troubleshoot_issue",
                "description": "Guide customer through troubleshooting steps for common issues",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "issue_type": {
                            "type": "string",
                            "description": "Type of issue (e.g., 'login', 'payment', 'not_working')"
                        },
                        "device_type": {
                            "type": "string",
                            "description": "Device type if relevant (e.g., 'mobile', 'desktop', 'tablet')"
                        }
                    },
                    "required": ["issue_type"]
                }
            },
            {
                "name": "schedule_callback",
                "description": "Schedule a callback from the support team",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "phone_number": {
                            "type": "string",
                            "description": "Phone number to call back"
                        },
                        "preferred_time": {
                            "type": "string",
                            "description": "Preferred callback time (e.g., 'morning', 'afternoon', 'evening')"
                        },
                        "reason": {
                            "type": "string",
                            "description": "Brief reason for the callback"
                        }
                    },
                    "required": ["phone_number", "preferred_time"]
                }
            },
            {
                "name": "transfer_to_human",
                "description": "Transfer the call to a human agent",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "reason": {
                            "type": "string",
                            "description": "Reason for transfer"
                        }
                    },
                    "required": ["reason"]
                }
            }
        ]

        # Filter functions based on state machine if enabled
        state_functions = self.get_state_available_functions()
        if state_functions:
            functions = [f for f in functions if f["name"] in state_functions]

        return functions

    async def handle_user_input(
        self,
        user_message: str,
        context: Dict[str, Any]
    ) -> Tuple[str, Dict[str, Any]]:
        """
        Handle user input and generate response.

        This is a simple example - in production, you'd use the LLM
        with the system prompt and function calling.
        """
        # Update context with user message
        context['last_user_message'] = user_message
        context['turn_count'] = context.get('turn_count', 0) + 1

        # Simple intent detection (in production, use LLM)
        user_lower = user_message.lower()

        # Check for order status inquiry
        if any(word in user_lower for word in ['order', 'status', 'tracking', 'shipment']):
            # Extract order ID (simplified)
            words = user_message.split()
            for word in words:
                if word.isdigit() and len(word) >= 6:
                    order_status = await self.call_function(
                        "check_order_status",
                        {"order_id": word}
                    )
                    response = (
                        f"I checked order {word} for you. {order_status['status']}. "
                        f"Is there anything else I can help you with?"
                    )
                    context['last_action'] = 'checked_order_status'
                    context['order_id'] = word
                    return response, context

            response = (
                "I'd be happy to check your order status. "
                "Could you please provide your order number? "
                "It's usually 6 to 8 digits."
            )
            return response, context

        # Check for troubleshooting request
        if any(word in user_lower for word in ['not working', 'problem', 'issue', 'error', 'broken']):
            if 'login' in user_lower or 'sign in' in user_lower:
                result = await self.call_function(
                    "troubleshoot_issue",
                    {"issue_type": "login"}
                )
                response = result['steps']
                context['last_action'] = 'troubleshooting'
                context['issue_type'] = 'login'
                return response, context
            else:
                response = (
                    "I'm sorry you're experiencing an issue. "
                    "Can you tell me more about what's not working? "
                    "For example, is it a login problem, a payment issue, or something else?"
                )
                return response, context

        # Check for callback request
        if any(word in user_lower for word in ['call back', 'callback', 'call me']):
            response = (
                "I can schedule a callback for you. "
                "What phone number should we call, and when would you prefer - "
                "morning, afternoon, or evening?"
            )
            context['awaiting_callback_info'] = True
            return response, context

        # Check for human agent request
        if any(phrase in user_lower for phrase in ['human', 'person', 'representative', 'agent']):
            result = await self._transfer_to_human("customer_requested")
            return result['message'], context

        # Default helpful response
        response = (
            "I'm here to help! I can check order statuses, help troubleshoot issues, "
            "or schedule a callback from our team. What would be most helpful for you today?"
        )

        return response, context

    # ==================== Custom Functions ====================

    async def _check_order_status(self, order_id: str) -> Dict[str, Any]:
        """
        Check order status.

        In production, this would query your order management system.
        """
        logger.info(f"[{self.agent_name}] Checking order status: {order_id}")

        # Simulate order lookup
        # In production: query database or API
        statuses = {
            "status": "Your order is currently in transit and expected to arrive tomorrow by 5 PM",
            "tracking_number": "1Z999AA10123456784",
            "carrier": "UPS"
        }

        return statuses

    async def _troubleshoot_issue(
        self,
        issue_type: str,
        device_type: str = None
    ) -> Dict[str, Any]:
        """
        Provide troubleshooting steps.

        In production, this would use a knowledge base.
        """
        logger.info(f"[{self.agent_name}] Troubleshooting: {issue_type}")

        # Simplified troubleshooting guides
        guides = {
            "login": (
                "Let's try these steps: First, make sure you're using the correct email address. "
                "Second, try resetting your password using the 'Forgot Password' link. "
                "Third, clear your browser cache and cookies, then try again. "
                "Does that help?"
            ),
            "payment": (
                "For payment issues, please verify your card details are correct and up to date. "
                "Also check that your billing address matches your card's registered address. "
                "If the issue persists, try using a different payment method."
            ),
            "not_working": (
                "Let's troubleshoot this. First, try refreshing the page. "
                "If that doesn't work, try clearing your cache or using a different browser. "
                "Can you tell me what specific error you're seeing?"
            )
        }

        steps = guides.get(issue_type, guides["not_working"])

        return {
            "issue_type": issue_type,
            "steps": steps
        }

    async def _schedule_callback(
        self,
        phone_number: str,
        preferred_time: str,
        reason: str = None
    ) -> Dict[str, Any]:
        """
        Schedule a callback from support team.

        In production, this would integrate with your scheduling system.
        """
        logger.info(f"[{self.agent_name}] Scheduling callback: {phone_number} at {preferred_time}")

        # Simulate scheduling
        # In production: create callback ticket in CRM
        callback_id = f"CB-{hash(phone_number) % 100000:05d}"

        return {
            "callback_id": callback_id,
            "phone_number": phone_number,
            "preferred_time": preferred_time,
            "scheduled": True,
            "message": (
                f"Perfect! I've scheduled a callback to {phone_number} "
                f"in the {preferred_time}. Your callback reference number is {callback_id}. "
                f"Is there anything else I can help you with right now?"
            )
        }


# ==================== Factory Function ====================

def create_example_agent(
    agent_name: str = "Customer Service Agent",
    user_id: str = "demo-user"
) -> ExampleCustomerServiceAgent:
    """
    Factory function to create a configured example agent.

    Args:
        agent_name: Name for the agent
        user_id: User ID who owns the agent

    Returns:
        Configured ExampleCustomerServiceAgent
    """
    # Create configuration
    config = VoiceAgentConfig(
        name=agent_name,
        agent_type=AgentType.SUPPORT,
        user_id=user_id,

        # Voice settings
        voice=VoiceSettings(
            voice_id="rachel",  # ElevenLabs voice
            language="en-US",
            speech_speed=1.0,
            enable_interruptions=True
        ),

        # LLM settings
        llm=LLMSettings(
            model="gpt-4o-realtime-preview",
            temperature=0.7,
            max_tokens=150
        ),

        # Behavior
        behavior=BehaviorSettings(
            greeting_text="Hello! Thanks for calling customer service. How can I help you today?",
            greeting_enabled=True,
            max_call_duration=600,  # 10 minutes
            fallback_to_human=True,
            personality_traits=["friendly", "professional", "helpful"]
        ),

        # Capabilities
        capabilities=[
            "order_status",
            "troubleshooting",
            "callback_scheduling",
            "human_handoff"
        ]
    )

    # Create and return agent
    return ExampleCustomerServiceAgent(config)


# ==================== Example Usage ====================

if __name__ == "__main__":
    import asyncio

    async def test_agent():
        """Test the example agent"""
        print("Creating example agent...")
        agent = create_example_agent()

        print("\nStarting call...")
        call_info = await agent.start_call()
        print(f"Call ID: {call_info['call_id']}")
        print(f"Greeting: {call_info['greeting']}\n")

        # Simulate conversation
        test_messages = [
            "Hi, I need help with my order",
            "My order number is 123456",
            "Great, thank you!",
            "That's all, goodbye"
        ]

        for message in test_messages:
            print(f"User: {message}")
            response = await agent.process_turn(message)
            print(f"Agent: {response['message']}\n")

            if response.get('end_call'):
                break

        # End call
        summary = await agent.end_call(reason="test_completed")
        print(f"\nCall Summary:")
        print(f"Duration: {summary['summary']['duration_seconds']:.1f}s")
        print(f"Turns: {summary['summary']['total_turns']}")
        print(f"Errors: {summary['summary']['errors']}")

    # Run test
    asyncio.run(test_agent())
