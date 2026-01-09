'use client';

import { useChat, Message } from 'ai/react';
import { useRef, useEffect, useState, useCallback, memo, useMemo } from 'react';
import {
  Send,
  Loader2,
  Bot,
  User,
  Sparkles,
  TestTube,
  Eye,
  Compass,
  CheckCircle,
  XCircle,
  Play,
  Search,
  Code,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  RefreshCw,
  Wand2,
  Zap,
  ArrowRight,
  X,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence, Variants } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';
import { CompactExecutionProgress } from './live-execution-progress';

interface ChatInterfaceProps {
  conversationId?: string;
  initialMessages?: Message[];
  onMessagesChange?: (messages: Message[]) => void;
}

// AI Status types
type AIStatus = 'ready' | 'thinking' | 'typing';

const SUGGESTIONS = [
  { icon: TestTube, text: 'Create a login test', fullText: 'Create a login test for email test@example.com', color: 'text-green-500' },
  { icon: Eye, text: 'Discover elements', fullText: 'Discover all interactive elements on https://demo.vercel.store', color: 'text-blue-500' },
  { icon: Compass, text: 'Run e-commerce test', fullText: 'Run a test: Go to demo.vercel.store, click on a product, add to cart', color: 'text-purple-500' },
  { icon: Sparkles, text: 'Extract product data', fullText: 'Extract all product names from https://demo.vercel.store', color: 'text-orange-500' },
];

// Contextual quick suggestions based on conversation context
const CONTEXTUAL_SUGGESTIONS = {
  empty: [
    { text: 'Run a quick test', icon: Zap },
    { text: 'Analyze my app', icon: Search },
    { text: 'Check accessibility', icon: Eye },
    { text: 'Find bugs', icon: Wand2 },
  ],
  afterTest: [
    { text: 'Run again', icon: RefreshCw },
    { text: 'Fix errors', icon: Wand2 },
    { text: 'Export results', icon: ArrowRight },
    { text: 'Add more tests', icon: TestTube },
  ],
  afterError: [
    { text: 'Retry with fixes', icon: RefreshCw },
    { text: 'Explain error', icon: Search },
    { text: 'Skip this step', icon: ArrowRight },
    { text: 'Try alternative', icon: Wand2 },
  ],
};

// ============================================================================
// AI AVATAR COMPONENT
// ============================================================================
interface AIAvatarProps {
  status: AIStatus;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const AIAvatar = memo(function AIAvatar({ status, size = 'md', className }: AIAvatarProps) {
  const sizeClasses = {
    sm: 'w-6 h-6',
    md: 'w-8 h-8',
    lg: 'w-10 h-10',
  };

  const iconSizes = {
    sm: 'w-4 h-4',
    md: 'w-5 h-5',
    lg: 'w-6 h-6',
  };

  return (
    <div className={cn('relative flex-shrink-0', className)}>
      {/* Outer pulse ring for thinking state */}
      <AnimatePresence>
        {status === 'thinking' && (
          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1.4, opacity: 0 }}
            exit={{ scale: 0.8, opacity: 0 }}
            transition={{
              duration: 1.5,
              repeat: Infinity,
              ease: 'easeOut',
            }}
            className={cn(
              'absolute inset-0 rounded-full bg-primary/30',
              sizeClasses[size]
            )}
          />
        )}
      </AnimatePresence>

      {/* Main avatar container */}
      <motion.div
        animate={
          status === 'thinking'
            ? { scale: [1, 1.05, 1] }
            : status === 'typing'
            ? { rotate: [0, 5, -5, 0] }
            : { scale: 1 }
        }
        transition={{
          duration: status === 'thinking' ? 1.5 : 0.5,
          repeat: status !== 'ready' ? Infinity : 0,
          ease: 'easeInOut',
        }}
        className={cn(
          'rounded-full bg-gradient-to-br from-primary/20 to-purple-500/20 flex items-center justify-center',
          sizeClasses[size]
        )}
      >
        <Bot className={cn('text-primary', iconSizes[size])} />
      </motion.div>

      {/* Status indicator dot */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        className={cn(
          'absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-background',
          status === 'ready' && 'bg-green-500',
          status === 'thinking' && 'bg-amber-500',
          status === 'typing' && 'bg-blue-500'
        )}
      >
        {status !== 'ready' && (
          <motion.div
            className="w-full h-full rounded-full bg-inherit"
            animate={{ opacity: [1, 0.4, 1] }}
            transition={{ duration: 0.8, repeat: Infinity }}
          />
        )}
      </motion.div>
    </div>
  );
});

// ============================================================================
// TYPING INDICATOR COMPONENT
// ============================================================================
interface TypingIndicatorProps {
  className?: string;
}

