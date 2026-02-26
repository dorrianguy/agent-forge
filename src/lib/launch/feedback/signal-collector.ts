// =============================================================================
// Feedback Signal Collector & Analyzer
// =============================================================================
//
// Collects post-launch performance signals, aggregates them by asset/variant/hook,
// identifies A/B test winners, and suggests CMD updates based on performance data.
// =============================================================================

import type {
  CMDUpdate,
  FeedbackAnalysis,
  FeedbackSignal,
  FeedbackSignalType,
} from '../types';

// ---------------------------------------------------------------------------
// Signal storage
// ---------------------------------------------------------------------------

/** In-memory signal store. Swap for a persistent backend as needed. */
const signalStore: FeedbackSignal[] = [];

/**
 * Collect and store a single feedback signal.
 */
export function collectSignal(signal: FeedbackSignal): void {
  signalStore.push(signal);
}

/**
 * Retrieve all collected signals (snapshot — does not drain).
 */
export function getStoredSignals(): FeedbackSignal[] {
  return [...signalStore];
}

/**
 * Clear the in-memory signal store. Useful for tests.
 */
export function clearSignals(): void {
  signalStore.length = 0;
}

// ---------------------------------------------------------------------------
// Aggregation helpers
// ---------------------------------------------------------------------------

interface AggregatedBucket {
  assetType: string;
  variant: 'A' | 'B';
  hookOrClaimRef: string;
  signalType: FeedbackSignalType;
  totalValue: number;
  count: number;
  averageValue: number;
}

function bucketKey(s: FeedbackSignal): string {
  return `${s.assetId}::${s.variant}::${s.hookOrClaimRef}::${s.type}`;
}

/**
 * Aggregate signals by asset / variant / hook / signal type.
 *
 * Returns one bucket per unique combination with totals and averages.
 */
export function analyzeSignals(signals: FeedbackSignal[]): AggregatedBucket[] {
  const buckets = new Map<string, {
    assetType: string;
    variant: 'A' | 'B';
    hookOrClaimRef: string;
    signalType: FeedbackSignalType;
    totalValue: number;
    count: number;
  }>();

  for (const s of signals) {
    const key = bucketKey(s);
    const existing = buckets.get(key);

    if (existing) {
      existing.totalValue += s.value;
      existing.count += 1;
    } else {
      buckets.set(key, {
        assetType: s.assetId,
        variant: s.variant,
        hookOrClaimRef: s.hookOrClaimRef,
        signalType: s.type,
        totalValue: s.value,
        count: 1,
      });
    }
  }

  return Array.from(buckets.values()).map((b) => ({
    ...b,
    averageValue: b.count > 0 ? b.totalValue / b.count : 0,
  }));
}

// ---------------------------------------------------------------------------
// Winner identification
// ---------------------------------------------------------------------------

interface VariantWinner {
  assetType: string;
  winner: 'A' | 'B';
  margin: number;
}

/**
 * Identify A/B test winners per asset type.
 *
 * Groups signals by asset, sums total value per variant, and determines
 * which variant won and by what margin (0–1 scale).
 */
export function identifyWinners(signals: FeedbackSignal[]): VariantWinner[] {
  // Group by asset → variant → total value
  const assetVariantTotals = new Map<string, { A: number; B: number }>();

  for (const s of signals) {
    const existing = assetVariantTotals.get(s.assetId) || { A: 0, B: 0 };
    existing[s.variant] += s.value;
    assetVariantTotals.set(s.assetId, existing);
  }

  const winners: VariantWinner[] = [];

  for (const [assetType, totals] of assetVariantTotals) {
    const total = totals.A + totals.B;
    if (total === 0) continue;

    const winner: 'A' | 'B' = totals.A >= totals.B ? 'A' : 'B';
    const margin = Math.abs(totals.A - totals.B) / total;

    winners.push({ assetType, winner, margin });
  }

  return winners;
}

// ---------------------------------------------------------------------------
// CMD update suggestions
// ---------------------------------------------------------------------------

/**
 * Analyze performance data and suggest CMD updates.
 *
 * Heuristics:
 *   - email_open  → best open-rate hook → promote to CMD hooks
 *   - lp_click    → most-clicked section → reorder supporting claims
 *   - pr_pickup   → pickup angle → refine positioning
 *   - social_engagement → top post hook → promote to LP headline
 */
