'use client';

import { useState, useCallback } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Github,
  GitlabIcon,
  Slack,
  Webhook,
  CheckCircle,
  Copy,
  ExternalLink,
  Zap,
  Activity,
  LineChart,
  Bug,
  Video,
  BarChart3,
  AlertTriangle,
  Loader2,
  Key,
  Eye,
  EyeOff,
  RefreshCw,
  Sparkles,
  MessageSquare,
  CircleDot,
  ListTodo,
  XCircle,
  AlertCircle,
  Plus,
  Clock,
  Users,
  Play,
  ChevronRight,
  Wand2,
  FlaskConical,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '@/lib/hooks/useToast';
import {
  useIntegrations,
  useIntegrationStats,
  useConnectIntegration,
  useDisconnectIntegration,
  useTestIntegration,
  useSyncIntegration,
  useSyncAllIntegrations,
  type IntegrationPlatform,
  type Integration,
  type ConnectIntegrationRequest,
} from '@/lib/hooks/use-integrations';
import {
  useIntegrationErrors,
  useIntegrationSessions,
  useErrorToTest,
  useSessionToTest,
  useBulkGenerateTests,
  type IntegrationError,
  type IntegrationSession,
  type GeneratedTest,
} from '@/lib/hooks/use-integration-ai';

// ============================================================================
// Static Configuration Examples
// ============================================================================

const GITHUB_ACTIONS_YAML = `name: Argus E2E Tests

on:
  pull_request:
    branches: [main]
  push:
    branches: [main]

jobs:
  argus-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Start Application
        run: |
          npm ci
          npm run build
          npm start &
          sleep 10

      - name: Run Argus Tests
        env:
          ARGUS_API_URL: \${{ secrets.ARGUS_API_URL }}
          ANTHROPIC_API_KEY: \${{ secrets.ANTHROPIC_API_KEY }}
        run: |
          curl -X POST \\
            "\${ARGUS_API_URL}/api/v1/tests/run" \\
            -H "Content-Type: application/json" \\
            -d '{
              "app_url": "http://localhost:3000",
              "github_pr": "\${{ github.event.pull_request.number }}",
              "github_repo": "\${{ github.repository }}"
            }'

      - name: Upload Results
        uses: actions/upload-artifact@v4
        with:
          name: argus-results
          path: test-results/`;

const GITLAB_CI_YAML = `argus-tests:
  stage: test
  image: node:20
  services:
    - name: your-app:latest
      alias: app
  variables:
    ARGUS_API_URL: \${ARGUS_API_URL}
    ANTHROPIC_API_KEY: \${ANTHROPIC_API_KEY}
  script:
    - |
      curl -X POST \\
        "\${ARGUS_API_URL}/api/v1/tests/run" \\
        -H "Content-Type: application/json" \\
        -d '{
          "app_url": "http://app:3000",
          "gitlab_mr": "'\${CI_MERGE_REQUEST_IID}'"
        }'
  artifacts:
    reports:
      junit: test-results/junit.xml
  only:
    - merge_requests`;

const WEBHOOK_EXAMPLE = `// n8n Webhook Configuration
{
  "url": "https://your-n8n-instance.com/webhook/argus-trigger",
  "method": "POST",
  "headers": {
    "Content-Type": "application/json"
  },
  "body": {
    "app_url": "{{ $json.preview_url }}",
    "pr_number": "{{ $json.pr_number }}",
    "notify_slack": true
  }
}`;

const SDK_EXAMPLE = `import { Argus } from '@heyargus/sdk';

const agent = new Argus({
  apiKey: process.env.ANTHROPIC_API_KEY,
  baseUrl: 'https://api.heyargus.ai',
});

// Create test from natural language
const test = await agent.createTest(
  'Login as admin@example.com and verify dashboard loads'
);

// Run the test
const result = await agent.runTest(test.id, {
  appUrl: 'http://localhost:3000',
});

console.log(\`Test \${result.status}: \${result.passed}/\${result.total} passed\`);

// Auto-discover app flows
const discovery = await agent.discover('http://localhost:3000');
console.log(\`Found \${discovery.flows.length} user flows\`);`;

const JIRA_CONFIG = `// Jira Integration Configuration
{
  "instance_url": "https://your-company.atlassian.net",
  "project_key": "ARGUS",
  "issue_type": "Bug",
  "auto_create": true,
  "fields_mapping": {
    "title": "Test {{test_name}} failed",
    "description": "{{failure_details}}",
    "priority": "{{severity}}",
    "labels": ["argus", "automated-test"]
  },
  "transitions": {
    "on_pass": "Done",
    "on_fail": "In Progress"
  }
}`;

const LINEAR_CONFIG = `// Linear Integration Configuration
{
  "team_id": "ENG",
  "project_id": "your-project-id",
  "auto_create_issues": true,
  "issue_template": {
    "title": "[Argus] {{test_name}} failure",
    "description": "### Test Failure Report\\n\\n{{failure_details}}",
    "priority": 2,
    "labels": ["bug", "testing"],
    "assignee": "auto"
  },
  "cycle_tracking": true,
  "link_to_runs": true
}`;

const DISCORD_WEBHOOK = `// Discord Webhook Configuration
{
  "webhook_url": "https://discord.com/api/webhooks/...",
  "notifications": {
    "on_failure": true,
    "on_pass": false,
    "on_healing": true
  },
  "embed_config": {
    "color_success": "#22c55e",
    "color_failure": "#ef4444",
    "include_screenshot": true,
    "include_logs": true
  },
  "mentions": {
    "on_critical": "@engineering",
    "enabled": true
  }
}`;

// ============================================================================
// Platform Metadata (icons, colors, config examples, etc.)
// ============================================================================

interface PlatformMetadata {
  icon: React.ComponentType<{ className?: string }>;
  color: string;
  configExample?: string;
  defaultFeatures: string[];
}

