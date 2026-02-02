/**
 * ChatSettingsPanel - Quick settings accessible from chat interface
 *
 * Provides access to:
 * - Display preferences
 * - Budget status
 * - Links to full AI Hub settings
 */

'use client';

import { memo, useState } from 'react';
import {
  Settings2,
  Sparkles,
  DollarSign,
  Eye,
  ExternalLink,
  ChevronRight,
  Wallet,
  BarChart3,
  AlertCircle,
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from '@/components/ui/sheet';
import { Progress } from '@/components/ui/progress';
import Link from 'next/link';
import {
  useAIPreferences,
  useUpdateAIPreferences,
  useAIBudget,
  type AIPreferences,
} from '@/lib/hooks/use-ai-settings';

// =============================================================================
// BUDGET DISPLAY
// =============================================================================

const BudgetDisplay = memo(function BudgetDisplay() {
  const { data: budget, isLoading } = useAIBudget();

  if (isLoading || !budget) {
    return (
      <div className="animate-pulse space-y-2">
        <div className="h-4 bg-muted rounded w-1/2" />
        <div className="h-2 bg-muted rounded w-full" />
      </div>
    );
  }

  const usagePercent = budget.daily_limit > 0
    ? Math.min((budget.daily_spent / budget.daily_limit) * 100, 100)
    : 0;

  const isNearLimit = usagePercent >= 80;
  const isAtLimit = usagePercent >= 100;

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <span className="text-sm font-medium flex items-center gap-1.5">
          <Wallet className="w-3.5 h-3.5 text-muted-foreground" />
          Daily Budget
        </span>
        <span className={cn(
          'text-sm font-mono',
          isAtLimit ? 'text-destructive' : isNearLimit ? 'text-orange-500' : 'text-muted-foreground'
        )}>
          ${budget.daily_spent.toFixed(2)} / ${budget.daily_limit.toFixed(2)}
        </span>
      </div>

      <Progress
        value={usagePercent}
        className={cn(
          'h-2',
          isAtLimit ? '[&>div]:bg-destructive' :
          isNearLimit ? '[&>div]:bg-orange-500' :
          '[&>div]:bg-primary'
        )}
      />

      {isAtLimit && (
        <div className="flex items-center gap-1.5 text-xs text-destructive">
          <AlertCircle className="w-3 h-3" />
          <span>Daily limit reached. Reset at midnight UTC.</span>
        </div>
      )}

      <div className="text-xs text-muted-foreground">
        Remaining: ${budget.daily_remaining.toFixed(2)}
      </div>
    </div>
  );
});

// =============================================================================
// PREFERENCE TOGGLE BUTTON
// =============================================================================

interface PreferenceToggleProps {
  label: string;
  description?: string;
  checked: boolean;
  onToggle: () => void;
  disabled?: boolean;
  icon?: React.ReactNode;
}

const PreferenceToggle = memo(function PreferenceToggle({
  label,
  description,
  checked,
  onToggle,
  disabled,
  icon,
}: PreferenceToggleProps) {
  return (
    <button
      onClick={onToggle}
      disabled={disabled}
      className={cn(
        'w-full flex items-center justify-between p-3 rounded-lg transition-colors',
        'hover:bg-muted/50',
        disabled && 'opacity-50 cursor-not-allowed'
      )}
    >
      <div className="flex items-start gap-3">
        {icon && <div className="mt-0.5 text-muted-foreground">{icon}</div>}
        <div className="text-left">
          <div className="text-sm font-medium">{label}</div>
          {description && (
            <p className="text-xs text-muted-foreground">{description}</p>
          )}
        </div>
      </div>
      <div className={cn(
        'w-10 h-6 rounded-full transition-colors flex items-center px-1',
        checked ? 'bg-primary' : 'bg-muted'
      )}>
        <div className={cn(
          'w-4 h-4 rounded-full bg-white shadow transition-transform',
          checked ? 'translate-x-4' : 'translate-x-0'
        )} />
      </div>
    </button>
  );
});

// =============================================================================
// QUICK LINK
// =============================================================================

interface QuickLinkProps {
  href: string;
  label: string;
  description?: string;
  icon: React.ReactNode;
}

const QuickLink = memo(function QuickLink({
  href,
  label,
  description,
  icon,
}: QuickLinkProps) {
  return (
    <Link
      href={href}
      className={cn(
        'flex items-center justify-between p-3 rounded-lg',
        'bg-muted/50 hover:bg-muted transition-colors',
        'group'
      )}
    >
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-md bg-background border">
          {icon}
        </div>
        <div>
          <div className="text-sm font-medium">{label}</div>
          {description && (
            <div className="text-xs text-muted-foreground">{description}</div>
          )}
        </div>
      </div>
      <ChevronRight className="w-4 h-4 text-muted-foreground group-hover:text-foreground transition-colors" />
    </Link>
  );
});

