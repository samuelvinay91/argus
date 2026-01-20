'use client';

import { useRouter } from 'next/navigation';
import {
  Building,
  Crown,
  Users,
  CreditCard,
  Settings,
  Plus,
  ExternalLink,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { LoadingSpinner, ErrorMessage, getPlanBadgeColor } from './settings-ui';
import { cn } from '@/lib/utils';

interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: string;
  logo_url?: string;
}

interface OrganizationSectionProps {
  organization: Organization | null;
  loading: boolean;
  error: string | null;
}

export function OrganizationSection({
  organization,
  loading,
  error,
}: OrganizationSectionProps) {
  const router = useRouter();

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  if (!organization) {
    return (
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
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Building className="h-5 w-5" />
          Organization Details
        </CardTitle>
        <CardDescription>View and manage your organization</CardDescription>
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
            <span
              className={cn(
                'mt-1 inline-block px-2 py-0.5 rounded-full text-xs font-medium',
                getPlanBadgeColor(organization.plan)
              )}
            >
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
                <div className="font-medium">
                  {organization.plan?.toUpperCase() || 'Free'} Plan
                </div>
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
  );
}

export { type Organization as OrganizationData };
