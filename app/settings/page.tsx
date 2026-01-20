'use client';

import { useState, useCallback } from 'react';
import { Save, Loader2, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUserProfile } from '@/lib/hooks/use-user-profile';
import { useUserSettings } from '@/lib/hooks/use-user-settings';
import { useCurrentOrganization } from '@/lib/hooks/use-current-organization';
import { useApiKeys, useCreateApiKey, useRevokeApiKey } from '@/lib/hooks/use-api-keys';

import {
  SettingsLayout,
  type SettingsSection,
  ProfileSection,
  OrganizationSection,
  ApiKeysSection,
  NotificationsSection,
  TestDefaultsSection,
  SecuritySection,
  AboutSection,
} from './components';

export default function SettingsPage() {
  const [activeSection, setActiveSection] = useState<SettingsSection>('profile');

  // Data hooks
  const {
    profile,
    loading: profileLoading,
    error: profileError,
    updateProfile,
    isUpdating: profileUpdating,
    updateSuccess: profileSaved,
  } = useUserProfile();

  const {
    settings,
    isLoading: settingsLoading,
    error: settingsErrorObj,
    updateNotificationPreferences,
    updateTestDefaults,
    notificationsMutation,
    testDefaultsMutation,
  } = useUserSettings();

  const { organization, loading: orgLoading, error: orgError } = useCurrentOrganization();

  const { data: apiKeys, isLoading: keysLoading, error: keysError } = useApiKeys();
  const { mutateAsync: createApiKey, isPending: isCreatingKey } = useCreateApiKey();
  const { mutate: revokeApiKey, isPending: isRevokingKey } = useRevokeApiKey();

  // Derived state
  const settingsError = settingsErrorObj?.message || null;
  const isUpdatingNotifications = notificationsMutation.isPending;
  const isUpdatingTestDefaults = testDefaultsMutation.isPending;
  const notificationsUpdateSuccess = notificationsMutation.isSuccess;
  const testDefaultsUpdateSuccess = testDefaultsMutation.isSuccess;

  // Section change handler
  const handleSectionChange = useCallback((section: SettingsSection) => {
    setActiveSection(section);
  }, []);

  // Render header actions based on active section
  const renderHeaderActions = () => {
    const isSaving = profileUpdating || isUpdatingNotifications || isUpdatingTestDefaults;
    const showSaved = profileSaved || notificationsUpdateSuccess || testDefaultsUpdateSuccess;

    // Only show save buttons for sections that have forms
    if (!['profile', 'notifications', 'defaults'].includes(activeSection)) {
      return null;
    }

    return (
      <Button disabled={isSaving}>
        {isSaving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : showSaved ? (
          <>
            <CheckCircle className="mr-2 h-4 w-4 text-green-500" />
            Saved!
          </>
        ) : (
          <>
            <Save className="mr-2 h-4 w-4" />
            Save Changes
          </>
        )}
      </Button>
    );
  };

  // Render active section content
  const renderSection = () => {
    switch (activeSection) {
      case 'profile':
        return (
          <ProfileSection
            profile={profile}
            loading={profileLoading}
            error={profileError}
            onSave={updateProfile}
          />
        );
      case 'organization':
        return (
          <OrganizationSection
            organization={organization}
            loading={orgLoading}
            error={orgError}
          />
        );
      case 'api':
        return (
          <ApiKeysSection
            apiKeys={apiKeys}
            loading={keysLoading}
            error={!!keysError}
            isCreating={isCreatingKey}
            isRevoking={isRevokingKey}
            onCreateKey={createApiKey}
            onRevokeKey={revokeApiKey}
          />
        );
      case 'notifications':
        return (
          <NotificationsSection
            settings={settings?.notifications || null}
            loading={settingsLoading}
            error={settingsError}
            onSave={updateNotificationPreferences}
          />
        );
      case 'defaults':
        return (
          <TestDefaultsSection
            settings={settings?.test_defaults || null}
            loading={settingsLoading}
            error={settingsError}
            onSave={updateTestDefaults}
          />
        );
      case 'security':
        return <SecuritySection />;
      case 'about':
        return <AboutSection />;
      default:
        return null;
    }
  };

  return (
    <SettingsLayout
      activeSection={activeSection}
      onSectionChange={handleSectionChange}
      headerActions={renderHeaderActions()}
    >
      {renderSection()}
    </SettingsLayout>
  );
}
