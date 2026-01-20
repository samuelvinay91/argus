'use client';

import { memo, useMemo } from 'react';
import { motion } from 'framer-motion';
import {
  Server,
  Activity,
  Cpu,
  DollarSign,
  TrendingDown,
  CheckCircle,
  AlertTriangle,
  XCircle,
  RefreshCw,
  Settings,
  Lightbulb,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface InfraStatusCardProps {
  data: {
    browser_pool: {
      status: 'healthy' | 'degraded' | 'down';
      pool_url: string;
      available_pods: number;
      active_sessions: number;
      total_capacity: number;
      utilization_percent: number;
    };
    costs?: {
      current_monthly_estimate: number;
      browserstack_equivalent: number;
      savings_percent: number;
      last_updated: string;
    };
    recommendations?: Array<{
      id: string;
      type: string;
      title: string;
      estimated_savings_monthly?: number;
    }>;
    _actions?: string[];
  };
  onAction?: (action: string) => void;
}

// Status indicator with color
function StatusBadge({ status }: { status: 'healthy' | 'degraded' | 'down' }) {
  const config = {
    healthy: { icon: CheckCircle, color: 'text-green-500', bg: 'bg-green-500/10', label: 'Healthy' },
    degraded: { icon: AlertTriangle, color: 'text-yellow-500', bg: 'bg-yellow-500/10', label: 'Degraded' },
    down: { icon: XCircle, color: 'text-red-500', bg: 'bg-red-500/10', label: 'Down' },
  };

  const { icon: Icon, color, bg, label } = config[status];

  return (
    <span className={cn('inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium', bg, color)}>
      <Icon className="h-3.5 w-3.5" />
      {label}
    </span>
  );
}

// Utilization bar component
function UtilizationBar({ percent, label }: { percent: number; label: string }) {
  const getColor = (p: number) => {
    if (p < 50) return 'bg-green-500';
    if (p < 80) return 'bg-yellow-500';
    return 'bg-red-500';
  };

  return (
    <div className="space-y-1">
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">{label}</span>
        <span className="font-medium">{percent.toFixed(1)}%</span>
      </div>
      <div className="h-2 bg-muted rounded-full overflow-hidden">
        <motion.div
          className={cn('h-full rounded-full', getColor(percent))}
          initial={{ width: 0 }}
          animate={{ width: `${Math.min(percent, 100)}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>
    </div>
  );
}

// Cost savings display
function CostSavingsDisplay({ costs }: {
  costs: {
    current_monthly_estimate: number;
    browserstack_equivalent: number;
    savings_percent: number;
  };
}) {
  const savings = costs.browserstack_equivalent - costs.current_monthly_estimate;

  return (
    <div className="p-3 rounded-lg bg-green-500/10 border border-green-500/20">
      <div className="flex items-center justify-between mb-2">
        <span className="text-xs font-medium text-green-600 flex items-center gap-1">
          <TrendingDown className="h-3.5 w-3.5" />
          Monthly Savings
        </span>
        <span className="text-lg font-bold text-green-600">
          ${savings.toFixed(0)}
        </span>
      </div>
      <div className="flex items-center justify-between text-xs text-muted-foreground">
        <div>
          <div>Self-hosted: <span className="font-medium text-foreground">${costs.current_monthly_estimate}</span></div>
          <div>BrowserStack: <span className="line-through">${costs.browserstack_equivalent}</span></div>
        </div>
        <div className="text-right">
          <div className="text-2xl font-bold text-green-600">{costs.savings_percent}%</div>
          <div className="text-[10px]">less expensive</div>
        </div>
      </div>
    </div>
  );
}

export const InfraStatusCard = memo(function InfraStatusCard({
  data,
  onAction,
}: InfraStatusCardProps) {
  const { browser_pool, costs, recommendations = [] } = data;

  const statusColor = {
    healthy: 'border-green-500/30 from-green-500/5 to-emerald-500/5',
    degraded: 'border-yellow-500/30 from-yellow-500/5 to-orange-500/5',
    down: 'border-red-500/30 from-red-500/5 to-rose-500/5',
  }[browser_pool.status];

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn(
        'rounded-lg border-2 overflow-hidden bg-gradient-to-br',
        statusColor
      )}
    >
      {/* Header */}
      <div className="px-4 py-3 border-b border-inherit bg-inherit flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-md bg-orange-500/20">
            <Server className="h-4 w-4 text-orange-500" />
          </div>
          <div>
            <h4 className="font-semibold text-sm">Infrastructure Status</h4>
            <p className="text-[10px] text-muted-foreground">
              Browser Pool at {browser_pool.pool_url}
            </p>
          </div>
        </div>
        <StatusBadge status={browser_pool.status} />
      </div>

      {/* Pool Stats */}
      <div className="p-4 space-y-4">
        {/* Capacity Grid */}
        <div className="grid grid-cols-3 gap-3">
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <div className="text-xl font-bold text-primary">
              {browser_pool.available_pods}
            </div>
            <div className="text-[10px] text-muted-foreground">Available</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <div className="text-xl font-bold text-amber-500">
              {browser_pool.active_sessions}
            </div>
            <div className="text-[10px] text-muted-foreground">Active</div>
          </div>
          <div className="text-center p-2 rounded-lg bg-muted/50">
            <div className="text-xl font-bold">
              {browser_pool.total_capacity}
            </div>
            <div className="text-[10px] text-muted-foreground">Capacity</div>
          </div>
        </div>

        {/* Utilization Bar */}
        <UtilizationBar
          percent={browser_pool.utilization_percent}
          label="Pool Utilization"
        />

        {/* Cost Savings */}
        {costs && (
          <CostSavingsDisplay costs={costs} />
        )}

        {/* Recommendations */}
        {recommendations.length > 0 && (
          <div className="space-y-2">
            <div className="text-xs font-medium text-muted-foreground flex items-center gap-1">
              <Lightbulb className="h-3 w-3" />
              Recommendations ({recommendations.length})
            </div>
            <div className="space-y-1">
              {recommendations.slice(0, 3).map((rec) => (
                <div
                  key={rec.id}
                  className="flex items-center justify-between text-xs bg-muted/50 rounded p-2"
                >
                  <span className="truncate flex-1">{rec.title}</span>
                  {rec.estimated_savings_monthly && (
                    <span className="text-green-500 font-medium flex-shrink-0 ml-2">
                      Save ${rec.estimated_savings_monthly}/mo
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Action Buttons */}
      <div className="px-4 py-3 border-t border-inherit bg-inherit flex items-center gap-2">
        <Button
          onClick={() => onAction?.('refresh_status')}
          size="sm"
          variant="outline"
          className="gap-1.5"
        >
          <RefreshCw className="h-3.5 w-3.5" />
          Refresh
        </Button>
        <Button
          onClick={() => onAction?.('view_metrics')}
          variant="ghost"
          size="sm"
          className="gap-1.5"
        >
          <Activity className="h-3.5 w-3.5" />
          Metrics
        </Button>
        <Button
          onClick={() => onAction?.('manage_pool')}
          variant="ghost"
          size="sm"
          className="gap-1.5 text-muted-foreground ml-auto"
        >
          <Settings className="h-3.5 w-3.5" />
          Manage
        </Button>
      </div>
    </motion.div>
  );
});

export default InfraStatusCard;
