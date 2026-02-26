// =============================================================================
// LaunchWorkflow — Main Orchestrator Component
// =============================================================================
//
// Three-panel layout:
//   Left   — Dependency graph (or brief form when no assets)
//   Center — Asset panel (with variant compare toggle)
//   Right  — Validation report + Export + Post-Launch
// =============================================================================

'use client';

import React, { useCallback, useState, useMemo } from 'react';
import { create } from 'zustand';
import {
  Rocket,
  ArrowLeft,
  Loader2,
  CheckCircle2,
  AlertCircle,
  GitCompare,
  ClipboardList,
  Activity,
} from 'lucide-react';
import type {
  LaunchBrief,
  GeneratedAssets,
  AssetType,
  GenerationStatus,
  PipelineProgress,
  ValidationResult,
  LaunchAsset,
  WizardStep,
  LaunchWorkflowState,
  PropagationResult,
  SalesEnablementAsset,
  PartnerKitAsset,
  VideoScriptAsset,
  VariantPair,
  VariantEligibleAsset,
  FeedbackAnalysis,
  LaunchRetro as LaunchRetroType,
} from '@/lib/launch/types';
import { analyzeImpact, getTransitiveDependents } from '@/lib/launch/propagator';
import { regenerateAsset } from '@/lib/launch/pipeline';

import LaunchBriefForm from './LaunchBriefForm';
import LaunchDependencyGraph from './LaunchDependencyGraph';
import LaunchAssetPanel from './LaunchAssetPanel';
import LaunchValidationReport from './LaunchValidationReport';
import LaunchExport from './LaunchExport';
import SalesEnablementPanel from './SalesEnablementPanel';
import PartnerKitBuilder from './PartnerKitBuilder';
import VideoScriptEditor from './VideoScriptEditor';
import VariantCompare from './VariantCompare';
import LaunchRetroPanel from './LaunchRetro';
import FeedbackDashboard from './FeedbackDashboard';

// ---------------------------------------------------------------------------
// Extended Store State — adds variant, feedback, retro support
// ---------------------------------------------------------------------------

interface ExtendedLaunchState extends LaunchWorkflowState {
  // Variant state
  variantPairs: VariantPair[];
  setVariantPairs: (pairs: VariantPair[]) => void;
  pickVariantWinner: (assetType: VariantEligibleAsset, winner: 'A' | 'B') => void;

  // Feedback state
  feedbackAnalysis: FeedbackAnalysis | null;
  setFeedbackAnalysis: (analysis: FeedbackAnalysis) => void;

  // Retro state
  retro: LaunchRetroType | null;
  setRetro: (retro: LaunchRetroType) => void;
}

// ---------------------------------------------------------------------------
// Zustand Store
// ---------------------------------------------------------------------------

