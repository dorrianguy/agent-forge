// =============================================================================
// LaunchDependencyGraph — Interactive ReactFlow Visualization
// =============================================================================

'use client';

import React, { useCallback, useMemo } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  NodeProps,
  Handle,
  Position,
  useNodesState,
  useEdgesState,
  MarkerType,
} from 'reactflow';
import 'reactflow/dist/style.css';
import {
  FileText,
  Mail,
  Newspaper,
  Share2,
  Loader2,
  CheckCircle2,
  AlertCircle,
  Clock,
  AlertTriangle,
  Target,
  Users,
  Video,
  GitCompare,
  ClipboardList,
  Activity,
} from 'lucide-react';
import type { AssetType, GeneratedAssets, GenerationStatus, VariantEligibleAsset } from '@/src/lib/launch/types';
import {
  buildDependencyGraph,
  ASSET_LABELS,
  getTransitiveDependents,
} from '@/src/lib/launch/propagator';

// ---------------------------------------------------------------------------
// Custom Node Component
// ---------------------------------------------------------------------------

const STATUS_COLORS: Record<GenerationStatus, { bg: string; ring: string; text: string }> = {
  pending: { bg: 'bg-zinc-800', ring: 'ring-zinc-700', text: 'text-zinc-400' },
  generating: { bg: 'bg-amber-900/30', ring: 'ring-amber-500/50', text: 'text-amber-400' },
  done: { bg: 'bg-green-900/30', ring: 'ring-green-500/50', text: 'text-green-400' },
  error: { bg: 'bg-red-900/30', ring: 'ring-red-500/50', text: 'text-red-400' },
};

const ASSET_ICONS: Record<AssetType, React.ComponentType<{ className?: string }>> = {
  landingPage: FileText,
  emailSequence: Mail,
  pressRelease: Newspaper,
  socialPosts: Share2,
  salesEnablement: Target,
  partnerKit: Users,
  videoScript: Video,
};

const STATUS_ICONS: Record<GenerationStatus, React.ComponentType<{ className?: string }>> = {
  pending: Clock,
  generating: Loader2,
  done: CheckCircle2,
  error: AlertCircle,
};

/** Assets eligible for A/B variants */
const VARIANT_ELIGIBLE: Set<string> = new Set<VariantEligibleAsset>(['landingPage', 'emailSequence', 'socialPosts']);

interface AssetNodeData {
  label: string;
  assetType: AssetType;
  status: GenerationStatus;
  isSelected: boolean;
  isStale: boolean;
  hasVariants: boolean;
  onClick: (assetType: AssetType) => void;
}

