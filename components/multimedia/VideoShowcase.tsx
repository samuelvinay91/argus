'use client';

import * as React from 'react';
import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Play, Clock } from 'lucide-react';
import { cn } from '@/lib/utils';

export interface VideoShowcaseProps {
  videoUrl: string;
  thumbnailUrl: string;
  title: string;
  duration?: string;
  description?: string;
  autoPlay?: boolean;
  onPlay?: () => void;
}

export function VideoShowcase({
  videoUrl,
  thumbnailUrl,
  title,
  duration,
  description,
  autoPlay = false,
  onPlay,
}: VideoShowcaseProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);

  const handlePlayClick = () => {
    setIsPlaying(true);
    onPlay?.();
  };

  const handleVideoLoaded = () => {
    setIsLoaded(true);
    if (autoPlay && videoRef.current) {
      videoRef.current.play();
    }
  };

  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-xl',
        'bg-background/60 backdrop-blur-xl',
        'border border-white/10',
        'shadow-2xl shadow-black/20'
      )}
    >
      {/* Video Container */}
      <div className="relative aspect-video w-full overflow-hidden">
        <AnimatePresence mode="wait">
          {!isPlaying ? (
            <motion.div
              key="thumbnail"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0"
            >
              {/* Thumbnail Image */}
              <img
                src={thumbnailUrl}
                alt={title}
                className="h-full w-full object-cover"
              />

              {/* Gradient Overlay */}
              <div
                className={cn(
                  'absolute inset-0',
                  'bg-gradient-to-t from-black/80 via-black/20 to-transparent'
                )}
              />

              {/* Top Gradient for depth */}
              <div
                className={cn(
                  'absolute inset-x-0 top-0 h-24',
                  'bg-gradient-to-b from-black/40 to-transparent'
                )}
              />

              {/* Play Button */}
              <div className="absolute inset-0 flex items-center justify-center">
                <motion.button
                  onClick={handlePlayClick}
                  className={cn(
                    'flex h-20 w-20 items-center justify-center',
                    'rounded-full',
                    'bg-primary text-primary-foreground',
                    'shadow-lg shadow-primary/50',
                    'focus:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2'
                  )}
                  initial={{ scale: 1 }}
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                  animate={{
                    boxShadow: [
                      '0 0 20px rgba(var(--primary), 0.5)',
                      '0 0 40px rgba(var(--primary), 0.3)',
                      '0 0 20px rgba(var(--primary), 0.5)',
                    ],
                  }}
                  transition={{
                    scale: { type: 'spring', stiffness: 400, damping: 17 },
                    boxShadow: {
                      duration: 2,
                      repeat: Infinity,
                      ease: 'easeInOut',
                    },
                  }}
                >
                  <Play className="h-8 w-8 ml-1" fill="currentColor" />
                </motion.button>
              </div>

              {/* Video Info Overlay */}
              <motion.div
                className="absolute inset-x-0 bottom-0 p-6"
                initial={{ y: 20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ delay: 0.2, duration: 0.4 }}
              >
                <div className="flex items-end justify-between gap-4">
                  <div className="space-y-2">
                    <h3 className="text-xl font-semibold text-white">
                      {title}
                    </h3>
                    {description && (
                      <p className="text-sm text-white/70 line-clamp-2 max-w-lg">
                        {description}
                      </p>
                    )}
                  </div>
                  {duration && (
                    <div
                      className={cn(
                        'flex items-center gap-1.5',
                        'rounded-full px-3 py-1.5',
                        'bg-black/60 backdrop-blur-sm',
                        'text-sm font-medium text-white'
                      )}
                    >
                      <Clock className="h-3.5 w-3.5" />
                      <span>{duration}</span>
                    </div>
                  )}
                </div>
              </motion.div>
            </motion.div>
          ) : (
            <motion.div
              key="video"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.4 }}
              className="absolute inset-0"
            >
              <video
                ref={videoRef}
                src={videoUrl}
                className="h-full w-full object-cover"
                controls
                autoPlay
                onLoadedData={handleVideoLoaded}
                playsInline
              />

              {/* Loading state overlay */}
              {!isLoaded && (
                <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                  <motion.div
                    className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent"
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 1,
                      repeat: Infinity,
                      ease: 'linear',
                    }}
                  />
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

export default VideoShowcase;
