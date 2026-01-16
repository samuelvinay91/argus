'use client';

import * as React from 'react';
import {
  Lightbulb,
  ArrowDown,
  ArrowUp,
  Settings,
  Clock,
  Trash2,
  AlertTriangle,
  Check,
  X,
  Loader2,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';

export interface Recommendation {
  id: string;
  type: 'scale_down' | 'scale_up' | 'right_size' | 'schedule_scaling' | 'cleanup_sessions' | 'cost_alert' | 'anomaly';
  priority: 'critical' | 'high' | 'medium' | 'low';
  title: string;
  description: string;
  estimated_savings_monthly: number;
  confidence: number;
  reasoning: string;
  status: 'pending' | 'approved' | 'rejected' | 'auto_applied' | 'expired';
  created_at: string;
}

interface RecommendationsPanelProps {
  recommendations: Recommendation[];
  totalPotentialSavings: number;
  isLoading?: boolean;
  onApply?: (id: string) => Promise<void>;
  onReject?: (id: string) => Promise<void>;
}

const typeIcons: Record<Recommendation['type'], React.ReactNode> = {
  scale_down: <ArrowDown className="h-4 w-4" />,
  scale_up: <ArrowUp className="h-4 w-4" />,
  right_size: <Settings className="h-4 w-4" />,
  schedule_scaling: <Clock className="h-4 w-4" />,
  cleanup_sessions: <Trash2 className="h-4 w-4" />,
  cost_alert: <AlertTriangle className="h-4 w-4" />,
  anomaly: <AlertTriangle className="h-4 w-4" />,
};

const priorityColors: Record<Recommendation['priority'], string> = {
  critical: 'bg-error/10 text-error border-error/30',
  high: 'bg-warning/10 text-warning border-warning/30',
  medium: 'bg-info/10 text-info border-info/30',
  low: 'bg-muted text-muted-foreground border-border',
};

const typeLabels: Record<Recommendation['type'], string> = {
  scale_down: 'Scale Down',
  scale_up: 'Scale Up',
  right_size: 'Right Size',
  schedule_scaling: 'Schedule',
  cleanup_sessions: 'Cleanup',
  cost_alert: 'Cost Alert',
  anomaly: 'Anomaly',
};

export function RecommendationsPanel({
  recommendations,
  totalPotentialSavings,
  isLoading = false,
  onApply,
  onReject,
}: RecommendationsPanelProps) {
  const [applyingId, setApplyingId] = React.useState<string | null>(null);
  const [rejectingId, setRejectingId] = React.useState<string | null>(null);

  const handleApply = async (id: string) => {
    if (!onApply) return;
    setApplyingId(id);
    try {
      await onApply(id);
    } finally {
      setApplyingId(null);
    }
  };

  const handleReject = async (id: string) => {
    if (!onReject) return;
    setRejectingId(id);
    try {
      await onReject(id);
    } finally {
      setRejectingId(null);
    }
  };

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const pendingRecommendations = recommendations.filter(r => r.status === 'pending');

  if (isLoading) {
    return <RecommendationsPanelSkeleton />;
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2">
              <Lightbulb className="h-5 w-5 text-warning" />
              AI Recommendations
            </CardTitle>
            <CardDescription>
              AI-generated optimization suggestions based on usage patterns
            </CardDescription>
          </div>
          {totalPotentialSavings > 0 && (
            <div className="text-right">
              <p className="text-sm text-muted-foreground">Potential Savings</p>
              <p className="text-xl font-bold text-success">
                {formatCurrency(totalPotentialSavings)}/mo
              </p>
            </div>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {pendingRecommendations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Lightbulb className="h-12 w-12 mx-auto mb-4 opacity-30" />
            <p className="font-medium">No pending recommendations</p>
            <p className="text-sm">Your infrastructure is optimized</p>
          </div>
        ) : (
          <div className="space-y-4">
            {pendingRecommendations.map((rec) => (
              <div
                key={rec.id}
                className={cn(
                  'p-4 rounded-lg border transition-colors',
                  priorityColors[rec.priority]
                )}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3 flex-1">
                    <div className="p-2 rounded-lg bg-background/50">
                      {typeIcons[rec.type]}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <h4 className="font-semibold truncate">{rec.title}</h4>
                        <Badge variant="outline" className="text-xs">
                          {typeLabels[rec.type]}
                        </Badge>
                      </div>
                      <p className="text-sm opacity-80 line-clamp-2">{rec.description}</p>
                      <div className="flex items-center gap-4 mt-2 text-xs opacity-70">
                        <span>Confidence: {(rec.confidence * 100).toFixed(0)}%</span>
                        <span>Savings: {formatCurrency(rec.estimated_savings_monthly)}/mo</span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="h-8"
                      onClick={() => handleReject(rec.id)}
                      disabled={!!rejectingId || !!applyingId}
                    >
                      {rejectingId === rec.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <X className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      size="sm"
                      className="h-8 bg-success hover:bg-success/90"
                      onClick={() => handleApply(rec.id)}
                      disabled={!!rejectingId || !!applyingId}
                    >
                      {applyingId === rec.id ? (
                        <Loader2 className="h-4 w-4 animate-spin mr-1" />
                      ) : (
                        <Check className="h-4 w-4 mr-1" />
                      )}
                      Apply
                    </Button>
                  </div>
                </div>
                {rec.reasoning && (
                  <details className="mt-3">
                    <summary className="text-xs cursor-pointer opacity-70 hover:opacity-100">
                      View AI reasoning
                    </summary>
                    <p className="mt-2 text-xs bg-background/50 p-2 rounded">
                      {rec.reasoning}
                    </p>
                  </details>
                )}
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export function RecommendationsPanelSkeleton() {
  return (
    <Card>
      <CardHeader>
        <div className="h-6 w-48 bg-muted animate-pulse rounded" />
        <div className="h-4 w-72 bg-muted animate-pulse rounded mt-2" />
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="p-4 rounded-lg border bg-muted/30">
              <div className="flex items-start gap-3">
                <div className="h-10 w-10 bg-muted animate-pulse rounded-lg" />
                <div className="flex-1 space-y-2">
                  <div className="h-5 w-48 bg-muted animate-pulse rounded" />
                  <div className="h-4 w-full bg-muted animate-pulse rounded" />
                  <div className="h-3 w-32 bg-muted animate-pulse rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