const TypingIndicator = memo(function TypingIndicator({ className }: TypingIndicatorProps) {
  const dotVariants: Variants = {
    initial: { y: 0 },
    animate: { y: -6 },
  };

  return (
    <div className={cn('flex items-center gap-1 px-2 py-1', className)}>
      {[0, 1, 2].map((index) => (
        <motion.div
          key={index}
          variants={dotVariants}
          initial="initial"
          animate="animate"
          transition={{
            duration: 0.4,
            repeat: Infinity,
            repeatType: 'reverse',
            delay: index * 0.15,
            ease: 'easeInOut',
          }}
          className="w-2 h-2 rounded-full bg-primary/60"
        />
      ))}
    </div>
  );
});

// ============================================================================
// STREAMING TEXT WITH CURSOR
// ============================================================================
interface StreamingTextProps {
  text: string;
  isStreaming?: boolean;
  className?: string;
}

const StreamingText = memo(function StreamingText({ text, isStreaming, className }: StreamingTextProps) {
  return (
    <span className={cn('inline', className)}>
      {text}
      {isStreaming && (
        <motion.span
          className="inline-block w-0.5 h-4 bg-primary ml-0.5 align-middle"
          animate={{ opacity: [1, 0] }}
          transition={{
            duration: 0.5,
            repeat: Infinity,
            repeatType: 'reverse',
          }}
        />
      )}
    </span>
  );
});

// ============================================================================
// QUICK SUGGESTIONS CHIPS
// ============================================================================
interface QuickSuggestionsProps {
  suggestions: Array<{ text: string; icon: typeof Zap }>;
  onSelect: (text: string) => void;
  className?: string;
}

const QuickSuggestions = memo(function QuickSuggestions({
  suggestions,
  onSelect,
  className,
}: QuickSuggestionsProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      className={cn('flex flex-wrap gap-2', className)}
    >
      {suggestions.map((suggestion, index) => (
        <motion.button
          key={suggestion.text}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: index * 0.05 }}
          whileHover={{ scale: 1.05, y: -2 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => onSelect(suggestion.text)}
          className={cn(
            'inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium',
            'bg-primary/10 text-primary hover:bg-primary/20',
            'border border-primary/20 hover:border-primary/40',
            'transition-colors duration-200'
          )}
        >
          <suggestion.icon className="w-3 h-3" />
          {suggestion.text}
        </motion.button>
      ))}
    </motion.div>
  );
});

// ============================================================================
// INLINE AI SUGGESTION CARD
// ============================================================================
interface AISuggestionCardProps {
  title: string;
  description: string;
  onAccept: () => void;
  onDismiss: () => void;
  className?: string;
}

const AISuggestionCard = memo(function AISuggestionCard({
  title,
  description,
  onAccept,
  onDismiss,
  className,
}: AISuggestionCardProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -10, scale: 0.95 }}
      className={cn(
        'relative overflow-hidden rounded-lg border',
        'bg-gradient-to-br from-primary/5 via-primary/10 to-purple-500/5',
        'border-primary/20',
        className
      )}
    >
      {/* Shimmer effect */}
      <motion.div
        className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent"
        animate={{ x: ['-100%', '100%'] }}
        transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
      />

      <div className="relative p-3 space-y-2">
        <div className="flex items-start gap-2">
          <div className="p-1.5 rounded-md bg-primary/10">
            <Sparkles className="w-4 h-4 text-primary" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="text-sm font-medium text-foreground">{title}</h4>
            <p className="text-xs text-muted-foreground mt-0.5">{description}</p>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Button
            size="sm"
            onClick={onAccept}
            className="h-7 text-xs px-3 bg-primary hover:bg-primary/90"
          >
            <Check className="w-3 h-3 mr-1" />
            Accept
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={onDismiss}
            className="h-7 text-xs px-3 text-muted-foreground hover:text-foreground"
          >
            <X className="w-3 h-3 mr-1" />
            Dismiss
          </Button>
        </div>
      </div>
    </motion.div>
  );
});

// ============================================================================
// MESSAGE BUBBLE COMPONENTS
// ============================================================================
interface MessageBubbleProps {
  isUser: boolean;
  children: React.ReactNode;
  className?: string;
}

const MessageBubble = memo(function MessageBubble({ isUser, children, className }: MessageBubbleProps) {
  if (isUser) {
    return (
      <Card className={cn(
        'max-w-[90%] sm:max-w-[85%]',
        'bg-primary text-primary-foreground',
        className
      )}>
        <CardContent className="p-2 sm:p-3">
          {children}
        </CardContent>
      </Card>
    );
  }

  // AI message with glass effect
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn(
        'max-w-[90%] sm:max-w-[85%] relative overflow-hidden rounded-lg',
        className
      )}
    >
      {/* Glass effect background */}
      <div className="absolute inset-0 bg-gradient-to-br from-card/80 via-card/90 to-card/80 backdrop-blur-sm border border-white/10 rounded-lg" />

      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5 rounded-lg" />

      {/* Content */}
      <div className="relative p-2 sm:p-3">
        {children}
      </div>
    </motion.div>
  );
});

