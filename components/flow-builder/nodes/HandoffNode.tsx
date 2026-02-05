'use client';

import React, { memo } from 'react';
import { NodeProps } from 'reactflow';
import { UserPlus, AlertCircle, Building, Clock } from 'lucide-react';
import BaseNode from './BaseNode';
import type { HandoffNodeData } from '@/lib/flow-types';

const priorityColors: Record<string, string> = {
  low: 'text-green-400 bg-green-500/20',
  medium: 'text-yellow-400 bg-yellow-500/20',
  high: 'text-orange-400 bg-orange-500/20',
  urgent: 'text-red-400 bg-red-500/20',
};

const HandoffNode = memo((props: NodeProps<HandoffNodeData>) => {
  const { data } = props;

  return (
    <BaseNode
      nodeProps={props}
      icon={UserPlus}
      color="pink"
      gradientFrom="#ec4899"
      gradientTo="#db2777"
    >
      <div className="space-y-2">
        {data.message && (
          <p className="text-xs text-white/70 line-clamp-2">{data.message}</p>
        )}

        <div className="flex flex-wrap items-center gap-2 text-[10px]">
          {data.priority && (
            <span className={`flex items-center gap-1 px-1.5 py-0.5 rounded ${priorityColors[data.priority] || 'text-white/60 bg-white/10'}`}>
              <AlertCircle className="w-3 h-3" />
              {data.priority}
            </span>
          )}

          {data.department && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 bg-white/5 text-white/60 rounded">
              <Building className="w-3 h-3" />
              {data.department}
            </span>
          )}
        </div>

        {data.reason && (
          <p className="text-[10px] text-white/40">
            Reason: {data.reason}
          </p>
        )}

        {data.workingHours?.enabled && (
          <div className="flex items-center gap-1 text-[10px] text-white/40">
            <Clock className="w-3 h-3" />
            Working hours enabled
          </div>
        )}

        {data.collectInfo && data.collectInfo.length > 0 && (
          <div className="text-[10px] text-white/40">
            Collect: {data.collectInfo.join(', ')}
          </div>
        )}
      </div>
    </BaseNode>
  );
});

HandoffNode.displayName = 'HandoffNode';

export default HandoffNode;
