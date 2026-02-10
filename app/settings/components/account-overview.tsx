'use client';

import { useMemo } from 'react';
import {
  Calendar,
  Building2,
  Key,
  Activity,
  Crown,
  Users,
  Star,
  ExternalLink,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAccountActivity, type OrganizationSummary } from '@/lib/hooks/use-user-profile';

interface AccountOverviewProps {
  /** Override the activity data (useful for testing) */
  activity?: {
    memberSince: string;
    organizationsCount: number;
    apiKeysCount: number;
    apiRequests30d: number;
    organizations: OrganizationSummary[];
  } | null;
  /** Override loading state */
  loading?: boolean;
  /** Override error state */
  error?: string | null;
}

/**
 * Format a date string to a human-readable format
 */
function formatDate(dateString: string): string {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
}

/**
 * Get role badge color based on role
 */
function getRoleBadgeVariant(role: string): 'default' | 'secondary' | 'destructive' | 'outline' {
  switch (role.toLowerCase()) {
    case 'owner':
      return 'default';
    case 'admin':
      return 'secondary';
    case 'member':
      return 'outline';
    default:
      return 'outline';
  }
}

/**
 * Get role icon
 */
function getRoleIcon(role: string) {
  switch (role.toLowerCase()) {
    case 'owner':
      return <Crown className="h-3 w-3" />;
    case 'admin':
      return <Star className="h-3 w-3" />;
    default:
      return <Users className="h-3 w-3" />;
  }
}

/**
 * Stat Card Component
 */
function StatCard({
  icon: Icon,
  label,
  value,
  description,
}: {
  icon: React.ElementType;
  label: string;
  value: string | number;
  description?: string;
}) {
  return (
    <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
      <div className="p-3 rounded-full bg-primary/10">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="text-2xl font-semibold">{value}</p>
        {description && (
          <p className="text-xs text-muted-foreground">{description}</p>
        )}
      </div>
    </div>
  );
}

/**
 * Loading skeleton for the account overview
 */
function AccountOverviewSkeleton() {
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-48" />
          <Skeleton className="h-4 w-64" />
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[...Array(4)].map((_, i) => (
              <div key={i} className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
                <Skeleton className="h-11 w-11 rounded-full" />
                <div className="space-y-2">
                  <Skeleton className="h-4 w-20" />
                  <Skeleton className="h-6 w-16" />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-40" />
          <Skeleton className="h-4 w-56" />
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {[...Array(2)].map((_, i) => (
              <Skeleton key={i} className="h-16 w-full" />
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

/**
 * Account Overview Component
 *
 * Displays user account statistics and organization memberships.
 */
export function AccountOverview({
  activity: activityOverride,
  loading: loadingOverride,
  error: errorOverride,
}: AccountOverviewProps) {
  // Use the hook if no override is provided
  const {
    activity: hookActivity,
    isLoading: hookLoading,
    error: hookError,
  } = useAccountActivity();

  // Use overrides or hook data
  const activity = activityOverride ?? hookActivity;
  const loading = loadingOverride ?? hookLoading;
  const error = errorOverride ?? hookError;

  // Compute stats
  const stats = useMemo(() => {
    if (!activity) return null;

    return {
      memberSince: formatDate(activity.memberSince),
      organizationsCount: activity.organizationsCount,
      apiKeysCount: activity.apiKeysCount,
      apiRequests30d: activity.apiRequests30d,
    };
  }, [activity]);

  if (loading) {
    return <AccountOverviewSkeleton />;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">
            <p className="text-muted-foreground">Failed to load account overview</p>
            <p className="text-sm text-red-500 mt-1">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (!activity || !stats) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center text-muted-foreground">
            No account data available
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Stats Overview */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Activity className="h-5 w-5" />
            Account Overview
          </CardTitle>
          <CardDescription>
            Your account statistics and activity summary
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <StatCard
              icon={Calendar}
              label="Member Since"
              value={stats.memberSince}
            />
            <StatCard
              icon={Building2}
              label="Organizations"
              value={stats.organizationsCount}
              description={stats.organizationsCount === 1 ? 'organization' : 'organizations'}
            />
            <StatCard
              icon={Key}
              label="API Keys"
              value={stats.apiKeysCount}
              description="active keys"
            />
            <StatCard
              icon={Activity}
              label="API Requests"
              value={stats.apiRequests30d.toLocaleString()}
              description="last 30 days"
            />
          </div>
        </CardContent>
      </Card>

      {/* Organizations List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            Organizations
          </CardTitle>
          <CardDescription>
            Teams and workspaces you belong to
          </CardDescription>
        </CardHeader>
        <CardContent>
          {activity.organizations.length === 0 ? (
            <div className="text-center py-8">
              <Building2 className="h-12 w-12 mx-auto text-muted-foreground/50 mb-3" />
              <p className="text-muted-foreground">No organizations yet</p>
              <p className="text-sm text-muted-foreground mt-1">
                Create or join an organization to collaborate with your team
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {activity.organizations.map((org) => (
                <div
                  key={org.id}
                  className="flex items-center justify-between p-4 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    {/* Organization Icon */}
                    <div className="p-2 rounded-lg bg-primary/10">
                      <Building2 className="h-5 w-5 text-primary" />
                    </div>

                    {/* Organization Info */}
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-medium">{org.name}</span>
                        {org.isDefault && (
                          <Badge variant="secondary" className="text-xs">
                            Default
                          </Badge>
                        )}
                        {org.isPersonal && (
                          <Badge variant="outline" className="text-xs">
                            Personal
                          </Badge>
                        )}
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {org.memberCount} {org.memberCount === 1 ? 'member' : 'members'}
                      </p>
                    </div>
                  </div>

                  {/* Role and Plan Badges */}
                  <div className="flex items-center gap-2">
                    <Badge
                      variant={getRoleBadgeVariant(org.role)}
                      className="gap-1"
                    >
                      {getRoleIcon(org.role)}
                      {org.role.charAt(0).toUpperCase() + org.role.slice(1)}
                    </Badge>
                    <Badge variant="outline" className="capitalize">
                      {org.plan}
                    </Badge>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Manage Organizations Button */}
          <div className="mt-4 pt-4 border-t">
            <Button
              variant="outline"
              className="w-full"
              onClick={() => window.open('https://accounts.skopaq.ai/user/organization-membership', '_blank')}
            >
              <ExternalLink className="h-4 w-4 mr-2" />
              Manage Organizations in Clerk
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default AccountOverview;
