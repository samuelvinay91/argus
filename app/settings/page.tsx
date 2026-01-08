'use client';

import { useState, useEffect, useCallback } from 'react';
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
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { VersionBadge } from '@/components/ui/version-badge';
import { APP_VERSION } from '@/lib/version';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
const DEFAULT_ORG_ID = 'default';

interface SettingSection {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
}

const sections: SettingSection[] = [
  { id: 'profile', name: 'Profile', icon: User },
  { id: 'organization', name: 'Organization', icon: Building },
  { id: 'api', name: 'API Configuration', icon: Key },
  { id: 'notifications', name: 'Notifications', icon: Bell },
  { id: 'defaults', name: 'Defaults', icon: Settings },
  { id: 'security', name: 'Security', icon: Shield },
  { id: 'about', name: 'About', icon: Info },
];

interface TeamMember {
  id: string;
  email: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  status: 'active' | 'pending';
  invited_at?: string;
  accepted_at?: string;
}

interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: string;
  member_count: number;
}

function Toggle({ checked, onChange }: { checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => onChange(!checked)}
      className={cn(
        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
        checked ? 'bg-primary' : 'bg-muted'
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

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState('profile');
  const [showApiKey, setShowApiKey] = useState(false);
  const [saved, setSaved] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [teamLoading, setTeamLoading] = useState(true);
  const [orgData, setOrgData] = useState<Organization | null>(null);

  // Profile state
  const [profile, setProfile] = useState({
    name: 'John Doe',
    email: 'john.doe@example.com',
    avatarUrl: '',
    bio: 'QA Engineer passionate about automated testing',
    timezone: 'America/New_York',
    language: 'en',
  });

  // Organization state
  const [organization, setOrganization] = useState({
    name: 'Acme Corporation',
    slug: 'acme-corp',
    plan: 'pro',
    billing_email: 'billing@heyargus.com',
    membersCount: 0,
    maxMembers: 25,
  });

  // Fetch organization data from API
  const fetchOrganization = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/v1/teams/organizations/${DEFAULT_ORG_ID}`);
      if (response.ok) {
        const data = await response.json();
        setOrgData(data);
        setOrganization(prev => ({
          ...prev,
          name: data.name || prev.name,
          slug: data.slug || prev.slug,
          plan: data.plan || prev.plan,
          membersCount: data.member_count || 0,
        }));
      }
    } catch (err) {
      console.error('Failed to fetch organization:', err);
    }
  }, []);

  // Fetch team members from API
  const fetchMembers = useCallback(async () => {
    try {
      setTeamLoading(true);
      const response = await fetch(`${BACKEND_URL}/api/v1/teams/organizations/${DEFAULT_ORG_ID}/members`);
      if (response.ok) {
        const data = await response.json();
        setTeamMembers(data.members || []);
        setOrganization(prev => ({
          ...prev,
          membersCount: (data.members || []).length,
        }));
      }
    } catch (err) {
      console.error('Failed to fetch members:', err);
    } finally {
      setTeamLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchOrganization();
    fetchMembers();
  }, [fetchOrganization, fetchMembers]);

  // Settings state
  const [settings, setSettings] = useState({
    anthropicApiKey: '',
    backendUrl: process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000',
    defaultModel: 'claude-sonnet-4-5',
    maxIterations: 50,
    screenshotResolution: '1920x1080',
    costLimit: 10.0,
    slackEnabled: true,
    emailEnabled: false,
    slackWebhook: '',
    emailRecipients: '',
    slackChannel: '#testing-alerts',
    notifyOnSuccess: true,
    notifyOnFailure: true,
    notifyOnHealing: false,
    dailyDigest: true,
    autoRetry: true,
    retryCount: 3,
    parallelTests: 4,
    headlessMode: true,
    saveScreenshots: true,
    twoFactorEnabled: false,
    sessionTimeout: 30,
    defaultTimeout: 30000,
    defaultViewport: '1920x1080',
    defaultBaseUrl: 'http://localhost:3000',
    defaultBrowser: 'chromium',
  });

  const handleSave = () => {
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const getRoleBadgeColor = (role: string) => {
    switch (role) {
      case 'owner': return 'bg-purple-500/10 text-purple-500';
      case 'admin': return 'bg-blue-500/10 text-blue-500';
      case 'member': return 'bg-green-500/10 text-green-500';
      case 'viewer': return 'bg-gray-500/10 text-gray-500';
      default: return 'bg-gray-500/10 text-gray-500';
    }
  };

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 lg:ml-64">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-6">
          <div className="flex-1">
            <h1 className="text-xl font-semibold">Settings</h1>
            <p className="text-sm text-muted-foreground">
              Configure Argus - your AI testing companion
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
                          <div className="h-24 w-24 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                            {profile.name.split(' ').map(n => n[0]).join('')}
                          </div>
                          <button className="absolute bottom-0 right-0 p-2 rounded-full bg-background border shadow-sm hover:bg-muted transition-colors">
                            <Camera className="h-4 w-4" />
                          </button>
                        </div>
                        <div>
                          <h3 className="font-medium">{profile.name}</h3>
                          <p className="text-sm text-muted-foreground">{profile.email}</p>
                          <Button variant="outline" size="sm" className="mt-2">
                            Upload Photo
                          </Button>
                        </div>
                      </div>

                      {/* Name and Email */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">Full Name</label>
                          <Input
                            value={profile.name}
                            onChange={(e) => setProfile({ ...profile, name: e.target.value })}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Email Address</label>
                          <Input
                            type="email"
                            value={profile.email}
                            onChange={(e) => setProfile({ ...profile, email: e.target.value })}
                            className="mt-1"
                          />
                        </div>
                      </div>

                      {/* Bio */}
                      <div>
                        <label className="text-sm font-medium">Bio</label>
                        <Textarea
                          value={profile.bio}
                          onChange={(e) => setProfile({ ...profile, bio: e.target.value })}
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
                            value={profile.timezone}
                            onChange={(e) => setProfile({ ...profile, timezone: e.target.value })}
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
                          </select>
                        </div>
                        <div>
                          <label className="text-sm font-medium">Language</label>
                          <select
                            value={profile.language}
                            onChange={(e) => setProfile({ ...profile, language: e.target.value })}
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
                </>
              )}

              {/* Organization Section */}
              {activeSection === 'organization' && (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Building className="h-5 w-5" />
                        Organization Details
                      </CardTitle>
                      <CardDescription>
                        Manage your organization settings and billing
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Org Name and Slug */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">Organization Name</label>
                          <Input
                            value={organization.name}
                            onChange={(e) => setOrganization({ ...organization, name: e.target.value })}
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Slug</label>
                          <Input
                            value={organization.slug}
                            onChange={(e) => setOrganization({ ...organization, slug: e.target.value })}
                            className="mt-1"
                          />
                          <p className="text-xs text-muted-foreground mt-1">
                            Used in URLs: app.heyargus.ai/{organization.slug}
                          </p>
                        </div>
                      </div>

                      {/* Plan */}
                      <div className="p-4 rounded-lg border bg-gradient-to-r from-primary/5 to-purple-500/5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10">
                              <Crown className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <div className="font-medium">Pro Plan</div>
                              <div className="text-sm text-muted-foreground">$99/month</div>
                            </div>
                          </div>
                          <Button variant="outline">
                            <CreditCard className="h-4 w-4 mr-2" />
                            Manage Billing
                          </Button>
                        </div>
                        <div className="mt-4 grid grid-cols-3 gap-4 text-sm">
                          <div>
                            <div className="text-muted-foreground">Team Members</div>
                            <div className="font-medium">{organization.membersCount} / {organization.maxMembers}</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Test Runs</div>
                            <div className="font-medium">Unlimited</div>
                          </div>
                          <div>
                            <div className="text-muted-foreground">Retention</div>
                            <div className="font-medium">90 days</div>
                          </div>
                        </div>
                      </div>

                      {/* Billing Email */}
                      <div>
                        <label className="text-sm font-medium">Billing Email</label>
                        <Input
                          type="email"
                          value={organization.billing_email}
                          onChange={(e) => setOrganization({ ...organization, billing_email: e.target.value })}
                          className="mt-1"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Invoices will be sent to this email
                        </p>
                      </div>
                    </CardContent>
                  </Card>

                  {/* Team Members */}
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Users className="h-5 w-5" />
                        Team Members
                      </CardTitle>
                      <CardDescription>
                        Manage your team members and their roles
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex justify-between items-center mb-4">
                        <div className="text-sm text-muted-foreground">
                          {teamMembers.length} members
                        </div>
                        <Button size="sm">
                          <UserPlus className="h-4 w-4 mr-2" />
                          Invite Member
                        </Button>
                      </div>
                      {teamLoading ? (
                        <div className="flex items-center justify-center py-8">
                          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
                        </div>
                      ) : teamMembers.length === 0 ? (
                        <div className="text-center py-8 text-muted-foreground">
                          <Users className="h-10 w-10 mx-auto mb-3 opacity-50" />
                          <p>No team members found</p>
                          <p className="text-sm">Invite members to collaborate on testing</p>
                        </div>
                      ) : (
                        <div className="space-y-3">
                          {teamMembers.map((member) => (
                            <div key={member.id} className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors">
                              <div className="flex items-center gap-3">
                                <div className={cn(
                                  "h-10 w-10 rounded-full flex items-center justify-center text-white font-medium",
                                  member.status === 'pending' ? 'bg-muted text-muted-foreground' : 'bg-gradient-to-br from-primary/60 to-purple-600/60'
                                )}>
                                  {member.email[0].toUpperCase()}
                                </div>
                                <div>
                                  <div className="font-medium flex items-center gap-2">
                                    {member.email}
                                    {member.status === 'pending' && (
                                      <span className="px-2 py-0.5 text-xs rounded-full bg-amber-500/10 text-amber-500">
                                        Pending
                                      </span>
                                    )}
                                  </div>
                                  {member.invited_at && (
                                    <div className="text-sm text-muted-foreground flex items-center gap-1">
                                      <Clock className="h-3 w-3" />
                                      Invited {new Date(member.invited_at).toLocaleDateString()}
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className={cn('px-2 py-1 rounded-full text-xs font-medium', getRoleBadgeColor(member.role))}>
                                  {member.role}
                                </span>
                                {member.role !== 'owner' && (
                                  <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-600 hover:bg-red-500/10">
                                    <Trash2 className="h-4 w-4" />
                                  </Button>
                                )}
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </>
              )}

              {/* API Configuration */}
              {activeSection === 'api' && (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Key className="h-5 w-5" />
                        API Keys
                      </CardTitle>
                      <CardDescription>
                        Configure your API credentials for Claude and backend services
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">Anthropic API Key</label>
                        <div className="flex gap-2 mt-1">
                          <div className="relative flex-1">
                            <Input
                              type={showApiKey ? 'text' : 'password'}
                              value={settings.anthropicApiKey}
                              onChange={(e) =>
                                setSettings({ ...settings, anthropicApiKey: e.target.value })
                              }
                              placeholder="sk-ant-..."
                            />
                          </div>
                          <Button
                            variant="outline"
                            size="icon"
                            onClick={() => setShowApiKey(!showApiKey)}
                          >
                            {showApiKey ? (
                              <EyeOff className="h-4 w-4" />
                            ) : (
                              <Eye className="h-4 w-4" />
                            )}
                          </Button>
                        </div>
                        <p className="text-xs text-muted-foreground mt-1">
                          Your API key is encrypted and stored securely
                        </p>
                      </div>

                      <div>
                        <label className="text-sm font-medium">Backend URL</label>
                        <Input
                          value={settings.backendUrl}
                          onChange={(e) =>
                            setSettings({ ...settings, backendUrl: e.target.value })
                          }
                          className="mt-1"
                        />
                      </div>
                    </CardContent>
                  </Card>

                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <Cpu className="h-5 w-5" />
                        Model Configuration
                      </CardTitle>
                      <CardDescription>
                        Configure AI model settings and limits
                      </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                      <div>
                        <label className="text-sm font-medium">Default Model</label>
                        <select
                          value={settings.defaultModel}
                          onChange={(e) =>
                            setSettings({ ...settings, defaultModel: e.target.value })
                          }
                          className="mt-1 w-full px-3 py-2 rounded-md border bg-background"
                        >
                          <option value="claude-sonnet-4-5">Claude Sonnet 4.5</option>
                          <option value="claude-haiku-4-5">Claude Haiku 4.5</option>
                          <option value="claude-opus-4-5">Claude Opus 4.5</option>
                        </select>
                      </div>

                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="text-sm font-medium">Max Iterations</label>
                          <Input
                            type="number"
                            value={settings.maxIterations}
                            onChange={(e) =>
                              setSettings({ ...settings, maxIterations: parseInt(e.target.value) })
                            }
                            className="mt-1"
                          />
                        </div>
                        <div>
                          <label className="text-sm font-medium">Cost Limit (USD)</label>
                          <Input
                            type="number"
                            step="0.01"
                            value={settings.costLimit}
                            onChange={(e) =>
                              setSettings({ ...settings, costLimit: parseFloat(e.target.value) })
                            }
                            className="mt-1"
                          />
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}

              {/* Notifications */}
              {activeSection === 'notifications' && (
                <>
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
                      {/* Slack */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">Slack Notifications</div>
                            <div className="text-sm text-muted-foreground">
                              Receive test results in Slack
                            </div>
                          </div>
                          <Toggle
                            checked={settings.slackEnabled}
                            onChange={(v) => setSettings({ ...settings, slackEnabled: v })}
                          />
                        </div>

                        {settings.slackEnabled && (
                          <div className="pl-4 border-l-2 border-primary/20 space-y-4">
                            <div>
                              <label className="text-sm font-medium">Webhook URL</label>
                              <Input
                                value={settings.slackWebhook}
                                onChange={(e) =>
                                  setSettings({ ...settings, slackWebhook: e.target.value })
                                }
                                placeholder="https://hooks.slack.com/services/..."
                                className="mt-1"
                              />
                            </div>
                            <div>
                              <label className="text-sm font-medium">Channel</label>
                              <Input
                                value={settings.slackChannel}
                                onChange={(e) =>
                                  setSettings({ ...settings, slackChannel: e.target.value })
                                }
                                placeholder="#testing-alerts"
                                className="mt-1"
                              />
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Email */}
                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                          <div>
                            <div className="font-medium">Email Notifications</div>
                            <div className="text-sm text-muted-foreground">
                              Receive test results via email
                            </div>
                          </div>
                          <Toggle
                            checked={settings.emailEnabled}
                            onChange={(v) => setSettings({ ...settings, emailEnabled: v })}
                          />
                        </div>

                        {settings.emailEnabled && (
                          <div className="pl-4 border-l-2 border-primary/20">
                            <label className="text-sm font-medium">Recipients</label>
                            <Input
                              value={settings.emailRecipients}
                              onChange={(e) =>
                                setSettings({ ...settings, emailRecipients: e.target.value })
                              }
                              placeholder="team@example.com, alerts@example.com"
                              className="mt-1"
                            />
                            <p className="text-xs text-muted-foreground mt-1">
                              Separate multiple emails with commas
                            </p>
                          </div>
                        )}
                      </div>

                      {/* Notification Events */}
                      <div className="pt-4 border-t">
                        <h4 className="font-medium mb-4">Notification Events</h4>
                        <div className="space-y-4">
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">Test Success</div>
                              <div className="text-sm text-muted-foreground">Notify when tests pass</div>
                            </div>
                            <Toggle
                              checked={settings.notifyOnSuccess}
                              onChange={(v) => setSettings({ ...settings, notifyOnSuccess: v })}
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">Test Failure</div>
                              <div className="text-sm text-muted-foreground">Notify when tests fail</div>
                            </div>
                            <Toggle
                              checked={settings.notifyOnFailure}
                              onChange={(v) => setSettings({ ...settings, notifyOnFailure: v })}
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">Self-Healing Events</div>
                              <div className="text-sm text-muted-foreground">Notify when tests are auto-healed</div>
                            </div>
                            <Toggle
                              checked={settings.notifyOnHealing}
                              onChange={(v) => setSettings({ ...settings, notifyOnHealing: v })}
                            />
                          </div>
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="font-medium">Daily Digest</div>
                              <div className="text-sm text-muted-foreground">Receive daily summary</div>
                            </div>
                            <Toggle
                              checked={settings.dailyDigest}
                              onChange={(v) => setSettings({ ...settings, dailyDigest: v })}
                            />
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </>
              )}

              {/* Defaults */}
              {activeSection === 'defaults' && (
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
                          value={settings.defaultTimeout}
                          onChange={(e) =>
                            setSettings({ ...settings, defaultTimeout: parseInt(e.target.value) })
                          }
                          className="mt-1"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Maximum time to wait for page elements
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium flex items-center gap-2">
                          <Monitor className="h-4 w-4" />
                          Default Viewport
                        </label>
                        <select
                          value={settings.defaultViewport}
                          onChange={(e) =>
                            setSettings({ ...settings, defaultViewport: e.target.value })
                          }
                          className="mt-1 w-full px-3 py-2 rounded-md border bg-background"
                        >
                          <option value="1280x720">1280x720 (720p)</option>
                          <option value="1920x1080">1920x1080 (1080p)</option>
                          <option value="2560x1440">2560x1440 (1440p)</option>
                          <option value="375x812">375x812 (iPhone)</option>
                          <option value="768x1024">768x1024 (iPad)</option>
                        </select>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium flex items-center gap-2">
                        <Globe className="h-4 w-4" />
                        Default Base URL
                      </label>
                      <Input
                        value={settings.defaultBaseUrl}
                        onChange={(e) =>
                          setSettings({ ...settings, defaultBaseUrl: e.target.value })
                        }
                        placeholder="http://localhost:3000"
                        className="mt-1"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Base URL used when running tests locally
                      </p>
                    </div>

                    <div>
                      <label className="text-sm font-medium">Default Browser</label>
                      <select
                        value={settings.defaultBrowser}
                        onChange={(e) =>
                          setSettings({ ...settings, defaultBrowser: e.target.value })
                        }
                        className="mt-1 w-full px-3 py-2 rounded-md border bg-background"
                      >
                        <option value="chromium">Chromium</option>
                        <option value="firefox">Firefox</option>
                        <option value="webkit">WebKit (Safari)</option>
                      </select>
                    </div>

                    <div className="pt-4 border-t space-y-4">
                      <h4 className="font-medium">Execution Options</h4>
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">Auto-Retry Failed Tests</div>
                          <div className="text-sm text-muted-foreground">
                            Automatically retry flaky tests
                          </div>
                        </div>
                        <Toggle
                          checked={settings.autoRetry}
                          onChange={(v) => setSettings({ ...settings, autoRetry: v })}
                        />
                      </div>

                      {settings.autoRetry && (
                        <div>
                          <label className="text-sm font-medium">Retry Count</label>
                          <Input
                            type="number"
                            value={settings.retryCount}
                            onChange={(e) =>
                              setSettings({ ...settings, retryCount: parseInt(e.target.value) })
                            }
                            min="1"
                            max="5"
                            className="mt-1 w-24"
                          />
                        </div>
                      )}

                      <div>
                        <label className="text-sm font-medium">Parallel Test Execution</label>
                        <Input
                          type="number"
                          value={settings.parallelTests}
                          onChange={(e) =>
                            setSettings({ ...settings, parallelTests: parseInt(e.target.value) })
                          }
                          min="1"
                          max="10"
                          className="mt-1 w-24"
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Number of tests to run in parallel
                        </p>
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">Headless Mode</div>
                          <div className="text-sm text-muted-foreground">
                            Run browser tests without UI
                          </div>
                        </div>
                        <Toggle
                          checked={settings.headlessMode}
                          onChange={(v) => setSettings({ ...settings, headlessMode: v })}
                        />
                      </div>

                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-medium">Save Screenshots</div>
                          <div className="text-sm text-muted-foreground">
                            Save screenshots for all test steps
                          </div>
                        </div>
                        <Toggle
                          checked={settings.saveScreenshots}
                          onChange={(v) => setSettings({ ...settings, saveScreenshots: v })}
                        />
                      </div>
                    </div>
                  </CardContent>
                </Card>
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
                      Configure security and access controls
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <div className="font-medium">Two-Factor Authentication</div>
                        <div className="text-sm text-muted-foreground">
                          Require 2FA for dashboard access
                        </div>
                      </div>
                      <Toggle
                        checked={settings.twoFactorEnabled}
                        onChange={(v) => setSettings({ ...settings, twoFactorEnabled: v })}
                      />
                    </div>

                    <div>
                      <label className="text-sm font-medium">Session Timeout (minutes)</label>
                      <Input
                        type="number"
                        value={settings.sessionTimeout}
                        onChange={(e) =>
                          setSettings({ ...settings, sessionTimeout: parseInt(e.target.value) })
                        }
                        min="5"
                        max="120"
                        className="mt-1 w-24"
                      />
                      <p className="text-xs text-muted-foreground mt-1">
                        Auto-logout after inactivity
                      </p>
                    </div>

                    <div className="pt-4 border-t">
                      <h4 className="font-medium mb-3">Danger Zone</h4>
                      <div className="space-y-3">
                        <Button variant="outline" className="text-red-500 border-red-500/20 hover:bg-red-500/10">
                          Clear All Test Data
                        </Button>
                        <Button variant="outline" className="text-red-500 border-red-500/20 hover:bg-red-500/10 ml-3">
                          Revoke All API Keys
                        </Button>
                      </div>
                    </div>
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
                          href="https://github.com/samuelvinay91/argus"
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
