'use client';

import { memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Globe,
  ExternalLink,
  Copy,
  Check,
  ChevronDown,
  ChevronRight,
  Search,
  BookOpen,
  Link2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface SearchResult {
  title: string;
  url: string;
  snippet: string;
  index: number;
}

interface WebSearchCardProps {
  data: {
    success: boolean;
    query: string;
    answer?: string;
    results?: SearchResult[];
    citations_count?: number;
    model?: string;
    search_context?: string;
    error?: string;
    _actions?: string[];
  };
  onAction?: (action: string, data: unknown) => void;
}

// Citation link component
function CitationLink({ index, url, title }: { index: number; url: string; title: string }) {
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-blue-500/10 text-blue-500 hover:bg-blue-500/20 transition-colors"
      title={title}
    >
      <span>[{index}]</span>
    </a>
  );
}

// Source card component
function SourceCard({ result, isExpanded, onToggle }: {
  result: SearchResult;
  isExpanded: boolean;
  onToggle: () => void;
}) {
  // Extract domain from URL
  const domain = (() => {
    try {
      return new URL(result.url).hostname.replace('www.', '');
    } catch {
      return result.url;
    }
  })();

  return (
    <motion.div
      layout
      className="rounded-lg border bg-background/50 overflow-hidden"
    >
      <button
        onClick={onToggle}
        className="w-full px-3 py-2 flex items-start gap-2 hover:bg-muted/50 transition-colors text-left"
      >
        <span className="flex-shrink-0 w-5 h-5 rounded bg-blue-500/10 text-blue-500 text-[10px] font-bold flex items-center justify-center">
          {result.index}
        </span>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <Globe className="w-3 h-3 text-muted-foreground flex-shrink-0" />
            <span className="text-[10px] text-muted-foreground truncate">{domain}</span>
          </div>
          <h5 className="text-xs font-medium truncate mt-0.5">{result.title}</h5>
        </div>
        <div className="flex-shrink-0">
          {isExpanded ? (
            <ChevronDown className="w-4 h-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          )}
        </div>
      </button>

      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-3 pb-3 pt-1 border-t border-border/50">
              {result.snippet && (
                <p className="text-xs text-muted-foreground mb-2">{result.snippet}</p>
              )}
              <a
                href={result.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
              >
                Visit source
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}

export const WebSearchCard = memo(function WebSearchCard({
  data,
  onAction,
}: WebSearchCardProps) {
  const [copied, setCopied] = useState(false);
  const [expandedSources, setExpandedSources] = useState<Set<number>>(new Set());
  const [showAllSources, setShowAllSources] = useState(false);

  const { success, query, answer, results = [], citations_count = 0, error } = data;

  const handleCopyAnswer = () => {
    if (answer) {
      navigator.clipboard.writeText(answer);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      onAction?.('copy_answer', { answer });
    }
  };

  const toggleSource = (index: number) => {
    setExpandedSources(prev => {
      const next = new Set(prev);
      if (next.has(index)) {
        next.delete(index);
      } else {
        next.add(index);
      }
      return next;
    });
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

  const visibleResults = showAllSources ? results : results.slice(0, 3);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border-2 border-blue-500/20 bg-gradient-to-br from-blue-500/5 to-purple-500/5 overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-blue-500/20 bg-blue-500/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-blue-500/20">
            <Globe className="h-4 w-4 text-blue-500" />
          </div>
          <div>
            <h4 className="font-semibold text-sm">Web Search Results</h4>
            <p className="text-[10px] text-muted-foreground line-clamp-1">
              &quot;{query}&quot;
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <Link2 className="w-3 h-3" />
          <span>{citations_count} sources</span>
        </div>
      </div>

      {/* Answer Section */}
      {answer && (
        <div className="px-4 py-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <BookOpen className="w-3.5 h-3.5" />
              <span>Answer</span>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleCopyAnswer}
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
          <div className="prose prose-sm dark:prose-invert max-w-none text-sm">
            <ReactMarkdown
              remarkPlugins={[remarkGfm]}
              components={{
                p: ({ children }) => <p className="mb-2 last:mb-0 text-sm leading-relaxed">{children}</p>,
                a: ({ href, children }) => (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-blue-500 hover:underline"
                  >
                    {children}
                  </a>
                ),
                ul: ({ children }) => <ul className="list-disc list-inside mb-2 space-y-1 text-sm">{children}</ul>,
                ol: ({ children }) => <ol className="list-decimal list-inside mb-2 space-y-1 text-sm">{children}</ol>,
                li: ({ children }) => <li className="text-sm">{children}</li>,
                code: ({ children }) => (
                  <code className="bg-muted px-1 py-0.5 rounded text-xs font-mono">{children}</code>
                ),
                strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
              }}
            >
              {answer}
            </ReactMarkdown>
          </div>
        </div>
      )}

      {/* Sources Section */}
      {results.length > 0 && (
        <div className="px-4 pb-3">
          <div className="flex items-center justify-between mb-2">
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Link2 className="w-3.5 h-3.5" />
              <span>Sources ({results.length})</span>
            </div>
            {results.length > 3 && (
              <button
                onClick={() => setShowAllSources(!showAllSources)}
                className="text-xs text-primary hover:underline"
              >
                {showAllSources ? 'Show less' : `Show all ${results.length}`}
              </button>
            )}
          </div>
          <div className="space-y-2">
            {visibleResults.map((result) => (
              <SourceCard
                key={result.index}
                result={result}
                isExpanded={expandedSources.has(result.index)}
                onToggle={() => toggleSource(result.index)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Quick Actions */}
      <div className="px-4 py-3 border-t border-blue-500/20 bg-blue-500/5 flex items-center gap-2">
        <Button
          onClick={() => onAction?.('open_sources', { results })}
          size="sm"
          variant="outline"
          className="gap-1.5"
        >
          <ExternalLink className="h-3.5 w-3.5" />
          Open All Sources
        </Button>
        <Button
          onClick={handleCopyAnswer}
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5 text-green-500" />
              Copied
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              Copy Answer
            </>
          )}
        </Button>
      </div>
    </motion.div>
  );
});

export default WebSearchCard;
