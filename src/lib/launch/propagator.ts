// =============================================================================
// Change Propagation Engine
// =============================================================================
//
// When a user edits an upstream asset, this module identifies which downstream
// assets need regeneration based on the dependency graph and what changed.
// =============================================================================

import type {
  AssetType,
  GeneratedAssets,
  PropagationEdge,
  PropagationResult,
  LaunchBrief,
} from './types';
import { PIPELINE_ORDER, regenerateAsset } from './pipeline';
import type { PipelineOptions } from './types';

// ---------------------------------------------------------------------------
// Dependency Graph
// ---------------------------------------------------------------------------

/**
 * Static dependency edges: `from` → `to` with the fields that create the dependency.
 */
export const DEPENDENCY_EDGES: PropagationEdge[] = [
  {
    from: 'landingPage',
    to: 'emailSequence',
    fields: ['hero.headline', 'hero.subheadline', 'hero.ctaText', 'featureSections', 'socialProof'],
  },
  {
    from: 'landingPage',
    to: 'pressRelease',
    fields: ['hero.headline', 'meta.description', 'featureSections'],
  },
  {
    from: 'landingPage',
    to: 'socialPosts',
    fields: ['hero.headline', 'hero.subheadline', 'featureSections', 'meta.ogTitle', 'meta.ogDescription'],
  },
  {
    from: 'pressRelease',
    to: 'socialPosts',
    fields: ['headline', 'lede'],
  },
  {
    from: 'landingPage',
    to: 'salesEnablement',
    fields: ['hero.headline', 'hero.subheadline', 'featureSections', 'socialProof'],
  },
  {
    from: 'landingPage',
    to: 'partnerKit',
    fields: ['hero.headline', 'hero.subheadline', 'featureSections', 'socialProof'],
  },
  {
    from: 'socialPosts',
    to: 'partnerKit',
    fields: ['twitter', 'linkedin'],
  },
  {
    from: 'landingPage',
    to: 'videoScript',
    fields: ['hero.headline', 'hero.subheadline', 'featureSections', 'socialProof', 'closingCta'],
  },
];

/**
 * Build an adjacency list of downstream dependents for each asset type.
 */
export function getDependents(assetType: AssetType): AssetType[] {
  return DEPENDENCY_EDGES
    .filter((edge) => edge.from === assetType)
    .map((edge) => edge.to);
}

/**
 * Get all upstream dependencies for a given asset type.
 */
export function getDependencies(assetType: AssetType): AssetType[] {
  return DEPENDENCY_EDGES
    .filter((edge) => edge.to === assetType)
    .map((edge) => edge.from);
}

/**
 * Recursively collect all downstream assets that would be affected by a change
 * to the given asset type (transitive closure).
 */
export function getTransitiveDependents(assetType: AssetType): AssetType[] {
  const visited = new Set<AssetType>();
  const queue: AssetType[] = [assetType];

  while (queue.length > 0) {
    const current = queue.shift()!;
    const directDeps = getDependents(current);
    for (const dep of directDeps) {
      if (!visited.has(dep)) {
        visited.add(dep);
        queue.push(dep);
      }
    }
  }

  // Return in pipeline order for correct regeneration sequence
  return PIPELINE_ORDER.filter((a) => visited.has(a));
}

// ---------------------------------------------------------------------------
// Diff Detection
// ---------------------------------------------------------------------------

/**
 * Simple deep comparison to detect which top-level fields changed between
 * two versions of an asset's data object.
 */
export function detectChangedFields(
  oldData: Record<string, unknown> | null,
  newData: Record<string, unknown> | null,
): string[] {
  if (!oldData || !newData) return ['*']; // treat as full change

  const changed: string[] = [];
  const allKeys = new Set([...Object.keys(oldData), ...Object.keys(newData)]);

  for (const key of allKeys) {
    if (JSON.stringify(oldData[key]) !== JSON.stringify(newData[key])) {
      changed.push(key);
    }
  }

  return changed;
}

