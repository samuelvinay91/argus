'use client';

import { useCallback } from 'react';
import { Bell, Save, Loader2, CheckCircle } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { LoadingSpinner, ErrorMessage, ToggleRow } from './settings-ui';
import { useFormState } from '@/lib/hooks/use-form-state';

interface NotificationSettings {
  emailNotifications: boolean;
  slackNotifications: boolean;
  inAppNotifications: boolean;
  testFailureAlerts: boolean;
  dailyDigest: boolean;
  weeklyReport: boolean;
  alertThreshold: number;
}

interface NotificationsSectionProps {
  settings: NotificationSettings | null;
  loading: boolean;
  error: string | null;
  onSave: (data: NotificationSettings) => void;
}

export function NotificationsSection({
  settings,
  loading,
  error,
  onSave,
}: NotificationsSectionProps) {
  const {
    value: localSettings,
    updateField,
    isDirty,
    isSaving,
    saveSuccess,
    save,
  } = useFormState({
    initialValue: {
      emailNotifications: settings?.emailNotifications ?? true,
      slackNotifications: settings?.slackNotifications ?? false,
      inAppNotifications: settings?.inAppNotifications ?? true,
      testFailureAlerts: settings?.testFailureAlerts ?? true,
      dailyDigest: settings?.dailyDigest ?? true,
      weeklyReport: settings?.weeklyReport ?? false,
      alertThreshold: settings?.alertThreshold ?? 80,
    },
    onSave,
  });

  const handleToggle = useCallback(
    (field: keyof NotificationSettings) => (value: boolean) => {
      updateField(field, value);
    },
    [updateField]
  );

  const handleThresholdChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      updateField('alertThreshold', parseInt(e.target.value) || 80);
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
          <Bell className="h-5 w-5" />
          Notification Settings
          {isDirty && (
            <span className="text-xs font-normal text-yellow-500 ml-2">
              (unsaved changes)
            </span>
          )}
        </CardTitle>
        <CardDescription>
          Configure how you receive test results and alerts
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Notification Channels */}
        <div className="space-y-4">
          <h4 className="font-medium">Notification Channels</h4>

          <ToggleRow
            label="Email Notifications"
            description="Receive notifications via email"
            checked={localSettings.emailNotifications}
            onChange={handleToggle('emailNotifications')}
          />

          <ToggleRow
            label="Slack Notifications"
            description="Receive notifications in Slack"
            checked={localSettings.slackNotifications}
            onChange={handleToggle('slackNotifications')}
          />

          <ToggleRow
            label="In-App Notifications"
            description="Show notifications in the dashboard"
            checked={localSettings.inAppNotifications}
            onChange={handleToggle('inAppNotifications')}
          />
        </div>

        {/* Notification Events */}
        <div className="pt-4 border-t space-y-4">
          <h4 className="font-medium">Notification Events</h4>

          <ToggleRow
            label="Test Failure Alerts"
            description="Notify immediately when tests fail"
            checked={localSettings.testFailureAlerts}
            onChange={handleToggle('testFailureAlerts')}
          />

          <ToggleRow
            label="Daily Digest"
            description="Receive daily test summary"
            checked={localSettings.dailyDigest}
            onChange={handleToggle('dailyDigest')}
          />

          <ToggleRow
            label="Weekly Report"
            description="Receive weekly analytics report"
            checked={localSettings.weeklyReport}
            onChange={handleToggle('weeklyReport')}
          />
        </div>

        {/* Alert Threshold */}
        <div className="pt-4 border-t">
          <label htmlFor="alertThreshold" className="text-sm font-medium">
            Alert Threshold (%)
          </label>
          <p className="text-sm text-muted-foreground mb-2">
            Notify when pass rate drops below this percentage
          </p>
          <Input
            id="alertThreshold"
            type="number"
            value={localSettings.alertThreshold}
            onChange={handleThresholdChange}
            min="0"
            max="100"
            className="w-24"
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
                Save Notifications
              </>
            )}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export { type NotificationSettings };