// ============================================================================
// STAGGERED MESSAGE ANIMATIONS
// ============================================================================
const messageContainerVariants: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const messageItemVariants: Variants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.3,
      ease: 'easeOut',
    },
  },
  exit: {
    opacity: 0,
    y: -10,
    transition: {
      duration: 0.2,
    },
  },
};

// Memoized Markdown renderer component for chat messages
const MarkdownRenderer = memo(function MarkdownRenderer({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        code({ className, children, ...props }) {
          const match = /language-(\w+)/.exec(className || '');
          const codeContent = String(children).replace(/\n$/, '');

          // Check if it's an inline code or code block
          const isInline = !match && !codeContent.includes('\n');

          if (isInline) {
            return (
              <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                {children}
              </code>
            );
          }

          return (
            <SyntaxHighlighter
              style={oneDark}
              language={match ? match[1] : 'text'}
              PreTag="div"
              className="rounded-lg text-sm !my-2"
              customStyle={{ margin: 0, padding: '1rem' }}
            >
              {codeContent}
            </SyntaxHighlighter>
          );
        },
        p({ children }) {
          return <p className="mb-2 last:mb-0">{children}</p>;
        },
        ul({ children }) {
          return <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>;
        },
        ol({ children }) {
          return <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>;
        },
        li({ children }) {
          return <li className="ml-2">{children}</li>;
        },
        h1({ children }) {
          return <h1 className="text-xl font-bold mb-2 mt-3">{children}</h1>;
        },
        h2({ children }) {
          return <h2 className="text-lg font-bold mb-2 mt-3">{children}</h2>;
        },
        h3({ children }) {
          return <h3 className="text-base font-bold mb-1 mt-2">{children}</h3>;
        },
        blockquote({ children }) {
          return (
            <blockquote className="border-l-4 border-muted-foreground/30 pl-4 italic my-2">
              {children}
            </blockquote>
          );
        },
        a({ href, children }) {
          return (
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary underline hover:no-underline"
            >
              {children}
            </a>
          );
        },
        table({ children }) {
          return (
            <div className="overflow-x-auto my-2">
              <table className="min-w-full border-collapse border border-muted">
                {children}
              </table>
            </div>
          );
        },
        th({ children }) {
          return (
            <th className="border border-muted bg-muted px-3 py-1 text-left font-semibold">
              {children}
            </th>
          );
        },
        td({ children }) {
          return <td className="border border-muted px-3 py-1">{children}</td>;
        },
        hr() {
          return <hr className="my-4 border-muted" />;
        },
        strong({ children }) {
          return <strong className="font-bold">{children}</strong>;
        },
        em({ children }) {
          return <em className="italic">{children}</em>;
        },
      }}
    >
      {content}
    </ReactMarkdown>
  );
});

// Tool call display component
function ToolCallDisplay({ toolName, args, result, isLoading }: {
  toolName: string;
  args: Record<string, unknown>;
  result?: unknown;
  isLoading?: boolean;
}) {
  const [expanded, setExpanded] = useState(true);
  const [copied, setCopied] = useState(false);

  const toolIcons: Record<string, typeof Play> = {
    executeAction: Play,
    runTest: TestTube,
    discoverElements: Search,
    extractData: Code,
    runAgent: Sparkles,
  };

  const toolLabels: Record<string, string> = {
    executeAction: 'Executing Action',
    runTest: 'Running Test',
    discoverElements: 'Discovering Elements',
    extractData: 'Extracting Data',
    runAgent: 'Running Agent',
  };

  const Icon = toolIcons[toolName] || Play;
  const label = toolLabels[toolName] || toolName;
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
    <div className="my-3 rounded-lg border bg-muted/30 overflow-hidden">
      <button
        onClick={() => setExpanded(!expanded)}
        className="w-full px-4 py-3 flex items-center gap-3 hover:bg-muted/50 transition-colors"
      >
        {getStatusIcon()}
        <span className="font-medium text-sm">{label}</span>
        {urlValue && (
          <span className="text-xs text-muted-foreground truncate max-w-[100px] sm:max-w-[200px]">
            {urlValue}
          </span>
        )}
        <div className="ml-auto">
          {expanded ? (
            <ChevronDown className="h-4 w-4 text-muted-foreground" />
          ) : (
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
          )}
        </div>
      </button>

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 space-y-3">
              <div>
                <div className="text-xs font-medium text-muted-foreground mb-1">Parameters</div>
                <pre className="text-xs bg-background rounded p-2 overflow-x-auto">
                  {argsJson}
                </pre>
              </div>

              {result !== undefined && result !== null && (
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <div className="text-xs font-medium text-muted-foreground">Result</div>
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
                  <ResultDisplay result={result} />
                </div>
              )}

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
}

