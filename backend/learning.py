"""
Agent Forge - Learning Engine
Self-learning and continuous improvement system for autonomous agents.

Features:
- Outcome tracking and feedback loops
- Performance metrics that influence behavior
- Prompt versioning with A/B testing
- Strategy evolution based on results
- Knowledge accumulation and retrieval
- Adaptive decision making
"""

import asyncio
import json
import logging
import hashlib
from datetime import datetime, timedelta
from typing import Any, Callable, Dict, List, Optional, Tuple
from dataclasses import dataclass, field
from enum import Enum
from collections import defaultdict
import random
import os

logger = logging.getLogger('AgentForge.Learning')


class OutcomeType(Enum):
    """Types of outcomes to track"""
    LEAD_CONVERTED = "lead_converted"
    LEAD_LOST = "lead_lost"
    TICKET_RESOLVED = "ticket_resolved"
    TICKET_ESCALATED = "ticket_escalated"
    AGENT_DEPLOYED = "agent_deployed"
    CONTENT_ENGAGED = "content_engaged"
    CONTENT_IGNORED = "content_ignored"
    POSITIVE_FEEDBACK = "positive_feedback"
    NEGATIVE_FEEDBACK = "negative_feedback"
    TASK_COMPLETED = "task_completed"
    TASK_FAILED = "task_failed"


class StrategyType(Enum):
    """Types of strategies that can evolve"""
    SALES_APPROACH = "sales_approach"
    SUPPORT_RESPONSE = "support_response"
    MARKETING_TONE = "marketing_tone"
    LEAD_QUALIFICATION = "lead_qualification"
    ESCALATION_DECISION = "escalation_decision"
    PRICING_RECOMMENDATION = "pricing_recommendation"


@dataclass
class Outcome:
    """Represents an outcome from an agent action"""
    id: str
    type: OutcomeType
    task_id: str
    agent_type: str
    strategy_used: Optional[str]
    prompt_version: Optional[str]
    context: Dict[str, Any]
    result: Dict[str, Any]
    success: bool
    score: float  # 0.0 to 1.0
    timestamp: datetime = field(default_factory=datetime.now)
    feedback: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'type': self.type.value,
            'task_id': self.task_id,
            'agent_type': self.agent_type,
            'strategy_used': self.strategy_used,
            'prompt_version': self.prompt_version,
            'context': self.context,
            'result': self.result,
            'success': self.success,
            'score': self.score,
            'timestamp': self.timestamp.isoformat(),
            'feedback': self.feedback
        }


@dataclass
class PromptVariant:
    """A prompt variant for A/B testing"""
    id: str
    name: str
    strategy_type: StrategyType
    prompt_template: str
    created_at: datetime = field(default_factory=datetime.now)
    usage_count: int = 0
    success_count: int = 0
    total_score: float = 0.0
    is_active: bool = True

    @property
    def success_rate(self) -> float:
        if self.usage_count == 0:
            return 0.0
        return self.success_count / self.usage_count

    @property
    def avg_score(self) -> float:
        if self.usage_count == 0:
            return 0.0
        return self.total_score / self.usage_count

    def to_dict(self) -> Dict[str, Any]:
        return {
            'id': self.id,
            'name': self.name,
            'strategy_type': self.strategy_type.value,
            'usage_count': self.usage_count,
            'success_rate': self.success_rate,
            'avg_score': self.avg_score,
            'is_active': self.is_active
        }


@dataclass
class LearnedInsight:
    """An insight learned from outcomes"""
    id: str
    category: str
    insight: str
    confidence: float  # 0.0 to 1.0
    supporting_outcomes: int
    first_observed: datetime
    last_confirmed: datetime
    applicable_contexts: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class Strategy:
    """A strategy that can evolve over time"""
    id: str
    type: StrategyType
    name: str
    description: str
    parameters: Dict[str, Any]
    performance_score: float = 0.5
    usage_count: int = 0
    created_at: datetime = field(default_factory=datetime.now)
    evolved_from: Optional[str] = None


