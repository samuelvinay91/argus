'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Building2,
  ArrowLeft,
  Settings,
  Users,
  CreditCard,
  Trash2,
  Loader2,
  Save,
  CheckCircle,
  Crown,
  Shield,
  Eye,
  UserPlus,
  Clock,
  Camera,
  AlertTriangle,
  X,
  MoreVertical,
  Mail,
  Sparkles,
  Zap,
  Rocket,
  ExternalLink,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthApi } from '@/lib/hooks/use-auth-api';

interface Organization {
  id: string;
  name: string;
  slug: string;
  logo_url?: string;
  plan: 'free' | 'pro' | 'enterprise';
  member_count: number;
  created_at: string;
}

interface Member {
  id: string;
  email: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  status: 'active' | 'pending';
  invited_at?: string;
  accepted_at?: string;
}

interface UsageStats {
  test_runs: number;
  test_runs_limit: number;
  members: number;
  members_limit: number;
  retention_days: number;
  storage_used_mb: number;
  storage_limit_mb: number;
}

interface SettingSection {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
}

const sections: SettingSection[] = [
  { id: 'general', name: 'General', icon: Settings },
  { id: 'plan', name: 'Plan & Usage', icon: CreditCard },
  { id: 'members', name: 'Members', icon: Users },
  { id: 'danger', name: 'Danger Zone', icon: AlertTriangle },
];

const ROLE_CONFIG = {
  owner: { label: 'Owner', icon: Crown, color: 'text-amber-500' },
  admin: { label: 'Admin', icon: Shield, color: 'text-blue-500' },
  member: { label: 'Member', icon: Users, color: 'text-green-500' },
  viewer: { label: 'Viewer', icon: Eye, color: 'text-muted-foreground' },
};

const PLAN_CONFIG = {
  free: {
    label: 'Free',
    color: 'bg-gray-500/10 text-gray-500',
    icon: Sparkles,
    price: '$0/month',
  },
  pro: {
    label: 'Pro',
    color: 'bg-primary/10 text-primary',
    icon: Zap,
    price: '$99/month',
  },
  enterprise: {
    label: 'Enterprise',
    color: 'bg-purple-500/10 text-purple-500',
    icon: Rocket,
    price: 'Custom',
  },
};

