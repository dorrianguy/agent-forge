// =============================================================================
// LaunchAssetPanel — View / Edit a Selected Asset
// =============================================================================

'use client';

import React, { useState, useCallback, useMemo } from 'react';
import {
  FileText,
  Mail,
  Newspaper,
  Share2,
  Edit3,
  Save,
  X,
  ChevronDown,
  ChevronRight,
  Clock,
  Cpu,
  Hash,
  RefreshCw,
  Loader2,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  Target,
  Users,
  Video,
} from 'lucide-react';
import type {
  AssetType,
  GeneratedAssets,
  LaunchAsset,
  LandingPageAsset,
  EmailSequenceAsset,
  PressReleaseAsset,
  SocialPostsAsset,
  AssetMetadata,
  PropagationResult,
} from '@/lib/launch/types';
import { ASSET_LABELS, getTransitiveDependents } from '@/lib/launch/propagator';
import { useLaunchStore } from './LaunchWorkflow';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ASSET_ICONS: Record<AssetType, React.ComponentType<{ className?: string }>> = {
  landingPage: FileText,
  emailSequence: Mail,
  pressRelease: Newspaper,
  socialPosts: Share2,
  salesEnablement: Target,
  partnerKit: Users,
  videoScript: Video,
};

interface CollapsibleProps {
  title: string;
  defaultOpen?: boolean;
  children: React.ReactNode;
}

function Collapsible({ title, defaultOpen = true, children }: CollapsibleProps) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-zinc-800 rounded-lg overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2 px-4 py-2.5 bg-zinc-900/50 hover:bg-zinc-800/50 transition-colors text-left"
      >
        {open ? (
          <ChevronDown className="w-4 h-4 text-zinc-500" />
        ) : (
          <ChevronRight className="w-4 h-4 text-zinc-500" />
        )}
        <span className="text-sm font-medium text-zinc-200">{title}</span>
      </button>
      {open && <div className="p-4 space-y-3">{children}</div>}
    </div>
  );
}

interface EditableFieldProps {
  label: string;
  value: string;
  multiline?: boolean;
  onSave?: (value: string) => void;
}

