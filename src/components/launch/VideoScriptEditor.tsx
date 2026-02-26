// =============================================================================
// VideoScriptEditor — 30s Teaser + 60s Explainer with Timeline Visualization
// =============================================================================

'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  Copy,
  Check,
  Edit3,
  Save,
  X,
  Video,
  Clock,
  AlertTriangle,
  FileDown,
  Eye,
  Mic,
  Type,
  BookOpen,
} from 'lucide-react';
import type { VideoScriptAsset, VideoScene } from '@/lib/launch/types';

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

function CopyButton({ text, copyKey, copied, onCopy }: {
  text: string;
  copyKey: string;
  copied: string | null;
  onCopy: (text: string, key: string) => void;
}) {
  const isCopied = copied === copyKey;
  return (
    <button
      onClick={() => onCopy(text, copyKey)}
      className="flex items-center gap-1 px-2 py-1 rounded text-xs text-zinc-500 hover:text-blue-400 hover:bg-zinc-800 transition-colors"
    >
      {isCopied ? (
        <><Check className="w-3 h-3 text-green-400" /><span className="text-green-400">Copied</span></>
      ) : (
        <><Copy className="w-3 h-3" /><span>Copy</span></>
      )}
    </button>
  );
}

interface InlineEditProps {
  value: string;
  multiline?: boolean;
  onSave: (value: string) => void;
  className?: string;
}

