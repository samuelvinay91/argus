'use client';

import { useState, useEffect, useCallback } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Key,
  Plus,
  Copy,
  RefreshCw,
  Trash2,
  Clock,
  CheckCircle,
  AlertTriangle,
  Shield,
  Loader2,
  AlertCircle,
  X,
  LogIn,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthApi } from '@/lib/hooks/use-auth-api';
import { SignInButton } from '@clerk/nextjs';

interface APIKey {
  id: string;
  name: string;
  key_prefix: string;
  scopes: string[];
  last_used_at: string | null;
  request_count: number;
  expires_at: string | null;
  revoked_at: string | null;
  created_at: string;
  is_active: boolean;
}

const AVAILABLE_SCOPES = [
  { id: 'read', label: 'Read', description: 'Read-only access to data' },
  { id: 'write', label: 'Write', description: 'Create and modify data' },
  { id: 'admin', label: 'Admin', description: 'Administrative operations' },
  { id: 'webhooks', label: 'Webhooks', description: 'Receive webhook events' },
  { id: 'tests', label: 'Tests', description: 'Run and manage tests' },
];

export default function APIKeysPage() {
  const { fetchJson, isLoaded, isSignedIn, orgId, backendUrl } = useAuthApi();

  const [keys, setKeys] = useState<APIKey[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showNewKey, setShowNewKey] = useState<string | null>(null);
  const [newKeyName, setNewKeyName] = useState('');
  const [newKeyScopes, setNewKeyScopes] = useState<string[]>(['read', 'write']);
  const [newKeyExpires, setNewKeyExpires] = useState<number | null>(null);
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [actionLoading, setActionLoading] = useState<string | null>(null);

  // Use org ID from Clerk, fallback to 'default' for backwards compatibility
  const organizationId = orgId || 'default';

  const fetchKeys = useCallback(async () => {
    if (!isSignedIn) return;

    try {
      const response = await fetchJson<APIKey[]>(
        `/api/v1/api-keys/organizations/${organizationId}/keys`
      );
      if (response.data) {
        setKeys(Array.isArray(response.data) ? response.data : []);
        setError(null);
      } else if (response.error) {
        console.error('Failed to fetch API keys:', response.error);
        // Don't show error for 401 - user needs to sign in
        if (response.status !== 401) {
          setError(response.error);
        }
      }
    } catch (err) {
      console.error('Failed to fetch API keys:', err);
    }
  }, [fetchJson, organizationId, isSignedIn]);

  useEffect(() => {
    if (!isLoaded) return;

    const loadData = async () => {
      setLoading(true);
      if (isSignedIn) {
        await fetchKeys();
      }
      setLoading(false);
    };
    loadData();
  }, [fetchKeys, isLoaded, isSignedIn]);

  const activeKeys = keys.filter(k => k.is_active);
  const revokedKeys = keys.filter(k => !k.is_active);

  const handleCreateKey = async () => {
    if (!newKeyName) return;

    setCreating(true);
    setError(null);

    try {
      const response = await fetchJson<{ key: string; id: string; name: string; key_prefix: string; scopes: string[]; expires_at: string | null; created_at: string }>(
        `/api/v1/api-keys/organizations/${organizationId}/keys`,
        {
          method: 'POST',
          body: JSON.stringify({
            name: newKeyName,
            scopes: newKeyScopes,
            expires_in_days: newKeyExpires,
          }),
        }
      );

      if (response.data) {
        // Store the full key to show to the user (only time it's visible)
        setShowNewKey(response.data.key);
        // Add the key to state (without full key)
        const newKey: APIKey = {
          id: response.data.id,
          name: response.data.name,
          key_prefix: response.data.key_prefix,
          scopes: response.data.scopes,
          last_used_at: null,
          request_count: 0,
          expires_at: response.data.expires_at,
          revoked_at: null,
          created_at: response.data.created_at,
          is_active: true,
        };
        setKeys([newKey, ...keys]);
        setNewKeyName('');
        setNewKeyScopes(['read', 'write']);
        setNewKeyExpires(null);
        setShowCreateModal(false);
      } else {
        setError(response.error || 'Failed to create API key');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setCreating(false);
    }
  };

  const handleRevokeKey = async (keyId: string) => {
    setActionLoading(keyId);
    setError(null);

    try {
      const response = await fetchJson<{ message: string }>(
        `/api/v1/api-keys/organizations/${organizationId}/keys/${keyId}`,
        { method: 'DELETE' }
      );

      if (response.status === 200 || response.status === 204 || response.data) {
        setKeys(keys.map(k =>
          k.id === keyId
            ? { ...k, is_active: false, revoked_at: new Date().toISOString() }
            : k
        ));
      } else {
        setError(response.error || 'Failed to revoke API key');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setActionLoading(null);
    }
  };

  const handleRotateKey = async (keyId: string) => {
    setActionLoading(keyId);
    setError(null);

    try {
      const response = await fetchJson<{ key: string; new_key: APIKey }>(
        `/api/v1/api-keys/organizations/${organizationId}/keys/${keyId}/rotate`,
        { method: 'POST' }
      );

      if (response.data) {
        // Show the new key
        setShowNewKey(response.data.key);
        // Update keys list
        setKeys([
          response.data.new_key,
          ...keys.map(k =>
            k.id === keyId
              ? { ...k, is_active: false, revoked_at: new Date().toISOString() }
              : k
          ),
        ]);
      } else {
        setError(response.error || 'Failed to rotate API key');
      }
    } catch (err) {
      setError('Failed to connect to server');
    } finally {
      setActionLoading(null);
    }
  };

  const copyToClipboard = (text: string, keyId?: string) => {
    navigator.clipboard.writeText(text);
    setCopiedKey(keyId || 'new');
    setTimeout(() => setCopiedKey(null), 2000);
  };

  const toggleScope = (scope: string) => {
    if (newKeyScopes.includes(scope)) {
      setNewKeyScopes(newKeyScopes.filter(s => s !== scope));
    } else {
      setNewKeyScopes([...newKeyScopes, scope]);
    }
  };

  // Show loading state
  if (!isLoaded || loading) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 lg:ml-64 flex items-center justify-center">
          <div className="flex flex-col items-center gap-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
            <p className="text-muted-foreground">Loading API keys...</p>
          </div>
        </main>
      </div>
    );
  }

  // Show sign-in prompt if not authenticated
  if (!isSignedIn) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 lg:ml-64 flex items-center justify-center">
          <Card className="w-full max-w-md">
            <CardHeader className="text-center">
              <div className="mx-auto w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                <Key className="h-6 w-6 text-primary" />
              </div>
              <CardTitle>Sign In Required</CardTitle>
              <CardDescription>
                You need to sign in to manage API keys
              </CardDescription>
            </CardHeader>
            <CardContent className="flex justify-center">
              <SignInButton mode="modal">
                <Button size="lg">
                  <LogIn className="mr-2 h-4 w-4" />
                  Sign In
                </Button>
              </SignInButton>
            </CardContent>
          </Card>
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
              <Key className="h-5 w-5 text-primary" />
              API Keys
            </h1>
            <p className="text-sm text-muted-foreground">
              Manage API keys for programmatic access
            </p>
          </div>
          <Button onClick={() => setShowCreateModal(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Create API Key
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

          {/* New Key Alert */}
          {showNewKey && (
            <Card className="border-amber-500/50 bg-amber-500/5">
              <CardContent className="pt-6">
                <div className="flex items-start gap-4">
                  <AlertTriangle className="h-6 w-6 text-amber-500 flex-shrink-0" />
                  <div className="flex-1">
                    <h3 className="font-semibold text-amber-500">Save Your API Key</h3>
                    <p className="text-sm text-muted-foreground mt-1">
                      This is the only time you will see this key. Copy it now and store it securely.
                    </p>
                    <div className="flex items-center gap-2 mt-3">
                      <code className="flex-1 px-3 py-2 rounded bg-muted font-mono text-sm break-all">
                        {showNewKey}
                      </code>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => copyToClipboard(showNewKey)}
                      >
                        {copiedKey === 'new' ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <Copy className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="mt-3"
                      onClick={() => setShowNewKey(null)}
                    >
                      I've saved this key
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Active Keys */}
          <Card>
            <CardHeader>
              <CardTitle>Active Keys</CardTitle>
              <CardDescription>
                {activeKeys.length} active API {activeKeys.length === 1 ? 'key' : 'keys'}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {activeKeys.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  <Key className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No active API keys</p>
                  <Button
                    variant="outline"
                    className="mt-4"
                    onClick={() => setShowCreateModal(true)}
                  >
                    Create your first key
                  </Button>
                </div>
              ) : (
                <div className="divide-y">
                  {activeKeys.map((key) => (
                    <div key={key.id} className="py-4 first:pt-0 last:pb-0">
                      <div className="flex items-start justify-between">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <span className="font-medium">{key.name}</span>
                            <code className="px-2 py-0.5 rounded bg-muted text-xs font-mono">
                              {key.key_prefix}...
                            </code>
                          </div>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {key.scopes.map((scope) => (
                              <span
                                key={scope}
                                className="px-2 py-0.5 text-xs rounded-full bg-primary/10 text-primary"
                              >
                                {scope}
                              </span>
                            ))}
                          </div>
                          <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3.5 w-3.5" />
                              {key.last_used_at
                                ? `Last used ${new Date(key.last_used_at).toLocaleDateString()}`
                                : 'Never used'}
                            </span>
                            <span>{key.request_count.toLocaleString()} requests</span>
                            {key.expires_at && (
                              <span className="text-amber-500">
                                Expires {new Date(key.expires_at).toLocaleDateString()}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleRotateKey(key.id)}
                            disabled={actionLoading === key.id}
                          >
                            {actionLoading === key.id ? (
                              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <RefreshCw className="mr-2 h-3.5 w-3.5" />
                            )}
                            Rotate
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            className="text-red-500 hover:bg-red-500/10"
                            onClick={() => handleRevokeKey(key.id)}
                            disabled={actionLoading === key.id}
                          >
                            {actionLoading === key.id ? (
                              <Loader2 className="mr-2 h-3.5 w-3.5 animate-spin" />
                            ) : (
                              <Trash2 className="mr-2 h-3.5 w-3.5" />
                            )}
                            Revoke
                          </Button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Revoked Keys */}
          {revokedKeys.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="text-muted-foreground">Revoked Keys</CardTitle>
                <CardDescription>
                  {revokedKeys.length} revoked {revokedKeys.length === 1 ? 'key' : 'keys'}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="divide-y">
                  {revokedKeys.map((key) => (
                    <div key={key.id} className="py-4 first:pt-0 last:pb-0 opacity-60">
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="font-medium line-through">{key.name}</span>
                            <code className="px-2 py-0.5 rounded bg-muted text-xs font-mono">
                              {key.key_prefix}...
                            </code>
                            <span className="px-2 py-0.5 text-xs rounded-full bg-red-500/10 text-red-500">
                              Revoked
                            </span>
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">
                            Revoked {key.revoked_at ? new Date(key.revoked_at).toLocaleDateString() : 'Unknown'}
                          </p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Security Tips */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Shield className="h-5 w-5" />
                Security Best Practices
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Rotate API keys regularly, especially for production environments</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Use the minimum required scopes for each key</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Never commit API keys to version control</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <span>Set expiration dates for keys used in CI/CD pipelines</span>
                </li>
              </ul>
            </CardContent>
          </Card>
        </div>

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
            <Card className="w-full max-w-lg">
              <CardHeader>
                <CardTitle>Create API Key</CardTitle>
                <CardDescription>
                  Create a new API key for programmatic access
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Key Name</label>
                  <Input
                    placeholder="e.g., Production API Key"
                    value={newKeyName}
                    onChange={(e) => setNewKeyName(e.target.value)}
                    className="mt-1"
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Permissions</label>
                  <div className="grid grid-cols-2 gap-2 mt-2">
                    {AVAILABLE_SCOPES.map((scope) => (
                      <button
                        key={scope.id}
                        onClick={() => toggleScope(scope.id)}
                        className={cn(
                          "flex flex-col items-start p-3 rounded-lg border text-left transition-colors",
                          newKeyScopes.includes(scope.id)
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-muted"
                        )}
                      >
                        <span className="font-medium text-sm">{scope.label}</span>
                        <span className="text-xs text-muted-foreground">{scope.description}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div>
                  <label className="text-sm font-medium">Expiration (optional)</label>
                  <div className="grid grid-cols-4 gap-2 mt-2">
                    {[
                      { days: null, label: 'Never' },
                      { days: 30, label: '30 days' },
                      { days: 90, label: '90 days' },
                      { days: 365, label: '1 year' },
                    ].map((option) => (
                      <button
                        key={option.label}
                        onClick={() => setNewKeyExpires(option.days)}
                        className={cn(
                          "px-3 py-2 rounded-lg border text-sm transition-colors",
                          newKeyExpires === option.days
                            ? "border-primary bg-primary/5"
                            : "border-border hover:bg-muted"
                        )}
                      >
                        {option.label}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2 pt-4">
                  <Button
                    variant="outline"
                    className="flex-1"
                    onClick={() => setShowCreateModal(false)}
                    disabled={creating}
                  >
                    Cancel
                  </Button>
                  <Button
                    className="flex-1"
                    onClick={handleCreateKey}
                    disabled={!newKeyName || newKeyScopes.length === 0 || creating}
                  >
                    {creating ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Creating...
                      </>
                    ) : (
                      'Create Key'
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
