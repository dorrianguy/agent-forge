// =============================================================================
// CMD Mutation Suggester
// =============================================================================
//
// Takes a FeedbackAnalysis and produces specific, actionable CMD update
// suggestions for human review. Does NOT auto-apply — returns a prioritized
// list of changes with confidence scores and source signals.
// =============================================================================

import type {
  CMDUpdate,
  FeedbackAnalysis,
  FeedbackSignal,
  FeedbackSignalType,
} from '../types';

// ---------------------------------------------------------------------------
// Confidence thresholds
// ---------------------------------------------------------------------------

/** Minimum confidence to include a suggestion. */
const MIN_CONFIDENCE = 0.1;

/** Minimum number of signals required before making a suggestion. */
const MIN_SIGNAL_COUNT = 3;

// ---------------------------------------------------------------------------
// Signal aggregation helpers
// ---------------------------------------------------------------------------

interface HookPerformance {
  hookOrClaimRef: string;
  signalType: FeedbackSignalType;
  totalValue: number;
  count: number;
  averageValue: number;
  winningVariant: 'A' | 'B' | null;
}

function aggregateByHook(signals: FeedbackSignal[]): Map<string, HookPerformance> {
  const map = new Map<string, HookPerformance>();

  for (const s of signals) {
    const key = `${s.hookOrClaimRef}::${s.type}`;
    const existing = map.get(key);

    if (existing) {
      existing.totalValue += s.value;
      existing.count += 1;
      existing.averageValue = existing.totalValue / existing.count;
    } else {
      map.set(key, {
        hookOrClaimRef: s.hookOrClaimRef,
        signalType: s.type,
        totalValue: s.value,
        count: 1,
        averageValue: s.value,
        winningVariant: null,
      });
    }
  }

  return map;
}

// ---------------------------------------------------------------------------
// Update generation strategies
// ---------------------------------------------------------------------------

function generateHookPromotions(
  analysis: FeedbackAnalysis,
): CMDUpdate[] {
  const updates: CMDUpdate[] = [];

  // Find hooks that consistently win across channels
  const hookWins = new Map<string, number>();

  for (const w of analysis.winningVariants) {
    const winnerSignals = analysis.signals.filter(
      (s) => s.assetId === w.assetType && s.variant === w.winner,
    );
    for (const s of winnerSignals) {
      const current = hookWins.get(s.hookOrClaimRef) || 0;
      hookWins.set(s.hookOrClaimRef, current + 1);
    }
  }

  // Promote hooks that won across multiple asset types
  for (const [hook, winCount] of hookWins) {
    if (winCount >= 2) {
      updates.push({
        field: 'hooks',
        action: 'promote',
        original: '',
        suggested: hook,
        reason: `Hook won across ${winCount} asset types — high-confidence winner`,
        confidence: Math.min(winCount / analysis.winningVariants.length, 1),
        source: 'email_open', // Primary source — hooks most visible in email
      });
    }
  }

  return updates;
}

function generatePositioningUpdates(
  analysis: FeedbackAnalysis,
): CMDUpdate[] {
  const updates: CMDUpdate[] = [];

  // PR pickup signals indicate which positioning resonates with media
  const prSignals = analysis.signals.filter((s) => s.type === 'pr_pickup');
  if (prSignals.length < MIN_SIGNAL_COUNT) return updates;

  const hookPerf = aggregateByHook(prSignals);
  const sorted = Array.from(hookPerf.values()).sort(
    (a, b) => b.averageValue - a.averageValue,
  );

  if (sorted.length >= 2) {
    const best = sorted[0];
    const worst = sorted[sorted.length - 1];

    const totalRange = best.averageValue - worst.averageValue;
    const maxAvg = Math.max(best.averageValue, 0.01);
    const confidence = Math.min(totalRange / maxAvg, 1);

    if (confidence >= MIN_CONFIDENCE) {
      updates.push({
        field: 'positioning',
        action: 'replace',
        original: worst.hookOrClaimRef,
        suggested: best.hookOrClaimRef,
        reason: `PR pickup data: "${best.hookOrClaimRef}" avg ${best.averageValue.toFixed(2)} vs "${worst.hookOrClaimRef}" avg ${worst.averageValue.toFixed(2)}`,
        confidence,
        source: 'pr_pickup',
      });
    }
  }

  return updates;
}

