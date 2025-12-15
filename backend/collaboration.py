"""
Agent Forge - Collaboration Layer
Real-time dynamic collaboration between the core agents (Marketing, Sales, Support, Builder, Deployer)

Features:
- Message bus for inter-agent communication
- Shared context and memory
- Handoff protocols
- Collaborative decision making
- Real-time coordination on complex tasks
"""

import asyncio
import logging
from datetime import datetime
from typing import Any, Callable, Dict, List, Optional, Set
from dataclasses import dataclass, field
from enum import Enum
from collections import deque
import json

logger = logging.getLogger('AgentForge.Collaboration')


class AgentRole(Enum):
    """Core agent roles in the system"""
    ORCHESTRATOR = "orchestrator"
    MARKETING = "marketing"
    SALES = "sales"
    SUPPORT = "support"
    BUILDER = "builder"
    DEPLOYER = "deployer"
    FORGEMASTER = "forgemaster"  # The meta-agent that manages workforce scaling


class MessageType(Enum):
    """Types of inter-agent messages"""
    REQUEST = "request"           # Request help/action from another agent
    RESPONSE = "response"         # Response to a request
    BROADCAST = "broadcast"       # Broadcast to all agents
    HANDOFF = "handoff"           # Transfer responsibility
    CONTEXT_SHARE = "context"     # Share context/information
    INSIGHT = "insight"           # Share learned insight
    ALERT = "alert"               # Urgent notification
    SYNC = "sync"                 # Synchronization message


class Priority(Enum):
    """Message priority levels"""
    CRITICAL = 1
    HIGH = 2
    NORMAL = 3
    LOW = 4


@dataclass
class AgentMessage:
    """Message passed between agents"""
    id: str
    type: MessageType
    sender: AgentRole
    recipient: Optional[AgentRole]  # None for broadcasts
    subject: str
    payload: Dict[str, Any]
    priority: Priority = Priority.NORMAL
    timestamp: datetime = field(default_factory=datetime.now)
    correlation_id: Optional[str] = None  # For request/response tracking
    requires_response: bool = False
    ttl_seconds: int = 300  # Time to live

    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'type': self.type.value,
            'sender': self.sender.value,
            'recipient': self.recipient.value if self.recipient else None,
            'subject': self.subject,
            'payload': self.payload,
            'priority': self.priority.value,
            'timestamp': self.timestamp.isoformat(),
            'correlation_id': self.correlation_id,
            'requires_response': self.requires_response
        }


@dataclass
class SharedContext:
    """Shared context accessible by all agents"""
    customer_id: Optional[str] = None
    conversation_id: Optional[str] = None
    session_data: Dict[str, Any] = field(default_factory=dict)
    customer_history: List[Dict[str, Any]] = field(default_factory=list)
    active_tasks: List[str] = field(default_factory=list)
    insights: List[Dict[str, Any]] = field(default_factory=list)
    handoff_chain: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)


