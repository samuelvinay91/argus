'use client';

import { useEffect, useRef, useState } from 'react';

interface VideoHeroProps {
  videoSrc: string;
  posterSrc?: string;
  webmSrc?: string;
  opacity?: number;
  overlay?: boolean;
}

/**
 * Video Hero Component for Landing Page
 * 
 * Features:
 * - Auto-play with mute
 * - Loop for continuous playback
 * - Lazy loading for performance
 * - Fallback poster image
 * - Mobile optimization
 * - Optional gradient overlay
 * 
 * @example
 * <VideoHero 
 *   videoSrc="/videos/hero-background.mp4"
 *   posterSrc="/hero-poster.jpg"
 *   webmSrc="/videos/hero-background.webm"
 *   opacity={0.3}
 *   overlay={true}
 * />
 */
export function VideoHero({
  videoSrc,
  posterSrc,
  webmSrc,
  opacity = 0.3,
  overlay = true,
}: VideoHeroProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    // Detect mobile devices
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleCanPlay = () => {
      setIsLoaded(true);
      // Attempt to play (may be blocked by browser policies)
      video.play().catch((error) => {
        console.log('Video autoplay blocked:', error);
      });
    };

    video.addEventListener('canplay', handleCanPlay);
    return () => video.removeEventListener('canplay', handleCanPlay);
  }, []);

  // On mobile, show poster only to save bandwidth/battery
  if (isMobile && posterSrc) {
    return (
      <div className="absolute inset-0 w-full h-full overflow-hidden">
        <img
          src={posterSrc}
          alt="Hero background"
          className="w-full h-full object-cover"
          style={{ opacity }}
        />
        {overlay && (
          <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/60 to-black/80" />
        )}
      </div>
    );
  }

  return (
    <div className="absolute inset-0 w-full h-full overflow-hidden">
      {/* Video */}
      <video
        ref={videoRef}
        autoPlay
        muted
        loop
        playsInline
        poster={posterSrc}
        className={`w-full h-full object-cover transition-opacity duration-1000 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
        style={{ opacity: isLoaded ? opacity : 0 }}
      >
        {webmSrc && <source src={webmSrc} type="video/webm" />}
        <source src={videoSrc} type="video/mp4" />
        Your browser does not support the video tag.
      </video>

      {/* Gradient Overlay for text readability */}
      {overlay && (
        <div className="absolute inset-0 bg-gradient-to-b from-black/50 via-black/60 to-black/80" />
      )}

      {/* Loading state - show poster */}
      {!isLoaded && posterSrc && (
        <img
          src={posterSrc}
          alt="Hero background"
          className="absolute inset-0 w-full h-full object-cover"
          style={{ opacity }}
        />
      )}
    </div>
  );
}

/**
 * Lazy Video Component - Only loads when in viewport
 * Use for feature sections to improve performance
 */
export function LazyVideo({
  videoSrc,
  posterSrc,
  className = '',
  autoPlay = true,
  loop = true,
}: {
  videoSrc: string;
  posterSrc?: string;
  className?: string;
  autoPlay?: boolean;
  loop?: boolean;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isInView, setIsInView] = useState(false);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
        }
      },
      { threshold: 0.25 } // Load when 25% visible
    );

    if (videoRef.current) {
      observer.observe(videoRef.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <video
      ref={videoRef}
      autoPlay={autoPlay && isInView}
      muted
      loop={loop}
      playsInline
      poster={posterSrc}
      className={className}
    >
      {isInView && <source src={videoSrc} type="video/mp4" />}
    </video>
  );
}

/**
 * Example Usage in Landing Page:
 * 
 * import { VideoHero, LazyVideo } from '@/components/landing/VideoHero';
 * 
 * // Hero Section
 * <section className="relative h-screen">
 *   <VideoHero 
 *     videoSrc="/videos/hero-background.mp4"
 *     posterSrc="/videos/hero-poster.jpg"
 *     webmSrc="/videos/hero-background.webm"
 *     opacity={0.3}
 *     overlay={true}
 *   />
 *   <div className="relative z-10">
 *     <h1>Your Hero Content</h1>
 *   </div>
 * </section>
 * 
 * // Feature Section (lazy loaded)
 * <section>
 *   <LazyVideo 
 *     videoSrc="/videos/feature-demo.mp4"
 *     posterSrc="/videos/feature-poster.jpg"
 *     className="w-full rounded-lg"
 *   />
 * </section>
 */
