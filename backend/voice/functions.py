"""
Voice Function Tools - Built-in functions for voice agents during calls.

Provides a registry system for voice agents to execute actions like:
- Appointment booking and scheduling
- Call transfers and DTMF
- SMS notifications
- CRM integrations
- Custom API calls
- Audio playback and call control
"""

from dataclasses import dataclass, field
from typing import Callable, Dict, Any, List, Optional
from datetime import datetime, timedelta
from enum import Enum
import logging
import requests
import re
from urllib.parse import urljoin

logger = logging.getLogger(__name__)


class TransferType(str, Enum):
    """Types of call transfers."""
    WARM = "warm"  # Agent stays on, introduces call
    COLD = "cold"  # Agent stays on until answered
    BLIND = "blind"  # Agent disconnects immediately


class VariableType(str, Enum):
    """Types for extracted variables."""
    STRING = "string"
    NUMBER = "number"
    DATE = "date"
    TIME = "time"
    EMAIL = "email"
    PHONE = "phone"
    BOOLEAN = "boolean"


@dataclass
class VoiceFunction:
    """
    Represents a function that can be executed during a voice call.

    Attributes:
        name: Unique identifier for the function
        description: Human-readable description for LLM understanding
        parameters: JSON schema defining function parameters
        handler: Async callable that executes the function logic
    """
    name: str
    description: str
    parameters: Dict[str, Any]
    handler: Callable

    def to_schema(self) -> Dict[str, Any]:
        """Convert to OpenAI function calling schema."""
        return {
            "name": self.name,
            "description": self.description,
            "parameters": self.parameters
        }