class CollaborationHub:
    """
    Central hub for agent collaboration.
    Manages message passing, shared context, and coordination.
    """

    _instance: Optional['CollaborationHub'] = None

    def __new__(cls) -> 'CollaborationHub':
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return

        # Message queues per agent
        self._queues: Dict[AgentRole, asyncio.Queue] = {
            role: asyncio.Queue() for role in AgentRole
        }

        # Message handlers registered by agents
        self._handlers: Dict[AgentRole, Dict[str, Callable]] = {
            role: {} for role in AgentRole
        }

        # Shared contexts (keyed by session/conversation ID)
        self._contexts: Dict[str, SharedContext] = {}

        # Active collaborations
        self._collaborations: Dict[str, 'Collaboration'] = {}

        # Message history for debugging/learning
        self._message_history: deque = deque(maxlen=1000)

        # Pending responses (correlation_id -> future)
        self._pending_responses: Dict[str, asyncio.Future] = {}

        # Agent status
        self._agent_status: Dict[AgentRole, Dict[str, Any]] = {
            role: {'online': False, 'last_seen': None, 'load': 0}
            for role in AgentRole
        }

        self._running = False

        # Stats tracking
        self.stats = {
            "messages_processed": 0,
            "handoffs_completed": 0,
            "collaborations_started": 0,
            "broadcasts_sent": 0
        }

        self._initialized = True
        logger.info('[CollaborationHub] Initialized')

    async def start(self):
        """Start the collaboration hub"""
        self._running = True
        logger.info('[CollaborationHub] Started')

    def stop(self):
        """Stop the collaboration hub"""
        self._running = False
        # Cancel pending responses
        for future in self._pending_responses.values():
            if not future.done():
                future.cancel()
        logger.info('[CollaborationHub] Stopped')

    # Agent Registration
    def register_agent(self, role: AgentRole, handlers: Dict[str, Callable] = None):
        """Register an agent with optional message handlers"""
        self._agent_status[role]['online'] = True
        self._agent_status[role]['last_seen'] = datetime.now()
        if handlers:
            self._handlers[role].update(handlers)
        logger.info(f'[CollaborationHub] Agent registered: {role.value}')

    def unregister_agent(self, role: AgentRole):
        """Unregister an agent"""
        self._agent_status[role]['online'] = False
        logger.info(f'[CollaborationHub] Agent unregistered: {role.value}')

    # Messaging
    async def send_message(self, message: AgentMessage) -> Optional[Dict[str, Any]]:
        """Send a message to an agent or broadcast"""
        self._message_history.append(message)
        self.stats["messages_processed"] += 1

        if message.recipient:
            # Direct message
            await self._queues[message.recipient].put(message)
            logger.debug(f'[CollaborationHub] Message {message.id}: {message.sender.value} -> {message.recipient.value}')
        else:
            # Broadcast to all except sender
            for role in AgentRole:
                if role != message.sender:
                    await self._queues[role].put(message)
            self.stats["broadcasts_sent"] += 1
            logger.debug(f'[CollaborationHub] Broadcast {message.id} from {message.sender.value}')

        # If response required, wait for it
        if message.requires_response:
            future = asyncio.get_event_loop().create_future()
            self._pending_responses[message.id] = future
            try:
                response = await asyncio.wait_for(future, timeout=message.ttl_seconds)
                return response
            except asyncio.TimeoutError:
                logger.warning(f'[CollaborationHub] Response timeout for message {message.id}')
                return None
            finally:
                self._pending_responses.pop(message.id, None)

        return None

    async def receive_message(self, role: AgentRole, timeout: float = 1.0) -> Optional[AgentMessage]:
        """Receive a message for an agent"""
        try:
            message = await asyncio.wait_for(self._queues[role].get(), timeout=timeout)
            self._agent_status[role]['last_seen'] = datetime.now()
            return message
        except asyncio.TimeoutError:
            return None

    def respond_to_message(self, correlation_id: str, response: Dict[str, Any]):
        """Send a response to a pending request"""
        future = self._pending_responses.get(correlation_id)
        if future and not future.done():
            future.set_result(response)

    # Convenience methods for common message types
    async def request_help(
        self,
        sender: AgentRole,
        recipient: AgentRole,
        subject: str,
        payload: Dict[str, Any],
        wait_for_response: bool = True
    ) -> Optional[Dict[str, Any]]:
        """Request help from another agent"""
        import uuid
        message = AgentMessage(
            id=str(uuid.uuid4()),
            type=MessageType.REQUEST,
            sender=sender,
            recipient=recipient,
            subject=subject,
            payload=payload,
            requires_response=wait_for_response
        )
        return await self.send_message(message)

    async def handoff(
        self,
        sender: AgentRole,
        recipient: AgentRole,
        context_id: str,
        reason: str,
        data: Dict[str, Any]
    ):
        """Hand off a task/conversation to another agent"""
        import uuid

        # Update context handoff chain
        if context_id in self._contexts:
            self._contexts[context_id].handoff_chain.append(
                f"{sender.value}->{recipient.value}:{reason}"
            )

        message = AgentMessage(
            id=str(uuid.uuid4()),
            type=MessageType.HANDOFF,
            sender=sender,
            recipient=recipient,
            subject=f"Handoff: {reason}",
            payload={
                'context_id': context_id,
                'reason': reason,
                'data': data,
                'handoff_chain': self._contexts.get(context_id, SharedContext()).handoff_chain
            },
            priority=Priority.HIGH
        )
        await self.send_message(message)
        self.stats["handoffs_completed"] += 1
        logger.info(f'[CollaborationHub] Handoff: {sender.value} -> {recipient.value} ({reason})')

    async def broadcast_insight(
        self,
        sender: AgentRole,
        insight_type: str,
        insight_data: Dict[str, Any]
    ):
        """Broadcast an insight to all agents"""
        import uuid
        message = AgentMessage(
            id=str(uuid.uuid4()),
            type=MessageType.INSIGHT,
            sender=sender,
            recipient=None,
            subject=f"Insight: {insight_type}",
            payload={'type': insight_type, 'data': insight_data}
        )
        await self.send_message(message)

    async def share_context(
        self,
        sender: AgentRole,
        recipient: AgentRole,
        context_id: str,
        context_data: Dict[str, Any]
    ):
        """Share context with another agent"""
        import uuid
        message = AgentMessage(
            id=str(uuid.uuid4()),
            type=MessageType.CONTEXT_SHARE,
            sender=sender,
            recipient=recipient,
            subject=f"Context: {context_id}",
            payload={'context_id': context_id, 'data': context_data}
        )
        await self.send_message(message)

    # Shared Context Management
    def create_context(self, context_id: str, **kwargs) -> SharedContext:
        """Create a new shared context"""
        context = SharedContext(**kwargs)
        self._contexts[context_id] = context
        return context

    def get_context(self, context_id: str) -> Optional[SharedContext]:
        """Get a shared context"""
        return self._contexts.get(context_id)

    def update_context(self, context_id: str, updates: Dict[str, Any]):
        """Update a shared context"""
        if context_id in self._contexts:
            context = self._contexts[context_id]
            for key, value in updates.items():
                if hasattr(context, key):
                    setattr(context, key, value)
                else:
                    context.metadata[key] = value

    def add_insight_to_context(self, context_id: str, insight: Dict[str, Any]):
        """Add an insight to a context"""
        if context_id in self._contexts:
            self._contexts[context_id].insights.append({
                **insight,
                'timestamp': datetime.now().isoformat()
            })

    # Collaboration Sessions
    def start_collaboration(
        self,
        collaboration_id: str,
        lead_agent: AgentRole,
        participants: List[AgentRole],
        objective: str,
        context_id: Optional[str] = None
    ) -> 'Collaboration':
        """Start a multi-agent collaboration session"""
        collab = Collaboration(
            id=collaboration_id,
            lead=lead_agent,
            participants=set(participants),
            objective=objective,
            context_id=context_id,
            hub=self
        )
        self._collaborations[collaboration_id] = collab
        self.stats["collaborations_started"] += 1
        logger.info(f'[CollaborationHub] Collaboration started: {collaboration_id} (lead: {lead_agent.value})')
        return collab

    def get_collaboration(self, collaboration_id: str) -> Optional['Collaboration']:
        """Get an active collaboration"""
        return self._collaborations.get(collaboration_id)

    def end_collaboration(self, collaboration_id: str):
        """End a collaboration session"""
        if collaboration_id in self._collaborations:
            del self._collaborations[collaboration_id]
            logger.info(f'[CollaborationHub] Collaboration ended: {collaboration_id}')

    # Status and Metrics
    def get_agent_status(self, role: AgentRole) -> Dict[str, Any]:
        """Get status of an agent"""
        return self._agent_status.get(role, {})

    def get_all_status(self) -> Dict[str, Dict[str, Any]]:
        """Get status of all agents"""
        return {role.value: status for role, status in self._agent_status.items()}

    def get_queue_depths(self) -> Dict[str, int]:
        """Get message queue depths for all agents"""
        return {role.value: q.qsize() for role, q in self._queues.items()}

    @property
    def agents(self) -> Dict[AgentRole, Dict[str, Any]]:
        """Get registered agents"""
        return {k: v for k, v in self._agent_status.items() if v.get('online')}

    @property
    def collaborations(self) -> Dict[str, 'Collaboration']:
        """Get active collaborations"""
        return self._collaborations

    async def process_messages(self):
        """Main message processing loop - called by orchestrator"""
        while self._running:
            # Process messages for each agent that has handlers
            for role, handlers in self._handlers.items():
                if handlers:
                    try:
                        message = await self.receive_message(role, timeout=0.01)
                        if message:
                            for pattern, handler in handlers.items():
                                if pattern in message.subject or pattern == '*':
                                    try:
                                        if asyncio.iscoroutinefunction(handler):
                                            await handler(message)
                                        else:
                                            handler(message)
                                    except Exception as e:
                                        logger.error(f'Handler error: {e}')
                    except Exception:
                        pass
            await asyncio.sleep(0.1)


