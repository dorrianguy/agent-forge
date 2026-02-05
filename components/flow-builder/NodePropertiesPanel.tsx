'use client';

import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Node } from 'reactflow';
import { 
  X, 
  Trash2, 
  Copy, 
  Plus, 
  ChevronDown, 
  ChevronRight,
  Play,
  MessageSquare,
  UserCircle,
  GitBranch,
  Sparkles,
  Globe,
  Database,
  UserPlus,
  StopCircle,
} from 'lucide-react';
import { useFlowBuilder } from '@/hooks/useFlowBuilder';
import type { FlowNodeData, NodeType } from '@/lib/flow-types';

interface NodePropertiesPanelProps {
  node: Node<FlowNodeData>;
  onClose: () => void;
}

const iconMap: Record<NodeType, React.ElementType> = {
  start: Play,
  message: MessageSquare,
  userInput: UserCircle,
  condition: GitBranch,
  aiResponse: Sparkles,
  apiCall: Globe,
  setVariable: Database,
  handoff: UserPlus,
  end: StopCircle,
};

const colorMap: Record<NodeType, string> = {
  start: '#22c55e',
  message: '#3b82f6',
  userInput: '#a855f7',
  condition: '#eab308',
  aiResponse: '#f97316',
  apiCall: '#06b6d4',
  setVariable: '#6366f1',
  handoff: '#ec4899',
  end: '#ef4444',
};

// Input component
function Input({
  label,
  value,
  onChange,
  type = 'text',
  placeholder,
  className = '',
}: {
  label: string;
  value: string | number;
  onChange: (value: string) => void;
  type?: string;
  placeholder?: string;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-xs text-white/50 mb-1.5">{label}</label>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500/50 transition"
      />
    </div>
  );
}

// Textarea component
function Textarea({
  label,
  value,
  onChange,
  placeholder,
  rows = 3,
  className = '',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  rows?: number;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-xs text-white/50 mb-1.5">{label}</label>
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500/50 transition resize-none"
      />
    </div>
  );
}

// Select component
function Select({
  label,
  value,
  onChange,
  options,
  className = '',
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  className?: string;
}) {
  return (
    <div className={className}>
      <label className="block text-xs text-white/50 mb-1.5">{label}</label>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white text-sm focus:outline-none focus:border-orange-500/50 transition appearance-none cursor-pointer"
      >
        {options.map((opt) => (
          <option key={opt.value} value={opt.value} className="bg-slate-900">
            {opt.label}
          </option>
        ))}
      </select>
    </div>
  );
}

// Toggle component
function Toggle({
  label,
  checked,
  onChange,
  className = '',
}: {
  label: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  className?: string;
}) {
  return (
    <div className={`flex items-center justify-between ${className}`}>
      <label className="text-xs text-white/70">{label}</label>
      <button
        onClick={() => onChange(!checked)}
        className={`w-10 h-5 rounded-full transition-colors ${
          checked ? 'bg-orange-500' : 'bg-white/10'
        }`}
      >
        <div
          className={`w-4 h-4 bg-white rounded-full transition-transform ${
            checked ? 'translate-x-5' : 'translate-x-0.5'
          }`}
        />
      </button>
    </div>
  );
}

// Section component
function Section({
  title,
  children,
  defaultOpen = true,
}: {
  title: string;
  children: React.ReactNode;
  defaultOpen?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className="border-t border-white/5 pt-4">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 w-full text-left text-sm font-medium text-white/70 hover:text-white transition mb-3"
      >
        {isOpen ? (
          <ChevronDown className="w-4 h-4" />
        ) : (
          <ChevronRight className="w-4 h-4" />
        )}
        {title}
      </button>
      {isOpen && <div className="space-y-3">{children}</div>}
    </div>
  );
}

