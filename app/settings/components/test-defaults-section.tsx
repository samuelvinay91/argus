'use client';

import { useCallback } from 'react';
import { Settings, Clock } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { LoadingSpinner, ErrorMessage, ToggleRow } from './settings-ui';
import { useFormState } from '@/lib/hooks/use-form-state';

type BrowserType = 'chromium' | 'firefox' | 'webkit';

interface TestDefaults {
  default_browser: BrowserType;
  default_timeout: number;
  parallel_execution: boolean;
  retry_failed_tests: boolean;
  max_retries: number;
  screenshot_on_failure: boolean;
  video_recording: boolean;
}

interface TestDefaultsSectionProps {
  settings: TestDefaults | null;
  loading: boolean;
  error: string | null;
  onSave: (data: TestDefaults) => void;
}

export function TestDefaultsSection({
  settings,
  loading,
  error,
  onSave,
}: TestDefaultsSectionProps) {
  const {
    value: localSettings,
    updateField,
    isDirty,
  } = useFormState({
    initialValue: {
      default_browser: settings?.default_browser || 'chromium',
      default_timeout: settings?.default_timeout || 30000,
      parallel_execution: settings?.parallel_execution ?? true,
      retry_failed_tests: settings?.retry_failed_tests ?? true,
      max_retries: settings?.max_retries || 3,
      screenshot_on_failure: settings?.screenshot_on_failure ?? true,
      video_recording: settings?.video_recording ?? false,
    },
    onSave,
  });

  const handleToggle = useCallback(
    (field: keyof TestDefaults) => (value: boolean) => {
      updateField(field, value);
    },
    [updateField]
  );

  const handleInputChange = useCallback(
    (field: 'default_timeout' | 'max_retries') =>
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const defaultValues = { default_timeout: 30000, max_retries: 3 };
        updateField(field, parseInt(e.target.value) || defaultValues[field]);
      },
    [updateField]
  );

  const handleBrowserChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateField('default_browser', e.target.value as BrowserType);
    },
    [updateField]
  );

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Settings className="h-5 w-5" />
          Default Test Settings
          {isDirty && (
            <span className="text-xs font-normal text-yellow-500 ml-2">
              (unsaved changes)
            </span>
          )}
        </CardTitle>
        <CardDescription>
          Configure default values for test execution
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label
              htmlFor="default_timeout"
              className="text-sm font-medium flex items-center gap-2"
            >
              <Clock className="h-4 w-4" />
              Default Timeout (ms)
            </label>
            <Input
              id="default_timeout"
              type="number"
              value={localSettings.default_timeout}
              onChange={handleInputChange('default_timeout')}
              className="mt-1"
            />
          </div>
          <div>
            <label htmlFor="default_browser" className="text-sm font-medium">
              Default Browser
            </label>
            <select
              id="default_browser"
              value={localSettings.default_browser}
              onChange={handleBrowserChange}
              className="mt-1 w-full px-3 py-2 rounded-md border bg-background"
            >
              <option value="chromium">Chromium</option>
              <option value="firefox">Firefox</option>
              <option value="webkit">WebKit (Safari)</option>
            </select>
          </div>
        </div>

        <div className="pt-4 border-t space-y-4">
          <h4 className="font-medium">Execution Options</h4>

          <ToggleRow
            label="Parallel Execution"
            description="Run tests in parallel for faster results"
            checked={localSettings.parallel_execution}
            onChange={handleToggle('parallel_execution')}
          />

          <ToggleRow
            label="Retry Failed Tests"
            description="Automatically retry flaky tests"
            checked={localSettings.retry_failed_tests}
            onChange={handleToggle('retry_failed_tests')}
          />

          {localSettings.retry_failed_tests && (
            <div>
              <label htmlFor="max_retries" className="text-sm font-medium">
                Max Retries
              </label>
              <Input
                id="max_retries"
                type="number"
                value={localSettings.max_retries}
                onChange={handleInputChange('max_retries')}
                min="1"
                max="5"
                className="mt-1 w-24"
              />
            </div>
          )}

          <ToggleRow
            label="Screenshot on Failure"
            description="Capture screenshots when tests fail"
            checked={localSettings.screenshot_on_failure}
            onChange={handleToggle('screenshot_on_failure')}
          />

          <ToggleRow
            label="Video Recording"
            description="Record video of test execution"
            checked={localSettings.video_recording}
            onChange={handleToggle('video_recording')}
          />
        </div>
      </CardContent>
    </Card>
  );
}

export { type TestDefaults, type BrowserType };
