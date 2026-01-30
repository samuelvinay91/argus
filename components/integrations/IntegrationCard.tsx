'use client';

import { useState } from 'react';
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
import {
  Integration,
  IntegrationPlatform,
  useConnectIntegration,
  useDisconnectIntegration,
  useSyncIntegration,
  useTestIntegration,
  ConnectIntegrationRequest,
} from '@/lib/hooks/use-integrations';
import { useToast } from '@/lib/hooks/useToast';
import {
  CheckCircle2,
  XCircle,
  RefreshCw,
  Unplug,
  Loader2,
  ExternalLink,
  Clock,
  Database,
  AlertCircle,
  Settings,
} from 'lucide-react';

// Platform icons and branding (Partial - not all platforms need custom styling)
const PLATFORM_CONFIG: Partial<Record<
  IntegrationPlatform,
  {
    icon: string;
    color: string;
    bgColor: string;
    oauthUrl?: string;
  }
>> = {
  github: {
    icon: '/icons/github.svg',
    color: 'text-white',
    bgColor: 'bg-[#24292e]',
  },
  gitlab: {
    icon: '/icons/gitlab.svg',
    color: 'text-orange-500',
    bgColor: 'bg-orange-50',
  },
  slack: {
    icon: '/icons/slack.svg',
    color: 'text-[#4A154B]',
    bgColor: 'bg-[#4A154B]/10',
  },
  discord: {
    icon: '/icons/discord.svg',
    color: 'text-[#5865F2]',
    bgColor: 'bg-[#5865F2]/10',
  },
  jira: {
    icon: '/icons/jira.svg',
    color: 'text-[#0052CC]',
    bgColor: 'bg-[#0052CC]/10',
  },
  linear: {
    icon: '/icons/linear.svg',
    color: 'text-[#5E6AD2]',
    bgColor: 'bg-[#5E6AD2]/10',
  },
  webhook: {
    icon: '/icons/webhook.svg',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
  },
  vercel: {
    icon: '/icons/vercel.svg',
    color: 'text-black',
    bgColor: 'bg-black/5',
  },
  netlify: {
    icon: '/icons/netlify.svg',
    color: 'text-[#00C7B7]',
    bgColor: 'bg-[#00C7B7]/10',
  },
  datadog: {
    icon: '/icons/datadog.svg',
    color: 'text-[#632CA6]',
    bgColor: 'bg-[#632CA6]/10',
  },
  sentry: {
    icon: '/icons/sentry.svg',
    color: 'text-[#362D59]',
    bgColor: 'bg-[#362D59]/10',
  },
  newrelic: {
    icon: '/icons/newrelic.svg',
    color: 'text-[#008C99]',
    bgColor: 'bg-[#008C99]/10',
  },
  fullstory: {
    icon: '/icons/fullstory.svg',
    color: 'text-[#448CFF]',
    bgColor: 'bg-[#448CFF]/10',
  },
  posthog: {
    icon: '/icons/posthog.svg',
    color: 'text-[#F54E00]',
    bgColor: 'bg-[#F54E00]/10',
  },
  logrocket: {
    icon: '/icons/logrocket.svg',
    color: 'text-[#764ABC]',
    bgColor: 'bg-[#764ABC]/10',
  },
  amplitude: {
    icon: '/icons/amplitude.svg',
    color: 'text-[#1E61CD]',
    bgColor: 'bg-[#1E61CD]/10',
  },
  mixpanel: {
    icon: '/icons/mixpanel.svg',
    color: 'text-[#7856FF]',
    bgColor: 'bg-[#7856FF]/10',
  },
};

interface IntegrationCardProps {
  integration: Integration;
  onConfigureClick?: () => void;
}

