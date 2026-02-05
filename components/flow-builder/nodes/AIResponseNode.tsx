'use client';

import React, { memo } from 'react';
import { NodeProps } from 'reactflow';
import { Sparkles, Cpu, Thermometer, Save } from 'lucide-react';
import BaseNode from './BaseNode';
import type { AIResponseNodeData } from '@/lib/flow-types';

const modelLabels: Record<string, string> = {
  'gpt-4': 'GPT-4',
  'gpt-3.5-turbo': 'GPT-3.5',
  'claude-3': 'Claude 3',
  'claude-instant': 'Claude Instant',
};

const AIResponseNode = memo((props: NodeProps<AIResponseNodeData>) => {
  const { data } = props;

  return (
    <BaseNode
      nodeProps={props}
      icon={Sparkles}
      color="orange"
      gradientFrom="#f97316"
      gradientTo="#ea580c"
    >
      <div className="space-y-2">
        <p className="text-xs text-white/70 line-clamp-2">
          {data.prompt || 'No prompt configured'}
        </p>

        <div className="flex flex-wrap items-center gap-2 text-[10px]">
          {data.model && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 bg-orange-500/20 text-orange-300 rounded">
              <Cpu className="w-3 h-3" />
              {modelLabels[data.model] || data.model}
            </span>
          )}
          
          {data.temperature !== undefined && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 bg-white/5 text-white/60 rounded">
              <Thermometer className="w-3 h-3" />
              {data.temperature}
            </span>
          )}
        </div>

        {data.saveToVariable && (
          <div className="flex items-center gap-1 text-xs text-white/50">
            <Save className="w-3 h-3" />
            <span>Save to:</span>
            <code className="text-orange-300 bg-orange-500/20 px-1 rounded">
              ${'{' + data.saveToVariable + '}'}
            </code>
          </div>
        )}

        {data.contextVariables && data.contextVariables.length > 0 && (
          <div className="text-[10px] text-white/40">
            Context: {data.contextVariables.join(', ')}
          </div>
        )}
      </div>
    </BaseNode>
  );
});

AIResponseNode.displayName = 'AIResponseNode';

export default AIResponseNode;
