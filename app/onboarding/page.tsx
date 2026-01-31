'use client';

import { useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useUser } from '@clerk/nextjs';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Eye,
  User,
  Building,
  FolderKanban,
  Sparkles,
  ArrowRight,
  ArrowLeft,
  Camera,
  Upload,
  Check,
  Plus,
  Users,
  TestTube,
  Brain,
  Zap,
  Shield,
  Loader2,
  SkipForward,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthApi } from '@/lib/hooks/use-auth-api';
import { useCreateProject } from '@/lib/hooks/use-projects';

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
}

const steps: OnboardingStep[] = [
  {
    id: 'welcome',
    title: 'Welcome to Argus',
    description: 'Let\'s get you set up',
    icon: Sparkles,
  },
  {
    id: 'organization',
    title: 'Organization',
    description: 'Create or join an organization',
    icon: Building,
  },
  {
    id: 'project',
    title: 'First Project',
    description: 'Create your first project',
    icon: FolderKanban,
  },
  {
    id: 'tour',
    title: 'Quick Tour',
    description: 'Learn the key features',
    icon: Eye,
  },
];

const features = [
  {
    icon: TestTube,
    title: 'AI-Powered Testing',
    description: 'Generate comprehensive E2E tests automatically from your codebase',
  },
  {
    icon: Brain,
    title: 'Self-Healing Tests',
    description: 'Tests automatically adapt when your UI changes',
  },
  {
    icon: Shield,
    title: 'Visual Regression',
    description: 'Catch visual bugs before they reach production',
  },
  {
    icon: Zap,
    title: 'Fast Execution',
    description: 'Run tests in parallel for faster feedback loops',
  },
];