export default function NodePropertiesPanel({ node, onClose }: NodePropertiesPanelProps) {
  const { updateNode, deleteNode, duplicateNode } = useFlowBuilder();
  const [localData, setLocalData] = useState<FlowNodeData>(node.data);

  // Sync local state with node data
  useEffect(() => {
    setLocalData(node.data);
  }, [node.data]);

  // Update store with debounce
  useEffect(() => {
    const timer = setTimeout(() => {
      updateNode(node.id, localData);
    }, 300);
    return () => clearTimeout(timer);
  }, [localData, node.id, updateNode]);

  const updateField = (
    field: string,
    value: unknown
  ) => {
    setLocalData((prev) => ({ ...prev, [field]: value }));
  };

  const Icon = iconMap[node.type as NodeType] || Play;
  const color = colorMap[node.type as NodeType] || '#f97316';

  const handleDelete = () => {
    deleteNode(node.id);
    onClose();
  };

  const handleDuplicate = () => {
    duplicateNode(node.id);
  };

  // Render type-specific fields
  const renderTypeFields = () => {
    switch (localData.type) {
      case 'start':
        return (
          <>
            <Select
              label="Trigger Type"
              value={localData.triggerType}
              onChange={(v) => updateField('triggerType', v as 'greeting' | 'keyword' | 'intent' | 'webhook')}
              options={[
                { value: 'greeting', label: 'Greeting' },
                { value: 'keyword', label: 'Keyword' },
                { value: 'intent', label: 'Intent' },
                { value: 'webhook', label: 'Webhook' },
              ]}
            />
            {localData.triggerType !== 'greeting' && (
              <Input
                label="Trigger Value"
                value={localData.triggerValue || ''}
                onChange={(v) => updateField('triggerValue', v)}
                placeholder={`Enter ${localData.triggerType}...`}
              />
            )}
          </>
        );

      case 'message':
        return (
          <>
            <Textarea
              label="Message Content"
              value={localData.content}
              onChange={(v) => updateField('content', v)}
              placeholder="Enter your message..."
              rows={4}
            />
            <Toggle
              label="Show typing indicator"
              checked={localData.typing || false}
              onChange={(v) => updateField('typing', v)}
            />
            <Input
              label="Delay (ms)"
              type="number"
              value={localData.delay || 0}
              onChange={(v) => updateField('delay', parseInt(v) || 0)}
              placeholder="0"
            />
          </>
        );

      case 'userInput':
        return (
          <>
            <Select
              label="Input Type"
              value={localData.inputType}
              onChange={(v) => updateField('inputType', v as 'text' | 'email' | 'phone' | 'number' | 'date' | 'choice' | 'file')}
              options={[
                { value: 'text', label: 'Text' },
                { value: 'email', label: 'Email' },
                { value: 'phone', label: 'Phone' },
                { value: 'number', label: 'Number' },
                { value: 'date', label: 'Date' },
                { value: 'choice', label: 'Choice' },
                { value: 'file', label: 'File Upload' },
              ]}
            />
            <Input
              label="Variable Name"
              value={localData.variableName}
              onChange={(v) => updateField('variableName', v)}
              placeholder="user_input"
            />
            <Input
              label="Prompt"
              value={localData.prompt || ''}
              onChange={(v) => updateField('prompt', v)}
              placeholder="Please enter your response..."
            />
            <Toggle
              label="Required"
              checked={localData.validation?.required || false}
              onChange={(v) => updateField('validation', { ...localData.validation, required: v })}
            />
          </>
        );

      case 'condition':
        return (
          <>
            <p className="text-xs text-white/40 mb-2">
              Define conditions for branching the flow.
            </p>
            {localData.conditions.map((cond, idx) => (
              <div key={cond.id} className="p-3 bg-white/5 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/50">Condition {idx + 1}</span>
                  <button
                    onClick={() => {
                      const newConditions = localData.conditions.filter((c) => c.id !== cond.id);
                      updateField('conditions', newConditions);
                    }}
                    className="text-red-400 hover:text-red-300 text-xs"
                  >
                    Remove
                  </button>
                </div>
                <Input
                  label="Variable"
                  value={cond.variable}
                  onChange={(v) => {
                    const newConditions = localData.conditions.map((c) =>
                      c.id === cond.id ? { ...c, variable: v } : c
                    );
                    updateField('conditions', newConditions);
                  }}
                  placeholder="variable_name"
                />
                <Select
                  label="Operator"
                  value={cond.operator}
                  onChange={(v) => {
                    const newConditions = localData.conditions.map((c) =>
                      c.id === cond.id ? { ...c, operator: v as 'equals' | 'notEquals' | 'contains' | 'notContains' | 'greaterThan' | 'lessThan' | 'isEmpty' | 'isNotEmpty' | 'matches' } : c
                    );
                    updateField('conditions', newConditions);
                  }}
                  options={[
                    { value: 'equals', label: 'Equals' },
                    { value: 'notEquals', label: 'Not Equals' },
                    { value: 'contains', label: 'Contains' },
                    { value: 'greaterThan', label: 'Greater Than' },
                    { value: 'lessThan', label: 'Less Than' },
                    { value: 'isEmpty', label: 'Is Empty' },
                    { value: 'isNotEmpty', label: 'Is Not Empty' },
                  ]}
                />
                <Input
                  label="Value"
                  value={cond.value}
                  onChange={(v) => {
                    const newConditions = localData.conditions.map((c) =>
                      c.id === cond.id ? { ...c, value: v } : c
                    );
                    updateField('conditions', newConditions);
                  }}
                  placeholder="Expected value"
                />
                <Input
                  label="Output Handle"
                  value={cond.outputHandle}
                  onChange={(v) => {
                    const newConditions = localData.conditions.map((c) =>
                      c.id === cond.id ? { ...c, outputHandle: v } : c
                    );
                    updateField('conditions', newConditions);
                  }}
                  placeholder="yes"
                />
              </div>
            ))}
            <button
              onClick={() => {
                const newCondition = {
                  id: `cond-${Date.now()}`,
                  variable: '',
                  operator: 'equals' as const,
                  value: '',
                  outputHandle: `output-${localData.conditions.length + 1}`,
                };
                updateField('conditions', [...localData.conditions, newCondition]);
              }}
              className="w-full py-2 border border-dashed border-white/20 rounded-lg text-white/50 text-sm hover:border-orange-500/50 hover:text-orange-400 transition flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Condition
            </button>
            <Input
              label="Default Output Handle"
              value={localData.defaultOutputHandle}
              onChange={(v) => updateField('defaultOutputHandle', v)}
              placeholder="no"
            />
          </>
        );

      case 'aiResponse':
        return (
          <>
            <Textarea
              label="Prompt"
              value={localData.prompt}
              onChange={(v) => updateField('prompt', v)}
              placeholder="Generate a helpful response..."
              rows={4}
            />
            <Textarea
              label="System Prompt (optional)"
              value={localData.systemPrompt || ''}
              onChange={(v) => updateField('systemPrompt', v)}
              placeholder="You are a helpful assistant..."
              rows={3}
            />
            <Select
              label="Model"
              value={localData.model || 'gpt-4'}
              onChange={(v) => updateField('model', v as 'gpt-4' | 'gpt-3.5-turbo' | 'claude-3' | 'claude-instant')}
              options={[
                { value: 'gpt-4', label: 'GPT-4' },
                { value: 'gpt-3.5-turbo', label: 'GPT-3.5 Turbo' },
                { value: 'claude-3', label: 'Claude 3' },
                { value: 'claude-instant', label: 'Claude Instant' },
              ]}
            />
            <Input
              label="Temperature"
              type="number"
              value={localData.temperature || 0.7}
              onChange={(v) => updateField('temperature', parseFloat(v) || 0.7)}
              placeholder="0.7"
            />
            <Input
              label="Save to Variable"
              value={localData.saveToVariable || ''}
              onChange={(v) => updateField('saveToVariable', v)}
              placeholder="ai_response"
            />
          </>
        );

      case 'apiCall':
        return (
          <>
            <Select
              label="Method"
              value={localData.method}
              onChange={(v) => updateField('method', v as 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE')}
              options={[
                { value: 'GET', label: 'GET' },
                { value: 'POST', label: 'POST' },
                { value: 'PUT', label: 'PUT' },
                { value: 'PATCH', label: 'PATCH' },
                { value: 'DELETE', label: 'DELETE' },
              ]}
            />
            <Input
              label="URL"
              value={localData.url}
              onChange={(v) => updateField('url', v)}
              placeholder="https://api.example.com/endpoint"
            />
            {(localData.method === 'POST' || localData.method === 'PUT' || localData.method === 'PATCH') && (
              <Textarea
                label="Request Body"
                value={localData.body || ''}
                onChange={(v) => updateField('body', v)}
                placeholder='{"key": "value"}'
                rows={4}
              />
            )}
            <Input
              label="Response Variable"
              value={localData.responseVariable || ''}
              onChange={(v) => updateField('responseVariable', v)}
              placeholder="api_response"
            />
            <Select
              label="On Error"
              value={localData.onError || 'continue'}
              onChange={(v) => updateField('onError', v as 'continue' | 'stop' | 'retry')}
              options={[
                { value: 'continue', label: 'Continue' },
                { value: 'stop', label: 'Stop' },
                { value: 'retry', label: 'Retry' },
              ]}
            />
          </>
        );

      case 'setVariable':
        return (
          <>
            {localData.variables.map((variable, idx) => (
              <div key={idx} className="p-3 bg-white/5 rounded-lg space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs text-white/50">Variable {idx + 1}</span>
                  <button
                    onClick={() => {
                      const newVariables = localData.variables.filter((_, i) => i !== idx);
                      updateField('variables', newVariables);
                    }}
                    className="text-red-400 hover:text-red-300 text-xs"
                  >
                    Remove
                  </button>
                </div>
                <Input
                  label="Name"
                  value={variable.name}
                  onChange={(v) => {
                    const newVariables = localData.variables.map((vr, i) =>
                      i === idx ? { ...vr, name: v } : vr
                    );
                    updateField('variables', newVariables);
                  }}
                  placeholder="variable_name"
                />
                <Input
                  label="Value"
                  value={variable.value}
                  onChange={(v) => {
                    const newVariables = localData.variables.map((vr, i) =>
                      i === idx ? { ...vr, value: v } : vr
                    );
                    updateField('variables', newVariables);
                  }}
                  placeholder="value"
                />
              </div>
            ))}
            <button
              onClick={() => {
                updateField('variables', [
                  ...localData.variables,
                  { name: '', value: '', valueType: 'static' as const },
                ]);
              }}
              className="w-full py-2 border border-dashed border-white/20 rounded-lg text-white/50 text-sm hover:border-orange-500/50 hover:text-orange-400 transition flex items-center justify-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Add Variable
            </button>
          </>
        );

      case 'handoff':
        return (
          <>
            <Input
              label="Message"
              value={localData.message || ''}
              onChange={(v) => updateField('message', v)}
              placeholder="Transferring you to an agent..."
            />
            <Select
              label="Priority"
              value={localData.priority || 'medium'}
              onChange={(v) => updateField('priority', v as 'low' | 'medium' | 'high' | 'urgent')}
              options={[
                { value: 'low', label: 'Low' },
                { value: 'medium', label: 'Medium' },
                { value: 'high', label: 'High' },
                { value: 'urgent', label: 'Urgent' },
              ]}
            />
            <Input
              label="Department"
              value={localData.department || ''}
              onChange={(v) => updateField('department', v)}
              placeholder="Support"
            />
            <Input
              label="Reason"
              value={localData.reason || ''}
              onChange={(v) => updateField('reason', v)}
              placeholder="User requested human agent"
            />
          </>
        );

      case 'end':
        return (
          <>
            <Select
              label="End Type"
              value={localData.endType}
              onChange={(v) => updateField('endType', v as 'complete' | 'cancelled' | 'error' | 'timeout')}
              options={[
                { value: 'complete', label: 'Complete' },
                { value: 'cancelled', label: 'Cancelled' },
                { value: 'error', label: 'Error' },
                { value: 'timeout', label: 'Timeout' },
              ]}
            />
            <Textarea
              label="Final Message"
              value={localData.finalMessage || ''}
              onChange={(v) => updateField('finalMessage', v)}
              placeholder="Thank you for chatting with us!"
              rows={3}
            />
            <Toggle
              label="Collect Feedback"
              checked={localData.collectFeedback || false}
              onChange={(v) => updateField('collectFeedback', v)}
            />
            <Input
              label="Redirect URL"
              value={localData.redirectUrl || ''}
              onChange={(v) => updateField('redirectUrl', v)}
              placeholder="https://example.com/thank-you"
            />
          </>
        );

      default:
        return <p className="text-sm text-white/40">No properties available</p>;
    }
  };

  return (
    <motion.div
      initial={{ x: 320, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: 320, opacity: 0 }}
      className="w-80 h-full bg-slate-900/95 backdrop-blur-xl border-l border-white/5 flex flex-col overflow-hidden"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b border-white/5">
        <div className="flex items-center gap-3">
          <div
            className="w-10 h-10 rounded-lg flex items-center justify-center"
            style={{ backgroundColor: `${color}20` }}
          >
            <Icon className="w-5 h-5" style={{ color }} />
          </div>
          <div>
            <h3 className="text-sm font-semibold text-white">{localData.label}</h3>
            <p className="text-xs text-white/40 capitalize">{node.type} Node</p>
          </div>
        </div>
        <button
          onClick={onClose}
          className="p-1.5 rounded-lg hover:bg-white/5 text-white/40 hover:text-white transition"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Basic Properties */}
        <Input
          label="Label"
          value={localData.label}
          onChange={(v) => updateField('label', v)}
          placeholder="Node label"
        />
        <Input
          label="Description (optional)"
          value={localData.description || ''}
          onChange={(v) => updateField('description', v)}
          placeholder="Brief description..."
        />

        {/* Type-specific Properties */}
        <Section title="Properties">{renderTypeFields()}</Section>
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-white/5 flex gap-2">
        <button
          onClick={handleDuplicate}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition text-sm"
        >
          <Copy className="w-4 h-4" />
          Duplicate
        </button>
        <button
          onClick={handleDelete}
          className="flex-1 flex items-center justify-center gap-2 px-3 py-2 rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 transition text-sm"
        >
          <Trash2 className="w-4 h-4" />
          Delete
        </button>
      </div>
    </motion.div>
  );
}
