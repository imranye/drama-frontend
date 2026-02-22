'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { VideoPlayer } from './video-player';
import type { Episode, Story } from '@/types';

interface FeedScrollProps {
  episodes: Episode[];
  story: Story;
  userId: string;
  freeEpisodeCount: number;
  unlockedEpisodeIds?: string[];
  requireLoginForLockedEpisodes: boolean;
  currentIndex: number;
  onIndexChange: (index: number) => void;
  onUnlock: (episodeId: string) => void;
  isReady?: boolean;
}

export function FeedScroll({
  episodes,
  story,
  userId,
  freeEpisodeCount,
  unlockedEpisodeIds = [],
  requireLoginForLockedEpisodes,
  currentIndex,
  onIndexChange,
  onUnlock,
  isReady = true,
}: FeedScrollProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [touchStartY, setTouchStartY] = useState(0);

  const unlockedSet = useMemo(() => new Set(unlockedEpisodeIds), [unlockedEpisodeIds]);

  // Snap scrolling to current episode
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const targetScroll = currentIndex * window.innerHeight;
    container.scrollTo({
      top: targetScroll,
      behavior: 'smooth',
    });
  }, [currentIndex]);

  // Handle scroll snap
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    let scrollTimeout: NodeJS.Timeout;
    const handleScroll = () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        const scrollTop = container.scrollTop;
        const newIndex = Math.round(scrollTop / window.innerHeight);
        if (newIndex !== currentIndex && newIndex >= 0 && newIndex < episodes.length) {
          onIndexChange(newIndex);
        }
      }, 150);
    };

    container.addEventListener('scroll', handleScroll);
    return () => {
      container.removeEventListener('scroll', handleScroll);
      clearTimeout(scrollTimeout);
    };
  }, [currentIndex, episodes.length, onIndexChange]);

  // Touch/swipe handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    setTouchStartY(e.touches[0].clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    const touchEndY = e.changedTouches[0].clientY;
    const diff = touchStartY - touchEndY;

    // Swipe threshold
    if (Math.abs(diff) > 50) {
      if (diff > 0 && currentIndex < episodes.length - 1) {
        // Swipe up - next episode
        onIndexChange(currentIndex + 1);
      } else if (diff < 0 && currentIndex > 0) {
        // Swipe down - previous episode
        onIndexChange(currentIndex - 1);
      }
    }
  };

  const handleNext = () => {
    if (currentIndex < episodes.length - 1) {
      onIndexChange(currentIndex + 1);
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      onIndexChange(currentIndex - 1);
    }
  };

  const checkIsLocked = (episode: Episode): boolean => {
    if (episode.sequenceNumber <= freeEpisodeCount) return false;
    return !unlockedSet.has(episode.episodeId);
  };

  if (!isReady) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="text-text-secondary">Loading episodes...</div>
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="h-screen overflow-y-scroll snap-y snap-mandatory scroll-smooth"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {episodes.map((episode, index) => {
        const isActive = index === currentIndex;
        const isLocked = checkIsLocked(episode);

        return (
          <div
            key={episode.episodeId}
            className="h-screen snap-start snap-always relative"
          >
            <VideoPlayer
              episode={episode}
              storyDescription={story.description}
              userId={userId}
              isLocked={isLocked}
              isActive={isActive}
              requireLoginForLockedEpisode={requireLoginForLockedEpisodes}
              onUnlock={() => onUnlock(episode.episodeId)}
              onNext={handleNext}
              onPrevious={handlePrevious}
            />
          </div>
        );
      })}
    </div>
  );
}
