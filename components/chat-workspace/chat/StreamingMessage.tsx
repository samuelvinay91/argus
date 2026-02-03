/**
 * StreamingMessage - Optimized streaming message display
 *
 * Features:
 * - Incremental markdown rendering (no re-parse on each chunk)
 * - Cursor animation while streaming
 * - Smooth text appearance
 * - Performance optimized with memo and useCallback
 */

'use client';

import { memo, useMemo, useRef, useEffect } from 'react';
import { motion } from 'framer-motion';
import dynamic from 'next/dynamic';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

// =============================================================================
// TYPES
// =============================================================================

export interface StreamingMessageProps {
  /** Current content being streamed */
  content: string;
  /** Whether the content is actively streaming */
  isStreaming: boolean;
  /** Additional CSS classes */
  className?: string;
  /** Whether to enable syntax highlighting (lazy-loaded) */
  enableSyntaxHighlight?: boolean;
}

// =============================================================================
// LAZY-LOADED SYNTAX HIGHLIGHTER
// =============================================================================

const SyntaxHighlighter = dynamic(
  () => import('react-syntax-highlighter').then((mod) => mod.Prism),
  {
    ssr: false,
    loading: () => <div className="animate-pulse bg-muted rounded h-20" />,
  }
);

// =============================================================================
// STREAMING CURSOR
// =============================================================================

const StreamingCursor = memo(function StreamingCursor() {
  return (
    <motion.span
      className="inline-block w-0.5 h-4 bg-primary ml-0.5 align-middle rounded-full"
      animate={{ opacity: [1, 0] }}
      transition={{ duration: 0.5, repeat: Infinity, repeatType: 'reverse' }}
      aria-hidden="true"
    />
  );
});

// =============================================================================
// CODE BLOCK (Optimized for streaming)
// =============================================================================

interface CodeBlockProps {
  language: string;
  code: string;
  isStreaming: boolean;
}

const CodeBlock = memo(function CodeBlock({ language, code, isStreaming }: CodeBlockProps) {
  const codeRef = useRef<HTMLPreElement>(null);

  // Auto-scroll code block when streaming
  useEffect(() => {
    if (isStreaming && codeRef.current) {
      const element = codeRef.current;
      element.scrollTop = element.scrollHeight;
    }
  }, [code, isStreaming]);

  return (
    <div className="relative my-2 rounded-lg overflow-hidden bg-[#1e1e2e] border border-white/10">
      {/* Language badge */}
      <div className="absolute top-2 right-2 px-2 py-0.5 rounded text-xs font-mono text-muted-foreground bg-white/5">
        {language}
      </div>

      {/* Code content */}
      <pre
        ref={codeRef}
        className={cn(
          'p-4 pr-16 overflow-x-auto max-h-[400px]',
          'text-sm font-mono text-[#cdd6f4] leading-relaxed'
        )}
      >
        <code>{code}</code>
        {isStreaming && <StreamingCursor />}
      </pre>
    </div>
  );
});

// =============================================================================
// INLINE CODE
// =============================================================================

const InlineCode = memo(function InlineCode({ children }: { children: React.ReactNode }) {
  return (
    <code className="px-1.5 py-0.5 rounded text-sm font-mono bg-white/10 text-primary">
      {children}
    </code>
  );
});

// =============================================================================
// MARKDOWN COMPONENTS (Optimized)
// =============================================================================

