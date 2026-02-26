// =============================================================================
// FeedbackDashboard — Post-Launch Analytics Dashboard
// =============================================================================

'use client';

import React, { useState, useMemo } from 'react';
import {
  Activity,
  Trophy,
  TrendingUp,
  Mail,
  MousePointer,
  Newspaper,
  Share2,
  CheckCircle2,
  XCircle,
  Clock,
  BarChart3,
  Zap,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import type {
  FeedbackAnalysis,
  FeedbackSignal,
  FeedbackSignalType,
  CMDUpdate,
} from '@/lib/launch/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const SIGNAL_ICONS: Record<FeedbackSignalType, React.ComponentType<{ className?: string }>> = {
  email_open: Mail,
  lp_click: MousePointer,
  pr_pickup: Newspaper,
  social_engagement: Share2,
};

const SIGNAL_COLORS: Record<FeedbackSignalType, string> = {
  email_open: 'text-sky-400 bg-sky-500/20',
  lp_click: 'text-emerald-400 bg-emerald-500/20',
  pr_pickup: 'text-amber-400 bg-amber-500/20',
  social_engagement: 'text-purple-400 bg-purple-500/20',
};

const SIGNAL_LABELS: Record<FeedbackSignalType, string> = {
  email_open: 'Email Open',
  lp_click: 'LP Click',
  pr_pickup: 'PR Pickup',
  social_engagement: 'Social',
};

