"""
Hotel Concierge Voice Agent

Provides hotel guest services, room requests, and local recommendations.
Features:
- Room service orders
- Amenity requests
- Local recommendations
- Transportation arrangements
- Multi-language support
"""

from typing import Any, Dict, List, Tuple
from datetime import datetime
import logging

from backend.voice.agents.base_voice_agent import BaseVoiceAgent
from backend.voice.agents.voice_agent_config import VoiceAgentConfig
from backend.voice.agents.voice_agent_types import VoiceAgentType
from backend.voice.agents.voice_agent_templates import get_template
from backend.collaboration import AgentRole

logger = logging.getLogger(__name__)


class HotelConciergeAgent(BaseVoiceAgent):
    """
    Voice agent for hotel concierge services.

    Capabilities:
    - Process room service orders
    - Handle amenity requests
    - Provide local recommendations
    - Arrange transportation
    - Support multiple languages
    """

    def __init__(self, config: VoiceAgentConfig):
        """Initialize hotel concierge agent"""
        super().__init__(config, role=AgentRole.SUPPORT)

        # Agent-specific state
        self.hotel_name = config.metadata.get('hotel_name', 'the hotel')
        self.supported_languages = config.metadata.get('supported_languages', ['en', 'es', 'fr', 'de'])
        self.room_service_hours = config.metadata.get('room_service_hours', {'start': '06:00', 'end': '23:00'})
        self.local_area = config.metadata.get('local_area', 'the area')

        # Service catalogs
        self.amenities = config.metadata.get('amenities', [
            'extra towels', 'pillows', 'blankets', 'toiletries',
            'iron', 'ironing board', 'hair dryer', 'fan'
        ])

        logger.info(f"HotelConciergeAgent initialized for {self.hotel_name}")

    def get_system_prompt(self) -> str:
        """Get system prompt for hotel concierge agent"""
        template = get_template(VoiceAgentType.VOICE_HOTEL_CONCIERGE)
        base_prompt = template.get('system_prompt', '')

        # Add hotel-specific context
        prompt = f"""{base_prompt}

Hotel Information:
- Name: {self.hotel_name}
- Location: {self.local_area}
- Room service hours: {self.room_service_hours['start']} - {self.room_service_hours['end']}
- Languages supported: {', '.join(self.supported_languages)}

Available Services:
- Room service orders
- Amenity requests: {', '.join(self.amenities)}
- Restaurant recommendations and reservations
- Transportation arrangements (taxi, car service)
- Local attraction information
- Spa and fitness center bookings
- Wake-up calls
- Special occasion arrangements

Important Guidelines:
- Be exceptionally warm and helpful
- Anticipate guest needs proactively
- For urgent issues (room problems), transfer to front desk
- For spa bookings, transfer to spa reception
- Always confirm room number for deliveries
- Offer to follow up on requests
- Create memorable, personalized experiences
- Use short, friendly sentences perfect for voice
"""
        return prompt

    def get_greeting(self) -> str:
        """Get greeting message"""
        template = get_template(VoiceAgentType.VOICE_HOTEL_CONCIERGE)
        greeting = template.get('greeting', '')

        # Customize with hotel name
        if '{hotel_name}' in greeting:
            return greeting.format(hotel_name=self.hotel_name)

        return "Good evening! This is the concierge desk. How may I assist you today?"

    def get_available_functions(self) -> List[Dict[str, Any]]:
        """Get available function tools for hotel concierge"""
        return [
            {
                "name": "place_room_service_order",
                "description": "Place a room service order for a guest",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "room_number": {
                            "type": "string",
                            "description": "Guest room number"
                        },
                        "items": {
                            "type": "array",
                            "items": {"type": "string"},
                            "description": "List of menu items ordered"
                        },
                        "special_instructions": {
                            "type": "string",
                            "description": "Special dietary requests or instructions"
                        },
                        "delivery_time": {
                            "type": "string",
                            "description": "Requested delivery time (HH:MM or 'ASAP')"
                        }
                    },
                    "required": ["room_number", "items"]
                }
            },
            {
                "name": "request_amenity",
                "description": "Request amenities to be delivered to room",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "room_number": {
                            "type": "string",
                            "description": "Guest room number"
                        },
                        "amenity": {
                            "type": "string",
                            "description": "Requested amenity (towels, pillows, etc.)"
                        },
                        "quantity": {
                            "type": "integer",
                            "description": "Quantity needed",
                            "default": 1
                        },
                        "urgency": {
                            "type": "string",
                            "enum": ["standard", "urgent"],
                            "description": "Delivery priority"
                        }
                    },
                    "required": ["room_number", "amenity"]
                }
            },
            {
                "name": "make_restaurant_reservation",
                "description": "Book restaurant reservation for guest",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "restaurant_name": {
                            "type": "string",
                            "description": "Name of restaurant"
                        },
                        "date": {
                            "type": "string",
                            "description": "Date in YYYY-MM-DD format"
                        },
                        "time": {
                            "type": "string",
                            "description": "Time in HH:MM format"
                        },
                        "party_size": {
                            "type": "integer",
                            "description": "Number of guests"
                        },
                        "guest_name": {
                            "type": "string",
                            "description": "Guest name"
                        },
                        "room_number": {
                            "type": "string",
                            "description": "Room number for confirmation"
                        }
                    },
                    "required": ["restaurant_name", "date", "time", "party_size", "guest_name"]
                }
            },
            {
                "name": "arrange_transportation",
                "description": "Arrange taxi or car service for guest",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "room_number": {
                            "type": "string",
                            "description": "Guest room number"
                        },
                        "pickup_time": {
                            "type": "string",
                            "description": "Pickup time (HH:MM or 'ASAP')"
                        },
                        "destination": {
                            "type": "string",
                            "description": "Destination address or location"
                        },
                        "vehicle_type": {
                            "type": "string",
                            "enum": ["taxi", "sedan", "suv", "luxury"],
                            "description": "Type of vehicle requested"
                        },
                        "passenger_count": {
                            "type": "integer",
                            "description": "Number of passengers"
                        }
                    },
                    "required": ["room_number", "pickup_time", "destination"]
                }
            },
            {
                "name": "get_local_recommendations",
                "description": "Get recommendations for local restaurants, attractions, or activities",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "category": {
                            "type": "string",
                            "enum": ["restaurant", "attraction", "shopping", "nightlife", "family"],
                            "description": "Type of recommendation"
                        },
                        "cuisine_type": {
                            "type": "string",
                            "description": "Cuisine type for restaurant recommendations"
                        },
                        "budget": {
                            "type": "string",
                            "enum": ["budget", "moderate", "upscale", "fine_dining"],
                            "description": "Budget level"
                        },
                        "distance": {
                            "type": "string",
                            "enum": ["walking", "short_drive", "any"],
                            "description": "Preferred distance from hotel"
                        }
                    },
                    "required": ["category"]
                }
            },
            {
                "name": "transfer_call",
                "description": "Transfer call to another hotel department",
                "parameters": {
                    "type": "object",
                    "properties": {
                        "department": {
                            "type": "string",
                            "enum": ["front_desk", "housekeeping", "spa", "room_service", "maintenance"],
                            "description": "Department to transfer to"
                        },
                        "reason": {
                            "type": "string",
                            "description": "Reason for transfer"
                        }
                    },
                    "required": ["department", "reason"]
                }
            }
        ]

    async def handle_user_input(
        self,
        user_message: str,
        context: Dict[str, Any]
    ) -> Tuple[str, Dict[str, Any]]:
        """
        Process user input for hotel concierge services.

        Args:
            user_message: User's speech/text
            context: Current conversation context

        Returns:
            Tuple of (agent_response, updated_context)
        """
        user_lower = user_message.lower()

        # Detect language if multi-language support enabled
        detected_language = context.get('language', 'en')

        # Room service requests
        if any(word in user_lower for word in ['room service', 'order food', 'menu', 'hungry']):
            return self._handle_room_service(user_message, context)

        # Amenity requests
        elif any(word in user_lower for word in ['need', 'bring', 'towel', 'pillow', 'blanket']):
            return self._handle_amenity_request(user_message, context)

        # Restaurant recommendations
        elif any(word in user_lower for word in ['restaurant', 'dinner', 'lunch', 'eat', 'reservation']):
            return self._handle_restaurant_request(user_message, context)

        # Transportation
        elif any(word in user_lower for word in ['taxi', 'car', 'uber', 'ride', 'transportation']):
            return self._handle_transportation(user_message, context)

        # Local recommendations
        elif any(word in user_lower for word in ['recommend', 'suggestion', 'what to do', 'where to go']):
            return self._handle_local_recommendations(user_message, context)

        # Room issues - transfer to front desk
        elif any(word in user_lower for word in ['problem', 'broken', 'not working', 'issue']):
            return self._handle_room_issue(user_message, context)

        # Spa services - transfer to spa
        elif any(word in user_lower for word in ['spa', 'massage', 'facial', 'treatment']):
            return self._handle_spa_request(user_message, context)

        # General assistance
        else:
            return self._handle_general_request(user_message, context)

    def _handle_room_service(
        self,
        user_message: str,
        context: Dict[str, Any]
    ) -> Tuple[str, Dict[str, Any]]:
        """Handle room service order"""
        if 'room_number' not in context:
            response = "I'd be happy to help with room service! May I have your room number, please?"
            context['intent'] = 'room_service'
            return response, context

        response = (
            "Perfect! Our room service is available. What would you like to order? "
            "I can also send you our menu via text if that's easier."
        )
        return response, context

    def _handle_amenity_request(
        self,
        user_message: str,
        context: Dict[str, Any]
    ) -> Tuple[str, Dict[str, Any]]:
        """Handle amenity request"""
        if 'room_number' not in context:
            response = "Absolutely! I can arrange that for you. What's your room number?"
            context['intent'] = 'amenity'
            return response, context

        response = "Of course! I'll have that sent up to your room right away. Is there anything else you need?"
        return response, context

    def _handle_restaurant_request(
        self,
        user_message: str,
        context: Dict[str, Any]
    ) -> Tuple[str, Dict[str, Any]]:
        """Handle restaurant recommendation or reservation"""
        response = (
            "I'd love to help you find a great place! What type of cuisine are you in the mood for? "
            "And would you prefer something within walking distance or are you open to a short drive?"
        )
        context['intent'] = 'restaurant'
        return response, context

    def _handle_transportation(
        self,
        user_message: str,
        context: Dict[str, Any]
    ) -> Tuple[str, Dict[str, Any]]:
        """Handle transportation arrangement"""
        if 'room_number' not in context:
            response = "I can arrange transportation for you. What's your room number and where are you headed?"
            context['intent'] = 'transportation'
            return response, context

        response = "Perfect! When would you like the car, and where are you going?"
        return response, context

    def _handle_local_recommendations(
        self,
        user_message: str,
        context: Dict[str, Any]
    ) -> Tuple[str, Dict[str, Any]]:
        """Handle local recommendations"""
        response = (
            f"Great question! {self.local_area} has so much to offer. "
            f"Are you interested in restaurants, attractions, shopping, or nightlife?"
        )
        context['intent'] = 'recommendations'
        return response, context

    def _handle_room_issue(
        self,
        user_message: str,
        context: Dict[str, Any]
    ) -> Tuple[str, Dict[str, Any]]:
        """Handle room issue - prepare for transfer"""
        response = (
            "I'm so sorry you're experiencing an issue. "
            "Let me connect you with our front desk right away so they can help resolve this immediately."
        )
        context['intent'] = 'transfer_front_desk'
        context['transfer_reason'] = 'room_issue'
        return response, context

    def _handle_spa_request(
        self,
        user_message: str,
        context: Dict[str, Any]
    ) -> Tuple[str, Dict[str, Any]]:
        """Handle spa booking request"""
        response = (
            "Our spa would be wonderful! Let me transfer you to our spa reception "
            "and they can tell you about available treatments and book your appointment."
        )
        context['intent'] = 'transfer_spa'
        return response, context

    def _handle_general_request(
        self,
        user_message: str,
        context: Dict[str, Any]
    ) -> Tuple[str, Dict[str, Any]]:
        """Handle general concierge request"""
        response = (
            "I'd be happy to help with that! Can you tell me a bit more about what you need?"
        )
        return response, context
