'use client';

import React, { useCallback, useMemo, useState, useEffect } from 'react';
import ReactFlow, {
  Node,
  Edge,
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
  NodeProps,
  Handle,
  Position,
  MarkerType,
  ReactFlowProvider,
  useReactFlow,
} from 'reactflow';
import * as dagre from 'dagre';
import 'reactflow/dist/style.css';

// Types
interface PageNode {
  id: string;
  url: string;
  title: string;
  category: string;
  elementCount: number;
  formCount: number;
  linkCount: number;
  depth: number;
  screenshot?: string;
}

interface PageGraphProps {
  pages: PageNode[];
  edges: Array<{ source: string; target: string }>;
  onNodeClick?: (page: PageNode) => void;
  selectedNodeId?: string;
}

type LayoutType = 'hierarchical' | 'force-directed' | 'radial';

// Category colors and icons
const categoryConfig: Record<string, { color: string; bgColor: string; icon: string }> = {
  auth: { color: 'border-purple-500', bgColor: 'bg-purple-50 dark:bg-purple-950', icon: '🔐' },
  dashboard: { color: 'border-blue-500', bgColor: 'bg-blue-50 dark:bg-blue-950', icon: '📊' },
  form: { color: 'border-green-500', bgColor: 'bg-green-50 dark:bg-green-950', icon: '📝' },
  list: { color: 'border-amber-500', bgColor: 'bg-amber-50 dark:bg-amber-950', icon: '📋' },
  detail: { color: 'border-cyan-500', bgColor: 'bg-cyan-50 dark:bg-cyan-950', icon: '🔍' },
  settings: { color: 'border-gray-500', bgColor: 'bg-gray-50 dark:bg-gray-950', icon: '⚙️' },
  profile: { color: 'border-pink-500', bgColor: 'bg-pink-50 dark:bg-pink-950', icon: '👤' },
  error: { color: 'border-red-500', bgColor: 'bg-red-50 dark:bg-red-950', icon: '❌' },
  default: { color: 'border-slate-500', bgColor: 'bg-slate-50 dark:bg-slate-950', icon: '📄' },
};

// Depth border colors
const depthColors = [
  'ring-blue-500',
  'ring-green-500',
  'ring-amber-500',
  'ring-purple-500',
  'ring-pink-500',
  'ring-cyan-500',
];

// Custom node component
function PageNodeComponent({ data, selected }: NodeProps<PageNode>) {
  const config = categoryConfig[data.category] || categoryConfig.default;
  const depthColor = depthColors[data.depth % depthColors.length];

  const [showTooltip, setShowTooltip] = useState(false);

  const truncateTitle = (title: string, maxLength: number = 20) => {
    if (title.length <= maxLength) return title;
    return title.slice(0, maxLength) + '...';
  };

  return (
    <div
      className={`
        relative px-4 py-3 rounded-lg border-2 shadow-md transition-all duration-200
        ${config.color} ${config.bgColor}
        ${selected ? `ring-2 ${depthColor} ring-offset-2 scale-105` : ''}
        hover:shadow-lg hover:scale-105 cursor-pointer
        min-w-[140px] max-w-[180px]
      `}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
    >
      <Handle
        type="target"
        position={Position.Top}
        className="!bg-slate-400 !border-slate-500 !w-2 !h-2"
      />

      {/* Node content */}
      <div className="flex items-center gap-2">
        <span className="text-lg">{config.icon}</span>
        <span className="font-medium text-sm text-slate-800 dark:text-slate-200 truncate">
          {truncateTitle(data.title)}
        </span>
      </div>

      {/* Stats badges */}
      <div className="flex items-center gap-1 mt-2">
        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
          {data.elementCount} el
        </span>
        {data.formCount > 0 && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-green-200 dark:bg-green-800 text-green-700 dark:text-green-300">
            {data.formCount} form
          </span>
        )}
        {data.linkCount > 0 && (
          <span className="inline-flex items-center px-1.5 py-0.5 rounded text-xs font-medium bg-blue-200 dark:bg-blue-800 text-blue-700 dark:text-blue-300">
            {data.linkCount} link
          </span>
        )}
      </div>

      {/* Depth indicator */}
      <div className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-slate-700 dark:bg-slate-300 flex items-center justify-center text-xs font-bold text-white dark:text-slate-800">
        {data.depth}
      </div>

      <Handle
        type="source"
        position={Position.Bottom}
        className="!bg-slate-400 !border-slate-500 !w-2 !h-2"
      />

      {/* Tooltip */}
      {showTooltip && (
        <div className="absolute left-1/2 -translate-x-1/2 bottom-full mb-2 z-50 w-64 p-3 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 rounded-lg shadow-xl text-xs">
          <div className="font-semibold mb-1">{data.title}</div>
          <div className="text-slate-300 dark:text-slate-600 break-all mb-2">{data.url}</div>
          <div className="grid grid-cols-2 gap-1 text-slate-300 dark:text-slate-600">
            <span>Category: {data.category}</span>
            <span>Depth: {data.depth}</span>
            <span>Elements: {data.elementCount}</span>
            <span>Forms: {data.formCount}</span>
            <span>Links: {data.linkCount}</span>
          </div>
          {/* Tooltip arrow */}
          <div className="absolute left-1/2 -translate-x-1/2 top-full w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-slate-900 dark:border-t-slate-100" />
        </div>
      )}
    </div>
  );
}

