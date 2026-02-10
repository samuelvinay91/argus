'use client';

import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Github,
  Slack,
  Webhook,
  CheckCircle,
  ExternalLink,
  Loader2,
  Key,
  Eye,
  EyeOff,
  RefreshCw,
  Search,
  ChevronDown,
  Plus,
  Settings,
  Circle,
  X,
  Bug,
  Activity,
  LineChart,
  Video,
  BarChart3,
  Zap,
  GitBranch,
  Cloud,
  Database,
  Flag,
  TestTube,
  MessageSquare,
  Bell,
  Gauge,
  Code,
  Bot,
  Layers,
  Server,
  Rocket,
  Terminal,
  Globe,
  Shield,
  Timer,
  Users,
  FileCode,
  Workflow,
  Boxes,
  Cpu,
  Radio,
  Sparkles,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from '@/lib/hooks/useToast';
import {
  useIntegrations,
  useConnectIntegration,
  useDisconnectIntegration,
  useTestIntegration,
  type IntegrationPlatform,
  type ConnectIntegrationRequest,
} from '@/lib/hooks/use-integrations';

// ============================================================================
// Integration Categories
// ============================================================================

export type IntegrationCategory =
  | 'all'
  | 'source_code'
  | 'issue_tracking'
  | 'chat'
  | 'cicd'
  | 'deployment'
  | 'observability'
  | 'session_replay'
  | 'analytics'
  | 'incident_management'
  | 'feature_flags'
  | 'testing'
  | 'webhooks'
  | 'ai_agents'
  | 'database';

const categories: { value: IntegrationCategory; label: string; icon: React.ComponentType<{ className?: string; size?: number }> }[] = [
  { value: 'all', label: 'All Categories', icon: Layers },
  { value: 'source_code', label: 'Source Code Management', icon: GitBranch },
  { value: 'issue_tracking', label: 'Issue Tracking', icon: Bug },
  { value: 'chat', label: 'Chat & Notifications', icon: MessageSquare },
  { value: 'cicd', label: 'CI/CD', icon: Rocket },
  { value: 'deployment', label: 'Deployment', icon: Cloud },
  { value: 'observability', label: 'Observability', icon: Activity },
  { value: 'session_replay', label: 'Session Replay', icon: Video },
  { value: 'analytics', label: 'Analytics', icon: BarChart3 },
  { value: 'incident_management', label: 'Incident Management', icon: Bell },
  { value: 'feature_flags', label: 'Feature Flags', icon: Flag },
  { value: 'testing', label: 'Testing', icon: TestTube },
  { value: 'webhooks', label: 'Webhooks & Automation', icon: Webhook },
  { value: 'ai_agents', label: 'AI & Coding Agents', icon: Bot },
  { value: 'database', label: 'Database', icon: Database },
];

// ============================================================================
// Integration Metadata
// ============================================================================

interface IntegrationMeta {
  id: IntegrationPlatform;
  name: string;
  description: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  color: string;
  categories: IntegrationCategory[];
  authType: 'oauth' | 'api_key' | 'webhook';
  docsUrl?: string;
  comingSoon?: boolean;
}

// Custom SVG icons for platforms that don't have Lucide equivalents
const GitLabIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M22.65 14.39L12 22.13 1.35 14.39a.84.84 0 0 1-.3-.94l1.22-3.78 2.44-7.51A.42.42 0 0 1 4.82 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.49h8.1l2.44-7.51A.42.42 0 0 1 18.6 2a.43.43 0 0 1 .58 0 .42.42 0 0 1 .11.18l2.44 7.51L23 13.45a.84.84 0 0 1-.35.94z"/>
  </svg>
);

const BitbucketIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M.778 1.211a.768.768 0 00-.768.892l3.263 19.81c.084.5.515.868 1.022.873H19.95a.772.772 0 00.77-.646l3.27-20.03a.768.768 0 00-.768-.893zM14.52 15.53H9.522L8.17 8.466h7.561z"/>
  </svg>
);

const JiraIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M11.571 11.513H0a5.218 5.218 0 005.232 5.215h2.13v2.057A5.215 5.215 0 0012.575 24V12.518a1.005 1.005 0 00-1.005-1.005zm5.723-5.756H5.736a5.215 5.215 0 005.215 5.214h2.129v2.058a5.218 5.218 0 005.215 5.214V6.758a1.001 1.001 0 00-1.001-1.001zM23.013 0H11.455a5.215 5.215 0 005.215 5.215h2.129v2.057A5.215 5.215 0 0024 12.483V1.005A1.005 1.005 0 0023.013 0z"/>
  </svg>
);

const LinearIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M3 15.055v-.684c.126.053.476.178.548.21.435.194.862.407 1.282.636l.044.025.006.005.006.004.012.008.025.016c.065.041.13.083.193.127.423.29.822.617 1.19.976.163.157.32.32.47.49l.108.122.054.063.027.032.013.017.007.008.003.004.002.002 4.765 5.835a10.04 10.04 0 01-5.702-2.238A10.04 10.04 0 013 15.055zM12 2C6.477 2 2 6.477 2 12c0 .693.07 1.37.203 2.023l7.372-7.372A10.037 10.037 0 0112 2zm0 0c5.523 0 10 4.477 10 10s-4.477 10-10 10a9.97 9.97 0 01-6.255-2.196l5.903-7.228.012-.016.006-.007.014-.017.027-.032.054-.063.108-.122c.15-.17.307-.333.47-.49a8.09 8.09 0 011.19-.976c.063-.044.128-.086.193-.127l.025-.016.012-.008.006-.004.006-.005.044-.025c.42-.229.847-.442 1.282-.636.072-.032.422-.157.548-.21v.684a10.04 10.04 0 01-2.85 5.71A10.04 10.04 0 0112 22c5.523 0 10-4.477 10-10S17.523 2 12 2z"/>
  </svg>
);

const SlackIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zM6.313 15.165a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zM8.834 6.313a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zM18.956 8.834a2.528 2.528 0 0 1 2.522-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.522V8.834zM17.688 8.834a2.528 2.528 0 0 1-2.523 2.521 2.527 2.527 0 0 1-2.52-2.521V2.522A2.527 2.527 0 0 1 15.165 0a2.528 2.528 0 0 1 2.523 2.522v6.312zM15.165 18.956a2.528 2.528 0 0 1 2.523 2.522A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.52-2.522v-2.522h2.52zM15.165 17.688a2.527 2.527 0 0 1-2.52-2.523 2.526 2.526 0 0 1 2.52-2.52h6.313A2.527 2.527 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.523h-6.313z"/>
  </svg>
);

const DiscordIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
  </svg>
);

const TeamsIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M20.625 8.073h-5.27V5.198a3.037 3.037 0 0 0-3.034-3.034H8.073a3.037 3.037 0 0 0-3.034 3.034v2.875H3.375A1.875 1.875 0 0 0 1.5 9.948v10.177A1.875 1.875 0 0 0 3.375 22h17.25a1.875 1.875 0 0 0 1.875-1.875V9.948a1.875 1.875 0 0 0-1.875-1.875zM7.914 5.198c0-.638.52-1.159 1.159-1.159h4.248c.639 0 1.159.52 1.159 1.159v2.875H7.914V5.198zm10.836 12.927a.938.938 0 0 1-.937.938H6.187a.938.938 0 0 1-.937-.938v-6.563a.938.938 0 0 1 .937-.937h11.626a.938.938 0 0 1 .937.937v6.563z"/>
  </svg>
);

const VercelIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M24 22.525H0l12-21.05 12 21.05z"/>
  </svg>
);

const NetlifyIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M17.3877.4573l2.3588 2.359-.3752.8213h-2.295l-1.3548 1.3551v2.1687l-.798.3661-2.3701-2.3698.3661-.8325V2.0306L14.2859.6756h2.2802l.8216-.2183zm-2.9027 9.95l1.8308 1.8308-.3566.7797H14.13l-.97.9708v1.8127l-.5643.2592-1.7855-1.785.2753-.602v-1.7945l.9704-.9699h1.7316l.6127-.2817v-.0001zM13.12 6.1893l1.5226 1.5229-.3192.698h-1.4754l-.8227.8223v1.4746l-.4912.2257-1.5097-1.5099.2469-.5407v-1.5202l.8223-.8224h1.4658l.5493-.2524.0113.0001zM7.473 12.1693l.3566-.7797h1.6324l.97-.9708V8.6061l.5644-.2592 1.7854 1.785-.2753.6021v1.7945l-.9703.9699h-1.7316l-.6128.2817-1.8308-1.8308zM9.8226.2583l-.366.8004v1.7945l-.9702.9703H6.755l-.613.2818 1.831 1.831.3566-.7802h1.6323l.9703-.9703V2.4219l.5643-.2595 1.7854 1.7855-.2753.6018v1.7945l-.9703.9703H9.9046l-.6127.2817-1.8308-1.8308.3565-.7802h1.6324l.9704-.97V2.359L9.8226.2583zm6.4884 12.3687l1.5226 1.5228-.3192.698h-1.4753l-.8228.8224v1.4746l-.4912.2256-1.5096-1.5098.2468-.5407v-1.5202l.8224-.8224h1.4658l.5492-.2523.0113.0001v-.0001zm-2.6163 4.179l1.8308 1.831-.3565.7798h-1.6324l-.97.9707v1.8127l-.5644.2592-1.7854-1.7854.2753-.6017v-1.7945l.9703-.9703h1.7316l.6127-.2817v.0002zm1.1876-7.0933l.366-.8003V8.1185l.9703-.97h1.7312l.6131-.2818-1.8309-1.831-.3566.7802H14.743l-.9703.9703v1.7938l-.5643.2595-1.7854-1.7855.2753-.6018V4.8332l.9703-.97h1.7316l.6127-.2818-1.8308-1.8308.3565-.78h1.6324l.9704-.97V.2583l-.4292-.2583L12 3.8037 8.2993 0l-.4292.2583V2.001l.9703.97h1.6324l.3566.78L9.0003 5.581l.6127.2818h1.7316l.9703.97v1.7949l.2753.6018-1.7854 1.7854-.5643-.2594V8.9618l-.9703-.9703h-1.6324l-.3566-.78 1.8309-1.8311-.6131-.2817H7.2865l-.9703.97v1.7939l-.366.8003 3.7007 3.8037L12 16.1963l2.8823-2.4886z"/>
  </svg>
);

const SentryIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M13.91 2.505c-.873-1.448-2.972-1.448-3.844 0L6.904 8.17a15.477 15.477 0 0 1 8.003 7.122h2.505a2.073 2.073 0 0 1 1.416.573c-.16-1.554-.893-3.015-2.107-4.083a8.386 8.386 0 0 0-5.008-2.036l3.107-5.146c.249-.404.698-.404.947 0l5.481 9.083a.503.503 0 0 1-.424.764h-1.857a15.577 15.577 0 0 1 .493 1.667h1.364a2.17 2.17 0 0 0 1.868-3.282L13.91 2.505zm-2.677 16.177H8.728a8.39 8.39 0 0 0-.188-7.416l-1.03 1.706a6.724 6.724 0 0 1 .256 5.71H6.012a2.17 2.17 0 0 0-1.868 3.282l.94 1.558a.504.504 0 0 0 .848 0l.94-1.558a2.073 2.073 0 0 1-.736-1.575c0-.215.035-.42.098-.612h2.5a10.095 10.095 0 0 0-.093-1.095zm-7.516 2.498a.504.504 0 0 1-.424-.764l2.6-4.308a10.07 10.07 0 0 0-.636-5.27L.923 17.83a2.17 2.17 0 0 0 1.868 3.282h1.136a2.073 2.073 0 0 1-.098-.612c0-.459.156-.885.414-1.22H3.717z"/>
  </svg>
);