// =============================================================================
// MAIN SETTINGS PANEL
// =============================================================================

export interface ChatSettingsPanelProps {
  className?: string;
  trigger?: React.ReactNode;
}

export const ChatSettingsPanel = memo(function ChatSettingsPanel({
  className,
  trigger,
}: ChatSettingsPanelProps) {
  const [open, setOpen] = useState(false);
  const { data: preferences, isLoading: prefsLoading } = useAIPreferences();
  const { mutateAsync: updatePreferences, isPending: isUpdating } = useUpdateAIPreferences();

  const handleToggle = async (key: keyof AIPreferences) => {
    if (!preferences) return;
    const currentValue = preferences[key];
    if (typeof currentValue === 'boolean') {
      await updatePreferences({ [key]: !currentValue });
    }
  };

  return (
    <Sheet open={open} onOpenChange={setOpen}>
      <SheetTrigger asChild>
        {trigger || (
          <Button
            variant="outline"
            size="sm"
            className={cn('gap-2', className)}
          >
            <Settings2 className="w-4 h-4" />
            <span className="hidden sm:inline">Settings</span>
          </Button>
        )}
      </SheetTrigger>

      <SheetContent className="w-[380px] sm:w-[420px] p-0 flex flex-col">
        {/* Header */}
        <SheetHeader className="p-4 border-b">
          <SheetTitle className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-primary" />
            Chat Settings
          </SheetTitle>
          <SheetDescription>
            Customize your chat experience
          </SheetDescription>
        </SheetHeader>

        {/* Scrollable Content */}
        <div className="flex-1 overflow-y-auto">
          {/* Budget Section */}
          <div className="p-4 border-b bg-muted/30">
            <BudgetDisplay />
          </div>

          {/* Display Preferences */}
          <div className="p-4 space-y-1 border-b">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 px-3">
              Display Options
            </h4>

            {prefsLoading ? (
              <div className="space-y-4 px-3">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse flex items-center justify-between">
                    <div className="h-4 bg-muted rounded w-1/3" />
                    <div className="h-5 bg-muted rounded w-10" />
                  </div>
                ))}
              </div>
            ) : (
              <>
                <PreferenceToggle
                  label="Show token costs"
                  description="Display cost per message"
                  icon={<DollarSign className="w-4 h-4" />}
                  checked={preferences?.show_token_costs ?? true}
                  onToggle={() => handleToggle('show_token_costs')}
                  disabled={isUpdating}
                />

                <PreferenceToggle
                  label="Show model in chat"
                  description="Display which model replied"
                  icon={<Eye className="w-4 h-4" />}
                  checked={preferences?.show_model_in_chat ?? true}
                  onToggle={() => handleToggle('show_model_in_chat')}
                  disabled={isUpdating}
                />

                <PreferenceToggle
                  label="Platform key fallback"
                  description="Use Argus keys if your key fails"
                  icon={<Sparkles className="w-4 h-4" />}
                  checked={preferences?.use_platform_key_fallback ?? true}
                  onToggle={() => handleToggle('use_platform_key_fallback')}
                  disabled={isUpdating}
                />
              </>
            )}
          </div>

          {/* Quick Links */}
          <div className="p-4 space-y-2">
            <h4 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-3 px-3">
              AI Hub Settings
            </h4>

            <QuickLink
              href="/settings/ai-hub/models"
              label="Manage Models"
              description="Configure available models"
              icon={<Sparkles className="w-4 h-4 text-primary" />}
            />

            <QuickLink
              href="/settings/ai-hub/providers"
              label="API Keys"
              description="Manage your provider keys"
              icon={<ExternalLink className="w-4 h-4 text-blue-500" />}
            />

            <QuickLink
              href="/settings/ai-hub/budget"
              label="Budget & Limits"
              description="Set spending limits"
              icon={<Wallet className="w-4 h-4 text-green-500" />}
            />

            <QuickLink
              href="/settings/ai-hub/usage"
              label="Usage Analytics"
              description="View cost breakdown"
              icon={<BarChart3 className="w-4 h-4 text-orange-500" />}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t bg-muted/30 mt-auto">
          <div className="flex items-center justify-between text-xs text-muted-foreground">
            <span>Press ⌘K for commands</span>
            <Link
              href="/settings/ai-hub"
              className="flex items-center gap-1 hover:text-foreground transition-colors"
            >
              Open AI Hub
              <ExternalLink className="w-3 h-3" />
            </Link>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
});

export default ChatSettingsPanel;
