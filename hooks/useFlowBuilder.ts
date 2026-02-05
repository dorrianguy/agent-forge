import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  Connection,
  Edge,
  EdgeChange,
  Node,
  NodeChange,
  addEdge,
  applyNodeChanges,
  applyEdgeChanges,
} from 'reactflow';
import type {
  Flow,
  FlowNode,
  FlowEdge,
  FlowNodeData,
  FlowVariable,
  FlowSettings,
  HistoryState,
  NodeType,
} from '@/lib/flow-types';

const MAX_HISTORY = 50;

interface FlowBuilderState {
  // Flow data
  flowId: string | null;
  flowName: string;
  flowDescription: string;
  nodes: Node<FlowNodeData>[];
  edges: Edge[];
  variables: FlowVariable[];
  settings: FlowSettings;

  // UI state
  selectedNodeId: string | null;
  selectedEdgeId: string | null;
  isPanelOpen: boolean;
  zoom: number;
  isDirty: boolean;

  // History for undo/redo
  history: HistoryState[];
  historyIndex: number;

  // Actions - Nodes
  addNode: (type: NodeType, position: { x: number; y: number }) => void;
  updateNode: (nodeId: string, data: Partial<FlowNodeData>) => void;
  deleteNode: (nodeId: string) => void;
  duplicateNode: (nodeId: string) => void;
  onNodesChange: (changes: NodeChange[]) => void;

  // Actions - Edges
  onEdgesChange: (changes: EdgeChange[]) => void;
  onConnect: (connection: Connection) => void;
  deleteEdge: (edgeId: string) => void;

  // Actions - Selection
  selectNode: (nodeId: string | null) => void;
  selectEdge: (edgeId: string | null) => void;
  clearSelection: () => void;

  // Actions - Panel
  togglePanel: () => void;
  setPanel: (open: boolean) => void;

  // Actions - Zoom
  setZoom: (zoom: number) => void;
  zoomIn: () => void;
  zoomOut: () => void;
  fitView: () => void;

  // Actions - History
  undo: () => void;
  redo: () => void;
  saveToHistory: () => void;
  canUndo: () => boolean;
  canRedo: () => boolean;

  // Actions - Flow Management
  newFlow: () => void;
  loadFlow: (flow: Flow) => void;
  saveFlow: () => Flow;
  exportFlow: () => string;
  importFlow: (json: string) => boolean;

  // Actions - Variables
  addVariable: (variable: FlowVariable) => void;
  updateVariable: (name: string, variable: Partial<FlowVariable>) => void;
  deleteVariable: (name: string) => void;

  // Actions - Settings
  updateSettings: (settings: Partial<FlowSettings>) => void;

  // Actions - Auto Layout
  autoLayout: () => void;
}

