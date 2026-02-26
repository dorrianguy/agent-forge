'use client';

import React, { useState, useCallback } from 'react';
import { Plus, Trash2, Sparkles, ChevronDown, ChevronRight, AlertCircle } from 'lucide-react';

// ============================================================
// Types
// ============================================================

export interface ToolExample {
  input: Record<string, unknown>;
  output?: unknown;
  description?: string;
}

interface ToolExamplesEditorProps {
  /** Tool identifier (e.g. "get_weather"). */
  toolName: string;
  /** Current examples for this tool. */
  examples: ToolExample[];
  /** Callback when examples change. */
  onChange: (examples: ToolExample[]) => void;
  /** Max allowed examples per tool (default 5). */
  maxExamples?: number;
  /** If true, show the "Generate Examples" AI button. */
  showGenerate?: boolean;
  /** Callback to generate examples via AI. */
  onGenerate?: () => Promise<ToolExample[]>;
  /** CSS class. */
  className?: string;
}

// ============================================================
// JSON editor sub-component
// ============================================================

function JsonEditor({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
}) {
  const [error, setError] = useState<string | null>(null);

  const handleChange = (raw: string) => {
    onChange(raw);
    // Validate JSON on every change (but don't block typing)
    try {
      if (raw.trim()) {
        JSON.parse(raw);
      }
      setError(null);
    } catch {
      setError('Invalid JSON');
    }
  };

  return (
    <div>
      <label className="block text-xs text-white/50 mb-1">{label}</label>
      <textarea
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className={`w-full px-3 py-2 bg-white/5 border rounded-lg text-white text-xs font-mono focus:outline-none transition resize-none ${
          error
            ? 'border-red-500/50 focus:border-red-500'
            : 'border-white/10 focus:border-orange-500/50'
        }`}
      />
      {error && (
        <p className="flex items-center gap-1 mt-1 text-[10px] text-red-400">
          <AlertCircle className="w-3 h-3" />
          {error}
        </p>
      )}
    </div>
  );
}

// ============================================================
// Single example card
// ============================================================

function ExampleCard({
  index,
  example,
  onChange,
  onRemove,
}: {
  index: number;
  example: ToolExample;
  onChange: (example: ToolExample) => void;
  onRemove: () => void;
}) {
  const [isOpen, setIsOpen] = useState(true);

  const inputStr = JSON.stringify(example.input, null, 2);
  const outputStr =
    example.output !== undefined
      ? JSON.stringify(example.output, null, 2)
      : '';

  const handleInputChange = (raw: string) => {
    try {
      const parsed = JSON.parse(raw);
      if (typeof parsed === 'object' && parsed !== null && !Array.isArray(parsed)) {
        onChange({ ...example, input: parsed });
      }
    } catch {
      // Keep the raw text in state but don't update the parent
      // until valid JSON is entered
    }
  };

  const handleOutputChange = (raw: string) => {
    if (!raw.trim()) {
      const { output: _, ...rest } = example;
      onChange(rest as ToolExample);
      return;
    }
    try {
      const parsed = JSON.parse(raw);
      onChange({ ...example, output: parsed });
    } catch {
      // Same: don't update until valid
    }
  };

  return (
    <div className="border border-white/10 rounded-lg overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-3 py-2 bg-white/5">
        <button
          onClick={() => setIsOpen(!isOpen)}
          className="flex items-center gap-2 text-xs text-white/70 hover:text-white transition"
        >
          {isOpen ? (
            <ChevronDown className="w-3 h-3" />
          ) : (
            <ChevronRight className="w-3 h-3" />
          )}
          Example {index + 1}
          {example.description && (
            <span className="text-white/40 ml-1">— {example.description}</span>
          )}
        </button>
        <button
          onClick={onRemove}
          className="p-1 text-red-400/60 hover:text-red-400 transition"
          title="Remove example"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Body */}
      {isOpen && (
        <div className="p-3 space-y-3">
          <div>
            <label className="block text-xs text-white/50 mb-1">
              Description (optional)
            </label>
            <input
              type="text"
              value={example.description || ''}
              onChange={(e) =>
                onChange({ ...example, description: e.target.value || undefined })
              }
              placeholder="What this example demonstrates..."
              className="w-full px-3 py-1.5 bg-white/5 border border-white/10 rounded-lg text-white text-xs focus:outline-none focus:border-orange-500/50 transition"
            />
          </div>

          <JsonEditor
            label="Input (JSON object)"
            value={inputStr}
            onChange={handleInputChange}
            placeholder='{"city": "San Francisco", "units": "celsius"}'
            rows={4}
          />

          <JsonEditor
            label="Expected Output (optional, JSON)"
            value={outputStr}
            onChange={handleOutputChange}
            placeholder='{"temperature": 18, "condition": "sunny"}'
            rows={3}
          />
        </div>
      )}
    </div>
  );
}

