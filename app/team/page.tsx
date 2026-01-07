'use client';

import { useState, useEffect, useCallback } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Users,
  UserPlus,
  Crown,
  Shield,
  Eye,
  MoreVertical,
  Mail,
  Clock,
  CheckCircle,
  X,
  Search,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';

const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || 'http://localhost:8000';
const DEFAULT_ORG_ID = 'default';

interface Member {
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

const ROLE_CONFIG = {
  owner: { label: 'Owner', icon: Crown, color: 'text-amber-500' },
  admin: { label: 'Admin', icon: Shield, color: 'text-blue-500' },
  member: { label: 'Member', icon: Users, color: 'text-green-500' },
  viewer: { label: 'Viewer', icon: Eye, color: 'text-muted-foreground' },
};

export default function TeamPage() {
  const [organization, setOrganization] = useState<Organization | null>(null);
  const [members, setMembers] = useState<Member[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member' | 'viewer'>('member');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [inviting, setInviting] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  const fetchOrganization = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/v1/teams/organizations/${DEFAULT_ORG_ID}`);
      if (response.ok) {
        const data = await response.json();
        setOrganization(data);
      }
    } catch (err) {
      console.error('Failed to fetch organization:', err);
    }
  }, []);

  const fetchMembers = useCallback(async () => {
    try {
      const response = await fetch(`${BACKEND_URL}/api/v1/teams/organizations/${DEFAULT_ORG_ID}/members`);
      if (response.ok) {
        const data = await response.json();
        setMembers(data.members || []);
      }
    } catch (err) {
      console.error('Failed to fetch members:', err);
    }
  }, []);

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      setError(null);
      await Promise.all([fetchOrganization(), fetchMembers()]);
      setLoading(false);
    };
    loadData();
  }, [fetchOrganization, fetchMembers]);

  const filteredMembers = members.filter(m =>
    m.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleInvite = async () => {
    if (!inviteEmail) return;

    setInviting(true);
    setError(null);

    try {
      const response = await fetch(`${BACKEND_URL}/api/v1/teams/organizations/${DEFAULT_ORG_ID}/members/invite`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: inviteEmail,
          role: inviteRole,
        }),
      });

      if (response.ok) {
        const newMember = await response.json();
        setMembers([...members, newMember]);
        setInviteEmail('');
        setShowInviteModal(false);
      } else {
        const data = await response.json();
        setError(data.detail || 'Failed to send invitation');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setInviting(false);
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    setActionLoading(memberId);
    try {
      const response = await fetch(`${BACKEND_URL}/api/v1/teams/organizations/${DEFAULT_ORG_ID}/members/${memberId}`, {
        method: 'DELETE',
      });

      if (response.ok) {
        setMembers(members.filter(m => m.id !== memberId));
      } else {
        const data = await response.json();
        setError(data.detail || 'Failed to remove member');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setActionLoading(null);
      setSelectedMember(null);
    }
  };

  const handleChangeRole = async (memberId: string, newRole: 'admin' | 'member' | 'viewer') => {
    setActionLoading(memberId);
    try {
      const response = await fetch(`${BACKEND_URL}/api/v1/teams/organizations/${DEFAULT_ORG_ID}/members/${memberId}/role`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      if (response.ok) {
        setMembers(members.map(m =>
          m.id === memberId ? { ...m, role: newRole } : m
        ));
      } else {
        const data = await response.json();
        setError(data.detail || 'Failed to change role');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setActionLoading(null);
      setSelectedMember(null);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 ml-64 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading team data...</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 ml-64">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-6">
          <div className="flex-1">
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Team Management
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage your organization members and their roles
            </p>
          </div>
          <Button onClick={() => setShowInviteModal(true)}>
            <UserPlus className="mr-2 h-4 w-4" />
            Invite Member
          </Button>
        </header>

        <div className="p-6 space-y-6">
          {/* Error Alert */}
          {error && (
            <Card className="border-red-500/50 bg-red-500/5">
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

          {/* Organization Info */}
          <Card>
            <CardHeader>
              <CardTitle>Organization</CardTitle>
              <CardDescription>Your organization details</CardDescription>
            </CardHeader>
            <CardContent>
              {organization ? (
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="text-lg font-semibold">{organization.name}</h3>
                    <p className="text-sm text-muted-foreground">
                      {organization.slug} &middot; {organization.plan.toUpperCase()} Plan
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold">{members.length}</p>
                    <p className="text-sm text-muted-foreground">Team Members</p>
                  </div>
                </div>
              ) : (
                <div className="text-center py-4 text-muted-foreground">
                  <p>No organization configured yet</p>
                  <p className="text-sm">Contact support to set up your organization</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Role Legend */}
          <div className="flex flex-wrap gap-4">
            {Object.entries(ROLE_CONFIG).map(([role, config]) => (
              <div key={role} className="flex items-center gap-2 text-sm">
                <config.icon className={cn("h-4 w-4", config.color)} />
                <span className="text-muted-foreground">{config.label}</span>
              </div>
            ))}
          </div>

          {/* Members List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Team Members</CardTitle>
                  <CardDescription>
                    {members.filter(m => m.status === 'active').length} active,{' '}
                    {members.filter(m => m.status === 'pending').length} pending
                  </CardDescription>
                </div>
                <div className="relative w-64">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search members..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
            </CardHeader>
            <CardContent>
              {filteredMembers.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  {members.length === 0 ? (
                    <>
                      <p>No team members yet</p>
                      <Button
                        variant="outline"
                        className="mt-4"
                        onClick={() => setShowInviteModal(true)}
                      >
                        Invite your first member
                      </Button>
                    </>
                  ) : (
                    <p>No members match your search</p>
                  )}
                </div>
              ) : (
                <div className="divide-y">
                  {filteredMembers.map((member) => {
                    const roleConfig = ROLE_CONFIG[member.role];
                    return (
                      <div
                        key={member.id}
                        className="flex items-center justify-between py-4"
                      >
                        <div className="flex items-center gap-4">
                          <div className={cn(
                            "h-10 w-10 rounded-full flex items-center justify-center text-white font-medium",
                            member.status === 'pending' ? 'bg-muted' : 'bg-primary'
                          )}>
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
                              <roleConfig.icon className={cn("h-3.5 w-3.5", roleConfig.color)} />
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
                          {member.role !== 'owner' && (
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => setSelectedMember(selectedMember === member.id ? null : member.id)}
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
                                        "w-full flex items-center gap-2 px-2 py-1.5 text-sm rounded hover:bg-muted",
                                        member.role === role && "bg-muted"
                                      )}
                                    >
                                      {RoleIcon && (
                                        <RoleIcon className={cn("h-4 w-4", ROLE_CONFIG[role].color)} />
                                      )}
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
        </div>

        {/* Invite Modal */}
        {showInviteModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <Card className="w-full max-w-md">
              <CardHeader>
                <CardTitle>Invite Team Member</CardTitle>
                <CardDescription>
                  Send an invitation to join your organization
                </CardDescription>
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
                            "flex flex-col items-center gap-1 p-3 rounded-lg border transition-colors",
                            inviteRole === role
                              ? "border-primary bg-primary/5"
                              : "border-border hover:bg-muted"
                          )}
                        >
                          {RoleIcon && (
                            <RoleIcon className={cn("h-5 w-5", ROLE_CONFIG[role].color)} />
                          )}
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
                  <Button
                    className="flex-1"
                    onClick={handleInvite}
                    disabled={!inviteEmail || inviting}
                  >
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
      </main>
    </div>
  );
}
