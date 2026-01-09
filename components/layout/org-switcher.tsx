'use client';

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Building, ChevronDown, Plus, Settings, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

interface Organization {
  id: string;
  name: string;
  slug: string;
  plan: string;
  logo_url?: string;
}

const CURRENT_ORG_KEY = 'argus_current_org_id';

function getPlanBadgeStyles(plan: string): string {
  switch (plan.toLowerCase()) {
    case 'enterprise':
      return 'bg-purple-500/10 text-purple-500 border-purple-500/20';
    case 'pro':
      return 'bg-cyan-500/10 text-cyan-500 border-cyan-500/20';
    case 'free':
    default:
      return 'bg-muted text-muted-foreground border-border';
  }
}

function OrgAvatar({ org, size = 'md' }: { org: Organization; size?: 'sm' | 'md' }) {
  const sizeClasses = size === 'sm' ? 'h-7 w-7 text-xs' : 'h-9 w-9 text-sm';

  if (org.logo_url) {
    return (
      <img
        src={org.logo_url}
        alt={org.name}
        className={cn('rounded-lg object-cover', sizeClasses)}
      />
    );
  }

  return (
    <div
      className={cn(
        'flex items-center justify-center rounded-lg bg-primary/10 text-primary font-semibold',
        sizeClasses
      )}
    >
      {org.name.charAt(0).toUpperCase()}
    </div>
  );
}

export function OrganizationSwitcher() {
  const router = useRouter();
  const [organizations, setOrganizations] = useState<Organization[]>([]);
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Fetch organizations on mount
  useEffect(() => {
    async function fetchOrganizations() {
      try {
        const response = await fetch('/api/v1/users/me/organizations', {
          credentials: 'include',
        });

        if (!response.ok) {
          throw new Error('Failed to fetch organizations');
        }

        const data = await response.json();
        const orgs: Organization[] = data.organizations || data || [];
        setOrganizations(orgs);

        // Get current org from localStorage or default to first
        const savedOrgId = localStorage.getItem(CURRENT_ORG_KEY);
        const savedOrg = orgs.find((o) => o.id === savedOrgId);

        if (savedOrg) {
          setCurrentOrg(savedOrg);
        } else if (orgs.length > 0) {
          setCurrentOrg(orgs[0]);
          localStorage.setItem(CURRENT_ORG_KEY, orgs[0].id);
        }
      } catch (error) {
        console.error('Error fetching organizations:', error);
      } finally {
        setLoading(false);
      }
    }

    fetchOrganizations();
  }, []);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    }

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // Close dropdown on escape
  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    }

    document.addEventListener('keydown', handleEscape);
    return () => document.removeEventListener('keydown', handleEscape);
  }, []);

  const handleOrgSelect = (org: Organization) => {
    localStorage.setItem(CURRENT_ORG_KEY, org.id);
    setCurrentOrg(org);
    setIsOpen(false);
    // Reload to refresh data with new org context
    window.location.reload();
  };

  const handleCreateNew = () => {
    setIsOpen(false);
    router.push('/organizations/new');
  };

  const handleSettings = () => {
    setIsOpen(false);
    router.push('/settings');
  };

  if (loading) {
    return (
      <div className="px-3 py-3 border-b border-border">
        <div className="flex items-center gap-3 h-11 px-3 rounded-lg bg-muted/50 animate-pulse">
          <div className="h-9 w-9 rounded-lg bg-muted" />
          <div className="flex-1 space-y-1.5">
            <div className="h-3 w-20 rounded bg-muted" />
            <div className="h-2 w-12 rounded bg-muted" />
          </div>
        </div>
      </div>
    );
  }

  if (!currentOrg) {
    return (
      <div className="px-3 py-3 border-b border-border">
        <button
          onClick={handleCreateNew}
          className="flex w-full items-center gap-3 h-11 px-3 text-sm rounded-lg border border-dashed border-border hover:bg-muted/50 transition-colors text-muted-foreground"
        >
          <Plus className="h-5 w-5" />
          <span>Create organization</span>
        </button>
      </div>
    );
  }

  const otherOrgs = organizations.filter((o) => o.id !== currentOrg.id);

  return (
    <div className="px-3 py-3 border-b border-border" ref={dropdownRef}>
      <div className="relative">
        {/* Trigger button */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            'flex w-full items-center gap-3 h-11 px-3 rounded-lg transition-colors',
            'hover:bg-muted/50 text-left',
            isOpen && 'bg-muted/50'
          )}
        >
          <OrgAvatar org={currentOrg} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium truncate">{currentOrg.name}</p>
            <span
              className={cn(
                'inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded border',
                getPlanBadgeStyles(currentOrg.plan)
              )}
            >
              {currentOrg.plan}
            </span>
          </div>
          <ChevronDown
            className={cn(
              'h-4 w-4 text-muted-foreground transition-transform',
              isOpen && 'rotate-180'
            )}
          />
        </button>

        {/* Dropdown menu */}
        {isOpen && (
          <div className="absolute left-0 right-0 top-full mt-1 z-50 rounded-lg border border-border bg-popover shadow-lg overflow-hidden">
            {/* Current org (highlighted) */}
            <div className="p-1">
              <div className="flex items-center gap-3 px-3 py-2 rounded-md bg-primary/10">
                <OrgAvatar org={currentOrg} size="sm" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{currentOrg.name}</p>
                </div>
                <Check className="h-4 w-4 text-primary" />
              </div>
            </div>

            {/* Other orgs */}
            {otherOrgs.length > 0 && (
              <div className="p-1 border-t border-border">
                {otherOrgs.map((org) => (
                  <button
                    key={org.id}
                    onClick={() => handleOrgSelect(org)}
                    className="flex w-full items-center gap-3 px-3 py-2 rounded-md hover:bg-muted/50 transition-colors"
                  >
                    <OrgAvatar org={org} size="sm" />
                    <div className="flex-1 min-w-0 text-left">
                      <p className="text-sm font-medium truncate">{org.name}</p>
                      <span
                        className={cn(
                          'inline-flex items-center px-1.5 py-0.5 text-[10px] font-medium rounded border',
                          getPlanBadgeStyles(org.plan)
                        )}
                      >
                        {org.plan}
                      </span>
                    </div>
                  </button>
                ))}
              </div>
            )}

            {/* Actions */}
            <div className="p-1 border-t border-border">
              <button
                onClick={handleCreateNew}
                className="flex w-full items-center gap-3 px-3 py-2 rounded-md hover:bg-muted/50 transition-colors text-sm text-muted-foreground"
              >
                <Plus className="h-4 w-4" />
                <span>Create new organization</span>
              </button>
              <button
                onClick={handleSettings}
                className="flex w-full items-center gap-3 px-3 py-2 rounded-md hover:bg-muted/50 transition-colors text-sm text-muted-foreground"
              >
                <Settings className="h-4 w-4" />
                <span>Organization settings</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
