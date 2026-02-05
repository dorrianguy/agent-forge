'use client';

import React, { memo, ReactNode } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { motion } from 'framer-motion';
import { LucideIcon } from 'lucide-react';

interface BaseNodeProps {
  nodeProps: NodeProps;
  icon: LucideIcon;
  color: string;
  gradientFrom: string;
  gradientTo: string;
  children?: ReactNode;
  hasInput?: boolean;
  hasOutput?: boolean;
  outputs?: Array<{ id: string; label: string; position?: number }>;
}

const BaseNode = memo(({
  nodeProps,
  icon: Icon,
  color,
  gradientFrom,
  gradientTo,
  children,
  hasInput = true,
  hasOutput = true,
  outputs,
}: BaseNodeProps) => {
  const { data, selected } = nodeProps;

  return (
    <motion.div
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      className={`
        relative min-w-[200px] rounded-xl
        bg-slate-900/90 backdrop-blur-sm
        border-2 transition-all duration-200
        ${selected 
          ? `border-${color}-500 shadow-lg shadow-${color}-500/30` 
          : 'border-white/10 hover:border-white/20'
        }
      `}
      style={{
        borderColor: selected ? gradientFrom : undefined,
        boxShadow: selected ? `0 0 20px ${gradientFrom}40` : undefined,
      }}
    >
      {/* Input Handle */}
      {hasInput && (
        <Handle
          type="target"
          position={Position.Top}
          className="!w-3 !h-3 !bg-slate-600 !border-2 !border-slate-400 hover:!bg-orange-500 hover:!border-orange-400 transition-colors"
        />
      )}

      {/* Header */}
      <div 
        className="flex items-center gap-3 px-4 py-3 rounded-t-xl"
        style={{
          background: `linear-gradient(135deg, ${gradientFrom}20, ${gradientTo}20)`,
        }}
      >
        <div 
          className="w-8 h-8 rounded-lg flex items-center justify-center"
          style={{
            background: `linear-gradient(135deg, ${gradientFrom}, ${gradientTo})`,
          }}
        >
          <Icon className="w-4 h-4 text-white" />
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-semibold text-white truncate">
            {data.label}
          </h3>
          {data.description && (
            <p className="text-xs text-white/50 truncate">{data.description}</p>
          )}
        </div>
      </div>

      {/* Content */}
      {children && (
        <div className="px-4 py-3 border-t border-white/5">
          {children}
        </div>
      )}

      {/* Output Handle(s) */}
      {hasOutput && !outputs && (
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-3 !h-3 !bg-slate-600 !border-2 !border-slate-400 hover:!bg-orange-500 hover:!border-orange-400 transition-colors"
        />
      )}

      {/* Multiple Output Handles */}
      {outputs && outputs.map((output, index) => {
        const position = output.position ?? ((index + 1) / (outputs.length + 1)) * 100;
        return (
          <div key={output.id} className="relative">
            <Handle
              type="source"
              position={Position.Bottom}
              id={output.id}
              className="!w-3 !h-3 !bg-slate-600 !border-2 !border-slate-400 hover:!bg-orange-500 hover:!border-orange-400 transition-colors"
              style={{ left: `${position}%` }}
            />
            <span 
              className="absolute -bottom-5 text-[10px] text-white/40 whitespace-nowrap"
              style={{ left: `${position}%`, transform: 'translateX(-50%)' }}
            >
              {output.label}
            </span>
          </div>
        );
      })}
    </motion.div>
  );
});

BaseNode.displayName = 'BaseNode';

export default BaseNode;