const platformMetadata: Record<IntegrationPlatform, PlatformMetadata> = {
  // CI/CD & Notifications
  github: {
    icon: Github,
    color: 'gray',
    configExample: GITHUB_ACTIONS_YAML,
    defaultFeatures: ['PR Status Checks', 'Action Workflows', 'Commit Status'],
  },
  gitlab: {
    icon: GitlabIcon,
    color: 'orange',
    configExample: GITLAB_CI_YAML,
    defaultFeatures: ['MR Pipelines', 'CI/CD Integration', 'Artifacts'],
  },
  slack: {
    icon: Slack,
    color: 'purple',
    defaultFeatures: ['Test Alerts', 'Daily Reports', 'Failure Notifications'],
  },
  discord: {
    icon: MessageSquare,
    color: 'indigo',
    configExample: DISCORD_WEBHOOK,
    defaultFeatures: ['Webhook Notifications', 'Rich Embeds', 'Mentions'],
  },
  jira: {
    icon: CircleDot,
    color: 'blue',
    configExample: JIRA_CONFIG,
    defaultFeatures: ['Auto-create Issues', 'Status Sync', 'Field Mapping'],
  },
  linear: {
    icon: ListTodo,
    color: 'indigo',
    configExample: LINEAR_CONFIG,
    defaultFeatures: ['Auto-create Issues', 'Cycle Tracking', 'Run Links'],
  },
  webhook: {
    icon: Webhook,
    color: 'green',
    configExample: WEBHOOK_EXAMPLE,
    defaultFeatures: ['Custom Triggers', 'n8n/Zapier', 'REST API'],
  },
  // Deployment Platforms
  vercel: {
    icon: Zap,
    color: 'gray',
    defaultFeatures: ['Preview Deployments', 'Production Testing', 'Edge Functions'],
  },
  netlify: {
    icon: Zap,
    color: 'teal',
    defaultFeatures: ['Deploy Previews', 'Build Hooks', 'Serverless Functions'],
  },
  // Observability Platforms
  datadog: {
    icon: Activity,
    color: 'purple',
    defaultFeatures: ['Session Replay', 'Core Web Vitals', 'Error Tracking', 'APM Traces'],
  },
  sentry: {
    icon: Bug,
    color: 'pink',
    defaultFeatures: ['Error Aggregation', 'Stack Traces', 'Release Tracking', 'Session Replay'],
  },
  newrelic: {
    icon: LineChart,
    color: 'green',
    defaultFeatures: ['Browser Monitoring', 'APM', 'Infrastructure', 'Logs'],
  },
  fullstory: {
    icon: Video,
    color: 'blue',
    defaultFeatures: ['Session Replay', 'Rage Clicks', 'Frustration Signals', 'Heatmaps'],
  },
  posthog: {
    icon: BarChart3,
    color: 'orange',
    defaultFeatures: ['Product Analytics', 'Session Recording', 'Feature Flags', 'Funnels'],
  },
  logrocket: {
    icon: Video,
    color: 'indigo',
    defaultFeatures: ['Session Replay', 'Console Logs', 'Network Requests', 'Redux State'],
  },
  amplitude: {
    icon: LineChart,
    color: 'blue',
    defaultFeatures: ['User Journeys', 'Cohort Analysis', 'Funnel Analytics', 'Retention'],
  },
  mixpanel: {
    icon: BarChart3,
    color: 'purple',
    defaultFeatures: ['Event Tracking', 'User Flows', 'A/B Testing', 'Retention Analysis'],
  },
};

// Categorize platforms
const cicdPlatforms: IntegrationPlatform[] = ['github', 'gitlab', 'slack', 'discord', 'jira', 'linear', 'webhook'];
const deploymentPlatforms: IntegrationPlatform[] = ['vercel', 'netlify'];
const observabilityPlatforms: IntegrationPlatform[] = ['datadog', 'sentry', 'newrelic', 'fullstory', 'posthog', 'logrocket', 'amplitude', 'mixpanel'];

// Helper to get platform display info
function getPlatformDisplayInfo(platform: IntegrationPlatform) {
  const meta = platformMetadata[platform];
  const names: Record<IntegrationPlatform, string> = {
    github: 'GitHub Actions',
    gitlab: 'GitLab CI/CD',
    slack: 'Slack Notifications',
    discord: 'Discord Notifications',
    jira: 'Jira',
    linear: 'Linear',
    webhook: 'Webhooks (n8n/Zapier)',
    vercel: 'Vercel',
    netlify: 'Netlify',
    datadog: 'Datadog',
    sentry: 'Sentry',
    newrelic: 'New Relic',
    fullstory: 'FullStory',
    posthog: 'PostHog',
    logrocket: 'LogRocket',
    amplitude: 'Amplitude',
    mixpanel: 'Mixpanel',
  };
  const descriptions: Record<IntegrationPlatform, string> = {
    github: 'Run Argus tests on PRs and get results as check status',
    gitlab: 'Integrate Argus with GitLab merge request pipelines',
    slack: 'Get Argus test results and alerts in Slack channels',
    discord: 'Send test alerts and reports to Discord channels',
    jira: 'Auto-create Jira issues for test failures and track fixes',
    linear: 'Create Linear issues and track testing in your cycles',
    webhook: 'Trigger Argus tests from any automation platform',
    vercel: 'Test preview deployments and production on Vercel',
    netlify: 'Test deploy previews and production on Netlify',
    datadog: 'RUM, APM, and Log Analytics',
    sentry: 'Error Tracking & Performance',
    newrelic: 'Full-Stack Observability',
    fullstory: 'Digital Experience Intelligence',
    posthog: 'Product Analytics & Session Recording',
    logrocket: 'Session Replay & Error Tracking',
    amplitude: 'Product & Behavioral Analytics',
    mixpanel: 'Product Analytics',
  };
  return {
    name: names[platform],
    description: descriptions[platform],
    ...meta,
  };
}

