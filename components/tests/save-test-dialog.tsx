'use client';

import { useState, useCallback, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { Loader2, Save, Tag, X, Plus, TestTube, CheckCircle } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useSaveToLibrary, type SavedTestData } from '@/lib/hooks/use-test-library';
import { useProjects } from '@/lib/hooks/use-projects';
import { toast } from '@/lib/hooks/useToast';
import { cn } from '@/lib/utils';

interface SaveTestDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  testData: {
    test?: {
      name: string;
      description?: string;
      steps: Array<{ action: string; target?: string; value?: string; description?: string }>;
      assertions?: Array<{ type: string; expected: string; description?: string }>;
    };
    app_url?: string;
    summary?: {
      name: string;
      steps_count: number;
      assertions_count: number;
    };
  } | null;
  onSaved?: (testId: string) => void;
}

const PRIORITY_OPTIONS = [
  { value: 'critical', label: 'Critical', color: 'bg-red-500' },
  { value: 'high', label: 'High', color: 'bg-orange-500' },
  { value: 'medium', label: 'Medium', color: 'bg-blue-500' },
  { value: 'low', label: 'Low', color: 'bg-gray-500' },
] as const;

const SUGGESTED_TAGS = [
  'login', 'checkout', 'navigation', 'form', 'e2e',
  'smoke', 'regression', 'critical-path', 'authentication',
];

