"""
Call Routing Module for Agent Forge Voice

Handles intelligent call routing based on caller information, time, context,
and agent pool availability. Generates TwiML responses for Twilio integration.
"""

from .call_router import CallRouter, RoutingRule, RoutingContext
from .twiml_generator import TwiMLGenerator

__all__ = [
    'CallRouter',
    'RoutingRule',
    'RoutingContext',
    'TwiMLGenerator',
]
