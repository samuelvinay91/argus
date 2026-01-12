'use client';

import { useEffect, useRef } from 'react';
import { motion } from 'framer-motion';

interface AnimatedMeshGradientProps {
  className?: string;
  intensity?: 'subtle' | 'normal' | 'vibrant';
}

export function AnimatedMeshGradient({
  className = '',
  intensity = 'normal',
}: AnimatedMeshGradientProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // Intensity-based opacity
  const opacityMap = {
    subtle: 0.15,
    normal: 0.25,
    vibrant: 0.4,
  };

  const baseOpacity = opacityMap[intensity];

  return (
    <div
      ref={containerRef}
      className={`absolute inset-0 overflow-hidden pointer-events-none ${className}`}
    >
      {/* Primary gradient blob - teal */}
      <motion.div
        className="absolute rounded-full blur-[120px]"
        style={{
          width: '40%',
          height: '40%',
          background: `radial-gradient(circle, hsl(173 80% 45% / ${baseOpacity}) 0%, transparent 70%)`,
        }}
        animate={{
          x: ['0%', '20%', '5%', '15%', '0%'],
          y: ['0%', '10%', '25%', '5%', '0%'],
          scale: [1, 1.2, 0.9, 1.1, 1],
        }}
        transition={{
          duration: 20,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        initial={{ x: '10%', y: '10%' }}
      />

      {/* Secondary gradient blob - cyan */}
      <motion.div
        className="absolute rounded-full blur-[100px]"
        style={{
          width: '35%',
          height: '35%',
          background: `radial-gradient(circle, hsl(190 80% 50% / ${baseOpacity * 0.8}) 0%, transparent 70%)`,
        }}
        animate={{
          x: ['60%', '70%', '55%', '75%', '60%'],
          y: ['50%', '30%', '60%', '40%', '50%'],
          scale: [1, 0.9, 1.2, 1, 1],
        }}
        transition={{
          duration: 25,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        initial={{ x: '60%', y: '50%' }}
      />

      {/* Tertiary gradient blob - violet (AI accent) */}
      <motion.div
        className="absolute rounded-full blur-[80px]"
        style={{
          width: '30%',
          height: '30%',
          background: `radial-gradient(circle, hsl(262 80% 60% / ${baseOpacity * 0.6}) 0%, transparent 70%)`,
        }}
        animate={{
          x: ['70%', '60%', '80%', '65%', '70%'],
          y: ['10%', '30%', '20%', '5%', '10%'],
          scale: [1, 1.1, 0.95, 1.15, 1],
        }}
        transition={{
          duration: 22,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        initial={{ x: '70%', y: '10%' }}
      />

      {/* Subtle accent blob - amber */}
      <motion.div
        className="absolute rounded-full blur-[60px]"
        style={{
          width: '20%',
          height: '20%',
          background: `radial-gradient(circle, hsl(38 100% 50% / ${baseOpacity * 0.4}) 0%, transparent 70%)`,
        }}
        animate={{
          x: ['20%', '30%', '15%', '35%', '20%'],
          y: ['70%', '60%', '80%', '65%', '70%'],
          scale: [1, 1.15, 0.9, 1.05, 1],
        }}
        transition={{
          duration: 18,
          repeat: Infinity,
          ease: 'easeInOut',
        }}
        initial={{ x: '20%', y: '70%' }}
      />

      {/* Grid overlay for depth */}
      <div
        className="absolute inset-0 opacity-[0.015]"
        style={{
          backgroundImage: `
            linear-gradient(hsl(var(--foreground)) 1px, transparent 1px),
            linear-gradient(90deg, hsl(var(--foreground)) 1px, transparent 1px)
          `,
          backgroundSize: '60px 60px',
        }}
      />

      {/* Noise texture overlay */}
      <div
        className="absolute inset-0 opacity-[0.02] mix-blend-overlay"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg viewBox='0 0 256 256' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='noiseFilter'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23noiseFilter)'/%3E%3C/svg%3E")`,
        }}
      />
    </div>
  );
}

export default AnimatedMeshGradient;
