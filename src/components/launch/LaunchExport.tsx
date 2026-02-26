// =============================================================================
// LaunchExport — Export Options (with ZIP support via jszip)
// =============================================================================

'use client';

import React, { useState, useCallback } from 'react';
import JSZip from 'jszip';
import {
  Download,
  Copy,
  FileText,
  Archive,
  Check,
  Mail,
  Newspaper,
  Share2,
  Briefcase,
  Users,
  Video,
} from 'lucide-react';
import type {
  AssetType,
  GeneratedAssets,
  LaunchBrief,
  LandingPageAsset,
  EmailSequenceAsset,
  PressReleaseAsset,
  SocialPostsAsset,
  ValidationResult,
} from '@/src/lib/launch/types';
import { ASSET_LABELS } from '@/src/lib/launch/propagator';

// ---------------------------------------------------------------------------
// Markdown Formatters
// ---------------------------------------------------------------------------

function landingPageToMarkdown(data: LandingPageAsset): string {
  let md = `---\nasset: landing-page\ngenerated: ${new Date().toISOString()}\n---\n\n`;
  md += `# ${data.hero.headline}\n\n`;
  md += `> ${data.hero.subheadline}\n\n`;
  md += `[${data.hero.ctaText}](${data.hero.ctaUrl})\n\n`;
  md += `---\n\n`;

  md += `## Features\n\n`;
  for (const section of data.featureSections) {
    md += `### ${section.featureName}\n\n`;
    md += `**${section.headline}**\n\n`;
    md += `${section.description}\n\n`;
    md += `*${section.benefit}*\n\n`;
  }

  md += `## Social Proof\n\n`;
  md += `### ${data.socialProof.headline}\n\n`;
  for (const t of data.socialProof.testimonials) {
    md += `> "${t.quote}"\n> — ${t.author}${t.title ? `, ${t.title}` : ''}${t.company ? ` at ${t.company}` : ''}\n\n`;
  }
  if (data.socialProof.stats.length > 0) {
    md += data.socialProof.stats.map((s) => `- ${s}`).join('\n') + '\n\n';
  }

  md += `## FAQ\n\n`;
  for (const faq of data.faq) {
    md += `**Q: ${faq.question}**\n\n`;
    md += `${faq.answer}\n\n`;
  }

  md += `---\n\n`;
  md += `## ${data.closingCta.headline}\n\n`;
  md += `${data.closingCta.subheadline}\n\n`;
  md += `[${data.closingCta.ctaText}](${data.closingCta.ctaUrl})\n\n`;

  md += `---\n\n`;
  md += `### SEO Metadata\n\n`;
  md += `| Field | Value |\n|---|---|\n`;
  md += `| Title | ${data.meta.title} |\n`;
  md += `| Description | ${data.meta.description} |\n`;
  md += `| OG Title | ${data.meta.ogTitle} |\n`;
  md += `| OG Description | ${data.meta.ogDescription} |\n`;
  md += `| Twitter Card | ${data.meta.twitterCard} |\n`;

  return md;
}

function singleEmailToMarkdown(email: EmailSequenceAsset['emails'][number], sequenceName: string): string {
  let md = `---\nasset: email-sequence\nsequence: ${sequenceName}\nemail: ${email.order}\nname: ${email.name}\nsend-delay: ${email.sendDelay}\ngenerated: ${new Date().toISOString()}\n---\n\n`;
  md += `# ${email.name}\n\n`;
  md += `**Subject:** ${email.subject}\n\n`;
  md += `**Preview Text:** ${email.previewText}\n\n`;
  md += `**Send Timing:** ${email.sendDelay}\n\n`;
  md += `---\n\n`;
  md += `${email.body}\n\n`;
  md += `---\n\n`;
  md += `**CTA:** [${email.ctaText}](${email.ctaUrl})\n`;
  return md;
}

function emailSequenceToMarkdown(data: EmailSequenceAsset): string {
  let md = `---\nasset: email-sequence\ngenerated: ${new Date().toISOString()}\n---\n\n`;
  md += `# ${data.sequenceName}\n\n`;
  md += `${data.totalEmails} emails in this sequence.\n\n`;

  for (const email of data.emails) {
    md += `---\n\n`;
    md += `## Email ${email.order}: ${email.name} (${email.sendDelay})\n\n`;
    md += `**Subject:** ${email.subject}\n`;
    md += `**Preview:** ${email.previewText}\n\n`;
    md += `${email.body}\n\n`;
    md += `**CTA:** [${email.ctaText}](${email.ctaUrl})\n\n`;
  }

  return md;
}

