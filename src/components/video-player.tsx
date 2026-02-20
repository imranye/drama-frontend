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

  // Auto-hide controls
  useEffect(() => {
    if (!showControls) return;
    
    const timeout = setTimeout(() => {
      if (isPlaying) setShowControls(false);
    }, 3000);

    return () => clearTimeout(timeout);
  }, [showControls, isPlaying]);

  const togglePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;

    if (isPlaying) {
      video.pause();
    } else {
      video.play();
    }
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;

    video.muted = !isMuted;
    setMuted(!isMuted);
  };

  const handleVideoClick = () => {
    setShowControls(true);
    if (!isLocked) {
      togglePlayPause();
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const truncate = (text: string, max = 140) => {
    const trimmed = text.trim();
    if (trimmed.length <= max) return trimmed;
    return `${trimmed.slice(0, max).trimEnd()}…`;
  };

  const previewTextRaw =
    episode.previewText ||
    episode.description ||
    episode.transcript ||
    episode.script ||
    storyDescription ||
    '';
  const previewText = previewTextRaw ? truncate(previewTextRaw, 140) : '';

  if (isLocked) {
    return (
      <div className="relative w-full h-screen flex items-center justify-center bg-black">
        {/* Blurred background */}
        {episode.thumbnailUrl && (
          <div
            className="absolute inset-0 bg-cover bg-center blur-xl opacity-30"
            style={{ backgroundImage: `url(${episode.thumbnailUrl})` }}
          />
        )}

        {/* Lock overlay */}
        <div className="relative z-10 text-center space-y-6 px-6">
          <div className="w-20 h-20 mx-auto rounded-none bg-surface-light flex items-center justify-center">
            <svg
              className="w-10 h-10 text-text-secondary"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
              />
            </svg>
          </div>

          <div className="space-y-2">
            <h3 className="text-xl font-bold">{episode.title}</h3>
            <p className="text-text-secondary">Episode {episode.sequenceNumber}</p>
            {previewText && (
              <p className="text-sm text-text-secondary">{previewText}</p>
            )}
          </div>

          <button onClick={onUnlock} className="btn-primary">
            {requireLoginForLockedEpisode ? 'Sign in to continue' : `Unlock with ${episode.tokenCost} coins`}
          </button>

          <p className="text-sm text-text-secondary">
            {requireLoginForLockedEpisode ? 'Create an account to keep watching' : 'Watch ads to earn coins'}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="relative w-full h-screen bg-black">
      {/* Video Element */}
      <video
        ref={videoRef}
        src={videoUrl || undefined}
        className="w-full h-full object-contain"
        playsInline
        autoPlay
        muted={isMuted}
        onClick={handleVideoClick}
      />

      {/* Loading State */}
      {(isLoading || isBuffering) && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/50">
          <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-none animate-spin" />
        </div>
      )}

      {/* Error State */}
      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/80 p-6">
          <div className="text-center space-y-4">
            <p className="text-red-500">{error}</p>
            <button onClick={onNext} className="btn-secondary">
              Skip to Next
            </button>
          </div>
        </div>
      )}

      {/* Controls Overlay */}
      <AnimatePresence>
        {showControls && !isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 pointer-events-none"
          >
            {/* Top Bar */}
            <div className="absolute top-0 inset-x-0 p-4 bg-gradient-to-b from-black/80 to-transparent">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  <h3 className="font-semibold text-lg">{episode.title}</h3>
                  <p className="text-sm text-text-secondary">
                    Episode {episode.sequenceNumber}
                  </p>
                  {previewText && (
                    <p className="text-xs text-text-secondary mt-1">{previewText}</p>
                  )}
                </div>
                <button className="pointer-events-auto p-2">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Bottom Bar */}
            <div className="absolute bottom-0 inset-x-0 p-4 video-overlay">
              {/* Progress Bar */}
              <div className="mb-4">
                <div className="h-1 bg-white/20 rounded-none overflow-hidden">
                  <div
                    className="h-full bg-accent transition-all duration-200"
                    style={{ width: `${(currentTime / duration) * 100}%` }}
                  />
                </div>
                <div className="flex justify-between text-xs text-text-secondary mt-1">
                  <span>{formatTime(currentTime)}</span>
                  <span>{formatTime(duration)}</span>
                </div>
              </div>

              {/* Controls */}
              <div className="flex items-center justify-between">
                <button
                  onClick={toggleMute}
                  className="pointer-events-auto p-2"
                >
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    {isMuted ? (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2"
                      />
                    ) : (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"
                      />
                    )}
                  </svg>
                </button>

                <button
                  onClick={togglePlayPause}
                  className="pointer-events-auto p-3 bg-white/10 rounded-none"
                >
                  <svg
                    className="w-8 h-8"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    {isPlaying ? (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M10 9v6m4-6v6"
                      />
                    ) : (
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z"
                      />
                    )}
                  </svg>
                </button>

                <button className="pointer-events-auto p-2">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z"
                    />
                  </svg>
                </button>
              </div>
            </div>

            {/* Right Side Actions */}
            <div className="absolute right-4 bottom-32 space-y-6">
              <button className="pointer-events-auto flex flex-col items-center space-y-1">
                <div className="w-12 h-12 rounded-none bg-white/10 flex items-center justify-center">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z"
                    />
                  </svg>
                </div>
                <span className="text-xs">125</span>
              </button>

              <button className="pointer-events-auto flex flex-col items-center space-y-1">
                <div className="w-12 h-12 rounded-none bg-white/10 flex items-center justify-center">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z"
                    />
                  </svg>
                </div>
                <span className="text-xs">48</span>
              </button>

              <button className="pointer-events-auto flex flex-col items-center space-y-1">
                <div className="w-12 h-12 rounded-none bg-white/10 flex items-center justify-center">
                  <svg
                    className="w-6 h-6"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M5 5a2 2 0 012-2h10a2 2 0 012 2v16l-7-3.5L5 21V5z"
                    />
                  </svg>
                </div>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
