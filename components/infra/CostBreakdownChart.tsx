'use client';

import * as React from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export interface CostBreakdown {
  compute: number;
  network: number;
  storage: number;
  ai_inference: number;
  embeddings: number;
}

interface CostBreakdownChartProps {
  data: CostBreakdown | null;
  isLoading?: boolean;
}

const COLORS = {
  compute: '#22c55e',      // green - largest cost
  ai_inference: '#3b82f6', // blue - AI costs
  embeddings: '#8b5cf6',   // purple - embeddings
  network: '#f59e0b',      // amber
  storage: '#6b7280',      // gray
};

const LABELS: Record<string, string> = {
  compute: 'Browser Nodes',
  ai_inference: 'AI Inference',
  embeddings: 'Embeddings',
  network: 'Network',
  storage: 'Storage',
};

export function CostBreakdownChart({ data, isLoading = false }: CostBreakdownChartProps) {
  if (isLoading) {
    return <CostBreakdownChartSkeleton />;
  }

  if (!data) {
    return null;
  }

  const chartData = Object.entries(data)
    .filter(([_, value]) => value > 0)
    .map(([key, value]) => ({
      name: LABELS[key] || key,
      value: value,
      color: COLORS[key as keyof typeof COLORS] || '#6b7280',
    }))
    .sort((a, b) => b.value - a.value);

  const total = chartData.reduce((sum, item) => sum + item.value, 0);

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(value);
  };

  const CustomTooltip = ({ active, payload }: any) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
      const percentage = ((data.value / total) * 100).toFixed(1);
      return (
        <div className="bg-popover border rounded-lg shadow-lg p-3">
          <p className="font-medium">{data.name}</p>
          <p className="text-lg font-bold">{formatCurrency(data.value)}</p>
          <p className="text-sm text-muted-foreground">{percentage}% of total</p>
        </div>
      );
    }
    return null;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Cost Breakdown</CardTitle>
        <CardDescription>
          Monthly infrastructure costs by category
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex flex-col lg:flex-row items-center gap-6">
          {/* Pie Chart */}
          <div className="w-full lg:w-1/2 h-64">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={chartData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={90}
                  paddingAngle={2}
                  dataKey="value"
                >
                  {chartData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip content={<CustomTooltip />} />
              </PieChart>
            </ResponsiveContainer>
          </div>

          {/* Legend with values */}
          <div className="w-full lg:w-1/2 space-y-3">
            {chartData.map((item) => (
              <div key={item.name} className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-sm">{item.name}</span>
                </div>
                <div className="text-right">
                  <span className="font-medium">{formatCurrency(item.value)}</span>
                  <span className="text-muted-foreground text-xs ml-2">
                    ({((item.value / total) * 100).toFixed(0)}%)
                  </span>
                </div>
              </div>
            ))}
            <div className="pt-3 border-t">
              <div className="flex items-center justify-between font-semibold">
                <span>Total</span>
                <span>{formatCurrency(total)}</span>
              </div>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function CostBreakdownChartSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="h-6 w-36 bg-muted animate-pulse rounded" />
        <div className="h-4 w-56 bg-muted animate-pulse rounded mt-2" />
      </CardHeader>
      <CardContent>
        <div className="flex flex-col lg:flex-row items-center gap-6">
          <div className="w-full lg:w-1/2 h-64 flex items-center justify-center">
            <div className="w-48 h-48 rounded-full bg-muted animate-pulse" />
          </div>
          <div className="w-full lg:w-1/2 space-y-3">
            {[...Array(5)].map((_, i) => (
              <div key={i} className="flex items-center justify-between">
                <div className="h-4 w-24 bg-muted animate-pulse rounded" />
                <div className="h-4 w-16 bg-muted animate-pulse rounded" />
              </div>
            ))}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