// Screenshot gallery component
function ScreenshotGallery({ screenshots, label }: { screenshots: string[]; label?: string }) {
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  if (!screenshots || screenshots.length === 0) return null;

  return (
    <div className="mt-3">
      <div className="text-xs font-medium text-muted-foreground mb-2">
        {label || `Screenshots (${screenshots.length})`}
      </div>
      <div className="flex gap-2 overflow-x-auto pb-2">
        {screenshots.map((screenshot, index) => (
          <button
            key={index}
            onClick={() => setSelectedIndex(index)}
            className="relative flex-shrink-0 w-24 h-16 rounded border hover:border-primary transition-colors overflow-hidden"
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={screenshot.startsWith('data:') ? screenshot : `data:image/png;base64,${screenshot}`}
              alt={`Step ${index + 1}`}
              className="w-full h-full object-cover"
            />
            <div className="absolute bottom-0 left-0 right-0 bg-black/50 text-white text-[10px] px-1">
              Step {index + 1}
            </div>
          </button>
        ))}
      </div>

      {/* Lightbox modal */}
      <AnimatePresence>
        {selectedIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 bg-black/80 flex items-center justify-center p-4"
            onClick={() => setSelectedIndex(null)}
          >
            <motion.div
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              exit={{ scale: 0.9 }}
              className="relative max-w-4xl max-h-[80vh] overflow-hidden rounded-lg"
              onClick={(e) => e.stopPropagation()}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={screenshots[selectedIndex].startsWith('data:')
                  ? screenshots[selectedIndex]
                  : `data:image/png;base64,${screenshots[selectedIndex]}`}
                alt={`Step ${selectedIndex + 1}`}
                className="max-w-full max-h-[80vh] object-contain"
              />
              <div className="absolute top-2 right-2 flex gap-2">
                {selectedIndex > 0 && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setSelectedIndex(selectedIndex - 1)}
                  >
                    Previous
                  </Button>
                )}
                {selectedIndex < screenshots.length - 1 && (
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() => setSelectedIndex(selectedIndex + 1)}
                  >
                    Next
                  </Button>
                )}
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => setSelectedIndex(null)}
                >
                  <XCircle className="h-4 w-4" />
                </Button>
              </div>
              <div className="absolute bottom-2 left-2 bg-black/50 text-white text-sm px-2 py-1 rounded">
                Step {selectedIndex + 1} of {screenshots.length}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Error category icons and colors
const ERROR_CATEGORY_CONFIG: Record<string, { icon: typeof XCircle; color: string; bgColor: string }> = {
  network: { icon: XCircle, color: 'text-orange-500', bgColor: 'bg-orange-500/10' },
  browser: { icon: XCircle, color: 'text-yellow-500', bgColor: 'bg-yellow-500/10' },
  timeout: { icon: XCircle, color: 'text-amber-500', bgColor: 'bg-amber-500/10' },
  element: { icon: XCircle, color: 'text-red-500', bgColor: 'bg-red-500/10' },
  assertion: { icon: XCircle, color: 'text-red-500', bgColor: 'bg-red-500/10' },
  unknown: { icon: XCircle, color: 'text-gray-500', bgColor: 'bg-gray-500/10' },
};

