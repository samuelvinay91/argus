'use client';

import { useState, useEffect, useCallback } from 'react';
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
  Clock,
  Target,
  RefreshCw,
  TrendingUp,
  AlertTriangle,
  Activity,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';

interface HealingConfig {
  id?: string;
  organization_id?: string;
  enabled: boolean;
  auto_apply: boolean;
  min_confidence_auto: number;
  min_confidence_suggest: number;
  heal_selectors: boolean;
  max_selector_variations: number;
  preferred_selector_strategies: string[];
  heal_timeouts: boolean;
  max_wait_time_ms: number;
  heal_text_content: boolean;
  text_similarity_threshold: number;
  learn_from_success: boolean;
  learn_from_manual_fixes: boolean;
  share_patterns_across_projects: boolean;
  notify_on_heal: boolean;
  notify_on_suggestion: boolean;
  require_approval: boolean;
  auto_approve_after_hours: number | null;
  max_heals_per_hour: number;
  max_heals_per_test: number;
}

interface HealingStats {
  total_patterns: number;
  total_heals_applied: number;
  total_heals_suggested: number;
  success_rate: number;
  heals_last_24h: number;
  heals_last_7d: number;
  heals_last_30d: number;
  avg_confidence: number;
  top_error_types: Record<string, number>;
  patterns_by_project: Record<string, number>;
  recent_heals: Array<{
    id: string;
    original: string;
    healed: string;
    error_type: string;
    confidence: number;
    created_at: string;
  }>;
}

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

const DEFAULT_CONFIG: HealingConfig = {
  enabled: true,
  auto_apply: false,
  min_confidence_auto: 0.95,
  min_confidence_suggest: 0.70,
  heal_selectors: true,
  max_selector_variations: 9,
  preferred_selector_strategies: ['id', 'data-testid', 'role', 'text', 'css'],
  heal_timeouts: true,
  max_wait_time_ms: 30000,
  heal_text_content: true,
  text_similarity_threshold: 0.85,
  learn_from_success: true,
  learn_from_manual_fixes: true,
  share_patterns_across_projects: false,
  notify_on_heal: true,
  notify_on_suggestion: true,
  require_approval: true,
  auto_approve_after_hours: null,
  max_heals_per_hour: 50,
  max_heals_per_test: 5,
};

const DEFAULT_STATS: HealingStats = {
  total_patterns: 0,
  total_heals_applied: 0,
  total_heals_suggested: 0,
  success_rate: 0,
  heals_last_24h: 0,
  heals_last_7d: 0,
  heals_last_30d: 0,
  avg_confidence: 0,
  top_error_types: {},
  patterns_by_project: {},
  recent_heals: [],
};

