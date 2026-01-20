'use client';

import { useState } from 'react';
import {
  Key,
  Plus,
  Copy,
  Trash2,
  CheckCircle,
  Loader2,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { LoadingSpinner, ErrorMessage } from './settings-ui';
import { cn } from '@/lib/utils';
import { toast } from '@/lib/hooks/useToast';

interface ApiKey {
  id: string;
  name: string;
  key_prefix: string;
  created_at: string;
  last_used_at?: string | null;
  is_active: boolean;
}

interface CreateApiKeyResult {
  key: string;
}

interface ApiKeysSectionProps {
  apiKeys: ApiKey[] | undefined;
  loading: boolean;
  error: boolean;
  isCreating: boolean;
  isRevoking: boolean;
  onCreateKey: (params: { name: string; scopes: string[] }) => Promise<CreateApiKeyResult | undefined>;
  onRevokeKey: (keyId: string) => void;
}

export function ApiKeysSection({
  apiKeys,
  loading,
  error,
  isCreating,
  isRevoking,
  onCreateKey,
  onRevokeKey,
}: ApiKeysSectionProps) {
  const [showNewKeySecret, setShowNewKeySecret] = useState<string | null>(null);
  const [newKeyName, setNewKeyName] = useState('');
  const [showCreateKey, setShowCreateKey] = useState(false);

  const handleCreateApiKey = async () => {
    if (!newKeyName.trim()) return;

    try {
      const result = await onCreateKey({
        name: newKeyName,
        scopes: ['read', 'write'],
      });

      if (result?.key) {
        setShowNewKeySecret(result.key);
        setNewKeyName('');
        setShowCreateKey(false);
        toast.success({
          title: 'API Key Created',
          description: 'Your new API key has been created successfully.',
        });
      }
    } catch (err) {
      toast.error({
        title: 'Failed to create API key',
        description: err instanceof Error ? err.message : 'An unexpected error occurred',
      });
    }
  };

  const handleCopyKey = (key: string) => {
    navigator.clipboard.writeText(key);
    toast.success({
      title: 'Copied!',
      description: 'API key copied to clipboard',
    });
  };

  const handleRevokeKey = (keyId: string) => {
    onRevokeKey(keyId);
    toast.success({
      title: 'API Key Revoked',
      description: 'The API key has been revoked successfully.',
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Key className="h-5 w-5" />
          API Keys
        </CardTitle>
        <CardDescription>
          Manage API keys for programmatic access to Argus
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* New Key Created Alert */}
        {showNewKeySecret && (
          <div className="p-4 rounded-lg bg-green-500/10 border border-green-500/20">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle className="h-5 w-5 text-green-500" />
              <span className="font-medium text-green-500">API Key Created!</span>
            </div>
            <p className="text-sm text-muted-foreground mb-2">
              Copy this key now. You won&apos;t be able to see it again.
            </p>
            <div className="flex gap-2">
              <code className="flex-1 p-2 bg-muted rounded text-sm font-mono break-all">
                {showNewKeySecret}
              </code>
              <Button
                size="sm"
                variant="outline"
                onClick={() => handleCopyKey(showNewKeySecret)}
              >
                <Copy className="h-4 w-4" />
              </Button>
            </div>
            <Button
              size="sm"
              variant="ghost"
              className="mt-2"
              onClick={() => setShowNewKeySecret(null)}
            >
              Dismiss
            </Button>
          </div>
        )}

        {/* Create New Key */}
        {showCreateKey ? (
          <div className="p-4 rounded-lg border">
            <h4 className="font-medium mb-3">Create New API Key</h4>
            <div className="flex gap-2">
              <Input
                value={newKeyName}
                onChange={(e) => setNewKeyName(e.target.value)}
                placeholder="Key name (e.g., CI/CD Pipeline)"
                className="flex-1"
              />
              <Button
                onClick={handleCreateApiKey}
                disabled={isCreating || !newKeyName.trim()}
              >
                {isCreating ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  'Create'
                )}
              </Button>
              <Button variant="outline" onClick={() => setShowCreateKey(false)}>
                Cancel
              </Button>
            </div>
          </div>
        ) : (
          <Button onClick={() => setShowCreateKey(true)}>
            <Plus className="h-4 w-4 mr-2" />
            Create New API Key
          </Button>
        )}

        {/* Existing Keys */}
        {loading ? (
          <LoadingSpinner />
        ) : error ? (
          <ErrorMessage message="Failed to load API keys" />
        ) : apiKeys && apiKeys.length > 0 ? (
          <div className="space-y-3">
            {apiKeys.map((key) => (
              <div
                key={key.id}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div>
                  <div className="font-medium">{key.name}</div>
                  <div className="text-sm text-muted-foreground">
                    {key.key_prefix}••••••• · Created{' '}
                    {new Date(key.created_at).toLocaleDateString()}
                  </div>
                  {key.last_used_at && (
                    <div className="text-xs text-muted-foreground">
                      Last used: {new Date(key.last_used_at).toLocaleDateString()}
                    </div>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <span
                    className={cn(
                      'px-2 py-0.5 rounded-full text-xs',
                      key.is_active
                        ? 'bg-green-500/10 text-green-500'
                        : 'bg-red-500/10 text-red-500'
                    )}
                  >
                    {key.is_active ? 'Active' : 'Revoked'}
                  </span>
                  {key.is_active && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:text-red-600"
                      onClick={() => handleRevokeKey(key.id)}
                      disabled={isRevoking}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-8 text-muted-foreground">
            <Key className="h-10 w-10 mx-auto mb-3 opacity-50" />
            <p>No API keys created yet</p>
            <p className="text-sm">
              Create an API key to access Argus programmatically
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export { type ApiKey };
