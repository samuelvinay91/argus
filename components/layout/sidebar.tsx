'use client';

import { useState, useEffect, createContext, useContext, useRef } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useTheme } from 'next-themes';
import { UserButton, useClerk } from '@clerk/nextjs';
import {
  MessageSquare,
  TestTube,
  Eye,
  Compass,
  BarChart3,
  Settings,
  Github,
  Zap,
  Brain,
  Shield,
  ShieldAlert,
  HelpCircle,
  ExternalLink,
  Wrench,
  Users,
  Key,
  ScrollText,
  FolderKanban,
  Menu,
  X,
  LayoutDashboard,
  Calendar,
  Bell,
  Activity,
  Building2,
  BookOpen,
  Sun,
  Moon,
  Monitor,
  LogOut,
  ChevronDown,
  Sparkles,
  Search,
  HeartPulse,
  Server,
  Puzzle,
  Network,
  Workflow,
  Database,
  Accessibility,
  Gauge,
  GitBranch,
  Globe,
  Rocket,
  Container,
  ChevronsLeft,
  ChevronsRight,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { VersionBadge } from '@/components/ui/version-badge';
import { Button } from '@/components/ui/button';
import { Tooltip } from '@/components/ui/tooltip';
import { OrganizationSwitcher } from '@/components/layout/org-switcher';

// Sidebar context for global state
const SidebarContext = createContext<{
  isOpen: boolean;
  setIsOpen: (open: boolean) => void;
  isCollapsed: boolean;
  setIsCollapsed: (collapsed: boolean) => void;
} | null>(null);

export function useSidebar() {
  const context = useContext(SidebarContext);
  if (!context) {
    throw new Error('useSidebar must be used within a SidebarProvider');
  }
  return context;
}

export function SidebarProvider({ children }: { children: React.ReactNode }) {
  const [isOpen, setIsOpen] = useState(false);
  // Initialize with false to match server render, then hydrate from localStorage in useEffect
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isHydrated, setIsHydrated] = useState(false);

  // Hydrate collapsed state from localStorage after mount (prevents hydration mismatch)
  useEffect(() => {
    const saved = localStorage.getItem('sidebar-collapsed');
    if (saved === 'true') {
      setIsCollapsed(true);
    }
    setIsHydrated(true);
  }, []);

  // Persist collapsed state to localStorage (only after hydration)
  useEffect(() => {
    if (isHydrated) {
      localStorage.setItem('sidebar-collapsed', isCollapsed.toString());
    }
  }, [isCollapsed, isHydrated]);

  return (
    <SidebarContext.Provider value={{ isOpen, setIsOpen, isCollapsed, setIsCollapsed }}>
      {children}
    </SidebarContext.Provider>
  );
}

// ═══════════════════════════════════════════════════════════════════════════
// NAVIGATION STRUCTURE - Intent-Based Organization
// ═══════════════════════════════════════════════════════════════════════════

// Core - Always visible, no header (essential navigation)
const coreNavigation = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Chat', href: '/', icon: MessageSquare, badge: 'AI' },
  { name: 'Projects', href: '/projects', icon: FolderKanban },
];

// Testing - Test execution and management
const testingNavigation = [
  { name: 'Test Runner', href: '/tests', icon: TestTube },
  { name: 'Test Library', href: '/tests/library', icon: BookOpen },
  { name: 'API Testing', href: '/api-tests', icon: Globe },
  { name: 'Visual AI', href: '/visual', icon: Eye },
  { name: 'Schedules', href: '/schedules', icon: Calendar },
];

// Discovery & Analysis - Understanding and insights
const analysisNavigation = [
  { name: 'Discovery', href: '/discovery', icon: Compass },
  { name: 'AI Insights', href: '/insights', icon: Brain },
  { name: 'Correlations', href: '/correlations', icon: Network },
  { name: 'Test Health', href: '/flaky', icon: HeartPulse },
];

// Quality & Security - Metrics and compliance
const qualityNavigation = [
  { name: 'Quality Score', href: '/quality', icon: Shield },
  { name: 'Performance', href: '/performance', icon: Gauge },
  { name: 'Accessibility', href: '/accessibility', icon: Accessibility, badge: 'NEW' },
  { name: 'Security', href: '/security', icon: ShieldAlert },
  { name: 'Reports', href: '/reports', icon: BarChart3 },
];

