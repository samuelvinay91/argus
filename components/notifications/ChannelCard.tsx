'use client';

import { useState } from 'react';
import { safeFormatDistanceToNow } from '@/lib/utils';
import {
  MoreVertical,
  Edit,
  Trash2,
  TestTube,
  CheckCircle,
  XCircle,
  AlertCircle,
  ExternalLink,
  Bell,
  MessageSquare,
  Mail,
  Webhook,
  Loader2,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { cn } from '@/lib/utils';

// Channel type icons
const CHANNEL_ICONS: Record<string, React.ReactNode> = {
  slack: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M5.042 15.165a2.528 2.528 0 0 1-2.52 2.523A2.528 2.528 0 0 1 0 15.165a2.527 2.527 0 0 1 2.522-2.52h2.52v2.52zm1.271 0a2.527 2.527 0 0 1 2.521-2.52 2.527 2.527 0 0 1 2.521 2.52v6.313A2.528 2.528 0 0 1 8.834 24a2.528 2.528 0 0 1-2.521-2.522v-6.313zM8.834 5.042a2.528 2.528 0 0 1-2.521-2.52A2.528 2.528 0 0 1 8.834 0a2.528 2.528 0 0 1 2.521 2.522v2.52H8.834zm0 1.271a2.528 2.528 0 0 1 2.521 2.521 2.528 2.528 0 0 1-2.521 2.521H2.522A2.528 2.528 0 0 1 0 8.834a2.528 2.528 0 0 1 2.522-2.521h6.312zm10.124 2.521a2.528 2.528 0 0 1 2.52-2.521A2.528 2.528 0 0 1 24 8.834a2.528 2.528 0 0 1-2.522 2.521h-2.52V8.834zm-1.271 0a2.528 2.528 0 0 1-2.521 2.521 2.528 2.528 0 0 1-2.521-2.521V2.522A2.528 2.528 0 0 1 15.165 0a2.528 2.528 0 0 1 2.522 2.522v6.312zm-2.522 10.124a2.528 2.528 0 0 1 2.522 2.52A2.528 2.528 0 0 1 15.165 24a2.527 2.527 0 0 1-2.521-2.522v-2.52h2.521zm0-1.271a2.527 2.527 0 0 1-2.521-2.521 2.527 2.527 0 0 1 2.521-2.521h6.313A2.528 2.528 0 0 1 24 15.165a2.528 2.528 0 0 1-2.522 2.521h-6.313z"/>
    </svg>
  ),
  discord: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"/>
    </svg>
  ),
  teams: (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M19.75 3a2.25 2.25 0 0 1 2.245 2.096L22 5.25v13.5a2.25 2.25 0 0 1-2.096 2.245L19.75 21H4.25a2.25 2.25 0 0 1-2.245-2.096L2 18.75V5.25a2.25 2.25 0 0 1 2.096-2.245L4.25 3h15.5zm-9.5 6h-5.5v8.5h5.5V9zm4.5 3h-3v5.5h3V12zm3.5-3h-3v8.5h3V9z"/>
    </svg>
  ),
  email: <Mail className="h-5 w-5" />,
  webhook: <Webhook className="h-5 w-5" />,
  pagerduty: <AlertCircle className="h-5 w-5" />,
  opsgenie: <Bell className="h-5 w-5" />,
};

export interface NotificationChannel {
  id: string;
  name: string;
  channel_type: 'slack' | 'email' | 'webhook' | 'discord' | 'teams' | 'pagerduty' | 'opsgenie';
  config: Record<string, any>;
  enabled: boolean;
  verified: boolean;
  rate_limit_per_hour: number;
  sent_today: number;
  last_sent_at?: string;
  created_at: string;
  rules_count?: number;
}

interface ChannelCardProps {
  channel: NotificationChannel;
  onEdit: (channel: NotificationChannel) => void;
  onDelete: (channelId: string) => void;
  onTest: (channelId: string) => Promise<boolean>;
}

function getChannelIcon(type: string) {
  return CHANNEL_ICONS[type] || <Bell className="h-5 w-5" />;
}

function getChannelColor(type: string): string {
  const colors: Record<string, string> = {
    slack: 'bg-[#4A154B]/10 text-[#4A154B]',
    discord: 'bg-[#5865F2]/10 text-[#5865F2]',
    teams: 'bg-[#6264A7]/10 text-[#6264A7]',
    email: 'bg-blue-500/10 text-blue-500',
    webhook: 'bg-orange-500/10 text-orange-500',
    pagerduty: 'bg-green-500/10 text-green-500',
    opsgenie: 'bg-blue-600/10 text-blue-600',
  };
  return colors[type] || 'bg-muted text-muted-foreground';
}

function getConfigSummary(channel: NotificationChannel): string {
  const { config, channel_type } = channel;

  switch (channel_type) {
    case 'slack':
      return config.channel || 'Webhook configured';
    case 'discord':
      return 'Webhook configured';
    case 'email':
      const recipients = config.recipients || [];
      if (recipients.length === 0) return 'No recipients';
      if (recipients.length === 1) return recipients[0];
      return `${recipients[0]} +${recipients.length - 1} more`;
    case 'webhook':
      try {
        const url = new URL(config.url);
        return url.hostname;
      } catch {
        return 'Custom URL';
      }
    case 'teams':
      return 'Teams webhook';
    case 'pagerduty':
      return config.routing_key ? 'Service configured' : 'Not configured';
    case 'opsgenie':
      return config.api_key ? 'API configured' : 'Not configured';
    default:
      return 'Configured';
  }
}

