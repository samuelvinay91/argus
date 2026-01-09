'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/layout/sidebar';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import {
  Building2,
  ArrowLeft,
  Loader2,
  CheckCircle,
  Sparkles,
  Zap,
  Rocket,
  Check,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuthApi } from '@/lib/hooks/use-auth-api';

interface PlanOption {
  id: 'free' | 'pro' | 'enterprise';
  name: string;
  description: string;
  price: string;
  priceLabel: string;
  icon: React.ComponentType<{ className?: string }>;
  features: string[];
  recommended?: boolean;
  available: boolean;
}

const PLANS: PlanOption[] = [
  {
    id: 'free',
    name: 'Free',
    description: 'For individuals and small teams getting started',
    price: '$0',
    priceLabel: 'forever',
    icon: Sparkles,
    features: [
      'Up to 3 team members',
      '100 test runs per month',
      '7-day data retention',
      'Community support',
    ],
    available: true,
  },
  {
    id: 'pro',
    name: 'Pro',
    description: 'For growing teams with advanced needs',
    price: '$99',
    priceLabel: 'per month',
    icon: Zap,
    features: [
      'Up to 25 team members',
      'Unlimited test runs',
      '90-day data retention',
      'Priority support',
      'Custom integrations',
      'Advanced analytics',
    ],
    recommended: true,
    available: true,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    description: 'For large organizations with custom requirements',
    price: 'Custom',
    priceLabel: 'contact sales',
    icon: Rocket,
    features: [
      'Unlimited team members',
      'Unlimited test runs',
      'Unlimited data retention',
      'Dedicated support',
      'SSO & SAML',
      'Custom SLA',
      'On-premise deployment',
    ],
    available: false,
  },
];

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 50);
}

export default function NewOrganizationPage() {
  const router = useRouter();
  const { fetchJson, isLoaded, isSignedIn } = useAuthApi();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [slugTouched, setSlugTouched] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<'free' | 'pro' | 'enterprise'>('free');
  const [creating, setCreating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Auto-generate slug from name if not manually edited
  useEffect(() => {
    if (!slugTouched && name) {
      setSlug(generateSlug(name));
    }
  }, [name, slugTouched]);

  const handleSlugChange = (value: string) => {
    setSlugTouched(true);
    setSlug(generateSlug(value));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !slug.trim()) {
      setError('Organization name and slug are required');
      return;
    }

    setCreating(true);
    setError(null);

    try {
      const response = await fetchJson<{ organization: { id: string } }>('/api/v1/organizations', {
        method: 'POST',
        body: JSON.stringify({
          name: name.trim(),
          slug: slug.trim(),
          plan: selectedPlan,
        }),
      });

      if (response.error) {
        setError(response.error);
        return;
      }

      if (response.data?.organization?.id) {
        // Navigate to the new organization's dashboard or settings
        router.push(`/organizations/${response.data.organization.id}/settings`);
      } else {
        router.push('/organizations');
      }
    } catch (err) {
      setError('Failed to create organization. Please try again.');
    } finally {
      setCreating(false);
    }
  };

  if (!isLoaded) {
    return (
      <div className="flex min-h-screen">
        <Sidebar />
        <main className="flex-1 lg:ml-64 flex items-center justify-center">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </main>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <main className="flex-1 lg:ml-64">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-6">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push('/organizations')}
          >
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back
          </Button>
          <div className="flex-1">
            <h1 className="text-xl font-semibold flex items-center gap-2">
              <Building2 className="h-5 w-5 text-primary" />
              Create Organization
            </h1>
            <p className="text-sm text-muted-foreground">
              Set up a new workspace for your team
            </p>
          </div>
        </header>

        <div className="p-6 max-w-4xl mx-auto">
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* Error Alert */}
            {error && (
              <Card className="border-red-500/50 bg-red-500/5">
                <CardContent className="pt-6">
                  <div className="flex items-center gap-2 text-red-500">
                    <AlertCircle className="h-5 w-5" />
                    <span>{error}</span>
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Organization Details */}
            <Card>
              <CardHeader>
                <CardTitle>Organization Details</CardTitle>
                <CardDescription>
                  Choose a name and unique identifier for your organization
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div>
                  <label className="text-sm font-medium">Organization Name</label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Acme Corporation"
                    className="mt-1"
                    autoFocus
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Slug</label>
                  <div className="flex items-center gap-2 mt-1">
                    <span className="text-sm text-muted-foreground">app.heyargus.ai/</span>
                    <Input
                      value={slug}
                      onChange={(e) => handleSlugChange(e.target.value)}
                      placeholder="acme-corp"
                      className="flex-1"
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    This will be used in URLs and API references
                  </p>
                </div>
              </CardContent>
            </Card>

            {/* Plan Selection */}
            <Card>
              <CardHeader>
                <CardTitle>Choose a Plan</CardTitle>
                <CardDescription>
                  Select the plan that best fits your team&apos;s needs. You can upgrade anytime.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {PLANS.map((plan) => {
                    const PlanIcon = plan.icon;
                    const isSelected = selectedPlan === plan.id;

                    return (
                      <button
                        key={plan.id}
                        type="button"
                        disabled={!plan.available}
                        onClick={() => plan.available && setSelectedPlan(plan.id)}
                        className={cn(
                          'relative flex flex-col p-4 rounded-lg border text-left transition-all',
                          isSelected
                            ? 'border-primary ring-2 ring-primary bg-primary/5'
                            : 'border-border hover:border-primary/50',
                          !plan.available && 'opacity-50 cursor-not-allowed'
                        )}
                      >
                        {plan.recommended && (
                          <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-primary text-primary-foreground">
                              Recommended
                            </span>
                          </div>
                        )}

                        <div className="flex items-center gap-2 mb-2">
                          <div className={cn(
                            'p-2 rounded-lg',
                            isSelected ? 'bg-primary text-primary-foreground' : 'bg-muted'
                          )}>
                            <PlanIcon className="h-5 w-5" />
                          </div>
                          <span className="font-semibold">{plan.name}</span>
                          {isSelected && (
                            <CheckCircle className="h-5 w-5 text-primary ml-auto" />
                          )}
                        </div>

                        <p className="text-sm text-muted-foreground mb-3">
                          {plan.description}
                        </p>

                        <div className="mb-4">
                          <span className="text-2xl font-bold">{plan.price}</span>
                          <span className="text-sm text-muted-foreground ml-1">
                            {plan.priceLabel}
                          </span>
                        </div>

                        <ul className="space-y-2">
                          {plan.features.map((feature) => (
                            <li key={feature} className="flex items-center gap-2 text-sm">
                              <Check className="h-4 w-4 text-primary flex-shrink-0" />
                              <span>{feature}</span>
                            </li>
                          ))}
                        </ul>

                        {!plan.available && (
                          <div className="mt-4 pt-3 border-t text-sm text-muted-foreground">
                            Contact sales for Enterprise
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </CardContent>
            </Card>

            {/* Submit */}
            <div className="flex items-center justify-end gap-4">
              <Button
                type="button"
                variant="outline"
                onClick={() => router.push('/organizations')}
                disabled={creating}
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={!name.trim() || !slug.trim() || creating}
              >
                {creating ? (
                  <>
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Building2 className="mr-2 h-4 w-4" />
                    Create Organization
                  </>
                )}
              </Button>
            </div>
          </form>
        </div>
      </main>
    </div>
  );
}
