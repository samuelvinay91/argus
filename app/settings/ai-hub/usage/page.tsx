'use client';

import { useState, useMemo, Component, type ReactNode } from 'react';
import {
  TrendingUp,
  Calendar,
  Download,
  Search,
  ChevronLeft,
  ChevronRight,
  DollarSign,
  Zap,
  BarChart3,
  PieChart as PieChartIcon,
  Cpu,
  Loader2,
  AlertCircle,
} from 'lucide-react';
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import { format, parseISO } from 'date-fns';
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
// Note: Sidebar is provided by the AI Hub layout, not needed here
import { useAIUsage, type UsageRecord } from '@/lib/hooks/use-ai-settings';
import { cn } from '@/lib/utils';

// ============================================================================
// Types
// ============================================================================

type TimeRange = 'day' | 'week' | 'month' | 'year';

interface FilterState {
  search: string;
  taskType: string;
  model: string;
  provider: string;
}

// ============================================================================
// Constants
// ============================================================================

const TIME_RANGES: { value: TimeRange; label: string; days: number }[] = [
  { value: 'day', label: 'Day', days: 1 },
  { value: 'week', label: 'Week', days: 7 },
  { value: 'month', label: 'Month', days: 30 },
  { value: 'year', label: 'Year', days: 365 },
];

const CHART_COLORS = [
  'hsl(var(--primary))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
  '#8884d8',
  '#82ca9d',
  '#ffc658',
  '#ff7c43',
  '#a855f7',
];

const PIE_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

// ============================================================================
// Helper Functions
// ============================================================================

function getDaysForRange(range: TimeRange): number {
  return TIME_RANGES.find((r) => r.value === range)?.days || 30;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 2,
    maximumFractionDigits: 4,
  }).format(value);
}

function formatNumber(value: number): string {
  if (value >= 1000000) {
    return `${(value / 1000000).toFixed(1)}M`;
  }
  if (value >= 1000) {
    return `${(value / 1000).toFixed(1)}K`;
  }
  return value.toLocaleString();
}

// ============================================================================
// Error Boundary for Charts
// ============================================================================

interface ChartErrorBoundaryProps {
  children: ReactNode;
  fallbackMessage?: string;
}

interface ChartErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

/**
 * Error boundary specifically for chart components.
 * Prevents chart rendering errors from crashing the entire page.
 * This is important because Recharts can throw on malformed data.
 */
class ChartErrorBoundary extends Component<ChartErrorBoundaryProps, ChartErrorBoundaryState> {
  constructor(props: ChartErrorBoundaryProps) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ChartErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    // Log error for debugging but don't break the page
    console.error('Chart rendering error:', error, errorInfo);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-[250px] border rounded-lg bg-muted/10 text-muted-foreground">
          <AlertCircle className="h-8 w-8 mb-2 text-destructive/60" />
          <p className="text-sm font-medium">
            {this.props.fallbackMessage || 'Unable to render chart'}
          </p>
          <p className="text-xs mt-1">
            {this.state.error?.message || 'An unexpected error occurred'}
          </p>
        </div>
      );
    }

    return this.props.children;
  }
}

// ============================================================================
// Components
// ============================================================================

function LoadingState() {
  return (
    <div className="flex items-center justify-center h-64">
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-sm text-muted-foreground">Loading usage data...</p>
      </div>
    </div>
  );
}

function EmptyState() {
  return (
    <div className="flex flex-col items-center justify-center h-64 text-center">
      <BarChart3 className="h-12 w-12 text-muted-foreground/50 mb-4" />
      <h3 className="text-lg font-medium">No usage data available</h3>
      <p className="text-sm text-muted-foreground mt-1">
        Start using AI features to see your usage analytics
      </p>
    </div>
  );
}

interface TimeRangeToggleProps {
  value: TimeRange;
  onChange: (value: TimeRange) => void;
}

