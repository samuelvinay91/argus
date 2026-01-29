'use client';

import { memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Code2,
  FileCode,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Search,
  Hash,
  FolderOpen,
  ExternalLink,
  Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';

// Lazy load the syntax highlighter
const SyntaxHighlighter = dynamic(
  () => import('react-syntax-highlighter').then(mod => mod.Prism),
  {
    ssr: false,
    loading: () => <div className="animate-pulse bg-muted rounded h-20" />
  }
);

// Language-specific colors for visual distinction
const LANGUAGE_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  python: { bg: 'bg-yellow-500/10', text: 'text-yellow-600', border: 'border-yellow-500/30' },
  py: { bg: 'bg-yellow-500/10', text: 'text-yellow-600', border: 'border-yellow-500/30' },
  typescript: { bg: 'bg-blue-500/10', text: 'text-blue-600', border: 'border-blue-500/30' },
  ts: { bg: 'bg-blue-500/10', text: 'text-blue-600', border: 'border-blue-500/30' },
  javascript: { bg: 'bg-amber-500/10', text: 'text-amber-600', border: 'border-amber-500/30' },
  js: { bg: 'bg-amber-500/10', text: 'text-amber-600', border: 'border-amber-500/30' },
  rust: { bg: 'bg-orange-500/10', text: 'text-orange-600', border: 'border-orange-500/30' },
  go: { bg: 'bg-cyan-500/10', text: 'text-cyan-600', border: 'border-cyan-500/30' },
  java: { bg: 'bg-red-500/10', text: 'text-red-600', border: 'border-red-500/30' },
  sql: { bg: 'bg-purple-500/10', text: 'text-purple-600', border: 'border-purple-500/30' },
  default: { bg: 'bg-gray-500/10', text: 'text-gray-600', border: 'border-gray-500/30' },
};

// Chunk type icons and labels
const CHUNK_TYPE_CONFIG: Record<string, { icon: typeof Code2; label: string }> = {
  function: { icon: Code2, label: 'Function' },
  method: { icon: Code2, label: 'Method' },
  class: { icon: FileCode, label: 'Class' },
  module: { icon: FolderOpen, label: 'Module' },
  interface: { icon: FileCode, label: 'Interface' },
  type: { icon: FileCode, label: 'Type' },
  variable: { icon: Hash, label: 'Variable' },
  constant: { icon: Hash, label: 'Constant' },
  import: { icon: FolderOpen, label: 'Import' },
  unknown: { icon: Code2, label: 'Code' },
};

interface CodeSearchResult {
  file_path: string;
  language: string;
  chunk_type: string;
  name: string | null;
  full_name: string | null;
  start_line: number;
  end_line: number;
  snippet: string;
  score: number;
  highlights: string[];
}

interface CodeSearchCardProps {
  data: {
    success: boolean;
    query: string;
    project_id: string;
    results?: CodeSearchResult[];
    total_results?: number;
    search_filters?: {
      file_types?: string[] | null;
      path_filter?: string | null;
    };
    error?: string;
    suggestion?: string;
    _actions?: string[];
  };
  onAction?: (action: string, data: unknown) => void;
}

