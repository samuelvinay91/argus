'use client';

import { useState, useMemo } from 'react';
import {
  Bell,
  Plus,
  Search,
  CheckCircle,
  XCircle,
  AlertCircle,
  Activity,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { Sidebar } from '@/components/layout/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import { ChannelCard, type NotificationChannel } from '@/components/notifications/ChannelCard';
import { NotificationLogs, type NotificationLog } from '@/components/notifications/NotificationLogs';
import { CreateChannelModal, type ChannelFormData } from '@/components/notifications/CreateChannelModal';
import { cn } from '@/lib/utils';
import {
  useNotificationChannels,
  useNotificationLogs,
  useCreateNotificationChannel,
  useUpdateNotificationChannel,
  useDeleteNotificationChannel,
  useTestNotificationChannel,
  useRetryNotification,
  useNotificationStats,
  type NotificationChannel as DBNotificationChannel,
  type NotificationLog as DBNotificationLog,
} from '@/lib/hooks/use-notifications';

interface Stats {
  totalChannels: number;
  enabledChannels: number;
  verifiedChannels: number;
  notificationsSentToday: number;
  failedToday: number;
  successRate: number;
}

export default function NotificationsPage() {
  // Data fetching hooks
  const { data: channels = [], isLoading: channelsLoading, error: channelsError, refetch: refetchChannels } = useNotificationChannels();
  const { data: logs = [], isLoading: logsLoading, refetch: refetchLogs } = useNotificationLogs();

  // Mutation hooks
  const createChannel = useCreateNotificationChannel();
  const updateChannel = useUpdateNotificationChannel();
  const deleteChannel = useDeleteNotificationChannel();
  const testChannel = useTestNotificationChannel();
  const retryNotification = useRetryNotification();

  // Stats
  const notificationStats = useNotificationStats();

  // UI State
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<string>('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingChannel, setEditingChannel] = useState<DBNotificationChannel | null>(null);
  const [activeTab, setActiveTab] = useState<'channels' | 'logs'>('channels');

  // Filter channels
  const filteredChannels = useMemo(() => {
    return channels.filter(channel => {
      // Search filter
      const matchesSearch = searchQuery === '' ||
        channel.name.toLowerCase().includes(searchQuery.toLowerCase());

      // Type filter
      const matchesType = filterType === 'all' || channel.channel_type === filterType;

      return matchesSearch && matchesType;
    });
  }, [channels, searchQuery, filterType]);

  // Calculate stats
  const stats: Stats = useMemo(() => {
    return {
      totalChannels: notificationStats.totalChannels,
      enabledChannels: notificationStats.enabledChannels,
      verifiedChannels: notificationStats.verifiedChannels,
      notificationsSentToday: notificationStats.notificationsSentToday,
      failedToday: notificationStats.failedToday,
      successRate: notificationStats.successRate,
    };
  }, [notificationStats]);

  // Get unique channel types
  const channelTypes = useMemo(() => {
    const types = new Set(channels.map(c => c.channel_type));
    return Array.from(types);
  }, [channels]);

  // Create/Update channel
  const handleSaveChannel = async (data: ChannelFormData) => {
    try {
      if (editingChannel) {
        await updateChannel.mutateAsync({
          id: editingChannel.id,
          data,
        });
      } else {
        await createChannel.mutateAsync(data);
      }
    } catch (err) {
      console.error('Failed to save channel:', err);
    }

    setEditingChannel(null);
    setShowCreateModal(false);
  };

  // Test channel
  const handleTestChannel = async (channelId: string): Promise<boolean> => {
    try {
      await testChannel.mutateAsync(channelId);
      return true;
    } catch {
      return false;
    }
  };

  // Delete channel
  const handleDeleteChannel = async (channelId: string) => {
    if (!confirm('Are you sure you want to delete this notification channel?')) return;

    try {
      await deleteChannel.mutateAsync(channelId);
    } catch (err) {
      console.error('Failed to delete channel:', err);
    }
  };

  // Retry failed notification
  const handleRetryLog = async (logId: string) => {
    try {
      await retryNotification.mutateAsync(logId);
    } catch (err) {
      console.error('Failed to retry notification:', err);
    }
  };

  // Map DB channel to component channel type
  const mapToChannelType = (channel: DBNotificationChannel): NotificationChannel => ({
    id: channel.id,
    name: channel.name,
    channel_type: channel.channel_type,
    config: (channel.config ?? {}) as Record<string, unknown>,
    enabled: channel.enabled,
    verified: channel.verified,
    rate_limit_per_hour: channel.rate_limit_per_hour,
    sent_today: channel.sent_today,
    last_sent_at: channel.last_sent_at || undefined,
    created_at: channel.created_at,
    rules_count: channel.rules_count || 0,
  });

  // Map DB log to component log type
  const mapToLogType = (log: DBNotificationLog): NotificationLog => ({
    id: log.id,
    channel_id: log.channel_id,
    channel_name: log.channel_name || 'Unknown',
    channel_type: log.channel_type || 'webhook',
    event_type: log.event_type,
    payload: (log.payload ?? {}) as Record<string, unknown>,
    status: log.status,
    response_code: log.response_code || undefined,
    response_body: log.response_body || undefined,
    error_message: log.error_message || undefined,
    retry_count: log.retry_count,
    max_retries: log.max_retries,
    queued_at: log.queued_at,
    sent_at: log.sent_at || undefined,
    delivered_at: log.delivered_at || undefined,
    created_at: log.created_at,
  });

  const loading = channelsLoading;
  const error = channelsError ? 'Failed to load notification channels' : null;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 lg:ml-64">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-6">
          <div className="flex-1">
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <Bell className="h-5 w-5 text-primary" />
              Notification Channels
            </h1>
            <p className="text-sm text-muted-foreground">
              Configure how and when you receive test notifications
            </p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Add Channel
          </Button>
        </header>

        <div className="p-6 space-y-6">
          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card>
              <CardContent className="pt-6">
                <div className="flex items-center gap-4">
                  <div className="p-3 rounded-lg bg-primary/10">
                    <Bell className="h-6 w-6 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-bold">{stats.enabledChannels}</p>
                    <p className="text-sm text-muted-foreground">Active Channels</p>
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
                    <p className="text-2xl font-bold">{stats.successRate.toFixed(1)}%</p>
                    <p className="text-sm text-muted-foreground">Delivery Rate</p>
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
                    <p className="text-2xl font-bold">{stats.notificationsSentToday}</p>
                    <p className="text-sm text-muted-foreground">Sent Today</p>
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
                    <p className="text-2xl font-bold">{stats.failedToday}</p>
                    <p className="text-sm text-muted-foreground">Failed Today</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-4 border-b">
            <button
              className={cn(
                'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                activeTab === 'channels'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
              onClick={() => setActiveTab('channels')}
            >
              Channels
            </button>
            <button
              className={cn(
                'px-4 py-2 text-sm font-medium border-b-2 -mb-px transition-colors',
                activeTab === 'logs'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
              onClick={() => setActiveTab('logs')}
            >
              Delivery Logs
            </button>
          </div>

          {/* Channels Tab */}
          {activeTab === 'channels' && (
            <>
              {/* Filters */}
              <div className="flex items-center gap-4 flex-wrap">
                <div className="relative flex-1 min-w-[200px] max-w-md">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="Search channels..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">Type:</span>
                  <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
                  >
                    <option value="all">All Types</option>
                    {channelTypes.map((type) => (
                      <option key={type} value={type}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </option>
                    ))}
                  </select>
                </div>

                <Button variant="outline" size="sm" onClick={() => refetchChannels()}>
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

              {/* Channels Grid */}
              {!loading && !error && (
                <div className="space-y-4">
                  {filteredChannels.length === 0 ? (
                    <div className="text-center py-12">
                      <Bell className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                      <h3 className="text-lg font-semibold mb-2">No channels found</h3>
                      <p className="text-muted-foreground mb-4">
                        {searchQuery || filterType !== 'all'
                          ? 'Try adjusting your search or filters'
                          : 'Add your first notification channel to get started'}
                      </p>
                      {!searchQuery && filterType === 'all' && (
                        <Button onClick={() => setShowCreateModal(true)}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Channel
                        </Button>
                      )}
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      {filteredChannels.map((channel) => (
                        <ChannelCard
                          key={channel.id}
                          channel={mapToChannelType(channel)}
                          onEdit={(c) => {
                            const original = channels.find(ch => ch.id === c.id);
                            if (original) {
                              setEditingChannel(original);
                              setShowCreateModal(true);
                            }
                          }}
                          onDelete={handleDeleteChannel}
                          onTest={handleTestChannel}
                        />
                      ))}
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          {/* Logs Tab */}
          {activeTab === 'logs' && (
            <NotificationLogs
              logs={logs.map(mapToLogType)}
              isLoading={logsLoading}
              onRefresh={() => refetchLogs()}
              onRetry={handleRetryLog}
            />
          )}
        </div>
      </main>

      {/* Create/Edit Channel Modal */}
      <CreateChannelModal
        open={showCreateModal}
        onClose={() => {
          setShowCreateModal(false);
          setEditingChannel(null);
        }}
        onSave={handleSaveChannel}
        onTest={async (data) => {
          // Test is handled via the test mutation after channel creation
          return true;
        }}
        initialData={editingChannel ? {
          name: editingChannel.name,
          channel_type: editingChannel.channel_type,
          config: editingChannel.config as Record<string, unknown>,
          enabled: editingChannel.enabled,
          rate_limit_per_hour: editingChannel.rate_limit_per_hour,
          rules: [],
        } : undefined}
        isEditing={!!editingChannel}
      />
    </div>
  );
}
