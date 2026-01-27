'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  Play,
  Pause,
  Monitor,
  Clock,
  AlertTriangle,
  Video,
  Image,
  ChevronLeft,
  ChevronRight,
  SkipBack,
  SkipForward,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import type { Test } from '@/lib/supabase/types';
import { useAuthApi } from '@/lib/hooks/use-auth-api';

interface StepResult {
  instruction: string;
  success: boolean;
  error?: string;
  screenshot?: string;
  duration?: number;
}

interface ExecutionState {
  status: 'idle' | 'running' | 'completed' | 'failed';
  currentStep: number;
  steps: StepResult[];
  screenshot?: string;
  videoArtifactId?: string;
  recordingUrl?: string;  // Signed URL for video playback
  error?: string;
  startTime?: number;
  endTime?: number;
}

export interface LiveExecutionModalProps {
  test: Test | null;
  appUrl: string;
  open: boolean;
  onClose: () => void;
  onComplete: (success: boolean, results: StepResult[]) => void;
}

export function LiveExecutionModal({
  test,
  appUrl,
  open,
  onClose,
  onComplete,
}: LiveExecutionModalProps) {
  const { fetchJson, isLoaded, isSignedIn } = useAuthApi();
  const [execution, setExecution] = useState<ExecutionState>({
    status: 'idle',
    currentStep: 0,
    steps: [],
  });

  // Replay state for screenshot slideshow
  const [replayIndex, setReplayIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [viewMode, setViewMode] = useState<'video' | 'screenshots'>('screenshots');

  // Extract step instructions - handle multiple formats:
  // - string[] (plain strings)
  // - {instruction: string}[] (object with instruction)
  // - {action: string}[] (object with action)
  const steps = test?.steps
    ? (test.steps as Array<string | { instruction?: string; action?: string }>).map((s) => {
        if (typeof s === 'string') return s;
        return s.instruction || s.action || '';
      }).filter(Boolean)
    : [];

  // Get screenshots from completed steps
  const stepScreenshots = execution.steps
    .map((step, index) => ({ screenshot: step.screenshot, index, instruction: step.instruction }))
    .filter((s) => s.screenshot);

  // Auto-play slideshow
  useEffect(() => {
    if (!isPlaying || stepScreenshots.length === 0) return;

    const interval = setInterval(() => {
      setReplayIndex((prev) => {
        if (prev >= stepScreenshots.length - 1) {
          setIsPlaying(false);
          return prev;
        }
        return prev + 1;
      });
    }, 2000); // 2 seconds per screenshot

    return () => clearInterval(interval);
  }, [isPlaying, stepScreenshots.length]);

  // Reset state when modal opens with new test
  useEffect(() => {
    if (open && test) {
      setExecution({
        status: 'idle',
        currentStep: 0,
        steps: steps.map((instruction) => ({
          instruction,
          success: false,
        })),
      });
      setReplayIndex(0);
      setIsPlaying(false);
      setViewMode('screenshots');
    }
  }, [open, test?.id]);

  const runTest = async () => {
    if (!test || steps.length === 0) return;

    // Check if user is authenticated
    if (!isLoaded || !isSignedIn) {
      setExecution((prev) => ({
        ...prev,
        status: 'failed',
        error: 'Please sign in to run tests',
        endTime: Date.now(),
      }));
      onComplete(false, []);
      return;
    }

    setExecution((prev) => ({
      ...prev,
      status: 'running',
      currentStep: 0,
      startTime: Date.now(),
      videoArtifactId: undefined,
    }));
    setReplayIndex(0);
    setIsPlaying(false);

    try {
      // Execute test via Backend Browser Pool with authenticated request
      const response = await fetchJson<{
        success: boolean;
        steps: Array<{ instruction: string; success: boolean; error?: string; screenshot?: string }>;
        final_screenshot?: string;
        video_artifact_id?: string;
        recording_url?: string;  // Signed URL for video playback
        error?: string;
      }>('/api/v1/browser/test', {
        method: 'POST',
        body: JSON.stringify({
          url: appUrl,
          steps,
          browser: 'chromium',
          screenshot: true,
          record_video: true, // Enable video recording
          verbose: true,
          timeout: 60000, // Give browser pool 60s per step
        }),
        timeout: 180000, // 180s timeout for video recording
      });

      if (response.error || !response.data) {
        throw new Error(response.error || 'No response from server');
      }

      const result = response.data;

      // Process results
      const stepResults: StepResult[] = result.steps?.map((step, index) => ({
        instruction: steps[index] || step.instruction,
        success: step.success,
        error: step.error,
        screenshot: step.screenshot,
      })) || [];

      // Update with final results
      const success = result.success ?? false;
      setExecution({
        status: success ? 'completed' : 'failed',
        currentStep: steps.length,
        steps: stepResults,
        screenshot: result.final_screenshot || stepResults[stepResults.length - 1]?.screenshot,
        videoArtifactId: result.video_artifact_id,
        recordingUrl: result.recording_url,  // Signed URL from backend
        error: result.error,
        startTime: execution.startTime,
        endTime: Date.now(),
      });

      // Auto-switch to video view if video is available
      if (result.recording_url) {
        setViewMode('video');
      }

      onComplete(success, stepResults);
    } catch (error) {
      let errorMessage = 'Unknown error';
      if (error instanceof Error) {
        if (error.name === 'AbortError') {
          errorMessage = 'Test timed out after 180 seconds. The page may be slow or elements not found.';
        } else {
          errorMessage = error.message;
        }
      }

      setExecution((prev) => ({
        ...prev,
        status: 'failed',
        error: errorMessage,
        endTime: Date.now(),
      }));
      onComplete(false, []);
    }
  };

  const handlePrevScreenshot = useCallback(() => {
    setReplayIndex((prev) => Math.max(0, prev - 1));
    setIsPlaying(false);
  }, []);

  const handleNextScreenshot = useCallback(() => {
    setReplayIndex((prev) => Math.min(stepScreenshots.length - 1, prev + 1));
    setIsPlaying(false);
  }, [stepScreenshots.length]);

  const togglePlayPause = useCallback(() => {
    if (replayIndex >= stepScreenshots.length - 1) {
      setReplayIndex(0);
    }
    setIsPlaying((prev) => !prev);
  }, [replayIndex, stepScreenshots.length]);

  const duration = execution.endTime && execution.startTime
    ? ((execution.endTime - execution.startTime) / 1000).toFixed(1)
    : null;

  const currentScreenshot = stepScreenshots[replayIndex];
  // Use the signed recording URL from the backend (includes auth signature)
  const videoUrl = execution.recordingUrl || null;

  return (
    <Dialog open={open} onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-3">
            <Monitor className="h-5 w-5" />
            {test?.name || 'Test Execution'}
            {execution.status === 'running' && (
              <span className="text-sm font-normal text-muted-foreground animate-pulse">
                Running...
              </span>
            )}
            {execution.status === 'completed' && (
              <span className="text-sm font-normal text-success flex items-center gap-1">
                <CheckCircle2 className="h-4 w-4" /> Passed
              </span>
            )}
            {execution.status === 'failed' && (
              <span className="text-sm font-normal text-error flex items-center gap-1">
                <XCircle className="h-4 w-4" /> Failed
              </span>
            )}
          </DialogTitle>
          <DialogDescription className="sr-only">
            Live test execution viewer showing step-by-step progress and screenshots
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-auto">
          <div className="grid grid-cols-2 gap-6">
            {/* Left: Steps */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-sm">Test Steps</h3>
                {duration && (
                  <span className="text-xs text-muted-foreground flex items-center gap-1">
                    <Clock className="h-3 w-3" /> {duration}s
                  </span>
                )}
              </div>

              <div className="space-y-2 max-h-[400px] overflow-y-auto">
                {execution.steps.map((step, index) => {
                  const isCurrentStep = index === execution.currentStep && execution.status === 'running';
                  const isCompleted = index < execution.currentStep || execution.status === 'completed' || execution.status === 'failed';
                  const isReplayFocused = viewMode === 'screenshots' && stepScreenshots[replayIndex]?.index === index;

                  return (
                    <button
                      key={index}
                      onClick={() => {
                        const screenshotIdx = stepScreenshots.findIndex((s) => s.index === index);
                        if (screenshotIdx >= 0) {
                          setReplayIndex(screenshotIdx);
                          setViewMode('screenshots');
                          setIsPlaying(false);
                        }
                      }}
                      className={cn(
                        'w-full p-3 rounded-lg border transition-all text-left',
                        isCurrentStep && 'border-primary bg-primary/5 ring-2 ring-primary/20',
                        isCompleted && step.success && 'border-success/30 bg-success/5',
                        isCompleted && !step.success && 'border-error/30 bg-error/5',
                        !isCurrentStep && !isCompleted && 'border-border bg-muted/30',
                        isReplayFocused && 'ring-2 ring-blue-500/50',
                        step.screenshot && 'cursor-pointer hover:bg-muted/50'
                      )}
                      disabled={!step.screenshot}
                    >
                      <div className="flex items-start gap-3">
                        <div className="mt-0.5">
                          {isCurrentStep ? (
                            <Loader2 className="h-4 w-4 text-primary animate-spin" />
                          ) : isCompleted && step.success ? (
                            <CheckCircle2 className="h-4 w-4 text-success" />
                          ) : isCompleted && !step.success ? (
                            <XCircle className="h-4 w-4 text-error" />
                          ) : (
                            <div className="h-4 w-4 rounded-full border-2 border-muted-foreground/30" />
                          )}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-medium text-muted-foreground">
                              Step {index + 1}
                            </span>
                            {step.screenshot && (
                              <Image className="h-3 w-3 text-muted-foreground" />
                            )}
                          </div>
                          <p className="text-sm mt-1">{step.instruction}</p>
                          {step.error && (
                            <p className="text-xs text-error mt-1 flex items-center gap-1">
                              <AlertTriangle className="h-3 w-3" />
                              {step.error}
                            </p>
                          )}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>

              {execution.error && (
                <div className="p-3 rounded-lg border border-error/30 bg-error/5">
                  <p className="text-sm text-error font-medium mb-2">Error</p>
                  <p className="text-sm text-error">{execution.error}</p>
                  <div className="mt-3 text-xs text-muted-foreground">
                    <p className="font-medium mb-1">Troubleshooting tips:</p>
                    <ul className="list-disc list-inside space-y-1">
                      <li>Check if the App URL is correct</li>
                      <li>Verify the page has the elements you're targeting</li>
                      <li>Use simple natural language (e.g., "Click the login button")</li>
                      <li>Try testing on https://example.com first</li>
                    </ul>
                  </div>
                </div>
              )}
            </div>

            {/* Right: Screenshot/Video Preview */}
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-medium text-sm">Session Replay</h3>
                {(execution.status === 'completed' || execution.status === 'failed') && (
                  <div className="flex items-center gap-1">
                    <Button
                      variant={viewMode === 'screenshots' ? 'secondary' : 'ghost'}
                      size="sm"
                      className="h-7 px-2 text-xs"
                      onClick={() => setViewMode('screenshots')}
                    >
                      <Image className="h-3 w-3 mr-1" />
                      Screenshots
                    </Button>
                    {videoUrl && (
                      <Button
                        variant={viewMode === 'video' ? 'secondary' : 'ghost'}
                        size="sm"
                        className="h-7 px-2 text-xs"
                        onClick={() => setViewMode('video')}
                      >
                        <Video className="h-3 w-3 mr-1" />
                        Video
                      </Button>
                    )}
                  </div>
                )}
              </div>

              <div className="aspect-video rounded-lg border bg-muted/50 overflow-hidden relative">
                {execution.status === 'running' ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                    <p className="text-sm text-muted-foreground">Executing test...</p>
                    <p className="text-xs text-muted-foreground">
                      Step {execution.currentStep + 1} of {steps.length}
                    </p>
                    <p className="text-xs text-muted-foreground/60">Recording session...</p>
                  </div>
                ) : execution.status === 'idle' ? (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                    <Monitor className="h-8 w-8 text-muted-foreground/50" />
                    <p className="text-sm text-muted-foreground">
                      Click "Run Test" to start
                    </p>
                  </div>
                ) : viewMode === 'video' && videoUrl ? (
                  <video
                    key={videoUrl}
                    src={videoUrl}
                    controls
                    autoPlay
                    className="w-full h-full object-contain bg-black"
                  >
                    Your browser does not support video playback.
                  </video>
                ) : stepScreenshots.length > 0 && currentScreenshot?.screenshot ? (
                  <img
                    src={`data:image/png;base64,${currentScreenshot.screenshot}`}
                    alt={`Step ${currentScreenshot.index + 1} screenshot`}
                    className="w-full h-full object-contain"
                  />
                ) : execution.screenshot ? (
                  <img
                    src={`data:image/png;base64,${execution.screenshot}`}
                    alt="Final screenshot"
                    className="w-full h-full object-contain"
                  />
                ) : (
                  <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                    {execution.status === 'completed' ? (
                      <CheckCircle2 className="h-8 w-8 text-success" />
                    ) : (
                      <XCircle className="h-8 w-8 text-error" />
                    )}
                    <p className="text-sm text-muted-foreground">
                      {execution.status === 'completed' ? 'Test passed!' : 'Test failed'}
                    </p>
                  </div>
                )}
              </div>

              {/* Screenshot Slideshow Controls */}
              {viewMode === 'screenshots' && stepScreenshots.length > 0 && (execution.status === 'completed' || execution.status === 'failed') && (
                <div className="flex items-center justify-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setReplayIndex(0)}
                    disabled={replayIndex === 0}
                  >
                    <SkipBack className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handlePrevScreenshot}
                    disabled={replayIndex === 0}
                  >
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={togglePlayPause}
                    className="min-w-[80px]"
                  >
                    {isPlaying ? (
                      <>
                        <Pause className="h-4 w-4 mr-1" />
                        Pause
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4 mr-1" />
                        Play
                      </>
                    )}
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleNextScreenshot}
                    disabled={replayIndex >= stepScreenshots.length - 1}
                  >
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setReplayIndex(stepScreenshots.length - 1)}
                    disabled={replayIndex >= stepScreenshots.length - 1}
                  >
                    <SkipForward className="h-4 w-4" />
                  </Button>
                  <span className="text-xs text-muted-foreground ml-2">
                    {replayIndex + 1} / {stepScreenshots.length}
                  </span>
                </div>
              )}

              {/* Current step info */}
              {viewMode === 'screenshots' && currentScreenshot && (execution.status === 'completed' || execution.status === 'failed') && (
                <div className="text-xs text-muted-foreground bg-muted/50 rounded p-2">
                  <span className="font-medium">Step {currentScreenshot.index + 1}:</span>{' '}
                  {currentScreenshot.instruction}
                </div>
              )}

              <div className="text-xs text-muted-foreground">
                <p><strong>URL:</strong> {appUrl}</p>
                <p><strong>Browser:</strong> Chrome (Vultr Browser Pool)</p>
                {execution.videoArtifactId && (
                  <p><strong>Recording:</strong> Available</p>
                )}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end gap-2 pt-4 border-t mt-4">
          <Button variant="outline" onClick={onClose}>
            Close
          </Button>
          <Button
            onClick={runTest}
            disabled={execution.status === 'running' || !test}
          >
            {execution.status === 'running' ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Running...
              </>
            ) : execution.status === 'completed' || execution.status === 'failed' ? (
              <>
                <Play className="h-4 w-4 mr-2" />
                Run Again
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2" />
                Run Test
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
