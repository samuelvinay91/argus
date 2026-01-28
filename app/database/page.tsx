'use client';

import { useState } from 'react';
import { Sidebar } from '@/components/layout/sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import {
  Database,
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Table,
  Activity,
  Clock,
  HardDrive,
  Layers,
  Play,
  Loader2,
  Server,
  ArrowRight,
  FileCode,
  Shield,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import {
  useDatabaseHealth,
  useSchemaInfo,
  useMigrations,
  useDataIntegrity,
  useDBTestResults,
  useRunIntegrityCheck,
  useRefreshDatabaseHealth,
  type DatabaseHealth,
  type TableInfo,
  type MigrationInfo,
  type DataIntegrityResult,
  type DBTestResult,
} from '@/lib/hooks/use-database';

type TabType = 'overview' | 'schema' | 'integrity' | 'migrations' | 'tests';

function StatusBadge({ status }: { status: DatabaseHealth['status'] }) {
  const config = {
    healthy: { color: 'bg-green-500/10 text-green-500 border-green-500/30', label: 'Healthy' },
    degraded: { color: 'bg-amber-500/10 text-amber-500 border-amber-500/30', label: 'Degraded' },
    unhealthy: { color: 'bg-red-500/10 text-red-500 border-red-500/30', label: 'Unhealthy' },
    unknown: { color: 'bg-gray-500/10 text-gray-500 border-gray-500/30', label: 'Unknown' },
  };

  const { color, label } = config[status] || config.unknown;

  return (
    <Badge className={cn('border', color)}>
      {status === 'healthy' && <CheckCircle className="h-3 w-3 mr-1" />}
      {status === 'degraded' && <AlertTriangle className="h-3 w-3 mr-1" />}
      {status === 'unhealthy' && <XCircle className="h-3 w-3 mr-1" />}
      {label}
    </Badge>
  );
}

function ConnectionBadge({ status }: { status: DatabaseHealth['connectionStatus'] }) {
  const config = {
    connected: { color: 'bg-green-500', label: 'Connected' },
    disconnected: { color: 'bg-gray-500', label: 'Disconnected' },
    error: { color: 'bg-red-500', label: 'Error' },
  };

  const { color, label } = config[status] || config.disconnected;

  return (
    <div className="flex items-center gap-2">
      <span className={cn('h-2 w-2 rounded-full animate-pulse', color)} />
      <span className="text-sm text-muted-foreground">{label}</span>
    </div>
  );
}

