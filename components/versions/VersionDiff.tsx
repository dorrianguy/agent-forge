'use client';

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import {
  GitCompare,
  Plus,
  Minus,
  Edit3,
  X,
  ChevronDown,
  ChevronRight,
  Code,
  FileText,
  Settings,
  MessageSquare,
  Zap,
} from 'lucide-react';
import {
  AgentVersion,
  VersionChangeSummary,
  VersionDiff as DiffType,
  getVersionLabel,
} from '@/lib/version-types';

interface VersionDiffProps {
  leftVersion: AgentVersion | null;
  rightVersion: AgentVersion | null;
  changes: VersionChangeSummary;
  onClose?: () => void;
}

// Group diffs by category
function categorizeDiffs(diffs: DiffType[]): Record<string, DiffType[]> {
  const categories: Record<string, DiffType[]> = {
    'Basic Info': [],
    'Personality & Behavior': [],
    'Model Settings': [],
    'Tools & Integrations': [],
    'Knowledge Base': [],
    'Triggers & Automation': [],
    'Other': [],
  };

  diffs.forEach((diff) => {
    const field = diff.field.toLowerCase();
    
    if (['name', 'type', 'description'].includes(field)) {
      categories['Basic Info'].push(diff);
    } else if (['systemprompt', 'greeting', 'personality', 'tone', 'fallbackresponse', 'custominstructions'].includes(field)) {
      categories['Personality & Behavior'].push(diff);
    } else if (['model', 'temperature', 'maxtokens'].includes(field)) {
      categories['Model Settings'].push(diff);
    } else if (field === 'tools' || field.startsWith('tools.')) {
      categories['Tools & Integrations'].push(diff);
    } else if (field === 'knowledgebase' || field.startsWith('knowledgebase.')) {
      categories['Knowledge Base'].push(diff);
    } else if (field === 'triggers' || field === 'workinghours' || field.startsWith('triggers.')) {
      categories['Triggers & Automation'].push(diff);
    } else {
      categories['Other'].push(diff);
    }
  });

  // Remove empty categories
  Object.keys(categories).forEach((key) => {
    if (categories[key].length === 0) {
      delete categories[key];
    }
  });

  return categories;
}

// Get icon for category
function getCategoryIcon(category: string) {
  switch (category) {
    case 'Basic Info':
      return FileText;
    case 'Personality & Behavior':
      return MessageSquare;
    case 'Model Settings':
      return Settings;
    case 'Tools & Integrations':
      return Zap;
    case 'Knowledge Base':
      return Code;
    case 'Triggers & Automation':
      return Settings;
    default:
      return FileText;
  }
}

// Format field name for display
function formatFieldName(field: string): string {
  return field
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, (str) => str.toUpperCase())
    .trim();
}

// Render value for display
function renderValue(value: any): string {
  if (value === null || value === undefined) return '(empty)';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'object') return JSON.stringify(value, null, 2);
  return String(value);
}

// Truncate long strings
function truncate(str: string, length: number = 100): string {
  if (str.length <= length) return str;
  return str.substring(0, length) + '...';
}

