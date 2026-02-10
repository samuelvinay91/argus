'use client';

import { useState, useEffect } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Wrench,
  Save,
  CheckCircle,
  Zap,
  Shield,
  Bell,
  Target,
  RefreshCw,
  TrendingUp,
  Activity,
  Loader2,
  AlertCircle,
  X,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useHealingConfig,
  useHealingStats,
  useUpdateHealingConfig,
  DEFAULT_HEALING_CONFIG,
  type HealingConfig,
} from '@/lib/hooks/use-healing';

function Toggle({ checked, onChange, disabled }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
  return (
    <button
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

const SELECTOR_STRATEGIES = [
  { id: 'id', label: 'ID', description: 'Use element ID' },
  { id: 'data-testid', label: 'data-testid', description: 'Use test IDs' },
  { id: 'role', label: 'ARIA Role', description: 'Use accessibility roles' },
  { id: 'text', label: 'Text Content', description: 'Use visible text' },
  { id: 'css', label: 'CSS Selector', description: 'Use CSS classes' },
  { id: 'xpath', label: 'XPath', description: 'Use XPath expressions' },
];

// Default organization ID - in production this would come from auth context
const DEFAULT_ORG_ID = 'default';

export default function HealingPage() {
  // Local state for form editing
  const [localConfig, setLocalConfig] = useState<HealingConfig>(DEFAULT_HEALING_CONFIG);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Data fetching with authenticated hooks
  const { data: config, isLoading: configLoading } = useHealingConfig(DEFAULT_ORG_ID);
  const { data: stats, isLoading: statsLoading } = useHealingStats(DEFAULT_ORG_ID);
  const updateConfig = useUpdateHealingConfig(DEFAULT_ORG_ID);

  const loading = configLoading || statsLoading;

  // Sync local state with fetched config
  useEffect(() => {
    if (config) {
      setLocalConfig(config);
    }
  }, [config]);

  const handleSave = async () => {
    setError(null);
    try {
      await updateConfig.mutateAsync(localConfig);
      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save configuration');
    }
  };

  const toggleStrategy = (strategyId: string) => {
    const current = localConfig.preferredSelectorStrategies;
    if (current.includes(strategyId)) {
      setLocalConfig({
        ...localConfig,
        preferredSelectorStrategies: current.filter(s => s !== strategyId),
      });
    } else {
      setLocalConfig({
        ...localConfig,
        preferredSelectorStrategies: [...current, strategyId],
      });
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen overflow-x-hidden">
        <Sidebar />
        <main className="flex-1 lg:ml-64 min-w-0 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading healing configuration...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen overflow-x-hidden">
      <Sidebar />
      <main className="flex-1 lg:ml-64 min-w-0">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-6">
          <div className="flex-1">
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <Wrench className="h-5 w-5 text-primary" />
              Self-Healing Configuration
            </h1>
            <p className="text-sm text-muted-foreground">
              Configure how Skopaq automatically fixes broken selectors and tests
            </p>
          </div>
          <Button onClick={handleSave} disabled={updateConfig.isPending}>
            {updateConfig.isPending ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : saved ? (
              <>
                <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                Saved!
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Changes
              </>
            )}
          </Button>
        </header>

        <div className="p-6 space-y-6">
          {/* Error Alert */}
          {error && (
            <Card className="border-red-500/50 bg-red-500/5">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-red-500">
                  <AlertCircle className="h-5 w-5" />
                  <span>{error}</span>
                  <Button variant="ghost" size="sm" onClick={() => setError(null)} className="ml-auto">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <Target className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats?.totalPatterns ?? 0}</p>
                    <p className="text-sm text-muted-foreground">Learned Patterns</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-green-500/10">
                    <CheckCircle className="h-6 w-6 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats?.totalHealsApplied ?? 0}</p>
                    <p className="text-sm text-muted-foreground">Heals Applied</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-blue-500/10">
                    <TrendingUp className="h-6 w-6 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats?.successRate ?? 0}%</p>
                    <p className="text-sm text-muted-foreground">Success Rate</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-amber-500/10">
                    <Activity className="h-6 w-6 text-amber-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats?.healsLast24h ?? 0}</p>
                    <p className="text-sm text-muted-foreground">Last 24 Hours</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Main Settings */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="h-5 w-5" />
                  Core Settings
                </CardTitle>
                <CardDescription>
                  Enable or disable self-healing features
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Enable Self-Healing</div>
                    <div className="text-sm text-muted-foreground">
                      Automatically attempt to fix broken selectors
                    </div>
                  </div>
                  <Toggle
                    checked={localConfig.enabled}
                    onChange={(v) => setLocalConfig({ ...localConfig, enabled: v })}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Auto-Apply Fixes</div>
                    <div className="text-sm text-muted-foreground">
                      Automatically apply fixes without approval
                    </div>
                  </div>
                  <Toggle
                    checked={localConfig.autoApply}
                    onChange={(v) => setLocalConfig({ ...localConfig, autoApply: v })}
                    disabled={!localConfig.enabled}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Heal Selectors</div>
                    <div className="text-sm text-muted-foreground">
                      Fix broken CSS/XPath selectors
                    </div>
                  </div>
                  <Toggle
                    checked={localConfig.healSelectors}
                    onChange={(v) => setLocalConfig({ ...localConfig, healSelectors: v })}
                    disabled={!localConfig.enabled}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Heal Timeouts</div>
                    <div className="text-sm text-muted-foreground">
                      Automatically adjust wait times
                    </div>
                  </div>
                  <Toggle
                    checked={localConfig.healTimeouts}
                    onChange={(v) => setLocalConfig({ ...localConfig, healTimeouts: v })}
                    disabled={!localConfig.enabled}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Heal Text Content</div>
                    <div className="text-sm text-muted-foreground">
                      Match similar text when exact match fails
                    </div>
                  </div>
                  <Toggle
                    checked={localConfig.healTextContent}
                    onChange={(v) => setLocalConfig({ ...localConfig, healTextContent: v })}
                    disabled={!localConfig.enabled}
                  />
                </div>
              </CardContent>
            </Card>

            {/* Confidence Thresholds */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Target className="h-5 w-5" />
                  Confidence Thresholds
                </CardTitle>
                <CardDescription>
                  Control when healing suggestions are applied
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <label className="text-sm font-medium">Auto-Apply Threshold</label>
                  <div className="flex items-center gap-4 mt-2">
                    <Input
                      type="range"
                      min="0.5"
                      max="1"
                      step="0.05"
                      value={localConfig.minConfidenceAuto}
                      onChange={(e) => setLocalConfig({ ...localConfig, minConfidenceAuto: parseFloat(e.target.value) })}
                      className="flex-1"
                      disabled={!localConfig.enabled}
                    />
                    <span className="text-sm font-mono w-16 text-right">
                      {(localConfig.minConfidenceAuto * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Minimum confidence to auto-apply fixes
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium">Suggestion Threshold</label>
                  <div className="flex items-center gap-4 mt-2">
                    <Input
                      type="range"
                      min="0.3"
                      max="1"
                      step="0.05"
                      value={localConfig.minConfidenceSuggest}
                      onChange={(e) => setLocalConfig({ ...localConfig, minConfidenceSuggest: parseFloat(e.target.value) })}
                      className="flex-1"
                      disabled={!localConfig.enabled}
                    />
                    <span className="text-sm font-mono w-16 text-right">
                      {(localConfig.minConfidenceSuggest * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Minimum confidence to suggest a fix
                  </p>
                </div>

                <div>
                  <label className="text-sm font-medium">Text Similarity Threshold</label>
                  <div className="flex items-center gap-4 mt-2">
                    <Input
                      type="range"
                      min="0.5"
                      max="1"
                      step="0.05"
                      value={localConfig.textSimilarityThreshold}
                      onChange={(e) => setLocalConfig({ ...localConfig, textSimilarityThreshold: parseFloat(e.target.value) })}
                      className="flex-1"
                      disabled={!localConfig.enabled || !localConfig.healTextContent}
                    />
                    <span className="text-sm font-mono w-16 text-right">
                      {(localConfig.textSimilarityThreshold * 100).toFixed(0)}%
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Required similarity for text matching
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-4 pt-4 border-t">
                  <div>
                    <label className="text-sm font-medium">Max Variations</label>
                    <Input
                      type="number"
                      min="1"
                      max="20"
                      value={localConfig.maxSelectorVariations}
                      onChange={(e) => setLocalConfig({ ...localConfig, maxSelectorVariations: parseInt(e.target.value) })}
                      className="mt-2"
                      disabled={!localConfig.enabled}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Max Wait (ms)</label>
                    <Input
                      type="number"
                      min="1000"
                      max="120000"
                      step="1000"
                      value={localConfig.maxWaitTimeMs}
                      onChange={(e) => setLocalConfig({ ...localConfig, maxWaitTimeMs: parseInt(e.target.value) })}
                      className="mt-2"
                      disabled={!localConfig.enabled}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Selector Strategies */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <RefreshCw className="h-5 w-5" />
                  Selector Strategies
                </CardTitle>
                <CardDescription>
                  Choose which selector strategies to try (in order)
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {SELECTOR_STRATEGIES.map((strategy) => {
                    const isEnabled = localConfig.preferredSelectorStrategies.includes(strategy.id);
                    const index = localConfig.preferredSelectorStrategies.indexOf(strategy.id);
                    return (
                      <div
                        key={strategy.id}
                        className={cn(
                          'flex items-center justify-between p-3 rounded-lg border transition-colors',
                          isEnabled ? 'border-primary/50 bg-primary/5' : 'border-border'
                        )}
                      >
                        <div className="flex items-center gap-3">
                          {isEnabled && (
                            <span className="flex h-6 w-6 items-center justify-center rounded-full bg-primary text-xs font-bold text-primary-foreground">
                              {index + 1}
                            </span>
                          )}
                          <div>
                            <div className="font-medium">{strategy.label}</div>
                            <div className="text-xs text-muted-foreground">{strategy.description}</div>
                          </div>
                        </div>
                        <Toggle
                          checked={isEnabled}
                          onChange={() => toggleStrategy(strategy.id)}
                          disabled={!localConfig.enabled}
                        />
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Learning & Notifications */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Bell className="h-5 w-5" />
                  Learning & Notifications
                </CardTitle>
                <CardDescription>
                  Configure how the system learns and notifies
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Learn from Successful Heals</div>
                    <div className="text-sm text-muted-foreground">
                      Store patterns that worked for future use
                    </div>
                  </div>
                  <Toggle
                    checked={localConfig.learnFromSuccess}
                    onChange={(v) => setLocalConfig({ ...localConfig, learnFromSuccess: v })}
                    disabled={!localConfig.enabled}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Learn from Manual Fixes</div>
                    <div className="text-sm text-muted-foreground">
                      Learn when you manually fix selectors
                    </div>
                  </div>
                  <Toggle
                    checked={localConfig.learnFromManualFixes}
                    onChange={(v) => setLocalConfig({ ...localConfig, learnFromManualFixes: v })}
                    disabled={!localConfig.enabled}
                  />
                </div>

                <div className="flex items-center justify-between">
                  <div>
                    <div className="font-medium">Share Across Projects</div>
                    <div className="text-sm text-muted-foreground">
                      Use patterns learned in other projects
                    </div>
                  </div>
                  <Toggle
                    checked={localConfig.sharePatternsAcrossProjects}
                    onChange={(v) => setLocalConfig({ ...localConfig, sharePatternsAcrossProjects: v })}
                    disabled={!localConfig.enabled}
                  />
                </div>

                <div className="pt-4 border-t">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <div className="font-medium">Notify on Auto-Heal</div>
                      <div className="text-sm text-muted-foreground">
                        Get notified when fixes are auto-applied
                      </div>
                    </div>
                    <Toggle
                      checked={localConfig.notifyOnHeal}
                      onChange={(v) => setLocalConfig({ ...localConfig, notifyOnHeal: v })}
                      disabled={!localConfig.enabled}
                    />
                  </div>

                  <div className="flex items-center justify-between">
                    <div>
                      <div className="font-medium">Notify on Suggestions</div>
                      <div className="text-sm text-muted-foreground">
                        Get notified when fixes need approval
                      </div>
                    </div>
                    <Toggle
                      checked={localConfig.notifyOnSuggestion}
                      onChange={(v) => setLocalConfig({ ...localConfig, notifyOnSuggestion: v })}
                      disabled={!localConfig.enabled}
                    />
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Rate Limits */}
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Shield className="h-5 w-5" />
                  Rate Limits & Approval
                </CardTitle>
                <CardDescription>
                  Control how many heals can be applied
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="text-sm font-medium">Max Heals per Hour</label>
                    <Input
                      type="number"
                      min="1"
                      max="1000"
                      value={localConfig.maxHealsPerHour}
                      onChange={(e) => setLocalConfig({ ...localConfig, maxHealsPerHour: parseInt(e.target.value) })}
                      className="mt-2"
                      disabled={!localConfig.enabled}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Limit heals across all tests
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Max Heals per Test</label>
                    <Input
                      type="number"
                      min="1"
                      max="50"
                      value={localConfig.maxHealsPerTest}
                      onChange={(e) => setLocalConfig({ ...localConfig, maxHealsPerTest: parseInt(e.target.value) })}
                      className="mt-2"
                      disabled={!localConfig.enabled}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Limit heals per single test run
                    </p>
                  </div>

                  <div>
                    <label className="text-sm font-medium">Auto-Approve After (hours)</label>
                    <Input
                      type="number"
                      min="1"
                      max="168"
                      value={localConfig.autoApproveAfterHours || ''}
                      onChange={(e) => setLocalConfig({
                        ...localConfig,
                        autoApproveAfterHours: e.target.value ? parseInt(e.target.value) : null
                      })}
                      className="mt-2"
                      placeholder="Never"
                      disabled={!localConfig.enabled || localConfig.autoApply}
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Auto-approve pending fixes after N hours
                    </p>
                  </div>
                </div>

                <div className="mt-6 pt-6 border-t flex items-center justify-between">
                  <div>
                    <div className="font-medium">Require Approval</div>
                    <div className="text-sm text-muted-foreground">
                      Require manual approval before applying fixes
                    </div>
                  </div>
                  <Toggle
                    checked={localConfig.requireApproval}
                    onChange={(v) => setLocalConfig({ ...localConfig, requireApproval: v })}
                    disabled={!localConfig.enabled || localConfig.autoApply}
                  />
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  );
}
