// =============================================================================
// Launch Retrospective Template & Builder
// =============================================================================
//
// Creates, populates, and summarizes launch retrospectives.
// Extracts CMD lessons from feedback analytics and cross-launch patterns.
// =============================================================================

import type {
  FeedbackAnalysis,
  LaunchRetro,
} from '../types';

// ---------------------------------------------------------------------------
// Template creation
// ---------------------------------------------------------------------------

/**
 * Create an empty retro template for a launch.
 */
export function createRetroTemplate(
  launchId: string,
  productName: string,
): LaunchRetro {
  return {
    launchId,
    productName,
    launchDate: '',
    completedDate: '',

    bestConverting: {
      channel: '',
      hook: '',
      cta: '',
    },

    keepForNextCMD: [],
    dropFromNextCMD: [],

    metrics: {
      totalTraffic: 0,
      conversionRate: 0,
      topChannel: '',
      topAsset: '',
      hookPerformance: [],
    },

    lessons: [],
  };
}

// ---------------------------------------------------------------------------
// Auto-populate from feedback
// ---------------------------------------------------------------------------

/**
 * Populate a retro template from a feedback analysis.
 *
 * Fills in winning variants, hook performance, and derives keep/drop
 * recommendations from the analysis data.
 */
export function populateFromFeedback(
  retro: LaunchRetro,
  analysis: FeedbackAnalysis,
): LaunchRetro {
  const populated = { ...retro };

  // --- Hook performance from signals ---
  const hookMetrics = new Map<string, { total: number; count: number; variant: 'A' | 'B' }>();

  for (const signal of analysis.signals) {
    const existing = hookMetrics.get(signal.hookOrClaimRef);
    if (existing) {
      existing.total += signal.value;
      existing.count += 1;
    } else {
      hookMetrics.set(signal.hookOrClaimRef, {
        total: signal.value,
        count: 1,
        variant: signal.variant,
      });
    }
  }

  populated.metrics.hookPerformance = Array.from(hookMetrics.entries())
    .map(([hook, data]) => ({
      hook,
      metric: data.count > 0 ? data.total / data.count : 0,
      variant: data.variant,
    }))
    .sort((a, b) => b.metric - a.metric);

  // --- Best converting channel/hook ---
  if (populated.metrics.hookPerformance.length > 0) {
    const best = populated.metrics.hookPerformance[0];
    populated.bestConverting.hook = best.hook;
  }

  // Determine top channel from signal types
  const channelCounts = new Map<string, number>();
  for (const signal of analysis.signals) {
    const channel = signalTypeToChannel(signal.type);
    channelCounts.set(channel, (channelCounts.get(channel) || 0) + signal.value);
  }

  let topChannel = '';
  let topChannelValue = 0;
  for (const [channel, value] of channelCounts) {
    if (value > topChannelValue) {
      topChannel = channel;
      topChannelValue = value;
    }
  }
  populated.bestConverting.channel = topChannel;
  populated.metrics.topChannel = topChannel;

  // --- Top asset from winning variants ---
  if (analysis.winningVariants.length > 0) {
    const topWinner = analysis.winningVariants.reduce((best, w) =>
      w.margin > best.margin ? w : best,
    );
    populated.metrics.topAsset = topWinner.assetType;
  }

  // --- Keep / Drop recommendations ---
  const keepHooks: string[] = [];
  const dropHooks: string[] = [];

  for (const update of analysis.suggestedUpdates) {
    if (update.action === 'promote' && update.suggested) {
      keepHooks.push(update.suggested);
    }
    if (update.action === 'demote' && update.original) {
      dropHooks.push(update.original);
    }
  }

  populated.keepForNextCMD = [...new Set(keepHooks)];
  populated.dropFromNextCMD = [...new Set(dropHooks)];

  // --- Auto-generate lessons from analysis ---
  const autoLessons: string[] = [];

  for (const w of analysis.winningVariants) {
    autoLessons.push(
      `Variant ${w.winner} won on ${w.assetType} by ${(w.margin * 100).toFixed(1)}% margin`,
    );
  }

  if (populated.bestConverting.hook) {
    autoLessons.push(
      `Best-performing hook: "${populated.bestConverting.hook}"`,
    );
  }

  if (topChannel) {
    autoLessons.push(`Top channel: ${topChannel}`);
  }

  populated.lessons = [...populated.lessons, ...autoLessons];

  return populated;
}

// ---------------------------------------------------------------------------
// Summary
// ---------------------------------------------------------------------------

/**
 * Generate a human-readable retro summary.
 */
