'use client';

import { useState, useMemo, useEffect } from 'react';
import {
  Play,
  Clock,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Loader2,
  ArrowRight,
  Layers,
  Shuffle,
  Eye,
  Filter,
  Check,
  X,
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
import { Badge, StatusDot } from '@/components/ui/data-table';
import {
  useParameterSets,
  useRunParameterizedTest,
  type ParameterizedTest,
  type ParameterSet,
} from '@/lib/hooks/use-parameterized';
import { useProjects } from '@/lib/hooks/use-projects';
import { cn } from '@/lib/utils';

interface ExecutionPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  test: ParameterizedTest;
  projectId: string;
}

// Iteration mode configs
const IterationModes: Record<string, { icon: React.ComponentType<{ className?: string }>; label: string }> = {
  sequential: { icon: ArrowRight, label: 'Sequential' },
  parallel: { icon: Layers, label: 'Parallel' },
  random: { icon: Shuffle, label: 'Random' },
};

export function ExecutionPreview({
  open,
  onOpenChange,
  test,
  projectId,
}: ExecutionPreviewProps) {
  const [selectedSetIds, setSelectedSetIds] = useState<Set<string>>(new Set());
  const [selectAll, setSelectAll] = useState(true);
  const [appUrl, setAppUrl] = useState('');
  const [filterTag, setFilterTag] = useState('');

  // Data fetching
  const { data: parameterSets = [], isLoading: setsLoading } = useParameterSets(test.id);
  const { data: projects = [] } = useProjects();
  const currentProject = projects.find(p => p.id === projectId);

  // Mutations
  const runTest = useRunParameterizedTest();

  // Initialize app URL from project
  useEffect(() => {
    if (currentProject?.app_url && !appUrl) {
      setAppUrl(currentProject.app_url);
    }
  }, [currentProject?.app_url, appUrl]);

  // Filter sets by tag
  const filteredSets = useMemo(() => {
    if (!filterTag) return parameterSets.filter(s => !s.skip);
    return parameterSets.filter(
      s => !s.skip && s.tags?.some(t => t.toLowerCase().includes(filterTag.toLowerCase()))
    );
  }, [parameterSets, filterTag]);

  // Calculate which sets will run
  const setsToRun = useMemo(() => {
    if (selectAll) {
      return filteredSets;
    }
    return filteredSets.filter(s => selectedSetIds.has(s.id));
  }, [filteredSets, selectAll, selectedSetIds]);

  // Get unique tags
  const allTags = useMemo(() => {
    const tags = new Set<string>();
    parameterSets.forEach(s => s.tags?.forEach(t => tags.add(t)));
    return Array.from(tags);
  }, [parameterSets]);

  // Estimated run time (rough calculation)
  const estimatedTime = useMemo(() => {
    const avgTimePerIteration = 10; // seconds
    const iterations = setsToRun.length;
    if (test.iteration_mode === 'parallel') {
      const workers = test.max_parallel || 5;
      return Math.ceil(iterations / workers) * avgTimePerIteration;
    }
    return iterations * avgTimePerIteration;
  }, [setsToRun, test]);

  // Toggle set selection
  const toggleSetSelection = (setId: string) => {
    const newSelected = new Set(selectedSetIds);
    if (newSelected.has(setId)) {
      newSelected.delete(setId);
    } else {
      newSelected.add(setId);
    }
    setSelectedSetIds(newSelected);
    setSelectAll(false);
  };

  // Handle run
  const handleRun = async () => {
    try {
      await runTest.mutateAsync({
        testId: test.id,
        projectId,
        appUrl: appUrl || currentProject?.app_url || '',
        selectedSetIds: selectAll ? undefined : Array.from(selectedSetIds),
      });
      onOpenChange(false);
    } catch (error) {
      console.error('Failed to run test:', error);
    }
  };

  // Expand a single step with parameter values
  const expandStep = (stepInstruction: string, values: Record<string, any>) => {
    let result = stepInstruction;
    Object.entries(values).forEach(([key, value]) => {
      result = result.replace(new RegExp(`\\{\\{${key}\\}\\}`, 'g'), String(value));
    });
    return result;
  };

  const ModeIcon = IterationModes[test.iteration_mode]?.icon || ArrowRight;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[700px] max-h-[85vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Eye className="h-5 w-5 text-primary" />
            Execution Preview: {test.name}
          </DialogTitle>
          <DialogDescription>
            Review and select which parameter sets to execute.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-4">
          {/* App URL */}
          <div className="space-y-2">
            <label className="text-sm font-medium">Application URL</label>
            <Input
              placeholder="https://example.com"
              value={appUrl || currentProject?.app_url || ''}
              onChange={(e) => setAppUrl(e.target.value)}
            />
          </div>

          {/* Execution Info */}
          <div className="flex items-center gap-4 p-3 bg-muted/50 rounded-lg">
            <div className="flex items-center gap-2">
              <ModeIcon className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">
                {IterationModes[test.iteration_mode]?.label || 'Sequential'}
              </span>
            </div>
            {test.iteration_mode === 'parallel' && (
              <>
                <span className="text-muted-foreground">|</span>
                <span className="text-sm text-muted-foreground">
                  Max {test.max_parallel} workers
                </span>
              </>
            )}
            <span className="text-muted-foreground">|</span>
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="text-sm">~{estimatedTime}s estimated</span>
            </div>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <Input
                placeholder="Filter by tag..."
                value={filterTag}
                onChange={(e) => setFilterTag(e.target.value)}
                className="h-8"
              />
            </div>
            <Button
              type="button"
              variant={selectAll ? 'default' : 'outline'}
              size="sm"
              onClick={() => setSelectAll(true)}
            >
              <Check className="h-4 w-4 mr-1" />
              Select All
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => {
                setSelectAll(false);
                setSelectedSetIds(new Set());
              }}
            >
              <X className="h-4 w-4 mr-1" />
              Clear
            </Button>
          </div>

          {/* Available Tags */}
          {allTags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {allTags.map((tag) => (
                <button
                  key={tag}
                  type="button"
                  onClick={() => setFilterTag(filterTag === tag ? '' : tag)}
                  className={cn(
                    'px-2 py-1 rounded text-xs transition-colors',
                    filterTag === tag
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  )}
                >
                  {tag}
                </button>
              ))}
            </div>
          )}

          {/* Parameter Sets List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="text-sm font-medium">
                Parameter Sets ({setsToRun.length} selected of {parameterSets.length})
              </h4>
            </div>

            {setsLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
              </div>
            ) : filteredSets.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No parameter sets found matching your filter.
              </div>
            ) : (
              <div className="border rounded-lg divide-y max-h-[300px] overflow-y-auto">
                {filteredSets.map((paramSet) => {
                  const isSelected = selectAll || selectedSetIds.has(paramSet.id);
                  const values = paramSet.values as Record<string, any>;

                  return (
                    <div
                      key={paramSet.id}
                      className={cn(
                        'p-3 cursor-pointer transition-colors',
                        isSelected ? 'bg-primary/5' : 'hover:bg-muted/50'
                      )}
                      onClick={() => toggleSetSelection(paramSet.id)}
                    >
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          'h-5 w-5 rounded border flex items-center justify-center flex-shrink-0 mt-0.5',
                          isSelected ? 'bg-primary border-primary' : 'border-border'
                        )}>
                          {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
                        </div>

                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-medium text-sm">{paramSet.name}</span>
                            {paramSet.category && (
                              <Badge variant="outline">{paramSet.category}</Badge>
                            )}
                            {paramSet.tags?.map(tag => (
                              <span
                                key={tag}
                                className="px-1.5 py-0.5 bg-muted rounded text-xs"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>

                          {/* Parameter Values Preview */}
                          <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                            {Object.entries(values).slice(0, 4).map(([key, value]) => (
                              <span key={key}>
                                <span className="font-mono">{key}</span>:{' '}
                                <span className="text-foreground">{String(value).slice(0, 20)}</span>
                                {String(value).length > 20 && '...'}
                              </span>
                            ))}
                            {Object.keys(values).length > 4 && (
                              <span>+{Object.keys(values).length - 4} more</span>
                            )}
                          </div>

                          {/* Expanded Step Preview */}
                          {test.steps && Array.isArray(test.steps) && test.steps.length > 0 && (
                            <div className="mt-2 p-2 bg-muted/50 rounded text-xs">
                              <span className="text-muted-foreground">Step 1: </span>
                              <span className="font-mono">
                                {expandStep(
                                  (test.steps[0] as any).instruction || (test.steps[0] as any).action || '',
                                  values
                                )}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Warning if no sets selected */}
          {setsToRun.length === 0 && !setsLoading && (
            <div className="flex items-center gap-2 p-3 bg-warning/10 border border-warning/20 rounded-lg text-warning text-sm">
              <AlertCircle className="h-4 w-4 flex-shrink-0" />
              No parameter sets selected. Please select at least one set to run.
            </div>
          )}
        </div>

        <DialogFooter>
          <div className="flex items-center justify-between w-full">
            <div className="text-sm text-muted-foreground">
              {setsToRun.length} iteration{setsToRun.length !== 1 ? 's' : ''} will be executed
            </div>
            <div className="flex items-center gap-2">
              <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleRun}
                disabled={runTest.isPending || setsToRun.length === 0}
              >
                {runTest.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Running...
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-2" />
                    Run {setsToRun.length} Iteration{setsToRun.length !== 1 ? 's' : ''}
                  </>
                )}
              </Button>
            </div>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