function generateClaimReordering(
  analysis: FeedbackAnalysis,
): CMDUpdate[] {
  const updates: CMDUpdate[] = [];

  // LP click data reveals which claims/sections users engage with most
  const lpSignals = analysis.signals.filter((s) => s.type === 'lp_click');
  if (lpSignals.length < MIN_SIGNAL_COUNT) return updates;

  const hookPerf = aggregateByHook(lpSignals);
  const sorted = Array.from(hookPerf.values()).sort(
    (a, b) => b.totalValue - a.totalValue,
  );

  // Promote top-clicked claims, demote least-clicked
  if (sorted.length >= 2) {
    const top = sorted[0];
    const bottom = sorted[sorted.length - 1];

    const totalClicks = sorted.reduce((sum, h) => sum + h.totalValue, 0);
    const topShare = top.totalValue / Math.max(totalClicks, 1);

    if (topShare >= MIN_CONFIDENCE) {
      updates.push({
        field: 'supportingClaims',
        action: 'promote',
        original: bottom.hookOrClaimRef,
        suggested: top.hookOrClaimRef,
        reason: `LP engagement: "${top.hookOrClaimRef}" received ${top.totalValue} clicks (${(topShare * 100).toFixed(0)}% of total)`,
        confidence: topShare,
        source: 'lp_click',
      });
    }
  }

  return updates;
}

function generateSocialInsights(
  analysis: FeedbackAnalysis,
): CMDUpdate[] {
  const updates: CMDUpdate[] = [];

  const socialSignals = analysis.signals.filter((s) => s.type === 'social_engagement');
  if (socialSignals.length < MIN_SIGNAL_COUNT) return updates;

  const hookPerf = aggregateByHook(socialSignals);
  const sorted = Array.from(hookPerf.values()).sort(
    (a, b) => b.totalValue - a.totalValue,
  );

  if (sorted.length >= 1) {
    const best = sorted[0];
    const totalEngagement = sorted.reduce((sum, h) => sum + h.totalValue, 0);
    const share = best.totalValue / Math.max(totalEngagement, 1);

    if (share >= MIN_CONFIDENCE) {
      updates.push({
        field: 'hooks',
        action: 'promote',
        original: '',
        suggested: best.hookOrClaimRef,
        reason: `Top social hook: "${best.hookOrClaimRef}" drove ${best.totalValue} engagement (${(share * 100).toFixed(0)}% of total) — consider promoting to LP headline`,
        confidence: share,
        source: 'social_engagement',
      });
    }
  }

  return updates;
}

// ---------------------------------------------------------------------------
// Deduplication & prioritization
// ---------------------------------------------------------------------------

function deduplicateUpdates(updates: CMDUpdate[]): CMDUpdate[] {
  const seen = new Set<string>();
  const unique: CMDUpdate[] = [];

  for (const u of updates) {
    const key = `${u.field}::${u.action}::${u.suggested}`;
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(u);
    }
  }

  return unique;
}

function prioritize(updates: CMDUpdate[]): CMDUpdate[] {
  return [...updates].sort((a, b) => b.confidence - a.confidence);
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Generate CMD update suggestions from a feedback analysis.
 *
 * Returns a prioritized, deduplicated list of `CMDUpdate` objects sorted by
 * confidence (highest first). Each update includes what to change, why,
 * the confidence level, and which signal type drove the recommendation.
 *
 * This function does NOT auto-apply changes — it returns suggestions for
 * human review.
 */
export function generateCMDUpdates(analysis: FeedbackAnalysis): CMDUpdate[] {
  const allUpdates: CMDUpdate[] = [
    ...generateHookPromotions(analysis),
    ...generatePositioningUpdates(analysis),
    ...generateClaimReordering(analysis),
    ...generateSocialInsights(analysis),
  ];

  // Filter below-threshold suggestions
  const filtered = allUpdates.filter((u) => u.confidence >= MIN_CONFIDENCE);

  return prioritize(deduplicateUpdates(filtered));
}

/**
 * Format CMD updates as a human-readable summary for review.
 */
export function formatCMDUpdateSummary(updates: CMDUpdate[]): string {
  if (updates.length === 0) {
    return 'No CMD updates suggested — insufficient data or no clear winners.';
  }

  const lines: string[] = [
    `## Suggested CMD Updates (${updates.length} total)`,
    '',
  ];

  for (let i = 0; i < updates.length; i++) {
    const u = updates[i];
    const confidence = (u.confidence * 100).toFixed(0);

    lines.push(`### ${i + 1}. ${u.action.toUpperCase()} — ${u.field}`);
    lines.push(`- **Confidence:** ${confidence}%`);
    lines.push(`- **Source:** ${u.source}`);

    if (u.original) {
      lines.push(`- **Current:** "${u.original}"`);
    }
    if (u.suggested) {
      lines.push(`- **Suggested:** "${u.suggested}"`);
    }

    lines.push(`- **Reason:** ${u.reason}`);
    lines.push('');
  }

  return lines.join('\n');
}