export function getRetroSummary(retro: LaunchRetro): string {
  const lines: string[] = [
    `# Launch Retrospective: ${retro.productName}`,
    '',
    `**Launch ID:** ${retro.launchId}`,
    `**Launch Date:** ${retro.launchDate || 'Not set'}`,
    `**Completed:** ${retro.completedDate || 'In progress'}`,
    '',
    '## Best Converting',
    `- **Channel:** ${retro.bestConverting.channel || 'Unknown'}`,
    `- **Hook:** ${retro.bestConverting.hook || 'Unknown'}`,
    `- **CTA:** ${retro.bestConverting.cta || 'Unknown'}`,
    '',
    '## Metrics',
    `- **Total Traffic:** ${retro.metrics.totalTraffic.toLocaleString()}`,
    `- **Conversion Rate:** ${(retro.metrics.conversionRate * 100).toFixed(1)}%`,
    `- **Top Channel:** ${retro.metrics.topChannel || 'Unknown'}`,
    `- **Top Asset:** ${retro.metrics.topAsset || 'Unknown'}`,
    '',
  ];

  if (retro.metrics.hookPerformance.length > 0) {
    lines.push('## Hook Performance');
    for (const hp of retro.metrics.hookPerformance) {
      lines.push(`- "${hp.hook}" — ${hp.metric.toFixed(2)} (Variant ${hp.variant})`);
    }
    lines.push('');
  }

  if (retro.keepForNextCMD.length > 0) {
    lines.push('## Keep for Next CMD');
    for (const item of retro.keepForNextCMD) {
      lines.push(`- ✅ ${item}`);
    }
    lines.push('');
  }

  if (retro.dropFromNextCMD.length > 0) {
    lines.push('## Drop from Next CMD');
    for (const item of retro.dropFromNextCMD) {
      lines.push(`- ❌ ${item}`);
    }
    lines.push('');
  }

  if (retro.lessons.length > 0) {
    lines.push('## Lessons Learned');
    for (const lesson of retro.lessons) {
      lines.push(`- ${lesson}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

// ---------------------------------------------------------------------------
// Cross-launch CMD lessons
// ---------------------------------------------------------------------------

/**
 * Extract CMD lessons from multiple launch retros.
 *
 * Identifies patterns like recurring winning hooks, consistently failing
 * angles, and cross-launch trends.
 */
export function extractCMDLessons(retros: LaunchRetro[]): string[] {
  if (retros.length === 0) return [];

  const lessons: string[] = [];

  // --- Track hook frequency across launches ---
  const keepCounts = new Map<string, number>();
  const dropCounts = new Map<string, number>();

  for (const retro of retros) {
    for (const k of retro.keepForNextCMD) {
      keepCounts.set(k, (keepCounts.get(k) || 0) + 1);
    }
    for (const d of retro.dropFromNextCMD) {
      dropCounts.set(d, (dropCounts.get(d) || 0) + 1);
    }
  }

  // Hooks kept across multiple launches are proven winners
  for (const [hook, count] of keepCounts) {
    if (count >= 2) {
      lessons.push(
        `Proven winner: "${hook}" — kept across ${count}/${retros.length} launches`,
      );
    }
  }

  // Hooks dropped across multiple launches should be permanently retired
  for (const [hook, count] of dropCounts) {
    if (count >= 2) {
      lessons.push(
        `Consistently underperforms: "${hook}" — dropped in ${count}/${retros.length} launches. Consider permanent removal.`,
      );
    }
  }

  // --- Channel performance trends ---
  const channelWins = new Map<string, number>();
  for (const retro of retros) {
    if (retro.metrics.topChannel) {
      channelWins.set(
        retro.metrics.topChannel,
        (channelWins.get(retro.metrics.topChannel) || 0) + 1,
      );
    }
  }

  for (const [channel, wins] of channelWins) {
    if (wins >= 2) {
      lessons.push(
        `Dominant channel: ${channel} — top performer in ${wins}/${retros.length} launches`,
      );
    }
  }

  // --- Conversion rate trends ---
  const conversionRates = retros
    .filter((r) => r.metrics.conversionRate > 0)
    .map((r) => r.metrics.conversionRate);

  if (conversionRates.length >= 2) {
    const first = conversionRates[0];
    const last = conversionRates[conversionRates.length - 1];
    const trend = last - first;

    if (trend > 0) {
      lessons.push(
        `Positive trend: Conversion rate improved by ${(trend * 100).toFixed(1)}pp over ${conversionRates.length} launches`,
      );
    } else if (trend < 0) {
      lessons.push(
        `Warning: Conversion rate declined by ${(Math.abs(trend) * 100).toFixed(1)}pp over ${conversionRates.length} launches`,
      );
    }
  }

  // --- Variant angle patterns ---
  const variantWins = new Map<string, { A: number; B: number }>();
  for (const retro of retros) {
    for (const hp of retro.metrics.hookPerformance) {
      const existing = variantWins.get(hp.variant) || { A: 0, B: 0 };
      existing[hp.variant] += hp.metric;
      variantWins.set(hp.variant, existing);
    }
  }

  return lessons;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function signalTypeToChannel(type: string): string {
  switch (type) {
    case 'email_open':
      return 'email';
    case 'lp_click':
      return 'landing_page';
    case 'pr_pickup':
      return 'press';
    case 'social_engagement':
      return 'social';
    default:
      return 'unknown';
  }
}