function pressReleaseToMarkdown(data: PressReleaseAsset): string {
  let md = `---\nasset: press-release\ngenerated: ${new Date().toISOString()}\n---\n\n`;
  md += `# ${data.headline}\n\n`;
  if (data.subheadline) md += `## ${data.subheadline}\n\n`;
  md += `*${data.dateline}*\n\n`;
  md += `${data.lede}\n\n`;

  for (const para of data.bodyParagraphs) {
    md += `${para}\n\n`;
  }

  for (const quote of data.quotes) {
    md += `> "${quote.text}"\n> — ${quote.attribution}\n\n`;
  }

  md += `**Availability:** ${data.availability}\n\n`;
  md += `---\n\n`;
  md += `**About:** ${data.boilerplate}\n\n`;
  md += `### Press Contact\n\n`;
  md += `- **Name:** ${data.contactInfo.name}\n`;
  md += `- **Email:** ${data.contactInfo.email}\n`;
  if (data.contactInfo.phone) md += `- **Phone:** ${data.contactInfo.phone}\n`;
  md += `- **Website:** ${data.contactInfo.website}\n`;

  return md;
}

function twitterThreadToMarkdown(data: SocialPostsAsset): string {
  if (!data.twitter) return '';
  let md = `---\nasset: social-twitter\ngenerated: ${new Date().toISOString()}\n---\n\n`;
  md += `# Twitter / X Thread\n\n`;
  for (const tweet of data.twitter.tweets) {
    md += `### Tweet ${tweet.order}\n\n`;
    md += `${tweet.text}\n\n`;
    md += `*${tweet.text.length}/280 characters${tweet.hasMedia ? ' • Has media' : ''}*\n\n`;
  }
  return md;
}

function linkedinToMarkdown(data: SocialPostsAsset): string {
  if (!data.linkedin) return '';
  let md = `---\nasset: social-linkedin\ngenerated: ${new Date().toISOString()}\n---\n\n`;
  md += `# LinkedIn Post\n\n`;
  md += `${data.linkedin.text}\n\n`;
  md += `**Hashtags:** ${data.linkedin.hashtags.map((h) => `#${h}`).join(' ')}\n`;
  return md;
}

function producthuntToMarkdown(data: SocialPostsAsset): string {
  if (!data.producthunt) return '';
  let md = `---\nasset: social-producthunt\ngenerated: ${new Date().toISOString()}\n---\n\n`;
  md += `# Product Hunt Launch\n\n`;
  md += `**Title:** ${data.producthunt.title}\n\n`;
  md += `**Tagline:** ${data.producthunt.tagline}\n\n`;
  md += `## Description\n\n${data.producthunt.description}\n\n`;
  md += `## First Comment\n\n${data.producthunt.firstComment}\n\n`;
  md += `**Topics:** ${data.producthunt.topics.join(', ')}\n`;
  return md;
}

function hackernewsToMarkdown(data: SocialPostsAsset): string {
  if (!data.hackernews) return '';
  let md = `---\nasset: social-hackernews\ngenerated: ${new Date().toISOString()}\n---\n\n`;
  md += `# Hacker News Post\n\n`;
  md += `**Title:** ${data.hackernews.title}\n\n`;
  md += `**URL:** ${data.hackernews.url}\n\n`;
  md += `## Comment\n\n${data.hackernews.comment}\n`;
  return md;
}

function socialPostsToMarkdown(data: SocialPostsAsset): string {
  let md = `---\nasset: social-posts\ngenerated: ${new Date().toISOString()}\n---\n\n`;
  md += `# Social Launch Posts\n\n`;

  if (data.twitter) {
    md += `## Twitter / X Thread\n\n`;
    for (const tweet of data.twitter.tweets) {
      md += `**Tweet ${tweet.order}:**\n${tweet.text}\n\n`;
    }
  }

  if (data.linkedin) {
    md += `## LinkedIn Post\n\n`;
    md += `${data.linkedin.text}\n\n`;
    md += `Hashtags: ${data.linkedin.hashtags.map((h) => `#${h}`).join(' ')}\n\n`;
  }

  if (data.producthunt) {
    md += `## Product Hunt\n\n`;
    md += `**Title:** ${data.producthunt.title}\n`;
    md += `**Tagline:** ${data.producthunt.tagline}\n\n`;
    md += `**Description:**\n${data.producthunt.description}\n\n`;
    md += `**First Comment:**\n${data.producthunt.firstComment}\n\n`;
    md += `Topics: ${data.producthunt.topics.join(', ')}\n\n`;
  }

  if (data.hackernews) {
    md += `## Hacker News\n\n`;
    md += `**Title:** ${data.hackernews.title}\n`;
    md += `**URL:** ${data.hackernews.url}\n\n`;
    md += `**Comment:**\n${data.hackernews.comment}\n\n`;
  }

  if (data.instagram) {
    md += `## Instagram\n\n`;
    md += `**Caption:**\n${data.instagram.caption}\n\n`;
    md += `Hashtags: ${data.instagram.hashtags.map((h) => `#${h}`).join(' ')}\n\n`;
  }

  return md;
}