// Infrastructure - DevOps and deployment
const infraNavigation = [
  { name: 'CI/CD', href: '/cicd', icon: GitBranch, badge: 'NEW' },
  { name: 'Deployments', href: '/cicd?tab=deployments', icon: Rocket },
  { name: 'Containers', href: '/cicd?tab=containers', icon: Container },
  { name: 'Database', href: '/database', icon: Database },
  { name: 'Orchestrator', href: '/orchestrator', icon: Workflow },
  { name: 'Infrastructure', href: '/infra', icon: Server },
];

// Workspace - Team and admin
const workspaceNavigation = [
  { name: 'Team', href: '/team', icon: Users },
  { name: 'Organizations', href: '/organizations', icon: Building2 },
  { name: 'API Keys', href: '/api-keys', icon: Key },
  { name: 'MCP Sessions', href: '/mcp-sessions', icon: Monitor },
  { name: 'Plugin Monitor', href: '/plugin', icon: Puzzle, badge: 'NEW' },
  { name: 'Activity', href: '/activity', icon: Activity },
];

// Settings - Configuration and integrations
const settingsNavigation = [
  { name: 'Integrations', href: '/integrations', icon: Zap },
  { name: 'Settings', href: '/settings', icon: Settings },
];

// Mobile menu button component
export function MobileMenuButton() {
  const { isOpen, setIsOpen } = useSidebar();

  return (
    <Button
      variant="ghost"
      size="sm"
      className="lg:hidden h-10 w-10 p-0"
      onClick={() => setIsOpen(!isOpen)}
      aria-label={isOpen ? 'Close menu' : 'Open menu'}
    >
      {isOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
    </Button>
  );
}

// Theme toggle component - compact pill design
function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-8 w-24 rounded-full bg-muted animate-pulse" />;
  }

  return (
    <div className="flex items-center gap-0.5 p-1 rounded-full bg-muted/60 border border-border/50">
      {[
        { value: 'light', icon: Sun, label: 'Light' },
        { value: 'dark', icon: Moon, label: 'Dark' },
        { value: 'system', icon: Monitor, label: 'System' },
      ].map(({ value, icon: Icon, label }) => (
        <button
          key={value}
          onClick={() => setTheme(value)}
          className={cn(
            'flex items-center justify-center h-6 w-6 rounded-full transition-all duration-200',
            theme === value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
          title={label}
        >
          <Icon className="h-3.5 w-3.5" />
        </button>
      ))}
    </div>
  );
}

// Navigation item type
type NavItemType = {
  name: string;
  href: string;
  icon: React.ElementType;
  badge?: string;
};

// Navigation item component with collapsed mode support
function NavItem({
  item,
  isActive,
  onClick,
  isCollapsed = false,
}: {
  item: NavItemType;
  isActive: boolean;
  onClick?: () => void;
  isCollapsed?: boolean;
}) {
  const router = useRouter();

  // Handle click with explicit navigation to avoid React 18 transition delays
  const handleClick = (e: React.MouseEvent) => {
    e.preventDefault();
    onClick?.();
    router.push(item.href);
  };

  const linkContent = (
    <Link
      href={item.href}
      onClick={handleClick}
      data-active={isActive}
      className={cn(
        'group flex items-center rounded-xl text-sm font-medium transition-all duration-200 relative',
        isCollapsed ? 'justify-center p-2.5' : 'gap-3 px-3 py-2.5',
        isActive
          ? 'bg-primary text-primary-foreground shadow-sm shadow-primary/25'
          : 'text-muted-foreground hover:bg-muted/80 hover:text-foreground'
      )}
    >
      <item.icon
        className={cn(
          'h-[18px] w-[18px] flex-shrink-0 transition-transform duration-200 group-hover:scale-110',
          isActive ? 'text-primary-foreground' : ''
        )}
      />
      {!isCollapsed && (
        <>
          <span className="truncate">{item.name}</span>
          {item.badge && (
            <span
              className={cn(
                'ml-auto text-[10px] font-semibold px-1.5 py-0.5 rounded-full',
                isActive
                  ? 'bg-primary-foreground/20 text-primary-foreground'
                  : 'bg-primary/10 text-primary'
              )}
            >
              {item.badge}
            </span>
          )}
        </>
      )}
      {/* Badge indicator dot when collapsed */}
      {isCollapsed && item.badge && (
        <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-primary" />
      )}
    </Link>
  );

  // Wrap with tooltip when collapsed
  if (isCollapsed) {
    return (
      <Tooltip
        content={
          <span className="flex items-center gap-1.5">
            {item.name}
            {item.badge && (
              <span className="text-primary text-[10px] font-semibold">
                {item.badge}
              </span>
            )}
          </span>
        }
        side="right"
        sideOffset={12}
      >
        {linkContent}
      </Tooltip>
    );
  }

  return linkContent;
}

// Section header component
function SectionHeader({ title }: { title: string }) {
  return (
    <div className="flex items-center gap-2 px-3 mb-2">
      <span className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider">
        {title}
      </span>
      <div className="flex-1 h-px bg-border/50" />
    </div>
  );
}

// Collapsible section component with icon support for collapsed sidebar
function CollapsibleSection({
  title,
  icon: SectionIcon,
  children,
  defaultOpen = true,
  sidebarCollapsed = false,
}: {
  title: string;
  icon: React.ElementType;
  children: React.ReactNode;
  defaultOpen?: boolean;
  sidebarCollapsed?: boolean;
}) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  // When sidebar is collapsed, render only nav items without section header
  // This prevents duplicate icons and clutter in the narrow collapsed view
  if (sidebarCollapsed) {
    return (
      <div className="pt-2 first:pt-0">
        {/* Minimal separator line for visual grouping */}
        <div className="mx-2 mb-1.5 h-px bg-border/40" />
        {/* Nav items only - no section header icon */}
        <div className="space-y-0.5">
          {children}
        </div>
      </div>
    );
  }

  // Expanded mode - collapsible section
  return (
    <div className="space-y-1">
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 px-3 py-1 w-full text-left group"
      >
        <span className="text-[11px] font-semibold text-muted-foreground/70 uppercase tracking-wider group-hover:text-muted-foreground transition-colors">
          {title}
        </span>
        <div className="flex-1 h-px bg-border/50" />
        <ChevronDown
          className={cn(
            'h-3.5 w-3.5 text-muted-foreground/50 transition-transform duration-200',
            isOpen ? 'rotate-180' : ''
          )}
        />
      </button>
      <div
        className={cn(
          'space-y-0.5 overflow-hidden transition-all duration-200',
          isOpen ? 'max-h-[500px] opacity-100' : 'max-h-0 opacity-0'
        )}
      >
        {children}
      </div>
    </div>
  );
}

