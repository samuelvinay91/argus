/**
 * LaTeXRenderer - Render mathematical formulas using KaTeX
 *
 * Supports:
 * - Inline math: $formula$
 * - Display math: $$formula$$
 * - LaTeX expressions
 *
 * Lazy-loads KaTeX for performance.
 */

'use client';

import { memo, useEffect, useState, useMemo } from 'react';
import { cn } from '@/lib/utils';

// =============================================================================
// TYPES
// =============================================================================

export interface LaTeXRendererProps {
  content: string;
  displayMode?: boolean;
  className?: string;
  errorColor?: string;
}

export interface LaTeXInlineProps {
  children: string;
  className?: string;
}

// =============================================================================
// KATEX LOADER
// =============================================================================

let katexLoaded = false;
let katexPromise: Promise<typeof import('katex')> | null = null;

async function loadKaTeX() {
  if (katexLoaded) {
    return import('katex');
  }

  if (!katexPromise) {
    katexPromise = Promise.all([
      import('katex'),
      // Load CSS
      new Promise<void>((resolve) => {
        if (typeof document !== 'undefined') {
          const link = document.createElement('link');
          link.rel = 'stylesheet';
          link.href = 'https://cdn.jsdelivr.net/npm/katex@0.16.9/dist/katex.min.css';
          link.onload = () => resolve();
          link.onerror = () => resolve(); // Still resolve if CSS fails
          document.head.appendChild(link);
        } else {
          resolve();
        }
      }),
    ]).then(([katex]) => {
      katexLoaded = true;
      return katex;
    });
  }

  return katexPromise;
}

// =============================================================================
// LATEX RENDERER
// =============================================================================

export const LaTeXRenderer = memo(function LaTeXRenderer({
  content,
  displayMode = false,
  className,
  errorColor = '#cc0000',
}: LaTeXRendererProps) {
  const [html, setHtml] = useState<string>('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const renderLaTeX = async () => {
      try {
        const katex = await loadKaTeX();
        if (!mounted) return;

        const rendered = katex.default.renderToString(content, {
          displayMode,
          throwOnError: false,
          errorColor,
          trust: true,
          strict: false,
        });

        setHtml(rendered);
        setError(null);
      } catch (err) {
        if (!mounted) return;
        setError(err instanceof Error ? err.message : 'Failed to render LaTeX');
      } finally {
        if (mounted) {
          setLoading(false);
        }
      }
    };

    renderLaTeX();

    return () => {
      mounted = false;
    };
  }, [content, displayMode, errorColor]);

  if (loading) {
    return (
      <span className={cn('animate-pulse bg-muted rounded px-2', className)}>
        Loading...
      </span>
    );
  }

  if (error) {
    return (
      <span className={cn('text-destructive text-xs', className)} title={error}>
        {content}
      </span>
    );
  }

  return (
    <span
      className={cn(
        displayMode ? 'block text-center my-4' : 'inline',
        className
      )}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
});

// =============================================================================
// INLINE LATEX (for markdown integration)
// =============================================================================

export const LaTeXInline = memo(function LaTeXInline({
  children,
  className,
}: LaTeXInlineProps) {
  return (
    <LaTeXRenderer
      content={children}
      displayMode={false}
      className={className}
    />
  );
});

// =============================================================================
// DISPLAY LATEX (for markdown integration)
// =============================================================================

export const LaTeXDisplay = memo(function LaTeXDisplay({
  children,
  className,
}: LaTeXInlineProps) {
  return (
    <LaTeXRenderer
      content={children}
      displayMode={true}
      className={className}
    />
  );
});

// =============================================================================
// TEXT WITH LATEX
// =============================================================================

export interface TextWithLaTeXProps {
  content: string;
  className?: string;
}

/**
 * Render text with embedded LaTeX expressions.
 * - $...$ for inline math
 * - $$...$$ for display math
 */
export const TextWithLaTeX = memo(function TextWithLaTeX({
  content,
  className,
}: TextWithLaTeXProps) {
  const parts = useMemo(() => {
    // Split content into text and LaTeX parts
    const result: Array<{ type: 'text' | 'inline' | 'display'; content: string }> = [];

    // Match display math first ($$...$$), then inline ($...$)
    const regex = /\$\$([\s\S]*?)\$\$|\$((?:[^$\\]|\\.)*?)\$/g;
    let lastIndex = 0;
    let match;

    while ((match = regex.exec(content)) !== null) {
      // Add text before match
      if (match.index > lastIndex) {
        result.push({
          type: 'text',
          content: content.slice(lastIndex, match.index),
        });
      }

      // Add LaTeX
      if (match[1] !== undefined) {
        // Display math
        result.push({
          type: 'display',
          content: match[1],
        });
      } else if (match[2] !== undefined) {
        // Inline math
        result.push({
          type: 'inline',
          content: match[2],
        });
      }

      lastIndex = regex.lastIndex;
    }

    // Add remaining text
    if (lastIndex < content.length) {
      result.push({
        type: 'text',
        content: content.slice(lastIndex),
      });
    }

    return result;
  }, [content]);

  // Check if content has any LaTeX
  const hasLaTeX = parts.some(p => p.type !== 'text');

  if (!hasLaTeX) {
    return <span className={className}>{content}</span>;
  }

  return (
    <span className={className}>
      {parts.map((part, index) => {
        switch (part.type) {
          case 'inline':
            return <LaTeXInline key={index}>{part.content}</LaTeXInline>;
          case 'display':
            return <LaTeXDisplay key={index}>{part.content}</LaTeXDisplay>;
          default:
            return <span key={index}>{part.content}</span>;
        }
      })}
    </span>
  );
});

// =============================================================================
// HELPER: Check if content contains LaTeX
// =============================================================================

export function hasLaTeX(content: string): boolean {
  return /\$\$([\s\S]*?)\$\$|\$((?:[^$\\]|\\.)*?)\$/.test(content);
}

export default LaTeXRenderer;
