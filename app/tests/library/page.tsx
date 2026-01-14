'use client';

import { useState, useMemo, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { formatDistanceToNow } from 'date-fns';
import { type ColumnDef } from '@tanstack/react-table';
import {
  Play,
  Trash2,
  Loader2,
  Plus,
  Search,
  Copy,
  Edit2,
  Tag,
  MoreHorizontal,
  Filter,
  SortAsc,
  Library,
  Zap,
  TestTube,
  CheckCircle,
  Clock,
} from 'lucide-react';
import { Sidebar } from '@/components/layout/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { DataTable, Badge } from '@/components/ui/data-table';
import {
  useTestLibrary,
  useTestLibraryStats,
  useDeleteLibraryTest,
  useDuplicateLibraryTest,
  useTestTags,
} from '@/lib/hooks/use-test-library';
import { useProjects } from '@/lib/hooks/use-projects';
import { toast } from '@/lib/hooks/useToast';
import type { Test } from '@/lib/supabase/types';
import { cn } from '@/lib/utils';

export default function TestLibraryPage() {
  const { user } = useUser();
  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [priorityFilter, setPriorityFilter] = useState<string | null>(null);

  // Get current project (either selected or first available)
  const currentProjectId = selectedProjectId || projects[0]?.id || null;

  // Fetch tests for current project
  const { data: tests = [], isLoading: testsLoading } = useTestLibrary(currentProjectId);
  const { stats, isLoading: statsLoading } = useTestLibraryStats(currentProjectId);
  const tags = useTestTags(currentProjectId);

  // Mutations
  const deleteTest = useDeleteLibraryTest();
  const duplicateTest = useDuplicateLibraryTest();

  // Filter tests by tag and priority
  const filteredTests = useMemo(() => {
    let filtered = tests;

    if (selectedTag) {
      filtered = filtered.filter(t => t.tags?.includes(selectedTag));
    }

    if (priorityFilter) {
      filtered = filtered.filter(t => t.priority === priorityFilter);
    }

    return filtered;
  }, [tests, selectedTag, priorityFilter]);

  // Handle delete test
  const handleDeleteTest = useCallback(async (testId: string) => {
    if (!currentProjectId) return;

    try {
      await deleteTest.mutateAsync({ testId, projectId: currentProjectId });
      toast.success({
        title: 'Test deleted',
        description: 'The test has been removed from your library.',
      });
    } catch (error) {
      console.error('Failed to delete test:', error);
      toast.error({
        title: 'Failed to delete test',
        description: 'An error occurred while deleting the test.',
      });
    }
  }, [deleteTest, currentProjectId]);

  // Handle duplicate test
  const handleDuplicateTest = useCallback(async (test: Test) => {
    try {
      const newTest = await duplicateTest.mutateAsync({ test });
      toast.success({
        title: 'Test duplicated',
        description: `"${newTest.name}" has been created.`,
      });
    } catch (error) {
      console.error('Failed to duplicate test:', error);
      toast.error({
        title: 'Failed to duplicate test',
        description: 'An error occurred while duplicating the test.',
      });
    }
  }, [duplicateTest]);

  // Handle run test - navigate to chat with test pre-filled
  const handleRunTest = useCallback((test: Test) => {
    // Get the project's app URL
    const project = projects.find(p => p.id === test.project_id);
    const appUrl = project?.app_url || 'https://example.com';

    // Build the test run command
    const steps = Array.isArray(test.steps) ? test.steps : [];
    const stepsText = steps.map((s: unknown, i: number) => {
      const step = s as { instruction?: string; action?: string; target?: string; value?: string } | null;
      if (!step) return `${i + 1}. Unknown step`;
      const instruction = step.instruction || `${step.action || 'action'}${step.target ? ` on ${step.target}` : ''}${step.value ? ` with "${step.value}"` : ''}`;
      return `${i + 1}. ${instruction}`;
    }).join('\n');

    const message = `Run the test "${test.name}" on ${appUrl} with these steps:\n${stepsText}`;

    // Store in session storage and redirect to chat
    sessionStorage.setItem('prefilled_chat_message', message);
    window.location.href = '/';
  }, [projects]);

  // Table columns
  const columns: ColumnDef<Test>[] = [
    {
      accessorKey: 'name',
      header: 'Test Name',
      cell: ({ row }) => {
        const stepsCount = Array.isArray(row.original.steps) ? row.original.steps.length : 0;
        return (
          <div className="flex items-center gap-3">
            <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center">
              <TestTube className="h-4 w-4 text-primary" />
            </div>
            <div>
              <div className="font-medium">{row.original.name}</div>
              <div className="text-xs text-muted-foreground">
                {stepsCount} step{stepsCount !== 1 ? 's' : ''}
              </div>
            </div>
          </div>
        );
      },
    },
    {
      accessorKey: 'priority',
      header: 'Priority',
      cell: ({ row }) => {
        const priority = row.original.priority;
        const variants: Record<string, 'error' | 'warning' | 'info' | 'default'> = {
          critical: 'error',
          high: 'warning',
          medium: 'info',
          low: 'default',
        };
        return <Badge variant={variants[priority] || 'default'}>{priority}</Badge>;
      },
    },
    {
      accessorKey: 'tags',
      header: 'Tags',
      cell: ({ row }) => {
        const testTags = row.original.tags || [];
        if (testTags.length === 0) {
          return <span className="text-muted-foreground text-sm">-</span>;
        }
        return (
          <div className="flex flex-wrap gap-1">
            {testTags.slice(0, 2).map((tag: string) => (
              <span
                key={tag}
                className="px-2 py-0.5 rounded-full bg-muted text-xs font-medium"
              >
                {tag}
              </span>
            ))}
            {testTags.length > 2 && (
              <span className="px-2 py-0.5 rounded-full bg-muted text-xs font-medium">
                +{testTags.length - 2}
              </span>
            )}
          </div>
        );
      },
    },
    {
      accessorKey: 'source',
      header: 'Source',
      cell: ({ row }) => (
        <span className="text-muted-foreground capitalize text-sm">{row.original.source}</span>
      ),
    },
    {
      accessorKey: 'created_at',
      header: 'Created',
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">
          {formatDistanceToNow(new Date(row.original.created_at), { addSuffix: true })}
        </span>
      ),
    },
    {
      id: 'actions',
      header: 'Actions',
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          <Button
            variant="default"
            size="sm"
            className="h-8 px-3"
            onClick={(e) => {
              e.stopPropagation();
              handleRunTest(row.original);
            }}
          >
            <Play className="h-4 w-4 mr-1" />
            Run
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground"
            onClick={(e) => {
              e.stopPropagation();
              handleDuplicateTest(row.original);
            }}
            title="Duplicate test"
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
            onClick={(e) => {
              e.stopPropagation();
              handleDeleteTest(row.original.id);
            }}
            title="Delete test"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      ),
    },
  ];

  // No project state
  if (!projectsLoading && projects.length === 0) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 lg:ml-64 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Library className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-semibold tracking-tight mb-2">No projects yet</h2>
            <p className="text-muted-foreground mb-6">
              Create a project first to start building your test library.
            </p>
            <Button onClick={() => window.location.href = '/projects'}>
              <Plus className="h-4 w-4 mr-2" />
              Create Project
            </Button>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 lg:ml-64">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-6">
          <div className="flex items-center gap-3">
            <div className="h-9 w-9 rounded-lg bg-primary/10 flex items-center justify-center">
              <Library className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-lg font-semibold">Test Library</h1>
              <p className="text-xs text-muted-foreground">Saved tests for re-running</p>
            </div>
          </div>

          {/* Project Selector */}
          {projects.length > 1 && (
            <select
              value={currentProjectId || ''}
              onChange={(e) => setSelectedProjectId(e.target.value || null)}
              className="h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>
                  {project.name}
                </option>
              ))}
            </select>
          )}

          {/* Stats */}
          <div className="flex items-center gap-3 ml-4">
            <div className="flex items-center gap-2 text-sm">
              <TestTube className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{stats.totalTests}</span>
              <span className="text-muted-foreground">tests</span>
            </div>
            {stats.recentTests > 0 && (
              <>
                <div className="h-4 w-px bg-border" />
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{stats.recentTests}</span>
                  <span className="text-muted-foreground">this week</span>
                </div>
              </>
            )}
          </div>

          <div className="flex-1" />

          {/* Priority Filter */}
          <select
            value={priorityFilter || ''}
            onChange={(e) => setPriorityFilter(e.target.value || null)}
            className="h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
          >
            <option value="">All Priorities</option>
            <option value="critical">Critical</option>
            <option value="high">High</option>
            <option value="medium">Medium</option>
            <option value="low">Low</option>
          </select>

          <Button
            variant="outline"
            size="sm"
            onClick={() => window.location.href = '/tests'}
          >
            <TestTube className="h-4 w-4 mr-2" />
            Test Runner
          </Button>
        </header>

        <div className="p-6">
          {/* Tag Filter Bar */}
          {tags.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-2 text-sm text-muted-foreground">
                <Tag className="h-4 w-4" />
                <span>Filter by tag</span>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => setSelectedTag(null)}
                  className={cn(
                    'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                    !selectedTag
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                  )}
                >
                  All
                </button>
                {tags.map((tag) => (
                  <button
                    key={tag}
                    onClick={() => setSelectedTag(tag === selectedTag ? null : tag)}
                    className={cn(
                      'px-3 py-1.5 rounded-full text-sm font-medium transition-colors',
                      tag === selectedTag
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-muted/80 text-muted-foreground'
                    )}
                  >
                    {tag}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Priority Stats Cards */}
          {stats.totalTests > 0 && (
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              {['critical', 'high', 'medium', 'low'].map((priority) => {
                const count = stats.byPriority[priority] || 0;
                const colors: Record<string, string> = {
                  critical: 'bg-red-500/10 text-red-500 border-red-500/20',
                  high: 'bg-orange-500/10 text-orange-500 border-orange-500/20',
                  medium: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
                  low: 'bg-gray-500/10 text-gray-500 border-gray-500/20',
                };
                return (
                  <button
                    key={priority}
                    onClick={() => setPriorityFilter(priority === priorityFilter ? null : priority)}
                    className={cn(
                      'p-4 rounded-lg border transition-all hover:scale-[1.02]',
                      colors[priority],
                      priority === priorityFilter && 'ring-2 ring-offset-2 ring-offset-background'
                    )}
                  >
                    <div className="text-2xl font-bold">{count}</div>
                    <div className="text-sm capitalize">{priority}</div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Tests Table */}
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-medium">
                {selectedTag ? `Tests tagged "${selectedTag}"` : 'All Tests'}
                {priorityFilter && ` - ${priorityFilter} priority`}
              </h2>
              {(selectedTag || priorityFilter) && (
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => {
                    setSelectedTag(null);
                    setPriorityFilter(null);
                  }}
                >
                  Clear filters
                </Button>
              )}
            </div>
            <DataTable
              columns={columns}
              data={filteredTests}
              searchKey="name"
              searchPlaceholder="Search tests..."
              isLoading={testsLoading}
              emptyMessage={
                selectedTag || priorityFilter
                  ? 'No tests match the current filters.'
                  : 'No tests saved yet. Use the chat to generate tests and save them to your library.'
              }
            />
          </div>
        </div>
      </main>
    </div>
  );
}
