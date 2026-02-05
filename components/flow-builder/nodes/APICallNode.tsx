'use client';

import React, { memo } from 'react';
import { NodeProps } from 'reactflow';
import { Globe, Clock, RefreshCw, AlertTriangle } from 'lucide-react';
import BaseNode from './BaseNode';
import type { APICallNodeData } from '@/lib/flow-types';

const methodColors: Record<string, string> = {
  GET: 'text-green-400 bg-green-500/20',
  POST: 'text-blue-400 bg-blue-500/20',
  PUT: 'text-yellow-400 bg-yellow-500/20',
  PATCH: 'text-orange-400 bg-orange-500/20',
  DELETE: 'text-red-400 bg-red-500/20',
};

const APICallNode = memo((props: NodeProps<APICallNodeData>) => {
  const { data } = props;

  const getDomain = (url: string) => {
    try {
      return new URL(url).hostname;
    } catch {
      return url || 'No URL';
    }
  };

  return (
    <BaseNode
      nodeProps={props}
      icon={Globe}
      color="cyan"
      gradientFrom="#06b6d4"
      gradientTo="#0891b2"
    >
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <span className={`px-1.5 py-0.5 text-[10px] font-mono font-bold rounded ${methodColors[data.method] || 'text-white/60 bg-white/10'}`}>
            {data.method}
          </span>
          <span className="text-xs text-white/60 truncate max-w-[120px]">
            {getDomain(data.url)}
          </span>
        </div>

        {data.url && (
          <p className="text-[10px] text-white/40 font-mono truncate">
            {data.url}
          </p>
        )}

        <div className="flex flex-wrap items-center gap-2 text-[10px]">
          {data.timeout && (
            <span className="flex items-center gap-1 text-white/40">
              <Clock className="w-3 h-3" />
              {data.timeout / 1000}s
            </span>
          )}
          
          {data.retries && data.retries > 0 && (
            <span className="flex items-center gap-1 text-white/40">
              <RefreshCw className="w-3 h-3" />
              {data.retries}x
            </span>
          )}

          {data.onError && data.onError !== 'continue' && (
            <span className="flex items-center gap-1 text-yellow-400/60">
              <AlertTriangle className="w-3 h-3" />
              {data.onError}
            </span>
          )}
        </div>

        {data.responseVariable && (
          <div className="text-xs text-white/50">
            Response → <code className="text-cyan-300 bg-cyan-500/20 px-1 rounded">
              ${'{' + data.responseVariable + '}'}
            </code>
          </div>
        )}
      </div>
    </BaseNode>
  );
});

APICallNode.displayName = 'APICallNode';

export default APICallNode;
