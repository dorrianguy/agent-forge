// =============================================================================
// Generation Pipeline Orchestrator
// =============================================================================
//
// Runs generators in dependency order:
//   1. Landing Page (depends on: brief)
//   2. Email Sequence (depends on: brief + landing page)
//   3. Press Release (depends on: brief + landing page)
//   4. Social Posts (depends on: brief + landing page + press release)
//   5. Sales Enablement (depends on: brief + landing page)
//   6. Partner Kit (depends on: brief + landing page + social posts)
//   7. Video Script (depends on: brief + landing page)
//
// Each step receives the brief PLUS all previously generated assets as context.
// =============================================================================

import type {
  LaunchBrief,
  GeneratedAssets,
  PipelineContext,
  PipelineOptions,
  PipelineProgress,
  AssetType,
  LaunchAsset,
} from './types';

import { generateLandingPage } from './generators/landingPage';
import { generateEmailSequence } from './generators/emailSequence';
import { generatePressRelease } from './generators/pressRelease';
import { generateSocialPosts } from './generators/socialPosts';
import { generateSalesEnablement } from './generators/salesEnablement';
import { generatePartnerKit } from './generators/partnerKit';
import { generateVideoScript } from './generators/videoScript';

/** The fixed execution order of the pipeline. */
export const PIPELINE_ORDER: AssetType[] = [
  'landingPage',
  'emailSequence',
  'pressRelease',
  'socialPosts',
  'salesEnablement',
  'partnerKit',
  'videoScript',
];

/** Create a blank GeneratedAssets structure. */
export function createEmptyAssets(): GeneratedAssets {
  const blank = <T,>(type: AssetType): LaunchAsset<T> => ({
    type,
    status: 'pending',
    data: null,
    metadata: null,
  });

  return {
    landingPage: blank('landingPage'),
    emailSequence: blank('emailSequence'),
    pressRelease: blank('pressRelease'),
    socialPosts: blank('socialPosts'),
    salesEnablement: blank('salesEnablement'),
    partnerKit: blank('partnerKit'),
    videoScript: blank('videoScript'),
  };
}

function emitProgress(
  options: PipelineOptions,
  stage: AssetType,
  status: PipelineProgress['status'],
  message: string,
) {
  options.onProgress?.({
    stage,
    status,
    message,
    timestamp: new Date().toISOString(),
  });
}

/**
 * Run the full generation pipeline.
 *
 * Executes each generator in dependency order, accumulating results into a
 * shared context so downstream generators can reference upstream output.
 */
export async function runPipeline(
  brief: LaunchBrief,
  options: PipelineOptions,
): Promise<GeneratedAssets> {
  const assets = createEmptyAssets();
  const context: PipelineContext = { brief, assets };

  // ---- Step 1: Landing Page ------------------------------------------------
  emitProgress(options, 'landingPage', 'generating', 'Generating landing page copy…');
  assets.landingPage = await generateLandingPage(context, options.provider, options.model);
  context.assets = assets;

  if (assets.landingPage.status === 'error') {
    emitProgress(options, 'landingPage', 'error', assets.landingPage.error || 'Landing page generation failed');
    // Continue pipeline — downstream generators handle missing data gracefully
  } else {
    emitProgress(options, 'landingPage', 'done', 'Landing page copy generated');
  }

  // ---- Step 2: Email Sequence ----------------------------------------------
  emitProgress(options, 'emailSequence', 'generating', 'Generating email sequence…');
  assets.emailSequence = await generateEmailSequence(context, options.provider, options.model);
  context.assets = assets;

  if (assets.emailSequence.status === 'error') {
    emitProgress(options, 'emailSequence', 'error', assets.emailSequence.error || 'Email sequence generation failed');
  } else {
    emitProgress(options, 'emailSequence', 'done', 'Email sequence generated');
  }

  // ---- Step 3: Press Release -----------------------------------------------
  emitProgress(options, 'pressRelease', 'generating', 'Generating press release…');
  assets.pressRelease = await generatePressRelease(context, options.provider, options.model);
  context.assets = assets;

  if (assets.pressRelease.status === 'error') {
    emitProgress(options, 'pressRelease', 'error', assets.pressRelease.error || 'Press release generation failed');
  } else {
    emitProgress(options, 'pressRelease', 'done', 'Press release generated');
  }

  // ---- Step 4: Social Posts ------------------------------------------------
  emitProgress(options, 'socialPosts', 'generating', 'Generating social posts…');
  assets.socialPosts = await generateSocialPosts(context, options.provider, options.model);
  context.assets = assets;

  if (assets.socialPosts.status === 'error') {
    emitProgress(options, 'socialPosts', 'error', assets.socialPosts.error || 'Social posts generation failed');
  } else {
    emitProgress(options, 'socialPosts', 'done', 'Social posts generated');
  }

  // ---- Step 5: Sales Enablement --------------------------------------------
  emitProgress(options, 'salesEnablement', 'generating', 'Generating sales enablement materials…');
  assets.salesEnablement = await generateSalesEnablement(context, options.provider, options.model);
  context.assets = assets;

  if (assets.salesEnablement.status === 'error') {
    emitProgress(options, 'salesEnablement', 'error', assets.salesEnablement.error || 'Sales enablement generation failed');
  } else {
    emitProgress(options, 'salesEnablement', 'done', 'Sales enablement materials generated');
  }

  // ---- Step 6: Partner Kit -------------------------------------------------
  emitProgress(options, 'partnerKit', 'generating', 'Generating partner kit…');
  assets.partnerKit = await generatePartnerKit(context, options.provider, options.model);
  context.assets = assets;

  if (assets.partnerKit.status === 'error') {
    emitProgress(options, 'partnerKit', 'error', assets.partnerKit.error || 'Partner kit generation failed');
  } else {
    emitProgress(options, 'partnerKit', 'done', 'Partner kit generated');
  }

  // ---- Step 7: Video Script ------------------------------------------------
  emitProgress(options, 'videoScript', 'generating', 'Generating video scripts…');
  assets.videoScript = await generateVideoScript(context, options.provider, options.model);
  context.assets = assets;

  if (assets.videoScript.status === 'error') {
    emitProgress(options, 'videoScript', 'error', assets.videoScript.error || 'Video script generation failed');
  } else {
    emitProgress(options, 'videoScript', 'done', 'Video scripts generated');
  }

  return assets;
}

