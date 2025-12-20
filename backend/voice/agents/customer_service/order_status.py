"""
Order Status Voice Agent

Helps customers track orders, check delivery status, and manage shipments.
Provides clear shipping updates and tracking information.
"""

from typing import List, Dict, Any
from ..voice_agent_types import VoiceAgentType


class OrderStatusAgent:
    """
    Order status and tracking voice agent.

    Capabilities:
    - Order tracking and status updates
    - Delivery date estimation
    - Shipping address updates
    - Tracking number lookup
    - SMS notifications with tracking links
    - Delivery rescheduling
    - Shipping exception handling
    """

    agent_type = VoiceAgentType.VOICE_ORDER_STATUS

    def __init__(self):
        self.agent_id = "order_status_001"
        self.name = "Order Status Agent"

    def get_system_prompt(self) -> str:
        """
        Get voice-optimized system prompt.
        Clear about dates and tracking, proactive with updates.
        """
        return """You are an order status agent. You help customers track their orders and delivery. Be specific about dates and tracking numbers. Explain shipping updates clearly. If delivery is delayed, apologize and explain why. Offer to send tracking links via SMS. Keep updates brief and clear."""

    def get_greeting(self) -> str:
        """Get initial greeting message."""
        return "Hey there! Thanks for calling about your order. I can check the status for you right now. Do you have your order number handy?"

    def get_available_functions(self) -> List[str]:
        """
        Get list of available functions for this agent.
        """
        return [
            "lookup_customer",      # Look up customer orders
            "extract_variable",    # Extract order numbers
            "call_api",           # Check order/shipping status
            "send_sms",           # Send tracking link
            "transfer_call",      # Transfer to fulfillment team
            "agent_transfer",     # Transfer to different AI agent
            "update_crm",         # Log order inquiry
        ]

    def get_state_machine_config(self) -> Dict[str, Any]:
        """
        Get state machine configuration for order tracking flow.

        States:
        - greeting: Initial greeting and order number collection
        - lookup_order: Look up order in system
        - provide_status: Provide order status and tracking
        - handle_issue: Handle delivery issues or delays
        - update_shipping: Update shipping address or preferences
        - closing: Send tracking link and close
        """
        states = [
            {
                'id': 'greeting',
                'name': 'Greeting',
                'prompt': 'Greet the customer warmly. Ask for their order number. If they do not have it, offer to look it up by email or phone number.',
                'functions': ['extract_variable'],
                'max_turns': 3
            },
            {
                'id': 'lookup_order',
                'name': 'Lookup Order',
                'prompt': 'Look up the order in the system using the order number, email, or phone. Confirm you found the correct order by mentioning items or order date.',
                'functions': ['lookup_customer', 'call_api', 'extract_variable'],
                'max_turns': 3
            },
            {
                'id': 'provide_status',
                'name': 'Provide Status',
                'prompt': 'Provide clear order status: processing, shipped, out for delivery, or delivered. Give tracking number and estimated delivery date. Be specific about dates and times.',
                'functions': ['call_api'],
                'max_turns': 3
            },
            {
                'id': 'handle_issue',
                'name': 'Handle Issue',
                'prompt': 'Address any shipping issues: delays, exceptions, or delivery problems. Apologize for delays. Explain the reason if known. Offer solutions like rescheduling or contacting carrier.',
                'functions': ['call_api', 'transfer_call', 'agent_transfer', 'update_crm'],
                'max_turns': 4
            },
            {
                'id': 'update_shipping',
                'name': 'Update Shipping',
                'prompt': 'Help customer update shipping address or delivery preferences. Verify the change is possible. Confirm new address or delivery window.',
                'functions': ['call_api', 'extract_variable', 'update_crm'],
                'max_turns': 4
            },
            {
                'id': 'closing',
                'name': 'Closing',
                'prompt': 'Offer to send tracking link via SMS. Confirm delivery date one more time. Thank the customer and ask if they need anything else.',
                'functions': ['send_sms', 'update_crm'],
                'is_terminal': True,
                'max_turns': 2
            }
        ]

        transitions = [
            # From greeting
            {
                'from': 'greeting',
                'to': 'lookup_order',
                'condition': 'has_order_identifier == True',
                'priority': 1
            },

            # From lookup_order
            {
                'from': 'lookup_order',
                'to': 'provide_status',
                'condition': 'order_found == True',
                'priority': 1
            },
            {
                'from': 'lookup_order',
                'to': 'closing',
                'condition': 'order_not_found == True',
                'priority': 2
            },

            # From provide_status
            {
                'from': 'provide_status',
                'to': 'handle_issue',
                'condition': 'has_shipping_issue == True or customer_concerned == True',
                'priority': 1
            },
            {
                'from': 'provide_status',
                'to': 'update_shipping',
                'condition': 'wants_to_update_shipping == True',
                'priority': 2
            },
            {
                'from': 'provide_status',
                'to': 'closing',
                'condition': 'status_provided == True and no_issues == True',
                'priority': 3
            },

            # From handle_issue
            {
                'from': 'handle_issue',
                'to': 'closing',
                'condition': 'issue_resolved == True or transferred == True',
                'priority': 1
            },

            # From update_shipping
            {
                'from': 'update_shipping',
                'to': 'closing',
                'condition': 'shipping_updated == True',
                'priority': 1
            },
            {
                'from': 'update_shipping',
                'to': 'handle_issue',
                'condition': 'update_failed == True',
                'priority': 2
            },
        ]

        return {
            'states': states,
            'transitions': transitions,
            'initial_state_id': 'greeting'
        }

    def get_fallback_responses(self) -> List[str]:
        """Get fallback responses when agent doesn't understand."""
        return [
            "I'm sorry, I didn't catch that order number. Can you say it again slowly?",
            "Hmm, I'm not finding that. Can you spell out your email address?",
            "Let me search by your phone number instead. What number did you use when ordering?",
            "One sec, I'm pulling that up now...",
        ]

    def get_transfer_phrases(self) -> List[str]:
        """Get phrases for transferring calls."""
        return [
            "This order has a special status. Let me connect you with our fulfillment team for details.",
            "It looks like there's a shipping exception. I'll transfer you to someone who can resolve that.",
            "For this kind of delivery change, I need to get you to our logistics team.",
        ]

    def get_closing_phrases(self) -> List[str]:
        """Get phrases for ending calls."""
        return [
            "Perfect! Your order should arrive by... I'll text you the tracking link right now. Sound good?",
            "Great! Anything else about your order?",
            "All set. You'll get updates as it moves. Have a great day!",
        ]
