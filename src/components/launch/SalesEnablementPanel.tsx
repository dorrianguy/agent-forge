// =============================================================================
// SalesEnablementPanel — One-Pager / Objection Script / Demo Talking Points
// =============================================================================

'use client';

import React, { useState, useCallback } from 'react';
import {
  FileText,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Edit3,
  Save,
  X,
  Target,
  ShieldQuestion,
  Presentation,
  BadgeInfo,
} from 'lucide-react';
import type { SalesEnablementAsset } from '@/lib/launch/types';

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
  return (
    <button
      onClick={() => onCopy(text, copyKey)}
      className="flex items-center gap-1 px-2 py-1 rounded text-xs text-zinc-500 hover:text-blue-400 hover:bg-zinc-800 transition-colors"
      title="Copy to clipboard"
    >
      {copied === copyKey ? (
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
// Tab Types
// ---------------------------------------------------------------------------

type SETab = 'one-pager' | 'objection-script' | 'demo-talking-points';

// ---------------------------------------------------------------------------
// One-Pager Tab
// ---------------------------------------------------------------------------

function OnePagerTab({ data, onFieldSave, copied, onCopy }: {
  data: SalesEnablementAsset['onePager'];
  onFieldSave: (path: string, value: string) => void;
  copied: string | null;
  onCopy: (text: string, key: string) => void;
}) {
  const fullText = [
    data.headline,
    '',
    'Value Propositions:',
    ...data.valueProps.map((v, i) => `${i + 1}. ${v}`),
    '',
    'Proof Points:',
    ...data.proofPoints.map((p) => `• ${p}`),
    '',
    `CTA: ${data.callToAction}`,
    data.contactInfo ? `Contact: ${data.contactInfo}` : '',
  ].filter(Boolean).join('\n');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">One-Pager</h4>
        <CopyButton text={fullText} copyKey="one-pager-all" copied={copied} onCopy={onCopy} />
      </div>

      {/* Headline Card */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-4 space-y-3">
        <div>
          <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1 block">Headline</label>
          <InlineEdit value={data.headline} onSave={(v) => onFieldSave('onePager.headline', v)} />
        </div>

        <div>
          <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2 block">Value Propositions</label>
          <ul className="space-y-2">
            {data.valueProps.map((vp, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-blue-500/20 text-blue-400 text-xs flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <InlineEdit value={vp} onSave={(v) => onFieldSave(`onePager.valueProps.${i}`, v)} className="flex-1" />
              </li>
            ))}
          </ul>
        </div>

        <div>
          <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2 block">Proof Points</label>
          <ul className="space-y-2">
            {data.proofPoints.map((pp, i) => (
              <li key={i} className="flex items-start gap-2">
                <span className="flex-shrink-0 text-green-400 mt-1">•</span>
                <InlineEdit value={pp} onSave={(v) => onFieldSave(`onePager.proofPoints.${i}`, v)} className="flex-1" />
              </li>
            ))}
          </ul>
        </div>

        <div>
          <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1 block">Call to Action</label>
          <InlineEdit value={data.callToAction} onSave={(v) => onFieldSave('onePager.callToAction', v)} />
        </div>

        <div>
          <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1 block">Contact Info</label>
          <InlineEdit value={data.contactInfo} onSave={(v) => onFieldSave('onePager.contactInfo', v)} />
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Objection Script Tab
// ---------------------------------------------------------------------------

function ObjectionScriptTab({ data, onFieldSave, copied, onCopy }: {
  data: SalesEnablementAsset['objectionScript'];
  onFieldSave: (path: string, value: string) => void;
  copied: string | null;
  onCopy: (text: string, key: string) => void;
}) {
  const [expandedIdx, setExpandedIdx] = useState<number | null>(null);

  const fullText = data.map((obj, i) =>
    `Objection ${i + 1}: ${obj.objection}\nReframe: ${obj.reframe}\nProof: ${obj.proof}\nRedirect: ${obj.redirect}`
  ).join('\n\n');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Objection Handling Script</h4>
        <CopyButton text={fullText} copyKey="objections-all" copied={copied} onCopy={onCopy} />
      </div>

      <div className="space-y-2">
        {data.map((obj, i) => {
          const isOpen = expandedIdx === i;
          return (
            <div key={i} className="bg-zinc-900/60 border border-zinc-800 rounded-lg overflow-hidden">
              <button
                onClick={() => setExpandedIdx(isOpen ? null : i)}
                className="w-full flex items-center gap-2 px-4 py-3 hover:bg-zinc-800/50 transition-colors text-left"
              >
                {isOpen ? (
                  <ChevronDown className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                ) : (
                  <ChevronRight className="w-4 h-4 text-zinc-500 flex-shrink-0" />
                )}
                <ShieldQuestion className="w-4 h-4 text-amber-400 flex-shrink-0" />
                <span className="text-sm font-medium text-zinc-200 flex-1 truncate">&quot;{obj.objection}&quot;</span>
                <CopyButton
                  text={`Objection: ${obj.objection}\nReframe: ${obj.reframe}\nProof: ${obj.proof}\nRedirect: ${obj.redirect}`}
                  copyKey={`obj-${i}`}
                  copied={copied}
                  onCopy={onCopy}
                />
              </button>
              {isOpen && (
                <div className="px-4 pb-4 space-y-3 border-t border-zinc-800">
                  <div className="pt-3">
                    <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1 block">Objection</label>
                    <InlineEdit value={obj.objection} onSave={(v) => onFieldSave(`objectionScript.${i}.objection`, v)} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-blue-400/70 uppercase tracking-wider mb-1 block">Reframe</label>
                    <InlineEdit value={obj.reframe} multiline onSave={(v) => onFieldSave(`objectionScript.${i}.reframe`, v)} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-green-400/70 uppercase tracking-wider mb-1 block">Proof</label>
                    <InlineEdit value={obj.proof} multiline onSave={(v) => onFieldSave(`objectionScript.${i}.proof`, v)} />
                  </div>
                  <div>
                    <label className="text-xs font-medium text-purple-400/70 uppercase tracking-wider mb-1 block">Redirect</label>
                    <InlineEdit value={obj.redirect} multiline onSave={(v) => onFieldSave(`objectionScript.${i}.redirect`, v)} />
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Demo Talking Points Tab
// ---------------------------------------------------------------------------

function DemoTalkingPointsTab({ data, onFieldSave, copied, onCopy }: {
  data: SalesEnablementAsset['demoTalkingPoints'];
  onFieldSave: (path: string, value: string) => void;
  copied: string | null;
  onCopy: (text: string, key: string) => void;
}) {
  const fullText = data.map((tp, i) =>
    `${i + 1}. Claim: ${tp.claim}\n   Show: ${tp.showThis}\n   Say: ${tp.sayThis}\n   Metric: ${tp.metric}`
  ).join('\n\n');

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider">Demo Talking Points</h4>
        <CopyButton text={fullText} copyKey="demo-all" copied={copied} onCopy={onCopy} />
      </div>

      <ol className="space-y-3">
        {data.map((tp, i) => (
          <li key={i} className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center gap-3">
              <span className="flex-shrink-0 w-7 h-7 rounded-lg bg-blue-500/20 text-blue-400 text-sm font-bold flex items-center justify-center">
                {i + 1}
              </span>
              <div className="flex-1">
                <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1 block">Claim</label>
                <InlineEdit value={tp.claim} onSave={(v) => onFieldSave(`demoTalkingPoints.${i}.claim`, v)} />
              </div>
              <span className="flex-shrink-0 px-2.5 py-1 rounded-full bg-emerald-500/20 text-emerald-400 text-xs font-medium">
                {tp.metric}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pl-10">
              <div className="bg-zinc-800/50 rounded-lg p-3">
                <label className="text-xs font-medium text-amber-400/70 uppercase tracking-wider mb-1 block flex items-center gap-1">
                  <Presentation className="w-3 h-3" /> Show This
                </label>
                <InlineEdit value={tp.showThis} multiline onSave={(v) => onFieldSave(`demoTalkingPoints.${i}.showThis`, v)} />
              </div>
              <div className="bg-zinc-800/50 rounded-lg p-3">
                <label className="text-xs font-medium text-sky-400/70 uppercase tracking-wider mb-1 block flex items-center gap-1">
                  <BadgeInfo className="w-3 h-3" /> Say This
                </label>
                <InlineEdit value={tp.sayThis} multiline onSave={(v) => onFieldSave(`demoTalkingPoints.${i}.sayThis`, v)} />
              </div>
            </div>

            <div className="pl-10">
              <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1 block">Metric</label>
              <InlineEdit value={tp.metric} onSave={(v) => onFieldSave(`demoTalkingPoints.${i}.metric`, v)} />
            </div>
          </li>
        ))}
      </ol>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

interface SalesEnablementPanelProps {
  data: SalesEnablementAsset;
  onFieldSave: (path: string, value: string) => void;
}

export default function SalesEnablementPanel({ data, onFieldSave }: SalesEnablementPanelProps) {
  const [activeTab, setActiveTab] = useState<SETab>('one-pager');
  const { copied, copy } = useCopyToClipboard();

  const tabs: { id: SETab; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { id: 'one-pager', label: 'One-Pager', icon: Target },
    { id: 'objection-script', label: 'Objection Script', icon: ShieldQuestion },
    { id: 'demo-talking-points', label: 'Demo Points', icon: Presentation },
  ];

  return (
    <div className="space-y-4">
      {/* Tabs */}
      <div className="flex border-b border-zinc-800">
        {tabs.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            onClick={() => setActiveTab(id)}
            className={`flex items-center gap-1.5 px-4 py-2.5 text-xs font-medium transition-colors
              ${activeTab === id
                ? 'text-blue-400 border-b-2 border-blue-400'
                : 'text-zinc-500 hover:text-zinc-300'
              }`}
          >
            <Icon className="w-3.5 h-3.5" />
            {label}
          </button>
        ))}
      </div>

      {/* Tab Content */}
      {activeTab === 'one-pager' && (
        <OnePagerTab data={data.onePager} onFieldSave={onFieldSave} copied={copied} onCopy={copy} />
      )}
      {activeTab === 'objection-script' && (
        <ObjectionScriptTab data={data.objectionScript} onFieldSave={onFieldSave} copied={copied} onCopy={copy} />
      )}
      {activeTab === 'demo-talking-points' && (
        <DemoTalkingPointsTab data={data.demoTalkingPoints} onFieldSave={onFieldSave} copied={copied} onCopy={copy} />
      )}
    </div>
  );
}