export default function OnboardingPage() {
  const router = useRouter();
  const { user, isLoaded: isUserLoaded } = useUser();
  const { fetchJson, isLoaded, isSignedIn } = useAuthApi();
  const createProject = useCreateProject();

  const [currentStep, setCurrentStep] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Welcome step state
  const [displayName, setDisplayName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null);

  // Organization step state
  const [orgChoice, setOrgChoice] = useState<'create' | 'join' | null>(null);
  const [orgName, setOrgName] = useState('');
  const [inviteCode, setInviteCode] = useState('');

  // Project step state
  const [projectName, setProjectName] = useState('');
  const [projectUrl, setProjectUrl] = useState('');

  // Initialize with Clerk user data
  useState(() => {
    if (isUserLoaded && user) {
      setDisplayName(user.fullName || user.firstName || '');
      setAvatarUrl(user.imageUrl || null);
    }
  });

  const getInitials = (name: string) => {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase()
      .slice(0, 2) || 'U';
  };

  const handleNext = async () => {
    setError(null);

    // Handle step-specific actions
    if (currentStep === 0) {
      // Welcome step - save profile
      if (!displayName.trim()) {
        setError('Please enter your name');
        return;
      }

      try {
        setLoading(true);
        await fetchJson('/api/v1/users/me', {
          method: 'PUT',
          body: JSON.stringify({
            display_name: displayName,
            avatar_url: avatarUrl,
          }),
        });
      } catch (err) {
        console.error('Failed to save profile:', err);
        // Continue anyway - we can retry later
      } finally {
        setLoading(false);
      }
    }

    if (currentStep === 1) {
      // Organization step
      if (orgChoice === 'create' && orgName.trim()) {
        try {
          setLoading(true);
          const response = await fetchJson('/api/v1/teams/organizations', {
            method: 'POST',
            body: JSON.stringify({
              name: orgName,
              slug: orgName.toLowerCase().replace(/\s+/g, '-'),
            }),
          });
          if (response.error) {
            setError(response.error);
            return;
          }
        } catch (err) {
          console.error('Failed to create organization:', err);
          // Continue anyway
        } finally {
          setLoading(false);
        }
      } else if (orgChoice === 'join' && inviteCode.trim()) {
        try {
          setLoading(true);
          const response = await fetchJson('/api/v1/teams/organizations/join', {
            method: 'POST',
            body: JSON.stringify({ invite_code: inviteCode }),
          });
          if (response.error) {
            setError(response.error);
            return;
          }
        } catch (err) {
          console.error('Failed to join organization:', err);
          // Continue anyway
        } finally {
          setLoading(false);
        }
      }
    }

    if (currentStep === 2) {
      // Project step
      if (projectName.trim() && projectUrl.trim()) {
        try {
          setLoading(true);
          await createProject.mutateAsync({
            name: projectName,
            slug: projectName.toLowerCase().replace(/\s+/g, '-').replace(/[^a-z0-9-]/g, ''),
            app_url: projectUrl,
            description: `Created during onboarding`,
          });
        } catch (err) {
          console.error('Failed to create project:', err);
          // Continue anyway
        } finally {
          setLoading(false);
        }
      }
    }

    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      handleComplete();
    }
  };

  const handleBack = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      setError(null);
    }
  };

  const handleSkip = () => {
    if (currentStep < steps.length - 1) {
      setCurrentStep(currentStep + 1);
      setError(null);
    } else {
      handleComplete();
    }
  };

  const handleComplete = useCallback(async () => {
    try {
      setLoading(true);
      // Mark onboarding as completed
      await fetchJson('/api/v1/users/me/preferences', {
        method: 'PUT',
        body: JSON.stringify({
          onboarding_completed: true,
        }),
      });
    } catch (err) {
      console.error('Failed to mark onboarding complete:', err);
    } finally {
      setLoading(false);
      router.push('/dashboard');
    }
  }, [fetchJson, router]);

  if (!isUserLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  const currentStepData = steps[currentStep];
  const StepIcon = currentStepData.icon;

  return (
    <div className="min-h-screen bg-background flex flex-col">
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg gradient-primary">
              <Eye className="h-5 w-5 text-white" />
            </div>
          </div>
          <span className="font-bold text-lg tracking-tight">Argus</span>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={handleSkip}
          className="text-muted-foreground"
        >
          <SkipForward className="h-4 w-4 mr-2" />
          Skip
        </Button>
      </header>

      {/* Progress Indicator */}
      <div className="px-6 py-4">
        <div className="max-w-3xl mx-auto">
          <div className="flex items-center justify-between mb-2">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div
                  className={cn(
                    'flex h-8 w-8 items-center justify-center rounded-full text-sm font-medium transition-colors',
                    index < currentStep
                      ? 'bg-primary text-primary-foreground'
                      : index === currentStep
                      ? 'bg-primary text-primary-foreground ring-4 ring-primary/20'
                      : 'bg-muted text-muted-foreground'
                  )}
                >
                  {index < currentStep ? (
                    <Check className="h-4 w-4" />
                  ) : (
                    index + 1
                  )}
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={cn(
                      'h-0.5 w-16 sm:w-24 md:w-32 mx-2',
                      index < currentStep ? 'bg-primary' : 'bg-muted'
                    )}
                  />
                )}
              </div>
            ))}
          </div>
          <div className="flex justify-between text-xs text-muted-foreground">
            {steps.map((step) => (
              <span key={step.id} className="text-center w-20">
                {step.title}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="flex-1 flex items-center justify-center p-6">
        <div className="w-full max-w-2xl">
          {error && (
            <div className="mb-6 p-4 rounded-lg bg-red-500/10 border border-red-500/20 text-red-500 text-sm">
              {error}
            </div>
          )}

          {/* Welcome Step */}
          {currentStep === 0 && (
            <Card className="border-0 shadow-lg">
              <CardHeader className="text-center pb-2">
                <div className="mx-auto mb-4 p-4 rounded-2xl bg-gradient-to-br from-primary/20 to-purple-500/20">
                  <Sparkles className="h-12 w-12 text-primary" />
                </div>
                <CardTitle className="text-3xl">Welcome to Argus!</CardTitle>
                <CardDescription className="text-lg">
                  Your AI-powered E2E testing companion
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                {/* Avatar */}
                <div className="flex flex-col items-center gap-4">
                  <div className="relative">
                    {avatarUrl ? (
                      <img
                        src={avatarUrl}
                        alt={displayName}
                        className="h-24 w-24 rounded-full object-cover border-4 border-border"
                      />
                    ) : (
                      <div className="h-24 w-24 rounded-full bg-gradient-to-br from-primary to-purple-600 flex items-center justify-center text-white text-2xl font-bold">
                        {getInitials(displayName || 'User')}
                      </div>
                    )}
                    <button className="absolute bottom-0 right-0 p-2 rounded-full bg-background border shadow-sm hover:bg-muted transition-colors">
                      <Camera className="h-4 w-4" />
                    </button>
                  </div>
                  <Button variant="outline" size="sm">
                    <Upload className="h-4 w-4 mr-2" />
                    Upload Photo
                  </Button>
                </div>

                {/* Name Input */}
                <div>
                  <label className="text-sm font-medium">What should we call you?</label>
                  <Input
                    value={displayName}
                    onChange={(e) => setDisplayName(e.target.value)}
                    placeholder="Enter your name"
                    className="mt-2"
                    autoFocus
                  />
                </div>
              </CardContent>
            </Card>
          )}

          {/* Organization Step */}
          {currentStep === 1 && (
            <Card className="border-0 shadow-lg">
              <CardHeader className="text-center pb-2">
                <div className="mx-auto mb-4 p-4 rounded-2xl bg-gradient-to-br from-primary/20 to-blue-500/20">
                  <Building className="h-12 w-12 text-primary" />
                </div>
                <CardTitle className="text-2xl">Set Up Your Organization</CardTitle>
                <CardDescription>
                  Organizations help you collaborate with your team
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div className="grid grid-cols-2 gap-4">
                  {/* Create Organization */}
                  <button
                    onClick={() => setOrgChoice('create')}
                    className={cn(
                      'p-6 rounded-lg border-2 text-left transition-all',
                      orgChoice === 'create'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <Plus className="h-8 w-8 mb-3 text-primary" />
                    <div className="font-medium">Create New</div>
                    <div className="text-sm text-muted-foreground">
                      Start a new organization
                    </div>
                  </button>

                  {/* Join Organization */}
                  <button
                    onClick={() => setOrgChoice('join')}
                    className={cn(
                      'p-6 rounded-lg border-2 text-left transition-all',
                      orgChoice === 'join'
                        ? 'border-primary bg-primary/5'
                        : 'border-border hover:border-primary/50'
                    )}
                  >
                    <Users className="h-8 w-8 mb-3 text-primary" />
                    <div className="font-medium">Join Existing</div>
                    <div className="text-sm text-muted-foreground">
                      Join with an invite code
                    </div>
                  </button>
                </div>

                {orgChoice === 'create' && (
                  <div className="pt-4">
                    <label className="text-sm font-medium">Organization Name</label>
                    <Input
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      placeholder="e.g., Acme Corp"
                      className="mt-2"
                      autoFocus
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      You can invite team members after setup
                    </p>
                  </div>
                )}

                {orgChoice === 'join' && (
                  <div className="pt-4">
                    <label className="text-sm font-medium">Invite Code</label>
                    <Input
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value)}
                      placeholder="Enter your invite code"
                      className="mt-2"
                      autoFocus
                    />
                    <p className="text-xs text-muted-foreground mt-1">
                      Ask your team admin for an invite code
                    </p>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Project Step */}
          {currentStep === 2 && (
            <Card className="border-0 shadow-lg">
              <CardHeader className="text-center pb-2">
                <div className="mx-auto mb-4 p-4 rounded-2xl bg-gradient-to-br from-primary/20 to-green-500/20">
                  <FolderKanban className="h-12 w-12 text-primary" />
                </div>
                <CardTitle className="text-2xl">Create Your First Project</CardTitle>
                <CardDescription>
                  Projects represent the applications you want to test
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6 pt-6">
                <div>
                  <label className="text-sm font-medium">Project Name</label>
                  <Input
                    value={projectName}
                    onChange={(e) => setProjectName(e.target.value)}
                    placeholder="e.g., My Web App"
                    className="mt-2"
                    autoFocus
                  />
                </div>

                <div>
                  <label className="text-sm font-medium">Application URL</label>
                  <Input
                    value={projectUrl}
                    onChange={(e) => setProjectUrl(e.target.value)}
                    placeholder="https://myapp.com"
                    className="mt-2"
                    type="url"
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    The URL where your application is running
                  </p>
                </div>

                <div className="pt-4 text-center">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={handleSkip}
                    className="text-muted-foreground"
                  >
                    Skip for now - I'll create a project later
                  </Button>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Tour Step */}
          {currentStep === 3 && (
            <Card className="border-0 shadow-lg">
              <CardHeader className="text-center pb-2">
                <div className="mx-auto mb-4 p-4 rounded-2xl bg-gradient-to-br from-primary/20 to-amber-500/20">
                  <Eye className="h-12 w-12 text-primary" />
                </div>
                <CardTitle className="text-2xl">Quick Feature Overview</CardTitle>
                <CardDescription>
                  Here's what you can do with Argus
                </CardDescription>
              </CardHeader>
              <CardContent className="pt-6">
                <div className="grid grid-cols-2 gap-4">
                  {features.map((feature) => (
                    <div
                      key={feature.title}
                      className="p-4 rounded-lg border bg-muted/30"
                    >
                      <feature.icon className="h-8 w-8 text-primary mb-3" />
                      <div className="font-medium mb-1">{feature.title}</div>
                      <div className="text-sm text-muted-foreground">
                        {feature.description}
                      </div>
                    </div>
                  ))}
                </div>

                <div className="mt-8 p-6 rounded-lg bg-gradient-to-r from-primary/10 to-purple-500/10 border border-primary/20 text-center">
                  <Sparkles className="h-8 w-8 text-primary mx-auto mb-3" />
                  <div className="font-medium mb-1">You're all set!</div>
                  <div className="text-sm text-muted-foreground">
                    Click "Get Started" to begin your testing journey
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Navigation Buttons */}
          <div className="flex items-center justify-between mt-6">
            <Button
              variant="outline"
              onClick={handleBack}
              disabled={currentStep === 0 || loading}
              className={cn(currentStep === 0 && 'invisible')}
            >
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>

            <Button onClick={handleNext} disabled={loading}>
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Please wait...
                </>
              ) : currentStep === steps.length - 1 ? (
                <>
                  Get Started
                  <Sparkles className="h-4 w-4 ml-2" />
                </>
              ) : (
                <>
                  Continue
                  <ArrowRight className="h-4 w-4 ml-2" />
                </>
              )}
            </Button>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="px-6 py-4 border-t text-center text-sm text-muted-foreground">
        <p>Need help? Check out our <a href="https://docs.heyargus.ai" target="_blank" rel="noopener noreferrer" className="text-primary hover:underline">documentation</a> or <a href="mailto:support@heyargus.ai" className="text-primary hover:underline">contact support</a>.</p>
      </footer>
    </div>
  );
}
