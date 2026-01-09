'use client';

import * as React from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import { TrendingUp, TrendingDown, Minus, Sparkles, FlaskConical, Clock, Wrench, CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface DashboardHeroProps {
  userName: string;
  qualityScore: number;
  trend: 'up' | 'down' | 'stable';
  todayInsight?: string;
  stats: {
    testsToday: number;
    passRate: number;
    avgDuration: string;
    healedTests: number;
  };
}

// Animated counter hook for count-up animation
function useAnimatedCounter(target: number, duration: number = 1500) {
  const spring = useSpring(0, { duration, bounce: 0 });
  const rounded = useTransform(spring, (latest) => Math.round(latest));
  const [displayValue, setDisplayValue] = React.useState(0);

  React.useEffect(() => {
    spring.set(target);
  }, [spring, target]);

  React.useEffect(() => {
    return rounded.on('change', (latest) => {
      setDisplayValue(latest);
    });
  }, [rounded]);

  return displayValue;
}

// Get greeting based on time of day
function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

// Quality Score Ring Component
function QualityScoreRing({ score, trend }: { score: number; trend: 'up' | 'down' | 'stable' }) {
  const animatedScore = useAnimatedCounter(score, 2000);
  const circumference = 2 * Math.PI * 45;
  const strokeDashoffset = circumference - (score / 100) * circumference;

  const getScoreColor = () => {
    if (score >= 90) return 'hsl(var(--status-healthy))';
    if (score >= 70) return 'hsl(var(--argus-amber))';
    return 'hsl(var(--status-critical))';
  };

  const TrendIcon = trend === 'up' ? TrendingUp : trend === 'down' ? TrendingDown : Minus;
  const trendColor = trend === 'up' ? 'text-emerald-500' : trend === 'down' ? 'text-red-500' : 'text-muted-foreground';

  return (
    <div className="relative flex items-center justify-center">
      <svg width="120" height="120" className="progress-ring">
        {/* Background circle */}
        <circle
          cx="60"
          cy="60"
          r="45"
          fill="none"
          stroke="hsl(var(--muted))"
          strokeWidth="8"
          opacity="0.3"
        />
        {/* Animated progress circle */}
        <motion.circle
          cx="60"
          cy="60"
          r="45"
          fill="none"
          stroke={getScoreColor()}
          strokeWidth="8"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 2, ease: 'easeOut' }}
          className="progress-ring-circle"
        />
        {/* Glow effect */}
        <motion.circle
          cx="60"
          cy="60"
          r="45"
          fill="none"
          stroke={getScoreColor()}
          strokeWidth="4"
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: circumference }}
          animate={{ strokeDashoffset }}
          transition={{ duration: 2, ease: 'easeOut' }}
          style={{ filter: 'blur(4px)' }}
          opacity="0.5"
        />
      </svg>
      {/* Center content */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        <motion.span
          className="text-3xl font-bold"
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.5, duration: 0.5 }}
        >
          {animatedScore}
        </motion.span>
        <div className={cn('flex items-center gap-1 text-xs font-medium', trendColor)}>
          <TrendIcon className="h-3 w-3" />
          <span>{trend === 'up' ? 'Improving' : trend === 'down' ? 'Declining' : 'Stable'}</span>
        </div>
      </div>
    </div>
  );
}

// Stat Card Component with count-up animation
function StatCard({
  icon: Icon,
  label,
  value,
  suffix = '',
  delay = 0,
}: {
  icon: React.ElementType;
  label: string;
  value: number | string;
  suffix?: string;
  delay?: number;
}) {
  const numericValue = typeof value === 'number' ? value : parseFloat(value) || 0;
  const animatedValue = useAnimatedCounter(numericValue, 1500);
  const displayValue = typeof value === 'string' && isNaN(parseFloat(value)) ? value : animatedValue;

  return (
    <motion.div
      className="glass-card p-4 flex items-center gap-3"
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay, duration: 0.5 }}
      whileHover={{ scale: 1.02, transition: { duration: 0.2 } }}
    >
      <div className="h-10 w-10 rounded-lg bg-primary/10 flex items-center justify-center">
        <Icon className="h-5 w-5 text-primary" />
      </div>
      <div>
        <p className="text-xs text-muted-foreground font-medium">{label}</p>
        <p className="text-lg font-bold">
          {displayValue}
          {suffix}
        </p>
      </div>
    </motion.div>
  );
}

// AI Insight Banner Component
function AIInsightBanner({ insight }: { insight: string }) {
  return (
    <motion.div
      className="glass-card-violet p-4 flex items-start gap-3 mt-4"
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.8, duration: 0.5 }}
    >
      <div className="h-8 w-8 rounded-lg bg-[hsl(var(--argus-violet-400)/0.2)] flex items-center justify-center flex-shrink-0">
        <Sparkles className="h-4 w-4 text-[hsl(var(--argus-violet-400))]" />
      </div>
      <div>
        <p className="text-xs font-semibold text-[hsl(var(--argus-violet-300))] uppercase tracking-wide mb-1">
          AI Insight of the Day
        </p>
        <p className="text-sm text-foreground/90">{insight}</p>
      </div>
    </motion.div>
  );
}

