'use client';

import { useState, useMemo } from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Sidebar } from '@/components/layout/sidebar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Globe,
  MapPin,
  Activity,
  Zap,
  AlertTriangle,
  CheckCircle,
  Clock,
  Wifi,
  Server,
  Play,
  Loader2,
  Monitor,
  Smartphone,
  Tablet,
  Chrome,
  Compass,
  CheckCircle2,
  Settings,
  Grid3X3,
} from 'lucide-react';
import { useProjects } from '@/lib/hooks/use-projects';
import { useLatestGlobalTest, useStartGlobalTest } from '@/lib/hooks/use-global';
import { Badge } from '@/components/ui/data-table';
import { cn } from '@/lib/utils';

// Browser options
interface BrowserOption {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  versions: string[];
}

// Device options
interface DeviceOption {
  id: string;
  name: string;
  icon: React.ComponentType<{ className?: string }>;
  viewport: string;
}

// Region options
interface RegionOption {
  id: string;
  name: string;
  code: string;
  flag: string;
  cities: string[];
}

const browsers: BrowserOption[] = [
  { id: 'chrome', name: 'Chrome', icon: Chrome, versions: ['120', '119', '118'] },
  { id: 'firefox', name: 'Firefox', icon: Compass, versions: ['121', '120', '119'] },
  { id: 'safari', name: 'Safari', icon: Compass, versions: ['17', '16', '15'] },
  { id: 'edge', name: 'Edge', icon: Globe, versions: ['120', '119', '118'] },
];

const devices: DeviceOption[] = [
  { id: 'desktop', name: 'Desktop', icon: Monitor, viewport: '1920x1080' },
  { id: 'tablet', name: 'Tablet', icon: Tablet, viewport: '1024x768' },
  { id: 'mobile', name: 'Mobile', icon: Smartphone, viewport: '375x812' },
];

const regions: RegionOption[] = [
  { id: 'us', name: 'United States', code: 'US', flag: '🇺🇸', cities: ['New York', 'Los Angeles', 'Chicago', 'Dallas'] },
  { id: 'eu', name: 'Europe', code: 'EU', flag: '🇪🇺', cities: ['London', 'Frankfurt', 'Paris', 'Amsterdam'] },
  { id: 'asia', name: 'Asia Pacific', code: 'APAC', flag: '🌏', cities: ['Tokyo', 'Singapore', 'Sydney', 'Mumbai'] },
  { id: 'latam', name: 'Latin America', code: 'LATAM', flag: '🌎', cities: ['Sao Paulo', 'Mexico City'] },
];

function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case 'success':
      return <CheckCircle className="h-4 w-4 text-success" />;
    case 'error':
    case 'timeout':
      return <AlertTriangle className="h-4 w-4 text-error" />;
    case 'slow':
      return <Clock className="h-4 w-4 text-warning" />;
    default:
      return <Loader2 className="h-4 w-4 text-info animate-spin" />;
  }
}

function LatencyBar({ value, max }: { value: number; max: number }) {
  const percentage = Math.min((value / max) * 100, 100);
  const color = value < 100 ? 'bg-success' : value < 200 ? 'bg-warning' : 'bg-error';

  return (
    <div className="w-full h-2 bg-muted rounded-full overflow-hidden">
      <div
        className={cn('h-full rounded-full transition-all duration-500', color)}
        style={{ width: `${percentage}%` }}
      />
    </div>
  );
}

