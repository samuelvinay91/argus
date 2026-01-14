'use client';

import { useChat, Message } from 'ai/react';
import { useRef, useEffect, useState, useCallback, memo, useMemo, Suspense, lazy } from 'react';
import dynamic from 'next/dynamic';
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
import { CompactExecutionProgress } from './live-execution-progress';
import {
  SessionScreenshotsPanel,
  ScreenshotsPanelToggle,
  extractScreenshotsFromMessages,
} from './session-screenshots-panel';
import { SaveTestDialog } from '@/components/tests/save-test-dialog';

// Lazy load heavy syntax highlighter - only loads when code blocks are rendered
// This significantly reduces initial bundle size (SyntaxHighlighter is ~150kB)
const SyntaxHighlighter = dynamic(
  () => import('react-syntax-highlighter').then(mod => mod.Prism),
  {
    ssr: false,
    loading: () => <div className="animate-pulse bg-muted rounded h-20" />
  }
);

// Lazy load the theme
const getOneDarkStyle = () => import('react-syntax-highlighter/dist/esm/styles/prism/one-dark').then(mod => mod.default);

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
// STREAMING TEXT WITH TYPEWRITER EFFECT (ChatGPT/Claude-like)
// ============================================================================
interface StreamingTextProps {
  text: string;
  isStreaming?: boolean;
  className?: string;
}

