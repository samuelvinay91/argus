'use client';

import { memo, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  X,
  Copy,
  Check,
  Download,
  Code,
  FileText,
  FileJson,
  Eye,
  ExternalLink,
  Maximize2,
  Minimize2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import dynamic from 'next/dynamic';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

// Lazy load syntax highlighter for performance
const SyntaxHighlighter = dynamic(
  () => import('react-syntax-highlighter').then((mod) => mod.Prism),
  {
    ssr: false,
    loading: () => <div className="animate-pulse bg-muted rounded h-40" />,
  }
);

// Lazy load the theme
const getOneDarkStyle = () =>
  import('react-syntax-highlighter/dist/esm/styles/prism/one-dark').then(
    (mod) => mod.default
  );

// ============================================================================
// TYPES
// ============================================================================

export type ArtifactType = 'code' | 'html' | 'markdown' | 'json' | 'text';

export interface Artifact {
  id: string;
  type: ArtifactType;
  title: string;
  content: string;
  language?: string; // For code type: 'typescript', 'python', 'javascript', etc.
  createdAt?: Date;
  editable?: boolean;
}

interface ArtifactsPanelProps {
  artifact: Artifact | null;
  isOpen: boolean;
  onClose: () => void;
  onEdit?: (content: string) => void;
  onRegenerate?: () => void;
  className?: string;
}

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

function getArtifactIcon(type: ArtifactType) {
  switch (type) {
    case 'code':
      return Code;
    case 'html':
      return Eye;
    case 'markdown':
      return FileText;
    case 'json':
      return FileJson;
    default:
      return FileText;
  }
}

function getFileExtension(type: ArtifactType, language?: string): string {
  switch (type) {
    case 'code':
      if (language === 'typescript' || language === 'tsx') return '.ts';
      if (language === 'javascript' || language === 'jsx') return '.js';
      if (language === 'python') return '.py';
      if (language === 'rust') return '.rs';
      if (language === 'go') return '.go';
      return `.${language || 'txt'}`;
    case 'html':
      return '.html';
    case 'markdown':
      return '.md';
    case 'json':
      return '.json';
    default:
      return '.txt';
  }
}

function formatLanguageLabel(language?: string): string {
  if (!language) return 'Plain Text';
  const labels: Record<string, string> = {
    typescript: 'TypeScript',
    tsx: 'TypeScript (React)',
    javascript: 'JavaScript',
    jsx: 'JavaScript (React)',
    python: 'Python',
    rust: 'Rust',
    go: 'Go',
    json: 'JSON',
    html: 'HTML',
    css: 'CSS',
    sql: 'SQL',
    bash: 'Bash',
    shell: 'Shell',
    yaml: 'YAML',
    markdown: 'Markdown',
  };
  return labels[language.toLowerCase()] || language;
}

// ============================================================================
// CODE VIEWER COMPONENT
// ============================================================================

interface CodeViewerProps {
  content: string;
  language: string;
  onCopy: () => void;
  copied: boolean;
}

const CodeViewer = memo(function CodeViewer({
  content,
  language,
  onCopy,
  copied,
}: CodeViewerProps) {
  const [style, setStyle] = useState<Record<string, React.CSSProperties> | null>(
    null
  );

  useEffect(() => {
    getOneDarkStyle().then(setStyle);
  }, []);

  if (!style) {
    return (
      <div className="relative">
        <pre className="rounded-lg bg-[#282c34] p-4 text-sm text-gray-300 font-mono overflow-x-auto">
          {content}
        </pre>
      </div>
    );
  }

  return (
    <div className="relative group">
      {/* Copy button overlay */}
      <Button
        variant="ghost"
        size="sm"
        onClick={onCopy}
        className="absolute top-2 right-2 h-8 px-2 bg-muted/80 hover:bg-muted z-10 opacity-0 group-hover:opacity-100 transition-opacity"
      >
        {copied ? (
          <>
            <Check className="h-4 w-4 text-green-500 mr-1" />
            Copied
          </>
        ) : (
          <>
            <Copy className="h-4 w-4 mr-1" />
            Copy
          </>
        )}
      </Button>

      <SyntaxHighlighter
        style={style}
        language={language}
        PreTag="div"
        className="rounded-lg text-sm !my-0"
        customStyle={{
          margin: 0,
          padding: '1rem',
          background: '#282c34',
          maxHeight: 'calc(100vh - 16rem)',
          overflow: 'auto',
        }}
        showLineNumbers
        wrapLines
      >
        {content}
      </SyntaxHighlighter>
    </div>
  );
});

// ============================================================================
// HTML PREVIEW COMPONENT
// ============================================================================

interface HTMLPreviewProps {
  content: string;
}

const HTMLPreview = memo(function HTMLPreview({ content }: HTMLPreviewProps) {
  const [showSource, setShowSource] = useState(false);

  return (
    <div className="space-y-2">
      {/* Toggle */}
      <div className="flex items-center gap-2">
        <Button
          variant={showSource ? 'outline' : 'default'}
          size="sm"
          onClick={() => setShowSource(false)}
          className="h-7 text-xs"
        >
          <Eye className="h-3.5 w-3.5 mr-1" />
          Preview
        </Button>
        <Button
          variant={showSource ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowSource(true)}
          className="h-7 text-xs"
        >
          <Code className="h-3.5 w-3.5 mr-1" />
          Source
        </Button>
      </div>

      {/* Content */}
      {showSource ? (
        <CodeViewer
          content={content}
          language="html"
          onCopy={() => {}}
          copied={false}
        />
      ) : (
        <div
          className="rounded-lg border bg-white p-4 overflow-auto"
          style={{ maxHeight: 'calc(100vh - 16rem)' }}
        >
          <iframe
            srcDoc={content}
            title="HTML Preview"
            className="w-full min-h-[400px] border-0"
            sandbox="allow-scripts"
          />
        </div>
      )}
    </div>
  );
});

// ============================================================================
// MARKDOWN PREVIEW COMPONENT (using react-markdown for safety)
// ============================================================================

interface MarkdownPreviewProps {
  content: string;
}

const MarkdownPreview = memo(function MarkdownPreview({
  content,
}: MarkdownPreviewProps) {
  const [showSource, setShowSource] = useState(false);

  return (
    <div className="space-y-2">
      {/* Toggle */}
      <div className="flex items-center gap-2">
        <Button
          variant={showSource ? 'outline' : 'default'}
          size="sm"
          onClick={() => setShowSource(false)}
          className="h-7 text-xs"
        >
          <Eye className="h-3.5 w-3.5 mr-1" />
          Preview
        </Button>
        <Button
          variant={showSource ? 'default' : 'outline'}
          size="sm"
          onClick={() => setShowSource(true)}
          className="h-7 text-xs"
        >
          <Code className="h-3.5 w-3.5 mr-1" />
          Source
        </Button>
      </div>

      {/* Content */}
      {showSource ? (
        <CodeViewer
          content={content}
          language="markdown"
          onCopy={() => {}}
          copied={false}
        />
      ) : (
        <div
          className="rounded-lg border bg-card p-4 overflow-auto prose prose-sm dark:prose-invert max-w-none"
          style={{ maxHeight: 'calc(100vh - 16rem)' }}
        >
          <ReactMarkdown
            remarkPlugins={[remarkGfm]}
            components={{
              code({ className, children, ...props }) {
                const match = /language-(\w+)/.exec(className || '');
                const codeContent = String(children).replace(/\n$/, '');
                const isInline = !match && !codeContent.includes('\n');

                if (isInline) {
                  return (
                    <code className="bg-muted px-1.5 py-0.5 rounded text-sm font-mono" {...props}>
                      {children}
                    </code>
                  );
                }

                return (
                  <pre className="bg-muted rounded p-3 overflow-x-auto">
                    <code className="text-sm font-mono">{codeContent}</code>
                  </pre>
                );
              },
              a({ href, children }) {
                return (
                  <a
                    href={href}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    {children}
                  </a>
                );
              },
              p({ children }) {
                return <p className="mb-3 last:mb-0">{children}</p>;
              },
              h1({ children }) {
                return <h1 className="text-2xl font-bold mt-6 mb-3">{children}</h1>;
              },
              h2({ children }) {
                return <h2 className="text-xl font-bold mt-5 mb-3">{children}</h2>;
              },
              h3({ children }) {
                return <h3 className="text-lg font-bold mt-4 mb-2">{children}</h3>;
              },
              ul({ children }) {
                return <ul className="list-disc list-inside mb-3 space-y-1">{children}</ul>;
              },
              ol({ children }) {
                return <ol className="list-decimal list-inside mb-3 space-y-1">{children}</ol>;
              },
              blockquote({ children }) {
                return (
                  <blockquote className="border-l-4 border-muted-foreground/30 pl-4 italic my-3">
                    {children}
                  </blockquote>
                );
              },
              table({ children }) {
                return (
                  <div className="overflow-x-auto my-3">
                    <table className="min-w-full border-collapse border border-muted">
                      {children}
                    </table>
                  </div>
                );
              },
              th({ children }) {
                return (
                  <th className="border border-muted bg-muted px-3 py-2 text-left font-semibold">
                    {children}
                  </th>
                );
              },
              td({ children }) {
                return <td className="border border-muted px-3 py-2">{children}</td>;
              },
            }}
          >
            {content}
          </ReactMarkdown>
        </div>
      )}
    </div>
  );
});

// ============================================================================
// JSON VIEWER COMPONENT
// ============================================================================

interface JSONViewerProps {
  content: string;
  onCopy: () => void;
  copied: boolean;
}

const JSONViewer = memo(function JSONViewer({
  content,
  onCopy,
  copied,
}: JSONViewerProps) {
  // Try to pretty-print JSON
  let formattedContent = content;
  try {
    const parsed = JSON.parse(content);
    formattedContent = JSON.stringify(parsed, null, 2);
  } catch {
    // Keep original content if parsing fails
  }

  return (
    <CodeViewer
      content={formattedContent}
      language="json"
      onCopy={onCopy}
      copied={copied}
    />
  );
});

// ============================================================================
// MAIN ARTIFACTS PANEL COMPONENT
// ============================================================================

export const ArtifactsPanel = memo(function ArtifactsPanel({
  artifact,
  isOpen,
  onClose,
  onEdit,
  onRegenerate,
  className,
}: ArtifactsPanelProps) {
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const handleCopy = useCallback(async () => {
    if (!artifact) return;

    try {
      await navigator.clipboard.writeText(artifact.content);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy:', err);
    }
  }, [artifact]);

  const handleDownload = useCallback(() => {
    if (!artifact) return;

    const extension = getFileExtension(artifact.type, artifact.language);
    const filename = `${artifact.title.toLowerCase().replace(/\s+/g, '-')}${extension}`;
    const blob = new Blob([artifact.content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);

    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }, [artifact]);

  const Icon = artifact ? getArtifactIcon(artifact.type) : FileText;

  const renderContent = () => {
    if (!artifact) return null;

    switch (artifact.type) {
      case 'code':
        return (
          <CodeViewer
            content={artifact.content}
            language={artifact.language || 'text'}
            onCopy={handleCopy}
            copied={copied}
          />
        );
      case 'html':
        return <HTMLPreview content={artifact.content} />;
      case 'markdown':
        return <MarkdownPreview content={artifact.content} />;
      case 'json':
        return (
          <JSONViewer
            content={artifact.content}
            onCopy={handleCopy}
            copied={copied}
          />
        );
      default:
        return (
          <pre className="rounded-lg bg-muted p-4 text-sm font-mono overflow-auto whitespace-pre-wrap">
            {artifact.content}
          </pre>
        );
    }
  };

  return (
    <>
      {/* Mobile overlay */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-40 bg-black/50 lg:hidden"
            onClick={onClose}
          />
        )}
      </AnimatePresence>

      {/* Panel */}
      <AnimatePresence>
        {isOpen && artifact && (
          <motion.div
            initial={{ x: '100%', opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            className={cn(
              'fixed right-0 top-0 bottom-0 z-50',
              isFullscreen ? 'w-full lg:w-full' : 'w-full sm:w-[90%] lg:w-[40%]',
              'bg-background border-l shadow-xl',
              'flex flex-col',
              'lg:relative lg:z-auto lg:shadow-none',
              className
            )}
          >
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b bg-muted/30">
              <div className="flex items-center gap-3 min-w-0">
                <div className="p-2 rounded-lg bg-primary/10">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0">
                  <h3 className="font-semibold text-sm truncate">
                    {artifact.title}
                  </h3>
                  <p className="text-xs text-muted-foreground">
                    {formatLanguageLabel(artifact.language || artifact.type)}
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-1">
                {/* Copy button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleCopy}
                  className="h-8 w-8 p-0"
                  title="Copy to clipboard"
                >
                  {copied ? (
                    <Check className="w-4 h-4 text-green-500" />
                  ) : (
                    <Copy className="w-4 h-4" />
                  )}
                </Button>

                {/* Download button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDownload}
                  className="h-8 w-8 p-0"
                  title="Download file"
                >
                  <Download className="w-4 h-4" />
                </Button>

                {/* Fullscreen toggle (desktop only) */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setIsFullscreen(!isFullscreen)}
                  className="h-8 w-8 p-0 hidden lg:flex"
                  title={isFullscreen ? 'Exit fullscreen' : 'Fullscreen'}
                >
                  {isFullscreen ? (
                    <Minimize2 className="w-4 h-4" />
                  ) : (
                    <Maximize2 className="w-4 h-4" />
                  )}
                </Button>

                {/* Close button */}
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={onClose}
                  className="h-8 w-8 p-0"
                >
                  <X className="w-4 h-4" />
                </Button>
              </div>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-hidden p-4">{renderContent()}</div>

            {/* Footer with actions */}
            {(onEdit || onRegenerate) && (
              <div className="px-4 py-3 border-t bg-muted/30 flex items-center gap-2">
                {onRegenerate && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={onRegenerate}
                    className="h-8 text-xs"
                  >
                    Regenerate
                  </Button>
                )}
                {onEdit && (
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => onEdit(artifact.content)}
                    className="h-8 text-xs"
                  >
                    Edit in Chat
                  </Button>
                )}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
});

// ============================================================================
// ARTIFACT TRIGGER BUTTON COMPONENT
// ============================================================================

interface ArtifactTriggerProps {
  artifact: Artifact;
  onClick: () => void;
  className?: string;
}

export const ArtifactTrigger = memo(function ArtifactTrigger({
  artifact,
  onClick,
  className,
}: ArtifactTriggerProps) {
  const Icon = getArtifactIcon(artifact.type);

  return (
    <motion.button
      whileHover={{ scale: 1.02 }}
      whileTap={{ scale: 0.98 }}
      onClick={onClick}
      className={cn(
        'flex items-center gap-2 px-3 py-2 rounded-lg',
        'bg-primary/5 border border-primary/20',
        'hover:bg-primary/10 hover:border-primary/30',
        'transition-colors',
        className
      )}
    >
      <div className="p-1.5 rounded bg-primary/10">
        <Icon className="w-4 h-4 text-primary" />
      </div>
      <div className="text-left min-w-0">
        <p className="text-sm font-medium truncate">{artifact.title}</p>
        <p className="text-xs text-muted-foreground">
          {formatLanguageLabel(artifact.language || artifact.type)}
        </p>
      </div>
      <ExternalLink className="w-4 h-4 text-muted-foreground ml-auto flex-shrink-0" />
    </motion.button>
  );
});

export default ArtifactsPanel;
