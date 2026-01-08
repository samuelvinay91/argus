'use client';

import { useState, useEffect } from 'react';
import {
  X,
  Bell,
  Mail,
  MessageSquare,
  Webhook,
  Save,
  Loader2,
  AlertCircle,
  Check,
  Plus,
  Trash2,
  TestTube,
  CheckCircle,
  XCircle,
} from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type ChannelType = 'slack' | 'email' | 'webhook' | 'discord' | 'teams' | 'pagerduty' | 'opsgenie';

interface SlackConfig {
  webhook_url: string;
  channel: string;
  mention_users: string[];
}

interface EmailConfig {
  recipients: string[];
  cc: string[];
  reply_to: string;
}

interface WebhookConfig {
  url: string;
  method: 'POST' | 'PUT' | 'GET';
  headers: Record<string, string>;
  secret: string;
}

interface DiscordConfig {
  webhook_url: string;
}

interface TeamsConfig {
  webhook_url: string;
}

interface PagerDutyConfig {
  routing_key: string;
  severity: 'critical' | 'error' | 'warning' | 'info';
}

interface OpsgenieConfig {
  api_key: string;
  priority: 'P1' | 'P2' | 'P3' | 'P4' | 'P5';
}

type ChannelConfig = SlackConfig | EmailConfig | WebhookConfig | DiscordConfig | TeamsConfig | PagerDutyConfig | OpsgenieConfig;

export interface NotificationRule {
  id?: string;
  name?: string;
  event_type: string;
  conditions: {
    severity?: string[];
    threshold?: {
      type: string;
      operator: string;
      value: number;
    };
  };
  priority: 'low' | 'normal' | 'high' | 'urgent';
  cooldown_minutes: number;
  enabled: boolean;
}

// Internal form data type - not exported, use ChannelFormData from use-notifications hook
interface InternalChannelFormData {
  name: string;
  channel_type: ChannelType;
  config: ChannelConfig;
  enabled: boolean;
  rate_limit_per_hour: number;
  rules: NotificationRule[];
}

// Props use generic record type for config to be compatible with the hook's ChannelFormData
export interface ChannelFormData {
  name: string;
  channel_type: ChannelType;
  config: Record<string, unknown>;
  enabled: boolean;
  rate_limit_per_hour: number;
  rules: {
    event_type: string;
    conditions?: Record<string, unknown>;
    priority?: 'low' | 'normal' | 'high' | 'urgent';
    cooldown_minutes?: number;
  }[];
}

interface CreateChannelModalProps {
  open: boolean;
  onClose: () => void;
  onSave: (data: ChannelFormData) => Promise<void>;
  onTest?: (data: ChannelFormData) => Promise<boolean>;
  initialData?: Partial<ChannelFormData>;
  isEditing?: boolean;
}

const CHANNEL_TYPES: { type: ChannelType; label: string; icon: React.ReactNode; description: string }[] = [
  {
    type: 'slack',
    label: 'Slack',
    icon: <MessageSquare className="h-5 w-5" />,
    description: 'Send notifications to a Slack channel',
  },
  {
    type: 'email',
    label: 'Email',
    icon: <Mail className="h-5 w-5" />,
    description: 'Send notifications via email',
  },
  {
    type: 'webhook',
    label: 'Webhook',
    icon: <Webhook className="h-5 w-5" />,
    description: 'Send notifications to a custom webhook',
  },
  {
    type: 'discord',
    label: 'Discord',
    icon: <MessageSquare className="h-5 w-5" />,
    description: 'Send notifications to a Discord channel',
  },
  {
    type: 'teams',
    label: 'Microsoft Teams',
    icon: <MessageSquare className="h-5 w-5" />,
    description: 'Send notifications to a Teams channel',
  },
  {
    type: 'pagerduty',
    label: 'PagerDuty',
    icon: <Bell className="h-5 w-5" />,
    description: 'Trigger PagerDuty incidents',
  },
];

const EVENT_TYPES = [
  { value: 'test.run.failed', label: 'Test Run Failed' },
  { value: 'test.run.passed', label: 'Test Run Passed' },
  { value: 'test.run.completed', label: 'Test Run Completed' },
  { value: 'schedule.run.failed', label: 'Schedule Run Failed' },
  { value: 'healing.applied', label: 'Self-Healing Applied' },
  { value: 'healing.suggested', label: 'Self-Healing Suggested' },
  { value: 'quality.score.dropped', label: 'Quality Score Dropped' },
  { value: 'visual.mismatch.detected', label: 'Visual Mismatch Detected' },
  { value: 'error.critical', label: 'Critical Error' },
];

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => !disabled && onChange(!checked)}
      disabled={disabled}
      className={cn(
        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
        checked ? 'bg-primary' : 'bg-muted',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <span
        className={cn(
          'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
          checked ? 'translate-x-6' : 'translate-x-1'
        )}
      />
    </button>
  );
}

