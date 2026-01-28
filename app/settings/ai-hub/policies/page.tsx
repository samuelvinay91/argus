'use client';

import { useState, useEffect } from 'react';
import {
  Shield,
  AlertTriangle,
  Lock,
  DollarSign,
  FileText,
  Eye,
  EyeOff,
  Check,
  X,
  Save,
  Loader2,
  Info,
  Building2,
  Clock,
  Code,
  ShieldAlert,
  CheckCircle,
  HelpCircle,
} from 'lucide-react';
// Note: Sidebar is provided by the AI Hub layout, not needed here
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Toggle, ToggleRow, LoadingSpinner } from '../../components/settings-ui';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/hooks/useToast';

// Provider configuration - all 16 providers
const AI_PROVIDERS = [
  { id: 'openrouter', name: 'OpenRouter', description: 'Access 300+ models with one API key' },
  { id: 'anthropic', name: 'Anthropic', description: 'Claude models (Opus, Sonnet, Haiku)' },
  { id: 'openai', name: 'OpenAI', description: 'GPT-4o, o1, and more' },
  { id: 'google', name: 'Google AI', description: 'Gemini 2.0 models' },
  { id: 'groq', name: 'Groq', description: 'Ultra-fast Llama inference' },
  { id: 'together', name: 'Together AI', description: 'DeepSeek, open-source models' },
  { id: 'azure_openai', name: 'Azure OpenAI', description: 'Enterprise-grade OpenAI on Azure' },
  { id: 'aws_bedrock', name: 'AWS Bedrock', description: 'AWS-hosted AI models' },
  { id: 'google_vertex', name: 'Google Vertex AI', description: 'GCP-hosted AI models' },
  { id: 'deepseek', name: 'DeepSeek', description: 'Best reasoning per dollar' },
  { id: 'mistral', name: 'Mistral AI', description: 'European AI efficiency' },
  { id: 'fireworks', name: 'Fireworks AI', description: 'Fast inference' },
  { id: 'perplexity', name: 'Perplexity', description: 'AI with built-in search' },
  { id: 'cohere', name: 'Cohere', description: 'Enterprise RAG' },
  { id: 'xai', name: 'xAI', description: 'Grok models' },
  { id: 'cerebras', name: 'Cerebras', description: 'Ultra-fast inference' },
];

// Provider restriction status type
type ProviderStatus = 'allowed' | 'blocked' | 'approval_required';

interface ProviderRestriction {
  providerId: string;
  status: ProviderStatus;
}

interface BudgetLimits {
  orgDailyLimit: number;
  orgMonthlyLimit: number;
  perUserDailyLimit: number;
  perRequestLimit: number;
  approvalThreshold: number;
}

interface DataGovernance {
  logAllPrompts: boolean;
  logRetentionDays: number;
  enablePiiRedaction: boolean;
  blockCodeSnippets: boolean;
}

interface EnterprisePolicies {
  providerRestrictions: ProviderRestriction[];
  budgetLimits: BudgetLimits;
  dataGovernance: DataGovernance;
}

// Mock hook for checking org admin status
// In production, this would be replaced with actual auth/permission checking
function useIsOrgAdmin(): { isAdmin: boolean; isLoading: boolean } {
  const [isAdmin, setIsAdmin] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    // Mock: simulate checking admin status
    const timer = setTimeout(() => {
      // For demo, set to true. In production, check actual permissions
      setIsAdmin(true);
      setIsLoading(false);
    }, 500);

    return () => clearTimeout(timer);
  }, []);

  return { isAdmin, isLoading };
}

