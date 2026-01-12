'use client';

import { useRef, useEffect, useState } from 'react';
import Lottie, { LottieRefCurrentProps } from 'lottie-react';
import { motion, useInView } from 'framer-motion';

interface LottieAnimationProps {
  // Path to animation JSON file or URL
  animationPath?: string;
  // Or provide animation data directly
  animationData?: object;
  // Whether to loop the animation
  loop?: boolean;
  // Whether to autoplay
  autoplay?: boolean;
  // Play on scroll into view
  playOnView?: boolean;
  // Speed of animation (1 = normal)
  speed?: number;
  // Width and height
  width?: number | string;
  height?: number | string;
  // Additional className
  className?: string;
  // Click to toggle play/pause
  clickToToggle?: boolean;
  // Initial segment [start, end] frame numbers
  segment?: [number, number];
  // Render as SVG (default)
  renderer?: 'svg';
}

// Pre-built Lottie animation URLs (from LottieFiles)
export const LOTTIE_ANIMATIONS = {
  // AI/Tech themed
  aiRobot: 'https://lottie.host/embed/c3e7d5d4-e5b5-4b5b-9c5c-5c5c5c5c5c5c/animation.json',
  neuralNetwork: 'https://assets10.lottiefiles.com/packages/lf20_khzniaya.json',
  dataFlow: 'https://assets7.lottiefiles.com/packages/lf20_qp1q7mct.json',
  codeTyping: 'https://assets9.lottiefiles.com/packages/lf20_w51pcehl.json',

  // Success/Status
  checkmark: 'https://assets2.lottiefiles.com/packages/lf20_jbrw3hcz.json',
  successConfetti: 'https://assets1.lottiefiles.com/packages/lf20_u4yrau.json',
  loadingDots: 'https://assets8.lottiefiles.com/packages/lf20_p8bfn5to.json',

  // Abstract/Decorative
  gradientOrb: 'https://assets3.lottiefiles.com/packages/lf20_oifa5v1r.json',
  particleWave: 'https://assets6.lottiefiles.com/packages/lf20_dwv3vfgs.json',

  // Quality/Testing themed
  shield: 'https://assets4.lottiefiles.com/packages/lf20_fhbjpbzi.json',
  bugFix: 'https://assets5.lottiefiles.com/packages/lf20_ttvteyvk.json',
};

export function LottieAnimation({
  animationPath,
  animationData,
  loop = true,
  autoplay = true,
  playOnView = false,
  speed = 1,
  width = '100%',
  height = '100%',
  className = '',
  clickToToggle = false,
  segment,
}: LottieAnimationProps) {
  const lottieRef = useRef<LottieRefCurrentProps>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: false, amount: 0.5 });
  const [isPlaying, setIsPlaying] = useState(autoplay && !playOnView);
  const [loadedData, setLoadedData] = useState<object | null>(animationData || null);
  const [error, setError] = useState<string | null>(null);

  // Load animation from URL if provided
  useEffect(() => {
    if (animationPath && !animationData) {
      fetch(animationPath)
        .then((res) => res.json())
        .then((data) => setLoadedData(data))
        .catch((err) => setError(`Failed to load animation: ${err.message}`));
    }
  }, [animationPath, animationData]);

  // Control playback based on view
  useEffect(() => {
    if (playOnView && lottieRef.current) {
      if (isInView) {
        lottieRef.current.play();
        setIsPlaying(true);
      } else {
        lottieRef.current.pause();
        setIsPlaying(false);
      }
    }
  }, [isInView, playOnView]);

  // Set speed
  useEffect(() => {
    if (lottieRef.current) {
      lottieRef.current.setSpeed(speed);
    }
  }, [speed]);

  // Set segment
  useEffect(() => {
    if (lottieRef.current && segment) {
      lottieRef.current.playSegments(segment, true);
    }
  }, [segment]);

  const handleClick = () => {
    if (!clickToToggle || !lottieRef.current) return;

    if (isPlaying) {
      lottieRef.current.pause();
    } else {
      lottieRef.current.play();
    }
    setIsPlaying(!isPlaying);
  };

  if (error) {
    return (
      <div className={`flex items-center justify-center text-muted-foreground text-sm ${className}`}>
        {error}
      </div>
    );
  }

  if (!loadedData) {
    return (
      <div
        className={`flex items-center justify-center ${className}`}
        style={{ width, height }}
      >
        <div className="animate-pulse bg-muted rounded-lg w-full h-full" />
      </div>
    );
  }

  return (
    <motion.div
      ref={containerRef}
      className={className}
      style={{ width, height }}
      onClick={handleClick}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
      role={clickToToggle ? 'button' : undefined}
      tabIndex={clickToToggle ? 0 : undefined}
    >
      <Lottie
        lottieRef={lottieRef}
        animationData={loadedData}
        loop={loop}
        autoplay={autoplay && !playOnView}
        style={{ width: '100%', height: '100%' }}
      />
    </motion.div>
  );
}

// Pre-configured animation components
export function AIRobotAnimation(props: Omit<LottieAnimationProps, 'animationPath'>) {
  return <LottieAnimation {...props} animationPath={LOTTIE_ANIMATIONS.neuralNetwork} />;
}

export function SuccessAnimation(props: Omit<LottieAnimationProps, 'animationPath' | 'loop'>) {
  return <LottieAnimation {...props} animationPath={LOTTIE_ANIMATIONS.checkmark} loop={false} />;
}

export function LoadingAnimation(props: Omit<LottieAnimationProps, 'animationPath'>) {
  return <LottieAnimation {...props} animationPath={LOTTIE_ANIMATIONS.loadingDots} />;
}

export default LottieAnimation;