function SlackConfigForm({ config, onChange }: { config: SlackConfig; onChange: (config: SlackConfig) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">Webhook URL *</label>
        <Input
          value={config.webhook_url}
          onChange={(e) => onChange({ ...config, webhook_url: e.target.value })}
          placeholder="https://hooks.slack.com/services/..."
          className="mt-1.5"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Get this from your Slack workspace settings
        </p>
      </div>

      <div>
        <label className="text-sm font-medium">Channel (optional)</label>
        <Input
          value={config.channel}
          onChange={(e) => onChange({ ...config, channel: e.target.value })}
          placeholder="#alerts"
          className="mt-1.5"
        />
      </div>
    </div>
  );
}

function EmailConfigForm({ config, onChange }: { config: EmailConfig; onChange: (config: EmailConfig) => void }) {
  const [newRecipient, setNewRecipient] = useState('');

  const addRecipient = () => {
    if (newRecipient && !config.recipients.includes(newRecipient)) {
      onChange({ ...config, recipients: [...config.recipients, newRecipient] });
      setNewRecipient('');
    }
  };

  const removeRecipient = (email: string) => {
    onChange({ ...config, recipients: config.recipients.filter(r => r !== email) });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">Recipients *</label>
        <div className="flex gap-2 mt-1.5">
          <Input
            value={newRecipient}
            onChange={(e) => setNewRecipient(e.target.value)}
            placeholder="email@example.com"
            onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addRecipient())}
          />
          <Button type="button" onClick={addRecipient} size="sm">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {config.recipients.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-2">
            {config.recipients.map((email) => (
              <span
                key={email}
                className="inline-flex items-center gap-1 px-2 py-1 bg-muted rounded text-sm"
              >
                {email}
                <button
                  type="button"
                  onClick={() => removeRecipient(email)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </span>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="text-sm font-medium">Reply-To (optional)</label>
        <Input
          value={config.reply_to}
          onChange={(e) => onChange({ ...config, reply_to: e.target.value })}
          placeholder="reply@example.com"
          className="mt-1.5"
        />
      </div>
    </div>
  );
}

function WebhookConfigForm({ config, onChange }: { config: WebhookConfig; onChange: (config: WebhookConfig) => void }) {
  const [headerKey, setHeaderKey] = useState('');
  const [headerValue, setHeaderValue] = useState('');

  const addHeader = () => {
    if (headerKey && headerValue) {
      onChange({ ...config, headers: { ...config.headers, [headerKey]: headerValue } });
      setHeaderKey('');
      setHeaderValue('');
    }
  };

  const removeHeader = (key: string) => {
    const { [key]: _, ...rest } = config.headers;
    onChange({ ...config, headers: rest });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">Webhook URL *</label>
        <Input
          value={config.url}
          onChange={(e) => onChange({ ...config, url: e.target.value })}
          placeholder="https://api.example.com/webhook"
          className="mt-1.5"
        />
      </div>

      <div>
        <label className="text-sm font-medium">HTTP Method</label>
        <select
          value={config.method}
          onChange={(e) => onChange({ ...config, method: e.target.value as any })}
          className="mt-1.5 w-full h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="POST">POST</option>
          <option value="PUT">PUT</option>
          <option value="GET">GET</option>
        </select>
      </div>

      <div>
        <label className="text-sm font-medium">Headers (optional)</label>
        <div className="flex gap-2 mt-1.5">
          <Input
            value={headerKey}
            onChange={(e) => setHeaderKey(e.target.value)}
            placeholder="Header name"
            className="flex-1"
          />
          <Input
            value={headerValue}
            onChange={(e) => setHeaderValue(e.target.value)}
            placeholder="Value"
            className="flex-1"
          />
          <Button type="button" onClick={addHeader} size="sm">
            <Plus className="h-4 w-4" />
          </Button>
        </div>
        {Object.keys(config.headers).length > 0 && (
          <div className="space-y-1 mt-2">
            {Object.entries(config.headers).map(([key, value]) => (
              <div key={key} className="flex items-center justify-between bg-muted px-2 py-1 rounded text-sm">
                <span className="font-mono text-xs">{key}: {value}</span>
                <button
                  type="button"
                  onClick={() => removeHeader(key)}
                  className="text-muted-foreground hover:text-foreground"
                >
                  <X className="h-3 w-3" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      <div>
        <label className="text-sm font-medium">Secret (optional)</label>
        <Input
          type="password"
          value={config.secret}
          onChange={(e) => onChange({ ...config, secret: e.target.value })}
          placeholder="Webhook signing secret"
          className="mt-1.5"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Used to sign webhook payloads for verification
        </p>
      </div>
    </div>
  );
}

function DiscordConfigForm({ config, onChange }: { config: DiscordConfig; onChange: (config: DiscordConfig) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">Webhook URL *</label>
        <Input
          value={config.webhook_url}
          onChange={(e) => onChange({ ...config, webhook_url: e.target.value })}
          placeholder="https://discord.com/api/webhooks/..."
          className="mt-1.5"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Get this from your Discord server settings under Integrations
        </p>
      </div>
    </div>
  );
}

function TeamsConfigForm({ config, onChange }: { config: TeamsConfig; onChange: (config: TeamsConfig) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">Webhook URL *</label>
        <Input
          value={config.webhook_url}
          onChange={(e) => onChange({ ...config, webhook_url: e.target.value })}
          placeholder="https://outlook.office.com/webhook/..."
          className="mt-1.5"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Get this from your Teams channel connectors
        </p>
      </div>
    </div>
  );
}

function PagerDutyConfigForm({ config, onChange }: { config: PagerDutyConfig; onChange: (config: PagerDutyConfig) => void }) {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-sm font-medium">Routing Key *</label>
        <Input
          value={config.routing_key}
          onChange={(e) => onChange({ ...config, routing_key: e.target.value })}
          placeholder="Events API v2 routing key"
          className="mt-1.5"
        />
        <p className="text-xs text-muted-foreground mt-1">
          Integration key from your PagerDuty service
        </p>
      </div>

      <div>
        <label className="text-sm font-medium">Default Severity</label>
        <select
          value={config.severity}
          onChange={(e) => onChange({ ...config, severity: e.target.value as any })}
          className="mt-1.5 w-full h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
        >
          <option value="critical">Critical</option>
          <option value="error">Error</option>
          <option value="warning">Warning</option>
          <option value="info">Info</option>
        </select>
      </div>
    </div>
  );
}

function getDefaultConfig(type: ChannelType): ChannelConfig {
  switch (type) {
    case 'slack':
      return { webhook_url: '', channel: '', mention_users: [] };
    case 'email':
      return { recipients: [], cc: [], reply_to: '' };
    case 'webhook':
      return { url: '', method: 'POST', headers: {}, secret: '' };
    case 'discord':
      return { webhook_url: '' };
    case 'teams':
      return { webhook_url: '' };
    case 'pagerduty':
      return { routing_key: '', severity: 'error' };
    case 'opsgenie':
      return { api_key: '', priority: 'P3' };
  }
}

export function CreateChannelModal({
  open,
  onClose,
  onSave,
  onTest,
  initialData,
  isEditing = false,
}: CreateChannelModalProps) {
  const [saving, setSaving] = useState(false);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState<'success' | 'error' | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [step, setStep] = useState<'type' | 'config' | 'rules'>('type');

  const [formData, setFormData] = useState<InternalChannelFormData>({
    name: '',
    channel_type: 'slack',
    config: getDefaultConfig('slack'),
    enabled: true,
    rate_limit_per_hour: 100,
    rules: [
      {
        event_type: 'test.run.failed',
        conditions: {},
        priority: 'normal',
        cooldown_minutes: 0,
        enabled: true,
      },
    ],
    ...(initialData as Partial<InternalChannelFormData>),
  });

  // Convert internal form data to the exported type for callbacks
  const toExportFormat = (data: InternalChannelFormData): ChannelFormData => ({
    name: data.name,
    channel_type: data.channel_type,
    config: data.config as unknown as Record<string, unknown>,
    enabled: data.enabled,
    rate_limit_per_hour: data.rate_limit_per_hour,
    rules: data.rules.map(r => ({
      event_type: r.event_type,
      conditions: r.conditions,
      priority: r.priority,
      cooldown_minutes: r.cooldown_minutes,
    })),
  });

  // Reset form when modal opens
  useEffect(() => {
    if (open) {
      const channelType = initialData?.channel_type || 'slack';
      const defaultRules: NotificationRule[] = [
        {
          event_type: 'test.run.failed',
          conditions: {},
          priority: 'normal',
          cooldown_minutes: 0,
          enabled: true,
        },
      ];
      setFormData({
        name: initialData?.name || '',
        channel_type: channelType,
        config: (initialData?.config as unknown as ChannelConfig) || getDefaultConfig(channelType),
        enabled: initialData?.enabled ?? true,
        rate_limit_per_hour: initialData?.rate_limit_per_hour ?? 100,
        rules: (initialData?.rules as unknown as NotificationRule[]) || defaultRules,
      });
      setStep(isEditing ? 'config' : 'type');
      setError(null);
      setTestResult(null);
    }
  }, [open, initialData, isEditing]);

  const handleTypeSelect = (type: ChannelType) => {
    setFormData(prev => ({
      ...prev,
      channel_type: type,
      config: getDefaultConfig(type),
    }));
    setStep('config');
  };

  const handleTest = async () => {
    if (!onTest) return;

    setTesting(true);
    setTestResult(null);

    try {
      const success = await onTest(toExportFormat(formData));
      setTestResult(success ? 'success' : 'error');
    } catch {
      setTestResult('error');
    } finally {
      setTesting(false);
      setTimeout(() => setTestResult(null), 3000);
    }
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      setError('Channel name is required');
      return;
    }

    setSaving(true);
    setError(null);

    try {
      await onSave(toExportFormat(formData));
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save channel');
    } finally {
      setSaving(false);
    }
  };

  const toggleRule = (index: number) => {
    setFormData(prev => ({
      ...prev,
      rules: prev.rules.map((rule, i) =>
        i === index ? { ...rule, enabled: !rule.enabled } : rule
      ),
    }));
  };

  const addRule = () => {
    setFormData(prev => ({
      ...prev,
      rules: [
        ...prev.rules,
        {
          event_type: 'test.run.failed',
          conditions: {},
          priority: 'normal',
          cooldown_minutes: 0,
          enabled: true,
        },
      ],
    }));
  };

  const removeRule = (index: number) => {
    setFormData(prev => ({
      ...prev,
      rules: prev.rules.filter((_, i) => i !== index),
    }));
  };

  const updateRule = (index: number, updates: Partial<NotificationRule>) => {
    setFormData(prev => ({
      ...prev,
      rules: prev.rules.map((rule, i) =>
        i === index ? { ...rule, ...updates } : rule
      ),
    }));
  };

  const renderConfigForm = () => {
    switch (formData.channel_type) {
      case 'slack':
        return <SlackConfigForm config={formData.config as SlackConfig} onChange={(c) => setFormData(prev => ({ ...prev, config: c }))} />;
      case 'email':
        return <EmailConfigForm config={formData.config as EmailConfig} onChange={(c) => setFormData(prev => ({ ...prev, config: c }))} />;
      case 'webhook':
        return <WebhookConfigForm config={formData.config as WebhookConfig} onChange={(c) => setFormData(prev => ({ ...prev, config: c }))} />;
      case 'discord':
        return <DiscordConfigForm config={formData.config as DiscordConfig} onChange={(c) => setFormData(prev => ({ ...prev, config: c }))} />;
      case 'teams':
        return <TeamsConfigForm config={formData.config as TeamsConfig} onChange={(c) => setFormData(prev => ({ ...prev, config: c }))} />;
      case 'pagerduty':
        return <PagerDutyConfigForm config={formData.config as PagerDutyConfig} onChange={(c) => setFormData(prev => ({ ...prev, config: c }))} />;
    }
  };

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            {isEditing ? 'Edit Notification Channel' : 'Create Notification Channel'}
          </DialogTitle>
          <DialogDescription>
            {step === 'type' && 'Choose how you want to receive notifications'}
            {step === 'config' && 'Configure your notification channel'}
            {step === 'rules' && 'Set up notification rules'}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Error Alert */}
          {error && (
            <div className="mb-4 flex items-center gap-2 p-3 rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              <p className="text-sm">{error}</p>
            </div>
          )}

          {/* Step: Channel Type Selection */}
          {step === 'type' && (
            <div className="grid grid-cols-2 gap-3">
              {CHANNEL_TYPES.map((type) => (
                <button
                  key={type.type}
                  type="button"
                  onClick={() => handleTypeSelect(type.type)}
                  className={cn(
                    'flex items-start gap-3 p-4 rounded-lg border text-left transition-colors hover:bg-muted',
                    formData.channel_type === type.type && 'border-primary bg-primary/5'
                  )}
                >
                  <div className="p-2 rounded-lg bg-muted">
                    {type.icon}
                  </div>
                  <div>
                    <div className="font-medium text-sm">{type.label}</div>
                    <div className="text-xs text-muted-foreground mt-0.5">
                      {type.description}
                    </div>
                  </div>
                </button>
              ))}
            </div>
          )}

          {/* Step: Configuration */}
          {step === 'config' && (
            <div className="space-y-6">
              {/* Channel Name */}
              <div>
                <label className="text-sm font-medium">Channel Name *</label>
                <Input
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  placeholder={`My ${CHANNEL_TYPES.find(t => t.type === formData.channel_type)?.label} Channel`}
                  className="mt-1.5"
                />
              </div>

              {/* Channel-specific config */}
              {renderConfigForm()}

              {/* Rate Limit */}
              <div>
                <label className="text-sm font-medium">Rate Limit (per hour)</label>
                <Input
                  type="number"
                  min={1}
                  max={1000}
                  value={formData.rate_limit_per_hour}
                  onChange={(e) => setFormData(prev => ({ ...prev, rate_limit_per_hour: parseInt(e.target.value) || 100 }))}
                  className="mt-1.5"
                />
              </div>

              {/* Test Connection */}
              {onTest && (
                <div className="pt-4 border-t">
                  <Button
                    type="button"
                    variant="outline"
                    onClick={handleTest}
                    disabled={testing}
                    className="w-full"
                  >
                    {testing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Testing...
                      </>
                    ) : testResult === 'success' ? (
                      <>
                        <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
                        Test Successful!
                      </>
                    ) : testResult === 'error' ? (
                      <>
                        <XCircle className="h-4 w-4 mr-2 text-red-500" />
                        Test Failed
                      </>
                    ) : (
                      <>
                        <TestTube className="h-4 w-4 mr-2" />
                        Test Connection
                      </>
                    )}
                  </Button>
                </div>
              )}
            </div>
          )}

          {/* Step: Rules */}
          {step === 'rules' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-medium">Notification Rules</h4>
                <Button type="button" variant="outline" size="sm" onClick={addRule}>
                  <Plus className="h-4 w-4 mr-1" />
                  Add Rule
                </Button>
              </div>

              <div className="space-y-3">
                {formData.rules.map((rule, index) => (
                  <div
                    key={index}
                    className={cn(
                      'p-3 rounded-lg border',
                      !rule.enabled && 'opacity-60'
                    )}
                  >
                    <div className="flex items-center justify-between mb-3">
                      <Toggle
                        checked={rule.enabled}
                        onChange={() => toggleRule(index)}
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        className="h-7 w-7 p-0 text-muted-foreground hover:text-destructive"
                        onClick={() => removeRule(index)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>

                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <label className="text-xs font-medium">Event Type</label>
                        <select
                          value={rule.event_type}
                          onChange={(e) => updateRule(index, { event_type: e.target.value })}
                          className="mt-1 w-full h-8 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                          {EVENT_TYPES.map((event) => (
                            <option key={event.value} value={event.value}>
                              {event.label}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div>
                        <label className="text-xs font-medium">Priority</label>
                        <select
                          value={rule.priority}
                          onChange={(e) => updateRule(index, { priority: e.target.value as any })}
                          className="mt-1 w-full h-8 rounded-md border bg-background px-2 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
                        >
                          <option value="low">Low</option>
                          <option value="normal">Normal</option>
                          <option value="high">High</option>
                          <option value="urgent">Urgent</option>
                        </select>
                      </div>

                      <div className="col-span-2">
                        <label className="text-xs font-medium">Cooldown (minutes)</label>
                        <Input
                          type="number"
                          min={0}
                          max={1440}
                          value={rule.cooldown_minutes}
                          onChange={(e) => updateRule(index, { cooldown_minutes: parseInt(e.target.value) || 0 })}
                          className="mt-1 h-8"
                          placeholder="0 = no cooldown"
                        />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {formData.rules.length === 0 && (
                <div className="text-sm text-muted-foreground text-center py-4 bg-muted/50 rounded-lg">
                  No rules configured. Add a rule to start receiving notifications.
                </div>
              )}
            </div>
          )}
        </div>

        <DialogFooter>
          {step !== 'type' && (
            <Button
              variant="outline"
              onClick={() => setStep(step === 'rules' ? 'config' : 'type')}
              disabled={saving}
            >
              Back
            </Button>
          )}

          {step === 'type' && (
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
          )}

          {step === 'config' && (
            <Button onClick={() => setStep('rules')}>
              Next: Rules
            </Button>
          )}

          {step === 'rules' && (
            <Button onClick={handleSubmit} disabled={saving}>
              {saving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  {isEditing ? 'Update Channel' : 'Create Channel'}
                </>
              )}
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
