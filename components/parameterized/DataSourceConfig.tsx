'use client';

import { useState, useCallback } from 'react';
import {
  Upload,
  Link as LinkIcon,
  Database,
  Variable,
  Globe,
  FileJson,
  FileSpreadsheet,
  Eye,
  Loader2,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Key,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { cn } from '@/lib/utils';

type DataSourceType = 'inline' | 'csv' | 'json' | 'api' | 'database' | 'spreadsheet';

interface ParameterSetInput {
  name: string;
  values: Record<string, any>;
  tags: string[];
  skip: boolean;
  skip_reason?: string;
  category?: string;
}

interface DataSourceConfigProps {
  type: DataSourceType;
  config: Record<string, any>;
  onChange: (config: Record<string, any>) => void;
  onParameterSetsLoaded?: (sets: ParameterSetInput[]) => void;
}

export function DataSourceConfig({
  type,
  config,
  onChange,
  onParameterSetsLoaded,
}: DataSourceConfigProps) {
  const [previewData, setPreviewData] = useState<ParameterSetInput[]>([]);
  const [previewLoading, setPreviewLoading] = useState(false);
  const [previewError, setPreviewError] = useState('');
  const [showPreview, setShowPreview] = useState(false);

  // Handle file upload for CSV/JSON
  const handleFileUpload = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setPreviewError('');
    setPreviewLoading(true);

    try {
      const text = await file.text();

      if (type === 'csv') {
        const lines = text.split('\n').filter(line => line.trim());
        if (lines.length < 2) {
          throw new Error('CSV must have at least a header row and one data row');
        }

        const delimiter = config.delimiter || ',';
        const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^"|"$/g, ''));

        const data: ParameterSetInput[] = lines.slice(1).map((line, index) => {
          const values = line.split(delimiter).map(v => v.trim().replace(/^"|"$/g, ''));
          const valueObj: Record<string, any> = {};
          headers.forEach((header, i) => {
            valueObj[header] = values[i] || '';
          });
          return {
            name: `Row ${index + 1}`,
            values: valueObj,
            tags: [],
            skip: false,
          };
        });

        setPreviewData(data.slice(0, 5));
        onChange({
          ...config,
          file_name: file.name,
          file_content: text,
          detected_headers: headers,
        });

      } else if (type === 'json') {
        const jsonData = JSON.parse(text);
        let arrayData: any[];

        // Handle different JSON structures
        if (Array.isArray(jsonData)) {
          arrayData = jsonData;
        } else if (config.json_path && typeof jsonData === 'object') {
          // Simple path parsing (e.g., "data.users")
          const path = config.json_path.split('.').filter(Boolean);
          let current = jsonData;
          for (const key of path) {
            current = current?.[key];
          }
          if (!Array.isArray(current)) {
            throw new Error('JSON path must point to an array');
          }
          arrayData = current;
        } else {
          throw new Error('JSON must be an array or have a valid json_path configured');
        }

        const data: ParameterSetInput[] = arrayData.map((item, index) => ({
          name: item.name || `Item ${index + 1}`,
          values: item.values || item,
          tags: item.tags || [],
          skip: item.skip || false,
        }));

        setPreviewData(data.slice(0, 5));
        onChange({
          ...config,
          file_name: file.name,
          file_content: text,
        });
      }

      setShowPreview(true);
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : 'Failed to parse file');
    } finally {
      setPreviewLoading(false);
    }
  }, [type, config, onChange]);

  // Load preview for URL-based sources
  const loadPreview = useCallback(async () => {
    setPreviewError('');
    setPreviewLoading(true);

    try {
      if (type === 'api') {
        if (!config.url) {
          throw new Error('API URL is required');
        }

        const headers: Record<string, string> = {
          'Content-Type': 'application/json',
        };
        if (config.auth_type === 'bearer' && config.auth_token) {
          headers['Authorization'] = `Bearer ${config.auth_token}`;
        } else if (config.auth_type === 'basic' && config.auth_username && config.auth_password) {
          headers['Authorization'] = `Basic ${btoa(`${config.auth_username}:${config.auth_password}`)}`;
        }

        const response = await fetch(config.url, {
          method: config.method || 'GET',
          headers,
        });

        if (!response.ok) {
          throw new Error(`API returned ${response.status}: ${response.statusText}`);
        }

        const jsonData = await response.json();
        const arrayData = Array.isArray(jsonData) ? jsonData : jsonData[config.response_path || 'data'] || [];

        const data: ParameterSetInput[] = arrayData.slice(0, 10).map((item: any, index: number) => ({
          name: item.name || `API Item ${index + 1}`,
          values: item.values || item,
          tags: [],
          skip: false,
        }));

        setPreviewData(data.slice(0, 5));
        setShowPreview(true);

      } else if (type === 'database') {
        // Database preview would typically go through a backend API
        // For now, show a placeholder
        setPreviewError('Database preview requires a backend connection. Configure the query and it will be executed at runtime.');
      }
    } catch (err) {
      setPreviewError(err instanceof Error ? err.message : 'Failed to load preview');
    } finally {
      setPreviewLoading(false);
    }
  }, [type, config]);

  // Apply preview data as parameter sets
  const applyPreviewData = () => {
    if (onParameterSetsLoaded && previewData.length > 0) {
      onParameterSetsLoaded(previewData);
    }
  };

  // Render configuration form based on type
  const renderConfig = () => {
    switch (type) {
      case 'inline':
        return (
          <div className="text-center py-6 text-muted-foreground">
            <FileJson className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>For inline data sources, configure parameters in the Parameters tab.</p>
          </div>
        );

      case 'csv':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">CSV File</label>
              <div className="border-2 border-dashed rounded-lg p-6 text-center">
                <FileSpreadsheet className="h-10 w-10 mx-auto mb-3 text-muted-foreground" />
                <input
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="csv-upload"
                />
                <label
                  htmlFor="csv-upload"
                  className="inline-flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-md cursor-pointer hover:bg-primary/90"
                >
                  <Upload className="h-4 w-4" />
                  Upload CSV
                </label>
                {config.file_name && (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Selected: {config.file_name}
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Delimiter</label>
                <select
                  value={config.delimiter || ','}
                  onChange={(e) => onChange({ ...config, delimiter: e.target.value })}
                  className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                >
                  <option value=",">Comma (,)</option>
                  <option value=";">Semicolon (;)</option>
                  <option value="\t">Tab</option>
                  <option value="|">Pipe (|)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Header Row</label>
                <select
                  value={config.has_header ? 'yes' : 'no'}
                  onChange={(e) => onChange({ ...config, has_header: e.target.value === 'yes' })}
                  className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                >
                  <option value="yes">First row is header</option>
                  <option value="no">No header row</option>
                </select>
              </div>
            </div>

            {config.detected_headers && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Detected Headers</label>
                <div className="flex flex-wrap gap-2">
                  {config.detected_headers.map((header: string) => (
                    <span key={header} className="px-2 py-1 bg-muted rounded text-sm font-mono">
                      {header}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </div>
        );

      case 'json':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">JSON File or URL</label>
              <div className="flex gap-2">
                <Input
                  placeholder="https://api.example.com/test-data.json"
                  value={config.url || ''}
                  onChange={(e) => onChange({ ...config, url: e.target.value })}
                />
                <span className="text-muted-foreground self-center">or</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleFileUpload}
                  className="hidden"
                  id="json-upload"
                />
                <label
                  htmlFor="json-upload"
                  className="inline-flex items-center gap-2 px-4 py-2 border rounded-md cursor-pointer hover:bg-muted"
                >
                  <Upload className="h-4 w-4" />
                  Upload
                </label>
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">JSON Path (Optional)</label>
              <Input
                placeholder="e.g., data.testCases or $.results"
                value={config.json_path || ''}
                onChange={(e) => onChange({ ...config, json_path: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Path to the array in the JSON structure. Leave empty if the root is an array.
              </p>
            </div>

            {config.file_name && (
              <p className="text-sm text-muted-foreground">
                Loaded: {config.file_name}
              </p>
            )}
          </div>
        );

      case 'spreadsheet':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Spreadsheet URL or ID</label>
              <Input
                placeholder="https://docs.google.com/spreadsheets/d/..."
                value={config.spreadsheet_url || ''}
                onChange={(e) => onChange({ ...config, spreadsheet_url: e.target.value })}
              />
              <p className="text-xs text-muted-foreground">
                Supports Google Sheets, Excel Online, and other spreadsheet URLs.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Sheet Name (Optional)</label>
              <Input
                placeholder="Sheet1"
                value={config.sheet_name || ''}
                onChange={(e) => onChange({ ...config, sheet_name: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Header Row</label>
              <Input
                type="number"
                min="1"
                placeholder="1"
                value={config.header_row || 1}
                onChange={(e) => onChange({ ...config, header_row: parseInt(e.target.value) || 1 })}
              />
            </div>
          </div>
        );

      case 'api':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">API Endpoint URL</label>
              <Input
                placeholder="https://api.example.com/test-data"
                value={config.url || ''}
                onChange={(e) => onChange({ ...config, url: e.target.value })}
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">HTTP Method</label>
                <select
                  value={config.method || 'GET'}
                  onChange={(e) => onChange({ ...config, method: e.target.value })}
                  className="w-full h-10 rounded-md border bg-background px-3 text-sm"
                >
                  <option value="GET">GET</option>
                  <option value="POST">POST</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Response Path</label>
                <Input
                  placeholder="data or results"
                  value={config.response_path || ''}
                  onChange={(e) => onChange({ ...config, response_path: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">Authentication</label>
              <select
                value={config.auth_type || 'none'}
                onChange={(e) => onChange({ ...config, auth_type: e.target.value })}
                className="w-full h-10 rounded-md border bg-background px-3 text-sm"
              >
                <option value="none">No Authentication</option>
                <option value="bearer">Bearer Token</option>
                <option value="basic">Basic Auth</option>
                <option value="api_key">API Key</option>
              </select>
            </div>

            {config.auth_type === 'bearer' && (
              <div className="space-y-2">
                <label className="text-sm font-medium">Bearer Token</label>
                <Input
                  type="password"
                  placeholder="Enter bearer token"
                  value={config.auth_token || ''}
                  onChange={(e) => onChange({ ...config, auth_token: e.target.value })}
                />
              </div>
            )}

            {config.auth_type === 'basic' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Username</label>
                  <Input
                    placeholder="Username"
                    value={config.auth_username || ''}
                    onChange={(e) => onChange({ ...config, auth_username: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">Password</label>
                  <Input
                    type="password"
                    placeholder="Password"
                    value={config.auth_password || ''}
                    onChange={(e) => onChange({ ...config, auth_password: e.target.value })}
                  />
                </div>
              </div>
            )}

            {config.auth_type === 'api_key' && (
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-sm font-medium">Header Name</label>
                  <Input
                    placeholder="X-API-Key"
                    value={config.api_key_header || ''}
                    onChange={(e) => onChange({ ...config, api_key_header: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium">API Key</label>
                  <Input
                    type="password"
                    placeholder="Enter API key"
                    value={config.api_key || ''}
                    onChange={(e) => onChange({ ...config, api_key: e.target.value })}
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-medium">Refresh Interval (Hours)</label>
              <Input
                type="number"
                min={0}
                placeholder="24"
                value={config.refresh_interval_hours || ''}
                onChange={(e) => onChange({ ...config, refresh_interval_hours: parseInt(e.target.value) || null })}
              />
              <p className="text-xs text-muted-foreground">
                How often to refresh data from the API. Set to 0 for no caching.
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={loadPreview}
              disabled={previewLoading || !config.url}
            >
              {previewLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Eye className="h-4 w-4 mr-2" />
              )}
              Test Connection & Preview
            </Button>
          </div>
        );

      case 'database':
        return (
          <div className="space-y-4">
            <div className="space-y-2">
              <label className="text-sm font-medium">Database Connection</label>
              <select
                value={config.connection_id || ''}
                onChange={(e) => onChange({ ...config, connection_id: e.target.value })}
                className="w-full h-10 rounded-md border bg-background px-3 text-sm"
              >
                <option value="">Select a connection...</option>
                <option value="default">Default Project Database</option>
              </select>
              <p className="text-xs text-muted-foreground">
                Database connections can be configured in Settings.
              </p>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium">SQL Query</label>
              <Textarea
                placeholder="SELECT username, password, expected_name FROM test_users WHERE active = true"
                value={config.query || ''}
                onChange={(e) => onChange({ ...config, query: e.target.value })}
                rows={5}
                className="font-mono text-sm"
              />
              <p className="text-xs text-muted-foreground">
                Each row returned will become a parameter set. Column names become parameter names.
              </p>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={loadPreview}
              disabled={previewLoading || !config.connection_id || !config.query}
            >
              {previewLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : (
                <Eye className="h-4 w-4 mr-2" />
              )}
              Preview Query Results
            </Button>
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className="space-y-4">
      {renderConfig()}

      {/* Error Display */}
      {previewError && (
        <div className="flex items-center gap-2 p-3 bg-error/10 border border-error/20 rounded-lg text-error text-sm">
          <AlertCircle className="h-4 w-4 flex-shrink-0" />
          {previewError}
        </div>
      )}

      {/* Preview Section */}
      {showPreview && previewData.length > 0 && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-sm font-medium">Preview (First 5 sets)</h4>
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={applyPreviewData}
            >
              <CheckCircle2 className="h-4 w-4 mr-1" />
              Use This Data
            </Button>
          </div>
          <div className="border rounded-lg overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted">
                <tr>
                  <th className="px-3 py-2 text-left font-medium">Set Name</th>
                  {Object.keys(previewData[0]?.values || {}).slice(0, 4).map((key) => (
                    <th key={key} className="px-3 py-2 text-left font-medium truncate">
                      {key}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {previewData.map((set, index) => (
                  <tr key={index} className="border-t">
                    <td className="px-3 py-2">{set.name}</td>
                    {Object.values(set.values).slice(0, 4).map((value, i) => (
                      <td key={i} className="px-3 py-2 truncate max-w-[150px]">
                        {String(value)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