// ---------------------------------------------------------------------------
// Validation Report Formatter
// ---------------------------------------------------------------------------

function validationToMarkdown(results: ValidationResult[]): string {
  let md = `---\nasset: validation-report\ngenerated: ${new Date().toISOString()}\n---\n\n`;
  md += `# Validation Report\n\n`;

  const errors = results.filter((r) => r.severity === 'error');
  const warnings = results.filter((r) => r.severity === 'warning');
  const passes = results.filter((r) => r.severity === 'pass');

  md += `**Summary:** ${errors.length} errors, ${warnings.length} warnings, ${passes.length} passed\n\n`;

  if (errors.length > 0) {
    md += `## ❌ Errors\n\n`;
    for (const r of errors) {
      md += `- **[${r.type}]** ${r.message}`;
      if (r.asset) md += ` *(${ASSET_LABELS[r.asset]})*`;
      if (r.expected && r.actual) md += `\n  - Expected: \`${r.expected}\` → Got: \`${r.actual}\``;
      md += '\n';
    }
    md += '\n';
  }

  if (warnings.length > 0) {
    md += `## ⚠️ Warnings\n\n`;
    for (const r of warnings) {
      md += `- **[${r.type}]** ${r.message}`;
      if (r.asset) md += ` *(${ASSET_LABELS[r.asset]})*`;
      md += '\n';
    }
    md += '\n';
  }

  if (passes.length > 0) {
    md += `## ✅ Passed\n\n`;
    for (const r of passes) {
      md += `- **[${r.type}]** ${r.message}\n`;
    }
    md += '\n';
  }

  return md;
}

// ---------------------------------------------------------------------------
// Asset to Markdown Dispatcher
// ---------------------------------------------------------------------------

function assetToMarkdown(type: AssetType, assets: GeneratedAssets): string | null {
  const asset = assets[type];
  if (!asset.data) return null;

  switch (type) {
    case 'landingPage':
      return landingPageToMarkdown(asset.data as LandingPageAsset);
    case 'emailSequence':
      return emailSequenceToMarkdown(asset.data as EmailSequenceAsset);
    case 'pressRelease':
      return pressReleaseToMarkdown(asset.data as PressReleaseAsset);
    case 'socialPosts':
      return socialPostsToMarkdown(asset.data as SocialPostsAsset);
    default:
      return null;
  }
}

// ---------------------------------------------------------------------------
// Email Name Mapping
// ---------------------------------------------------------------------------

