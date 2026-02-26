// =============================================================================
// VariantCompare — Side-by-Side A/B Variant Comparison
// =============================================================================

'use client';

import React, { useState, useMemo } from 'react';
import {
  GitCompare,
  Trophy,
  ChevronDown,
  Sparkles,
  Target,
  Heart,
  Lightbulb,
  Flame,
} from 'lucide-react';
import type {
  VariantPair,
  VariantAngle,
  VariantEligibleAsset,
  AssetVariant,
} from '@/lib/launch/types';
import { ASSET_LABELS } from '@/lib/launch/propagator';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const ANGLE_LABELS: Record<VariantAngle, string> = {
  curiosity: 'Curiosity-Driven',
  outcome: 'Outcome-Focused',
  pain: 'Pain-Focused',
  aspiration: 'Aspiration-Focused',
  default: 'Default',
};

const ANGLE_ICONS: Record<VariantAngle, React.ComponentType<{ className?: string }>> = {
  curiosity: Lightbulb,
  outcome: Target,
  pain: Flame,
  aspiration: Heart,
  default: Sparkles,
};

const ANGLE_COLORS: Record<VariantAngle, string> = {
  curiosity: 'text-amber-400 bg-amber-500/20 border-amber-500/30',
  outcome: 'text-blue-400 bg-blue-500/20 border-blue-500/30',
  pain: 'text-red-400 bg-red-500/20 border-red-500/30',
  aspiration: 'text-pink-400 bg-pink-500/20 border-pink-500/30',
  default: 'text-zinc-400 bg-zinc-500/20 border-zinc-500/30',
};

const ELIGIBLE_ASSETS: VariantEligibleAsset[] = ['landingPage', 'emailSequence', 'socialPosts'];

// Simple diff highlight: split into words and highlight differences
function highlightDiff(textA: string, textB: string): { wordsA: { word: string; diff: boolean }[]; wordsB: { word: string; diff: boolean }[] } {
  const wordsA = textA.split(/(\s+)/);
  const wordsB = textB.split(/(\s+)/);
  const maxLen = Math.max(wordsA.length, wordsB.length);

  const resultA: { word: string; diff: boolean }[] = [];
  const resultB: { word: string; diff: boolean }[] = [];

  for (let i = 0; i < maxLen; i++) {
    const wA = wordsA[i] ?? '';
    const wB = wordsB[i] ?? '';
    const isDiff = wA !== wB;
    if (wA) resultA.push({ word: wA, diff: isDiff });
    if (wB) resultB.push({ word: wB, diff: isDiff });
  }

  return { wordsA: resultA, wordsB: resultB };
}

function DiffText({ words }: { words: { word: string; diff: boolean }[] }) {
  return (
    <span>
      {words.map((w, i) => (
        <span
          key={i}
          className={w.diff ? 'bg-blue-500/30 text-blue-200 rounded px-0.5' : ''}
        >
          {w.word}
        </span>
      ))}
    </span>
  );
}

// ---------------------------------------------------------------------------
// Variant Card
// ---------------------------------------------------------------------------

