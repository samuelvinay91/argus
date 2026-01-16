'use client';

import * as React from 'react';
import { DollarSign, TrendingDown, Server, Cloud } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';

export interface CostOverviewData {
  currentMonthCost: number;
  projectedMonthCost: number;
  browserStackEquivalent: number;
  savingsPercentage: number;
  totalNodes: number;
  totalPods: number;
}

interface CostOverviewCardProps {
  data: CostOverviewData | null;
  isLoading?: boolean;
}

export function CostOverviewCard({ data, isLoading = false }: CostOverviewCardProps) {
  if (isLoading) {
    return <CostOverviewCardSkeleton />;
  }

  if (!data) {
    return null;
  }

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  return (
    <Card className="col-span-full">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <DollarSign className="h-5 w-5 text-success" />
              Infrastructure Cost Overview
            </CardTitle>
            <CardDescription>
              Browser pool infrastructure costs and savings vs cloud testing services
            </CardDescription>
          </div>
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-success/10 text-success">
            <TrendingDown className="h-4 w-4" />
            <span className="font-semibold">{data.savingsPercentage.toFixed(0)}% savings</span>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Current Month Cost */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Current Month</p>
            <p className="text-3xl font-bold text-foreground">
              {formatCurrency(data.currentMonthCost)}
            </p>
            <p className="text-xs text-muted-foreground">
              Projected: {formatCurrency(data.projectedMonthCost)}
            </p>
          </div>

          {/* BrowserStack Equivalent */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">BrowserStack Equivalent</p>
            <p className="text-3xl font-bold text-muted-foreground line-through decoration-error/50">
              {formatCurrency(data.browserStackEquivalent)}
            </p>
            <p className="text-xs text-success font-medium">
              You save {formatCurrency(data.browserStackEquivalent - data.projectedMonthCost)}/month
            </p>
          </div>

          {/* Infrastructure Stats */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Active Nodes</p>
            <div className="flex items-center gap-3">
              <Server className="h-8 w-8 text-info/50" />
              <div>
                <p className="text-3xl font-bold">{data.totalNodes}</p>
                <p className="text-xs text-muted-foreground">Kubernetes nodes</p>
              </div>
            </div>
          </div>

          {/* Browser Pods */}
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">Browser Pods</p>
            <div className="flex items-center gap-3">
              <Cloud className="h-8 w-8 text-info/50" />
              <div>
                <p className="text-3xl font-bold">{data.totalPods}</p>
                <p className="text-xs text-muted-foreground">Selenium Grid pods</p>
              </div>
            </div>
          </div>
        </div>

        {/* Savings Bar */}
        <div className="mt-6 pt-6 border-t">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Cost Comparison</span>
            <span className="text-sm text-muted-foreground">
              Self-hosted vs BrowserStack
            </span>
          </div>
          <div className="h-4 bg-muted rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-success to-success/70 rounded-full transition-all duration-500"
              style={{ width: `${100 - data.savingsPercentage}%` }}
            />
          </div>
          <div className="flex justify-between mt-1 text-xs text-muted-foreground">
            <span>Self-hosted: {formatCurrency(data.projectedMonthCost)}</span>
            <span>BrowserStack: {formatCurrency(data.browserStackEquivalent)}</span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export function CostOverviewCardSkeleton() {
  return (
    <Card className="col-span-full">
      <CardHeader>
        <div className="h-6 w-64 bg-muted animate-pulse rounded" />
        <div className="h-4 w-96 bg-muted animate-pulse rounded mt-2" />
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="space-y-2">
              <div className="h-4 w-24 bg-muted animate-pulse rounded" />
              <div className="h-9 w-32 bg-muted animate-pulse rounded" />
              <div className="h-3 w-20 bg-muted animate-pulse rounded" />
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