// Sidebar content (shared between desktop and mobile)
function SidebarContent({ onNavigate, isMobile = false }: { onNavigate?: () => void; isMobile?: boolean }) {
  const pathname = usePathname();
  const navRef = useRef<HTMLElement>(null);
  const { signOut } = useClerk();
  const { isCollapsed, setIsCollapsed } = useSidebar();

  // On mobile, sidebar is never collapsed
  const collapsed = isMobile ? false : isCollapsed;

  const handleSignOut = async () => {
    try {
      await signOut({ redirectUrl: '/' });
    } catch (error) {
      console.error('Sign out error:', error);
      window.location.href = '/';
    }
  };

  const handleClick = () => {
    onNavigate?.();
  };

  const openCommandPalette = () => {
    const event = new KeyboardEvent('keydown', {
      key: 'k',
      metaKey: true,
      bubbles: true,
    });
    document.dispatchEvent(event);
  };

  const isActive = (href: string) => {
    // Extract base path (without query params)
    const basePath = href.split('?')[0];
    if (href === '/') return pathname === '/';
    if (href === '/projects') return pathname.startsWith('/projects');
    // For /tests, only match exact path to avoid conflict with /tests/library
    if (basePath === '/tests') return pathname === '/tests';
    // For /cicd, match the base path for all cicd routes
    if (basePath === '/cicd') return pathname === '/cicd' || pathname.startsWith('/cicd/');
    return pathname === basePath || pathname.startsWith(basePath + '/');
  };

  // Scroll to active menu item on mount and pathname change
  useEffect(() => {
    if (navRef.current) {
      const activeLink = navRef.current.querySelector('[data-active="true"]');
      if (activeLink) {
        requestAnimationFrame(() => {
          activeLink.scrollIntoView({ behavior: 'smooth', block: 'center' });
        });
      }
    }
  }, [pathname]);

  return (
    <>
      {/* Logo with Collapse Toggle */}
      <div className={cn(
        'flex h-16 items-center relative',
        collapsed ? 'justify-center px-2' : 'gap-3 px-5'
      )}>
        <div className="relative">
          <div className={cn(
            'flex items-center justify-center rounded-xl gradient-primary shadow-lg shadow-primary/25',
            collapsed ? 'h-9 w-9' : 'h-10 w-10'
          )}>
            <Eye className={cn(collapsed ? 'h-4 w-4' : 'h-5 w-5', 'text-white')} />
          </div>
          {!collapsed && (
            <div className="absolute -top-0.5 -right-0.5 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-amber-500 border-2 border-card"></span>
            </div>
          )}
        </div>

        {/* Collapse Toggle Button (desktop only) */}
        {!isMobile && (
          <button
            onClick={() => setIsCollapsed(!collapsed)}
            className={cn(
              'absolute z-50 flex h-6 w-6 items-center justify-center',
              'rounded-full border bg-background shadow-sm',
              'hover:bg-muted transition-colors',
              collapsed ? 'top-5 -right-3' : 'top-5 -right-3'
            )}
            title={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            {collapsed ? (
              <ChevronsRight className="h-3.5 w-3.5" />
            ) : (
              <ChevronsLeft className="h-3.5 w-3.5" />
            )}
          </button>
        )}
      </div>

      {/* Organization Switcher */}
      {!collapsed && (
        <div className="px-3 pb-2">
          <OrganizationSwitcher />
        </div>
      )}

      {/* Search Button */}
      <div className={cn('pb-4', collapsed ? 'px-2' : 'px-3')}>
        {collapsed ? (
          <Tooltip content="Quick search (⌘K)" side="right" sideOffset={12}>
            <button
              onClick={openCommandPalette}
              className="flex w-full items-center justify-center h-9 rounded-xl border border-border/60 bg-muted/30 hover:bg-muted/60 hover:border-border transition-all duration-200"
            >
              <Search className="h-4 w-4 text-muted-foreground" />
            </button>
          </Tooltip>
        ) : (
          <button
            onClick={openCommandPalette}
            className="flex w-full items-center gap-2 h-9 px-3 text-sm text-muted-foreground rounded-xl border border-border/60 bg-muted/30 hover:bg-muted/60 hover:border-border transition-all duration-200"
          >
            <Search className="h-4 w-4" />
            <span className="flex-1 text-left text-xs">Quick search...</span>
            <kbd className="hidden sm:inline-flex h-5 select-none items-center gap-0.5 rounded-md border bg-background px-1.5 font-mono text-[10px] font-medium text-muted-foreground">
              <span className="text-xs">⌘</span>K
            </kbd>
          </button>
        )}
      </div>

      {/* Main Navigation */}
      <nav ref={navRef} className={cn(
        'flex-1 overflow-y-auto',
        collapsed ? 'px-2 space-y-1' : 'px-3 space-y-4'
      )}>
        {/* Core Section - Always visible */}
        <div className="space-y-0.5">
          {coreNavigation.map((item) => (
            <NavItem
              key={item.name}
              item={item}
              isActive={isActive(item.href)}
              onClick={handleClick}
              isCollapsed={collapsed}
            />
          ))}
        </div>

        {/* Testing Section */}
        <CollapsibleSection title="Testing" icon={TestTube} defaultOpen sidebarCollapsed={collapsed}>
          {testingNavigation.map((item) => (
            <NavItem
              key={item.name}
              item={item}
              isActive={isActive(item.href)}
              onClick={handleClick}
              isCollapsed={collapsed}
            />
          ))}
        </CollapsibleSection>

        {/* Discovery & Analysis Section */}
        <CollapsibleSection title="Analysis" icon={Brain} defaultOpen sidebarCollapsed={collapsed}>
          {analysisNavigation.map((item) => (
            <NavItem
              key={item.name}
              item={item}
              isActive={isActive(item.href)}
              onClick={handleClick}
              isCollapsed={collapsed}
            />
          ))}
        </CollapsibleSection>

        {/* Quality & Security Section */}
        <CollapsibleSection title="Quality" icon={Shield} defaultOpen sidebarCollapsed={collapsed}>
          {qualityNavigation.map((item) => (
            <NavItem
              key={item.name}
              item={item}
              isActive={isActive(item.href)}
              onClick={handleClick}
              isCollapsed={collapsed}
            />
          ))}
        </CollapsibleSection>

        {/* Infrastructure Section */}
        <CollapsibleSection title="Infrastructure" icon={Server} defaultOpen={false} sidebarCollapsed={collapsed}>
          {infraNavigation.map((item) => (
            <NavItem
              key={item.name}
              item={item}
              isActive={isActive(item.href)}
              onClick={handleClick}
              isCollapsed={collapsed}
            />
          ))}
        </CollapsibleSection>

        {/* Workspace Section */}
        <CollapsibleSection title="Workspace" icon={Building2} defaultOpen={false} sidebarCollapsed={collapsed}>
          {workspaceNavigation.map((item) => (
            <NavItem
              key={item.name}
              item={item}
              isActive={isActive(item.href)}
              onClick={handleClick}
              isCollapsed={collapsed}
            />
          ))}
        </CollapsibleSection>

        {/* Settings Section */}
        <CollapsibleSection title="Settings" icon={Settings} defaultOpen={false} sidebarCollapsed={collapsed}>
          {settingsNavigation.map((item) => (
            <NavItem
              key={item.name}
              item={item}
              isActive={isActive(item.href)}
              onClick={handleClick}
              isCollapsed={collapsed}
            />
          ))}
        </CollapsibleSection>
      </nav>

      {/* External Links - Compact */}
      <div className={cn(
        'border-t border-border/50 py-3',
        collapsed ? 'px-2' : 'px-3'
      )}>
        <div className={cn(
          'flex items-center gap-1',
          collapsed ? 'flex-col' : 'px-1'
        )}>
          {collapsed ? (
            <>
              <Tooltip content="Documentation" side="right" sideOffset={12}>
                <a
                  href="https://docs.heyargus.ai"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center h-8 w-8 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200"
                >
                  <BookOpen className="h-4 w-4" />
                </a>
              </Tooltip>
              <Tooltip content="GitHub" side="right" sideOffset={12}>
                <a
                  href="https://github.com/heyargus"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center h-8 w-8 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200"
                >
                  <Github className="h-4 w-4" />
                </a>
              </Tooltip>
              <Tooltip content="Help & Support" side="right" sideOffset={12}>
                <a
                  href="https://heyargus.ai/help"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center justify-center h-8 w-8 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200"
                >
                  <HelpCircle className="h-4 w-4" />
                </a>
              </Tooltip>
            </>
          ) : (
            <>
              <a
                href="https://docs.heyargus.ai"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center h-8 w-8 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200"
                title="Documentation"
              >
                <BookOpen className="h-4 w-4" />
              </a>
              <a
                href="https://github.com/heyargus"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center h-8 w-8 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200"
                title="GitHub"
              >
                <Github className="h-4 w-4" />
              </a>
              <a
                href="https://heyargus.ai/help"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center h-8 w-8 rounded-lg text-muted-foreground hover:bg-muted hover:text-foreground transition-all duration-200"
                title="Help & Support"
              >
                <HelpCircle className="h-4 w-4" />
              </a>
              <div className="flex-1" />
              <ThemeToggle />
            </>
          )}
        </div>
        {collapsed && (
          <div className="flex justify-center pt-2">
            <ThemeToggle />
          </div>
        )}
      </div>

      {/* User Profile - Compact */}
      <div className={cn(
        'border-t border-border/50 py-3',
        collapsed ? 'px-2' : 'px-4'
      )}>
        {collapsed ? (
          <div className="flex flex-col items-center gap-2">
            <UserButton
              appearance={{
                elements: {
                  avatarBox: 'h-8 w-8 rounded-lg',
                },
              }}
            />
            <Tooltip content="Sign out" side="right" sideOffset={12}>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSignOut}
                className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground rounded-lg"
              >
                <LogOut className="h-4 w-4" />
              </Button>
            </Tooltip>
          </div>
        ) : (
          <div className="flex items-center gap-3">
            <UserButton
              appearance={{
                elements: {
                  avatarBox: 'h-9 w-9 rounded-xl',
                },
              }}
            />
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">Account</p>
              <p className="text-[10px] text-muted-foreground truncate">Manage profile</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleSignOut}
              className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground rounded-lg"
              title="Sign out"
            >
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        )}
      </div>

      {/* Version Footer */}
      {!collapsed && (
        <div className="px-4 py-2 flex items-center justify-between">
          <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60">
            <Link href="/legal" onClick={handleClick} className="hover:text-muted-foreground">
              Legal
            </Link>
            <span>·</span>
            <Link href="/legal/privacy" onClick={handleClick} className="hover:text-muted-foreground">
              Privacy
            </Link>
          </div>
          <VersionBadge variant="minimal" />
        </div>
      )}
    </>
  );
}