export default function HealingPage() {
  const [config, setConfig] = useState<HealingConfig>(DEFAULT_CONFIG);
  const [stats, setStats] = useState<HealingStats>(DEFAULT_STATS);
  const [saved, setSaved] = useState(false);
  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchConfig = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/v1/healing/organizations/${DEFAULT_ORG_ID}/config`);
      if (response.ok) {
        const data = await response.json();
        setConfig(data);
      }
    } catch (err) {
      console.error('Failed to fetch healing config:', err);
      // Use defaults if API fails
    }
  }, []);

  const fetchStats = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/v1/healing/organizations/${DEFAULT_ORG_ID}/stats`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
      }
    } catch (err) {
      console.error('Failed to fetch healing stats:', err);
      // Use defaults if API fails
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      await Promise.all([fetchConfig(), fetchStats()]);
      setLoading(false);
    };
    loadData();
  }, [fetchConfig, fetchStats]);

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const response = await fetch(`${BACKEND_URL}/api/v1/healing/organizations/${DEFAULT_ORG_ID}/config`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      if (response.ok) {
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
      } else {
        const data = await response.json();
        setError(data.detail || 'Failed to save configuration');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setSaving(false);
    }
  };

  const toggleStrategy = (strategyId: string) => {
    const current = config.preferred_selector_strategies;
    if (current.includes(strategyId)) {
      setConfig({
        ...config,
        preferred_selector_strategies: current.filter(s => s !== strategyId),
      });
    } else {
      setConfig({
        ...config,
        preferred_selector_strategies: [...current, strategyId],
      });
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-64">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-6">
          <div className="flex-1">
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <Wrench className="h-5 w-5 text-primary" />
              Self-Healing Configuration
            </h1>
            <p className="text-sm text-muted-foreground">
              Configure how Argus automatically fixes broken selectors and tests
            </p>
          </div>
          <Button onClick={handleSave}>
            {saved ? (
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
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <Target className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.total_patterns}</p>
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
                    <p className="text-2xl font-bold">{stats.total_heals_applied}</p>
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
                    <p className="text-2xl font-bold">{stats.success_rate}%</p>
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
                    <p className="text-2xl font-bold">{stats.heals_last_24h}</p>
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
                    checked={config.enabled}
                    onChange={(v) => setConfig({ ...config, enabled: v })}
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
                    checked={config.auto_apply}
                    onChange={(v) => setConfig({ ...config, auto_apply: v })}
                    disabled={!config.enabled}
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
                    checked={config.heal_selectors}
                    onChange={(v) => setConfig({ ...config, heal_selectors: v })}
                    disabled={!config.enabled}
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
                    checked={config.heal_timeouts}
                    onChange={(v) => setConfig({ ...config, heal_timeouts: v })}
                    disabled={!config.enabled}
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
                    checked={config.heal_text_content}
                    onChange={(v) => setConfig({ ...config, heal_text_content: v })}
                    disabled={!config.enabled}
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
                      value={config.min_confidence_auto}
                      onChange={(e) => setConfig({ ...config, min_confidence_auto: parseFloat(e.target.value) })}
                      className="flex-1"
                      disabled={!config.enabled}
                    />
                    <span className="text-sm font-mono w-16 text-right">
                      {(config.min_confidence_auto * 100).toFixed(0)}%
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
                      value={config.min_confidence_suggest}
                      onChange={(e) => setConfig({ ...config, min_confidence_suggest: parseFloat(e.target.value) })}
                      className="flex-1"
                      disabled={!config.enabled}
                    />
                    <span className="text-sm font-mono w-16 text-right">
                      {(config.min_confidence_suggest * 100).toFixed(0)}%
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
                      value={config.text_similarity_threshold}
                      onChange={(e) => setConfig({ ...config, text_similarity_threshold: parseFloat(e.target.value) })}
                      className="flex-1"
                      disabled={!config.enabled || !config.heal_text_content}
                    />
                    <span className="text-sm font-mono w-16 text-right">
                      {(config.text_similarity_threshold * 100).toFixed(0)}%
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
                      value={config.max_selector_variations}
                      onChange={(e) => setConfig({ ...config, max_selector_variations: parseInt(e.target.value) })}
                      className="mt-2"
                      disabled={!config.enabled}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Max Wait (ms)</label>
                    <Input
                      type="number"
                      min="1000"
                      max="120000"
                      step="1000"
                      value={config.max_wait_time_ms}
                      onChange={(e) => setConfig({ ...config, max_wait_time_ms: parseInt(e.target.value) })}
                      className="mt-2"
                      disabled={!config.enabled}
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
                    const isEnabled = config.preferred_selector_strategies.includes(strategy.id);
                    const index = config.preferred_selector_strategies.indexOf(strategy.id);
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
                          disabled={!config.enabled}
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
                    checked={config.learn_from_success}
                    onChange={(v) => setConfig({ ...config, learn_from_success: v })}
                    disabled={!config.enabled}
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
                    checked={config.learn_from_manual_fixes}
                    onChange={(v) => setConfig({ ...config, learn_from_manual_fixes: v })}
                    disabled={!config.enabled}
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
                    checked={config.share_patterns_across_projects}
                    onChange={(v) => setConfig({ ...config, share_patterns_across_projects: v })}
                    disabled={!config.enabled}
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
                      checked={config.notify_on_heal}
                      onChange={(v) => setConfig({ ...config, notify_on_heal: v })}
                      disabled={!config.enabled}
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
                      checked={config.notify_on_suggestion}
                      onChange={(v) => setConfig({ ...config, notify_on_suggestion: v })}
                      disabled={!config.enabled}
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
                      value={config.max_heals_per_hour}
                      onChange={(e) => setConfig({ ...config, max_heals_per_hour: parseInt(e.target.value) })}
                      className="mt-2"
                      disabled={!config.enabled}
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
                      value={config.max_heals_per_test}
                      onChange={(e) => setConfig({ ...config, max_heals_per_test: parseInt(e.target.value) })}
                      className="mt-2"
                      disabled={!config.enabled}
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
                      value={config.auto_approve_after_hours || ''}
                      onChange={(e) => setConfig({
                        ...config,
                        auto_approve_after_hours: e.target.value ? parseInt(e.target.value) : null
                      })}
                      className="mt-2"
                      placeholder="Never"
                      disabled={!config.enabled || config.auto_apply}
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
                    checked={config.require_approval}
                    onChange={(v) => setConfig({ ...config, require_approval: v })}
                    disabled={!config.enabled || config.auto_apply}
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