function TimeRangeToggle({ value, onChange }: TimeRangeToggleProps) {
  return (
    <div className="inline-flex items-center rounded-lg border bg-muted/30 p-1">
      {TIME_RANGES.map((range) => (
        <button
          key={range.value}
          onClick={() => onChange(range.value)}
          className={cn(
            'px-4 py-2 text-sm font-medium rounded-md transition-all',
            value === range.value
              ? 'bg-background text-foreground shadow-sm'
              : 'text-muted-foreground hover:text-foreground'
          )}
        >
          {range.label}
        </button>
      ))}
    </div>
  );
}

interface CostOverTimeChartProps {
  data: { date: string; cost: number; requests: number }[];
  timeRange: TimeRange;
}

function CostOverTimeChart({ data, timeRange }: CostOverTimeChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] border rounded-lg bg-muted/10">
        <p className="text-muted-foreground">No cost data available for this period</p>
      </div>
    );
  }

  const formatXAxis = (date: string) => {
    try {
      const d = parseISO(date);
      if (timeRange === 'day') return format(d, 'HH:mm');
      if (timeRange === 'week') return format(d, 'EEE');
      if (timeRange === 'month') return format(d, 'MMM d');
      return format(d, 'MMM yyyy');
    } catch {
      return date;
    }
  };

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data} margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis
          dataKey="date"
          tickFormatter={formatXAxis}
          tick={{ fontSize: 12 }}
          className="text-muted-foreground"
        />
        <YAxis
          tickFormatter={(value) => `$${value.toFixed(2)}`}
          tick={{ fontSize: 12 }}
          className="text-muted-foreground"
        />
        <Tooltip
          formatter={(value: number) => [formatCurrency(value), 'Cost']}
          labelFormatter={(label) => {
            try {
              return format(parseISO(label), 'PPP');
            } catch {
              return label;
            }
          }}
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
          }}
        />
        <Line
          type="monotone"
          dataKey="cost"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2 }}
          activeDot={{ r: 6, fill: 'hsl(var(--primary))' }}
        />
      </LineChart>
    </ResponsiveContainer>
  );
}

interface UsageByTaskTypeChartProps {
  data: { name: string; requests: number; cost: number }[];
}

function UsageByTaskTypeChart({ data }: UsageByTaskTypeChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[250px] border rounded-lg bg-muted/10">
        <p className="text-muted-foreground">No task type data available</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <BarChart data={data} layout="vertical" margin={{ top: 5, right: 30, left: 80, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
        <XAxis type="number" tick={{ fontSize: 12 }} />
        <YAxis dataKey="name" type="category" tick={{ fontSize: 12 }} width={70} />
        <Tooltip
          formatter={(value: number, name: string) => [
            name === 'cost' ? formatCurrency(value) : formatNumber(value),
            name === 'cost' ? 'Cost' : 'Requests',
          ]}
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
          }}
        />
        <Bar dataKey="requests" fill="hsl(var(--primary))" radius={[0, 4, 4, 0]} />
      </BarChart>
    </ResponsiveContainer>
  );
}

interface UsageByProviderChartProps {
  data: { name: string; value: number; cost: number }[];
}

