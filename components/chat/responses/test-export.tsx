'use client';

import { memo, useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Code,
  Copy,
  Check,
  Download,
  ChevronDown,
  FileCode,
  Package,
  Terminal,
  Languages,
  RefreshCw,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism';

// Language display configuration
const languageConfig: Record<string, { name: string; icon: string; color: string }> = {
  python: { name: 'Python', icon: 'py', color: 'text-yellow-500' },
  typescript: { name: 'TypeScript', icon: 'ts', color: 'text-blue-500' },
  java: { name: 'Java', icon: 'java', color: 'text-orange-500' },
  csharp: { name: 'C#', icon: 'cs', color: 'text-purple-500' },
  ruby: { name: 'Ruby', icon: 'rb', color: 'text-red-500' },
  go: { name: 'Go', icon: 'go', color: 'text-cyan-500' },
};

// Framework descriptions
const frameworkDescriptions: Record<string, string> = {
  playwright: 'Modern browser automation',
  selenium: 'Cross-browser testing',
  pytest: 'Python testing framework',
  'playwright-ts': 'Playwright for TypeScript',
  puppeteer: 'Headless Chrome automation',
  cypress: 'End-to-end testing',
  'selenium-java': 'Selenium WebDriver for Java',
  testng: 'TestNG framework',
  junit: 'JUnit testing framework',
  'selenium-csharp': 'Selenium for C#',
  'playwright-csharp': 'Playwright for C#',
  nunit: 'NUnit testing framework',
  capybara: 'Ruby acceptance testing',
  'selenium-ruby': 'Selenium for Ruby',
  rod: 'Go browser automation',
  chromedp: 'Chrome DevTools Protocol for Go',
};

interface TestExportCardProps {
  data: {
    success: boolean;
    test_id: string;
    test_name?: string;
    language: string;
    framework: string;
    code?: string;
    filename?: string;
    line_count?: number;
    dependencies?: string[];
    setup_instructions?: string;
    available_frameworks?: string[];
    error?: string;
    _actions?: string[];
  };
  onAction?: (action: string, data: unknown) => void;
}

interface ExportFormatsCardProps {
  data: {
    success: boolean;
    languages: Array<{
      id: string;
      name: string;
      frameworks: string[];
      default_framework: string | null;
    }>;
    total_languages: number;
    total_frameworks: number;
    error?: string;
    _actions?: string[];
  };
  onAction?: (action: string, data: unknown) => void;
}

// Syntax highlighting language mapping
function getSyntaxLanguage(language: string): string {
  const mapping: Record<string, string> = {
    python: 'python',
    typescript: 'typescript',
    java: 'java',
    csharp: 'csharp',
    ruby: 'ruby',
    go: 'go',
  };
  return mapping[language] || 'javascript';
}

// Language Selector Component
function LanguageSelector({
  currentLanguage,
  currentFramework,
  availableFrameworks,
  onChangeLanguage,
  onChangeFramework,
}: {
  currentLanguage: string;
  currentFramework: string;
  availableFrameworks?: string[];
  onChangeLanguage: (lang: string) => void;
  onChangeFramework: (fw: string) => void;
}) {
  const [showLanguages, setShowLanguages] = useState(false);
  const [showFrameworks, setShowFrameworks] = useState(false);

  const langConfig = languageConfig[currentLanguage] || { name: currentLanguage, icon: '?', color: 'text-gray-500' };

  return (
    <div className="flex items-center gap-2">
      {/* Language Dropdown */}
      <div className="relative">
        <button
          onClick={() => {
            setShowLanguages(!showLanguages);
            setShowFrameworks(false);
          }}
          className={cn(
            'flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium',
            'bg-muted hover:bg-muted/80 transition-colors'
          )}
        >
          <Languages className={cn('h-3.5 w-3.5', langConfig.color)} />
          <span>{langConfig.name}</span>
          <ChevronDown className={cn('h-3 w-3 transition-transform', showLanguages && 'rotate-180')} />
        </button>

        <AnimatePresence>
          {showLanguages && (
            <motion.div
              initial={{ opacity: 0, y: -5 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -5 }}
              className="absolute top-full mt-1 left-0 z-10 bg-popover border rounded-md shadow-lg min-w-[140px]"
            >
              {Object.entries(languageConfig).map(([lang, config]) => (
                <button
                  key={lang}
                  onClick={() => {
                    onChangeLanguage(lang);
                    setShowLanguages(false);
                  }}
                  className={cn(
                    'w-full px-3 py-1.5 text-left text-xs flex items-center gap-2 hover:bg-muted transition-colors',
                    lang === currentLanguage && 'bg-muted/50'
                  )}
                >
                  <span className={cn('font-mono text-[10px]', config.color)}>{config.icon}</span>
                  <span>{config.name}</span>
                </button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Framework Dropdown */}
      {availableFrameworks && availableFrameworks.length > 0 && (
        <div className="relative">
          <button
            onClick={() => {
              setShowFrameworks(!showFrameworks);
              setShowLanguages(false);
            }}
            className={cn(
              'flex items-center gap-1.5 px-2 py-1 rounded text-xs font-medium',
              'bg-muted hover:bg-muted/80 transition-colors'
            )}
          >
            <Package className="h-3.5 w-3.5 text-muted-foreground" />
            <span>{currentFramework}</span>
            <ChevronDown className={cn('h-3 w-3 transition-transform', showFrameworks && 'rotate-180')} />
          </button>

          <AnimatePresence>
            {showFrameworks && (
              <motion.div
                initial={{ opacity: 0, y: -5 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -5 }}
                className="absolute top-full mt-1 left-0 z-10 bg-popover border rounded-md shadow-lg min-w-[180px]"
              >
                {availableFrameworks.map((fw) => (
                  <button
                    key={fw}
                    onClick={() => {
                      onChangeFramework(fw);
                      setShowFrameworks(false);
                    }}
                    className={cn(
                      'w-full px-3 py-1.5 text-left text-xs hover:bg-muted transition-colors',
                      fw === currentFramework && 'bg-muted/50'
                    )}
                  >
                    <div className="font-medium">{fw}</div>
                    {frameworkDescriptions[fw] && (
                      <div className="text-[10px] text-muted-foreground">{frameworkDescriptions[fw]}</div>
                    )}
                  </button>
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  );
}

export const TestExportCard = memo(function TestExportCard({
  data,
  onAction,
}: TestExportCardProps) {
  const [copied, setCopied] = useState(false);
  const [showSetup, setShowSetup] = useState(false);

  const {
    success,
    test_id,
    test_name,
    language,
    framework,
    code,
    filename,
    line_count,
    dependencies = [],
    setup_instructions,
    available_frameworks = [],
    error,
  } = data;

  const langConfig = languageConfig[language] || { name: language, icon: '?', color: 'text-gray-500' };

  const handleCopyCode = () => {
    if (code) {
      navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
      onAction?.('copy_code', { code, filename });
    }
  };

  const handleDownload = () => {
    if (code && filename) {
      const blob = new Blob([code], { type: 'text/plain' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      onAction?.('download_file', { filename });
    }
  };

  const handleChangeLanguage = (newLang: string) => {
    onAction?.('change_language', { test_id, language: newLang, framework });
  };

  const handleChangeFramework = (newFramework: string) => {
    onAction?.('change_framework', { test_id, language, framework: newFramework });
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
            <Code className="h-4 w-4 text-red-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm text-red-500">Export Failed</h4>
            <p className="text-xs text-muted-foreground mt-1">
              {error || 'An error occurred while exporting'}
            </p>
            {test_id && (
              <p className="text-xs text-muted-foreground mt-2">
                Test ID: <code className="bg-muted px-1 rounded">{test_id}</code>
              </p>
            )}
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border-2 border-primary/20 bg-gradient-to-br from-primary/5 to-purple-500/5 overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-primary/20 bg-primary/5 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-primary/20">
            <FileCode className={cn('h-4 w-4', langConfig.color)} />
          </div>
          <div>
            <h4 className="font-semibold text-sm">Test Export</h4>
            <p className="text-[10px] text-muted-foreground">
              {test_name || test_id}
            </p>
          </div>
        </div>

        {/* Language/Framework Selector */}
        <LanguageSelector
          currentLanguage={language}
          currentFramework={framework}
          availableFrameworks={available_frameworks}
          onChangeLanguage={handleChangeLanguage}
          onChangeFramework={handleChangeFramework}
        />
      </div>

      {/* Code Preview */}
      {code && (
        <div className="relative">
          {/* File info bar */}
          <div className="flex items-center justify-between px-4 py-2 bg-[#282c34] border-b border-[#3e4451]">
            <div className="flex items-center gap-2">
              <FileCode className="h-3.5 w-3.5 text-muted-foreground" />
              <span className="text-xs font-mono text-muted-foreground">{filename}</span>
              <span className="text-[10px] text-muted-foreground/60">({line_count} lines)</span>
            </div>
            <div className="flex items-center gap-1">
              <Button
                onClick={handleCopyCode}
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
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
              <Button
                onClick={handleDownload}
                variant="ghost"
                size="sm"
                className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground"
              >
                <Download className="w-3 h-3 mr-1" />
                Download
              </Button>
            </div>
          </div>

          {/* Syntax highlighted code */}
          <div className="max-h-[400px] overflow-auto">
            <SyntaxHighlighter
              language={getSyntaxLanguage(language)}
              style={oneDark}
              customStyle={{
                margin: 0,
                padding: '1rem',
                fontSize: '12px',
                lineHeight: '1.5',
                background: '#282c34',
              }}
              showLineNumbers
              lineNumberStyle={{ minWidth: '2.5em', paddingRight: '1em', color: '#5c6370' }}
            >
              {code}
            </SyntaxHighlighter>
          </div>
        </div>
      )}

      {/* Dependencies */}
      {dependencies.length > 0 && (
        <div className="px-4 py-3 border-t border-primary/20 bg-muted/20">
          <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground mb-2">
            <Package className="w-3.5 h-3.5" />
            <span>Dependencies</span>
          </div>
          <div className="flex flex-wrap gap-1.5">
            {dependencies.map((dep) => (
              <span
                key={dep}
                className="px-2 py-0.5 rounded text-[10px] font-mono bg-muted text-muted-foreground"
              >
                {dep}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Setup Instructions (Collapsible) */}
      {setup_instructions && (
        <div className="border-t border-primary/20">
          <button
            onClick={() => setShowSetup(!showSetup)}
            className="w-full px-4 py-2 flex items-center justify-between hover:bg-muted/50 transition-colors"
          >
            <div className="flex items-center gap-1.5 text-xs font-medium text-muted-foreground">
              <Terminal className="w-3.5 h-3.5" />
              <span>Setup Instructions</span>
            </div>
            <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', showSetup && 'rotate-180')} />
          </button>

          <AnimatePresence>
            {showSetup && (
              <motion.div
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: 'auto', opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                className="overflow-hidden"
              >
                <pre className="px-4 pb-3 text-xs font-mono text-muted-foreground whitespace-pre-wrap">
                  {setup_instructions}
                </pre>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}

      {/* Quick Actions */}
      <div className="px-4 py-3 border-t border-primary/20 bg-primary/5 flex items-center gap-2">
        <Button
          onClick={handleCopyCode}
          size="sm"
          className="gap-1.5"
        >
          {copied ? (
            <>
              <Check className="h-3.5 w-3.5" />
              Copied!
            </>
          ) : (
            <>
              <Copy className="h-3.5 w-3.5" />
              Copy Code
            </>
          )}
        </Button>
        <Button
          onClick={handleDownload}
          variant="outline"
          size="sm"
          className="gap-1.5"
        >
          <Download className="h-3.5 w-3.5" />
          Download
        </Button>
        <Button
          onClick={() => onAction?.('regenerate', { test_id, language, framework })}
          variant="ghost"
          size="sm"
          className="gap-1.5 ml-auto text-muted-foreground"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Regenerate
        </Button>
      </div>
    </motion.div>
  );
});

// Export Formats Card (for listExportFormats tool)
export const ExportFormatsCard = memo(function ExportFormatsCard({
  data,
  onAction,
}: ExportFormatsCardProps) {
  const [expandedLang, setExpandedLang] = useState<string | null>(null);

  const { success, languages, total_languages, total_frameworks, error } = data;

  if (!success || error) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-lg border border-red-500/30 bg-red-500/5 p-4"
      >
        <div className="flex items-start gap-3">
          <div className="p-1.5 rounded-md bg-red-500/10">
            <Languages className="h-4 w-4 text-red-500" />
          </div>
          <div className="flex-1 min-w-0">
            <h4 className="font-semibold text-sm text-red-500">Failed to List Formats</h4>
            <p className="text-xs text-muted-foreground mt-1">
              {error || 'An error occurred'}
            </p>
          </div>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="rounded-lg border bg-card overflow-hidden"
    >
      {/* Header */}
      <div className="px-4 py-3 border-b bg-muted/30 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Languages className="h-4 w-4 text-primary" />
          <h4 className="font-semibold text-sm">Available Export Formats</h4>
        </div>
        <div className="flex items-center gap-3 text-xs text-muted-foreground">
          <span>{total_languages} languages</span>
          <span>{total_frameworks} frameworks</span>
        </div>
      </div>

      {/* Language List */}
      <div className="divide-y">
        {languages.map((lang) => {
          const config = languageConfig[lang.id] || { name: lang.name, icon: '?', color: 'text-gray-500' };
          const isExpanded = expandedLang === lang.id;

          return (
            <div key={lang.id}>
              <button
                onClick={() => setExpandedLang(isExpanded ? null : lang.id)}
                className="w-full px-4 py-2.5 flex items-center justify-between hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-2">
                  <span className={cn('font-mono text-xs', config.color)}>{config.icon}</span>
                  <span className="font-medium text-sm">{config.name}</span>
                  <span className="text-xs text-muted-foreground">
                    ({lang.frameworks.length} frameworks)
                  </span>
                </div>
                <ChevronDown className={cn('h-4 w-4 text-muted-foreground transition-transform', isExpanded && 'rotate-180')} />
              </button>

              <AnimatePresence>
                {isExpanded && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    exit={{ height: 0, opacity: 0 }}
                    className="overflow-hidden"
                  >
                    <div className="px-4 pb-3 pt-1 grid grid-cols-2 gap-2">
                      {lang.frameworks.map((fw) => (
                        <button
                          key={fw}
                          onClick={() => onAction?.('select_format', { language: lang.id, framework: fw })}
                          className={cn(
                            'px-3 py-2 rounded-md text-left transition-colors',
                            'bg-muted/50 hover:bg-muted',
                            fw === lang.default_framework && 'ring-1 ring-primary/50'
                          )}
                        >
                          <div className="text-xs font-medium">{fw}</div>
                          {frameworkDescriptions[fw] && (
                            <div className="text-[10px] text-muted-foreground mt-0.5">
                              {frameworkDescriptions[fw]}
                            </div>
                          )}
                          {fw === lang.default_framework && (
                            <span className="text-[9px] text-primary">default</span>
                          )}
                        </button>
                      ))}
                    </div>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          );
        })}
      </div>
    </motion.div>
  );
});

export default TestExportCard;