export default function OrganizationSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const orgId = params.id as string;
  const { fetchJson, isLoaded, isSignedIn } = useAuthApi();

  const [activeSection, setActiveSection] = useState('general');
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [usage, setUsage] = useState<UsageStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Edit state for general settings
  const [editName, setEditName] = useState('');
  const [editSlug, setEditSlug] = useState('');

  // Member management state
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member' | 'viewer'>('member');
  const [inviting, setInviting] = useState(false);
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Delete confirmation
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');
  const [deleting, setDeleting] = useState(false);

  // Current user's role in this org
  const [currentUserRole, setCurrentUserRole] = useState<'owner' | 'admin' | 'member' | 'viewer'>('member');

  const fetchOrganization = useCallback(async () => {
    try {
      const response = await fetchJson<{ organization: Organization }>(`/api/v1/organizations/${orgId}`);
      if (response.data?.organization) {
        setOrganization(response.data.organization);
        setEditName(response.data.organization.name);
        setEditSlug(response.data.organization.slug);
      }
    } catch (err) {
      console.error('Failed to fetch organization:', err);
    }
  }, [fetchJson, orgId]);

  const fetchMembers = useCallback(async () => {
    try {
      const response = await fetchJson<{ members: Member[]; current_user_role: string }>(
        `/api/v1/organizations/${orgId}/members`
      );
      if (response.data?.members) {
        setMembers(response.data.members);
      }
      if (response.data?.current_user_role) {
        setCurrentUserRole(response.data.current_user_role as 'owner' | 'admin' | 'member' | 'viewer');
      }
    } catch (err) {
      console.error('Failed to fetch members:', err);
    }
  }, [fetchJson, orgId]);

  const fetchUsage = useCallback(async () => {
    try {
      const response = await fetchJson<UsageStats>(`/api/v1/organizations/${orgId}/usage`);
      if (response.data) {
        setUsage(response.data);
      }
    } catch (err) {
      console.error('Failed to fetch usage:', err);
    }
  }, [fetchJson, orgId]);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      setLoading(true);
      Promise.all([fetchOrganization(), fetchMembers(), fetchUsage()]).finally(() => {
        setLoading(false);
      });
    }
  }, [isLoaded, isSignedIn, fetchOrganization, fetchMembers, fetchUsage]);

  const handleSave = async () => {
    if (!organization) return;

    setSaving(true);
    setError(null);

    try {
      const response = await fetchJson<{ organization: Organization }>(
        `/api/v1/organizations/${orgId}`,
        {
          method: 'PUT',
          body: JSON.stringify({
            name: editName.trim(),
            slug: editSlug.trim(),
          }),
        }
      );

      if (response.error) {
        setError(response.error);
        return;
      }

      if (response.data?.organization) {
        setOrganization(response.data.organization);
      }

      setSaved(true);
      setTimeout(() => setSaved(false), 2000);
    } catch (err) {
      setError('Failed to save changes');
    } finally {
      setSaving(false);
    }
  };

  const handleInvite = async () => {
    if (!inviteEmail) return;

    setInviting(true);
    setError(null);

    try {
      const response = await fetchJson<Member>(`/api/v1/organizations/${orgId}/members/invite`, {
        method: 'POST',
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
        }),
      });

      if (response.error) {
        setError(response.error);
        return;
      }

      if (response.data) {
        setMembers([...members, response.data]);
      }

      setInviteEmail('');
      setShowInviteModal(false);
    } catch (err) {
      setError('Failed to send invitation');
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    setActionLoading(memberId);
    try {
      const response = await fetchJson(`/api/v1/organizations/${orgId}/members/${memberId}`, {
        method: 'DELETE',
      });

      if (response.error) {
        setError(response.error);
        return;
      }

      setMembers(members.filter((m) => m.id !== memberId));
    } catch (err) {
      setError('Failed to remove member');
    } finally {
      setActionLoading(null);
      setSelectedMember(null);
    }
  };

  const handleChangeRole = async (memberId: string, newRole: 'admin' | 'member' | 'viewer') => {
    setActionLoading(memberId);
    try {
      const response = await fetchJson(`/api/v1/organizations/${orgId}/members/${memberId}/role`, {
        method: 'PUT',
        body: JSON.stringify({ role: newRole }),
      });

      if (response.error) {
        setError(response.error);
        return;
      }

      setMembers(members.map((m) => (m.id === memberId ? { ...m, role: newRole } : m)));
    } catch (err) {
      setError('Failed to change role');
    } finally {
      setActionLoading(null);
      setSelectedMember(null);
    }
  };

  const handleDeleteOrganization = async () => {
    if (deleteConfirmText !== organization?.name) return;

    setDeleting(true);
    try {
      const response = await fetchJson(`/api/v1/organizations/${orgId}`, {
        method: 'DELETE',
      });

      if (response.error) {
        setError(response.error);
        return;
      }

      router.push('/organizations');
    } catch (err) {
      setError('Failed to delete organization');
    } finally {
      setDeleting(false);
    }
  };

  const isOwner = currentUserRole === 'owner';
  const isAdmin = currentUserRole === 'owner' || currentUserRole === 'admin';

  if (!isLoaded || loading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 lg:ml-64 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading organization settings...</p>
          </div>
        </main>
      </div>
    );
  }

  if (!organization) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 lg:ml-64 flex items-center justify-center">
          <Card className="max-w-md">
            <CardContent className="pt-6 text-center">
              <AlertCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">Organization not found</h3>
              <p className="text-muted-foreground mb-4">
                The organization you&apos;re looking for doesn&apos;t exist or you don&apos;t have access.
              </p>
              <Button onClick={() => router.push('/organizations')}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Organizations
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    );
  }

  const planConfig = PLAN_CONFIG[organization.plan] || PLAN_CONFIG.free;
  const PlanIcon = planConfig.icon;

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 lg:ml-64">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-6">
          <Button variant="ghost" size="sm" onClick={() => router.push('/organizations')}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-semibold flex items-center gap-2">
              {organization.logo_url ? (
                <img src={organization.logo_url} alt="" className="h-6 w-6 rounded" />
              ) : (
                <Building2 className="h-5 w-5 text-primary" />
              )}
              {organization.name}
            </h1>
            <p className="text-sm text-muted-foreground">Organization Settings</p>
          </div>
          {activeSection === 'general' && (
            <Button onClick={handleSave} disabled={saving || !isAdmin}>
              {saved ? (
                <>
                  <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                  Saved!
                </>
              ) : saving ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Save className="mr-2 h-4 w-4" />
                  Save Changes
                </>
              )}
            </Button>
          )}
        </header>

        <div className="p-6">
          {/* Error Alert */}
          {error && (
            <Card className="border-red-500/50 bg-red-500/5 mb-6">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-red-500">
                  <AlertCircle className="h-5 w-5" />
                  <span>{error}</span>
                  <Button variant="ghost" size="sm" onClick={() => setError(null)} className="ml-auto">
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardContent>
            </Card>
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
                      : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground',
                    section.id === 'danger' && 'text-red-500 hover:text-red-600'
                  )}
                >
                  <section.icon className="h-4 w-4" />
                  {section.name}
                </button>
              ))}
            </div>

            {/* Settings Content */}
            <div className="flex-1 space-y-6">
              {/* General Section */}
              {activeSection === 'general' && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                      <Building2 className="h-5 w-5" />
                      General Settings
                    </CardTitle>
                    <CardDescription>
                      Manage your organization&apos;s basic information
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    {/* Logo */}
                    <div className="flex items-center gap-6">
                      <div className="relative">
                        {organization.logo_url ? (
                          <img
                            src={organization.logo_url}
                            alt={organization.name}
                            className="h-20 w-20 rounded-lg object-cover"
                          />
                        ) : (
                          <div className="h-20 w-20 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Building2 className="h-10 w-10 text-primary" />
                          </div>
                        )}
                        {isAdmin && (
                          <button className="absolute bottom-0 right-0 p-2 rounded-full bg-background border shadow-sm hover:bg-muted transition-colors">
                            <Camera className="h-4 w-4" />
                          </button>
                        )}
                      </div>
                      <div>
                        <h3 className="font-medium">{organization.name}</h3>
                        <p className="text-sm text-muted-foreground">{organization.slug}</p>
                        {isAdmin && (
                          <Button variant="outline" size="sm" className="mt-2">
                            Upload Logo
                          </Button>
                        )}
                      </div>
                    </div>

                    {/* Name and Slug */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium">Organization Name</label>
                        <Input
                          value={editName}
                          onChange={(e) => setEditName(e.target.value)}
                          className="mt-1"
                          disabled={!isAdmin}
                        />
                      </div>
                      <div>
                        <label className="text-sm font-medium">Slug</label>
                        <Input
                          value={editSlug}
                          onChange={(e) => setEditSlug(e.target.value)}
                          className="mt-1"
                          disabled={!isAdmin}
                        />
                        <p className="text-xs text-muted-foreground mt-1">
                          Used in URLs: app.heyargus.ai/{editSlug}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {/* Plan & Usage Section */}
              {activeSection === 'plan' && (
                <>
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center gap-2">
                        <CreditCard className="h-5 w-5" />
                        Current Plan
                      </CardTitle>
                      <CardDescription>Your subscription and billing information</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="p-4 rounded-lg border bg-gradient-to-r from-primary/5 to-purple-500/5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3">
                            <div className="p-2 rounded-lg bg-primary/10">
                              <PlanIcon className="h-5 w-5 text-primary" />
                            </div>
                            <div>
                              <div className="font-medium">{planConfig.label} Plan</div>
                              <div className="text-sm text-muted-foreground">{planConfig.price}</div>
                            </div>
                          </div>
                          {isOwner && organization.plan !== 'enterprise' && (
                            <Button variant="outline">
                              <Zap className="h-4 w-4 mr-2" />
                              Upgrade
                            </Button>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>

                  {usage && (
                    <Card>
                      <CardHeader>
                        <CardTitle>Usage</CardTitle>
                        <CardDescription>Your current usage this billing period</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-6">
                        {/* Test Runs */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">Test Runs</span>
                            <span className="text-sm text-muted-foreground">
                              {usage.test_runs.toLocaleString()} /{' '}
                              {usage.test_runs_limit === -1 ? 'Unlimited' : usage.test_runs_limit.toLocaleString()}
                            </span>
                          </div>
                          {usage.test_runs_limit !== -1 && (
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full transition-all"
                                style={{
                                  width: `${Math.min((usage.test_runs / usage.test_runs_limit) * 100, 100)}%`,
                                }}
                              />
                            </div>
                          )}
                        </div>

                        {/* Team Members */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">Team Members</span>
                            <span className="text-sm text-muted-foreground">
                              {usage.members} /{' '}
                              {usage.members_limit === -1 ? 'Unlimited' : usage.members_limit}
                            </span>
                          </div>
                          {usage.members_limit !== -1 && (
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full transition-all"
                                style={{
                                  width: `${Math.min((usage.members / usage.members_limit) * 100, 100)}%`,
                                }}
                              />
                            </div>
                          )}
                        </div>

                        {/* Storage */}
                        <div>
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-sm font-medium">Storage</span>
                            <span className="text-sm text-muted-foreground">
                              {(usage.storage_used_mb / 1024).toFixed(2)} GB /{' '}
                              {usage.storage_limit_mb === -1
                                ? 'Unlimited'
                                : `${(usage.storage_limit_mb / 1024).toFixed(0)} GB`}
                            </span>
                          </div>
                          {usage.storage_limit_mb !== -1 && (
                            <div className="h-2 rounded-full bg-muted overflow-hidden">
                              <div
                                className="h-full bg-primary rounded-full transition-all"
                                style={{
                                  width: `${Math.min((usage.storage_used_mb / usage.storage_limit_mb) * 100, 100)}%`,
                                }}
                              />
                            </div>
                          )}
                        </div>

                        {/* Data Retention */}
                        <div className="pt-4 border-t">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium">Data Retention</span>
                            <span className="text-sm text-muted-foreground">
                              {usage.retention_days === -1 ? 'Unlimited' : `${usage.retention_days} days`}
                            </span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  )}
                </>
              )}

              {/* Members Section */}
              {activeSection === 'members' && (
                <Card>
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div>
                        <CardTitle className="flex items-center gap-2">
                          <Users className="h-5 w-5" />
                          Team Members
                        </CardTitle>
                        <CardDescription>
                          {members.filter((m) => m.status === 'active').length} active,{' '}
                          {members.filter((m) => m.status === 'pending').length} pending
                        </CardDescription>
                      </div>
                      {isAdmin && (
                        <Button size="sm" onClick={() => setShowInviteModal(true)}>
                          <UserPlus className="h-4 w-4 mr-2" />
                          Invite Member
                        </Button>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent>
                    {members.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                        <p>No team members yet</p>
                        {isAdmin && (
                          <Button
                            variant="outline"
                            className="mt-4"
                            onClick={() => setShowInviteModal(true)}
                          >
                            Invite your first member
                          </Button>
                        )}
                      </div>
                    ) : (
                      <div className="divide-y">
                        {members.map((member) => {
                          const roleConfig = ROLE_CONFIG[member.role];
                          return (
                            <div key={member.id} className="flex items-center justify-between py-4">
                              <div className="flex items-center gap-4">
                                <div
                                  className={cn(
                                    'h-10 w-10 rounded-full flex items-center justify-center text-white font-medium',
                                    member.status === 'pending' ? 'bg-muted text-muted-foreground' : 'bg-primary'
                                  )}
                                >
                                  {member.email[0].toUpperCase()}
                                </div>
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-medium">{member.email}</span>
                                    {member.status === 'pending' && (
                                      <span className="px-2 py-0.5 text-xs rounded-full bg-amber-500/10 text-amber-500">
                                        Pending
                                      </span>
                                    )}
                                  </div>
                                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                                    <roleConfig.icon className={cn('h-3.5 w-3.5', roleConfig.color)} />
                                    <span>{roleConfig.label}</span>
                                    {member.status === 'pending' && member.invited_at && (
                                      <>
                                        <span>&middot;</span>
                                        <Clock className="h-3 w-3" />
                                        <span>Invited {new Date(member.invited_at).toLocaleDateString()}</span>
                                      </>
                                    )}
                                  </div>
                                </div>
                              </div>

                              <div className="relative">
                                {member.role !== 'owner' && isAdmin && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={() =>
                                      setSelectedMember(selectedMember === member.id ? null : member.id)
                                    }
                                    disabled={actionLoading === member.id}
                                  >
                                    {actionLoading === member.id ? (
                                      <Loader2 className="h-4 w-4 animate-spin" />
                                    ) : (
                                      <MoreVertical className="h-4 w-4" />
                                    )}
                                  </Button>
                                )}

                                {selectedMember === member.id && (
                                  <div className="absolute right-0 top-full mt-1 w-48 rounded-md border bg-popover shadow-lg z-10">
                                    <div className="p-1">
                                      <p className="px-2 py-1.5 text-xs font-semibold text-muted-foreground">
                                        Change Role
                                      </p>
                                      {(['admin', 'member', 'viewer'] as const).map((role) => {
                                        const RoleIcon = ROLE_CONFIG[role].icon;
                                        return (
                                          <button
                                            key={role}
                                            onClick={() => handleChangeRole(member.id, role)}
                                            className={cn(
                                              'w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-muted',
                                              member.role === role && 'bg-muted'
                                            )}
                                          >
                                            <RoleIcon className={cn('h-4 w-4', ROLE_CONFIG[role].color)} />
                                            {ROLE_CONFIG[role].label}
                                            {member.role === role && (
                                              <CheckCircle className="h-3 w-3 ml-auto text-primary" />
                                            )}
                                          </button>
                                        );
                                      })}
                                      <div className="border-t my-1" />
                                      <button
                                        onClick={() => handleRemoveMember(member.id)}
                                        className="w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded text-red-500 hover:bg-red-500/10"
                                      >
                                        <X className="h-4 w-4" />
                                        Remove Member
                                      </button>
                                    </div>
                                  </div>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </CardContent>
                </Card>
              )}

              {/* Danger Zone Section */}
              {activeSection === 'danger' && isOwner && (
                <Card className="border-red-500/50">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-red-500">
                      <AlertTriangle className="h-5 w-5" />
                      Danger Zone
                    </CardTitle>
                    <CardDescription>
                      Irreversible and destructive actions
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="p-4 rounded-lg border border-red-500/20 bg-red-500/5">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-red-500">Delete Organization</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            Permanently delete this organization and all of its data. This action cannot be
                            undone.
                          </p>
                        </div>
                        <Button
                          variant="destructive"
                          onClick={() => setShowDeleteConfirm(true)}
                        >
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}

              {activeSection === 'danger' && !isOwner && (
                <Card>
                  <CardContent className="py-12 text-center">
                    <AlertTriangle className="h-12 w-12 text-muted-foreground mx-auto mb-4 opacity-50" />
                    <h3 className="text-lg font-semibold mb-2">Access Restricted</h3>
                    <p className="text-muted-foreground">
                      Only organization owners can access the danger zone settings.
                    </p>
                  </CardContent>
                </Card>
              )}
            </div>
          </div>
        </div>

        {/* Invite Modal */}
        {showInviteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Invite Team Member</CardTitle>
                <CardDescription>Send an invitation to join your organization</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Email Address</label>
                  <div className="relative mt-1">
                    <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                    <Input
                      type="email"
                      placeholder="colleague@company.com"
                      value={inviteEmail}
                      onChange={(e) => setInviteEmail(e.target.value)}
                      className="pl-9"
                    />
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Role</label>
                  <div className="grid grid-cols-3 gap-2 mt-2">
                    {(['admin', 'member', 'viewer'] as const).map((role) => {
                      const RoleIcon = ROLE_CONFIG[role].icon;
                      return (
                        <button
                          key={role}
                          onClick={() => setInviteRole(role)}
                          className={cn(
                            'flex flex-col items-center gap-1 p-3 rounded-lg border transition-colors',
                            inviteRole === role
                              ? 'border-primary bg-primary/5'
                              : 'border-border hover:bg-muted'
                          )}
                        >
                          <RoleIcon className={cn('h-5 w-5', ROLE_CONFIG[role].color)} />
                          <span className="text-sm font-medium">{ROLE_CONFIG[role].label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowInviteModal(false)}
                    disabled={inviting}
                  >
                    Cancel
                  </Button>
                  <Button className="flex-1" onClick={handleInvite} disabled={!inviteEmail || inviting}>
                    {inviting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      'Send Invitation'
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Delete Confirmation Modal */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <Card className="w-full max-w-md border-red-500/50">
              <CardHeader>
                <CardTitle className="text-red-500">Delete Organization</CardTitle>
                <CardDescription>
                  This action is permanent and cannot be undone. All data will be lost.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="p-4 rounded-lg bg-red-500/10 text-sm">
                  <p className="font-medium text-red-500 mb-2">This will permanently delete:</p>
                  <ul className="list-disc list-inside text-muted-foreground space-y-1">
                    <li>All projects and tests</li>
                    <li>All test results and reports</li>
                    <li>All team member associations</li>
                    <li>All API keys and integrations</li>
                  </ul>
                </div>

                <div>
                  <label className="text-sm font-medium">
                    Type <span className="font-bold">{organization.name}</span> to confirm
                  </label>
                  <Input
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                    placeholder={organization.name}
                    className="mt-1"
                  />
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => {
                      setShowDeleteConfirm(false);
                      setDeleteConfirmText('');
                    }}
                    disabled={deleting}
                  >
                    Cancel
                  </Button>
                  <Button
                    variant="destructive"
                    className="flex-1"
                    onClick={handleDeleteOrganization}
                    disabled={deleteConfirmText !== organization.name || deleting}
                  >
                    {deleting ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Deleting...
                      </>
                    ) : (
                      <>
                        <Trash2 className="mr-2 h-4 w-4" />
                        Delete Organization
                      </>
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
}
