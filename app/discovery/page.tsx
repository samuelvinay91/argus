'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Sidebar } from '@/components/layout/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/data-table';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Compass,
  Loader2,
  FileText,
  FormInput,
  MousePointer,
  ArrowRight,
  CheckCircle,
  Sparkles,
  Link2,
  Clock,
  Settings2,
  ChevronDown,
  ChevronUp,
  Play,
  Pause,
  Edit2,
  Search,
  Target,
  Brain,
  Layers,
  TrendingUp,
  AlertTriangle,
  X,
  BarChart3,
  Eye,
  Zap,
  RefreshCw,
  ExternalLink,
  Network,
  GitBranch,
} from 'lucide-react';
import { useProjects } from '@/lib/hooks/use-projects';
import {
  useLatestDiscoveryData,
} from '@/lib/hooks/use-discovery';
import {
  useStartDiscoverySession,
  useDiscoverySession,
  useDiscoveredPages as useDiscoverySessionPages,
  useDiscoveredFlows as useDiscoverySessionFlows,
  useValidateFlow,
  useGenerateTestFromFlow,
  usePauseDiscovery,
  useResumeDiscovery,
  useCancelDiscovery,
  useDiscoveryHistory,
  useBulkGenerateTests,
  useCrossProjectPatterns,
  useGlobalPatterns,
  type CrossProjectPattern,
  type PatternMatch,
} from '@/lib/hooks/use-discovery-session';
import { useCreateTest } from '@/lib/hooks/use-tests';
import { getSupabaseClient } from '@/lib/supabase/client';
import { useQueryClient } from '@tanstack/react-query';
import { cn } from '@/lib/utils';
import type { DiscoveredFlow, DiscoveredPage, DiscoverySession } from '@/lib/supabase/types';

// Import local components
import { PageGraph, type PageNode } from './components/PageGraph';
import { FlowEditor, type DiscoveredFlow as FlowEditorFlow } from './components/FlowEditor';
import { DiscoveryProgress } from './components/DiscoveryProgress';

// ============================================
// Type Definitions
// ============================================

type DiscoveryMode = 'quick' | 'standard' | 'deep' | 'focused' | 'autonomous';
type CrawlStrategy = 'bfs' | 'dfs' | 'priority' | 'ai-guided';

interface DiscoveryConfig {
  mode: DiscoveryMode;
  strategy: CrawlStrategy;
  maxPages: number;
  maxDepth: number;
  includePatterns: string;
  excludePatterns: string;
  focusAreas: string[];
  captureScreenshots: boolean;
  useVisionAI: boolean;
  authRequired?: boolean;
  authConfig?: {
    loginUrl?: string;
    username?: string;
    password?: string;
  };
}

interface AIInsight {
  id: string;
  type: 'pattern' | 'recommendation' | 'coverage_gap' | 'risk' | 'info';
  title: string;
  description: string;
  confidence: number;
  actionable?: boolean;
}

// ============================================
// Constants
// ============================================

const WORKER_URL = process.env.NEXT_PUBLIC_E2E_WORKER_URL || 'https://e2e-testing-agent.samuelvinay-kumar.workers.dev';

const DISCOVERY_MODES: { value: DiscoveryMode; label: string; description: string }[] = [
  { value: 'quick', label: 'Quick Scan', description: 'Fast surface-level analysis (5-10 pages)' },
  { value: 'standard', label: 'Standard Crawl', description: 'Balanced coverage (20-50 pages)' },
  { value: 'deep', label: 'Deep Exploration', description: 'Comprehensive analysis (100+ pages)' },
  { value: 'focused', label: 'Focused', description: 'Target specific areas only' },
  { value: 'autonomous', label: 'Autonomous', description: 'AI-driven intelligent crawling' },
];

const CRAWL_STRATEGIES: { value: CrawlStrategy; label: string; description: string }[] = [
  { value: 'bfs', label: 'Breadth-First', description: 'Explore all pages at each level first' },
  { value: 'dfs', label: 'Depth-First', description: 'Follow paths deeply before backtracking' },
  { value: 'priority', label: 'Priority-Based', description: 'Focus on high-value pages first' },
  { value: 'ai-guided', label: 'AI-Guided', description: 'Let AI decide the best path' },
];

const FOCUS_AREAS = [
  'Authentication',
  'Forms',
  'Navigation',
  'Search',
  'E-commerce',
  'Dashboard',
  'Settings',
  'User Profile',
  'Admin',
  'API Endpoints',
];

const DEFAULT_CONFIG: DiscoveryConfig = {
  mode: 'standard',
  strategy: 'bfs',
  maxPages: 50,
  maxDepth: 3,
  includePatterns: '',
  excludePatterns: '/api/*, /static/*, *.pdf, *.jpg, *.png',
  focusAreas: [],
  captureScreenshots: true,
  useVisionAI: false,
};

// ============================================
// Helper Components
// ============================================

function StatCard({
  icon: Icon,
  value,
  label,
  trend,
  loading,
  className,
}: {
  icon: React.ComponentType<{ className?: string }>;
  value: number | string;
  label: string;
  trend?: 'up' | 'down' | 'stable';
  loading?: boolean;
  className?: string;
}) {
  return (
    <div
      className={cn(
        'relative p-5 rounded-xl border bg-card hover:bg-accent/5 transition-colors overflow-hidden group',
        className
      )}
    >
      <div className="absolute -right-4 -top-4 opacity-5 group-hover:opacity-10 transition-opacity">
        <Icon className="h-24 w-24" />
      </div>
      <div className="relative">
        <div className="flex items-center gap-2 mb-2">
          <div className="p-2 rounded-lg bg-primary/10">
            <Icon className="h-4 w-4 text-primary" />
          </div>
          {trend && (
            <span
              className={cn(
                'text-xs font-medium flex items-center gap-0.5',
                trend === 'up' && 'text-success',
                trend === 'down' && 'text-error',
                trend === 'stable' && 'text-muted-foreground'
              )}
            >
              {trend === 'up' && <TrendingUp className="h-3 w-3" />}
              {trend === 'down' && <TrendingUp className="h-3 w-3 rotate-180" />}
            </span>
          )}
        </div>
        <div className="text-3xl font-bold tracking-tight">
          {loading ? (
            <div className="h-9 w-16 bg-muted animate-pulse rounded" />
          ) : (
            value
          )}
        </div>
        <div className="text-sm text-muted-foreground mt-1">{label}</div>
      </div>
    </div>
  );
}

