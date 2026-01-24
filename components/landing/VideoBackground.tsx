'use client';

import { useRef, useEffect, useState } from 'react';

interface VideoBackgroundProps {
  src: string;
  poster?: string;
  className?: string;
  overlay?: boolean;
  overlayOpacity?: number;
}

export function VideoBackground({
  src,
  poster,
  className = '',
  overlay = true,
  overlayOpacity = 0.4,
}: VideoBackgroundProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleLoaded = () => setIsLoaded(true);
    video.addEventListener('loadeddata', handleLoaded);

    // Ensure video plays on mobile
    video.play().catch(() => {
      // Autoplay blocked, user interaction needed
    });

    return () => video.removeEventListener('loadeddata', handleLoaded);
  }, []);

  return (
    <div className={`absolute inset-0 overflow-hidden ${className}`}>
      {/* Loading state with gradient */}
      <div
        className={`absolute inset-0 bg-gradient-to-br from-background via-background to-primary/10 transition-opacity duration-1000 ${
          isLoaded ? 'opacity-0' : 'opacity-100'
        }`}
      />

      {/* Video element */}
      <video
        ref={videoRef}
        autoPlay
        loop
        muted
        playsInline
        poster={poster}
        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-1000 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <source src={src} type={src.endsWith('.webm') ? 'video/webm' : 'video/mp4'} />
      </video>

      {/* Gradient overlay for text readability */}
      {overlay && (
        <>
          {/* Main darkening overlay */}
          <div
            className="absolute inset-0 bg-background/60"
            style={{ opacity: overlayOpacity }}
          />
          {/* Edge vignette */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,transparent_0%,rgba(3,7,18,0.8)_100%)]" />
          {/* Bottom fade for content below */}
          <div className="absolute inset-x-0 bottom-0 h-32 bg-gradient-to-t from-background to-transparent" />
        </>
      )}
    </div>
  );
}
