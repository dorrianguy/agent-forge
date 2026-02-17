'use client';

import React, { useRef } from 'react';
import { motion } from 'framer-motion';
import {
  Save,
  Download,
  Upload,
  Undo2,
  Redo2,
  ZoomIn,
  ZoomOut,
  Maximize2,
  LayoutGrid,
  Trash2,
  Copy,
  Settings,
  Play,
  FileJson,
} from 'lucide-react';
import { useFlowBuilder } from '@/hooks/useFlowBuilder';

interface ToolbarProps {
  onFitView: () => void;
  flowName: string;
  onNameChange: (name: string) => void;
}

export default function Toolbar({ onFitView, flowName, onNameChange }: ToolbarProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const {
    zoom,
    zoomIn,
    zoomOut,
    undo,
    redo,
    canUndo,
    canRedo,
    saveFlow,
    exportFlow,
    importFlow,
    autoLayout,
    selectedNodeId,
    deleteNode,
    duplicateNode,
    isDirty,
    newFlow,
  } = useFlowBuilder();

  const handleSave = () => {
    saveFlow();
    // Show toast or notification
  };

  const handleExport = () => {
    const json = exportFlow();
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${flowName.toLowerCase().replace(/\s+/g, '-')}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const json = event.target?.result as string;
      if (importFlow(json)) {
        // Show success toast
      } else {
        // Show error toast
        alert('Failed to import flow. Invalid format.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleDelete = () => {
    if (selectedNodeId) {
      deleteNode(selectedNodeId);
    }
  };

  const handleDuplicate = () => {
    if (selectedNodeId) {
      duplicateNode(selectedNodeId);
    }
  };

  const ToolButton = ({
    icon: Icon,
    label,
    onClick,
    disabled = false,
    danger = false,
    active = false,
  }: {
    icon: React.ElementType;
    label: string;
    onClick: () => void;
    disabled?: boolean;
    danger?: boolean;
    active?: boolean;
  }) => (
    <motion.button
      onClick={onClick}
      disabled={disabled}
      className={`
        relative p-2 rounded-lg transition-all group
        ${disabled 
          ? 'opacity-40 cursor-not-allowed' 
          : danger 
            ? 'hover:bg-red-500/20 text-white/60 hover:text-red-400' 
            : active
              ? 'bg-orange-500/20 text-orange-400'
              : 'hover:bg-white/10 text-white/60 hover:text-white'
        }
      `}
      whileHover={!disabled ? { scale: 1.05 } : undefined}
      whileTap={!disabled ? { scale: 0.95 } : undefined}
    >
      <Icon className="w-4 h-4" />
      <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2 py-1 text-xs bg-slate-800 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
        {label}
      </span>
    </motion.button>
  );

  const Divider = () => (
    <div className="w-px h-6 bg-white/10 mx-1" />
  );

  return (
    <motion.div
      className="bg-slate-900/80 backdrop-blur-xl border-b border-white/5 px-4 py-2"
      initial={{ y: -20, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
    >
      <div className="flex items-center justify-between">
        {/* Left Section - Flow Name & Status */}
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-2">
            <input
              type="text"
              value={flowName}
              onChange={(e) => onNameChange(e.target.value)}
              className="bg-transparent text-white font-semibold text-lg focus:outline-none border-b border-transparent hover:border-white/20 focus:border-orange-500 transition px-1"
              placeholder="Untitled Flow"
            />
            {isDirty && (
              <span className="w-2 h-2 bg-orange-500 rounded-full" title="Unsaved changes" />
            )}
          </div>
        </div>

        {/* Center Section - Tools */}
        <div className="flex items-center gap-1 bg-white/5 rounded-xl p-1">
          {/* History */}
          <ToolButton icon={Undo2} label="Undo (Ctrl+Z)" onClick={undo} disabled={!canUndo()} />
          <ToolButton icon={Redo2} label="Redo (Ctrl+Y)" onClick={redo} disabled={!canRedo()} />

          <Divider />

          {/* Zoom Controls */}
          <ToolButton icon={ZoomOut} label="Zoom Out" onClick={zoomOut} />
          <span className="text-xs text-white/60 w-12 text-center">
            {Math.round(zoom * 100)}%
          </span>
          <ToolButton icon={ZoomIn} label="Zoom In" onClick={zoomIn} />
          <ToolButton icon={Maximize2} label="Fit View" onClick={onFitView} />

          <Divider />

          {/* Layout */}
          <ToolButton icon={LayoutGrid} label="Auto Layout" onClick={autoLayout} />

          <Divider />

          {/* Node Actions */}
          <ToolButton
            icon={Copy}
            label="Duplicate (Ctrl+D)"
            onClick={handleDuplicate}
            disabled={!selectedNodeId}
          />
          <ToolButton
            icon={Trash2}
            label="Delete (Del)"
            onClick={handleDelete}
            disabled={!selectedNodeId}
            danger
          />
        </div>

        {/* Right Section - File Actions */}
        <div className="flex items-center gap-2">
          <motion.button
            onClick={handleImport}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Upload className="w-4 h-4" />
            <span className="text-sm">Import</span>
          </motion.button>

          <motion.button
            onClick={handleExport}
            className="flex items-center gap-2 px-3 py-2 rounded-lg bg-white/5 text-white/60 hover:bg-white/10 hover:text-white transition"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Download className="w-4 h-4" />
            <span className="text-sm">Export</span>
          </motion.button>

          <motion.button
            onClick={handleSave}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-gradient-to-r from-orange-500 to-red-500 text-white font-medium shadow-lg shadow-orange-500/25"
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
          >
            <Save className="w-4 h-4" />
            <span className="text-sm">Save</span>
          </motion.button>
        </div>
      </div>

      {/* Hidden file input for import */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".json"
        onChange={handleFileChange}
        className="hidden"
      />
    </motion.div>
  );
}
