'use client';

import { useState, useMemo } from 'react';
import {
  Calendar,
  Plus,
  Search,
  XCircle,
  TrendingUp,
  Activity,
  Loader2,
  RefreshCw,
  AlertCircle,
} from 'lucide-react';
import { Sidebar } from '@/components/layout/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ScheduleCard, type Schedule } from '@/components/schedules/ScheduleCard';
import { ScheduleRunHistory, type ScheduleRun } from '@/components/schedules/ScheduleRunHistory';
import { CreateScheduleModal, type ScheduleFormData } from '@/components/schedules/CreateScheduleModal';
import { cn } from '@/lib/utils';
import {
  useSchedules,
  useScheduleRuns,
  useScheduleStats,
  useCreateSchedule,
  useUpdateSchedule,
  useToggleSchedule,
  useDeleteSchedule,
  useTriggerSchedule,
  useTestsForSchedule,
  type TestSchedule,
} from '@/lib/hooks/use-schedules';
import { useNotificationChannels } from '@/lib/hooks/use-notifications';
import { useProjects } from '@/lib/hooks/use-projects';

interface Stats {
  totalSchedules: number;
  enabledSchedules: number;
  totalRuns: number;
  successRate: number;
  runsToday: number;
  failuresToday: number;
}

export default function SchedulesPage() {
  // Data fetching hooks
  const { data: schedules = [], isLoading: schedulesLoading, error: schedulesError, refetch: refetchSchedules } = useSchedules();
  const { data: projects = [] } = useProjects();
  const { data: channels = [] } = useNotificationChannels();
  const scheduleStats = useScheduleStats();

  // Mutation hooks
  const createSchedule = useCreateSchedule();
  const updateSchedule = useUpdateSchedule();
  const toggleSchedule = useToggleSchedule();
  const deleteSchedule = useDeleteSchedule();
  const triggerSchedule = useTriggerSchedule();

  // UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<'all' | 'enabled' | 'disabled'>('all');
  const [expandedScheduleId, setExpandedScheduleId] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingSchedule, setEditingSchedule] = useState<TestSchedule | null>(null);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);

  // Get schedule runs for expanded schedule
  const { data: scheduleRuns = [], isLoading: runsLoading } = useScheduleRuns(expandedScheduleId);

  // Get tests for selected project (for schedule creation)
  const { data: availableTests = [] } = useTestsForSchedule(selectedProjectId || (projects[0]?.id ?? null));

  // Filter schedules
  const filteredSchedules = useMemo(() => {
    return schedules.filter(schedule => {
      // Search filter
      const matchesSearch = searchQuery === '' ||
        schedule.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        schedule.description?.toLowerCase().includes(searchQuery.toLowerCase());

      // Status filter
      const matchesStatus = filterStatus === 'all' ||
        (filterStatus === 'enabled' && schedule.enabled) ||
        (filterStatus === 'disabled' && !schedule.enabled);

      return matchesSearch && matchesStatus;
    });
  }, [schedules, searchQuery, filterStatus]);

  // Calculate stats
  const stats: Stats = useMemo(() => {
    const totalRuns = schedules.reduce((sum, s) => sum + s.run_count, 0);
    const totalFailures = schedules.reduce((sum, s) => sum + s.failure_count, 0);
    const successRate = totalRuns > 0
      ? ((totalRuns - totalFailures) / totalRuns) * 100
      : 0;

    return {
      totalSchedules: schedules.length,
      enabledSchedules: schedules.filter(s => s.enabled).length,
      totalRuns,
      successRate,
      runsToday: scheduleStats.data?.runsToday || 0,
      failuresToday: scheduleStats.data?.failuresToday || 0,
    };
  }, [schedules, scheduleStats.data]);

  // Create/Update schedule
  const handleSaveSchedule = async (data: ScheduleFormData) => {
    const projectId = selectedProjectId || projects[0]?.id;
    if (!projectId) {
      console.error('No project selected');
      return;
    }

    try {
      if (editingSchedule) {
        await updateSchedule.mutateAsync({
          id: editingSchedule.id,
          data,
        });
      } else {
        await createSchedule.mutateAsync({
          projectId,
          data,
        });
      }
    } catch (err) {
      console.error('Failed to save schedule:', err);
    }

    setEditingSchedule(null);
    setShowCreateModal(false);
  };

  // Toggle schedule enabled state
  const handleToggleSchedule = async (scheduleId: string, enabled: boolean) => {
    try {
      await toggleSchedule.mutateAsync({ id: scheduleId, enabled });
    } catch (err) {
      console.error('Failed to toggle schedule:', err);
    }
  };

  // Delete schedule
  const handleDeleteSchedule = async (scheduleId: string) => {
    if (!confirm('Are you sure you want to delete this schedule?')) return;

    try {
      await deleteSchedule.mutateAsync(scheduleId);
    } catch (err) {
      console.error('Failed to delete schedule:', err);
    }
  };

  // Trigger schedule now
  const handleTriggerNow = async (scheduleId: string) => {
    try {
      await triggerSchedule.mutateAsync(scheduleId);
    } catch (err) {
      console.error('Failed to trigger schedule:', err);
    }
  };

  // Get last run status for a schedule
  const getLastRunStatus = (scheduleId: string): 'passed' | 'failed' | 'running' | 'pending' | undefined => {
    if (expandedScheduleId === scheduleId && scheduleRuns.length > 0) {
      return scheduleRuns[0].status as 'passed' | 'failed' | 'running' | 'pending';
    }
    return undefined;
  };

  // Handle expand schedule
  const handleToggleExpand = (scheduleId: string) => {
    if (expandedScheduleId === scheduleId) {
      setExpandedScheduleId(null);
    } else {
      setExpandedScheduleId(scheduleId);
    }
  };

  // Map TestSchedule to Schedule type expected by components
  const mapToScheduleType = (schedule: TestSchedule): Schedule => ({
    id: schedule.id,
    name: schedule.name,
    description: schedule.description || undefined,
    cron_expression: schedule.cron_expression,
    timezone: schedule.timezone,
    enabled: schedule.enabled,
    next_run_at: schedule.next_run_at || undefined,
    last_run_at: schedule.last_run_at || undefined,
    run_count: schedule.run_count,
    failure_count: schedule.failure_count,
    success_rate: schedule.success_rate,
    test_ids: schedule.test_ids,
    notification_config: schedule.notification_config as Schedule['notification_config'],
    environment: schedule.environment || undefined,
    browser: schedule.browser || undefined,
    created_at: schedule.created_at,
  });

  // Map schedule runs
  const mapScheduleRuns = (runs: typeof scheduleRuns): ScheduleRun[] =>
    runs.map(run => ({
      id: run.id,
      schedule_id: run.schedule_id,
      test_run_id: run.test_run_id || undefined,
      triggered_at: run.triggered_at,
      started_at: run.started_at || undefined,
      completed_at: run.completed_at || undefined,
      status: run.status,
      trigger_type: run.trigger_type,
      tests_total: run.tests_total,
      tests_passed: run.tests_passed,
      tests_failed: run.tests_failed,
      tests_skipped: run.tests_skipped,
      duration_ms: run.duration_ms || undefined,
      error_message: run.error_message || undefined,
    }));

  const loading = schedulesLoading;
  const error = schedulesError ? 'Failed to load schedules' : null;

  // Format notification channels for modal
  const notificationChannels = channels.map(c => ({
    id: c.id,
    name: c.name,
    channel_type: c.channel_type,
  }));

  // Format tests for modal
  const tests = availableTests.map(t => ({
    id: t.id,
    name: t.name,
    tags: t.tags,
  }));

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 lg:ml-64">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-6">
          <div className="flex-1">
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Test Schedules
            </h1>
            <p className="text-sm text-muted-foreground">
              Automate your test runs with scheduled executions
            </p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create Schedule
          </Button>
        </header>

        <div className="p-6 space-y-6">
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <Calendar className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.enabledSchedules}</p>
                    <p className="text-sm text-muted-foreground">Active Schedules</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-green-500/10">
                    <TrendingUp className="h-6 w-6 text-green-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.successRate.toFixed(1)}%</p>
                    <p className="text-sm text-muted-foreground">Success Rate</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-blue-500/10">
                    <Activity className="h-6 w-6 text-blue-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.runsToday}</p>
                    <p className="text-sm text-muted-foreground">Runs Today</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-red-500/10">
                    <XCircle className="h-6 w-6 text-red-500" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.failuresToday}</p>
                    <p className="text-sm text-muted-foreground">Failures Today</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <div className="flex items-center gap-4 flex-wrap">
            <div className="relative flex-1 min-w-[200px] max-w-md">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search schedules..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex items-center gap-2">
              <span className="text-sm text-muted-foreground">Status:</span>
              <div className="flex rounded-lg border overflow-hidden">
                {(['all', 'enabled', 'disabled'] as const).map((status) => (
                  <button
                    key={status}
                    onClick={() => setFilterStatus(status)}
                    className={cn(
                      'px-3 py-1.5 text-sm transition-colors',
                      filterStatus === status
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-muted'
                    )}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </button>
                ))}
              </div>
            </div>

            <Button variant="outline" size="sm" onClick={() => refetchSchedules()}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
          </div>

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="flex items-center gap-2 p-4 rounded-lg bg-destructive/10 text-destructive border border-destructive/20">
              <AlertCircle className="h-5 w-5 flex-shrink-0" />
              <p>{error}</p>
            </div>
          )}

          {/* Schedules Grid */}
          {!loading && !error && (
            <div className="space-y-4">
              {filteredSchedules.length === 0 ? (
                <div className="text-center py-12">
                  <Calendar className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                  <h3 className="text-lg font-semibold mb-2">No schedules found</h3>
                  <p className="text-muted-foreground mb-4">
                    {searchQuery || filterStatus !== 'all'
                      ? 'Try adjusting your search or filters'
                      : 'Create your first schedule to automate test runs'}
                  </p>
                  {!searchQuery && filterStatus === 'all' && (
                    <Button onClick={() => setShowCreateModal(true)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Create Schedule
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-4">
                  {filteredSchedules.map((schedule) => (
                    <div key={schedule.id}>
                      <ScheduleCard
                        schedule={mapToScheduleType(schedule)}
                        onEdit={(s) => {
                          const original = schedules.find(sch => sch.id === s.id);
                          if (original) {
                            setEditingSchedule(original);
                            setSelectedProjectId(original.project_id);
                            setShowCreateModal(true);
                          }
                        }}
                        onDelete={handleDeleteSchedule}
                        onToggle={handleToggleSchedule}
                        onTriggerNow={handleTriggerNow}
                        lastRunStatus={getLastRunStatus(schedule.id)}
                        isExpanded={expandedScheduleId === schedule.id}
                        onToggleExpand={() => handleToggleExpand(schedule.id)}
                      />

                      {/* Expanded Run History */}
                      {expandedScheduleId === schedule.id && (
                        <div className="mt-2 ml-4 animate-fade-up">
                          <ScheduleRunHistory
                            runs={mapScheduleRuns(scheduleRuns)}
                            isLoading={runsLoading}
                            onViewReport={(runId) => {
                              // Navigate to report page
                              console.log('View report:', runId);
                            }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </main>

      {/* Create/Edit Schedule Modal */}
      <CreateScheduleModal
        open={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingSchedule(null);
          setSelectedProjectId(null);
        }}
        onSave={handleSaveSchedule}
        initialData={editingSchedule ? {
          name: editingSchedule.name,
          description: editingSchedule.description || '',
          cron_expression: editingSchedule.cron_expression,
          timezone: editingSchedule.timezone,
          test_ids: editingSchedule.test_ids,
          test_filter: editingSchedule.test_filter as Record<string, unknown>,
          notification_config: editingSchedule.notification_config,
          environment: editingSchedule.environment,
          browser: editingSchedule.browser,
          max_parallel_tests: editingSchedule.max_parallel_tests,
          timeout_ms: editingSchedule.timeout_ms,
          retry_failed_tests: editingSchedule.retry_failed_tests,
          retry_count: editingSchedule.retry_count,
        } : undefined}
        tests={tests}
        notificationChannels={notificationChannels}
        isEditing={!!editingSchedule}
      />
    </div>
  );
}
