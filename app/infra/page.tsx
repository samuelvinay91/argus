'use client';

import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { RefreshCw, Server, DollarSign, Brain, Settings, Activity, BarChart3 } from 'lucide-react';
import { Sidebar } from '@/components/layout/sidebar';
import { Button } from '@/components/ui/button';
import {
  CostOverviewCard,
  CostOverviewCardSkeleton,
  RecommendationsPanel,
  RecommendationsPanelSkeleton,
  CostBreakdownChart,
  CostBreakdownChartSkeleton,
  LLMCostTracker,
  LLMCostTrackerSkeleton,
  BrowserNodesStatus,
  BrowserNodesStatusSkeleton,
  DataLayerHealthPanel,
  DataLayerHealthPanelSkeleton,
  DataLayerHealthIndicator,
  MonitoringPanel,
  MonitoringPanelSkeleton,
} from '@/components/infra';
import {
  useInfraCostOverview,
  useInfraRecommendations,
  useInfraCostBreakdown,
  useLLMCostTracking,
  useInfraSnapshot,
  useApplyRecommendation,
  useDataLayerHealth,
} from '@/lib/hooks/use-infra';
import { cn } from '@/lib/utils';

type TabType = 'overview' | 'system-health' | 'browser-pool' | 'ai-costs' | 'monitoring' | 'recommendations';

export default function InfrastructurePage() {
  const { user, isLoaded: userLoaded } = useUser();
  const [activeTab, setActiveTab] = useState<TabType>('overview');
  const [selectedPeriod, setSelectedPeriod] = useState<7 | 30 | 90>(30);

  // Data fetching
  const costOverview = useInfraCostOverview(selectedPeriod);
  const recommendations = useInfraRecommendations();
  const costBreakdown = useInfraCostBreakdown(selectedPeriod);
  const llmCosts = useLLMCostTracking(`${selectedPeriod}d`);
  const infraSnapshot = useInfraSnapshot();
  const applyRecommendation = useApplyRecommendation();
  const dataLayerHealth = useDataLayerHealth();

  const handleRefresh = () => {
    costOverview.refetch();
    recommendations.refetch();
    infraSnapshot.refetch();
    llmCosts.refetch();
    dataLayerHealth.refetch();
  };

  const handleApplyRecommendation = async (id: string) => {
    await applyRecommendation.mutateAsync({ id, auto: false });
  };

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <DollarSign className="h-4 w-4" /> },
    { id: 'system-health', label: 'System Health', icon: <Activity className="h-4 w-4" /> },
    { id: 'browser-pool', label: 'Browser Pool', icon: <Server className="h-4 w-4" /> },
    { id: 'ai-costs', label: 'AI / LLM Costs', icon: <Brain className="h-4 w-4" /> },
    { id: 'monitoring', label: 'Monitoring', icon: <BarChart3 className="h-4 w-4" /> },
    { id: 'recommendations', label: 'Recommendations', icon: <Settings className="h-4 w-4" /> },
  ];

  const isLoading = !userLoaded || costOverview.isLoading;

  return (
    <div className="flex min-h-screen overflow-x-hidden">
      <Sidebar />

      <main className="flex-1 lg:ml-64 min-w-0">
        <div className="p-6 space-y-6">
          {/* Header */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div>
              <h1 className="text-2xl font-bold">Infrastructure & Costs</h1>
              <p className="text-muted-foreground">
                Monitor browser pool infrastructure, AI usage, and cost optimization
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Period Selector */}
              <div className="flex items-center gap-1 bg-muted rounded-lg p-1">
                {[7, 30, 90].map((period) => (
                  <button
                    key={period}
                    onClick={() => setSelectedPeriod(period as 7 | 30 | 90)}
                    className={cn(
                      'px-3 py-1.5 rounded-md text-sm font-medium transition-colors',
                      selectedPeriod === period
                        ? 'bg-background shadow text-foreground'
                        : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {period}d
                  </button>
                ))}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleRefresh}
                disabled={isLoading}
              >
                <RefreshCw className={cn('h-4 w-4 mr-2', isLoading && 'animate-spin')} />
                Refresh
              </Button>
            </div>
          </div>

          {/* Tab Navigation */}
          <div className="flex items-center gap-1 bg-muted rounded-lg p-1 w-fit">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-colors',
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
              {/* System Health Summary */}
              <div className="flex items-center justify-between p-4 bg-muted/30 rounded-lg">
                <div className="flex items-center gap-4">
                  <span className="text-sm font-medium text-muted-foreground">System Status:</span>
                  <DataLayerHealthIndicator data={dataLayerHealth.data || null} />
                </div>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setActiveTab('system-health')}
                >
                  View Details
                </Button>
              </div>

              {/* Cost Overview */}
              {isLoading ? (
                <CostOverviewCardSkeleton />
              ) : (
                <CostOverviewCard data={costOverview.data} />
              )}

              {/* Two Column Layout */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Cost Breakdown */}
                {costBreakdown.isLoading ? (
                  <CostBreakdownChartSkeleton />
                ) : (
                  <CostBreakdownChart data={costBreakdown.data} />
                )}

                {/* Top Recommendations Preview */}
                {recommendations.isLoading ? (
                  <RecommendationsPanelSkeleton />
                ) : (
                  <RecommendationsPanel
                    recommendations={(recommendations.data?.recommendations || []).slice(0, 3)}
                    totalPotentialSavings={recommendations.data?.total_potential_savings || 0}
                    onApply={handleApplyRecommendation}
                  />
                )}
              </div>
            </div>
          )}

          {activeTab === 'system-health' && (
            <div className="space-y-6">
              {dataLayerHealth.isLoading ? (
                <DataLayerHealthPanelSkeleton />
              ) : (
                <DataLayerHealthPanel
                  data={dataLayerHealth.data || null}
                  onRefresh={() => dataLayerHealth.refetch()}
                  isRefreshing={dataLayerHealth.isFetching}
                />
              )}
            </div>
          )}

          {activeTab === 'browser-pool' && (
            <div className="space-y-6">
              {infraSnapshot.isLoading ? (
                <BrowserNodesStatusSkeleton />
              ) : (
                <BrowserNodesStatus
                  selenium={infraSnapshot.data?.selenium || null}
                  chromeNodes={infraSnapshot.data?.chrome_nodes || null}
                  firefoxNodes={infraSnapshot.data?.firefox_nodes || null}
                  edgeNodes={infraSnapshot.data?.edge_nodes || null}
                />
              )}
            </div>
          )}

          {activeTab === 'ai-costs' && (
            <div className="space-y-6">
              {llmCosts.isLoading ? (
                <LLMCostTrackerSkeleton />
              ) : (
                <LLMCostTracker data={llmCosts.data || null} />
              )}
            </div>
          )}

          {activeTab === 'monitoring' && (
            <div className="space-y-6">
              <MonitoringPanel />
            </div>
          )}

          {activeTab === 'recommendations' && (
            <div className="space-y-6">
              {recommendations.isLoading ? (
                <RecommendationsPanelSkeleton />
              ) : (
                <RecommendationsPanel
                  recommendations={recommendations.data?.recommendations || []}
                  totalPotentialSavings={recommendations.data?.total_potential_savings || 0}
                  onApply={handleApplyRecommendation}
                />
              )}
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
