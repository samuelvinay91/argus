'use client';

import * as React from 'react';
import { memo, useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Lock, Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface Achievement {
  id: string;
  name: string;
  description: string;
  icon: React.ReactNode;
  rarity: 'common' | 'rare' | 'epic' | 'legendary';
  unlocked: boolean;
  progress?: number; // 0-100
  unlockedAt?: Date;
}

export interface AchievementBadgeProps {
  achievement: Achievement;
  size?: 'sm' | 'md' | 'lg';
  showProgress?: boolean;
  onUnlock?: () => void;
}

// Rarity color configurations
const rarityColors = {
  common: {
    from: 'from-gray-400',
    to: 'to-gray-500',
    border: 'border-gray-400',
    bg: 'bg-gray-500/20',
    text: 'text-gray-400',
    glow: 'shadow-gray-400/30',
    gradient: 'bg-gradient-to-br from-gray-400 to-gray-500',
  },
  rare: {
    from: 'from-blue-400',
    to: 'to-blue-500',
    border: 'border-blue-400',
    bg: 'bg-blue-500/20',
    text: 'text-blue-400',
    glow: 'shadow-blue-400/30',
    gradient: 'bg-gradient-to-br from-blue-400 to-blue-500',
  },
  epic: {
    from: 'from-purple-400',
    to: 'to-purple-500',
    border: 'border-purple-400',
    bg: 'bg-purple-500/20',
    text: 'text-purple-400',
    glow: 'shadow-purple-400/30',
    gradient: 'bg-gradient-to-br from-purple-400 to-purple-500',
  },
  legendary: {
    from: 'from-amber-400',
    to: 'to-amber-500',
    border: 'border-amber-400',
    bg: 'bg-amber-500/20',
    text: 'text-amber-400',
    glow: 'shadow-amber-400/30',
    gradient: 'bg-gradient-to-br from-amber-400 to-amber-500',
  },
};

// Size configurations
const sizeConfig = {
  sm: {
    container: 'w-16 h-16',
    icon: 'w-6 h-6',
    text: 'text-xs',
    descText: 'text-[10px]',
    lockIcon: 'w-4 h-4',
    progressRing: 24,
    strokeWidth: 2,
  },
  md: {
    container: 'w-24 h-24',
    icon: 'w-10 h-10',
    text: 'text-sm',
    descText: 'text-xs',
    lockIcon: 'w-5 h-5',
    progressRing: 36,
    strokeWidth: 3,
  },
  lg: {
    container: 'w-32 h-32',
    icon: 'w-14 h-14',
    text: 'text-base',
    descText: 'text-sm',
    lockIcon: 'w-6 h-6',
    progressRing: 48,
    strokeWidth: 4,
  },
};

// Confetti particle component
const ConfettiParticle = memo(function ConfettiParticle({
  delay,
  color,
}: {
  delay: number;
  color: string;
}) {
  const randomAngle = Math.random() * 360;
  const randomDistance = 60 + Math.random() * 80;
  const randomRotation = Math.random() * 720 - 360;
  const x = Math.cos((randomAngle * Math.PI) / 180) * randomDistance;
  const y = Math.sin((randomAngle * Math.PI) / 180) * randomDistance;

  return (
    <motion.div
      className={cn('absolute w-2 h-2 rounded-full', color)}
      initial={{ opacity: 1, scale: 1, x: 0, y: 0, rotate: 0 }}
      animate={{
        opacity: [1, 1, 0],
        scale: [1, 1.2, 0.5],
        x: [0, x * 0.5, x],
        y: [0, y * 0.5 - 20, y + 30],
        rotate: [0, randomRotation * 0.5, randomRotation],
      }}
      transition={{
        duration: 1.2,
        delay,
        ease: [0.25, 0.46, 0.45, 0.94],
      }}
    />
  );
});

// Sparkle animation component
const SparkleEffect = memo(function SparkleEffect({ color }: { color: string }) {
  return (
    <motion.div
      className="absolute inset-0 pointer-events-none"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
    >
      {[...Array(4)].map((_, i) => (
        <motion.div
          key={i}
          className={cn('absolute', color)}
          style={{
            top: `${20 + Math.random() * 60}%`,
            left: `${20 + Math.random() * 60}%`,
          }}
          animate={{
            opacity: [0, 1, 0],
            scale: [0.5, 1, 0.5],
          }}
          transition={{
            duration: 1.5,
            repeat: Infinity,
            delay: i * 0.3,
            ease: 'easeInOut',
          }}
        >
          <Sparkles className="w-3 h-3" />
        </motion.div>
      ))}
    </motion.div>
  );
});

// Progress ring component
const ProgressRing = memo(function ProgressRing({
  progress,
  radius,
  strokeWidth,
  color,
}: {
  progress: number;
  radius: number;
  strokeWidth: number;
  color: string;
}) {
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (progress / 100) * circumference;

  return (
    <svg
      className="absolute inset-0 -rotate-90 pointer-events-none"
      width="100%"
      height="100%"
      viewBox={`0 0 ${radius * 2 + strokeWidth * 2} ${radius * 2 + strokeWidth * 2}`}
    >
      {/* Background circle */}
      <circle
        cx={radius + strokeWidth}
        cy={radius + strokeWidth}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-muted-foreground/20"
      />
      {/* Progress circle */}
      <motion.circle
        cx={radius + strokeWidth}
        cy={radius + strokeWidth}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        strokeLinecap="round"
        className={color}
        strokeDasharray={circumference}
        initial={{ strokeDashoffset: circumference }}
        animate={{ strokeDashoffset }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      />
    </svg>
  );
});

export const AchievementBadge = memo(function AchievementBadge({
  achievement,
  size = 'md',
  showProgress = true,
  onUnlock,
}: AchievementBadgeProps) {
  const [showConfetti, setShowConfetti] = useState(false);
  const [wasLocked, setWasLocked] = useState(!achievement.unlocked);
  const [isHovered, setIsHovered] = useState(false);

  const colors = rarityColors[achievement.rarity];
  const sizeStyles = sizeConfig[size];

  // Track unlock transition
  useEffect(() => {
    if (wasLocked && achievement.unlocked) {
      setShowConfetti(true);
      onUnlock?.();
      const timer = setTimeout(() => setShowConfetti(false), 1500);
      return () => clearTimeout(timer);
    }
    setWasLocked(!achievement.unlocked);
  }, [achievement.unlocked, wasLocked, onUnlock]);

  const handleMouseEnter = useCallback(() => setIsHovered(true), []);
  const handleMouseLeave = useCallback(() => setIsHovered(false), []);

  const confettiColors = [
    'bg-yellow-400',
    'bg-pink-400',
    'bg-blue-400',
    'bg-green-400',
    'bg-purple-400',
    'bg-red-400',
  ];

  const hasProgress = showProgress && achievement.progress !== undefined && !achievement.unlocked;
  const progressValue = achievement.progress ?? 0;

  return (
    <div className="relative flex flex-col items-center gap-2">
      {/* Badge container */}
      <motion.div
        className={cn(
          'relative rounded-full flex items-center justify-center cursor-pointer',
          sizeStyles.container,
          achievement.unlocked
            ? cn('border-2', colors.border, colors.bg, 'shadow-lg', colors.glow)
            : 'border-2 border-muted-foreground/30 bg-muted/50'
        )}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        whileHover={{ scale: 1.08 }}
        whileTap={{ scale: 0.95 }}
        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
      >
        {/* Gradient background for unlocked badges */}
        {achievement.unlocked && (
          <motion.div
            className={cn(
              'absolute inset-0 rounded-full opacity-20',
              colors.gradient
            )}
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.2 }}
          />
        )}

        {/* Progress ring for locked badges with progress */}
        {hasProgress && (
          <ProgressRing
            progress={progressValue}
            radius={sizeStyles.progressRing}
            strokeWidth={sizeStyles.strokeWidth}
            color={colors.text}
          />
        )}

        {/* Icon container */}
        <div
          className={cn(
            'relative z-10 flex items-center justify-center',
            sizeStyles.icon,
            achievement.unlocked ? colors.text : 'text-muted-foreground/50 grayscale'
          )}
        >
          {achievement.icon}
        </div>

        {/* Lock overlay for locked badges */}
        <AnimatePresence>
          {!achievement.unlocked && (
            <motion.div
              className="absolute inset-0 rounded-full flex items-center justify-center bg-background/60 backdrop-blur-[1px]"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0, scale: 1.5 }}
              transition={{ duration: 0.3 }}
            >
              <Lock className={cn('text-muted-foreground/70', sizeStyles.lockIcon)} />
            </motion.div>
          )}
        </AnimatePresence>

        {/* Sparkle animation for unlocked on hover */}
        <AnimatePresence>
          {achievement.unlocked && isHovered && (
            <SparkleEffect color={colors.text} />
          )}
        </AnimatePresence>

        {/* Unlock animation with confetti */}
        <AnimatePresence>
          {showConfetti && (
            <>
              {/* Flash effect */}
              <motion.div
                className={cn('absolute inset-0 rounded-full', colors.gradient)}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: [0, 0.8, 0], scale: [0.8, 1.2, 1] }}
                transition={{ duration: 0.5 }}
              />
              {/* Confetti particles */}
              {[...Array(16)].map((_, i) => (
                <ConfettiParticle
                  key={i}
                  delay={i * 0.02}
                  color={confettiColors[i % confettiColors.length]}
                />
              ))}
              {/* Ring burst */}
              <motion.div
                className={cn(
                  'absolute inset-0 rounded-full border-4',
                  colors.border
                )}
                initial={{ opacity: 1, scale: 1 }}
                animate={{ opacity: 0, scale: 2 }}
                transition={{ duration: 0.6, ease: 'easeOut' }}
              />
            </>
          )}
        </AnimatePresence>

        {/* Rarity indicator glow for legendary */}
        {achievement.unlocked && achievement.rarity === 'legendary' && (
          <motion.div
            className="absolute inset-0 rounded-full pointer-events-none"
            animate={{
              boxShadow: [
                '0 0 20px rgba(251, 191, 36, 0.3)',
                '0 0 40px rgba(251, 191, 36, 0.5)',
                '0 0 20px rgba(251, 191, 36, 0.3)',
              ],
            }}
            transition={{
              duration: 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        )}
      </motion.div>

      {/* Achievement name */}
      <motion.p
        className={cn(
          'font-semibold text-center max-w-[120px] truncate',
          sizeStyles.text,
          achievement.unlocked ? 'text-foreground' : 'text-muted-foreground'
        )}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        {achievement.name}
      </motion.p>

      {/* Achievement description */}
      <motion.p
        className={cn(
          'text-center max-w-[140px] text-muted-foreground line-clamp-2',
          sizeStyles.descText
        )}
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {achievement.description}
      </motion.p>

      {/* Progress text for locked badges */}
      {hasProgress && (
        <motion.p
          className={cn('font-medium', sizeStyles.descText, colors.text)}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          {progressValue}% Complete
        </motion.p>
      )}

      {/* Rarity badge */}
      <motion.span
        className={cn(
          'px-2 py-0.5 rounded-full text-[10px] font-medium uppercase tracking-wider',
          achievement.unlocked
            ? cn(colors.bg, colors.text)
            : 'bg-muted text-muted-foreground'
        )}
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.3 }}
      >
        {achievement.rarity}
      </motion.span>

      {/* Unlock date for unlocked achievements */}
      {achievement.unlocked && achievement.unlockedAt && (
        <motion.p
          className="text-[10px] text-muted-foreground"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          Unlocked {new Date(achievement.unlockedAt).toLocaleDateString()}
        </motion.p>
      )}
    </div>
  );
});

// Export a grid component for displaying multiple achievements
export function AchievementGrid({
  achievements,
  size = 'md',
  showProgress = true,
  onUnlock,
}: {
  achievements: Achievement[];
  size?: 'sm' | 'md' | 'lg';
  showProgress?: boolean;
  onUnlock?: (achievement: Achievement) => void;
}) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6 p-4">
      {achievements.map((achievement) => (
        <AchievementBadge
          key={achievement.id}
          achievement={achievement}
          size={size}
          showProgress={showProgress}
          onUnlock={() => onUnlock?.(achievement)}
        />
      ))}
    </div>
  );
}

export default AchievementBadge;