export function SaveTestDialog({
  open,
  onOpenChange,
  testData,
  onSaved,
}: SaveTestDialogProps) {
  const { user } = useUser();
  const { data: projects = [] } = useProjects();
  const saveToLibrary = useSaveToLibrary();

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState('');
  const [priority, setPriority] = useState<'critical' | 'high' | 'medium' | 'low'>('medium');
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [showSuccess, setShowSuccess] = useState(false);

  // Initialize form when dialog opens
  useEffect(() => {
    if (open && testData?.test) {
      setName(testData.test.name || testData.summary?.name || 'Untitled Test');
      setDescription(testData.test.description || '');
      setTags([]);
      setPriority('medium');
      setShowSuccess(false);
      // Set default project
      if (projects.length > 0 && !selectedProjectId) {
        setSelectedProjectId(projects[0].id);
      }
    }
  }, [open, testData, projects, selectedProjectId]);

  // Handle tag management
  const addTag = useCallback((tag: string) => {
    const trimmedTag = tag.trim().toLowerCase();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      setTags(prev => [...prev, trimmedTag]);
    }
    setNewTag('');
  }, [tags]);

  const removeTag = useCallback((tagToRemove: string) => {
    setTags(prev => prev.filter(t => t !== tagToRemove));
  }, []);

  const handleKeyDown = useCallback((e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      addTag(newTag);
    }
  }, [newTag, addTag]);

  // Handle save
  const handleSave = useCallback(async () => {
    if (!testData?.test || !selectedProjectId) {
      toast.error({
        title: 'Error',
        description: 'Missing test data or project selection',
      });
      return;
    }

    try {
      const savedTestData: SavedTestData = {
        name: name.trim() || 'Untitled Test',
        description: description.trim() || undefined,
        steps: testData.test.steps,
        assertions: testData.test.assertions,
        tags,
        priority,
        app_url: testData.app_url,
      };

      const savedTest = await saveToLibrary.mutateAsync({
        projectId: selectedProjectId,
        testData: savedTestData,
        createdBy: user?.id || null,
      });

      setShowSuccess(true);

      toast.success({
        title: 'Test saved to library',
        description: `"${savedTest.name}" has been saved successfully.`,
      });

      // Delay closing to show success state
      setTimeout(() => {
        onOpenChange(false);
        onSaved?.(savedTest.id);
      }, 1500);

    } catch (error) {
      console.error('Failed to save test:', error);
      toast.error({
        title: 'Failed to save test',
        description: error instanceof Error ? error.message : 'An unexpected error occurred',
      });
    }
  }, [testData, selectedProjectId, name, description, tags, priority, user, saveToLibrary, onOpenChange, onSaved]);

  if (!testData?.test) {
    return null;
  }

  const stepsCount = testData.test.steps?.length || 0;
  const assertionsCount = testData.test.assertions?.length || 0;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        {showSuccess ? (
          // Success state
          <div className="py-8 flex flex-col items-center justify-center text-center">
            <div className="h-16 w-16 rounded-full bg-green-500/10 flex items-center justify-center mb-4">
              <CheckCircle className="h-8 w-8 text-green-500" />
            </div>
            <DialogTitle className="text-xl mb-2">Test Saved!</DialogTitle>
            <DialogDescription>
              Your test has been saved to the library and can be re-run anytime.
            </DialogDescription>
          </div>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                  <TestTube className="h-4 w-4 text-primary" />
                </div>
                Save Test to Library
              </DialogTitle>
              <DialogDescription>
                Save this test to your library to re-run it anytime. Tests are organized by project.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 py-4">
              {/* Project Selection */}
              {projects.length > 1 && (
                <div className="space-y-2">
                  <label className="text-sm font-medium">Project</label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full h-10 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    {projects.map((project) => (
                      <option key={project.id} value={project.id}>
                        {project.name}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Test Name */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Test Name</label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter a descriptive name for this test"
                />
              </div>

              {/* Description */}
              <div className="space-y-2">
                <label className="text-sm font-medium">
                  Description <span className="text-muted-foreground">(optional)</span>
                </label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="What does this test verify?"
                  rows={2}
                />
              </div>

              {/* Priority */}
              <div className="space-y-2">
                <label className="text-sm font-medium">Priority</label>
                <div className="flex gap-2">
                  {PRIORITY_OPTIONS.map((option) => (
                    <button
                      key={option.value}
                      onClick={() => setPriority(option.value)}
                      className={cn(
                        'flex-1 px-3 py-2 rounded-md text-sm font-medium transition-all',
                        priority === option.value
                          ? 'bg-primary text-primary-foreground'
                          : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                      )}
                    >
                      <span className={cn('inline-block w-2 h-2 rounded-full mr-2', option.color)} />
                      {option.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Tags */}
              <div className="space-y-2">
                <label className="text-sm font-medium flex items-center gap-2">
                  <Tag className="h-4 w-4" />
                  Tags <span className="text-muted-foreground">(optional)</span>
                </label>
                <div className="flex flex-wrap gap-2 mb-2">
                  {tags.map((tag) => (
                    <span
                      key={tag}
                      className="inline-flex items-center gap-1 px-2 py-1 rounded-md bg-primary/10 text-primary text-xs font-medium"
                    >
                      {tag}
                      <button
                        onClick={() => removeTag(tag)}
                        className="hover:bg-primary/20 rounded-full p-0.5"
                      >
                        <X className="h-3 w-3" />
                      </button>
                    </span>
                  ))}
                </div>
                <div className="flex gap-2">
                  <Input
                    value={newTag}
                    onChange={(e) => setNewTag(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Add a tag..."
                    className="flex-1"
                  />
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => addTag(newTag)}
                    disabled={!newTag.trim()}
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>
                <div className="flex flex-wrap gap-1 mt-2">
                  {SUGGESTED_TAGS.filter(t => !tags.includes(t)).slice(0, 5).map((tag) => (
                    <button
                      key={tag}
                      onClick={() => addTag(tag)}
                      className="text-xs px-2 py-1 rounded-md bg-muted hover:bg-muted/80 text-muted-foreground transition-colors"
                    >
                      + {tag}
                    </button>
                  ))}
                </div>
              </div>

              {/* Test Summary */}
              <div className="rounded-lg border bg-muted/30 p-3">
                <div className="text-xs font-medium text-muted-foreground mb-2">Test Summary</div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1">
                    <span className="font-medium">{stepsCount}</span> steps
                  </span>
                  {assertionsCount > 0 && (
                    <span className="flex items-center gap-1">
                      <span className="font-medium">{assertionsCount}</span> assertions
                    </span>
                  )}
                  {testData.app_url && (
                    <span className="text-muted-foreground truncate max-w-[200px]">
                      {testData.app_url}
                    </span>
                  )}
                </div>
              </div>
            </div>

            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>
                Cancel
              </Button>
              <Button
                onClick={handleSave}
                disabled={saveToLibrary.isPending || !name.trim() || !selectedProjectId}
              >
                {saveToLibrary.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Save to Library
                  </>
                )}
              </Button>
            </DialogFooter>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
