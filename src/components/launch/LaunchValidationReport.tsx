// =============================================================================
// LaunchValidationReport — Consistency Check Results
// =============================================================================

'use client';

import React, { useMemo } from 'react';
import {
  CheckCircle2,
  AlertTriangle,
  XCircle,
  ShieldCheck,
  Link2,
  DollarSign,
  Quote,
  Calendar,
  Layers,
  MousePointerClick,
  RefreshCw,
} from 'lucide-react';
import type { ValidationResult, ValidationType, ValidationSeverity } from '@/lib/launch/types';

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SEVERITY_CONFIG: Record<ValidationSeverity, { icon: React.ComponentType<{ className?: string }>; color: string; bg: string }> = {
  pass: { icon: CheckCircle2, color: 'text-green-400', bg: 'bg-green-500/10' },
  warning: { icon: AlertTriangle, color: 'text-amber-400', bg: 'bg-amber-500/10' },
  error: { icon: XCircle, color: 'text-red-400', bg: 'bg-red-500/10' },
};

const TYPE_CONFIG: Record<ValidationType, { label: string; icon: React.ComponentType<{ className?: string }> }> = {
  url_consistency: { label: 'URL Consistency', icon: Link2 },
  pricing_consistency: { label: 'Pricing Consistency', icon: DollarSign },
  quote_accuracy: { label: 'Quote Accuracy', icon: Quote },
  date_consistency: { label: 'Date Consistency', icon: Calendar },
  feature_consistency: { label: 'Feature Consistency', icon: Layers },
  cta_alignment: { label: 'CTA Alignment', icon: MousePointerClick },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface LaunchValidationReportProps {
  results: ValidationResult[];
  onRevalidate?: () => void;
  isValidating?: boolean;
}

export default function LaunchValidationReport({
  results,
  onRevalidate,
  isValidating = false,
}: LaunchValidationReportProps) {
  // Group by validation type
  const grouped = useMemo(() => {
    const groups = new Map<ValidationType, ValidationResult[]>();
    for (const result of results) {
      const existing = groups.get(result.type) || [];
      existing.push(result);
      groups.set(result.type, existing);
    }
    return groups;
  }, [results]);

  // Summary counts
  const summary = useMemo(() => {
    const counts = { pass: 0, warning: 0, error: 0 };
    for (const result of results) {
      counts[result.severity]++;
    }
    return counts;
  }, [results]);

  // Overall status
  const overallStatus: ValidationSeverity =
    summary.error > 0 ? 'error' : summary.warning > 0 ? 'warning' : 'pass';
  const OverallIcon = SEVERITY_CONFIG[overallStatus].icon;

  if (results.length === 0) {
    return (
      <div className="h-full flex items-center justify-center text-zinc-600">
        <div className="text-center space-y-3">
          <ShieldCheck className="w-10 h-10 mx-auto opacity-40" />
          <p className="text-sm">No validation results yet</p>
          <p className="text-xs text-zinc-500">Generate assets first, then validate.</p>
          {onRevalidate && (
            <button
              onClick={onRevalidate}
              disabled={isValidating}
              className="flex items-center gap-1.5 mx-auto px-3 py-1.5 rounded-lg text-xs
                bg-zinc-800 text-zinc-400 hover:bg-zinc-700 transition-colors disabled:opacity-50"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isValidating ? 'animate-spin' : ''}`} />
              Validate
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
          <ShieldCheck className="w-5 h-5 text-blue-400" />
          <h3 className="text-sm font-semibold text-zinc-200">Validation Report</h3>
        </div>
        {onRevalidate && (
          <button
            onClick={onRevalidate}
            disabled={isValidating}
            className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs
              text-zinc-400 hover:text-blue-400 hover:bg-zinc-800 transition-colors disabled:opacity-50"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isValidating ? 'animate-spin' : ''}`} />
            Re-validate
          </button>
        )}
      </div>

      {/* Summary Bar */}
      <div className="px-4 py-3 border-b border-zinc-800 flex-shrink-0">
        <div className="flex items-center gap-4">
          <div className={`flex items-center gap-2 px-3 py-1.5 rounded-lg ${SEVERITY_CONFIG[overallStatus].bg}`}>
            <OverallIcon className={`w-4 h-4 ${SEVERITY_CONFIG[overallStatus].color}`} />
            <span className={`text-sm font-medium ${SEVERITY_CONFIG[overallStatus].color}`}>
              {overallStatus === 'pass' ? 'All Clear' : overallStatus === 'warning' ? 'Warnings' : 'Issues Found'}
            </span>
          </div>
          <div className="flex items-center gap-3 text-xs text-zinc-500">
            <span className="flex items-center gap-1">
              <CheckCircle2 className="w-3 h-3 text-green-400" /> {summary.pass} passed
            </span>
            <span className="flex items-center gap-1">
              <AlertTriangle className="w-3 h-3 text-amber-400" /> {summary.warning} warnings
            </span>
            <span className="flex items-center gap-1">
              <XCircle className="w-3 h-3 text-red-400" /> {summary.error} errors
            </span>
          </div>
        </div>
      </div>

      {/* Grouped Results */}
      <div className="flex-1 overflow-y-auto px-4 py-3 space-y-4">
        {Array.from(grouped.entries()).map(([type, typeResults]) => {
          const typeConfig = TYPE_CONFIG[type];
          const TypeIcon = typeConfig.icon;
          const worstSeverity = typeResults.some((r) => r.severity === 'error')
            ? 'error'
            : typeResults.some((r) => r.severity === 'warning')
            ? 'warning'
            : 'pass';

          return (
            <div key={type} className="border border-zinc-800 rounded-lg overflow-hidden">
              {/* Group Header */}
              <div className="flex items-center gap-2 px-3 py-2 bg-zinc-900/50">
                <TypeIcon className="w-4 h-4 text-zinc-400" />
                <span className="text-sm font-medium text-zinc-200">{typeConfig.label}</span>
                <div className={`ml-auto w-2 h-2 rounded-full ${
                  worstSeverity === 'pass' ? 'bg-green-400' :
                  worstSeverity === 'warning' ? 'bg-amber-400' : 'bg-red-400'
                }`} />
              </div>

              {/* Results */}
              <div className="divide-y divide-zinc-800/50">
                {typeResults.map((result) => {
                  const config = SEVERITY_CONFIG[result.severity];
                  const Icon = config.icon;
                  return (
                    <div key={result.id} className={`flex items-start gap-2 px-3 py-2 ${config.bg}`}>
                      <Icon className={`w-4 h-4 flex-shrink-0 mt-0.5 ${config.color}`} />
                      <div className="min-w-0 flex-1">
                        <p className="text-sm text-zinc-200">{result.message}</p>
                        {(result.expected || result.actual) && (
                          <div className="mt-1 text-xs space-y-0.5">
                            {result.expected && (
                              <p className="text-zinc-500">
                                Expected: <code className="text-green-400/80 bg-green-500/10 px-1 rounded">{result.expected}</code>
                              </p>
                            )}
                            {result.actual && (
                              <p className="text-zinc-500">
                                Actual: <code className="text-red-400/80 bg-red-500/10 px-1 rounded">{result.actual}</code>
                              </p>
                            )}
                          </div>
                        )}
                        {result.asset && (
                          <p className="text-xs text-zinc-600 mt-0.5">
                            in {result.asset}{result.field ? ` → ${result.field}` : ''}
                          </p>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
