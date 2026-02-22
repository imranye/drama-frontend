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

  // Auto-play when active
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !isActive) return;

    if (isPlaying) {
      video.play().catch(() => {
        // Auto-play was prevented, mute and try again
        setMuted(true);
        video.muted = true;
        video.play().catch(console.error);
      });
    } else {
      video.pause();
    }
  }, [isPlaying, isActive, setMuted]);

  // Sync mute state
  useEffect(() => {
    const video = videoRef.current;
    if (video) {
      video.muted = isMuted;
    }
  }, [isMuted]);

  const togglePlay = () => {
    if (isLocked) {
      onUnlock();
    } else {
      setPlaying(!isPlaying);
    }
  };

  const toggleMute = () => setMuted(!isMuted);

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const video = videoRef.current;
    if (!video) return;
    
    const newTime = parseFloat(e.target.value);
    video.currentTime = newTime;
    setCurrentTime(newTime);
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="relative w-full h-full bg-black">
      {/* Video Element */}
      {!isLocked && videoUrl && (
        <video
          ref={videoRef}
          src={videoUrl}
          className="w-full h-full object-cover"
          playsInline
          loop={false}
        />
      )}

      {/* Loading State */}
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-white text-center px-4">
            <p className="text-lg mb-2">Failed to load video</p>
            <p className="text-sm text-white/60">{error}</p>
          </div>
        </div>
      )}

      {/* Locked Overlay */}
      {isLocked && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-b from-black/80 to-black/60 backdrop-blur-sm">
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="text-center px-8"
          >
            <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center">
              <svg className="w-10 h-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
              </svg>
            </div>
            
            <h3 className="text-2xl font-bold text-white mb-3">
              Episode {episode.sequenceNumber}
            </h3>
            <p className="text-white/80 mb-6 max-w-sm">
              {requireLoginForLockedEpisode 
                ? 'Sign in to unlock this episode'
                : 'Unlock to continue watching'
              }
            </p>
            
            <motion.button
              whileTap={{ scale: 0.95 }}
              onClick={onUnlock}
              className="px-8 py-4 bg-white text-black rounded-full font-semibold text-lg shadow-xl hover:bg-white/90 transition-colors"
            >
              {requireLoginForLockedEpisode ? 'Sign In' : 'Unlock Now'}
            </motion.button>
          </motion.div>
        </div>
      )}

      {/* Buffering Indicator */}
      <AnimatePresence>
        {isBuffering && !isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <div className="w-12 h-12 border-4 border-white/20 border-t-white rounded-full animate-spin" />
          </motion.div>
        )}
      </AnimatePresence>

      {/* Tap to Play/Pause */}
      <button
        onClick={togglePlay}
        className="absolute inset-0 w-full h-full focus:outline-none"
        aria-label={isPlaying ? 'Pause' : 'Play'}
      />

      {/* Controls Overlay */}
      <AnimatePresence>
        {showControls && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-6 pointer-events-none"
          >
            {/* Story Info */}
            {storyDescription && (
              <div className="mb-4 pointer-events-auto">
                <p className="text-white text-sm line-clamp-2">
                  {storyDescription}
                </p>
              </div>
            )}

            {/* Progress Bar */}
            {!isLocked && (
              <div className="mb-4 pointer-events-auto">
                <input
                  type="range"
                  min="0"
                  max={duration || 0}
                  value={currentTime}
                  onChange={handleSeek}
                  className="w-full h-1 bg-white/20 rounded-lg appearance-none cursor-pointer [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-3 [&::-webkit-slider-thumb]:h-3 [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white"
                />
                <div className="flex justify-between text-white/60 text-xs mt-1">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>
            )}

            {/* Control Buttons */}
            <div className="flex items-center justify-between pointer-events-auto">
              <div className="flex items-center gap-4">
                <button
                  onClick={togglePlay}
                  className="w-12 h-12 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center hover:bg-white/20 transition-colors"
                  aria-label={isPlaying ? 'Pause' : 'Play'}
                >
                  {isPlaying ? (
                    <svg className="w-6 h-6 text-white" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
                    </svg>
                  ) : (
                    <svg className="w-6 h-6 text-white ml-1" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M8 5v14l11-7z" />
                    </svg>
                  )}
                </button>

                <button
                  onClick={toggleMute}
                  className="w-10 h-10 rounded-full bg-white/10 backdrop-blur-md flex items-center justify-center hover:bg-white/20 transition-colors"
                  aria-label={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? (
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
                    </svg>
                  ) : (
                    <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                    </svg>
                  )}
                </button>
              </div>

              {/* Episode Number */}
              <div className="text-white font-semibold">
                EP {episode.sequenceNumber}
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Navigation Buttons */}
      <div className="absolute inset-y-0 left-0 right-0 flex items-center justify-between px-4 pointer-events-none">
        <button
          onClick={onPrevious}
          className="w-12 h-12 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center hover:bg-black/40 transition-colors pointer-events-auto"
          aria-label="Previous episode"
        >
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>

        <button
          onClick={onNext}
          className="w-12 h-12 rounded-full bg-black/20 backdrop-blur-md flex items-center justify-center hover:bg-black/40 transition-colors pointer-events-auto"
          aria-label="Next episode"
        >
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