const DatadogIcon = ({ className }: { className?: string }) => (
  <svg className={className} viewBox="0 0 24 24" fill="currentColor">
    <path d="M19.88 13.419c-.264-.373-.742-.636-1.393-.636-.65 0-1.129.263-1.392.636-.263.373-.439.932-.439 1.677 0 .745.176 1.305.44 1.677.263.373.741.636 1.391.636.651 0 1.13-.263 1.393-.636.263-.372.439-.932.439-1.677 0-.745-.176-1.304-.44-1.677zm-5.814 5.24c-.527 0-.879-.175-1.054-.527-.176-.351-.264-.878-.264-1.58v-4.918h2.285V10.37H12.76V7.555h-1.757v2.814H9.247v1.265h1.756v4.918c0 .964.175 1.668.527 2.108.352.44.966.659 1.844.659.527 0 1.054-.088 1.58-.264l-.175-1.318c-.351.088-.614.132-.79.132h.001zM6.17 11.103c-.659 0-1.137.264-1.4.79-.264.528-.396 1.231-.396 2.11 0 .878.132 1.58.396 2.108.263.527.74.79 1.4.79.658 0 1.136-.263 1.4-.79.263-.528.395-1.23.395-2.108 0-.879-.132-1.582-.396-2.11-.263-.526-.74-.79-1.399-.79zm0 7.03c-1.141 0-2.021-.352-2.636-1.055-.615-.702-.923-1.668-.923-2.9 0-1.23.308-2.197.923-2.9.615-.702 1.495-1.054 2.636-1.054 1.142 0 2.021.352 2.637 1.055.614.702.922 1.669.922 2.9 0 1.23-.308 2.197-.922 2.9-.616.702-1.495 1.054-2.637 1.054zm8.098-7.74h-1.757v7.475h1.757v-7.476h.001-.001z"/>
  </svg>
);

