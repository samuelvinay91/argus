'use client';

import Link from 'next/link';
import { Home, ArrowLeft, Search, Mail, HelpCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';

export default function NotFound() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-b from-background to-muted/20 px-6">
      <div className="max-w-md w-full text-center">
        {/* Error Code */}
        <div className="mb-8">
          <h1 className="text-8xl font-bold text-primary/20">404</h1>
        </div>

        {/* Message */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-3">Page not found</h2>
          <p className="text-muted-foreground">
            Sorry, we couldn&apos;t find the page you&apos;re looking for.
            It might have been moved or deleted.
          </p>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-8">
          <Button asChild>
            <Link href="/dashboard">
              <Home className="w-4 h-4 mr-2" />
              Go to Dashboard
            </Link>
          </Button>
          <Button variant="outline" onClick={() => window.history.back()}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Go Back
          </Button>
        </div>

        {/* Help Links */}
        <div className="pt-8 border-t border-border">
          <p className="text-sm text-muted-foreground mb-4">Need help?</p>
          <div className="flex flex-wrap justify-center gap-4 text-sm">
            <a
              href="https://docs.heyargus.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Search className="w-4 h-4" />
              Search Docs
            </a>
            <a
              href="https://status.heyargus.ai"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <HelpCircle className="w-4 h-4" />
              Status Page
            </a>
            <a
              href="mailto:support@heyargus.com"
              className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors"
            >
              <Mail className="w-4 h-4" />
              Contact Support
            </a>
          </div>
        </div>
      </div>
    </div>
  );
}
