'use client';

import { useState, useEffect } from 'react';
import { useParams, useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import {
  ArrowLeft,
  Brain,
  Download,
  Play,
  Pause,
  Maximize2,
  Minimize2,
  Activity,
  Clock,
  CheckCircle2,
  XCircle,
  Loader2,
  Share2,
  Copy,
  Check,
  LayoutGrid,
  LayoutList,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { OrchestratorVisualizer } from '@/components/orchestrator/OrchestratorVisualizer';
import { LiveLogStream } from '@/components/orchestrator/LiveLogStream';
import { ExecutionTimeline } from '@/components/orchestrator/ExecutionTimeline';
import { useOrchestratorState } from '@/components/orchestrator/hooks/useOrchestratorState';

type ViewMode = 'split' | 'graph' | 'logs';

export default function OrchestratorSessionPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.sessionId as string;

  const [viewMode, setViewMode] = useState<ViewMode>('split');
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [copied, setCopied] = useState(false);

  const {
    logs,
    steps,
    currentAgent,
    currentStep,
    totalSteps,
    orchestratorState,
    agents,
    connectionStatus,
    reconnect,
    isConnected,
  } = useOrchestratorState(sessionId);

  // Calculate session statistics
  const stats = {
    duration: logs.length > 0
      ? Math.round(
          (new Date(logs[logs.length - 1]?.timestamp).getTime() -
            new Date(logs[0]?.timestamp).getTime()) /
            1000
        )
      : 0,
    passedSteps: steps.filter((s) => s.status === 'passed').length,
    failedSteps: steps.filter((s) => s.status === 'failed').length,
    activeAgents: Object.values(agents).filter((a) => a.status === 'active').length,
    completedAgents: Object.values(agents).filter((a) => a.status === 'completed').length,
    errorAgents: Object.values(agents).filter((a) => a.status === 'error').length,
  };

  // Handle fullscreen
  useEffect(() => {
    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isFullscreen) {
        setIsFullscreen(false);
      }
    };
    window.addEventListener('keydown', handleEscape);
    return () => window.removeEventListener('keydown', handleEscape);
  }, [isFullscreen]);

  // Export session data
  const handleExport = () => {
    const data = {
      sessionId,
      state: orchestratorState,
      currentStep,
      totalSteps,
      agents,
      logs,
      steps,
      exportedAt: new Date().toISOString(),
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orchestrator-session-${sessionId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Copy session link
  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Format duration
  const formatDuration = (seconds: number): string => {
    if (seconds < 60) return `${seconds}s`;
    const minutes = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${minutes}m ${secs}s`;
  };

  // Get state badge color
  const getStateBadgeColor = () => {
    switch (orchestratorState) {
      case 'idle':
        return 'bg-muted text-muted-foreground';
      case 'analyzing':
        return 'bg-blue-500/10 text-blue-500';
      case 'planning':
        return 'bg-cyan-500/10 text-cyan-500';
      case 'executing':
        return 'bg-green-500/10 text-green-500';
      case 'healing':
        return 'bg-rose-500/10 text-rose-500';
      case 'reporting':
        return 'bg-indigo-500/10 text-indigo-500';
      case 'completed':
        return 'bg-green-500/10 text-green-500';
      case 'failed':
        return 'bg-red-500/10 text-red-500';
      default:
        return 'bg-muted text-muted-foreground';
    }
  };

  return (
    <div
      className={cn(
        'min-h-screen bg-background flex flex-col',
        isFullscreen && 'fixed inset-0 z-50'
      )}
    >
      {/* Header */}
      <header className="sticky top-0 z-40 border-b bg-background/80 backdrop-blur-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            <div className="flex items-center gap-3">
              <div className="relative">
                <Brain className="h-6 w-6 text-violet-500" />
                {orchestratorState !== 'idle' &&
                  orchestratorState !== 'completed' &&
                  orchestratorState !== 'failed' && (
                    <motion.span
                      className="absolute -top-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-green-500"
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                    />
                  )}
              </div>
              <div>
                <h1 className="text-lg font-semibold">Orchestrator Session</h1>
                <p className="text-xs text-muted-foreground font-mono">{sessionId}</p>
              </div>
            </div>

            {/* State badge */}
            <span
              className={cn(
                'px-3 py-1 rounded-full text-xs font-semibold uppercase',
                getStateBadgeColor()
              )}
            >
              {orchestratorState}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {/* View mode toggle */}
            <div className="flex items-center border rounded-lg p-1">
              <Button
                variant={viewMode === 'graph' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 px-2"
                onClick={() => setViewMode('graph')}
              >
                <LayoutGrid className="h-4 w-4" />
              </Button>
              <Button
                variant={viewMode === 'split' ? 'secondary' : 'ghost'}
                size="sm"
                className="h-7 px-2"
                onClick={() => setViewMode('split')}
              >
                <LayoutList className="h-4 w-4" />
              </Button>
            </div>

            {/* Actions */}
            <Button variant="outline" size="sm" onClick={handleCopyLink}>
              {copied ? (
                <Check className="h-4 w-4" />
              ) : (
                <Share2 className="h-4 w-4" />
              )}
            </Button>

            <Button variant="outline" size="sm" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>

            <Button
              variant="ghost"
              size="sm"
              className="h-9 w-9 p-0"
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              {isFullscreen ? (
                <Minimize2 className="h-4 w-4" />
              ) : (
                <Maximize2 className="h-4 w-4" />
              )}
            </Button>
          </div>
        </div>

        {/* Stats bar */}
        <div className="px-4 py-2 border-t bg-muted/30 flex items-center justify-between">
          <div className="flex items-center gap-6 text-sm">
            <div className="flex items-center gap-2">
              <Clock className="h-4 w-4 text-muted-foreground" />
              <span className="font-medium">{formatDuration(stats.duration)}</span>
            </div>
            <div className="flex items-center gap-2">
              <Activity className="h-4 w-4 text-muted-foreground" />
              <span>
                Step <span className="font-medium">{currentStep}</span>/{totalSteps}
              </span>
            </div>
            <div className="flex items-center gap-4">
              <span className="flex items-center gap-1 text-green-500">
                <CheckCircle2 className="h-4 w-4" />
                {stats.passedSteps}
              </span>
              <span className="flex items-center gap-1 text-red-500">
                <XCircle className="h-4 w-4" />
                {stats.failedSteps}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-sm">
            <span className="text-muted-foreground">
              Agents:{' '}
              <span className="text-green-500 font-medium">{stats.activeAgents} active</span>
              {stats.completedAgents > 0 && (
                <>, <span className="text-muted-foreground">{stats.completedAgents} done</span></>
              )}
              {stats.errorAgents > 0 && (
                <>, <span className="text-red-500">{stats.errorAgents} error</span></>
              )}
            </span>
            <span className="text-muted-foreground">{logs.length} events</span>
          </div>
        </div>
      </header>

      {/* Main content */}
      <main className="flex-1 overflow-hidden">
        {viewMode === 'split' ? (
          // Split view - graph on top, logs on bottom
          <div className="h-full flex flex-col">
            {/* Graph section */}
            <div className="flex-1 min-h-0 p-4 pb-2">
              <OrchestratorVisualizer sessionId={sessionId} className="h-full" />
            </div>

            {/* Timeline */}
            <div className="px-4 py-2">
              <ExecutionTimeline
                steps={steps}
                currentStep={currentStep}
                totalSteps={totalSteps}
              />
            </div>

            {/* Logs section */}
            <div className="h-[300px] min-h-0 p-4 pt-2">
              <LiveLogStream logs={logs} className="h-full" maxHeight="100%" />
            </div>
          </div>
        ) : (
          // Graph only view
          <div className="h-full p-4">
            <div className="h-full grid grid-cols-3 gap-4">
              {/* Main graph */}
              <div className="col-span-2">
                <OrchestratorVisualizer sessionId={sessionId} className="h-full" />
              </div>

              {/* Side panel with timeline and logs */}
              <div className="flex flex-col gap-4 h-full">
                <ExecutionTimeline
                  steps={steps}
                  currentStep={currentStep}
                  totalSteps={totalSteps}
                  className="flex-shrink-0"
                />
                <LiveLogStream logs={logs} className="flex-1 min-h-0" maxHeight="100%" />
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Connection status overlay */}
      <AnimatePresence>
        {connectionStatus === 'error' && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 50 }}
            className="fixed bottom-4 left-1/2 -translate-x-1/2 z-50"
          >
            <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-3 flex items-center gap-3 shadow-lg">
              <XCircle className="h-5 w-5 text-red-500" />
              <div>
                <p className="text-sm font-medium text-red-500">Connection Lost</p>
                <p className="text-xs text-muted-foreground">
                  Real-time updates are paused
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={reconnect}
                className="border-red-500/30 text-red-500 hover:bg-red-500/10"
              >
                Reconnect
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Loading overlay for initial connection */}
      <AnimatePresence>
        {connectionStatus === 'connecting' && logs.length === 0 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-background/80 backdrop-blur-sm z-50 flex items-center justify-center"
          >
            <div className="text-center">
              <div className="relative inline-block">
                <Brain className="h-16 w-16 text-violet-500" />
                <motion.div
                  className="absolute inset-0"
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
                >
                  <Loader2 className="h-16 w-16 text-violet-500/30" />
                </motion.div>
              </div>
              <h2 className="text-xl font-semibold mt-4">Connecting to Session</h2>
              <p className="text-muted-foreground mt-2">
                Establishing real-time connection...
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