class VoiceFunctionRegistry:
    """
    Singleton registry for voice agent functions.

    Manages registration, discovery, and execution of built-in
    and custom functions available to voice agents.
    """

    _instance = None
    _initialized = False

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
        return cls._instance

    def __init__(self):
        if not self._initialized:
            self._functions: Dict[str, VoiceFunction] = {}
            self._register_builtin_functions()
            VoiceFunctionRegistry._initialized = True

    def register(
        self,
        name: str,
        description: str,
        parameters: Dict[str, Any],
        handler: Callable
    ) -> None:
        """
        Register a new voice function.

        Args:
            name: Unique function identifier
            description: What the function does
            parameters: JSON schema for parameters
            handler: Async function to execute
        """
        if name in self._functions:
            logger.warning(f"Overwriting existing function: {name}")

        self._functions[name] = VoiceFunction(
            name=name,
            description=description,
            parameters=parameters,
            handler=handler
        )
        logger.info(f"Registered voice function: {name}")

    def get(self, name: str) -> Optional[VoiceFunction]:
        """Get a function by name."""
        return self._functions.get(name)

    def list_functions(self) -> List[VoiceFunction]:
        """Get all registered functions."""
        return list(self._functions.values())

    async def execute(
        self,
        name: str,
        call_context: Dict[str, Any],
        **kwargs
    ) -> Dict[str, Any]:
        """
        Execute a registered function.

        Args:
            name: Function name to execute
            call_context: Current call state and metadata
            **kwargs: Function-specific parameters

        Returns:
            Dict with success status, result, and any extracted data
        """
        func = self.get(name)
        if not func:
            return {
                "success": False,
                "error": f"Function not found: {name}",
                "result": None
            }

        try:
            logger.info(f"Executing voice function: {name} with args: {kwargs}")
            result = await func.handler(call_context, **kwargs)

            return {
                "success": True,
                "result": result,
                "function": name,
                "timestamp": datetime.utcnow().isoformat()
            }
        except Exception as e:
            logger.error(f"Error executing function {name}: {str(e)}", exc_info=True)
            return {
                "success": False,
                "error": str(e),
                "function": name,
                "result": None
            }

    def get_function_schemas(self) -> List[Dict[str, Any]]:
        """Get all function schemas for LLM tool use."""
        return [func.to_schema() for func in self._functions.values()]

    def _register_builtin_functions(self):
        """Register all built-in voice functions."""

        # Appointment booking
        self.register(
            name="book_appointment",
            description="Book an appointment using Cal.com integration. Schedules a meeting with date, time, duration, and attendee details.",
            parameters={
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
                    "duration": {
                        "type": "integer",
                        "description": "Duration in minutes"
                    },
                    "attendee_email": {
                        "type": "string",
                        "description": "Attendee email address"
                    },
                    "attendee_name": {
                        "type": "string",
                        "description": "Attendee full name"
                    },
                    "notes": {
                        "type": "string",
                        "description": "Optional appointment notes"
                    }
                },
                "required": ["date", "time", "duration", "attendee_email", "attendee_name"]
            },
            handler=self._book_appointment
        )

        # Check availability
        self.register(
            name="check_availability",
            description="Check available time slots for scheduling. Returns open slots in the specified date range.",
            parameters={
                "type": "object",
                "properties": {
                    "date_range": {
                        "type": "object",
                        "properties": {
                            "start": {
                                "type": "string",
                                "description": "Start date (YYYY-MM-DD)"
                            },
                            "end": {
                                "type": "string",
                                "description": "End date (YYYY-MM-DD)"
                            }
                        },
                        "required": ["start", "end"]
                    },
                    "duration": {
                        "type": "integer",
                        "description": "Required duration in minutes (default: 30)"
                    }
                },
                "required": ["date_range"]
            },
            handler=self._check_availability
        )

        # Send DTMF tones
        self.register(
            name="send_dtmf",
            description="Send DTMF tones for IVR navigation. Use to press phone menu buttons programmatically.",
            parameters={
                "type": "object",
                "properties": {
                    "digits": {
                        "type": "string",
                        "description": "DTMF digits to send (0-9, *, #)"
                    }
                },
                "required": ["digits"]
            },
            handler=self._send_dtmf
        )

        # Transfer call
        self.register(
            name="transfer_call",
            description="Transfer the call to another number or agent. Supports warm (with intro), cold (wait for answer), or blind (immediate) transfers.",
            parameters={
                "type": "object",
                "properties": {
                    "target_number": {
                        "type": "string",
                        "description": "Phone number to transfer to (E.164 format)"
                    },
                    "type": {
                        "type": "string",
                        "enum": ["warm", "cold", "blind"],
                        "description": "Transfer type: warm (with intro), cold (wait for answer), blind (immediate)"
                    },
                    "whisper_message": {
                        "type": "string",
                        "description": "Optional message to play to target before connecting (warm/cold transfers)"
                    },
                    "hold_music_url": {
                        "type": "string",
                        "description": "Optional hold music URL while transferring"
                    }
                },
                "required": ["target_number", "type"]
            },
            handler=self._transfer_call
        )

        # Send SMS
        self.register(
            name="send_sms",
            description="Send an SMS message to a phone number. Useful for confirmations, links, or follow-ups.",
            parameters={
                "type": "object",
                "properties": {
                    "to_number": {
                        "type": "string",
                        "description": "Recipient phone number (E.164 format)"
                    },
                    "message": {
                        "type": "string",
                        "description": "SMS message content (max 1600 chars)"
                    }
                },
                "required": ["to_number", "message"]
            },
            handler=self._send_sms
        )

        # Agent transfer
        self.register(
            name="agent_transfer",
            description="Transfer to another AI agent with different capabilities or knowledge. Maintains conversation context.",
            parameters={
                "type": "object",
                "properties": {
                    "target_agent_id": {
                        "type": "string",
                        "description": "ID of the agent to transfer to"
                    },
                    "context_summary": {
                        "type": "string",
                        "description": "Optional summary of conversation so far"
                    }
                },
                "required": ["target_agent_id"]
            },
            handler=self._agent_transfer
        )

        # Call external API
        self.register(
            name="call_api",
            description="Make a REST API call to external service. Useful for custom integrations and data lookups.",
            parameters={
                "type": "object",
                "properties": {
                    "method": {
                        "type": "string",
                        "enum": ["GET", "POST", "PUT", "DELETE", "PATCH"],
                        "description": "HTTP method"
                    },
                    "url": {
                        "type": "string",
                        "description": "Full API endpoint URL"
                    },
                    "headers": {
                        "type": "object",
                        "description": "Optional HTTP headers"
                    },
                    "body": {
                        "type": "object",
                        "description": "Optional request body (for POST/PUT/PATCH)"
                    },
                    "extract_fields": {
                        "type": "array",
                        "items": {"type": "string"},
                        "description": "JSON paths to extract from response (e.g., 'data.customer.name')"
                    }
                },
                "required": ["method", "url"]
            },
            handler=self._call_api
        )

        # Extract variable from conversation
        self.register(
            name="extract_variable",
            description="Extract and validate a specific piece of information from the conversation. Stores in call context.",
            parameters={
                "type": "object",
                "properties": {
                    "variable_name": {
                        "type": "string",
                        "description": "Name for the extracted variable"
                    },
                    "type": {
                        "type": "string",
                        "enum": ["string", "number", "date", "time", "email", "phone", "boolean"],
                        "description": "Expected data type for validation"
                    },
                    "value": {
                        "type": "string",
                        "description": "The value to extract and validate"
                    }
                },
                "required": ["variable_name", "type", "value"]
            },
            handler=self._extract_variable
        )

        # Lookup customer
        self.register(
            name="lookup_customer",
            description="Look up customer information from CRM. Search by phone, email, or customer ID.",
            parameters={
                "type": "object",
                "properties": {
                    "identifier": {
                        "type": "string",
                        "description": "Phone number, email, or customer ID"
                    },
                    "identifier_type": {
                        "type": "string",
                        "enum": ["phone", "email", "customer_id"],
                        "description": "Type of identifier (auto-detected if not specified)"
                    }
                },
                "required": ["identifier"]
            },
            handler=self._lookup_customer
        )

        # Update CRM
        self.register(
            name="update_crm",
            description="Update customer record in CRM. Add notes, change status, or update fields.",
            parameters={
                "type": "object",
                "properties": {
                    "record_id": {
                        "type": "string",
                        "description": "CRM record ID to update"
                    },
                    "updates": {
                        "type": "object",
                        "description": "Fields to update (key-value pairs)"
                    }
                },
                "required": ["record_id", "updates"]
            },
            handler=self._update_crm
        )

        # End call
        self.register(
            name="end_call",
            description="Gracefully end the call with a reason. Records call outcome and disposition.",
            parameters={
                "type": "object",
                "properties": {
                    "reason": {
                        "type": "string",
                        "description": "Reason for ending call (e.g., 'completed', 'customer_hangup', 'transferred')"
                    },
                    "disposition": {
                        "type": "string",
                        "description": "Call disposition/outcome for reporting"
                    }
                },
                "required": ["reason"]
            },
            handler=self._end_call
        )

        # Play audio
        self.register(
            name="play_audio",
            description="Play an audio file to the caller. Useful for hold music, announcements, or recorded messages.",
            parameters={
                "type": "object",
                "properties": {
                    "audio_url": {
                        "type": "string",
                        "description": "URL to audio file (WAV, MP3)"
                    },
                    "loop": {
                        "type": "boolean",
                        "description": "Whether to loop the audio (default: false)"
                    }
                },
                "required": ["audio_url"]
            },
            handler=self._play_audio
        )

    # Built-in function implementations

    async def _book_appointment(
        self,
        call_context: Dict[str, Any],
        date: str,
        time: str,
        duration: int,
        attendee_email: str,
        attendee_name: str,
        notes: str = ""
    ) -> Dict[str, Any]:
        """Book appointment via Cal.com."""
        try:
            # Get Cal.com API credentials from call context or env
            cal_api_key = call_context.get("cal_api_key") or call_context.get("env", {}).get("CAL_API_KEY")
            cal_event_type_id = call_context.get("cal_event_type_id") or call_context.get("env", {}).get("CAL_EVENT_TYPE_ID")

            if not cal_api_key:
                return {
                    "success": False,
                    "error": "Cal.com API key not configured"
                }

            # Combine date and time
            start_time = datetime.fromisoformat(f"{date}T{time}:00")
            end_time = start_time + timedelta(minutes=duration)

            # Call Cal.com API
            response = requests.post(
                "https://api.cal.com/v1/bookings",
                headers={
                    "Authorization": f"Bearer {cal_api_key}",
                    "Content-Type": "application/json"
                },
                json={
                    "eventTypeId": cal_event_type_id,
                    "start": start_time.isoformat(),
                    "end": end_time.isoformat(),
                    "responses": {
                        "name": attendee_name,
                        "email": attendee_email,
                        "notes": notes
                    },
                    "metadata": {
                        "source": "agent_forge_voice",
                        "call_id": call_context.get("call_id")
                    }
                },
                timeout=10
            )

            if response.status_code == 201:
                booking = response.json()
                return {
                    "success": True,
                    "booking_id": booking.get("id"),
                    "booking_url": booking.get("url"),
                    "start_time": start_time.isoformat(),
                    "duration_minutes": duration
                }
            else:
                return {
                    "success": False,
                    "error": f"Booking failed: {response.text}"
                }

        except Exception as e:
            logger.error(f"Appointment booking error: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }

    async def _check_availability(
        self,
        call_context: Dict[str, Any],
        date_range: Dict[str, str],
        duration: int = 30
    ) -> Dict[str, Any]:
        """Check availability via Cal.com."""
        try:
            cal_api_key = call_context.get("cal_api_key") or call_context.get("env", {}).get("CAL_API_KEY")
            cal_event_type_id = call_context.get("cal_event_type_id") or call_context.get("env", {}).get("CAL_EVENT_TYPE_ID")

            if not cal_api_key:
                return {
                    "success": False,
                    "error": "Cal.com API key not configured"
                }

            # Query availability
            response = requests.get(
                f"https://api.cal.com/v1/availability",
                headers={
                    "Authorization": f"Bearer {cal_api_key}"
                },
                params={
                    "eventTypeId": cal_event_type_id,
                    "startTime": date_range["start"],
                    "endTime": date_range["end"],
                    "duration": duration
                },
                timeout=10
            )

            if response.status_code == 200:
                availability = response.json()
                return {
                    "success": True,
                    "available_slots": availability.get("slots", []),
                    "date_range": date_range
                }
            else:
                return {
                    "success": False,
                    "error": f"Availability check failed: {response.text}"
                }

        except Exception as e:
            logger.error(f"Availability check error: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }

    async def _send_dtmf(
        self,
        call_context: Dict[str, Any],
        digits: str
    ) -> Dict[str, Any]:
        """Send DTMF tones during call."""
        try:
            # Validate digits
            if not re.match(r'^[0-9*#]+$', digits):
                return {
                    "success": False,
                    "error": "Invalid DTMF digits. Use 0-9, *, #"
                }

            # Get telephony provider interface
            telephony = call_context.get("telephony_interface")
            if not telephony:
                return {
                    "success": False,
                    "error": "Telephony interface not available"
                }

            # Send DTMF through provider
            await telephony.send_dtmf(call_context["call_id"], digits)

            return {
                "success": True,
                "digits_sent": digits
            }

        except Exception as e:
            logger.error(f"DTMF send error: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }

    async def _transfer_call(
        self,
        call_context: Dict[str, Any],
        target_number: str,
        type: str,
        whisper_message: str = None,
        hold_music_url: str = None
    ) -> Dict[str, Any]:
        """Transfer call to another number."""
        try:
            telephony = call_context.get("telephony_interface")
            if not telephony:
                return {
                    "success": False,
                    "error": "Telephony interface not available"
                }

            transfer_type = TransferType(type)

            result = await telephony.transfer_call(
                call_id=call_context["call_id"],
                target_number=target_number,
                transfer_type=transfer_type,
                whisper_message=whisper_message,
                hold_music_url=hold_music_url
            )

            return {
                "success": True,
                "transfer_type": type,
                "target_number": target_number,
                "transfer_id": result.get("transfer_id")
            }

        except Exception as e:
            logger.error(f"Call transfer error: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }

    async def _send_sms(
        self,
        call_context: Dict[str, Any],
        to_number: str,
        message: str
    ) -> Dict[str, Any]:
        """Send SMS message."""
        try:
            if len(message) > 1600:
                return {
                    "success": False,
                    "error": "Message exceeds 1600 character limit"
                }

            telephony = call_context.get("telephony_interface")
            if not telephony:
                return {
                    "success": False,
                    "error": "Telephony interface not available"
                }

            result = await telephony.send_sms(
                from_number=call_context.get("agent_number"),
                to_number=to_number,
                message=message
            )

            return {
                "success": True,
                "message_id": result.get("message_id"),
                "to_number": to_number
            }

        except Exception as e:
            logger.error(f"SMS send error: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }

    async def _agent_transfer(
        self,
        call_context: Dict[str, Any],
        target_agent_id: str,
        context_summary: str = None
    ) -> Dict[str, Any]:
        """Transfer to another AI agent."""
        try:
            agent_registry = call_context.get("agent_registry")
            if not agent_registry:
                return {
                    "success": False,
                    "error": "Agent registry not available"
                }

            target_agent = agent_registry.get(target_agent_id)
            if not target_agent:
                return {
                    "success": False,
                    "error": f"Target agent not found: {target_agent_id}"
                }

            # Prepare context for new agent
            transfer_context = {
                **call_context,
                "previous_agent": call_context.get("agent_id"),
                "transfer_summary": context_summary,
                "transfer_time": datetime.utcnow().isoformat()
            }

            # Switch agent in call context
            call_context["agent_id"] = target_agent_id
            call_context["agent"] = target_agent
            call_context["transfer_history"] = call_context.get("transfer_history", []) + [
                {
                    "from_agent": transfer_context["previous_agent"],
                    "to_agent": target_agent_id,
                    "time": transfer_context["transfer_time"],
                    "summary": context_summary
                }
            ]

            return {
                "success": True,
                "target_agent_id": target_agent_id,
                "transferred_at": transfer_context["transfer_time"]
            }

        except Exception as e:
            logger.error(f"Agent transfer error: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }

    async def _call_api(
        self,
        call_context: Dict[str, Any],
        method: str,
        url: str,
        headers: Dict[str, str] = None,
        body: Dict[str, Any] = None,
        extract_fields: List[str] = None
    ) -> Dict[str, Any]:
        """Call external REST API."""
        try:
            headers = headers or {}

            # Add default headers
            if "Content-Type" not in headers and method in ["POST", "PUT", "PATCH"]:
                headers["Content-Type"] = "application/json"

            response = requests.request(
                method=method,
                url=url,
                headers=headers,
                json=body if body else None,
                timeout=30
            )

            response_data = None
            try:
                response_data = response.json()
            except:
                response_data = response.text

            # Extract specific fields if requested
            extracted = {}
            if extract_fields and isinstance(response_data, dict):
                for field_path in extract_fields:
                    value = response_data
                    for key in field_path.split("."):
                        if isinstance(value, dict):
                            value = value.get(key)
                        else:
                            value = None
                            break
                    extracted[field_path] = value

            return {
                "success": response.status_code < 400,
                "status_code": response.status_code,
                "response": response_data,
                "extracted": extracted if extracted else None
            }

        except Exception as e:
            logger.error(f"API call error: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }

    async def _extract_variable(
        self,
        call_context: Dict[str, Any],
        variable_name: str,
        type: str,
        value: str
    ) -> Dict[str, Any]:
        """Extract and validate variable from conversation."""
        try:
            var_type = VariableType(type)
            validated_value = value

            # Type-specific validation
            if var_type == VariableType.EMAIL:
                if not re.match(r'^[\w\.-]+@[\w\.-]+\.\w+$', value):
                    return {
                        "success": False,
                        "error": f"Invalid email format: {value}"
                    }

            elif var_type == VariableType.PHONE:
                # Clean and validate phone number
                cleaned = re.sub(r'[^\d+]', '', value)
                if not re.match(r'^\+?[1-9]\d{1,14}$', cleaned):
                    return {
                        "success": False,
                        "error": f"Invalid phone format: {value}"
                    }
                validated_value = cleaned

            elif var_type == VariableType.DATE:
                try:
                    datetime.fromisoformat(value)
                except ValueError:
                    return {
                        "success": False,
                        "error": f"Invalid date format: {value}. Use YYYY-MM-DD"
                    }

            elif var_type == VariableType.NUMBER:
                try:
                    validated_value = float(value)
                except ValueError:
                    return {
                        "success": False,
                        "error": f"Invalid number: {value}"
                    }

            elif var_type == VariableType.BOOLEAN:
                validated_value = value.lower() in ['true', 'yes', '1', 'y']

            # Store in call context
            if "extracted_variables" not in call_context:
                call_context["extracted_variables"] = {}

            call_context["extracted_variables"][variable_name] = {
                "value": validated_value,
                "type": type,
                "extracted_at": datetime.utcnow().isoformat()
            }

            return {
                "success": True,
                "variable_name": variable_name,
                "value": validated_value,
                "type": type
            }

        except Exception as e:
            logger.error(f"Variable extraction error: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }

    async def _lookup_customer(
        self,
        call_context: Dict[str, Any],
        identifier: str,
        identifier_type: str = None
    ) -> Dict[str, Any]:
        """Look up customer in CRM."""
        try:
            # Auto-detect identifier type if not specified
            if not identifier_type:
                if re.match(r'^[\w\.-]+@[\w\.-]+\.\w+$', identifier):
                    identifier_type = "email"
                elif re.match(r'^\+?[1-9]\d{1,14}$', identifier):
                    identifier_type = "phone"
                else:
                    identifier_type = "customer_id"

            # Get CRM interface
            crm = call_context.get("crm_interface")
            if not crm:
                return {
                    "success": False,
                    "error": "CRM interface not configured"
                }

            customer = await crm.lookup_customer(identifier, identifier_type)

            if customer:
                # Store in call context for easy access
                call_context["customer"] = customer

                return {
                    "success": True,
                    "customer": customer,
                    "identifier_type": identifier_type
                }
            else:
                return {
                    "success": False,
                    "error": "Customer not found"
                }

        except Exception as e:
            logger.error(f"Customer lookup error: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }

    async def _update_crm(
        self,
        call_context: Dict[str, Any],
        record_id: str,
        updates: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Update CRM record."""
        try:
            crm = call_context.get("crm_interface")
            if not crm:
                return {
                    "success": False,
                    "error": "CRM interface not configured"
                }

            result = await crm.update_record(record_id, updates)

            return {
                "success": True,
                "record_id": record_id,
                "updated_fields": list(updates.keys()),
                "updated_at": datetime.utcnow().isoformat()
            }

        except Exception as e:
            logger.error(f"CRM update error: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }

    async def _end_call(
        self,
        call_context: Dict[str, Any],
        reason: str,
        disposition: str = None
    ) -> Dict[str, Any]:
        """End the call gracefully."""
        try:
            telephony = call_context.get("telephony_interface")
            if not telephony:
                return {
                    "success": False,
                    "error": "Telephony interface not available"
                }

            # Record call outcome
            call_context["end_reason"] = reason
            call_context["disposition"] = disposition or reason
            call_context["ended_at"] = datetime.utcnow().isoformat()

            # Hangup
            await telephony.hangup(call_context["call_id"])

            return {
                "success": True,
                "reason": reason,
                "disposition": disposition,
                "ended_at": call_context["ended_at"]
            }

        except Exception as e:
            logger.error(f"End call error: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }

    async def _play_audio(
        self,
        call_context: Dict[str, Any],
        audio_url: str,
        loop: bool = False
    ) -> Dict[str, Any]:
        """Play audio file to caller."""
        try:
            telephony = call_context.get("telephony_interface")
            if not telephony:
                return {
                    "success": False,
                    "error": "Telephony interface not available"
                }

            await telephony.play_audio(
                call_id=call_context["call_id"],
                audio_url=audio_url,
                loop=loop
            )

            return {
                "success": True,
                "audio_url": audio_url,
                "loop": loop
            }

        except Exception as e:
            logger.error(f"Play audio error: {str(e)}")
            return {
                "success": False,
                "error": str(e)
            }


# Singleton accessor
_registry_instance = None


def get_voice_function_registry() -> VoiceFunctionRegistry:
    """
    Get the singleton VoiceFunctionRegistry instance.

    Returns:
        VoiceFunctionRegistry: The global registry instance
    """
    global _registry_instance
    if _registry_instance is None:
        _registry_instance = VoiceFunctionRegistry()
    return _registry_instance
