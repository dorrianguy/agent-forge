"""
Agent Forge - Backend Package
"""

from .orchestrator import Orchestrator, Task, TaskType, TaskPriority
from .universal_builder import UniversalAgentBuilder, AgentType, BuiltAgent
from .deployment import DeploymentManager, DeploymentTarget, Deployment
from .control_hub import (
    ControlHub,
    get_control_hub,
    init_control_hub,
    is_feature_enabled,
    track_request,
    track_error,
    log_to_hub
)
from .collaboration import (
    CollaborationHub,
    get_collaboration_hub,
    AgentRole,
    MessageType,
    AgentMessage,
    Collaboration,
    CollaborativeAgentMixin
)
from .learning import (
    LearningEngine,
    get_learning_engine,
    OutcomeType,
    StrategyType,
    Outcome,
    Strategy,
    LearnedInsight
)
from .workforce import (
    WorkforceManager,
    get_workforce_manager,
    init_workforce_manager,
    WorkerType,
    WorkerAgent,
    ScalingTrigger,
    ScalingEvent,
    ScalingPolicy
)
from .api import app

__all__ = [
    # API
    'app',
    # Orchestrator
    'Orchestrator',
    'Task',
    'TaskType',
    'TaskPriority',
    # Builder
    'UniversalAgentBuilder',
    'AgentType',
    'BuiltAgent',
    # Deployment
    'DeploymentManager',
    'DeploymentTarget',
    'Deployment',
    # Control Hub
    'ControlHub',
    'get_control_hub',
    'init_control_hub',
    'is_feature_enabled',
    'track_request',
    'track_error',
    'log_to_hub',
    # Collaboration
    'CollaborationHub',
    'get_collaboration_hub',
    'AgentRole',
    'MessageType',
    'AgentMessage',
    'Collaboration',
    'CollaborativeAgentMixin',
    # Learning
    'LearningEngine',
    'get_learning_engine',
    'OutcomeType',
    'StrategyType',
    'Outcome',
    'Strategy',
    'LearnedInsight',
    # Workforce (Forgemaster)
    'WorkforceManager',
    'get_workforce_manager',
    'init_workforce_manager',
    'WorkerType',
    'WorkerAgent',
    'ScalingTrigger',
    'ScalingEvent',
    'ScalingPolicy'
]
