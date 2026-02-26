// =============================================================================
// Cross-Launch Retrospective Analyzer
// =============================================================================
//
// Takes an array of past launch retros and identifies patterns, generates
// recommendations for next launch CMDs, and tracks compound improvement
// metrics over time.
// =============================================================================

import type { LaunchRetro } from '../types';

// ---------------------------------------------------------------------------
// Pattern types
// ---------------------------------------------------------------------------

export interface HookPattern {
  hook: string;
  appearances: number;
  averageMetric: number;
  trend: 'improving' | 'declining' | 'stable';
  dominantVariant: 'A' | 'B' | 'mixed';
}

export interface ChannelPattern {
  channel: string;
  timesTopPerformer: number;
  averageConversion: number;
  trend: 'improving' | 'declining' | 'stable';
}

export interface AnglePattern {
  angle: string;
  wins: number;
  losses: number;
  winRate: number;
  insight: string;
}

export interface CompoundMetrics {
  launchCount: number;
  averageConversionRate: number;
  conversionRateTrend: number; // positive = improving
  averageTraffic: number;
  trafficTrend: number;
  bestLaunch: { launchId: string; conversionRate: number } | null;
  worstLaunch: { launchId: string; conversionRate: number } | null;
}

export interface CrossLaunchAnalysis {
  hookPatterns: HookPattern[];
  channelPatterns: ChannelPattern[];
  anglePatterns: AnglePattern[];
  compoundMetrics: CompoundMetrics;
  recommendations: string[];
}

// ---------------------------------------------------------------------------
// Hook pattern detection
// ---------------------------------------------------------------------------

function analyzeHookPatterns(retros: LaunchRetro[]): HookPattern[] {
  const hookData = new Map<string, {
    metrics: number[];
    variants: Array<'A' | 'B'>;
  }>();

  for (const retro of retros) {
    for (const hp of retro.metrics.hookPerformance) {
      const existing = hookData.get(hp.hook) || { metrics: [], variants: [] };
      existing.metrics.push(hp.metric);
      existing.variants.push(hp.variant);
      hookData.set(hp.hook, existing);
    }
  }

  const patterns: HookPattern[] = [];

  for (const [hook, data] of hookData) {
    const avgMetric =
      data.metrics.reduce((sum, m) => sum + m, 0) / data.metrics.length;

    // Determine trend from first half vs second half
    const trend = determineTrend(data.metrics);

    // Dominant variant
    const aCounts = data.variants.filter((v) => v === 'A').length;
    const bCounts = data.variants.filter((v) => v === 'B').length;
    let dominantVariant: 'A' | 'B' | 'mixed' = 'mixed';
    if (aCounts > bCounts * 1.5) dominantVariant = 'A';
    else if (bCounts > aCounts * 1.5) dominantVariant = 'B';

    patterns.push({
      hook,
      appearances: data.metrics.length,
      averageMetric: avgMetric,
      trend,
      dominantVariant,
    });
  }

  return patterns.sort((a, b) => b.averageMetric - a.averageMetric);
}

// ---------------------------------------------------------------------------
// Channel pattern detection
// ---------------------------------------------------------------------------

function analyzeChannelPatterns(retros: LaunchRetro[]): ChannelPattern[] {
  const channelData = new Map<string, {
    timesTop: number;
    conversions: number[];
  }>();

  for (const retro of retros) {
    const topChannel = retro.metrics.topChannel;
    if (!topChannel) continue;

    // Mark the top channel
    const topData = channelData.get(topChannel) || { timesTop: 0, conversions: [] };
    topData.timesTop += 1;
    topData.conversions.push(retro.metrics.conversionRate);
    channelData.set(topChannel, topData);

    // Also track best-converting channel data
    if (retro.bestConverting.channel && retro.bestConverting.channel !== topChannel) {
      const altData = channelData.get(retro.bestConverting.channel) || {
        timesTop: 0,
        conversions: [],
      };
      altData.conversions.push(retro.metrics.conversionRate);
      channelData.set(retro.bestConverting.channel, altData);
    }
  }

  const patterns: ChannelPattern[] = [];

  for (const [channel, data] of channelData) {
    const avgConversion =
      data.conversions.length > 0
        ? data.conversions.reduce((sum, c) => sum + c, 0) / data.conversions.length
        : 0;

    patterns.push({
      channel,
      timesTopPerformer: data.timesTop,
      averageConversion: avgConversion,
      trend: determineTrend(data.conversions),
    });
  }

  return patterns.sort((a, b) => b.timesTopPerformer - a.timesTopPerformer);
}