// Desktop sidebar (always visible on lg+)
export function Sidebar() {
  const { isCollapsed } = useSidebar();

  return (
    <aside
      className={cn(
        'hidden lg:flex fixed left-0 top-0 z-40 h-screen',
        'border-r border-border/50 bg-card/95 backdrop-blur-sm flex-col',
        'transition-all duration-200 ease-in-out',
        isCollapsed ? 'w-16' : 'w-64'
      )}
    >
      <SidebarContent />
    </aside>
  );
}

// Mobile sidebar (slide-in overlay)
export function MobileSidebar() {
  const { isOpen, setIsOpen } = useSidebar();
  const pathname = usePathname();

  // Close sidebar on route change
  useEffect(() => {
    setIsOpen(false);
  }, [pathname, setIsOpen]);

  // Prevent body scroll when sidebar is open
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [isOpen]);

  return (
    <>
      {/* Backdrop */}
      <div
        className={cn(
          'fixed inset-0 z-40 bg-background/80 backdrop-blur-sm lg:hidden transition-opacity duration-300',
          isOpen ? 'opacity-100' : 'opacity-0 pointer-events-none'
        )}
        onClick={() => setIsOpen(false)}
      />

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed left-0 top-0 z-50 h-screen w-72 border-r border-border/50 bg-card flex flex-col lg:hidden transform transition-transform duration-300 ease-in-out',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Close button */}
        <Button
          variant="ghost"
          size="sm"
          className="absolute top-4 right-4 h-8 w-8 p-0 rounded-lg"
          onClick={() => setIsOpen(false)}
        >
          <X className="h-5 w-5" />
        </Button>

        <SidebarContent onNavigate={() => setIsOpen(false)} isMobile />
      </aside>
    </>
  );
}

