'use client';

import React, { useCallback, useRef, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  ReactFlowProvider,
  useReactFlow,
  Panel,
  BackgroundVariant,
  ConnectionLineType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { motion, AnimatePresence } from 'framer-motion';

import { useFlowBuilder, useSelectedNode } from '@/hooks/useFlowBuilder';
import type { NodeType, FlowNodeData } from '@/lib/flow-types';
import {
  StartNode,
  MessageNode,
  UserInputNode,
  ConditionNode,
  AIResponseNode,
  APICallNode,
  SetVariableNode,
  HandoffNode,
  EndNode,
} from './nodes';
import NodePropertiesPanel from './NodePropertiesPanel';

// Custom node types mapping
const nodeTypes = {
  start: StartNode,
  message: MessageNode,
  userInput: UserInputNode,
  condition: ConditionNode,
  aiResponse: AIResponseNode,
  apiCall: APICallNode,
  setVariable: SetVariableNode,
  handoff: HandoffNode,
  end: EndNode,
};

// Custom edge style
const defaultEdgeOptions = {
  style: { stroke: '#f97316', strokeWidth: 2 },
  type: 'smoothstep',
  animated: true,
};

interface FlowCanvasProps {
  onFitViewRef?: (fn: () => void) => void;
}

function FlowCanvasInner({ onFitViewRef }: FlowCanvasProps) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const { fitView, project } = useReactFlow();

  const {
    nodes,
    edges,
    onNodesChange,
    onEdgesChange,
    onConnect,
    addNode,
    selectNode,
    selectedNodeId,
    isPanelOpen,
    setPanel,
    deleteNode,
    duplicateNode,
  } = useFlowBuilder();

  const selectedNode = useSelectedNode();

  // Expose fitView to parent
  useEffect(() => {
    if (onFitViewRef) {
      onFitViewRef(() => fitView({ padding: 0.2, duration: 500 }));
    }
  }, [onFitViewRef, fitView]);

  // Handle drag over
  const onDragOver = useCallback((event: React.DragEvent) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  // Handle drop
  const onDrop = useCallback(
    (event: React.DragEvent) => {
      event.preventDefault();

      const nodeType = event.dataTransfer.getData('application/reactflow') as NodeType;
      if (!nodeType || !reactFlowWrapper.current) return;

      const bounds = reactFlowWrapper.current.getBoundingClientRect();
      const position = project({
        x: event.clientX - bounds.left,
        y: event.clientY - bounds.top,
      });

      addNode(nodeType, position);
    },
    [project, addNode]
  );

  // Handle node click
  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: { id: string }) => {
      selectNode(node.id);
    },
    [selectNode]
  );

  // Handle pane click (deselect)
  const onPaneClick = useCallback(() => {
    selectNode(null);
    setPanel(false);
  }, [selectNode, setPanel]);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Delete selected node
      if ((e.key === 'Delete' || e.key === 'Backspace') && selectedNodeId) {
        e.preventDefault();
        deleteNode(selectedNodeId);
      }

      // Duplicate (Ctrl+D)
      if (e.ctrlKey && e.key === 'd' && selectedNodeId) {
        e.preventDefault();
        duplicateNode(selectedNodeId);
      }

      // Escape to deselect
      if (e.key === 'Escape') {
        selectNode(null);
        setPanel(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectedNodeId, deleteNode, duplicateNode, selectNode, setPanel]);

  return (
    <div className="flex-1 flex h-full">
      {/* Main Canvas */}
      <div ref={reactFlowWrapper} className="flex-1 h-full">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onPaneClick={onPaneClick}
          onDragOver={onDragOver}
          onDrop={onDrop}
          nodeTypes={nodeTypes}
          defaultEdgeOptions={defaultEdgeOptions}
          connectionLineType={ConnectionLineType.SmoothStep}
          connectionLineStyle={{ stroke: '#f97316', strokeWidth: 2 }}
          fitView
          snapToGrid
          snapGrid={[15, 15]}
          minZoom={0.25}
          maxZoom={2}
          deleteKeyCode={null} // We handle this ourselves
          className="bg-slate-950"
        >
          {/* Background */}
          <Background
            variant={BackgroundVariant.Dots}
            gap={20}
            size={1}
            color="#ffffff10"
          />

          {/* Custom Controls */}
          <Controls
            className="!bg-slate-900/80 !border-white/10 !rounded-xl overflow-hidden [&>button]:!bg-transparent [&>button]:!border-white/5 [&>button]:!text-white/60 [&>button:hover]:!bg-white/10 [&>button:hover]:!text-white"
            showInteractive={false}
          />

          {/* MiniMap */}
          <MiniMap
            className="!bg-slate-900/80 !border-white/10 !rounded-xl overflow-hidden"
            nodeColor={(node) => {
              const colorMap: Record<string, string> = {
                start: '#22c55e',
                message: '#3b82f6',
                userInput: '#a855f7',
                condition: '#eab308',
                aiResponse: '#f97316',
                apiCall: '#06b6d4',
                setVariable: '#6366f1',
                handoff: '#ec4899',
                end: '#ef4444',
              };
              return colorMap[node.type || ''] || '#ffffff';
            }}
            maskColor="rgba(0, 0, 0, 0.6)"
            pannable
            zoomable
          />

          {/* Empty State */}
          {nodes.length === 0 && (
            <Panel position="top-center" className="mt-32">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="text-center"
              >
                <div className="w-20 h-20 mx-auto mb-4 rounded-2xl bg-gradient-to-br from-orange-500/20 to-red-500/20 flex items-center justify-center">
                  <svg
                    className="w-10 h-10 text-orange-400"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M12 6v6m0 0v6m0-6h6m-6 0H6"
                    />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">
                  Start Building Your Flow
                </h3>
                <p className="text-white/50 max-w-md">
                  Drag nodes from the sidebar and drop them here to create your
                  conversation flow. Connect nodes by dragging from one handle to another.
                </p>
              </motion.div>
            </Panel>
          )}
        </ReactFlow>
      </div>

      {/* Properties Panel */}
      <AnimatePresence>
        {isPanelOpen && selectedNode && (
          <NodePropertiesPanel
            node={selectedNode}
            onClose={() => setPanel(false)}
          />
        )}
      </AnimatePresence>
    </div>
  );
}

// Wrapper with ReactFlow Provider
export default function FlowCanvas(props: FlowCanvasProps) {
  return (
    <ReactFlowProvider>
      <FlowCanvasInner {...props} />
    </ReactFlowProvider>
  );
}
