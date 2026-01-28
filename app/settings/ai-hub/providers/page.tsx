'use client';

import { useState, useCallback, useMemo } from 'react';
import {
  Cpu,
  Plus,
  Settings,
  RefreshCw,
  Clock,
  TrendingUp,
  TrendingDown,
  ArrowLeft,
  Upload,
  Loader2,
  AlertCircle,
  CheckCircle,
  AlertTriangle,
  XCircle,
} from 'lucide-react';
import Link from 'next/link';
// Note: Sidebar is provided by the AI Hub layout, not needed here
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/hooks/useToast';
import {
  useProviders,
  useProviderStatus,
  useProviderKeys,
  useAddProviderKey,
  type ProviderInfo,
  type ProviderStatus,
  type ProviderStatusResponse,
} from '@/lib/hooks/use-ai-settings';

// ============================================================================
// Types
// ============================================================================

interface EnterpriseConfig {
  azure?: {
    apiKey: string;
    endpoint: string;
  };
  awsBedrock?: {
    accessKey: string;
    secretKey: string;
    region: string;
  };
  vertexAI?: {
    serviceAccountJson: string;
    projectId: string;
    location: string;
  };
}

type EnterpriseProvider = 'azure_openai' | 'aws_bedrock' | 'google_vertex';

// AWS Regions for Bedrock
const AWS_REGIONS = [
  { value: 'us-east-1', label: 'US East (N. Virginia)' },
  { value: 'us-east-2', label: 'US East (Ohio)' },
  { value: 'us-west-2', label: 'US West (Oregon)' },
  { value: 'eu-west-1', label: 'Europe (Ireland)' },
  { value: 'eu-central-1', label: 'Europe (Frankfurt)' },
  { value: 'ap-northeast-1', label: 'Asia Pacific (Tokyo)' },
  { value: 'ap-southeast-1', label: 'Asia Pacific (Singapore)' },
  { value: 'ap-southeast-2', label: 'Asia Pacific (Sydney)' },
];

// GCP Locations for Vertex AI
const GCP_LOCATIONS = [
  { value: 'us-central1', label: 'US Central (Iowa)' },
  { value: 'us-east1', label: 'US East (South Carolina)' },
  { value: 'us-east4', label: 'US East (N. Virginia)' },
  { value: 'us-west1', label: 'US West (Oregon)' },
  { value: 'us-west4', label: 'US West (Las Vegas)' },
  { value: 'europe-west1', label: 'Europe West (Belgium)' },
  { value: 'europe-west2', label: 'Europe West (London)' },
  { value: 'europe-west4', label: 'Europe West (Netherlands)' },
  { value: 'asia-east1', label: 'Asia East (Taiwan)' },
  { value: 'asia-northeast1', label: 'Asia Northeast (Tokyo)' },
  { value: 'asia-southeast1', label: 'Asia Southeast (Singapore)' },
];