function InlineEdit({ value, multiline = false, onSave, className = '' }: InlineEditProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const save = () => { onSave(draft); setEditing(false); };
  const cancel = () => { setDraft(value); setEditing(false); };

  if (editing) {
    return (
      <div className="space-y-2">
        {multiline ? (
          <textarea
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100
              focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
            rows={3}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            autoFocus
          />
        ) : (
          <input
            className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100
              focus:outline-none focus:ring-2 focus:ring-blue-500/50"
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            autoFocus
          />
        )}
        <div className="flex gap-2">
          <button onClick={save} className="flex items-center gap-1 px-2.5 py-1 rounded text-xs bg-blue-600 hover:bg-blue-500 text-white transition-colors">
            <Save className="w-3 h-3" /> Save
          </button>
          <button onClick={cancel} className="flex items-center gap-1 px-2.5 py-1 rounded text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-300 transition-colors">
            <X className="w-3 h-3" /> Cancel
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className={`group flex items-start gap-2 ${className}`}>
      <span className="text-sm text-zinc-200 flex-1 whitespace-pre-wrap leading-relaxed">
        {value || <span className="italic text-zinc-600">Empty</span>}
      </span>
      <button
        onClick={() => setEditing(true)}
        className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-blue-400 transition-all flex-shrink-0 mt-0.5"
      >
        <Edit3 className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Timeline Visualization
// ---------------------------------------------------------------------------

const SCENE_COLORS = [
  'bg-blue-500/40 border-blue-500/60',
  'bg-purple-500/40 border-purple-500/60',
  'bg-emerald-500/40 border-emerald-500/60',
  'bg-amber-500/40 border-amber-500/60',
  'bg-pink-500/40 border-pink-500/60',
  'bg-cyan-500/40 border-cyan-500/60',
  'bg-rose-500/40 border-rose-500/60',
  'bg-indigo-500/40 border-indigo-500/60',
];

function Timeline({ scenes, totalDuration, expectedDuration }: {
  scenes: VideoScene[];
  totalDuration: number;
  expectedDuration: number;
}) {
  const actualTotal = scenes.reduce((sum, s) => sum + s.duration, 0);
  const durationMismatch = actualTotal !== totalDuration;

  return (
    <div className="space-y-2">
      {/* Duration indicator */}
      <div className="flex items-center justify-between">
        <span className="text-xs text-zinc-500 flex items-center gap-1">
          <Clock className="w-3 h-3" /> Total: {actualTotal}s / {expectedDuration}s
        </span>
        {durationMismatch && (
          <span className="flex items-center gap-1 text-xs text-amber-400">
            <AlertTriangle className="w-3 h-3" />
            Scene durations sum to {actualTotal}s (expected {totalDuration}s)
          </span>
        )}
        {!durationMismatch && actualTotal !== expectedDuration && (
          <span className="flex items-center gap-1 text-xs text-amber-400">
            <AlertTriangle className="w-3 h-3" />
            Total {actualTotal}s ≠ target {expectedDuration}s
          </span>
        )}
      </div>

      {/* Timeline bar */}
      <div className="flex h-10 rounded-lg overflow-hidden border border-zinc-800 bg-zinc-900/50">
        {scenes.map((scene, i) => {
          const widthPct = actualTotal > 0 ? (scene.duration / actualTotal) * 100 : 0;
          const colorClass = SCENE_COLORS[i % SCENE_COLORS.length];
          return (
            <div
              key={i}
              className={`relative flex items-center justify-center border-r last:border-r-0 ${colorClass} transition-all`}
              style={{ width: `${widthPct}%`, minWidth: '24px' }}
              title={`Scene ${i + 1}: ${scene.duration}s`}
            >
              <span className="text-[10px] font-medium text-white/80 truncate px-1">
                {scene.duration}s
              </span>
            </div>
          );
        })}
      </div>

      {/* Scene labels */}
      <div className="flex">
        {scenes.map((_, i) => {
          const widthPct = actualTotal > 0 ? (scenes[i].duration / actualTotal) * 100 : 0;
          return (
            <div key={i} style={{ width: `${widthPct}%`, minWidth: '24px' }} className="text-center">
              <span className="text-[10px] text-zinc-600">Scene {i + 1}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Scene Card
// ---------------------------------------------------------------------------

function SceneCard({ scene, index, pathPrefix, onFieldSave, copied, onCopy }: {
  scene: VideoScene;
  index: number;
  pathPrefix: string;
  onFieldSave: (path: string, value: string) => void;
  copied: string | null;
  onCopy: (text: string, key: string) => void;
}) {
  const colorClass = SCENE_COLORS[index % SCENE_COLORS.length];

  return (
    <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`px-2 py-0.5 rounded text-xs font-medium border ${colorClass} text-white/80`}>
            {scene.duration}s
          </span>
          <span className="text-sm font-medium text-zinc-200">Scene {index + 1}</span>
        </div>
        {scene.cmdSource && (
          <span className="flex items-center gap-1 text-[10px] text-zinc-600 bg-zinc-800 px-2 py-0.5 rounded-full">
            <BookOpen className="w-3 h-3" /> CMD: {scene.cmdSource}
          </span>
        )}
      </div>

      <div className="space-y-3">
        {/* Voiceover */}
        <div>
          <label className="text-xs font-medium text-sky-400/70 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Mic className="w-3 h-3" /> Voiceover
          </label>
          <InlineEdit
            value={scene.voiceover}
            multiline
            onSave={(v) => onFieldSave(`${pathPrefix}.scenes.${index}.voiceover`, v)}
          />
        </div>

        {/* Visual Description */}
        <div>
          <label className="text-xs font-medium text-amber-400/70 uppercase tracking-wider mb-1 flex items-center gap-1">
            <Eye className="w-3 h-3" /> Visual Description
          </label>
          <InlineEdit
            value={scene.visualDescription}
            multiline
            onSave={(v) => onFieldSave(`${pathPrefix}.scenes.${index}.visualDescription`, v)}
          />
        </div>

        {/* Text Overlay */}
        {scene.textOverlay && (
          <div>
            <label className="text-xs font-medium text-purple-400/70 uppercase tracking-wider mb-1 flex items-center gap-1">
              <Type className="w-3 h-3" /> Text Overlay
            </label>
            <InlineEdit
              value={scene.textOverlay}
              onSave={(v) => onFieldSave(`${pathPrefix}.scenes.${index}.textOverlay`, v)}
            />
          </div>
        )}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Script Tab Content
// ---------------------------------------------------------------------------

function ScriptTabContent({ scenes, totalDuration, expectedDuration, pathPrefix, onFieldSave, copied, onCopy }: {
  scenes: VideoScene[];
  totalDuration: number;
  expectedDuration: number;
  pathPrefix: string;
  onFieldSave: (path: string, value: string) => void;
  copied: string | null;
  onCopy: (text: string, key: string) => void;
}) {
  // Build export text
  const exportText = useMemo(() => {
    const lines: string[] = [];
    lines.push(`VIDEO SCRIPT — ${expectedDuration}s ${expectedDuration <= 30 ? 'TEASER' : 'EXPLAINER'}`);
    lines.push(`Total Duration: ${totalDuration}s`);
    lines.push('='.repeat(50));
    scenes.forEach((scene, i) => {
      lines.push('');
      lines.push(`SCENE ${i + 1} [${scene.duration}s]`);
      lines.push(`VO: ${scene.voiceover}`);
      lines.push(`VISUAL: ${scene.visualDescription}`);
      if (scene.textOverlay) lines.push(`TEXT: ${scene.textOverlay}`);
      if (scene.cmdSource) lines.push(`REF: ${scene.cmdSource}`);
    });
    return lines.join('\n');
  }, [scenes, totalDuration, expectedDuration]);

  return (
    <div className="space-y-4">
      {/* Timeline */}
      <Timeline scenes={scenes} totalDuration={totalDuration} expectedDuration={expectedDuration} />

      {/* Actions */}
      <div className="flex items-center justify-end gap-2">
        <CopyButton text={exportText} copyKey={`${pathPrefix}-all`} copied={copied} onCopy={onCopy} />
        <button
          onClick={() => {
            const blob = new Blob([exportText], { type: 'text/plain' });
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `script-${expectedDuration}s.txt`;
            a.click();
            URL.revokeObjectURL(url);
          }}
          className="flex items-center gap-1 px-3 py-1.5 rounded text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-emerald-400 transition-colors"
        >
          <FileDown className="w-3 h-3" /> Export Script
        </button>
      </div>

      {/* Scene Cards */}
      <div className="space-y-3">
        {scenes.map((scene, i) => (
          <SceneCard
            key={i}
            scene={scene}
            index={i}
            pathPrefix={pathPrefix}
            onFieldSave={onFieldSave}
            copied={copied}
            onCopy={onCopy}
          />
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

type VideoTab = 'teaser30s' | 'explainer60s';

interface VideoScriptEditorProps {
  data: VideoScriptAsset;
  onFieldSave: (path: string, value: string) => void;
}

export default function VideoScriptEditor({ data, onFieldSave }: VideoScriptEditorProps) {
  const [activeTab, setActiveTab] = useState<VideoTab>('teaser30s');
  const { copied, copy } = useCopyToClipboard();

  const tabs: { id: VideoTab; label: string; duration: number }[] = [
    { id: 'teaser30s', label: '30s Teaser', duration: 30 },
    { id: 'explainer60s', label: '60s Explainer', duration: 60 },
  ];

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex border-b border-zinc-800">
        {tabs.map(({ id, label, duration }) => {
          const scriptData = data[id];
          const sceneCount = scriptData.scenes.length;
          return (
            <button
              key={id}
              onClick={() => setActiveTab(id)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors
                ${activeTab === id
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-zinc-500 hover:text-zinc-300'
                }`}
            >
              <Video className="w-3.5 h-3.5" />
              {label}
              <span className="text-[10px] text-zinc-600 ml-1">({sceneCount} scenes)</span>
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      {activeTab === 'teaser30s' && (
        <ScriptTabContent
          scenes={data.teaser30s.scenes}
          totalDuration={data.teaser30s.totalDuration}
          expectedDuration={30}
          pathPrefix="teaser30s"
          onFieldSave={onFieldSave}
          copied={copied}
          onCopy={copy}
        />
      )}
      {activeTab === 'explainer60s' && (
        <ScriptTabContent
          scenes={data.explainer60s.scenes}
          totalDuration={data.explainer60s.totalDuration}
          expectedDuration={60}
          pathPrefix="explainer60s"
          onFieldSave={onFieldSave}
          copied={copied}
          onCopy={copy}
        />
      )}
    </div>
  );
}
