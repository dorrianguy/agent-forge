'use client';

import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  MessageSquare,
  UserCircle,
  GitBranch,
  Sparkles,
  Globe,
  Database,
  UserPlus,
  StopCircle,
  ChevronLeft,
  ChevronRight,
  Search,
  GripVertical,
} from 'lucide-react';
import type { NodeType, NodeConfig } from '@/lib/flow-types';

interface SidebarProps {
  onDragStart: (event: React.DragEvent, nodeType: NodeType) => void;
}

const nodeConfigs: NodeConfig[] = [
  {
    type: 'start',
    label: 'Start',
    description: 'Entry point of the flow',
    icon: 'Play',
    color: '#22c55e',
    defaultData: { triggerType: 'greeting' },
  },
  {
    type: 'message',
    label: 'Message',
    description: 'Send a message to the user',
    icon: 'MessageSquare',
    color: '#3b82f6',
    defaultData: { content: '' },
  },
  {
    type: 'userInput',
    label: 'User Input',
    description: 'Wait for user response',
    icon: 'UserCircle',
    color: '#a855f7',
    defaultData: { inputType: 'text' },
  },
  {
    type: 'condition',
    label: 'Condition',
    description: 'Branch based on conditions',
    icon: 'GitBranch',
    color: '#eab308',
    defaultData: { conditions: [] },
  },
  {
    type: 'aiResponse',
    label: 'AI Response',
    description: 'Generate AI response',
    icon: 'Sparkles',
    color: '#f97316',
    defaultData: { prompt: '' },
  },
  {
    type: 'apiCall',
    label: 'API Call',
    description: 'Call external API',
    icon: 'Globe',
    color: '#06b6d4',
    defaultData: { method: 'GET', url: '' },
  },
  {
    type: 'setVariable',
    label: 'Set Variable',
    description: 'Store data in variables',
    icon: 'Database',
    color: '#6366f1',
    defaultData: { variables: [] },
  },
  {
    type: 'handoff',
    label: 'Handoff',
    description: 'Transfer to human agent',
    icon: 'UserPlus',
    color: '#ec4899',
    defaultData: { priority: 'medium' },
  },
  {
    type: 'end',
    label: 'End',
    description: 'End the conversation',
    icon: 'StopCircle',
    color: '#ef4444',
    defaultData: { endType: 'complete' },
  },
];

const iconMap: Record<string, React.ElementType> = {
  Play,
  MessageSquare,
  UserCircle,
  GitBranch,
  Sparkles,
  Globe,
  Database,
  UserPlus,
  StopCircle,
};

export default function Sidebar({ onDragStart }: SidebarProps) {
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredNodes = nodeConfigs.filter(
    (node) =>
      node.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
      node.description.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <motion.div
      className={`
        relative h-full bg-slate-900/80 backdrop-blur-xl border-r border-white/5
        flex flex-col overflow-hidden transition-all duration-300
        ${isCollapsed ? 'w-16' : 'w-64'}
      `}
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
    >
      {/* Header */}
      <div className="p-4 border-b border-white/5">
        <div className="flex items-center justify-between">
          {!isCollapsed && (
            <h2 className="text-sm font-semibold text-white">Nodes</h2>
          )}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-lg hover:bg-white/5 text-white/60 hover:text-white transition"
          >
            {isCollapsed ? (
              <ChevronRight className="w-4 h-4" />
            ) : (
              <ChevronLeft className="w-4 h-4" />
            )}
          </button>
        </div>

        {/* Search */}
        {!isCollapsed && (
          <div className="relative mt-3">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-white/40" />
            <input
              type="text"
              placeholder="Search nodes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-2 text-sm bg-white/5 border border-white/10 rounded-lg text-white placeholder:text-white/40 focus:outline-none focus:border-orange-500/50"
            />
          </div>
        )}
      </div>

      {/* Node List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        <AnimatePresence mode="popLayout">
          {filteredNodes.map((node, index) => {
            const Icon = iconMap[node.icon] || Play;

            return (
              <motion.div
                key={node.type}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.9 }}
                transition={{ delay: index * 0.05 }}
                draggable
                onDragStart={(e) => onDragStart(e as unknown as React.DragEvent, node.type)}
                className={`
                  group cursor-grab active:cursor-grabbing
                  ${isCollapsed ? 'p-2 justify-center' : 'p-3'}
                  rounded-xl bg-white/5 border border-white/5
                  hover:bg-white/10 hover:border-white/10
                  transition-all duration-200
                  flex items-center gap-3
                `}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <div
                  className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${node.color}20` }}
                >
                  <Icon className="w-4 h-4" style={{ color: node.color }} />
                </div>

                {!isCollapsed && (
                  <>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-sm font-medium text-white truncate">
                        {node.label}
                      </h3>
                      <p className="text-xs text-white/40 truncate">
                        {node.description}
                      </p>
                    </div>
                    <GripVertical className="w-4 h-4 text-white/20 group-hover:text-white/40 transition" />
                  </>
                )}
              </motion.div>
            );
          })}
        </AnimatePresence>

        {filteredNodes.length === 0 && (
          <div className="text-center py-8 text-white/40 text-sm">
            No nodes found
          </div>
        )}
      </div>

      {/* Help Text */}
      {!isCollapsed && (
        <div className="p-4 border-t border-white/5">
          <p className="text-xs text-white/40 text-center">
            Drag nodes onto the canvas to build your flow
          </p>
        </div>
      )}
    </motion.div>
  );
}
