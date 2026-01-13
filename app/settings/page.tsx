'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  Settings,
  Key,
  Bell,
  Globe,
  Shield,
  Cpu,
  Save,
  Eye,
  EyeOff,
  CheckCircle,
  Info,
  User,
  Building,
  Camera,
  Users,
  CreditCard,
  Crown,
  Trash2,
  UserPlus,
  Clock,
  Monitor,
  Loader2,
  Plus,
  Copy,
  RotateCw,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { VersionBadge } from '@/components/ui/version-badge';
import { APP_VERSION } from '@/lib/version';
import { useUserProfile } from '@/lib/hooks/use-user-profile';
import { useUserSettings } from '@/lib/hooks/use-user-settings';
import { useCurrentOrganization } from '@/lib/hooks/use-current-organization';
import { useApiKeys, useCreateApiKey, useRevokeApiKey } from '@/lib/hooks/use-api-keys';

interface SettingSection {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
}

const sections: SettingSection[] = [
  { id: 'profile', name: 'Profile', icon: User },
  { id: 'organization', name: 'Organization', icon: Building },
  { id: 'api', name: 'API Keys', icon: Key },
  { id: 'notifications', name: 'Notifications', icon: Bell },
  { id: 'defaults', name: 'Test Defaults', icon: Settings },
  { id: 'security', name: 'Security', icon: Shield },
  { id: 'about', name: 'About', icon: Info },
];

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

function LoadingSpinner() {
  return (
    <div className="flex items-center justify-center py-8">
      <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
    </div>
  );
}

function ErrorMessage({ message }: { message: string }) {
  return (
    <div className="flex items-center gap-2 p-4 rounded-lg bg-red-500/10 text-red-500">
      <AlertCircle className="h-5 w-5" />
      <span>{message}</span>
    </div>
  );
}