// Result display component
function ResultDisplay({ result }: { result: unknown }) {
  if (!result || typeof result !== 'object') {
    return (
      <pre className="text-xs bg-background rounded p-2 overflow-x-auto">
        {JSON.stringify(result, null, 2)}
      </pre>
    );
  }

  const data = result as Record<string, unknown>;

  // Show live execution progress if there's an active session
  const sessionId = data.sessionId as string | undefined;

  // Extract screenshots from various possible locations
  const screenshots: string[] = [];
  if (Array.isArray(data.screenshots)) {
    screenshots.push(...(data.screenshots as string[]));
  }
  if (typeof data.screenshot === 'string') {
    screenshots.push(data.screenshot);
  }
  if (typeof data.finalScreenshot === 'string') {
    screenshots.push(data.finalScreenshot);
  }

  // If we have a sessionId and the result isn't finalized yet, show live progress
  if (sessionId && !data.success && !data.error) {
    return (
      <div className="space-y-3">
        <CompactExecutionProgress sessionId={sessionId} />
        {screenshots.length > 0 && (
          <ScreenshotGallery screenshots={screenshots} />
        )}
      </div>
    );
  }

  // Handle categorized errors with user-friendly display
  const errorDetails = data.errorDetails as { category?: string; originalError?: string; isRetryable?: boolean; suggestedAction?: string } | undefined;
  const newHealingSuggestions = data.newHealingSuggestions as Array<{ selector: string; confidence: number; reason: string }> | undefined;

  if (data.error || (data.success === false && errorDetails)) {
    const category = errorDetails?.category || 'unknown';
    const config = ERROR_CATEGORY_CONFIG[category] || ERROR_CATEGORY_CONFIG.unknown;
    const Icon = config.icon;
    const hasHealingSuggestions = newHealingSuggestions && newHealingSuggestions.length > 0;

    return (
      <div className="space-y-2">
        <div className={cn("rounded-lg p-3", config.bgColor)}>
          <div className="flex items-start gap-2">
            <Icon className={cn("h-4 w-4 mt-0.5 flex-shrink-0", config.color)} />
            <div className="flex-1 min-w-0">
              <p className={cn("text-sm font-medium", config.color)}>
                {String(data.error || data.message || 'Operation failed')}
              </p>
              {errorDetails?.suggestedAction && (
                <p className="text-xs text-muted-foreground mt-1">
                  {errorDetails.suggestedAction}
                </p>
              )}
              {errorDetails?.isRetryable && !hasHealingSuggestions && (
                <p className="text-xs text-muted-foreground mt-1">
                  This error may be temporary. You can try again.
                </p>
              )}
            </div>
          </div>

          {/* AI Healing Suggestions */}
          {hasHealingSuggestions && (
            <div className="mt-3 p-2 bg-blue-500/10 rounded border border-blue-500/20">
              <div className="flex items-center gap-1.5 text-blue-500 text-xs font-medium mb-2">
                <Wand2 className="h-3 w-3" />
                AI found {newHealingSuggestions.length} potential fix{newHealingSuggestions.length > 1 ? 'es' : ''}
              </div>
              <div className="space-y-1.5">
                {newHealingSuggestions.slice(0, 3).map((suggestion, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs">
                    <span className="text-blue-400 font-mono">{idx + 1}.</span>
                    <div className="flex-1">
                      <code className="text-[10px] bg-blue-500/20 px-1 rounded font-mono">{suggestion.selector}</code>
                      <span className="ml-1 text-[10px] text-muted-foreground">
                        ({Math.round(suggestion.confidence * 100)}% confidence)
                      </span>
                      <p className="text-[10px] text-muted-foreground/70 mt-0.5">{suggestion.reason}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="mt-2 pt-2 border-t border-blue-500/20">
                <p className="text-[10px] text-muted-foreground mb-1.5">
                  Click &quot;Retry with AI Fix&quot; to try the highest-confidence suggestion automatically.
                </p>
              </div>
            </div>
          )}

          {errorDetails?.originalError && errorDetails.originalError !== data.error && (
            <details className="mt-2">
              <summary className="text-xs text-muted-foreground cursor-pointer hover:text-foreground">
                Technical details
              </summary>
              <pre className="text-xs bg-background/50 rounded p-2 mt-1 overflow-x-auto whitespace-pre-wrap">
                {errorDetails.originalError}
              </pre>
            </details>
          )}
        </div>
        {screenshots.length > 0 && <ScreenshotGallery screenshots={screenshots} />}
      </div>
    );
  }

  // Handle actions array (from discoverElements)
  if (Array.isArray(data.actions) && data.actions.length > 0 && !data.steps) {
    return (
      <div className="space-y-2">
        <div className="text-xs text-muted-foreground">
          Found {data.actions.length} interactive elements:
        </div>
        <div className="max-h-60 overflow-y-auto space-y-1">
          {data.actions.slice(0, 20).map((action: { description?: string; selector?: string; method?: string }, index: number) => (
            <div
              key={index}
              className="text-xs bg-background rounded p-2 flex items-start gap-2"
            >
              <span className="text-muted-foreground font-mono">{index + 1}.</span>
              <div>
                <div className="font-medium">{action.description || 'Unknown element'}</div>
                {action.selector && (
                  <code className="text-[10px] text-muted-foreground">{action.selector}</code>
                )}
              </div>
            </div>
          ))}
          {data.actions.length > 20 && (
            <div className="text-xs text-muted-foreground text-center py-2">
              +{data.actions.length - 20} more elements
            </div>
          )}
        </div>
        {screenshots.length > 0 && <ScreenshotGallery screenshots={screenshots} />}
      </div>
    );
  }

  // Handle test steps (from runTest)
  if (Array.isArray(data.steps)) {
    // Find failed step with healing suggestions
    const failedStep = data.steps.find((s: any) => !s.success && s.healingSuggestions?.length > 0);

    return (
      <div className="space-y-2">
        <div className="text-xs text-muted-foreground">
          Test {data.success ? 'passed' : 'failed'}:
        </div>
        <div className="space-y-1">
          {data.steps.map((step: {
            instruction?: string;
            success?: boolean;
            screenshot?: string;
            error?: string;
            failedAction?: { selector: string; description: string; action: string; value?: string };
            healingSuggestions?: Array<{ selector: string; confidence: number; reason: string }>;
          }, index: number) => (
            <div key={index}>
              <div
                className={cn(
                  "text-xs rounded p-2 flex items-center gap-2",
                  step.success ? "bg-green-500/10" : "bg-red-500/10"
                )}
              >
                {step.success ? (
                  <CheckCircle className="h-3 w-3 text-green-500" />
                ) : (
                  <XCircle className="h-3 w-3 text-red-500" />
                )}
                <span className="flex-1">{step.instruction}</span>
              </div>
              {/* Show AI healing suggestions for failed steps */}
              {!step.success && step.healingSuggestions && step.healingSuggestions.length > 0 && (
                <div className="mt-1 ml-5 p-2 bg-blue-500/5 border border-blue-500/20 rounded text-xs">
                  <div className="flex items-center gap-1 text-blue-500 font-medium mb-1">
                    <Sparkles className="h-3 w-3" />
                    AI found {step.healingSuggestions.length} potential fix{step.healingSuggestions.length > 1 ? 'es' : ''}:
                  </div>
                  <div className="space-y-1">
                    {step.healingSuggestions.slice(0, 3).map((suggestion, idx) => (
                      <div key={idx} className="flex items-start gap-2 text-muted-foreground">
                        <span className="text-blue-400">{idx + 1}.</span>
                        <div className="flex-1">
                          <code className="text-[10px] bg-blue-500/10 px-1 rounded">{suggestion.selector}</code>
                          <span className="ml-1 text-[10px]">({Math.round(suggestion.confidence * 100)}%)</span>
                          <p className="text-[10px] text-muted-foreground/70">{suggestion.reason}</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {/* Show error message */}
              {!step.success && step.error && !step.healingSuggestions?.length && (
                <div className="mt-1 ml-5 text-[10px] text-red-400">
                  {step.error}
                </div>
              )}
            </div>
          ))}
        </div>
        {screenshots.length > 0 && (
          <ScreenshotGallery screenshots={screenshots} label="Test Screenshots" />
        )}
      </div>
    );
  }

  // Handle single screenshot with message (from executeAction)
  if (data.message && screenshots.length > 0) {
    return (
      <div className="space-y-2">
        <div className="text-xs">
          {data.success ? (
            <span className="text-green-500">{String(data.message)}</span>
          ) : (
            <span className="text-red-500">{String(data.message)}</span>
          )}
        </div>
        <ScreenshotGallery screenshots={screenshots} label="Action Screenshot" />
      </div>
    );
  }

  // Default JSON display with screenshots if available
  return (
    <div>
      <pre className="text-xs bg-background rounded p-2 overflow-x-auto max-h-40">
        {JSON.stringify(result, null, 2)}
      </pre>
      {screenshots.length > 0 && <ScreenshotGallery screenshots={screenshots} />}
    </div>
  );
}

// Message content renderer
function MessageContent({ message, isStreaming }: { message: Message; isStreaming?: boolean }) {
  // Handle tool invocations (new AI SDK format)
  if (message.toolInvocations && message.toolInvocations.length > 0) {
    return (
      <div>
        {message.content && (
          <div className="max-w-none mb-3">
            <StreamingText text={message.content} isStreaming={isStreaming && !message.toolInvocations.some(t => t.state === 'result')} />
          </div>
        )}
        {message.toolInvocations.map((tool, index) => (
          <ToolCallDisplay
            key={index}
            toolName={tool.toolName}
            args={tool.args as Record<string, unknown>}
            result={tool.state === 'result' ? tool.result : undefined}
            isLoading={tool.state === 'call'}
          />
        ))}
      </div>
    );
  }

  // Regular text content - use markdown renderer with streaming effect
  return (
    <div className="max-w-none">
      {isStreaming ? (
        <StreamingText text={message.content} isStreaming={true} />
      ) : (
        <MarkdownRenderer content={message.content} />
      )}
    </div>
  );
}

export function ChatInterface({ conversationId, initialMessages = [], onMessagesChange }: ChatInterfaceProps) {
  // Track last saved message count to prevent duplicate saves
  const lastSavedCountRef = useRef(0);
  const [error, setError] = useState<string | null>(null);
  const [showSuggestionCard, setShowSuggestionCard] = useState(false);
  const [suggestionCardData, setSuggestionCardData] = useState<{ title: string; description: string } | null>(null);

  // Store conversationId in ref to avoid stale closure issues
  const conversationIdRef = useRef(conversationId);
  const onMessagesChangeRef = useRef(onMessagesChange);

  // Keep refs updated
  useEffect(() => {
    conversationIdRef.current = conversationId;
  }, [conversationId]);

  useEffect(() => {
    onMessagesChangeRef.current = onMessagesChange;
  }, [onMessagesChange]);

  // Validate conversationId is a proper UUID before using
  const isValidConversationId = conversationId &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(conversationId);

  const { messages, input, handleInputChange, handleSubmit, isLoading, setInput, stop } = useChat({
    api: '/api/chat',
    // Only pass ID if it's a valid UUID, otherwise let AI SDK generate one temporarily
    id: isValidConversationId ? conversationId : undefined,
    initialMessages,
    maxSteps: 5, // Allow multi-step tool calls
    onError: (err) => {
      console.error('Chat error:', err);
      setError(err.message || 'An error occurred while processing your request');
    },
    onFinish: (message) => {
      setError(null); // Clear any previous errors on success
      // Use refs to get latest values, avoiding stale closures
      const currentConversationId = conversationIdRef.current;
      const currentOnMessagesChange = onMessagesChangeRef.current;

      // Extra validation: only proceed if we have a valid UUID conversation
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
      if (!currentConversationId || !uuidRegex.test(currentConversationId)) {
        console.warn('ChatInterface: Cannot persist - invalid conversation ID:', currentConversationId);
        return;
      }

      // Persist messages when AI response completes
      if (currentOnMessagesChange && messages.length > lastSavedCountRef.current) {
        currentOnMessagesChange(messages);
        lastSavedCountRef.current = messages.length;
      }
    },
  });

  // Determine AI status based on loading state and messages
  const aiStatus: AIStatus = useMemo(() => {
    if (!isLoading) return 'ready';
    const lastMessage = messages[messages.length - 1];
    if (lastMessage?.role === 'assistant' && lastMessage.content) {
      return 'typing';
    }
    return 'thinking';
  }, [isLoading, messages]);

  // Get contextual suggestions based on conversation state
  const contextualSuggestions = useMemo(() => {
    if (messages.length === 0) return CONTEXTUAL_SUGGESTIONS.empty;
    const lastAssistantMessage = [...messages].reverse().find(m => m.role === 'assistant');
    if (lastAssistantMessage?.toolInvocations?.some(t =>
      t.state === 'result' && typeof t.result === 'object' && t.result && 'error' in t.result
    )) {
      return CONTEXTUAL_SUGGESTIONS.afterError;
    }
    if (lastAssistantMessage?.toolInvocations?.some(t => t.state === 'result')) {
      return CONTEXTUAL_SUGGESTIONS.afterTest;
    }
    return CONTEXTUAL_SUGGESTIONS.empty;
  }, [messages]);

  // Persist user message immediately when they submit (before AI responds)
  const handleSubmitWithPersist = useCallback((e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const userInput = input.trim();
    if (!userInput) return;

    // Get current values from refs to avoid stale closures
    const currentConversationId = conversationIdRef.current;
    const currentOnMessagesChange = onMessagesChangeRef.current;

    // Submit to AI SDK
    handleSubmit(e);

    // Immediately persist the user message
    if (currentOnMessagesChange && currentConversationId) {
      // Create a user message object to persist immediately
      const userMessage: Message = {
        id: crypto.randomUUID(),
        role: 'user',
        content: userInput,
        createdAt: new Date(),
      };

      // Call with just the user message - the parent will handle deduplication
      // We pass a fake messages array with just this message
      // The parent's handleMessagesChange will check against storedMessages
      setTimeout(() => {
        currentOnMessagesChange([...messages, userMessage]);
      }, 100);
    }
  }, [handleSubmit, input, messages]);

  // Persist assistant messages when AI response completes (onFinish already handles this)
  // REMOVED: useEffect that was causing infinite re-renders

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Smooth scroll to bottom with animation
  const scrollToBottom = useCallback(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTo({
        top: scrollRef.current.scrollHeight,
        behavior: 'smooth',
      });
    }
  }, []);

  useEffect(() => {
    scrollToBottom();
  }, [messages, scrollToBottom]);

  const handleSuggestionClick = (text: string) => {
    setInput(text);
    inputRef.current?.focus();
  };

  const handleQuickSuggestionSelect = (text: string) => {
    setInput(text);
    inputRef.current?.focus();
  };

  const handleAcceptSuggestion = () => {
    if (suggestionCardData) {
      setInput(suggestionCardData.description);
      setShowSuggestionCard(false);
      setSuggestionCardData(null);
      inputRef.current?.focus();
    }
  };

  const handleDismissSuggestion = () => {
    setShowSuggestionCard(false);
    setSuggestionCardData(null);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-8rem)] sm:h-[calc(100vh-10rem)] lg:h-[calc(100vh-12rem)]">
      {/* Chat Messages */}
      <div
        ref={scrollRef}
        className="flex-1 overflow-y-auto space-y-3 sm:space-y-4 p-2 sm:p-4 scroll-smooth"
      >
        {messages.length === 0 ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center justify-center h-full space-y-4 sm:space-y-8 px-2"
          >
            <div className="text-center space-y-2">
              <div className="flex justify-center">
                <AIAvatar status="ready" size="lg" />
              </div>
              <h2 className="text-xl sm:text-2xl font-bold">Hey Argus</h2>
              <p className="text-sm sm:text-base text-muted-foreground max-w-md">
                Your AI testing companion. Describe what you want to test in plain English.
              </p>
            </div>

            {/* Suggestions - 2x2 grid on mobile, 2 columns on desktop */}
            <motion.div
              variants={messageContainerVariants}
              initial="hidden"
              animate="visible"
              className="grid grid-cols-2 gap-2 sm:gap-3 max-w-2xl w-full"
            >
              {SUGGESTIONS.map((suggestion, index) => (
                <motion.button
                  key={index}
                  variants={messageItemVariants}
                  whileHover={{ scale: 1.02, y: -2 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleSuggestionClick(suggestion.fullText)}
                  className="flex flex-col sm:flex-row items-center sm:items-start gap-2 sm:gap-3 p-3 sm:p-4 rounded-lg border bg-card hover:bg-accent transition-colors text-center sm:text-left group"
                >
                  <div className={cn(
                    "p-2 rounded-md bg-muted group-hover:bg-primary/10 transition-colors flex-shrink-0",
                    suggestion.color
                  )}>
                    <suggestion.icon className="w-4 h-4 sm:w-5 sm:h-5" />
                  </div>
                  <span className="text-xs sm:text-sm leading-tight">{suggestion.text}</span>
                </motion.button>
              ))}
            </motion.div>
          </motion.div>
        ) : (
          <motion.div
            variants={messageContainerVariants}
            initial="hidden"
            animate="visible"
          >
            <AnimatePresence mode="popLayout">
              {messages.map((message, index) => {
                const isLastMessage = index === messages.length - 1;
                const isStreamingThisMessage = isLoading && isLastMessage && message.role === 'assistant';

                return (
                  <motion.div
                    key={message.id}
                    variants={messageItemVariants}
                    initial="hidden"
                    animate="visible"
                    exit="exit"
                    layout
                    className={cn(
                      'flex gap-3 mb-3 sm:mb-4',
                      message.role === 'user' ? 'justify-end' : 'justify-start'
                    )}
                  >
                    {message.role === 'assistant' && (
                      <AIAvatar
                        status={isStreamingThisMessage ? 'typing' : 'ready'}
                        size="sm"
                      />
                    )}
                    <MessageBubble isUser={message.role === 'user'}>
                      {message.role === 'user' ? (
                        <div className="max-w-none text-primary-foreground [&_p]:text-primary-foreground [&_a]:text-primary-foreground [&_code]:bg-primary-foreground/20">
                          <MarkdownRenderer content={message.content} />
                        </div>
                      ) : (
                        <MessageContent message={message} isStreaming={isStreamingThisMessage} />
                      )}
                    </MessageBubble>
                    {message.role === 'user' && (
                      <div className="flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 rounded-full bg-secondary flex items-center justify-center">
                        <User className="w-4 h-4 sm:w-5 sm:h-5" />
                      </div>
                    )}
                  </motion.div>
                );
              })}
            </AnimatePresence>
          </motion.div>
        )}

        {/* Typing indicator when AI is thinking (no content yet) */}
        {isLoading && messages.length > 0 && messages[messages.length - 1]?.role === 'user' && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className="flex gap-2 sm:gap-3"
          >
            <AIAvatar status="thinking" size="sm" />
            <MessageBubble isUser={false}>
              <TypingIndicator />
            </MessageBubble>
          </motion.div>
        )}

        {/* Inline AI Suggestion Card */}
        <AnimatePresence>
          {showSuggestionCard && suggestionCardData && (
            <motion.div className="flex gap-3 justify-start">
              <AIAvatar status="ready" size="sm" />
              <AISuggestionCard
                title={suggestionCardData.title}
                description={suggestionCardData.description}
                onAccept={handleAcceptSuggestion}
                onDismiss={handleDismissSuggestion}
              />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="mx-4 mb-2 p-3 rounded-lg bg-destructive/10 border border-destructive/30 text-destructive text-sm flex items-center justify-between"
        >
          <span>{error}</span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setError(null)}
            className="h-6 px-2 text-destructive hover:text-destructive"
          >
            <XCircle className="h-4 w-4" />
          </Button>
        </motion.div>
      )}

      {/* Quick Suggestions Chips - show when there are messages and not loading */}
      {messages.length > 0 && !isLoading && (
        <div className="px-4 pb-2">
          <QuickSuggestions
            suggestions={contextualSuggestions}
            onSelect={handleQuickSuggestionSelect}
          />
        </div>
      )}

      {/* Input Area */}
      <div className="border-t bg-background/80 backdrop-blur-sm p-2 sm:p-4 safe-area-inset-bottom">
        <form onSubmit={handleSubmitWithPersist} className="flex gap-2 max-w-4xl mx-auto">
          <div className="flex-1 relative">
            <input
              ref={inputRef}
              value={input}
              onChange={handleInputChange}
              placeholder="Describe what to test..."
              disabled={isLoading}
              className="w-full h-10 sm:h-11 px-3 sm:px-4 text-sm sm:text-base rounded-lg border bg-background focus:outline-none focus:ring-2 focus:ring-ring"
            />
          </div>
          {isLoading ? (
            <Button type="button" variant="outline" size="sm" className="h-10 sm:h-11 px-3" onClick={stop}>
              Stop
            </Button>
          ) : (
            <Button type="submit" disabled={!input.trim()} size="sm" className="h-10 sm:h-11 px-3">
              <Send className="w-4 h-4" />
            </Button>
          )}
        </form>
        <p className="hidden sm:block text-xs text-muted-foreground text-center mt-2">
          Try: "Discover elements on https://demo.vercel.store" or "Run a login test"
        </p>
      </div>
    </div>
  );
}
