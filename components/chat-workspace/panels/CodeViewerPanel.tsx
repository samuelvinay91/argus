'use client';

/**
 * CodeViewerPanel - Syntax-highlighted code display
 *
 * Features:
 * - Language detection
 * - Line numbers
 * - Copy button
 * - Highlighted lines (for errors/changes)
 * - File path header
 * - Collapsible sections
 */

import * as React from 'react';
import { memo, useState, useEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Code2,
  Copy,
  Check,
  ChevronDown,
  FileCode2,
  ExternalLink,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { GlassCard } from '../glass';

// =============================================================================
// LAZY-LOADED SYNTAX HIGHLIGHTER
// =============================================================================

const SyntaxHighlighter = dynamic(
  () => import('react-syntax-highlighter').then((mod) => mod.Prism),
  {
    ssr: false,
    loading: () => (
      <div className="animate-pulse bg-[#282c34] rounded-lg p-4 h-48" />
    ),
  }
);

const getOneDarkStyle = () =>
  import('react-syntax-highlighter/dist/esm/styles/prism/one-dark').then(
    (mod) => mod.default
  );

// =============================================================================
// TYPES
// =============================================================================

export interface CodeViewerPanelProps {
  code: string;
  language?: string;
  filePath?: string;
  highlightLines?: number[];
  title?: string;
  collapsible?: boolean;
  defaultCollapsed?: boolean;
  maxHeight?: number;
  onOpenInEditor?: () => void;
  className?: string;
}

// =============================================================================
// LANGUAGE DETECTION
// =============================================================================

const LANGUAGE_MAP: Record<string, string> = {
  js: 'javascript',
  jsx: 'jsx',
  ts: 'typescript',
  tsx: 'tsx',
  py: 'python',
  rb: 'ruby',
  go: 'go',
  rs: 'rust',
  java: 'java',
  kt: 'kotlin',
  swift: 'swift',
  php: 'php',
  cs: 'csharp',
  cpp: 'cpp',
  c: 'c',
  h: 'c',
  hpp: 'cpp',
  html: 'html',
  css: 'css',
  scss: 'scss',
  sass: 'sass',
  less: 'less',
  json: 'json',
  yaml: 'yaml',
  yml: 'yaml',
  md: 'markdown',
  mdx: 'markdown',
  sql: 'sql',
  sh: 'bash',
  bash: 'bash',
  zsh: 'bash',
  dockerfile: 'dockerfile',
  xml: 'xml',
  graphql: 'graphql',
  gql: 'graphql',
};

function detectLanguage(filePath?: string, code?: string): string {
  // Try to detect from file extension
  if (filePath) {
    const ext = filePath.split('.').pop()?.toLowerCase();
    if (ext && LANGUAGE_MAP[ext]) {
      return LANGUAGE_MAP[ext];
    }
    // Special cases
    if (filePath.toLowerCase().includes('dockerfile')) return 'dockerfile';
    if (filePath.toLowerCase().endsWith('makefile')) return 'makefile';
  }

  // Try to detect from code content
  if (code) {
    if (code.startsWith('#!/bin/bash') || code.startsWith('#!/bin/sh')) return 'bash';
    if (code.startsWith('<?php')) return 'php';
    if (code.startsWith('<!DOCTYPE html') || code.startsWith('<html')) return 'html';
    if (code.includes('import React') || code.includes('from "react"')) return 'tsx';
    if (code.includes('def ') && code.includes(':')) return 'python';
    if (code.includes('func ') && code.includes('{')) return 'go';
  }

  return 'text';
}

// =============================================================================
// HELPER COMPONENTS
// =============================================================================

const CopyButton = memo(function CopyButton({ code }: { code: string }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [code]);

  return (
    <button
      onClick={handleCopy}
      className={cn(
        'p-1.5 rounded transition-all',
        copied
          ? 'bg-emerald-500/20 text-emerald-400'
          : 'hover:bg-white/10 text-white/60'
      )}
      title={copied ? 'Copied!' : 'Copy code'}
    >
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  );
});

// =============================================================================
// LOADING SKELETON
// =============================================================================

const CodeViewerSkeleton = memo(function CodeViewerSkeleton() {
  return (
    <div className="space-y-2 animate-pulse">
      <div className="flex items-center justify-between">
        <div className="h-4 w-32 bg-white/10 rounded" />
        <div className="h-6 w-16 bg-white/10 rounded" />
      </div>
      <div className="bg-[#282c34] rounded-lg p-4 space-y-2">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <div
            key={i}
            className="h-4 bg-white/5 rounded"
            style={{ width: `${Math.random() * 40 + 40}%` }}
          />
        ))}
      </div>
    </div>
  );
});

