'use client';

import React, { memo } from 'react';
import { NodeProps } from 'reactflow';
import { Play, Zap, MessageCircle, Webhook } from 'lucide-react';
import BaseNode from './BaseNode';
import type { StartNodeData } from '@/lib/flow-types';

const triggerIcons = {
  greeting: MessageCircle,
  keyword: Zap,
  intent: Play,
  webhook: Webhook,
};

const StartNode = memo((props: NodeProps<StartNodeData>) => {
  const { data } = props;
  const TriggerIcon = triggerIcons[data.triggerType] || Play;

  return (
    <BaseNode
      nodeProps={props}
      icon={Play}
      color="green"
      gradientFrom="#22c55e"
      gradientTo="#16a34a"
      hasInput={false}
      hasOutput={true}
    >
      <div className="space-y-2">
        <div className="flex items-center gap-2 text-xs">
          <TriggerIcon className="w-3 h-3 text-green-400" />
          <span className="text-white/60">Trigger:</span>
          <span className="text-white font-medium capitalize">{data.triggerType}</span>
        </div>
        {data.triggerValue && (
          <div className="text-xs text-white/40 bg-white/5 px-2 py-1 rounded">
            {data.triggerValue}
          </div>
        )}
      </div>
    </BaseNode>
  );
});

StartNode.displayName = 'StartNode';

export default StartNode;
