'use client';

import React, { memo } from 'react';
import { NodeProps } from 'reactflow';
import { 
  UserCircle, 
  Type, 
  Mail, 
  Phone, 
  Hash, 
  Calendar, 
  List, 
  FileUp 
} from 'lucide-react';
import BaseNode from './BaseNode';
import type { UserInputNodeData } from '@/lib/flow-types';

const inputTypeIcons = {
  text: Type,
  email: Mail,
  phone: Phone,
  number: Hash,
  date: Calendar,
  choice: List,
  file: FileUp,
};

const UserInputNode = memo((props: NodeProps<UserInputNodeData>) => {
  const { data } = props;
  const InputIcon = inputTypeIcons[data.inputType] || Type;

  return (
    <BaseNode
      nodeProps={props}
      icon={UserCircle}
      color="purple"
      gradientFrom="#a855f7"
      gradientTo="#9333ea"
    >
      <div className="space-y-2">
        <div className="flex items-center gap-2">
          <InputIcon className="w-3 h-3 text-purple-400" />
          <span className="text-xs text-white/60">Type:</span>
          <span className="text-xs text-white font-medium capitalize">{data.inputType}</span>
        </div>

        {data.variableName && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-white/60">Save to:</span>
            <code className="text-xs text-purple-300 bg-purple-500/20 px-1.5 py-0.5 rounded">
              ${'{' + data.variableName + '}'}
            </code>
          </div>
        )}

        {data.prompt && (
          <p className="text-xs text-white/50 line-clamp-2">{data.prompt}</p>
        )}

        {data.choices && data.choices.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {data.choices.slice(0, 4).map((choice, i) => (
              <span key={i} className="px-2 py-0.5 text-[10px] bg-purple-500/20 text-purple-300 rounded">
                {choice}
              </span>
            ))}
            {data.choices.length > 4 && (
              <span className="text-[10px] text-white/40">+{data.choices.length - 4}</span>
            )}
          </div>
        )}

        {data.validation?.required && (
          <span className="text-[10px] text-orange-400">Required</span>
        )}
      </div>
    </BaseNode>
  );
});

UserInputNode.displayName = 'UserInputNode';

export default UserInputNode;
