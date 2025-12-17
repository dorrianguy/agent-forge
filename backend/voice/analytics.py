"""
Voice Analytics Module for Agent Forge Voice

Handles call metrics, post-call analysis, and dashboard data generation.
Provides comprehensive analytics for voice agents including sentiment analysis,
call quality metrics, outcome tracking, and dashboard visualizations.
"""

import asyncio
import csv
import io
import json
import logging
from dataclasses import dataclass, asdict, field
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from collections import defaultdict
from enum import Enum

import anthropic

logger = logging.getLogger(__name__)


# ============================================================================
# Data Models
# ============================================================================

class CallOutcome(str, Enum):
    """Standard call outcomes"""
    COMPLETED = "completed"
    TRANSFERRED = "transferred"
    VOICEMAIL = "voicemail"
    DROPPED = "dropped"
    ERROR = "error"
    UNKNOWN = "unknown"


@dataclass
class CallMetrics:
    """
    Comprehensive metrics for a single call.

    Attributes:
        call_id: Unique identifier for the call
        agent_id: ID of the voice agent handling the call
        user_id: ID of the user/account owning the agent
        duration_seconds: Total call duration
        transcript_length: Number of characters in transcript
        user_turns: Number of times user spoke
        agent_turns: Number of times agent responded
        latency_avg_ms: Average response latency in milliseconds
        latency_p95_ms: 95th percentile latency
        interruptions: Number of times agent was interrupted
        sentiment_score: Overall sentiment (-1 to 1)
        outcome: Call outcome classification
        custom_metrics: User-defined metrics extracted from call
        timestamp: When the call occurred
        metadata: Additional call metadata
    """
    call_id: str
    agent_id: str
    user_id: str
    duration_seconds: float
    transcript_length: int
    user_turns: int
    agent_turns: int
    latency_avg_ms: float
    latency_p95_ms: float
    interruptions: int
    sentiment_score: float
    outcome: str
    custom_metrics: Dict[str, Any] = field(default_factory=dict)
    timestamp: datetime = field(default_factory=datetime.utcnow)
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary with ISO format timestamp"""
        data = asdict(self)
        data['timestamp'] = self.timestamp.isoformat()
        return data

    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'CallMetrics':
        """Create from dictionary"""
        if isinstance(data.get('timestamp'), str):
            data['timestamp'] = datetime.fromisoformat(data['timestamp'])
        return cls(**data)


@dataclass
class AgentStats:
    """Aggregated statistics for an agent over a time period"""
    agent_id: str
    total_calls: int
    total_duration_seconds: float
    avg_duration_seconds: float
    avg_sentiment: float
    avg_latency_ms: float
    outcomes: Dict[str, int]
    calls_by_day: Dict[str, int]
    sentiment_distribution: Dict[str, int]  # negative, neutral, positive
    custom_metrics_avg: Dict[str, float]


@dataclass
class ChartData:
    """Generic chart data structure"""
    chart_type: str  # line, bar, donut, histogram
    title: str
    labels: List[str]
    datasets: List[Dict[str, Any]]
    options: Dict[str, Any] = field(default_factory=dict)


# ============================================================================
# Post-Call Analyzer
# ============================================================================

class PostCallAnalyzer:
    """
    Analyzes completed calls using Claude to extract insights.

    Uses Claude's language understanding to:
    - Summarize conversations
    - Extract custom metrics from transcripts
    - Score sentiment
    - Detect outcomes
    - Identify action items
    - Classify intent
    """

    def __init__(self, anthropic_api_key: str):
        """
        Initialize analyzer with Anthropic API key.

        Args:
            anthropic_api_key: API key for Claude
        """
        self.client = anthropic.Anthropic(api_key=anthropic_api_key)
        self.model = "claude-sonnet-4-5-20250929"

    async def summarize_call(self, transcript: List[Dict[str, Any]]) -> str:
        """
        Generate a concise summary of the call.

        Args:
            transcript: List of turn dictionaries with 'speaker' and 'text' keys

        Returns:
            Summary string (2-3 sentences)
        """
        try:
            transcript_text = self._format_transcript(transcript)

            prompt = f"""Summarize this phone call in 2-3 concise sentences. Focus on:
- The main purpose/topic of the call
- Key points discussed
- The outcome or next steps

Transcript:
{transcript_text}

Provide only the summary, no preamble."""

            message = await asyncio.to_thread(
                self.client.messages.create,
                model=self.model,
                max_tokens=300,
                messages=[{"role": "user", "content": prompt}]
            )

            return message.content[0].text.strip()

        except Exception as e:
            logger.error(f"Error summarizing call: {e}")
            return "Unable to generate summary"

    async def extract_custom_metrics(
        self,
        transcript: List[Dict[str, Any]],
        metrics_config: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """
        Extract user-defined custom metrics from transcript.

        Args:
            transcript: Call transcript
            metrics_config: List of metric definitions, each with:
                - name: Metric name
                - description: What to extract
                - type: 'boolean', 'string', 'number', 'list'

        Returns:
            Dictionary mapping metric names to extracted values
        """
        if not metrics_config:
            return {}

        try:
            transcript_text = self._format_transcript(transcript)

            # Build extraction prompt
            metrics_desc = "\n".join([
                f"- {m['name']} ({m['type']}): {m['description']}"
                for m in metrics_config
            ])

            prompt = f"""Extract the following metrics from this call transcript:

{metrics_desc}

Transcript:
{transcript_text}

Return ONLY a valid JSON object mapping metric names to their values. Use null if a metric cannot be determined.
Example: {{"metric_name": "value", "another_metric": 42}}"""

            message = await asyncio.to_thread(
                self.client.messages.create,
                model=self.model,
                max_tokens=500,
                messages=[{"role": "user", "content": prompt}]
            )

            response_text = message.content[0].text.strip()

            # Extract JSON from response
            if response_text.startswith("```"):
                # Remove markdown code blocks
                response_text = response_text.split("```")[1]
                if response_text.startswith("json"):
                    response_text = response_text[4:]
                response_text = response_text.strip()

            return json.loads(response_text)

        except Exception as e:
            logger.error(f"Error extracting custom metrics: {e}")
            return {}

    async def score_sentiment(self, transcript: List[Dict[str, Any]]) -> float:
        """
        Score overall call sentiment.

        Args:
            transcript: Call transcript

        Returns:
            Sentiment score from -1 (negative) to 1 (positive)
        """
        try:
            transcript_text = self._format_transcript(transcript)

            prompt = f"""Analyze the overall sentiment of this phone call.
Consider the tone, language, and emotional context of both speakers.

Transcript:
{transcript_text}

Rate the overall sentiment on a scale from -1 to 1:
- -1: Very negative (angry, frustrated, upset)
- -0.5: Somewhat negative (disappointed, concerned)
- 0: Neutral (matter-of-fact, professional)
- 0.5: Somewhat positive (satisfied, pleased)
- 1: Very positive (delighted, enthusiastic)

Respond with ONLY a number between -1 and 1."""

            message = await asyncio.to_thread(
                self.client.messages.create,
                model=self.model,
                max_tokens=50,
                messages=[{"role": "user", "content": prompt}]
            )

            score_text = message.content[0].text.strip()
            score = float(score_text)

            # Clamp to valid range
            return max(-1.0, min(1.0, score))

        except Exception as e:
            logger.error(f"Error scoring sentiment: {e}")
            return 0.0

    async def detect_outcomes(
        self,
        transcript: List[Dict[str, Any]],
        outcome_definitions: Optional[List[str]] = None
    ) -> str:
        """
        Detect call outcome from transcript.

        Args:
            transcript: Call transcript
            outcome_definitions: Custom outcome types to detect

        Returns:
            Outcome string (one of standard or custom outcomes)
        """
        try:
            transcript_text = self._format_transcript(transcript)

            # Use custom outcomes if provided, otherwise use standard ones
            if outcome_definitions:
                outcomes_list = "\n".join([f"- {o}" for o in outcome_definitions])
            else:
                outcomes_list = "\n".join([
                    f"- {o.value}: {self._outcome_description(o)}"
                    for o in CallOutcome
                ])

            prompt = f"""Classify the outcome of this phone call. Choose the most appropriate outcome:

{outcomes_list}

Transcript:
{transcript_text}

Respond with ONLY the outcome name (e.g., "completed", "transferred", etc.)."""

            message = await asyncio.to_thread(
                self.client.messages.create,
                model=self.model,
                max_tokens=50,
                messages=[{"role": "user", "content": prompt}]
            )

            outcome = message.content[0].text.strip().lower()
            return outcome

        except Exception as e:
            logger.error(f"Error detecting outcome: {e}")
            return CallOutcome.UNKNOWN.value

    async def extract_action_items(self, transcript: List[Dict[str, Any]]) -> List[str]:
        """
        Extract action items and follow-ups from call.

        Args:
            transcript: Call transcript

        Returns:
            List of action items
        """
        try:
            transcript_text = self._format_transcript(transcript)

            prompt = f"""Extract all action items and follow-ups from this call.
Include tasks, commitments, or next steps mentioned by either party.

Transcript:
{transcript_text}

List each action item on a new line, starting with a dash (-). If there are no action items, respond with "None"."""

            message = await asyncio.to_thread(
                self.client.messages.create,
                model=self.model,
                max_tokens=500,
                messages=[{"role": "user", "content": prompt}]
            )

            response = message.content[0].text.strip()

            if response.lower() == "none":
                return []

            # Parse list items
            items = []
            for line in response.split("\n"):
                line = line.strip()
                if line.startswith("-"):
                    items.append(line[1:].strip())
                elif line and not line.startswith("#"):
                    items.append(line)

            return items

        except Exception as e:
            logger.error(f"Error extracting action items: {e}")
            return []

    async def detect_intent(self, transcript: List[Dict[str, Any]]) -> str:
        """
        Classify the primary intent of the call.

        Args:
            transcript: Call transcript

        Returns:
            Intent classification string
        """
        try:
            transcript_text = self._format_transcript(transcript)

            prompt = f"""Classify the primary intent of this phone call in 2-4 words.

Examples:
- "customer support inquiry"
- "sales qualification"
- "appointment scheduling"
- "billing question"
- "product information request"

Transcript:
{transcript_text}