export const useLaunchStore = create<ExtendedLaunchState>((set, get) => ({
  // State
  brief: null,
  wizardStep: 'basic',
  assets: null,
  pipelineStatus: 'pending',
  pipelineProgress: [],
  selectedAsset: null,
  validationResults: [],
  staleAssets: new Set<AssetType>(),

  // Variant state
  variantPairs: [],
  feedbackAnalysis: null,
  retro: null,

  // Actions
  setBrief: (brief) => set({ brief }),
  setWizardStep: (wizardStep) => set({ wizardStep }),
  setAssets: (assets) => set({ assets, staleAssets: new Set<AssetType>() }),
  updateAsset: (type, asset) =>
    set((state) => {
      if (!state.assets) return {};
      return {
        assets: { ...state.assets, [type]: asset },
      };
    }),
  setPipelineStatus: (pipelineStatus) => set({ pipelineStatus }),
  addPipelineProgress: (progress) =>
    set((state) => ({
      pipelineProgress: [...state.pipelineProgress, progress],
    })),
  setSelectedAsset: (selectedAsset) => set({ selectedAsset }),
  setValidationResults: (validationResults) => set({ validationResults }),
  reset: () =>
    set({
      brief: null,
      wizardStep: 'basic',
      assets: null,
      pipelineStatus: 'pending',
      pipelineProgress: [],
      selectedAsset: null,
      validationResults: [],
      staleAssets: new Set<AssetType>(),
      variantPairs: [],
      feedbackAnalysis: null,
      retro: null,
    }),

  // Variant actions
  setVariantPairs: (variantPairs) => set({ variantPairs }),
  pickVariantWinner: (assetType, winner) => {
    const state = get();
    // Could send to backend here; for now just log
    console.log(`Variant winner for ${assetType}: ${winner}`);
  },

  // Feedback actions
  setFeedbackAnalysis: (feedbackAnalysis) => set({ feedbackAnalysis }),

  // Retro actions
  setRetro: (retro) => set({ retro }),

  // ---- Edit → Propagation Actions ----

  updateAssetContent: (assetType, updatedContent) =>
    set((state) => {
      if (!state.assets) return {};

      const existing = state.assets[assetType];
      const updatedAsset = {
        ...existing,
        data: updatedContent,
        metadata: existing.metadata
          ? { ...existing.metadata, version: existing.metadata.version + 1 }
          : null,
      };

      const newAssets = { ...state.assets, [assetType]: updatedAsset };

      const downstream = getTransitiveDependents(assetType);
      const newStale = new Set(state.staleAssets);
      for (const dep of downstream) {
        newStale.add(dep);
      }

      return { assets: newAssets as GeneratedAssets, staleAssets: newStale };
    }),

  getRegenerationPlan: (assetType): PropagationResult => {
    return analyzeImpact(assetType, ['*']);
  },

  regenerateDownstream: async (assetType) => {
    const state = get();
    if (!state.brief || !state.assets) return;

    const plan = analyzeImpact(assetType, ['*']);
    if (plan.affectedAssets.length === 0) return;

    for (const affected of plan.affectedAssets) {
      set((s) => {
        if (!s.assets) return {};
        return {
          assets: {
            ...s.assets,
            [affected]: { ...s.assets[affected], status: 'generating' as const },
          } as GeneratedAssets,
        };
      });
    }

    let currentAssets = { ...get().assets! };
    for (const affected of plan.affectedAssets) {
      try {
        currentAssets = await regenerateAsset(affected, state.brief, currentAssets, {
          provider: 'openai',
          onProgress: (progress) => {
            get().addPipelineProgress(progress);
          },
        });

        set((s) => {
          const newStale = new Set(s.staleAssets);
          newStale.delete(affected);
          return { assets: currentAssets, staleAssets: newStale };
        });
      } catch (err) {
        console.error(`Failed to regenerate ${affected}:`, err);
        set((s) => {
          if (!s.assets) return {};
          return {
            assets: {
              ...s.assets,
              [affected]: {
                ...s.assets[affected],
                status: 'error' as const,
                error: err instanceof Error ? err.message : 'Regeneration failed',
              },
            } as GeneratedAssets,
          };
        });
      }
    }
  },

  markAssetStale: (assetType) =>
    set((state) => {
      const downstream = getTransitiveDependents(assetType);
      const newStale = new Set(state.staleAssets);
      for (const dep of downstream) {
        newStale.add(dep);
      }
      return { staleAssets: newStale };
    }),
}));

// ---------------------------------------------------------------------------
// Pipeline Execution (client-side via API)
// ---------------------------------------------------------------------------

