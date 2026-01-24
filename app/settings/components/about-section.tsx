'use client';

import { Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { VersionBadge } from '@/components/ui/version-badge';
import { APP_VERSION } from '@/lib/version';

const TECH_STACK = [
  'Next.js 15',
  'React 19',
  'TypeScript',
  'Tailwind CSS',
  'Supabase',
  'Clerk Auth',
  'Claude AI',
];

const LINKS = [
  { label: 'Documentation', href: 'https://docs.heyargus.ai' },
  { label: 'GitHub Repository', href: 'https://github.com/heyargus/argus' },
  { label: 'Website', href: 'https://heyargus.ai' },
];

export function AboutSection() {
  const currentYear = new Date().getFullYear();

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Info className="h-5 w-5" />
          About Argus
        </CardTitle>
        <CardDescription>
          Application information and version details
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex items-center justify-between p-4 rounded-lg bg-muted/50">
          <div>
            <div className="text-2xl font-bold">Argus</div>
            <div className="text-sm text-muted-foreground">
              Agentic AI Quality Intelligence
            </div>
          </div>
          <VersionBadge variant="full" />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div className="p-4 rounded-lg border">
            <div className="text-sm text-muted-foreground">Version</div>
            <div className="text-lg font-mono font-medium">{APP_VERSION}</div>
          </div>
          <div className="p-4 rounded-lg border">
            <div className="text-sm text-muted-foreground">Environment</div>
            <div className="text-lg font-medium capitalize">
              {process.env.NODE_ENV || 'development'}
            </div>
          </div>
        </div>

        <div className="space-y-3">
          <h4 className="font-medium">Tech Stack</h4>
          <div className="flex flex-wrap gap-2">
            {TECH_STACK.map((tech) => (
              <span
                key={tech}
                className="px-3 py-1 text-xs rounded-full bg-primary/10 text-primary font-medium"
              >
                {tech}
              </span>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t">
          <h4 className="font-medium mb-3">Links</h4>
          <div className="space-y-2">
            {LINKS.map((link) => (
              <a
                key={link.href}
                href={link.href}
                target="_blank"
                rel="noopener noreferrer"
                className="block text-sm text-primary hover:underline"
              >
                {link.label}
              </a>
            ))}
          </div>
        </div>

        <div className="pt-4 border-t text-center text-sm text-muted-foreground">
          <p>2024-{currentYear} Argus. All rights reserved.</p>
          <p className="mt-1">Built with care for better testing</p>
        </div>
      </CardContent>
    </Card>
  );
}
