'use client';

import { useCallback } from 'react';
import { Settings, Clock, Save, Loader2, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingSpinner, ErrorMessage, ToggleRow } from './settings-ui';
import { useFormState } from '@/lib/hooks/use-form-state';

type BrowserType = 'chromium' | 'firefox' | 'webkit';

interface TestDefaults {
  defaultBrowser: BrowserType;
  defaultTimeout: number;
  parallelExecution: boolean;
  retryFailedTests: boolean;
  maxRetries: number;
  screenshotOnFailure: boolean;
  videoRecording: boolean;
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
    isSaving,
    saveSuccess,
    save,
  } = useFormState({
    initialValue: {
      defaultBrowser: settings?.defaultBrowser || 'chromium',
      defaultTimeout: settings?.defaultTimeout || 30000,
      parallelExecution: settings?.parallelExecution ?? true,
      retryFailedTests: settings?.retryFailedTests ?? true,
      maxRetries: settings?.maxRetries || 3,
      screenshotOnFailure: settings?.screenshotOnFailure ?? true,
      videoRecording: settings?.videoRecording ?? false,
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
    (field: 'defaultTimeout' | 'maxRetries') =>
      (e: React.ChangeEvent<HTMLInputElement>) => {
        const defaultValues = { defaultTimeout: 30000, maxRetries: 3 };
        updateField(field, parseInt(e.target.value) || defaultValues[field]);
      },
    [updateField]
  );

  const handleBrowserChange = useCallback(
    (e: React.ChangeEvent<HTMLSelectElement>) => {
      updateField('defaultBrowser', e.target.value as BrowserType);
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
              htmlFor="defaultTimeout"
              className="text-sm font-medium flex items-center gap-2"
            >
              <Clock className="h-4 w-4" />
              Default Timeout (ms)
            </label>
            <Input
              id="defaultTimeout"
              type="number"
              value={localSettings.defaultTimeout}
              onChange={handleInputChange('defaultTimeout')}
              className="mt-1"
            />
          </div>
          <div>
            <label htmlFor="defaultBrowser" className="text-sm font-medium">
              Default Browser
            </label>
            <select
              id="defaultBrowser"
              value={localSettings.defaultBrowser}
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
            checked={localSettings.parallelExecution}
            onChange={handleToggle('parallelExecution')}
          />

          <ToggleRow
            label="Retry Failed Tests"
            description="Automatically retry flaky tests"
            checked={localSettings.retryFailedTests}
            onChange={handleToggle('retryFailedTests')}
          />

          {localSettings.retryFailedTests && (
            <div>
              <label htmlFor="maxRetries" className="text-sm font-medium">
                Max Retries
              </label>
              <Input
                id="maxRetries"
                type="number"
                value={localSettings.maxRetries}
                onChange={handleInputChange('maxRetries')}
                min="1"
                max="5"
                className="mt-1 w-24"
              />
            </div>
          )}

          <ToggleRow
            label="Screenshot on Failure"
            description="Capture screenshots when tests fail"
            checked={localSettings.screenshotOnFailure}
            onChange={handleToggle('screenshotOnFailure')}
          />

          <ToggleRow
            label="Video Recording"
            description="Record video of test execution"
            checked={localSettings.videoRecording}
            onChange={handleToggle('videoRecording')}
          />
        </div>

        {/* Save Button */}
        <div className="pt-4 border-t flex justify-end">
          <Button
            onClick={() => save()}
            disabled={!isDirty || isSaving}
          >
            {isSaving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : saveSuccess ? (
              <>
                <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
                Saved!
              </>
            ) : (
              <>
                <Save className="mr-2 h-4 w-4" />
                Save Defaults
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export { type TestDefaults, type BrowserType };
