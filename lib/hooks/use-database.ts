'use client';

/**
 * Database Testing Hooks
 *
 * Provides hooks for database health monitoring, schema information,
 * and running database tests.
 */

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api-client';

// Types
export interface TableInfo {
  name: string;
  schema: string;
  rowCount: number;
  sizeBytes: number;
  lastAnalyzed?: string;
}

export interface ColumnInfo {
  name: string;
  dataType: string;
  isNullable: boolean;
  defaultValue?: string;
  isPrimaryKey: boolean;
  isForeignKey: boolean;
  references?: {
    table: string;
    column: string;
  };
}

export interface TableSchema {
  table: string;
  columns: ColumnInfo[];
}

export interface DatabaseHealth {
  status: 'healthy' | 'degraded' | 'unhealthy' | 'unknown';
  connectionStatus: 'connected' | 'disconnected' | 'error';
  latencyMs: number;
  tableCount: number;
  totalRows: number;
  databaseSize: string;
  lastChecked: string;
  version?: string;
  uptime?: string;
  activeConnections?: number;
  maxConnections?: number;
  replicationLag?: number;
}

export interface MigrationInfo {
  id: string;
  name: string;
  status: 'applied' | 'pending' | 'failed';
  appliedAt?: string;
  checksum?: string;
}

export interface DataIntegrityResult {
  checkType: string;
  table: string;
  status: 'passed' | 'failed' | 'warning';
  message: string;
  details?: Record<string, unknown>;
}

export interface DBTestSpec {
  id?: string;
  name: string;
  description?: string;
  steps: {
    action: string;
    target: string;
    value?: unknown;
    conditions?: Record<string, unknown>;
  }[];
  assertions: {
    type: string;
    target: string;
    expected: unknown;
  }[];
}

export interface DBTestResult {
  testId: string;
  testName: string;
  status: 'passed' | 'failed' | 'error';
  queries: {
    query: string;
    rowCount: number;
    executionTimeMs: number;
    success: boolean;
    error?: string;
  }[];
  validations: {
    validationType: string;
    table: string;
    passed: boolean;
    expected: unknown;
    actual: unknown;
    error?: string;
  }[];
  totalDurationMs: number;
  errorMessage?: string;
}

export interface SchemaInfo {
  tables: TableInfo[];
  totalTables: number;
  totalRows: number;
  databaseSize: string;
}

// Default values
export const DEFAULT_DATABASE_HEALTH: DatabaseHealth = {
  status: 'unknown',
  connectionStatus: 'disconnected',
  latencyMs: 0,
  tableCount: 0,
  totalRows: 0,
  databaseSize: '0 B',
  lastChecked: new Date().toISOString(),
};

export const DEFAULT_SCHEMA_INFO: SchemaInfo = {
  tables: [],
  totalTables: 0,
  totalRows: 0,
  databaseSize: '0 B',
};

// Query keys factory
const databaseKeys = {
  all: ['database'] as const,
  health: (projectId?: string) => [...databaseKeys.all, 'health', projectId] as const,
  schema: (projectId?: string) => [...databaseKeys.all, 'schema', projectId] as const,
  tableSchema: (projectId: string, tableName: string) =>
    [...databaseKeys.all, 'table-schema', projectId, tableName] as const,
  migrations: (projectId?: string) => [...databaseKeys.all, 'migrations', projectId] as const,
  integrity: (projectId?: string) => [...databaseKeys.all, 'integrity', projectId] as const,
  testResults: (projectId?: string) => [...databaseKeys.all, 'test-results', projectId] as const,
};

/**
 * Hook to fetch database health metrics
 */
export function useDatabaseHealth(projectId?: string) {
  return useQuery({
    queryKey: databaseKeys.health(projectId),
    queryFn: async () => {
      try {
        const url = projectId
          ? `/api/v1/database/projects/${projectId}/health`
          : '/api/v1/database/health';
        return await apiClient.get<DatabaseHealth>(url);
      } catch (error) {
        console.error('Failed to fetch database health:', error);
        return DEFAULT_DATABASE_HEALTH;
      }
    },
    placeholderData: DEFAULT_DATABASE_HEALTH,
    refetchInterval: 30000, // Refresh every 30 seconds
  });
}

/**
 * Hook to fetch schema information (table list)
 */