function EditableField({ label, value, multiline = false, onSave }: EditableFieldProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(value);

  const save = () => {
    onSave?.(draft);
    setEditing(false);
  };

  const cancel = () => {
    setDraft(value);
    setEditing(false);
  };

  return (
    <div className="group">
      <div className="flex items-center justify-between mb-1">
        <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider">{label}</label>
        {!editing && onSave && (
          <button
            onClick={() => setEditing(true)}
            className="opacity-0 group-hover:opacity-100 text-zinc-500 hover:text-blue-400 transition-all"
          >
            <Edit3 className="w-3.5 h-3.5" />
          </button>
        )}
      </div>
      {editing ? (
        <div className="space-y-2">
          {multiline ? (
            <textarea
              className="w-full bg-zinc-800 border border-zinc-700 rounded-lg px-3 py-2 text-sm text-zinc-100 
                focus:outline-none focus:ring-2 focus:ring-blue-500/50 resize-none"
              rows={4}
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
            <button
              onClick={save}
              className="flex items-center gap-1 px-2.5 py-1 rounded text-xs bg-blue-600 hover:bg-blue-500 text-white transition-colors"
            >
              <Save className="w-3 h-3" /> Save
            </button>
            <button
              onClick={cancel}
              className="flex items-center gap-1 px-2.5 py-1 rounded text-xs bg-zinc-700 hover:bg-zinc-600 text-zinc-300 transition-colors"
            >
              <X className="w-3 h-3" /> Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="text-sm text-zinc-200 whitespace-pre-wrap leading-relaxed">
          {value || <span className="italic text-zinc-600">Empty</span>}
        </div>
      )}
    </div>
  );
}

function MetadataBadge({ metadata }: { metadata: AssetMetadata | null }) {
  if (!metadata) return null;
  return (
    <div className="flex items-center gap-4 text-xs text-zinc-500 py-2 px-3 bg-zinc-900/50 rounded-lg">
      <span className="flex items-center gap-1">
        <Cpu className="w-3 h-3" /> {metadata.model}
      </span>
      <span className="flex items-center gap-1">
        <Clock className="w-3 h-3" /> {(metadata.durationMs / 1000).toFixed(1)}s
      </span>
      <span className="flex items-center gap-1">
        <Hash className="w-3 h-3" /> v{metadata.version}
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Stale Warning Banner
// ---------------------------------------------------------------------------

function StaleWarningBanner({ assetType }: { assetType: AssetType }) {
  const staleAssets = useLaunchStore((s) => s.staleAssets);
  const isStale = staleAssets.has(assetType);

  if (!isStale) return null;

  return (
    <div className="mx-4 mt-2 flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
      <AlertTriangle className="w-4 h-4 text-amber-400 flex-shrink-0" />
      <span className="text-xs text-amber-300">
        This asset may be out of date — an upstream asset was edited. Consider regenerating.
      </span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Downstream Impact Banner + Regenerate Button
// ---------------------------------------------------------------------------

function DownstreamImpactBanner({
  assetType,
  onRegenerateDownstream,
}: {
  assetType: AssetType;
  onRegenerateDownstream: () => void;
}) {
  const staleAssets = useLaunchStore((s) => s.staleAssets);
  const downstream = useMemo(() => getTransitiveDependents(assetType), [assetType]);

  // Only show if there are downstream assets that are stale due to this edit
  const affectedStale = downstream.filter((d) => staleAssets.has(d));
  if (affectedStale.length === 0) return null;

  return (
    <div className="mx-4 mt-2 space-y-2">
      <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-blue-500/10 border border-blue-500/30">
        <ArrowRight className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <p className="text-xs text-blue-300 font-medium">
            Changes will affect:
          </p>
          <div className="flex flex-wrap gap-1.5 mt-1">
            {affectedStale.map((dep) => (
              <span
                key={dep}
                className="text-[11px] bg-blue-500/20 text-blue-300 px-2 py-0.5 rounded-full"
              >
                {ASSET_LABELS[dep]}
              </span>
            ))}
          </div>
        </div>
      </div>
      <button
        onClick={onRegenerateDownstream}
        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium
          bg-amber-600/20 text-amber-300 hover:bg-amber-600/30 border border-amber-500/30 transition-colors"
      >
        <RefreshCw className="w-3.5 h-3.5" />
        Regenerate Downstream ({affectedStale.length} asset{affectedStale.length !== 1 ? 's' : ''})
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Asset-Specific Renderers (with save callbacks)
// ---------------------------------------------------------------------------

function LandingPageView({
  data,
  onFieldSave,
}: {
  data: LandingPageAsset;
  onFieldSave: (path: string, value: string) => void;
}) {
  return (
    <div className="space-y-4">
      <Collapsible title="Hero Section">
        <EditableField label="Headline" value={data.hero.headline} onSave={(v) => onFieldSave('hero.headline', v)} />
        <EditableField label="Subheadline" value={data.hero.subheadline} onSave={(v) => onFieldSave('hero.subheadline', v)} />
        <EditableField label="CTA Text" value={data.hero.ctaText} onSave={(v) => onFieldSave('hero.ctaText', v)} />
        <EditableField label="CTA URL" value={data.hero.ctaUrl} onSave={(v) => onFieldSave('hero.ctaUrl', v)} />
      </Collapsible>

      <Collapsible title="Feature Sections">
        {data.featureSections.map((section, i) => (
          <div key={i} className="border-l-2 border-blue-500/30 pl-3 space-y-2 mb-3">
            <EditableField
              label={`Feature: ${section.featureName}`}
              value={section.headline}
              onSave={(v) => onFieldSave(`featureSections.${i}.headline`, v)}
            />
            <EditableField
              label="Description"
              value={section.description}
              multiline
              onSave={(v) => onFieldSave(`featureSections.${i}.description`, v)}
            />
            <EditableField
              label="Benefit"
              value={section.benefit}
              onSave={(v) => onFieldSave(`featureSections.${i}.benefit`, v)}
            />
          </div>
        ))}
      </Collapsible>

      <Collapsible title="Social Proof">
        <EditableField
          label="Section Headline"
          value={data.socialProof.headline}
          onSave={(v) => onFieldSave('socialProof.headline', v)}
        />
        {data.socialProof.testimonials.map((t, i) => (
          <div key={i} className="border-l-2 border-green-500/30 pl-3 space-y-1 mb-2">
            <EditableField
              label={`Quote by ${t.author}`}
              value={t.quote}
              multiline
              onSave={(v) => onFieldSave(`socialProof.testimonials.${i}.quote`, v)}
            />
          </div>
        ))}
        {data.socialProof.stats.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {data.socialProof.stats.map((stat, i) => (
              <span key={i} className="text-xs bg-zinc-800 text-zinc-300 px-2 py-1 rounded-full">
                {stat}
              </span>
            ))}
          </div>
        )}
      </Collapsible>

      <Collapsible title="FAQ" defaultOpen={false}>
        {data.faq.map((item, i) => (
          <div key={i} className="space-y-1 mb-3">
            <EditableField label={`Q${i + 1}`} value={item.question} onSave={(v) => onFieldSave(`faq.${i}.question`, v)} />
            <EditableField label="Answer" value={item.answer} multiline onSave={(v) => onFieldSave(`faq.${i}.answer`, v)} />
          </div>
        ))}
      </Collapsible>

      <Collapsible title="Closing CTA">
        <EditableField label="Headline" value={data.closingCta.headline} onSave={(v) => onFieldSave('closingCta.headline', v)} />
        <EditableField label="Subheadline" value={data.closingCta.subheadline} onSave={(v) => onFieldSave('closingCta.subheadline', v)} />
        <EditableField label="CTA Text" value={data.closingCta.ctaText} onSave={(v) => onFieldSave('closingCta.ctaText', v)} />
      </Collapsible>

      <Collapsible title="Meta / SEO" defaultOpen={false}>
        <EditableField label="Title" value={data.meta.title} onSave={(v) => onFieldSave('meta.title', v)} />
        <EditableField label="Description" value={data.meta.description} onSave={(v) => onFieldSave('meta.description', v)} />
        <EditableField label="OG Title" value={data.meta.ogTitle} onSave={(v) => onFieldSave('meta.ogTitle', v)} />
        <EditableField label="OG Description" value={data.meta.ogDescription} onSave={(v) => onFieldSave('meta.ogDescription', v)} />
      </Collapsible>
    </div>
  );
}

function EmailSequenceView({
  data,
  onFieldSave,
}: {
  data: EmailSequenceAsset;
  onFieldSave: (path: string, value: string) => void;
}) {
  return (
    <div className="space-y-4">
      <div className="text-sm text-zinc-400">
        {data.totalEmails} emails in sequence: <strong className="text-zinc-200">{data.sequenceName}</strong>
      </div>
      {data.emails.map((email, idx) => (
        <Collapsible key={email.id} title={`${email.sendDelay} — ${email.name}`}>
          <EditableField label="Subject" value={email.subject} onSave={(v) => onFieldSave(`emails.${idx}.subject`, v)} />
          <EditableField label="Preview Text" value={email.previewText} onSave={(v) => onFieldSave(`emails.${idx}.previewText`, v)} />
          <EditableField label="Body" value={email.body} multiline onSave={(v) => onFieldSave(`emails.${idx}.body`, v)} />
          <div className="flex gap-4">
            <EditableField label="CTA Text" value={email.ctaText} onSave={(v) => onFieldSave(`emails.${idx}.ctaText`, v)} />
            <EditableField label="CTA URL" value={email.ctaUrl} onSave={(v) => onFieldSave(`emails.${idx}.ctaUrl`, v)} />
          </div>
        </Collapsible>
      ))}
    </div>
  );
}

function PressReleaseView({
  data,
  onFieldSave,
}: {
  data: PressReleaseAsset;
  onFieldSave: (path: string, value: string) => void;
}) {
  return (
    <div className="space-y-4">
      <Collapsible title="Header">
        <EditableField label="Headline" value={data.headline} onSave={(v) => onFieldSave('headline', v)} />
        {data.subheadline && (
          <EditableField label="Subheadline" value={data.subheadline} onSave={(v) => onFieldSave('subheadline', v)} />
        )}
        <EditableField label="Dateline" value={data.dateline} onSave={(v) => onFieldSave('dateline', v)} />
      </Collapsible>

      <Collapsible title="Body">
        <EditableField label="Lede" value={data.lede} multiline onSave={(v) => onFieldSave('lede', v)} />
        {data.bodyParagraphs.map((para, i) => (
          <EditableField
            key={i}
            label={`Paragraph ${i + 1}`}
            value={para}
            multiline
            onSave={(v) => onFieldSave(`bodyParagraphs.${i}`, v)}
          />
        ))}
      </Collapsible>

      <Collapsible title="Quotes">
        {data.quotes.map((q, i) => (
          <div key={i} className="border-l-2 border-amber-500/30 pl-3 space-y-1 mb-3">
            <EditableField label="Quote" value={q.text} multiline onSave={(v) => onFieldSave(`quotes.${i}.text`, v)} />
            <EditableField label="Attribution" value={q.attribution} onSave={(v) => onFieldSave(`quotes.${i}.attribution`, v)} />
          </div>
        ))}
      </Collapsible>

      <Collapsible title="Footer" defaultOpen={false}>
        <EditableField label="Availability" value={data.availability} multiline onSave={(v) => onFieldSave('availability', v)} />
        <EditableField label="Boilerplate" value={data.boilerplate} multiline onSave={(v) => onFieldSave('boilerplate', v)} />
        <EditableField label="Contact Name" value={data.contactInfo.name} onSave={(v) => onFieldSave('contactInfo.name', v)} />
        <EditableField label="Contact Email" value={data.contactInfo.email} onSave={(v) => onFieldSave('contactInfo.email', v)} />
        <EditableField label="Website" value={data.contactInfo.website} onSave={(v) => onFieldSave('contactInfo.website', v)} />
      </Collapsible>
    </div>
  );
}

function SocialPostsView({
  data,
  onFieldSave,
}: {
  data: SocialPostsAsset;
  onFieldSave: (path: string, value: string) => void;
}) {
  return (
    <div className="space-y-4">
      {data.twitter && (
        <Collapsible title="🐦 Twitter / X Thread">
          {data.twitter.tweets.map((tweet) => (
            <div key={tweet.order} className="border-l-2 border-sky-500/30 pl-3 mb-2">
              <EditableField
                label={`Tweet ${tweet.order}`}
                value={tweet.text}
                multiline
                onSave={(v) => onFieldSave(`twitter.tweets.${tweet.order - 1}.text`, v)}
              />
              <span className="text-xs text-zinc-600">{tweet.text.length}/280 chars</span>
            </div>
          ))}
        </Collapsible>
      )}

      {data.linkedin && (
        <Collapsible title="💼 LinkedIn">
          <EditableField
            label="Post"
            value={data.linkedin.text}
            multiline
            onSave={(v) => onFieldSave('linkedin.text', v)}
          />
          <div className="flex flex-wrap gap-1 mt-2">
            {data.linkedin.hashtags.map((tag, i) => (
              <span key={i} className="text-xs text-blue-400">#{tag}</span>
            ))}
          </div>
        </Collapsible>
      )}

      {data.producthunt && (
        <Collapsible title="🔶 Product Hunt">
          <EditableField label="Title" value={data.producthunt.title} onSave={(v) => onFieldSave('producthunt.title', v)} />
          <EditableField label="Tagline" value={data.producthunt.tagline} onSave={(v) => onFieldSave('producthunt.tagline', v)} />
          <span className="text-xs text-zinc-600">{data.producthunt.tagline.length}/60 chars</span>
          <EditableField label="Description" value={data.producthunt.description} multiline onSave={(v) => onFieldSave('producthunt.description', v)} />
          <EditableField label="First Comment" value={data.producthunt.firstComment} multiline onSave={(v) => onFieldSave('producthunt.firstComment', v)} />
          <div className="flex flex-wrap gap-1 mt-2">
            {data.producthunt.topics.map((topic, i) => (
              <span key={i} className="text-xs bg-orange-500/20 text-orange-300 px-2 py-0.5 rounded-full">{topic}</span>
            ))}
          </div>
        </Collapsible>
      )}

      {data.hackernews && (
        <Collapsible title="🟧 Hacker News">
          <EditableField label="Title" value={data.hackernews.title} onSave={(v) => onFieldSave('hackernews.title', v)} />
          <EditableField label="URL" value={data.hackernews.url} onSave={(v) => onFieldSave('hackernews.url', v)} />
          <EditableField label="Comment" value={data.hackernews.comment} multiline onSave={(v) => onFieldSave('hackernews.comment', v)} />
        </Collapsible>
      )}

      {data.instagram && (
        <Collapsible title="📸 Instagram">
          <EditableField
            label="Caption"
            value={data.instagram.caption}
            multiline
            onSave={(v) => onFieldSave('instagram.caption', v)}
          />
          <EditableField
            label="Alt Text"
            value={data.instagram.altText}
            onSave={(v) => onFieldSave('instagram.altText', v)}
          />
          <div className="flex flex-wrap gap-1 mt-2">
            {data.instagram.hashtags.map((tag, i) => (
              <span key={i} className="text-xs text-pink-400">#{tag}</span>
            ))}
          </div>
        </Collapsible>
      )}
    </div>
  );
}

// ---------------------------------------------------------------------------
// Deep Set Helper — set a nested property by dot-path on a deep-cloned object
// ---------------------------------------------------------------------------

function deepSet(obj: Record<string, unknown>, path: string, value: unknown): Record<string, unknown> {
  const clone = JSON.parse(JSON.stringify(obj)) as Record<string, unknown>;
  const parts = path.split('.');
  let current: Record<string, unknown> = clone;

  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    const nextKey = parts[i + 1];
    // If the next part is a number, ensure we have an array
    if (/^\d+$/.test(nextKey)) {
      if (!Array.isArray(current[key])) {
        current[key] = [];
      }
      current = current[key] as unknown as Record<string, unknown>;
    } else {
      if (typeof current[key] !== 'object' || current[key] === null) {
        current[key] = {};
      }
      current = current[key] as Record<string, unknown>;
    }
  }

  current[parts[parts.length - 1]] = value;
  return clone;
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

interface LaunchAssetPanelProps {
  assets: GeneratedAssets | null;
  selectedAsset: AssetType | null;
  onRegenerate?: (assetType: AssetType) => void;
}

export default function LaunchAssetPanel({
  assets,
  selectedAsset,
  onRegenerate,
}: LaunchAssetPanelProps) {
  const updateAssetContent = useLaunchStore((s) => s.updateAssetContent);
  const regenerateDownstream = useLaunchStore((s) => s.regenerateDownstream);
  const staleAssets = useLaunchStore((s) => s.staleAssets);
  const [isRegenerating, setIsRegenerating] = useState(false);

  // Handler for saving an individual field edit
  const handleFieldSave = useCallback(
    (path: string, value: string) => {
      if (!selectedAsset || !assets) return;

      const currentData = assets[selectedAsset].data;
      if (!currentData) return;

      // Deep-set the updated field on a clone of the asset data
      const updatedData = deepSet(currentData as Record<string, unknown>, path, value);
      updateAssetContent(selectedAsset, updatedData);
    },
    [selectedAsset, assets, updateAssetContent],
  );

  // Handler for regenerating downstream assets
  const handleRegenerateDownstream = useCallback(async () => {
    if (!selectedAsset) return;
    setIsRegenerating(true);
    try {
      await regenerateDownstream(selectedAsset);
    } finally {
      setIsRegenerating(false);
    }
  }, [selectedAsset, regenerateDownstream]);

  if (!selectedAsset || !assets) {
    return (
      <div className="h-full flex items-center justify-center text-zinc-600">
        <div className="text-center space-y-2">
          <FileText className="w-10 h-10 mx-auto opacity-40" />
          <p className="text-sm">Select an asset from the graph to view it</p>
        </div>
      </div>
    );
  }

  const asset = assets[selectedAsset];
  const Icon = ASSET_ICONS[selectedAsset];
  const isStale = staleAssets.has(selectedAsset);

  if (asset.status === 'pending') {
    return (
      <div className="h-full flex items-center justify-center text-zinc-600">
        <div className="text-center space-y-2">
          <Clock className="w-10 h-10 mx-auto opacity-40" />
          <p className="text-sm">This asset hasn&apos;t been generated yet</p>
        </div>
      </div>
    );
  }

  if (asset.status === 'generating') {
    return (
      <div className="h-full flex items-center justify-center text-amber-500">
        <div className="text-center space-y-2">
          <Loader2 className="w-10 h-10 mx-auto animate-spin" />
          <p className="text-sm">Generating…</p>
        </div>
      </div>
    );
  }

  if (asset.status === 'error') {
    return (
      <div className="h-full flex items-center justify-center text-red-500">
        <div className="text-center space-y-3">
          <AlertCircle className="w-10 h-10 mx-auto" />
          <p className="text-sm">Generation failed</p>
          <p className="text-xs text-zinc-500 max-w-xs">{asset.error}</p>
          {onRegenerate && (
            <button
              onClick={() => onRegenerate(selectedAsset)}
              className="flex items-center gap-1.5 mx-auto px-3 py-1.5 rounded-lg text-xs 
                bg-red-600/20 text-red-400 hover:bg-red-600/30 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Retry
            </button>
          )}
        </div>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-zinc-800 flex-shrink-0">
        <div className="flex items-center gap-2">
          <Icon className="w-5 h-5 text-blue-400" />
          <h3 className="text-sm font-semibold text-zinc-200">{ASSET_LABELS[selectedAsset]}</h3>
          {isStale && (
            <span className="flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] bg-amber-500/20 text-amber-400 border border-amber-500/30">
              <AlertTriangle className="w-3 h-3" /> Stale
            </span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {isRegenerating && (
            <span className="flex items-center gap-1 text-xs text-amber-400">
              <Loader2 className="w-3 h-3 animate-spin" /> Regenerating…
            </span>
          )}
          {onRegenerate && (
            <button
              onClick={() => onRegenerate(selectedAsset)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs
                text-zinc-400 hover:text-blue-400 hover:bg-zinc-800 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Regenerate
            </button>
          )}
        </div>
      </div>

      {/* Stale Warning */}
      <StaleWarningBanner assetType={selectedAsset} />

      {/* Downstream Impact + Regenerate Button */}
      <DownstreamImpactBanner
        assetType={selectedAsset}
        onRegenerateDownstream={handleRegenerateDownstream}
      />

      {/* Metadata */}
      <div className="px-4 py-2 flex-shrink-0">
        <MetadataBadge metadata={asset.metadata} />
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-4">
        {selectedAsset === 'landingPage' && asset.data && (
          <LandingPageView
            data={asset.data as LandingPageAsset}
            onFieldSave={handleFieldSave}
          />
        )}
        {selectedAsset === 'emailSequence' && asset.data && (
          <EmailSequenceView
            data={asset.data as EmailSequenceAsset}
            onFieldSave={handleFieldSave}
          />
        )}
        {selectedAsset === 'pressRelease' && asset.data && (
          <PressReleaseView
            data={asset.data as PressReleaseAsset}
            onFieldSave={handleFieldSave}
          />
        )}
        {selectedAsset === 'socialPosts' && asset.data && (
          <SocialPostsView
            data={asset.data as SocialPostsAsset}
            onFieldSave={handleFieldSave}
          />
        )}
      </div>
    </div>
  );
}