// Compact theme toggle for mobile header (cycles through themes)
function MobileThemeToggle() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return <div className="h-8 w-8" />;
  }

  const cycleTheme = () => {
    if (theme === 'dark') setTheme('light');
    else if (theme === 'light') setTheme('system');
    else setTheme('dark');
  };

  const getIcon = () => {
    if (theme === 'dark') return <Moon className="h-4 w-4" />;
    if (theme === 'light') return <Sun className="h-4 w-4" />;
    return <Monitor className="h-4 w-4" />;
  };

  return (
    <Button
      variant="ghost"
      size="sm"
      className="h-8 w-8 p-0 rounded-lg"
      onClick={cycleTheme}
      title={`Theme: ${theme}`}
    >
      {getIcon()}
    </Button>
  );
}

// Mobile header with menu button
export function MobileHeader() {
  const { signOut } = useClerk();

  const handleSignOut = async () => {
    try {
      await signOut({ redirectUrl: '/' });
    } catch (error) {
      console.error('Sign out error:', error);
      window.location.href = '/';
    }
  };

  return (
    <div className="flex lg:hidden items-center justify-between h-16 px-4 border-b border-border/50 bg-card/95 backdrop-blur-sm sticky top-0 z-30">
      <div className="flex items-center gap-3">
        <MobileMenuButton />
        <div className="flex items-center gap-2">
          <div className="relative">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg gradient-primary shadow-md shadow-primary/20">
              <Eye className="h-4 w-4 text-white" />
            </div>
          </div>
          <span className="font-bold text-lg tracking-tight">Argus</span>
        </div>
      </div>
      <div className="flex items-center gap-1">
        <MobileThemeToggle />
        <UserButton
          appearance={{
            elements: {
              avatarBox: 'h-8 w-8 rounded-lg',
            },
          }}
        />
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSignOut}
          className="h-8 w-8 p-0 text-muted-foreground hover:text-foreground rounded-lg"
          title="Sign out"
        >
          <LogOut className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