// Individual code result card
function CodeResultCard({ result, isExpanded, onToggle, onCopy }: {
  result: CodeSearchResult;
  isExpanded: boolean;
  onToggle: () => void;
  onCopy: (code: string) => void;
}) {
  const [copied, setCopied] = useState(false);
  const [style, setStyle] = useState<Record<string, React.CSSProperties> | null>(null);

  // Load syntax highlighter theme
  useState(() => {
    import('react-syntax-highlighter/dist/esm/styles/prism/one-dark').then(mod => {
      setStyle(mod.default);
    });
  });

  const langColors = LANGUAGE_COLORS[result.language.toLowerCase()] || LANGUAGE_COLORS.default;
  const chunkConfig = CHUNK_TYPE_CONFIG[result.chunk_type.toLowerCase()] || CHUNK_TYPE_CONFIG.unknown;
  const ChunkIcon = chunkConfig.icon;

  // Extract filename from path
  const fileName = result.file_path.split('/').pop() || result.file_path;

  // Calculate line span
  const lineSpan = result.end_line - result.start_line + 1;

  // Score badge color
  const scoreBg = result.score >= 0.8 ? 'bg-green-500/10 text-green-600' :
                  result.score >= 0.5 ? 'bg-yellow-500/10 text-yellow-600' :
                  'bg-gray-500/10 text-gray-600';

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(result.snippet);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onCopy(result.snippet);
  };

  return (
    <motion.div
      layout
      className={cn(
        "rounded-lg border overflow-hidden transition-colors",
        isExpanded ? langColors.border : "border-border/50",
        isExpanded ? langColors.bg : "bg-background/50"
      )}
    >
      {/* Header - always visible */}
      <button
        onClick={onToggle}
        className="w-full px-3 py-2.5 flex items-start gap-2 hover:bg-muted/50 transition-colors text-left"
      >
        {/* Chunk type icon */}
        <div className={cn("flex-shrink-0 p-1.5 rounded-md", langColors.bg)}>
          <ChunkIcon className={cn("w-3.5 h-3.5", langColors.text)} />
        </div>

        {/* Main info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Name */}
            <span className="font-medium text-sm truncate">
              {result.name || result.full_name || fileName}
            </span>
            {/* Chunk type badge */}
            <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium", langColors.bg, langColors.text)}>
              {chunkConfig.label}
            </span>
            {/* Score badge */}
            <span className={cn("px-1.5 py-0.5 rounded text-[10px] font-medium", scoreBg)}>
              {Math.round(result.score * 100)}%
            </span>
          </div>

          {/* File path */}
          <div className="flex items-center gap-1.5 mt-1">
            <FileCode className="w-3 h-3 text-muted-foreground flex-shrink-0" />
            <span className="text-[10px] text-muted-foreground truncate">
              {result.file_path}
            </span>
            <span className="text-[10px] text-muted-foreground/60 flex-shrink-0">
              L{result.start_line}-{result.end_line} ({lineSpan} lines)
            </span>
          </div>

          {/* Highlights - show matching terms */}
          {result.highlights.length > 0 && !isExpanded && (
            <div className="flex items-center gap-1 mt-1 flex-wrap">
              {result.highlights.slice(0, 3).map((h, i) => (
                <span key={i} className="px-1 py-0.5 rounded text-[9px] bg-primary/10 text-primary">
                  {h}
                </span>
              ))}
              {result.highlights.length > 3 && (
                <span className="text-[9px] text-muted-foreground">
                  +{result.highlights.length - 3} more
                </span>
              )}
            </div>
          )}
        </div>

        {/* Expand/collapse icon */}
        <div className="flex-shrink-0 self-center">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expanded content - code snippet */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="border-t border-border/50">
              {/* Code header with copy button */}
              <div className="px-3 py-1.5 flex items-center justify-between bg-background/50">
                <span className="text-[10px] text-muted-foreground">
                  {result.language} | Lines {result.start_line}-{result.end_line}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  className="h-6 px-2 text-xs"
                >
                  {copied ? (
                    <>
                      <Check className="w-3 h-3 mr-1 text-green-500" />
                      Copied
                    </>
                  ) : (
                    <>
                      <Copy className="w-3 h-3 mr-1" />
                      Copy
                    </>
                  )}
                </Button>
              </div>

              {/* Code snippet */}
              <div className="max-h-80 overflow-auto">
                {style ? (
                  <SyntaxHighlighter
                    style={style}
                    language={result.language.toLowerCase()}
                    PreTag="div"
                    showLineNumbers
                    startingLineNumber={result.start_line}
                    customStyle={{
                      margin: 0,
                      padding: '0.75rem',
                      fontSize: '11px',
                      lineHeight: '1.5',
                      backgroundColor: 'transparent',
                    }}
                    lineNumberStyle={{
                      minWidth: '2.5em',
                      paddingRight: '1em',
                      color: 'var(--muted-foreground)',
                      opacity: 0.5,
                    }}
                  >
                    {result.snippet}
                  </SyntaxHighlighter>
                ) : (
                  <pre className="p-3 text-xs font-mono overflow-x-auto">
                    {result.snippet}
                  </pre>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export const CodeSearchCard = memo(function CodeSearchCard({
  data,
  onAction,
}: CodeSearchCardProps) {
  const [expandedResults, setExpandedResults] = useState<Set<number>>(new Set([0])); // First result expanded by default
  const [showAll, setShowAll] = useState(false);

  const { success, query, results = [], total_results = 0, error, suggestion, search_filters } = data;

  const toggleResult = (index: number) => {
    setExpandedResults(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
  };

  const handleCopyCode = (code: string) => {
    onAction?.('copy_code', { code });
  };

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
            <Search className="h-4 w-4 text-red-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm text-red-500">Search Failed</h4>
            <p className="text-xs text-muted-foreground mt-1">
              {error || 'An error occurred while searching'}
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
  if (results.length === 0) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-lg border border-yellow-500/30 bg-yellow-500/5 p-4"
      >
        <div className="flex items-start gap-3">
          <div className="p-1.5 rounded-md bg-yellow-500/10">
            <Search className="h-4 w-4 text-yellow-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm text-yellow-600">No Results Found</h4>
            <p className="text-xs text-muted-foreground mt-1">
              No code matching &quot;{query}&quot; was found in the indexed codebase.
            </p>
            <p className="text-xs text-muted-foreground mt-2">
              Try a different query or check if the codebase has been indexed.
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  const visibleResults = showAll ? results : results.slice(0, 5);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border-2 border-emerald-500/20 bg-gradient-to-br from-emerald-500/5 to-cyan-500/5 overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-emerald-500/20 bg-emerald-500/5">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-md bg-emerald-500/20">
              <Code2 className="h-4 w-4 text-emerald-500" />
            </div>
            <div>
              <h4 className="font-semibold text-sm">Code Search Results</h4>
              <p className="text-[10px] text-muted-foreground line-clamp-1">
                &quot;{query}&quot;
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <FileCode className="w-3 h-3" />
            <span>{total_results} result{total_results !== 1 ? 's' : ''}</span>
          </div>
        </div>

        {/* Applied filters */}
        {search_filters && (search_filters.file_types || search_filters.path_filter) && (
          <div className="flex items-center gap-2 mt-2 flex-wrap">
            <Filter className="w-3 h-3 text-muted-foreground" />
            {search_filters.file_types && search_filters.file_types.length > 0 && (
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-600">
                {search_filters.file_types.join(', ')}
              </span>
            )}
            {search_filters.path_filter && (
              <span className="px-1.5 py-0.5 rounded text-[10px] bg-emerald-500/10 text-emerald-600">
                {search_filters.path_filter}
              </span>
            )}
          </div>
        )}
      </div>

      {/* Results list */}
      <div className="px-4 py-3 space-y-2">
        {visibleResults.map((result, index) => (
          <CodeResultCard
            key={`${result.file_path}-${result.start_line}`}
            result={result}
            isExpanded={expandedResults.has(index)}
            onToggle={() => toggleResult(index)}
            onCopy={handleCopyCode}
          />
        ))}

        {/* Show more button */}
        {results.length > 5 && (
          <div className="text-center pt-2">
            <button
              onClick={() => setShowAll(!showAll)}
              className="text-xs text-primary hover:underline"
            >
              {showAll ? 'Show fewer' : `Show all ${results.length} results`}
            </button>
          </div>
        )}
      </div>

      {/* Actions footer */}
      <div className="px-4 py-3 border-t border-emerald-500/20 bg-emerald-500/5 flex items-center gap-2">
        <Button
          onClick={() => onAction?.('search_again', { query })}
          size="sm"
          variant="outline"
          className="gap-1.5"
        >
          <Search className="h-3.5 w-3.5" />
          Refine Search
        </Button>
        {results.length > 0 && (
          <Button
            onClick={() => onAction?.('open_file', { file_path: results[0].file_path })}
            variant="ghost"
            size="sm"
            className="gap-1.5 text-muted-foreground"
          >
            <ExternalLink className="h-3.5 w-3.5" />
            Open First Result
          </Button>
        )}
      </div>
    </motion.div>
  );
});

export default CodeSearchCard;
