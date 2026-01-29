'use client';

import { memo, useState, useMemo, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Network,
  Circle,
  ArrowRight,
  ChevronDown,
  ChevronRight,
  Search,
  Filter,
  Download,
  ExternalLink,
  TestTube,
  AlertTriangle,
  GitCommit,
  MousePointer2,
  Wrench,
  FileText,
  FolderKanban,
  Layers,
  Copy,
  Check,
  Info,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

// Entity type colors and icons
const ENTITY_CONFIG: Record<string, { icon: typeof TestTube; color: string; bg: string; border: string }> = {
  Test: { icon: TestTube, color: 'text-green-600', bg: 'bg-green-500/10', border: 'border-green-500/30' },
  Failure: { icon: AlertTriangle, color: 'text-red-600', bg: 'bg-red-500/10', border: 'border-red-500/30' },
  Selector: { icon: MousePointer2, color: 'text-blue-600', bg: 'bg-blue-500/10', border: 'border-blue-500/30' },
  CodeChange: { icon: GitCommit, color: 'text-purple-600', bg: 'bg-purple-500/10', border: 'border-purple-500/30' },
  HealingPattern: { icon: Wrench, color: 'text-amber-600', bg: 'bg-amber-500/10', border: 'border-amber-500/30' },
  Page: { icon: FileText, color: 'text-cyan-600', bg: 'bg-cyan-500/10', border: 'border-cyan-500/30' },
  Project: { icon: FolderKanban, color: 'text-indigo-600', bg: 'bg-indigo-500/10', border: 'border-indigo-500/30' },
  Unknown: { icon: Circle, color: 'text-gray-600', bg: 'bg-gray-500/10', border: 'border-gray-500/30' },
};

// Relationship type colors
const RELATIONSHIP_COLORS: Record<string, string> = {
  USES: 'text-blue-500',
  BROKE: 'text-red-500',
  AFFECTED: 'text-orange-500',
  CAUSED: 'text-red-600',
  MODIFIED: 'text-purple-500',
  FIXES: 'text-green-500',
  REPLACES: 'text-amber-500',
  SIMILAR_TO: 'text-cyan-500',
  TARGETS: 'text-indigo-500',
  BELONGS_TO: 'text-gray-500',
  ON: 'text-teal-500',
  DEPENDS_ON: 'text-violet-500',
  Unknown: 'text-gray-400',
};

interface GraphVertex {
  id: string | number;
  label: string;
  properties: Record<string, unknown>;
}

interface GraphEdge {
  type: string;
  from: string | number | null;
  to: string | number;
  properties?: Record<string, unknown>;
}

interface KnowledgeGraphCardProps {
  data: {
    success: boolean;
    query: string;
    query_description?: string;
    filters?: {
      entity_type?: string;
      relationship_type?: string;
      entity_id?: string;
      hops?: number;
    };
    graph?: {
      vertices: GraphVertex[];
      edges: GraphEdge[];
      total_vertices: number;
      total_edges: number;
    };
    vertices_by_type?: Record<string, number>;
    edges_by_type?: Record<string, number>;
    error?: string;
    suggestion?: string;
    _actions?: string[];
  };
  onAction?: (action: string, data: unknown) => void;
}

// Entity node component
function EntityNode({
  vertex,
  isExpanded,
  onToggle,
  onExplore,
}: {
  vertex: GraphVertex;
  isExpanded: boolean;
  onToggle: () => void;
  onExplore: (id: string | number) => void;
}) {
  const [copied, setCopied] = useState(false);
  const config = ENTITY_CONFIG[vertex.label] || ENTITY_CONFIG.Unknown;
  const Icon = config.icon;

  // Get display name from properties
  const displayName = useMemo(() => {
    const props = vertex.properties;
    return (
      props.name ||
      props.test_id?.toString().slice(0, 8) ||
      props.selector?.toString().slice(0, 30) ||
      props.commit_sha?.toString().slice(0, 7) ||
      props.error_message?.toString().slice(0, 30) ||
      props.pattern_id?.toString().slice(0, 8) ||
      `${vertex.label} ${vertex.id}`
    ) as string;
  }, [vertex]);

  // Get subtitle from properties
  const subtitle = useMemo(() => {
    const props = vertex.properties;
    if (vertex.label === 'Test') {
      return props.file_path as string || props.status as string;
    }
    if (vertex.label === 'Failure') {
      return props.error_type as string;
    }
    if (vertex.label === 'Selector') {
      return props.selector_type as string;
    }
    if (vertex.label === 'CodeChange') {
      return props.author as string || props.commit_message?.toString().slice(0, 40) as string;
    }
    if (vertex.label === 'HealingPattern') {
      return `${props.original_selector} -> ${props.healed_selector}`;
    }
    return null;
  }, [vertex]);

  const handleCopyId = (e: React.MouseEvent) => {
    e.stopPropagation();
    const id = vertex.properties.test_id || vertex.properties.pattern_id || vertex.properties.commit_sha || vertex.id;
    navigator.clipboard.writeText(String(id));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div
      layout
      className={cn(
        "rounded-lg border overflow-hidden transition-colors",
        isExpanded ? config.border : "border-border/50",
        isExpanded ? config.bg : "bg-background/50"
      )}
    >
      {/* Header */}
      <button
        onClick={onToggle}
        className="w-full px-3 py-2 flex items-start gap-2 hover:bg-muted/50 transition-colors text-left"
      >
        <div className={cn("flex-shrink-0 p-1.5 rounded-md", config.bg)}>
          <Icon className={cn("w-3.5 h-3.5", config.color)} />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="font-medium text-sm truncate">{displayName}</span>
            <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium", config.bg, config.color)}>
              {vertex.label}
            </span>
          </div>
          {subtitle && (
            <p className="text-[10px] text-muted-foreground truncate mt-0.5">{subtitle}</p>
          )}
        </div>
        <div className="flex-shrink-0 self-center">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded details */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-1 border-t border-border/50 space-y-2">
              {/* Properties */}
              <div className="space-y-1">
                {Object.entries(vertex.properties).slice(0, 6).map(([key, value]) => (
                  <div key={key} className="flex items-start gap-2 text-[10px]">
                    <span className="text-muted-foreground font-medium min-w-[80px]">{key}:</span>
                    <span className="text-foreground truncate">
                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </span>
                  </div>
                ))}
                {Object.keys(vertex.properties).length > 6 && (
                  <p className="text-[10px] text-muted-foreground italic">
                    +{Object.keys(vertex.properties).length - 6} more properties
                  </p>
                )}
              </div>

              {/* Actions */}
              <div className="flex items-center gap-2 pt-1">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => onExplore(vertex.id)}
                  className="h-6 px-2 text-[10px]"
                >
                  <Network className="w-3 h-3 mr-1" />
                  Explore
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopyId}
                  className="h-6 px-2 text-[10px]"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 mr-1 text-green-500" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 mr-1" />
                      Copy ID
                    </>
                  )}
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

