'use client';

import { useState, useEffect, useCallback } from 'react';
import { useUser } from '@clerk/nextjs';
import { Sidebar } from '@/components/layout/sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import {
  User,
  Camera,
  Mail,
  Globe,
  Languages,
  Palette,
  Bell,
  MessageSquare,
  Inbox,
  Building,
  FolderKanban,
  Save,
  CheckCircle,
  Loader2,
  Upload,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthApi } from '@/lib/hooks/use-auth-api';
import { useProjects } from '@/lib/hooks/use-projects';

interface SettingSection {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
}

const sections: SettingSection[] = [
  { id: 'avatar', name: 'Avatar & Name', icon: User },
  { id: 'account', name: 'Account', icon: Mail },
  { id: 'preferences', name: 'Preferences', icon: Palette },
  { id: 'notifications', name: 'Notifications', icon: Bell },
  { id: 'defaults', name: 'Defaults', icon: Building },
];

function Toggle({ checked, onChange, disabled = false }: { checked: boolean; onChange: (v: boolean) => void; disabled?: boolean }) {
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

interface UserProfile {
  id: string;
  display_name: string;
  email: string;
  avatar_url: string | null;
  bio: string | null;
  timezone: string;
  language: string;
  theme: string;
  email_notifications: boolean;
  slack_notifications: boolean;
  in_app_notifications: boolean;
  default_organization_id: string | null;
  default_project_id: string | null;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
}

export default function ProfilePage() {
  const { user, isLoaded: isUserLoaded } = useUser();
  const { fetchJson, isLoaded, isSignedIn } = useAuthApi();
  const { data: projects = [] } = useProjects();

  const [activeSection, setActiveSection] = useState('avatar');
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [organizations, setOrganizations] = useState<Organization[]>([]);

  // Profile state
  const [profile, setProfile] = useState<UserProfile>({
    id: '',
    display_name: '',
    email: '',
    avatar_url: null,
    bio: null,
    timezone: 'America/New_York',
    language: 'en',
    theme: 'dark',
    email_notifications: true,
    slack_notifications: false,
    in_app_notifications: true,
    default_organization_id: null,
    default_project_id: null,
  });

  // Fetch user profile
  const fetchProfile = useCallback(async () => {
    if (!isLoaded || !isSignedIn) return;

    try {
      setLoading(true);
      setError(null);

      const response = await fetchJson<UserProfile>('/api/v1/users/me');

      if (response.error) {
        // If user not found, use Clerk data as defaults
        if (response.status === 404 && user) {
          setProfile({
            id: user.id,
            display_name: user.fullName || user.firstName || 'User',
            email: user.primaryEmailAddress?.emailAddress || '',
            avatar_url: user.imageUrl || null,
            bio: null,
            timezone: 'America/New_York',
            language: 'en',
            theme: 'dark',
            email_notifications: true,
            slack_notifications: false,
            in_app_notifications: true,
            default_organization_id: null,
            default_project_id: null,
          });
        } else {
          setError(response.error);
        }
      } else if (response.data) {
        setProfile(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch profile:', err);
      // Use Clerk data as fallback
      if (user) {
        setProfile({
          id: user.id,
          display_name: user.fullName || user.firstName || 'User',
          email: user.primaryEmailAddress?.emailAddress || '',
          avatar_url: user.imageUrl || null,
          bio: null,
          timezone: 'America/New_York',
          language: 'en',
          theme: 'dark',
          email_notifications: true,
          slack_notifications: false,
          in_app_notifications: true,
          default_organization_id: null,
          default_project_id: null,
        });
      }
    } finally {
      setLoading(false);
    }
  }, [isLoaded, isSignedIn, fetchJson, user]);

  // Fetch organizations
  const fetchOrganizations = useCallback(async () => {
    if (!isLoaded || !isSignedIn) return;

    try {
      const response = await fetchJson<{ organizations: Organization[] }>('/api/v1/teams/organizations');
      if (response.data?.organizations) {
        setOrganizations(response.data.organizations);
      }
    } catch (err) {
      console.error('Failed to fetch organizations:', err);
    }
  }, [isLoaded, isSignedIn, fetchJson]);

  useEffect(() => {
    if (isUserLoaded && user) {
      // Initialize with Clerk data while loading
      setProfile(prev => ({
        ...prev,
        display_name: user.fullName || user.firstName || prev.display_name,
        email: user.primaryEmailAddress?.emailAddress || prev.email,
        avatar_url: user.imageUrl || prev.avatar_url,
      }));
    }
  }, [isUserLoaded, user]);

  useEffect(() => {
    fetchProfile();
    fetchOrganizations();
  }, [fetchProfile, fetchOrganizations]);

  const handleSave = async () => {
    if (!isLoaded || !isSignedIn) return;

    try {
      setSaving(true);
      setError(null);

      // Save main profile
      const profileResponse = await fetchJson<UserProfile>('/api/v1/users/me', {
        method: 'PUT',
        body: JSON.stringify({
          display_name: profile.display_name,
          bio: profile.bio,
          avatar_url: profile.avatar_url,
        }),
      });

      if (profileResponse.error) {
        setError(profileResponse.error);
        return;
      }

      // Save preferences
      const preferencesResponse = await fetchJson<UserProfile>('/api/v1/users/me/preferences', {
        method: 'PUT',
        body: JSON.stringify({
          timezone: profile.timezone,
          language: profile.language,
          theme: profile.theme,
          email_notifications: profile.email_notifications,
          slack_notifications: profile.slack_notifications,
          in_app_notifications: profile.in_app_notifications,
          default_organization_id: profile.default_organization_id,
          default_project_id: profile.default_project_id,
        }),
      });

      if (preferencesResponse.error) {
        setError(preferencesResponse.error);
        return;
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      console.error('Failed to save profile:', err);
      setError('Failed to save profile. Please try again.');
    } finally {
      setSaving(false);
    }
  };

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  if (!isUserLoaded || loading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 lg:ml-64 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
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
          <div className="flex-1">
            <h1 className="text-xl font-semibold">Profile</h1>
            <p className="text-sm text-muted-foreground">
              Manage your personal information and preferences
            </p>
          </div>
          <Button onClick={handleSave} disabled={saving}>
            {saving ? (
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

        <div className="p-6">
          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500">
              {error}
            </div>
          )}

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

            {/* Content */}
            <div className="flex-1 space-y-6">
              {/* Avatar & Name Section */}
              {activeSection === 'avatar' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <User className="h-5 w-5" />
                      Avatar & Name
                    </CardTitle>
                    <CardDescription>
                      Upload a photo and set your display name
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Avatar */}
                    <div className="flex items-center gap-6">
                      <div className="relative">
                        {profile.avatar_url ? (
                          <img
                            src={profile.avatar_url}
                            alt={profile.display_name}
                            className="h-24 w-24 rounded-full object-cover border-2 border-border"
                          />
                        ) : (
                          <div className="h-24 w-24 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                            {getInitials(profile.display_name)}
                          </div>
                        )}
                        <button className="absolute bottom-0 right-0 p-2 rounded-full bg-background border shadow-sm hover:bg-muted transition-colors">
                          <Camera className="h-4 w-4" />
                        </button>
                      </div>
                      <div>
                        <h3 className="font-medium">{profile.display_name}</h3>
                        <p className="text-sm text-muted-foreground">{profile.email}</p>
                        <Button variant="outline" size="sm" className="mt-2">
                          <Upload className="h-4 w-4 mr-2" />
                          Upload Photo
                        </Button>
                      </div>
                    </div>

                    {/* Display Name */}
                    <div>
                      <label className="text-sm font-medium">Display Name</label>
                      <Input
                        value={profile.display_name}
                        onChange={(e) => setProfile({ ...profile, display_name: e.target.value })}
                        placeholder="Your name"
                        className="mt-1"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        This is how your name will appear across the platform
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Account Section */}
              {activeSection === 'account' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="h-5 w-5" />
                      Account Information
                    </CardTitle>
                    <CardDescription>
                      Your email and bio information
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Email (read-only) */}
                    <div>
                      <label className="text-sm font-medium">Email Address</label>
                      <Input
                        type="email"
                        value={profile.email}
                        disabled
                        className="mt-1 bg-muted"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Your email is managed through Clerk authentication and cannot be changed here
                      </p>
                    </div>

                    {/* Bio */}
                    <div>
                      <label className="text-sm font-medium">Bio</label>
                      <Textarea
                        value={profile.bio || ''}
                        onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
                        placeholder="Tell us about yourself..."
                        className="mt-1"
                        rows={4}
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        A brief description about yourself (optional)
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Preferences Section */}
              {activeSection === 'preferences' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Palette className="h-5 w-5" />
                      Preferences
                    </CardTitle>
                    <CardDescription>
                      Customize your experience with timezone, language, and theme settings
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Timezone */}
                    <div>
                      <label className="text-sm font-medium flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        Timezone
                      </label>
                      <select
                        value={profile.timezone}
                        onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
                        className="mt-1 w-full px-3 py-2 rounded-md border bg-background"
                      >
                        <option value="America/New_York">Eastern Time (ET)</option>
                        <option value="America/Chicago">Central Time (CT)</option>
                        <option value="America/Denver">Mountain Time (MT)</option>
                        <option value="America/Los_Angeles">Pacific Time (PT)</option>
                        <option value="America/Anchorage">Alaska Time (AKT)</option>
                        <option value="Pacific/Honolulu">Hawaii Time (HT)</option>
                        <option value="Europe/London">London (GMT)</option>
                        <option value="Europe/Paris">Paris (CET)</option>
                        <option value="Europe/Berlin">Berlin (CET)</option>
                        <option value="Asia/Tokyo">Tokyo (JST)</option>
                        <option value="Asia/Singapore">Singapore (SGT)</option>
                        <option value="Asia/Shanghai">Shanghai (CST)</option>
                        <option value="Asia/Kolkata">India (IST)</option>
                        <option value="Australia/Sydney">Sydney (AEST)</option>
                        <option value="UTC">UTC</option>
                      </select>
                      <p className="text-xs text-muted-foreground mt-1">
                        All times will be displayed in this timezone
                      </p>
                    </div>

                    {/* Language */}
                    <div>
                      <label className="text-sm font-medium flex items-center gap-2">
                        <Languages className="h-4 w-4" />
                        Language
                      </label>
                      <select
                        value={profile.language}
                        onChange={(e) => setProfile({ ...profile, language: e.target.value })}
                        className="mt-1 w-full px-3 py-2 rounded-md border bg-background"
                      >
                        <option value="en">English</option>
                        <option value="es">Spanish (Espanol)</option>
                        <option value="fr">French (Francais)</option>
                        <option value="de">German (Deutsch)</option>
                        <option value="ja">Japanese</option>
                        <option value="zh">Chinese (Simplified)</option>
                        <option value="pt">Portuguese</option>
                        <option value="ko">Korean</option>
                      </select>
                    </div>

                    {/* Theme */}
                    <div>
                      <label className="text-sm font-medium flex items-center gap-2">
                        <Palette className="h-4 w-4" />
                        Theme
                      </label>
                      <select
                        value={profile.theme}
                        onChange={(e) => setProfile({ ...profile, theme: e.target.value })}
                        className="mt-1 w-full px-3 py-2 rounded-md border bg-background"
                      >
                        <option value="dark">Dark</option>
                        <option value="light">Light</option>
                        <option value="system">System</option>
                      </select>
                      <p className="text-xs text-muted-foreground mt-1">
                        Choose your preferred color scheme
                      </p>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Notifications Section */}
              {activeSection === 'notifications' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Bell className="h-5 w-5" />
                      Notification Preferences
                    </CardTitle>
                    <CardDescription>
                      Choose how you want to receive notifications
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Email Notifications */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Mail className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium">Email Notifications</div>
                          <div className="text-sm text-muted-foreground">
                            Receive test results and alerts via email
                          </div>
                        </div>
                      </div>
                      <Toggle
                        checked={profile.email_notifications}
                        onChange={(v) => setProfile({ ...profile, email_notifications: v })}
                      />
                    </div>

                    {/* Slack Notifications */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <MessageSquare className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium">Slack Notifications</div>
                          <div className="text-sm text-muted-foreground">
                            Get notified in Slack channels
                          </div>
                        </div>
                      </div>
                      <Toggle
                        checked={profile.slack_notifications}
                        onChange={(v) => setProfile({ ...profile, slack_notifications: v })}
                      />
                    </div>

                    {/* In-App Notifications */}
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-primary/10">
                          <Inbox className="h-5 w-5 text-primary" />
                        </div>
                        <div>
                          <div className="font-medium">In-App Notifications</div>
                          <div className="text-sm text-muted-foreground">
                            Show notifications within the Argus dashboard
                          </div>
                        </div>
                      </div>
                      <Toggle
                        checked={profile.in_app_notifications}
                        onChange={(v) => setProfile({ ...profile, in_app_notifications: v })}
                      />
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Defaults Section */}
              {activeSection === 'defaults' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building className="h-5 w-5" />
                      Default Settings
                    </CardTitle>
                    <CardDescription>
                      Set your default organization and project
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Default Organization */}
                    <div>
                      <label className="text-sm font-medium flex items-center gap-2">
                        <Building className="h-4 w-4" />
                        Default Organization
                      </label>
                      <select
                        value={profile.default_organization_id || ''}
                        onChange={(e) => setProfile({ ...profile, default_organization_id: e.target.value || null })}
                        className="mt-1 w-full px-3 py-2 rounded-md border bg-background"
                      >
                        <option value="">Select an organization...</option>
                        {organizations.map((org) => (
                          <option key={org.id} value={org.id}>
                            {org.name}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-muted-foreground mt-1">
                        This organization will be selected by default when you log in
                      </p>
                    </div>

                    {/* Default Project */}
                    <div>
                      <label className="text-sm font-medium flex items-center gap-2">
                        <FolderKanban className="h-4 w-4" />
                        Default Project
                      </label>
                      <select
                        value={profile.default_project_id || ''}
                        onChange={(e) => setProfile({ ...profile, default_project_id: e.target.value || null })}
                        className="mt-1 w-full px-3 py-2 rounded-md border bg-background"
                      >
                        <option value="">Select a project...</option>
                        {projects.map((project) => (
                          <option key={project.id} value={project.id}>
                            {project.name}
                          </option>
                        ))}
                      </select>
                      <p className="text-xs text-muted-foreground mt-1">
                        This project will be selected by default when running tests
                      </p>
                    </div>

                    {projects.length === 0 && (
                      <div className="text-center py-4 text-muted-foreground">
                        <FolderKanban className="h-8 w-8 mx-auto mb-2 opacity-50" />
                        <p className="text-sm">No projects found</p>
                        <p className="text-xs">Create a project to set it as your default</p>
                      </div>
                    )}
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