function HealthOverviewCard({ health, isLoading, onRefresh, isRefreshing }: {
  health: DatabaseHealth | undefined;
  isLoading: boolean;
  onRefresh: () => void;
  isRefreshing: boolean;
}) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/4" />
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {[1, 2, 3, 4].map((i) => (
                <div key={i} className="h-20 bg-muted rounded" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between pb-2">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-primary/10">
            <Database className="h-5 w-5 text-primary" />
          </div>
          <div>
            <CardTitle className="text-lg">Database Health</CardTitle>
            <CardDescription>
              Last checked: {health?.lastChecked ? new Date(health.lastChecked).toLocaleString() : 'Never'}
            </CardDescription>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <StatusBadge status={health?.status || 'unknown'} />
          <Button
            variant="outline"
            size="sm"
            onClick={onRefresh}
            disabled={isRefreshing}
          >
            <RefreshCw className={cn('h-4 w-4 mr-2', isRefreshing && 'animate-spin')} />
            Refresh
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div className="p-4 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Server className="h-4 w-4" />
              <span className="text-sm">Connection</span>
            </div>
            <ConnectionBadge status={health?.connectionStatus || 'disconnected'} />
          </div>

          <div className="p-4 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Clock className="h-4 w-4" />
              <span className="text-sm">Latency</span>
            </div>
            <p className="text-2xl font-bold">{health?.latencyMs || 0}ms</p>
          </div>

          <div className="p-4 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <Table className="h-4 w-4" />
              <span className="text-sm">Tables</span>
            </div>
            <p className="text-2xl font-bold">{health?.tableCount || 0}</p>
          </div>

          <div className="p-4 rounded-lg bg-muted/30">
            <div className="flex items-center gap-2 text-muted-foreground mb-2">
              <HardDrive className="h-4 w-4" />
              <span className="text-sm">Database Size</span>
            </div>
            <p className="text-2xl font-bold">{health?.databaseSize || '0 B'}</p>
          </div>
        </div>

        {health?.version && (
          <div className="mt-4 flex items-center gap-4 text-sm text-muted-foreground">
            {health.version && <span>Version: {health.version}</span>}
            {health.activeConnections !== undefined && (
              <span>
                Connections: {health.activeConnections}
                {health.maxConnections ? `/${health.maxConnections}` : ''}
              </span>
            )}
            {health.uptime && <span>Uptime: {health.uptime}</span>}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function SchemaCard({ tables, isLoading }: { tables: TableInfo[]; isLoading: boolean }) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-3">
            {[1, 2, 3, 4, 5].map((i) => (
              <div key={i} className="h-12 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Layers className="h-5 w-5" />
          Schema Overview
        </CardTitle>
        <CardDescription>
          {tables.length} table{tables.length !== 1 ? 's' : ''} in the database
        </CardDescription>
      </CardHeader>
      <CardContent>
        {tables.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Table className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No tables found</p>
            <p className="text-sm">Connect a database to view schema information</p>
          </div>
        ) : (
          <div className="space-y-2">
            {tables.map((table) => (
              <div
                key={table.name}
                className="flex items-center justify-between p-3 rounded-lg border hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-center gap-3">
                  <Table className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">{table.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {table.schema && `${table.schema}.`}
                      {table.rowCount.toLocaleString()} rows
                    </p>
                  </div>
                </div>
                <div className="text-right text-sm text-muted-foreground">
                  {formatBytes(table.sizeBytes)}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function IntegrityCard({
  results,
  passedCount,
  failedCount,
  warningCount,
  isLoading,
  onRunCheck,
  isRunning,
}: {
  results: DataIntegrityResult[];
  passedCount: number;
  failedCount: number;
  warningCount: number;
  isLoading: boolean;
  onRunCheck: () => void;
  isRunning: boolean;
}) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-4">
            <div className="h-8 bg-muted rounded w-1/3" />
            <div className="space-y-2">
              {[1, 2, 3].map((i) => (
                <div key={i} className="h-12 bg-muted rounded" />
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div>
          <CardTitle className="flex items-center gap-2">
            <Shield className="h-5 w-5" />
            Data Integrity
          </CardTitle>
          <CardDescription>
            Validate data constraints and relationships
          </CardDescription>
        </div>
        <Button onClick={onRunCheck} disabled={isRunning}>
          {isRunning ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Running...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2" />
              Run Checks
            </>
          )}
        </Button>
      </CardHeader>
      <CardContent>
        {/* Summary */}
        <div className="flex items-center gap-4 mb-4 pb-4 border-b">
          <div className="flex items-center gap-2">
            <CheckCircle className="h-4 w-4 text-green-500" />
            <span className="text-sm">{passedCount} Passed</span>
          </div>
          <div className="flex items-center gap-2">
            <XCircle className="h-4 w-4 text-red-500" />
            <span className="text-sm">{failedCount} Failed</span>
          </div>
          <div className="flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-amber-500" />
            <span className="text-sm">{warningCount} Warnings</span>
          </div>
        </div>

        {results.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Shield className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No integrity checks run yet</p>
            <p className="text-sm">Click "Run Checks" to validate data integrity</p>
          </div>
        ) : (
          <div className="space-y-2">
            {results.map((result, idx) => (
              <div
                key={idx}
                className={cn(
                  'flex items-center justify-between p-3 rounded-lg border',
                  result.status === 'passed' && 'border-green-500/30 bg-green-500/5',
                  result.status === 'failed' && 'border-red-500/30 bg-red-500/5',
                  result.status === 'warning' && 'border-amber-500/30 bg-amber-500/5'
                )}
              >
                <div className="flex items-center gap-3">
                  {result.status === 'passed' && <CheckCircle className="h-4 w-4 text-green-500" />}
                  {result.status === 'failed' && <XCircle className="h-4 w-4 text-red-500" />}
                  {result.status === 'warning' && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                  <div>
                    <p className="font-medium text-sm">{result.checkType}</p>
                    <p className="text-xs text-muted-foreground">{result.table}</p>
                  </div>
                </div>
                <p className="text-sm text-muted-foreground max-w-xs truncate">
                  {result.message}
                </p>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MigrationsCard({
  migrations,
  pendingCount,
  isLoading,
}: {
  migrations: MigrationInfo[];
  pendingCount: number;
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-12 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileCode className="h-5 w-5" />
          Migrations
        </CardTitle>
        <CardDescription>
          {pendingCount > 0 ? (
            <span className="text-amber-500">{pendingCount} pending migration{pendingCount !== 1 ? 's' : ''}</span>
          ) : (
            'All migrations applied'
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {migrations.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <FileCode className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No migrations found</p>
            <p className="text-sm">Migration history will appear here</p>
          </div>
        ) : (
          <div className="space-y-2">
            {migrations.map((migration) => (
              <div
                key={migration.id}
                className="flex items-center justify-between p-3 rounded-lg border"
              >
                <div className="flex items-center gap-3">
                  {migration.status === 'applied' && <CheckCircle className="h-4 w-4 text-green-500" />}
                  {migration.status === 'pending' && <Clock className="h-4 w-4 text-amber-500" />}
                  {migration.status === 'failed' && <XCircle className="h-4 w-4 text-red-500" />}
                  <div>
                    <p className="font-medium text-sm">{migration.name}</p>
                    <p className="text-xs text-muted-foreground">
                      {migration.appliedAt
                        ? `Applied: ${new Date(migration.appliedAt).toLocaleDateString()}`
                        : 'Not applied'}
                    </p>
                  </div>
                </div>
                <Badge
                  variant={migration.status === 'applied' ? 'default' : 'outline'}
                  className={cn(
                    migration.status === 'pending' && 'border-amber-500 text-amber-500',
                    migration.status === 'failed' && 'border-red-500 text-red-500'
                  )}
                >
                  {migration.status}
                </Badge>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function TestResultsCard({
  results,
  isLoading,
}: {
  results: DBTestResult[];
  isLoading: boolean;
}) {
  if (isLoading) {
    return (
      <Card>
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-3">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-16 bg-muted rounded" />
            ))}
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Activity className="h-5 w-5" />
          Recent Test Results
        </CardTitle>
        <CardDescription>
          Database test execution history
        </CardDescription>
      </CardHeader>
      <CardContent>
        {results.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            <Activity className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No test results yet</p>
            <p className="text-sm">Run database tests to see results here</p>
          </div>
        ) : (
          <div className="space-y-3">
            {results.slice(0, 10).map((result) => (
              <div
                key={result.testId}
                className={cn(
                  'p-4 rounded-lg border',
                  result.status === 'passed' && 'border-green-500/30 bg-green-500/5',
                  result.status === 'failed' && 'border-red-500/30 bg-red-500/5',
                  result.status === 'error' && 'border-red-500/30 bg-red-500/5'
                )}
              >
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {result.status === 'passed' && <CheckCircle className="h-4 w-4 text-green-500" />}
                    {(result.status === 'failed' || result.status === 'error') && (
                      <XCircle className="h-4 w-4 text-red-500" />
                    )}
                    <span className="font-medium">{result.testName}</span>
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {result.totalDurationMs}ms
                  </span>
                </div>
                <div className="flex items-center gap-4 text-sm text-muted-foreground">
                  <span>{result.queries.length} queries</span>
                  <span>{result.validations.length} validations</span>
                  {result.errorMessage && (
                    <span className="text-red-500 truncate max-w-xs">{result.errorMessage}</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

export default function DatabasePage() {
  const [activeTab, setActiveTab] = useState<TabType>('overview');

  // Data fetching hooks
  const healthQuery = useDatabaseHealth();
  const schemaQuery = useSchemaInfo();
  const migrationsQuery = useMigrations();
  const integrityQuery = useDataIntegrity();
  const testResultsQuery = useDBTestResults();

  // Mutation hooks
  const runIntegrityCheck = useRunIntegrityCheck();
  const refreshHealth = useRefreshDatabaseHealth();

  const handleRefreshHealth = () => {
    refreshHealth.mutate();
  };

  const handleRunIntegrityCheck = () => {
    runIntegrityCheck.mutate(undefined);
  };

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <Database className="h-4 w-4" /> },
    { id: 'schema', label: 'Schema', icon: <Layers className="h-4 w-4" /> },
    { id: 'integrity', label: 'Integrity', icon: <Shield className="h-4 w-4" /> },
    { id: 'migrations', label: 'Migrations', icon: <FileCode className="h-4 w-4" /> },
    { id: 'tests', label: 'Tests', icon: <Activity className="h-4 w-4" /> },
  ];

  return (
    <div className="flex min-h-screen overflow-x-hidden">
      <Sidebar />

      <main className="flex-1 lg:ml-64 min-w-0">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold flex items-center gap-2">
                <Database className="h-6 w-6 text-primary" />
                Database Testing
              </h1>
              <p className="text-muted-foreground">
                Monitor database health, validate data integrity, and run database tests
              </p>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1 w-fit overflow-x-auto">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors whitespace-nowrap',
                  activeTab === tab.id
                    ? 'bg-background shadow text-foreground'
                    : 'text-muted-foreground hover:text-foreground'
                )}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab Content */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              <HealthOverviewCard
                health={healthQuery.data}
                isLoading={healthQuery.isLoading}
                onRefresh={handleRefreshHealth}
                isRefreshing={refreshHealth.isPending}
              />

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Quick Stats */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Quick Actions</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3">
                    <Button
                      variant="outline"
                      className="w-full justify-between"
                      onClick={() => setActiveTab('integrity')}
                    >
                      <span className="flex items-center gap-2">
                        <Shield className="h-4 w-4" />
                        Run Integrity Checks
                      </span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-between"
                      onClick={() => setActiveTab('schema')}
                    >
                      <span className="flex items-center gap-2">
                        <Layers className="h-4 w-4" />
                        View Schema
                      </span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      className="w-full justify-between"
                      onClick={() => setActiveTab('migrations')}
                    >
                      <span className="flex items-center gap-2">
                        <FileCode className="h-4 w-4" />
                        Check Migrations
                      </span>
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </CardContent>
                </Card>

                {/* Recent Activity Preview */}
                <Card>
                  <CardHeader>
                    <CardTitle className="text-lg">Recent Activity</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Integrity Checks</span>
                        <span>
                          {integrityQuery.data?.passedCount || 0} passed /
                          {integrityQuery.data?.failedCount || 0} failed
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Pending Migrations</span>
                        <span>{migrationsQuery.data?.pendingCount || 0}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Total Tables</span>
                        <span>{schemaQuery.data?.totalTables || 0}</span>
                      </div>
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-muted-foreground">Recent Tests</span>
                        <span>{testResultsQuery.data?.totalCount || 0}</span>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          )}

          {activeTab === 'schema' && (
            <SchemaCard
              tables={schemaQuery.data?.tables || []}
              isLoading={schemaQuery.isLoading}
            />
          )}

          {activeTab === 'integrity' && (
            <IntegrityCard
              results={integrityQuery.data?.results || []}
              passedCount={integrityQuery.data?.passedCount || 0}
              failedCount={integrityQuery.data?.failedCount || 0}
              warningCount={integrityQuery.data?.warningCount || 0}
              isLoading={integrityQuery.isLoading}
              onRunCheck={handleRunIntegrityCheck}
              isRunning={runIntegrityCheck.isPending}
            />
          )}

          {activeTab === 'migrations' && (
            <MigrationsCard
              migrations={migrationsQuery.data?.migrations || []}
              pendingCount={migrationsQuery.data?.pendingCount || 0}
              isLoading={migrationsQuery.isLoading}
            />
          )}

          {activeTab === 'tests' && (
            <TestResultsCard
              results={testResultsQuery.data?.results || []}
              isLoading={testResultsQuery.isLoading}
            />
          )}
        </div>
      </main>
    </div>
  );
}
