"""
Agent Forge - Workforce Manager (Forge Agent)
The self-scaling meta-agent that monitors workload and dynamically spawns helper agents.

This is the 6th core agent - the "Forgemaster" that:
- Monitors all task queues and agent performance in real-time
- Detects bottlenecks, traffic spikes, and resource constraints
- Dynamically spawns specialized helper agents when thresholds are exceeded
- Manages agent lifecycle (creation, assignment, retirement)
- Learns optimal scaling patterns from historical data
- Reports all scaling events to Control Hub
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Callable
from dataclasses import dataclass, field
from enum import Enum
import uuid

from . import database as db

logger = logging.getLogger('AgentForge.Workforce')


class WorkerType(Enum):
    """Types of dynamic worker agents that can be spawned"""
    SUPPORT_HELPER = "support_helper"
    SALES_ASSISTANT = "sales_assistant"
    CONTENT_WRITER = "content_writer"
    LEAD_QUALIFIER = "lead_qualifier"
    TICKET_TRIAGER = "ticket_triager"
    DEPLOYMENT_HELPER = "deployment_helper"
    BUILD_ASSISTANT = "build_assistant"
    GENERAL_WORKER = "general_worker"


class ScalingTrigger(Enum):
    """Reasons for scaling decisions"""
    QUEUE_DEPTH = "queue_depth"
    RESPONSE_TIME = "response_time"
    ERROR_RATE = "error_rate"
    TRAFFIC_SPIKE = "traffic_spike"
    SCHEDULED = "scheduled"
    MANUAL = "manual"
    PREDICTIVE = "predictive"


@dataclass
class WorkerAgent:
    """Represents a dynamically spawned worker agent"""
    id: str
    type: WorkerType
    spawned_at: datetime = field(default_factory=datetime.now)
    assigned_to: Optional[str] = None  # Task type or queue
    tasks_completed: int = 0
    last_active: datetime = field(default_factory=datetime.now)
    performance_score: float = 1.0
    config: Dict[str, Any] = field(default_factory=dict)
    status: str = "active"  # active, idle, retiring, terminated

    def is_idle(self, idle_threshold_seconds: int = 300) -> bool:
        """Check if worker has been idle too long"""
        return (datetime.now() - self.last_active).seconds > idle_threshold_seconds


@dataclass
class ScalingEvent:
    """Records a scaling decision"""
    id: str
    timestamp: datetime
    trigger: ScalingTrigger
    action: str  # scale_up, scale_down
    worker_type: WorkerType
    count: int
    reason: str
    metrics_snapshot: Dict[str, Any]


@dataclass
class WorkloadMetrics:
    """Current workload metrics snapshot"""
    timestamp: datetime = field(default_factory=datetime.now)

    # Queue metrics
    support_queue_depth: int = 0
    sales_queue_depth: int = 0
    marketing_queue_depth: int = 0
    build_queue_depth: int = 0
    deploy_queue_depth: int = 0
    total_queue_depth: int = 0

    # Performance metrics
    avg_response_time_ms: float = 0.0
    error_rate: float = 0.0
    tasks_per_minute: float = 0.0

    # Traffic metrics
    requests_per_minute: float = 0.0
    active_conversations: int = 0
    concurrent_builds: int = 0

    # Agent metrics
    active_workers: int = 0
    idle_workers: int = 0
    worker_utilization: float = 0.0


class ScalingPolicy:
    """Defines when and how to scale"""

    def __init__(self, config: Dict[str, Any] = None):
        config = config or {}

        # Queue thresholds (scale up when exceeded)
        self.support_queue_threshold = config.get('support_queue_threshold', 20)
        self.sales_queue_threshold = config.get('sales_queue_threshold', 15)
        self.marketing_queue_threshold = config.get('marketing_queue_threshold', 10)
        self.build_queue_threshold = config.get('build_queue_threshold', 5)

        # Performance thresholds
        self.max_response_time_ms = config.get('max_response_time_ms', 5000)
        self.max_error_rate = config.get('max_error_rate', 0.05)

        # Scaling limits
        self.max_workers_per_type = config.get('max_workers_per_type', 10)
        self.max_total_workers = config.get('max_total_workers', 50)
        self.min_workers_per_type = config.get('min_workers_per_type', 0)

        # Timing
        self.scale_up_cooldown_seconds = config.get('scale_up_cooldown_seconds', 60)
        self.scale_down_cooldown_seconds = config.get('scale_down_cooldown_seconds', 300)
        self.idle_threshold_seconds = config.get('idle_threshold_seconds', 300)

        # Scale amounts
        self.scale_up_increment = config.get('scale_up_increment', 2)
        self.scale_down_increment = config.get('scale_down_increment', 1)


class WorkforceManager:
    """
    The Forge Agent - manages dynamic workforce scaling.

    This is the meta-agent that monitors the entire system and spawns
    helper agents when needed to handle increased load.
    """

    _instance = None

    def __new__(cls):
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return

        self.policy = ScalingPolicy()
        self.workers: Dict[str, WorkerAgent] = {}
        self.scaling_history: List[ScalingEvent] = []
        self.metrics_history: List[WorkloadMetrics] = []

        # Cooldown tracking
        self.last_scale_up: Dict[WorkerType, datetime] = {}
        self.last_scale_down: Dict[WorkerType, datetime] = {}

        # Callbacks
        self.on_worker_spawned: Optional[Callable] = None
        self.on_worker_terminated: Optional[Callable] = None
        self.on_scaling_event: Optional[Callable] = None

        # References (set by orchestrator)
        self.orchestrator = None
        self.builder = None
        self.control_hub = None
        self.learning_engine = None

        # Stats
        self.stats = {
            "workers_spawned": 0,
            "workers_terminated": 0,
            "scale_up_events": 0,
            "scale_down_events": 0,
            "tasks_handled_by_workers": 0
        }

        self._initialized = True
        logger.info("⚒️ Workforce Manager initialized")

    def configure(self, config: Dict[str, Any]):
        """Update scaling policy from config"""
        self.policy = ScalingPolicy(config)
        logger.info("⚒️ Workforce policy updated")

    def set_references(
        self,
        orchestrator=None,
        builder=None,
        control_hub=None,
        learning_engine=None
    ):
        """Set references to other system components"""
        if orchestrator:
            self.orchestrator = orchestrator
        if builder:
            self.builder = builder
        if control_hub:
            self.control_hub = control_hub
        if learning_engine:
            self.learning_engine = learning_engine

    def collect_metrics(self) -> WorkloadMetrics:
        """Collect current workload metrics from the system"""
        metrics = WorkloadMetrics()

        if self.orchestrator:
            # Queue depths by type
            queue = self.orchestrator.task_queue
            metrics.support_queue_depth = sum(1 for t in queue if t.type.value == 'support')
            metrics.sales_queue_depth = sum(1 for t in queue if t.type.value == 'sales')
            metrics.marketing_queue_depth = sum(1 for t in queue if t.type.value == 'marketing')
            metrics.build_queue_depth = sum(1 for t in queue if t.type.value == 'build')
            metrics.deploy_queue_depth = sum(1 for t in queue if t.type.value == 'deploy')
            metrics.total_queue_depth = len(queue)

            # Calculate tasks per minute from recent completions
            now = datetime.now()
            recent_completed = [
                t for t in self.orchestrator.completed_tasks
                if t.completed_at and (now - t.completed_at).seconds < 60
            ]
            metrics.tasks_per_minute = len(recent_completed)

        # Worker metrics
        active = [w for w in self.workers.values() if w.status == 'active']
        idle = [w for w in active if w.is_idle(self.policy.idle_threshold_seconds)]
        metrics.active_workers = len(active)
        metrics.idle_workers = len(idle)
        metrics.worker_utilization = (
            (len(active) - len(idle)) / max(len(active), 1)
        )

        # Store for history
        self.metrics_history.append(metrics)
        if len(self.metrics_history) > 1000:
            self.metrics_history = self.metrics_history[-500:]

        return metrics

    def evaluate_scaling_needs(self, metrics: WorkloadMetrics) -> List[Dict[str, Any]]:
        """Evaluate metrics and determine scaling actions needed"""
        actions = []
        now = datetime.now()

        # Check support queue
        if metrics.support_queue_depth > self.policy.support_queue_threshold:
            if self._can_scale_up(WorkerType.SUPPORT_HELPER, now):
                actions.append({
                    'action': 'scale_up',
                    'worker_type': WorkerType.SUPPORT_HELPER,
                    'count': self._calculate_scale_amount(
                        metrics.support_queue_depth,
                        self.policy.support_queue_threshold
                    ),
                    'trigger': ScalingTrigger.QUEUE_DEPTH,
                    'reason': f"Support queue depth {metrics.support_queue_depth} exceeds threshold {self.policy.support_queue_threshold}"
                })

        # Check sales queue
        if metrics.sales_queue_depth > self.policy.sales_queue_threshold:
            if self._can_scale_up(WorkerType.SALES_ASSISTANT, now):
                actions.append({
                    'action': 'scale_up',
                    'worker_type': WorkerType.SALES_ASSISTANT,
                    'count': self._calculate_scale_amount(
                        metrics.sales_queue_depth,
                        self.policy.sales_queue_threshold
                    ),
                    'trigger': ScalingTrigger.QUEUE_DEPTH,
                    'reason': f"Sales queue depth {metrics.sales_queue_depth} exceeds threshold {self.policy.sales_queue_threshold}"
                })

        # Check marketing queue
        if metrics.marketing_queue_depth > self.policy.marketing_queue_threshold:
            if self._can_scale_up(WorkerType.CONTENT_WRITER, now):
                actions.append({
                    'action': 'scale_up',
                    'worker_type': WorkerType.CONTENT_WRITER,
                    'count': self._calculate_scale_amount(
                        metrics.marketing_queue_depth,
                        self.policy.marketing_queue_threshold
                    ),
                    'trigger': ScalingTrigger.QUEUE_DEPTH,
                    'reason': f"Marketing queue depth {metrics.marketing_queue_depth} exceeds threshold {self.policy.marketing_queue_threshold}"
                })

        # Check build queue
        if metrics.build_queue_depth > self.policy.build_queue_threshold:
            if self._can_scale_up(WorkerType.BUILD_ASSISTANT, now):
                actions.append({
                    'action': 'scale_up',
                    'worker_type': WorkerType.BUILD_ASSISTANT,
                    'count': self._calculate_scale_amount(
                        metrics.build_queue_depth,
                        self.policy.build_queue_threshold
                    ),
                    'trigger': ScalingTrigger.QUEUE_DEPTH,
                    'reason': f"Build queue depth {metrics.build_queue_depth} exceeds threshold {self.policy.build_queue_threshold}"
                })

        # Check for scale down opportunities (idle workers)
        for worker_type in WorkerType:
            type_workers = [
                w for w in self.workers.values()
                if w.type == worker_type and w.status == 'active'
            ]
            idle_workers = [
                w for w in type_workers
                if w.is_idle(self.policy.idle_threshold_seconds)
            ]

            if len(idle_workers) > 0 and self._can_scale_down(worker_type, now):
                # Keep at least min_workers_per_type
                can_terminate = max(
                    0,
                    len(idle_workers) - self.policy.min_workers_per_type
                )
                if can_terminate > 0:
                    actions.append({
                        'action': 'scale_down',
                        'worker_type': worker_type,
                        'count': min(can_terminate, self.policy.scale_down_increment),
                        'trigger': ScalingTrigger.QUEUE_DEPTH,
                        'reason': f"{len(idle_workers)} idle {worker_type.value} workers"
                    })

        return actions

    def _can_scale_up(self, worker_type: WorkerType, now: datetime) -> bool:
        """Check if we can scale up (cooldown and limits)"""
        # Check cooldown
        last = self.last_scale_up.get(worker_type)
        if last:
            cooldown = timedelta(seconds=self.policy.scale_up_cooldown_seconds)
            if now - last < cooldown:
                return False

        # Check limits
        type_count = sum(1 for w in self.workers.values() if w.type == worker_type and w.status == 'active')
        if type_count >= self.policy.max_workers_per_type:
            return False

        total_count = sum(1 for w in self.workers.values() if w.status == 'active')
        if total_count >= self.policy.max_total_workers:
            return False

        return True

    def _can_scale_down(self, worker_type: WorkerType, now: datetime) -> bool:
        """Check if we can scale down (cooldown)"""
        last = self.last_scale_down.get(worker_type)
        if last:
            cooldown = timedelta(seconds=self.policy.scale_down_cooldown_seconds)
            if now - last < cooldown:
                return False
        return True

    def _calculate_scale_amount(self, current: int, threshold: int) -> int:
        """Calculate how many workers to spawn based on overflow"""
        overflow = current - threshold
        # Spawn 1 worker per 5 items over threshold, minimum 1, max increment
        amount = max(1, overflow // 5)
        return min(amount, self.policy.scale_up_increment)

    async def spawn_worker(
        self,
        worker_type: WorkerType,
        trigger: ScalingTrigger,
        reason: str
    ) -> WorkerAgent:
        """Spawn a new worker agent"""
        worker_id = f"worker-{worker_type.value}-{uuid.uuid4().hex[:8]}"

        # Create worker configuration based on type
        config = self._get_worker_config(worker_type)

        worker = WorkerAgent(
            id=worker_id,
            type=worker_type,
            assigned_to=self._get_assignment(worker_type),
            config=config
        )

        self.workers[worker_id] = worker
        self.last_scale_up[worker_type] = datetime.now()
        self.stats["workers_spawned"] += 1

        # Persist to database
        db.save_worker({
            'id': worker_id,
            'worker_type': worker_type.value,
            'status': 'active',
            'tasks_completed': 0,
            'created_at': worker.spawned_at.isoformat()
        })

        # Record scaling event
        event = ScalingEvent(
            id=f"scale-{uuid.uuid4().hex[:8]}",
            timestamp=datetime.now(),
            trigger=trigger,
            action="scale_up",
            worker_type=worker_type,
            count=1,
            reason=reason,
            metrics_snapshot=self._get_metrics_snapshot()
        )
        self.scaling_history.append(event)
        self.stats["scale_up_events"] += 1

        # Persist scaling event
        db.save_scaling_event({
            'id': event.id,
            'timestamp': event.timestamp.isoformat(),
            'trigger': trigger.value,
            'action': 'scale_up',
            'worker_type': worker_type.value,
            'count': 1,
            'reason': reason,
            'metrics_snapshot': self._get_metrics_snapshot()
        })

        # Notify
        logger.info(f"⚒️ Spawned worker {worker_id} ({worker_type.value}): {reason}")

        if self.on_worker_spawned:
            await self._safe_callback(self.on_worker_spawned, worker)

        if self.control_hub:
            await self._log_to_hub('info', f'Worker spawned: {worker_type.value}', {
                'worker_id': worker_id,
                'trigger': trigger.value,
                'reason': reason
            })

        return worker

    async def terminate_worker(self, worker_id: str, reason: str = "idle"):
        """Terminate a worker agent"""
        worker = self.workers.get(worker_id)
        if not worker:
            return

        worker.status = "terminated"
        self.last_scale_down[worker.type] = datetime.now()
        self.stats["workers_terminated"] += 1

        # Update database
        db.update_worker_status(worker_id, 'terminated')

        # Record scaling event
        event = ScalingEvent(
            id=f"scale-{uuid.uuid4().hex[:8]}",
            timestamp=datetime.now(),
            trigger=ScalingTrigger.QUEUE_DEPTH,
            action="scale_down",
            worker_type=worker.type,
            count=1,
            reason=reason,
            metrics_snapshot=self._get_metrics_snapshot()
        )
        self.scaling_history.append(event)
        self.stats["scale_down_events"] += 1

        # Persist scaling event
        db.save_scaling_event({
            'id': event.id,
            'timestamp': event.timestamp.isoformat(),
            'trigger': 'queue_depth',
            'action': 'scale_down',
            'worker_type': worker.type.value,
            'count': 1,
            'reason': reason,
            'metrics_snapshot': self._get_metrics_snapshot()
        })

        logger.info(f"⚒️ Terminated worker {worker_id}: {reason}")

        if self.on_worker_terminated:
            await self._safe_callback(self.on_worker_terminated, worker)

        if self.control_hub:
            await self._log_to_hub('info', f'Worker terminated: {worker.type.value}', {
                'worker_id': worker_id,
                'tasks_completed': worker.tasks_completed,
                'reason': reason
            })

        # Remove from active workers
        del self.workers[worker_id]

    def _get_worker_config(self, worker_type: WorkerType) -> Dict[str, Any]:
        """Get configuration for a worker type"""
        configs = {
            WorkerType.SUPPORT_HELPER: {
                'max_concurrent_tickets': 5,
                'auto_escalate': True,
                'knowledge_base_access': True
            },
            WorkerType.SALES_ASSISTANT: {
                'max_concurrent_conversations': 3,
                'can_offer_discounts': False,
                'demo_scheduling': True
            },
            WorkerType.CONTENT_WRITER: {
                'content_types': ['blog', 'social', 'email'],
                'requires_review': True,
                'max_daily_posts': 10
            },
            WorkerType.LEAD_QUALIFIER: {
                'scoring_enabled': True,
                'auto_assign_tier': True
            },
            WorkerType.TICKET_TRIAGER: {
                'priority_assignment': True,
                'auto_categorize': True
            },
            WorkerType.BUILD_ASSISTANT: {
                'template_access': True,
                'testing_enabled': True
            },
            WorkerType.DEPLOYMENT_HELPER: {
                'targets': ['cloudflare', 'vercel'],
                'rollback_enabled': True
            },
            WorkerType.GENERAL_WORKER: {
                'multi_task': True
            }
        }
        return configs.get(worker_type, {})

    def _get_assignment(self, worker_type: WorkerType) -> str:
        """Get queue assignment for worker type"""
        assignments = {
            WorkerType.SUPPORT_HELPER: 'support',
            WorkerType.SALES_ASSISTANT: 'sales',
            WorkerType.CONTENT_WRITER: 'marketing',
            WorkerType.LEAD_QUALIFIER: 'sales',
            WorkerType.TICKET_TRIAGER: 'support',
            WorkerType.BUILD_ASSISTANT: 'build',
            WorkerType.DEPLOYMENT_HELPER: 'deploy',
            WorkerType.GENERAL_WORKER: 'any'
        }
        return assignments.get(worker_type, 'any')

    def _get_metrics_snapshot(self) -> Dict[str, Any]:
        """Get current metrics as dict"""
        if self.metrics_history:
            m = self.metrics_history[-1]
            return {
                'total_queue': m.total_queue_depth,
                'support_queue': m.support_queue_depth,
                'sales_queue': m.sales_queue_depth,
                'active_workers': m.active_workers,
                'utilization': m.worker_utilization
            }
        return {}

    async def _safe_callback(self, callback: Callable, *args):
        """Safely execute a callback"""
        try:
            if asyncio.iscoroutinefunction(callback):
                await callback(*args)
            else:
                callback(*args)
        except Exception as e:
            logger.error(f"Callback error: {e}")

    async def _log_to_hub(self, level: str, message: str, data: Dict = None):
        """Log to Control Hub if available"""
        if self.control_hub:
            try:
                from .control_hub import log_to_hub
                await log_to_hub(level, f"[Workforce] {message}", data)
            except Exception:
                pass

    async def run_scaling_cycle(self):
        """Run one scaling evaluation cycle"""
        metrics = self.collect_metrics()
        actions = self.evaluate_scaling_needs(metrics)

        for action in actions:
            if action['action'] == 'scale_up':
                for _ in range(action['count']):
                    await self.spawn_worker(
                        action['worker_type'],
                        action['trigger'],
                        action['reason']
                    )
            elif action['action'] == 'scale_down':
                # Find idle workers of this type to terminate
                idle_workers = [
                    w for w in self.workers.values()
                    if w.type == action['worker_type']
                    and w.status == 'active'
                    and w.is_idle(self.policy.idle_threshold_seconds)
                ]
                for worker in idle_workers[:action['count']]:
                    await self.terminate_worker(worker.id, action['reason'])

    async def run(self, interval_seconds: int = 30):
        """Main run loop - continuously monitor and scale"""
        logger.info("⚒️ Workforce Manager starting scaling loop")

        while True:
            try:
                await self.run_scaling_cycle()
            except Exception as e:
                logger.error(f"Scaling cycle error: {e}")

            await asyncio.sleep(interval_seconds)

    def get_worker(self, worker_id: str) -> Optional[WorkerAgent]:
        """Get a worker by ID"""
        return self.workers.get(worker_id)

    def get_workers_by_type(self, worker_type: WorkerType) -> List[WorkerAgent]:
        """Get all workers of a specific type"""
        return [w for w in self.workers.values() if w.type == worker_type and w.status == 'active']

    def get_available_worker(self, task_type: str) -> Optional[WorkerAgent]:
        """Get an available worker for a task type"""
        # Map task types to worker types
        type_map = {
            'support': [WorkerType.SUPPORT_HELPER, WorkerType.TICKET_TRIAGER],
            'sales': [WorkerType.SALES_ASSISTANT, WorkerType.LEAD_QUALIFIER],
            'marketing': [WorkerType.CONTENT_WRITER],
            'build': [WorkerType.BUILD_ASSISTANT],
            'deploy': [WorkerType.DEPLOYMENT_HELPER]
        }

        worker_types = type_map.get(task_type, [WorkerType.GENERAL_WORKER])

        for wtype in worker_types:
            workers = self.get_workers_by_type(wtype)
            # Find least busy worker
            available = [w for w in workers if w.status == 'active']
            if available:
                return min(available, key=lambda w: w.tasks_completed)

        return None

    def record_task_completion(self, worker_id: str, task_time_ms: float = 0):
        """Record that a worker completed a task"""
        worker = self.workers.get(worker_id)
        if worker:
            worker.tasks_completed += 1
            worker.last_active = datetime.now()
            self.stats["tasks_handled_by_workers"] += 1

            # Persist to database
            db.record_worker_task_completion(worker_id, task_time_ms)

    def get_stats(self) -> Dict[str, Any]:
        """Get workforce statistics"""
        active_by_type = {}
        for wtype in WorkerType:
            active_by_type[wtype.value] = len(self.get_workers_by_type(wtype))

        return {
            **self.stats,
            "active_workers": sum(1 for w in self.workers.values() if w.status == 'active'),
            "workers_by_type": active_by_type,
            "recent_scaling_events": len([
                e for e in self.scaling_history
                if (datetime.now() - e.timestamp).seconds < 3600
            ])
        }

    def get_scaling_history(self, limit: int = 50) -> List[Dict[str, Any]]:
        """Get recent scaling events"""
        events = self.scaling_history[-limit:]
        return [
            {
                'id': e.id,
                'timestamp': e.timestamp.isoformat(),
                'trigger': e.trigger.value,
                'action': e.action,
                'worker_type': e.worker_type.value,
                'count': e.count,
                'reason': e.reason
            }
            for e in events
        ]


# Singleton accessor
_workforce_manager: Optional[WorkforceManager] = None


def get_workforce_manager() -> WorkforceManager:
    """Get the singleton WorkforceManager instance"""
    global _workforce_manager
    if _workforce_manager is None:
        _workforce_manager = WorkforceManager()
    return _workforce_manager


def init_workforce_manager(config: Dict[str, Any] = None) -> WorkforceManager:
    """Initialize the WorkforceManager with config"""
    manager = get_workforce_manager()
    if config:
        manager.configure(config)
    return manager