// Mock hook for enterprise policies
function useEnterprisePolicies() {
  const [policies, setPolicies] = useState<EnterprisePolicies | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Mock: load policies
    const timer = setTimeout(() => {
      setPolicies({
        providerRestrictions: AI_PROVIDERS.map((p) => ({
          providerId: p.id,
          status: 'allowed' as ProviderStatus,
        })),
        budgetLimits: {
          orgDailyLimit: 1000,
          orgMonthlyLimit: 25000,
          perUserDailyLimit: 50,
          perRequestLimit: 5,
          approvalThreshold: 100,
        },
        dataGovernance: {
          logAllPrompts: true,
          logRetentionDays: 90,
          enablePiiRedaction: true,
          blockCodeSnippets: false,
        },
      });
      setIsLoading(false);
    }, 800);

    return () => clearTimeout(timer);
  }, []);

  const savePolicies = async (updatedPolicies: EnterprisePolicies) => {
    setIsSaving(true);
    try {
      // Mock: save policies to backend
      await new Promise((resolve) => setTimeout(resolve, 1000));
      setPolicies(updatedPolicies);
      toast.success({
        title: 'Policies Saved',
        description: 'Enterprise AI policies have been updated successfully.',
      });
    } catch (err) {
      setError('Failed to save policies');
      toast.error({
        title: 'Save Failed',
        description: 'Could not save policies. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return { policies, isLoading, isSaving, error, savePolicies };
}

// Help tooltip component
function HelpTooltip({ text }: { text: string }) {
  return (
    <div className="group relative inline-block ml-1">
      <HelpCircle className="h-4 w-4 text-muted-foreground cursor-help" />
      <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-3 py-2 bg-popover border rounded-lg shadow-lg text-sm w-64 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-50">
        <p className="text-popover-foreground">{text}</p>
        <div className="absolute top-full left-1/2 -translate-x-1/2 border-8 border-transparent border-t-popover" />
      </div>
    </div>
  );
}

// Access Denied component
function AccessDenied() {
  return (
    <Card className="max-w-lg mx-auto mt-12">
      <CardContent className="pt-6">
        <div className="text-center space-y-4">
          <div className="mx-auto w-16 h-16 rounded-full bg-red-500/10 flex items-center justify-center">
            <Lock className="h-8 w-8 text-red-500" />
          </div>
          <h2 className="text-xl font-semibold">Access Denied</h2>
          <p className="text-muted-foreground">
            You do not have permission to access Enterprise Policies. This page is restricted to organization administrators only.
          </p>
          <p className="text-sm text-muted-foreground">
            Contact your organization admin if you believe you should have access.
          </p>
          <Button variant="outline" onClick={() => window.history.back()}>
            Go Back
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export default function EnterprisePoliciesPage() {
  const { isAdmin, isLoading: isCheckingAdmin } = useIsOrgAdmin();
  const { policies, isLoading, isSaving, savePolicies } = useEnterprisePolicies();

  // Local state for editing
  const [localPolicies, setLocalPolicies] = useState<EnterprisePolicies | null>(null);
  const [hasChanges, setHasChanges] = useState(false);

  // Sync local state with loaded policies
  useEffect(() => {
    if (policies) {
      setLocalPolicies(policies);
    }
  }, [policies]);

  // Track changes
  useEffect(() => {
    if (policies && localPolicies) {
      const changed = JSON.stringify(policies) !== JSON.stringify(localPolicies);
      setHasChanges(changed);
    }
  }, [policies, localPolicies]);

  // Loading state for admin check
  if (isCheckingAdmin) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  // Access denied for non-admins
  if (!isAdmin) {
    return <AccessDenied />;
  }

  // Loading policies
  if (isLoading || !localPolicies) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <LoadingSpinner />
      </div>
    );
  }

  // Update provider restriction
  const updateProviderStatus = (providerId: string, status: ProviderStatus) => {
    setLocalPolicies((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        providerRestrictions: prev.providerRestrictions.map((p) =>
          p.providerId === providerId ? { ...p, status } : p
        ),
      };
    });
  };

  // Update budget limits
  const updateBudgetLimit = (key: keyof BudgetLimits, value: number) => {
    setLocalPolicies((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        budgetLimits: { ...prev.budgetLimits, [key]: value },
      };
    });
  };

  // Update data governance
  const updateDataGovernance = <K extends keyof DataGovernance>(
    key: K,
    value: DataGovernance[K]
  ) => {
    setLocalPolicies((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        dataGovernance: { ...prev.dataGovernance, [key]: value },
      };
    });
  };

  // Save changes
  const handleSave = () => {
    if (localPolicies) {
      savePolicies(localPolicies);
    }
  };

  // Get provider status display
  const getStatusBadge = (status: ProviderStatus) => {
    switch (status) {
      case 'allowed':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-green-500/10 text-green-600">
            <Check className="h-3 w-3" />
            Allowed
          </span>
        );
      case 'blocked':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-red-500/10 text-red-600">
            <X className="h-3 w-3" />
            Blocked
          </span>
        );
      case 'approval_required':
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium bg-yellow-500/10 text-yellow-600">
            <Clock className="h-3 w-3" />
            Approval Required
          </span>
        );
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-lg font-semibold">Enterprise Policies</h2>
            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-purple-500/10 text-purple-600">
              Admin Only
            </span>
          </div>
          <p className="text-sm text-muted-foreground">
            Configure organization-wide AI governance and compliance settings
          </p>
        </div>
        <Button onClick={handleSave} disabled={!hasChanges || isSaving}>
          {isSaving ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Saving...
            </>
          ) : hasChanges ? (
            <>
              <Save className="mr-2 h-4 w-4" />
              Save Changes
            </>
          ) : (
            <>
              <CheckCircle className="mr-2 h-4 w-4" />
              Saved
            </>
          )}
        </Button>
      </div>

      <div className="space-y-6">
          {/* Provider Restrictions Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Provider Restrictions
              </CardTitle>
              <CardDescription>
                Control which AI providers can be used by members of your organization.
                Blocked providers will be unavailable for all users.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {AI_PROVIDERS.map((provider) => {
                  const restriction = localPolicies.providerRestrictions.find(
                    (r) => r.providerId === provider.id
                  );
                  const status = restriction?.status || 'allowed';

                  return (
                    <div
                      key={provider.id}
                      className="flex items-center justify-between p-4 rounded-lg border hover:border-primary/30 transition-colors"
                    >
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{provider.name}</span>
                          {getStatusBadge(status)}
                        </div>
                        <p className="text-sm text-muted-foreground mt-0.5">
                          {provider.description}
                        </p>
                      </div>
                      <Select
                        value={status}
                        onValueChange={(value: ProviderStatus) =>
                          updateProviderStatus(provider.id, value)
                        }
                      >
                        <SelectTrigger className="w-44">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="allowed">
                            <div className="flex items-center gap-2">
                              <Check className="h-4 w-4 text-green-500" />
                              Allow
                            </div>
                          </SelectItem>
                          <SelectItem value="blocked">
                            <div className="flex items-center gap-2">
                              <X className="h-4 w-4 text-red-500" />
                              Block
                            </div>
                          </SelectItem>
                          <SelectItem value="approval_required">
                            <div className="flex items-center gap-2">
                              <Clock className="h-4 w-4 text-yellow-500" />
                              Require Approval
                            </div>
                          </SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  );
                })}
              </div>

              <div className="mt-4 p-4 rounded-lg bg-muted/50 flex items-start gap-3">
                <Info className="h-5 w-5 text-muted-foreground flex-shrink-0 mt-0.5" />
                <div className="text-sm text-muted-foreground">
                  <p className="font-medium text-foreground">About Provider Restrictions</p>
                  <ul className="mt-1 space-y-1 list-disc list-inside">
                    <li><strong>Allowed:</strong> All users can use this provider freely</li>
                    <li><strong>Blocked:</strong> Provider is completely disabled for all users</li>
                    <li><strong>Require Approval:</strong> Users must request admin approval before using</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Budget Limits Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <DollarSign className="h-5 w-5" />
                Budget Limits (Organization-wide)
              </CardTitle>
              <CardDescription>
                Set spending limits to control AI usage costs across your organization.
                Users will be notified and/or blocked when approaching limits.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Org Daily Limit */}
              <div className="space-y-2">
                <div className="flex items-center">
                  <label className="text-sm font-medium">Organization Daily Limit</label>
                  <HelpTooltip text="Maximum total spending allowed per day across all users in your organization. Resets at midnight UTC." />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">$</span>
                  <Input
                    type="number"
                    min={0}
                    max={100000}
                    step={100}
                    value={localPolicies.budgetLimits.orgDailyLimit}
                    onChange={(e) =>
                      updateBudgetLimit('orgDailyLimit', parseFloat(e.target.value) || 0)
                    }
                    className="w-40"
                  />
                  <span className="text-sm text-muted-foreground">per day</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  When reached, all AI requests will be blocked until the limit resets.
                </p>
              </div>

              {/* Org Monthly Limit */}
              <div className="space-y-2">
                <div className="flex items-center">
                  <label className="text-sm font-medium">Organization Monthly Limit</label>
                  <HelpTooltip text="Maximum total spending allowed per calendar month across all users. Resets on the 1st of each month." />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">$</span>
                  <Input
                    type="number"
                    min={0}
                    max={1000000}
                    step={1000}
                    value={localPolicies.budgetLimits.orgMonthlyLimit}
                    onChange={(e) =>
                      updateBudgetLimit('orgMonthlyLimit', parseFloat(e.target.value) || 0)
                    }
                    className="w-40"
                  />
                  <span className="text-sm text-muted-foreground">per month</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Admins will receive alerts at 50%, 75%, and 90% of this limit.
                </p>
              </div>

              {/* Per-User Daily Limit */}
              <div className="space-y-2">
                <div className="flex items-center">
                  <label className="text-sm font-medium">Per-User Daily Limit</label>
                  <HelpTooltip text="Maximum spending allowed per individual user per day. Helps distribute usage fairly across team members." />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">$</span>
                  <Input
                    type="number"
                    min={0}
                    max={10000}
                    step={10}
                    value={localPolicies.budgetLimits.perUserDailyLimit}
                    onChange={(e) =>
                      updateBudgetLimit('perUserDailyLimit', parseFloat(e.target.value) || 0)
                    }
                    className="w-40"
                  />
                  <span className="text-sm text-muted-foreground">per user per day</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Individual users will be blocked when they reach their personal daily limit.
                </p>
              </div>

              {/* Per-Request Limit */}
              <div className="space-y-2">
                <div className="flex items-center">
                  <label className="text-sm font-medium">Per-Request Limit</label>
                  <HelpTooltip text="Maximum cost allowed for a single AI request. Prevents accidentally expensive operations." />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">$</span>
                  <Input
                    type="number"
                    min={0}
                    max={1000}
                    step={1}
                    value={localPolicies.budgetLimits.perRequestLimit}
                    onChange={(e) =>
                      updateBudgetLimit('perRequestLimit', parseFloat(e.target.value) || 0)
                    }
                    className="w-40"
                  />
                  <span className="text-sm text-muted-foreground">per request</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Requests estimated to exceed this limit will require confirmation.
                </p>
              </div>

              {/* Approval Threshold */}
              <div className="space-y-2">
                <div className="flex items-center">
                  <label className="text-sm font-medium">Approval Threshold</label>
                  <HelpTooltip text="Requests exceeding this cost require admin approval before execution. Set to 0 to disable." />
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground">$</span>
                  <Input
                    type="number"
                    min={0}
                    max={10000}
                    step={10}
                    value={localPolicies.budgetLimits.approvalThreshold}
                    onChange={(e) =>
                      updateBudgetLimit('approvalThreshold', parseFloat(e.target.value) || 0)
                    }
                    className="w-40"
                  />
                  <span className="text-sm text-muted-foreground">requires approval</span>
                </div>
                <p className="text-xs text-muted-foreground">
                  Requests estimated to cost more than this will be queued for admin approval.
                </p>
              </div>

              <div className="mt-4 p-4 rounded-lg bg-yellow-500/10 border border-yellow-500/20 flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-yellow-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-yellow-700 dark:text-yellow-500">Budget Enforcement</p>
                  <p className="text-yellow-600/80 dark:text-yellow-500/80 mt-1">
                    Budget limits are estimates based on token counts. Actual costs may vary slightly due to provider pricing changes or API response variations.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Data Governance Section */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <FileText className="h-5 w-5" />
                Data Governance
              </CardTitle>
              <CardDescription>
                Configure audit logging, data retention, and security policies for AI interactions.
                These settings help ensure compliance with data protection regulations.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Log All Prompts */}
              <div className="flex items-center justify-between py-2">
                <div className="flex-1">
                  <div className="flex items-center">
                    <span className="font-medium">Log All Prompts for Audit</span>
                    <HelpTooltip text="When enabled, all user prompts and AI responses are stored in an audit log accessible to organization administrators." />
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Store all AI interactions in a searchable audit log for compliance and review.
                    Includes user identity, timestamps, prompts, responses, and token usage.
                  </p>
                </div>
                <Toggle
                  checked={localPolicies.dataGovernance.logAllPrompts}
                  onChange={(checked) => updateDataGovernance('logAllPrompts', checked)}
                  aria-label="Log all prompts for audit"
                />
              </div>

              {/* Log Retention Period */}
              <div className="space-y-2">
                <div className="flex items-center">
                  <label className="text-sm font-medium">Log Retention Period</label>
                  <HelpTooltip text="How long audit logs are retained before automatic deletion. Longer periods increase storage costs but provide more historical data." />
                </div>
                <Select
                  value={String(localPolicies.dataGovernance.logRetentionDays)}
                  onValueChange={(value) =>
                    updateDataGovernance('logRetentionDays', parseInt(value))
                  }
                  disabled={!localPolicies.dataGovernance.logAllPrompts}
                >
                  <SelectTrigger className="w-48">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="30">30 days</SelectItem>
                    <SelectItem value="60">60 days</SelectItem>
                    <SelectItem value="90">90 days</SelectItem>
                    <SelectItem value="180">180 days</SelectItem>
                  </SelectContent>
                </Select>
                <p className="text-xs text-muted-foreground">
                  Logs older than this period will be automatically purged. Consider compliance requirements when setting this value.
                </p>
              </div>

              {/* Enable PII Redaction */}
              <div className="flex items-center justify-between py-2">
                <div className="flex-1">
                  <div className="flex items-center">
                    <span className="font-medium">Enable PII Redaction</span>
                    <HelpTooltip text="Automatically detects and redacts personally identifiable information (PII) like emails, phone numbers, SSNs, and credit card numbers from logs." />
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Automatically detect and redact personally identifiable information (PII) from audit logs.
                    Includes emails, phone numbers, SSNs, credit card numbers, and other sensitive data patterns.
                  </p>
                </div>
                <Toggle
                  checked={localPolicies.dataGovernance.enablePiiRedaction}
                  onChange={(checked) => updateDataGovernance('enablePiiRedaction', checked)}
                  aria-label="Enable PII redaction"
                />
              </div>

              {/* Block Code Snippets */}
              <div className="flex items-center justify-between py-2">
                <div className="flex-1">
                  <div className="flex items-center">
                    <span className="font-medium">Block Code Snippets to External Providers</span>
                    <HelpTooltip text="Prevents sending code snippets to non-enterprise AI providers. Useful for protecting proprietary source code." />
                  </div>
                  <p className="text-sm text-muted-foreground mt-0.5">
                    Prevent users from sending code snippets to external AI providers.
                    Code will be detected and blocked before being sent to non-enterprise providers.
                  </p>
                </div>
                <Toggle
                  checked={localPolicies.dataGovernance.blockCodeSnippets}
                  onChange={(checked) => updateDataGovernance('blockCodeSnippets', checked)}
                  aria-label="Block code snippets to external providers"
                />
              </div>

              <div className="mt-4 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20 flex items-start gap-3">
                <ShieldAlert className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
                <div className="text-sm">
                  <p className="font-medium text-blue-700 dark:text-blue-500">Compliance Note</p>
                  <p className="text-blue-600/80 dark:text-blue-500/80 mt-1">
                    These data governance settings help with GDPR, SOC 2, and HIPAA compliance, but should be reviewed by your compliance team. Audit logs can be exported for regulatory purposes.
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Summary Card */}
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="pt-6">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
                  <Building2 className="h-6 w-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">Policy Summary</h3>
                  <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <p className="text-sm text-muted-foreground">Providers</p>
                      <p className="font-medium">
                        {localPolicies.providerRestrictions.filter((p) => p.status === 'allowed').length} allowed,{' '}
                        {localPolicies.providerRestrictions.filter((p) => p.status === 'blocked').length} blocked,{' '}
                        {localPolicies.providerRestrictions.filter((p) => p.status === 'approval_required').length} require approval
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Budget</p>
                      <p className="font-medium">
                        ${localPolicies.budgetLimits.orgMonthlyLimit.toLocaleString()}/month, ${localPolicies.budgetLimits.perUserDailyLimit}/user/day
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-muted-foreground">Governance</p>
                      <p className="font-medium">
                        {localPolicies.dataGovernance.logAllPrompts ? 'Logging enabled' : 'Logging disabled'},{' '}
                        {localPolicies.dataGovernance.logRetentionDays} day retention
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
      </div>
    </div>
  );
}