function formatTimestamp(iso: string): string {
  try {
    const d = new Date(iso);
    return d.toLocaleString(undefined, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return iso;
  }
}

// ---------------------------------------------------------------------------
// Summary Stats Bar
// ---------------------------------------------------------------------------

function SummaryStats({ analysis }: { analysis: FeedbackAnalysis }) {
  const totalSignals = analysis.signals.length;

  const winnerPct = useMemo(() => {
    if (analysis.winningVariants.length === 0) return 0;
    return Math.round(
      (analysis.winningVariants.filter((w) => w.margin > 0).length / analysis.winningVariants.length) * 100
    );
  }, [analysis.winningVariants]);

  const topChannel = useMemo(() => {
    const counts: Record<string, number> = {};
    for (const signal of analysis.signals) {
      counts[signal.type] = (counts[signal.type] || 0) + 1;
    }
    let max = 0;
    let top: FeedbackSignalType = 'email_open';
    for (const [type, count] of Object.entries(counts)) {
      if (count > max) { max = count; top = type as FeedbackSignalType; }
    }
    return top;
  }, [analysis.signals]);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-1">
          <Activity className="w-3.5 h-3.5 text-blue-400" />
          <span className="text-xs text-zinc-500">Total Signals</span>
        </div>
        <div className="text-xl font-bold text-zinc-100">{totalSignals}</div>
      </div>

      <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-1">
          <Trophy className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-xs text-zinc-500">Winner Clarity</span>
        </div>
        <div className="text-xl font-bold text-emerald-400">{winnerPct}%</div>
      </div>

      <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-1">
          <TrendingUp className="w-3.5 h-3.5 text-amber-400" />
          <span className="text-xs text-zinc-500">Top Channel</span>
        </div>
        <div className="text-sm font-bold text-zinc-100">{SIGNAL_LABELS[topChannel]}</div>
      </div>

      <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-3">
        <div className="flex items-center gap-2 mb-1">
          <Zap className="w-3.5 h-3.5 text-purple-400" />
          <span className="text-xs text-zinc-500">CMD Updates</span>
        </div>
        <div className="text-xl font-bold text-zinc-100">{analysis.suggestedUpdates.length}</div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Winning Variants Panel
// ---------------------------------------------------------------------------

function WinningVariantsPanel({ data }: { data: FeedbackAnalysis['winningVariants'] }) {
  if (data.length === 0) {
    return (
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-4">
        <h4 className="text-sm font-medium text-zinc-200 flex items-center gap-2 mb-2">
          <Trophy className="w-4 h-4 text-emerald-400" /> Winning Variants
        </h4>
        <p className="text-xs text-zinc-600 italic">No variant winners determined yet</p>
      </div>
    );
  }

  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-4 space-y-3">
      <h4 className="text-sm font-medium text-zinc-200 flex items-center gap-2">
        <Trophy className="w-4 h-4 text-emerald-400" /> Winning Variants
      </h4>
      <div className="space-y-2">
        {data.map((item, i) => (
          <div key={i} className="flex items-center justify-between bg-zinc-800/50 rounded-lg px-3 py-2">
            <div className="flex items-center gap-2">
              <span className="text-sm text-zinc-200">{item.assetType}</span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-bold
                ${item.winner === 'A' ? 'bg-blue-500/20 text-blue-400' : 'bg-purple-500/20 text-purple-400'}`}
              >
                Variant {item.winner}
              </span>
            </div>
            <div className="flex items-center gap-1">
              {item.margin > 0 ? (
                <ArrowUpRight className="w-3 h-3 text-emerald-400" />
              ) : (
                <ArrowDownRight className="w-3 h-3 text-red-400" />
              )}
              <span className={`text-xs font-medium ${item.margin > 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {item.margin > 0 ? '+' : ''}{(item.margin * 100).toFixed(1)}%
              </span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Signal Feed
// ---------------------------------------------------------------------------

function SignalFeed({ signals }: { signals: FeedbackSignal[] }) {
  const [showAll, setShowAll] = useState(false);
  const sortedSignals = useMemo(
    () => [...signals].sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()),
    [signals],
  );
  const visibleSignals = showAll ? sortedSignals : sortedSignals.slice(0, 10);

  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-4 space-y-3">
      <h4 className="text-sm font-medium text-zinc-200 flex items-center gap-2">
        <Activity className="w-4 h-4 text-blue-400" /> Signal Feed
      </h4>
      <div className="space-y-1.5 max-h-64 overflow-y-auto">
        {visibleSignals.map((signal, i) => {
          const SignalIcon = SIGNAL_ICONS[signal.type];
          const colorClass = SIGNAL_COLORS[signal.type];
          return (
            <div key={i} className="flex items-center gap-3 px-2 py-1.5 rounded hover:bg-zinc-800/50 transition-colors">
              <div className={`p-1 rounded ${colorClass}`}>
                <SignalIcon className="w-3 h-3" />
              </div>
              <div className="flex-1 min-w-0">
                <span className="text-xs text-zinc-200">
                  {SIGNAL_LABELS[signal.type]}
                </span>
                <span className="text-xs text-zinc-500 ml-1.5">
                  Variant {signal.variant} · {signal.metric}: {signal.value}
                </span>
              </div>
              <span className="text-[10px] text-zinc-600 flex-shrink-0 flex items-center gap-1">
                <Clock className="w-2.5 h-2.5" />
                {formatTimestamp(signal.timestamp)}
              </span>
            </div>
          );
        })}
      </div>
      {sortedSignals.length > 10 && (
        <button
          onClick={() => setShowAll(!showAll)}
          className="text-xs text-blue-400 hover:text-blue-300 transition-colors"
        >
          {showAll ? 'Show less' : `Show all ${sortedSignals.length} signals`}
        </button>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Suggested CMD Updates
// ---------------------------------------------------------------------------

function SuggestedUpdates({ updates, onApprove, onReject }: {
  updates: CMDUpdate[];
  onApprove?: (index: number) => void;
  onReject?: (index: number) => void;
}) {
  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-4 space-y-3">
      <h4 className="text-sm font-medium text-zinc-200 flex items-center gap-2">
        <Zap className="w-4 h-4 text-amber-400" /> Suggested CMD Updates
      </h4>
      {updates.length === 0 ? (
        <p className="text-xs text-zinc-600 italic">No updates suggested</p>
      ) : (
        <div className="space-y-3">
          {updates.map((update, i) => (
            <div key={i} className="bg-zinc-800/50 border border-zinc-700/50 rounded-lg p-3 space-y-2">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className={`px-2 py-0.5 rounded text-[10px] font-medium uppercase
                    ${update.action === 'promote' ? 'bg-emerald-500/20 text-emerald-400' :
                      update.action === 'demote' ? 'bg-red-500/20 text-red-400' :
                        'bg-amber-500/20 text-amber-400'
                    }`}
                  >
                    {update.action}
                  </span>
                  <span className="text-xs text-zinc-400">{update.field}</span>
                </div>
                <span className={`text-[10px] px-1.5 py-0.5 rounded bg-zinc-700 ${SIGNAL_COLORS[update.source]?.split(' ')[0] ?? 'text-zinc-400'}`}>
                  {SIGNAL_LABELS[update.source]}
                </span>
              </div>

              <div className="text-xs space-y-1">
                <div className="flex items-start gap-2">
                  <span className="text-zinc-500 w-16 flex-shrink-0">Original:</span>
                  <span className="text-zinc-400 line-through">{update.original}</span>
                </div>
                <div className="flex items-start gap-2">
                  <span className="text-zinc-500 w-16 flex-shrink-0">Suggested:</span>
                  <span className="text-zinc-200">{update.suggested}</span>
                </div>
              </div>

              <p className="text-xs text-zinc-500 italic">{update.reason}</p>

              {/* Confidence Bar */}
              <div className="flex items-center gap-2">
                <span className="text-[10px] text-zinc-500">Confidence:</span>
                <div className="flex-1 h-1.5 bg-zinc-800 rounded-full overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all ${
                      update.confidence > 0.7 ? 'bg-emerald-500' :
                        update.confidence > 0.4 ? 'bg-amber-500' : 'bg-red-500'
                    }`}
                    style={{ width: `${update.confidence * 100}%` }}
                  />
                </div>
                <span className="text-[10px] text-zinc-400 w-8 text-right">{(update.confidence * 100).toFixed(0)}%</span>
              </div>

              {/* Approve / Reject */}
              <div className="flex gap-2 pt-1">
                <button
                  onClick={() => onApprove?.(i)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded text-xs bg-emerald-600/20 text-emerald-300
                    hover:bg-emerald-600/30 border border-emerald-500/30 transition-colors"
                >
                  <CheckCircle2 className="w-3 h-3" /> Approve
                </button>
                <button
                  onClick={() => onReject?.(i)}
                  className="flex items-center gap-1 px-2.5 py-1 rounded text-xs bg-red-600/20 text-red-300
                    hover:bg-red-600/30 border border-red-500/30 transition-colors"
                >
                  <XCircle className="w-3 h-3" /> Reject
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hook Performance Chart (Simple bar chart)
// ---------------------------------------------------------------------------

function HookPerformanceChart({ signals }: { signals: FeedbackSignal[] }) {
  const hookData = useMemo(() => {
    const hooks: Record<string, number> = {};
    for (const signal of signals) {
      if (signal.hookOrClaimRef) {
        hooks[signal.hookOrClaimRef] = (hooks[signal.hookOrClaimRef] || 0) + signal.value;
      }
    }
    return Object.entries(hooks)
      .map(([hook, total]) => ({ hook, total }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 8);
  }, [signals]);

  const maxVal = hookData.length > 0 ? Math.max(...hookData.map((d) => d.total)) : 1;

  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-4 space-y-3">
      <h4 className="text-sm font-medium text-zinc-200 flex items-center gap-2">
        <BarChart3 className="w-4 h-4 text-purple-400" /> Hook Performance
      </h4>
      {hookData.length === 0 ? (
        <p className="text-xs text-zinc-600 italic">No hook performance data</p>
      ) : (
        <div className="space-y-2">
          {hookData.map((item, i) => (
            <div key={i} className="space-y-1">
              <div className="flex items-center justify-between">
                <span className="text-xs text-zinc-300 truncate max-w-[200px]">{item.hook}</span>
                <span className="text-xs text-zinc-500">{item.total.toFixed(1)}</span>
              </div>
              <div className="h-3 bg-zinc-800 rounded-full overflow-hidden">
                <div
                  className="h-full bg-gradient-to-r from-purple-500 to-blue-500 rounded-full transition-all"
                  style={{ width: `${(item.total / maxVal) * 100}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

interface FeedbackDashboardProps {
  analysis: FeedbackAnalysis;
  onApproveUpdate?: (index: number) => void;
  onRejectUpdate?: (index: number) => void;
}

export default function FeedbackDashboard({ analysis, onApproveUpdate, onRejectUpdate }: FeedbackDashboardProps) {
  return (
    <div className="space-y-4">
      {/* Summary Stats */}
      <SummaryStats analysis={analysis} />

      {/* Two-column layout for larger screens */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {/* Left column */}
        <div className="space-y-4">
          <WinningVariantsPanel data={analysis.winningVariants} />
          <HookPerformanceChart signals={analysis.signals} />
        </div>

        {/* Right column */}
        <div className="space-y-4">
          <SignalFeed signals={analysis.signals} />
          <SuggestedUpdates
            updates={analysis.suggestedUpdates}
            onApprove={onApproveUpdate}
            onReject={onRejectUpdate}
          />
        </div>
      </div>
    </div>
  );
}
