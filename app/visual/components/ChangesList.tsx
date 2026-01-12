'use client';

import * as React from 'react';
import { useState, useMemo } from 'react';
import {
  Search,
  Filter,
  SortAsc,
  SortDesc,
  Layout,
  Type,
  Palette,
  Layers,
  Smartphone,
  Accessibility,
  AlertCircle,
  AlertTriangle,
  Info,
  Shield,
  Clock,
  Check,
  X,
  ChevronDown,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/data-table';
import { cn } from '@/lib/utils';
import { ChangeCard, ChangeCardSkeleton, type VisualChange } from './ChangeCard';

interface ChangesListProps {
  changes: VisualChange[];
  isLoading?: boolean;
  onApprove?: (changeId: string) => void;
  onReject?: (changeId: string) => void;
  onShowOnScreenshot?: (changeId: string, bounds?: VisualChange['bounds']) => void;
  onViewCode?: (files: string[]) => void;
  onBulkApprove?: (changeIds: string[]) => void;
  onBulkReject?: (changeIds: string[]) => void;
}

type CategoryFilter = VisualChange['category'] | 'all';
type SeverityFilter = VisualChange['severity'] | 'all';
type StatusFilter = VisualChange['status'] | 'all';
type SortField = 'severity' | 'category' | 'confidence' | 'location';
type SortDirection = 'asc' | 'desc';

const categoryOptions: { value: CategoryFilter; label: string; icon: React.ElementType }[] = [
  { value: 'all', label: 'All Categories', icon: Filter },
  { value: 'layout', label: 'Layout', icon: Layout },
  { value: 'content', label: 'Content', icon: Type },
  { value: 'style', label: 'Style', icon: Palette },
  { value: 'structure', label: 'Structure', icon: Layers },
  { value: 'responsive', label: 'Responsive', icon: Smartphone },
  { value: 'accessibility', label: 'Accessibility', icon: Accessibility },
];

const severityOptions: { value: SeverityFilter; label: string; icon: React.ElementType; variant: 'error' | 'warning' | 'info' | 'success' | 'default' }[] = [
  { value: 'all', label: 'All Severities', icon: Filter, variant: 'default' },
  { value: 'critical', label: 'Critical', icon: AlertCircle, variant: 'error' },
  { value: 'major', label: 'Major', icon: AlertTriangle, variant: 'warning' },
  { value: 'minor', label: 'Minor', icon: Info, variant: 'info' },
  { value: 'info', label: 'Info', icon: Info, variant: 'default' },
  { value: 'safe', label: 'Safe', icon: Shield, variant: 'success' },
];

const statusOptions: { value: StatusFilter; label: string; icon: React.ElementType }[] = [
  { value: 'all', label: 'All Statuses', icon: Filter },
  { value: 'pending', label: 'Pending', icon: Clock },
  { value: 'approved', label: 'Approved', icon: Check },
  { value: 'rejected', label: 'Rejected', icon: X },
];

const sortOptions: { value: SortField; label: string }[] = [
  { value: 'severity', label: 'Severity' },
  { value: 'category', label: 'Category' },
  { value: 'confidence', label: 'Confidence' },
  { value: 'location', label: 'Location' },
];

const severityOrder: Record<VisualChange['severity'], number> = {
  critical: 0,
  major: 1,
  minor: 2,
  info: 3,
  safe: 4,
};

const categoryOrder: Record<VisualChange['category'], number> = {
  accessibility: 0,
  layout: 1,
  structure: 2,
  content: 3,
  style: 4,
  responsive: 5,
};

export function ChangesList({
  changes,
  isLoading = false,
  onApprove,
  onReject,
  onShowOnScreenshot,
  onViewCode,
  onBulkApprove,
  onBulkReject,
}: ChangesListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>('all');
  const [severityFilter, setSeverityFilter] = useState<SeverityFilter>('all');
  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [sortField, setSortField] = useState<SortField>('severity');
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc');
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());
  const [showFilters, setShowFilters] = useState(false);

  // Compute counts for each filter
  const counts = useMemo(() => {
    const bySeverity: Record<VisualChange['severity'], number> = {
      critical: 0,
      major: 0,
      minor: 0,
      info: 0,
      safe: 0,
    };
    const byCategory: Record<VisualChange['category'], number> = {
      layout: 0,
      content: 0,
      style: 0,
      structure: 0,
      responsive: 0,
      accessibility: 0,
    };
    const byStatus: Record<VisualChange['status'], number> = {
      pending: 0,
      approved: 0,
      rejected: 0,
    };

    changes.forEach((change) => {
      bySeverity[change.severity]++;
      byCategory[change.category]++;
      byStatus[change.status]++;
    });

    return { bySeverity, byCategory, byStatus };
  }, [changes]);

  // Filter and sort changes
  const filteredChanges = useMemo(() => {
    let result = [...changes];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((change) =>
        change.description.toLowerCase().includes(query) ||
        change.property_name?.toLowerCase().includes(query) ||
        change.root_cause?.toLowerCase().includes(query) ||
        change.impact_assessment?.toLowerCase().includes(query)
      );
    }

    // Apply category filter
    if (categoryFilter !== 'all') {
      result = result.filter((change) => change.category === categoryFilter);
    }

    // Apply severity filter
    if (severityFilter !== 'all') {
      result = result.filter((change) => change.severity === severityFilter);
    }

    // Apply status filter
    if (statusFilter !== 'all') {
      result = result.filter((change) => change.status === statusFilter);
    }

    // Apply sorting
    result.sort((a, b) => {
      let comparison = 0;

      switch (sortField) {
        case 'severity':
          comparison = severityOrder[a.severity] - severityOrder[b.severity];
          break;
        case 'category':
          comparison = categoryOrder[a.category] - categoryOrder[b.category];
          break;
        case 'confidence':
          comparison = b.confidence - a.confidence;
          break;
        case 'location':
          if (a.bounds && b.bounds) {
            comparison = a.bounds.y - b.bounds.y || a.bounds.x - b.bounds.x;
          } else if (a.bounds) {
            comparison = -1;
          } else if (b.bounds) {
            comparison = 1;
          }
          break;
      }

      return sortDirection === 'asc' ? comparison : -comparison;
    });

    return result;
  }, [changes, searchQuery, categoryFilter, severityFilter, statusFilter, sortField, sortDirection]);

  const toggleExpand = (id: string) => {
    const newExpanded = new Set(expandedIds);
    if (newExpanded.has(id)) {
      newExpanded.delete(id);
    } else {
      newExpanded.add(id);
    }
    setExpandedIds(newExpanded);
  };

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortDirection('asc');
    }
  };

  const pendingChanges = filteredChanges.filter((c) => c.status === 'pending');
  const hasPendingChanges = pendingChanges.length > 0;

  return (
    <div className="space-y-4">
      {/* Search and Filter Header */}
      <div className="flex flex-col gap-3">
        {/* Search Bar */}
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              placeholder="Search changes by description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 h-9 bg-background"
            />
          </div>
          <Button
            variant="outline"
            size="sm"
            className={cn('h-9', showFilters && 'bg-accent')}
            onClick={() => setShowFilters(!showFilters)}
          >
            <Filter className="h-4 w-4 mr-2" />
            Filters
            {(categoryFilter !== 'all' || severityFilter !== 'all' || statusFilter !== 'all') && (
              <span className="ml-1.5 h-5 w-5 rounded-full bg-primary text-primary-foreground text-xs flex items-center justify-center">
                {[categoryFilter, severityFilter, statusFilter].filter((f) => f !== 'all').length}
              </span>
            )}
          </Button>
        </div>

        {/* Filter Options */}
        {showFilters && (
          <div className="p-4 rounded-lg border bg-card space-y-4">
            {/* Category Filter */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Category</label>
              <div className="flex flex-wrap gap-2">
                {categoryOptions.map(({ value, label, icon: Icon }) => {
                  const count = value === 'all' ? changes.length : counts.byCategory[value as VisualChange['category']];
                  return (
                    <Button
                      key={value}
                      variant={categoryFilter === value ? 'default' : 'outline'}
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => setCategoryFilter(value)}
                    >
                      <Icon className="h-3.5 w-3.5 mr-1.5" />
                      {label}
                      <span className={cn(
                        'ml-1.5 px-1.5 py-0.5 rounded text-xs',
                        categoryFilter === value ? 'bg-primary-foreground/20' : 'bg-muted'
                      )}>
                        {count}
                      </span>
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Severity Filter */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Severity</label>
              <div className="flex flex-wrap gap-2">
                {severityOptions.map(({ value, label, icon: Icon, variant }) => {
                  const count = value === 'all' ? changes.length : counts.bySeverity[value as VisualChange['severity']];
                  return (
                    <Button
                      key={value}
                      variant={severityFilter === value ? 'default' : 'outline'}
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => setSeverityFilter(value)}
                    >
                      <Icon className={cn('h-3.5 w-3.5 mr-1.5', severityFilter !== value && {
                        'text-error': variant === 'error',
                        'text-warning': variant === 'warning',
                        'text-info': variant === 'info',
                        'text-success': variant === 'success',
                      })} />
                      {label}
                      <span className={cn(
                        'ml-1.5 px-1.5 py-0.5 rounded text-xs',
                        severityFilter === value ? 'bg-primary-foreground/20' : 'bg-muted'
                      )}>
                        {count}
                      </span>
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Status Filter */}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-2 block">Status</label>
              <div className="flex flex-wrap gap-2">
                {statusOptions.map(({ value, label, icon: Icon }) => {
                  const count = value === 'all' ? changes.length : counts.byStatus[value as VisualChange['status']];
                  return (
                    <Button
                      key={value}
                      variant={statusFilter === value ? 'default' : 'outline'}
                      size="sm"
                      className="h-8 text-xs"
                      onClick={() => setStatusFilter(value)}
                    >
                      <Icon className={cn('h-3.5 w-3.5 mr-1.5', statusFilter !== value && {
                        'text-warning': value === 'pending',
                        'text-success': value === 'approved',
                        'text-error': value === 'rejected',
                      })} />
                      {label}
                      <span className={cn(
                        'ml-1.5 px-1.5 py-0.5 rounded text-xs',
                        statusFilter === value ? 'bg-primary-foreground/20' : 'bg-muted'
                      )}>
                        {count}
                      </span>
                    </Button>
                  );
                })}
              </div>
            </div>

            {/* Clear Filters */}
            {(categoryFilter !== 'all' || severityFilter !== 'all' || statusFilter !== 'all') && (
              <Button
                variant="ghost"
                size="sm"
                className="h-8 text-xs"
                onClick={() => {
                  setCategoryFilter('all');
                  setSeverityFilter('all');
                  setStatusFilter('all');
                }}
              >
                Clear all filters
              </Button>
            )}
          </div>
        )}

        {/* Sort and Summary Row */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{filteredChanges.length}</span>
            <span>changes</span>
            {filteredChanges.length !== changes.length && (
              <span className="text-xs">(filtered from {changes.length})</span>
            )}
          </div>

          <div className="flex items-center gap-2">
            {/* Sort Dropdown */}
            <div className="flex items-center gap-1">
              <span className="text-xs text-muted-foreground">Sort by:</span>
              <div className="relative">
                <select
                  value={sortField}
                  onChange={(e) => setSortField(e.target.value as SortField)}
                  className="h-8 px-2 pr-6 text-xs rounded border bg-background appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-ring"
                >
                  {sortOptions.map(({ value, label }) => (
                    <option key={value} value={value}>{label}</option>
                  ))}
                </select>
                <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 pointer-events-none text-muted-foreground" />
              </div>
              <Button
                variant="ghost"
                size="sm"
                className="h-8 w-8 p-0"
                onClick={() => setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc')}
              >
                {sortDirection === 'asc' ? (
                  <SortAsc className="h-4 w-4" />
                ) : (
                  <SortDesc className="h-4 w-4" />
                )}
              </Button>
            </div>

            {/* Bulk Actions */}
            {hasPendingChanges && (onBulkApprove || onBulkReject) && (
              <div className="flex items-center gap-2 ml-2 pl-2 border-l">
                {onBulkApprove && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs text-success hover:bg-success/10"
                    onClick={() => onBulkApprove(pendingChanges.map((c) => c.id))}
                  >
                    <Check className="h-3.5 w-3.5 mr-1" />
                    Approve All ({pendingChanges.length})
                  </Button>
                )}
                {onBulkReject && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="h-8 text-xs text-error hover:bg-error/10"
                    onClick={() => onBulkReject(pendingChanges.map((c) => c.id))}
                  >
                    <X className="h-3.5 w-3.5 mr-1" />
                    Reject All
                  </Button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="flex items-center gap-4 p-3 rounded-lg bg-muted/30 border">
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-error" />
          <span className="text-xs text-muted-foreground">Critical:</span>
          <span className="text-xs font-semibold">{counts.bySeverity.critical}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-warning" />
          <span className="text-xs text-muted-foreground">Major:</span>
          <span className="text-xs font-semibold">{counts.bySeverity.major}</span>
        </div>
        <div className="flex items-center gap-2">
          <div className="h-2 w-2 rounded-full bg-info" />
          <span className="text-xs text-muted-foreground">Minor:</span>
          <span className="text-xs font-semibold">{counts.bySeverity.minor}</span>
        </div>
        <div className="h-4 w-px bg-border" />
        <div className="flex items-center gap-2">
          <Clock className="h-3.5 w-3.5 text-warning" />
          <span className="text-xs text-muted-foreground">Pending:</span>
          <span className="text-xs font-semibold">{counts.byStatus.pending}</span>
        </div>
        <div className="flex items-center gap-2">
          <Check className="h-3.5 w-3.5 text-success" />
          <span className="text-xs text-muted-foreground">Approved:</span>
          <span className="text-xs font-semibold">{counts.byStatus.approved}</span>
        </div>
        <div className="flex items-center gap-2">
          <X className="h-3.5 w-3.5 text-error" />
          <span className="text-xs text-muted-foreground">Rejected:</span>
          <span className="text-xs font-semibold">{counts.byStatus.rejected}</span>
        </div>
      </div>

      {/* Changes List */}
      <div className="space-y-3">
        {isLoading ? (
          Array.from({ length: 5 }).map((_, i) => (
            <ChangeCardSkeleton key={i} />
          ))
        ) : filteredChanges.length > 0 ? (
          filteredChanges.map((change) => (
            <ChangeCard
              key={change.id}
              change={change}
              onApprove={onApprove}
              onReject={onReject}
              onShowOnScreenshot={onShowOnScreenshot}
              onViewCode={onViewCode}
              isExpanded={expandedIds.has(change.id)}
              onToggleExpand={() => toggleExpand(change.id)}
            />
          ))
        ) : (
          <div className="py-12 text-center text-muted-foreground">
            <Filter className="h-8 w-8 mx-auto mb-3 opacity-50" />
            <p className="font-medium">No changes found</p>
            <p className="text-sm mt-1">
              {searchQuery || categoryFilter !== 'all' || severityFilter !== 'all' || statusFilter !== 'all'
                ? 'Try adjusting your filters or search query.'
                : 'No visual changes detected in this comparison.'}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