// Provider metadata
const PROVIDER_META: Record<string, {
  name: string;
  description: string;
  docsUrl: string;
  keyPlaceholder: string;
  isEnterprise?: boolean;
  enterpriseType?: EnterpriseProvider;
}> = {
  openrouter: {
    name: 'OpenRouter',
    description: 'Access 300+ models with one API key',
    docsUrl: 'https://openrouter.ai/keys',
    keyPlaceholder: 'sk-or-v1-...',
  },
  anthropic: {
    name: 'Anthropic',
    description: 'Claude models (Opus, Sonnet, Haiku)',
    docsUrl: 'https://console.anthropic.com/settings/keys',
    keyPlaceholder: 'sk-ant-api...',
  },
  openai: {
    name: 'OpenAI',
    description: 'GPT-4o, o1, and more',
    docsUrl: 'https://platform.openai.com/api-keys',
    keyPlaceholder: 'sk-...',
  },
  google: {
    name: 'Google AI',
    description: 'Gemini 2.0 models',
    docsUrl: 'https://makersuite.google.com/app/apikey',
    keyPlaceholder: 'AIza...',
  },
  groq: {
    name: 'Groq',
    description: 'Ultra-fast Llama inference',
    docsUrl: 'https://console.groq.com/keys',
    keyPlaceholder: 'gsk_...',
  },
  together: {
    name: 'Together AI',
    description: 'DeepSeek, open-source models',
    docsUrl: 'https://api.together.xyz/settings/api-keys',
    keyPlaceholder: 'togeth...',
  },
  deepseek: {
    name: 'DeepSeek',
    description: 'Best reasoning per dollar',
    docsUrl: 'https://platform.deepseek.com/api_keys',
    keyPlaceholder: 'sk-...',
  },
  mistral: {
    name: 'Mistral AI',
    description: 'European AI efficiency',
    docsUrl: 'https://console.mistral.ai/api-keys',
    keyPlaceholder: 'mistral-...',
  },
  fireworks: {
    name: 'Fireworks AI',
    description: 'Fast inference',
    docsUrl: 'https://fireworks.ai/account/api-keys',
    keyPlaceholder: 'fw_...',
  },
  perplexity: {
    name: 'Perplexity',
    description: 'AI with built-in search',
    docsUrl: 'https://perplexity.ai/settings/api',
    keyPlaceholder: 'pplx-...',
  },
  cohere: {
    name: 'Cohere',
    description: 'Enterprise RAG',
    docsUrl: 'https://dashboard.cohere.ai/api-keys',
    keyPlaceholder: 'co-...',
  },
  xai: {
    name: 'xAI',
    description: 'Grok models',
    docsUrl: 'https://x.ai/api',
    keyPlaceholder: 'xai-...',
  },
  cerebras: {
    name: 'Cerebras',
    description: 'Ultra-fast inference',
    docsUrl: 'https://cloud.cerebras.ai/platform',
    keyPlaceholder: 'csk-...',
  },
  azure_openai: {
    name: 'Azure OpenAI',
    description: 'Enterprise-grade OpenAI on Azure',
    docsUrl: 'https://portal.azure.com',
    keyPlaceholder: 'azure-key...',
    isEnterprise: true,
    enterpriseType: 'azure_openai',
  },
  aws_bedrock: {
    name: 'AWS Bedrock',
    description: 'AWS-hosted AI models',
    docsUrl: 'https://console.aws.amazon.com/bedrock',
    keyPlaceholder: 'aws-access-key...',
    isEnterprise: true,
    enterpriseType: 'aws_bedrock',
  },
  google_vertex: {
    name: 'Google Vertex AI',
    description: 'GCP-hosted AI models',
    docsUrl: 'https://console.cloud.google.com/vertex-ai',
    keyPlaceholder: 'gcp-service-account...',
    isEnterprise: true,
    enterpriseType: 'google_vertex',
  },
};

// ============================================================================
// Components
// ============================================================================

/**
 * Status dot indicator with color based on provider status.
 */
function StatusDot({ status }: { status: ProviderStatus }) {
  const colors: Record<ProviderStatus, string> = {
    operational: 'bg-green-500',
    degraded: 'bg-yellow-500',
    outage: 'bg-red-500',
    maintenance: 'bg-blue-500',
    unknown: 'bg-gray-500',
  };

  const pulseColors: Record<ProviderStatus, string> = {
    operational: 'bg-green-500/50',
    degraded: 'bg-yellow-500/50',
    outage: 'bg-red-500/50',
    maintenance: 'bg-blue-500/50',
    unknown: 'bg-gray-500/50',
  };

  return (
    <div className="relative flex h-3 w-3">
      <span
        className={cn(
          'absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping',
          status === 'operational' ? '' : pulseColors[status]
        )}
      />
      <span
        className={cn('relative inline-flex rounded-full h-3 w-3', colors[status])}
      />
    </div>
  );
}

/**
 * Status badge with text label.
 */