// All integrations metadata
const integrations: IntegrationMeta[] = [
  // Source Code Management
  {
    id: 'github',
    name: 'GitHub',
    description: 'Connect your repositories for PR testing and code analysis',
    icon: Github,
    color: 'gray',
    categories: ['source_code', 'cicd'],
    authType: 'oauth',
    docsUrl: 'https://docs.github.com',
  },
  {
    id: 'gitlab',
    name: 'GitLab',
    description: 'Integrate with GitLab for MR pipelines and CI/CD',
    icon: GitLabIcon,
    color: 'orange',
    categories: ['source_code', 'cicd'],
    authType: 'oauth',
    docsUrl: 'https://docs.gitlab.com',
  },
  {
    id: 'bitbucket',
    name: 'Bitbucket',
    description: 'Connect Bitbucket repositories and pipelines',
    icon: BitbucketIcon,
    color: 'blue',
    categories: ['source_code', 'cicd'],
    authType: 'oauth',
    docsUrl: 'https://support.atlassian.com/bitbucket-cloud/',
  },
  {
    id: 'azure_devops',
    name: 'Azure DevOps',
    description: 'Integrate with Azure Repos and Pipelines',
    icon: Cloud,
    color: 'blue',
    categories: ['source_code', 'cicd'],
    authType: 'oauth',
    docsUrl: 'https://docs.microsoft.com/azure/devops/',
  },

  // Issue Tracking
  {
    id: 'jira',
    name: 'Jira',
    description: 'Auto-create issues for test failures and track fixes',
    icon: JiraIcon,
    color: 'blue',
    categories: ['issue_tracking'],
    authType: 'oauth',
    docsUrl: 'https://www.atlassian.com/software/jira',
  },
  {
    id: 'linear',
    name: 'Linear',
    description: 'Create issues and track testing in your cycles',
    icon: LinearIcon,
    color: 'purple',
    categories: ['issue_tracking'],
    authType: 'oauth',
    docsUrl: 'https://linear.app/docs',
  },
  {
    id: 'asana',
    name: 'Asana',
    description: 'Create tasks from test failures in Asana',
    icon: Boxes,
    color: 'pink',
    categories: ['issue_tracking'],
    authType: 'oauth',
    docsUrl: 'https://asana.com/guide',
  },
  {
    id: 'trello',
    name: 'Trello',
    description: 'Add test failure cards to your Trello boards',
    icon: Layers,
    color: 'blue',
    categories: ['issue_tracking'],
    authType: 'api_key',
    docsUrl: 'https://trello.com/guide',
  },
  {
    id: 'clickup',
    name: 'ClickUp',
    description: 'Track test issues in ClickUp workspaces',
    icon: CheckCircle,
    color: 'purple',
    categories: ['issue_tracking'],
    authType: 'oauth',
    docsUrl: 'https://docs.clickup.com',
  },
  {
    id: 'shortcut',
    name: 'Shortcut',
    description: 'Create stories from test failures in Shortcut',
    icon: Zap,
    color: 'purple',
    categories: ['issue_tracking'],
    authType: 'api_key',
    docsUrl: 'https://help.shortcut.com',
  },
  {
    id: 'monday',
    name: 'Monday.com',
    description: 'Track testing items in Monday boards',
    icon: Layers,
    color: 'red',
    categories: ['issue_tracking'],
    authType: 'api_key',
    docsUrl: 'https://support.monday.com',
  },
  {
    id: 'notion',
    name: 'Notion',
    description: 'Create test reports and track issues in Notion',
    icon: FileCode,
    color: 'gray',
    categories: ['issue_tracking'],
    authType: 'oauth',
    docsUrl: 'https://www.notion.so/help',
  },
  {
    id: 'height',
    name: 'Height',
    description: 'Bring test issues into Height tasks',
    icon: Layers,
    color: 'blue',
    categories: ['issue_tracking'],
    authType: 'api_key',
    docsUrl: 'https://height.app',
    comingSoon: true,
  },

  // Chat & Notifications
  {
    id: 'slack',
    name: 'Slack',
    description: 'Get test results and alerts in Slack channels',
    icon: SlackIcon,
    color: 'purple',
    categories: ['chat'],
    authType: 'oauth',
    docsUrl: 'https://slack.com/help',
  },
  {
    id: 'discord',
    name: 'Discord',
    description: 'Send test alerts and reports to Discord channels',
    icon: DiscordIcon,
    color: 'indigo',
    categories: ['chat'],
    authType: 'webhook',
    docsUrl: 'https://discord.com/developers/docs',
  },
  {
    id: 'teams',
    name: 'Microsoft Teams',
    description: 'Get actionable test alerts in Microsoft Teams',
    icon: TeamsIcon,
    color: 'blue',
    categories: ['chat'],
    authType: 'webhook',
    docsUrl: 'https://docs.microsoft.com/microsoftteams/',
  },
  {
    id: 'google_chat',
    name: 'Google Chat',
    description: 'Send test notifications to Google Chat spaces',
    icon: MessageSquare,
    color: 'green',
    categories: ['chat'],
    authType: 'webhook',
    docsUrl: 'https://developers.google.com/chat',
    comingSoon: true,
  },

  // CI/CD
  {
    id: 'github_actions',
    name: 'GitHub Actions',
    description: 'Run Skopaq tests in GitHub Actions workflows',
    icon: Github,
    color: 'gray',
    categories: ['cicd'],
    authType: 'api_key',
    docsUrl: 'https://docs.github.com/actions',
  },
  {
    id: 'gitlab_ci',
    name: 'GitLab CI',
    description: 'Integrate Skopaq with GitLab CI/CD pipelines',
    icon: GitLabIcon,
    color: 'orange',
    categories: ['cicd'],
    authType: 'api_key',
    docsUrl: 'https://docs.gitlab.com/ee/ci/',
  },
  {
    id: 'jenkins',
    name: 'Jenkins',
    description: 'Run Skopaq tests in Jenkins pipelines',
    icon: Server,
    color: 'red',
    categories: ['cicd'],
    authType: 'api_key',
    docsUrl: 'https://www.jenkins.io/doc/',
  },
  {
    id: 'circleci',
    name: 'CircleCI',
    description: 'Integrate Skopaq with CircleCI workflows',
    icon: Circle,
    color: 'green',
    categories: ['cicd'],
    authType: 'api_key',
    docsUrl: 'https://circleci.com/docs/',
  },
  {
    id: 'azure_pipelines',
    name: 'Azure Pipelines',
    description: 'Run tests in Azure DevOps Pipelines',
    icon: Cloud,
    color: 'blue',
    categories: ['cicd'],
    authType: 'api_key',
    docsUrl: 'https://docs.microsoft.com/azure/devops/pipelines/',
  },
  {
    id: 'bitbucket_pipelines',
    name: 'Bitbucket Pipelines',
    description: 'Integrate with Bitbucket Pipelines',
    icon: BitbucketIcon,
    color: 'blue',
    categories: ['cicd'],
    authType: 'api_key',
    docsUrl: 'https://support.atlassian.com/bitbucket-cloud/docs/get-started-with-bitbucket-pipelines/',
  },
  {
    id: 'teamcity',
    name: 'TeamCity',
    description: 'Run Skopaq tests in TeamCity builds',
    icon: Server,
    color: 'cyan',
    categories: ['cicd'],
    authType: 'api_key',
    docsUrl: 'https://www.jetbrains.com/help/teamcity/',
    comingSoon: true,
  },

  // Deployment
  {
    id: 'vercel',
    name: 'Vercel',
    description: 'Test preview and production deployments on Vercel',
    icon: VercelIcon,
    color: 'gray',
    categories: ['deployment'],
    authType: 'oauth',
    docsUrl: 'https://vercel.com/docs',
  },
  {
    id: 'netlify',
    name: 'Netlify',
    description: 'Test deploy previews and production on Netlify',
    icon: NetlifyIcon,
    color: 'teal',
    categories: ['deployment'],
    authType: 'oauth',
    docsUrl: 'https://docs.netlify.com',
  },
  {
    id: 'heroku',
    name: 'Heroku',
    description: 'Test Heroku review apps and deployments',
    icon: Cloud,
    color: 'purple',
    categories: ['deployment'],
    authType: 'api_key',
    docsUrl: 'https://devcenter.heroku.com',
  },
  {
    id: 'railway',
    name: 'Railway',
    description: 'Test Railway preview environments',
    icon: Rocket,
    color: 'purple',
    categories: ['deployment'],
    authType: 'api_key',
    docsUrl: 'https://docs.railway.app',
  },
  {
    id: 'render',
    name: 'Render',
    description: 'Test Render preview environments and services',
    icon: Cloud,
    color: 'teal',
    categories: ['deployment'],
    authType: 'api_key',
    docsUrl: 'https://render.com/docs',
  },
  {
    id: 'flyio',
    name: 'Fly.io',
    description: 'Test Fly.io deployments and preview apps',
    icon: Cloud,
    color: 'purple',
    categories: ['deployment'],
    authType: 'api_key',
    docsUrl: 'https://fly.io/docs',
    comingSoon: true,
  },
  {
    id: 'aws',
    name: 'AWS',
    description: 'Test AWS deployments (Amplify, ECS, Lambda)',
    icon: Cloud,
    color: 'orange',
    categories: ['deployment'],
    authType: 'api_key',
    docsUrl: 'https://docs.aws.amazon.com',
    comingSoon: true,
  },

  // Observability
  {
    id: 'sentry',
    name: 'Sentry',
    description: 'Generate tests from Sentry errors and track issues',
    icon: SentryIcon,
    color: 'pink',
    categories: ['observability'],
    authType: 'api_key',
    docsUrl: 'https://docs.sentry.io',
  },
  {
    id: 'datadog',
    name: 'Datadog',
    description: 'Correlate tests with RUM, APM, and logs',
    icon: DatadogIcon,
    color: 'purple',
    categories: ['observability'],
    authType: 'api_key',
    docsUrl: 'https://docs.datadoghq.com',
  },
  {
    id: 'newrelic',
    name: 'New Relic',
    description: 'Full-stack observability and test correlation',
    icon: LineChart,
    color: 'green',
    categories: ['observability'],
    authType: 'api_key',
    docsUrl: 'https://docs.newrelic.com',
  },
  {
    id: 'grafana',
    name: 'Grafana',
    description: 'Visualize test metrics in Grafana dashboards',
    icon: Gauge,
    color: 'orange',
    categories: ['observability'],
    authType: 'api_key',
    docsUrl: 'https://grafana.com/docs',
  },
  {
    id: 'splunk',
    name: 'Splunk',
    description: 'Send test data to Splunk for analysis',
    icon: Activity,
    color: 'green',
    categories: ['observability'],
    authType: 'api_key',
    docsUrl: 'https://docs.splunk.com',
    comingSoon: true,
  },
  {
    id: 'dynatrace',
    name: 'Dynatrace',
    description: 'AI-powered observability with test correlation',
    icon: Activity,
    color: 'blue',
    categories: ['observability'],
    authType: 'api_key',
    docsUrl: 'https://www.dynatrace.com/support/help/',
    comingSoon: true,
  },

  // Session Replay
  {
    id: 'logrocket',
    name: 'LogRocket',
    description: 'Generate tests from LogRocket session recordings',
    icon: Video,
    color: 'purple',
    categories: ['session_replay'],
    authType: 'api_key',
    docsUrl: 'https://docs.logrocket.com',
  },
  {
    id: 'fullstory',
    name: 'FullStory',
    description: 'Convert FullStory sessions into automated tests',
    icon: Video,
    color: 'blue',
    categories: ['session_replay'],
    authType: 'api_key',
    docsUrl: 'https://help.fullstory.com',
  },
  {
    id: 'posthog',
    name: 'PostHog',
    description: 'Use PostHog recordings for test generation',
    icon: Activity,
    color: 'blue',
    categories: ['session_replay', 'analytics'],
    authType: 'api_key',
    docsUrl: 'https://posthog.com/docs',
  },
  {
    id: 'hotjar',
    name: 'Hotjar',
    description: 'Generate tests from Hotjar recordings and heatmaps',
    icon: Video,
    color: 'red',
    categories: ['session_replay'],
    authType: 'api_key',
    docsUrl: 'https://help.hotjar.com',
    comingSoon: true,
  },
  {
    id: 'heap',
    name: 'Heap',
    description: 'Use Heap session data for test generation',
    icon: Activity,
    color: 'purple',
    categories: ['session_replay', 'analytics'],
    authType: 'api_key',
    docsUrl: 'https://help.heap.io',
    comingSoon: true,
  },

  // Analytics
  {
    id: 'amplitude',
    name: 'Amplitude',
    description: 'Correlate test results with user analytics',
    icon: LineChart,
    color: 'blue',
    categories: ['analytics'],
    authType: 'api_key',
    docsUrl: 'https://www.docs.developers.amplitude.com',
  },
  {
    id: 'mixpanel',
    name: 'Mixpanel',
    description: 'Track test events in Mixpanel',
    icon: BarChart3,
    color: 'purple',
    categories: ['analytics'],
    authType: 'api_key',
    docsUrl: 'https://docs.mixpanel.com',
  },
  {
    id: 'segment',
    name: 'Segment',
    description: 'Send test events through Segment',
    icon: Layers,
    color: 'green',
    categories: ['analytics'],
    authType: 'api_key',
    docsUrl: 'https://segment.com/docs/',
    comingSoon: true,
  },

  // Incident Management
  {
    id: 'pagerduty',
    name: 'PagerDuty',
    description: 'Get paged on critical test failures',
    icon: Bell,
    color: 'green',
    categories: ['incident_management'],
    authType: 'api_key',
    docsUrl: 'https://support.pagerduty.com',
  },
  {
    id: 'opsgenie',
    name: 'Opsgenie',
    description: 'Alert on-call teams for test failures',
    icon: Bell,
    color: 'blue',
    categories: ['incident_management'],
    authType: 'api_key',
    docsUrl: 'https://support.atlassian.com/opsgenie/',
  },
  {
    id: 'incident_io',
    name: 'incident.io',
    description: 'Manage test failure incidents',
    icon: Bell,
    color: 'pink',
    categories: ['incident_management'],
    authType: 'api_key',
    docsUrl: 'https://incident.io/docs',
    comingSoon: true,
  },
  {
    id: 'spike',
    name: 'Spike.sh',
    description: 'Create incidents from critical test failures',
    icon: Bell,
    color: 'red',
    categories: ['incident_management'],
    authType: 'api_key',
    docsUrl: 'https://docs.spike.sh',
    comingSoon: true,
  },
  {
    id: 'victorops',
    name: 'VictorOps',
    description: 'Page on important test failures',
    icon: Bell,
    color: 'blue',
    categories: ['incident_management'],
    authType: 'api_key',
    docsUrl: 'https://help.victorops.com',
    comingSoon: true,
  },

  // Feature Flags
  {
    id: 'launchdarkly',
    name: 'LaunchDarkly',
    description: 'Test different feature flag configurations',
    icon: Flag,
    color: 'gray',
    categories: ['feature_flags'],
    authType: 'api_key',
    docsUrl: 'https://docs.launchdarkly.com',
  },
  {
    id: 'split',
    name: 'Split',
    description: 'Test feature flag variations with Split',
    icon: Flag,
    color: 'blue',
    categories: ['feature_flags'],
    authType: 'api_key',
    docsUrl: 'https://help.split.io',
  },
  {
    id: 'flagsmith',
    name: 'Flagsmith',
    description: 'Test different feature configurations',
    icon: Flag,
    color: 'blue',
    categories: ['feature_flags'],
    authType: 'api_key',
    docsUrl: 'https://docs.flagsmith.com',
    comingSoon: true,
  },
  {
    id: 'unleash',
    name: 'Unleash',
    description: 'Test feature toggles with Unleash',
    icon: Flag,
    color: 'green',
    categories: ['feature_flags'],
    authType: 'api_key',
    docsUrl: 'https://docs.getunleash.io',
    comingSoon: true,
  },

  // Testing
  {
    id: 'browserstack',
    name: 'BrowserStack',
    description: 'Run tests on BrowserStack cloud browsers',
    icon: Globe,
    color: 'orange',
    categories: ['testing'],
    authType: 'api_key',
    docsUrl: 'https://www.browserstack.com/docs',
  },
  {
    id: 'saucelabs',
    name: 'Sauce Labs',
    description: 'Execute tests on Sauce Labs cloud',
    icon: Globe,
    color: 'red',
    categories: ['testing'],
    authType: 'api_key',
    docsUrl: 'https://docs.saucelabs.com',
  },
  {
    id: 'lambdatest',
    name: 'LambdaTest',
    description: 'Run cross-browser tests on LambdaTest',
    icon: Globe,
    color: 'purple',
    categories: ['testing'],
    authType: 'api_key',
    docsUrl: 'https://www.lambdatest.com/support/docs/',
  },
  {
    id: 'percy',
    name: 'Percy',
    description: 'Visual testing and review with Percy',
    icon: Eye,
    color: 'purple',
    categories: ['testing'],
    authType: 'api_key',
    docsUrl: 'https://docs.percy.io',
  },
  {
    id: 'chromatic',
    name: 'Chromatic',
    description: 'Visual testing for Storybook components',
    icon: Eye,
    color: 'orange',
    categories: ['testing'],
    authType: 'api_key',
    docsUrl: 'https://www.chromatic.com/docs/',
  },
  {
    id: 'playwright',
    name: 'Playwright',
    description: 'Import and run Playwright tests',
    icon: TestTube,
    color: 'green',
    categories: ['testing'],
    authType: 'api_key',
    docsUrl: 'https://playwright.dev/docs',
  },
  {
    id: 'cypress',
    name: 'Cypress',
    description: 'Import and run Cypress tests',
    icon: TestTube,
    color: 'green',
    categories: ['testing'],
    authType: 'api_key',
    docsUrl: 'https://docs.cypress.io',
  },

  // Webhooks & Automation
  {
    id: 'webhook',
    name: 'Webhooks',
    description: 'Trigger tests via webhooks from any platform',
    icon: Webhook,
    color: 'gray',
    categories: ['webhooks'],
    authType: 'webhook',
    docsUrl: 'https://docs.skopaq.ai/webhooks',
  },
  {
    id: 'zapier',
    name: 'Zapier',
    description: 'Connect Skopaq with 5000+ apps via Zapier',
    icon: Zap,
    color: 'orange',
    categories: ['webhooks'],
    authType: 'api_key',
    docsUrl: 'https://zapier.com/help',
  },
  {
    id: 'n8n',
    name: 'n8n',
    description: 'Automate workflows with n8n integration',
    icon: Workflow,
    color: 'red',
    categories: ['webhooks'],
    authType: 'webhook',
    docsUrl: 'https://docs.n8n.io',
  },

  // AI & Coding Agents
  {
    id: 'cursor',
    name: 'Cursor Agent',
    description: 'AI-powered debugging and test generation',
    icon: Bot,
    color: 'purple',
    categories: ['ai_agents'],
    authType: 'api_key',
    docsUrl: 'https://cursor.sh/docs',
    comingSoon: true,
  },
  {
    id: 'claude_code',
    name: 'Claude Code',
    description: 'Generate tests with Claude AI',
    icon: Sparkles,
    color: 'orange',
    categories: ['ai_agents'],
    authType: 'api_key',
    docsUrl: 'https://docs.anthropic.com',
  },

  // Database
  {
    id: 'supabase',
    name: 'Supabase',
    description: 'Test database and edge functions',
    icon: Database,
    color: 'green',
    categories: ['database'],
    authType: 'api_key',
    docsUrl: 'https://supabase.com/docs',
  },
  {
    id: 'turso',
    name: 'Turso',
    description: 'Trace queries and capture SQLite errors',
    icon: Database,
    color: 'teal',
    categories: ['database'],
    authType: 'api_key',
    docsUrl: 'https://docs.turso.tech',
    comingSoon: true,
  },
];