function UsageByProviderChart({ data }: UsageByProviderChartProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[250px] border rounded-lg bg-muted/10">
        <p className="text-muted-foreground">No provider data available</p>
      </div>
    );
  }

  return (
    <ResponsiveContainer width="100%" height={250}>
      <PieChart>
        <Pie
          data={data}
          cx="50%"
          cy="50%"
          innerRadius={60}
          outerRadius={90}
          paddingAngle={2}
          dataKey="value"
          nameKey="name"
          label={({ name, percent }) => `${name} (${(percent * 100).toFixed(0)}%)`}
          labelLine={{ stroke: 'hsl(var(--muted-foreground))', strokeWidth: 1 }}
        >
          {data.map((_, index) => (
            <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip
          formatter={(value: number) => [formatNumber(value), 'Requests']}
          contentStyle={{
            backgroundColor: 'hsl(var(--card))',
            border: '1px solid hsl(var(--border))',
            borderRadius: '8px',
          }}
        />
      </PieChart>
    </ResponsiveContainer>
  );
}

interface TopModelsListProps {
  data: { model: string; requests: number; cost: number }[];
}

function TopModelsList({ data }: TopModelsListProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] border rounded-lg bg-muted/10">
        <p className="text-muted-foreground">No model data available</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {data.slice(0, 10).map((item, index) => (
        <div
          key={item.model}
          className="flex items-center justify-between p-3 rounded-lg border bg-card hover:bg-muted/50 transition-colors"
        >
          <div className="flex items-center gap-3">
            <span
              className={cn(
                'flex items-center justify-center w-6 h-6 rounded-full text-xs font-bold',
                index === 0
                  ? 'bg-yellow-500/20 text-yellow-500'
                  : index === 1
                  ? 'bg-gray-400/20 text-gray-400'
                  : index === 2
                  ? 'bg-amber-600/20 text-amber-600'
                  : 'bg-muted text-muted-foreground'
              )}
            >
              {index + 1}
            </span>
            <div>
              <p className="font-medium text-sm">{item.model}</p>
              <p className="text-xs text-muted-foreground">
                {formatNumber(item.requests)} requests
              </p>
            </div>
          </div>
          <div className="text-right">
            <p className="font-semibold text-sm">{formatCurrency(item.cost)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

interface ActivityLogTableProps {
  records: UsageRecord[];
  filters: FilterState;
  onFilterChange: (filters: FilterState) => void;
  page: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onExport: () => void;
}

function ActivityLogTable({
  records,
  filters,
  onFilterChange,
  page,
  pageSize,
  onPageChange,
  onExport,
}: ActivityLogTableProps) {
  const filteredRecords = useMemo(() => {
    return records.filter((record) => {
      const searchLower = filters.search.toLowerCase();
      const matchesSearch =
        !filters.search ||
        record.model.toLowerCase().includes(searchLower) ||
        record.provider.toLowerCase().includes(searchLower);

      const matchesModel = !filters.model || record.model === filters.model;
      const matchesProvider = !filters.provider || record.provider === filters.provider;

      return matchesSearch && matchesModel && matchesProvider;
    });
  }, [records, filters]);

  const totalPages = Math.ceil(filteredRecords.length / pageSize);
  const paginatedRecords = filteredRecords.slice((page - 1) * pageSize, page * pageSize);

  const uniqueModels = useMemo(
    () => [...new Set(records.map((r) => r.model))].sort(),
    [records]
  );
  const uniqueProviders = useMemo(
    () => [...new Set(records.map((r) => r.provider))].sort(),
    [records]
  );

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search by model or provider..."
            value={filters.search}
            onChange={(e) => onFilterChange({ ...filters, search: e.target.value })}
            className="pl-9"
          />
        </div>
        <select
          value={filters.model}
          onChange={(e) => onFilterChange({ ...filters, model: e.target.value })}
          className="h-10 px-3 rounded-md border bg-background text-sm"
        >
          <option value="">All Models</option>
          {uniqueModels.map((model) => (
            <option key={model} value={model}>
              {model}
            </option>
          ))}
        </select>
        <select
          value={filters.provider}
          onChange={(e) => onFilterChange({ ...filters, provider: e.target.value })}
          className="h-10 px-3 rounded-md border bg-background text-sm"
        >
          <option value="">All Providers</option>
          {uniqueProviders.map((provider) => (
            <option key={provider} value={provider}>
              {provider}
            </option>
          ))}
        </select>
        <Button variant="outline" onClick={onExport} className="gap-2">
          <Download className="h-4 w-4" />
          Export CSV
        </Button>
      </div>

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b bg-muted/30">
                <th className="h-10 px-4 text-left text-xs font-medium text-muted-foreground uppercase">
                  Time
                </th>
                <th className="h-10 px-4 text-left text-xs font-medium text-muted-foreground uppercase">
                  Provider
                </th>
                <th className="h-10 px-4 text-left text-xs font-medium text-muted-foreground uppercase">
                  Model
                </th>
                <th className="h-10 px-4 text-right text-xs font-medium text-muted-foreground uppercase">
                  Input Tokens
                </th>
                <th className="h-10 px-4 text-right text-xs font-medium text-muted-foreground uppercase">
                  Output Tokens
                </th>
                <th className="h-10 px-4 text-right text-xs font-medium text-muted-foreground uppercase">
                  Cost
                </th>
              </tr>
            </thead>
            <tbody>
              {paginatedRecords.length === 0 ? (
                <tr>
                  <td colSpan={6} className="h-24 text-center text-muted-foreground">
                    No records found
                  </td>
                </tr>
              ) : (
                paginatedRecords.map((record) => (
                  <tr key={record.id} className="border-b last:border-0 hover:bg-muted/50">
                    <td className="px-4 py-3 text-sm">
                      {format(new Date(record.created_at), 'MMM d, HH:mm')}
                    </td>
                    <td className="px-4 py-3 text-sm capitalize">{record.provider}</td>
                    <td className="px-4 py-3 text-sm font-medium">{record.model}</td>
                    <td className="px-4 py-3 text-sm text-right">
                      {formatNumber(record.input_tokens)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right">
                      {formatNumber(record.output_tokens)}
                    </td>
                    <td className="px-4 py-3 text-sm text-right font-medium">
                      {formatCurrency(record.cost_usd)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between">
          <p className="text-sm text-muted-foreground">
            Showing {(page - 1) * pageSize + 1} to{' '}
            {Math.min(page * pageSize, filteredRecords.length)} of {filteredRecords.length} records
          </p>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page - 1)}
              disabled={page === 1}
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Button>
            <span className="text-sm px-2">
              Page {page} of {totalPages}
            </span>
            <Button
              variant="outline"
              size="sm"
              onClick={() => onPageChange(page + 1)}
              disabled={page === totalPages}
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}

// ============================================================================
// Main Page Component
// ============================================================================

export default function AIUsageAnalyticsPage() {
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  const [page, setPage] = useState(1);
  const [filters, setFilters] = useState<FilterState>({
    search: '',
    taskType: '',
    model: '',
    provider: '',
  });

  const days = getDaysForRange(timeRange);
  const { data: usageData, isLoading, error } = useAIUsage(days, 500);

  // Reset page when filters change
  const handleFilterChange = (newFilters: FilterState) => {
    setFilters(newFilters);
    setPage(1);
  };

  // Prepare chart data
  const costOverTimeData = useMemo(() => {
    if (!usageData?.daily) return [];
    return usageData.daily.map((d) => ({
      date: d.date,
      cost: d.total_cost_usd,
      requests: d.total_requests,
    }));
  }, [usageData?.daily]);

  const usageByTaskTypeData = useMemo(() => {
    if (!usageData?.summary?.usage_by_model) return [];
    // Group by a pseudo "task type" based on model patterns
    const taskTypes: Record<string, { requests: number; cost: number }> = {};

    Object.entries(usageData.summary.usage_by_model).forEach(([model, stats]) => {
      let taskType = 'Other';
      if (model.includes('chat') || model.includes('gpt')) taskType = 'Chat';
      else if (model.includes('code') || model.includes('codex')) taskType = 'Code';
      else if (model.includes('vision') || model.includes('4o')) taskType = 'Vision';
      else if (model.includes('embed')) taskType = 'Embedding';
      else if (model.includes('claude')) taskType = 'Claude';

      if (!taskTypes[taskType]) {
        taskTypes[taskType] = { requests: 0, cost: 0 };
      }
      taskTypes[taskType].requests += stats.requests;
      taskTypes[taskType].cost += stats.cost;
    });

    return Object.entries(taskTypes)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.requests - a.requests);
  }, [usageData?.summary?.usage_by_model]);

  const usageByProviderData = useMemo(() => {
    if (!usageData?.summary?.usage_by_provider) return [];
    return Object.entries(usageData.summary.usage_by_provider)
      .map(([name, stats]) => ({
        name: name.charAt(0).toUpperCase() + name.slice(1),
        value: stats.requests,
        cost: stats.cost,
      }))
      .sort((a, b) => b.value - a.value);
  }, [usageData?.summary?.usage_by_provider]);

  const topModelsData = useMemo(() => {
    if (!usageData?.summary?.usage_by_model) return [];
    return Object.entries(usageData.summary.usage_by_model)
      .map(([model, stats]) => ({
        model,
        requests: stats.requests,
        cost: stats.cost,
      }))
      .sort((a, b) => b.cost - a.cost);
  }, [usageData?.summary?.usage_by_model]);

  // Export to CSV
  const handleExport = () => {
    if (!usageData?.records) return;

    const headers = ['Time', 'Provider', 'Model', 'Input Tokens', 'Output Tokens', 'Cost (USD)'];
    const rows = usageData.records.map((r) => [
      new Date(r.created_at).toISOString(),
      r.provider,
      r.model,
      r.input_tokens,
      r.output_tokens,
      r.cost_usd.toFixed(6),
    ]);

    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `ai-usage-${format(new Date(), 'yyyy-MM-dd')}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold">Usage Analytics</h2>
          <p className="text-sm text-muted-foreground">
            Monitor your AI usage and spending over time
          </p>
        </div>
        <TimeRangeToggle value={timeRange} onChange={setTimeRange} />
      </div>

      {isLoading ? (
            <LoadingState />
          ) : error ? (
            <Card>
              <CardContent className="flex items-center justify-center h-64">
                <p className="text-destructive">Failed to load usage data: {String(error)}</p>
              </CardContent>
            </Card>
          ) : !usageData?.summary ? (
            <EmptyState />
          ) : (
            <>
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
                        <DollarSign className="h-5 w-5 text-primary" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Cost</p>
                        <p className="text-2xl font-bold">
                          {formatCurrency(usageData.summary.total_cost_usd)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-blue-500/10">
                        <Zap className="h-5 w-5 text-blue-500" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Total Requests</p>
                        <p className="text-2xl font-bold">
                          {formatNumber(usageData.summary.total_requests)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-green-500/10">
                        <TrendingUp className="h-5 w-5 text-green-500" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Input Tokens</p>
                        <p className="text-2xl font-bold">
                          {formatNumber(usageData.summary.total_input_tokens)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="p-6">
                    <div className="flex items-center gap-3">
                      <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-orange-500/10">
                        <Cpu className="h-5 w-5 text-orange-500" />
                      </div>
                      <div>
                        <p className="text-sm text-muted-foreground">Output Tokens</p>
                        <p className="text-2xl font-bold">
                          {formatNumber(usageData.summary.total_output_tokens)}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Cost Over Time Chart */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5" />
                    Cost Over Time
                  </CardTitle>
                  <CardDescription>
                    Track your spending trends over the selected time period
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ChartErrorBoundary fallbackMessage="Unable to load cost chart">
                    <CostOverTimeChart data={costOverTimeData} timeRange={timeRange} />
                  </ChartErrorBoundary>
                </CardContent>
              </Card>

              {/* Usage Breakdown Section */}
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* By Task Type */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <BarChart3 className="h-4 w-4" />
                      By Task Type
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChartErrorBoundary fallbackMessage="Unable to load task type chart">
                      <UsageByTaskTypeChart data={usageByTaskTypeData} />
                    </ChartErrorBoundary>
                  </CardContent>
                </Card>

                {/* By Provider */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <PieChartIcon className="h-4 w-4" />
                      By Provider
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <ChartErrorBoundary fallbackMessage="Unable to load provider chart">
                      <UsageByProviderChart data={usageByProviderData} />
                    </ChartErrorBoundary>
                  </CardContent>
                </Card>

                {/* Top Models */}
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-base">
                      <Cpu className="h-4 w-4" />
                      Top Models
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <TopModelsList data={topModelsData} />
                  </CardContent>
                </Card>
              </div>

              {/* Activity Log */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    Activity Log
                  </CardTitle>
                  <CardDescription>Detailed record of all AI requests</CardDescription>
                </CardHeader>
                <CardContent>
                  <ActivityLogTable
                    records={usageData.records || []}
                    filters={filters}
                    onFilterChange={handleFilterChange}
                    page={page}
                    pageSize={20}
                    onPageChange={setPage}
                    onExport={handleExport}
                  />
                </CardContent>
              </Card>
            </>
          )}
    </div>
  );
}
