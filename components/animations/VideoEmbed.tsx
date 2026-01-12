'use client';

import { useRef, useState } from 'react';
import { motion, useInView } from 'framer-motion';
import { Play, Pause, Volume2, VolumeX, Maximize2, X } from 'lucide-react';

interface VideoEmbedProps {
  // Video source URL (MP4, WebM, etc.)
  src: string;
  // Poster/thumbnail image
  poster?: string;
  // Width and height
  width?: number | string;
  height?: number | string;
  // Additional className
  className?: string;
  // Auto play on scroll into view
  autoPlayOnView?: boolean;
  // Loop the video
  loop?: boolean;
  // Muted by default
  muted?: boolean;
  // Show controls
  showControls?: boolean;
  // Play button overlay style
  playButtonStyle?: 'minimal' | 'prominent' | 'hidden';
  // Border radius
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
  // Title for accessibility
  title?: string;
  // Aspect ratio
  aspectRatio?: '16/9' | '4/3' | '1/1' | '9/16' | 'auto';
  // Gradient overlay
  overlay?: boolean;
}

// For Runway-generated videos, you would typically:
// 1. Generate video on runwayml.com
// 2. Download the MP4
// 3. Upload to your CDN (Vercel Blob, Cloudflare R2, etc.)
// 4. Use the CDN URL here

export function VideoEmbed({
  src,
  poster,
  width = '100%',
  height = 'auto',
  className = '',
  autoPlayOnView = true,
  loop = true,
  muted = true,
  showControls = false,
  playButtonStyle = 'prominent',
  rounded = 'xl',
  title = 'Video',
  aspectRatio = '16/9',
  overlay = true,
}: VideoEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const isInView = useInView(containerRef, { once: false, amount: 0.5 });
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(muted);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showOverlay, setShowOverlay] = useState(true);
  const [hasStarted, setHasStarted] = useState(false);

  const roundedClasses = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl',
    '3xl': 'rounded-3xl',
  };

  const togglePlay = () => {
    if (!videoRef.current) return;

    if (isPlaying) {
      videoRef.current.pause();
    } else {
      videoRef.current.play();
      setHasStarted(true);
    }
    setIsPlaying(!isPlaying);
    setShowOverlay(false);
  };

  const toggleMute = () => {
    if (!videoRef.current) return;
    videoRef.current.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;

    if (!isFullscreen) {
      if (containerRef.current.requestFullscreen) {
        containerRef.current.requestFullscreen();
      }
    } else {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      }
    }
    setIsFullscreen(!isFullscreen);
  };

  // Auto-play on view
  useState(() => {
    if (!autoPlayOnView || !videoRef.current) return;

    if (isInView && !isPlaying) {
      videoRef.current.play().then(() => {
        setIsPlaying(true);
        setHasStarted(true);
        setShowOverlay(false);
      }).catch(() => {
        // Autoplay was prevented
      });
    } else if (!isInView && isPlaying) {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  });

  return (
    <motion.div
      ref={containerRef}
      className={`relative overflow-hidden group ${roundedClasses[rounded]} ${className}`}
      style={{ width, height, aspectRatio }}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: isInView ? 1 : 0.5, y: isInView ? 0 : 20 }}
      transition={{ duration: 0.5 }}
    >
      {/* Video Element */}
      <video
        ref={videoRef}
        src={src}
        poster={poster}
        loop={loop}
        muted={isMuted}
        playsInline
        className="w-full h-full object-cover"
        title={title}
        onEnded={() => {
          if (!loop) {
            setIsPlaying(false);
            setShowOverlay(true);
          }
        }}
      />

      {/* Gradient Overlay */}
      {overlay && (
        <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
      )}

      {/* Play Button Overlay */}
      {playButtonStyle !== 'hidden' && showOverlay && (
        <motion.div
          className="absolute inset-0 flex items-center justify-center cursor-pointer"
          onClick={togglePlay}
          initial={{ opacity: 1 }}
          animate={{ opacity: hasStarted ? 0 : 1 }}
          transition={{ duration: 0.3 }}
        >
          {playButtonStyle === 'prominent' && (
            <motion.div
              className="w-20 h-20 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center border border-white/30"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <div className="w-14 h-14 rounded-full bg-white flex items-center justify-center">
                <Play className="w-6 h-6 text-gray-900 ml-1" fill="currentColor" />
              </div>
            </motion.div>
          )}
          {playButtonStyle === 'minimal' && (
            <motion.div
              className="w-12 h-12 rounded-full bg-background/80 backdrop-blur-sm flex items-center justify-center"
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              <Play className="w-5 h-5 text-foreground ml-0.5" fill="currentColor" />
            </motion.div>
          )}
        </motion.div>
      )}

      {/* Custom Controls */}
      {showControls && (
        <motion.div
          className="absolute bottom-0 left-0 right-0 p-4 flex items-center justify-between bg-gradient-to-t from-black/60 to-transparent"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <div className="flex items-center gap-2">
            <button
              onClick={togglePlay}
              className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 text-white" fill="currentColor" />
              ) : (
                <Play className="w-4 h-4 text-white ml-0.5" fill="currentColor" />
              )}
            </button>
            <button
              onClick={toggleMute}
              className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors"
            >
              {isMuted ? (
                <VolumeX className="w-4 h-4 text-white" />
              ) : (
                <Volume2 className="w-4 h-4 text-white" />
              )}
            </button>
          </div>
          <button
            onClick={toggleFullscreen}
            className="w-8 h-8 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center hover:bg-white/30 transition-colors"
          >
            {isFullscreen ? (
              <X className="w-4 h-4 text-white" />
            ) : (
              <Maximize2 className="w-4 h-4 text-white" />
            )}
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}

