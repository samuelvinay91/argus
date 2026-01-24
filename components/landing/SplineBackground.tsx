'use client';

import { Suspense, lazy } from 'react';

const Spline = lazy(() => import('@splinetool/react-spline'));

interface SplineBackgroundProps {
  scene?: string;
  className?: string;
}

// Popular free Spline scenes - uncomment the one you want to try:
const SPLINE_SCENES = {
  // Gradient blob/sphere - clean and modern
  gradientBlob: "https://prod.spline.design/6Wq1Q7YGyM-iab9i/scene.splinecode",
  // Abstract shapes
  abstractShapes: "https://prod.spline.design/KFonZGtsoUXP-qx7/scene.splinecode",
  // 3D keyboard/tech
  keyboard3d: "https://prod.spline.design/pvM5WO8RH8eKTDDv/scene.splinecode",
};

export function SplineBackground({
  // Change this to try different scenes: gradientBlob, abstractShapes, keyboard3d
  scene = SPLINE_SCENES.gradientBlob,
  className = '',
}: SplineBackgroundProps) {
  return (
    <div className={`absolute inset-0 ${className}`}>
      {/* Loading state */}
      <div className="absolute inset-0 bg-gradient-to-br from-background via-background to-primary/5 animate-pulse" />

      <Suspense fallback={null}>
        <Spline
          scene={scene}
          style={{
            width: '100%',
            height: '100%',
            position: 'absolute',
            top: 0,
            left: 0,
          }}
        />
      </Suspense>
    </div>
  );
}
