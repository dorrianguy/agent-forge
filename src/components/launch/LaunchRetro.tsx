// =============================================================================
// LaunchRetro — Post-Launch Retrospective Form
// =============================================================================

'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  ClipboardList,
  Plus,
  Trash2,
  ArrowRight,
  FileDown,
  BarChart3,
  Lightbulb,
  ThumbsUp,
  ThumbsDown,
  Trophy,
  TrendingUp,
  Edit3,
  Save,
  X,
  Copy,
  Check,
} from 'lucide-react';
import type { LaunchRetro as LaunchRetroType } from '@/lib/launch/types';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function useCopyToClipboard() {
  const [copied, setCopied] = useState<string | null>(null);
  const copy = useCallback((text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  }, []);
  return { copied, copy };
}

interface InlineEditProps {
  value: string;
  onSave: (value: string) => void;
  placeholder?: string;
  className?: string;
}

function InlineEdit({ value, onSave, placeholder, className = '' }: InlineEditProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const save = () => { onSave(draft); setEditing(false); };
  const cancel = () => { setDraft(value); setEditing(false); };

  if (editing) {
    return (
      <div className="flex items-center gap-2">
        <input
          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-100
            focus:outline-none focus:ring-2 focus:ring-blue-500/50"
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          autoFocus
          onKeyDown={(e) => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel(); }}
        />
        <button onClick={save} className="p-1 text-blue-400 hover:text-blue-300"><Save className="w-3.5 h-3.5" /></button>
        <button onClick={cancel} className="p-1 text-zinc-500 hover:text-zinc-300"><X className="w-3.5 h-3.5" /></button>
      </div>
    );
  }

  return (
    <div className={`group flex items-center gap-2 ${className}`}>
      <span className="text-sm text-zinc-200 flex-1">
        {value || <span className="italic text-zinc-600">{placeholder ?? 'Empty'}</span>}
      </span>
      <button
        onClick={() => setEditing(true)}
        className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-blue-400 transition-all"
      >
        <Edit3 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Editable List
// ---------------------------------------------------------------------------

function EditableList({ items, onChange, icon, iconColor }: {
  items: string[];
  onChange: (items: string[]) => void;
  icon: React.ComponentType<{ className?: string }>;
  iconColor: string;
}) {
  const [newItem, setNewItem] = useState('');
  const Icon = icon;

  const addItem = () => {
    if (!newItem.trim()) return;
    onChange([...items, newItem.trim()]);
    setNewItem('');
  };

  const removeItem = (idx: number) => {
    onChange(items.filter((_, i) => i !== idx));
  };

  const updateItem = (idx: number, value: string) => {
    const updated = [...items];
    updated[idx] = value;
    onChange(updated);
  };

  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="flex items-center gap-2 bg-zinc-800/50 rounded-lg px-3 py-2">
          <Icon className={`w-3.5 h-3.5 flex-shrink-0 ${iconColor}`} />
          <InlineEdit value={item} onSave={(v) => updateItem(i, v)} className="flex-1" />
          <button
            onClick={() => removeItem(i)}
            className="text-zinc-600 hover:text-red-400 transition-colors flex-shrink-0"
          >
            <Trash2 className="w-3.5 h-3.5" />
          </button>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <input
          className="flex-1 bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-1.5 text-sm text-zinc-100
            focus:outline-none focus:ring-2 focus:ring-blue-500/50 placeholder-zinc-600"
          placeholder="Add item…"
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') addItem(); }}
        />
        <button
          onClick={addItem}
          disabled={!newItem.trim()}
          className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-xs bg-zinc-700 hover:bg-zinc-600
            text-zinc-300 transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <Plus className="w-3 h-3" /> Add
        </button>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hook Performance Table
// ---------------------------------------------------------------------------

function HookPerformanceTable({ data }: { data: LaunchRetroType['metrics']['hookPerformance'] }) {
  if (data.length === 0) return <p className="text-xs text-zinc-600 italic">No hook performance data</p>;

  const maxMetric = Math.max(...data.map((h) => h.metric));

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800">
            <th className="text-left py-2 px-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Hook</th>
            <th className="text-left py-2 px-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Variant</th>
            <th className="text-left py-2 px-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">Performance</th>
          </tr>
        </thead>
        <tbody>
          {data.map((row, i) => (
            <tr key={i} className="border-b border-zinc-800/50">
              <td className="py-2 px-3 text-zinc-200">{row.hook}</td>
              <td className="py-2 px-3">
                <span className="px-2 py-0.5 rounded-full text-xs bg-zinc-800 text-zinc-300 font-medium">
                  {row.variant}
                </span>
              </td>
              <td className="py-2 px-3">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-2 bg-zinc-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-blue-500 rounded-full transition-all"
                      style={{ width: maxMetric > 0 ? `${(row.metric / maxMetric) * 100}%` : '0%' }}
                    />
                  </div>
                  <span className="text-xs text-zinc-400 w-10 text-right">{row.metric.toFixed(1)}</span>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

interface LaunchRetroProps {
  retro: LaunchRetroType;
  onUpdate: (retro: LaunchRetroType) => void;
}

export default function LaunchRetroPanel({ retro, onUpdate }: LaunchRetroProps) {
  const { copied, copy } = useCopyToClipboard();

  const updateField = useCallback(<K extends keyof LaunchRetroType>(field: K, value: LaunchRetroType[K]) => {
    onUpdate({ ...retro, [field]: value });
  }, [retro, onUpdate]);

  const updateBestConverting = useCallback((key: keyof LaunchRetroType['bestConverting'], value: string) => {
    onUpdate({ ...retro, bestConverting: { ...retro.bestConverting, [key]: value } });
  }, [retro, onUpdate]);

  const updateMetrics = useCallback((key: keyof LaunchRetroType['metrics'], value: number | string) => {
    onUpdate({ ...retro, metrics: { ...retro.metrics, [key]: value } });
  }, [retro, onUpdate]);

  // Generate markdown summary
  const markdownSummary = useMemo(() => {
    const lines: string[] = [];
    lines.push(`# Launch Retrospective: ${retro.productName}`);
    lines.push(`**Launch Date:** ${retro.launchDate}`);
    lines.push(`**Completed:** ${retro.completedDate}`);
    lines.push('');
    lines.push('## Best Converting');
    lines.push(`- **Channel:** ${retro.bestConverting.channel}`);
    lines.push(`- **Hook:** ${retro.bestConverting.hook}`);
    lines.push(`- **CTA:** ${retro.bestConverting.cta}`);
    lines.push('');
    lines.push('## Metrics');
    lines.push(`- **Total Traffic:** ${retro.metrics.totalTraffic.toLocaleString()}`);
    lines.push(`- **Conversion Rate:** ${retro.metrics.conversionRate}%`);
    lines.push(`- **Top Channel:** ${retro.metrics.topChannel}`);
    lines.push(`- **Top Asset:** ${retro.metrics.topAsset}`);
    lines.push('');
    lines.push('## Keep for Next CMD');
    retro.keepForNextCMD.forEach((k) => lines.push(`- ✅ ${k}`));
    lines.push('');
    lines.push('## Drop from Next CMD');
    retro.dropFromNextCMD.forEach((d) => lines.push(`- ❌ ${d}`));
    lines.push('');
    lines.push('## Lessons Learned');
    retro.lessons.forEach((l) => lines.push(`- 💡 ${l}`));
    lines.push('');
    lines.push('## Hook Performance');
    retro.metrics.hookPerformance.forEach((h) => {
      lines.push(`- ${h.hook} (Variant ${h.variant}): ${h.metric.toFixed(1)}`);
    });
    return lines.join('\n');
  }, [retro]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-blue-400" />
          <h3 className="text-sm font-semibold text-zinc-200">Launch Retrospective</h3>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => copy(markdownSummary, 'summary')}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-400 transition-colors"
          >
            {copied === 'summary' ? <Check className="w-3 h-3 text-green-400" /> : <Copy className="w-3 h-3" />}
            {copied === 'summary' ? 'Copied' : 'Generate Summary'}
          </button>
          <button
            onClick={() => {
              const blob = new Blob([markdownSummary], { type: 'text/markdown' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `retro-${retro.productName.toLowerCase().replace(/\s+/g, '-')}.md`;
              a.click();
              URL.revokeObjectURL(url);
            }}
            className="flex items-center gap-1 px-3 py-1.5 rounded-lg text-xs bg-blue-600/20 hover:bg-blue-600/30 text-blue-300 border border-blue-500/30 transition-colors"
          >
            <FileDown className="w-3 h-3" /> Export
          </button>
        </div>
      </div>

      {/* Best Converting */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2 mb-1">
          <Trophy className="w-4 h-4 text-emerald-400" />
          <h4 className="text-sm font-medium text-zinc-200">Best Converting</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div>
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1 block">Channel</label>
            <InlineEdit value={retro.bestConverting.channel} onSave={(v) => updateBestConverting('channel', v)} placeholder="e.g. Twitter" />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1 block">Hook</label>
            <InlineEdit value={retro.bestConverting.hook} onSave={(v) => updateBestConverting('hook', v)} placeholder="Best performing hook" />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1 block">CTA</label>
            <InlineEdit value={retro.bestConverting.cta} onSave={(v) => updateBestConverting('cta', v)} placeholder="Best CTA" />
          </div>
        </div>
      </div>

      {/* Metrics */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-4 space-y-4">
        <div className="flex items-center gap-2 mb-1">
          <BarChart3 className="w-4 h-4 text-blue-400" />
          <h4 className="text-sm font-medium text-zinc-200">Metrics</h4>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-zinc-100">{retro.metrics.totalTraffic.toLocaleString()}</div>
            <div className="text-xs text-zinc-500">Total Traffic</div>
          </div>
          <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
            <div className="text-lg font-bold text-emerald-400">{retro.metrics.conversionRate}%</div>
            <div className="text-xs text-zinc-500">Conversion Rate</div>
          </div>
          <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
            <div className="text-sm font-bold text-zinc-100 truncate">{retro.metrics.topChannel}</div>
            <div className="text-xs text-zinc-500">Top Channel</div>
          </div>
          <div className="bg-zinc-800/50 rounded-lg p-3 text-center">
            <div className="text-sm font-bold text-zinc-100 truncate">{retro.metrics.topAsset}</div>
            <div className="text-xs text-zinc-500">Top Asset</div>
          </div>
        </div>

        {/* Hook Performance Table */}
        <div>
          <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2 block">Hook Performance</label>
          <HookPerformanceTable data={retro.metrics.hookPerformance} />
        </div>
      </div>

      {/* Keep / Drop Lists */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2">
            <ThumbsUp className="w-4 h-4 text-emerald-400" />
            <h4 className="text-sm font-medium text-zinc-200">Keep for Next CMD</h4>
          </div>
          <EditableList
            items={retro.keepForNextCMD}
            onChange={(items) => updateField('keepForNextCMD', items)}
            icon={ThumbsUp}
            iconColor="text-emerald-400"
          />
        </div>

        <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2">
            <ThumbsDown className="w-4 h-4 text-red-400" />
            <h4 className="text-sm font-medium text-zinc-200">Drop from Next CMD</h4>
          </div>
          <EditableList
            items={retro.dropFromNextCMD}
            onChange={(items) => updateField('dropFromNextCMD', items)}
            icon={ThumbsDown}
            iconColor="text-red-400"
          />
        </div>
      </div>

      {/* Lessons Learned */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2">
          <Lightbulb className="w-4 h-4 text-amber-400" />
          <h4 className="text-sm font-medium text-zinc-200">Lessons Learned</h4>
        </div>
        <EditableList
          items={retro.lessons}
          onChange={(items) => updateField('lessons', items)}
          icon={Lightbulb}
          iconColor="text-amber-400"
        />
      </div>

      {/* Apply to Next CMD */}
      <button
        className="w-full flex items-center justify-center gap-2 px-4 py-3 rounded-lg text-sm font-medium
          bg-purple-600/20 text-purple-300 hover:bg-purple-600/30 border border-purple-500/30 transition-colors"
      >
        <ArrowRight className="w-4 h-4" />
        Apply to Next CMD
      </button>
    </div>
  );
}