// =============================================================================
// MAIN COMPONENT
// =============================================================================

export const CodeViewerPanel = memo(function CodeViewerPanel({
  code,
  language,
  filePath,
  highlightLines = [],
  title,
  collapsible = false,
  defaultCollapsed = false,
  maxHeight = 400,
  onOpenInEditor,
  className,
}: CodeViewerPanelProps) {
  const [style, setStyle] = useState<Record<string, React.CSSProperties> | null>(null);
  const [isCollapsed, setIsCollapsed] = useState(defaultCollapsed);

  const detectedLanguage = language || detectLanguage(filePath, code);
  const lineCount = code.split('\n').length;

  useEffect(() => {
    getOneDarkStyle().then(setStyle);
  }, []);

  // Custom line props for highlighting
  const lineProps = useCallback(
    (lineNumber: number): React.HTMLProps<HTMLElement> => {
      const isHighlighted = highlightLines.includes(lineNumber);
      return {
        style: {
          display: 'block',
          backgroundColor: isHighlighted ? 'rgba(239, 68, 68, 0.15)' : undefined,
          borderLeft: isHighlighted ? '3px solid #ef4444' : '3px solid transparent',
          paddingLeft: '0.5rem',
          marginLeft: '-0.5rem',
        },
      };
    },
    [highlightLines]
  );

  return (
    <GlassCard variant="medium" padding="none" className={cn('overflow-hidden', className)}>
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
        <div className="flex items-center gap-2 min-w-0">
          {collapsible && (
            <button
              onClick={() => setIsCollapsed(!isCollapsed)}
              className="p-1 hover:bg-white/10 rounded transition-colors"
            >
              <ChevronDown
                size={14}
                className={cn(
                  'text-white/60 transition-transform',
                  isCollapsed && '-rotate-90'
                )}
              />
            </button>
          )}
          <Code2 size={16} className="text-indigo-400 flex-shrink-0" />
          {filePath ? (
            <div className="flex items-center gap-2 min-w-0">
              <FileCode2 size={14} className="text-white/40 flex-shrink-0" />
              <span className="text-sm text-white/80 truncate">{filePath}</span>
            </div>
          ) : (
            <h3 className="text-sm font-medium text-white">
              {title || 'Code'}
            </h3>
          )}
          <span className="px-2 py-0.5 text-xs bg-white/10 text-white/60 rounded">
            {detectedLanguage}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <span className="text-xs text-white/40 mr-2">{lineCount} lines</span>
          <CopyButton code={code} />
          {onOpenInEditor && (
            <button
              onClick={onOpenInEditor}
              className="p-1.5 hover:bg-white/10 rounded transition-colors"
              title="Open in editor"
            >
              <ExternalLink size={14} className="text-white/60" />
            </button>
          )}
        </div>
      </div>

      {/* Code Content */}
      <AnimatePresence>
        {!isCollapsed && (
          <motion.div
            initial={collapsible ? { height: 0, opacity: 0 } : undefined}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            <div
              className="overflow-auto"
              style={{ maxHeight }}
            >
              {style ? (
                <SyntaxHighlighter
                  style={style}
                  language={detectedLanguage}
                  showLineNumbers
                  wrapLines
                  lineProps={lineProps}
                  customStyle={{
                    margin: 0,
                    padding: '1rem',
                    background: 'transparent',
                    fontSize: '0.875rem',
                  }}
                  codeTagProps={{
                    style: {
                      fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, monospace',
                    },
                  }}
                  lineNumberStyle={{
                    minWidth: '2.5em',
                    paddingRight: '1em',
                    color: 'rgba(255,255,255,0.3)',
                    userSelect: 'none',
                  }}
                >
                  {code}
                </SyntaxHighlighter>
              ) : (
                <pre className="p-4 text-sm text-white/80 font-mono whitespace-pre-wrap">
                  {code}
                </pre>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Collapsed indicator */}
      {isCollapsed && (
        <div className="px-4 py-2 text-xs text-white/40">
          {lineCount} lines collapsed
        </div>
      )}
    </GlassCard>
  );
});

export { CodeViewerSkeleton };
export default CodeViewerPanel;
