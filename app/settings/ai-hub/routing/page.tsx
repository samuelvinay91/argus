'use client';

/**
 * AI Hub Routing Page
 *
 * Provides model routing configuration with two UI modes:
 * - Simple (via AIHubModeContext): Auto mode with a single slider (cost vs quality tradeoff)
 * - Expert (via AIHubModeContext): Full routing table with per-task model selection
 *
 * This page is wrapped by the AI Hub layout which provides:
 * - Sidebar navigation
 * - Mode toggle (Simple/Expert)
 * - AIHubModeProvider context
 */

import { useState, useCallback, useEffect } from 'react';
import {
  Settings2,
  Cpu,
  Zap,
  DollarSign,
  Sparkles,
  Plus,
  Trash2,
  Edit2,
  GripVertical,
  ChevronUp,
  ChevronDown,
  Check,
  X,
  Loader2,
  Info,
  Save,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Toggle, ToggleRow, LoadingSpinner, ErrorMessage } from '@/app/settings/components/settings-ui';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/hooks/useToast';
import {
  useRoutingConfig,
  useUpdateRoutingConfig,
  type RoutingConfig,
  type RoutingMode,
  type AutoModePreset,
  type RoutingRule,
  type FallbackProvider,
  type TaskType,
  TASK_TYPES,
  AUTO_MODE_PRESETS,
  generateRuleId,
  getDefaultRoutingConfig,
} from '@/lib/hooks/use-routing-config';
import { useAvailableModels } from '@/lib/hooks/use-ai-settings';
import { useAIHubMode } from '@/components/ai-hub';

// ============================================================================
// Types
// ============================================================================

interface RuleFormData {
  taskType: TaskType;
  modelId: string;
  provider: string;
  maxCostPerRequest: number;
  enabled: boolean;
}

// ============================================================================
// Components
// ============================================================================

/**
 * Mode Toggle Component - Auto / Manual
 */
function RoutingModeToggle({
  mode,
  onChange,
}: {
  mode: RoutingMode;
  onChange: (mode: RoutingMode) => void;
}) {
  return (
    <div className="flex gap-2 p-1 bg-muted rounded-lg">
      <button
        onClick={() => onChange('auto')}
        className={cn(
          'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all',
          mode === 'auto'
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground hover:bg-accent'
        )}
      >
        <Sparkles className="h-4 w-4" />
        Auto
      </button>
      <button
        onClick={() => onChange('manual')}
        className={cn(
          'flex-1 flex items-center justify-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all',
          mode === 'manual'
            ? 'bg-primary text-primary-foreground shadow-sm'
            : 'text-muted-foreground hover:text-foreground hover:bg-accent'
        )}
      >
        <Settings2 className="h-4 w-4" />
        Manual (Expert)
      </button>
    </div>
  );
}

/**
 * Quality-Cost Slider with Presets
 */