async function executeGeneration(
  brief: LaunchBrief,
  store: ExtendedLaunchState,
): Promise<void> {
  store.setPipelineStatus('generating');
  store.setValidationResults([]);

  try {
    const response = await fetch('/api/launch/generate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brief }),
    });

    if (!response.ok) {
      throw new Error(`Generation failed: ${response.statusText}`);
    }

    const reader = response.body?.getReader();
    if (!reader) {
      const data = await response.json();
      store.setAssets(data.assets);
      store.setPipelineStatus('done');
      return;
    }

    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split('\n');
      buffer = lines.pop() || '';

      for (const line of lines) {
        if (!line.startsWith('data: ')) continue;
        const data = line.slice(6).trim();
        if (data === '[DONE]') continue;

        try {
          const event = JSON.parse(data);

          if (event.type === 'progress') {
            store.addPipelineProgress(event.data);
          } else if (event.type === 'asset') {
            store.updateAsset(event.assetType, event.data);
          } else if (event.type === 'variants') {
            store.setVariantPairs(event.variantPairs);
          } else if (event.type === 'complete') {
            store.setAssets(event.assets);
            store.setPipelineStatus('done');
          } else if (event.type === 'error') {
            store.setPipelineStatus('error');
          }
        } catch {
          // skip malformed events
        }
      }
    }

    if (store.pipelineStatus === 'generating') {
      store.setPipelineStatus('done');
    }
  } catch (err) {
    console.error('Pipeline error:', err);
    store.setPipelineStatus('error');
  }
}

async function executeValidation(
  brief: LaunchBrief,
  assets: GeneratedAssets,
  store: ExtendedLaunchState,
): Promise<void> {
  try {
    const response = await fetch('/api/launch/validate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ brief, assets }),
    });

    if (!response.ok) {
      throw new Error(`Validation failed: ${response.statusText}`);
    }

    const data = await response.json();
    store.setValidationResults(data.results);
  } catch (err) {
    console.error('Validation error:', err);
  }
}

// ---------------------------------------------------------------------------
// Sub-Components
// ---------------------------------------------------------------------------

