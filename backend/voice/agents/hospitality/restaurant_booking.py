"""
Restaurant Booking Voice Agent

Handles restaurant reservations, table bookings, and dining requests.
Features:
- Table availability checking
- Reservation booking and modification
- Waitlist management
- Special requests handling
- SMS confirmations
"""

from typing import Any, Dict, List, Tuple
from datetime import datetime, timedelta
import logging

from backend.voice.agents.base_voice_agent import BaseVoiceAgent
from backend.voice.agents.voice_agent_config import VoiceAgentConfig
from backend.voice.agents.voice_agent_types import VoiceAgentType
from backend.voice.agents.voice_agent_templates import get_template
from backend.collaboration import AgentRole

logger = logging.getLogger(__name__)


class RestaurantBookingAgent(BaseVoiceAgent):
    """
    Voice agent for restaurant reservation bookings.

    Capabilities:
    - Book new reservations
    - Check table availability
    - Modify existing reservations
    - Handle special requests
    - Send SMS confirmations
    """

    def __init__(self, config: VoiceAgentConfig):
        """Initialize restaurant booking agent"""
        super().__init__(config, role=AgentRole.SALES)

        # Agent-specific state
        self.restaurant_name = config.metadata.get('restaurant_name', 'our restaurant')
        self.operating_hours = config.metadata.get('operating_hours', {
            'monday': {'open': '17:00', 'close': '22:00'},
            'tuesday': {'open': '17:00', 'close': '22:00'},
            'wednesday': {'open': '17:00', 'close': '22:00'},
            'thursday': {'open': '17:00', 'close': '22:00'},
            'friday': {'open': '17:00', 'close': '23:00'},
            'saturday': {'open': '17:00', 'close': '23:00'},
            'sunday': {'open': '16:00', 'close': '21:00'}
        })
        self.max_party_size = config.metadata.get('max_party_size', 12)

        logger.info(f"RestaurantBookingAgent initialized for {self.restaurant_name}")

    def get_system_prompt(self) -> str:
        """Get system prompt for restaurant booking agent"""
        template = get_template(VoiceAgentType.VOICE_RESTAURANT_BOOKING)
        base_prompt = template.get('system_prompt', '')

        # Add restaurant-specific context
        prompt = f"""{base_prompt}

Restaurant Information:
- Name: {self.restaurant_name}
- Maximum party size: {self.max_party_size} guests
- For parties larger than {self.max_party_size}, transfer to events coordinator

Important Guidelines:
- Always confirm party size, date, and time
- Ask about special occasions or dietary restrictions
- Offer alternative times if requested slot is unavailable
- Collect contact information for confirmations
- Keep responses warm, welcoming, and efficient
- Use short, conversational sentences perfect for voice

Example Flow:
1. Greet warmly
2. Ask for preferred date and time
3. Ask for party size
4. Check availability
5. Note special requests
6. Get contact info
7. Confirm booking and send SMS
"""
        return prompt

    def get_greeting(self) -> str:
        """Get greeting message"""
        template = get_template(VoiceAgentType.VOICE_RESTAURANT_BOOKING)
        greeting = template.get('greeting', '')

        # Customize with restaurant name
        if '{restaurant_name}' in greeting:
            return greeting.format(restaurant_name=self.restaurant_name)

        return f"Good afternoon! Thanks for calling {self.restaurant_name}. I'd love to make a reservation for you. What day were you thinking?"

    def get_available_functions(self) -> List[Dict[str, Any]]:
        """Get available function tools for restaurant booking"""
        return [
            {
                "name": "check_table_availability",
                "description": "Check if tables are available for a specific date, time, and party size",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "date": {
                            "type": "string",
                            "description": "Date in YYYY-MM-DD format"
                        },
                        "time": {
                            "type": "string",
                            "description": "Time in HH:MM format (24-hour)"
                        },
                        "party_size": {
                            "type": "integer",
                            "description": "Number of guests"
                        }
                    },
                    "required": ["date", "time", "party_size"]
                }
            },
            {
                "name": "book_table",
                "description": "Create a table reservation",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "date": {
                            "type": "string",
                            "description": "Date in YYYY-MM-DD format"
                        },
                        "time": {
                            "type": "string",
                            "description": "Time in HH:MM format (24-hour)"
                        },
                        "party_size": {
                            "type": "integer",
                            "description": "Number of guests"
                        },
                        "guest_name": {
                            "type": "string",
                            "description": "Guest name for reservation"
                        },
                        "phone": {
                            "type": "string",
                            "description": "Contact phone number"
                        },
                        "email": {
                            "type": "string",
                            "description": "Contact email (optional)"
                        },
                        "special_requests": {
                            "type": "string",
                            "description": "Special requests, dietary restrictions, or occasions"
                        }
                    },
                    "required": ["date", "time", "party_size", "guest_name", "phone"]
                }
            },
            {
                "name": "modify_reservation",
                "description": "Modify an existing reservation",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "reservation_id": {
                            "type": "string",
                            "description": "Reservation confirmation number"
                        },
                        "new_date": {
                            "type": "string",
                            "description": "New date (YYYY-MM-DD) if changing"
                        },
                        "new_time": {
                            "type": "string",
                            "description": "New time (HH:MM) if changing"
                        },
                        "new_party_size": {
                            "type": "integer",
                            "description": "New party size if changing"
                        }
                    },
                    "required": ["reservation_id"]
                }
            },
            {
                "name": "send_sms",
                "description": "Send SMS confirmation to guest",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "to_number": {
                            "type": "string",
                            "description": "Phone number (E.164 format)"
                        },
                        "message": {
                            "type": "string",
                            "description": "SMS message content"
                        }
                    },
                    "required": ["to_number", "message"]
                }
            },
            {
                "name": "add_to_waitlist",
                "description": "Add guest to waitlist for walk-ins",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "guest_name": {
                            "type": "string",
                            "description": "Guest name"
                        },
                        "party_size": {
                            "type": "integer",
                            "description": "Number of guests"
                        },
                        "phone": {
                            "type": "string",
                            "description": "Contact phone number"
                        }
                    },
                    "required": ["guest_name", "party_size", "phone"]
                }
            }
        ]

    async def handle_user_input(
        self,
        user_message: str,
        context: Dict[str, Any]
    ) -> Tuple[str, Dict[str, Any]]:
        """
        Process user input for restaurant booking.

        Args:
            user_message: User's speech/text
            context: Current conversation context

        Returns:
            Tuple of (agent_response, updated_context)
        """
        user_lower = user_message.lower()

        # Extract booking intent and details
        if 'book' in user_lower or 'reservation' in user_lower or 'table' in user_lower:
            if 'party_size' not in context:
                return self._ask_party_size(context)
            elif 'date' not in context:
                return self._ask_date(context)
            elif 'time' not in context:
                return self._ask_time(context)
            elif 'guest_name' not in context:
                return self._ask_name(context)
            elif 'phone' not in context:
                return self._ask_phone(context)
            else:
                return await self._confirm_booking(context)

        # Handle modification requests
        elif 'modify' in user_lower or 'change' in user_lower or 'reschedule' in user_lower:
            return self._handle_modification(user_message, context)

        # Handle availability check
        elif 'available' in user_lower or 'open' in user_lower:
            return self._check_availability(user_message, context)

        # Extract information from natural conversation
        else:
            return self._extract_booking_info(user_message, context)

    def _ask_party_size(self, context: Dict[str, Any]) -> Tuple[str, Dict[str, Any]]:
        """Ask for party size"""
        response = "Perfect! How many people will be joining you?"
        return response, context

    def _ask_date(self, context: Dict[str, Any]) -> Tuple[str, Dict[str, Any]]:
        """Ask for reservation date"""
        response = "Great! What day would you like to come in?"
        return response, context

    def _ask_time(self, context: Dict[str, Any]) -> Tuple[str, Dict[str, Any]]:
        """Ask for reservation time"""
        response = "And what time works best for you?"
        return response, context

    def _ask_name(self, context: Dict[str, Any]) -> Tuple[str, Dict[str, Any]]:
        """Ask for guest name"""
        response = "Perfect! Can I get the name for the reservation?"
        return response, context

    def _ask_phone(self, context: Dict[str, Any]) -> Tuple[str, Dict[str, Any]]:
        """Ask for phone number"""
        response = "Great! And what's the best phone number to reach you?"
        return response, context

    async def _confirm_booking(self, context: Dict[str, Any]) -> Tuple[str, Dict[str, Any]]:
        """Confirm and create booking"""
        # In production, this would call actual booking system
        confirmation_number = f"RES{datetime.now().strftime('%Y%m%d%H%M%S')}"

        context['confirmation_number'] = confirmation_number

        response = (
            f"Wonderful! You're all set. I have you down for {context['party_size']} guests "
            f"on {context['date']} at {context['time']}. Your confirmation number is {confirmation_number}. "
            f"I'm texting you the details right now. Is there anything else I can help with?"
        )

        return response, context

    def _handle_modification(
        self,
        user_message: str,
        context: Dict[str, Any]
    ) -> Tuple[str, Dict[str, Any]]:
        """Handle reservation modification request"""
        response = (
            "I can help you change your reservation. "
            "Do you have your confirmation number handy?"
        )
        context['intent'] = 'modify'
        return response, context

    def _check_availability(
        self,
        user_message: str,
        context: Dict[str, Any]
    ) -> Tuple[str, Dict[str, Any]]:
        """Check table availability"""
        response = (
            "Let me check our availability for you. "
            "What day and time were you hoping for, and how many guests?"
        )
        context['intent'] = 'check_availability'
        return response, context

    def _extract_booking_info(
        self,
        user_message: str,
        context: Dict[str, Any]
    ) -> Tuple[str, Dict[str, Any]]:
        """Extract booking information from natural conversation"""
        # This is a simplified version - in production, use NLU/LLM to extract entities

        # For now, acknowledge and ask for next piece of info
        if 'party_size' not in context:
            return self._ask_party_size(context)
        elif 'date' not in context:
            return self._ask_date(context)
        elif 'time' not in context:
            return self._ask_time(context)
        else:
            response = "I want to make sure I have all the details. Can I get your name for the reservation?"
            return response, context