export function suggestCMDUpdates(
  signals: FeedbackSignal[],
  winners: VariantWinner[],
): CMDUpdate[] {
  const updates: CMDUpdate[] = [];
  const buckets = analyzeSignals(signals);

  // --- Email opens: promote top-performing hook ---
  const emailBuckets = buckets
    .filter((b) => b.signalType === 'email_open')
    .sort((a, b) => b.averageValue - a.averageValue);

  if (emailBuckets.length >= 2) {
    const best = emailBuckets[0];
    const worst = emailBuckets[emailBuckets.length - 1];

    updates.push({
      field: 'hooks',
      action: 'promote',
      original: worst.hookOrClaimRef,
      suggested: best.hookOrClaimRef,
      reason: `Email open rate: "${best.hookOrClaimRef}" averaged ${best.averageValue.toFixed(2)} vs "${worst.hookOrClaimRef}" at ${worst.averageValue.toFixed(2)}`,
      confidence: Math.min(best.averageValue / Math.max(worst.averageValue, 0.01), 1),
      source: 'email_open',
    });
  }

  // --- LP clicks: reorder supporting claims ---
  const lpBuckets = buckets
    .filter((b) => b.signalType === 'lp_click')
    .sort((a, b) => b.totalValue - a.totalValue);

  if (lpBuckets.length >= 2) {
    const top = lpBuckets[0];
    const bottom = lpBuckets[lpBuckets.length - 1];

    updates.push({
      field: 'supportingClaims',
      action: 'promote',
      original: bottom.hookOrClaimRef,
      suggested: top.hookOrClaimRef,
      reason: `LP click data: "${top.hookOrClaimRef}" received ${top.totalValue} clicks vs "${bottom.hookOrClaimRef}" at ${bottom.totalValue}`,
      confidence: Math.min(top.totalValue / Math.max(top.totalValue + bottom.totalValue, 1), 1),
      source: 'lp_click',
    });
  }

  // --- PR pickup: refine positioning ---
  const prBuckets = buckets
    .filter((b) => b.signalType === 'pr_pickup')
    .sort((a, b) => b.totalValue - a.totalValue);

  if (prBuckets.length >= 1) {
    const topPR = prBuckets[0];
    const lowestPR = prBuckets[prBuckets.length - 1];

    if (topPR !== lowestPR) {
      updates.push({
        field: 'positioning',
        action: 'replace',
        original: lowestPR.hookOrClaimRef,
        suggested: topPR.hookOrClaimRef,
        reason: `PR pickup: "${topPR.hookOrClaimRef}" angle was picked up ${topPR.totalValue} times vs "${lowestPR.hookOrClaimRef}" at ${lowestPR.totalValue}`,
        confidence: Math.min(topPR.totalValue / Math.max(topPR.totalValue + lowestPR.totalValue, 1), 1),
        source: 'pr_pickup',
      });
    }
  }

  // --- Social engagement: promote top hook ---
  const socialBuckets = buckets
    .filter((b) => b.signalType === 'social_engagement')
    .sort((a, b) => b.totalValue - a.totalValue);

  if (socialBuckets.length >= 1) {
    const topSocial = socialBuckets[0];

    // Find the losing hook to replace
    const lowestSocial = socialBuckets[socialBuckets.length - 1];
    const replacementTarget = lowestSocial !== topSocial ? lowestSocial.hookOrClaimRef : '';

    updates.push({
      field: 'hooks',
      action: 'promote',
      original: replacementTarget,
      suggested: topSocial.hookOrClaimRef,
      reason: `Social engagement: "${topSocial.hookOrClaimRef}" generated ${topSocial.totalValue} total engagement — promote to LP headline`,
      confidence: Math.min(
        topSocial.totalValue / Math.max(socialBuckets.reduce((sum, b) => sum + b.totalValue, 0), 1),
        1,
      ),
      source: 'social_engagement',
    });
  }

  // --- Demote hooks from losing variants ---
  for (const w of winners) {
    const loser: 'A' | 'B' = w.winner === 'A' ? 'B' : 'A';
    const loserBuckets = buckets.filter(
      (b) => b.assetType === w.assetType && b.variant === loser,
    );

    for (const lb of loserBuckets) {
      updates.push({
        field: 'hooks',
        action: 'demote',
        original: lb.hookOrClaimRef,
        suggested: '',
        reason: `Variant ${loser} lost on ${w.assetType} by margin ${(w.margin * 100).toFixed(1)}%`,
        confidence: w.margin,
        source: lb.signalType,
      });
    }
  }

  return updates;
}

// ---------------------------------------------------------------------------
// Full analysis
// ---------------------------------------------------------------------------

/**
 * Run a complete feedback analysis producing a `FeedbackAnalysis` object.
 */
export function runFeedbackAnalysis(
  launchId: string,
  signals: FeedbackSignal[],
): FeedbackAnalysis {
  const winners = identifyWinners(signals);
  const suggestedUpdates = suggestCMDUpdates(signals, winners);

  return {
    launchId,
    signals,
    suggestedUpdates,
    winningVariants: winners,
  };
}