// Statistics badge component
function StatBadge({ label, count, color }: { label: string; count: number; color: string }) {
  return (
    <div className={cn(
      "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-[10px] font-medium",
      color
    )}>
      <span className="opacity-75">{label}</span>
      <span className="font-bold">{count}</span>
    </div>
  );
}

// Relationship badge component
function RelationshipBadge({ type, count }: { type: string; count: number }) {
  const color = RELATIONSHIP_COLORS[type] || RELATIONSHIP_COLORS.Unknown;
  return (
    <div className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded bg-muted/50">
      <ArrowRight className={cn("w-2.5 h-2.5", color)} />
      <span className="text-[9px] font-medium">{type}</span>
      <span className="text-[9px] text-muted-foreground">({count})</span>
    </div>
  );
}

export const KnowledgeGraphCard = memo(function KnowledgeGraphCard({
  data,
  onAction,
}: KnowledgeGraphCardProps) {
  const [expandedNodes, setExpandedNodes] = useState<Set<string | number>>(new Set());
  const [selectedType, setSelectedType] = useState<string | null>(null);
  const [showAllNodes, setShowAllNodes] = useState(false);

  const {
    success,
    query,
    query_description,
    graph,
    vertices_by_type = {},
    edges_by_type = {},
    error,
    suggestion,
    filters,
  } = data;

  // Filter vertices by selected type
  const filteredVertices = useMemo(() => {
    if (!graph?.vertices) return [];
    if (!selectedType) return graph.vertices;
    return graph.vertices.filter(v => v.label === selectedType);
  }, [graph?.vertices, selectedType]);

  const visibleVertices = showAllNodes ? filteredVertices : filteredVertices.slice(0, 10);

  const toggleNode = useCallback((id: string | number) => {
    setExpandedNodes(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  }, []);

  const handleExplore = useCallback((entityId: string | number) => {
    onAction?.('explore_entity', { entity_id: entityId });
  }, [onAction]);

  // Handle error state
  if (!success || error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-lg border border-red-500/30 bg-red-500/5 p-4"
      >
        <div className="flex items-start gap-3">
          <div className="p-1.5 rounded-md bg-red-500/10">
            <Network className="h-4 w-4 text-red-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm text-red-500">Knowledge Graph Query Failed</h4>
            <p className="text-xs text-muted-foreground mt-1">
              {error || 'An error occurred while querying the knowledge graph'}
            </p>
            {suggestion && (
              <p className="text-xs text-muted-foreground mt-2 italic">
                {suggestion}
              </p>
            )}
            {query && (
              <p className="text-xs text-muted-foreground mt-2">
                Query: &quot;{query}&quot;
              </p>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  // Empty results
  if (!graph || graph.total_vertices === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4"
      >
        <div className="flex items-start gap-3">
          <div className="p-1.5 rounded-md bg-yellow-500/10">
            <Network className="h-4 w-4 text-yellow-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm text-yellow-600">No Results Found</h4>
            <p className="text-xs text-muted-foreground mt-1">
              No entities matching &quot;{query}&quot; were found in the knowledge graph.
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Try a different query or check if the knowledge graph has been populated with test data.
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border-2 border-violet-500/20 bg-gradient-to-br from-violet-500/5 to-indigo-500/5 overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-violet-500/20 bg-violet-500/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-violet-500/20">
              <Network className="h-4 w-4 text-violet-500" />
            </div>
            <div>
              <h4 className="font-semibold text-sm">Knowledge Graph</h4>
              <p className="text-[10px] text-muted-foreground line-clamp-1">
                {query_description || query}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Layers className="w-3 h-3" />
            <span>{graph.total_vertices} nodes</span>
            <span className="text-muted-foreground/50">|</span>
            <ArrowRight className="w-3 h-3" />
            <span>{graph.total_edges} edges</span>
          </div>
        </div>

        {/* Applied filters */}
        {filters && (filters.entity_type !== 'all' || filters.relationship_type !== 'all' || filters.entity_id) && (
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Filter className="w-3 h-3 text-muted-foreground" />
            {filters.entity_type && filters.entity_type !== 'all' && (
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-violet-500/10 text-violet-600">
                {filters.entity_type}
              </span>
            )}
            {filters.relationship_type && filters.relationship_type !== 'all' && (
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-violet-500/10 text-violet-600">
                {filters.relationship_type}
              </span>
            )}
            {filters.entity_id && (
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-violet-500/10 text-violet-600">
                ID: {filters.entity_id.slice(0, 8)}...
              </span>
            )}
            {filters.hops && filters.hops > 1 && (
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-violet-500/10 text-violet-600">
                {filters.hops} hops
              </span>
            )}
          </div>
        )}
      </div>

      {/* Statistics */}
      <div className="px-4 py-2 border-b border-violet-500/10 bg-violet-500/[0.02]">
        {/* Entity type counts */}
        <div className="flex items-center gap-1.5 flex-wrap">
          <span className="text-[10px] text-muted-foreground mr-1">Entities:</span>
          {Object.entries(vertices_by_type).map(([type, count]) => {
            const config = ENTITY_CONFIG[type] || ENTITY_CONFIG.Unknown;
            const isSelected = selectedType === type;
            return (
              <button
                key={type}
                onClick={() => setSelectedType(isSelected ? null : type)}
                className={cn(
                  "inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] transition-colors",
                  isSelected
                    ? cn(config.bg, config.color, config.border, "border")
                    : "bg-muted/50 hover:bg-muted"
                )}
              >
                <config.icon className="w-2.5 h-2.5" />
                <span>{type}</span>
                <span className="font-medium">({count})</span>
              </button>
            );
          })}
          {selectedType && (
            <button
              onClick={() => setSelectedType(null)}
              className="text-[10px] text-primary hover:underline ml-1"
            >
              Clear filter
            </button>
          )}
        </div>

        {/* Relationship type counts */}
        {Object.keys(edges_by_type).length > 0 && (
          <div className="flex items-center gap-1.5 flex-wrap mt-1.5">
            <span className="text-[10px] text-muted-foreground mr-1">Relationships:</span>
            {Object.entries(edges_by_type).map(([type, count]) => (
              <RelationshipBadge key={type} type={type} count={count as number} />
            ))}
          </div>
        )}
      </div>

      {/* Entity list */}
      <div className="px-4 py-3 space-y-2">
        {visibleVertices.map((vertex) => (
          <EntityNode
            key={vertex.id}
            vertex={vertex}
            isExpanded={expandedNodes.has(vertex.id)}
            onToggle={() => toggleNode(vertex.id)}
            onExplore={handleExplore}
          />
        ))}

        {/* Show more button */}
        {filteredVertices.length > 10 && (
          <div className="text-center pt-2">
            <button
              onClick={() => setShowAllNodes(!showAllNodes)}
              className="text-xs text-primary hover:underline"
            >
              {showAllNodes
                ? 'Show fewer'
                : `Show all ${filteredVertices.length} entities`}
            </button>
          </div>
        )}
      </div>

      {/* Actions footer */}
      <div className="px-4 py-3 border-t border-violet-500/20 bg-violet-500/5 flex items-center gap-2">
        <Button
          onClick={() => onAction?.('run_query', { query })}
          size="sm"
          variant="outline"
          className="gap-1.5"
        >
          <Search className="h-3.5 w-3.5" />
          Refine Query
        </Button>
        <Button
          onClick={() => onAction?.('expand_graph', { vertices: graph.vertices.map(v => v.id) })}
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground"
        >
          <Network className="h-3.5 w-3.5" />
          Expand Graph
        </Button>
        <Button
          onClick={() => onAction?.('export_data', { graph })}
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground"
        >
          <Download className="h-3.5 w-3.5" />
          Export
        </Button>
      </div>
    </motion.div>
  );
});

export default KnowledgeGraphCard;