export default function VersionDiff({
  leftVersion,
  rightVersion,
  changes,
  onClose,
}: VersionDiffProps) {
  const [expandedCategories, setExpandedCategories] = useState<Set<string>>(
    new Set(Object.keys(categorizeDiffs(changes.diffs)))
  );
  const [expandedDiffs, setExpandedDiffs] = useState<Set<string>>(new Set());

  const toggleCategory = (category: string) => {
    const newExpanded = new Set(expandedCategories);
    if (newExpanded.has(category)) {
      newExpanded.delete(category);
    } else {
      newExpanded.add(category);
    }
    setExpandedCategories(newExpanded);
  };

  const toggleDiff = (diffId: string) => {
    const newExpanded = new Set(expandedDiffs);
    if (newExpanded.has(diffId)) {
      newExpanded.delete(diffId);
    } else {
      newExpanded.add(diffId);
    }
    setExpandedDiffs(newExpanded);
  };

  const categorizedDiffs = categorizeDiffs(changes.diffs);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="bg-slate-900 rounded-2xl border border-white/10 overflow-hidden"
    >
      {/* Header */}
      <div className="p-4 border-b border-white/5 bg-white/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-purple-500/20 flex items-center justify-center">
              <GitCompare className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-white font-semibold">Version Comparison</h3>
              <p className="text-white/50 text-sm">
                {leftVersion && rightVersion ? (
                  <>
                    Comparing{' '}
                    <span className="text-red-400 font-medium">
                      {getVersionLabel(leftVersion)}
                    </span>{' '}
                    →{' '}
                    <span className="text-green-400 font-medium">
                      {getVersionLabel(rightVersion)}
                    </span>
                  </>
                ) : (
                  'Select two versions to compare'
                )}
              </p>
            </div>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/10 text-white/60 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          )}
        </div>

        {/* Change summary */}
        <div className="flex items-center gap-4 mt-4">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-green-500/10">
            <Plus className="w-4 h-4 text-green-400" />
            <span className="text-green-400 text-sm font-medium">
              {changes.added} added
            </span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10">
            <Minus className="w-4 h-4 text-red-400" />
            <span className="text-red-400 text-sm font-medium">
              {changes.removed} removed
            </span>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-yellow-500/10">
            <Edit3 className="w-4 h-4 text-yellow-400" />
            <span className="text-yellow-400 text-sm font-medium">
              {changes.modified} modified
            </span>
          </div>
        </div>
      </div>

      {/* Diff content */}
      <div className="max-h-[60vh] overflow-y-auto">
        {changes.totalChanges === 0 ? (
          <div className="p-8 text-center">
            <div className="w-12 h-12 rounded-full bg-green-500/20 flex items-center justify-center mx-auto mb-4">
              <GitCompare className="w-6 h-6 text-green-400" />
            </div>
            <h4 className="text-white font-medium mb-2">No Differences</h4>
            <p className="text-white/50 text-sm">
              These two versions are identical.
            </p>
          </div>
        ) : (
          <div className="p-4 space-y-4">
            {Object.entries(categorizedDiffs).map(([category, diffs]) => {
              const CategoryIcon = getCategoryIcon(category);
              const isExpanded = expandedCategories.has(category);

              return (
                <div
                  key={category}
                  className="rounded-xl border border-white/5 overflow-hidden"
                >
                  {/* Category header */}
                  <button
                    onClick={() => toggleCategory(category)}
                    className="w-full p-3 flex items-center gap-3 bg-white/5 hover:bg-white/10 transition-colors"
                  >
                    <CategoryIcon className="w-4 h-4 text-white/60" />
                    <span className="text-white font-medium flex-1 text-left">
                      {category}
                    </span>
                    <span className="text-white/40 text-sm">
                      {diffs.length} {diffs.length === 1 ? 'change' : 'changes'}
                    </span>
                    {isExpanded ? (
                      <ChevronDown className="w-4 h-4 text-white/40" />
                    ) : (
                      <ChevronRight className="w-4 h-4 text-white/40" />
                    )}
                  </button>

                  {/* Diffs in category */}
                  {isExpanded && (
                    <div className="divide-y divide-white/5">
                      {diffs.map((diff, index) => {
                        const diffId = `${category}-${index}`;
                        const isExpandedDiff = expandedDiffs.has(diffId);
                        const hasLongContent =
                          renderValue(diff.oldValue).length > 100 ||
                          renderValue(diff.newValue).length > 100;

                        return (
                          <div key={diffId} className="p-3">
                            {/* Diff header */}
                            <div
                              className={`flex items-center gap-2 mb-2 ${
                                hasLongContent ? 'cursor-pointer' : ''
                              }`}
                              onClick={() =>
                                hasLongContent && toggleDiff(diffId)
                              }
                            >
                              <span
                                className={`px-2 py-0.5 rounded text-xs font-medium ${
                                  diff.changeType === 'added'
                                    ? 'bg-green-500/20 text-green-400'
                                    : diff.changeType === 'removed'
                                    ? 'bg-red-500/20 text-red-400'
                                    : 'bg-yellow-500/20 text-yellow-400'
                                }`}
                              >
                                {diff.changeType}
                              </span>
                              <span className="text-white/70 text-sm font-medium">
                                {formatFieldName(diff.field)}
                              </span>
                              {hasLongContent && (
                                <span className="text-white/40 text-xs">
                                  (click to {isExpandedDiff ? 'collapse' : 'expand'})
                                </span>
                              )}
                            </div>

                            {/* Diff content */}
                            <div className="grid grid-cols-2 gap-3">
                              {/* Old value */}
                              <div className="rounded-lg bg-red-500/5 border border-red-500/10 p-3 overflow-hidden">
                                <span className="text-red-400/60 text-xs uppercase tracking-wider block mb-1">
                                  Before
                                </span>
                                <pre className="text-red-200/70 text-sm whitespace-pre-wrap break-words font-mono">
                                  {isExpandedDiff || !hasLongContent
                                    ? renderValue(diff.oldValue)
                                    : truncate(renderValue(diff.oldValue))}
                                </pre>
                              </div>

                              {/* New value */}
                              <div className="rounded-lg bg-green-500/5 border border-green-500/10 p-3 overflow-hidden">
                                <span className="text-green-400/60 text-xs uppercase tracking-wider block mb-1">
                                  After
                                </span>
                                <pre className="text-green-200/70 text-sm whitespace-pre-wrap break-words font-mono">
                                  {isExpandedDiff || !hasLongContent
                                    ? renderValue(diff.newValue)
                                    : truncate(renderValue(diff.newValue))}
                                </pre>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </motion.div>
  );
}
