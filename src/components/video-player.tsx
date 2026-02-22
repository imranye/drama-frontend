'use client';

import { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { Episode } from '@/types';
import { useVideoPlayerStore } from '@/lib/store';
import { apiClient } from '@/lib/api';

interface VideoPlayerProps {
  episode: Episode;
  storyDescription?: string;
  userId: string;
  isLocked: boolean;
  isActive: boolean;
  requireLoginForLockedEpisode: boolean;
  onUnlock: () => void;
  onNext: () => void;
  onPrevious: () => void;
}

export function VideoPlayer({
  episode,
  storyDescription,
  userId,
  isLocked,
  isActive,
  requireLoginForLockedEpisode,
  onUnlock,
  onNext,
  onPrevious,
}: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [showControls, setShowControls] = useState(true);
  const [videoUrl, setVideoUrl] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  const {
    isPlaying,
    isMuted,
    currentTime,
    duration,
    isBuffering,
    setPlaying,
    setMuted,
    setCurrentTime,
    setDuration,
    setBuffering,
  } = useVideoPlayerStore();

  // Fetch video URL with retry for guest auth timing
  useEffect(() => {
    if (!isLocked && episode.episodeId) {
      const fetchWithRetry = async (retries = 3) => {
        setIsLoading(true);
        setError(null);
        
        try {
          const response = await apiClient.getPlaybackUrl(episode.episodeId, userId);
          setVideoUrl(response.videoUrl);
          setIsLoading(false);
        } catch (err: any) {
          // Retry on 401 (token might not be ready yet)
          if (err.message?.includes('401') && retries > 0) {
            setTimeout(() => fetchWithRetry(retries - 1), 500);
          } else {
            setError(err.message);
            setIsLoading(false);
          }
        }
      };
      
      fetchWithRetry();
    }
  }, [episode.episodeId, userId, isLocked]);

  // Video event handlers
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleTimeUpdate = () => setCurrentTime(video.currentTime);
    const handleDurationChange = () => setDuration(video.duration);
    const handlePlay = () => setPlaying(true);
    const handlePause = () => setPlaying(false);
    const handleWaiting = () => setBuffering(true);
    const handleCanPlay = () => setBuffering(false);
    const handleEnded = () => {
      setPlaying(false);
      // Auto-advance to next episode
      setTimeout(() => onNext(), 1000);
    };

    video.addEventListener('timeupdate', handleTimeUpdate);
    video.addEventListener('durationchange', handleDurationChange);
    video.addEventListener('play', handlePlay);
    video.addEventListener('pause', handlePause);
    video.addEventListener('waiting', handleWaiting);
    video.addEventListener('canplay', handleCanPlay);
    video.addEventListener('ended', handleEnded);

    return () => {
      video.removeEventListener('timeupdate', handleTimeUpdate);
      video.removeEventListener('durationchange', handleDurationChange);
      video.removeEventListener('play', handlePlay);
      video.removeEventListener('pause', handlePause);
      video.removeEventListener('waiting', handleWaiting);
      video.removeEventListener('canplay', handleCanPlay);
      video.removeEventListener('ended', handleEnded);
    };
  }, [onNext, setPlaying, setCurrentTime, setDuration, setBuffering]);

  // Handle mute state
  useEffect(() => {
    if (videoRef.current) {
      videoRef.current.muted = isMuted;
    }
  }, [isMuted]);

  // Handle play/pause
  useEffect(() => {
    if (!videoRef.current || isLocked) return;

    if (isPlaying && isActive) {
      videoRef.current.play().catch((err) => {
        console.error('Failed to play video:', err);
        setPlaying(false);
      });
    } else {
      videoRef.current.pause();
    }
  }, [isPlaying, isActive, isLocked, setPlaying]);

  // Auto-hide controls
  useEffect(() => {
    if (!showControls) return;

    const timer = setTimeout(() => {
      setShowControls(false);
    }, 3000);

    return () => clearTimeout(timer);
  }, [showControls]);

  const togglePlayPause = () => {
    if (isLocked) {
      onUnlock();
    } else {
      setPlaying(!isPlaying);
    }
  };

  const toggleMute = () => {
    setMuted(!isMuted);
  };

  const handleSeek = (time: number) => {
    if (videoRef.current && !isLocked) {
      videoRef.current.currentTime = time;
      setCurrentTime(time);
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div 
      className="relative w-full h-full bg-black"
      onClick={() => setShowControls(true)}
    >
      {/* Video Element */}
      {videoUrl && !isLocked && (
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          src={videoUrl}
          playsInline
          preload="auto"
        />
      )}

      {/* Thumbnail for locked episodes */}
      {isLocked && episode.thumbnailUrl && (
        <div className="w-full h-full flex items-center justify-center bg-gradient-to-b from-black/50 to-black">
          <img
            src={episode.thumbnailUrl}
            alt={episode.title}
            className="w-full h-full object-cover opacity-40"
          />
        </div>
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80">
          <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-8">
          <div className="text-center">
            <p className="text-red-500 mb-4">Failed to load video</p>
            <p className="text-sm text-gray-400">{error}</p>
          </div>
        </div>
      )}

      {/* Buffering Indicator */}
      <AnimatePresence>
        {isBuffering && !isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center bg-black/20"
          >
            <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white"></div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Lock Overlay */}
      {isLocked && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-t from-black/90 via-black/50 to-transparent p-8"
        >
          <div className="text-center space-y-6 max-w-md">
            {/* Lock Icon */}
            <div className="w-16 h-16 mx-auto bg-white/10 rounded-full flex items-center justify-center backdrop-blur-sm">
              <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>

            {/* Title */}
            <div>
              <h3 className="text-2xl font-bold text-white mb-2">
                {episode.title}
              </h3>
              {storyDescription && (
                <p className="text-sm text-gray-300 line-clamp-3">
                  {storyDescription}
                </p>
              )}
            </div>

            {/* Unlock Button */}
            <button
              onClick={onUnlock}
              className="px-8 py-4 bg-gradient-to-r from-purple-600 to-pink-600 text-white font-semibold rounded-full hover:from-purple-700 hover:to-pink-700 transition-all transform hover:scale-105 shadow-lg"
            >
              {requireLoginForLockedEpisode ? 'Sign In to Watch' : `Unlock for ${episode.unlockCost} coins`}
            </button>
          </div>
        </motion.div>
      )}

      {/* Controls Overlay */}
      <AnimatePresence>
        {showControls && !isLocked && !isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-black/40"
          >
            {/* Top Bar */}
            <div className="absolute top-0 left-0 right-0 p-6">
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-xl font-bold text-white mb-1">
                    {episode.title}
                  </h2>
                  {storyDescription && (
                    <p className="text-sm text-gray-300 line-clamp-2 max-w-md">
                      {storyDescription}
                    </p>
                  )}
                </div>
                <button
                  onClick={toggleMute}
                  className="p-3 bg-black/30 rounded-full backdrop-blur-sm hover:bg-black/50 transition-colors"
                >
                  {isMuted ? (
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            {/* Center Play/Pause */}
            <div className="absolute inset-0 flex items-center justify-center">
              <button
                onClick={togglePlayPause}
                className="p-6 bg-black/30 rounded-full backdrop-blur-sm hover:bg-black/50 transition-all transform hover:scale-110"
              >
                {isPlaying ? (
                  <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                  </svg>
                ) : (
                  <svg className="w-12 h-12 text-white" fill="currentColor" viewBox="0 0 24 24">
                    <path d="M8 5v14l11-7z" />
                  </svg>
                )}
              </button>
            </div>

            {/* Bottom Bar with Progress */}
            <div className="absolute bottom-0 left-0 right-0 p-6">
              <div className="space-y-4">
                {/* Progress Bar */}
                <div className="relative">
                  <input
                    type="range"
                    min={0}
                    max={duration || 0}
                    value={currentTime}
                    onChange={(e) => handleSeek(parseFloat(e.target.value))}
                    className="w-full h-1 bg-white/30 rounded-lg appearance-none cursor-pointer"
                    style={{
                      background: `linear-gradient(to right, white 0%, white ${(currentTime / (duration || 1)) * 100}%, rgba(255,255,255,0.3) ${(currentTime / (duration || 1)) * 100}%, rgba(255,255,255,0.3) 100%)`
                    }}
                  />
                  <div className="flex justify-between text-xs text-white/80 mt-1">
                    <span>{formatTime(currentTime)}</span>
                    <span>{formatTime(duration)}</span>
                  </div>
                </div>

                {/* Navigation Buttons */}
                <div className="flex items-center justify-between">
                  <button
                    onClick={onPrevious}
                    className="px-4 py-2 bg-black/30 rounded-full backdrop-blur-sm hover:bg-black/50 transition-colors text-white text-sm font-medium"
                  >
                    Previous
                  </button>
                  <button
                    onClick={onNext}
                    className="px-4 py-2 bg-black/30 rounded-full backdrop-blur-sm hover:bg-black/50 transition-colors text-white text-sm font-medium"
                  >
                    Next
                  </button>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
