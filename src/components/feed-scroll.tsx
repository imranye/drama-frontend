'use client';

import { useEffect, useRef, useState } from 'react';
import { VideoPlayer } from './video-player';
import type { Episode, Story } from '@/types';
import { useAuthStore } from '@/lib/store';

interface FeedScrollProps {
  episodes: Episode[];
  story: Story;
  currentIndex: number;
  onIndexChange: (index: number) => void;
  onUnlock: (episodeId: string) => void;
}

export function FeedScroll({
  episodes,
  story,
  currentIndex,
  onIndexChange,
  onUnlock,
}: FeedScrollProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [touchStartY, setTouchStartY] = useState(0);
  const { user } = useAuthStore();

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
    // Episodes 1-5 are free (demo/hook period)
    if (episode.sequenceNumber <= 5) return false;
    
    // Check if episode is unlocked (this would come from narrative state in real implementation)
    // For now, all episodes after 5 are locked
    return true;
  };

  if (!user) return null;

  return (
    <div
      ref={containerRef}
      className="h-screen overflow-y-scroll snap-container hide-scrollbar"
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
    >
      {episodes.map((episode, index) => (
        <div
          key={episode.episodeId}
          className="snap-item h-screen"
          style={{ scrollSnapAlign: 'start' }}
        >
          <VideoPlayer
            episode={episode}
            userId={user.userId}
            isLocked={checkIsLocked(episode)}
            onUnlock={() => onUnlock(episode.episodeId)}
            onNext={handleNext}
            onPrevious={handlePrevious}
          />
        </div>
      ))}

      {/* End of content indicator */}
      {currentIndex === episodes.length - 1 && (
        <div className="absolute bottom-20 inset-x-0 text-center">
          <p className="text-text-secondary text-sm">
            You've reached the end
          </p>
        </div>
      )}
    </div>
  );
}
