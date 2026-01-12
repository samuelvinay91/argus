'use client';

import { Suspense, useRef, useState } from 'react';
import Spline from '@splinetool/react-spline';
import { motion, useInView } from 'framer-motion';
import type { Application } from '@splinetool/runtime';

interface SplineSceneProps {
  // Spline scene URL (from Spline export)
  sceneUrl: string;
  // Width and height
  width?: number | string;
  height?: number | string;
  // Additional className
  className?: string;
  // Callback when scene is loaded
  onLoad?: (spline: Application) => void;
  // Whether to render on scroll into view only
  loadOnView?: boolean;
  // Fallback content while loading
  fallback?: React.ReactNode;
  // Whether to show loading state
  showLoading?: boolean;
}

// Example Spline scene URLs (you can create your own at spline.design)
export const SPLINE_SCENES = {
  // Abstract 3D shapes
  abstractSphere: 'https://prod.spline.design/Rq5K9FVn9M3UGhEF/scene.splinecode',
  floatingCubes: 'https://prod.spline.design/6Wq1Q7YGyM-iab9t/scene.splinecode',
  gradientOrb: 'https://prod.spline.design/dIKxq5KZqHYKNxfR/scene.splinecode',

  // Tech themed
  aiChip: 'https://prod.spline.design/AIGVHwrqVfGxnQx7/scene.splinecode',
  dataVisualization: 'https://prod.spline.design/pVqbFJKRqLEZBqwS/scene.splinecode',

  // Interactive
  interactiveButton: 'https://prod.spline.design/dfXq5uAXi9E5qHPK/scene.splinecode',
};

function LoadingSpinner() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-background/50 backdrop-blur-sm">
      <div className="flex items-center gap-3">
        <motion.div
          className="w-2 h-2 bg-primary rounded-full"
          animate={{ scale: [1, 1.5, 1] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: 0 }}
        />
        <motion.div
          className="w-2 h-2 bg-primary rounded-full"
          animate={{ scale: [1, 1.5, 1] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: 0.2 }}
        />
        <motion.div
          className="w-2 h-2 bg-primary rounded-full"
          animate={{ scale: [1, 1.5, 1] }}
          transition={{ duration: 0.6, repeat: Infinity, delay: 0.4 }}
        />
      </div>
    </div>
  );
}

export function SplineScene({
  sceneUrl,
  width = '100%',
  height = 400,
  className = '',
  onLoad,
  loadOnView = true,
  fallback,
  showLoading = true,
}: SplineSceneProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, amount: 0.3 });
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLoad = (splineApp: Application) => {
    setIsLoaded(true);
    onLoad?.(splineApp);
  };

  const handleError = () => {
    setError('Failed to load 3D scene');
  };

  const shouldRender = !loadOnView || isInView;

  return (
    <motion.div
      ref={containerRef}
      className={`relative overflow-hidden rounded-xl ${className}`}
      style={{ width, height }}
      initial={{ opacity: 0 }}
      animate={{ opacity: isInView ? 1 : 0 }}
      transition={{ duration: 0.5 }}
    >
      {error ? (
        <div className="absolute inset-0 flex items-center justify-center text-muted-foreground text-sm bg-muted/20">
          {error}
        </div>
      ) : shouldRender ? (
        <Suspense fallback={fallback || (showLoading ? <LoadingSpinner /> : null)}>
          <Spline
            scene={sceneUrl}
            onLoad={handleLoad}
            onError={handleError}
            style={{ width: '100%', height: '100%' }}
          />
          {!isLoaded && showLoading && <LoadingSpinner />}
        </Suspense>
      ) : (
        fallback || (showLoading ? <LoadingSpinner /> : null)
      )}
    </motion.div>
  );
}

// Pre-configured scene components
export function AbstractSphereScene(props: Omit<SplineSceneProps, 'sceneUrl'>) {
  return <SplineScene {...props} sceneUrl={SPLINE_SCENES.abstractSphere} />;
}

export function FloatingCubesScene(props: Omit<SplineSceneProps, 'sceneUrl'>) {
  return <SplineScene {...props} sceneUrl={SPLINE_SCENES.floatingCubes} />;
}

export function GradientOrbScene(props: Omit<SplineSceneProps, 'sceneUrl'>) {
  return <SplineScene {...props} sceneUrl={SPLINE_SCENES.gradientOrb} />;
}

export default SplineScene;