// Color mappings for badges and icons
const colorClasses: Record<string, { bg: string; text: string; border: string }> = {
  gray: { bg: 'bg-gray-100 dark:bg-gray-800', text: 'text-gray-700 dark:text-gray-300', border: 'border-gray-200 dark:border-gray-700' },
  red: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-700 dark:text-red-300', border: 'border-red-200 dark:border-red-800' },
  orange: { bg: 'bg-orange-100 dark:bg-orange-900/30', text: 'text-orange-700 dark:text-orange-300', border: 'border-orange-200 dark:border-orange-800' },
  yellow: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-700 dark:text-yellow-300', border: 'border-yellow-200 dark:border-yellow-800' },
  green: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-700 dark:text-green-300', border: 'border-green-200 dark:border-green-800' },
  teal: { bg: 'bg-teal-100 dark:bg-teal-900/30', text: 'text-teal-700 dark:text-teal-300', border: 'border-teal-200 dark:border-teal-800' },
  cyan: { bg: 'bg-cyan-100 dark:bg-cyan-900/30', text: 'text-cyan-700 dark:text-cyan-300', border: 'border-cyan-200 dark:border-cyan-800' },
  blue: { bg: 'bg-blue-100 dark:bg-blue-900/30', text: 'text-blue-700 dark:text-blue-300', border: 'border-blue-200 dark:border-blue-800' },
  indigo: { bg: 'bg-indigo-100 dark:bg-indigo-900/30', text: 'text-indigo-700 dark:text-indigo-300', border: 'border-indigo-200 dark:border-indigo-800' },
  purple: { bg: 'bg-purple-100 dark:bg-purple-900/30', text: 'text-purple-700 dark:text-purple-300', border: 'border-purple-200 dark:border-purple-800' },
  pink: { bg: 'bg-pink-100 dark:bg-pink-900/30', text: 'text-pink-700 dark:text-pink-300', border: 'border-pink-200 dark:border-pink-800' },
};