function FlowCard({
  flow,
  onEdit,
  onValidate,
  onGenerateTest,
  isGenerating,
}: {
  flow: DiscoveredFlow;
  onEdit: () => void;
  onValidate: () => void;
  onGenerateTest: () => void;
  isGenerating: boolean;
}) {
  const priorityColors: Record<string, string> = {
    critical: 'bg-red-500/10 text-red-500 border-red-500/20',
    high: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
    medium: 'bg-yellow-500/10 text-yellow-500 border-yellow-500/20',
    low: 'bg-green-500/10 text-green-500 border-green-500/20',
  };

  return (
    <div className="group relative p-4 rounded-xl border bg-card hover:bg-accent/5 transition-all hover:shadow-md">
      <div className="flex items-start gap-4">
        <div className="flex-shrink-0 p-2.5 rounded-lg bg-primary/10">
          <ArrowRight className="h-5 w-5 text-primary" />
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium truncate">{flow.name}</h4>
            <Badge
              className={cn('text-xs', priorityColors[flow.priority])}
              variant="outline"
            >
              {flow.priority}
            </Badge>
            {flow.converted_to_test_id && (
              <Badge variant="success" className="text-xs">
                <CheckCircle className="h-3 w-3 mr-1" />
                Test Created
              </Badge>
            )}
          </div>
          <p className="text-sm text-muted-foreground line-clamp-2 mb-2">
            {flow.description || 'No description'}
          </p>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <span className="flex items-center gap-1">
              <Layers className="h-3 w-3" />
              {flow.step_count} steps
            </span>
          </div>
        </div>
      </div>

      {/* Hover Actions */}
      <div className="absolute right-3 top-3 flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={onEdit}
        >
          <Edit2 className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          onClick={onValidate}
        >
          <Play className="h-4 w-4" />
        </Button>
        <Button
          variant={flow.converted_to_test_id ? 'ghost' : 'outline'}
          size="sm"
          onClick={onGenerateTest}
          disabled={!!flow.converted_to_test_id || isGenerating}
        >
          {isGenerating ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-1" />
              Generate
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

function InsightCard({ insight }: { insight: AIInsight }) {
  const typeIcons: Record<string, React.ReactNode> = {
    pattern: <Brain className="h-4 w-4" />,
    recommendation: <Zap className="h-4 w-4" />,
    coverage_gap: <Target className="h-4 w-4" />,
    risk: <AlertTriangle className="h-4 w-4" />,
  };

  const typeColors: Record<string, string> = {
    pattern: 'text-blue-500 bg-blue-500/10',
    recommendation: 'text-green-500 bg-green-500/10',
    coverage_gap: 'text-orange-500 bg-orange-500/10',
    risk: 'text-red-500 bg-red-500/10',
  };

  return (
    <div className="p-4 rounded-lg border bg-card">
      <div className="flex items-start gap-3">
        <div className={cn('p-2 rounded-lg', typeColors[insight.type])}>
          {typeIcons[insight.type]}
        </div>
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <h4 className="font-medium text-sm">{insight.title}</h4>
            <span className="text-xs text-muted-foreground">
              {Math.round(insight.confidence * 100)}% confidence
            </span>
          </div>
          <p className="text-sm text-muted-foreground">{insight.description}</p>
        </div>
      </div>
    </div>
  );
}

function ConfigurationPanel({
  config,
  onChange,
  onClose,
}: {
  config: DiscoveryConfig;
  onChange: (config: DiscoveryConfig) => void;
  onClose: () => void;
}) {
  const [localConfig, setLocalConfig] = useState(config);

  const handleSave = () => {
    onChange(localConfig);
    onClose();
  };

  return (
    <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
      <SheetHeader>
        <SheetTitle>Discovery Configuration</SheetTitle>
        <SheetDescription>
          Configure how the discovery agent explores your application.
        </SheetDescription>
      </SheetHeader>

      <div className="space-y-6 py-6">
        {/* Discovery Mode */}
        <div className="space-y-3">
          <label className="text-sm font-medium">Discovery Mode</label>
          <div className="space-y-2">
            {DISCOVERY_MODES.map((mode) => (
              <label
                key={mode.value}
                className={cn(
                  'flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition-colors',
                  localConfig.mode === mode.value
                    ? 'border-primary bg-primary/5'
                    : 'hover:bg-muted/50'
                )}
              >
                <input
                  type="radio"
                  name="mode"
                  value={mode.value}
                  checked={localConfig.mode === mode.value}
                  onChange={(e) =>
                    setLocalConfig({ ...localConfig, mode: e.target.value as DiscoveryMode })
                  }
                  className="mt-1"
                />
                <div>
                  <div className="font-medium text-sm">{mode.label}</div>
                  <div className="text-xs text-muted-foreground">{mode.description}</div>
                </div>
              </label>
            ))}
          </div>
        </div>

        {/* Crawl Strategy */}
        <div className="space-y-3">
          <label className="text-sm font-medium">Crawl Strategy</label>
          <select
            value={localConfig.strategy}
            onChange={(e) =>
              setLocalConfig({ ...localConfig, strategy: e.target.value as CrawlStrategy })
            }
            className="w-full h-10 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            {CRAWL_STRATEGIES.map((strategy) => (
              <option key={strategy.value} value={strategy.value}>
                {strategy.label} - {strategy.description}
              </option>
            ))}
          </select>
        </div>

        {/* Max Pages */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Max Pages</label>
            <span className="text-sm text-muted-foreground">{localConfig.maxPages}</span>
          </div>
          <input
            type="range"
            min={1}
            max={200}
            value={localConfig.maxPages}
            onChange={(e) =>
              setLocalConfig({ ...localConfig, maxPages: parseInt(e.target.value) })
            }
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>1</span>
            <span>200</span>
          </div>
        </div>

        {/* Max Depth */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-sm font-medium">Max Depth</label>
            <span className="text-sm text-muted-foreground">{localConfig.maxDepth}</span>
          </div>
          <input
            type="range"
            min={1}
            max={5}
            value={localConfig.maxDepth}
            onChange={(e) =>
              setLocalConfig({ ...localConfig, maxDepth: parseInt(e.target.value) })
            }
            className="w-full"
          />
          <div className="flex justify-between text-xs text-muted-foreground">
            <span>1</span>
            <span>5</span>
          </div>
        </div>

        {/* Include Patterns */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Include Patterns</label>
          <Input
            value={localConfig.includePatterns}
            onChange={(e) =>
              setLocalConfig({ ...localConfig, includePatterns: e.target.value })
            }
            placeholder="/dashboard/*, /settings/*, /admin/*"
          />
          <p className="text-xs text-muted-foreground">
            Comma-separated URL patterns to include. Leave empty to include all.
          </p>
        </div>

        {/* Exclude Patterns */}
        <div className="space-y-2">
          <label className="text-sm font-medium">Exclude Patterns</label>
          <Input
            value={localConfig.excludePatterns}
            onChange={(e) =>
              setLocalConfig({ ...localConfig, excludePatterns: e.target.value })
            }
            placeholder="/api/*, /static/*, *.pdf"
          />
          <p className="text-xs text-muted-foreground">
            Comma-separated URL patterns to exclude.
          </p>
        </div>

        {/* Focus Areas */}
        <div className="space-y-3">
          <label className="text-sm font-medium">Focus Areas</label>
          <div className="flex flex-wrap gap-2">
            {FOCUS_AREAS.map((area) => (
              <button
                key={area}
                onClick={() => {
                  const newAreas = localConfig.focusAreas.includes(area)
                    ? localConfig.focusAreas.filter((a) => a !== area)
                    : [...localConfig.focusAreas, area];
                  setLocalConfig({ ...localConfig, focusAreas: newAreas });
                }}
                className={cn(
                  'px-3 py-1.5 rounded-full text-xs font-medium transition-colors',
                  localConfig.focusAreas.includes(area)
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted hover:bg-muted/80'
                )}
              >
                {area}
              </button>
            ))}
          </div>
        </div>

        {/* Toggles */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium">Capture Screenshots</div>
              <div className="text-xs text-muted-foreground">
                Take screenshots during discovery
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={localConfig.captureScreenshots}
                onChange={(e) =>
                  setLocalConfig({ ...localConfig, captureScreenshots: e.target.checked })
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-ring rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-primary after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
            </label>
          </div>

          <div className="flex items-center justify-between">
            <div>
              <div className="text-sm font-medium flex items-center gap-2">
                Vision AI
                <Badge variant="info" className="text-xs">
                  Beta
                </Badge>
              </div>
              <div className="text-xs text-muted-foreground">
                Use AI vision for element detection
              </div>
            </div>
            <label className="relative inline-flex items-center cursor-pointer">
              <input
                type="checkbox"
                checked={localConfig.useVisionAI}
                onChange={(e) =>
                  setLocalConfig({ ...localConfig, useVisionAI: e.target.checked })
                }
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-muted peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-ring rounded-full peer peer-checked:after:translate-x-full peer-checked:bg-primary after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:rounded-full after:h-5 after:w-5 after:transition-all"></div>
            </label>
          </div>
        </div>

        {/* Authentication Config (collapsible) */}
        <details className="group">
          <summary className="flex items-center justify-between cursor-pointer list-none">
            <span className="text-sm font-medium">Authentication (Optional)</span>
            <ChevronDown className="h-4 w-4 text-muted-foreground group-open:rotate-180 transition-transform" />
          </summary>
          <div className="mt-4 space-y-3">
            <div className="space-y-2">
              <label className="text-sm font-medium">Login URL</label>
              <Input
                value={localConfig.authConfig?.loginUrl || ''}
                onChange={(e) =>
                  setLocalConfig({
                    ...localConfig,
                    authConfig: { ...localConfig.authConfig, loginUrl: e.target.value },
                  })
                }
                placeholder="https://app.example.com/login"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <label className="text-sm font-medium">Username</label>
                <Input
                  value={localConfig.authConfig?.username || ''}
                  onChange={(e) =>
                    setLocalConfig({
                      ...localConfig,
                      authConfig: { ...localConfig.authConfig, username: e.target.value },
                    })
                  }
                  placeholder="test@example.com"
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Password</label>
                <Input
                  type="password"
                  value={localConfig.authConfig?.password || ''}
                  onChange={(e) =>
                    setLocalConfig({
                      ...localConfig,
                      authConfig: { ...localConfig.authConfig, password: e.target.value },
                    })
                  }
                  placeholder="********"
                />
              </div>
            </div>
          </div>
        </details>
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onClose}>
          Cancel
        </Button>
        <Button onClick={handleSave}>Save Configuration</Button>
      </div>
    </SheetContent>
  );
}

function PageDetailsPanel({
  page,
  onClose,
}: {
  page: DiscoveredPage;
  onClose: () => void;
}) {
  const metadata = page.metadata as { elements?: Array<{ description?: string; selector?: string }>; screenshot?: string } | undefined;

  return (
    <SheetContent className="w-[400px] sm:w-[540px] overflow-y-auto">
      <SheetHeader>
        <SheetTitle className="truncate">{page.title || page.url}</SheetTitle>
        <SheetDescription className="truncate">{page.url}</SheetDescription>
      </SheetHeader>

      <div className="space-y-6 py-6">
        {/* Screenshot Preview */}
        {metadata?.screenshot && (
          <div className="rounded-lg border overflow-hidden">
            <img
              src={metadata.screenshot}
              alt={page.title || 'Page screenshot'}
              className="w-full h-auto"
            />
          </div>
        )}

        {/* Page Stats */}
        <div className="grid grid-cols-3 gap-4">
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <MousePointer className="h-5 w-5 mx-auto mb-1 text-primary" />
            <div className="text-lg font-bold">{page.element_count}</div>
            <div className="text-xs text-muted-foreground">Elements</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <FormInput className="h-5 w-5 mx-auto mb-1 text-primary" />
            <div className="text-lg font-bold">{page.form_count}</div>
            <div className="text-xs text-muted-foreground">Forms</div>
          </div>
          <div className="text-center p-3 rounded-lg bg-muted/50">
            <Link2 className="h-5 w-5 mx-auto mb-1 text-primary" />
            <div className="text-lg font-bold">{page.link_count}</div>
            <div className="text-xs text-muted-foreground">Links</div>
          </div>
        </div>

        {/* Page Info */}
        <div className="space-y-3">
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wide">
              Page Type
            </label>
            <p className="font-medium capitalize">{page.page_type || 'Unknown'}</p>
          </div>
          <div>
            <label className="text-xs text-muted-foreground uppercase tracking-wide">
              Full URL
            </label>
            <p className="font-mono text-sm break-all">{page.url}</p>
          </div>
        </div>

        {/* Elements List */}
        {metadata?.elements && metadata.elements.length > 0 && (
          <div className="space-y-3">
            <h4 className="font-medium text-sm">Interactive Elements</h4>
            <div className="space-y-2 max-h-60 overflow-y-auto">
              {metadata.elements.slice(0, 20).map((element, index) => (
                <div
                  key={index}
                  className="p-2 rounded border text-sm"
                >
                  <p className="font-medium">{element.description || 'Element'}</p>
                  {element.selector && (
                    <p className="text-xs text-muted-foreground font-mono truncate">
                      {element.selector}
                    </p>
                  )}
                </div>
              ))}
              {metadata.elements.length > 20 && (
                <p className="text-xs text-muted-foreground text-center py-2">
                  + {metadata.elements.length - 20} more elements
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-4 border-t">
        <Button variant="outline" onClick={onClose}>
          Close
        </Button>
        <Button>
          <ExternalLink className="h-4 w-4 mr-2" />
          Open Page
        </Button>
      </div>
    </SheetContent>
  );
}

// ============================================
// Main Discovery Page Component
// ============================================

export default function DiscoveryPage() {
  // URL and project state
  const [appUrl, setAppUrl] = useState('');
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // UI state
  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [selectedPageId, setSelectedPageId] = useState<string | null>(null);
  const [selectedFlow, setSelectedFlow] = useState<DiscoveredFlow | null>(null);
  const [showFlowEditor, setShowFlowEditor] = useState(false);
  const [showConfigPanel, setShowConfigPanel] = useState(false);
  const [showPageDetails, setShowPageDetails] = useState(false);
  const [discoveryConfig, setDiscoveryConfig] = useState<DiscoveryConfig>(DEFAULT_CONFIG);

  // Hooks
  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const currentProject = selectedProjectId || projects[0]?.id;
  const currentProjectData = projects.find((p) => p.id === currentProject);

  // Legacy hook for backwards compatibility
  const { data: discoveryData, isLoading: discoveryLoading } = useLatestDiscoveryData(currentProject || null);

  // Enhanced session-based hooks for multi-page crawling
  const startDiscoverySession = useStartDiscoverySession();
  const { data: currentSession, isLoading: sessionLoading } = useDiscoverySession(currentSessionId);
  const pauseDiscovery = usePauseDiscovery();
  const resumeDiscovery = useResumeDiscovery();
  const cancelDiscovery = useCancelDiscovery();
  const validateFlow = useValidateFlow();
  const generateTestFromFlow = useGenerateTestFromFlow();
  const bulkGenerateTests = useBulkGenerateTests();
  const { data: discoveryHistory } = useDiscoveryHistory(currentProject || null);

  // Cross-project pattern learning hooks
  const { data: crossProjectPatterns = [], isLoading: patternsLoading } = useCrossProjectPatterns(currentSessionId);
  const { data: globalPatterns = [] } = useGlobalPatterns(5);

  const createTest = useCreateTest();
  const queryClient = useQueryClient();
  const supabase = getSupabaseClient();

  // Set appUrl from project when it changes
  const effectiveAppUrl = appUrl || currentProjectData?.app_url || 'https://example.com';

  // Derived state - check both legacy and session-based data
  const isDiscovering =
    startDiscoverySession.isPending ||
    discoveryData?.session?.status === 'running' ||
    currentSession?.status === 'running';
  const hasData = !!discoveryData?.session || !!currentSession;
  const isPaused = currentSession?.status === 'paused';

  // Calculate stats - use session data when available, fall back to legacy
  const stats = useMemo(() => {
    // Prefer session progress data for real-time updates during crawling
    if (currentSession?.progress) {
      const maxPages = currentSession.config?.maxPages || discoveryConfig.maxPages || 50;
      return {
        pagesDiscovered: currentSession.progress.pagesDiscovered,
        elementsFound: 0, // Will be populated when pages data loads
        flowsIdentified: currentSession.progress.flowsIdentified,
        coverage: Math.min(100, Math.round((currentSession.progress.pagesDiscovered / maxPages) * 100)),
        pagesQueued: currentSession.progress.pagesQueued,
        currentUrl: currentSession.progress.currentUrl,
        currentStep: currentSession.progress.currentStep,
      };
    }

    // Fall back to legacy discovery data
    if (!discoveryData) {
      return {
        pagesDiscovered: 0,
        elementsFound: 0,
        flowsIdentified: 0,
        coverage: 0,
        pagesQueued: 0,
        currentUrl: undefined,
        currentStep: undefined,
      };
    }

    const pages = discoveryData.pages || [];
    const flows = discoveryData.flows || [];

    return {
      pagesDiscovered: pages.length,
      elementsFound: pages.reduce((acc, p) => acc + (p.element_count || 0), 0),
      flowsIdentified: flows.length,
      coverage: Math.min(100, Math.round((pages.length / 50) * 100)), // Estimate coverage
      pagesQueued: 0,
      currentUrl: undefined,
      currentStep: undefined,
    };
  }, [discoveryData, currentSession, discoveryConfig.maxPages]);

  // Convert pages to graph nodes
  const graphData = useMemo(() => {
    if (!discoveryData?.pages) {
      return { nodes: [], edges: [] };
    }

    const nodes: PageNode[] = discoveryData.pages.map((page, index) => ({
      id: page.id,
      url: page.url,
      title: page.title || page.url,
      category: categorizePageType(page.page_type || '', page.url),
      elementCount: page.element_count || 0,
      formCount: page.form_count || 0,
      linkCount: page.link_count || 0,
      depth: 0, // Would need to calculate from crawl data
    }));

    // Generate simple edges based on link relationships (simplified)
    const edges: Array<{ source: string; target: string }> = [];
    if (nodes.length > 1) {
      for (let i = 0; i < nodes.length - 1; i++) {
        edges.push({
          source: nodes[0].id,
          target: nodes[i + 1].id,
        });
      }
    }

    return { nodes, edges };
  }, [discoveryData?.pages]);

  // AI Insights - generated from session data and patterns
  const aiInsights: AIInsight[] = useMemo(() => {
    const insights: AIInsight[] = [];
    const pages = discoveryData?.pages || [];
    const flows = discoveryData?.flows || [];

    // Real-time session insights
    if (currentSession?.status === 'running' && stats.pagesQueued > 0) {
      insights.push({
        id: 'session-progress',
        type: 'info',
        title: 'Discovery In Progress',
        description: `Crawling ${stats.currentUrl || 'pages'}. ${stats.pagesQueued} pages queued, ${stats.pagesDiscovered} discovered.`,
        confidence: 1.0,
        actionable: false,
      });
    }

    // Authentication flow detection
    const authPages = pages.filter(p =>
      p.url?.toLowerCase().includes('login') ||
      p.url?.toLowerCase().includes('auth') ||
      p.url?.toLowerCase().includes('signin') ||
      p.url?.toLowerCase().includes('signup')
    );
    if (authPages.length > 0 || flows.some(f => f.name?.toLowerCase().includes('auth'))) {
      insights.push({
        id: 'auth-pattern',
        type: 'pattern',
        title: 'Authentication Flow Detected',
        description: `Found ${authPages.length} auth-related page${authPages.length !== 1 ? 's' : ''}. Consider adding comprehensive auth tests including edge cases.`,
        confidence: 0.92,
        actionable: true,
      });
    }

    // Form analysis
    const formsTotal = pages.reduce((acc, p) => acc + (p.form_count || 0), 0);
    if (formsTotal > 0) {
      insights.push({
        id: 'form-analysis',
        type: 'recommendation',
        title: 'Form Validation Tests Recommended',
        description: `${formsTotal} form${formsTotal !== 1 ? 's' : ''} detected across ${pages.filter(p => (p.form_count || 0) > 0).length} pages. Add validation and error handling tests.`,
        confidence: 0.85,
        actionable: true,
      });
    }

    // Coverage analysis
    const maxPages = discoveryConfig.maxPages || 50;
    if (stats.coverage < 50) {
      insights.push({
        id: 'coverage-gap',
        type: 'coverage_gap',
        title: 'Coverage Gap Identified',
        description: `Only ${stats.coverage}% coverage (${stats.pagesDiscovered}/${maxPages} pages). Run deep exploration for better coverage.`,
        confidence: 0.78,
        actionable: true,
      });
    }

    // Flow priority insights
    const criticalFlows = flows.filter(f => f.priority === 'critical');
    const highFlows = flows.filter(f => f.priority === 'high');
    if (criticalFlows.length > 0 || highFlows.length > 0) {
      insights.push({
        id: 'flow-priority',
        type: 'recommendation',
        title: 'High-Priority Flows Detected',
        description: `${criticalFlows.length} critical and ${highFlows.length} high-priority flows identified. Generate tests for these first.`,
        confidence: 0.90,
        actionable: true,
      });
    }

    // Navigation complexity
    const totalLinks = pages.reduce((acc, p) => acc + (p.link_count || 0), 0);
    if (totalLinks > 100 && pages.length < 20) {
      insights.push({
        id: 'nav-complexity',
        type: 'pattern',
        title: 'Complex Navigation Detected',
        description: `High link density (${totalLinks} links in ${pages.length} pages). Consider increasing crawl depth to discover more pages.`,
        confidence: 0.75,
        actionable: true,
      });
    }

    // Discovery history comparison
    if (discoveryHistory && discoveryHistory.length > 1) {
      const latest = discoveryHistory[0];
      const previous = discoveryHistory[1];
      const pagesChange = (latest.pagesFound || 0) - (previous.pagesFound || 0);
      const flowsChange = (latest.flowsFound || 0) - (previous.flowsFound || 0);

      if (Math.abs(pagesChange) > 5 || Math.abs(flowsChange) > 2) {
        insights.push({
          id: 'history-change',
          type: 'info',
          title: 'Discovery Changes Detected',
          description: `${pagesChange >= 0 ? '+' : ''}${pagesChange} pages and ${flowsChange >= 0 ? '+' : ''}${flowsChange} flows since last discovery.`,
          confidence: 0.95,
          actionable: false,
        });
      }
    }

    // Cross-project pattern insights
    if (crossProjectPatterns.length > 0) {
      // High confidence pattern match
      const highConfidencePatterns = crossProjectPatterns.filter(p => p.matchScore >= 0.8);
      if (highConfidencePatterns.length > 0) {
        const bestMatch = highConfidencePatterns[0];
        insights.push({
          id: 'pattern-match',
          type: 'pattern',
          title: 'Cross-Project Pattern Match',
          description: `"${bestMatch.pattern.patternName}" pattern detected with ${Math.round(bestMatch.matchScore * 100)}% match. Seen ${bestMatch.pattern.timesSeen}× across ${bestMatch.pattern.projectCount} projects.`,
          confidence: bestMatch.matchScore,
          actionable: true,
        });
      }

      // Pattern with high test success rate
      const successfulPatterns = crossProjectPatterns.filter(p => p.pattern.testSuccessRate >= 0.8);
      if (successfulPatterns.length > 0) {
        const successPattern = successfulPatterns[0];
        insights.push({
          id: 'proven-pattern',
          type: 'recommendation',
          title: 'Proven Test Pattern Available',
          description: `"${successPattern.pattern.patternName}" has ${Math.round(successPattern.pattern.testSuccessRate * 100)}% test success rate. Use suggested selectors for reliable tests.`,
          confidence: successPattern.pattern.testSuccessRate,
          actionable: true,
        });
      }

      // Self-healing pattern
      const healablePatterns = crossProjectPatterns.filter(p => p.pattern.selfHealSuccessRate >= 0.7);
      if (healablePatterns.length > 0) {
        const healPattern = healablePatterns[0];
        insights.push({
          id: 'self-heal-pattern',
          type: 'info',
          title: 'Self-Healing Pattern Detected',
          description: `"${healPattern.pattern.patternName}" has ${Math.round(healPattern.pattern.selfHealSuccessRate * 100)}% self-heal success rate. Tests using this pattern are more resilient.`,
          confidence: healPattern.pattern.selfHealSuccessRate,
          actionable: false,
        });
      }
    } else if (globalPatterns.length > 0 && pages.length > 0) {
      // Suggest using global patterns when starting fresh
      insights.push({
        id: 'global-patterns-hint',
        type: 'recommendation',
        title: 'Cross-Project Learning Available',
        description: `${globalPatterns.length} proven patterns from other projects could apply. Review the Cross-Project Patterns panel for reusable test strategies.`,
        confidence: 0.7,
        actionable: true,
      });
    }

    return insights;
  }, [discoveryData, currentSession, stats, discoveryConfig.maxPages, discoveryHistory, crossProjectPatterns, globalPatterns]);

  // Helper function to categorize page type
  function categorizePageType(pageType: string, url: string): string {
    const urlLower = url.toLowerCase();
    if (urlLower.includes('login') || urlLower.includes('auth') || urlLower.includes('signin')) {
      return 'auth';
    }
    if (urlLower.includes('dashboard')) return 'dashboard';
    if (urlLower.includes('settings') || urlLower.includes('preferences')) return 'settings';
    if (urlLower.includes('profile') || urlLower.includes('account')) return 'profile';
    if (pageType === 'form' || urlLower.includes('form') || urlLower.includes('create') || urlLower.includes('new')) {
      return 'form';
    }
    if (urlLower.includes('list') || urlLower.includes('table')) return 'list';
    if (urlLower.includes('detail') || urlLower.includes('view')) return 'detail';
    if (urlLower.includes('error') || urlLower.includes('404') || urlLower.includes('500')) return 'error';
    return 'default';
  }

  // Handlers
  const handleStartDiscovery = async () => {
    if (!currentProject) return;
    try {
      // Map local config types to API-compatible types
      const modeMap: Record<DiscoveryMode, 'full' | 'quick' | 'targeted' | 'continuous'> = {
        quick: 'quick',
        standard: 'full',
        deep: 'full',
        focused: 'targeted',
        autonomous: 'continuous',
      };

      const strategyMap: Record<CrawlStrategy, 'breadth_first' | 'depth_first' | 'priority_based' | 'ai_guided'> = {
        bfs: 'breadth_first',
        dfs: 'depth_first',
        priority: 'priority_based',
        'ai-guided': 'ai_guided',
      };

      // Convert comma-separated patterns to arrays
      const includePatterns = discoveryConfig.includePatterns
        ? discoveryConfig.includePatterns.split(',').map(p => p.trim()).filter(Boolean)
        : undefined;
      const excludePatterns = discoveryConfig.excludePatterns
        ? discoveryConfig.excludePatterns.split(',').map(p => p.trim()).filter(Boolean)
        : undefined;

      // Build auth config with required type field if auth is enabled
      const authConfig = discoveryConfig.authRequired && discoveryConfig.authConfig
        ? {
            type: 'custom' as const,
            credentials: {
              loginUrl: discoveryConfig.authConfig.loginUrl,
              username: discoveryConfig.authConfig.username,
              password: discoveryConfig.authConfig.password,
            },
          }
        : undefined;

      // Use session-based multi-page crawling with full configuration
      const result = await startDiscoverySession.mutateAsync({
        projectId: currentProject,
        appUrl: effectiveAppUrl,
        mode: modeMap[discoveryConfig.mode],
        strategy: strategyMap[discoveryConfig.strategy],
        maxPages: discoveryConfig.maxPages,
        maxDepth: discoveryConfig.maxDepth,
        includePatterns,
        excludePatterns,
        focusAreas: discoveryConfig.focusAreas,
        captureScreenshots: discoveryConfig.captureScreenshots,
        useVisionAI: discoveryConfig.useVisionAI,
        authConfig,
      });
      setCurrentSessionId(result.id);
    } catch (error) {
      console.error('Failed to start discovery:', error);
    }
  };

  // Session control handlers
  const handlePauseDiscovery = async () => {
    if (!currentSessionId) return;
    try {
      await pauseDiscovery.mutateAsync(currentSessionId);
    } catch (error) {
      console.error('Failed to pause discovery:', error);
    }
  };

  const handleResumeDiscovery = async () => {
    if (!currentSessionId) return;
    try {
      await resumeDiscovery.mutateAsync(currentSessionId);
    } catch (error) {
      console.error('Failed to resume discovery:', error);
    }
  };

  const handleCancelDiscovery = async () => {
    if (!currentSessionId) return;
    try {
      await cancelDiscovery.mutateAsync(currentSessionId);
      setCurrentSessionId(null);
    } catch (error) {
      console.error('Failed to cancel discovery:', error);
    }
  };

  const handleGenerateTest = async (flow: DiscoveredFlow) => {
    if (!currentProject) return;

    try {
      // Use the backend hook to generate test from flow (just pass flowId)
      const result = await generateTestFromFlow.mutateAsync(flow.id);

      if (result.testId) {
        // Refresh discovery data to update flow status
        queryClient.invalidateQueries({ queryKey: ['latest-discovery', currentProject] });
        queryClient.invalidateQueries({ queryKey: ['discovery-session', currentSessionId] });
      }
    } catch (error) {
      // Fall back to direct test creation if backend hook fails
      console.warn('Backend test generation failed, falling back to direct creation:', error);
      try {
        const test = await createTest.mutateAsync({
          project_id: currentProject,
          name: flow.name,
          description: flow.description || `Auto-generated from discovered flow: ${flow.name}`,
          steps: flow.steps || [],
          tags: ['discovered', 'auto-generated'],
          priority: flow.priority || 'medium',
          source: 'discovered',
        });

        // Update flow to mark it as converted
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        await (supabase.from('discovered_flows') as any)
          .update({ converted_to_test_id: test.id })
          .eq('id', flow.id);

        // Refresh discovery data
        queryClient.invalidateQueries({ queryKey: ['latest-discovery', currentProject] });
      } catch (fallbackError) {
        console.error('Failed to create test:', fallbackError);
      }
    }
  };

  // Validate a discovered flow before generating test
  const handleValidateFlow = async (flow: DiscoveredFlow) => {
    try {
      const result = await validateFlow.mutateAsync(flow.id);
      // Refresh discovery data to show validation result
      queryClient.invalidateQueries({ queryKey: ['latest-discovery', currentProject] });
      queryClient.invalidateQueries({ queryKey: ['discovery-session', currentSessionId] });
      return result;
    } catch (error) {
      console.error('Failed to validate flow:', error);
      return null;
    }
  };

  // Generate tests from all discovered flows (high priority only)
  const handleBulkGenerateTests = async () => {
    if (!discoveryData?.flows?.length) return;

    try {
      // Get flow IDs for high priority flows that haven't been converted yet
      const flowIds = discoveryData.flows
        .filter(f => !f.converted_to_test_id && ['critical', 'high'].includes(f.priority))
        .map(f => f.id);

      if (flowIds.length === 0) return null;

      const result = await bulkGenerateTests.mutateAsync(flowIds);

      // Refresh data
      queryClient.invalidateQueries({ queryKey: ['latest-discovery', currentProject] });
      queryClient.invalidateQueries({ queryKey: ['discovery-session', currentSessionId] });

      return result;
    } catch (error) {
      console.error('Failed to bulk generate tests:', error);
      return null;
    }
  };

  const handleGenerateAllTests = async () => {
    if (!discoveryData?.flows?.length || !currentProject) return;

    const flowsToConvert = discoveryData.flows.filter((f) => !f.converted_to_test_id);
    if (flowsToConvert.length === 0) {
      return;
    }

    try {
      for (const flow of flowsToConvert) {
        await handleGenerateTest(flow);
      }
    } catch (error) {
      console.error('Failed to generate all tests:', error);
    }
  };

  const handleEditFlow = (flow: DiscoveredFlow) => {
    setSelectedFlow(flow);
    setShowFlowEditor(true);
  };

  const handleSaveFlow = async (updatedFlow: FlowEditorFlow) => {
    if (!selectedFlow || !currentProject) return;

    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      await (supabase.from('discovered_flows') as any)
        .update({
          name: updatedFlow.name,
          description: updatedFlow.description,
          steps: updatedFlow.steps,
          step_count: updatedFlow.steps.length,
          priority: updatedFlow.priority,
        })
        .eq('id', selectedFlow.id);

      queryClient.invalidateQueries({ queryKey: ['latest-discovery', currentProject] });
      setShowFlowEditor(false);
      setSelectedFlow(null);
    } catch (error) {
      console.error('Failed to save flow:', error);
    }
  };

  const handleNodeClick = (page: PageNode) => {
    setSelectedPageId(page.id);
    setShowPageDetails(true);
  };

  const selectedPage = discoveryData?.pages?.find((p) => p.id === selectedPageId);

  // No project state
  if (!projectsLoading && projects.length === 0) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 lg:ml-64 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Compass className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-semibold tracking-tight mb-2">No Projects Yet</h2>
            <p className="text-muted-foreground">
              Create a project first to start discovering your application.
            </p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 lg:ml-64">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-6">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-gradient-to-br from-primary/20 to-primary/5">
                <Compass className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="font-semibold">Discovery Intelligence</h1>
                <p className="text-xs text-muted-foreground">
                  AI-powered application exploration
                </p>
              </div>
            </div>

            <div className="flex-1" />

            {/* Project Selector */}
            <select
              value={currentProject || ''}
              onChange={(e) => {
                setSelectedProjectId(e.target.value);
                const project = projects.find((p) => p.id === e.target.value);
                if (project) setAppUrl(project.app_url);
              }}
              className="h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>

            <div className="flex items-center gap-2">
              <Input
                value={effectiveAppUrl}
                onChange={(e) => setAppUrl(e.target.value)}
                placeholder="App URL"
                className="w-64 h-9"
              />

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowConfigPanel(true)}
              >
                <Settings2 className="h-4 w-4" />
              </Button>

              <Button
                onClick={handleStartDiscovery}
                disabled={isDiscovering}
                className="gap-2"
              >
                {isDiscovering ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin" />
                    Discovering...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4" />
                    Run Discovery
                  </>
                )}
              </Button>
            </div>
        </header>

        <div className="p-6 space-y-6">
          {/* Discovery Progress (shown when running) */}
          {isDiscovering && discoveryData?.session?.id && (
            <DiscoveryProgress
              sessionId={discoveryData.session.id}
              onComplete={(result) => {
                setCurrentSessionId(null);
                queryClient.invalidateQueries({ queryKey: ['latest-discovery', currentProject] });
              }}
              onError={(error) => {
                console.error('Discovery error:', error);
                setCurrentSessionId(null);
              }}
            />
          )}

          {/* Stats Grid (shown when not running) */}
          {!isDiscovering && (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  icon={FileText}
                  value={stats.pagesDiscovered}
                  label="Pages Discovered"
                  loading={discoveryLoading}
                />
                <StatCard
                  icon={MousePointer}
                  value={stats.elementsFound}
                  label="Interactive Elements"
                  loading={discoveryLoading}
                />
                <StatCard
                  icon={ArrowRight}
                  value={stats.flowsIdentified}
                  label="Flows Identified"
                  loading={discoveryLoading}
                />
                <StatCard
                  icon={BarChart3}
                  value={`${stats.coverage}%`}
                  label="Coverage"
                  loading={discoveryLoading}
                />
              </div>

              {/* Last Session Info */}
              {hasData && discoveryData?.session && (
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <Clock className="h-4 w-4" />
                  Last discovery:{' '}
                  {formatDistanceToNow(new Date(discoveryData.session.created_at), {
                    addSuffix: true,
                  })}
                  <span className="mx-2">|</span>
                  <Badge
                    variant={
                      discoveryData.session.status === 'completed' ? 'success' : 'info'
                    }
                  >
                    {discoveryData.session.status}
                  </Badge>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 px-2 ml-2"
                    onClick={() =>
                      queryClient.invalidateQueries({
                        queryKey: ['latest-discovery', currentProject],
                      })
                    }
                  >
                    <RefreshCw className="h-3 w-3" />
                  </Button>
                </div>
              )}

              {/* Main Content Grid */}
              <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                {/* Page Graph - Takes 2 columns on xl */}
                <div className="xl:col-span-2 rounded-xl border bg-card overflow-hidden">
                  <div className="p-4 border-b flex items-center justify-between">
                    <div>
                      <h3 className="font-medium">Page Graph</h3>
                      <p className="text-sm text-muted-foreground">
                        Visual representation of discovered pages
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button variant="ghost" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        View All
                      </Button>
                    </div>
                  </div>
                  <div className="h-[500px]">
                    <PageGraph
                      pages={graphData.nodes}
                      edges={graphData.edges}
                      onNodeClick={handleNodeClick}
                      selectedNodeId={selectedPageId || undefined}
                    />
                  </div>
                </div>

                {/* AI Insights Sidebar */}
                <div className="space-y-4">
                  <div className="rounded-xl border bg-card p-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Brain className="h-5 w-5 text-primary" />
                      <h3 className="font-medium">AI Insights</h3>
                    </div>
                    <div className="space-y-3">
                      {aiInsights.length > 0 ? (
                        aiInsights.map((insight) => (
                          <InsightCard key={insight.id} insight={insight} />
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          Run a discovery to generate insights
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Discovery History */}
                  <div className="rounded-xl border bg-card p-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Clock className="h-5 w-5 text-primary" />
                      <h3 className="font-medium">Discovery History</h3>
                    </div>
                    <div className="space-y-2">
                      {discoveryHistory && discoveryHistory.length > 0 ? (
                        discoveryHistory.slice(0, 5).map((session, index) => (
                          <div
                            key={session.id}
                            className={cn(
                              'p-3 rounded-lg border text-sm cursor-pointer hover:bg-muted/50 transition-colors',
                              currentSessionId === session.id && 'border-primary bg-primary/5'
                            )}
                            onClick={() => setCurrentSessionId(session.id)}
                          >
                            <div className="flex items-center justify-between mb-1">
                              <span className="font-medium truncate max-w-[120px]">
                                {new URL(session.appUrl).hostname}
                              </span>
                              <Badge
                                variant={
                                  session.status === 'completed'
                                    ? 'success'
                                    : session.status === 'running'
                                      ? 'info'
                                      : session.status === 'failed'
                                        ? 'error'
                                        : 'outline'
                                }
                                className="text-xs"
                              >
                                {session.status}
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 text-xs text-muted-foreground">
                              <span>{session.pagesFound || 0} pages</span>
                              <span>{session.flowsFound || 0} flows</span>
                              {session.duration && (
                                <span>{Math.round(session.duration / 1000)}s</span>
                              )}
                            </div>
                            <div className="text-xs text-muted-foreground mt-1">
                              {session.startedAt
                                ? formatDistanceToNow(new Date(session.startedAt), {
                                    addSuffix: true,
                                  })
                                : 'Not started'}
                            </div>
                          </div>
                        ))
                      ) : (
                        <p className="text-sm text-muted-foreground text-center py-4">
                          No discovery history yet
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Session Controls */}
                  {currentSessionId && currentSession && (
                    <div className="rounded-xl border bg-card p-4">
                      <div className="flex items-center gap-2 mb-4">
                        <Settings2 className="h-5 w-5 text-primary" />
                        <h3 className="font-medium">Session Controls</h3>
                      </div>
                      <div className="space-y-3">
                        <div className="text-sm">
                          <div className="flex justify-between text-muted-foreground">
                            <span>Status</span>
                            <Badge variant={
                              currentSession.status === 'running' ? 'info' :
                              currentSession.status === 'completed' ? 'success' :
                              currentSession.status === 'paused' ? 'warning' :
                              'error'
                            }>
                              {currentSession.status}
                            </Badge>
                          </div>
                        </div>
                        {currentSession.status === 'running' && (
                          <div className="flex gap-2">
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1"
                              onClick={handlePauseDiscovery}
                              disabled={pauseDiscovery.isPending}
                            >
                              <Pause className="h-4 w-4 mr-1" />
                              Pause
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="flex-1"
                              onClick={handleCancelDiscovery}
                              disabled={cancelDiscovery.isPending}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Cancel
                            </Button>
                          </div>
                        )}
                        {currentSession.status === 'paused' && (
                          <div className="flex gap-2">
                            <Button
                              variant="default"
                              size="sm"
                              className="flex-1"
                              onClick={handleResumeDiscovery}
                              disabled={resumeDiscovery.isPending}
                            >
                              <Play className="h-4 w-4 mr-1" />
                              Resume
                            </Button>
                            <Button
                              variant="destructive"
                              size="sm"
                              className="flex-1"
                              onClick={handleCancelDiscovery}
                              disabled={cancelDiscovery.isPending}
                            >
                              <X className="h-4 w-4 mr-1" />
                              Cancel
                            </Button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Cross-Project Patterns */}
                  <div className="rounded-xl border bg-card p-4">
                    <div className="flex items-center gap-2 mb-4">
                      <Network className="h-5 w-5 text-primary" />
                      <h3 className="font-medium">Cross-Project Patterns</h3>
                    </div>
                    <div className="space-y-3">
                      {patternsLoading ? (
                        <div className="animate-pulse space-y-2">
                          {[1, 2, 3].map((i) => (
                            <div key={i} className="h-16 bg-muted rounded-lg" />
                          ))}
                        </div>
                      ) : crossProjectPatterns.length > 0 ? (
                        crossProjectPatterns.slice(0, 5).map((patternMatch) => (
                          <div
                            key={patternMatch.patternId}
                            className="p-3 rounded-lg border bg-gradient-to-r from-primary/5 to-transparent hover:border-primary/30 transition-colors"
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="flex-1 min-w-0">
                                <div className="flex items-center gap-2">
                                  <GitBranch className="h-3.5 w-3.5 text-primary flex-shrink-0" />
                                  <span className="font-medium text-sm truncate">
                                    {patternMatch.pattern.patternName}
                                  </span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                                  {patternMatch.pattern.description || `Seen in ${patternMatch.pattern.projectCount} project${patternMatch.pattern.projectCount > 1 ? 's' : ''}`}
                                </p>
                              </div>
                              <Badge
                                variant="outline"
                                className="text-xs flex-shrink-0"
                              >
                                {Math.round(patternMatch.matchScore * 100)}% match
                              </Badge>
                            </div>
                            <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                              <span className="flex items-center gap-1">
                                <Layers className="h-3 w-3" />
                                {patternMatch.pattern.timesSeen}× seen
                              </span>
                              {patternMatch.pattern.testSuccessRate > 0 && (
                                <span className="flex items-center gap-1">
                                  <CheckCircle className="h-3 w-3 text-green-500" />
                                  {Math.round(patternMatch.pattern.testSuccessRate * 100)}% test success
                                </span>
                              )}
                              {patternMatch.pattern.selfHealSuccessRate > 0 && (
                                <span className="flex items-center gap-1">
                                  <Zap className="h-3 w-3 text-amber-500" />
                                  {Math.round(patternMatch.pattern.selfHealSuccessRate * 100)}% heal rate
                                </span>
                              )}
                            </div>
                          </div>
                        ))
                      ) : globalPatterns.length > 0 ? (
                        // Show global patterns when no session-specific matches
                        <>
                          <p className="text-xs text-muted-foreground mb-2">
                            Common patterns from other projects:
                          </p>
                          {globalPatterns.slice(0, 3).map((pattern) => (
                            <div
                              key={pattern.id}
                              className="p-3 rounded-lg border hover:border-primary/30 transition-colors"
                            >
                              <div className="flex items-center gap-2">
                                <GitBranch className="h-3.5 w-3.5 text-muted-foreground" />
                                <span className="font-medium text-sm">
                                  {pattern.patternName}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 mt-1 text-xs text-muted-foreground">
                                <span>{pattern.timesSeen}× seen</span>
                                <span>{pattern.projectCount} projects</span>
                              </div>
                            </div>
                          ))}
                        </>
                      ) : (
                        <div className="text-center py-4">
                          <Network className="h-8 w-8 mx-auto mb-2 text-muted-foreground/30" />
                          <p className="text-sm text-muted-foreground">
                            No patterns detected yet
                          </p>
                          <p className="text-xs text-muted-foreground mt-1">
                            Patterns are learned from discoveries across projects
                          </p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Discovered Flows */}
              <div className="rounded-xl border bg-card">
                <div className="p-4 border-b flex items-center justify-between">
                  <div>
                    <h3 className="font-medium">Discovered Flows</h3>
                    <p className="text-sm text-muted-foreground">
                      User journeys automatically identified
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={
                        !discoveryData?.flows?.length ||
                        discoveryData.flows.every((f) => f.converted_to_test_id)
                      }
                      onClick={handleGenerateAllTests}
                    >
                      <Sparkles className="h-4 w-4 mr-2" />
                      Generate All Tests
                    </Button>
                  </div>
                </div>
                <div className="p-4">
                  {discoveryLoading ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {[1, 2, 3, 4].map((i) => (
                        <div
                          key={i}
                          className="h-32 rounded-xl bg-muted animate-pulse"
                        />
                      ))}
                    </div>
                  ) : discoveryData?.flows?.length ? (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {discoveryData.flows.map((flow) => (
                        <FlowCard
                          key={flow.id}
                          flow={flow}
                          onEdit={() => handleEditFlow(flow)}
                          onValidate={() => handleValidateFlow(flow)}
                          onGenerateTest={() => handleGenerateTest(flow)}
                          isGenerating={createTest.isPending}
                        />
                      ))}
                    </div>
                  ) : (
                    <div className="text-center py-12">
                      <ArrowRight className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                      <p className="text-muted-foreground">
                        No flows discovered yet. Run a discovery to identify user journeys.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Configuration Panel (Sheet) */}
        <Sheet open={showConfigPanel} onOpenChange={setShowConfigPanel}>
          <ConfigurationPanel
            config={discoveryConfig}
            onChange={setDiscoveryConfig}
            onClose={() => setShowConfigPanel(false)}
          />
        </Sheet>

        {/* Page Details Panel (Sheet) */}
        {selectedPage && (
          <Sheet open={showPageDetails} onOpenChange={setShowPageDetails}>
            <PageDetailsPanel
              page={selectedPage}
              onClose={() => {
                setShowPageDetails(false);
                setSelectedPageId(null);
              }}
            />
          </Sheet>
        )}

        {/* Flow Editor Dialog */}
        <Dialog open={showFlowEditor} onOpenChange={setShowFlowEditor}>
          <DialogContent className="max-w-4xl max-h-[90vh] p-0">
            {selectedFlow && (
              <FlowEditor
                flow={{
                  id: selectedFlow.id,
                  name: selectedFlow.name,
                  description: selectedFlow.description || '',
                  category: 'Other',
                  priority: selectedFlow.priority,
                  steps: Array.isArray(selectedFlow.steps)
                    ? selectedFlow.steps.map((step: any, index: number) => ({
                        id: `step-${index}`,
                        instruction: step.instruction || step.toString(),
                        action: step.action || 'click',
                        selector: step.selector,
                        value: step.value,
                        optional: step.optional,
                      }))
                    : [],
                  successCriteria: [],
                  failureIndicators: [],
                }}
                onSave={handleSaveFlow}
                onCancel={() => {
                  setShowFlowEditor(false);
                  setSelectedFlow(null);
                }}
                onGenerateTest={(flow) => {
                  if (selectedFlow) {
                    handleGenerateTest(selectedFlow);
                  }
                  setShowFlowEditor(false);
                  setSelectedFlow(null);
                }}
              />
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
}