export function DashboardHero({
  userName,
  qualityScore,
  trend,
  todayInsight,
  stats,
}: DashboardHeroProps) {
  const greeting = getGreeting();
  const firstName = userName.split(' ')[0];

  return (
    <div className="relative overflow-hidden rounded-2xl mb-8">
      {/* Animated mesh gradient background */}
      <div className="absolute inset-0 overflow-hidden">
        <motion.div
          className="absolute inset-0"
          style={{
            background: `
              radial-gradient(ellipse 80% 60% at 20% 30%, hsl(var(--primary) / 0.15), transparent),
              radial-gradient(ellipse 60% 50% at 80% 70%, hsl(var(--argus-violet-400) / 0.12), transparent),
              radial-gradient(ellipse 70% 40% at 50% 90%, hsl(var(--argus-cyan) / 0.08), transparent),
              linear-gradient(135deg, hsl(var(--card)) 0%, hsl(var(--background)) 100%)
            `,
          }}
          animate={{
            backgroundPosition: ['0% 0%', '100% 100%', '0% 0%'],
          }}
          transition={{
            duration: 20,
            ease: 'linear',
            repeat: Infinity,
          }}
        />
        {/* Animated mesh lines */}
        <svg className="absolute inset-0 w-full h-full opacity-[0.03]" xmlns="http://www.w3.org/2000/svg">
          <defs>
            <pattern id="mesh-pattern" width="60" height="60" patternUnits="userSpaceOnUse">
              <path d="M 60 0 L 0 0 0 60" fill="none" stroke="currentColor" strokeWidth="1" />
            </pattern>
          </defs>
          <rect width="100%" height="100%" fill="url(#mesh-pattern)" />
        </svg>
        {/* Floating gradient orbs */}
        <motion.div
          className="absolute w-64 h-64 rounded-full"
          style={{
            background: 'radial-gradient(circle, hsl(var(--primary) / 0.2) 0%, transparent 70%)',
            left: '10%',
            top: '20%',
          }}
          animate={{
            x: [0, 30, 0],
            y: [0, -20, 0],
            scale: [1, 1.1, 1],
          }}
          transition={{
            duration: 8,
            ease: 'easeInOut',
            repeat: Infinity,
          }}
        />
        <motion.div
          className="absolute w-48 h-48 rounded-full"
          style={{
            background: 'radial-gradient(circle, hsl(var(--argus-violet-400) / 0.15) 0%, transparent 70%)',
            right: '15%',
            bottom: '20%',
          }}
          animate={{
            x: [0, -25, 0],
            y: [0, 15, 0],
            scale: [1, 1.15, 1],
          }}
          transition={{
            duration: 10,
            ease: 'easeInOut',
            repeat: Infinity,
            delay: 1,
          }}
        />
      </div>

      {/* Content */}
      <div className="relative z-10 p-6 md:p-8">
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
          {/* Left side - Greeting and Score */}
          <div className="flex items-center gap-6">
            {/* Quality Score Ring */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.5 }}
            >
              <QualityScoreRing score={qualityScore} trend={trend} />
            </motion.div>

            {/* Greeting */}
            <div>
              <motion.h1
                className="text-2xl md:text-3xl font-bold mb-1"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.5 }}
              >
                {greeting}, <span className="gradient-text">{firstName}</span>
              </motion.h1>
              <motion.p
                className="text-muted-foreground"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.5 }}
              >
                Your test health score is looking{' '}
                {qualityScore >= 90 ? (
                  <span className="text-emerald-500 font-medium">excellent</span>
                ) : qualityScore >= 70 ? (
                  <span className="text-amber-500 font-medium">good</span>
                ) : (
                  <span className="text-red-500 font-medium">concerning</span>
                )}
                .
              </motion.p>
            </div>
          </div>

          {/* Right side - Stats Grid */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <StatCard
              icon={FlaskConical}
              label="Tests Today"
              value={stats.testsToday}
              delay={0.4}
            />
            <StatCard
              icon={CheckCircle2}
              label="Pass Rate"
              value={stats.passRate}
              suffix="%"
              delay={0.5}
            />
            <StatCard
              icon={Clock}
              label="Avg Duration"
              value={stats.avgDuration}
              delay={0.6}
            />
            <StatCard
              icon={Wrench}
              label="Healed Tests"
              value={stats.healedTests}
              delay={0.7}
            />
          </div>
        </div>

        {/* AI Insight Banner */}
        {todayInsight && <AIInsightBanner insight={todayInsight} />}
      </div>
    </div>
  );
}

export function DashboardHeroSkeleton() {
  return (
    <div className="relative overflow-hidden rounded-2xl mb-8 bg-card p-6 md:p-8">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
        <div className="flex items-center gap-6">
          {/* Score ring skeleton */}
          <div className="w-[120px] h-[120px] rounded-full bg-muted animate-pulse" />
          {/* Greeting skeleton */}
          <div>
            <div className="h-8 w-48 bg-muted animate-pulse rounded mb-2" />
            <div className="h-5 w-64 bg-muted animate-pulse rounded" />
          </div>
        </div>
        {/* Stats skeleton */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="p-4 rounded-xl bg-muted/30 animate-pulse">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-lg bg-muted" />
                <div>
                  <div className="h-3 w-16 bg-muted rounded mb-2" />
                  <div className="h-5 w-12 bg-muted rounded" />
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

export default DashboardHero;