function VariantCard({ variant, side, onPickWinner }: {
  variant: AssetVariant;
  side: 'A' | 'B';
  onPickWinner: (side: 'A' | 'B') => void;
}) {
  const AngleIcon = ANGLE_ICONS[variant.angle];
  const colorClass = ANGLE_COLORS[variant.angle];

  return (
    <div className="flex-1 bg-zinc-900/60 border border-zinc-800 rounded-lg p-4 space-y-3">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className={`flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border ${colorClass}`}>
            <AngleIcon className="w-3 h-3" />
            {ANGLE_LABELS[variant.angle]}
          </span>
          <span className="text-xs font-bold text-zinc-500">Variant {side}</span>
        </div>
      </div>

      {/* Hook */}
      <div>
        <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1 block">Hook</label>
        <p className="text-sm text-zinc-200 leading-relaxed">{variant.hook}</p>
      </div>

      {/* Content preview */}
      {variant.content && typeof variant.content === 'object' && (
        <div className="bg-zinc-800/50 rounded-lg p-3 max-h-48 overflow-y-auto">
          <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-1 block">Content Preview</label>
          <pre className="text-xs text-zinc-300 whitespace-pre-wrap font-mono leading-relaxed">
            {JSON.stringify(variant.content, null, 2).slice(0, 500)}
            {JSON.stringify(variant.content, null, 2).length > 500 && '…'}
          </pre>
        </div>
      )}

      {/* Pick Winner */}
      <button
        onClick={() => onPickWinner(side)}
        className="w-full flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium
          bg-emerald-600/20 text-emerald-300 hover:bg-emerald-600/30 border border-emerald-500/30 transition-colors"
      >
        <Trophy className="w-3.5 h-3.5" />
        Pick {side} as Winner
      </button>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Main Component
// ---------------------------------------------------------------------------

interface VariantCompareProps {
  variantPairs: VariantPair[];
  onPickWinner?: (assetType: VariantEligibleAsset, winner: 'A' | 'B') => void;
}

export default function VariantCompare({ variantPairs, onPickWinner }: VariantCompareProps) {
  const [selectedAsset, setSelectedAsset] = useState<VariantEligibleAsset | null>(
    variantPairs.length > 0 ? variantPairs[0].assetType as VariantEligibleAsset : null
  );
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [pickedWinners, setPickedWinners] = useState<Record<string, 'A' | 'B'>>({});

  const currentPair = useMemo(
    () => variantPairs.find((p) => p.assetType === selectedAsset),
    [variantPairs, selectedAsset],
  );

  const handlePickWinner = (side: 'A' | 'B') => {
    if (!selectedAsset) return;
    setPickedWinners((prev) => ({ ...prev, [selectedAsset]: side }));
    onPickWinner?.(selectedAsset, side);
  };

  // Diff highlights for hooks
  const hookDiff = useMemo(() => {
    if (!currentPair) return null;
    return highlightDiff(currentPair.variantA.hook, currentPair.variantB.hook);
  }, [currentPair]);

  if (variantPairs.length === 0) {
    return (
      <div className="flex items-center justify-center h-48 text-zinc-600">
        <div className="text-center space-y-2">
          <GitCompare className="w-10 h-10 mx-auto opacity-40" />
          <p className="text-sm">No variants available for comparison</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Asset Selector */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <GitCompare className="w-4 h-4 text-blue-400" />
          <h4 className="text-sm font-medium text-zinc-200">A/B Variant Comparison</h4>
        </div>

        {/* Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs bg-zinc-800 border border-zinc-700
              hover:bg-zinc-700 text-zinc-300 transition-colors"
          >
            {selectedAsset ? ASSET_LABELS[selectedAsset] : 'Select asset…'}
            <ChevronDown className="w-3 h-3" />
          </button>
          {dropdownOpen && (
            <div className="absolute right-0 top-full mt-1 bg-zinc-800 border border-zinc-700 rounded-lg shadow-xl z-20 min-w-[180px]">
              {ELIGIBLE_ASSETS.map((asset) => {
                const hasPair = variantPairs.some((p) => p.assetType === asset);
                const winner = pickedWinners[asset];
                return (
                  <button
                    key={asset}
                    disabled={!hasPair}
                    onClick={() => {
                      setSelectedAsset(asset);
                      setDropdownOpen(false);
                    }}
                    className={`w-full text-left px-3 py-2 text-xs transition-colors flex items-center justify-between
                      ${hasPair
                        ? 'text-zinc-200 hover:bg-zinc-700'
                        : 'text-zinc-600 cursor-not-allowed'
                      }
                      ${asset === selectedAsset ? 'bg-zinc-700/50' : ''}
                    `}
                  >
                    <span>{ASSET_LABELS[asset]}</span>
                    {winner && (
                      <span className="flex items-center gap-1 text-emerald-400">
                        <Trophy className="w-3 h-3" /> {winner}
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Winner status */}
      {selectedAsset && pickedWinners[selectedAsset] && (
        <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
          <Trophy className="w-4 h-4 text-emerald-400" />
          <span className="text-xs text-emerald-300">
            Variant {pickedWinners[selectedAsset]} selected as winner for {selectedAsset ? ASSET_LABELS[selectedAsset] : ''}
          </span>
        </div>
      )}

      {/* Hook Diff Highlight */}
      {currentPair && hookDiff && (
        <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-3">
          <label className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2 block">Hook Comparison (differences highlighted)</label>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <span className="text-[10px] text-zinc-500 block mb-1">Variant A</span>
              <p className="text-sm text-zinc-200 leading-relaxed">
                <DiffText words={hookDiff.wordsA} />
              </p>
            </div>
            <div>
              <span className="text-[10px] text-zinc-500 block mb-1">Variant B</span>
              <p className="text-sm text-zinc-200 leading-relaxed">
                <DiffText words={hookDiff.wordsB} />
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Side-by-Side Cards */}
      {currentPair && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <VariantCard
            variant={currentPair.variantA}
            side="A"
            onPickWinner={handlePickWinner}
          />
          <VariantCard
            variant={currentPair.variantB}
            side="B"
            onPickWinner={handlePickWinner}
          />
        </div>
      )}
    </div>
  );
}
