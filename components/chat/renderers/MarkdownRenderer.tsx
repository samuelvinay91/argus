/**
 * MarkdownRenderer - Render markdown content with code highlighting and LaTeX
 *
 * Features:
 * - GitHub Flavored Markdown
 * - Syntax highlighting (lazy-loaded)
 * - LaTeX support
 * - Tables, lists, links
 */

'use client';

import { memo, useEffect, useState } from 'react';
import dynamic from 'next/dynamic';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';
import { TextWithLaTeX, hasLaTeX } from './LaTeXRenderer';

// =============================================================================
// LAZY-LOADED SYNTAX HIGHLIGHTER
// =============================================================================

const SyntaxHighlighter = dynamic(
  () => import('react-syntax-highlighter').then(mod => mod.Prism),
  {
    ssr: false,
    loading: () => <div className="animate-pulse bg-muted rounded h-20" />,
  }
);

const getOneDarkStyle = () =>
  import('react-syntax-highlighter/dist/esm/styles/prism/one-dark').then(
    mod => mod.default
  );

// =============================================================================
// CODE BLOCK
// =============================================================================

interface LazyCodeBlockProps {
  language: string;
  code: string;
}

const LazyCodeBlock = memo(function LazyCodeBlock({
  language,
  code,
}: LazyCodeBlockProps) {
  const [style, setStyle] = useState<Record<string, React.CSSProperties> | null>(
    null
  );

  useEffect(() => {
    getOneDarkStyle().then(setStyle);
  }, []);

  if (!style) {
    return (
      <div className="rounded-lg bg-[#282c34] p-4 my-2 max-w-full overflow-hidden">
        <pre className="text-sm text-gray-300 font-mono overflow-x-auto max-w-full">
          {code}
        </pre>
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

// =============================================================================
// TYPES
// =============================================================================

export interface MarkdownRendererProps {
  content: string;
  className?: string;
  enableLaTeX?: boolean;
}

// =============================================================================
// COMPONENT
// =============================================================================

export const MarkdownRenderer = memo(function MarkdownRenderer({
  content,
  className,
  enableLaTeX = true,
}: MarkdownRendererProps) {
  // Check if content has LaTeX
  const contentHasLaTeX = enableLaTeX && hasLaTeX(content);

  return (
    <div className={cn('min-w-0 max-w-full overflow-hidden break-words prose-sm', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          // Code blocks
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const codeContent = String(children).replace(/\n$/, '');
            const isInline = !match && !codeContent.includes('\n');

            if (isInline) {
              return (
                <code
                  className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono break-all"
                  {...props}
                >
                  {children}
                </code>
              );
            }

            return (
              <div className="max-w-full overflow-hidden">
                <LazyCodeBlock
                  language={match ? match[1] : 'text'}
                  code={codeContent}
                />
              </div>
            );
          },

          // Pre wrapper
          pre({ children }) {
            return <div className="max-w-full overflow-x-auto">{children}</div>;
          },

          // Paragraphs with LaTeX support
          p({ children }) {
            if (contentHasLaTeX && typeof children === 'string') {
              return (
                <p className="mb-2 last:mb-0 break-words">
                  <TextWithLaTeX content={children} />
                </p>
              );
            }
            return <p className="mb-2 last:mb-0 break-words">{children}</p>;
          },

          // Lists
          ul({ children }) {
            return (
              <ul className="list-disc list-inside mb-2 space-y-1">{children}</ul>
            );
          },
          ol({ children }) {
            return (
              <ol className="list-decimal list-inside mb-2 space-y-1">
                {children}
              </ol>
            );
          },
          li({ children }) {
            return <li className="ml-2 break-words">{children}</li>;
          },

          // Headers
          h1({ children }) {
            return (
              <h1 className="text-xl font-bold mb-2 mt-3 break-words">
                {children}
              </h1>
            );
          },
          h2({ children }) {
            return (
              <h2 className="text-lg font-bold mb-2 mt-3 break-words">
                {children}
              </h2>
            );
          },
          h3({ children }) {
            return (
              <h3 className="text-base font-bold mb-1 mt-2 break-words">
                {children}
              </h3>
            );
          },

          // Blockquote
          blockquote({ children }) {
            return (
              <blockquote className="border-l-4 border-muted-foreground/30 pl-4 italic my-2 break-words">
                {children}
              </blockquote>
            );
          },

          // Links
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

          // Tables
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

          // Other elements
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

export default MarkdownRenderer;