const EMAIL_NAMES: Record<number, string> = {
  1: 'announcement',
  2: 'feature-deep-dive',
  3: 'social-proof',
  4: 'early-bird',
  5: 'last-call',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const ASSET_EXPORT_ICONS: Record<AssetType, React.ComponentType<{ className?: string }>> = {
  landingPage: FileText,
  emailSequence: Mail,
  pressRelease: Newspaper,
  socialPosts: Share2,
  salesEnablement: Briefcase,
  partnerKit: Users,
  videoScript: Video,
};

interface LaunchExportProps {
  assets: GeneratedAssets | null;
  brief?: LaunchBrief | null;
  validationResults?: ValidationResult[];
}

export default function LaunchExport({ assets, brief, validationResults }: LaunchExportProps) {
  const [copiedAsset, setCopiedAsset] = useState<AssetType | null>(null);
  const [isZipping, setIsZipping] = useState(false);

  const copyToClipboard = useCallback(async (type: AssetType) => {
    if (!assets) return;
    const md = assetToMarkdown(type, assets);
    if (!md) return;

    try {
      await navigator.clipboard.writeText(md);
      setCopiedAsset(type);
      setTimeout(() => setCopiedAsset(null), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = md;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopiedAsset(type);
      setTimeout(() => setCopiedAsset(null), 2000);
    }
  }, [assets]);

  const downloadMarkdown = useCallback((type: AssetType) => {
    if (!assets) return;
    const md = assetToMarkdown(type, assets);
    if (!md) return;

    const blob = new Blob([md], { type: 'text/markdown' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${type}.md`;
    a.click();
    URL.revokeObjectURL(url);
  }, [assets]);

  const downloadAllAsZip = useCallback(async () => {
    if (!assets) return;

    setIsZipping(true);
    try {
      const zip = new JSZip();

      // --- Landing Page ---
      const landingData = assets.landingPage?.data as LandingPageAsset | null;
      if (landingData) {
        zip.file('landing-page.md', landingPageToMarkdown(landingData));
      }

      // --- Email Sequence (individual files) ---
      const emailData = assets.emailSequence?.data as EmailSequenceAsset | null;
      if (emailData) {
        for (const email of emailData.emails) {
          const emailName = EMAIL_NAMES[email.order] || `email-${email.order}`;
          zip.file(
            `email-${email.order}-${emailName}.md`,
            singleEmailToMarkdown(email, emailData.sequenceName),
          );
        }
      }

      // --- Press Release ---
      const pressData = assets.pressRelease?.data as PressReleaseAsset | null;
      if (pressData) {
        zip.file('press-release.md', pressReleaseToMarkdown(pressData));
      }

      // --- Social Posts (individual files in social/ folder) ---
      const socialData = assets.socialPosts?.data as SocialPostsAsset | null;
      if (socialData) {
        if (socialData.twitter) {
          zip.file('social/twitter-thread.md', twitterThreadToMarkdown(socialData));
        }
        if (socialData.linkedin) {
          zip.file('social/linkedin.md', linkedinToMarkdown(socialData));
        }
        if (socialData.producthunt) {
          zip.file('social/producthunt.md', producthuntToMarkdown(socialData));
        }
        if (socialData.hackernews) {
          zip.file('social/hackernews.md', hackernewsToMarkdown(socialData));
        }
      }

      // --- Launch Brief JSON ---
      if (brief) {
        zip.file('launch-brief.json', JSON.stringify(brief, null, 2));
      }

      // --- Validation Report ---
      if (validationResults && validationResults.length > 0) {
        zip.file('validation-report.md', validationToMarkdown(validationResults));
      }

      // Generate and trigger download
      const blob = await zip.generateAsync({ type: 'blob' });
      const productSlug = brief?.productName
        ? brief.productName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '')
        : 'launch';
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${productSlug}-launch-kit.zip`;
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setIsZipping(false);
    }
  }, [assets, brief, validationResults]);

  const downloadJson = useCallback(() => {
    if (!assets) return;
    const blob = new Blob([JSON.stringify(assets, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'launch-assets.json';
    a.click();
    URL.revokeObjectURL(url);
  }, [assets]);

  if (!assets) {
    return (
      <div className="h-full flex items-center justify-center text-zinc-600">
        <div className="text-center space-y-2">
          <Download className="w-10 h-10 mx-auto opacity-40" />
          <p className="text-sm">Generate assets first to export</p>
        </div>
      </div>
    );
  }

  const assetTypes: AssetType[] = ['landingPage', 'emailSequence', 'pressRelease', 'socialPosts'];
  const hasAny = assetTypes.some((t) => assets[t]?.data);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center gap-2 px-1">
        <Download className="w-5 h-5 text-blue-400" />
        <h3 className="text-sm font-semibold text-zinc-200">Export Assets</h3>
      </div>

      {/* Individual Assets */}
      <div className="space-y-2">
        {assetTypes.map((type) => {
          const asset = assets[type];
          const isReady = asset?.status === 'done' && asset.data;
          const Icon = ASSET_EXPORT_ICONS[type];
          const isCopied = copiedAsset === type;

          return (
            <div
              key={type}
              className={`flex items-center gap-3 p-3 rounded-lg border transition-colors
                ${isReady
                  ? 'border-zinc-800 bg-zinc-900/50'
                  : 'border-zinc-800/50 bg-zinc-900/20 opacity-50'
                }`}
            >
              <Icon className="w-4 h-4 text-zinc-400 flex-shrink-0" />
              <span className="text-sm text-zinc-200 flex-1">{ASSET_LABELS[type]}</span>

              {isReady && (
                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => copyToClipboard(type)}
                    className="p-1.5 rounded-md text-zinc-500 hover:text-blue-400 hover:bg-zinc-800 transition-colors"
                    title="Copy to clipboard"
                  >
                    {isCopied ? <Check className="w-3.5 h-3.5 text-green-400" /> : <Copy className="w-3.5 h-3.5" />}
                  </button>
                  <button
                    onClick={() => downloadMarkdown(type)}
                    className="p-1.5 rounded-md text-zinc-500 hover:text-blue-400 hover:bg-zinc-800 transition-colors"
                    title="Download as Markdown"
                  >
                    <Download className="w-3.5 h-3.5" />
                  </button>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bulk Export */}
      {hasAny && (
        <div className="space-y-2 pt-2 border-t border-zinc-800">
          <button
            onClick={downloadAllAsZip}
            disabled={isZipping}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium
              bg-blue-600 hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed text-white transition-colors"
          >
            <Archive className="w-4 h-4" />
            {isZipping ? 'Creating ZIP…' : 'Download All (ZIP)'}
          </button>

          <button
            onClick={downloadJson}
            className="w-full flex items-center justify-center gap-2 px-4 py-2.5 rounded-lg text-sm font-medium
              bg-zinc-800 hover:bg-zinc-700 text-zinc-200 transition-colors"
          >
            <FileText className="w-4 h-4" />
            Download Raw JSON
          </button>
        </div>
      )}
    </div>
  );
}
