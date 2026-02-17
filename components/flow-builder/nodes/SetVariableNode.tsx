'use client';

import React, { memo } from 'react';
import { NodeProps } from 'reactflow';
import { Database, Equal } from 'lucide-react';
import BaseNode from './BaseNode';
import type { SetVariableNodeData } from '@/lib/flow-types';

const valueTypeLabels: Record<string, string> = {
  static: 'Static',
  expression: 'Expr',
  fromVariable: 'Var',
};

const SetVariableNode = memo((props: NodeProps<SetVariableNodeData>) => {
  const { data } = props;

  return (
    <BaseNode
      nodeProps={props}
      icon={Database}
      color="indigo"
      gradientFrom="#6366f1"
      gradientTo="#4f46e5"
    >
      <div className="space-y-2">
        {data.variables.map((variable, index) => (
          <div key={index} className="flex items-center gap-2 text-xs">
            <code className="text-indigo-300 bg-indigo-500/20 px-1.5 py-0.5 rounded truncate max-w-[60px]">
              {variable.name || '?'}
            </code>
            <Equal className="w-3 h-3 text-white/40" />
            <span className="text-[10px] text-white/40 px-1 bg-white/5 rounded">
              {valueTypeLabels[variable.valueType] || variable.valueType}
            </span>
            <span className="text-white/60 truncate max-w-[60px]">
              {variable.value || '...'}
            </span>
          </div>
        ))}

        {data.variables.length === 0 && (
          <p className="text-xs text-white/40 italic">No variables configured</p>
        )}

        {data.variables.length > 3 && (
          <p className="text-[10px] text-white/40">
            +{data.variables.length - 3} more variables
          </p>
        )}
      </div>
    </BaseNode>
  );
});

SetVariableNode.displayName = 'SetVariableNode';

export default SetVariableNode;
