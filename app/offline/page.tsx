'use client';

import { WifiOff, RefreshCw, Home } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function OfflinePage() {
  const handleRetry = () => {
    window.location.reload();
  };

  const handleGoHome = () => {
    window.location.href = '/dashboard';
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-background">
      <div className="text-center max-w-md">
        {/* Offline Icon */}
        <div className="h-20 w-20 rounded-full bg-muted flex items-center justify-center mx-auto mb-6">
          <WifiOff className="h-10 w-10 text-muted-foreground" />
        </div>

        {/* Title */}
        <h1 className="text-2xl font-semibold tracking-tight mb-2">
          You&apos;re offline
        </h1>

        {/* Description */}
        <p className="text-muted-foreground mb-8">
          It looks like you&apos;ve lost your internet connection.
          Some features may not be available until you&apos;re back online.
        </p>

        {/* What you can still do */}
        <div className="bg-card rounded-xl border p-4 mb-8 text-left">
          <h2 className="font-medium mb-3">What you can still do:</h2>
          <ul className="space-y-2 text-sm text-muted-foreground">
            <li className="flex items-start gap-2">
              <span className="text-success mt-0.5">•</span>
              View recently cached pages
            </li>
            <li className="flex items-start gap-2">
              <span className="text-success mt-0.5">•</span>
              Browse previously loaded test results
            </li>
            <li className="flex items-start gap-2">
              <span className="text-success mt-0.5">•</span>
              Access cached dashboard data
            </li>
          </ul>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Button
            onClick={handleRetry}
            className="h-11 touch-target"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Try Again
          </Button>
          <Button
            variant="outline"
            onClick={handleGoHome}
            className="h-11 touch-target"
          >
            <Home className="h-4 w-4 mr-2" />
            Go to Dashboard
          </Button>
        </div>

        {/* Tip */}
        <p className="text-xs text-muted-foreground mt-8">
          Tip: Argus works best with an internet connection, but cached data
          will be available when offline.
        </p>
      </div>
    </div>
  );
}
