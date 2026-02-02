'use client';

import { useMemo } from 'react';
import {
  Link2,
  Key,
  ExternalLink,
  CheckCircle,
  Github,
  Mail,
  Chrome,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import {
  useConnectedAccounts,
  type ConnectedAccount,
} from '@/lib/hooks/use-user-profile';

interface ConnectedAccountsSectionProps {
  /** Override connected accounts data */
  connectedAccounts?: {
    accounts: ConnectedAccount[];
    apiKeysActive: number;
    apiKeysTotal: number;
  } | null;
  /** Override loading state */
  loading?: boolean;
  /** Override error state */
  error?: string | null;
  /** Callback to navigate to API keys section */
  onManageApiKeys?: () => void;
}

/**
 * Get provider icon component
 */
function getProviderIcon(provider: string) {
  switch (provider.toLowerCase()) {
    case 'google':
      return <Chrome className="h-5 w-5" />;
    case 'github':
      return <Github className="h-5 w-5" />;
    case 'email':
      return <Mail className="h-5 w-5" />;
    default:
      return <Link2 className="h-5 w-5" />;
  }
}

/**
 * Get provider brand color class
 */
function getProviderColorClass(provider: string): string {
  switch (provider.toLowerCase()) {
    case 'google':
      return 'bg-red-100 text-red-600 dark:bg-red-900/30 dark:text-red-400';
    case 'github':
      return 'bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200';
    case 'email':
      return 'bg-blue-100 text-blue-600 dark:bg-blue-900/30 dark:text-blue-400';
    default:
      return 'bg-primary/10 text-primary';
  }
}

/**
 * Connected Account Row Component
 */
function ConnectedAccountRow({ account }: { account: ConnectedAccount }) {
  const icon = getProviderIcon(account.provider);
  const colorClass = getProviderColorClass(account.provider);

  return (
    <div className="flex items-center justify-between p-4 rounded-lg border bg-card">
      <div className="flex items-center gap-4">
        {/* Provider Icon */}
        <div className={`p-2.5 rounded-lg ${colorClass}`}>
          {icon}
        </div>

        {/* Provider Info */}
        <div>
          <div className="flex items-center gap-2">
            <span className="font-medium">{account.providerName}</span>
            <Badge variant="outline" className="gap-1 text-green-600">
              <CheckCircle className="h-3 w-3" />
              Connected
            </Badge>
          </div>
          {account.email && (
            <p className="text-sm text-muted-foreground">{account.email}</p>
          )}
        </div>
      </div>

      {/* Manage Link */}
      <Button
        variant="ghost"
        size="sm"
        onClick={() => window.open('https://accounts.heyargus.ai/user/security', '_blank')}
      >
        <ExternalLink className="h-4 w-4" />
        <span className="sr-only">Manage {account.providerName}</span>
      </Button>
    </div>
  );
}

/**
 * Loading skeleton
 */
function ConnectedAccountsSkeleton() {
  return (
    <Card>
      <CardHeader>
        <Skeleton className="h-6 w-48" />
        <Skeleton className="h-4 w-64" />
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-3">
          {[...Array(2)].map((_, i) => (
            <div key={i} className="flex items-center gap-4 p-4 rounded-lg border">
              <Skeleton className="h-10 w-10 rounded-lg" />
              <div className="space-y-2">
                <Skeleton className="h-4 w-32" />
                <Skeleton className="h-3 w-48" />
              </div>
            </div>
          ))}
        </div>

        <div className="pt-4 border-t">
          <Skeleton className="h-6 w-32 mb-3" />
          <div className="flex items-center gap-4 p-4 rounded-lg bg-muted/50">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="space-y-2">
              <Skeleton className="h-4 w-24" />
              <Skeleton className="h-6 w-16" />
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

/**
 * Connected Accounts Section Component
 *
 * Displays OAuth providers linked to the user's account
 * and a summary of API keys.
 */
export function ConnectedAccountsSection({
  connectedAccounts: connectedAccountsOverride,
  loading: loadingOverride,
  error: errorOverride,
  onManageApiKeys,
}: ConnectedAccountsSectionProps) {
  // Use the hook if no override is provided
  const {
    connectedAccounts: hookData,
    isLoading: hookLoading,
    error: hookError,
  } = useConnectedAccounts();

  // Use overrides or hook data
  const connectedAccounts = connectedAccountsOverride ?? hookData;
  const loading = loadingOverride ?? hookLoading;
  const error = errorOverride ?? hookError;

  // Compute stats
  const apiKeyStats = useMemo(() => {
    if (!connectedAccounts) return { active: 0, total: 0 };
    return {
      active: connectedAccounts.apiKeysActive,
      total: connectedAccounts.apiKeysTotal,
    };
  }, [connectedAccounts]);

  if (loading) {
    return <ConnectedAccountsSkeleton />;
  }

  if (error) {
    return (
      <Card>
        <CardContent className="py-8">
          <div className="text-center">
            <p className="text-muted-foreground">Failed to load connected accounts</p>
            <p className="text-sm text-red-500 mt-1">{error}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Link2 className="h-5 w-5" />
          Connected Accounts
        </CardTitle>
        <CardDescription>
          Manage your linked accounts and authentication methods
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* OAuth Providers */}
        <div>
          <h4 className="text-sm font-medium mb-3">Sign-in Methods</h4>

          {!connectedAccounts || connectedAccounts.accounts.length === 0 ? (
            <div className="text-center py-6 rounded-lg border border-dashed">
              <Link2 className="h-10 w-10 mx-auto text-muted-foreground/50 mb-2" />
              <p className="text-muted-foreground">No connected accounts found</p>
            </div>
          ) : (
            <div className="space-y-3">
              {connectedAccounts.accounts.map((account, index) => (
                <ConnectedAccountRow key={`${account.provider}-${index}`} account={account} />
              ))}
            </div>
          )}

          {/* Link to Clerk Security */}
          <Button
            variant="outline"
            className="w-full mt-3"
            onClick={() => window.open('https://accounts.heyargus.ai/user/security', '_blank')}
          >
            <ExternalLink className="h-4 w-4 mr-2" />
            Manage Security Settings in Clerk
          </Button>
        </div>

        {/* API Keys Summary */}
        <div className="pt-4 border-t">
          <h4 className="text-sm font-medium mb-3 flex items-center gap-2">
            <Key className="h-4 w-4" />
            API Keys
          </h4>

          <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
            <div className="flex items-center gap-4">
              <div className="p-3 rounded-full bg-primary/10">
                <Key className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Active API Keys</p>
                <p className="text-2xl font-semibold">
                  {apiKeyStats.active}
                  {apiKeyStats.total > 0 && (
                    <span className="text-sm font-normal text-muted-foreground ml-1">
                      / {apiKeyStats.total} total
                    </span>
                  )}
                </p>
              </div>
            </div>

            <Button
              variant="outline"
              size="sm"
              onClick={onManageApiKeys}
            >
              Manage Keys
            </Button>
          </div>

          <p className="text-xs text-muted-foreground mt-2">
            API keys are used to authenticate programmatic access to the Argus API.
          </p>
        </div>
      </CardContent>
    </Card>
  );
}

export default ConnectedAccountsSection;