// ---------------------------------------------------------------------------
// Angle pattern detection
// ---------------------------------------------------------------------------

function analyzeAnglePatterns(retros: LaunchRetro[]): AnglePattern[] {
  // Infer angle from variant — A is typically first angle, B is second
  // We track win/loss per variant across retros
  const variantResults: { A: number; B: number } = { A: 0, B: 0 };

  for (const retro of retros) {
    for (const hp of retro.metrics.hookPerformance) {
      variantResults[hp.variant] += hp.metric;
    }
  }

  const totalA = variantResults.A;
  const totalB = variantResults.B;
  const total = totalA + totalB;

  if (total === 0) return [];

  const patterns: AnglePattern[] = [];

  // Variant A angles: pain (LP), curiosity (email), curiosity (social)
  patterns.push({
    angle: 'Variant A (pain/curiosity)',
    wins: totalA > totalB ? 1 : 0,
    losses: totalA <= totalB ? 1 : 0,
    winRate: total > 0 ? totalA / total : 0,
    insight: totalA > totalB
      ? 'Pain/curiosity-focused hooks tend to outperform — lead with the problem'
      : 'Pain/curiosity hooks underperformed — consider leading with outcomes instead',
  });

  // Variant B angles: aspiration (LP), outcome (email), pain (social)
  patterns.push({
    angle: 'Variant B (aspiration/outcome)',
    wins: totalB > totalA ? 1 : 0,
    losses: totalB <= totalA ? 1 : 0,
    winRate: total > 0 ? totalB / total : 0,
    insight: totalB > totalA
      ? 'Aspiration/outcome-focused hooks tend to outperform — lead with the transformation'
      : 'Aspiration/outcome hooks underperformed — consider leading with pain points instead',
  });

  // --- Per-launch variant analysis for deeper patterns ---
  const launchVariantWins = new Map<string, { A: number; B: number }>();

  for (const retro of retros) {
    const wins: { A: number; B: number } = { A: 0, B: 0 };
    for (const hp of retro.metrics.hookPerformance) {
      wins[hp.variant] += hp.metric;
    }
    launchVariantWins.set(retro.launchId, wins);
  }

  // Check consistency
  let aConsistentWins = 0;
  let bConsistentWins = 0;
  for (const [, wins] of launchVariantWins) {
    if (wins.A > wins.B) aConsistentWins++;
    else if (wins.B > wins.A) bConsistentWins++;
  }

  if (aConsistentWins >= retros.length * 0.75 && retros.length >= 2) {
    patterns.push({
      angle: 'Consistent pattern',
      wins: aConsistentWins,
      losses: bConsistentWins,
      winRate: aConsistentWins / retros.length,
      insight: `Pain/curiosity hooks consistently outperform aspiration hooks (${aConsistentWins}/${retros.length} launches)`,
    });
  } else if (bConsistentWins >= retros.length * 0.75 && retros.length >= 2) {
    patterns.push({
      angle: 'Consistent pattern',
      wins: bConsistentWins,
      losses: aConsistentWins,
      winRate: bConsistentWins / retros.length,
      insight: `Aspiration/outcome hooks consistently outperform pain hooks (${bConsistentWins}/${retros.length} launches)`,
    });
  }

  return patterns;
}

// ---------------------------------------------------------------------------
// Compound metrics
// ---------------------------------------------------------------------------