function AssetNode({ data }: NodeProps<AssetNodeData>) {
  const colors = STATUS_COLORS[data.status];
  const AssetIcon = ASSET_ICONS[data.assetType];
  const StatusIcon = STATUS_ICONS[data.status];

  return (
    <div
      onClick={() => data.onClick(data.assetType)}
      className={`
        relative cursor-pointer rounded-xl border p-4 min-w-[180px] transition-all
        ${data.isStale ? 'bg-amber-950/40 ring-1 ring-amber-500/60 border-dashed border-amber-500/40' : `${colors.bg} ring-1 ${colors.ring}`}
        ${data.isSelected ? 'ring-2 ring-blue-500 shadow-lg shadow-blue-500/20' : ''}
        hover:scale-105 hover:shadow-md
      `}
    >
      <Handle type="target" position={Position.Top} className="!bg-zinc-600 !w-2 !h-2" />
      <Handle type="source" position={Position.Bottom} className="!bg-zinc-600 !w-2 !h-2" />

      <div className="flex items-center gap-3">
        <div className={`p-2 rounded-lg ${data.isStale ? 'bg-amber-900/40 text-amber-400' : `${colors.bg} ${colors.text}`}`}>
          <AssetIcon className="w-5 h-5" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-1.5">
            <div className="text-sm font-medium text-zinc-100 truncate">{data.label}</div>
            {data.hasVariants && (
              <GitCompare className="w-3 h-3 text-purple-400 flex-shrink-0" aria-label="Has A/B variants" />
            )}
          </div>
          <div className={`flex items-center gap-1 text-xs ${data.isStale ? 'text-amber-400' : colors.text} mt-0.5`}>
            {data.isStale ? (
              <>
                <AlertTriangle className="w-3 h-3" />
                <span>Stale</span>
              </>
            ) : (
              <>
                <StatusIcon className={`w-3 h-3 ${data.status === 'generating' ? 'animate-spin' : ''}`} />
                <span className="capitalize">{data.status}</span>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Post-Launch Group Node
// ---------------------------------------------------------------------------

interface GroupNodeData {
  label: string;
}

function PostLaunchGroupNode({ data }: NodeProps<GroupNodeData>) {
  return (
    <div className="rounded-xl border-2 border-dashed border-zinc-700 bg-zinc-900/30 p-3 min-w-[380px] min-h-[100px]">
      <Handle type="target" position={Position.Top} className="!bg-zinc-600 !w-2 !h-2" />
      <div className="text-xs font-medium text-zinc-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
        <ClipboardList className="w-3 h-3" />
        {data.label}
      </div>
      <div className="flex gap-3">
        <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800/60 border border-zinc-700/50">
          <Activity className="w-4 h-4 text-blue-400" />
          <span className="text-xs text-zinc-300">Feedback</span>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-2 rounded-lg bg-zinc-800/60 border border-zinc-700/50">
          <ClipboardList className="w-4 h-4 text-emerald-400" />
          <span className="text-xs text-zinc-300">Retro</span>
        </div>
      </div>
    </div>
  );
}

const nodeTypes = {
  assetNode: AssetNode,
  postLaunchGroup: PostLaunchGroupNode,
};

// ---------------------------------------------------------------------------
// Layout Constants — expanded for new nodes
// ---------------------------------------------------------------------------

const NODE_POSITIONS: Record<string, { x: number; y: number }> = {
  landingPage: { x: 300, y: 0 },
  emailSequence: { x: 0, y: 160 },
  pressRelease: { x: 200, y: 160 },
  socialPosts: { x: 400, y: 160 },
  salesEnablement: { x: 100, y: 320 },
  partnerKit: { x: 350, y: 320 },
  videoScript: { x: 580, y: 320 },
  'post-launch': { x: 220, y: 480 },
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

interface LaunchDependencyGraphProps {
  assets: GeneratedAssets | null;
  selectedAsset: AssetType | null;
  onSelectAsset: (assetType: AssetType | null) => void;
  staleAssets?: Set<AssetType>;
  hasVariants?: Set<string>;
}

export default function LaunchDependencyGraph({
  assets,
  selectedAsset,
  onSelectAsset,
  staleAssets = new Set(),
  hasVariants = new Set(),
}: LaunchDependencyGraphProps) {
  const graphData = useMemo(() => buildDependencyGraph(assets), [assets]);

  const handleNodeClick = useCallback(
    (assetType: AssetType) => {
      onSelectAsset(assetType === selectedAsset ? null : assetType);
    },
    [onSelectAsset, selectedAsset],
  );

  // Determine which edges are on an "affected" path (source or target is stale)
  const staleEdgeSet = useMemo(() => {
    const set = new Set<string>();
    for (const edge of graphData.edges) {
      if (staleAssets.has(edge.target as AssetType) || staleAssets.has(edge.source as AssetType)) {
        set.add(`edge-${edge.source}-${edge.target}`);
      }
    }
    return set;
  }, [graphData.edges, staleAssets]);

  const initialNodes: Node[] = useMemo(() => {
    const assetNodes: Node<AssetNodeData>[] = graphData.nodes.map((n) => ({
      id: n.id,
      type: 'assetNode',
      position: NODE_POSITIONS[n.id] ?? { x: 0, y: 0 },
      data: {
        label: n.label,
        assetType: n.id,
        status: n.status,
        isSelected: n.id === selectedAsset,
        isStale: staleAssets.has(n.id),
        hasVariants: VARIANT_ELIGIBLE.has(n.id) || hasVariants.has(n.id),
        onClick: handleNodeClick,
      },
      draggable: true,
    }));

    // Post-Launch group node
    const postLaunchNode: Node<GroupNodeData> = {
      id: 'post-launch',
      type: 'postLaunchGroup',
      position: NODE_POSITIONS['post-launch'],
      data: { label: 'Post-Launch' },
      draggable: true,
    };

    return [...assetNodes, postLaunchNode];
  }, [graphData.nodes, selectedAsset, handleNodeClick, staleAssets, hasVariants]);

  const initialEdges: Edge[] = useMemo(() => {
    const dataEdges: Edge[] = graphData.edges.map((e) => {
      const edgeId = `edge-${e.source}-${e.target}`;
      const isAffected = staleEdgeSet.has(edgeId);

      return {
        id: edgeId,
        source: e.source,
        target: e.target,
        animated: assets?.[e.source]?.status === 'generating' || isAffected,
        style: {
          stroke: isAffected ? '#f59e0b' : '#52525b',
          strokeWidth: isAffected ? 2.5 : 2,
          strokeDasharray: isAffected ? '6 3' : undefined,
        },
        markerEnd: {
          type: MarkerType.ArrowClosed,
          color: isAffected ? '#f59e0b' : '#52525b',
          width: 16,
          height: 16,
        },
        label: e.fields.length > 2 ? `${e.fields.length} fields` : e.fields.join(', '),
        labelStyle: { fill: isAffected ? '#fbbf24' : '#71717a', fontSize: 10 },
        labelBgStyle: { fill: '#18181b', fillOpacity: 0.9 },
        labelBgPadding: [6, 3] as [number, number],
        labelBgBorderRadius: 4,
      };
    });

    // Post-launch edges (from terminal nodes → post-launch group)
    const postLaunchEdge: Edge = {
      id: 'edge-pipeline-postlaunch',
      source: 'videoScript',
      target: 'post-launch',
      style: { stroke: '#52525b', strokeWidth: 1.5, strokeDasharray: '4 4' },
      markerEnd: { type: MarkerType.ArrowClosed, color: '#52525b', width: 14, height: 14 },
      label: 'post-launch',
      labelStyle: { fill: '#71717a', fontSize: 10 },
      labelBgStyle: { fill: '#18181b', fillOpacity: 0.9 },
      labelBgPadding: [6, 3] as [number, number],
      labelBgBorderRadius: 4,
    };

    return [...dataEdges, postLaunchEdge];
  }, [graphData.edges, assets, staleEdgeSet]);

  const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);

  // Sync external state changes
  React.useEffect(() => {
    setNodes(initialNodes);
  }, [initialNodes, setNodes]);

  React.useEffect(() => {
    setEdges(initialEdges);
  }, [initialEdges, setEdges]);

  return (
    <div className="h-full w-full bg-zinc-950 rounded-xl border border-zinc-800 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
        <h3 className="text-sm font-semibold text-zinc-200">Asset Dependency Graph</h3>
        <div className="flex items-center gap-3 text-xs text-zinc-500 flex-wrap">
          {Object.entries(STATUS_COLORS).map(([status, colors]) => (
            <div key={status} className="flex items-center gap-1">
              <div className={`w-2 h-2 rounded-full ${colors.bg} ring-1 ${colors.ring}`} />
              <span className="capitalize">{status}</span>
            </div>
          ))}
          {/* Stale legend entry */}
          <div className="flex items-center gap-1">
            <div className="w-2 h-2 rounded-full bg-amber-900/40 ring-1 ring-amber-500/60 border border-dashed border-amber-500/40" />
            <span>Stale</span>
          </div>
          {/* Variant legend */}
          <div className="flex items-center gap-1">
            <GitCompare className="w-2.5 h-2.5 text-purple-400" />
            <span>Has Variants</span>
          </div>
        </div>
      </div>

      {/* Graph */}
      <div className="h-[calc(100%-48px)]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          proOptions={{ hideAttribution: true }}
          minZoom={0.3}
          maxZoom={1.5}
        >
          <Background color="#27272a" gap={20} size={1} />
          <Controls
            className="!bg-zinc-900 !border-zinc-700 !rounded-lg"
            showInteractive={false}
          />
        </ReactFlow>
      </div>
    </div>
  );
}