const createDefaultNode = (type: NodeType, position: { x: number; y: number }): Node<FlowNodeData> => {
  const id = `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  const defaultDataMap: Record<NodeType, FlowNodeData> = {
    start: {
      type: 'start',
      label: 'Start',
      triggerType: 'greeting',
    },
    message: {
      type: 'message',
      label: 'Send Message',
      content: 'Hello! How can I help you today?',
      typing: true,
    },
    userInput: {
      type: 'userInput',
      label: 'Get Input',
      inputType: 'text',
      variableName: 'user_response',
      validation: { required: true },
    },
    condition: {
      type: 'condition',
      label: 'Condition',
      conditions: [
        {
          id: 'cond-1',
          variable: '',
          operator: 'equals',
          value: '',
          outputHandle: 'yes',
        },
      ],
      defaultOutputHandle: 'no',
    },
    aiResponse: {
      type: 'aiResponse',
      label: 'AI Response',
      prompt: 'Generate a helpful response based on the conversation context.',
      model: 'gpt-4',
      temperature: 0.7,
    },
    apiCall: {
      type: 'apiCall',
      label: 'API Call',
      method: 'GET',
      url: '',
      timeout: 30000,
      onError: 'continue',
    },
    setVariable: {
      type: 'setVariable',
      label: 'Set Variable',
      variables: [
        {
          name: '',
          value: '',
          valueType: 'static',
        },
      ],
    },
    handoff: {
      type: 'handoff',
      label: 'Handoff',
      priority: 'medium',
      message: 'Transferring you to a human agent...',
    },
    end: {
      type: 'end',
      label: 'End',
      endType: 'complete',
      finalMessage: 'Thank you for chatting with us!',
    },
  };

  return {
    id,
    type,
    position,
    data: defaultDataMap[type],
  };
};

const getDefaultEdgeStyle = () => ({
  stroke: '#f97316',
  strokeWidth: 2,
});

export const useFlowBuilder = create<FlowBuilderState>()(
  persist(
    (set, get) => ({
      // Initial state
      flowId: null,
      flowName: 'Untitled Flow',
      flowDescription: '',
      nodes: [],
      edges: [],
      variables: [],
      settings: {
        defaultTimeout: 30000,
        fallbackMessage: "I'm sorry, I didn't understand that. Could you please rephrase?",
        errorMessage: "Something went wrong. Please try again.",
        maxRetries: 3,
        analytics: { enabled: true },
      },
      selectedNodeId: null,
      selectedEdgeId: null,
      isPanelOpen: false,
      zoom: 1,
      isDirty: false,
      history: [],
      historyIndex: -1,

      // Node actions
      addNode: (type, position) => {
        const newNode = createDefaultNode(type, position);
        set((state) => ({
          nodes: [...state.nodes, newNode],
          selectedNodeId: newNode.id,
          isPanelOpen: true,
          isDirty: true,
        }));
        get().saveToHistory();
      },

      updateNode: (nodeId, data) => {
        set((state) => ({
          nodes: state.nodes.map((node) =>
            node.id === nodeId
              ? { ...node, data: { ...node.data, ...data } as FlowNodeData }
              : node
          ),
          isDirty: true,
        }));
        get().saveToHistory();
      },

      deleteNode: (nodeId) => {
        set((state) => ({
          nodes: state.nodes.filter((node) => node.id !== nodeId),
          edges: state.edges.filter(
            (edge) => edge.source !== nodeId && edge.target !== nodeId
          ),
          selectedNodeId: state.selectedNodeId === nodeId ? null : state.selectedNodeId,
          isPanelOpen: state.selectedNodeId === nodeId ? false : state.isPanelOpen,
          isDirty: true,
        }));
        get().saveToHistory();
      },

      duplicateNode: (nodeId) => {
        const state = get();
        const node = state.nodes.find((n) => n.id === nodeId);
        if (!node) return;

        const newNode = createDefaultNode(node.type as NodeType, {
          x: node.position.x + 50,
          y: node.position.y + 50,
        });
        newNode.data = { ...node.data, label: `${node.data.label} (copy)` };

        set({
          nodes: [...state.nodes, newNode],
          selectedNodeId: newNode.id,
          isPanelOpen: true,
          isDirty: true,
        });
        get().saveToHistory();
      },

      onNodesChange: (changes) => {
        set((state) => ({
          nodes: applyNodeChanges(changes, state.nodes),
          isDirty: true,
        }));
      },

      // Edge actions
      onEdgesChange: (changes) => {
        set((state) => ({
          edges: applyEdgeChanges(changes, state.edges),
          isDirty: true,
        }));
      },

      onConnect: (connection) => {
        const newEdge = {
          ...connection,
          id: `edge-${Date.now()}`,
          style: getDefaultEdgeStyle(),
          animated: true,
        };
        set((state) => ({
          edges: addEdge(newEdge, state.edges),
          isDirty: true,
        }));
        get().saveToHistory();
      },

      deleteEdge: (edgeId) => {
        set((state) => ({
          edges: state.edges.filter((edge) => edge.id !== edgeId),
          selectedEdgeId: state.selectedEdgeId === edgeId ? null : state.selectedEdgeId,
          isDirty: true,
        }));
        get().saveToHistory();
      },

      // Selection actions
      selectNode: (nodeId) => {
        set({
          selectedNodeId: nodeId,
          selectedEdgeId: null,
          isPanelOpen: nodeId !== null,
        });
      },

      selectEdge: (edgeId) => {
        set({
          selectedEdgeId: edgeId,
          selectedNodeId: null,
        });
      },

      clearSelection: () => {
        set({
          selectedNodeId: null,
          selectedEdgeId: null,
          isPanelOpen: false,
        });
      },

      // Panel actions
      togglePanel: () => set((state) => ({ isPanelOpen: !state.isPanelOpen })),
      setPanel: (open) => set({ isPanelOpen: open }),

      // Zoom actions
      setZoom: (zoom) => set({ zoom: Math.min(Math.max(zoom, 0.25), 2) }),
      zoomIn: () => set((state) => ({ zoom: Math.min(state.zoom + 0.1, 2) })),
      zoomOut: () => set((state) => ({ zoom: Math.max(state.zoom - 0.1, 0.25) })),
      fitView: () => set({ zoom: 1 }),

      // History actions
      saveToHistory: () => {
        const state = get();
        const newHistoryState: HistoryState = {
          nodes: JSON.parse(JSON.stringify(state.nodes)),
          edges: JSON.parse(JSON.stringify(state.edges)),
          timestamp: Date.now(),
        };

        set((state) => {
          const newHistory = state.history.slice(0, state.historyIndex + 1);
          newHistory.push(newHistoryState);
          
          if (newHistory.length > MAX_HISTORY) {
            newHistory.shift();
          }

          return {
            history: newHistory,
            historyIndex: newHistory.length - 1,
          };
        });
      },

      undo: () => {
        const state = get();
        if (state.historyIndex <= 0) return;

        const prevState = state.history[state.historyIndex - 1];
        set({
          nodes: prevState.nodes as Node<FlowNodeData>[],
          edges: prevState.edges,
          historyIndex: state.historyIndex - 1,
          isDirty: true,
        });
      },

      redo: () => {
        const state = get();
        if (state.historyIndex >= state.history.length - 1) return;

        const nextState = state.history[state.historyIndex + 1];
        set({
          nodes: nextState.nodes as Node<FlowNodeData>[],
          edges: nextState.edges,
          historyIndex: state.historyIndex + 1,
          isDirty: true,
        });
      },

      canUndo: () => get().historyIndex > 0,
      canRedo: () => get().historyIndex < get().history.length - 1,

      // Flow management actions
      newFlow: () => {
        set({
          flowId: null,
          flowName: 'Untitled Flow',
          flowDescription: '',
          nodes: [],
          edges: [],
          variables: [],
          settings: {
            defaultTimeout: 30000,
            fallbackMessage: "I'm sorry, I didn't understand that.",
            errorMessage: "Something went wrong. Please try again.",
            maxRetries: 3,
            analytics: { enabled: true },
          },
          selectedNodeId: null,
          selectedEdgeId: null,
          isPanelOpen: false,
          isDirty: false,
          history: [],
          historyIndex: -1,
        });
      },

      loadFlow: (flow) => {
        set({
          flowId: flow.id,
          flowName: flow.name,
          flowDescription: flow.description || '',
          nodes: flow.nodes.map((n) => ({
            id: n.id,
            type: n.type,
            position: n.position,
            data: n.data,
          })),
          edges: flow.edges.map((e) => ({
            id: e.id,
            source: e.source,
            target: e.target,
            sourceHandle: e.sourceHandle,
            targetHandle: e.targetHandle,
            label: e.label,
            animated: e.animated ?? true,
            style: e.style || getDefaultEdgeStyle(),
          })),
          variables: flow.variables,
          settings: flow.settings,
          selectedNodeId: null,
          selectedEdgeId: null,
          isPanelOpen: false,
          isDirty: false,
          history: [],
          historyIndex: -1,
        });
        get().saveToHistory();
      },

      saveFlow: () => {
        const state = get();
        const flow: Flow = {
          id: state.flowId || `flow-${Date.now()}`,
          name: state.flowName,
          description: state.flowDescription,
          nodes: state.nodes.map((n) => ({
            id: n.id,
            type: n.type as NodeType,
            position: n.position,
            data: n.data as FlowNodeData,
          })),
          edges: state.edges.map((e) => ({
            id: e.id,
            source: e.source,
            target: e.target,
            sourceHandle: e.sourceHandle,
            targetHandle: e.targetHandle,
            label: typeof e.label === 'string' ? e.label : undefined,
            animated: e.animated,
          })),
          variables: state.variables,
          settings: state.settings,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          version: 1,
        };

        // Save to localStorage
        const flows = JSON.parse(localStorage.getItem('agent-forge-flows') || '{}');
        flows[flow.id] = flow;
        localStorage.setItem('agent-forge-flows', JSON.stringify(flows));

        set({ flowId: flow.id, isDirty: false });
        return flow;
      },

      exportFlow: () => {
        const flow = get().saveFlow();
        return JSON.stringify(
          {
            version: '1.0.0',
            exportedAt: new Date().toISOString(),
            flow,
          },
          null,
          2
        );
      },

      importFlow: (json) => {
        try {
          const data = JSON.parse(json);
          if (data.flow) {
            get().loadFlow(data.flow);
            return true;
          }
          return false;
        } catch {
          return false;
        }
      },

      // Variable actions
      addVariable: (variable) => {
        set((state) => ({
          variables: [...state.variables, variable],
          isDirty: true,
        }));
      },

      updateVariable: (name, updates) => {
        set((state) => ({
          variables: state.variables.map((v) =>
            v.name === name ? { ...v, ...updates } : v
          ),
          isDirty: true,
        }));
      },

      deleteVariable: (name) => {
        set((state) => ({
          variables: state.variables.filter((v) => v.name !== name),
          isDirty: true,
        }));
      },

      // Settings actions
      updateSettings: (updates) => {
        set((state) => ({
          settings: { ...state.settings, ...updates },
          isDirty: true,
        }));
      },

      // Auto layout
      autoLayout: () => {
        const state = get();
        const nodes = [...state.nodes];
        
        // Simple grid layout
        const HORIZONTAL_SPACING = 300;
        const VERTICAL_SPACING = 150;
        const NODES_PER_ROW = 4;

        const layoutedNodes = nodes.map((node, index) => ({
          ...node,
          position: {
            x: (index % NODES_PER_ROW) * HORIZONTAL_SPACING + 100,
            y: Math.floor(index / NODES_PER_ROW) * VERTICAL_SPACING + 100,
          },
        }));

        set({ nodes: layoutedNodes, isDirty: true });
        get().saveToHistory();
      },
    }),
    {
      name: 'flow-builder-storage',
      partialize: (state) => ({
        flowId: state.flowId,
        flowName: state.flowName,
        flowDescription: state.flowDescription,
        nodes: state.nodes,
        edges: state.edges,
        variables: state.variables,
        settings: state.settings,
      }),
    }
  )
);

// Helper hook for getting selected node
export const useSelectedNode = () => {
  const nodes = useFlowBuilder((state) => state.nodes);
  const selectedNodeId = useFlowBuilder((state) => state.selectedNodeId);
  return nodes.find((n) => n.id === selectedNodeId);
};

// Helper hook for flow dirty state
export const useFlowDirty = () => useFlowBuilder((state) => state.isDirty);