// Format relative time
function formatRelativeTime(dateString: string | null | undefined): string {
  if (!dateString) return 'Never';
  const date = new Date(dateString);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);

  if (diffMinutes < 1) return 'Just now';
  if (diffMinutes < 60) return `${diffMinutes} min ago`;
  const diffHours = Math.floor(diffMinutes / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

// ============================================================================
// Main Component
// ============================================================================

export default function IntegrationsPage() {
  // Data from API
  const { data: integrationsData, isLoading, error } = useIntegrations();
  const stats = useIntegrationStats();

  // Mutations
  const connectMutation = useConnectIntegration();
  const disconnectMutation = useDisconnectIntegration();
  const testMutation = useTestIntegration();
  const syncMutation = useSyncIntegration();
  const syncAllMutation = useSyncAllIntegrations();

  // AI Generation data and mutations
  const { data: errorsData, isLoading: errorsLoading } = useIntegrationErrors();
  const { data: sessionsData, isLoading: sessionsLoading } = useIntegrationSessions();
  const errorToTestMutation = useErrorToTest();
  const sessionToTestMutation = useSessionToTest();
  const bulkGenerateMutation = useBulkGenerateTests();

  // Local UI state
  const [selectedPlatform, setSelectedPlatform] = useState<IntegrationPlatform | null>(null);
  const [selectedCicdPlatform, setSelectedCicdPlatform] = useState<IntegrationPlatform>('github');
  const [copied, setCopied] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [activeTab, setActiveTab] = useState<'cicd' | 'observability' | 'ai-generation'>('observability');

  // Form state for connection
  const [formData, setFormData] = useState<ConnectIntegrationRequest>({});

  // AI Generation state
  const [selectedErrors, setSelectedErrors] = useState<Set<string>>(new Set());
  const [selectedSessions, setSelectedSessions] = useState<Set<string>>(new Set());
  const [generatedTest, setGeneratedTest] = useState<GeneratedTest | null>(null);
  const [showTestPreview, setShowTestPreview] = useState(false);

  // Get integration data for a platform
  const getIntegration = useCallback((platform: IntegrationPlatform): Integration | undefined => {
    return integrationsData?.integrations.find(i => i.platform === platform);
  }, [integrationsData]);

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleConnect = async (platform: IntegrationPlatform) => {
    try {
      const result = await connectMutation.mutateAsync({ platform, config: formData });

      // If OAuth, redirect to OAuth URL
      if (result.oauth_url) {
        window.location.href = result.oauth_url;
        return;
      }

      toast.success({
        title: 'Integration connected',
        description: result.message,
      });
      setSelectedPlatform(null);
      setFormData({});
    } catch (err) {
      toast.error({
        title: 'Connection failed',
        description: err instanceof Error ? err.message : 'Failed to connect integration',
      });
    }
  };

  const handleDisconnect = async (platform: IntegrationPlatform) => {
    try {
      const result = await disconnectMutation.mutateAsync(platform);
      toast.success({
        title: 'Integration disconnected',
        description: result.message,
      });
      setSelectedPlatform(null);
    } catch (err) {
      toast.error({
        title: 'Disconnect failed',
        description: err instanceof Error ? err.message : 'Failed to disconnect integration',
      });
    }
  };

  const handleTest = async (platform: IntegrationPlatform) => {
    try {
      const result = await testMutation.mutateAsync(platform);
      if (result.success) {
        toast.success({
          title: 'Connection successful',
          description: result.details?.latency_ms
            ? `Latency: ${result.details.latency_ms}ms`
            : result.message,
        });
      } else {
        toast.error({
          title: 'Connection test failed',
          description: result.message,
        });
      }
    } catch (err) {
      toast.error({
        title: 'Test failed',
        description: err instanceof Error ? err.message : 'Failed to test connection',
      });
    }
  };

  const handleSync = async (platform: IntegrationPlatform) => {
    try {
      const result = await syncMutation.mutateAsync(platform);
      toast.success({
        title: 'Sync started',
        description: result.message,
      });
    } catch (err) {
      toast.error({
        title: 'Sync failed',
        description: err instanceof Error ? err.message : 'Failed to sync integration',
      });
    }
  };

  const handleSyncAll = async () => {
    try {
      const result = await syncAllMutation.mutateAsync();
      toast.success({
        title: 'Syncing all integrations',
        description: result.message,
      });
    } catch (err) {
      toast.error({
        title: 'Sync failed',
        description: err instanceof Error ? err.message : 'Failed to sync all integrations',
      });
    }
  };

  // AI Test Generation handlers
  const handleGenerateFromError = async (error: IntegrationError) => {
    try {
      const result = await errorToTestMutation.mutateAsync({
        error_id: error.id,
        platform: error.platform,
      });
      setGeneratedTest(result);
      setShowTestPreview(true);
      toast.success({
        title: 'Test generated',
        description: `Created regression test: ${result.name}`,
      });
    } catch (err) {
      toast.error({
        title: 'Generation failed',
        description: err instanceof Error ? err.message : 'Failed to generate test from error',
      });
    }
  };

  const handleGenerateFromSession = async (session: IntegrationSession) => {
    try {
      const result = await sessionToTestMutation.mutateAsync({
        session_id: session.id,
        platform: session.platform,
      });
      setGeneratedTest(result);
      setShowTestPreview(true);
      toast.success({
        title: 'Test generated',
        description: `Created E2E test: ${result.name}`,
      });
    } catch (err) {
      toast.error({
        title: 'Generation failed',
        description: err instanceof Error ? err.message : 'Failed to generate test from session',
      });
    }
  };

  const handleBulkGenerate = async (type: 'error' | 'session') => {
    const items = type === 'error'
      ? Array.from(selectedErrors).map(id => {
          const err = errorsData?.errors.find(e => e.id === id);
          return { id, platform: err?.platform || '' };
        })
      : Array.from(selectedSessions).map(id => {
          const sess = sessionsData?.sessions.find(s => s.id === id);
          return { id, platform: sess?.platform || '' };
        });

    if (items.length === 0) {
      toast.error({
        title: 'No items selected',
        description: `Please select at least one ${type} to generate tests from`,
      });
      return;
    }

    try {
      const result = await bulkGenerateMutation.mutateAsync({
        items,
        source_type: type,
      });
      toast.success({
        title: 'Bulk generation complete',
        description: `${result.total_generated} tests generated, ${result.total_failed} failed`,
      });
      // Clear selections
      if (type === 'error') setSelectedErrors(new Set());
      else setSelectedSessions(new Set());
    } catch (err) {
      toast.error({
        title: 'Bulk generation failed',
        description: err instanceof Error ? err.message : 'Failed to generate tests',
      });
    }
  };

  const toggleErrorSelection = (id: string) => {
    setSelectedErrors(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleSessionSelection = (id: string) => {
    setSelectedSessions(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Selected integration data for modals
  const selectedIntegration = selectedPlatform ? getIntegration(selectedPlatform) : null;
  const selectedDisplayInfo = selectedPlatform ? getPlatformDisplayInfo(selectedPlatform) : null;

  // Selected CI/CD integration
  const selectedCicdIntegration = getIntegration(selectedCicdPlatform);
  const selectedCicdDisplayInfo = getPlatformDisplayInfo(selectedCicdPlatform);

  // Calculate stats from real data
  const connectedObservability = observabilityPlatforms.filter(p => getIntegration(p)?.connected).length;
  const totalDataPoints = integrationsData?.integrations
    .filter(i => observabilityPlatforms.includes(i.platform as IntegrationPlatform))
    .reduce((sum, i) => sum + (i.data_points || 0), 0) || 0;

  const isSyncing = syncAllMutation.isPending || stats.syncing > 0;

  return (
    <div className="flex min-h-screen overflow-x-hidden">
      <Sidebar />
      <main className="flex-1 lg:ml-64 min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-6">
          <div className="flex-1">
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <Zap className="h-5 w-5 text-primary" />
              Integrations
            </h1>
            <p className="text-sm text-muted-foreground">
              Connect observability platforms and CI/CD tools
            </p>
          </div>
          <Button onClick={handleSyncAll} disabled={isSyncing}>
            {isSyncing ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Syncing...
              </>
            ) : (
              <>
                <RefreshCw className="mr-2 h-4 w-4" />
                Sync All
              </>
            )}
          </Button>
        </header>

        <div className="p-6 space-y-6">
          {/* Error State */}
          {error && (
            <Card className="border-destructive bg-destructive/5">
              <CardContent className="pt-6">
                <div className="flex items-center gap-3">
                  <AlertCircle className="h-5 w-5 text-destructive" />
                  <div>
                    <p className="font-medium text-destructive">Failed to load integrations</p>
                    <p className="text-sm text-muted-foreground">
                      {error instanceof Error ? error.message : 'An error occurred'}
                    </p>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tab Navigation */}
          <div className="flex gap-2 border-b">
            <button
              onClick={() => setActiveTab('observability')}
              className={cn(
                'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                activeTab === 'observability'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <Sparkles className="inline-block mr-2 h-4 w-4" />
              Observability Platforms
            </button>
            <button
              onClick={() => setActiveTab('cicd')}
              className={cn(
                'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                activeTab === 'cicd'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <Github className="inline-block mr-2 h-4 w-4" />
              CI/CD & Notifications
            </button>
            <button
              onClick={() => setActiveTab('ai-generation')}
              className={cn(
                'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                activeTab === 'ai-generation'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <Wand2 className="inline-block mr-2 h-4 w-4" />
              AI Test Generation
            </button>
          </div>

          <AnimatePresence mode="wait">
            {activeTab === 'observability' ? (
              <motion.div
                key="observability"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* Connected Platforms Summary */}
                <Card className="bg-gradient-to-r from-primary/5 via-purple-500/5 to-blue-500/5 border-primary/20">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          <Sparkles className="h-5 w-5 text-primary" />
                          AI-Powered Production Intelligence
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Connect your observability stack. AI automatically learns from real user behavior.
                        </p>
                      </div>
                      <div className="text-right">
                        {isLoading ? (
                          <Skeleton className="h-10 w-24" />
                        ) : (
                          <>
                            <div className="text-3xl font-bold text-primary">{totalDataPoints.toLocaleString()}</div>
                            <div className="text-sm text-muted-foreground">data points synced</div>
                          </>
                        )}
                      </div>
                    </div>
                    <div className="flex gap-4 mt-4">
                      <div className="flex items-center gap-2">
                        <CheckCircle className="h-4 w-4 text-green-500" />
                        {isLoading ? (
                          <Skeleton className="h-4 w-32" />
                        ) : (
                          <span className="text-sm">{connectedObservability} platforms connected</span>
                        )}
                      </div>
                      {stats.syncing > 0 && (
                        <div className="flex items-center gap-2">
                          <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                          <span className="text-sm">{stats.syncing} syncing</span>
                        </div>
                      )}
                      {stats.syncing === 0 && connectedObservability > 0 && (
                        <div className="flex items-center gap-2">
                          <Activity className="h-4 w-4 text-blue-500" />
                          <span className="text-sm">Real-time sync enabled</span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                {/* Observability Platforms Grid */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {isLoading ? (
                    // Loading skeletons
                    Array.from({ length: 8 }).map((_, i) => (
                      <Skeleton key={i} className="h-40 rounded-lg" />
                    ))
                  ) : (
                    observabilityPlatforms.map((platform, index) => {
                      const integration = getIntegration(platform);
                      const displayInfo = getPlatformDisplayInfo(platform);
                      const IconComponent = displayInfo.icon;
                      const isConnected = integration?.connected || false;
                      const isSyncingPlatform = integration?.sync_status === 'syncing';

                      return (
                        <motion.button
                          key={platform}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.05 }}
                          onClick={() => setSelectedPlatform(platform)}
                          className={cn(
                            'p-4 rounded-lg border text-left transition-all hover:shadow-md',
                            isConnected
                              ? 'border-green-500/30 bg-green-500/5'
                              : 'hover:bg-accent/50'
                          )}
                        >
                          <div className="flex items-center justify-between mb-3">
                            <div className={cn(
                              'p-2 rounded-lg',
                              isConnected
                                ? `bg-${displayInfo.color}-500/10`
                                : 'bg-muted'
                            )}>
                              <IconComponent className={cn(
                                'h-5 w-5',
                                isConnected ? `text-${displayInfo.color}-500` : 'text-muted-foreground'
                              )} />
                            </div>
                            {isSyncingPlatform ? (
                              <Loader2 className="h-5 w-5 text-blue-500 animate-spin" />
                            ) : isConnected ? (
                              <CheckCircle className="h-5 w-5 text-green-500" />
                            ) : (
                              <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
                                Not connected
                              </span>
                            )}
                          </div>
                          <div className="font-medium">{displayInfo.name}</div>
                          <div className="text-xs text-muted-foreground mt-1">{displayInfo.description}</div>
                          {isConnected && (
                            <div className="mt-3 pt-3 border-t flex items-center justify-between text-xs">
                              <span className="text-green-500">{(integration?.data_points || 0).toLocaleString()} records</span>
                              <span className="text-muted-foreground">{formatRelativeTime(integration?.last_sync_at)}</span>
                            </div>
                          )}
                        </motion.button>
                      );
                    })
                  )}
                </div>

                {/* Platform Connection Modal */}
                <AnimatePresence>
                  {selectedPlatform && selectedDisplayInfo && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center"
                      onClick={() => {
                        setSelectedPlatform(null);
                        setFormData({});
                      }}
                    >
                      <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-card border rounded-xl shadow-xl w-full max-w-lg p-6"
                      >
                        <div className="flex items-center gap-3 mb-6">
                          <div className={cn('p-3 rounded-lg', `bg-${selectedDisplayInfo.color}-500/10`)}>
                            <selectedDisplayInfo.icon className={cn('h-6 w-6', `text-${selectedDisplayInfo.color}-500`)} />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold">{selectedDisplayInfo.name}</h3>
                            <p className="text-sm text-muted-foreground">{selectedDisplayInfo.description}</p>
                          </div>
                        </div>

                        {selectedIntegration?.connected ? (
                          <div className="space-y-4">
                            <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/30">
                              <div className="flex items-center gap-2 text-green-500 font-medium">
                                <CheckCircle className="h-4 w-4" />
                                Connected
                              </div>
                              <p className="text-sm text-muted-foreground mt-1">
                                Last synced: {formatRelativeTime(selectedIntegration.last_sync_at)}
                              </p>
                              {selectedIntegration.data_points && (
                                <p className="text-sm text-muted-foreground">
                                  {selectedIntegration.data_points.toLocaleString()} data points synced
                                </p>
                              )}
                            </div>

                            <div>
                              <h4 className="font-medium mb-2">Synced Features</h4>
                              <div className="flex flex-wrap gap-2">
                                {(selectedIntegration.features || selectedDisplayInfo.defaultFeatures).map((feature) => (
                                  <span
                                    key={feature}
                                    className="px-2 py-1 text-xs rounded-full bg-primary/10 text-primary"
                                  >
                                    {feature}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => handleSync(selectedPlatform)}
                                disabled={syncMutation.isPending || selectedIntegration.sync_status === 'syncing'}
                              >
                                {syncMutation.isPending || selectedIntegration.sync_status === 'syncing' ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Syncing...
                                  </>
                                ) : (
                                  <>
                                    <RefreshCw className="mr-2 h-4 w-4" />
                                    Sync Now
                                  </>
                                )}
                              </Button>
                              <Button
                                variant="outline"
                                onClick={() => handleTest(selectedPlatform)}
                                disabled={testMutation.isPending}
                              >
                                {testMutation.isPending ? (
                                  <Loader2 className="h-4 w-4 animate-spin" />
                                ) : (
                                  'Test'
                                )}
                              </Button>
                            </div>

                            <div className="flex gap-2">
                              <Button
                                variant="outline"
                                className="flex-1"
                                onClick={() => {
                                  setSelectedPlatform(null);
                                  setFormData({});
                                }}
                              >
                                Close
                              </Button>
                              <Button
                                variant="destructive"
                                className="flex-1"
                                onClick={() => handleDisconnect(selectedPlatform)}
                                disabled={disconnectMutation.isPending}
                              >
                                {disconnectMutation.isPending ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Disconnecting...
                                  </>
                                ) : (
                                  'Disconnect'
                                )}
                              </Button>
                            </div>
                          </div>
                        ) : (
                          <div className="space-y-4">
                            {selectedIntegration?.auth_type === 'oauth' ? (
                              <Button
                                className="w-full"
                                onClick={() => handleConnect(selectedPlatform)}
                                disabled={connectMutation.isPending}
                              >
                                {connectMutation.isPending ? (
                                  <>
                                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                    Connecting...
                                  </>
                                ) : (
                                  <>
                                    <ExternalLink className="mr-2 h-4 w-4" />
                                    Connect with OAuth
                                  </>
                                )}
                              </Button>
                            ) : (
                              <div className="space-y-3">
                                <div>
                                  <label className="text-sm font-medium">API Key</label>
                                  <div className="relative mt-1">
                                    <Input
                                      type={showApiKey ? 'text' : 'password'}
                                      placeholder="Enter your API key"
                                      className="pr-10"
                                      value={formData.api_key || ''}
                                      onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                                    />
                                    <button
                                      type="button"
                                      onClick={() => setShowApiKey(!showApiKey)}
                                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                                    >
                                      {showApiKey ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                                    </button>
                                  </div>
                                </div>
                                {selectedPlatform === 'datadog' && (
                                  <>
                                    <div>
                                      <label className="text-sm font-medium">Application Key</label>
                                      <Input
                                        type="password"
                                        placeholder="Enter your application key"
                                        className="mt-1"
                                        value={formData.application_key || ''}
                                        onChange={(e) => setFormData({ ...formData, application_key: e.target.value })}
                                      />
                                    </div>
                                    <div>
                                      <label className="text-sm font-medium">Site</label>
                                      <Input
                                        placeholder="datadoghq.com"
                                        className="mt-1"
                                        value={formData.site || ''}
                                        onChange={(e) => setFormData({ ...formData, site: e.target.value })}
                                      />
                                    </div>
                                  </>
                                )}
                                <Button
                                  className="w-full"
                                  onClick={() => handleConnect(selectedPlatform)}
                                  disabled={connectMutation.isPending || !formData.api_key}
                                >
                                  {connectMutation.isPending ? (
                                    <>
                                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                      Connecting...
                                    </>
                                  ) : (
                                    <>
                                      <Key className="mr-2 h-4 w-4" />
                                      Connect
                                    </>
                                  )}
                                </Button>
                              </div>
                            )}

                            <div>
                              <h4 className="font-medium mb-2">What we&apos;ll sync</h4>
                              <div className="flex flex-wrap gap-2">
                                {selectedDisplayInfo.defaultFeatures.map((feature) => (
                                  <span
                                    key={feature}
                                    className="px-2 py-1 text-xs rounded-full bg-muted text-muted-foreground"
                                  >
                                    {feature}
                                  </span>
                                ))}
                              </div>
                            </div>

                            <p className="text-xs text-muted-foreground">
                              Your credentials are encrypted and stored securely. We only read data, never write.
                            </p>
                          </div>
                        )}
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* AI Features Card */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      What AI Does With Your Data
                    </CardTitle>
                    <CardDescription>
                      Zero configuration required - AI automatically learns from connected platforms
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                      <div className="p-4 rounded-lg border">
                        <Video className="h-6 w-6 text-blue-500 mb-2" />
                        <h4 className="font-medium">Session to Test</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          Converts real user sessions into automated tests
                        </p>
                      </div>
                      <div className="p-4 rounded-lg border">
                        <Bug className="h-6 w-6 text-red-500 mb-2" />
                        <h4 className="font-medium">Error to Regression</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          Auto-generates tests to prevent error recurrence
                        </p>
                      </div>
                      <div className="p-4 rounded-lg border">
                        <AlertTriangle className="h-6 w-6 text-yellow-500 mb-2" />
                        <h4 className="font-medium">Predict Failures</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          Detects patterns that indicate incoming issues
                        </p>
                      </div>
                      <div className="p-4 rounded-lg border">
                        <BarChart3 className="h-6 w-6 text-green-500 mb-2" />
                        <h4 className="font-medium">Coverage Gaps</h4>
                        <p className="text-xs text-muted-foreground mt-1">
                          Identifies untested areas based on real traffic
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ) : activeTab === 'cicd' ? (
              <motion.div
                key="cicd"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* CI/CD Integration Cards */}
                <div className="grid grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-4">
                  {isLoading ? (
                    Array.from({ length: 7 }).map((_, i) => (
                      <Skeleton key={i} className="h-32 rounded-lg" />
                    ))
                  ) : (
                    cicdPlatforms.map((platform) => {
                      const integration = getIntegration(platform);
                      const displayInfo = getPlatformDisplayInfo(platform);
                      const IconComponent = displayInfo.icon;
                      const isConnected = integration?.connected || false;

                      return (
                        <button
                          key={platform}
                          onClick={() => setSelectedCicdPlatform(platform)}
                          className={cn(
                            'p-4 rounded-lg border text-left transition-colors',
                            selectedCicdPlatform === platform
                              ? 'border-primary bg-primary/5'
                              : 'hover:bg-accent/50'
                          )}
                        >
                          <div className="flex items-center gap-3 mb-2">
                            <div className={cn(
                              'p-2 rounded-lg',
                              isConnected ? 'bg-green-500/10' : 'bg-muted'
                            )}>
                              <IconComponent className={cn(
                                'h-5 w-5',
                                isConnected ? 'text-green-500' : 'text-muted-foreground'
                              )} />
                            </div>
                            {isConnected && (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            )}
                          </div>
                          <div className="font-medium">{displayInfo.name}</div>
                          <div className="text-sm text-muted-foreground line-clamp-2">
                            {displayInfo.description}
                          </div>
                        </button>
                      );
                    })
                  )}
                </div>

                {/* Configuration */}
                <div className="grid grid-cols-2 gap-6">
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <selectedCicdDisplayInfo.icon className="h-5 w-5" />
                        {selectedCicdDisplayInfo.name} Setup
                      </CardTitle>
                      <CardDescription>{selectedCicdDisplayInfo.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {selectedCicdPlatform === 'slack' ? (
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-medium">Webhook URL</label>
                            <Input
                              placeholder="https://hooks.slack.com/services/..."
                              className="mt-1"
                              value={formData.webhook_url || ''}
                              onChange={(e) => setFormData({ ...formData, webhook_url: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium">Channel</label>
                            <Input
                              placeholder="#engineering-alerts"
                              className="mt-1"
                              value={formData.channel || ''}
                              onChange={(e) => setFormData({ ...formData, channel: e.target.value })}
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleConnect(selectedCicdPlatform)}
                              disabled={connectMutation.isPending || !formData.webhook_url}
                            >
                              {connectMutation.isPending ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Connecting...
                                </>
                              ) : (
                                'Connect Slack'
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => handleTest(selectedCicdPlatform)}
                              disabled={testMutation.isPending || !selectedCicdIntegration?.connected}
                            >
                              {testMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                'Test Connection'
                              )}
                            </Button>
                          </div>
                        </div>
                      ) : selectedCicdPlatform === 'discord' ? (
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-medium">Discord Webhook URL</label>
                            <Input
                              placeholder="https://discord.com/api/webhooks/..."
                              className="mt-1"
                              value={formData.webhook_url || ''}
                              onChange={(e) => setFormData({ ...formData, webhook_url: e.target.value })}
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium">Bot Name (optional)</label>
                            <Input
                              placeholder="Argus Bot"
                              className="mt-1"
                              value={formData.bot_name || ''}
                              onChange={(e) => setFormData({ ...formData, bot_name: e.target.value })}
                            />
                          </div>
                          <div className="space-y-2">
                            <label className="text-sm font-medium">Notification Events</label>
                            <div className="grid grid-cols-2 gap-2">
                              <label className="flex items-center gap-2 text-sm">
                                <input
                                  type="checkbox"
                                  className="rounded"
                                  checked={formData.notify_on_failure ?? true}
                                  onChange={(e) => setFormData({ ...formData, notify_on_failure: e.target.checked })}
                                />
                                Test Failures
                              </label>
                              <label className="flex items-center gap-2 text-sm">
                                <input
                                  type="checkbox"
                                  className="rounded"
                                  checked={formData.notify_on_success ?? false}
                                  onChange={(e) => setFormData({ ...formData, notify_on_success: e.target.checked })}
                                />
                                Test Passes
                              </label>
                              <label className="flex items-center gap-2 text-sm">
                                <input
                                  type="checkbox"
                                  className="rounded"
                                  checked={formData.notify_on_healing ?? true}
                                  onChange={(e) => setFormData({ ...formData, notify_on_healing: e.target.checked })}
                                />
                                Self-Healing Events
                              </label>
                            </div>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleConnect(selectedCicdPlatform)}
                              disabled={connectMutation.isPending || !formData.webhook_url}
                            >
                              {connectMutation.isPending ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Connecting...
                                </>
                              ) : (
                                'Connect Discord'
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => handleTest(selectedCicdPlatform)}
                              disabled={testMutation.isPending || !selectedCicdIntegration?.connected}
                            >
                              {testMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                'Test Webhook'
                              )}
                            </Button>
                          </div>
                        </div>
                      ) : selectedCicdPlatform === 'jira' ? (
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-medium">Jira Instance URL</label>
                            <Input
                              placeholder="https://your-company.atlassian.net"
                              className="mt-1"
                              value={formData.instance_url || ''}
                              onChange={(e) => setFormData({ ...formData, instance_url: e.target.value })}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm font-medium">Email</label>
                              <Input
                                type="email"
                                placeholder="you@company.com"
                                className="mt-1"
                                value={formData.email || ''}
                                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">API Token</label>
                              <Input
                                type="password"
                                placeholder="Your Jira API token"
                                className="mt-1"
                                value={formData.api_key || ''}
                                onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                              />
                            </div>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm font-medium">Project Key</label>
                              <Input
                                placeholder="ARGUS"
                                className="mt-1"
                                value={formData.project_key || ''}
                                onChange={(e) => setFormData({ ...formData, project_key: e.target.value })}
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">Issue Type</label>
                              <select
                                className="mt-1 w-full px-3 py-2 rounded-md border bg-background"
                                value={formData.issue_type || 'Bug'}
                                onChange={(e) => setFormData({ ...formData, issue_type: e.target.value })}
                              >
                                <option>Bug</option>
                                <option>Task</option>
                                <option>Story</option>
                                <option>Sub-task</option>
                              </select>
                            </div>
                          </div>
                          <label className="flex items-center gap-2 text-sm">
                            <input
                              type="checkbox"
                              className="rounded"
                              checked={formData.auto_create_issues ?? true}
                              onChange={(e) => setFormData({ ...formData, auto_create_issues: e.target.checked })}
                            />
                            Auto-create issues on test failures
                          </label>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleConnect(selectedCicdPlatform)}
                              disabled={connectMutation.isPending || !formData.instance_url || !formData.api_key}
                            >
                              {connectMutation.isPending ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Connecting...
                                </>
                              ) : (
                                'Connect Jira'
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => handleTest(selectedCicdPlatform)}
                              disabled={testMutation.isPending || !selectedCicdIntegration?.connected}
                            >
                              {testMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                'Test Connection'
                              )}
                            </Button>
                          </div>
                        </div>
                      ) : selectedCicdPlatform === 'linear' ? (
                        <div className="space-y-4">
                          <div>
                            <label className="text-sm font-medium">Linear API Key</label>
                            <Input
                              type="password"
                              placeholder="lin_api_..."
                              className="mt-1"
                              value={formData.api_key || ''}
                              onChange={(e) => setFormData({ ...formData, api_key: e.target.value })}
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              Get your API key from Linear Settings &gt; API
                            </p>
                          </div>
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <label className="text-sm font-medium">Team</label>
                              <Input
                                placeholder="Team ID"
                                className="mt-1"
                                value={formData.team_id || ''}
                                onChange={(e) => setFormData({ ...formData, team_id: e.target.value })}
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">Default Priority</label>
                              <select
                                className="mt-1 w-full px-3 py-2 rounded-md border bg-background"
                                value={formData.default_priority || 3}
                                onChange={(e) => setFormData({ ...formData, default_priority: parseInt(e.target.value) })}
                              >
                                <option value="1">Urgent</option>
                                <option value="2">High</option>
                                <option value="3">Medium</option>
                                <option value="4">Low</option>
                              </select>
                            </div>
                          </div>
                          <div className="space-y-2">
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                className="rounded"
                                checked={formData.auto_create_issues ?? true}
                                onChange={(e) => setFormData({ ...formData, auto_create_issues: e.target.checked })}
                              />
                              Auto-create issues on test failures
                            </label>
                            <label className="flex items-center gap-2 text-sm">
                              <input
                                type="checkbox"
                                className="rounded"
                                checked={formData.link_to_runs ?? true}
                                onChange={(e) => setFormData({ ...formData, link_to_runs: e.target.checked })}
                              />
                              Link issues to test runs
                            </label>
                          </div>
                          <div className="flex gap-2">
                            <Button
                              onClick={() => handleConnect(selectedCicdPlatform)}
                              disabled={connectMutation.isPending || !formData.api_key}
                            >
                              {connectMutation.isPending ? (
                                <>
                                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                                  Connecting...
                                </>
                              ) : (
                                'Connect Linear'
                              )}
                            </Button>
                            <Button
                              variant="outline"
                              onClick={() => handleTest(selectedCicdPlatform)}
                              disabled={testMutation.isPending || !selectedCicdIntegration?.connected}
                            >
                              {testMutation.isPending ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                'Test Connection'
                              )}
                            </Button>
                          </div>
                        </div>
                      ) : (
                        selectedCicdDisplayInfo.configExample && (
                          <div className="relative">
                            <div className="absolute top-2 right-2">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => copyToClipboard(selectedCicdDisplayInfo.configExample!)}
                              >
                                {copied ? (
                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                ) : (
                                  <Copy className="h-4 w-4" />
                                )}
                              </Button>
                            </div>
                            <pre className="p-4 rounded-lg bg-muted overflow-x-auto text-xs">
                              <code>{selectedCicdDisplayInfo.configExample}</code>
                            </pre>
                          </div>
                        )
                      )}
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Zap className="h-5 w-5" />
                        SDK Usage
                      </CardTitle>
                      <CardDescription>
                        Use the SDK to integrate programmatically
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="relative">
                        <div className="absolute top-2 right-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(SDK_EXAMPLE)}
                          >
                            {copied ? (
                              <CheckCircle className="h-4 w-4 text-green-500" />
                            ) : (
                              <Copy className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        <pre className="p-4 rounded-lg bg-muted overflow-x-auto text-xs">
                          <code>{SDK_EXAMPLE}</code>
                        </pre>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <Button variant="outline" size="sm">
                          <ExternalLink className="mr-2 h-4 w-4" />
                          View Documentation
                        </Button>
                        <Button variant="outline" size="sm">
                          <Github className="mr-2 h-4 w-4" />
                          Example Project
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </div>

                {/* API Endpoint Reference */}
                <Card>
                  <CardHeader>
                    <CardTitle>API Endpoints</CardTitle>
                    <CardDescription>Direct API access for custom integrations</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-2 gap-4">
                      {[
                        { method: 'POST', endpoint: '/api/v1/tests/run', desc: 'Run test suite' },
                        { method: 'POST', endpoint: '/api/v1/tests/create', desc: 'Create test from NLP' },
                        { method: 'POST', endpoint: '/api/v1/discover', desc: 'Auto-discover app' },
                        { method: 'POST', endpoint: '/api/v1/visual/compare', desc: 'Visual comparison' },
                        { method: 'GET', endpoint: '/api/v1/jobs/{id}', desc: 'Get job status' },
                        { method: 'POST', endpoint: '/api/v1/webhooks/github', desc: 'GitHub webhook' },
                      ].map((api) => (
                        <div
                          key={api.endpoint}
                          className="flex items-center gap-3 p-3 rounded-lg border"
                        >
                          <span className={cn(
                            'px-2 py-0.5 rounded text-xs font-mono',
                            api.method === 'GET' ? 'bg-blue-500/10 text-blue-500' : 'bg-green-500/10 text-green-500'
                          )}>
                            {api.method}
                          </span>
                          <div className="flex-1">
                            <code className="text-sm">{api.endpoint}</code>
                            <div className="text-xs text-muted-foreground">{api.desc}</div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ) : activeTab === 'ai-generation' ? (
              <motion.div
                key="ai-generation"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className="space-y-6"
              >
                {/* AI Generation Header */}
                <Card className="bg-gradient-to-r from-purple-500/5 via-blue-500/5 to-green-500/5 border-purple-500/20">
                  <CardContent className="pt-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-lg font-semibold flex items-center gap-2">
                          <Wand2 className="h-5 w-5 text-purple-500" />
                          AI-Powered Test Generation
                        </h3>
                        <p className="text-sm text-muted-foreground mt-1">
                          Automatically generate tests from production errors and real user sessions
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="text-2xl font-bold text-purple-500">
                          {(errorsData?.total || 0) + (sessionsData?.total || 0)}
                        </div>
                        <div className="text-sm text-muted-foreground">items available</div>
                      </div>
                    </div>
                    <div className="flex gap-4 mt-4">
                      <div className="flex items-center gap-2">
                        <Bug className="h-4 w-4 text-red-500" />
                        <span className="text-sm">{errorsData?.total || 0} errors</span>
                      </div>
                      <div className="flex items-center gap-2">
                        <Video className="h-4 w-4 text-blue-500" />
                        <span className="text-sm">{sessionsData?.total || 0} sessions</span>
                      </div>
                      {(errorsData?.platforms?.length || 0) > 0 && (
                        <div className="flex items-center gap-2">
                          <Activity className="h-4 w-4 text-green-500" />
                          <span className="text-sm">
                            {[...new Set([...(errorsData?.platforms || []), ...(sessionsData?.platforms || [])])].length} platforms
                          </span>
                        </div>
                      )}
                    </div>
                  </CardContent>
                </Card>

                <div className="grid lg:grid-cols-2 gap-6">
                  {/* Error to Test Section */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <Bug className="h-5 w-5 text-red-500" />
                            Error to Test
                          </CardTitle>
                          <CardDescription>
                            Convert production errors into regression tests
                          </CardDescription>
                        </div>
                        {selectedErrors.size > 0 && (
                          <Button
                            size="sm"
                            onClick={() => handleBulkGenerate('error')}
                            disabled={bulkGenerateMutation.isPending}
                          >
                            {bulkGenerateMutation.isPending ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Plus className="mr-2 h-4 w-4" />
                            )}
                            Generate {selectedErrors.size} Tests
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {errorsLoading ? (
                        <div className="space-y-3">
                          {Array.from({ length: 3 }).map((_, i) => (
                            <Skeleton key={i} className="h-20 rounded-lg" />
                          ))}
                        </div>
                      ) : (errorsData?.errors?.length || 0) === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Bug className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p>No errors found from connected platforms</p>
                          <p className="text-sm mt-1">
                            Connect Sentry, Datadog, or New Relic to see errors
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3 max-h-[400px] overflow-y-auto">
                          {errorsData?.errors.map((error) => (
                            <div
                              key={error.id}
                              className={cn(
                                'p-4 rounded-lg border transition-colors cursor-pointer',
                                selectedErrors.has(error.id)
                                  ? 'border-purple-500 bg-purple-500/5'
                                  : 'hover:bg-accent/50'
                              )}
                              onClick={() => toggleErrorSelection(error.id)}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className={cn(
                                      'px-2 py-0.5 rounded text-xs font-medium',
                                      error.severity === 'error' || error.severity === 'fatal'
                                        ? 'bg-red-500/10 text-red-500'
                                        : error.severity === 'warning'
                                        ? 'bg-yellow-500/10 text-yellow-500'
                                        : 'bg-blue-500/10 text-blue-500'
                                    )}>
                                      {error.severity}
                                    </span>
                                    <span className="text-xs text-muted-foreground">
                                      {error.platform}
                                    </span>
                                  </div>
                                  <p className="font-medium text-sm line-clamp-2">
                                    {error.message}
                                  </p>
                                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <Activity className="h-3 w-3" />
                                      {error.occurrence_count} occurrences
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Users className="h-3 w-3" />
                                      {error.affected_users} users
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {formatRelativeTime(error.last_seen)}
                                    </span>
                                  </div>
                                </div>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="shrink-0"
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    handleGenerateFromError(error);
                                  }}
                                  disabled={errorToTestMutation.isPending}
                                >
                                  {errorToTestMutation.isPending ? (
                                    <Loader2 className="h-4 w-4 animate-spin" />
                                  ) : (
                                    <>
                                      <FlaskConical className="h-4 w-4 mr-1" />
                                      Generate
                                    </>
                                  )}
                                </Button>
                              </div>
                              {error.issue_url && (
                                <a
                                  href={error.issue_url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-xs text-primary hover:underline mt-2 inline-flex items-center gap-1"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  View in {error.platform}
                                  <ExternalLink className="h-3 w-3" />
                                </a>
                              )}
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>

                  {/* Session to Test Section */}
                  <Card>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle className="flex items-center gap-2">
                            <Video className="h-5 w-5 text-blue-500" />
                            Session to Test
                          </CardTitle>
                          <CardDescription>
                            Convert user sessions into E2E tests
                          </CardDescription>
                        </div>
                        {selectedSessions.size > 0 && (
                          <Button
                            size="sm"
                            onClick={() => handleBulkGenerate('session')}
                            disabled={bulkGenerateMutation.isPending}
                          >
                            {bulkGenerateMutation.isPending ? (
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            ) : (
                              <Plus className="mr-2 h-4 w-4" />
                            )}
                            Generate {selectedSessions.size} Tests
                          </Button>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent>
                      {sessionsLoading ? (
                        <div className="space-y-3">
                          {Array.from({ length: 3 }).map((_, i) => (
                            <Skeleton key={i} className="h-20 rounded-lg" />
                          ))}
                        </div>
                      ) : (sessionsData?.sessions?.length || 0) === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Video className="h-12 w-12 mx-auto mb-3 opacity-50" />
                          <p>No sessions found from connected platforms</p>
                          <p className="text-sm mt-1">
                            Connect FullStory, PostHog, or Datadog RUM to see sessions
                          </p>
                        </div>
                      ) : (
                        <div className="space-y-3 max-h-[400px] overflow-y-auto">
                          {sessionsData?.sessions.map((session) => (
                            <div
                              key={session.id}
                              className={cn(
                                'p-4 rounded-lg border transition-colors cursor-pointer',
                                selectedSessions.has(session.id)
                                  ? 'border-blue-500 bg-blue-500/5'
                                  : 'hover:bg-accent/50'
                              )}
                              onClick={() => toggleSessionSelection(session.id)}
                            >
                              <div className="flex items-start justify-between gap-3">
                                <div className="flex-1 min-w-0">
                                  <div className="flex items-center gap-2 mb-1">
                                    <span className="text-xs text-muted-foreground">
                                      {session.platform}
                                    </span>
                                    {session.has_errors && (
                                      <span className="px-2 py-0.5 rounded text-xs bg-red-500/10 text-red-500">
                                        Has Errors
                                      </span>
                                    )}
                                    {session.has_frustration && (
                                      <span className="px-2 py-0.5 rounded text-xs bg-yellow-500/10 text-yellow-500">
                                        Frustration
                                      </span>
                                    )}
                                  </div>
                                  <p className="font-medium text-sm">
                                    Session {session.id.slice(0, 8)}...
                                    {session.user_id && (
                                      <span className="text-muted-foreground ml-1">
                                        (User: {session.user_id.slice(0, 8)}...)
                                      </span>
                                    )}
                                  </p>
                                  <div className="flex items-center gap-4 mt-2 text-xs text-muted-foreground">
                                    <span className="flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      {Math.round(session.duration_ms / 1000)}s duration
                                    </span>
                                    <span className="flex items-center gap-1">
                                      <Activity className="h-3 w-3" />
                                      {session.page_views} pages
                                    </span>
                                    <span>
                                      {formatRelativeTime(session.started_at)}
                                    </span>
                                  </div>
                                </div>
                                <div className="flex items-center gap-2 shrink-0">
                                  {session.replay_url && (
                                    <Button
                                      size="sm"
                                      variant="ghost"
                                      asChild
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      <a
                                        href={session.replay_url}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                      >
                                        <Play className="h-4 w-4" />
                                      </a>
                                    </Button>
                                  )}
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleGenerateFromSession(session);
                                    }}
                                    disabled={sessionToTestMutation.isPending}
                                  >
                                    {sessionToTestMutation.isPending ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <>
                                        <FlaskConical className="h-4 w-4 mr-1" />
                                        Generate
                                      </>
                                    )}
                                  </Button>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </div>

                {/* Generated Test Preview Modal */}
                <AnimatePresence>
                  {showTestPreview && generatedTest && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center"
                      onClick={() => {
                        setShowTestPreview(false);
                        setGeneratedTest(null);
                      }}
                    >
                      <motion.div
                        initial={{ scale: 0.95, opacity: 0 }}
                        animate={{ scale: 1, opacity: 1 }}
                        exit={{ scale: 0.95, opacity: 0 }}
                        onClick={(e) => e.stopPropagation()}
                        className="bg-card border rounded-xl shadow-xl w-full max-w-2xl max-h-[80vh] overflow-y-auto p-6"
                      >
                        <div className="flex items-center gap-3 mb-6">
                          <div className="p-3 rounded-lg bg-green-500/10">
                            <CheckCircle className="h-6 w-6 text-green-500" />
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold">Test Generated Successfully</h3>
                            <p className="text-sm text-muted-foreground">
                              {generatedTest.source_type === 'error' ? 'Regression test' : 'E2E test'} from {generatedTest.source_platform}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-4">
                          <div>
                            <h4 className="font-medium mb-1">{generatedTest.name}</h4>
                            <p className="text-sm text-muted-foreground">{generatedTest.description}</p>
                          </div>

                          <div className="flex items-center gap-4 text-sm">
                            <span className={cn(
                              'px-2 py-1 rounded',
                              generatedTest.priority === 'critical'
                                ? 'bg-red-500/10 text-red-500'
                                : generatedTest.priority === 'high'
                                ? 'bg-orange-500/10 text-orange-500'
                                : 'bg-blue-500/10 text-blue-500'
                            )}>
                              {generatedTest.priority} priority
                            </span>
                            <span className="text-muted-foreground">
                              {Math.round(generatedTest.confidence * 100)}% confidence
                            </span>
                            <span className="text-muted-foreground">
                              {generatedTest.steps.length} steps
                            </span>
                          </div>

                          {generatedTest.preconditions.length > 0 && (
                            <div>
                              <h5 className="text-sm font-medium mb-2">Preconditions</h5>
                              <ul className="list-disc list-inside text-sm text-muted-foreground">
                                {generatedTest.preconditions.map((pre, i) => (
                                  <li key={i}>{pre}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          <div>
                            <h5 className="text-sm font-medium mb-2">Test Steps</h5>
                            <div className="space-y-2">
                              {generatedTest.steps.slice(0, 5).map((step, i) => (
                                <div key={i} className="flex items-start gap-3 text-sm">
                                  <span className="shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary flex items-center justify-center text-xs font-medium">
                                    {i + 1}
                                  </span>
                                  <div>
                                    <span className="font-mono text-xs text-purple-500">{step.action}</span>
                                    {step.target && <span className="text-muted-foreground ml-2">on {step.target}</span>}
                                    {step.value && <span className="text-muted-foreground ml-1">= &quot;{step.value}&quot;</span>}
                                  </div>
                                </div>
                              ))}
                              {generatedTest.steps.length > 5 && (
                                <p className="text-sm text-muted-foreground pl-9">
                                  ... and {generatedTest.steps.length - 5} more steps
                                </p>
                              )}
                            </div>
                          </div>

                          {generatedTest.assertions.length > 0 && (
                            <div>
                              <h5 className="text-sm font-medium mb-2">Assertions</h5>
                              <div className="space-y-1">
                                {generatedTest.assertions.slice(0, 3).map((assertion, i) => (
                                  <div key={i} className="text-sm text-muted-foreground flex items-start gap-2">
                                    <CheckCircle className="h-4 w-4 text-green-500 shrink-0 mt-0.5" />
                                    <span>{assertion.description || `${assertion.type}: ${assertion.target}`}</span>
                                  </div>
                                ))}
                                {generatedTest.assertions.length > 3 && (
                                  <p className="text-sm text-muted-foreground pl-6">
                                    ... and {generatedTest.assertions.length - 3} more assertions
                                  </p>
                                )}
                              </div>
                            </div>
                          )}

                          <div className="pt-4 border-t text-sm text-muted-foreground">
                            <p>{generatedTest.rationale}</p>
                          </div>
                        </div>

                        <div className="flex gap-2 mt-6">
                          <Button
                            variant="outline"
                            className="flex-1"
                            onClick={() => {
                              setShowTestPreview(false);
                              setGeneratedTest(null);
                            }}
                          >
                            Close
                          </Button>
                          {generatedTest.test_id && (
                            <Button className="flex-1" asChild>
                              <a href={`/tests/${generatedTest.test_id}`}>
                                View Test
                                <ChevronRight className="ml-2 h-4 w-4" />
                              </a>
                            </Button>
                          )}
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* How It Works */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Sparkles className="h-5 w-5 text-primary" />
                      How AI Test Generation Works
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="grid md:grid-cols-3 gap-6">
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-purple-500 font-medium">
                          <span className="w-6 h-6 rounded-full bg-purple-500/10 flex items-center justify-center text-sm">1</span>
                          Connect Platforms
                        </div>
                        <p className="text-sm text-muted-foreground pl-8">
                          Link your observability tools like Sentry, FullStory, or Datadog to import errors and sessions.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-blue-500 font-medium">
                          <span className="w-6 h-6 rounded-full bg-blue-500/10 flex items-center justify-center text-sm">2</span>
                          AI Analyzes Data
                        </div>
                        <p className="text-sm text-muted-foreground pl-8">
                          Claude AI examines error stack traces and session recordings to understand user intent and failure patterns.
                        </p>
                      </div>
                      <div className="space-y-2">
                        <div className="flex items-center gap-2 text-green-500 font-medium">
                          <span className="w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center text-sm">3</span>
                          Tests Generated
                        </div>
                        <p className="text-sm text-muted-foreground pl-8">
                          Intelligent tests are created with proper steps, assertions, and test data that you can run immediately.
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            ) : null}
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
}