export function ChannelCard({
  channel,
  onEdit,
  onDelete,
  onTest,
}: ChannelCardProps) {
  const [showActions, setShowActions] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);

  const handleTest = async () => {
    setTesting(true);
    setTestResult(null);

    try {
      const success = await onTest(channel.id);
      setTestResult(success ? 'success' : 'error');
    } catch {
      setTestResult('error');
    } finally {
      setTesting(false);
      // Clear result after 3 seconds
      setTimeout(() => setTestResult(null), 3000);
    }
  };

  return (
    <Card className={cn(
      'transition-all duration-200',
      !channel.enabled && 'opacity-60'
    )}>
      <CardContent className="p-4">
        <div className="flex items-start gap-4">
          {/* Channel Icon */}
          <div className={cn(
            'p-3 rounded-lg flex-shrink-0',
            getChannelColor(channel.channel_type)
          )}>
            {getChannelIcon(channel.channel_type)}
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            {/* Header */}
            <div className="flex items-start justify-between gap-2">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="font-semibold text-sm truncate">{channel.name}</h3>
                  {!channel.enabled && (
                    <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                      Disabled
                    </span>
                  )}
                </div>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {getConfigSummary(channel)}
                </p>
              </div>

              {/* Actions Menu */}
              <div className="relative flex-shrink-0">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-8 w-8 p-0"
                  onClick={() => setShowActions(!showActions)}
                >
                  <MoreVertical className="h-4 w-4" />
                </Button>

                {showActions && (
                  <>
                    <div
                      className="fixed inset-0 z-10"
                      onClick={() => setShowActions(false)}
                    />
                    <div className="absolute right-0 top-full mt-1 z-20 w-40 rounded-md border bg-popover shadow-md py-1">
                      <button
                        className="w-full px-3 py-1.5 text-sm text-left hover:bg-muted flex items-center gap-2"
                        onClick={() => {
                          onEdit(channel);
                          setShowActions(false);
                        }}
                      >
                        <Edit className="h-4 w-4" />
                        Configure
                      </button>
                      <button
                        className="w-full px-3 py-1.5 text-sm text-left hover:bg-muted flex items-center gap-2"
                        onClick={() => {
                          handleTest();
                          setShowActions(false);
                        }}
                        disabled={testing}
                      >
                        <TestTube className="h-4 w-4" />
                        Test Channel
                      </button>
                      <div className="h-px bg-border my-1" />
                      <button
                        className="w-full px-3 py-1.5 text-sm text-left hover:bg-muted flex items-center gap-2 text-destructive"
                        onClick={() => {
                          onDelete(channel.id);
                          setShowActions(false);
                        }}
                      >
                        <Trash2 className="h-4 w-4" />
                        Delete
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Status Row */}
            <div className="mt-3 flex items-center gap-4 flex-wrap">
              {/* Connection Status */}
              <div className="flex items-center gap-1.5">
                {channel.verified ? (
                  <CheckCircle className="h-3.5 w-3.5 text-green-500" />
                ) : (
                  <AlertCircle className="h-3.5 w-3.5 text-yellow-500" />
                )}
                <span className={cn(
                  'text-xs font-medium',
                  channel.verified ? 'text-green-500' : 'text-yellow-500'
                )}>
                  {channel.verified ? 'Connected' : 'Unverified'}
                </span>
              </div>

              {/* Channel Type */}
              <span className="text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground capitalize">
                {channel.channel_type}
              </span>

              {/* Rules Count */}
              {channel.rules_count !== undefined && (
                <span className="text-xs text-muted-foreground">
                  {channel.rules_count} rule{channel.rules_count !== 1 ? 's' : ''}
                </span>
              )}

              {/* Rate Limit */}
              <span className="text-xs text-muted-foreground">
                {channel.sent_today}/{channel.rate_limit_per_hour} /hr
              </span>
            </div>

            {/* Last Sent */}
            {channel.last_sent_at && (
              <div className="mt-2 text-xs text-muted-foreground">
                Last sent: {safeFormatDistanceToNow(channel.last_sent_at, { addSuffix: true })}
              </div>
            )}

            {/* Actions */}
            <div className="mt-3 flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={handleTest}
                disabled={testing || !channel.enabled}
              >
                {testing ? (
                  <>
                    <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                    Testing...
                  </>
                ) : testResult === 'success' ? (
                  <>
                    <CheckCircle className="h-3 w-3 mr-1 text-green-500" />
                    Sent!
                  </>
                ) : testResult === 'error' ? (
                  <>
                    <XCircle className="h-3 w-3 mr-1 text-red-500" />
                    Failed
                  </>
                ) : (
                  <>
                    <TestTube className="h-3 w-3 mr-1" />
                    Test
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="h-7 text-xs"
                onClick={() => onEdit(channel)}
              >
                <Edit className="h-3 w-3 mr-1" />
                Configure
              </Button>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