function StatusBadge({ status }: { status: ProviderStatus }) {
  const variants: Record<ProviderStatus, { bg: string; text: string; label: string }> = {
    operational: { bg: 'bg-green-500/10', text: 'text-green-500', label: 'Operational' },
    degraded: { bg: 'bg-yellow-500/10', text: 'text-yellow-500', label: 'Degraded' },
    outage: { bg: 'bg-red-500/10', text: 'text-red-500', label: 'Outage' },
    maintenance: { bg: 'bg-blue-500/10', text: 'text-blue-500', label: 'Maintenance' },
    unknown: { bg: 'bg-gray-500/10', text: 'text-gray-500', label: 'Unknown' },
  };

  const variant = variants[status];

  return (
    <Badge className={cn(variant.bg, variant.text, 'border-0')}>
      {variant.label}
    </Badge>
  );
}

/**
 * Individual provider status card.
 */
interface ProviderStatusCardProps {
  provider: ProviderInfo;
  isConnected: boolean;
  onAddKey: () => void;
  onConfigure: () => void;
}

function ProviderStatusCard({
  provider,
  isConnected,
  onAddKey,
  onConfigure,
}: ProviderStatusCardProps) {
  const { data: statusData, isLoading: statusLoading } = useProviderStatus(
    isConnected ? provider.id : null
  );

  const meta = PROVIDER_META[provider.id] || {
    name: provider.display_name,
    description: '',
    docsUrl: '',
    keyPlaceholder: '',
  };

  const isEnterprise = meta.isEnterprise;

  // Format last checked timestamp
  const formatLastChecked = (timestamp: string | undefined) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString();
  };

  // Calculate uptime trend (mock for now - would be computed from historical data)
  const uptimeTrend = statusData?.uptime_percent_24h
    ? statusData.uptime_percent_24h >= 99.9
      ? 'up'
      : statusData.uptime_percent_24h >= 99.0
      ? 'stable'
      : 'down'
    : null;

  return (
    <Card className="hover:border-primary/50 transition-colors">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-muted flex items-center justify-center">
              <Cpu className="h-5 w-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-medium">{meta.name}</span>
                {isEnterprise && (
                  <Badge variant="outline" className="text-xs px-1.5 py-0 text-purple-500 border-purple-500/30">
                    Enterprise
                  </Badge>
                )}
              </div>
              <div className="text-sm text-muted-foreground">
                {provider.models_count}+ models
              </div>
            </div>
          </div>

          {isConnected ? (
            <div className="flex items-center gap-2">
              <StatusDot status={provider.status} />
              <StatusBadge status={provider.status} />
            </div>
          ) : (
            <Button
              size="sm"
              variant="outline"
              onClick={isEnterprise ? onConfigure : onAddKey}
            >
              <Plus className="h-4 w-4 mr-1" />
              {isEnterprise ? 'Configure' : 'Add Key'}
            </Button>
          )}
        </div>

        {isConnected && (
          <div className="mt-4 pt-4 border-t">
            {statusLoading ? (
              <div className="grid grid-cols-3 gap-4">
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
                <Skeleton className="h-12" />
              </div>
            ) : (
              <div className="grid grid-cols-3 gap-4 text-sm">
                {/* Latency */}
                <div>
                  <div className="text-muted-foreground mb-1">Latency</div>
                  <div className="font-medium">
                    {statusData?.latency_ms != null
                      ? `${statusData.latency_ms}ms`
                      : 'N/A'}
                  </div>
                </div>

                {/* Uptime */}
                <div>
                  <div className="text-muted-foreground mb-1">Uptime (24h)</div>
                  <div className="flex items-center gap-1 font-medium">
                    {statusData?.uptime_percent_24h != null ? (
                      <>
                        {statusData.uptime_percent_24h.toFixed(2)}%
                        {uptimeTrend === 'up' && (
                          <TrendingUp className="h-3 w-3 text-green-500" />
                        )}
                        {uptimeTrend === 'down' && (
                          <TrendingDown className="h-3 w-3 text-red-500" />
                        )}
                      </>
                    ) : (
                      'N/A'
                    )}
                  </div>
                </div>

                {/* Last Checked */}
                <div>
                  <div className="text-muted-foreground mb-1">Last Checked</div>
                  <div className="flex items-center gap-1 font-medium">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    {formatLastChecked(statusData?.last_checked_at)}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

/**
 * Loading skeleton for provider cards.
 */
function ProviderCardSkeleton() {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <Skeleton className="w-10 h-10 rounded-lg" />
            <div>
              <Skeleton className="h-5 w-24 mb-1" />
              <Skeleton className="h-4 w-16" />
            </div>
          </div>
          <Skeleton className="h-6 w-20" />
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Simple Add Key Modal for standard providers.
 */
interface AddKeySheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  providerId: string | null;
}

function AddKeySheet({ open, onOpenChange, providerId }: AddKeySheetProps) {
  const [apiKey, setApiKey] = useState('');
  const addProviderKey = useAddProviderKey();

  const meta = providerId ? PROVIDER_META[providerId] : null;

  const handleSubmit = async () => {
    if (!providerId || !apiKey.trim()) return;

    try {
      await addProviderKey.mutateAsync({
        provider: providerId as any,
        api_key: apiKey,
      });
      toast.success({
        title: 'API Key Added',
        description: `Your ${meta?.name || providerId} API key has been saved.`,
      });
      setApiKey('');
      onOpenChange(false);
    } catch (err) {
      toast.error({
        title: 'Failed to add API key',
        description: err instanceof Error ? err.message : 'An error occurred',
      });
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Add {meta?.name || 'Provider'} API Key</SheetTitle>
          <SheetDescription>
            Enter your API key to connect to {meta?.name || 'this provider'}.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-4">
          <div className="space-y-2">
            <label className="text-sm font-medium">API Key</label>
            <Input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              placeholder={meta?.keyPlaceholder || 'Enter your API key'}
            />
            {meta?.docsUrl && (
              <p className="text-xs text-muted-foreground">
                Get your API key from{' '}
                <a
                  href={meta.docsUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline"
                >
                  {meta.name} Console
                </a>
              </p>
            )}
          </div>
        </div>

        <SheetFooter className="mt-6">
          <Button
            variant="outline"
            onClick={() => {
              setApiKey('');
              onOpenChange(false);
            }}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={!apiKey.trim() || addProviderKey.isPending}
          >
            {addProviderKey.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : null}
            Save Key
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

/**
 * Enterprise Configuration Sheet for Azure, AWS Bedrock, and Vertex AI.
 */
interface EnterpriseConfigSheetProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  enterpriseType: EnterpriseProvider | null;
}

function EnterpriseConfigSheet({
  open,
  onOpenChange,
  enterpriseType,
}: EnterpriseConfigSheetProps) {
  // Azure state
  const [azureApiKey, setAzureApiKey] = useState('');
  const [azureEndpoint, setAzureEndpoint] = useState('');

  // AWS Bedrock state
  const [awsAccessKey, setAwsAccessKey] = useState('');
  const [awsSecretKey, setAwsSecretKey] = useState('');
  const [awsRegion, setAwsRegion] = useState('us-east-1');

  // Vertex AI state
  const [serviceAccountJson, setServiceAccountJson] = useState('');
  const [gcpProjectId, setGcpProjectId] = useState('');
  const [gcpLocation, setGcpLocation] = useState('us-central1');

  const addProviderKey = useAddProviderKey();

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        setServiceAccountJson(content);
      };
      reader.readAsText(file);
    }
  };

  const handleSubmit = async () => {
    if (!enterpriseType) return;

    try {
      let apiKeyPayload = '';

      switch (enterpriseType) {
        case 'azure_openai':
          if (!azureApiKey.trim() || !azureEndpoint.trim()) {
            toast.error({
              title: 'Missing fields',
              description: 'Please fill in all required fields.',
            });
            return;
          }
          // Encode Azure config as JSON in the API key field
          apiKeyPayload = JSON.stringify({
            type: 'azure',
            apiKey: azureApiKey,
            endpoint: azureEndpoint,
          });
          break;

        case 'aws_bedrock':
          if (!awsAccessKey.trim() || !awsSecretKey.trim()) {
            toast.error({
              title: 'Missing fields',
              description: 'Please fill in all required fields.',
            });
            return;
          }
          apiKeyPayload = JSON.stringify({
            type: 'aws_bedrock',
            accessKey: awsAccessKey,
            secretKey: awsSecretKey,
            region: awsRegion,
          });
          break;

        case 'google_vertex':
          if (!serviceAccountJson.trim() || !gcpProjectId.trim()) {
            toast.error({
              title: 'Missing fields',
              description: 'Please fill in all required fields.',
            });
            return;
          }
          apiKeyPayload = JSON.stringify({
            type: 'google_vertex',
            serviceAccountJson: serviceAccountJson,
            projectId: gcpProjectId,
            location: gcpLocation,
          });
          break;
      }

      await addProviderKey.mutateAsync({
        provider: enterpriseType as any,
        api_key: apiKeyPayload,
      });

      const providerName = PROVIDER_META[enterpriseType]?.name || enterpriseType;
      toast.success({
        title: 'Configuration Saved',
        description: `Your ${providerName} configuration has been saved.`,
      });

      // Reset form
      setAzureApiKey('');
      setAzureEndpoint('');
      setAwsAccessKey('');
      setAwsSecretKey('');
      setAwsRegion('us-east-1');
      setServiceAccountJson('');
      setGcpProjectId('');
      setGcpLocation('us-central1');
      onOpenChange(false);
    } catch (err) {
      toast.error({
        title: 'Failed to save configuration',
        description: err instanceof Error ? err.message : 'An error occurred',
      });
    }
  };

  const providerName = enterpriseType
    ? PROVIDER_META[enterpriseType]?.name || enterpriseType
    : 'Enterprise Provider';

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="sm:max-w-lg overflow-y-auto">
        <SheetHeader>
          <SheetTitle>Configure {providerName}</SheetTitle>
          <SheetDescription>
            Set up your enterprise credentials to connect to {providerName}.
          </SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          {/* Azure OpenAI Configuration */}
          {enterpriseType === 'azure_openai' && (
            <>
              <div className="p-3 rounded-lg bg-blue-500/5 border border-blue-500/20">
                <div className="flex items-center gap-2 text-sm text-blue-500 mb-2">
                  <AlertCircle className="h-4 w-4" />
                  <span className="font-medium">Azure OpenAI Setup</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  You need an Azure OpenAI resource deployed in your Azure subscription.
                  Get your API key and endpoint from the Azure Portal.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">API Key *</label>
                <Input
                  type="password"
                  value={azureApiKey}
                  onChange={(e) => setAzureApiKey(e.target.value)}
                  placeholder="Enter your Azure OpenAI API key"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Endpoint URL *</label>
                <Input
                  type="url"
                  value={azureEndpoint}
                  onChange={(e) => setAzureEndpoint(e.target.value)}
                  placeholder="https://your-resource.openai.azure.com/"
                />
                <p className="text-xs text-muted-foreground">
                  The endpoint URL for your Azure OpenAI resource.
                </p>
              </div>
            </>
          )}

          {/* AWS Bedrock Configuration */}
          {enterpriseType === 'aws_bedrock' && (
            <>
              <div className="p-3 rounded-lg bg-orange-500/5 border border-orange-500/20">
                <div className="flex items-center gap-2 text-sm text-orange-500 mb-2">
                  <AlertCircle className="h-4 w-4" />
                  <span className="font-medium">AWS Bedrock Setup</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Create an IAM user with Bedrock access permissions and generate
                  access keys from the AWS Console.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Access Key ID *</label>
                <Input
                  type="password"
                  value={awsAccessKey}
                  onChange={(e) => setAwsAccessKey(e.target.value)}
                  placeholder="AKIAIOSFODNN7EXAMPLE"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Secret Access Key *</label>
                <Input
                  type="password"
                  value={awsSecretKey}
                  onChange={(e) => setAwsSecretKey(e.target.value)}
                  placeholder="wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Region *</label>
                <Select value={awsRegion} onValueChange={setAwsRegion}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a region" />
                  </SelectTrigger>
                  <SelectContent>
                    {AWS_REGIONS.map((region) => (
                      <SelectItem key={region.value} value={region.value}>
                        {region.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Choose the AWS region where Bedrock is enabled for your account.
                </p>
              </div>
            </>
          )}

          {/* Google Vertex AI Configuration */}
          {enterpriseType === 'google_vertex' && (
            <>
              <div className="p-3 rounded-lg bg-green-500/5 border border-green-500/20">
                <div className="flex items-center gap-2 text-sm text-green-500 mb-2">
                  <AlertCircle className="h-4 w-4" />
                  <span className="font-medium">Vertex AI Setup</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Create a service account with Vertex AI User role and download
                  the JSON key file from the GCP Console.
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Service Account JSON *</label>
                <div className="space-y-2">
                  <div className="flex gap-2">
                    <Input
                      type="file"
                      accept=".json"
                      onChange={handleFileUpload}
                      className="hidden"
                      id="service-account-file"
                    />
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() =>
                        document.getElementById('service-account-file')?.click()
                      }
                    >
                      <Upload className="h-4 w-4 mr-2" />
                      Upload JSON Key File
                    </Button>
                  </div>
                  {serviceAccountJson && (
                    <div className="flex items-center gap-2 text-sm text-green-500">
                      <CheckCircle className="h-4 w-4" />
                      Service account file loaded
                    </div>
                  )}
                  <Textarea
                    value={serviceAccountJson}
                    onChange={(e) => setServiceAccountJson(e.target.value)}
                    placeholder="Or paste the JSON content here..."
                    className="font-mono text-xs h-24"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Project ID *</label>
                <Input
                  value={gcpProjectId}
                  onChange={(e) => setGcpProjectId(e.target.value)}
                  placeholder="my-gcp-project-id"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Location *</label>
                <Select value={gcpLocation} onValueChange={setGcpLocation}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select a location" />
                  </SelectTrigger>
                  <SelectContent>
                    {GCP_LOCATIONS.map((location) => (
                      <SelectItem key={location.value} value={location.value}>
                        {location.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  The GCP region where your Vertex AI endpoints are deployed.
                </p>
              </div>
            </>
          )}
        </div>

        <SheetFooter className="mt-6">
          <Button
            variant="outline"
            onClick={() => onOpenChange(false)}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            disabled={addProviderKey.isPending}
          >
            {addProviderKey.isPending ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : null}
            Save Configuration
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}

// ============================================================================
// Main Page Component
// ============================================================================

export default function ProvidersPage() {
  // Hooks
  const { data: providers, isLoading: providersLoading, error: providersError, refetch } = useProviders();
  const { data: providerKeys, isLoading: keysLoading } = useProviderKeys();

  // State for modals
  const [addKeyOpen, setAddKeyOpen] = useState(false);
  const [addKeyProviderId, setAddKeyProviderId] = useState<string | null>(null);
  const [enterpriseConfigOpen, setEnterpriseConfigOpen] = useState(false);
  const [enterpriseType, setEnterpriseType] = useState<EnterpriseProvider | null>(null);

  // Determine connected vs not connected providers
  const connectedProviderIds = useMemo(() => {
    return new Set(providerKeys?.map((k) => k.provider) || []);
  }, [providerKeys]);

  const { connectedProviders, notConnectedProviders } = useMemo(() => {
    if (!providers) return { connectedProviders: [], notConnectedProviders: [] };

    const connected: ProviderInfo[] = [];
    const notConnected: ProviderInfo[] = [];

    // Use providers from API if available, otherwise use PROVIDER_META keys
    const allProviderIds = new Set([
      ...(providers?.map((p) => p.id) || []),
      ...Object.keys(PROVIDER_META),
    ]);

    allProviderIds.forEach((id) => {
      const providerFromApi = providers?.find((p) => p.id === id);
      const meta = PROVIDER_META[id];

      if (!meta && !providerFromApi) return;

      const provider: ProviderInfo = providerFromApi || {
        id,
        name: meta?.name || id,
        display_name: meta?.name || id,
        status: 'unknown',
        is_enabled: true,
        requires_api_key: true,
        supports_byok: true,
        models_count: 0,
      };

      if (connectedProviderIds.has(id)) {
        connected.push(provider);
      } else {
        notConnected.push(provider);
      }
    });

    return { connectedProviders: connected, notConnectedProviders: notConnected };
  }, [providers, connectedProviderIds]);

  // Handlers
  const handleAddKey = useCallback((providerId: string) => {
    setAddKeyProviderId(providerId);
    setAddKeyOpen(true);
  }, []);

  const handleConfigure = useCallback((providerId: string) => {
    const meta = PROVIDER_META[providerId];
    if (meta?.enterpriseType) {
      setEnterpriseType(meta.enterpriseType);
      setEnterpriseConfigOpen(true);
    }
  }, []);

  const handleRefresh = useCallback(() => {
    refetch();
  }, [refetch]);

  const isLoading = providersLoading || keysLoading;

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">AI Provider Status</h2>
          <p className="text-sm text-muted-foreground">
            Monitor and manage your AI provider connections
          </p>
        </div>
        <Button variant="outline" size="sm" onClick={handleRefresh}>
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      <div className="space-y-8">
          {/* Error State */}
          {providersError && (
            <Card className="border-red-500/50 bg-red-500/5">
              <CardContent className="p-4 flex items-center gap-3 text-red-500">
                <XCircle className="h-5 w-5" />
                <span>Failed to load providers. Please try again.</span>
              </CardContent>
            </Card>
          )}

          {/* Connected Providers Section */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <h2 className="text-lg font-semibold">Connected</h2>
              <Badge variant="secondary" className="ml-2">
                {connectedProviders.length}
              </Badge>
            </div>

            {isLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3].map((i) => (
                  <ProviderCardSkeleton key={i} />
                ))}
              </div>
            ) : connectedProviders.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {connectedProviders.map((provider) => (
                  <ProviderStatusCard
                    key={provider.id}
                    provider={provider}
                    isConnected={true}
                    onAddKey={() => handleAddKey(provider.id)}
                    onConfigure={() => handleConfigure(provider.id)}
                  />
                ))}
              </div>
            ) : (
              <Card className="border-dashed">
                <CardContent className="p-6 text-center text-muted-foreground">
                  <Cpu className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  <p>No providers connected yet.</p>
                  <p className="text-sm">Add your first API key below to get started.</p>
                </CardContent>
              </Card>
            )}
          </section>

          {/* Not Connected Providers Section */}
          <section>
            <div className="flex items-center gap-2 mb-4">
              <AlertTriangle className="h-5 w-5 text-muted-foreground" />
              <h2 className="text-lg font-semibold">Not Connected</h2>
              <Badge variant="outline" className="ml-2">
                {notConnectedProviders.length}
              </Badge>
            </div>

            {isLoading ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <ProviderCardSkeleton key={i} />
                ))}
              </div>
            ) : notConnectedProviders.length > 0 ? (
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {notConnectedProviders.map((provider) => (
                  <ProviderStatusCard
                    key={provider.id}
                    provider={provider}
                    isConnected={false}
                    onAddKey={() => handleAddKey(provider.id)}
                    onConfigure={() => handleConfigure(provider.id)}
                  />
                ))}
              </div>
            ) : (
              <Card className="border-dashed border-green-500/50 bg-green-500/5">
                <CardContent className="p-6 text-center text-green-500">
                  <CheckCircle className="h-8 w-8 mx-auto mb-2" />
                  <p className="font-medium">All providers connected!</p>
                  <p className="text-sm opacity-80">
                    You have API keys configured for all available providers.
                  </p>
                </CardContent>
              </Card>
            )}
          </section>
        </div>

      {/* Add Key Sheet (for standard providers) */}
      <AddKeySheet
        open={addKeyOpen}
        onOpenChange={setAddKeyOpen}
        providerId={addKeyProviderId}
      />

      {/* Enterprise Configuration Sheet */}
      <EnterpriseConfigSheet
        open={enterpriseConfigOpen}
        onOpenChange={setEnterpriseConfigOpen}
        enterpriseType={enterpriseType}
      />
    </div>
  );
}