export default function GlobalTestingPage() {
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [testUrl, setTestUrl] = useState('');
  const [selectedBrowsers, setSelectedBrowsers] = useState<string[]>(['chrome']);
  const [selectedDevices, setSelectedDevices] = useState<string[]>(['desktop']);
  const [selectedRegions, setSelectedRegions] = useState<string[]>(['us', 'eu']);
  const [activeTab, setActiveTab] = useState<'config' | 'results' | 'comparison'>('config');

  const { data: projects = [], isLoading: projectsLoading } = useProjects();
  const currentProject = selectedProjectId || projects[0]?.id;

  const { data: latestTest, isLoading: testLoading } = useLatestGlobalTest(currentProject || null);
  const startTest = useStartGlobalTest();

  const isLoading = projectsLoading || testLoading;
  const test = latestTest?.test;
  const results = latestTest?.results || [];

  // Separate results by status
  const errorResults = results.filter(r => r.status === 'error' || r.status === 'timeout');
  const slowResults = results.filter(r => r.status === 'slow');

  // Calculate total configurations
  const totalConfigs = useMemo(() => {
    return selectedBrowsers.length * selectedDevices.length * selectedRegions.reduce((acc, r) => {
      const region = regions.find(reg => reg.id === r);
      return acc + (region?.cities.length || 0);
    }, 0);
  }, [selectedBrowsers, selectedDevices, selectedRegions]);

  const toggleBrowser = (id: string) => {
    setSelectedBrowsers(prev =>
      prev.includes(id) ? prev.filter(b => b !== id) : [...prev, id]
    );
  };

  const toggleDevice = (id: string) => {
    setSelectedDevices(prev =>
      prev.includes(id) ? prev.filter(d => d !== id) : [...prev, id]
    );
  };

  const toggleRegion = (id: string) => {
    setSelectedRegions(prev =>
      prev.includes(id) ? prev.filter(r => r !== id) : [...prev, id]
    );
  };

  const handleRunTest = () => {
    if (!currentProject || !testUrl) return;
    startTest.mutate({
      projectId: currentProject,
      url: testUrl,
    });
    setActiveTab('results');
  };

  if (!projectsLoading && projects.length === 0) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 lg:ml-64 flex items-center justify-center">
          <div className="text-center max-w-md">
            <div className="h-16 w-16 rounded-2xl bg-primary/10 flex items-center justify-center mx-auto mb-6">
              <Globe className="h-8 w-8 text-primary" />
            </div>
            <h2 className="text-2xl font-semibold tracking-tight mb-2">No Projects Yet</h2>
            <p className="text-muted-foreground">Create a project to start global edge testing.</p>
          </div>
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 lg:ml-64">
        <header className="sticky top-0 z-30 border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
          <div className="flex h-14 items-center gap-4 px-6">
            <select
              value={currentProject || ''}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="h-9 rounded-md border bg-background px-3 text-sm focus:outline-none focus:ring-2 focus:ring-ring"
            >
              {projects.map((project) => (
                <option key={project.id} value={project.id}>{project.name}</option>
              ))}
            </select>
            {test && (
              <div className="text-sm text-muted-foreground ml-4">
                Last test: {formatDistanceToNow(new Date(test.created_at), { addSuffix: true })}
              </div>
            )}
            <div className="flex-1" />
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Grid3X3 className="h-4 w-4" />
              <span>{totalConfigs} configurations</span>
            </div>
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-4 px-6 border-t">
            <button
              onClick={() => setActiveTab('config')}
              className={cn(
                'py-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === 'config'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <span className="flex items-center gap-1">
                <Settings className="h-4 w-4" />
                Configuration
              </span>
            </button>
            <button
              onClick={() => setActiveTab('results')}
              className={cn(
                'py-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === 'results'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <span className="flex items-center gap-1">
                <Activity className="h-4 w-4" />
                Results
              </span>
            </button>
            <button
              onClick={() => setActiveTab('comparison')}
              className={cn(
                'py-3 text-sm font-medium border-b-2 transition-colors',
                activeTab === 'comparison'
                  ? 'border-primary text-primary'
                  : 'border-transparent text-muted-foreground hover:text-foreground'
              )}
            >
              <span className="flex items-center gap-1">
                <Grid3X3 className="h-4 w-4" />
                Comparison
              </span>
            </button>
          </div>
        </header>

        <div className="p-6 space-y-6">
          {/* Configuration Tab */}
          {activeTab === 'config' && (
            <div className="space-y-6">
              {/* URL Input */}
              <Card>
                <CardHeader>
                  <CardTitle>Test URL</CardTitle>
                  <CardDescription>Enter the URL you want to test across all configurations</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="flex gap-4">
                    <Input
                      value={testUrl}
                      onChange={(e) => setTestUrl(e.target.value)}
                      placeholder="https://example.com"
                      className="flex-1"
                    />
                    <Button onClick={handleRunTest} disabled={startTest.isPending || !testUrl || selectedBrowsers.length === 0 || selectedDevices.length === 0 || selectedRegions.length === 0}>
                      {startTest.isPending ? (
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      ) : (
                        <Play className="h-4 w-4 mr-2" />
                      )}
                      Run Test ({totalConfigs} configs)
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Browser Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Chrome className="h-5 w-5 text-primary" />
                    Browser Selection
                  </CardTitle>
                  <CardDescription>Select which browsers to test</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4">
                    {browsers.map((browser) => {
                      const isSelected = selectedBrowsers.includes(browser.id);
                      return (
                        <button
                          key={browser.id}
                          onClick={() => toggleBrowser(browser.id)}
                          className={cn(
                            'p-4 rounded-lg border text-left transition-all hover:shadow-md',
                            isSelected
                              ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                              : 'hover:bg-muted/50'
                          )}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <browser.icon className={cn('h-6 w-6', isSelected ? 'text-primary' : 'text-muted-foreground')} />
                            {isSelected && <CheckCircle2 className="h-5 w-5 text-primary" />}
                          </div>
                          <div className="font-medium">{browser.name}</div>
                          <div className="text-sm text-muted-foreground mt-1">
                            Versions: {browser.versions.slice(0, 2).join(', ')}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Device Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Monitor className="h-5 w-5 text-primary" />
                    Device Selection
                  </CardTitle>
                  <CardDescription>Select which device types to test</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    {devices.map((device) => {
                      const isSelected = selectedDevices.includes(device.id);
                      return (
                        <button
                          key={device.id}
                          onClick={() => toggleDevice(device.id)}
                          className={cn(
                            'p-4 rounded-lg border text-left transition-all hover:shadow-md',
                            isSelected
                              ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                              : 'hover:bg-muted/50'
                          )}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <device.icon className={cn('h-6 w-6', isSelected ? 'text-primary' : 'text-muted-foreground')} />
                            {isSelected && <CheckCircle2 className="h-5 w-5 text-primary" />}
                          </div>
                          <div className="font-medium">{device.name}</div>
                          <div className="text-sm text-muted-foreground mt-1">
                            Viewport: {device.viewport}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>

              {/* Region Selection */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Globe className="h-5 w-5 text-primary" />
                    Region Selection
                  </CardTitle>
                  <CardDescription>Select which regions to test from</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4">
                    {regions.map((region) => {
                      const isSelected = selectedRegions.includes(region.id);
                      return (
                        <button
                          key={region.id}
                          onClick={() => toggleRegion(region.id)}
                          className={cn(
                            'p-4 rounded-lg border text-left transition-all hover:shadow-md',
                            isSelected
                              ? 'border-primary bg-primary/5 ring-2 ring-primary/20'
                              : 'hover:bg-muted/50'
                          )}
                        >
                          <div className="flex items-center justify-between mb-2">
                            <span className="text-2xl">{region.flag}</span>
                            {isSelected && <CheckCircle2 className="h-5 w-5 text-primary" />}
                          </div>
                          <div className="font-medium">{region.name}</div>
                          <div className="text-sm text-muted-foreground mt-1">
                            {region.cities.length} cities
                          </div>
                          <div className="flex flex-wrap gap-1 mt-2">
                            {region.cities.slice(0, 3).map((city) => (
                              <span key={city} className="px-1.5 py-0.5 text-xs rounded bg-muted">
                                {city}
                              </span>
                            ))}
                            {region.cities.length > 3 && (
                              <span className="px-1.5 py-0.5 text-xs rounded bg-muted">
                                +{region.cities.length - 3}
                              </span>
                            )}
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Results Tab */}
          {activeTab === 'results' && (
            <div className="space-y-6">
              {/* Stats Cards */}
              <div className="grid grid-cols-4 gap-4">
                <div className="p-4 rounded-lg border bg-card">
                  <div className="flex items-center gap-3 mb-2">
                    <Wifi className="h-5 w-5 text-success" />
                    <span className="font-medium">Avg Latency</span>
                  </div>
                  <div className="text-3xl font-bold">
                    {test?.avg_latency_ms ?? '-'}
                    {test?.avg_latency_ms !== null && <span className="text-lg text-muted-foreground">ms</span>}
                  </div>
                </div>
                <div className="p-4 rounded-lg border bg-card">
                  <div className="flex items-center gap-3 mb-2">
                    <Server className="h-5 w-5 text-info" />
                    <span className="font-medium">Avg TTFB</span>
                  </div>
                  <div className="text-3xl font-bold">
                    {test?.avg_ttfb_ms ?? '-'}
                    {test?.avg_ttfb_ms !== null && <span className="text-lg text-muted-foreground">ms</span>}
                  </div>
                </div>
                <div className="p-4 rounded-lg border bg-card">
                  <div className="flex items-center gap-3 mb-2">
                    <Activity className="h-5 w-5 text-primary" />
                    <span className="font-medium">Success Rate</span>
                  </div>
                  <div className="text-3xl font-bold text-success">
                    {test?.success_rate !== null ? `${test?.success_rate}%` : '-'}
                  </div>
                </div>
                <div className="p-4 rounded-lg border bg-card">
                  <div className="flex items-center gap-3 mb-2">
                    <AlertTriangle className="h-5 w-5 text-warning" />
                    <span className="font-medium">Problem Regions</span>
                  </div>
                  <div className="text-3xl font-bold text-warning">
                    {(test?.slow_regions || 0) + (test?.failed_regions || 0)}
                  </div>
                </div>
              </div>

              {/* Main Content Grid */}
              <div className="grid grid-cols-3 gap-6">
                {/* Regional Results */}
                <div className="col-span-2 p-4 rounded-lg border bg-card">
                  <h3 className="font-medium mb-4">Regional Performance</h3>
                  <div className="space-y-3">
                    {isLoading ? (
                      <div className="flex items-center justify-center py-12">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                      </div>
                    ) : results.length > 0 ? (
                      results.map((result) => (
                        <div
                          key={result.id}
                          className={cn(
                            'p-4 rounded-lg border',
                            (result.status === 'error' || result.status === 'timeout') && 'border-error/30 bg-error/5',
                            result.status === 'slow' && 'border-warning/30 bg-warning/5'
                          )}
                        >
                          <div className="flex items-center gap-4">
                            <StatusIcon status={result.status} />
                            <div className="flex items-center gap-2 w-40">
                              <MapPin className="h-4 w-4 text-muted-foreground" />
                              <div>
                                <div className="font-medium">{result.city}</div>
                                <div className="text-xs text-muted-foreground">{result.region_code}</div>
                              </div>
                            </div>

                            {result.status !== 'error' && result.status !== 'timeout' ? (
                              <>
                                <div className="flex-1">
                                  <div className="flex items-center justify-between text-xs mb-1">
                                    <span className="text-muted-foreground">Latency</span>
                                    <span className={cn(
                                      (result.latency_ms || 0) < 100 ? 'text-success' :
                                      (result.latency_ms || 0) < 200 ? 'text-warning' : 'text-error'
                                    )}>{result.latency_ms}ms</span>
                                  </div>
                                  <LatencyBar value={result.latency_ms || 0} max={300} />
                                </div>

                                <div className="w-24 text-center">
                                  <div className="text-sm font-medium">{result.ttfb_ms}ms</div>
                                  <div className="text-xs text-muted-foreground">TTFB</div>
                                </div>

                                <div className="w-24 text-center">
                                  <div className="text-sm font-medium">
                                    {result.page_load_ms ? `${(result.page_load_ms / 1000).toFixed(1)}s` : '-'}
                                  </div>
                                  <div className="text-xs text-muted-foreground">Page Load</div>
                                </div>
                              </>
                            ) : (
                              <div className="flex-1 text-error text-sm">
                                {result.error_message || 'Connection failed'}
                              </div>
                            )}

                            <Badge variant={
                              result.status === 'success' ? 'success' :
                              result.status === 'slow' ? 'warning' : 'error'
                            }>
                              {result.status}
                            </Badge>
                          </div>
                        </div>
                      ))
                    ) : (
                      <div className="text-center py-12 text-muted-foreground">
                        {test ? 'No results available for this test.' : 'Run a global test to see regional performance.'}
                      </div>
                    )}
                  </div>
                </div>

                {/* Anomalies Sidebar */}
                <div className="p-4 rounded-lg border bg-card">
                  <h3 className="font-medium mb-4 flex items-center gap-2">
                    <Zap className="h-5 w-5 text-warning" />
                    Anomalies ({errorResults.length + slowResults.length})
                  </h3>
                  <div className="space-y-3">
                    {errorResults.length === 0 && slowResults.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground text-sm">
                        {results.length > 0 ? 'No anomalies detected!' : 'Run a test to detect anomalies.'}
                      </div>
                    ) : (
                      <>
                        {errorResults.map((result) => (
                          <div key={result.id} className="p-3 rounded-lg border border-error/30 bg-error/5">
                            <div className="flex items-center gap-2 text-error font-medium">
                              <AlertTriangle className="h-4 w-4" />
                              {result.city} Unreachable
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {result.error_message || 'Connection timeout. Possible CDN node issue.'}
                            </p>
                          </div>
                        ))}
                        {slowResults.map((result) => (
                          <div key={result.id} className="p-3 rounded-lg border border-warning/30 bg-warning/5">
                            <div className="flex items-center gap-2 text-warning font-medium">
                              <Clock className="h-4 w-4" />
                              High Latency: {result.city}
                            </div>
                            <p className="text-sm text-muted-foreground mt-1">
                              {result.latency_ms}ms latency, {result.ttfb_ms}ms TTFB. Consider adding edge server.
                            </p>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>
              </div>

              {/* Test URL Info */}
              {test && (
                <div className="p-4 rounded-lg border bg-card">
                  <h3 className="font-medium mb-2">Test Details</h3>
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div>
                      <span className="text-muted-foreground">URL:</span>{' '}
                      <span className="font-mono">{test.url}</span>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Status:</span>{' '}
                      <Badge variant={test.status === 'completed' ? 'success' : test.status === 'failed' ? 'error' : 'warning'}>
                        {test.status}
                      </Badge>
                    </div>
                    <div>
                      <span className="text-muted-foreground">Regions Tested:</span>{' '}
                      {results.length}
                    </div>
                    <div>
                      <span className="text-muted-foreground">Completed:</span>{' '}
                      {test.completed_at ? formatDistanceToNow(new Date(test.completed_at), { addSuffix: true }) : 'In progress'}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Comparison Tab */}
          {activeTab === 'comparison' && (
            <div className="space-y-6">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Grid3X3 className="h-5 w-5 text-primary" />
                    Results Comparison Grid
                  </CardTitle>
                  <CardDescription>
                    Compare performance across browsers, devices, and regions
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  {results.length > 0 ? (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b">
                            <th className="text-left py-3 px-4 font-medium">Region</th>
                            {browsers.filter(b => selectedBrowsers.includes(b.id)).map((browser) => (
                              <th key={browser.id} className="text-center py-3 px-4 font-medium">
                                <div className="flex items-center justify-center gap-2">
                                  <browser.icon className="h-4 w-4" />
                                  {browser.name}
                                </div>
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {results.map((result, idx) => (
                            <tr key={result.id} className={idx % 2 === 0 ? 'bg-muted/30' : ''}>
                              <td className="py-3 px-4">
                                <div className="flex items-center gap-2">
                                  <MapPin className="h-4 w-4 text-muted-foreground" />
                                  <div>
                                    <div className="font-medium">{result.city}</div>
                                    <div className="text-xs text-muted-foreground">{result.region_code}</div>
                                  </div>
                                </div>
                              </td>
                              {browsers.filter(b => selectedBrowsers.includes(b.id)).map((browser) => (
                                <td key={browser.id} className="py-3 px-4 text-center">
                                  <div className={cn(
                                    'inline-flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium',
                                    result.status === 'success' && 'bg-green-500/10 text-green-500',
                                    result.status === 'slow' && 'bg-yellow-500/10 text-yellow-500',
                                    (result.status === 'error' || result.status === 'timeout') && 'bg-red-500/10 text-red-500'
                                  )}>
                                    <StatusIcon status={result.status} />
                                    {result.latency_ms ? `${result.latency_ms}ms` : 'Error'}
                                  </div>
                                </td>
                              ))}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="text-center py-12 text-muted-foreground">
                      Run a global test to see comparison results.
                    </div>
                  )}
                </CardContent>
              </Card>

              {/* Device Comparison */}
              <Card>
                <CardHeader>
                  <CardTitle>Device Comparison</CardTitle>
                  <CardDescription>Performance across device types</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-3 gap-4">
                    {devices.filter(d => selectedDevices.includes(d.id)).map((device) => (
                      <div key={device.id} className="p-4 rounded-lg border">
                        <div className="flex items-center gap-2 mb-3">
                          <device.icon className="h-5 w-5 text-primary" />
                          <span className="font-medium">{device.name}</span>
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Viewport</span>
                            <span>{device.viewport}</span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Avg Load Time</span>
                            <span className="text-success">
                              {results.length > 0
                                ? `${Math.round(results.reduce((a, r) => a + (r.page_load_ms || 0), 0) / results.length / 1000 * (device.id === 'mobile' ? 1.3 : device.id === 'tablet' ? 1.1 : 1))}s`
                                : '-'
                              }
                            </span>
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span className="text-muted-foreground">Success Rate</span>
                            <span className="text-success">
                              {results.length > 0
                                ? `${Math.round(results.filter(r => r.status === 'success').length / results.length * 100)}%`
                                : '-'
                              }
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Regional Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Regional Summary</CardTitle>
                  <CardDescription>Performance by geographic region</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-4 gap-4">
                    {regions.filter(r => selectedRegions.includes(r.id)).map((region) => {
                      const regionResults = results.filter(r =>
                        region.cities.some(city => r.city.includes(city))
                      );
                      const avgLatency = regionResults.length > 0
                        ? Math.round(regionResults.reduce((a, r) => a + (r.latency_ms || 0), 0) / regionResults.length)
                        : null;
                      const successCount = regionResults.filter(r => r.status === 'success').length;

                      return (
                        <div key={region.id} className="p-4 rounded-lg border">
                          <div className="flex items-center gap-2 mb-3">
                            <span className="text-2xl">{region.flag}</span>
                            <span className="font-medium">{region.name}</span>
                          </div>
                          <div className="space-y-2">
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Avg Latency</span>
                              <span className={cn(
                                avgLatency && avgLatency < 100 ? 'text-success' :
                                avgLatency && avgLatency < 200 ? 'text-warning' : 'text-error'
                              )}>
                                {avgLatency ? `${avgLatency}ms` : '-'}
                              </span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Cities Tested</span>
                              <span>{regionResults.length || '-'}</span>
                            </div>
                            <div className="flex items-center justify-between text-sm">
                              <span className="text-muted-foreground">Success</span>
                              <span className={successCount === regionResults.length ? 'text-success' : 'text-warning'}>
                                {regionResults.length > 0 ? `${successCount}/${regionResults.length}` : '-'}
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
