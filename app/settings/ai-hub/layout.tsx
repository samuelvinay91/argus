'use client';

import { type ReactNode } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Cpu,
  Plug,
  GitBranch,
  Wallet,
  BarChart3,
  ShieldCheck,
  Lock,
} from 'lucide-react';
import { Sidebar } from '@/components/layout/sidebar';
import { cn } from '@/lib/utils';
import { useUser } from '@clerk/nextjs';
import { AIHubModeProvider } from '@/components/ai-hub';
import { ModeToggle } from '@/components/ai-hub/mode-toggle';

// Navigation items for the AI Hub sidebar
interface NavItem {
  id: string;
  name: string;
  href: string;
  icon: React.ComponentType<{ className?: string; size?: number }>;
  adminOnly?: boolean;
}

const navItems: NavItem[] = [
  { id: 'dashboard', name: 'Dashboard', href: '/settings/ai-hub', icon: LayoutDashboard },
  { id: 'models', name: 'Models', href: '/settings/ai-hub/models', icon: Cpu },
  { id: 'providers', name: 'Providers', href: '/settings/ai-hub/providers', icon: Plug },
  { id: 'routing', name: 'Routing', href: '/settings/ai-hub/routing', icon: GitBranch },
  { id: 'budget', name: 'Budget', href: '/settings/ai-hub/budget', icon: Wallet },
  { id: 'usage', name: 'Usage', href: '/settings/ai-hub/usage', icon: BarChart3 },
  { id: 'policies', name: 'Policies', href: '/settings/ai-hub/policies', icon: ShieldCheck, adminOnly: true },
];

interface AIHubLayoutProps {
  children: ReactNode;
}

export default function AIHubLayout({ children }: AIHubLayoutProps) {
  const pathname = usePathname();
  const { user } = useUser();

  // Check if user is admin (you may need to adjust this based on your auth setup)
  const isAdmin = user?.publicMetadata?.role === 'admin' ||
                  user?.organizationMemberships?.some(
                    (membership) => membership.role === 'org:admin'
                  );

  // Helper to check if a nav item is active
  const isActive = (href: string) => {
    if (href === '/settings/ai-hub') {
      return pathname === '/settings/ai-hub';
    }
    return pathname.startsWith(href);
  };

  return (
    <AIHubModeProvider>
      <div className="flex min-h-screen overflow-x-hidden">
        <Sidebar />
        <main className="flex-1 lg:ml-64 min-w-0">
          {/* Header */}
          <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-6">
            <div className="flex-1">
              <h1 className="text-xl font-semibold">AI Hub</h1>
              <p className="text-sm text-muted-foreground">
                Manage AI models, providers, and usage
              </p>
            </div>
            {/* Mode Toggle - Simple/Expert */}
            <ModeToggle />
          </header>

          <div className="p-6">
            <div className="flex gap-6">
              {/* AI Hub Sidebar Navigation */}
              <nav className="w-56 space-y-1 flex-shrink-0" aria-label="AI Hub navigation">
                {navItems.map((item) => {
                  // Skip admin-only items for non-admins
                  if (item.adminOnly && !isAdmin) {
                    return null;
                  }

                  const active = isActive(item.href);

                  return (
                    <Link
                      key={item.id}
                      href={item.href}
                      className={cn(
                        'w-full flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                        active
                          ? 'bg-primary text-primary-foreground'
                          : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
                      )}
                      aria-current={active ? 'page' : undefined}
                    >
                      <item.icon className="h-4 w-4" aria-hidden="true" />
                      {item.name}
                      {item.adminOnly && (
                        <Lock className="h-3 w-3 ml-auto opacity-60" aria-label="Admin only" />
                      )}
                    </Link>
                  );
                })}
              </nav>

              {/* Main Content Area */}
              <div className="flex-1 min-w-0">{children}</div>
            </div>
          </div>
        </main>
      </div>
    </AIHubModeProvider>
  );
}