export function useSchemaInfo(projectId?: string) {
  return useQuery({
    queryKey: databaseKeys.schema(projectId),
    queryFn: async () => {
      try {
        const url = projectId
          ? `/api/v1/database/projects/${projectId}/schema`
          : '/api/v1/database/schema';
        return await apiClient.get<SchemaInfo>(url);
      } catch (error) {
        console.error('Failed to fetch schema info:', error);
        return DEFAULT_SCHEMA_INFO;
      }
    },
    placeholderData: DEFAULT_SCHEMA_INFO,
  });
}

/**
 * Hook to fetch detailed schema for a specific table
 */
export function useTableSchema(projectId: string, tableName: string) {
  return useQuery({
    queryKey: databaseKeys.tableSchema(projectId, tableName),
    queryFn: async () => {
      try {
        return await apiClient.get<TableSchema>(
          `/api/v1/database/projects/${projectId}/tables/${tableName}/schema`
        );
      } catch (error) {
        console.error('Failed to fetch table schema:', error);
        return { table: tableName, columns: [] };
      }
    },
    enabled: !!projectId && !!tableName,
  });
}

/**
 * Hook to fetch migration status
 */
export function useMigrations(projectId?: string) {
  return useQuery({
    queryKey: databaseKeys.migrations(projectId),
    queryFn: async () => {
      try {
        const url = projectId
          ? `/api/v1/database/projects/${projectId}/migrations`
          : '/api/v1/database/migrations';
        return await apiClient.get<{ migrations: MigrationInfo[]; pendingCount: number }>(url);
      } catch (error) {
        console.error('Failed to fetch migrations:', error);
        return { migrations: [], pendingCount: 0 };
      }
    },
    placeholderData: { migrations: [], pendingCount: 0 },
  });
}

/**
 * Hook to fetch data integrity check results
 */
export function useDataIntegrity(projectId?: string) {
  return useQuery({
    queryKey: databaseKeys.integrity(projectId),
    queryFn: async () => {
      try {
        const url = projectId
          ? `/api/v1/database/projects/${projectId}/integrity`
          : '/api/v1/database/integrity';
        return await apiClient.get<{
          results: DataIntegrityResult[];
          passedCount: number;
          failedCount: number;
          warningCount: number;
          lastRun?: string;
        }>(url);
      } catch (error) {
        console.error('Failed to fetch data integrity results:', error);
        return { results: [], passedCount: 0, failedCount: 0, warningCount: 0 };
      }
    },
    placeholderData: { results: [], passedCount: 0, failedCount: 0, warningCount: 0 },
  });
}

/**
 * Hook to fetch recent database test results
 */
export function useDBTestResults(projectId?: string) {
  return useQuery({
    queryKey: databaseKeys.testResults(projectId),
    queryFn: async () => {
      try {
        const url = projectId
          ? `/api/v1/database/projects/${projectId}/test-results`
          : '/api/v1/database/test-results';
        return await apiClient.get<{ results: DBTestResult[]; totalCount: number }>(url);
      } catch (error) {
        console.error('Failed to fetch DB test results:', error);
        return { results: [], totalCount: 0 };
      }
    },
    placeholderData: { results: [], totalCount: 0 },
  });
}

/**
 * Hook to run database tests
 */
export function useRunDBTest(projectId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (testSpec: DBTestSpec) => {
      const url = projectId
        ? `/api/v1/database/projects/${projectId}/tests/run`
        : '/api/v1/database/tests/run';
      return apiClient.post<DBTestResult>(url, testSpec);
    },
    onSuccess: () => {
      // Invalidate test results to refresh the list
      queryClient.invalidateQueries({ queryKey: databaseKeys.testResults(projectId) });
      // Also invalidate integrity checks as they may have changed
      queryClient.invalidateQueries({ queryKey: databaseKeys.integrity(projectId) });
    },
  });
}

/**
 * Hook to run data integrity checks
 */
export function useRunIntegrityCheck(projectId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (checkTypes?: string[]) => {
      const url = projectId
        ? `/api/v1/database/projects/${projectId}/integrity/run`
        : '/api/v1/database/integrity/run';
      return apiClient.post<{
        results: DataIntegrityResult[];
        passedCount: number;
        failedCount: number;
        warningCount: number;
      }>(url, { checkTypes });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: databaseKeys.integrity(projectId) });
    },
  });
}

/**
 * Hook to refresh database health
 */
export function useRefreshDatabaseHealth(projectId?: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const url = projectId
        ? `/api/v1/database/projects/${projectId}/health/refresh`
        : '/api/v1/database/health/refresh';
      return apiClient.post<DatabaseHealth>(url);
    },
    onSuccess: (data) => {
      queryClient.setQueryData(databaseKeys.health(projectId), data);
    },
  });
}