function QualityCostSlider({
  value,
  preset,
  letAiDecide,
  onValueChange,
  onPresetChange,
  onLetAiDecideChange,
}: {
  value: number;
  preset: AutoModePreset;
  letAiDecide: boolean;
  onValueChange: (value: number) => void;
  onPresetChange: (preset: AutoModePreset) => void;
  onLetAiDecideChange: (value: boolean) => void;
}) {
  // Handle preset button clicks
  const handlePresetClick = (presetKey: AutoModePreset) => {
    onPresetChange(presetKey);
    onValueChange(AUTO_MODE_PRESETS[presetKey].balance);
  };

  return (
    <div className="space-y-6">
      {/* Preset Buttons */}
      <div className="space-y-3">
        <label className="text-sm font-medium">Quick Presets</label>
        <div className="grid grid-cols-3 gap-3">
          {(Object.entries(AUTO_MODE_PRESETS) as [AutoModePreset, typeof AUTO_MODE_PRESETS[AutoModePreset]][]).map(
            ([key, presetConfig]) => (
              <button
                key={key}
                onClick={() => handlePresetClick(key)}
                className={cn(
                  'p-3 rounded-lg border text-left transition-all',
                  preset === key
                    ? 'border-primary bg-primary/5 ring-1 ring-primary'
                    : 'border-border hover:border-primary/50 hover:bg-accent'
                )}
              >
                <div className="flex items-center gap-2 mb-1">
                  {key === 'quality_first' && <Zap className="h-4 w-4 text-amber-500" />}
                  {key === 'balanced' && <Cpu className="h-4 w-4 text-blue-500" />}
                  {key === 'cost_optimized' && <DollarSign className="h-4 w-4 text-green-500" />}
                  <span className="font-medium text-sm">{presetConfig.name}</span>
                </div>
                <p className="text-xs text-muted-foreground">{presetConfig.description}</p>
              </button>
            )
          )}
        </div>
      </div>

      {/* Slider */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm font-medium">Fine-tune Balance</label>
          <span className="text-sm text-muted-foreground">{value}%</span>
        </div>
        <div className="relative">
          <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
            <span className="flex items-center gap-1">
              <DollarSign className="h-3 w-3" />
              Cost Optimized
            </span>
            <span className="flex items-center gap-1">
              Quality First
              <Zap className="h-3 w-3" />
            </span>
          </div>
          <input
            type="range"
            min={0}
            max={100}
            value={value}
            onChange={(e) => onValueChange(parseInt(e.target.value))}
            className="w-full h-2 bg-gradient-to-r from-green-500 via-blue-500 to-amber-500 rounded-full appearance-none cursor-pointer
              [&::-webkit-slider-thumb]:appearance-none
              [&::-webkit-slider-thumb]:w-5
              [&::-webkit-slider-thumb]:h-5
              [&::-webkit-slider-thumb]:rounded-full
              [&::-webkit-slider-thumb]:bg-white
              [&::-webkit-slider-thumb]:border-2
              [&::-webkit-slider-thumb]:border-primary
              [&::-webkit-slider-thumb]:shadow-md
              [&::-webkit-slider-thumb]:cursor-pointer
              [&::-moz-range-thumb]:w-5
              [&::-moz-range-thumb]:h-5
              [&::-moz-range-thumb]:rounded-full
              [&::-moz-range-thumb]:bg-white
              [&::-moz-range-thumb]:border-2
              [&::-moz-range-thumb]:border-primary
              [&::-moz-range-thumb]:shadow-md
              [&::-moz-range-thumb]:cursor-pointer"
          />
        </div>
      </div>

      {/* Let AI Decide Toggle */}
      <div className="p-4 rounded-lg bg-muted/50 border">
        <ToggleRow
          label="Let AI decide"
          description="Allow the system to dynamically choose the best model based on task complexity and context"
          checked={letAiDecide}
          onChange={onLetAiDecideChange}
        />
      </div>
    </div>
  );
}

/**
 * Manual Rules Table
 */
function ManualRulesTable({
  rules,
  models,
  onAdd,
  onEdit,
  onDelete,
  onToggle,
}: {
  rules: RoutingRule[];
  models: { modelId: string; displayName: string; provider: string }[];
  onAdd: () => void;
  onEdit: (rule: RoutingRule) => void;
  onDelete: (ruleId: string) => void;
  onToggle: (ruleId: string, enabled: boolean) => void;
}) {
  // Defensive: ensure arrays
  const rulesArray = Array.isArray(rules) ? rules : [];
  const modelsArray = Array.isArray(models) ? models : [];

  // Get task type display name
  const getTaskTypeName = (taskType: TaskType) => {
    return TASK_TYPES.find((t) => t.id === taskType)?.name || taskType;
  };

  // Get model display name
  const getModelName = (modelId: string) => {
    return modelsArray.find((m) => m.modelId === modelId)?.displayName || modelId;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-sm font-medium">Task Routing Rules</h3>
          <p className="text-xs text-muted-foreground">
            Define which model handles each task type
          </p>
        </div>
        <Button size="sm" onClick={onAdd}>
          <Plus className="h-4 w-4 mr-1" />
          Add Rule
        </Button>
      </div>

      {rulesArray.length === 0 ? (
        <div className="text-center py-8 border rounded-lg bg-muted/20">
          <Settings2 className="h-10 w-10 mx-auto mb-3 text-muted-foreground/50" />
          <p className="text-muted-foreground">No routing rules configured</p>
          <p className="text-sm text-muted-foreground/70 mb-4">
            Add rules to route specific tasks to preferred models
          </p>
          <Button size="sm" variant="outline" onClick={onAdd}>
            <Plus className="h-4 w-4 mr-1" />
            Create First Rule
          </Button>
        </div>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="h-10 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Task Type
                </th>
                <th className="h-10 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Model
                </th>
                <th className="h-10 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Max Cost
                </th>
                <th className="h-10 px-4 text-left text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Status
                </th>
                <th className="h-10 px-4 text-right text-xs font-medium text-muted-foreground uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody>
              {[...rulesArray]
                .sort((a, b) => a.priority - b.priority)
                .map((rule) => (
                  <tr key={rule.id} className="border-b last:border-0">
                    <td className="px-4 py-3">
                      <div className="font-medium text-sm">
                        {getTaskTypeName(rule.taskType)}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="text-sm">{getModelName(rule.modelId)}</div>
                      <div className="text-xs text-muted-foreground capitalize">
                        {rule.provider}
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-sm">
                        ${rule.maxCostPerRequest.toFixed(2)}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => onToggle(rule.id, !rule.enabled)}
                        className={cn(
                          'inline-flex items-center px-2 py-1 rounded-full text-xs font-medium transition-colors',
                          rule.enabled
                            ? 'bg-green-500/10 text-green-500 hover:bg-green-500/20'
                            : 'bg-muted text-muted-foreground hover:bg-muted/80'
                        )}
                      >
                        {rule.enabled ? (
                          <>
                            <Check className="h-3 w-3 mr-1" />
                            Active
                          </>
                        ) : (
                          <>
                            <X className="h-3 w-3 mr-1" />
                            Disabled
                          </>
                        )}
                      </button>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => onEdit(rule)}
                        >
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-500 hover:text-red-600"
                          onClick={() => onDelete(rule.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

/**
 * Rule Edit/Add Dialog
 */
function RuleDialog({
  open,
  rule,
  models,
  onClose,
  onSave,
}: {
  open: boolean;
  rule: RoutingRule | null;
  models: { modelId: string; displayName: string; provider: string }[];
  onClose: () => void;
  onSave: (rule: RoutingRule) => void;
}) {
  const [formData, setFormData] = useState<RuleFormData>({
    taskType: 'chat',
    modelId: '',
    provider: '',
    maxCostPerRequest: 0.5,
    enabled: true,
  });

  // Reset form when rule changes
  useEffect(() => {
    if (rule) {
      setFormData({
        taskType: rule.taskType,
        modelId: rule.modelId,
        provider: rule.provider,
        maxCostPerRequest: rule.maxCostPerRequest,
        enabled: rule.enabled,
      });
    } else {
      setFormData({
        taskType: 'chat',
        modelId: models[0]?.modelId || '',
        provider: models[0]?.provider || '',
        maxCostPerRequest: 0.5,
        enabled: true,
      });
    }
  }, [rule, models]);

  // Handle model selection
  const handleModelChange = (modelId: string) => {
    const model = models.find((m) => m.modelId === modelId);
    setFormData({
      ...formData,
      modelId: modelId,
      provider: model?.provider || '',
    });
  };

  // Handle save
  const handleSave = () => {
    if (!formData.modelId) {
      toast.error({ title: 'Error', description: 'Please select a model' });
      return;
    }

    onSave({
      id: rule?.id || generateRuleId(),
      ...formData,
      priority: rule?.priority || Date.now(),
    });
    onClose();
  };

  // Group models by provider
  const modelsByProvider = models.reduce((acc, model) => {
    if (!acc[model.provider]) acc[model.provider] = [];
    acc[model.provider].push(model);
    return acc;
  }, {} as Record<string, typeof models>);

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{rule ? 'Edit Rule' : 'Add Routing Rule'}</DialogTitle>
          <DialogDescription>
            Configure how a specific task type is routed to an AI model
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Task Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Task Type</label>
            <Select
              value={formData.taskType}
              onValueChange={(value) =>
                setFormData({ ...formData, taskType: value as TaskType })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select task type" />
              </SelectTrigger>
              <SelectContent>
                {TASK_TYPES.map((taskType) => (
                  <SelectItem key={taskType.id} value={taskType.id}>
                    <div>
                      <div className="font-medium">{taskType.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {taskType.description}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Model */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Model</label>
            <Select value={formData.modelId} onValueChange={handleModelChange}>
              <SelectTrigger>
                <SelectValue placeholder="Select model" />
              </SelectTrigger>
              <SelectContent>
                {Object.entries(modelsByProvider).map(([provider, providerModels]) => (
                  <div key={provider}>
                    <div className="px-2 py-1 text-xs font-semibold text-muted-foreground uppercase">
                      {provider}
                    </div>
                    {providerModels.map((model) => (
                      <SelectItem key={model.modelId} value={model.modelId}>
                        {model.displayName}
                      </SelectItem>
                    ))}
                  </div>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Max Cost */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Max Cost per Request</label>
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">$</span>
              <Input
                type="number"
                min={0}
                max={100}
                step={0.01}
                value={formData.maxCostPerRequest}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    maxCostPerRequest: parseFloat(e.target.value) || 0,
                  })
                }
                className="w-32"
              />
            </div>
            <p className="text-xs text-muted-foreground">
              Requests exceeding this cost will fall back to cheaper models
            </p>
          </div>

          {/* Enabled Toggle */}
          <div className="pt-2">
            <ToggleRow
              label="Enable Rule"
              description="Active rules are used for routing decisions"
              checked={formData.enabled}
              onChange={(enabled) => setFormData({ ...formData, enabled })}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSave}>
            {rule ? 'Update Rule' : 'Add Rule'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

/**
 * Fallback Chain Component
 */
function FallbackChain({
  chain,
  usePlatformKeysFallback,
  onChange,
  onTogglePlatformKeys,
}: {
  chain: FallbackProvider[];
  usePlatformKeysFallback: boolean;
  onChange: (chain: FallbackProvider[]) => void;
  onTogglePlatformKeys: (value: boolean) => void;
}) {
  // Defensive: ensure chain is an array
  const chainArray = Array.isArray(chain) ? chain : [];

  // Move provider up in the chain
  const moveUp = (index: number) => {
    if (index === 0) return;
    const newChain = [...chainArray];
    [newChain[index - 1], newChain[index]] = [newChain[index], newChain[index - 1]];
    // Update order numbers
    newChain.forEach((p, i) => (p.order = i + 1));
    onChange(newChain);
  };

  // Move provider down in the chain
  const moveDown = (index: number) => {
    if (index === chainArray.length - 1) return;
    const newChain = [...chainArray];
    [newChain[index], newChain[index + 1]] = [newChain[index + 1], newChain[index]];
    // Update order numbers
    newChain.forEach((p, i) => (p.order = i + 1));
    onChange(newChain);
  };

  // Toggle provider enabled status
  const toggleEnabled = (index: number) => {
    const newChain = [...chainArray];
    newChain[index] = { ...newChain[index], enabled: !newChain[index].enabled };
    onChange(newChain);
  };

  return (
    <div className="space-y-4">
      <div>
        <h3 className="text-sm font-medium">Fallback Chain</h3>
        <p className="text-xs text-muted-foreground">
          When the primary provider fails, requests fall back through this chain
        </p>
      </div>

      <div className="border rounded-lg divide-y">
        {[...chainArray]
          .sort((a, b) => a.order - b.order)
          .map((provider, index) => (
            <div
              key={provider.id}
              className={cn(
                'flex items-center gap-3 p-3 transition-colors',
                !provider.enabled && 'opacity-50'
              )}
            >
              {/* Drag Handle / Order */}
              <div className="flex items-center gap-2 text-muted-foreground">
                <GripVertical className="h-4 w-4" />
                <span className="w-5 text-center text-sm font-medium">
                  {provider.order}
                </span>
              </div>

              {/* Provider Name */}
              <div className="flex-1">
                <div className="font-medium text-sm">{provider.displayName}</div>
                <div className="text-xs text-muted-foreground">{provider.provider}</div>
              </div>

              {/* Toggle */}
              <Toggle
                checked={provider.enabled}
                onChange={() => toggleEnabled(index)}
                aria-label={`Enable ${provider.displayName}`}
              />

              {/* Move Buttons */}
              <div className="flex gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => moveUp(index)}
                  disabled={index === 0}
                  className="h-8 w-8 p-0"
                >
                  <ChevronUp className="h-4 w-4" />
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => moveDown(index)}
                  disabled={index === chainArray.length - 1}
                  className="h-8 w-8 p-0"
                >
                  <ChevronDown className="h-4 w-4" />
                </Button>
              </div>
            </div>
          ))}
      </div>

      {/* Platform Keys Fallback */}
      <div className="p-4 rounded-lg bg-muted/50 border">
        <ToggleRow
          label="Platform keys fallback"
          description="If all your API keys fail, use Argus platform keys as a last resort"
          checked={usePlatformKeysFallback}
          onChange={onTogglePlatformKeys}
        />
        {usePlatformKeysFallback && (
          <div className="mt-3 flex items-start gap-2 text-xs text-muted-foreground">
            <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
            <p>
              Platform key usage is subject to rate limits and may incur additional
              charges on your account.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}

// ============================================================================
// Main Page Component
// ============================================================================

export default function RoutingPage() {
  // Get UI mode from AI Hub context
  const { mode: uiMode } = useAIHubMode();

  // Fetch routing config
  const { data: savedConfig, isLoading, error } = useRoutingConfig();
  const { mutateAsync: updateConfig, isPending: isSaving } = useUpdateRoutingConfig();
  const { data: modelsData } = useAvailableModels();

  // Local state for editing
  const [config, setConfig] = useState<RoutingConfig>(getDefaultRoutingConfig());
  const [hasChanges, setHasChanges] = useState(false);
  const [editingRule, setEditingRule] = useState<RoutingRule | null>(null);
  const [isRuleDialogOpen, setIsRuleDialogOpen] = useState(false);

  // Sync saved config to local state
  useEffect(() => {
    if (savedConfig) {
      setConfig(savedConfig);
      setHasChanges(false);
    }
  }, [savedConfig]);

  // Get models list - defensive array check
  const modelsArray = modelsData?.models;
  const models = Array.isArray(modelsArray) ? modelsArray : [];

  // Update config locally and mark as changed
  const updateLocalConfig = useCallback((updates: Partial<RoutingConfig>) => {
    setConfig((prev) => ({ ...prev, ...updates }));
    setHasChanges(true);
  }, []);

  // Handle mode change
  const handleModeChange = (mode: RoutingMode) => {
    updateLocalConfig({ mode });
  };

  // Handle auto settings changes
  const handleAutoSettingsChange = (updates: Partial<RoutingConfig['autoSettings']>) => {
    updateLocalConfig({
      autoSettings: { ...config.autoSettings, ...updates },
    });
  };

  // Handle rule operations
  const handleAddRule = () => {
    setEditingRule(null);
    setIsRuleDialogOpen(true);
  };

  const handleEditRule = (rule: RoutingRule) => {
    setEditingRule(rule);
    setIsRuleDialogOpen(true);
  };

  const handleDeleteRule = (ruleId: string) => {
    updateLocalConfig({
      manualRules: config.manualRules.filter((r) => r.id !== ruleId),
    });
    toast.success({ title: 'Rule deleted' });
  };

  const handleToggleRule = (ruleId: string, enabled: boolean) => {
    updateLocalConfig({
      manualRules: config.manualRules.map((r) =>
        r.id === ruleId ? { ...r, enabled } : r
      ),
    });
  };

  const handleSaveRule = (rule: RoutingRule) => {
    const existingIndex = config.manualRules.findIndex((r) => r.id === rule.id);
    if (existingIndex >= 0) {
      // Update existing
      const newRules = [...config.manualRules];
      newRules[existingIndex] = rule;
      updateLocalConfig({ manualRules: newRules });
      toast.success({ title: 'Rule updated' });
    } else {
      // Add new
      updateLocalConfig({ manualRules: [...config.manualRules, rule] });
      toast.success({ title: 'Rule added' });
    }
  };

  // Handle fallback chain changes
  const handleFallbackChainChange = (chain: FallbackProvider[]) => {
    updateLocalConfig({ fallbackChain: chain });
  };

  // Handle platform keys toggle
  const handlePlatformKeysToggle = (value: boolean) => {
    updateLocalConfig({ usePlatformKeysFallback: value });
  };

  // Save all changes
  const handleSave = async () => {
    try {
      await updateConfig(config);
      setHasChanges(false);
      toast.success({
        title: 'Configuration saved',
        description: 'Your routing preferences have been updated.',
      });
    } catch (err) {
      toast.error({
        title: 'Failed to save',
        description: err instanceof Error ? err.message : 'An error occurred',
      });
    }
  };

  // Reset changes
  const handleReset = () => {
    if (savedConfig) {
      setConfig(savedConfig);
      setHasChanges(false);
      toast.info({ title: 'Changes discarded' });
    }
  };

  // Loading state
  if (isLoading) {
    return <LoadingSpinner />;
  }

  // Error state
  if (error) {
    return <ErrorMessage message={error.message} />;
  }

  // Simple mode: Show only the slider and presets
  if (uiMode === 'simple') {
    return (
      <div className="space-y-6">
        {/* Unsaved Changes Banner */}
        {hasChanges && (
          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-primary/20">
            <div className="flex items-center gap-2">
              <Info className="h-4 w-4 text-primary" />
              <span className="text-sm">You have unsaved changes</span>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" onClick={handleReset}>
                Discard
              </Button>
              <Button size="sm" onClick={handleSave} disabled={isSaving}>
                {isSaving ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {/* Simple Mode: Quality/Cost Balance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Sparkles className="h-5 w-5" />
              Intelligent Routing
            </CardTitle>
            <CardDescription>
              Adjust the balance between output quality and cost efficiency
            </CardDescription>
          </CardHeader>
          <CardContent>
            <QualityCostSlider
              value={config.autoSettings.qualityCostBalance}
              preset={config.autoSettings.preset}
              letAiDecide={config.autoSettings.letAiDecide}
              onValueChange={(value) =>
                handleAutoSettingsChange({ qualityCostBalance: value })
              }
              onPresetChange={(preset) => handleAutoSettingsChange({ preset })}
              onLetAiDecideChange={(value) =>
                handleAutoSettingsChange({ letAiDecide: value })
              }
            />
          </CardContent>
        </Card>
      </div>
    );
  }

  // Expert mode: Full configuration UI
  return (
    <div className="space-y-6">
      {/* Unsaved Changes Banner */}
      {hasChanges && (
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50 border border-primary/20">
          <div className="flex items-center gap-2">
            <Info className="h-4 w-4 text-primary" />
            <span className="text-sm">You have unsaved changes</span>
          </div>
          <div className="flex items-center gap-3">
            <Button variant="outline" size="sm" onClick={handleReset}>
              Discard
            </Button>
            <Button size="sm" onClick={handleSave} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
          </div>
        </div>
      )}

      {/* Mode Toggle Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Sparkles className="h-5 w-5" />
            Routing Mode
          </CardTitle>
          <CardDescription>
            Choose how the system routes your tasks to AI models
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RoutingModeToggle mode={config.mode} onChange={handleModeChange} />

          {/* Info about current mode */}
          <div className="mt-4 p-4 rounded-lg bg-muted/50">
            {config.mode === 'auto' ? (
              <div className="flex items-start gap-3">
                <Sparkles className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">Auto Mode</p>
                  <p className="text-sm text-muted-foreground">
                    The system automatically selects the best model for each task based
                    on your quality/cost preferences. Ideal for most users.
                  </p>
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3">
                <Settings2 className="h-5 w-5 text-primary mt-0.5" />
                <div>
                  <p className="font-medium">Manual Mode (Expert)</p>
                  <p className="text-sm text-muted-foreground">
                    Define specific routing rules for each task type. Gives you full
                    control over model selection but requires more configuration.
                  </p>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Auto Mode Settings */}
      {config.mode === 'auto' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Cpu className="h-5 w-5" />
              Auto Mode Settings
            </CardTitle>
            <CardDescription>
              Configure how the AI balances quality and cost
            </CardDescription>
          </CardHeader>
          <CardContent>
            <QualityCostSlider
              value={config.autoSettings.qualityCostBalance}
              preset={config.autoSettings.preset}
              letAiDecide={config.autoSettings.letAiDecide}
              onValueChange={(value) =>
                handleAutoSettingsChange({ qualityCostBalance: value })
              }
              onPresetChange={(preset) => handleAutoSettingsChange({ preset })}
              onLetAiDecideChange={(value) =>
                handleAutoSettingsChange({ letAiDecide: value })
              }
            />
          </CardContent>
        </Card>
      )}

      {/* Manual Mode Settings */}
      {config.mode === 'manual' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Settings2 className="h-5 w-5" />
              Manual Routing Rules
            </CardTitle>
            <CardDescription>
              Define specific model assignments for each task type
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ManualRulesTable
              rules={config.manualRules}
              models={models}
              onAdd={handleAddRule}
              onEdit={handleEditRule}
              onDelete={handleDeleteRule}
              onToggle={handleToggleRule}
            />
          </CardContent>
        </Card>
      )}

      {/* Fallback Chain */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Zap className="h-5 w-5" />
            Fallback Chain
          </CardTitle>
          <CardDescription>
            Configure the order of providers to try when the primary fails
          </CardDescription>
        </CardHeader>
        <CardContent>
          <FallbackChain
            chain={config.fallbackChain}
            usePlatformKeysFallback={config.usePlatformKeysFallback}
            onChange={handleFallbackChainChange}
            onTogglePlatformKeys={handlePlatformKeysToggle}
          />
        </CardContent>
      </Card>

      {/* Rule Dialog */}
      <RuleDialog
        open={isRuleDialogOpen}
        rule={editingRule}
        models={models}
        onClose={() => setIsRuleDialogOpen(false)}
        onSave={handleSaveRule}
      />
    </div>
  );
}