function ProgressTimeline({ progress }: { progress: PipelineProgress[] }) {
  if (progress.length === 0) return null;

  return (
    <div className="px-4 py-3 border-b border-zinc-800 bg-zinc-900/30">
      <div className="flex items-center gap-4 overflow-x-auto pb-1">
        {progress.map((p, i) => (
          <div key={i} className="flex items-center gap-1.5 flex-shrink-0">
            {p.status === 'generating' && <Loader2 className="w-3 h-3 text-amber-400 animate-spin" />}
            {p.status === 'done' && <CheckCircle2 className="w-3 h-3 text-green-400" />}
            {p.status === 'error' && <AlertCircle className="w-3 h-3 text-red-400" />}
            <span className="text-xs text-zinc-400">{p.message}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Center Panel Renderer — selects the right panel for the selected asset
// ---------------------------------------------------------------------------

function CenterPanel({
  store,
  showVariantCompare,
  handleRegenerate,
  handleFieldSave,
}: {
  store: ExtendedLaunchState;
  showVariantCompare: boolean;
  handleRegenerate: (assetType: AssetType) => void;
  handleFieldSave: (path: string, value: string) => void;
}) {
  const { assets, selectedAsset, variantPairs } = store;

  // If variant compare mode is on and we have variants
  if (showVariantCompare && variantPairs.length > 0) {
    return (
      <div className="h-full overflow-y-auto px-4 py-4">
        <VariantCompare
          variantPairs={variantPairs}
          onPickWinner={(assetType, winner) => store.pickVariantWinner(assetType, winner)}
        />
      </div>
    );
  }

  // New asset type panels
  if (selectedAsset === 'salesEnablement' && assets?.salesEnablement?.data) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800 flex-shrink-0">
          <span className="text-sm font-semibold text-zinc-200">Sales Enablement</span>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <SalesEnablementPanel
            data={assets.salesEnablement.data as SalesEnablementAsset}
            onFieldSave={handleFieldSave}
          />
        </div>
      </div>
    );
  }

  if (selectedAsset === 'partnerKit' && assets?.partnerKit?.data) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800 flex-shrink-0">
          <span className="text-sm font-semibold text-zinc-200">Partner Kit</span>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <PartnerKitBuilder
            data={assets.partnerKit.data as PartnerKitAsset}
            onFieldSave={handleFieldSave}
          />
        </div>
      </div>
    );
  }

  if (selectedAsset === 'videoScript' && assets?.videoScript?.data) {
    return (
      <div className="h-full flex flex-col">
        <div className="flex items-center gap-2 px-4 py-3 border-b border-zinc-800 flex-shrink-0">
          <span className="text-sm font-semibold text-zinc-200">Video Scripts</span>
        </div>
        <div className="flex-1 overflow-y-auto px-4 py-4">
          <VideoScriptEditor
            data={assets.videoScript.data as VideoScriptAsset}
            onFieldSave={handleFieldSave}
          />
        </div>
      </div>
    );
  }

  // Default: existing LaunchAssetPanel for LP, emails, PR, social
  return (
    <LaunchAssetPanel
      assets={assets}
      selectedAsset={selectedAsset}
      onRegenerate={handleRegenerate}
    />
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

type WorkflowView = 'brief' | 'workspace';
type RightTab = 'validation' | 'export' | 'post-launch';

export default function LaunchWorkflow() {
  const store = useLaunchStore();
  const [view, setView] = useState<WorkflowView>(store.brief ? 'workspace' : 'brief');
  const [rightTab, setRightTab] = useState<RightTab>('validation');
  const [isValidating, setIsValidating] = useState(false);
  const [showVariantCompare, setShowVariantCompare] = useState(false);

  // Track which assets have variant pairs
  const variantAssetSet = useMemo(
    () => new Set(store.variantPairs.map((p) => p.assetType)),
    [store.variantPairs],
  );

  // Handle brief submission
  const handleBriefSubmit = useCallback(
    async (brief: LaunchBrief) => {
      store.setBrief(brief);
      setView('workspace');

      await executeGeneration(brief, store);

      if (store.assets) {
        setIsValidating(true);
        await executeValidation(brief, store.assets, store);
        setIsValidating(false);
      }
    },
    [store],
  );

  // Handle field save for new panels
  const handleFieldSave = useCallback(
    (path: string, value: string) => {
      if (!store.selectedAsset || !store.assets) return;

      const currentData = store.assets[store.selectedAsset].data;
      if (!currentData) return;

      // Deep-set helper (inline for simplicity — matches LaunchAssetPanel pattern)
      const clone = JSON.parse(JSON.stringify(currentData)) as Record<string, unknown>;
      const parts = path.split('.');
      let current: Record<string, unknown> = clone;

      for (let i = 0; i < parts.length - 1; i++) {
        const key = parts[i];
        const nextKey = parts[i + 1];
        if (/^\d+$/.test(nextKey)) {
          if (!Array.isArray(current[key])) current[key] = [];
          current = current[key] as unknown as Record<string, unknown>;
        } else {
          if (typeof current[key] !== 'object' || current[key] === null) current[key] = {};
          current = current[key] as Record<string, unknown>;
        }
      }
      current[parts[parts.length - 1]] = value;

      store.updateAssetContent(store.selectedAsset, clone);
    },
    [store],
  );

  // Handle asset regeneration
  const handleRegenerate = useCallback(
    async (assetType: AssetType) => {
      if (!store.brief || !store.assets) return;
      await executeGeneration(store.brief, store);

      if (store.assets) {
        setIsValidating(true);
        await executeValidation(store.brief, store.assets, store);
        setIsValidating(false);
      }
    },
    [store],
  );

  // Handle revalidation
  const handleRevalidate = useCallback(async () => {
    if (!store.brief || !store.assets) return;
    setIsValidating(true);
    await executeValidation(store.brief, store.assets, store);
    setIsValidating(false);
  }, [store]);

  // Handle retro updates
  const handleRetroUpdate = useCallback(
    (retro: LaunchRetroType) => {
      store.setRetro(retro);
    },
    [store],
  );

  // Brief form view
  if (view === 'brief') {
    return (
      <div className="h-full bg-zinc-950 text-zinc-100">
        <div className="max-w-4xl mx-auto py-8 px-4">
          <div className="text-center mb-8">
            <div className="flex items-center justify-center gap-2 mb-3">
              <Rocket className="w-8 h-8 text-blue-400" />
              <h1 className="text-2xl font-bold">Product Launch Orchestrator</h1>
            </div>
            <p className="text-zinc-400 max-w-lg mx-auto">
              Generate a complete, consistent launch package from a single brief.
              Landing page copy, emails, press release, social posts, sales enablement,
              partner kits, and video scripts — all interconnected. With built-in A/B
              variants and post-launch feedback loops.
            </p>
          </div>
          <LaunchBriefForm onSubmit={handleBriefSubmit} initialBrief={store.brief} />
        </div>
      </div>
    );
  }

  // Workspace view (three-panel)
  return (
    <div className="h-full bg-zinc-950 text-zinc-100 flex flex-col">
      {/* Top Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-zinc-800 bg-zinc-900/50 flex-shrink-0">
        <div className="flex items-center gap-3">
          <button
            onClick={() => setView('brief')}
            className="flex items-center gap-1.5 text-sm text-zinc-400 hover:text-zinc-200 transition-colors"
          >
            <ArrowLeft className="w-4 h-4" /> Edit Brief
          </button>
          <div className="w-px h-5 bg-zinc-700" />
          <div className="flex items-center gap-2">
            <Rocket className="w-4 h-4 text-blue-400" />
            <span className="text-sm font-medium text-zinc-200">
              {store.brief?.productName || 'Launch Workflow'}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Variant Compare Toggle */}
          {store.variantPairs.length > 0 && (
            <button
              onClick={() => setShowVariantCompare(!showVariantCompare)}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors
                ${showVariantCompare
                  ? 'bg-purple-600/30 text-purple-300 border border-purple-500/30'
                  : 'text-zinc-400 hover:text-purple-300 hover:bg-zinc-800'
                }`}
            >
              <GitCompare className="w-3.5 h-3.5" />
              {showVariantCompare ? 'Exit Compare' : 'Compare A/B'}
            </button>
          )}

          {/* Pipeline Status */}
          <div className="flex items-center gap-1.5 text-xs">
            {store.pipelineStatus === 'pending' && (
              <span className="text-zinc-500">Ready to generate</span>
            )}
            {store.pipelineStatus === 'generating' && (
              <span className="flex items-center gap-1 text-amber-400">
                <Loader2 className="w-3 h-3 animate-spin" /> Generating…
              </span>
            )}
            {store.pipelineStatus === 'done' && (
              <span className="flex items-center gap-1 text-green-400">
                <CheckCircle2 className="w-3 h-3" /> All assets generated
              </span>
            )}
            {store.pipelineStatus === 'error' && (
              <span className="flex items-center gap-1 text-red-400">
                <AlertCircle className="w-3 h-3" /> Generation failed
              </span>
            )}
          </div>

          {store.brief && store.pipelineStatus !== 'generating' && (
            <button
              onClick={() => executeGeneration(store.brief!, store)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium
                bg-blue-600 hover:bg-blue-500 text-white transition-colors"
            >
              <Rocket className="w-3.5 h-3.5" />
              {store.assets ? 'Regenerate All' : 'Generate'}
            </button>
          )}
        </div>
      </div>

      {/* Progress Timeline */}
      <ProgressTimeline progress={store.pipelineProgress} />

      {/* Three-Panel Layout */}
      <div className="flex-1 flex min-h-0">
        {/* Left Panel — Dependency Graph */}
        <div className="w-[360px] flex-shrink-0 border-r border-zinc-800">
          <LaunchDependencyGraph
            assets={store.assets}
            selectedAsset={store.selectedAsset}
            onSelectAsset={store.setSelectedAsset}
            staleAssets={store.staleAssets}
            hasVariants={variantAssetSet}
          />
        </div>

        {/* Center Panel — Asset Viewer / Variant Compare */}
        <div className="flex-1 min-w-0 border-r border-zinc-800">
          <CenterPanel
            store={store}
            showVariantCompare={showVariantCompare}
            handleRegenerate={handleRegenerate}
            handleFieldSave={handleFieldSave}
          />
        </div>

        {/* Right Panel — Validation + Export + Post-Launch */}
        <div className="w-[340px] flex-shrink-0 flex flex-col">
          {/* Tab Switcher */}
          <div className="flex border-b border-zinc-800 flex-shrink-0">
            <button
              onClick={() => setRightTab('validation')}
              className={`flex-1 px-4 py-2.5 text-xs font-medium transition-colors
                ${rightTab === 'validation'
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-zinc-500 hover:text-zinc-300'
                }`}
            >
              Validation
              {store.validationResults.filter((r) => r.severity === 'error').length > 0 && (
                <span className="ml-1.5 inline-flex items-center justify-center w-4 h-4 text-[10px] bg-red-500 text-white rounded-full">
                  {store.validationResults.filter((r) => r.severity === 'error').length}
                </span>
              )}
            </button>
            <button
              onClick={() => setRightTab('export')}
              className={`flex-1 px-4 py-2.5 text-xs font-medium transition-colors
                ${rightTab === 'export'
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-zinc-500 hover:text-zinc-300'
                }`}
            >
              Export
            </button>
            <button
              onClick={() => setRightTab('post-launch')}
              className={`flex-1 px-4 py-2.5 text-xs font-medium transition-colors
                ${rightTab === 'post-launch'
                  ? 'text-blue-400 border-b-2 border-blue-400'
                  : 'text-zinc-500 hover:text-zinc-300'
                }`}
            >
              <span className="flex items-center gap-1 justify-center">
                <Activity className="w-3 h-3" />
                Post-Launch
              </span>
            </button>
          </div>

          {/* Tab Content */}
          <div className="flex-1 overflow-y-auto">
            {rightTab === 'validation' && (
              <LaunchValidationReport
                results={store.validationResults}
                onRevalidate={handleRevalidate}
                isValidating={isValidating}
              />
            )}
            {rightTab === 'export' && (
              <div className="p-4">
                <LaunchExport assets={store.assets} brief={store.brief} validationResults={store.validationResults} />
              </div>
            )}
            {rightTab === 'post-launch' && (
              <div className="p-4 space-y-6">
                {/* Feedback Dashboard */}
                {store.feedbackAnalysis ? (
                  <FeedbackDashboard
                    analysis={store.feedbackAnalysis}
                    onApproveUpdate={(idx) => console.log('Approve update:', idx)}
                    onRejectUpdate={(idx) => console.log('Reject update:', idx)}
                  />
                ) : (
                  <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-6 text-center">
                    <Activity className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                    <p className="text-sm text-zinc-500">No feedback signals yet</p>
                    <p className="text-xs text-zinc-600 mt-1">Launch your campaign to start collecting data</p>
                  </div>
                )}

                {/* Retrospective */}
                {store.retro ? (
                  <LaunchRetroPanel retro={store.retro} onUpdate={handleRetroUpdate} />
                ) : (
                  <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-6 text-center">
                    <ClipboardList className="w-8 h-8 text-zinc-600 mx-auto mb-2" />
                    <p className="text-sm text-zinc-500">Retrospective not started</p>
                    <button
                      onClick={() => {
                        store.setRetro({
                          launchId: store.brief?.id ?? '',
                          productName: store.brief?.productName ?? '',
                          launchDate: store.brief?.launchDate ?? '',
                          completedDate: new Date().toISOString(),
                          bestConverting: { channel: '', hook: '', cta: '' },
                          keepForNextCMD: [],
                          dropFromNextCMD: [],
                          metrics: {
                            totalTraffic: 0,
                            conversionRate: 0,
                            topChannel: '',
                            topAsset: '',
                            hookPerformance: [],
                          },
                          lessons: [],
                        });
                      }}
                      className="mt-3 flex items-center gap-1.5 mx-auto px-3 py-1.5 rounded-lg text-xs font-medium
                        bg-blue-600/20 text-blue-300 hover:bg-blue-600/30 border border-blue-500/30 transition-colors"
                    >
                      <ClipboardList className="w-3.5 h-3.5" /> Start Retro
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