Respond with ONLY the intent classification (2-4 words)."""

            message = await asyncio.to_thread(
                self.client.messages.create,
                model=self.model,
                max_tokens=50,
                messages=[{"role": "user", "content": prompt}]
            )

            return message.content[0].text.strip().lower()

        except Exception as e:
            logger.error(f"Error detecting intent: {e}")
            return "unknown intent"

    def _format_transcript(self, transcript: List[Dict[str, Any]]) -> str:
        """Format transcript for Claude analysis"""
        lines = []
        for turn in transcript:
            speaker = turn.get('speaker', 'Unknown')
            text = turn.get('text', '')
            lines.append(f"{speaker}: {text}")
        return "\n".join(lines)

    def _outcome_description(self, outcome: CallOutcome) -> str:
        """Get description for standard outcome"""
        descriptions = {
            CallOutcome.COMPLETED: "Call completed successfully with resolution",
            CallOutcome.TRANSFERRED: "Call transferred to another agent/department",
            CallOutcome.VOICEMAIL: "Reached voicemail or left message",
            CallOutcome.DROPPED: "Call disconnected prematurely",
            CallOutcome.ERROR: "Technical error occurred",
            CallOutcome.UNKNOWN: "Cannot determine outcome"
        }
        return descriptions.get(outcome, "")


# ============================================================================
# Voice Analytics Manager
# ============================================================================

class VoiceAnalyticsManager:
    """
    Central analytics manager for voice agents.

    Handles:
    - Recording call metrics
    - Running post-call analysis
    - Aggregating statistics
    - Generating dashboard data
    - Exporting analytics
    """

    def __init__(self, anthropic_api_key: str, storage_path: Optional[str] = None):
        """
        Initialize analytics manager.

        Args:
            anthropic_api_key: API key for Claude
            storage_path: Path to store analytics data (optional)
        """
        self.analyzer = PostCallAnalyzer(anthropic_api_key)
        self.storage_path = storage_path

        # In-memory storage (would be replaced with database in production)
        self.metrics_store: Dict[str, CallMetrics] = {}
        self.analysis_cache: Dict[str, Dict[str, Any]] = {}

    async def record_call_metrics(self, metrics: CallMetrics) -> None:
        """
        Record metrics for a completed call.

        Args:
            metrics: CallMetrics object
        """
        self.metrics_store[metrics.call_id] = metrics
        logger.info(f"Recorded metrics for call {metrics.call_id}")

        # In production, persist to database
        if self.storage_path:
            await self._persist_metrics(metrics)

    async def analyze_call(
        self,
        call_id: str,
        transcript: List[Dict[str, Any]],
        metrics_config: Optional[List[Dict[str, Any]]] = None,
        outcome_definitions: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """
        Run comprehensive post-call analysis.

        Args:
            call_id: ID of the call to analyze
            transcript: Call transcript
            metrics_config: Custom metrics to extract
            outcome_definitions: Custom outcome types

        Returns:
            Analysis results including summary, sentiment, action items, etc.
        """
        # Check cache
        if call_id in self.analysis_cache:
            return self.analysis_cache[call_id]

        try:
            # Run all analyses in parallel
            results = await asyncio.gather(
                self.analyzer.summarize_call(transcript),
                self.analyzer.score_sentiment(transcript),
                self.analyzer.detect_outcomes(transcript, outcome_definitions),
                self.analyzer.extract_action_items(transcript),
                self.analyzer.detect_intent(transcript),
                self.analyzer.extract_custom_metrics(transcript, metrics_config or []),
                return_exceptions=True
            )

            summary, sentiment, outcome, action_items, intent, custom_metrics = results

            # Handle any exceptions
            if isinstance(summary, Exception):
                summary = "Error generating summary"
            if isinstance(sentiment, Exception):
                sentiment = 0.0
            if isinstance(outcome, Exception):
                outcome = CallOutcome.UNKNOWN.value
            if isinstance(action_items, Exception):
                action_items = []
            if isinstance(intent, Exception):
                intent = "unknown"
            if isinstance(custom_metrics, Exception):
                custom_metrics = {}

            analysis = {
                "call_id": call_id,
                "summary": summary,
                "sentiment_score": sentiment,
                "outcome": outcome,
                "action_items": action_items,
                "intent": intent,
                "custom_metrics": custom_metrics,
                "analyzed_at": datetime.utcnow().isoformat()
            }

            # Cache results
            self.analysis_cache[call_id] = analysis

            # Update stored metrics if available
            if call_id in self.metrics_store:
                self.metrics_store[call_id].sentiment_score = sentiment
                self.metrics_store[call_id].outcome = outcome
                self.metrics_store[call_id].custom_metrics = custom_metrics

            return analysis

        except Exception as e:
            logger.error(f"Error analyzing call {call_id}: {e}")
            raise

    async def get_agent_stats(
        self,
        agent_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> AgentStats:
        """
        Get aggregated statistics for an agent.

        Args:
            agent_id: Agent ID
            start_date: Start of time range (optional)
            end_date: End of time range (optional)

        Returns:
            AgentStats object with aggregated metrics
        """
        # Filter metrics for this agent and time range
        metrics = self._filter_metrics(
            agent_id=agent_id,
            start_date=start_date,
            end_date=end_date
        )

        if not metrics:
            return AgentStats(
                agent_id=agent_id,
                total_calls=0,
                total_duration_seconds=0.0,
                avg_duration_seconds=0.0,
                avg_sentiment=0.0,
                avg_latency_ms=0.0,
                outcomes={},
                calls_by_day={},
                sentiment_distribution={"negative": 0, "neutral": 0, "positive": 0},
                custom_metrics_avg={}
            )

        # Calculate aggregates
        total_calls = len(metrics)
        total_duration = sum(m.duration_seconds for m in metrics)
        avg_duration = total_duration / total_calls
        avg_sentiment = sum(m.sentiment_score for m in metrics) / total_calls
        avg_latency = sum(m.latency_avg_ms for m in metrics) / total_calls

        # Outcome distribution
        outcomes = defaultdict(int)
        for m in metrics:
            outcomes[m.outcome] += 1

        # Calls by day
        calls_by_day = defaultdict(int)
        for m in metrics:
            day = m.timestamp.date().isoformat()
            calls_by_day[day] += 1

        # Sentiment distribution
        sentiment_dist = {"negative": 0, "neutral": 0, "positive": 0}
        for m in metrics:
            if m.sentiment_score < -0.2:
                sentiment_dist["negative"] += 1
            elif m.sentiment_score > 0.2:
                sentiment_dist["positive"] += 1
            else:
                sentiment_dist["neutral"] += 1

        # Custom metrics averages
        custom_metrics_avg = {}
        custom_metrics_by_name = defaultdict(list)
        for m in metrics:
            for name, value in m.custom_metrics.items():
                if isinstance(value, (int, float)):
                    custom_metrics_by_name[name].append(value)

        for name, values in custom_metrics_by_name.items():
            custom_metrics_avg[name] = sum(values) / len(values)

        return AgentStats(
            agent_id=agent_id,
            total_calls=total_calls,
            total_duration_seconds=total_duration,
            avg_duration_seconds=avg_duration,
            avg_sentiment=avg_sentiment,
            avg_latency_ms=avg_latency,
            outcomes=dict(outcomes),
            calls_by_day=dict(calls_by_day),
            sentiment_distribution=sentiment_dist,
            custom_metrics_avg=custom_metrics_avg
        )

    async def get_user_stats(
        self,
        user_id: str,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Get aggregated statistics for all agents belonging to a user.

        Args:
            user_id: User ID
            start_date: Start of time range
            end_date: End of time range

        Returns:
            Aggregated statistics across all user's agents
        """
        # Filter metrics for this user
        metrics = self._filter_metrics(
            user_id=user_id,
            start_date=start_date,
            end_date=end_date
        )

        if not metrics:
            return {
                "user_id": user_id,
                "total_calls": 0,
                "total_agents": 0,
                "stats": {}
            }

        # Get unique agents
        agent_ids = set(m.agent_id for m in metrics)

        # Aggregate per-agent stats
        agent_stats = {}
        for agent_id in agent_ids:
            stats = await self.get_agent_stats(agent_id, start_date, end_date)
            agent_stats[agent_id] = asdict(stats)

        return {
            "user_id": user_id,
            "total_calls": len(metrics),
            "total_agents": len(agent_ids),
            "agent_stats": agent_stats
        }

    async def generate_dashboard_data(
        self,
        user_id: str,
        period: str = '7d'
    ) -> Dict[str, Any]:
        """
        Generate dashboard visualization data.

        Args:
            user_id: User ID
            period: Time period ('7d', '30d', '90d', 'all')

        Returns:
            Dashboard data with charts and summary metrics
        """
        # Calculate date range
        end_date = datetime.utcnow()
        if period == '7d':
            start_date = end_date - timedelta(days=7)
        elif period == '30d':
            start_date = end_date - timedelta(days=30)
        elif period == '90d':
            start_date = end_date - timedelta(days=90)
        else:
            start_date = None

        # Get metrics
        metrics = self._filter_metrics(user_id=user_id, start_date=start_date)

        if not metrics:
            return {
                "period": period,
                "summary": {
                    "total_calls": 0,
                    "avg_duration": 0,
                    "avg_sentiment": 0
                },
                "charts": []
            }

        # Summary metrics
        total_calls = len(metrics)
        avg_duration = sum(m.duration_seconds for m in metrics) / total_calls
        avg_sentiment = sum(m.sentiment_score for m in metrics) / total_calls

        # Generate charts
        charts = [
            self._generate_call_volume_chart(metrics),
            self._generate_outcomes_chart(metrics),
            self._generate_duration_chart(metrics),
            self._generate_sentiment_chart(metrics),
            self._generate_latency_chart(metrics)
        ]

        return {
            "period": period,
            "summary": {
                "total_calls": total_calls,
                "avg_duration": round(avg_duration, 1),
                "avg_sentiment": round(avg_sentiment, 2)
            },
            "charts": [asdict(c) for c in charts]
        }

    async def get_call_quality_metrics(self, call_id: str) -> Dict[str, Any]:
        """
        Get detailed quality metrics for a specific call.

        Args:
            call_id: Call ID

        Returns:
            Quality metrics including latency and audio quality
        """
        if call_id not in self.metrics_store:
            raise ValueError(f"Call {call_id} not found")

        metrics = self.metrics_store[call_id]

        return {
            "call_id": call_id,
            "latency": {
                "avg_ms": metrics.latency_avg_ms,
                "p95_ms": metrics.latency_p95_ms,
                "quality": self._classify_latency(metrics.latency_avg_ms)
            },
            "interruptions": metrics.interruptions,
            "turn_taking": {
                "user_turns": metrics.user_turns,
                "agent_turns": metrics.agent_turns,
                "balance": self._calculate_turn_balance(
                    metrics.user_turns,
                    metrics.agent_turns
                )
            },
            "duration_seconds": metrics.duration_seconds
        }

    async def export_analytics(
        self,
        user_id: str,
        format: str = 'csv',
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> bytes:
        """
        Export analytics data to file.

        Args:
            user_id: User ID
            format: Export format ('csv' or 'json')
            start_date: Start of time range
            end_date: End of time range

        Returns:
            Exported data as bytes
        """
        metrics = self._filter_metrics(
            user_id=user_id,
            start_date=start_date,
            end_date=end_date
        )

        if format == 'csv':
            return await self._export_csv(metrics)
        elif format == 'json':
            return await self._export_json(metrics)
        else:
            raise ValueError(f"Unsupported format: {format}")

    # ========================================================================
    # Private Helper Methods
    # ========================================================================

    def _filter_metrics(
        self,
        agent_id: Optional[str] = None,
        user_id: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> List[CallMetrics]:
        """Filter metrics by criteria"""
        filtered = []

        for metrics in self.metrics_store.values():
            # Agent filter
            if agent_id and metrics.agent_id != agent_id:
                continue

            # User filter
            if user_id and metrics.user_id != user_id:
                continue

            # Date range filter
            if start_date and metrics.timestamp < start_date:
                continue
            if end_date and metrics.timestamp > end_date:
                continue

            filtered.append(metrics)

        return filtered

    def _generate_call_volume_chart(self, metrics: List[CallMetrics]) -> ChartData:
        """Generate call volume over time chart"""
        # Group by day
        calls_by_day = defaultdict(int)
        for m in metrics:
            day = m.timestamp.date().isoformat()
            calls_by_day[day] += 1

        # Sort by date
        sorted_days = sorted(calls_by_day.keys())

        return ChartData(
            chart_type="line",
            title="Call Volume Over Time",
            labels=sorted_days,
            datasets=[{
                "label": "Calls",
                "data": [calls_by_day[day] for day in sorted_days],
                "borderColor": "rgb(75, 192, 192)",
                "tension": 0.1
            }]
        )

    def _generate_outcomes_chart(self, metrics: List[CallMetrics]) -> ChartData:
        """Generate call outcomes donut chart"""
        outcomes = defaultdict(int)
        for m in metrics:
            outcomes[m.outcome] += 1

        return ChartData(
            chart_type="donut",
            title="Call Outcomes",
            labels=list(outcomes.keys()),
            datasets=[{
                "data": list(outcomes.values()),
                "backgroundColor": [
                    "rgb(54, 162, 235)",
                    "rgb(255, 99, 132)",
                    "rgb(255, 205, 86)",
                    "rgb(75, 192, 192)",
                    "rgb(153, 102, 255)"
                ]
            }]
        )

    def _generate_duration_chart(self, metrics: List[CallMetrics]) -> ChartData:
        """Generate average duration by outcome chart"""
        duration_by_outcome = defaultdict(list)
        for m in metrics:
            duration_by_outcome[m.outcome].append(m.duration_seconds)

        outcomes = list(duration_by_outcome.keys())
        avg_durations = [
            sum(duration_by_outcome[o]) / len(duration_by_outcome[o])
            for o in outcomes
        ]

        return ChartData(
            chart_type="bar",
            title="Average Duration by Outcome",
            labels=outcomes,
            datasets=[{
                "label": "Duration (seconds)",
                "data": avg_durations,
                "backgroundColor": "rgb(54, 162, 235)"
            }]
        )

    def _generate_sentiment_chart(self, metrics: List[CallMetrics]) -> ChartData:
        """Generate sentiment distribution chart"""
        sentiment_buckets = {
            "Very Negative": 0,
            "Negative": 0,
            "Neutral": 0,
            "Positive": 0,
            "Very Positive": 0
        }

        for m in metrics:
            score = m.sentiment_score
            if score < -0.6:
                sentiment_buckets["Very Negative"] += 1
            elif score < -0.2:
                sentiment_buckets["Negative"] += 1
            elif score < 0.2:
                sentiment_buckets["Neutral"] += 1
            elif score < 0.6:
                sentiment_buckets["Positive"] += 1
            else:
                sentiment_buckets["Very Positive"] += 1

        return ChartData(
            chart_type="bar",
            title="Sentiment Distribution",
            labels=list(sentiment_buckets.keys()),
            datasets=[{
                "label": "Calls",
                "data": list(sentiment_buckets.values()),
                "backgroundColor": [
                    "rgb(255, 99, 132)",
                    "rgb(255, 159, 64)",
                    "rgb(255, 205, 86)",
                    "rgb(75, 192, 192)",
                    "rgb(54, 162, 235)"
                ]
            }]
        )

    def _generate_latency_chart(self, metrics: List[CallMetrics]) -> ChartData:
        """Generate latency metrics over time chart"""
        # Group by day
        latency_by_day = defaultdict(list)
        for m in metrics:
            day = m.timestamp.date().isoformat()
            latency_by_day[day].append(m.latency_avg_ms)

        # Calculate averages
        sorted_days = sorted(latency_by_day.keys())
        avg_latencies = [
            sum(latency_by_day[day]) / len(latency_by_day[day])
            for day in sorted_days
        ]

        return ChartData(
            chart_type="line",
            title="Average Latency Over Time",
            labels=sorted_days,
            datasets=[{
                "label": "Latency (ms)",
                "data": avg_latencies,
                "borderColor": "rgb(255, 99, 132)",
                "tension": 0.1
            }]
        )

    def _classify_latency(self, latency_ms: float) -> str:
        """Classify latency as excellent/good/fair/poor"""
        if latency_ms < 200:
            return "excellent"
        elif latency_ms < 400:
            return "good"
        elif latency_ms < 600:
            return "fair"
        else:
            return "poor"

    def _calculate_turn_balance(self, user_turns: int, agent_turns: int) -> str:
        """Calculate turn-taking balance"""
        total = user_turns + agent_turns
        if total == 0:
            return "N/A"

        agent_ratio = agent_turns / total

        if agent_ratio < 0.3:
            return "agent dominated"
        elif agent_ratio > 0.7:
            return "user dominated"
        else:
            return "balanced"

    async def _export_csv(self, metrics: List[CallMetrics]) -> bytes:
        """Export metrics to CSV"""
        output = io.StringIO()

        if not metrics:
            return b""

        # Define columns
        fieldnames = [
            'call_id', 'agent_id', 'user_id', 'timestamp',
            'duration_seconds', 'user_turns', 'agent_turns',
            'latency_avg_ms', 'latency_p95_ms', 'interruptions',
            'sentiment_score', 'outcome'
        ]

        writer = csv.DictWriter(output, fieldnames=fieldnames)
        writer.writeheader()

        for m in metrics:
            row = {
                'call_id': m.call_id,
                'agent_id': m.agent_id,
                'user_id': m.user_id,
                'timestamp': m.timestamp.isoformat(),
                'duration_seconds': m.duration_seconds,
                'user_turns': m.user_turns,
                'agent_turns': m.agent_turns,
                'latency_avg_ms': m.latency_avg_ms,
                'latency_p95_ms': m.latency_p95_ms,
                'interruptions': m.interruptions,
                'sentiment_score': m.sentiment_score,
                'outcome': m.outcome
            }
            writer.writerow(row)

        return output.getvalue().encode('utf-8')

    async def _export_json(self, metrics: List[CallMetrics]) -> bytes:
        """Export metrics to JSON"""
        data = [m.to_dict() for m in metrics]
        return json.dumps(data, indent=2).encode('utf-8')

    async def _persist_metrics(self, metrics: CallMetrics) -> None:
        """Persist metrics to storage (placeholder for database implementation)"""
        # In production, save to database
        pass


# ============================================================================
# Singleton Instance
# ============================================================================

_analytics_manager: Optional[VoiceAnalyticsManager] = None


def get_voice_analytics_manager(
    anthropic_api_key: Optional[str] = None,
    storage_path: Optional[str] = None
) -> VoiceAnalyticsManager:
    """
    Get or create singleton VoiceAnalyticsManager instance.

    Args:
        anthropic_api_key: API key for Claude (required on first call)
        storage_path: Path for storing analytics data

    Returns:
        VoiceAnalyticsManager instance

    Raises:
        ValueError: If API key not provided on first call
    """
    global _analytics_manager

    if _analytics_manager is None:
        if not anthropic_api_key:
            raise ValueError("anthropic_api_key required for first initialization")

        _analytics_manager = VoiceAnalyticsManager(
            anthropic_api_key=anthropic_api_key,
            storage_path=storage_path
        )

    return _analytics_manager


# ============================================================================
# Example Usage
# ============================================================================

async def example_usage():
    """Example usage of Voice Analytics system"""

    # Initialize manager
    manager = get_voice_analytics_manager(
        anthropic_api_key="your-api-key-here"
    )

    # Create sample call metrics
    metrics = CallMetrics(
        call_id="call_123",
        agent_id="agent_456",
        user_id="user_789",
        duration_seconds=120.5,
        transcript_length=1500,
        user_turns=15,
        agent_turns=16,
        latency_avg_ms=250.0,
        latency_p95_ms=450.0,
        interruptions=2,
        sentiment_score=0.7,
        outcome=CallOutcome.COMPLETED.value,
        custom_metrics={"issue_resolved": True, "product_mentioned": "Premium Plan"}
    )

    # Record metrics
    await manager.record_call_metrics(metrics)

    # Analyze call
    transcript = [
        {"speaker": "User", "text": "Hi, I need help with my account."},
        {"speaker": "Agent", "text": "I'd be happy to help! What seems to be the issue?"},
        {"speaker": "User", "text": "I can't access the premium features."},
        {"speaker": "Agent", "text": "Let me check that for you right away."}
    ]

    analysis = await manager.analyze_call(
        call_id="call_123",
        transcript=transcript,
        metrics_config=[
            {
                "name": "issue_type",
                "description": "The type of issue the user is experiencing",
                "type": "string"
            }
        ]
    )

    print(f"Summary: {analysis['summary']}")
    print(f"Sentiment: {analysis['sentiment_score']}")
    print(f"Action Items: {analysis['action_items']}")

    # Get agent stats
    stats = await manager.get_agent_stats("agent_456")
    print(f"Total calls: {stats.total_calls}")
    print(f"Average sentiment: {stats.avg_sentiment}")

    # Generate dashboard data
    dashboard = await manager.generate_dashboard_data("user_789", period="7d")
    print(f"Dashboard charts: {len(dashboard['charts'])}")

    # Export analytics
    csv_data = await manager.export_analytics("user_789", format="csv")
    print(f"Exported {len(csv_data)} bytes")


if __name__ == "__main__":
    asyncio.run(example_usage())
