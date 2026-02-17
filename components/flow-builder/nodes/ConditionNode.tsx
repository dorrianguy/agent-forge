'use client';

import React, { memo } from 'react';
import { NodeProps } from 'reactflow';
import { GitBranch } from 'lucide-react';
import BaseNode from './BaseNode';
import type { ConditionNodeData } from '@/lib/flow-types';

const operatorLabels: Record<string, string> = {
  equals: '=',
  notEquals: '≠',
  contains: '∋',
  notContains: '∌',
  greaterThan: '>',
  lessThan: '<',
  isEmpty: '∅',
  isNotEmpty: '≠∅',
  matches: '~',
};

const ConditionNode = memo((props: NodeProps<ConditionNodeData>) => {
  const { data } = props;

  // Build output handles from conditions
  const outputs = [
    ...data.conditions.map((cond) => ({
      id: cond.outputHandle,
      label: cond.outputHandle,
    })),
    { id: data.defaultOutputHandle, label: data.defaultOutputHandle },
  ];

  return (
    <BaseNode
      nodeProps={props}
      icon={GitBranch}
      color="yellow"
      gradientFrom="#eab308"
      gradientTo="#ca8a04"
      outputs={outputs}
    >
      <div className="space-y-2 pb-4">
        {data.conditions.map((condition, index) => (
          <div key={condition.id} className="flex items-center gap-2 text-xs">
            <span className="text-yellow-400 font-mono">if</span>
            <code className="text-white/70 bg-white/5 px-1 rounded truncate max-w-[60px]">
              {condition.variable || '?'}
            </code>
            <span className="text-yellow-400 font-mono">
              {operatorLabels[condition.operator] || condition.operator}
            </span>
            <span className="text-white/70 truncate max-w-[60px]">
              {condition.value || '...'}
            </span>
            <span className="text-white/40">→</span>
            <span className="text-green-400 text-[10px]">{condition.outputHandle}</span>
          </div>
        ))}
        <div className="flex items-center gap-2 text-xs text-white/50">
          <span className="text-yellow-400/60 font-mono">else</span>
          <span>→</span>
          <span className="text-red-400 text-[10px]">{data.defaultOutputHandle}</span>
        </div>
      </div>
    </BaseNode>
  );
});

ConditionNode.displayName = 'ConditionNode';

export default ConditionNode;
