'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Building2,
  Plus,
  Users,
  Crown,
  Shield,
  Eye,
  Settings,
  Search,
  Loader2,
  ExternalLink,
  CheckCircle,
  Sparkles,
  Zap,
  Rocket,
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
  role: 'owner' | 'admin' | 'member' | 'viewer';
  created_at: string;
}

const PLAN_CONFIG = {
  free: {
    label: 'Free',
    color: 'bg-gray-500/10 text-gray-500',
    icon: Sparkles,
  },
  pro: {
    label: 'Pro',
    color: 'bg-primary/10 text-primary',
    icon: Zap,
  },
  enterprise: {
    label: 'Enterprise',
    color: 'bg-purple-500/10 text-purple-500',
    icon: Rocket,
  },
};

const ROLE_CONFIG = {
  owner: { label: 'Owner', icon: Crown, color: 'text-amber-500' },
  admin: { label: 'Admin', icon: Shield, color: 'text-blue-500' },
  member: { label: 'Member', icon: Users, color: 'text-green-500' },
  viewer: { label: 'Viewer', icon: Eye, color: 'text-muted-foreground' },
};

export default function OrganizationsPage() {
  const router = useRouter();
  const { fetchJson, isLoaded, isSignedIn, orgId } = useAuthApi();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [switching, setSwitching] = useState<string | null>(null);

  const fetchOrganizations = useCallback(async () => {
    try {
      setLoading(true);
      const response = await fetchJson<{ organizations: Organization[] }>('/api/v1/organizations');
      if (response.data?.organizations) {
        setOrganizations(response.data.organizations);
      }
    } catch (err) {
      console.error('Failed to fetch organizations:', err);
    } finally {
      setLoading(false);
    }
  }, [fetchJson]);

  useEffect(() => {
    if (isLoaded && isSignedIn) {
      fetchOrganizations();
    }
  }, [isLoaded, isSignedIn, fetchOrganizations]);

  const filteredOrganizations = organizations.filter(org =>
    org.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    org.slug.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleSwitchOrg = async (org: Organization) => {
    setSwitching(org.id);
    // In a real app, this would switch the Clerk organization context
    // For now, we'll just navigate to the org settings
    setTimeout(() => {
      router.push(`/organizations/${org.id}/settings`);
      setSwitching(null);
    }, 500);
  };

  if (!isLoaded || loading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 lg:ml-64 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading organizations...</p>
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
              <Building2 className="h-5 w-5 text-primary" />
              Organizations
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage your organizations and team workspaces
            </p>
          </div>
          <Button onClick={() => router.push('/organizations/new')}>
            <Plus className="mr-2 h-4 w-4" />
            New Organization
          </Button>
        </header>

        <div className="p-6 space-y-6">
          {/* Search */}
          <div className="flex items-center gap-4">
            <div className="relative flex-1 max-w-md">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search organizations..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9"
              />
            </div>
          </div>

          {/* Organizations Grid */}
          {filteredOrganizations.length === 0 ? (
            <Card>
              <CardContent className="flex flex-col items-center justify-center py-12">
                <Building2 className="h-12 w-12 text-muted-foreground mb-4 opacity-50" />
                {organizations.length === 0 ? (
                  <>
                    <h3 className="text-lg font-semibold mb-2">No organizations yet</h3>
                    <p className="text-muted-foreground text-center mb-4">
                      Create your first organization to start collaborating with your team
                    </p>
                    <Button onClick={() => router.push('/organizations/new')}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Organization
                    </Button>
                  </>
                ) : (
                  <>
                    <h3 className="text-lg font-semibold mb-2">No results found</h3>
                    <p className="text-muted-foreground text-center">
                      No organizations match your search for &quot;{searchQuery}&quot;
                    </p>
                  </>
                )}
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredOrganizations.map((org) => {
                const planConfig = PLAN_CONFIG[org.plan] || PLAN_CONFIG.free;
                const roleConfig = ROLE_CONFIG[org.role] || ROLE_CONFIG.member;
                const RoleIcon = roleConfig.icon;
                const PlanIcon = planConfig.icon;
                const isCurrentOrg = org.id === orgId;

                return (
                  <Card
                    key={org.id}
                    className={cn(
                      'group hover:border-primary/50 hover:shadow-md transition-all cursor-pointer',
                      isCurrentOrg && 'ring-2 ring-primary'
                    )}
                    onClick={() => handleSwitchOrg(org)}
                  >
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className="flex items-center gap-3">
                          {org.logo_url ? (
                            <img
                              src={org.logo_url}
                              alt={org.name}
                              className="h-12 w-12 rounded-lg object-cover"
                            />
                          ) : (
                            <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center">
                              <Building2 className="h-6 w-6 text-primary" />
                            </div>
                          )}
                          <div>
                            <CardTitle className="text-lg flex items-center gap-2">
                              {org.name}
                              {isCurrentOrg && (
                                <CheckCircle className="h-4 w-4 text-primary" />
                              )}
                            </CardTitle>
                            <CardDescription className="flex items-center gap-1">
                              <span>{org.slug}</span>
                            </CardDescription>
                          </div>
                        </div>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="opacity-0 group-hover:opacity-100 transition-opacity"
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(`/organizations/${org.id}/settings`);
                          }}
                        >
                          <Settings className="h-4 w-4" />
                        </Button>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        {/* Plan Badge */}
                        <div className={cn('flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium', planConfig.color)}>
                          <PlanIcon className="h-3.5 w-3.5" />
                          {planConfig.label}
                        </div>

                        {/* Role Badge */}
                        <div className="flex items-center gap-1.5 text-sm text-muted-foreground">
                          <RoleIcon className={cn('h-4 w-4', roleConfig.color)} />
                          <span>{roleConfig.label}</span>
                        </div>
                      </div>

                      {/* Stats */}
                      <div className="mt-4 pt-3 border-t flex items-center justify-between text-sm">
                        <div className="flex items-center gap-1.5">
                          <Users className="h-4 w-4 text-muted-foreground" />
                          <span>{org.member_count} {org.member_count === 1 ? 'member' : 'members'}</span>
                        </div>
                        {switching === org.id ? (
                          <Loader2 className="h-4 w-4 animate-spin text-primary" />
                        ) : (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 px-2 text-xs"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleSwitchOrg(org);
                            }}
                          >
                            {isCurrentOrg ? 'Current' : 'Switch'}
                            <ExternalLink className="ml-1 h-3 w-3" />
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                );
              })}

              {/* Create New Card */}
              <Card
                className="border-2 border-dashed hover:border-primary/50 cursor-pointer transition-all flex items-center justify-center min-h-[200px]"
                onClick={() => router.push('/organizations/new')}
              >
                <CardContent className="flex flex-col items-center justify-center py-8 text-muted-foreground hover:text-primary transition-colors">
                  <Plus className="h-8 w-8 mb-2" />
                  <span className="font-medium">Create New Organization</span>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