// ============================================================================
// Components
// ============================================================================

function CategoryBadge({ category }: { category: IntegrationCategory }) {
  const cat = categories.find((c) => c.value === category);
  if (!cat || category === 'all') return null;

  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-muted text-muted-foreground">
      {cat.label}
    </span>
  );
}

function IntegrationRow({
  integration,
  isConnected,
  onConnect,
  onDisconnect,
}: {
  integration: IntegrationMeta;
  isConnected: boolean;
  onConnect: () => void;
  onDisconnect: () => void;
}) {
  const Icon = integration.icon;
  const colors = colorClasses[integration.color] || colorClasses.gray;

  return (
    <div
      className={cn(
        'flex items-center gap-4 p-4 border-b border-border/50 hover:bg-muted/30 transition-colors',
        integration.comingSoon && 'opacity-60'
      )}
    >
      {/* Icon */}
      <div
        className={cn(
          'flex items-center justify-center w-10 h-10 rounded-lg',
          colors.bg,
          colors.border,
          'border'
        )}
      >
        <Icon className={cn('w-5 h-5', colors.text)} />
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <h3 className="font-medium text-foreground">{integration.name}</h3>
          {isConnected && (
            <span className="flex items-center gap-1 text-xs text-green-600 dark:text-green-400">
              <CheckCircle className="w-3 h-3" />
              Connected
            </span>
          )}
          {integration.comingSoon && (
            <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-primary/10 text-primary">
              COMING SOON
            </span>
          )}
        </div>
        <p className="text-sm text-muted-foreground truncate">{integration.description}</p>
      </div>

      {/* Category Tags */}
      <div className="hidden md:flex items-center gap-1.5 flex-wrap justify-end max-w-[300px]">
        {integration.categories.slice(0, 2).map((cat) => (
          <CategoryBadge key={cat} category={cat} />
        ))}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-2">
        {integration.docsUrl && (
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={() => window.open(integration.docsUrl, '_blank')}
          >
            <ExternalLink className="w-4 h-4" />
          </Button>
        )}
        {!integration.comingSoon && (
          <Button
            variant={isConnected ? 'outline' : 'default'}
            size="sm"
            onClick={isConnected ? onDisconnect : onConnect}
            className="min-w-[80px]"
          >
            {isConnected ? 'Disconnect' : 'Connect'}
          </Button>
        )}
      </div>
    </div>
  );
}

