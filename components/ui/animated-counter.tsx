'use client';

import { useEffect, useRef, useState } from 'react';
import { useSpring, useMotionValue, motion, useTransform } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface AnimatedCounterProps {
  /** The target value to animate to */
  value: number;
  /** Format for displaying the value */
  format?: 'number' | 'percentage' | 'currency' | 'duration' | 'compact';
  /** Text to display before the number */
  prefix?: string;
  /** Text to display after the number */
  suffix?: string;
  /** Animation duration in seconds */
  duration?: number;
  /** Number of decimal places */
  decimals?: number;
  /** Additional CSS classes */
  className?: string;
}

/**
 * Format large numbers in compact notation (1.2B, 2M, 10K)
 */
function formatCompact(value: number, decimals: number): string {
  if (value >= 1_000_000_000) {
    return `${(value / 1_000_000_000).toFixed(decimals)}B`;
  }
  if (value >= 1_000_000) {
    return `${(value / 1_000_000).toFixed(decimals)}M`;
  }
  if (value >= 1_000) {
    return `${(value / 1_000).toFixed(decimals)}K`;
  }
  return value.toFixed(decimals);
}

/**
 * Format a number according to the specified format type
 */
function formatValue(
  value: number,
  format: AnimatedCounterProps['format'],
  decimals: number
): string {
  switch (format) {
    case 'percentage':
      return `${value.toFixed(decimals)}%`;
    case 'currency':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(value);
    case 'duration':
      return value.toFixed(decimals);
    case 'compact':
      return formatCompact(value, decimals);
    case 'number':
    default:
      if (decimals === 0) {
        return new Intl.NumberFormat('en-US').format(Math.round(value));
      }
      return new Intl.NumberFormat('en-US', {
        minimumFractionDigits: decimals,
        maximumFractionDigits: decimals,
      }).format(value);
  }
}

/**
 * AnimatedCounter - A reusable animated counter component
 *
 * Animates from 0 to target value using spring physics.
 * Triggers animation when the element enters the viewport.
 *
 * @example
 * <AnimatedCounter value={1234} suffix="+" />
 * <AnimatedCounter value={98.5} format="percentage" />
 * <AnimatedCounter value={3.2} format="duration" suffix="s" />
 */
export function AnimatedCounter({
  value,
  format = 'number',
  prefix = '',
  suffix = '',
  duration = 2,
  decimals,
  className,
}: AnimatedCounterProps) {
  // Default decimals based on format if not specified
  const resolvedDecimals =
    decimals ?? (format === 'percentage' || format === 'duration' ? 1 : 0);

  const ref = useRef<HTMLSpanElement>(null);
  const [isInView, setIsInView] = useState(false);
  const [hasAnimated, setHasAnimated] = useState(false);

  // Motion value that will be animated
  const motionValue = useMotionValue(0);

  // Spring configuration - stiffness and damping tuned for smooth animation
  // Lower stiffness = slower animation, higher damping = less bounce
  const springConfig = {
    stiffness: 50 / duration,
    damping: 20 / duration,
    mass: 1,
  };

  // Use spring to animate the motion value
  const springValue = useSpring(motionValue, springConfig);

  // Transform the spring value to a formatted string
  const formattedValue = useTransform(springValue, (latest) =>
    formatValue(latest, format, resolvedDecimals)
  );

  // Track the current display value in state for rendering
  const [currentDisplay, setCurrentDisplay] = useState(() =>
    formatValue(0, format, resolvedDecimals)
  );

  // Set up Intersection Observer to trigger animation when in viewport
  useEffect(() => {
    if (!ref.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting && !hasAnimated) {
            setIsInView(true);
            setHasAnimated(true);
          }
        });
      },
      {
        threshold: 0.1,
        rootMargin: '0px 0px -50px 0px',
      }
    );

    observer.observe(ref.current);

    return () => {
      observer.disconnect();
    };
  }, [hasAnimated]);

  // Animate the motion value when in view
  useEffect(() => {
    if (isInView) {
      motionValue.set(value);
    }
  }, [isInView, value, motionValue]);

  // Subscribe to formatted value changes
  useEffect(() => {
    const unsubscribe = formattedValue.on('change', (latest) => {
      setCurrentDisplay(latest);
    });

    return () => {
      unsubscribe();
    };
  }, [formattedValue]);

  // Update animation when value changes after initial animation
  useEffect(() => {
    if (hasAnimated) {
      motionValue.set(value);
    }
  }, [value, hasAnimated, motionValue]);

  return (
    <motion.span
      ref={ref}
      className={cn('tabular-nums', className)}
      initial={{ opacity: 0, y: 10 }}
      animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 10 }}
      transition={{ duration: 0.3 }}
    >
      {prefix}
      {currentDisplay}
      {suffix}
    </motion.span>
  );
}

export default AnimatedCounter;
