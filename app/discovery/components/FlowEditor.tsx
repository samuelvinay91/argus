'use client';

import { useState, useCallback, useEffect, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';
import {
  GripVertical,
  Plus,
  Trash2,
  Copy,
  Edit2,
  CheckCircle,
  AlertCircle,
  Play,
  Save,
  X,
  Sparkles,
  ChevronDown,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';

// ============================================
// Type Definitions
// ============================================

export interface FlowStep {
  id: string;
  instruction: string;
  selector?: string;
  action?: 'click' | 'type' | 'navigate' | 'wait' | 'assert';
  value?: string;
  optional?: boolean;
}

export interface DiscoveredFlow {
  id: string;
  name: string;
  description: string;
  category: string;
  priority: 'critical' | 'high' | 'medium' | 'low';
  steps: FlowStep[];
  successCriteria: string[];
  failureIndicators: string[];
}

export interface FlowEditorProps {
  flow: DiscoveredFlow;
  onSave: (flow: DiscoveredFlow) => void;
  onCancel: () => void;
  onValidate?: (flow: DiscoveredFlow) => Promise<boolean>;
  onGenerateTest?: (flow: DiscoveredFlow) => void;
}

interface StepEditorProps {
  step: FlowStep;
  onSave: (step: FlowStep) => void;
  onCancel: () => void;
}

// ============================================
// Constants
// ============================================

const ACTION_TYPES: { value: FlowStep['action']; label: string }[] = [
  { value: 'click', label: 'Click' },
  { value: 'type', label: 'Type' },
  { value: 'navigate', label: 'Navigate' },
  { value: 'wait', label: 'Wait' },
  { value: 'assert', label: 'Assert' },
];

const CATEGORIES = [
  'Authentication',
  'Navigation',
  'Form Submission',
  'Data Entry',
  'Search',
  'E-commerce',
  'User Settings',
  'Onboarding',
  'Other',
];

const PRIORITIES: { value: DiscoveredFlow['priority']; label: string; color: string }[] = [
  { value: 'critical', label: 'Critical', color: 'text-red-500 bg-red-500/10' },
  { value: 'high', label: 'High', color: 'text-orange-500 bg-orange-500/10' },
  { value: 'medium', label: 'Medium', color: 'text-yellow-500 bg-yellow-500/10' },
  { value: 'low', label: 'Low', color: 'text-green-500 bg-green-500/10' },
];

// ============================================
// Utility Functions
// ============================================

function generateId(): string {
  return `step-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

// ============================================
// Custom Select Component
// ============================================

interface SelectProps<T extends string> {
  value: T;
  onChange: (value: T) => void;
  options: { value: T; label: string; color?: string }[];
  placeholder?: string;
  className?: string;
}

function Select<T extends string>({
  value,
  onChange,
  options,
  placeholder,
  className,
}: SelectProps<T>) {
  const [isOpen, setIsOpen] = useState(false);
  const selectRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (selectRef.current && !selectRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div ref={selectRef} className={cn('relative', className)}>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background',
          'focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2',
          'disabled:cursor-not-allowed disabled:opacity-50',
          selectedOption?.color
        )}
      >
        <span className={!selectedOption ? 'text-muted-foreground' : ''}>
          {selectedOption?.label || placeholder || 'Select...'}
        </span>
        <ChevronDown className="h-4 w-4 opacity-50" />
      </button>
      {isOpen && (
        <div className="absolute z-50 mt-1 w-full rounded-md border bg-popover p-1 shadow-md animate-in fade-in-0 zoom-in-95">
          {options.map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                onChange(option.value);
                setIsOpen(false);
              }}
              className={cn(
                'relative flex w-full cursor-pointer select-none items-center rounded-sm px-2 py-1.5 text-sm outline-none',
                'hover:bg-accent hover:text-accent-foreground',
                'focus:bg-accent focus:text-accent-foreground',
                value === option.value && 'bg-accent',
                option.color
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

// ============================================
// Step Editor Modal Component
// ============================================

function StepEditorModal({ step, onSave, onCancel }: StepEditorProps) {
  const [editedStep, setEditedStep] = useState<FlowStep>({ ...step });
  const [testingSelector, setTestingSelector] = useState(false);
  const [selectorValid, setSelectorValid] = useState<boolean | null>(null);

  const handleTestSelector = async () => {
    if (!editedStep.selector) return;
    setTestingSelector(true);
    // Simulate selector testing - in real implementation this would test against the actual page
    await new Promise((resolve) => setTimeout(resolve, 1000));
    // For demo, randomly pass/fail
    setSelectorValid(Math.random() > 0.3);
    setTestingSelector(false);
  };

  return (
    <Dialog open onOpenChange={() => onCancel()}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Edit Step</DialogTitle>
          <DialogDescription>
            Configure the step details including action, selector, and value.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* Instruction */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Instruction</label>
            <Textarea
              value={editedStep.instruction}
              onChange={(e) =>
                setEditedStep({ ...editedStep, instruction: e.target.value })
              }
              placeholder="Describe what this step does..."
              className="min-h-[80px]"
            />
          </div>

          {/* Action Type */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Action Type</label>
            <Select
              value={editedStep.action || 'click'}
              onChange={(value) =>
                setEditedStep({ ...editedStep, action: value as FlowStep['action'] })
              }
              options={ACTION_TYPES.map((a) => ({ value: a.value!, label: a.label }))}
            />
          </div>

          {/* Selector */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Selector (CSS/XPath)</label>
            <div className="flex gap-2">
              <Input
                value={editedStep.selector || ''}
                onChange={(e) => {
                  setEditedStep({ ...editedStep, selector: e.target.value });
                  setSelectorValid(null);
                }}
                placeholder="button.submit, #login-form, [data-testid='submit']"
                className="flex-1"
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={handleTestSelector}
                disabled={!editedStep.selector || testingSelector}
              >
                {testingSelector ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : selectorValid === true ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : selectorValid === false ? (
                  <AlertCircle className="h-4 w-4 text-red-500" />
                ) : (
                  'Test'
                )}
              </Button>
            </div>
            {selectorValid === false && (
              <p className="text-xs text-red-500">Selector not found on page</p>
            )}
          </div>

          {/* Value (for type action) */}
          {(editedStep.action === 'type' || editedStep.action === 'navigate') && (
            <div className="space-y-2">
              <label className="text-sm font-medium">
                {editedStep.action === 'type' ? 'Value to Type' : 'URL'}
              </label>
              <Input
                value={editedStep.value || ''}
                onChange={(e) =>
                  setEditedStep({ ...editedStep, value: e.target.value })
                }
                placeholder={
                  editedStep.action === 'type'
                    ? 'Enter the text to type...'
                    : 'https://example.com/page'
                }
              />
            </div>
          )}

          {/* Wait duration */}
          {editedStep.action === 'wait' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Wait Duration (ms)</label>
              <Input
                type="number"
                value={editedStep.value || '1000'}
                onChange={(e) =>
                  setEditedStep({ ...editedStep, value: e.target.value })
                }
                placeholder="1000"
              />
            </div>
          )}

          {/* Assert value */}
          {editedStep.action === 'assert' && (
            <div className="space-y-2">
              <label className="text-sm font-medium">Expected Value/Text</label>
              <Input
                value={editedStep.value || ''}
                onChange={(e) =>
                  setEditedStep({ ...editedStep, value: e.target.value })
                }
                placeholder="Expected text content..."
              />
            </div>
          )}

          {/* Optional checkbox */}
          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="optional"
              checked={editedStep.optional || false}
              onChange={(e) =>
                setEditedStep({ ...editedStep, optional: e.target.checked })
              }
              className="h-4 w-4 rounded border-gray-300 text-primary focus:ring-primary"
            />
            <label htmlFor="optional" className="text-sm">
              This step is optional (test continues if it fails)
            </label>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>
          <Button onClick={() => onSave(editedStep)}>Save Step</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============================================
// Step Item Component
// ============================================

interface StepItemProps {
  step: FlowStep;
  index: number;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onDragStart: (e: React.DragEvent, index: number) => void;
  onDragOver: (e: React.DragEvent, index: number) => void;
  onDragEnd: () => void;
  isDragging: boolean;
  isDragOver: boolean;
}

function StepItem({
  step,
  index,
  onEdit,
  onDelete,
  onDuplicate,
  onDragStart,
  onDragOver,
  onDragEnd,
  isDragging,
  isDragOver,
}: StepItemProps) {
  const actionColors: Record<string, string> = {
    click: 'bg-blue-500/10 text-blue-500',
    type: 'bg-purple-500/10 text-purple-500',
    navigate: 'bg-green-500/10 text-green-500',
    wait: 'bg-yellow-500/10 text-yellow-500',
    assert: 'bg-orange-500/10 text-orange-500',
  };

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, index)}
      onDragOver={(e) => onDragOver(e, index)}
      onDragEnd={onDragEnd}
      className={cn(
        'group flex items-start gap-3 p-3 rounded-lg border bg-card transition-all',
        isDragging && 'opacity-50 scale-95',
        isDragOver && 'border-primary border-dashed bg-primary/5',
        step.optional && 'border-dashed'
      )}
    >
      {/* Drag handle */}
      <div className="cursor-grab active:cursor-grabbing pt-0.5">
        <GripVertical className="h-5 w-5 text-muted-foreground" />
      </div>

      {/* Step number */}
      <div className="flex-shrink-0 w-6 h-6 rounded-full bg-primary/10 text-primary text-xs font-medium flex items-center justify-center">
        {index + 1}
      </div>

      {/* Step content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1">
          {step.action && (
            <span
              className={cn(
                'text-xs px-2 py-0.5 rounded-full font-medium',
                actionColors[step.action] || 'bg-muted text-muted-foreground'
              )}
            >
              {step.action}
            </span>
          )}
          {step.optional && (
            <span className="text-xs px-2 py-0.5 rounded-full bg-muted text-muted-foreground">
              optional
            </span>
          )}
        </div>
        <p className="text-sm font-medium truncate">{step.instruction}</p>
        {step.selector && (
          <p className="text-xs text-muted-foreground font-mono truncate mt-1">
            {step.selector}
          </p>
        )}
        {step.value && (
          <p className="text-xs text-muted-foreground truncate mt-0.5">
            Value: {step.value}
          </p>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onEdit}>
          <Edit2 className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={onDuplicate}>
          <Copy className="h-4 w-4" />
        </Button>
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8 text-destructive hover:text-destructive"
          onClick={onDelete}
        >
          <Trash2 className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}

// ============================================
// Criteria List Component
// ============================================

interface CriteriaListProps {
  items: string[];
  onChange: (items: string[]) => void;
  placeholder: string;
  addLabel: string;
}

function CriteriaList({ items, onChange, placeholder, addLabel }: CriteriaListProps) {
  const [newItem, setNewItem] = useState('');

  const handleAdd = () => {
    if (newItem.trim()) {
      onChange([...items, newItem.trim()]);
      setNewItem('');
    }
  };

  const handleRemove = (index: number) => {
    onChange(items.filter((_, i) => i !== index));
  };

  const handleEdit = (index: number, value: string) => {
    const updated = [...items];
    updated[index] = value;
    onChange(updated);
  };

  return (
    <div className="space-y-2">
      {items.map((item, index) => (
        <div key={index} className="flex items-center gap-2">
          <Input
            value={item}
            onChange={(e) => handleEdit(index, e.target.value)}
            className="flex-1"
          />
          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 text-destructive hover:text-destructive"
            onClick={() => handleRemove(index)}
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ))}
      <div className="flex items-center gap-2">
        <Input
          value={newItem}
          onChange={(e) => setNewItem(e.target.value)}
          placeholder={placeholder}
          className="flex-1"
          onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
        />
        <Button variant="outline" size="sm" onClick={handleAdd}>
          <Plus className="h-4 w-4 mr-1" />
          {addLabel}
        </Button>
      </div>
    </div>
  );
}

// ============================================
// Main FlowEditor Component
// ============================================

export function FlowEditor({
  flow,
  onSave,
  onCancel,
  onValidate,
  onGenerateTest,
}: FlowEditorProps) {
  // State
  const [editedFlow, setEditedFlow] = useState<DiscoveredFlow>({ ...flow });
  const [editingStep, setEditingStep] = useState<FlowStep | null>(null);
  const [editingStepIndex, setEditingStepIndex] = useState<number | null>(null);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [dragOverIndex, setDragOverIndex] = useState<number | null>(null);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<boolean | null>(null);
  const [errors, setErrors] = useState<string[]>([]);

  // Refs
  const containerRef = useRef<HTMLDivElement>(null);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault();
        handleSave();
      }
      if (e.key === 'Escape' && !editingStep) {
        onCancel();
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [editedFlow, editingStep]);

  // Validation
  const validate = useCallback((): boolean => {
    const newErrors: string[] = [];

    if (!editedFlow.name.trim()) {
      newErrors.push('Flow name is required');
    }

    if (editedFlow.steps.length === 0) {
      newErrors.push('At least one step is required');
    }

    editedFlow.steps.forEach((step, index) => {
      if (!step.instruction.trim()) {
        newErrors.push(`Step ${index + 1}: Instruction is required`);
      }
    });

    setErrors(newErrors);
    return newErrors.length === 0;
  }, [editedFlow]);

  // Handlers
  const handleSave = () => {
    if (validate()) {
      onSave(editedFlow);
    }
  };

  const handleValidate = async () => {
    if (!onValidate || !validate()) return;

    setValidating(true);
    setValidationResult(null);
    try {
      const result = await onValidate(editedFlow);
      setValidationResult(result);
    } catch {
      setValidationResult(false);
    } finally {
      setValidating(false);
    }
  };

  const handleGenerateTest = () => {
    if (validate() && onGenerateTest) {
      onGenerateTest(editedFlow);
    }
  };

  // Step management
  const addStep = () => {
    const newStep: FlowStep = {
      id: generateId(),
      instruction: '',
      action: 'click',
    };
    setEditingStep(newStep);
    setEditingStepIndex(null); // null means adding new
  };

  const saveStep = (step: FlowStep) => {
    if (editingStepIndex !== null) {
      // Editing existing step
      const updated = [...editedFlow.steps];
      updated[editingStepIndex] = step;
      setEditedFlow({ ...editedFlow, steps: updated });
    } else {
      // Adding new step
      setEditedFlow({ ...editedFlow, steps: [...editedFlow.steps, step] });
    }
    setEditingStep(null);
    setEditingStepIndex(null);
  };

  const deleteStep = (index: number) => {
    setEditedFlow({
      ...editedFlow,
      steps: editedFlow.steps.filter((_, i) => i !== index),
    });
  };

  const duplicateStep = (index: number) => {
    const step = editedFlow.steps[index];
    const newStep: FlowStep = {
      ...step,
      id: generateId(),
    };
    const updated = [...editedFlow.steps];
    updated.splice(index + 1, 0, newStep);
    setEditedFlow({ ...editedFlow, steps: updated });
  };

  const editStep = (index: number) => {
    setEditingStep({ ...editedFlow.steps[index] });
    setEditingStepIndex(index);
  };

  // Drag and drop handlers
  const handleDragStart = (e: React.DragEvent, index: number) => {
    setDragIndex(index);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverIndex(index);
  };

  const handleDragEnd = () => {
    if (dragIndex !== null && dragOverIndex !== null && dragIndex !== dragOverIndex) {
      const updated = [...editedFlow.steps];
      const [removed] = updated.splice(dragIndex, 1);
      updated.splice(dragOverIndex, 0, removed);
      setEditedFlow({ ...editedFlow, steps: updated });
    }
    setDragIndex(null);
    setDragOverIndex(null);
  };

  return (
    <div
      ref={containerRef}
      className="flex flex-col h-full max-h-[90vh] bg-background rounded-lg border shadow-lg"
    >
      {/* Header */}
      <div className="flex items-center justify-between p-4 border-b">
        <h2 className="text-lg font-semibold">Edit Flow</h2>
        <Button variant="ghost" size="icon" onClick={onCancel}>
          <X className="h-4 w-4" />
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-auto p-4 space-y-6">
        {/* Validation Errors */}
        {errors.length > 0 && (
          <div className="p-3 rounded-lg bg-destructive/10 border border-destructive/20">
            <div className="flex items-center gap-2 text-destructive mb-2">
              <AlertCircle className="h-4 w-4" />
              <span className="font-medium">Validation Errors</span>
            </div>
            <ul className="text-sm text-destructive space-y-1">
              {errors.map((error, i) => (
                <li key={i}>{error}</li>
              ))}
            </ul>
          </div>
        )}

        {/* Basic Info */}
        <section className="space-y-4">
          <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
            Basic Information
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">
                Name <span className="text-destructive">*</span>
              </label>
              <Input
                value={editedFlow.name}
                onChange={(e) =>
                  setEditedFlow({ ...editedFlow, name: e.target.value })
                }
                placeholder="e.g., User Login Flow"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Category</label>
                <Select
                  value={editedFlow.category}
                  onChange={(value) =>
                    setEditedFlow({ ...editedFlow, category: value })
                  }
                  options={CATEGORIES.map((c) => ({ value: c, label: c }))}
                  placeholder="Select category"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Priority</label>
                <Select
                  value={editedFlow.priority}
                  onChange={(value) =>
                    setEditedFlow({
                      ...editedFlow,
                      priority: value as DiscoveredFlow['priority'],
                    })
                  }
                  options={PRIORITIES}
                />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium">Description</label>
            <Textarea
              value={editedFlow.description}
              onChange={(e) =>
                setEditedFlow({ ...editedFlow, description: e.target.value })
              }
              placeholder="Describe what this flow tests..."
              className="min-h-[80px]"
            />
          </div>
        </section>

        {/* Steps */}
        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
              Test Steps <span className="text-destructive">*</span>
            </h3>
            <Button variant="outline" size="sm" onClick={addStep}>
              <Plus className="h-4 w-4 mr-1" />
              Add Step
            </Button>
          </div>

          {editedFlow.steps.length === 0 ? (
            <div className="text-center py-8 border border-dashed rounded-lg">
              <p className="text-muted-foreground mb-2">No steps defined yet</p>
              <Button variant="outline" size="sm" onClick={addStep}>
                <Plus className="h-4 w-4 mr-1" />
                Add First Step
              </Button>
            </div>
          ) : (
            <div className="space-y-2">
              {editedFlow.steps.map((step, index) => (
                <StepItem
                  key={step.id}
                  step={step}
                  index={index}
                  onEdit={() => editStep(index)}
                  onDelete={() => deleteStep(index)}
                  onDuplicate={() => duplicateStep(index)}
                  onDragStart={handleDragStart}
                  onDragOver={handleDragOver}
                  onDragEnd={handleDragEnd}
                  isDragging={dragIndex === index}
                  isDragOver={dragOverIndex === index}
                />
              ))}
            </div>
          )}
        </section>

        {/* Success Criteria */}
        <section className="space-y-4">
          <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
            Success Criteria
          </h3>
          <CriteriaList
            items={editedFlow.successCriteria}
            onChange={(items) =>
              setEditedFlow({ ...editedFlow, successCriteria: items })
            }
            placeholder="e.g., User should see dashboard after login"
            addLabel="Add"
          />
        </section>

        {/* Failure Indicators */}
        <section className="space-y-4">
          <h3 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
            Failure Indicators
          </h3>
          <CriteriaList
            items={editedFlow.failureIndicators}
            onChange={(items) =>
              setEditedFlow({ ...editedFlow, failureIndicators: items })
            }
            placeholder="e.g., Error message 'Invalid credentials'"
            addLabel="Add"
          />
        </section>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-between p-4 border-t bg-muted/30">
        <div className="flex items-center gap-2">
          {validationResult !== null && (
            <span
              className={cn(
                'flex items-center gap-1 text-sm',
                validationResult ? 'text-green-500' : 'text-red-500'
              )}
            >
              {validationResult ? (
                <>
                  <CheckCircle className="h-4 w-4" />
                  Validation passed
                </>
              ) : (
                <>
                  <AlertCircle className="h-4 w-4" />
                  Validation failed
                </>
              )}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={onCancel}>
            Cancel
          </Button>

          {onValidate && (
            <Button variant="outline" onClick={handleValidate} disabled={validating}>
              {validating ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Play className="h-4 w-4 mr-2" />
              )}
              Validate
            </Button>
          )}

          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save
          </Button>

          {onGenerateTest && (
            <Button variant="ai" onClick={handleGenerateTest}>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Test
            </Button>
          )}
        </div>
      </div>

      {/* Step Editor Modal */}
      {editingStep && (
        <StepEditorModal
          step={editingStep}
          onSave={saveStep}
          onCancel={() => {
            setEditingStep(null);
            setEditingStepIndex(null);
          }}
        />
      )}
    </div>
  );
}