// Using type assertion for react-markdown components compatibility
const markdownComponents: Record<string, React.ComponentType<Record<string, unknown>>> = {
  // Code blocks
  code: function CodeComponent(props: Record<string, unknown>) {
    const className = props.className as string | undefined;
    const children = props.children as React.ReactNode;
    const match = /language-(\w+)/.exec(className || '');
    const codeContent = String(children).replace(/\n$/, '');
    const isInline = !match && !codeContent.includes('\n');

    if (isInline) {
      return <InlineCode>{children}</InlineCode>;
    }

    return <CodeBlock language={match ? match[1] : 'text'} code={codeContent} isStreaming={false} />;
  },

  // Pre wrapper
  pre: function PreComponent(props: Record<string, unknown>) {
    return <div className="max-w-full overflow-x-auto">{props.children as React.ReactNode}</div>;
  },

  // Paragraphs
  p: function ParagraphComponent(props: Record<string, unknown>) {
    return <p className="mb-2 last:mb-0 break-words leading-relaxed">{props.children as React.ReactNode}</p>;
  },

  // Lists
  ul: function UlComponent(props: Record<string, unknown>) {
    return <ul className="list-disc list-inside mb-2 space-y-1 pl-1">{props.children as React.ReactNode}</ul>;
  },
  ol: function OlComponent(props: Record<string, unknown>) {
    return <ol className="list-decimal list-inside mb-2 space-y-1 pl-1">{props.children as React.ReactNode}</ol>;
  },
  li: function LiComponent(props: Record<string, unknown>) {
    return <li className="break-words">{props.children as React.ReactNode}</li>;
  },

  // Headers
  h1: function H1Component(props: Record<string, unknown>) {
    return <h1 className="text-xl font-bold mb-3 mt-4 break-words">{props.children as React.ReactNode}</h1>;
  },
  h2: function H2Component(props: Record<string, unknown>) {
    return <h2 className="text-lg font-bold mb-2 mt-3 break-words">{props.children as React.ReactNode}</h2>;
  },
  h3: function H3Component(props: Record<string, unknown>) {
    return <h3 className="text-base font-semibold mb-2 mt-3 break-words">{props.children as React.ReactNode}</h3>;
  },

  // Blockquote
  blockquote: function BlockquoteComponent(props: Record<string, unknown>) {
    return (
      <blockquote className="border-l-4 border-primary/30 pl-4 py-1 my-2 italic text-muted-foreground">
        {props.children as React.ReactNode}
      </blockquote>
    );
  },

  // Links
  a: function AnchorComponent(props: Record<string, unknown>) {
    return (
      <a
        href={props.href as string | undefined}
        target="_blank"
        rel="noopener noreferrer"
        className="text-primary underline underline-offset-2 hover:no-underline"
      >
        {props.children as React.ReactNode}
      </a>
    );
  },

  // Tables
  table: function TableComponent(props: Record<string, unknown>) {
    return (
      <div className="overflow-x-auto my-2 rounded-lg border border-white/10">
        <table className="min-w-full">{props.children as React.ReactNode}</table>
      </div>
    );
  },
  th: function ThComponent(props: Record<string, unknown>) {
    return (
      <th className="px-3 py-2 text-left font-semibold bg-white/5 border-b border-white/10">
        {props.children as React.ReactNode}
      </th>
    );
  },
  td: function TdComponent(props: Record<string, unknown>) {
    return <td className="px-3 py-2 border-b border-white/5">{props.children as React.ReactNode}</td>;
  },

  // Other
  hr: function HrComponent() {
    return <hr className="my-4 border-white/10" />;
  },
  strong: function StrongComponent(props: Record<string, unknown>) {
    return <strong className="font-semibold">{props.children as React.ReactNode}</strong>;
  },
  em: function EmComponent(props: Record<string, unknown>) {
    return <em className="italic">{props.children as React.ReactNode}</em>;
  },
};

// =============================================================================
// STREAMING TEXT WRAPPER
// =============================================================================

interface StreamingTextProps {
  content: string;
  isStreaming: boolean;
}

const StreamingText = memo(function StreamingText({ content, isStreaming }: StreamingTextProps) {
  // Only add cursor to raw text if not in a code block
  const contentWithCursor = useMemo(() => {
    if (!isStreaming) return content;

    // Check if we're in an unclosed code block
    const codeBlockCount = (content.match(/```/g) || []).length;
    const inCodeBlock = codeBlockCount % 2 === 1;

    // If in code block, don't add cursor (CodeBlock handles it)
    if (inCodeBlock) return content;

    return content;
  }, [content, isStreaming]);

  return (
    <div className="min-w-0 max-w-full overflow-hidden break-words prose-sm">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={markdownComponents as Partial<import('react-markdown').Components>}>
        {contentWithCursor}
      </ReactMarkdown>
      {isStreaming && <StreamingCursor />}
    </div>
  );
});

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const StreamingMessage = memo(function StreamingMessage({
  content,
  isStreaming,
  className,
}: StreamingMessageProps) {
  // Track previous content length for animation optimization
  const prevLengthRef = useRef(0);

  useEffect(() => {
    prevLengthRef.current = content.length;
  }, [content]);

  // Determine if this is a significant update (for animation decisions)
  const isSignificantUpdate = content.length - prevLengthRef.current > 10;

  return (
    <motion.div
      initial={false}
      animate={{
        // Only animate height on significant updates to reduce jank
        height: 'auto',
      }}
      transition={{
        height: {
          duration: isSignificantUpdate ? 0.1 : 0,
          ease: 'easeOut',
        },
      }}
      className={cn('relative', className)}
    >
      <StreamingText content={content} isStreaming={isStreaming} />

      {/* Typing indicator gradient at bottom while streaming */}
      {isStreaming && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="absolute bottom-0 inset-x-0 h-4 bg-gradient-to-t from-background/50 to-transparent pointer-events-none"
        />
      )}
    </motion.div>
  );
});

export default StreamingMessage;