/**
 * Re-generate a single asset (and optionally its dependents).
 *
 * Useful when the user edits an upstream asset and wants to propagate changes.
 */
export async function regenerateAsset(
  assetType: AssetType,
  brief: LaunchBrief,
  existingAssets: GeneratedAssets,
  options: PipelineOptions,
): Promise<GeneratedAssets> {
  const assets = { ...existingAssets };
  const context: PipelineContext = { brief, assets };

  const generators: Record<AssetType, () => Promise<void>> = {
    landingPage: async () => {
      emitProgress(options, 'landingPage', 'generating', 'Regenerating landing page…');
      assets.landingPage = await generateLandingPage(context, options.provider, options.model);
      if (assets.landingPage.metadata) {
        assets.landingPage.metadata.version =
          (existingAssets.landingPage.metadata?.version || 0) + 1;
      }
      emitProgress(options, 'landingPage', assets.landingPage.status, 'Landing page regenerated');
    },
    emailSequence: async () => {
      emitProgress(options, 'emailSequence', 'generating', 'Regenerating email sequence…');
      assets.emailSequence = await generateEmailSequence(context, options.provider, options.model);
      if (assets.emailSequence.metadata) {
        assets.emailSequence.metadata.version =
          (existingAssets.emailSequence.metadata?.version || 0) + 1;
      }
      emitProgress(options, 'emailSequence', assets.emailSequence.status, 'Email sequence regenerated');
    },
    pressRelease: async () => {
      emitProgress(options, 'pressRelease', 'generating', 'Regenerating press release…');
      assets.pressRelease = await generatePressRelease(context, options.provider, options.model);
      if (assets.pressRelease.metadata) {
        assets.pressRelease.metadata.version =
          (existingAssets.pressRelease.metadata?.version || 0) + 1;
      }
      emitProgress(options, 'pressRelease', assets.pressRelease.status, 'Press release regenerated');
    },
    socialPosts: async () => {
      emitProgress(options, 'socialPosts', 'generating', 'Regenerating social posts…');
      assets.socialPosts = await generateSocialPosts(context, options.provider, options.model);
      if (assets.socialPosts.metadata) {
        assets.socialPosts.metadata.version =
          (existingAssets.socialPosts.metadata?.version || 0) + 1;
      }
      emitProgress(options, 'socialPosts', assets.socialPosts.status, 'Social posts regenerated');
    },
    salesEnablement: async () => {
      emitProgress(options, 'salesEnablement', 'generating', 'Regenerating sales enablement…');
      assets.salesEnablement = await generateSalesEnablement(context, options.provider, options.model);
      if (assets.salesEnablement.metadata) {
        assets.salesEnablement.metadata.version =
          (existingAssets.salesEnablement.metadata?.version || 0) + 1;
      }
      emitProgress(options, 'salesEnablement', assets.salesEnablement.status, 'Sales enablement regenerated');
    },
    partnerKit: async () => {
      emitProgress(options, 'partnerKit', 'generating', 'Regenerating partner kit…');
      assets.partnerKit = await generatePartnerKit(context, options.provider, options.model);
      if (assets.partnerKit.metadata) {
        assets.partnerKit.metadata.version =
          (existingAssets.partnerKit.metadata?.version || 0) + 1;
      }
      emitProgress(options, 'partnerKit', assets.partnerKit.status, 'Partner kit regenerated');
    },
    videoScript: async () => {
      emitProgress(options, 'videoScript', 'generating', 'Regenerating video scripts…');
      assets.videoScript = await generateVideoScript(context, options.provider, options.model);
      if (assets.videoScript.metadata) {
        assets.videoScript.metadata.version =
          (existingAssets.videoScript.metadata?.version || 0) + 1;
      }
      emitProgress(options, 'videoScript', assets.videoScript.status, 'Video scripts regenerated');
    },
  };

  await generators[assetType]();
  return assets;
}

/**
 * Run the pipeline starting from a given asset through all its dependents.
 */
export async function runPipelineFrom(
  startAsset: AssetType,
  brief: LaunchBrief,
  existingAssets: GeneratedAssets,
  options: PipelineOptions,
): Promise<GeneratedAssets> {
  const startIndex = PIPELINE_ORDER.indexOf(startAsset);
  if (startIndex === -1) throw new Error(`Unknown asset type: ${startAsset}`);

  let assets = { ...existingAssets };
  const context: PipelineContext = { brief, assets };

  for (let i = startIndex; i < PIPELINE_ORDER.length; i++) {
    const assetType = PIPELINE_ORDER[i];
    context.assets = assets;
    assets = await regenerateAsset(assetType, brief, assets, options);
  }

  return assets;
}
