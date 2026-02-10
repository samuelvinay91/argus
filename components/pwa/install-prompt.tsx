'use client';

import * as React from 'react';
import { Download, X, Smartphone, Share } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useIsMobile } from '@/hooks/use-media-query';
import { cn } from '@/lib/utils';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

const STORAGE_KEY = 'argus-pwa-install-dismissed';
const DISMISS_DURATION = 7 * 24 * 60 * 60 * 1000; // 7 days

/**
 * Safe localStorage access - handles private browsing and security policies
 */
function safeGetItem(key: string): string | null {
  try {
    return localStorage.getItem(key);
  } catch {
    // localStorage unavailable (private browsing, security policy, etc.)
    return null;
  }
}

function safeSetItem(key: string, value: string): boolean {
  try {
    localStorage.setItem(key, value);
    return true;
  } catch {
    // localStorage unavailable
    return false;
  }
}

/**
 * Check if PWA features are supported
 */
function isPWASupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator;
}

/**
 * PWAInstallPrompt - Shows install banner for PWA
 *
 * Features:
 * - Detects beforeinstallprompt event (Chrome, Edge, Samsung)
 * - Shows iOS-specific instructions (Safari)
 * - Remembers dismissal for 7 days
 * - Mobile-first design with touch targets
 */
export function PWAInstallPrompt() {
  const isMobile = useIsMobile();
  const [deferredPrompt, setDeferredPrompt] = React.useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = React.useState(false);
  const [isIOS, setIsIOS] = React.useState(false);
  const [isInstalled, setIsInstalled] = React.useState(false);

  // Check if running as PWA
  React.useEffect(() => {
    const checkInstalled = () => {
      // Check display-mode
      const isStandalone = window.matchMedia('(display-mode: standalone)').matches;
      // Check iOS standalone mode
      const isIOSStandalone = ('standalone' in window.navigator) && (window.navigator as Navigator & { standalone: boolean }).standalone;
      setIsInstalled(isStandalone || isIOSStandalone);
    };
    checkInstalled();
  }, []);

  // Detect iOS
  React.useEffect(() => {
    const isIOSDevice = /iPad|iPhone|iPod/.test(navigator.userAgent) && !('MSStream' in window);
    setIsIOS(isIOSDevice);
  }, []);

  // Check if dismissed recently
  React.useEffect(() => {
    // Skip if PWA features not supported
    if (!isPWASupported()) {
      return;
    }

    const dismissed = safeGetItem(STORAGE_KEY);
    if (dismissed) {
      const dismissedAt = parseInt(dismissed, 10);
      if (Date.now() - dismissedAt < DISMISS_DURATION) {
        return; // Still within dismiss period
      }
    }
    // Show prompt after a delay (don't be too aggressive)
    const timer = setTimeout(() => {
      if (!isInstalled) {
        setShowPrompt(true);
      }
    }, 30000); // 30 seconds delay

    return () => clearTimeout(timer);
  }, [isInstalled]);

  // Listen for beforeinstallprompt
  React.useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    };
  }, []);

  // Handle install click
  const handleInstall = async () => {
    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;

    if (outcome === 'accepted') {
      setShowPrompt(false);
      setIsInstalled(true);
    }
    setDeferredPrompt(null);
  };

  // Handle dismiss
  const handleDismiss = () => {
    safeSetItem(STORAGE_KEY, Date.now().toString());
    setShowPrompt(false);
  };

  // Don't show if already installed or explicitly hidden
  if (isInstalled || !showPrompt) {
    return null;
  }

  // Show only on mobile
  if (!isMobile) {
    return null;
  }

  // iOS-specific prompt (no beforeinstallprompt support)
  if (isIOS) {
    return (
      <div className={cn(
        'fixed bottom-20 left-4 right-4 z-50',
        'animate-in slide-in-from-bottom-4 fade-in duration-300'
      )}>
        <div className="bg-card border rounded-xl shadow-lg p-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Smartphone className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium">Install Skopaq App</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Add Skopaq to your home screen for quick access and offline support.
              </p>
              <div className="flex items-center gap-2 mt-3 text-sm text-muted-foreground">
                <span>Tap</span>
                <Share className="h-4 w-4" />
                <span>then &quot;Add to Home Screen&quot;</span>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 -mt-1 -mr-1"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // Standard install prompt (Chrome, Edge, etc.)
  if (deferredPrompt) {
    return (
      <div className={cn(
        'fixed bottom-20 left-4 right-4 z-50',
        'animate-in slide-in-from-bottom-4 fade-in duration-300'
      )}>
        <div className="bg-card border rounded-xl shadow-lg p-4">
          <div className="flex items-start gap-3">
            <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
              <Download className="h-5 w-5 text-primary" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-medium">Install Skopaq App</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Install the app for faster access, offline support, and push notifications.
              </p>
              <div className="flex gap-2 mt-3">
                <Button
                  size="sm"
                  onClick={handleInstall}
                  className="h-9 touch-target"
                >
                  <Download className="h-4 w-4 mr-1" />
                  Install
                </Button>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={handleDismiss}
                  className="h-9 touch-target"
                >
                  Not now
                </Button>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 -mt-1 -mr-1"
              onClick={handleDismiss}
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return null;
}

/**
 * PWAUpdatePrompt - Shows when a new version is available
 */
export function PWAUpdatePrompt() {
  const [showUpdate, setShowUpdate] = React.useState(false);
  const [waitingWorker, setWaitingWorker] = React.useState<ServiceWorker | null>(null);

  React.useEffect(() => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then((registration) => {
        registration.addEventListener('updatefound', () => {
          const newWorker = registration.installing;
          if (newWorker) {
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                setWaitingWorker(newWorker);
                setShowUpdate(true);
              }
            });
          }
        });
      });
    }
  }, []);

  const handleUpdate = () => {
    if (waitingWorker) {
      // Warn user about potential unsaved changes before reload
      const confirmed = window.confirm(
        'A new version is available. The page will reload and any unsaved changes may be lost. Update now?'
      );
      if (confirmed) {
        waitingWorker.postMessage({ type: 'SKIP_WAITING' });
        window.location.reload();
      }
    }
  };

  if (!showUpdate) {
    return null;
  }

  return (
    <div className={cn(
      'fixed top-4 left-4 right-4 z-50 sm:left-auto sm:right-4 sm:max-w-sm',
      'animate-in slide-in-from-top-4 fade-in duration-300'
    )}>
      <div className="bg-card border rounded-xl shadow-lg p-4">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg bg-success/10 flex items-center justify-center flex-shrink-0">
            <Download className="h-5 w-5 text-success" />
          </div>
          <div className="flex-1">
            <h3 className="font-medium">Update Available</h3>
            <p className="text-sm text-muted-foreground">
              A new version of Skopaq is ready.
            </p>
          </div>
          <Button
            size="sm"
            onClick={handleUpdate}
            className="h-9"
          >
            Update
          </Button>
        </div>
      </div>
    </div>
  );
}
