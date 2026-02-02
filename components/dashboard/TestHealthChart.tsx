'use client';

import * as React from 'react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from 'recharts';
import { cn } from '@/lib/utils';
import { Loader2 } from 'lucide-react';

export interface TestHealthDataPoint {
  date: string;
  day: string;
  passed: number;
  failed: number;
  skipped?: number;
}

interface TestHealthChartProps {
  data: TestHealthDataPoint[];
  selectedPeriod: 7 | 30 | 90;
  onPeriodChange: (period: 7 | 30 | 90) => void;
  isLoading?: boolean;
}

const periods = [7, 30, 90] as const;

export function TestHealthChart({
  data,
  selectedPeriod,
  onPeriodChange,
  isLoading = false,
}: TestHealthChartProps) {
  // Format the data for display
  const chartData = React.useMemo(() => {
    return data.map((d) => ({
      ...d,
      total: d.passed + d.failed + (d.skipped || 0),
      passRate: d.passed + d.failed > 0
        ? Math.round((d.passed / (d.passed + d.failed)) * 100)
        : 0,
    }));
  }, [data]);

  const CustomTooltip = ({ active, payload, label }: { active?: boolean; payload?: Array<{ value: number; name: string; color: string }>; label?: string }) => {
    if (active && payload && payload.length) {
      const total = payload.reduce((sum, entry) => sum + entry.value, 0);
      const passRate = total > 0
        ? Math.round((payload.find(p => p.name === 'Passed')?.value || 0) / total * 100)
        : 0;

      return (
        <div className="bg-popover border border-border rounded-lg shadow-lg p-3 text-sm">
          <p className="font-medium text-foreground mb-2">{label}</p>
          <div className="space-y-1">
            {payload.map((entry, index) => (
              <div key={index} className="flex items-center justify-between gap-4">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-sm"
                    style={{ backgroundColor: entry.color }}
                  />
                  <span className="text-muted-foreground">{entry.name}</span>
                </div>
                <span className="font-medium">{entry.value}</span>
              </div>
            ))}
            <div className="border-t border-border pt-1 mt-1 flex items-center justify-between">
              <span className="text-muted-foreground">Pass Rate</span>
              <span className="font-medium text-success">{passRate}%</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-muted-foreground">Pass/fail distribution over time</p>
        <div className="flex rounded-lg border p-1">
          {periods.map((period) => (
            <button
              key={period}
              onClick={() => onPeriodChange(period)}
              className={cn(
                'px-3 py-1.5 text-xs font-medium rounded-md transition-colors',
                selectedPeriod === period
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:text-foreground'
              )}
            >
              {period}d
            </button>
          ))}
        </div>
      </div>
      <div>
        {isLoading ? (
          <div className="h-[280px] flex items-center justify-center">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
          </div>
        ) : data.length === 0 ? (
          <div className="h-[280px] flex items-center justify-center text-muted-foreground">
            No test data available for this period
          </div>
        ) : (
          <div className="h-[280px]">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart
                data={chartData}
                margin={{ top: 10, right: 10, left: 0, bottom: 0 }}
              >
                <defs>
                  <linearGradient id="colorPassed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--success))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--success))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorFailed" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--error))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--error))" stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="colorSkipped" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="hsl(var(--warning))" stopOpacity={0.3} />
                    <stop offset="95%" stopColor="hsl(var(--warning))" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid
                  strokeDasharray="3 3"
                  vertical={false}
                  stroke="hsl(var(--border))"
                />
                <XAxis
                  dataKey="day"
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  dy={10}
                />
                <YAxis
                  axisLine={false}
                  tickLine={false}
                  tick={{ fill: 'hsl(var(--muted-foreground))', fontSize: 12 }}
                  dx={-10}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend
                  wrapperStyle={{ paddingTop: 20 }}
                  formatter={(value) => (
                    <span className="text-sm text-muted-foreground">{value}</span>
                  )}
                />
                <Area
                  type="monotone"
                  dataKey="passed"
                  name="Passed"
                  stackId="1"
                  stroke="hsl(var(--success))"
                  fill="url(#colorPassed)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="failed"
                  name="Failed"
                  stackId="1"
                  stroke="hsl(var(--error))"
                  fill="url(#colorFailed)"
                  strokeWidth={2}
                />
                <Area
                  type="monotone"
                  dataKey="skipped"
                  name="Skipped"
                  stackId="1"
                  stroke="hsl(var(--warning))"
                  fill="url(#colorSkipped)"
                  strokeWidth={2}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        )}
      </div>
    </div>
  );
}

export function TestHealthChartSkeleton() {
  return (
    <div className="p-4">
      <div className="flex items-center justify-between mb-4">
        <div className="h-4 w-48 bg-muted animate-pulse rounded" />
        <div className="h-9 w-28 bg-muted animate-pulse rounded-lg" />
      </div>
      <div className="h-[280px] bg-muted/30 animate-pulse rounded-lg" />
    </div>
  );
}