class Collaboration:
    """
    Represents an active multi-agent collaboration session.
    Used for complex tasks requiring multiple agents to work together.
    """

    def __init__(
        self,
        id: str,
        lead: AgentRole,
        participants: Set[AgentRole],
        objective: str,
        context_id: Optional[str],
        hub: CollaborationHub
    ):
        self.id = id
        self.lead = lead
        self.participants = participants
        self.objective = objective
        self.context_id = context_id
        self.hub = hub
        self.started_at = datetime.now()
        self.status = "active"
        self.contributions: Dict[AgentRole, List[Dict[str, Any]]] = {
            p: [] for p in participants
        }
        self.decisions: List[Dict[str, Any]] = []
        self.result: Optional[Dict[str, Any]] = None

    async def request_contribution(
        self,
        from_agent: AgentRole,
        request_type: str,
        request_data: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Request a contribution from a participating agent"""
        if from_agent not in self.participants:
            logger.warning(f'Agent {from_agent.value} not in collaboration {self.id}')
            return None

        response = await self.hub.request_help(
            sender=self.lead,
            recipient=from_agent,
            subject=f"Collaboration:{self.id}:{request_type}",
            payload={
                'collaboration_id': self.id,
                'request_type': request_type,
                'data': request_data,
                'context_id': self.context_id
            },
            wait_for_response=True
        )

        if response:
            self.contributions[from_agent].append({
                'type': request_type,
                'response': response,
                'timestamp': datetime.now().isoformat()
            })

        return response

    async def broadcast_to_participants(self, message_type: str, data: Dict[str, Any]):
        """Broadcast a message to all participants"""
        import uuid
        for participant in self.participants:
            if participant != self.lead:
                await self.hub.send_message(AgentMessage(
                    id=str(uuid.uuid4()),
                    type=MessageType.BROADCAST,
                    sender=self.lead,
                    recipient=participant,
                    subject=f"Collaboration:{self.id}:{message_type}",
                    payload={'collaboration_id': self.id, 'type': message_type, 'data': data}
                ))

    def record_decision(self, decision: str, rationale: str, data: Dict[str, Any] = None):
        """Record a decision made during collaboration"""
        self.decisions.append({
            'decision': decision,
            'rationale': rationale,
            'data': data or {},
            'timestamp': datetime.now().isoformat()
        })

    def complete(self, result: Dict[str, Any]):
        """Mark collaboration as complete"""
        self.status = "completed"
        self.result = result
        self.hub.end_collaboration(self.id)

    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'lead': self.lead.value,
            'participants': [p.value for p in self.participants],
            'objective': self.objective,
            'status': self.status,
            'started_at': self.started_at.isoformat(),
            'contributions': {k.value: v for k, v in self.contributions.items()},
            'decisions': self.decisions,
            'result': self.result
        }


# Singleton accessor
def get_collaboration_hub() -> CollaborationHub:
    """Get the singleton CollaborationHub instance"""
    return CollaborationHub()


# Agent mixin for collaboration capabilities
class CollaborativeAgentMixin:
    """
    Mixin class that gives agents collaboration capabilities.
    Add this to MarketingEngine, SalesEngine, etc.
    """

    def __init__(self, role: AgentRole):
        self._collab_role = role
        self._collab_hub = get_collaboration_hub()
        self._message_handlers: Dict[str, Callable] = {}

    def register_for_collaboration(self):
        """Register this agent with the collaboration hub"""
        self._collab_hub.register_agent(self._collab_role, self._message_handlers)

    def register_handler(self, subject_pattern: str, handler: Callable):
        """Register a message handler"""
        self._message_handlers[subject_pattern] = handler

    async def process_messages(self):
        """Process incoming messages (call this in agent's main loop)"""
        message = await self._collab_hub.receive_message(self._collab_role, timeout=0.1)
        if message:
            await self._handle_message(message)

    async def _handle_message(self, message: AgentMessage):
        """Handle an incoming message"""
        # Find matching handler
        for pattern, handler in self._message_handlers.items():
            if pattern in message.subject or pattern == '*':
                try:
                    result = await handler(message) if asyncio.iscoroutinefunction(handler) else handler(message)
                    if message.requires_response and message.correlation_id:
                        self._collab_hub.respond_to_message(message.correlation_id, result or {})
                    return
                except Exception as e:
                    logger.error(f'Handler error for {message.subject}: {e}')

        logger.debug(f'No handler for message: {message.subject}')

    async def request_from(
        self,
        target: AgentRole,
        subject: str,
        data: Dict[str, Any]
    ) -> Optional[Dict[str, Any]]:
        """Request something from another agent"""
        return await self._collab_hub.request_help(
            sender=self._collab_role,
            recipient=target,
            subject=subject,
            payload=data,
            wait_for_response=True
        )

    async def handoff_to(
        self,
        target: AgentRole,
        context_id: str,
        reason: str,
        data: Dict[str, Any]
    ):
        """Hand off work to another agent"""
        await self._collab_hub.handoff(
            sender=self._collab_role,
            recipient=target,
            context_id=context_id,
            reason=reason,
            data=data
        )

    async def share_insight(self, insight_type: str, insight_data: Dict[str, Any]):
        """Share an insight with all agents"""
        await self._collab_hub.broadcast_insight(
            sender=self._collab_role,
            insight_type=insight_type,
            insight_data=insight_data
        )