// ============================================================
// Main editor component
// ============================================================

export default function ToolExamplesEditor({
  toolName,
  examples,
  onChange,
  maxExamples = 5,
  showGenerate = true,
  onGenerate,
  className = '',
}: ToolExamplesEditorProps) {
  const [isGenerating, setIsGenerating] = useState(false);

  const addExample = useCallback(() => {
    if (examples.length >= maxExamples) return;
    onChange([...examples, { input: {} }]);
  }, [examples, maxExamples, onChange]);

  const updateExample = useCallback(
    (index: number, updated: ToolExample) => {
      const next = [...examples];
      next[index] = updated;
      onChange(next);
    },
    [examples, onChange],
  );

  const removeExample = useCallback(
    (index: number) => {
      onChange(examples.filter((_, i) => i !== index));
    },
    [examples, onChange],
  );

  const handleGenerate = useCallback(async () => {
    if (!onGenerate) return;
    setIsGenerating(true);
    try {
      const generated = await onGenerate();
      // Merge with existing, respecting max
      const merged = [...examples, ...generated].slice(0, maxExamples);
      onChange(merged);
    } catch {
      // Generation failed — the parent should handle the error toast
    } finally {
      setIsGenerating(false);
    }
  }, [examples, maxExamples, onChange, onGenerate]);

  return (
    <div className={className}>
      {/* Section header */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h4 className="text-xs font-medium text-white/70">
            Input Examples
          </h4>
          <p className="text-[10px] text-white/40 mt-0.5">
            Provide {maxExamples > 1 ? `up to ${maxExamples}` : '1'} example
            {maxExamples > 1 ? 's' : ''} so the AI knows how to use{' '}
            <code className="text-orange-300/70">{toolName}</code>
          </p>
        </div>

        <span className="text-[10px] text-white/30">
          {examples.length}/{maxExamples}
        </span>
      </div>

      {/* Example cards */}
      <div className="space-y-2">
        {examples.map((ex, i) => (
          <ExampleCard
            key={i}
            index={i}
            example={ex}
            onChange={(updated) => updateExample(i, updated)}
            onRemove={() => removeExample(i)}
          />
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2 mt-3">
        <button
          onClick={addExample}
          disabled={examples.length >= maxExamples}
          className="flex items-center gap-1.5 px-3 py-1.5 border border-dashed border-white/20 rounded-lg text-white/50 text-xs hover:border-orange-500/50 hover:text-orange-400 transition disabled:opacity-30 disabled:cursor-not-allowed"
        >
          <Plus className="w-3.5 h-3.5" />
          Add Example
        </button>

        {showGenerate && onGenerate && (
          <button
            onClick={handleGenerate}
            disabled={isGenerating || examples.length >= maxExamples}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-orange-500/10 border border-orange-500/20 rounded-lg text-orange-400 text-xs hover:bg-orange-500/20 transition disabled:opacity-30 disabled:cursor-not-allowed"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {isGenerating ? 'Generating...' : 'Generate Examples'}
          </button>
        )}
      </div>
    </div>
  );
}
