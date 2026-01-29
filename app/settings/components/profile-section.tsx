'use client';

import { useCallback } from 'react';
import {
  User,
  Briefcase,
  Globe,
  Save,
  Loader2,
  CheckCircle,
  Phone,
  Building2,
  Users,
  Github,
  Linkedin,
  Twitter,
  Link as LinkIcon,
} from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { LoadingSpinner, ErrorMessage } from './settings-ui';
import { AvatarUploadWithButton } from './avatar-upload';
import { useFormState } from '@/lib/hooks/use-form-state';

interface Profile {
  display_name: string;
  email: string;
  bio: string | null;
  timezone: string;
  language: string;
  avatar_url?: string | null;
  // Professional info
  job_title?: string | null;
  company?: string | null;
  department?: string | null;
  phone?: string | null;
  // Social links
  github_username?: string | null;
  linkedin_url?: string | null;
  twitter_handle?: string | null;
  website_url?: string | null;
}

interface ProfileSectionProps {
  profile: Profile | null;
  loading: boolean;
  error: string | null;
  onSave: (data: Partial<Profile>) => Promise<unknown>;
  onAvatarUpload?: (file: File) => Promise<{ avatar_url: string }>;
}

export function ProfileSection({
  profile,
  loading,
  error,
  onSave,
  onAvatarUpload,
}: ProfileSectionProps) {
  // Use form state hook for debounced updates and dirty tracking
  const {
    value: localProfile,
    updateField,
    isDirty,
    isSaving,
    saveSuccess,
    save,
  } = useFormState({
    initialValue: {
      display_name: profile?.display_name || '',
      email: profile?.email || '',
      bio: profile?.bio || '',
      timezone: profile?.timezone || 'America/New_York',
      language: profile?.language || 'en',
      // Professional info
      job_title: profile?.job_title || '',
      company: profile?.company || '',
      department: profile?.department || '',
      phone: profile?.phone || '',
      // Social links
      github_username: profile?.github_username || '',
      linkedin_url: profile?.linkedin_url || '',
      twitter_handle: profile?.twitter_handle || '',
      website_url: profile?.website_url || '',
    },
    onSave: async (data) => {
      await onSave({
        display_name: data.display_name,
        bio: data.bio || null,
        timezone: data.timezone,
        language: data.language,
        // Professional info
        job_title: data.job_title || null,
        company: data.company || null,
        department: data.department || null,
        phone: data.phone || null,
        // Social links
        github_username: data.github_username || null,
        linkedin_url: data.linkedin_url || null,
        twitter_handle: data.twitter_handle || null,
        website_url: data.website_url || null,
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

  // Default avatar upload handler (no-op if not provided)
  const handleAvatarUpload = useCallback(async (file: File) => {
    if (onAvatarUpload) {
      return onAvatarUpload(file);
    }
    throw new Error('Avatar upload not configured');
  }, [onAvatarUpload]);

  if (loading) {
    return <LoadingSpinner />;
  }

  if (error) {
    return <ErrorMessage message={error} />;
  }

  return (
    <div className="space-y-6">
      {/* Basic Profile Card */}
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
          {onAvatarUpload ? (
            <AvatarUploadWithButton
              avatarUrl={profile?.avatar_url}
              displayName={localProfile.display_name}
              size={96}
              onUpload={handleAvatarUpload}
              onUploadSuccess={(url) => {
                // Profile will be refreshed via query invalidation
              }}
            />
          ) : (
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
              </div>
              <div>
                <h3 className="font-medium">{localProfile.display_name || 'Your Name'}</h3>
                <p className="text-sm text-muted-foreground">{localProfile.email}</p>
              </div>
            </div>
          )}

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
                <option value="Australia/Sydney">Sydney (AEDT)</option>
                <option value="Pacific/Auckland">Auckland (NZDT)</option>
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
                <option value="pt">Portuguese</option>
                <option value="ko">Korean</option>
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Professional Info Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Professional Information
          </CardTitle>
          <CardDescription>
            Add your professional details to help teammates identify you
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Job Title and Company */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="job_title" className="text-sm font-medium flex items-center gap-2">
                <Briefcase className="h-4 w-4 text-muted-foreground" />
                Job Title
              </label>
              <Input
                id="job_title"
                value={localProfile.job_title}
                onChange={handleFieldChange('job_title')}
                placeholder="e.g., Senior QA Engineer"
                className="mt-1"
              />
            </div>
            <div>
              <label htmlFor="company" className="text-sm font-medium flex items-center gap-2">
                <Building2 className="h-4 w-4 text-muted-foreground" />
                Company
              </label>
              <Input
                id="company"
                value={localProfile.company}
                onChange={handleFieldChange('company')}
                placeholder="e.g., Acme Inc."
                className="mt-1"
              />
            </div>
          </div>

          {/* Department and Phone */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="department" className="text-sm font-medium flex items-center gap-2">
                <Users className="h-4 w-4 text-muted-foreground" />
                Department
              </label>
              <Input
                id="department"
                value={localProfile.department}
                onChange={handleFieldChange('department')}
                placeholder="e.g., Engineering"
                className="mt-1"
              />
            </div>
            <div>
              <label htmlFor="phone" className="text-sm font-medium flex items-center gap-2">
                <Phone className="h-4 w-4 text-muted-foreground" />
                Phone Number
              </label>
              <Input
                id="phone"
                type="tel"
                value={localProfile.phone}
                onChange={handleFieldChange('phone')}
                placeholder="+1 (555) 123-4567"
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Social Links Card */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Globe className="h-5 w-5" />
            Social Links
          </CardTitle>
          <CardDescription>
            Connect your social profiles and websites
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* GitHub and LinkedIn */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="github_username" className="text-sm font-medium flex items-center gap-2">
                <Github className="h-4 w-4 text-muted-foreground" />
                GitHub Username
              </label>
              <div className="mt-1 flex">
                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 bg-muted text-sm text-muted-foreground">
                  github.com/
                </span>
                <Input
                  id="github_username"
                  value={localProfile.github_username}
                  onChange={handleFieldChange('github_username')}
                  placeholder="username"
                  className="rounded-l-none"
                />
              </div>
            </div>
            <div>
              <label htmlFor="linkedin_url" className="text-sm font-medium flex items-center gap-2">
                <Linkedin className="h-4 w-4 text-muted-foreground" />
                LinkedIn URL
              </label>
              <Input
                id="linkedin_url"
                value={localProfile.linkedin_url}
                onChange={handleFieldChange('linkedin_url')}
                placeholder="https://linkedin.com/in/username"
                className="mt-1"
              />
            </div>
          </div>

          {/* Twitter and Website */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label htmlFor="twitter_handle" className="text-sm font-medium flex items-center gap-2">
                <Twitter className="h-4 w-4 text-muted-foreground" />
                Twitter/X Handle
              </label>
              <div className="mt-1 flex">
                <span className="inline-flex items-center px-3 rounded-l-md border border-r-0 bg-muted text-sm text-muted-foreground">
                  @
                </span>
                <Input
                  id="twitter_handle"
                  value={localProfile.twitter_handle}
                  onChange={handleFieldChange('twitter_handle')}
                  placeholder="username"
                  className="rounded-l-none"
                />
              </div>
            </div>
            <div>
              <label htmlFor="website_url" className="text-sm font-medium flex items-center gap-2">
                <LinkIcon className="h-4 w-4 text-muted-foreground" />
                Personal Website
              </label>
              <Input
                id="website_url"
                value={localProfile.website_url}
                onChange={handleFieldChange('website_url')}
                placeholder="https://yourwebsite.com"
                className="mt-1"
              />
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <div className="flex justify-end">
        <Button
          onClick={() => save()}
          disabled={!isDirty || isSaving}
          size="lg"
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
              Save Profile
            </>
          )}
        </Button>
      </div>
    </div>
  );
}

export { type Profile as ProfileData };
