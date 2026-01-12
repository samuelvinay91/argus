'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@clerk/nextjs';
import dynamic from 'next/dynamic';
import {
  FileText,
  Shield,
  Key,
  ExternalLink,
  Copy,
  Check,
  RefreshCw,
  Download,
  Server,
} from 'lucide-react';
import { Button } from '@/components/ui/button';

// Dynamically import SwaggerUI to avoid SSR issues
const SwaggerUI = dynamic(() => import('swagger-ui-react'), {
  ssr: false,
  loading: () => (
    <div className="flex items-center justify-center h-96">
      <div className="flex flex-col items-center gap-4">
        <RefreshCw className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground">Loading API Documentation...</p>
      </div>
    </div>
  ),
});

// Import Swagger UI styles
import 'swagger-ui-react/swagger-ui.css';

const BACKEND_URL = process.env.NEXT_PUBLIC_ARGUS_BACKEND_URL || 'http://localhost:8000';

export default function ApiDocsPage() {
  const { getToken, isLoaded, isSignedIn } = useAuth();
  const [token, setToken] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);

  // Fetch token on mount
  useEffect(() => {
    async function fetchToken() {
      if (isLoaded && isSignedIn) {
        const jwt = await getToken();
        setToken(jwt);
      }
    }
    fetchToken();
  }, [isLoaded, isSignedIn, getToken]);

  // Copy token to clipboard
  const copyToken = async () => {
    if (token) {
      await navigator.clipboard.writeText(token);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  // Swagger UI request interceptor to add auth
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const requestInterceptor = (req: any) => {
    if (token && req.headers) {
      req.headers['Authorization'] = `Bearer ${token}`;
    }
    return req;
  };

  // Download OpenAPI spec
  const downloadSpec = () => {
    window.open(`${BACKEND_URL}/openapi.json`, '_blank');
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                <FileText className="h-5 w-5 text-primary" />
              </div>
              <div>
                <h1 className="text-xl font-semibold">API Documentation</h1>
                <p className="text-sm text-muted-foreground">
                  Interactive API explorer with automatic authentication
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              {/* Server Status */}
              <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 text-emerald-600 text-sm">
                <Server className="h-3.5 w-3.5" />
                <span>Connected</span>
              </div>

              {/* Download Spec */}
              <Button variant="outline" size="sm" onClick={downloadSpec}>
                <Download className="h-4 w-4 mr-2" />
                Download OpenAPI
              </Button>

              {/* External Docs Link */}
              <Button variant="outline" size="sm" asChild>
                <a href={`${BACKEND_URL}/redoc`} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4 mr-2" />
                  ReDoc
                </a>
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Auth Status Bar */}
      <div className="border-b border-border bg-muted/30">
        <div className="max-w-[1800px] mx-auto px-6 py-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              {/* Auth Status */}
              <div className="flex items-center gap-2">
                <Shield className={`h-4 w-4 ${isSignedIn ? 'text-emerald-500' : 'text-amber-500'}`} />
                <span className="text-sm">
                  {isSignedIn ? (
                    <span className="text-emerald-600 font-medium">Authenticated</span>
                  ) : (
                    <span className="text-amber-600 font-medium">Not authenticated</span>
                  )}
                </span>
              </div>

              {/* Token Info */}
              {token && (
                <div className="flex items-center gap-2">
                  <Key className="h-4 w-4 text-muted-foreground" />
                  <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                    Bearer {token.slice(0, 20)}...
                  </code>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 w-7 p-0"
                    onClick={copyToken}
                  >
                    {copied ? (
                      <Check className="h-3.5 w-3.5 text-emerald-500" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </Button>
                </div>
              )}
            </div>

            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <span>API Base:</span>
              <code className="bg-muted px-2 py-1 rounded font-mono text-xs">
                {BACKEND_URL}
              </code>
            </div>
          </div>
        </div>
      </div>

      {/* Info Cards */}
      <div className="max-w-[1800px] mx-auto px-6 py-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-blue-500/10">
                <Shield className="h-4 w-4 text-blue-500" />
              </div>
              <h3 className="font-medium">Auto-Authentication</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Your Clerk JWT token is automatically injected into all API requests.
              No need to manually add headers.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-emerald-500/10">
                <FileText className="h-4 w-4 text-emerald-500" />
              </div>
              <h3 className="font-medium">Try It Out</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              Click any endpoint, then "Try it out" to execute real API calls
              against your account with proper authorization.
            </p>
          </div>

          <div className="rounded-lg border border-border bg-card p-4">
            <div className="flex items-center gap-3 mb-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-500/10">
                <Key className="h-4 w-4 text-purple-500" />
              </div>
              <h3 className="font-medium">SOC2 Compliant</h3>
            </div>
            <p className="text-sm text-muted-foreground">
              All API calls are audited and logged. Rate limiting and security
              headers are enforced automatically.
            </p>
          </div>
        </div>
      </div>

      {/* Swagger UI */}
      <div className="max-w-[1800px] mx-auto px-6 pb-8">
        <div className="rounded-lg border border-border bg-card overflow-hidden">
          <style jsx global>{`
            /* Custom Swagger UI Theme */
            .swagger-ui {
              font-family: inherit;
            }
            .swagger-ui .topbar {
              display: none;
            }
            .swagger-ui .info {
              margin: 20px 0;
            }
            .swagger-ui .info .title {
              font-size: 1.5rem;
              font-weight: 600;
            }
            .swagger-ui .info .description {
              font-size: 0.875rem;
            }
            .swagger-ui .opblock-tag {
              font-size: 1rem;
              font-weight: 600;
              border-bottom: 1px solid hsl(var(--border));
            }
            .swagger-ui .opblock {
              border-radius: 8px;
              border: 1px solid hsl(var(--border));
              margin-bottom: 8px;
              box-shadow: none;
            }
            .swagger-ui .opblock .opblock-summary {
              border-radius: 8px;
            }
            .swagger-ui .opblock.opblock-get {
              border-color: #61affe;
              background: rgba(97, 175, 254, 0.05);
            }
            .swagger-ui .opblock.opblock-post {
              border-color: #49cc90;
              background: rgba(73, 204, 144, 0.05);
            }
            .swagger-ui .opblock.opblock-put {
              border-color: #fca130;
              background: rgba(252, 161, 48, 0.05);
            }
            .swagger-ui .opblock.opblock-delete {
              border-color: #f93e3e;
              background: rgba(249, 62, 62, 0.05);
            }
            .swagger-ui .opblock.opblock-patch {
              border-color: #50e3c2;
              background: rgba(80, 227, 194, 0.05);
            }
            .swagger-ui .btn {
              border-radius: 6px;
            }
            .swagger-ui .btn.execute {
              background-color: hsl(var(--primary));
              border-color: hsl(var(--primary));
            }
            .swagger-ui .btn.execute:hover {
              opacity: 0.9;
            }
            .swagger-ui select {
              border-radius: 6px;
            }
            .swagger-ui input[type=text],
            .swagger-ui textarea {
              border-radius: 6px;
            }
            .swagger-ui .model-box {
              border-radius: 8px;
            }
            .swagger-ui section.models {
              border: 1px solid hsl(var(--border));
              border-radius: 8px;
            }
            .swagger-ui section.models h4 {
              font-size: 1rem;
              font-weight: 600;
            }
            /* Dark mode support */
            @media (prefers-color-scheme: dark) {
              .swagger-ui,
              .swagger-ui .opblock .opblock-section-header,
              .swagger-ui .opblock-description-wrapper p,
              .swagger-ui .opblock .opblock-summary-description,
              .swagger-ui .response-col_description__inner p,
              .swagger-ui table thead tr td,
              .swagger-ui table thead tr th,
              .swagger-ui .parameter__name,
              .swagger-ui .parameter__type,
              .swagger-ui .response-col_status,
              .swagger-ui .tab li,
              .swagger-ui .opblock-tag,
              .swagger-ui .info .title,
              .swagger-ui .info li,
              .swagger-ui .info p,
              .swagger-ui .info h1,
              .swagger-ui .info h2,
              .swagger-ui .info h3,
              .swagger-ui .info h4,
              .swagger-ui .info h5 {
                color: hsl(var(--foreground));
              }
              .swagger-ui .opblock .opblock-section-header {
                background: hsl(var(--muted));
              }
              .swagger-ui input[type=text],
              .swagger-ui textarea,
              .swagger-ui select {
                background: hsl(var(--background));
                color: hsl(var(--foreground));
                border-color: hsl(var(--border));
              }
              .swagger-ui .model-toggle::after {
                background: hsl(var(--foreground));
              }
              .swagger-ui section.models {
                background: hsl(var(--card));
              }
              .swagger-ui section.models .model-container {
                background: hsl(var(--muted));
              }
            }
          `}</style>

          {isLoaded ? (
            <SwaggerUI
              url={`${BACKEND_URL}/openapi.json`}
              requestInterceptor={requestInterceptor}
              docExpansion="list"
              defaultModelsExpandDepth={1}
              displayRequestDuration={true}
              filter={true}
              showExtensions={true}
              showCommonExtensions={true}
              tryItOutEnabled={true}
              persistAuthorization={true}
              withCredentials={true}
            />
          ) : (
            <div className="flex items-center justify-center h-96">
              <div className="flex flex-col items-center gap-4">
                <RefreshCw className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Loading authentication...</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
