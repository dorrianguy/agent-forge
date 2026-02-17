'use client';

import React, { memo } from 'react';
import { NodeProps } from 'reactflow';
import { MessageSquare, Clock, MousePointer } from 'lucide-react';
import BaseNode from './BaseNode';
import type { MessageNodeData } from '@/lib/flow-types';

const MessageNode = memo((props: NodeProps<MessageNodeData>) => {
  const { data } = props;

  return (
    <BaseNode
      nodeProps={props}
      icon={MessageSquare}
      color="blue"
      gradientFrom="#3b82f6"
      gradientTo="#2563eb"
    >
      <div className="space-y-2">
        <p className="text-xs text-white/70 line-clamp-3">
          {data.content || 'No message content'}
        </p>
        
        <div className="flex items-center gap-3 text-[10px] text-white/40">
          {data.typing && (
            <span className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 bg-blue-400 rounded-full animate-pulse" />
              Typing
            </span>
          )}
          {data.delay && data.delay > 0 && (
            <span className="flex items-center gap-1">
              <Clock className="w-3 h-3" />
              {data.delay}ms
            </span>
          )}
          {data.buttons && data.buttons.length > 0 && (
            <span className="flex items-center gap-1">
              <MousePointer className="w-3 h-3" />
              {data.buttons.length} buttons
            </span>
          )}
        </div>

        {data.quickReplies && data.quickReplies.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {data.quickReplies.slice(0, 3).map((reply, i) => (
              <span key={i} className="px-2 py-0.5 text-[10px] bg-blue-500/20 text-blue-300 rounded">
                {reply}
              </span>
            ))}
            {data.quickReplies.length > 3 && (
              <span className="text-[10px] text-white/40">+{data.quickReplies.length - 3} more</span>
            )}
          </div>
        )}
      </div>
    </BaseNode>
  );
});

MessageNode.displayName = 'MessageNode';

export default MessageNode;