export function IntegrationCard({
  integration,
  onConfigureClick,
}: IntegrationCardProps) {
  const { toast } = useToast();
  const [isConfigOpen, setIsConfigOpen] = useState(false);
  const [isDisconnectOpen, setIsDisconnectOpen] = useState(false);
  const [configValues, setConfigValues] = useState<ConnectIntegrationRequest>(
    {}
  );

  const connectMutation = useConnectIntegration();
  const disconnectMutation = useDisconnectIntegration();
  const syncMutation = useSyncIntegration();
  const testMutation = useTestIntegration();

  const platformConfig = PLATFORM_CONFIG[integration.platform] || {
    icon: '/icons/default.svg',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
  };

  const handleConnect = async () => {
    try {
      // For OAuth integrations, redirect to OAuth flow
      if (integration.auth_type === 'oauth') {
        const response = await connectMutation.mutateAsync({
          platform: integration.platform,
          config: configValues,
        });
        if (response.oauth_url) {
          window.location.href = response.oauth_url;
          return;
        }
      }

      // For API key integrations, connect directly
      await connectMutation.mutateAsync({
        platform: integration.platform,
        config: configValues,
      });

      toast({
        title: 'Connected successfully',
        description: `${integration.name} has been connected.`,
      });
      setIsConfigOpen(false);
    } catch (error) {
      toast({
        title: 'Connection failed',
        description:
          error instanceof Error ? error.message : 'Failed to connect',
        variant: 'destructive',
      });
    }
  };

  const handleDisconnect = async () => {
    try {
      await disconnectMutation.mutateAsync(integration.platform);
      toast({
        title: 'Disconnected',
        description: `${integration.name} has been disconnected.`,
      });
      setIsDisconnectOpen(false);
    } catch (error) {
      toast({
        title: 'Disconnect failed',
        description:
          error instanceof Error ? error.message : 'Failed to disconnect',
        variant: 'destructive',
      });
    }
  };

  const handleSync = async () => {
    try {
      await syncMutation.mutateAsync(integration.platform);
      toast({
        title: 'Sync started',
        description: `Syncing data from ${integration.name}...`,
      });
    } catch (error) {
      toast({
        title: 'Sync failed',
        description: error instanceof Error ? error.message : 'Failed to sync',
        variant: 'destructive',
      });
    }
  };

  const handleTestConnection = async () => {
    try {
      const result = await testMutation.mutateAsync(integration.platform);
      if (result.success) {
        toast({
          title: 'Connection test passed',
          description: `${integration.name} is responding correctly.`,
        });
      } else {
        toast({
          title: 'Connection test failed',
          description: result.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Test failed',
        description:
          error instanceof Error ? error.message : 'Failed to test connection',
        variant: 'destructive',
      });
    }
  };

  const formatTimestamp = (timestamp: string | null | undefined) => {
    if (!timestamp) return 'Never';
    const date = new Date(timestamp);
    return date.toLocaleString();
  };

  const renderConfigForm = () => {
    switch (integration.platform) {
      case 'github':
      case 'slack':
      case 'jira':
        // OAuth integrations
        return (
          <div className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Click the button below to authorize {integration.name} via OAuth.
            </p>
          </div>
        );

      case 'sentry':
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Auth Token</label>
              <Input
                type="password"
                placeholder="sntrys_..."
                value={configValues.auth_token || ''}
                onChange={(e) =>
                  setConfigValues({ ...configValues, auth_token: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                Create at Settings &gt; Account &gt; API &gt; Auth Tokens
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">Organization Slug</label>
              <Input
                placeholder="my-organization"
                value={configValues.org_slug || ''}
                onChange={(e) =>
                  setConfigValues({ ...configValues, org_slug: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                From your Sentry URL: sentry.io/organizations/<strong>slug</strong>/
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">Project Slug (Optional)</label>
              <Input
                placeholder="my-project"
                value={configValues.project_slug || ''}
                onChange={(e) =>
                  setConfigValues({ ...configValues, project_slug: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                Leave empty to sync all projects in the organization
              </p>
            </div>
          </div>
        );

      case 'datadog':
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">API Key</label>
              <Input
                type="password"
                placeholder="Enter your Datadog API key"
                value={configValues.api_key || ''}
                onChange={(e) =>
                  setConfigValues({ ...configValues, api_key: e.target.value })
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium">Application Key</label>
              <Input
                type="password"
                placeholder="Enter your Datadog application key"
                value={configValues.application_key || ''}
                onChange={(e) =>
                  setConfigValues({
                    ...configValues,
                    application_key: e.target.value,
                  })
                }
              />
            </div>
            <div>
              <label className="text-sm font-medium">Site</label>
              <Input
                placeholder="datadoghq.com"
                value={configValues.site || ''}
                onChange={(e) =>
                  setConfigValues({ ...configValues, site: e.target.value })
                }
              />
            </div>
          </div>
        );

      case 'newrelic':
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">API Key</label>
              <Input
                type="password"
                placeholder="Enter your New Relic API key"
                value={configValues.api_key || ''}
                onChange={(e) =>
                  setConfigValues({ ...configValues, api_key: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                Create a User API key in New Relic
              </p>
            </div>
          </div>
        );

      case 'vercel':
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">API Token</label>
              <Input
                type="password"
                placeholder="Enter your Vercel API token"
                value={configValues.api_key || ''}
                onChange={(e) =>
                  setConfigValues({ ...configValues, api_key: e.target.value })
                }
              />
              <p className="text-xs text-muted-foreground mt-1">
                Create a token in Vercel Settings &gt; Tokens
              </p>
            </div>
            <div>
              <label className="text-sm font-medium">Team ID (Optional)</label>
              <Input
                placeholder="team_xxx (leave blank for personal account)"
                value={configValues.team_id || ''}
                onChange={(e) =>
                  setConfigValues({ ...configValues, team_id: e.target.value })
                }
              />
            </div>
          </div>
        );

      case 'webhook':
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Webhook URL</label>
              <Input
                placeholder="https://your-webhook-url.com"
                value={configValues.webhook_url || ''}
                onChange={(e) =>
                  setConfigValues({
                    ...configValues,
                    webhook_url: e.target.value,
                  })
                }
              />
            </div>
          </div>
        );

      default:
        return (
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">API Key</label>
              <Input
                type="password"
                placeholder="Enter your API key"
                value={configValues.api_key || ''}
                onChange={(e) =>
                  setConfigValues({ ...configValues, api_key: e.target.value })
                }
              />
            </div>
          </div>
        );
    }
  };

  return (
    <Card className="relative overflow-hidden">
      {/* Status indicator bar */}
      <div
        className={`absolute top-0 left-0 right-0 h-1 ${
          integration.connected
            ? integration.sync_status === 'error'
              ? 'bg-red-500'
              : integration.sync_status === 'syncing'
                ? 'bg-blue-500 animate-pulse'
                : 'bg-green-500'
            : 'bg-gray-300'
        }`}
      />

      <CardHeader className="pb-3">
        <div className="flex items-start justify-between">
          <div className="flex items-center gap-3">
            {/* Platform icon */}
            <div
              className={`w-10 h-10 rounded-lg flex items-center justify-center ${platformConfig.bgColor}`}
            >
              <span className="text-xl font-bold">{integration.name[0]}</span>
            </div>
            <div>
              <CardTitle className="text-lg">{integration.name}</CardTitle>
              <CardDescription className="text-sm">
                {integration.description}
              </CardDescription>
            </div>
          </div>
          {/* Connection status badge */}
          <Badge
            variant={integration.connected ? 'default' : 'secondary'}
            className={
              integration.connected
                ? 'bg-green-100 text-green-700 hover:bg-green-100'
                : ''
            }
          >
            {integration.connected ? (
              <>
                <CheckCircle2 className="w-3 h-3 mr-1" /> Connected
              </>
            ) : (
              <>
                <XCircle className="w-3 h-3 mr-1" /> Not Connected
              </>
            )}
          </Badge>
        </div>
      </CardHeader>

      <CardContent className="pb-3">
        {/* Features list */}
        <div className="flex flex-wrap gap-1 mb-4">
          {integration.features.slice(0, 3).map((feature) => (
            <Badge key={feature} variant="outline" className="text-xs">
              {feature}
            </Badge>
          ))}
          {integration.features.length > 3 && (
            <Badge variant="outline" className="text-xs">
              +{integration.features.length - 3} more
            </Badge>
          )}
        </div>

        {/* Connection details (when connected) */}
        {integration.connected && (
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="flex items-center gap-1">
                <Clock className="w-4 h-4" /> Last sync:
              </span>
              <span>{formatTimestamp(integration.last_sync_at)}</span>
            </div>
            <div className="flex items-center justify-between text-muted-foreground">
              <span className="flex items-center gap-1">
                <Database className="w-4 h-4" /> Data points:
              </span>
              <span>{integration.data_points?.toLocaleString() || 0}</span>
            </div>
            {integration.error_message && (
              <div className="flex items-start gap-1 text-red-600 bg-red-50 p-2 rounded">
                <AlertCircle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <span className="text-xs">{integration.error_message}</span>
              </div>
            )}
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-3 border-t flex flex-wrap gap-2">
        {integration.connected ? (
          <>
            {/* Sync button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleSync}
              disabled={syncMutation.isPending}
            >
              {syncMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4 mr-1" />
              )}
              Sync Now
            </Button>

            {/* Test connection button */}
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestConnection}
              disabled={testMutation.isPending}
            >
              {testMutation.isPending ? (
                <Loader2 className="w-4 h-4 mr-1 animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4 mr-1" />
              )}
              Test
            </Button>

            {/* Configure button */}
            {onConfigureClick && (
              <Button variant="outline" size="sm" onClick={onConfigureClick}>
                <Settings className="w-4 h-4 mr-1" />
                Configure
              </Button>
            )}

            {/* Disconnect button with confirmation */}
            <Dialog open={isDisconnectOpen} onOpenChange={setIsDisconnectOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="text-red-600">
                  <Unplug className="w-4 h-4 mr-1" />
                  Disconnect
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Disconnect {integration.name}?</DialogTitle>
                  <DialogDescription>
                    This will remove the integration connection and stop syncing
                    data. Any webhooks registered with {integration.name} will
                    be deleted. This action cannot be undone.
                  </DialogDescription>
                </DialogHeader>
                <DialogFooter>
                  <Button
                    variant="outline"
                    onClick={() => setIsDisconnectOpen(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    onClick={handleDisconnect}
                    disabled={disconnectMutation.isPending}
                  >
                    {disconnectMutation.isPending ? (
                      <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                    ) : null}
                    Disconnect
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          </>
        ) : (
          // Connect button with configuration modal
          <Dialog open={isConfigOpen} onOpenChange={setIsConfigOpen}>
            <DialogTrigger asChild>
              <Button size="sm">
                <ExternalLink className="w-4 h-4 mr-1" />
                Connect {integration.name}
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Connect {integration.name}</DialogTitle>
                <DialogDescription>
                  {integration.auth_type === 'oauth'
                    ? `Authorize Argus to access your ${integration.name} account.`
                    : `Enter your ${integration.name} credentials to connect.`}
                </DialogDescription>
              </DialogHeader>
              {renderConfigForm()}
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setIsConfigOpen(false)}
                >
                  Cancel
                </Button>
                <Button
                  onClick={handleConnect}
                  disabled={connectMutation.isPending}
                >
                  {connectMutation.isPending ? (
                    <Loader2 className="w-4 h-4 mr-1 animate-spin" />
                  ) : null}
                  {integration.auth_type === 'oauth'
                    ? 'Authorize'
                    : 'Connect'}
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        )}
      </CardFooter>
    </Card>
  );
}

export default IntegrationCard;