export default function SettingsPage() {
  const router = useRouter();
  const [activeSection, setActiveSection] = useState('profile');
  const [showNewKeySecret, setShowNewKeySecret] = useState<string | null>(null);
  const [newKeyName, setNewKeyName] = useState('');
  const [showCreateKey, setShowCreateKey] = useState(false);

  // Use real hooks for data
  const {
    profile,
    loading: profileLoading,
    error: profileError,
    updateProfile,
    isUpdating: profileUpdating,
    updateSuccess: profileSaved
  } = useUserProfile();

  const {
    settings,
    isLoading: settingsLoading,
    error: settingsErrorObj,
    updateNotificationPreferences,
    updateTestDefaults,
    isUpdating: isUpdatingSettings,
    notificationsMutation,
    testDefaultsMutation
  } = useUserSettings();

  const settingsError = settingsErrorObj?.message || null;
  const isUpdatingNotifications = notificationsMutation.isPending;
  const isUpdatingTestDefaults = testDefaultsMutation.isPending;
  const notificationsUpdateSuccess = notificationsMutation.isSuccess;
  const testDefaultsUpdateSuccess = testDefaultsMutation.isSuccess;

  const {
    organization,
    loading: orgLoading,
    error: orgError
  } = useCurrentOrganization();

  const {
    data: apiKeys,
    isLoading: keysLoading,
    error: keysError
  } = useApiKeys();

  const { mutateAsync: createApiKey, isPending: isCreatingKey } = useCreateApiKey();
  const { mutate: revokeApiKey, isPending: isRevokingKey } = useRevokeApiKey();

  // Local state for form edits (before saving)
  const [localProfile, setLocalProfile] = useState({
    display_name: '',
    email: '',
    bio: '',
    timezone: 'America/New_York',
    language: 'en',
  });

  const [localNotifications, setLocalNotifications] = useState({
    email_notifications: true,
    slack_notifications: false,
    in_app_notifications: true,
    test_failure_alerts: true,
    daily_digest: true,
    weekly_report: false,
    alert_threshold: 80,
  });

  const [localTestDefaults, setLocalTestDefaults] = useState({
    default_browser: 'chromium' as 'chromium' | 'firefox' | 'webkit',
    default_timeout: 30000,
    parallel_execution: true,
    retry_failed_tests: true,
    max_retries: 3,
    screenshot_on_failure: true,
    video_recording: false,
  });

  // Sync local state with fetched data
  useEffect(() => {
    if (profile) {
      setLocalProfile({
        display_name: profile.display_name || '',
        email: profile.email || '',
        bio: profile.bio || '',
        timezone: profile.timezone || 'America/New_York',
        language: profile.language || 'en',
      });
    }
  }, [profile]);

  useEffect(() => {
    if (settings?.notifications) {
      setLocalNotifications({
        email_notifications: settings.notifications.email_notifications ?? true,
        slack_notifications: settings.notifications.slack_notifications ?? false,
        in_app_notifications: settings.notifications.in_app_notifications ?? true,
        test_failure_alerts: settings.notifications.test_failure_alerts ?? true,
        daily_digest: settings.notifications.daily_digest ?? true,
        weekly_report: settings.notifications.weekly_report ?? false,
        alert_threshold: settings.notifications.alert_threshold ?? 80,
      });
    }
  }, [settings?.notifications]);

  useEffect(() => {
    if (settings?.test_defaults) {
      setLocalTestDefaults({
        default_browser: settings.test_defaults.default_browser || 'chromium',
        default_timeout: settings.test_defaults.default_timeout || 30000,
        parallel_execution: settings.test_defaults.parallel_execution ?? true,
        retry_failed_tests: settings.test_defaults.retry_failed_tests ?? true,
        max_retries: settings.test_defaults.max_retries || 3,
        screenshot_on_failure: settings.test_defaults.screenshot_on_failure ?? true,
        video_recording: settings.test_defaults.video_recording ?? false,
      });
    }
  }, [settings?.test_defaults]);

  const handleSaveProfile = async () => {
    await updateProfile({
      display_name: localProfile.display_name,
      bio: localProfile.bio,
      timezone: localProfile.timezone,
      language: localProfile.language,
    });
  };

  const handleSaveNotifications = async () => {
    await updateNotificationPreferences(localNotifications);
  };

  const handleSaveTestDefaults = async () => {
    await updateTestDefaults(localTestDefaults);
  };

  const handleCreateApiKey = async () => {
    if (!newKeyName.trim()) return;
    try {
      const result = await createApiKey({
        name: newKeyName,
        scopes: ['read', 'write'],
      });
      if (result?.key) {
        setShowNewKeySecret(result.key);
        setNewKeyName('');
        setShowCreateKey(false);
      }
    } catch (err) {
      console.error('Failed to create API key:', err);
    }
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
  };

  const getPlanBadgeColor = (plan: string) => {
    switch (plan?.toLowerCase()) {
      case 'enterprise': return 'bg-purple-500/10 text-purple-500';
      case 'pro': return 'bg-blue-500/10 text-blue-500';
      case 'team': return 'bg-green-500/10 text-green-500';
      default: return 'bg-gray-500/10 text-gray-500';
    }
  };

  const isSaving = profileUpdating || isUpdatingNotifications || isUpdatingTestDefaults;
  const showSavedMessage = profileSaved || notificationsUpdateSuccess || testDefaultsUpdateSuccess;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 lg:ml-64">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-6">
          <div className="flex-1">
            <h1 className="text-xl font-semibold">Settings</h1>
            <p className="text-sm text-muted-foreground">
              Configure your profile and preferences
            </p>
          </div>
          {activeSection === 'profile' && (
            <Button onClick={handleSaveProfile} disabled={isSaving}>
              {isSaving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : showSavedMessage ? (
                <>
                  <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                  Saved!
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Profile
                </>
              )}
            </Button>
          )}
          {activeSection === 'notifications' && (
            <Button onClick={handleSaveNotifications} disabled={isUpdatingNotifications}>
              {isUpdatingNotifications ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : notificationsUpdateSuccess ? (
                <>
                  <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                  Saved!
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Notifications
                </>
              )}
            </Button>
          )}
          {activeSection === 'defaults' && (
            <Button onClick={handleSaveTestDefaults} disabled={isUpdatingTestDefaults}>
              {isUpdatingTestDefaults ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : testDefaultsUpdateSuccess ? (
                <>
                  <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                  Saved!
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Defaults
                </>
              )}
            </Button>
          )}
        </header>

        <div className="p-6">
          <div className="flex gap-6">
            {/* Sidebar Navigation */}
            <div className="w-56 space-y-1">
              {sections.map((section) => (
                <button
                  key={section.id}
                  onClick={() => setActiveSection(section.id)}
                  className={cn(
                    'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors text-left',
                    activeSection === section.id
                      ? 'bg-primary text-primary-foreground'
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <section.icon className="h-4 w-4" />
                  {section.name}
                </button>
              ))}
            </div>

            {/* Settings Content */}
            <div className="flex-1 space-y-6">
              {/* Profile Section */}
              {activeSection === 'profile' && (
                <>
                  {profileLoading ? (
                    <LoadingSpinner />
                  ) : profileError ? (
                    <ErrorMessage message={profileError} />
                  ) : (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <User className="h-5 w-5" />
                          Profile Information
                        </CardTitle>
                        <CardDescription>
                          Manage your personal information and preferences
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {/* Avatar */}
                        <div className="flex items-center gap-6">
                          <div className="relative">
                            {profile?.avatar_url ? (
                              <img
                                src={profile.avatar_url}
                                alt="Avatar"
                                className="h-24 w-24 rounded-full object-cover"
                              />
                            ) : (
                              <div className="h-24 w-24 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                                {localProfile.display_name?.split(' ').map(n => n[0]).join('') || '?'}
                              </div>
                            )}
                            <button className="absolute bottom-0 right-0 p-2 rounded-full bg-background border shadow-sm hover:bg-muted transition-colors">
                              <Camera className="h-4 w-4" />
                            </button>
                          </div>
                          <div>
                            <h3 className="font-medium">{localProfile.display_name || 'Your Name'}</h3>
                            <p className="text-sm text-muted-foreground">{localProfile.email}</p>
                            <Button variant="outline" size="sm" className="mt-2">
                              Upload Photo
                            </Button>
                          </div>
                        </div>

                        {/* Name and Email */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium">Display Name</label>
                            <Input
                              value={localProfile.display_name}
                              onChange={(e) => setLocalProfile({ ...localProfile, display_name: e.target.value })}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium">Email Address</label>
                            <Input
                              type="email"
                              value={localProfile.email}
                              disabled
                              className="mt-1 bg-muted"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              Email is managed by your authentication provider
                            </p>
                          </div>
                        </div>

                        {/* Bio */}
                        <div>
                          <label className="text-sm font-medium">Bio</label>
                          <Textarea
                            value={localProfile.bio}
                            onChange={(e) => setLocalProfile({ ...localProfile, bio: e.target.value })}
                            placeholder="Tell us about yourself..."
                            className="mt-1"
                            rows={3}
                          />
                        </div>

                        {/* Timezone and Language */}
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium">Timezone</label>
                            <select
                              value={localProfile.timezone}
                              onChange={(e) => setLocalProfile({ ...localProfile, timezone: e.target.value })}
                              className="mt-1 w-full px-3 py-2 rounded-md border bg-background"
                            >
                              <option value="America/New_York">Eastern Time (ET)</option>
                              <option value="America/Chicago">Central Time (CT)</option>
                              <option value="America/Denver">Mountain Time (MT)</option>
                              <option value="America/Los_Angeles">Pacific Time (PT)</option>
                              <option value="Europe/London">London (GMT)</option>
                              <option value="Europe/Paris">Paris (CET)</option>
                              <option value="Asia/Tokyo">Tokyo (JST)</option>
                              <option value="Asia/Singapore">Singapore (SGT)</option>
                              <option value="Asia/Kolkata">India (IST)</option>
                            </select>
                          </div>
                          <div>
                            <label className="text-sm font-medium">Language</label>
                            <select
                              value={localProfile.language}
                              onChange={(e) => setLocalProfile({ ...localProfile, language: e.target.value })}
                              className="mt-1 w-full px-3 py-2 rounded-md border bg-background"
                            >
                              <option value="en">English</option>
                              <option value="es">Spanish</option>
                              <option value="fr">French</option>
                              <option value="de">German</option>
                              <option value="ja">Japanese</option>
                              <option value="zh">Chinese</option>
                            </select>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}

              {/* Organization Section */}
              {activeSection === 'organization' && (
                <>
                  {orgLoading ? (
                    <LoadingSpinner />
                  ) : orgError ? (
                    <ErrorMessage message={orgError} />
                  ) : organization ? (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Building className="h-5 w-5" />
                          Organization Details
                        </CardTitle>
                        <CardDescription>
                          View and manage your organization
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {/* Org Info */}
                        <div className="flex items-center gap-4">
                          <div className="h-16 w-16 rounded-lg bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white text-xl font-bold">
                            {organization.name?.substring(0, 2).toUpperCase() || 'ORG'}
                          </div>
                          <div>
                            <h3 className="text-lg font-semibold">{organization.name}</h3>
                            <p className="text-sm text-muted-foreground">/{organization.slug}</p>
                            <span className={cn('mt-1 inline-block px-2 py-0.5 rounded-full text-xs font-medium', getPlanBadgeColor(organization.plan))}>
                              {organization.plan?.toUpperCase() || 'FREE'}
                            </span>
                          </div>
                        </div>

                        {/* Plan Info */}
                        <div className="p-4 rounded-lg border bg-gradient-to-r from-primary/5 to-purple-500/5">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <div className="p-2 rounded-lg bg-primary/10">
                                <Crown className="h-5 w-5 text-primary" />
                              </div>
                              <div>
                                <div className="font-medium">{organization.plan?.toUpperCase() || 'Free'} Plan</div>
                                <div className="text-sm text-muted-foreground">
                                  Organization: {organization.slug}
                                </div>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              onClick={() => router.push(`/organizations/${organization.id}/settings`)}
                            >
                              <Settings className="h-4 w-4 mr-2" />
                              Manage Organization
                            </Button>
                          </div>
                        </div>

                        {/* Quick Actions */}
                        <div className="grid grid-cols-2 gap-4">
                          <Button
                            variant="outline"
                            className="justify-start"
                            onClick={() => router.push(`/organizations/${organization.id}/settings`)}
                          >
                            <Users className="h-4 w-4 mr-2" />
                            Manage Team Members
                          </Button>
                          <Button
                            variant="outline"
                            className="justify-start"
                            onClick={() => router.push(`/organizations/${organization.id}/settings`)}
                          >
                            <CreditCard className="h-4 w-4 mr-2" />
                            Billing & Usage
                          </Button>
                        </div>

                        <div className="pt-4 border-t">
                          <Button
                            variant="link"
                            className="p-0 text-primary"
                            onClick={() => router.push('/organizations')}
                          >
                            <ExternalLink className="h-4 w-4 mr-2" />
                            View All Organizations
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ) : (
                    <Card>
                      <CardContent className="py-8 text-center">
                        <Building className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                        <h3 className="font-medium mb-2">No Organization Selected</h3>
                        <p className="text-sm text-muted-foreground mb-4">
                          Create or join an organization to get started
                        </p>
                        <Button onClick={() => router.push('/organizations/new')}>
                          <Plus className="h-4 w-4 mr-2" />
                          Create Organization
                        </Button>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}

              {/* API Keys Section */}
              {activeSection === 'api' && (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Key className="h-5 w-5" />
                        API Keys
                      </CardTitle>
                      <CardDescription>
                        Manage API keys for programmatic access to Argus
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      {/* New Key Created Alert */}
                      {showNewKeySecret && (
                        <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
                          <div className="flex items-center gap-2 mb-2">
                            <CheckCircle className="h-5 w-5 text-green-500" />
                            <span className="font-medium text-green-500">API Key Created!</span>
                          </div>
                          <p className="text-sm text-muted-foreground mb-2">
                            Copy this key now. You won&apos;t be able to see it again.
                          </p>
                          <div className="flex gap-2">
                            <code className="flex-1 p-2 bg-muted rounded text-sm font-mono break-all">
                              {showNewKeySecret}
                            </code>
                            <Button size="sm" variant="outline" onClick={() => handleCopyKey(showNewKeySecret)}>
                              <Copy className="h-4 w-4" />
                            </Button>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            className="mt-2"
                            onClick={() => setShowNewKeySecret(null)}
                          >
                            Dismiss
                          </Button>
                        </div>
                      )}

                      {/* Create New Key */}
                      {showCreateKey ? (
                        <div className="p-4 rounded-lg border">
                          <h4 className="font-medium mb-3">Create New API Key</h4>
                          <div className="flex gap-2">
                            <Input
                              value={newKeyName}
                              onChange={(e) => setNewKeyName(e.target.value)}
                              placeholder="Key name (e.g., CI/CD Pipeline)"
                              className="flex-1"
                            />
                            <Button onClick={handleCreateApiKey} disabled={isCreatingKey || !newKeyName.trim()}>
                              {isCreatingKey ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                              ) : (
                                'Create'
                              )}
                            </Button>
                            <Button variant="outline" onClick={() => setShowCreateKey(false)}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <Button onClick={() => setShowCreateKey(true)}>
                          <Plus className="h-4 w-4 mr-2" />
                          Create New API Key
                        </Button>
                      )}

                      {/* Existing Keys */}
                      {keysLoading ? (
                        <LoadingSpinner />
                      ) : keysError ? (
                        <ErrorMessage message="Failed to load API keys" />
                      ) : apiKeys && apiKeys.length > 0 ? (
                        <div className="space-y-3">
                          {apiKeys.map((key) => (
                            <div key={key.id} className="flex items-center justify-between p-3 rounded-lg border">
                              <div>
                                <div className="font-medium">{key.name}</div>
                                <div className="text-sm text-muted-foreground">
                                  {key.key_prefix}••••••• · Created {new Date(key.created_at).toLocaleDateString()}
                                </div>
                                {key.last_used_at && (
                                  <div className="text-xs text-muted-foreground">
                                    Last used: {new Date(key.last_used_at).toLocaleDateString()}
                                  </div>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                <span className={cn(
                                  'px-2 py-0.5 rounded-full text-xs',
                                  key.is_active ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                                )}>
                                  {key.is_active ? 'Active' : 'Revoked'}
                                </span>
                                {key.is_active && (
                                  <Button
                                    variant="ghost"
                                    size="sm"
                                    className="text-red-500 hover:text-red-600"
                                    onClick={() => revokeApiKey(key.id)}
                                    disabled={isRevokingKey}
                                  >
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-center py-8 text-muted-foreground">
                          <Key className="h-10 w-10 mx-auto mb-3 opacity-50" />
                          <p>No API keys created yet</p>
                          <p className="text-sm">Create an API key to access Argus programmatically</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}

              {/* Notifications */}
              {activeSection === 'notifications' && (
                <>
                  {settingsLoading ? (
                    <LoadingSpinner />
                  ) : settingsError ? (
                    <ErrorMessage message={settingsError} />
                  ) : (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Bell className="h-5 w-5" />
                          Notification Settings
                        </CardTitle>
                        <CardDescription>
                          Configure how you receive test results and alerts
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {/* Notification Channels */}
                        <div className="space-y-4">
                          <h4 className="font-medium">Notification Channels</h4>

                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">Email Notifications</div>
                              <div className="text-sm text-muted-foreground">
                                Receive notifications via email
                              </div>
                            </div>
                            <Toggle
                              checked={localNotifications.email_notifications}
                              onChange={(v) => setLocalNotifications({ ...localNotifications, email_notifications: v })}
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">Slack Notifications</div>
                              <div className="text-sm text-muted-foreground">
                                Receive notifications in Slack
                              </div>
                            </div>
                            <Toggle
                              checked={localNotifications.slack_notifications}
                              onChange={(v) => setLocalNotifications({ ...localNotifications, slack_notifications: v })}
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">In-App Notifications</div>
                              <div className="text-sm text-muted-foreground">
                                Show notifications in the dashboard
                              </div>
                            </div>
                            <Toggle
                              checked={localNotifications.in_app_notifications}
                              onChange={(v) => setLocalNotifications({ ...localNotifications, in_app_notifications: v })}
                            />
                          </div>
                        </div>

                        {/* Notification Events */}
                        <div className="pt-4 border-t space-y-4">
                          <h4 className="font-medium">Notification Events</h4>

                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">Test Failure Alerts</div>
                              <div className="text-sm text-muted-foreground">Notify immediately when tests fail</div>
                            </div>
                            <Toggle
                              checked={localNotifications.test_failure_alerts}
                              onChange={(v) => setLocalNotifications({ ...localNotifications, test_failure_alerts: v })}
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">Daily Digest</div>
                              <div className="text-sm text-muted-foreground">Receive daily test summary</div>
                            </div>
                            <Toggle
                              checked={localNotifications.daily_digest}
                              onChange={(v) => setLocalNotifications({ ...localNotifications, daily_digest: v })}
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">Weekly Report</div>
                              <div className="text-sm text-muted-foreground">Receive weekly analytics report</div>
                            </div>
                            <Toggle
                              checked={localNotifications.weekly_report}
                              onChange={(v) => setLocalNotifications({ ...localNotifications, weekly_report: v })}
                            />
                          </div>
                        </div>

                        {/* Alert Threshold */}
                        <div className="pt-4 border-t">
                          <label className="text-sm font-medium">Alert Threshold (%)</label>
                          <p className="text-sm text-muted-foreground mb-2">
                            Notify when pass rate drops below this percentage
                          </p>
                          <Input
                            type="number"
                            value={localNotifications.alert_threshold}
                            onChange={(e) => setLocalNotifications({ ...localNotifications, alert_threshold: parseInt(e.target.value) || 80 })}
                            min="0"
                            max="100"
                            className="w-24"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}

              {/* Test Defaults */}
              {activeSection === 'defaults' && (
                <>
                  {settingsLoading ? (
                    <LoadingSpinner />
                  ) : settingsError ? (
                    <ErrorMessage message={settingsError} />
                  ) : (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Settings className="h-5 w-5" />
                          Default Test Settings
                        </CardTitle>
                        <CardDescription>
                          Configure default values for test execution
                        </CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="text-sm font-medium flex items-center gap-2">
                              <Clock className="h-4 w-4" />
                              Default Timeout (ms)
                            </label>
                            <Input
                              type="number"
                              value={localTestDefaults.default_timeout}
                              onChange={(e) => setLocalTestDefaults({ ...localTestDefaults, default_timeout: parseInt(e.target.value) || 30000 })}
                              className="mt-1"
                            />
                          </div>
                          <div>
                            <label className="text-sm font-medium">Default Browser</label>
                            <select
                              value={localTestDefaults.default_browser}
                              onChange={(e) => setLocalTestDefaults({ ...localTestDefaults, default_browser: e.target.value as 'chromium' | 'firefox' | 'webkit' })}
                              className="mt-1 w-full px-3 py-2 rounded-md border bg-background"
                            >
                              <option value="chromium">Chromium</option>
                              <option value="firefox">Firefox</option>
                              <option value="webkit">WebKit (Safari)</option>
                            </select>
                          </div>
                        </div>

                        <div className="pt-4 border-t space-y-4">
                          <h4 className="font-medium">Execution Options</h4>

                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">Parallel Execution</div>
                              <div className="text-sm text-muted-foreground">
                                Run tests in parallel for faster results
                              </div>
                            </div>
                            <Toggle
                              checked={localTestDefaults.parallel_execution}
                              onChange={(v) => setLocalTestDefaults({ ...localTestDefaults, parallel_execution: v })}
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">Retry Failed Tests</div>
                              <div className="text-sm text-muted-foreground">
                                Automatically retry flaky tests
                              </div>
                            </div>
                            <Toggle
                              checked={localTestDefaults.retry_failed_tests}
                              onChange={(v) => setLocalTestDefaults({ ...localTestDefaults, retry_failed_tests: v })}
                            />
                          </div>

                          {localTestDefaults.retry_failed_tests && (
                            <div>
                              <label className="text-sm font-medium">Max Retries</label>
                              <Input
                                type="number"
                                value={localTestDefaults.max_retries}
                                onChange={(e) => setLocalTestDefaults({ ...localTestDefaults, max_retries: parseInt(e.target.value) || 3 })}
                                min="1"
                                max="5"
                                className="mt-1 w-24"
                              />
                            </div>
                          )}

                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">Screenshot on Failure</div>
                              <div className="text-sm text-muted-foreground">
                                Capture screenshots when tests fail
                              </div>
                            </div>
                            <Toggle
                              checked={localTestDefaults.screenshot_on_failure}
                              onChange={(v) => setLocalTestDefaults({ ...localTestDefaults, screenshot_on_failure: v })}
                            />
                          </div>

                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">Video Recording</div>
                              <div className="text-sm text-muted-foreground">
                                Record video of test execution
                              </div>
                            </div>
                            <Toggle
                              checked={localTestDefaults.video_recording}
                              onChange={(v) => setLocalTestDefaults({ ...localTestDefaults, video_recording: v })}
                            />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}

              {/* Security */}
              {activeSection === 'security' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Shield className="h-5 w-5" />
                      Security Settings
                    </CardTitle>
                    <CardDescription>
                      Security is managed by Clerk authentication
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="p-4 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3 mb-3">
                        <Shield className="h-8 w-8 text-primary" />
                        <div>
                          <h4 className="font-medium">Clerk Authentication</h4>
                          <p className="text-sm text-muted-foreground">
                            Your account is secured by Clerk
                          </p>
                        </div>
                      </div>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span>Multi-factor authentication available</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span>Social login (Google, GitHub)</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <CheckCircle className="h-4 w-4 text-green-500" />
                          <span>Session management</span>
                        </div>
                      </div>
                    </div>

                    <Button variant="outline" onClick={() => window.open('https://accounts.heyargus.ai/user', '_blank')}>
                      <ExternalLink className="h-4 w-4 mr-2" />
                      Manage Security in Clerk
                    </Button>
                  </CardContent>
                </Card>
              )}

              {/* About */}
              {activeSection === 'about' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Info className="h-5 w-5" />
                      About Argus
                    </CardTitle>
                    <CardDescription>
                      Application information and version details
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
                      <div>
                        <div className="text-2xl font-bold">Argus</div>
                        <div className="text-sm text-muted-foreground">
                          AI-powered E2E Testing Platform
                        </div>
                      </div>
                      <VersionBadge variant="full" />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-4 rounded-lg border">
                        <div className="text-sm text-muted-foreground">Version</div>
                        <div className="text-lg font-mono font-medium">{APP_VERSION}</div>
                      </div>
                      <div className="p-4 rounded-lg border">
                        <div className="text-sm text-muted-foreground">Environment</div>
                        <div className="text-lg font-medium capitalize">
                          {process.env.NODE_ENV || 'development'}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h4 className="font-medium">Tech Stack</h4>
                      <div className="flex flex-wrap gap-2">
                        {['Next.js 15', 'React 19', 'TypeScript', 'Tailwind CSS', 'Supabase', 'Clerk Auth', 'Claude AI'].map((tech) => (
                          <span
                            key={tech}
                            className="px-3 py-1 text-xs rounded-full bg-primary/10 text-primary font-medium"
                          >
                            {tech}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="pt-4 border-t">
                      <h4 className="font-medium mb-3">Links</h4>
                      <div className="space-y-2">
                        <a
                          href="https://docs.heyargus.ai"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-sm text-primary hover:underline"
                        >
                          Documentation
                        </a>
                        <a
                          href="https://github.com/heyargus/argus"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-sm text-primary hover:underline"
                        >
                          GitHub Repository
                        </a>
                        <a
                          href="https://heyargus.ai"
                          target="_blank"
                          rel="noopener noreferrer"
                          className="block text-sm text-primary hover:underline"
                        >
                          Website
                        </a>
                      </div>
                    </div>

                    <div className="pt-4 border-t text-center text-sm text-muted-foreground">
                      <p>2024-{new Date().getFullYear()} Argus. All rights reserved.</p>
                      <p className="mt-1">Built with care for better testing</p>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
