'use client';

import React, { memo } from 'react';
import { NodeProps } from 'reactflow';
import { StopCircle, CheckCircle, XCircle, AlertTriangle, Clock, Star, ExternalLink } from 'lucide-react';
import BaseNode from './BaseNode';
import type { EndNodeData } from '@/lib/flow-types';

const endTypeConfig: Record<string, { icon: typeof CheckCircle; color: string; label: string }> = {
  complete: { icon: CheckCircle, color: 'text-green-400', label: 'Complete' },
  cancelled: { icon: XCircle, color: 'text-yellow-400', label: 'Cancelled' },
  error: { icon: AlertTriangle, color: 'text-red-400', label: 'Error' },
  timeout: { icon: Clock, color: 'text-orange-400', label: 'Timeout' },
};

const EndNode = memo((props: NodeProps<EndNodeData>) => {
  const { data } = props;
  const config = endTypeConfig[data.endType] || endTypeConfig.complete;
  const EndTypeIcon = config.icon;

  return (
    <BaseNode
      nodeProps={props}
      icon={StopCircle}
      color="red"
      gradientFrom="#ef4444"
      gradientTo="#dc2626"
      hasOutput={false}
    >
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <EndTypeIcon className={`w-4 h-4 ${config.color}`} />
          <span className={`text-xs font-medium ${config.color}`}>{config.label}</span>
        </div>

        {data.finalMessage && (
          <p className="text-xs text-white/70 line-clamp-2">{data.finalMessage}</p>
        )}

        <div className="flex flex-wrap items-center gap-2 text-[10px]">
          {data.collectFeedback && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 bg-yellow-500/20 text-yellow-300 rounded">
              <Star className="w-3 h-3" />
              Feedback
            </span>
          )}

          {data.redirectUrl && (
            <span className="flex items-center gap-1 px-1.5 py-0.5 bg-blue-500/20 text-blue-300 rounded">
              <ExternalLink className="w-3 h-3" />
              Redirect
            </span>
          )}
        </div>
      </div>
    </BaseNode>
  );
});

EndNode.displayName = 'EndNode';

export default EndNode;