const StreamingText = memo(function StreamingText({ text, isStreaming, className }: StreamingTextProps) {
  // Track displayed text for smooth typewriter effect
  const [displayedText, setDisplayedText] = useState('');
  const [isAnimating, setIsAnimating] = useState(false);
  const targetTextRef = useRef(text);
  const animationFrameRef = useRef<number | null>(null);

  // Characters to reveal per animation frame (adjust for speed)
  // Higher = faster, Lower = more typewriter-like
  const CHARS_PER_FRAME = 3;

  useEffect(() => {
    targetTextRef.current = text;

    // If new text is longer than displayed, animate the difference
    if (text.length > displayedText.length) {
      setIsAnimating(true);

      const animate = () => {
        setDisplayedText(prev => {
          const target = targetTextRef.current;
          if (prev.length >= target.length) {
            setIsAnimating(false);
            return target;
          }

          // Reveal characters progressively
          const nextLength = Math.min(prev.length + CHARS_PER_FRAME, target.length);
          return target.slice(0, nextLength);
        });

        // Continue animation if needed
        if (displayedText.length < targetTextRef.current.length) {
          animationFrameRef.current = requestAnimationFrame(animate);
        }
      };

      animationFrameRef.current = requestAnimationFrame(animate);
    } else if (text.length < displayedText.length) {
      // Text was shortened (e.g., edit), update immediately
      setDisplayedText(text);
    }

    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [text, displayedText.length]);

  // Show cursor when streaming or animating
  const showCursor = isStreaming || isAnimating;

  return (
    <span className={cn('inline', className)}>
      {displayedText}
      {showCursor && (
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
        'max-w-[90%] sm:max-w-[85%] min-w-0 overflow-hidden',
        'bg-primary text-primary-foreground',
        className
      )}>
        <CardContent className="p-2 sm:p-3 min-w-0 overflow-hidden break-words">
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
        'max-w-[90%] sm:max-w-[85%] min-w-0 relative overflow-hidden rounded-lg',
        className
      )}
    >
      {/* Glass effect background */}
      <div className="absolute inset-0 bg-gradient-to-br from-card/80 via-card/90 to-card/80 backdrop-blur-sm border border-white/10 rounded-lg" />

      {/* Subtle gradient overlay */}
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-purple-500/5 rounded-lg" />

      {/* Content */}
      <div className="relative p-2 sm:p-3 min-w-0 overflow-hidden break-words">
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

// Lazy-loaded code block component that loads syntax highlighter on demand
const LazyCodeBlock = memo(function LazyCodeBlock({
  language,
  code,
}: {
  language: string;
  code: string;
}) {
  const [style, setStyle] = useState<Record<string, React.CSSProperties> | null>(null);

  useEffect(() => {
    // Lazy load the theme when code block is first rendered
    getOneDarkStyle().then(setStyle);
  }, []);

  if (!style) {
    // Show loading placeholder while theme loads
    return (
      <div className="rounded-lg bg-[#282c34] p-4 my-2 max-w-full overflow-hidden">
        <pre className="text-sm text-gray-300 font-mono overflow-x-auto max-w-full">{code}</pre>
      </div>
    );
  }

  return (
    <div className="max-w-full overflow-x-auto">
      <SyntaxHighlighter
        style={style}
        language={language}
        PreTag="div"
        className="rounded-lg text-sm !my-2"
        customStyle={{ margin: 0, padding: '1rem', maxWidth: '100%' }}
      >
        {code}
      </SyntaxHighlighter>
    </div>
  );
});

// Memoized Markdown renderer component for chat messages
const MarkdownRenderer = memo(function MarkdownRenderer({ content }: { content: string }) {
  return (
    <div className="min-w-0 max-w-full overflow-hidden break-words prose-sm">
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
                <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono break-all" {...props}>
                  {children}
                </code>
              );
            }

            // Use lazy-loaded code block for syntax highlighting
            return (
              <div className="max-w-full overflow-hidden">
                <LazyCodeBlock language={match ? match[1] : 'text'} code={codeContent} />
              </div>
            );
          },
          pre({ children }) {
            return <div className="max-w-full overflow-x-auto">{children}</div>;
          },
          p({ children }) {
            return <p className="mb-2 last:mb-0 break-words">{children}</p>;
          },
          ul({ children }) {
            return <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>;
          },
          ol({ children }) {
            return <ol className="list-decimal list-inside mb-2 space-y-1">{children}</ol>;
          },
          li({ children }) {
            return <li className="ml-2 break-words">{children}</li>;
          },
          h1({ children }) {
            return <h1 className="text-xl font-bold mb-2 mt-3 break-words">{children}</h1>;
          },
          h2({ children }) {
            return <h2 className="text-lg font-bold mb-2 mt-3 break-words">{children}</h2>;
          },
          h3({ children }) {
            return <h3 className="text-base font-bold mb-1 mt-2 break-words">{children}</h3>;
          },
          blockquote({ children }) {
            return (
              <blockquote className="border-l-4 border-muted-foreground/30 pl-4 italic my-2 break-words">
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
                className="text-primary underline hover:no-underline break-all"
              >
                {children}
              </a>
            );
          },
          table({ children }) {
            return (
              <div className="overflow-x-auto my-2 max-w-full">
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
    </div>
  );
});

// Tool call display component
function ToolCallDisplay({ toolName, args, result, isLoading, onAction }: {
  toolName: string;
  args: Record<string, unknown>;
  result?: unknown;
  isLoading?: boolean;
  onAction?: (action: string, data: unknown) => void;
}) {
  const [expanded, setExpanded] = useState(true);
  const [copied, setCopied] = useState(false);

  const toolIcons: Record<string, typeof Play> = {
    executeAction: Play,
    runTest: TestTube,
    createTest: Sparkles,
    discoverElements: Search,
    extractData: Code,
    runAgent: Sparkles,
  };

  const toolLabels: Record<string, string> = {
    executeAction: 'Executing Action',
    runTest: 'Running Test',
    createTest: 'Creating Test',
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
    <div className="my-3 rounded-lg border bg-muted/30 overflow-hidden min-w-0 max-w-full">
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

      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            className="overflow-hidden"
          >
            <div className="px-4 pb-3 space-y-3 min-w-0 max-w-full">
              <div className="min-w-0 max-w-full overflow-hidden">
                <div className="text-xs font-medium text-muted-foreground mb-1">Parameters</div>
                <pre className="text-xs bg-background rounded p-2 overflow-x-auto max-w-full whitespace-pre-wrap break-all">
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
                  <ResultDisplay result={result} onAction={onAction} />
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

// Test Preview Card - shows generated test for user approval before running
interface TestPreviewCardProps {
  data: {
    test: {
      name: string;
      description: string;
      steps: Array<{ action: string; target?: string; value?: string; description?: string }>;
      assertions: Array<{ type: string; expected: string; description?: string }>;
    };
    summary: {
      name: string;
      steps_count: number;
      assertions_count: number;
      estimated_duration: number;
    };
    steps_preview: Array<{ number: number; action: string; description: string }>;
    app_url: string;
  };
  onRunTest?: () => void;
  onEditTest?: () => void;
  onSaveTest?: () => void;
}

function TestPreviewCard({ data, onRunTest, onEditTest, onSaveTest }: TestPreviewCardProps) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-lg border-2 border-primary/30 bg-gradient-to-br from-primary/5 to-purple-500/5 overflow-hidden">
      {/* Header */}
      <div className="px-4 py-3 border-b border-primary/20 bg-primary/5">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-primary/20">
            <TestTube className="h-4 w-4 text-primary" />
          </div>
          <div className="flex-1">
            <h4 className="font-semibold text-sm">{data.summary.name}</h4>
            <p className="text-xs text-muted-foreground">
              {data.summary.steps_count} steps • {data.summary.assertions_count} assertions • ~{data.summary.estimated_duration}s
            </p>
          </div>
        </div>
      </div>

      {/* Steps Preview */}
      <div className="px-4 py-3 space-y-2">
        <div className="text-xs font-medium text-muted-foreground flex items-center justify-between">
          <span>Test Steps Preview</span>
          <button
            onClick={() => setExpanded(!expanded)}
            className="text-primary hover:underline text-[10px]"
          >
            {expanded ? 'Show less' : `Show all ${data.summary.steps_count} steps`}
          </button>
        </div>

        <div className="space-y-1.5">
          {(expanded ? data.test.steps : data.steps_preview.slice(0, 5)).map((step, index) => {
            const stepData = 'number' in step ? step : { number: index + 1, action: step.action, description: step.description || `${step.action} ${step.target || ''}` };
            return (
              <div
                key={index}
                className="flex items-start gap-2 text-xs bg-background/50 rounded p-2"
              >
                <span className="flex-shrink-0 w-5 h-5 rounded-full bg-primary/20 text-primary text-[10px] flex items-center justify-center font-medium">
                  {stepData.number}
                </span>
                <div className="flex-1 min-w-0">
                  <span className="text-muted-foreground">{stepData.description}</span>
                </div>
              </div>
            );
          })}

          {!expanded && data.summary.steps_count > 5 && (
            <div className="text-xs text-muted-foreground text-center py-1">
              +{data.summary.steps_count - 5} more steps...
            </div>
          )}
        </div>

        {/* Assertions */}
        {data.test.assertions.length > 0 && (
          <div className="mt-3 pt-3 border-t border-border/50">
            <div className="text-xs font-medium text-muted-foreground mb-1.5">Verifications</div>
            <div className="space-y-1">
              {data.test.assertions.slice(0, 3).map((assertion, index) => (
                <div key={index} className="flex items-center gap-2 text-xs text-muted-foreground">
                  <CheckCircle className="h-3 w-3 text-green-500/70" />
                  <span>{assertion.description || assertion.expected}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="px-4 py-3 border-t border-primary/20 bg-primary/5 flex items-center gap-2">
        <Button
          onClick={onRunTest}
          size="sm"
          className="bg-primary hover:bg-primary/90 text-primary-foreground gap-1.5"
        >
          <Play className="h-3.5 w-3.5" />
          Run Test
        </Button>
        <Button
          onClick={onEditTest}
          variant="outline"
          size="sm"
          className="gap-1.5"
        >
          <Code className="h-3.5 w-3.5" />
          Edit Steps
        </Button>
        <Button
          onClick={onSaveTest}
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground"
        >
          <ArrowRight className="h-3.5 w-3.5" />
          Save to Library
        </Button>
      </div>
    </div>
  );
}

// Result display component
function ResultDisplay({ result, onAction }: { result: unknown; onAction?: (action: string, data: unknown) => void }) {
  if (!result || typeof result !== 'object') {
    return (
      <pre className="text-xs bg-background rounded p-2 overflow-x-auto max-w-full whitespace-pre-wrap break-all">
        {JSON.stringify(result, null, 2)}
      </pre>
    );
  }

  const data = result as Record<string, unknown>;

  // Handle test preview - show interactive card with run/edit/save buttons
  if (data._type === 'test_preview') {
    return (
      <TestPreviewCard
        data={data as TestPreviewCardProps['data']}
        onRunTest={() => onAction?.('run_test', data)}
        onEditTest={() => onAction?.('edit_test', data)}
        onSaveTest={() => onAction?.('save_test', data)}
      />
    );
  }

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
              <pre className="text-xs bg-background/50 rounded p-2 mt-1 overflow-x-auto whitespace-pre-wrap break-all max-w-full">
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
    <div className="min-w-0 max-w-full overflow-hidden">
      <pre className="text-xs bg-background rounded p-2 overflow-x-auto max-h-40 max-w-full whitespace-pre-wrap break-all">
        {JSON.stringify(result, null, 2)}
      </pre>
      {screenshots.length > 0 && <ScreenshotGallery screenshots={screenshots} />}
    </div>
  );
}

// Message content renderer
function MessageContent({ message, isStreaming, onAction }: { message: Message; isStreaming?: boolean; onAction?: (action: string, data: unknown) => void }) {
  // Handle tool invocations (new AI SDK format)
  if (message.toolInvocations && message.toolInvocations.length > 0) {
    const isStillStreaming = isStreaming && !message.toolInvocations.some(t => t.state === 'result');
    return (
      <div className="min-w-0 max-w-full overflow-hidden">
        {message.content && (
          <div className="min-w-0 max-w-full overflow-hidden mb-3">
            <MarkdownRenderer content={message.content} />
            {isStillStreaming && (
              <motion.span
                className="inline-block w-0.5 h-4 bg-primary ml-0.5 align-middle"
                animate={{ opacity: [1, 0] }}
                transition={{ duration: 0.5, repeat: Infinity, repeatType: 'reverse' }}
              />
            )}
          </div>
        )}
        {message.toolInvocations.map((tool, index) => (
          <ToolCallDisplay
            key={index}
            toolName={tool.toolName}
            args={tool.args as Record<string, unknown>}
            result={tool.state === 'result' ? tool.result : undefined}
            isLoading={tool.state === 'call'}
            onAction={onAction}
          />
        ))}
      </div>
    );
  }

  // Regular text content - always render markdown, add cursor while streaming
  // This prevents the jarring flash from raw markdown to rendered markdown
  return (
    <div className="min-w-0 max-w-full overflow-hidden">
      <MarkdownRenderer content={message.content} />
      {isStreaming && (
        <motion.span
          className="inline-block w-0.5 h-4 bg-primary ml-0.5 align-middle"
          animate={{ opacity: [1, 0] }}
          transition={{ duration: 0.5, repeat: Infinity, repeatType: 'reverse' }}
        />
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
  const [isScreenshotsPanelOpen, setIsScreenshotsPanelOpen] = useState(false);

  // Save test dialog state
  const [saveTestDialogOpen, setSaveTestDialogOpen] = useState(false);
  const [saveTestData, setSaveTestData] = useState<{
    test?: { name: string; description?: string; steps: Array<{ action: string; target?: string; value?: string; description?: string }>; assertions?: Array<{ type: string; expected: string; description?: string }> };
    app_url?: string;
    summary?: { name: string; steps_count: number; assertions_count: number };
  } | null>(null);

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

  const { messages, input, handleInputChange, handleSubmit, isLoading, setInput, stop, append } = useChat({
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

      // Persist the completed AI message directly using the fresh `message` parameter
      // (not the stale `messages` array from closure which may be outdated)
      if (currentOnMessagesChange && message) {
        // Create an array with just this completed message for persistence
        currentOnMessagesChange([message]);
        lastSavedCountRef.current += 1;
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

  // Count screenshots in current session for the toggle button
  const screenshotCount = useMemo(() => {
    return extractScreenshotsFromMessages(messages).length;
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

  // Handle actions from test preview cards (run, edit, save)
  const handleTestPreviewAction = useCallback((action: string, data: unknown) => {
    const testData = data as {
      test?: { name: string; description?: string; steps: Array<{ action: string; target?: string; value?: string; description?: string }>; assertions?: Array<{ type: string; expected: string; description?: string }> };
      app_url?: string;
      summary?: { name: string; steps_count: number; assertions_count: number };
    };

    if (action === 'run_test' && testData?.test && testData?.app_url) {
      // Send a message to trigger runTest with the test steps
      const steps = testData.test.steps.map(s =>
        `${s.action}${s.target ? ` on ${s.target}` : ''}${s.value ? ` with "${s.value}"` : ''}`
      );
      append({
        role: 'user',
        content: `Run the test "${testData.test.name}" on ${testData.app_url} with these steps:\n${steps.map((s, i) => `${i + 1}. ${s}`).join('\n')}`
      });
    } else if (action === 'edit_test') {
      // Pre-fill input with edit request
      setInput(`Edit the test "${testData?.test?.name || 'test'}": `);
      inputRef.current?.focus();
    } else if (action === 'save_test') {
      // Open save test dialog
      setSaveTestData(testData);
      setSaveTestDialogOpen(true);
    }
  }, [append, setInput]);

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
    <div className="flex h-[calc(100vh-8rem)] sm:h-[calc(100vh-10rem)] lg:h-[calc(100vh-12rem)] min-w-0 w-full overflow-hidden">
      {/* Main Chat Area */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* Screenshots Toggle Button - Fixed position */}
        {messages.length > 0 && (
          <div className="absolute top-2 right-2 z-30 lg:top-4 lg:right-4">
            <ScreenshotsPanelToggle
              screenshotCount={screenshotCount}
              isOpen={isScreenshotsPanelOpen}
              onClick={() => setIsScreenshotsPanelOpen(!isScreenshotsPanelOpen)}
            />
          </div>
        )}

        {/* Chat Messages */}
        <div
          ref={scrollRef}
          className="flex-1 overflow-y-auto overflow-x-hidden min-w-0 space-y-3 sm:space-y-4 p-2 sm:p-4 scroll-smooth"
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
                      'flex gap-3 mb-3 sm:mb-4 min-w-0 max-w-full',
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
                        <div className="min-w-0 max-w-full overflow-hidden text-primary-foreground [&_p]:text-primary-foreground [&_a]:text-primary-foreground [&_code]:bg-primary-foreground/20">
                          <MarkdownRenderer content={message.content} />
                        </div>
                      ) : (
                        <MessageContent message={message} isStreaming={isStreamingThisMessage} onAction={handleTestPreviewAction} />
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

      {/* Screenshots Panel - Right Sidebar */}
      <SessionScreenshotsPanel
        messages={messages}
        isOpen={isScreenshotsPanelOpen}
        onClose={() => setIsScreenshotsPanelOpen(false)}
      />

      {/* Save Test Dialog */}
      <SaveTestDialog
        open={saveTestDialogOpen}
        onOpenChange={setSaveTestDialogOpen}
        testData={saveTestData}
        onSaved={(testId) => {
          console.log('Test saved with ID:', testId);
          setSaveTestData(null);
        }}
      />
    </div>
  );
}
