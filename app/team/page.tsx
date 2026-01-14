'use client';

import { useState } from 'react';
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
  RefreshCw,
  Trash2,
  Send,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useQueryClient } from '@tanstack/react-query';
import {
  useOrganization,
  useMembers,
  usePendingInvitations,
  useInviteMember,
  useRemoveMember,
  useChangeMemberRole,
  useResendInvitation,
  useRevokeInvitation,
  type Member,
  type PendingInvitation,
} from '@/lib/hooks/use-team';

const DEFAULT_ORG_ID = 'default';

const ROLE_CONFIG = {
  owner: { label: 'Owner', icon: Crown, color: 'text-amber-500' },
  admin: { label: 'Admin', icon: Shield, color: 'text-blue-500' },
  member: { label: 'Member', icon: Users, color: 'text-green-500' },
  viewer: { label: 'Viewer', icon: Eye, color: 'text-muted-foreground' },
};

export default function TeamPage() {
  // UI state only - data is managed by React Query hooks
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'admin' | 'member' | 'viewer'>('member');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedMember, setSelectedMember] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const queryClient = useQueryClient();

  // Data fetching with authenticated hooks
  const { data: organization, isLoading: orgLoading } = useOrganization(DEFAULT_ORG_ID);
  const { data: members = [], isLoading: membersLoading, refetch: refetchMembers } = useMembers(DEFAULT_ORG_ID);
  const { data: pendingInvitations = [], isLoading: invitationsLoading, refetch: refetchInvitations } = usePendingInvitations(DEFAULT_ORG_ID);

  // Mutations with authenticated hooks
  const inviteMember = useInviteMember(DEFAULT_ORG_ID);
  const removeMember = useRemoveMember(DEFAULT_ORG_ID);
  const changeMemberRole = useChangeMemberRole(DEFAULT_ORG_ID);
  const resendInvitation = useResendInvitation(DEFAULT_ORG_ID);
  const revokeInvitation = useRevokeInvitation(DEFAULT_ORG_ID);

  const loading = orgLoading || membersLoading || invitationsLoading;

  const filteredMembers = members.filter((m: Member) =>
    m.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleInvite = async () => {
    if (!inviteEmail) return;

    setError(null);
    try {
      await inviteMember.mutateAsync({ email: inviteEmail, role: inviteRole });
      setInviteEmail('');
      setShowInviteModal(false);
      setSuccessMessage(`Invitation sent to ${inviteEmail}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invitation');
    }
  };

  const handleRemoveMember = async (memberId: string) => {
    setError(null);
    try {
      await removeMember.mutateAsync(memberId);
      setSelectedMember(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to remove member');
    }
  };

  const handleChangeRole = async (memberId: string, newRole: 'admin' | 'member' | 'viewer') => {
    setError(null);
    try {
      await changeMemberRole.mutateAsync({ memberId, role: newRole });
      setSelectedMember(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to change role');
    }
  };

  const handleResendInvitation = async (invitation: PendingInvitation) => {
    setError(null);
    setSuccessMessage(null);
    try {
      await resendInvitation.mutateAsync({
        email: invitation.email,
        role: invitation.role as 'admin' | 'member' | 'viewer'
      });
      setSuccessMessage(`Invitation resent to ${invitation.email}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to resend invitation');
    }
  };

  const handleRevokeInvitation = async (invitationId: string) => {
    setError(null);
    setSuccessMessage(null);
    try {
      await revokeInvitation.mutateAsync(invitationId);
      setSuccessMessage('Invitation revoked successfully');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to revoke invitation');
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 lg:ml-64 flex items-center justify-center">
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
      <main className="flex-1 lg:ml-64">
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

          {/* Success Alert */}
          {successMessage && (
            <Card className="border-emerald-500/50 bg-emerald-500/5">
              <CardContent className="pt-6">
                <div className="flex items-center gap-2 text-emerald-500">
                  <CheckCircle className="h-5 w-5" />
                  <span>{successMessage}</span>
                  <Button variant="ghost" size="sm" onClick={() => setSuccessMessage(null)} className="ml-auto">
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
                  <p className="text-sm">
                    Contact support at{' '}
                    <a href="mailto:support@heyargus.com" className="text-primary hover:underline">
                      support@heyargus.com
                    </a>{' '}
                    to set up your organization
                  </p>
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

          {/* Pending Invitations */}
          {pendingInvitations.length > 0 && (
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <Mail className="h-5 w-5 text-amber-500" />
                      Pending Invitations
                    </CardTitle>
                    <CardDescription>
                      {pendingInvitations.length} invitation{pendingInvitations.length !== 1 ? 's' : ''} awaiting response
                    </CardDescription>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => refetchInvitations()}
                    className="text-muted-foreground"
                  >
                    <RefreshCw className="h-4 w-4 mr-1" />
                    Refresh
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="divide-y">
                  {pendingInvitations.map((invitation: PendingInvitation) => {
                    const roleConfig = ROLE_CONFIG[invitation.role];
                    const isExpired = new Date(invitation.expires_at) < new Date();
                    const expiresIn = new Date(invitation.expires_at);
                    const isActionLoading = resendInvitation.isPending || revokeInvitation.isPending;

                    return (
                      <div
                        key={invitation.id}
                        className="flex items-center justify-between py-4"
                      >
                        <div className="flex items-center gap-4">
                          <div className="h-10 w-10 rounded-full bg-amber-500/10 flex items-center justify-center text-amber-500 font-medium">
                            <Mail className="h-5 w-5" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{invitation.email}</span>
                              {isExpired && (
                                <span className="px-2 py-0.5 text-xs rounded-full bg-red-500/10 text-red-500">
                                  Expired
                                </span>
                              )}
                            </div>
                            <div className="flex items-center gap-2 text-sm text-muted-foreground">
                              <roleConfig.icon className={cn("h-3.5 w-3.5", roleConfig.color)} />
                              <span>{roleConfig.label}</span>
                              <span>&middot;</span>
                              <Clock className="h-3 w-3" />
                              <span>
                                Invited {new Date(invitation.invited_at).toLocaleDateString()}
                              </span>
                              {!isExpired && (
                                <>
                                  <span>&middot;</span>
                                  <span className="text-amber-500">
                                    Expires {expiresIn.toLocaleDateString()}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleResendInvitation(invitation)}
                            disabled={isActionLoading}
                          >
                            {resendInvitation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Send className="h-3.5 w-3.5 mr-1.5" />
                                Resend
                              </>
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleRevokeInvitation(invitation.id)}
                            disabled={isActionLoading}
                            className="text-red-500 hover:text-red-600 hover:bg-red-500/10"
                          >
                            {revokeInvitation.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <>
                                <Trash2 className="h-3.5 w-3.5 mr-1.5" />
                                Revoke
                              </>
                            )}
                          </Button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Members List */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Team Members</CardTitle>
                  <CardDescription>
                    {members.filter((m: Member) => m.status === 'active').length} active,{' '}
                    {members.filter((m: Member) => m.status === 'pending').length} pending
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
                  {filteredMembers.map((member: Member) => {
                    const roleConfig = ROLE_CONFIG[member.role];
                    const isMutating = removeMember.isPending || changeMemberRole.isPending;

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
                              disabled={isMutating}
                            >
                              {isMutating && selectedMember === member.id ? (
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
                    disabled={inviteMember.isPending}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleInvite}
                    disabled={!inviteEmail || inviteMember.isPending}
                  >
                    {inviteMember.isPending ? (
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
