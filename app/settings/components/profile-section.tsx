'use client';

import { useCallback } from 'react';
import { User, Camera } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { LoadingSpinner, ErrorMessage } from './settings-ui';
import { useFormState } from '@/lib/hooks/use-form-state';

interface Profile {
  display_name: string;
  email: string;
  bio: string | null;
  timezone: string;
  language: string;
  avatar_url?: string | null;
}

interface ProfileSectionProps {
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  onSave: (data: Partial<Profile>) => Promise<unknown>;
}

export function ProfileSection({
  profile,
  loading,
  error,
  onSave,
}: ProfileSectionProps) {
  // Use form state hook for debounced updates and dirty tracking
  const {
    value: localProfile,
    updateField,
    isDirty,
    isSaving,
    save,
  } = useFormState({
    initialValue: {
      display_name: profile?.display_name || '',
      email: profile?.email || '',
      bio: profile?.bio || '',
      timezone: profile?.timezone || 'America/New_York',
      language: profile?.language || 'en',
    },
    onSave: async (data) => {
      await onSave({
        display_name: data.display_name,
        bio: data.bio,
        timezone: data.timezone,
        language: data.language,
      });
    },
  });

  const handleFieldChange = useCallback(
    (field: keyof typeof localProfile) => (
      e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>
    ) => {
      updateField(field, e.target.value);
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
          <User className="h-5 w-5" />
          Profile Information
          {isDirty && (
            <span className="text-xs font-normal text-yellow-500 ml-2">
              (unsaved changes)
            </span>
          )}
        </CardTitle>
        <CardDescription>
          Manage your personal information and preferences
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Avatar */}
        <div className="flex items-center gap-6">
          <div className="relative">
            {profile?.avatar_url ? (
              <img
                src={profile.avatar_url}
                alt="Avatar"
                className="h-24 w-24 rounded-full object-cover"
              />
            ) : (
              <div className="h-24 w-24 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                {localProfile.display_name
                  ?.split(' ')
                  .map((n) => n[0])
                  .join('') || '?'}
              </div>
            )}
            <button
              type="button"
              className="absolute bottom-0 right-0 p-2 rounded-full bg-background border shadow-sm hover:bg-muted transition-colors"
              aria-label="Change avatar"
            >
              <Camera className="h-4 w-4" />
            </button>
          </div>
          <div>
            <h3 className="font-medium">{localProfile.display_name || 'Your Name'}</h3>
            <p className="text-sm text-muted-foreground">{localProfile.email}</p>
            <Button variant="outline" size="sm" className="mt-2">
              Upload Photo
            </Button>
          </div>
        </div>

        {/* Name and Email */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="display_name" className="text-sm font-medium">
              Display Name
            </label>
            <Input
              id="display_name"
              value={localProfile.display_name}
              onChange={handleFieldChange('display_name')}
              className="mt-1"
            />
          </div>
          <div>
            <label htmlFor="email" className="text-sm font-medium">
              Email Address
            </label>
            <Input
              id="email"
              type="email"
              value={localProfile.email}
              disabled
              className="mt-1 bg-muted"
            />
            <p className="text-xs text-muted-foreground mt-1">
              Email is managed by your authentication provider
            </p>
          </div>
        </div>

        {/* Bio */}
        <div>
          <label htmlFor="bio" className="text-sm font-medium">
            Bio
          </label>
          <Textarea
            id="bio"
            value={localProfile.bio}
            onChange={handleFieldChange('bio')}
            placeholder="Tell us about yourself..."
            className="mt-1"
            rows={3}
          />
        </div>

        {/* Timezone and Language */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="timezone" className="text-sm font-medium">
              Timezone
            </label>
            <select
              id="timezone"
              value={localProfile.timezone}
              onChange={handleFieldChange('timezone')}
              className="mt-1 w-full px-3 py-2 rounded-md border bg-background"
            >
              <option value="America/New_York">Eastern Time (ET)</option>
              <option value="America/Chicago">Central Time (CT)</option>
              <option value="America/Denver">Mountain Time (MT)</option>
              <option value="America/Los_Angeles">Pacific Time (PT)</option>
              <option value="Europe/London">London (GMT)</option>
              <option value="Europe/Paris">Paris (CET)</option>
              <option value="Asia/Tokyo">Tokyo (JST)</option>
              <option value="Asia/Singapore">Singapore (SGT)</option>
              <option value="Asia/Kolkata">India (IST)</option>
            </select>
          </div>
          <div>
            <label htmlFor="language" className="text-sm font-medium">
              Language
            </label>
            <select
              id="language"
              value={localProfile.language}
              onChange={handleFieldChange('language')}
              className="mt-1 w-full px-3 py-2 rounded-md border bg-background"
            >
              <option value="en">English</option>
              <option value="es">Spanish</option>
              <option value="fr">French</option>
              <option value="de">German</option>
              <option value="ja">Japanese</option>
              <option value="zh">Chinese</option>
            </select>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

export { type Profile as ProfileData };
