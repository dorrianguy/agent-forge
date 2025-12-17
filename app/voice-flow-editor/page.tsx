'use client';

import React, { useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Phone, MessageSquare, GitBranch, Play, Pause, Save,
  Plus, Trash2, Settings, Zap, ChevronLeft, Check,
  PhoneCall, PhoneOff, Volume2, Calendar, Send,
  ArrowRight, Flame, X, Edit2, Copy, ExternalLink
} from 'lucide-react';
import Link from 'next/link';

// Node types for the flow editor
type NodeType = 'start' | 'greeting' | 'question' | 'response' | 'condition' | 'function' | 'transfer' | 'end';

interface FlowNode {
  id: string;
  type: NodeType;
  position: { x: number; y: number };
  data: {
    label: string;
    content?: string;
    condition?: string;
    function?: string;
    transferTo?: string;
    transitions?: string[];
  };
}

interface FlowEdge {
  id: string;
  source: string;
  target: string;
  label?: string;
}

// Node type configurations
const nodeTypes: Record<NodeType, { label: string; icon: any; color: string; description: string }> = {
  start: { label: 'Start', icon: Play, color: 'green', description: 'Call begins' },
  greeting: { label: 'Greeting', icon: Volume2, color: 'blue', description: 'Initial greeting message' },
  question: { label: 'Question', icon: MessageSquare, color: 'purple', description: 'Ask caller a question' },
  response: { label: 'Response', icon: MessageSquare, color: 'cyan', description: 'Agent response' },
  condition: { label: 'Condition', icon: GitBranch, color: 'yellow', description: 'Branch based on caller input' },
  function: { label: 'Function', icon: Zap, color: 'orange', description: 'Execute an action' },
  transfer: { label: 'Transfer', icon: PhoneCall, color: 'pink', description: 'Transfer to human' },
  end: { label: 'End Call', icon: PhoneOff, color: 'red', description: 'End the conversation' },
};

// Available functions
const availableFunctions = [
  { id: 'book_appointment', name: 'Book Appointment', icon: Calendar, description: 'Schedule via Cal.com' },
  { id: 'send_sms', name: 'Send SMS', icon: Send, description: 'Send text message' },
  { id: 'check_availability', name: 'Check Availability', icon: Calendar, description: 'Check calendar' },
  { id: 'lookup_customer', name: 'Lookup Customer', icon: MessageSquare, description: 'Find customer info' },
  { id: 'create_ticket', name: 'Create Ticket', icon: Edit2, description: 'Open support ticket' },
  { id: 'custom_api', name: 'Custom API', icon: ExternalLink, description: 'Call external API' },
];

// Sample initial flow
const initialNodes: FlowNode[] = [
  { id: 'start', type: 'start', position: { x: 50, y: 200 }, data: { label: 'Call Starts' } },
  { id: 'greeting', type: 'greeting', position: { x: 200, y: 200 }, data: { label: 'Greeting', content: 'Hello! Thank you for calling. How can I help you today?' } },
  { id: 'intent', type: 'condition', position: { x: 400, y: 200 }, data: { label: 'Detect Intent', condition: 'What is the caller asking about?' } },
  { id: 'support', type: 'response', position: { x: 600, y: 100 }, data: { label: 'Support Response', content: 'I can help you with that. Let me look into it.' } },
  { id: 'sales', type: 'response', position: { x: 600, y: 300 }, data: { label: 'Sales Response', content: 'Great! Let me tell you about our pricing.' } },
  { id: 'end', type: 'end', position: { x: 800, y: 200 }, data: { label: 'End Call', content: 'Thank you for calling. Have a great day!' } },
];

const initialEdges: FlowEdge[] = [
  { id: 'e1', source: 'start', target: 'greeting' },
  { id: 'e2', source: 'greeting', target: 'intent' },
  { id: 'e3', source: 'intent', target: 'support', label: 'Support' },
  { id: 'e4', source: 'intent', target: 'sales', label: 'Sales' },
  { id: 'e5', source: 'support', target: 'end' },
  { id: 'e6', source: 'sales', target: 'end' },
];