/**
 * Given an asset that changed and the fields that were modified, determine
 * which downstream assets actually need regeneration.
 *
 * This is smarter than "regenerate everything downstream" — it checks whether
 * the changed fields are ones that downstream assets actually depend on.
 */
export function analyzeImpact(
  changedAsset: AssetType,
  changedFields: string[],
): PropagationResult {
  const affectedAssets: AssetType[] = [];
  const changes: PropagationResult['changes'] = [];

  // If all fields changed (full regeneration), everything downstream is affected
  const isFullChange = changedFields.includes('*');

  for (const edge of DEPENDENCY_EDGES) {
    if (edge.from !== changedAsset) continue;

    const relevantChanges = isFullChange
      ? edge.fields
      : edge.fields.filter((f) => {
          // Match both exact and prefix matches
          // e.g., if changedField is "hero" it matches "hero.headline"
          return changedFields.some(
            (cf) => f === cf || f.startsWith(`${cf}.`) || cf.startsWith(`${f}.`),
          );
        });

    if (relevantChanges.length > 0) {
      affectedAssets.push(edge.to);
      changes.push({
        asset: edge.to,
        reason: `Fields changed in ${changedAsset}: ${relevantChanges.join(', ')}`,
        fields: relevantChanges,
      });
    }
  }

  // Also get transitive dependents of directly affected assets
  const transitiveAffected = new Set(affectedAssets);
  for (const directlyAffected of affectedAssets) {
    const transitive = getTransitiveDependents(directlyAffected);
    for (const t of transitive) {
      if (!transitiveAffected.has(t)) {
        transitiveAffected.add(t);
        changes.push({
          asset: t,
          reason: `Transitively affected via ${directlyAffected}`,
          fields: ['*'],
        });
      }
    }
  }

  return {
    affectedAssets: PIPELINE_ORDER.filter((a) => transitiveAffected.has(a)),
    changes,
  };
}

// ---------------------------------------------------------------------------
// Propagation Execution
// ---------------------------------------------------------------------------

/**
 * Execute propagation: regenerate all affected downstream assets after
 * an upstream asset was edited.
 */
export async function propagateChanges(
  changedAsset: AssetType,
  brief: LaunchBrief,
  assets: GeneratedAssets,
  options: PipelineOptions,
): Promise<{ assets: GeneratedAssets; propagation: PropagationResult }> {
  const oldData = assets[changedAsset]?.data as Record<string, unknown> | null;

  // Determine impact
  const changedFields = ['*']; // Treat user edits as full changes
  const propagation = analyzeImpact(changedAsset, changedFields);

  // Regenerate affected assets in pipeline order
  let updatedAssets = { ...assets };
  for (const assetType of propagation.affectedAssets) {
    updatedAssets = await regenerateAsset(assetType, brief, updatedAssets, options);
  }

  return { assets: updatedAssets, propagation };
}

// ---------------------------------------------------------------------------
// Dependency Graph for Visualization
// ---------------------------------------------------------------------------

export interface DependencyNode {
  id: AssetType;
  label: string;
  status: 'pending' | 'generating' | 'done' | 'error';
}

export interface DependencyEdge {
  source: AssetType;
  target: AssetType;
  fields: string[];
}

export const ASSET_LABELS: Record<AssetType, string> = {
  landingPage: 'Landing Page',
  emailSequence: 'Email Sequence',
  pressRelease: 'Press Release',
  socialPosts: 'Social Posts',
  salesEnablement: 'Sales Enablement',
  partnerKit: 'Partner Kit',
  videoScript: 'Video Script',
};

/**
 * Build the dependency graph data structure for ReactFlow visualization.
 */
export function buildDependencyGraph(
  assets: GeneratedAssets | null,
): { nodes: DependencyNode[]; edges: DependencyEdge[] } {
  const nodes: DependencyNode[] = PIPELINE_ORDER.map((type) => ({
    id: type,
    label: ASSET_LABELS[type],
    status: assets?.[type]?.status ?? 'pending',
  }));

  const edges: DependencyEdge[] = DEPENDENCY_EDGES.map((e) => ({
    source: e.from,
    target: e.to,
    fields: e.fields,
  }));

  return { nodes, edges };
}