const nodeTypes = {
  pageNode: PageNodeComponent,
};

// Layout functions
function getLayoutedElements(
  nodes: Node<PageNode>[],
  edges: Edge[],
  layoutType: LayoutType,
  startNodeId?: string
): { nodes: Node<PageNode>[]; edges: Edge[] } {
  if (nodes.length === 0) return { nodes, edges };

  if (layoutType === 'hierarchical') {
    return getHierarchicalLayout(nodes, edges);
  } else if (layoutType === 'radial') {
    return getRadialLayout(nodes, edges, startNodeId);
  } else {
    return getForceDirectedLayout(nodes, edges);
  }
}

function getHierarchicalLayout(
  nodes: Node<PageNode>[],
  edges: Edge[]
): { nodes: Node<PageNode>[]; edges: Edge[] } {
  const dagreGraph = new dagre.graphlib.Graph();
  dagreGraph.setDefaultEdgeLabel(() => ({}));
  dagreGraph.setGraph({ rankdir: 'TB', nodesep: 80, ranksep: 120 });

  const nodeWidth = 180;
  const nodeHeight = 80;

  nodes.forEach((node) => {
    dagreGraph.setNode(node.id, { width: nodeWidth, height: nodeHeight });
  });

  edges.forEach((edge) => {
    dagreGraph.setEdge(edge.source, edge.target);
  });

  dagre.layout(dagreGraph);

  const layoutedNodes = nodes.map((node) => {
    const nodeWithPosition = dagreGraph.node(node.id);
    return {
      ...node,
      position: {
        x: nodeWithPosition.x - nodeWidth / 2,
        y: nodeWithPosition.y - nodeHeight / 2,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}

function getForceDirectedLayout(
  nodes: Node<PageNode>[],
  edges: Edge[]
): { nodes: Node<PageNode>[]; edges: Edge[] } {
  // Simple force-directed layout simulation
  const nodePositions = new Map<string, { x: number; y: number }>();
  const nodeWidth = 180;
  const nodeHeight = 80;

  // Initialize positions in a grid
  const cols = Math.ceil(Math.sqrt(nodes.length));
  nodes.forEach((node, index) => {
    const row = Math.floor(index / cols);
    const col = index % cols;
    nodePositions.set(node.id, {
      x: col * (nodeWidth + 100) + Math.random() * 50,
      y: row * (nodeHeight + 80) + Math.random() * 50,
    });
  });

  // Apply simple force simulation
  const iterations = 50;
  const repulsionForce = 10000;
  const attractionForce = 0.01;

  for (let i = 0; i < iterations; i++) {
    // Repulsion between all nodes
    nodes.forEach((node1) => {
      nodes.forEach((node2) => {
        if (node1.id === node2.id) return;
        const pos1 = nodePositions.get(node1.id)!;
        const pos2 = nodePositions.get(node2.id)!;
        const dx = pos1.x - pos2.x;
        const dy = pos1.y - pos2.y;
        const distance = Math.sqrt(dx * dx + dy * dy) || 1;
        const force = repulsionForce / (distance * distance);
        pos1.x += (dx / distance) * force;
        pos1.y += (dy / distance) * force;
      });
    });

    // Attraction along edges
    edges.forEach((edge) => {
      const pos1 = nodePositions.get(edge.source);
      const pos2 = nodePositions.get(edge.target);
      if (!pos1 || !pos2) return;
      const dx = pos2.x - pos1.x;
      const dy = pos2.y - pos1.y;
      pos1.x += dx * attractionForce;
      pos1.y += dy * attractionForce;
      pos2.x -= dx * attractionForce;
      pos2.y -= dy * attractionForce;
    });
  }

  // Normalize positions to start from 0
  let minX = Infinity, minY = Infinity;
  nodePositions.forEach((pos) => {
    minX = Math.min(minX, pos.x);
    minY = Math.min(minY, pos.y);
  });

  const layoutedNodes = nodes.map((node) => {
    const pos = nodePositions.get(node.id)!;
    return {
      ...node,
      position: {
        x: pos.x - minX + 50,
        y: pos.y - minY + 50,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}

function getRadialLayout(
  nodes: Node<PageNode>[],
  edges: Edge[],
  startNodeId?: string
): { nodes: Node<PageNode>[]; edges: Edge[] } {
  if (nodes.length === 0) return { nodes, edges };

  // Find the start node (use first node if not specified)
  const startId = startNodeId || nodes[0].id;
  const startNode = nodes.find((n) => n.id === startId) || nodes[0];

  // Build adjacency list
  const adjacency = new Map<string, string[]>();
  nodes.forEach((node) => adjacency.set(node.id, []));
  edges.forEach((edge) => {
    adjacency.get(edge.source)?.push(edge.target);
  });

  // BFS to find distances from start
  const distances = new Map<string, number>();
  const queue = [startId];
  distances.set(startId, 0);

  while (queue.length > 0) {
    const current = queue.shift()!;
    const currentDist = distances.get(current)!;
    const neighbors = adjacency.get(current) || [];

    neighbors.forEach((neighbor) => {
      if (!distances.has(neighbor)) {
        distances.set(neighbor, currentDist + 1);
        queue.push(neighbor);
      }
    });
  }

  // Handle disconnected nodes
  nodes.forEach((node) => {
    if (!distances.has(node.id)) {
      distances.set(node.id, 999);
    }
  });

  // Group nodes by distance
  const layers = new Map<number, string[]>();
  distances.forEach((dist, id) => {
    if (!layers.has(dist)) layers.set(dist, []);
    layers.get(dist)!.push(id);
  });

  // Calculate positions
  const centerX = 400;
  const centerY = 400;
  const layerSpacing = 150;

  const nodePositions = new Map<string, { x: number; y: number }>();

  layers.forEach((nodeIds, layer) => {
    if (layer === 0) {
      nodePositions.set(nodeIds[0], { x: centerX, y: centerY });
    } else {
      const radius = layer * layerSpacing;
      const angleStep = (2 * Math.PI) / nodeIds.length;
      nodeIds.forEach((id, index) => {
        const angle = index * angleStep - Math.PI / 2;
        nodePositions.set(id, {
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle),
        });
      });
    }
  });

  const layoutedNodes = nodes.map((node) => {
    const pos = nodePositions.get(node.id) || { x: 0, y: 0 };
    return {
      ...node,
      position: {
        x: pos.x - 90,
        y: pos.y - 40,
      },
    };
  });

  return { nodes: layoutedNodes, edges };
}

// Inner graph component that uses useReactFlow
function PageGraphInner({
  pages,
  edges: inputEdges,
  onNodeClick,
  selectedNodeId,
}: PageGraphProps) {
  const [layoutType, setLayoutType] = useState<LayoutType>('hierarchical');
  const { fitView } = useReactFlow();

  // Convert pages to react-flow nodes
  const initialNodes: Node<PageNode>[] = useMemo(() => {
    return pages.map((page) => ({
      id: page.id,
      type: 'pageNode',
      data: page,
      position: { x: 0, y: 0 },
      selected: page.id === selectedNodeId,
    }));
  }, [pages, selectedNodeId]);

  // Convert edges to react-flow edges
  const initialEdges: Edge[] = useMemo(() => {
    return inputEdges.map((edge, index) => ({
      id: `edge-${edge.source}-${edge.target}-${index}`,
      source: edge.source,
      target: edge.target,
      type: 'smoothstep',
      animated: true,
      style: { stroke: '#94a3b8', strokeWidth: 2 },
      markerEnd: {
        type: MarkerType.ArrowClosed,
        color: '#94a3b8',
      },
    }));
  }, [inputEdges]);

  // Apply layout
  const { nodes: layoutedNodes, edges: layoutedEdges } = useMemo(() => {
    const startNodeId = pages.find((p) => p.depth === 0)?.id;
    return getLayoutedElements(initialNodes, initialEdges, layoutType, startNodeId);
  }, [initialNodes, initialEdges, layoutType, pages]);

  const [nodes, setNodes, onNodesChange] = useNodesState(layoutedNodes);
  const [edges, setEdges, onEdgesChange] = useEdgesState(layoutedEdges);

  // Update nodes when layout changes
  useEffect(() => {
    setNodes(layoutedNodes);
    setEdges(layoutedEdges);
    setTimeout(() => fitView({ padding: 0.2, duration: 500 }), 100);
  }, [layoutedNodes, layoutedEdges, setNodes, setEdges, fitView]);

  // Handle node click
  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node<PageNode>) => {
      if (onNodeClick) {
        onNodeClick(node.data);
      }
    },
    [onNodeClick]
  );

  // Handle fit view
  const handleFitView = useCallback(() => {
    fitView({ padding: 0.2, duration: 500 });
  }, [fitView]);

  return (
    <div className="w-full h-full relative">
      {/* Layout controls */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-white dark:bg-slate-800 rounded-lg shadow-lg p-2">
        <span className="text-sm font-medium text-slate-700 dark:text-slate-300 px-2">Layout:</span>
        <button
          onClick={() => setLayoutType('hierarchical')}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            layoutType === 'hierarchical'
              ? 'bg-blue-500 text-white'
              : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
          }`}
        >
          Hierarchical
        </button>
        <button
          onClick={() => setLayoutType('force-directed')}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            layoutType === 'force-directed'
              ? 'bg-blue-500 text-white'
              : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
          }`}
        >
          Force
        </button>
        <button
          onClick={() => setLayoutType('radial')}
          className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
            layoutType === 'radial'
              ? 'bg-blue-500 text-white'
              : 'bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600'
          }`}
        >
          Radial
        </button>
        <div className="w-px h-6 bg-slate-300 dark:bg-slate-600 mx-1" />
        <button
          onClick={handleFitView}
          className="px-3 py-1.5 text-sm rounded-md bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600 transition-colors"
          title="Fit to view"
        >
          Fit View
        </button>
      </div>

      {/* Legend */}
      <div className="absolute bottom-4 left-4 z-10 bg-white dark:bg-slate-800 rounded-lg shadow-lg p-3">
        <div className="text-xs font-medium text-slate-700 dark:text-slate-300 mb-2">Categories</div>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1">
          {Object.entries(categoryConfig).slice(0, -1).map(([key, config]) => (
            <div key={key} className="flex items-center gap-1.5 text-xs text-slate-600 dark:text-slate-400">
              <span>{config.icon}</span>
              <span className="capitalize">{key}</span>
            </div>
          ))}
        </div>
      </div>

      {/* React Flow */}
      <ReactFlow
        nodes={nodes}
        edges={edges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        nodeTypes={nodeTypes}
        fitView
        fitViewOptions={{ padding: 0.2 }}
        minZoom={0.1}
        maxZoom={2}
        className="bg-slate-50 dark:bg-slate-900"
      >
        <Background color="#94a3b8" gap={20} size={1} />
        <Controls
          className="bg-white dark:bg-slate-800 border-slate-300 dark:border-slate-600 rounded-lg shadow-lg"
          showZoom
          showFitView
          showInteractive
        />
        <MiniMap
          nodeColor={(node) => {
            const config = categoryConfig[(node.data as PageNode).category] || categoryConfig.default;
            const colorMatch = config.color.match(/border-(\w+)-500/);
            const colorName = colorMatch ? colorMatch[1] : 'slate';
            const colorMap: Record<string, string> = {
              purple: '#a855f7',
              blue: '#3b82f6',
              green: '#22c55e',
              amber: '#f59e0b',
              cyan: '#06b6d4',
              gray: '#6b7280',
              pink: '#ec4899',
              red: '#ef4444',
              slate: '#64748b',
            };
            return colorMap[colorName] || '#64748b';
          }}
          maskColor="rgba(0, 0, 0, 0.1)"
          className="bg-white dark:bg-slate-800 border border-slate-300 dark:border-slate-600 rounded-lg shadow-lg"
        />
      </ReactFlow>

      {/* Empty state */}
      {pages.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-slate-500 dark:text-slate-400">
            <svg
              className="w-16 h-16 mx-auto mb-4 opacity-50"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7"
              />
            </svg>
            <p className="text-lg font-medium">No pages discovered yet</p>
            <p className="text-sm">Start a discovery session to visualize page relationships</p>
          </div>
        </div>
      )}
    </div>
  );
}

// Main PageGraph component wrapped with ReactFlowProvider
function PageGraph(props: PageGraphProps) {
  return (
    <ReactFlowProvider>
      <PageGraphInner {...props} />
    </ReactFlowProvider>
  );
}

export { PageGraph, type PageNode, type PageGraphProps };