export default function VoiceFlowEditorPage() {
  const [nodes, setNodes] = useState<FlowNode[]>(initialNodes);
  const [edges, setEdges] = useState<FlowEdge[]>(initialEdges);
  const [selectedNode, setSelectedNode] = useState<FlowNode | null>(null);
  const [showNodePicker, setShowNodePicker] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);
  const canvasRef = useRef<HTMLDivElement>(null);
  const [draggedNode, setDraggedNode] = useState<string | null>(null);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);

  const handleNodeClick = (node: FlowNode) => {
    setSelectedNode(node);
  };

  const handleAddNode = (type: NodeType) => {
    const newNode: FlowNode = {
      id: `node-${Date.now()}`,
      type,
      position: { x: 300 + Math.random() * 100, y: 200 + Math.random() * 100 },
      data: {
        label: nodeTypes[type].label,
        content: '',
      },
    };
    setNodes([...nodes, newNode]);
    setShowNodePicker(false);
    setSelectedNode(newNode);
    setHasChanges(true);
  };

  const handleDeleteNode = (nodeId: string) => {
    if (nodeId === 'start') return; // Can't delete start node
    setNodes(nodes.filter(n => n.id !== nodeId));
    setEdges(edges.filter(e => e.source !== nodeId && e.target !== nodeId));
    setSelectedNode(null);
    setHasChanges(true);
  };

  const handleNodeDrag = (nodeId: string, e: React.MouseEvent) => {
    e.preventDefault();
    setDraggedNode(nodeId);

    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      const x = (moveEvent.clientX - rect.left - pan.x) / zoom;
      const y = (moveEvent.clientY - rect.top - pan.y) / zoom;

      setNodes(nodes.map(n =>
        n.id === nodeId ? { ...n, position: { x, y } } : n
      ));
      setHasChanges(true);
    };

    const handleMouseUp = () => {
      setDraggedNode(null);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };

    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  };

  const updateNodeData = (nodeId: string, data: Partial<FlowNode['data']>) => {
    setNodes(nodes.map(n =>
      n.id === nodeId ? { ...n, data: { ...n.data, ...data } } : n
    ));
    if (selectedNode?.id === nodeId) {
      setSelectedNode({ ...selectedNode, data: { ...selectedNode.data, ...data } });
    }
    setHasChanges(true);
  };

  const handleSave = async () => {
    setIsSaving(true);
    // Simulate API call
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSaving(false);
    setHasChanges(false);
  };

  // Render edge paths
  const renderEdge = (edge: FlowEdge) => {
    const sourceNode = nodes.find(n => n.id === edge.source);
    const targetNode = nodes.find(n => n.id === edge.target);
    if (!sourceNode || !targetNode) return null;

    const x1 = sourceNode.position.x + 80;
    const y1 = sourceNode.position.y + 30;
    const x2 = targetNode.position.x;
    const y2 = targetNode.position.y + 30;

    // Curved path
    const midX = (x1 + x2) / 2;
    const path = `M ${x1} ${y1} C ${midX} ${y1}, ${midX} ${y2}, ${x2} ${y2}`;

    return (
      <g key={edge.id}>
        <path
          d={path}
          fill="none"
          stroke="rgba(255,255,255,0.2)"
          strokeWidth={2}
          markerEnd="url(#arrowhead)"
        />
        {edge.label && (
          <text
            x={midX}
            y={(y1 + y2) / 2 - 10}
            fill="rgba(255,255,255,0.5)"
            fontSize={10}
            textAnchor="middle"
          >
            {edge.label}
          </text>
        )}
      </g>
    );
  };

  // Render node
  const renderNode = (node: FlowNode) => {
    const config = nodeTypes[node.type];
    const Icon = config.icon;
    const isSelected = selectedNode?.id === node.id;

    return (
      <motion.div
        key={node.id}
        className={`absolute cursor-move select-none`}
        style={{
          left: node.position.x,
          top: node.position.y,
          transform: `scale(${zoom})`,
          transformOrigin: 'top left',
        }}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        onMouseDown={(e) => handleNodeDrag(node.id, e)}
        onClick={() => handleNodeClick(node)}
      >
        <div
          className={`min-w-[160px] rounded-xl border-2 transition-all ${
            isSelected
              ? `border-${config.color}-500 shadow-lg shadow-${config.color}-500/30`
              : 'border-white/20 hover:border-white/40'
          } bg-slate-900/90 backdrop-blur-sm`}
        >
          <div className={`flex items-center gap-2 px-3 py-2 border-b border-white/10 bg-${config.color}-500/20 rounded-t-lg`}>
            <Icon className={`w-4 h-4 text-${config.color}-400`} />
            <span className="text-sm font-medium text-white">{node.data.label}</span>
          </div>
          {node.data.content && (
            <div className="px-3 py-2">
              <p className="text-xs text-white/60 line-clamp-2">{node.data.content}</p>
            </div>
          )}
          {!node.data.content && node.type !== 'start' && node.type !== 'end' && (
            <div className="px-3 py-2">
              <p className="text-xs text-white/40 italic">Click to configure</p>
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white flex flex-col">
      {/* Header */}
      <header className="border-b border-white/10 bg-slate-900/50 backdrop-blur-xl z-50">
        <div className="flex items-center justify-between px-6 py-3">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-2 text-white/60 hover:text-white transition">
              <ChevronLeft className="w-4 h-4" />
              Back to Dashboard
            </Link>
            <div className="h-6 w-px bg-white/20" />
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500 to-blue-600 flex items-center justify-center">
                <Phone className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold">Voice Flow Editor</h1>
                <p className="text-xs text-white/50">Design conversation paths</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {hasChanges && (
              <span className="text-xs text-yellow-400 px-2 py-1 rounded bg-yellow-500/10">
                Unsaved changes
              </span>
            )}
            <motion.button
              onClick={handleSave}
              disabled={isSaving || !hasChanges}
              className="flex items-center gap-2 px-4 py-2 bg-purple-500/20 text-purple-400 rounded-lg hover:bg-purple-500/30 transition disabled:opacity-50"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              {isSaving ? (
                <>
                  <div className="w-4 h-4 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  Save Flow
                </>
              )}
            </motion.button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex">
        {/* Toolbox */}
        <div className="w-64 border-r border-white/10 bg-slate-900/30 p-4">
          <h3 className="text-sm font-medium text-white/70 mb-4">Add Nodes</h3>
          <div className="space-y-2">
            {Object.entries(nodeTypes).map(([type, config]) => {
              if (type === 'start') return null;
              const Icon = config.icon;
              return (
                <motion.button
                  key={type}
                  onClick={() => handleAddNode(type as NodeType)}
                  className={`w-full flex items-center gap-3 p-3 rounded-lg bg-white/5 border border-white/10 hover:border-${config.color}-500/50 hover:bg-white/10 transition text-left group`}
                  whileHover={{ x: 4 }}
                >
                  <div className={`w-8 h-8 rounded-lg bg-${config.color}-500/20 flex items-center justify-center group-hover:scale-110 transition`}>
                    <Icon className={`w-4 h-4 text-${config.color}-400`} />
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">{config.label}</p>
                    <p className="text-xs text-white/50">{config.description}</p>
                  </div>
                </motion.button>
              );
            })}
          </div>

          <div className="mt-6 pt-6 border-t border-white/10">
            <h3 className="text-sm font-medium text-white/70 mb-4">Functions</h3>
            <div className="space-y-2">
              {availableFunctions.slice(0, 4).map((func) => {
                const Icon = func.icon;
                return (
                  <div
                    key={func.id}
                    className="flex items-center gap-2 p-2 rounded-lg bg-white/5 text-sm"
                  >
                    <Icon className="w-4 h-4 text-orange-400" />
                    <span className="text-white/70">{func.name}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Canvas */}
        <div
          ref={canvasRef}
          className="flex-1 relative overflow-hidden bg-slate-950"
          style={{
            backgroundImage: 'radial-gradient(circle, rgba(255,255,255,0.05) 1px, transparent 1px)',
            backgroundSize: '20px 20px',
          }}
        >
          {/* SVG for edges */}
          <svg
            className="absolute inset-0 w-full h-full pointer-events-none"
            style={{ transform: `translate(${pan.x}px, ${pan.y}px)` }}
          >
            <defs>
              <marker
                id="arrowhead"
                markerWidth="10"
                markerHeight="7"
                refX="9"
                refY="3.5"
                orient="auto"
              >
                <polygon
                  points="0 0, 10 3.5, 0 7"
                  fill="rgba(255,255,255,0.3)"
                />
              </marker>
            </defs>
            {edges.map(renderEdge)}
          </svg>

          {/* Nodes */}
          <div
            className="absolute inset-0"
            style={{ transform: `translate(${pan.x}px, ${pan.y}px)` }}
          >
            {nodes.map(renderNode)}
          </div>

          {/* Zoom controls */}
          <div className="absolute bottom-4 right-4 flex items-center gap-2 bg-slate-900/80 backdrop-blur-sm rounded-lg border border-white/10 p-2">
            <button
              onClick={() => setZoom(Math.max(0.5, zoom - 0.1))}
              className="p-2 hover:bg-white/10 rounded transition"
            >
              -
            </button>
            <span className="text-sm text-white/70 w-12 text-center">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => setZoom(Math.min(2, zoom + 0.1))}
              className="p-2 hover:bg-white/10 rounded transition"
            >
              +
            </button>
          </div>
        </div>

        {/* Properties Panel */}
        <AnimatePresence>
          {selectedNode && (
            <motion.div
              initial={{ x: 300, opacity: 0 }}
              animate={{ x: 0, opacity: 1 }}
              exit={{ x: 300, opacity: 0 }}
              className="w-80 border-l border-white/10 bg-slate-900/30 p-4"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-white">Node Properties</h3>
                <button
                  onClick={() => setSelectedNode(null)}
                  className="p-1 hover:bg-white/10 rounded transition"
                >
                  <X className="w-4 h-4 text-white/50" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Node Type */}
                <div className="flex items-center gap-3 p-3 rounded-lg bg-white/5">
                  {React.createElement(nodeTypes[selectedNode.type].icon, {
                    className: `w-5 h-5 text-${nodeTypes[selectedNode.type].color}-400`
                  })}
                  <div>
                    <p className="text-sm font-medium text-white">{nodeTypes[selectedNode.type].label}</p>
                    <p className="text-xs text-white/50">{nodeTypes[selectedNode.type].description}</p>
                  </div>
                </div>

                {/* Label */}
                <div>
                  <label className="block text-sm text-white/70 mb-2">Label</label>
                  <input
                    type="text"
                    value={selectedNode.data.label}
                    onChange={(e) => updateNodeData(selectedNode.id, { label: e.target.value })}
                    className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50"
                  />
                </div>

                {/* Content (for greeting, question, response) */}
                {['greeting', 'question', 'response', 'end'].includes(selectedNode.type) && (
                  <div>
                    <label className="block text-sm text-white/70 mb-2">
                      {selectedNode.type === 'question' ? 'Question to Ask' : 'Message'}
                    </label>
                    <textarea
                      value={selectedNode.data.content || ''}
                      onChange={(e) => updateNodeData(selectedNode.id, { content: e.target.value })}
                      placeholder={`Enter ${selectedNode.type === 'question' ? 'question' : 'message'}...`}
                      className="w-full h-32 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50 resize-none"
                    />
                  </div>
                )}

                {/* Condition (for condition nodes) */}
                {selectedNode.type === 'condition' && (
                  <div>
                    <label className="block text-sm text-white/70 mb-2">Condition</label>
                    <textarea
                      value={selectedNode.data.condition || ''}
                      onChange={(e) => updateNodeData(selectedNode.id, { condition: e.target.value })}
                      placeholder="e.g., If caller asks about pricing..."
                      className="w-full h-24 px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50 resize-none"
                    />
                  </div>
                )}

                {/* Function selector (for function nodes) */}
                {selectedNode.type === 'function' && (
                  <div>
                    <label className="block text-sm text-white/70 mb-2">Function</label>
                    <select
                      value={selectedNode.data.function || ''}
                      onChange={(e) => updateNodeData(selectedNode.id, { function: e.target.value })}
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white focus:outline-none focus:border-purple-500/50"
                    >
                      <option value="">Select function...</option>
                      {availableFunctions.map((func) => (
                        <option key={func.id} value={func.id}>{func.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Transfer options */}
                {selectedNode.type === 'transfer' && (
                  <div>
                    <label className="block text-sm text-white/70 mb-2">Transfer To</label>
                    <input
                      type="text"
                      value={selectedNode.data.transferTo || ''}
                      onChange={(e) => updateNodeData(selectedNode.id, { transferTo: e.target.value })}
                      placeholder="+1234567890 or agent ID"
                      className="w-full px-3 py-2 bg-white/5 border border-white/10 rounded-lg text-white placeholder-white/30 focus:outline-none focus:border-purple-500/50"
                    />
                  </div>
                )}

                {/* Delete button (except start node) */}
                {selectedNode.id !== 'start' && (
                  <motion.button
                    onClick={() => handleDeleteNode(selectedNode.id)}
                    className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500/20 text-red-400 rounded-lg hover:bg-red-500/30 transition mt-4"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete Node
                  </motion.button>
                )}
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