function computeCompoundMetrics(retros: LaunchRetro[]): CompoundMetrics {
  if (retros.length === 0) {
    return {
      launchCount: 0,
      averageConversionRate: 0,
      conversionRateTrend: 0,
      averageTraffic: 0,
      trafficTrend: 0,
      bestLaunch: null,
      worstLaunch: null,
    };
  }

  const conversions = retros.map((r) => r.metrics.conversionRate);
  const traffic = retros.map((r) => r.metrics.totalTraffic);

  const avgConversion =
    conversions.reduce((sum, c) => sum + c, 0) / conversions.length;
  const avgTraffic =
    traffic.reduce((sum, t) => sum + t, 0) / traffic.length;

  // Trend: linear slope approximation (last minus first, normalized)
  const conversionTrend =
    conversions.length >= 2
      ? conversions[conversions.length - 1] - conversions[0]
      : 0;

  const trafficTrend =
    traffic.length >= 2
      ? traffic[traffic.length - 1] - traffic[0]
      : 0;

  // Best / worst launches
  let bestLaunch: { launchId: string; conversionRate: number } | null = null;
  let worstLaunch: { launchId: string; conversionRate: number } | null = null;

  for (const retro of retros) {
    const cr = retro.metrics.conversionRate;
    if (!bestLaunch || cr > bestLaunch.conversionRate) {
      bestLaunch = { launchId: retro.launchId, conversionRate: cr };
    }
    if (!worstLaunch || cr < worstLaunch.conversionRate) {
      worstLaunch = { launchId: retro.launchId, conversionRate: cr };
    }
  }

  return {
    launchCount: retros.length,
    averageConversionRate: avgConversion,
    conversionRateTrend: conversionTrend,
    averageTraffic: avgTraffic,
    trafficTrend: trafficTrend,
    bestLaunch,
    worstLaunch,
  };
}

// ---------------------------------------------------------------------------
// Recommendation generation
// ---------------------------------------------------------------------------

