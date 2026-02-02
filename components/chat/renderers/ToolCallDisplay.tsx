/**
 * ToolCallDisplay - Display tool invocations and results
 *
 * Shows tool calls with expandable details and results.
 */

'use client';

import { memo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Play,
  TestTube,
  Sparkles,
  Search,
  Code,
  Globe,
  Loader2,
  CheckCircle,
  XCircle,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { ResultDisplay } from './ResultDisplay';

// =============================================================================
// TYPES
// =============================================================================

export interface ToolCallDisplayProps {
  toolName: string;
  args: Record<string, unknown>;
  result?: unknown;
  isLoading?: boolean;
  onAction?: (action: string, data: unknown) => void;
}

// =============================================================================
// TOOL CONFIGS
// =============================================================================

const TOOL_ICONS: Record<string, typeof Play> = {
  executeAction: Play,
  runTest: TestTube,
  createTest: Sparkles,
  discoverElements: Search,
  extractData: Code,
  runAgent: Sparkles,
  webSearch: Globe,
};

const TOOL_LABELS: Record<string, string> = {
  executeAction: 'Executing Action',
  runTest: 'Running Test',
  createTest: 'Creating Test',
  discoverElements: 'Discovering Elements',
  extractData: 'Extracting Data',
  runAgent: 'Running Agent',
  webSearch: 'Searching the Web',
};

// =============================================================================
// COMPONENT
// =============================================================================

export const ToolCallDisplay = memo(function ToolCallDisplay({
  toolName,
  args,
  result,
  isLoading,
  onAction,
}: ToolCallDisplayProps) {
  const [expanded, setExpanded] = useState(true);
  const [copied, setCopied] = useState(false);

  const Icon = TOOL_ICONS[toolName] || Play;
  const label = TOOL_LABELS[toolName] || toolName;
  const urlValue = typeof args.url === 'string' ? args.url : null;
  const argsJson = JSON.stringify(args, null, 2);

  const handleCopy = () => {
    navigator.clipboard.writeText(JSON.stringify(result, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const getStatusIcon = () => {
    if (isLoading) {
      return <Loader2 className="h-4 w-4 animate-spin text-primary" />;
    }
    if (result && typeof result === 'object' && result !== null && 'success' in result) {
      return (result as { success: boolean }).success
        ? <CheckCircle className="h-4 w-4 text-green-500" />
        : <XCircle className="h-4 w-4 text-red-500" />;
    }
    return <Icon className="h-4 w-4 text-primary" />;
  };

  return (
    <div className="my-3 rounded-lg border bg-muted/30 overflow-hidden min-w-0 max-w-full">
      {/* Header */}
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/50 transition-colors min-w-0"
      >
        {getStatusIcon()}
        <span className="font-medium text-sm flex-shrink-0">{label}</span>
        {urlValue && (
          <span className="text-xs text-muted-foreground truncate max-w-[100px] sm:max-w-[200px] min-w-0">
            {urlValue}
          </span>
        )}
        <div className="ml-auto flex-shrink-0">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      {/* Expandable content */}
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 space-y-3 min-w-0 max-w-full">
              {/* Parameters */}
              <div className="min-w-0 max-w-full overflow-hidden">
                <div className="text-xs font-medium text-muted-foreground mb-1">
                  Parameters
                </div>
                <pre className="text-xs bg-background rounded p-2 overflow-x-auto max-w-full whitespace-pre-wrap break-all">
                  {argsJson}
                </pre>
              </div>

              {/* Result */}
              {result !== undefined && result !== null && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-xs font-medium text-muted-foreground">
                      Result
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleCopy}
                      className="h-6 px-2"
                    >
                      {copied ? (
                        <Check className="h-3 w-3 text-green-500" />
                      ) : (
                        <Copy className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                  <ResultDisplay result={result} onAction={onAction} />
                </div>
              )}

              {/* Loading state */}
              {isLoading && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Processing...</span>
                </div>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
});

export default ToolCallDisplay;
