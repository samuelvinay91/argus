'use client';

import { useCallback } from 'react';
import { Bell } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { LoadingSpinner, ErrorMessage, ToggleRow } from './settings-ui';
import { useFormState } from '@/lib/hooks/use-form-state';

interface NotificationSettings {
  email_notifications: boolean;
  slack_notifications: boolean;
  in_app_notifications: boolean;
  test_failure_alerts: boolean;
  daily_digest: boolean;
  weekly_report: boolean;
  alert_threshold: number;
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
  } = useFormState({
    initialValue: {
      email_notifications: settings?.email_notifications ?? true,
      slack_notifications: settings?.slack_notifications ?? false,
      in_app_notifications: settings?.in_app_notifications ?? true,
      test_failure_alerts: settings?.test_failure_alerts ?? true,
      daily_digest: settings?.daily_digest ?? true,
      weekly_report: settings?.weekly_report ?? false,
      alert_threshold: settings?.alert_threshold ?? 80,
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
      updateField('alert_threshold', parseInt(e.target.value) || 80);
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
            checked={localSettings.email_notifications}
            onChange={handleToggle('email_notifications')}
          />

          <ToggleRow
            label="Slack Notifications"
            description="Receive notifications in Slack"
            checked={localSettings.slack_notifications}
            onChange={handleToggle('slack_notifications')}
          />

          <ToggleRow
            label="In-App Notifications"
            description="Show notifications in the dashboard"
            checked={localSettings.in_app_notifications}
            onChange={handleToggle('in_app_notifications')}
          />
        </div>

        {/* Notification Events */}
        <div className="pt-4 border-t space-y-4">
          <h4 className="font-medium">Notification Events</h4>

          <ToggleRow
            label="Test Failure Alerts"
            description="Notify immediately when tests fail"
            checked={localSettings.test_failure_alerts}
            onChange={handleToggle('test_failure_alerts')}
          />

          <ToggleRow
            label="Daily Digest"
            description="Receive daily test summary"
            checked={localSettings.daily_digest}
            onChange={handleToggle('daily_digest')}
          />

          <ToggleRow
            label="Weekly Report"
            description="Receive weekly analytics report"
            checked={localSettings.weekly_report}
            onChange={handleToggle('weekly_report')}
          />
        </div>

        {/* Alert Threshold */}
        <div className="pt-4 border-t">
          <label htmlFor="alert_threshold" className="text-sm font-medium">
            Alert Threshold (%)
          </label>
          <p className="text-sm text-muted-foreground mb-2">
            Notify when pass rate drops below this percentage
          </p>
          <Input
            id="alert_threshold"
            type="number"
            value={localSettings.alert_threshold}
            onChange={handleThresholdChange}
            min="0"
            max="100"
            className="w-24"
          />
        </div>
      </CardContent>
    </Card>
  );
}

export { type NotificationSettings };