function generateRecommendations(
  hookPatterns: HookPattern[],
  channelPatterns: ChannelPattern[],
  anglePatterns: AnglePattern[],
  compoundMetrics: CompoundMetrics,
): string[] {
  const recommendations: string[] = [];

  // --- Hook recommendations ---
  const topHooks = hookPatterns.filter(
    (h) => h.appearances >= 2 && h.trend !== 'declining',
  );
  for (const hook of topHooks.slice(0, 3)) {
    recommendations.push(
      `Reuse hook "${hook.hook}" — appeared ${hook.appearances} times, avg metric ${hook.averageMetric.toFixed(2)}, trend: ${hook.trend}`,
    );
  }

  const decliningHooks = hookPatterns.filter((h) => h.trend === 'declining');
  for (const hook of decliningHooks.slice(0, 2)) {
    recommendations.push(
      `Retire or refresh hook "${hook.hook}" — declining performance across launches`,
    );
  }

  // --- Channel recommendations ---
  if (channelPatterns.length > 0) {
    const topChannel = channelPatterns[0];
    recommendations.push(
      `Prioritize ${topChannel.channel} — top performer in ${topChannel.timesTopPerformer} launches`,
    );
  }

  const decliningChannels = channelPatterns.filter(
    (c) => c.trend === 'declining',
  );
  for (const ch of decliningChannels) {
    recommendations.push(
      `Review ${ch.channel} strategy — declining conversion trend`,
    );
  }

  // --- Angle recommendations ---
  for (const angle of anglePatterns) {
    if (angle.winRate > 0.6) {
      recommendations.push(angle.insight);
    }
  }

  // --- Compound metric recommendations ---
  if (compoundMetrics.conversionRateTrend > 0) {
    recommendations.push(
      `Conversion rate trending up (+${(compoundMetrics.conversionRateTrend * 100).toFixed(1)}pp) — current strategy is working`,
    );
  } else if (compoundMetrics.conversionRateTrend < -0.02) {
    recommendations.push(
      `Warning: Conversion rate trending down (${(compoundMetrics.conversionRateTrend * 100).toFixed(1)}pp) — consider strategic reset`,
    );
  }

  if (
    compoundMetrics.bestLaunch &&
    compoundMetrics.worstLaunch &&
    compoundMetrics.bestLaunch.launchId !== compoundMetrics.worstLaunch.launchId
  ) {
    recommendations.push(
      `Study launch "${compoundMetrics.bestLaunch.launchId}" (${(compoundMetrics.bestLaunch.conversionRate * 100).toFixed(1)}% CR) — best performer to date`,
    );
  }

  return recommendations;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Run a full cross-launch analysis over an array of past retros.
 *
 * Returns patterns, compound metrics, and actionable recommendations
 * for the next launch CMD.
 */
export function analyzeCrossLaunch(retros: LaunchRetro[]): CrossLaunchAnalysis {
  const hookPatterns = analyzeHookPatterns(retros);
  const channelPatterns = analyzeChannelPatterns(retros);
  const anglePatterns = analyzeAnglePatterns(retros);
  const compoundMetrics = computeCompoundMetrics(retros);

  const recommendations = generateRecommendations(
    hookPatterns,
    channelPatterns,
    anglePatterns,
    compoundMetrics,
  );

  return {
    hookPatterns,
    channelPatterns,
    anglePatterns,
    compoundMetrics,
    recommendations,
  };
}

/**
 * Format a cross-launch analysis as a human-readable report.
 */
export function formatCrossLaunchReport(analysis: CrossLaunchAnalysis): string {
  const lines: string[] = [
    `# Cross-Launch Analysis (${analysis.compoundMetrics.launchCount} launches)`,
    '',
  ];

  // --- Compound metrics ---
  lines.push('## Compound Metrics');
  lines.push(`- **Launches analyzed:** ${analysis.compoundMetrics.launchCount}`);
  lines.push(
    `- **Avg conversion rate:** ${(analysis.compoundMetrics.averageConversionRate * 100).toFixed(1)}%`,
  );
  lines.push(
    `- **CR trend:** ${analysis.compoundMetrics.conversionRateTrend > 0 ? '📈' : '📉'} ${(analysis.compoundMetrics.conversionRateTrend * 100).toFixed(1)}pp`,
  );
  lines.push(
    `- **Avg traffic:** ${analysis.compoundMetrics.averageTraffic.toLocaleString()}`,
  );

  if (analysis.compoundMetrics.bestLaunch) {
    lines.push(
      `- **Best launch:** ${analysis.compoundMetrics.bestLaunch.launchId} (${(analysis.compoundMetrics.bestLaunch.conversionRate * 100).toFixed(1)}% CR)`,
    );
  }
  lines.push('');

  // --- Hook patterns ---
  if (analysis.hookPatterns.length > 0) {
    lines.push('## Hook Patterns');
    for (const hp of analysis.hookPatterns.slice(0, 10)) {
      const trendIcon =
        hp.trend === 'improving' ? '📈' : hp.trend === 'declining' ? '📉' : '➡️';
      lines.push(
        `- ${trendIcon} "${hp.hook}" — avg ${hp.averageMetric.toFixed(2)}, appeared ${hp.appearances}x, variant ${hp.dominantVariant}`,
      );
    }
    lines.push('');
  }

  // --- Channel patterns ---
  if (analysis.channelPatterns.length > 0) {
    lines.push('## Channel Performance');
    for (const cp of analysis.channelPatterns) {
      lines.push(
        `- **${cp.channel}** — top in ${cp.timesTopPerformer} launches, avg CR ${(cp.averageConversion * 100).toFixed(1)}%, trend: ${cp.trend}`,
      );
    }
    lines.push('');
  }

  // --- Angle patterns ---
  if (analysis.anglePatterns.length > 0) {
    lines.push('## Angle Insights');
    for (const ap of analysis.anglePatterns) {
      lines.push(`- ${ap.insight}`);
    }
    lines.push('');
  }

  // --- Recommendations ---
  if (analysis.recommendations.length > 0) {
    lines.push('## Recommendations');
    for (let i = 0; i < analysis.recommendations.length; i++) {
      lines.push(`${i + 1}. ${analysis.recommendations[i]}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function determineTrend(
  values: number[],
): 'improving' | 'declining' | 'stable' {
  if (values.length < 2) return 'stable';

  const mid = Math.floor(values.length / 2);
  const firstHalf = values.slice(0, mid);
  const secondHalf = values.slice(mid);

  const avgFirst =
    firstHalf.reduce((sum, v) => sum + v, 0) / firstHalf.length;
  const avgSecond =
    secondHalf.reduce((sum, v) => sum + v, 0) / secondHalf.length;

  const threshold = 0.05; // 5% change threshold
  const change =
    avgFirst > 0 ? (avgSecond - avgFirst) / avgFirst : avgSecond - avgFirst;

  if (change > threshold) return 'improving';
  if (change < -threshold) return 'declining';
  return 'stable';
}