function ConnectDialog({
  integration,
  onClose,
  onConnect,
  isConnecting,
}: {
  integration: IntegrationMeta;
  onClose: () => void;
  onConnect: (config: ConnectIntegrationRequest) => void;
  isConnecting: boolean;
}) {
  const [formData, setFormData] = useState<ConnectIntegrationRequest>({});
  const [showApiKey, setShowApiKey] = useState(false);
  const Icon = integration.icon;
  const colors = colorClasses[integration.color] || colorClasses.gray;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConnect(formData);
  };

  const isValid = () => {
    if (integration.authType === 'webhook') {
      return !!formData.webhook_url;
    }
    if (integration.id === 'sentry') {
      return !!formData.api_key && !!formData.org_slug;
    }
    if (integration.id === 'datadog') {
      return !!formData.api_key && !!formData.application_key;
    }
    return !!formData.api_key;
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="w-full max-w-md bg-card rounded-xl border shadow-xl"
      >
        <div className="flex items-center justify-between p-4 border-b">
          <div className="flex items-center gap-3">
            <div className={cn('p-2 rounded-lg', colors.bg, colors.border, 'border')}>
              <Icon className={cn('w-5 h-5', colors.text)} />
            </div>
            <div>
              <h2 className="font-semibold">Connect {integration.name}</h2>
              <p className="text-sm text-muted-foreground">{integration.description}</p>
            </div>
          </div>
          <Button variant="ghost" size="sm" className="h-8 w-8 p-0" onClick={onClose}>
            <X className="w-4 h-4" />
          </Button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {integration.authType === 'oauth' ? (
            <div className="text-center py-4">
              <p className="text-sm text-muted-foreground mb-4">
                Click below to authenticate with {integration.name}
              </p>
              <Button type="submit" disabled={isConnecting}>
                {isConnecting ? (
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
            </div>
          ) : integration.authType === 'webhook' ? (
            <div>
              <label className="text-sm font-medium">Webhook URL</label>
              <Input
                placeholder="https://your-service.com/webhook"
                className="mt-1"
                value={formData.webhook_url || ''}
                onChange={(e) => setFormData({ ...formData, webhook_url: e.target.value })}
              />
            </div>
          ) : (
            <>
              <div>
                <label className="text-sm font-medium">
                  {integration.id === 'sentry' ? 'Auth Token' : 'API Key'}
                </label>
                <div className="relative mt-1">
                  <Input
                    type={showApiKey ? 'text' : 'password'}
                    placeholder={integration.id === 'sentry' ? 'sntrys_...' : 'Enter your API key'}
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
                {integration.id === 'sentry' && (
                  <p className="text-xs text-muted-foreground mt-1">
                    Get your auth token from{' '}
                    <a
                      href="https://sentry.io/settings/auth-tokens/"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      Sentry Settings → Auth Tokens
                    </a>
                  </p>
                )}
              </div>

              {/* Sentry-specific fields */}
              {integration.id === 'sentry' && (
                <>
                  <div>
                    <label className="text-sm font-medium">Organization Slug</label>
                    <Input
                      placeholder="your-org-slug"
                      className="mt-1"
                      value={formData.org_slug || ''}
                      onChange={(e) => setFormData({ ...formData, org_slug: e.target.value })}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Found in your Sentry URL: sentry.io/organizations/<strong>your-org-slug</strong>/
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium">
                      Project Slug <span className="text-muted-foreground">(optional)</span>
                    </label>
                    <Input
                      placeholder="your-project-slug"
                      className="mt-1"
                      value={formData.project_slug || ''}
                      onChange={(e) => setFormData({ ...formData, project_slug: e.target.value })}
                    />
                  </div>
                </>
              )}

              {/* Datadog-specific fields */}
              {integration.id === 'datadog' && (
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
            </>
          )}

          {integration.authType !== 'oauth' && (
            <Button type="submit" className="w-full" disabled={isConnecting || !isValid()}>
              {isConnecting ? (
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
          )}

          <p className="text-xs text-muted-foreground text-center">
            Your credentials are encrypted and stored securely.
          </p>
        </form>
      </motion.div>
    </div>
  );
}

// ============================================================================
// Main Component
// ============================================================================

export default function IntegrationsPage() {
  const [selectedCategory, setSelectedCategory] = useState<IntegrationCategory>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryDropdownOpen, setCategoryDropdownOpen] = useState(false);
  const [connectingIntegration, setConnectingIntegration] = useState<IntegrationMeta | null>(null);

  const searchParams = useSearchParams();
  const router = useRouter();

  // API hooks
  const { data: connectedIntegrations, isLoading, refetch } = useIntegrations();
  const connectMutation = useConnectIntegration();
  const disconnectMutation = useDisconnectIntegration();

  // Handle OAuth callback - when redirected back with success=true&platform=xxx
  useEffect(() => {
    const success = searchParams.get('success');
    const platform = searchParams.get('platform');
    const error = searchParams.get('error');

    if (success === 'true' && platform) {
      // Find the integration metadata for display name
      const integrationMeta = integrations.find(i => i.id === platform);
      const displayName = integrationMeta?.name || platform;

      // If we're in a popup (opened by OAuth flow), notify parent and close
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage(
          { type: 'oauth-success', platform, displayName },
          window.location.origin
        );
        window.close();
        return;
      }

      // Otherwise, show toast in current window
      toast({
        title: 'Connected!',
        description: `Successfully connected to ${displayName}`,
      });

      // Refresh the integrations list to show the new connection
      refetch();

      // Clean up URL by removing query params
      router.replace('/integrations', { scroll: false });
    } else if (error) {
      const errorPlatform = searchParams.get('platform');
      const integrationMeta = errorPlatform ? integrations.find(i => i.id === errorPlatform) : null;
      const displayName = integrationMeta?.name || errorPlatform || 'the service';

      // If we're in a popup, notify parent and close
      if (window.opener && !window.opener.closed) {
        window.opener.postMessage(
          { type: 'oauth-error', platform: errorPlatform, error, displayName },
          window.location.origin
        );
        window.close();
        return;
      }

      toast({
        title: 'Connection Failed',
        description: `Failed to connect to ${displayName}: ${error}`,
        variant: 'destructive',
      });

      // Clean up URL
      router.replace('/integrations', { scroll: false });
    }
  }, [searchParams, refetch, router]);

  // Listen for OAuth messages from popup window
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      // Only accept messages from same origin
      if (event.origin !== window.location.origin) return;

      const { type, platform, displayName, error } = event.data || {};

      if (type === 'oauth-success') {
        toast({
          title: 'Connected!',
          description: `Successfully connected to ${displayName || platform}`,
        });
        refetch();
      } else if (type === 'oauth-error') {
        toast({
          title: 'Connection Failed',
          description: `Failed to connect to ${displayName || platform}: ${error}`,
          variant: 'destructive',
        });
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [refetch]);

  // Filter integrations
  const filteredIntegrations = useMemo(() => {
    return integrations.filter((integration) => {
      // Category filter
      if (selectedCategory !== 'all' && !integration.categories.includes(selectedCategory)) {
        return false;
      }
      // Search filter
      if (searchQuery) {
        const query = searchQuery.toLowerCase();
        return (
          integration.name.toLowerCase().includes(query) ||
          integration.description.toLowerCase().includes(query)
        );
      }
      return true;
    });
  }, [selectedCategory, searchQuery]);

  // Check if integration is connected
  const isConnected = (integrationId: IntegrationPlatform): boolean => {
    if (!connectedIntegrations?.integrations) return false;
    return connectedIntegrations.integrations.some((i) => i.platform === integrationId && i.connected);
  };

  // Handle connect
  const handleConnect = async (config: ConnectIntegrationRequest) => {
    if (!connectingIntegration) return;

    try {
      const result = await connectMutation.mutateAsync({
        platform: connectingIntegration.id,
        config,
      });

      // Handle OAuth redirect
      if (result.oauth_url) {
        // Open OAuth authorization in new window
        window.open(result.oauth_url, '_blank', 'width=600,height=700');
        toast({
          title: 'OAuth Authorization',
          description: 'Complete authorization in the popup window',
        });
        setConnectingIntegration(null);
        return;
      }

      toast({
        title: 'Connected!',
        description: `Successfully connected to ${connectingIntegration.name}`,
      });
      setConnectingIntegration(null);
    } catch (error) {
      toast({
        title: 'Connection Failed',
        description: `Failed to connect to ${connectingIntegration.name}`,
        variant: 'destructive',
      });
    }
  };

  // Handle disconnect
  const handleDisconnect = async (integration: IntegrationMeta) => {
    try {
      await disconnectMutation.mutateAsync(integration.id);
      toast({
        title: 'Disconnected',
        description: `Successfully disconnected from ${integration.name}`,
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: `Failed to disconnect from ${integration.name}`,
        variant: 'destructive',
      });
    }
  };

  const selectedCategoryInfo = categories.find((c) => c.value === selectedCategory);

  // Stats
  const connectedCount = connectedIntegrations?.integrations.filter((i) => i.connected).length || 0;
  const totalCount = integrations.filter((i) => !i.comingSoon).length;

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 lg:ml-64 min-w-0">
        <div className="p-6 max-w-6xl mx-auto">
          {/* Header */}
          <div className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-2xl font-bold">Integrations</h1>
              <p className="text-muted-foreground">
                {connectedCount} of {totalCount} integrations connected
              </p>
            </div>
            <Button variant="outline" size="sm">
              <RefreshCw className="w-4 h-4 mr-2" />
              Sync All
            </Button>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3 mb-6">
            {/* Category Dropdown */}
            <div className="relative">
              <button
                onClick={() => setCategoryDropdownOpen(!categoryDropdownOpen)}
                className="flex items-center gap-2 h-10 px-4 rounded-lg border border-border bg-background hover:bg-muted transition-colors min-w-[200px]"
              >
                {selectedCategoryInfo && (
                  <selectedCategoryInfo.icon className="w-4 h-4 text-muted-foreground" />
                )}
                <span className="flex-1 text-left">{selectedCategoryInfo?.label}</span>
                <ChevronDown
                  className={cn(
                    'w-4 h-4 text-muted-foreground transition-transform',
                    categoryDropdownOpen && 'rotate-180'
                  )}
                />
              </button>

              <AnimatePresence>
                {categoryDropdownOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full left-0 mt-1 w-64 bg-card rounded-lg border shadow-lg z-50 py-1 max-h-[400px] overflow-y-auto"
                  >
                    {categories.map((category) => (
                      <button
                        key={category.value}
                        onClick={() => {
                          setSelectedCategory(category.value);
                          setCategoryDropdownOpen(false);
                        }}
                        className={cn(
                          'flex items-center gap-2 w-full px-3 py-2 text-sm hover:bg-muted transition-colors',
                          selectedCategory === category.value && 'bg-muted font-medium'
                        )}
                      >
                        <category.icon className="w-4 h-4 text-muted-foreground" />
                        {category.label}
                        {selectedCategory === category.value && (
                          <CheckCircle className="w-4 h-4 ml-auto text-primary" />
                        )}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Search */}
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Filter integrations..."
                className="pl-9"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>
          </div>

          {/* Integrations List */}
          <Card>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="p-8 space-y-4">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="flex items-center gap-4">
                      <Skeleton className="w-10 h-10 rounded-lg" />
                      <div className="flex-1">
                        <Skeleton className="h-4 w-32 mb-2" />
                        <Skeleton className="h-3 w-64" />
                      </div>
                      <Skeleton className="h-8 w-20" />
                    </div>
                  ))}
                </div>
              ) : filteredIntegrations.length === 0 ? (
                <div className="p-12 text-center">
                  <Search className="w-12 h-12 mx-auto text-muted-foreground/50 mb-4" />
                  <h3 className="font-medium mb-1">No integrations found</h3>
                  <p className="text-sm text-muted-foreground">
                    Try adjusting your search or filter criteria
                  </p>
                </div>
              ) : (
                <div>
                  {filteredIntegrations.map((integration) => (
                    <IntegrationRow
                      key={integration.id}
                      integration={integration}
                      isConnected={isConnected(integration.id)}
                      onConnect={() => setConnectingIntegration(integration)}
                      onDisconnect={() => handleDisconnect(integration)}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Results count */}
          <p className="text-sm text-muted-foreground mt-4">
            Showing {filteredIntegrations.length} of {integrations.length} integrations
          </p>
        </div>
      </main>

      {/* Connect Dialog */}
      <AnimatePresence>
        {connectingIntegration && (
          <ConnectDialog
            integration={connectingIntegration}
            onClose={() => setConnectingIntegration(null)}
            onConnect={handleConnect}
            isConnecting={connectMutation.isPending}
          />
        )}
      </AnimatePresence>
    </div>
  );
}