class LearningEngine:
    """
    Core learning engine that enables self-improvement.
    Tracks outcomes, evolves strategies, and accumulates knowledge.
    """

    _instance: Optional['LearningEngine'] = None

    def __new__(cls) -> 'LearningEngine':
        if cls._instance is None:
            cls._instance = super().__new__(cls)
            cls._instance._initialized = False
        return cls._instance

    def __init__(self):
        if self._initialized:
            return

        # Outcome storage
        self._outcomes: List[Outcome] = []
        self._outcome_index: Dict[str, List[Outcome]] = defaultdict(list)

        # Prompt variants for A/B testing
        self._prompt_variants: Dict[StrategyType, List[PromptVariant]] = defaultdict(list)

        # Learned insights
        self._insights: List[LearnedInsight] = []

        # Strategies
        self._strategies: Dict[StrategyType, List[Strategy]] = defaultdict(list)

        # Performance metrics over time
        self._metrics: Dict[str, List[Tuple[datetime, float]]] = defaultdict(list)

        # Knowledge base (key patterns that work)
        self._knowledge_base: Dict[str, Any] = {
            'successful_patterns': [],
            'failure_patterns': [],
            'context_insights': {},
            'optimal_parameters': {}
        }

        # Learning config
        self._config = {
            'min_samples_for_learning': 10,
            'exploration_rate': 0.2,  # 20% exploration, 80% exploitation
            'insight_confidence_threshold': 0.7,
            'strategy_evolution_threshold': 0.1,
            'max_prompt_variants': 5
        }

        self._initialized = True
        self._init_default_strategies()
        logger.info('[LearningEngine] Initialized')

    def _init_default_strategies(self):
        """Initialize default strategies"""
        # Sales strategies
        self._strategies[StrategyType.SALES_APPROACH] = [
            Strategy(
                id='sales-consultative',
                type=StrategyType.SALES_APPROACH,
                name='Consultative',
                description='Focus on understanding needs before recommending',
                parameters={'question_first': True, 'demo_emphasis': 'high'}
            ),
            Strategy(
                id='sales-direct',
                type=StrategyType.SALES_APPROACH,
                name='Direct',
                description='Lead with value proposition',
                parameters={'question_first': False, 'demo_emphasis': 'medium'}
            )
        ]

        # Support strategies
        self._strategies[StrategyType.SUPPORT_RESPONSE] = [
            Strategy(
                id='support-empathetic',
                type=StrategyType.SUPPORT_RESPONSE,
                name='Empathetic',
                description='Lead with empathy, then solve',
                parameters={'acknowledge_first': True, 'technical_depth': 'moderate'}
            ),
            Strategy(
                id='support-efficient',
                type=StrategyType.SUPPORT_RESPONSE,
                name='Efficient',
                description='Get to solution quickly',
                parameters={'acknowledge_first': False, 'technical_depth': 'high'}
            )
        ]

        # Marketing strategies
        self._strategies[StrategyType.MARKETING_TONE] = [
            Strategy(
                id='marketing-professional',
                type=StrategyType.MARKETING_TONE,
                name='Professional',
                description='Formal, business-focused tone',
                parameters={'tone': 'professional', 'emoji_use': False}
            ),
            Strategy(
                id='marketing-casual',
                type=StrategyType.MARKETING_TONE,
                name='Casual',
                description='Friendly, approachable tone',
                parameters={'tone': 'casual', 'emoji_use': True}
            )
        ]

    # Outcome Tracking
    def record_outcome(self, outcome: Outcome):
        """Record an outcome for learning"""
        self._outcomes.append(outcome)
        self._outcome_index[outcome.type.value].append(outcome)
        self._outcome_index[outcome.agent_type].append(outcome)

        # Update prompt variant stats if applicable
        if outcome.prompt_version:
            self._update_prompt_variant_stats(outcome)

        # Update strategy performance
        if outcome.strategy_used:
            self._update_strategy_performance(outcome)

        # Check for new insights
        self._analyze_for_insights(outcome)

        # Update metrics
        self._update_metrics(outcome)

        logger.debug(f'[LearningEngine] Recorded outcome: {outcome.type.value} (success={outcome.success})')

    def _update_prompt_variant_stats(self, outcome: Outcome):
        """Update prompt variant statistics"""
        for strategy_type, variants in self._prompt_variants.items():
            for variant in variants:
                if variant.id == outcome.prompt_version:
                    variant.usage_count += 1
                    if outcome.success:
                        variant.success_count += 1
                    variant.total_score += outcome.score
                    return

    def _update_strategy_performance(self, outcome: Outcome):
        """Update strategy performance score"""
        for strategy_type, strategies in self._strategies.items():
            for strategy in strategies:
                if strategy.id == outcome.strategy_used:
                    # Exponential moving average
                    alpha = 0.1
                    strategy.performance_score = (
                        alpha * outcome.score +
                        (1 - alpha) * strategy.performance_score
                    )
                    strategy.usage_count += 1
                    return

    def _analyze_for_insights(self, outcome: Outcome):
        """Analyze outcome for potential insights"""
        # Get recent similar outcomes
        similar = [
            o for o in self._outcomes[-100:]
            if o.type == outcome.type and o.agent_type == outcome.agent_type
        ]

        if len(similar) < self._config['min_samples_for_learning']:
            return

        # Analyze patterns in successful vs failed outcomes
        successful = [o for o in similar if o.success]
        failed = [o for o in similar if not o.success]

        if len(successful) >= 5 and len(failed) >= 5:
            # Look for distinguishing patterns
            self._extract_patterns(successful, failed, outcome.type)

    def _extract_patterns(
        self,
        successful: List[Outcome],
        failed: List[Outcome],
        outcome_type: OutcomeType
    ):
        """Extract patterns from successful vs failed outcomes"""
        # Extract common context keys in successful outcomes
        success_contexts = [o.context for o in successful]
        fail_contexts = [o.context for o in failed]

        # Find keys that appear more in successful outcomes
        success_keys = set()
        for ctx in success_contexts:
            success_keys.update(ctx.keys())

        for key in success_keys:
            success_vals = [ctx.get(key) for ctx in success_contexts if key in ctx]
            fail_vals = [ctx.get(key) for ctx in fail_contexts if key in ctx]

            # Check if there's a pattern (simplified - could use ML here)
            if success_vals and fail_vals:
                # For numeric values, check if success has higher/lower avg
                try:
                    success_avg = sum(float(v) for v in success_vals if v) / len(success_vals)
                    fail_avg = sum(float(v) for v in fail_vals if v) / len(fail_vals)

                    if abs(success_avg - fail_avg) / max(success_avg, fail_avg, 1) > 0.2:
                        insight = LearnedInsight(
                            id=f'insight-{outcome_type.value}-{key}-{datetime.now().timestamp()}',
                            category=outcome_type.value,
                            insight=f"Higher {key} ({success_avg:.2f} vs {fail_avg:.2f}) correlates with success",
                            confidence=0.7,
                            supporting_outcomes=len(successful) + len(failed),
                            first_observed=datetime.now(),
                            last_confirmed=datetime.now(),
                            applicable_contexts=[key]
                        )
                        self._add_insight(insight)
                except (ValueError, TypeError):
                    pass

    def _add_insight(self, insight: LearnedInsight):
        """Add or update an insight"""
        # Check if similar insight exists
        for existing in self._insights:
            if existing.category == insight.category and existing.insight == insight.insight:
                existing.supporting_outcomes += insight.supporting_outcomes
                existing.last_confirmed = datetime.now()
                existing.confidence = min(0.95, existing.confidence + 0.05)
                return

        self._insights.append(insight)
        logger.info(f'[LearningEngine] New insight: {insight.insight}')

    def _update_metrics(self, outcome: Outcome):
        """Update performance metrics"""
        now = datetime.now()
        metric_key = f"{outcome.agent_type}_{outcome.type.value}"
        self._metrics[metric_key].append((now, outcome.score))

        # Keep only last 30 days
        cutoff = now - timedelta(days=30)
        self._metrics[metric_key] = [
            (ts, val) for ts, val in self._metrics[metric_key]
            if ts > cutoff
        ]

    # Strategy Selection
    def select_strategy(
        self,
        strategy_type: StrategyType,
        context: Dict[str, Any] = None
    ) -> Strategy:
        """Select the best strategy using exploration/exploitation"""
        strategies = self._strategies.get(strategy_type, [])
        if not strategies:
            return None

        # Exploration: random selection
        if random.random() < self._config['exploration_rate']:
            return random.choice(strategies)

        # Exploitation: select best performing
        # Consider context for more intelligent selection
        best = max(strategies, key=lambda s: s.performance_score)
        return best

    def get_strategy_prompt_modifier(self, strategy: Strategy) -> str:
        """Get prompt modifications based on strategy"""
        modifiers = []

        params = strategy.parameters
        if strategy.type == StrategyType.SALES_APPROACH:
            if params.get('question_first'):
                modifiers.append("Start by asking about their specific needs and use case.")
            if params.get('demo_emphasis') == 'high':
                modifiers.append("Emphasize the opportunity to see a demo.")

        elif strategy.type == StrategyType.SUPPORT_RESPONSE:
            if params.get('acknowledge_first'):
                modifiers.append("Begin by acknowledging their frustration and showing empathy.")
            if params.get('technical_depth') == 'high':
                modifiers.append("Provide detailed technical explanations.")

        elif strategy.type == StrategyType.MARKETING_TONE:
            if params.get('tone') == 'casual':
                modifiers.append("Use a friendly, conversational tone.")
            if params.get('emoji_use'):
                modifiers.append("Include relevant emojis where appropriate.")

        return " ".join(modifiers)

    # Prompt A/B Testing
    def register_prompt_variant(
        self,
        strategy_type: StrategyType,
        name: str,
        prompt_template: str
    ) -> PromptVariant:
        """Register a new prompt variant for testing"""
        variant_id = hashlib.md5(prompt_template.encode()).hexdigest()[:12]
        variant = PromptVariant(
            id=variant_id,
            name=name,
            strategy_type=strategy_type,
            prompt_template=prompt_template
        )

        # Limit variants per strategy
        variants = self._prompt_variants[strategy_type]
        if len(variants) >= self._config['max_prompt_variants']:
            # Remove worst performing inactive variant
            worst = min(
                [v for v in variants if not v.is_active or v.usage_count > 20],
                key=lambda v: v.success_rate,
                default=None
            )
            if worst:
                variants.remove(worst)

        variants.append(variant)
        return variant

    def select_prompt_variant(
        self,
        strategy_type: StrategyType
    ) -> Optional[PromptVariant]:
        """Select a prompt variant for A/B testing"""
        variants = [v for v in self._prompt_variants.get(strategy_type, []) if v.is_active]
        if not variants:
            return None

        # Thompson Sampling-inspired selection
        # More exploration for new variants, exploitation for proven ones
        scores = []
        for v in variants:
            if v.usage_count < 10:
                # Explore new variants more
                score = random.random()
            else:
                # Use success rate with some noise
                score = v.success_rate + random.gauss(0, 0.1)
            scores.append((v, score))

        return max(scores, key=lambda x: x[1])[0]

    # Knowledge Retrieval
    def get_insights_for_context(
        self,
        category: str,
        context: Dict[str, Any]
    ) -> List[LearnedInsight]:
        """Get relevant insights for a given context"""
        relevant = []
        for insight in self._insights:
            if insight.category == category:
                if insight.confidence >= self._config['insight_confidence_threshold']:
                    # Check if insight applies to this context
                    if any(key in context for key in insight.applicable_contexts):
                        relevant.append(insight)
                    elif not insight.applicable_contexts:
                        relevant.append(insight)

        return sorted(relevant, key=lambda i: i.confidence, reverse=True)

    def get_successful_patterns(
        self,
        agent_type: str,
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """Get patterns from successful outcomes"""
        successful = [
            o for o in self._outcome_index[agent_type]
            if o.success and o.score > 0.8
        ][-50:]  # Last 50 successful

        # Extract common patterns
        patterns = []
        for outcome in successful[:limit]:
            patterns.append({
                'context': outcome.context,
                'strategy': outcome.strategy_used,
                'score': outcome.score
            })

        return patterns

    # Evolution
    async def evolve_strategies(self):
        """Periodically evolve strategies based on performance"""
        for strategy_type, strategies in self._strategies.items():
            if len(strategies) < 2:
                continue

            # Sort by performance
            sorted_strategies = sorted(
                strategies,
                key=lambda s: s.performance_score,
                reverse=True
            )

            best = sorted_strategies[0]
            worst = sorted_strategies[-1]

            # If significant performance gap, evolve
            gap = best.performance_score - worst.performance_score
            if gap > self._config['strategy_evolution_threshold'] and worst.usage_count > 20:
                # Create evolved version of worst by adopting best's parameters
                evolved = Strategy(
                    id=f'{worst.id}-evolved-{datetime.now().timestamp():.0f}',
                    type=strategy_type,
                    name=f'{worst.name} (Evolved)',
                    description=f'Evolved from {worst.name} with insights from {best.name}',
                    parameters={
                        **worst.parameters,
                        # Adopt some parameters from best
                        **{k: v for k, v in best.parameters.items()
                           if random.random() > 0.5}
                    },
                    evolved_from=worst.id
                )

                # Replace worst with evolved
                strategies.remove(worst)
                strategies.append(evolved)
                logger.info(f'[LearningEngine] Evolved strategy: {evolved.name}')

    # Metrics and Reporting
    def get_performance_summary(self, days: int = 7) -> Dict[str, Any]:
        """Get performance summary over time period"""
        cutoff = datetime.now() - timedelta(days=days)

        recent_outcomes = [o for o in self._outcomes if o.timestamp > cutoff]

        if not recent_outcomes:
            return {'period_days': days, 'outcomes': 0}

        success_rate = sum(1 for o in recent_outcomes if o.success) / len(recent_outcomes)
        avg_score = sum(o.score for o in recent_outcomes) / len(recent_outcomes)

        by_type = defaultdict(list)
        for o in recent_outcomes:
            by_type[o.type.value].append(o)

        type_summary = {}
        for type_name, outcomes in by_type.items():
            type_summary[type_name] = {
                'count': len(outcomes),
                'success_rate': sum(1 for o in outcomes if o.success) / len(outcomes),
                'avg_score': sum(o.score for o in outcomes) / len(outcomes)
            }

        return {
            'period_days': days,
            'total_outcomes': len(recent_outcomes),
            'success_rate': success_rate,
            'avg_score': avg_score,
            'by_type': type_summary,
            'active_insights': len([i for i in self._insights
                                    if i.confidence >= self._config['insight_confidence_threshold']]),
            'strategies': {
                st.value: [s.to_dict() if hasattr(s, 'to_dict') else {'id': s.id, 'score': s.performance_score}
                           for s in strategies]
                for st, strategies in self._strategies.items()
            }
        }

    def get_learning_recommendations(self) -> List[str]:
        """Get recommendations for improvement"""
        recommendations = []

        # Check for underperforming strategies
        for strategy_type, strategies in self._strategies.items():
            for s in strategies:
                if s.usage_count > 50 and s.performance_score < 0.4:
                    recommendations.append(
                        f"Strategy '{s.name}' for {strategy_type.value} is underperforming. "
                        f"Consider revising or replacing."
                    )

        # Check for insights that need action
        high_conf_insights = [
            i for i in self._insights
            if i.confidence > 0.8 and i.supporting_outcomes > 20
        ]
        for insight in high_conf_insights[:3]:
            recommendations.append(f"High confidence insight: {insight.insight}")

        # Check for metrics trends
        for metric_key, values in self._metrics.items():
            if len(values) > 20:
                recent = [v for ts, v in values[-10:]]
                older = [v for ts, v in values[-20:-10]]
                if older and recent:
                    recent_avg = sum(recent) / len(recent)
                    older_avg = sum(older) / len(older)
                    if recent_avg < older_avg * 0.8:
                        recommendations.append(
                            f"Performance decline detected in {metric_key}: "
                            f"{older_avg:.2f} -> {recent_avg:.2f}"
                        )

        return recommendations

    # Persistence
    def save_state(self, filepath: str):
        """Save learning state to file"""
        state = {
            'outcomes': [o.to_dict() for o in self._outcomes[-1000:]],
            'insights': [
                {
                    'id': i.id,
                    'category': i.category,
                    'insight': i.insight,
                    'confidence': i.confidence,
                    'supporting_outcomes': i.supporting_outcomes
                }
                for i in self._insights
            ],
            'prompt_variants': {
                st.value: [v.to_dict() for v in variants]
                for st, variants in self._prompt_variants.items()
            },
            'knowledge_base': self._knowledge_base,
            'saved_at': datetime.now().isoformat()
        }

        with open(filepath, 'w') as f:
            json.dump(state, f, indent=2)
        logger.info(f'[LearningEngine] State saved to {filepath}')

    def load_state(self, filepath: str):
        """Load learning state from file"""
        if not os.path.exists(filepath):
            return

        try:
            with open(filepath, 'r') as f:
                state = json.load(f)

            # Restore knowledge base
            self._knowledge_base = state.get('knowledge_base', self._knowledge_base)

            # Restore insights
            for i_data in state.get('insights', []):
                insight = LearnedInsight(
                    id=i_data['id'],
                    category=i_data['category'],
                    insight=i_data['insight'],
                    confidence=i_data['confidence'],
                    supporting_outcomes=i_data['supporting_outcomes'],
                    first_observed=datetime.now(),
                    last_confirmed=datetime.now()
                )
                self._insights.append(insight)

            logger.info(f'[LearningEngine] State loaded from {filepath}')
        except Exception as e:
            logger.error(f'[LearningEngine] Failed to load state: {e}')


# Singleton accessor
def get_learning_engine() -> LearningEngine:
    """Get the singleton LearningEngine instance"""
    return LearningEngine()


# Convenience functions
def record_outcome(
    outcome_type: OutcomeType,
    task_id: str,
    agent_type: str,
    success: bool,
    score: float,
    context: Dict[str, Any] = None,
    result: Dict[str, Any] = None,
    strategy_used: str = None,
    prompt_version: str = None
) -> Outcome:
    """Convenience function to record an outcome"""
    import uuid
    outcome = Outcome(
        id=str(uuid.uuid4()),
        type=outcome_type,
        task_id=task_id,
        agent_type=agent_type,
        strategy_used=strategy_used,
        prompt_version=prompt_version,
        context=context or {},
        result=result or {},
        success=success,
        score=score
    )
    get_learning_engine().record_outcome(outcome)
    return outcome


def select_strategy(strategy_type: StrategyType, context: Dict[str, Any] = None) -> Strategy:
    """Convenience function to select a strategy"""
    return get_learning_engine().select_strategy(strategy_type, context)


def get_insights(category: str, context: Dict[str, Any] = None) -> List[LearnedInsight]:
    """Convenience function to get insights"""
    return get_learning_engine().get_insights_for_context(category, context or {})
