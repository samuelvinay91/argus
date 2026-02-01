'use client';

import { safeFormatDistanceToNow } from '@/lib/utils';
import {
  Play,
  Edit,
  Copy,
  Trash2,
  History,
  MoreHorizontal,
  Database,
  FileJson,
  FileSpreadsheet,
  Globe,
  Variable,
  ArrowRight,
  Layers,
  Shuffle,
  CheckCircle2,
  XCircle,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Badge, StatusDot } from '@/components/ui/data-table';
import { cn } from '@/lib/utils';
import type { ParameterizedTest } from '@/lib/hooks/use-parameterized';

// Data source type icons
const DataSourceIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  inline: FileJson,
  csv: FileSpreadsheet,
  json: FileJson,
  env: Variable,
  api: Globe,
  database: Database,
  spreadsheet: FileSpreadsheet,
};

// Iteration mode icons and configs
const IterationModes: Record<string, { icon: React.ComponentType<{ className?: string }>; label: string; color: string }> = {
  sequential: { icon: ArrowRight, label: 'Sequential', color: 'text-blue-500' },
  parallel: { icon: Layers, label: 'Parallel', color: 'text-purple-500' },
  random: { icon: Shuffle, label: 'Random', color: 'text-orange-500' },
};

interface ParameterizedTestCardProps {
  test: ParameterizedTest;
  onRun?: () => void;
  onEdit?: () => void;
  onClone?: () => void;
  onDelete?: () => void;
  onViewResults?: () => void;
  isRunning?: boolean;
}

export function ParameterizedTestCard({
  test,
  onRun,
  onEdit,
  onClone,
  onDelete,
  onViewResults,
  isRunning = false,
}: ParameterizedTestCardProps) {
  const DataSourceIcon = DataSourceIcons[test.data_source_type] || FileJson;
  const modeConfig = IterationModes[test.iteration_mode] || IterationModes.sequential;
  const ModeIcon = modeConfig.icon;

  const paramCount = typeof test.parameter_schema === 'object'
    ? Object.keys(test.parameter_schema || {}).length
    : 0;

  const priorityVariants: Record<string, 'error' | 'warning' | 'info' | 'default'> = {
    critical: 'error',
    high: 'warning',
    medium: 'info',
    low: 'default',
  };

  const dataSourceVariants: Record<string, 'default' | 'success' | 'warning' | 'error' | 'info' | 'outline'> = {
    inline: 'info',
    csv: 'success',
    json: 'warning',
    env: 'outline',
    api: 'error',
    database: 'default',
    spreadsheet: 'success',
  };

  return (
    <div
      className={cn(
        'border rounded-lg bg-card overflow-hidden transition-all hover:shadow-md',
        !test.is_active && 'opacity-60'
      )}
    >
      {/* Card Header */}
      <div className="flex items-start gap-4 p-4">
        {/* Icon */}
        <div className="h-12 w-12 rounded-lg bg-primary/10 flex items-center justify-center flex-shrink-0">
          <DataSourceIcon className="h-6 w-6 text-primary" />
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-2">
            <div>
              <h3 className="font-semibold text-lg truncate">{test.name}</h3>
              <p className="text-sm text-muted-foreground line-clamp-2">
                {test.description || 'No description'}
              </p>
            </div>

            {/* Priority Badge */}
            <Badge variant={priorityVariants[test.priority] || 'default'}>
              {test.priority}
            </Badge>
          </div>

          {/* Tags */}
          {test.tags && test.tags.length > 0 && (
            <div className="flex flex-wrap gap-1 mt-2">
              {test.tags.slice(0, 4).map((tag) => (
                <span
                  key={tag}
                  className="px-2 py-0.5 bg-muted rounded text-xs text-muted-foreground"
                >
                  {tag}
                </span>
              ))}
              {test.tags.length > 4 && (
                <span className="px-2 py-0.5 text-xs text-muted-foreground">
                  +{test.tags.length - 4} more
                </span>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Card Stats */}
      <div className="flex items-center gap-4 px-4 py-3 border-t bg-muted/30">
        {/* Data Source Type */}
        <div className="flex items-center gap-1.5">
          <Badge variant={dataSourceVariants[test.data_source_type] || 'default'}>
            {test.data_source_type.toUpperCase()}
          </Badge>
        </div>

        {/* Iteration Mode */}
        <div className="flex items-center gap-1.5">
          <ModeIcon className={cn('h-4 w-4', modeConfig.color)} />
          <span className="text-sm text-muted-foreground">{modeConfig.label}</span>
        </div>

        {/* Parameter Count */}
        <div className="flex items-center gap-1.5">
          <Variable className="h-4 w-4 text-muted-foreground" />
          <span className="text-sm text-muted-foreground">
            {paramCount} {paramCount === 1 ? 'param' : 'params'}
          </span>
        </div>

        <div className="flex-1" />

        {/* Last Run Status */}
        {test.last_run_status && (
          <div className="flex items-center gap-2">
            <StatusDot status={test.last_run_status} />
            <span className="text-sm capitalize">{test.last_run_status}</span>
            {test.last_run_at && (
              <span className="text-xs text-muted-foreground">
                {safeFormatDistanceToNow(test.last_run_at, { addSuffix: true })}
              </span>
            )}
          </div>
        )}

        {!test.last_run_status && (
          <span className="text-sm text-muted-foreground">Never run</span>
        )}
      </div>

      {/* Card Actions */}
      <div className="flex items-center justify-between px-4 py-3 border-t">
        <div className="flex items-center gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={onRun}
            disabled={isRunning}
          >
            {isRunning ? (
              <>
                <Clock className="h-4 w-4 mr-1.5 animate-pulse" />
                Running...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-1.5" />
                Run Test
              </>
            )}
          </Button>

          <Button
            variant="outline"
            size="sm"
            onClick={onViewResults}
          >
            <History className="h-4 w-4 mr-1.5" />
            Results
          </Button>
        </div>

        <div className="flex items-center gap-1">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={onEdit}
            title="Edit"
          >
            <Edit className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0"
            onClick={onClone}
            title="Clone"
          >
            <Copy className="h-4 w-4" />
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="h-8 w-8 p-0 text-muted-foreground hover:text-destructive"
            onClick={onDelete}
            title="Delete"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </div>
    </div>
  );
}

// Mini card variant for lists
interface ParameterizedTestMiniCardProps {
  test: ParameterizedTest;
  onClick?: () => void;
  selected?: boolean;
}

export function ParameterizedTestMiniCard({
  test,
  onClick,
  selected = false,
}: ParameterizedTestMiniCardProps) {
  const DataSourceIcon = DataSourceIcons[test.data_source_type] || FileJson;

  return (
    <div
      className={cn(
        'flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition-all',
        selected
          ? 'border-primary bg-primary/5'
          : 'border-border hover:border-primary/50 hover:bg-muted/50'
      )}
      onClick={onClick}
    >
      <div className="h-8 w-8 rounded bg-primary/10 flex items-center justify-center flex-shrink-0">
        <DataSourceIcon className="h-4 w-4 text-primary" />
      </div>

      <div className="flex-1 min-w-0">
        <h4 className="font-medium text-sm truncate">{test.name}</h4>
        <p className="text-xs text-muted-foreground truncate">
          {test.data_source_type.toUpperCase()} - {test.iteration_mode}
        </p>
      </div>

      {test.last_run_status && (
        <StatusDot status={test.last_run_status} />
      )}
    </div>
  );
}