// YouTube/Vimeo embed component
interface IframeEmbedProps {
  // YouTube/Vimeo video ID or full embed URL
  videoId?: string;
  embedUrl?: string;
  // Platform
  platform?: 'youtube' | 'vimeo' | 'custom';
  // Width and height
  width?: number | string;
  height?: number | string;
  // Additional className
  className?: string;
  // Aspect ratio
  aspectRatio?: '16/9' | '4/3' | '1/1';
  // Title
  title?: string;
  // Allow autoplay
  autoplay?: boolean;
  // Border radius
  rounded?: 'none' | 'sm' | 'md' | 'lg' | 'xl' | '2xl' | '3xl';
}

export function IframeEmbed({
  videoId,
  embedUrl,
  platform = 'youtube',
  width = '100%',
  height = 'auto',
  className = '',
  aspectRatio = '16/9',
  title = 'Embedded video',
  autoplay = false,
  rounded = 'xl',
}: IframeEmbedProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isInView = useInView(containerRef, { once: true, amount: 0.3 });

  const roundedClasses = {
    none: 'rounded-none',
    sm: 'rounded-sm',
    md: 'rounded-md',
    lg: 'rounded-lg',
    xl: 'rounded-xl',
    '2xl': 'rounded-2xl',
    '3xl': 'rounded-3xl',
  };

  const getSrc = () => {
    if (embedUrl) return embedUrl;
    if (!videoId) return '';

    switch (platform) {
      case 'youtube':
        return `https://www.youtube.com/embed/${videoId}?autoplay=${autoplay ? 1 : 0}&rel=0&modestbranding=1`;
      case 'vimeo':
        return `https://player.vimeo.com/video/${videoId}?autoplay=${autoplay ? 1 : 0}&title=0&byline=0&portrait=0`;
      default:
        return videoId;
    }
  };

  return (
    <motion.div
      ref={containerRef}
      className={`relative overflow-hidden ${roundedClasses[rounded]} ${className}`}
      style={{ width, height, aspectRatio }}
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: isInView ? 1 : 0, scale: isInView ? 1 : 0.95 }}
      transition={{ duration: 0.5 }}
    >
      {isInView && (
        <iframe
          src={getSrc()}
          title={title}
          className="absolute inset-0 w-full h-full"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
        />
      )}
    </motion.div>
  );
}

export default VideoEmbed;
