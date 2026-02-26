// =============================================================================
// PartnerKitBuilder — Swipe Copy & Co-Branded One-Pager
// =============================================================================

'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  Copy,
  Check,
  Edit3,
  Save,
  X,
  Users,
  Twitter,
  Linkedin,
  Mail,
  FileText,
  LinkIcon,
  CheckCircle2,
  AlertTriangle,
  Image,
} from 'lucide-react';
import type { PartnerKitAsset } from '@/lib/launch/types';
import { useLaunchStore } from './LaunchWorkflow';

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

function CopyButton({ text, copyKey, copied, onCopy, size = 'sm' }: {
  text: string;
  copyKey: string;
  copied: string | null;
  onCopy: (text: string, key: string) => void;
  size?: 'sm' | 'md';
}) {
  const isCopied = copied === copyKey;
  return (
    <button
      onClick={(e) => { e.stopPropagation(); onCopy(text, copyKey); }}
      className={`flex items-center gap-1 rounded transition-colors
        ${size === 'md'
          ? 'px-3 py-1.5 text-xs bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-blue-400'
          : 'px-2 py-1 text-xs text-zinc-500 hover:text-blue-400 hover:bg-zinc-800'
        }`}
      title="Copy to clipboard"
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
// Main Component
// ---------------------------------------------------------------------------

interface PartnerKitBuilderProps {
  data: PartnerKitAsset;
  onFieldSave: (path: string, value: string) => void;
}

export default function PartnerKitBuilder({ data, onFieldSave }: PartnerKitBuilderProps) {
  const [partnerName, setPartnerName] = useState('');
  const [partnerLogoUrl, setPartnerLogoUrl] = useState('');
  const { copied, copy } = useCopyToClipboard();
  const brief = useLaunchStore((s) => s.brief);

  // URL validation — check if landing page URL is referenced
  const landingPageUrl = brief?.landingPageUrl ?? '';
  const allCopyTexts = useMemo(() => [
    ...data.swipeCopy.twitter,
    data.swipeCopy.linkedin,
    data.swipeCopy.emailBlurb,
    data.coBrandedOnePager.callToAction,
  ], [data]);

  const urlsMatch = useMemo(() => {
    if (!landingPageUrl) return true;
    return allCopyTexts.some((text) => text.includes(landingPageUrl));
  }, [allCopyTexts, landingPageUrl]);

  // Build full kit text
  const fullKitText = useMemo(() => {
    const lines: string[] = [];
    if (partnerName) lines.push(`Partner: ${partnerName}`, '');

    lines.push('=== SWIPE COPY ===', '');
    lines.push('--- Twitter Options ---');
    data.swipeCopy.twitter.forEach((t, i) => lines.push(`${i + 1}. ${t}`));
    lines.push('', '--- LinkedIn ---', data.swipeCopy.linkedin);
    lines.push('', '--- Email Blurb ---', data.swipeCopy.emailBlurb);

    lines.push('', '', '=== CO-BRANDED ONE-PAGER ===', '');
    lines.push('Positioning:', data.coBrandedOnePager.productPositioning);
    lines.push('', 'Proof Points:');
    data.coBrandedOnePager.proofPoints.forEach((p) => lines.push(`• ${p}`));
    lines.push('', `CTA: ${data.coBrandedOnePager.callToAction}`);

    return lines.join('\n');
  }, [data, partnerName]);

  return (
    <div className="space-y-6">
      {/* Partner Info Header */}
      <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-4 space-y-3">
        <div className="flex items-center gap-2 mb-2">
          <Users className="w-4 h-4 text-purple-400" />
          <h4 className="text-sm font-medium text-zinc-200">Partner / Affiliate Info</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1 block">Partner Name</label>
            <input
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100
                focus:outline-none focus:ring-2 focus:ring-purple-500/50 placeholder-zinc-600"
              placeholder="Enter partner company name…"
              value={partnerName}
              onChange={(e) => setPartnerName(e.target.value)}
            />
          </div>
          <div>
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1 block">Logo URL</label>
            <div className="flex items-center gap-2">
              <input
                className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100
                  focus:outline-none focus:ring-2 focus:ring-purple-500/50 placeholder-zinc-600"
                placeholder="https://…"
                value={partnerLogoUrl}
                onChange={(e) => setPartnerLogoUrl(e.target.value)}
              />
              {partnerLogoUrl && (
                <div className="flex-shrink-0 w-8 h-8 rounded bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                  <Image className="w-4 h-4 text-zinc-500" />
                </div>
              )}
            </div>
          </div>
        </div>

        {/* URL Validation Indicator */}
        <div className="flex items-center gap-2 pt-1">
          {urlsMatch ? (
            <span className="flex items-center gap-1.5 text-xs text-green-400">
              <CheckCircle2 className="w-3.5 h-3.5" /> URLs match landing page
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-xs text-amber-400">
              <AlertTriangle className="w-3.5 h-3.5" /> Some URLs may not match landing page
            </span>
          )}
        </div>
      </div>

      {/* Copy All Button */}
      <div className="flex justify-end">
        <CopyButton text={fullKitText} copyKey="full-kit" copied={copied} onCopy={copy} size="md" />
      </div>

      {/* Swipe Copy Section */}
      <div className="space-y-3">
        <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider flex items-center gap-2">
          <Copy className="w-3.5 h-3.5" /> Swipe Copy
        </h4>

        {/* Twitter Options */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-4 space-y-3">
          <div className="flex items-center gap-2 mb-1">
            <Twitter className="w-4 h-4 text-sky-400" />
            <span className="text-sm font-medium text-zinc-200">Tweet Options</span>
          </div>
          {data.swipeCopy.twitter.map((tweet, i) => (
            <div key={i} className="flex items-start gap-3 bg-zinc-800/50 rounded-lg p-3">
              <span className="flex-shrink-0 w-5 h-5 rounded-full bg-sky-500/20 text-sky-400 text-xs flex items-center justify-center mt-0.5">
                {i + 1}
              </span>
              <div className="flex-1">
                <InlineEdit value={tweet} multiline onSave={(v) => onFieldSave(`swipeCopy.twitter.${i}`, v)} />
                <span className={`text-xs mt-1 block ${tweet.length > 280 ? 'text-red-400' : 'text-zinc-600'}`}>
                  {tweet.length}/280 chars
                </span>
              </div>
              <CopyButton text={tweet} copyKey={`tweet-${i}`} copied={copied} onCopy={copy} />
            </div>
          ))}
        </div>

        {/* LinkedIn Post */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Linkedin className="w-4 h-4 text-blue-400" />
              <span className="text-sm font-medium text-zinc-200">LinkedIn Post</span>
            </div>
            <CopyButton text={data.swipeCopy.linkedin} copyKey="linkedin" copied={copied} onCopy={copy} />
          </div>
          <InlineEdit value={data.swipeCopy.linkedin} multiline onSave={(v) => onFieldSave('swipeCopy.linkedin', v)} />
        </div>

        {/* Email Blurb */}
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-4 space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Mail className="w-4 h-4 text-emerald-400" />
              <span className="text-sm font-medium text-zinc-200">Email Blurb</span>
            </div>
            <CopyButton text={data.swipeCopy.emailBlurb} copyKey="email-blurb" copied={copied} onCopy={copy} />
          </div>
          <InlineEdit value={data.swipeCopy.emailBlurb} multiline onSave={(v) => onFieldSave('swipeCopy.emailBlurb', v)} />
        </div>
      </div>

      {/* Co-Branded One-Pager Section */}
      <div className="space-y-3">
        <h4 className="text-xs font-medium text-zinc-500 uppercase tracking-wider flex items-center gap-2">
          <FileText className="w-3.5 h-3.5" /> Co-Branded One-Pager
          {partnerName && (
            <span className="text-purple-400 normal-case font-normal">
              with {partnerName}
            </span>
          )}
        </h4>

        <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-4 space-y-4">
          <div>
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1 block">Product Positioning</label>
            <InlineEdit
              value={data.coBrandedOnePager.productPositioning}
              multiline
              onSave={(v) => onFieldSave('coBrandedOnePager.productPositioning', v)}
            />
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2 block">Proof Points</label>
            <ul className="space-y-2">
              {data.coBrandedOnePager.proofPoints.map((pp, i) => (
                <li key={i} className="flex items-start gap-2">
                  <span className="flex-shrink-0 text-green-400 mt-1">•</span>
                  <InlineEdit
                    value={pp}
                    onSave={(v) => onFieldSave(`coBrandedOnePager.proofPoints.${i}`, v)}
                    className="flex-1"
                  />
                </li>
              ))}
            </ul>
          </div>

          <div>
            <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1 block">Call to Action</label>
            <InlineEdit
              value={data.coBrandedOnePager.callToAction}
              onSave={(v) => onFieldSave('coBrandedOnePager.callToAction', v)}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
