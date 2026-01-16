'use client';

import { useState } from 'react';
import { useUser } from '@clerk/nextjs';
import { RefreshCw, Server, DollarSign, Brain, Settings } from 'lucide-react';
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
} from '@/components/infra';
import {
  useInfraCostOverview,
  useInfraRecommendations,
  useInfraCostBreakdown,
  useLLMCostTracking,
  useInfraSnapshot,
  useApplyRecommendation,
} from '@/lib/hooks/use-infra';
import { cn } from '@/lib/utils';

type TabType = 'overview' | 'browser-pool' | 'ai-costs' | 'recommendations';

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

  const handleRefresh = () => {
    costOverview.refetch();
    recommendations.refetch();
    infraSnapshot.refetch();
    llmCosts.refetch();
  };

  const handleApplyRecommendation = async (id: string) => {
    await applyRecommendation.mutateAsync({ id, auto: false });
  };

  const tabs: { id: TabType; label: string; icon: React.ReactNode }[] = [
    { id: 'overview', label: 'Overview', icon: <DollarSign className="h-4 w-4" /> },
    { id: 'browser-pool', label: 'Browser Pool', icon: <Server className="h-4 w-4" /> },
    { id: 'ai-costs', label: 'AI / LLM Costs', icon: <Brain className="h-4 w-4" /> },
    { id: 'recommendations', label: 'Recommendations', icon: <Settings className="h-4 w-4" /> },
  ];

  const isLoading = !userLoaded || costOverview.isLoading;

  return (
    <div className="flex min-h-screen">
      <Sidebar />

      <main className="flex-1 p-6 lg:p-8 overflow-auto">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 mb-8">
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
        <div className="flex items-center gap-1 bg-muted rounded-lg p-1 mb-6 w-fit">
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
        <div className="space-y-6">
          {activeTab === 'overview' && (
            <>
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
            </>
          )}

          {activeTab === 'browser-pool' && (
            <>
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
            </>
          )}

          {activeTab === 'ai-costs' && (
            <>
              {llmCosts.isLoading ? (
                <LLMCostTrackerSkeleton />
              ) : (
                <LLMCostTracker data={llmCosts.data || null} />
              )}
            </>
          )}

          {activeTab === 'recommendations' && (
            <>
              {recommendations.isLoading ? (
                <RecommendationsPanelSkeleton />
              ) : (
                <RecommendationsPanel
                  recommendations={recommendations.data?.recommendations || []}
                  totalPotentialSavings={recommendations.data?.total_potential_savings || 0}
                  onApply={handleApplyRecommendation}
                />
              )}
            </>
          )}
        </div>
      </main>
    </div>
  );
}
