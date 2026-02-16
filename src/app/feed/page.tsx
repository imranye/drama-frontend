'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation } from '@tanstack/react-query';
import { FeedScroll } from '@/components/feed-scroll';
import { TokenBalance } from '@/components/token-balance';
import { useAuthStore } from '@/lib/store';
import { apiClient, queryKeys } from '@/lib/api';
import type { UnlockRequest } from '@/types';

export default function FeedPage() {
  const router = useRouter();
  const { isAuthenticated, user, balance, updateBalance } = useAuthStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedStoryId] = useState('story-1'); // Default story for MVP
  const [guestUserId, setGuestUserId] = useState<string | null>(null);
  const [isCreatingGuest, setIsCreatingGuest] = useState(false);
  const [guestError, setGuestError] = useState<string | null>(null);

  // Create an anonymous preview session for unauthenticated users
  useEffect(() => {
    if (isAuthenticated || guestUserId || isCreatingGuest) return;

    const createGuestSession = async () => {
      setIsCreatingGuest(true);
      setGuestError(null);

      try {
        const response = await apiClient.guest();
        apiClient.setToken(response.token);
        setGuestUserId(response.userId);
      } catch (error) {
        const message = error instanceof Error ? error.message : 'Unable to start free preview';
        setGuestError(message);
      } finally {
        setIsCreatingGuest(false);
      }
    };

    createGuestSession();
  }, [isAuthenticated, guestUserId, isCreatingGuest]);

  const playbackUserId = isAuthenticated ? user?.userId ?? null : guestUserId;
  const canLoadContent = Boolean(playbackUserId);

  // Fetch story episodes
  const { data: episodes, isLoading: loadingEpisodes } = useQuery({
    queryKey: queryKeys.episodes(selectedStoryId),
    queryFn: () => apiClient.getStoryEpisodes(selectedStoryId),
    enabled: canLoadContent,
  });

  // Fetch story details
  const { data: story } = useQuery({
    queryKey: queryKeys.story(selectedStoryId),
    queryFn: () => apiClient.getStory(selectedStoryId),
    enabled: canLoadContent,
  });

  // Unlock episode mutation
  const unlockMutation = useMutation({
    mutationFn: (episodeId: string) => {
      if (!user) throw new Error('Not authenticated');
      
      const episode = episodes?.find((e) => e.episodeId === episodeId);
      if (!episode) throw new Error('Episode not found');

      const request: UnlockRequest = {
        userId: user.userId,
        storyId: selectedStoryId,
        episodeId,
        tokensToSpend: episode.tokenCost,
      };

      return apiClient.unlockEpisode(request);
    },
    onSuccess: (data) => {
      // Update balance after successful unlock
      updateBalance(data.remainingTokens);
      
      // Optionally show success message
      console.log('Episode unlocked successfully');
    },
    onError: (error) => {
      console.error('Failed to unlock episode:', error);
      alert(error instanceof Error ? error.message : 'Failed to unlock episode');
    },
  });

  const handleUnlock = (episodeId: string) => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (!user) return;

    const episode = episodes?.find((e) => e.episodeId === episodeId);
    if (!episode) return;

    // Check if user has enough tokens
    if (balance < episode.tokenCost) {
      alert(`Not enough coins! You need ${episode.tokenCost} coins but only have ${balance}.`);
      // TODO: Show earn/purchase coins modal
      return;
    }

    // Confirm unlock
    if (window.confirm(`Unlock this episode for ${episode.tokenCost} coins?`)) {
      unlockMutation.mutate(episodeId);
    }
  };

  if (guestError) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <p className="text-text-secondary">{guestError}</p>
          <button onClick={() => router.push('/login')} className="btn-primary">
            Sign in
          </button>
        </div>
      </div>
    );
  }

  if (!canLoadContent || loadingEpisodes) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!episodes || episodes.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4">
        <div className="text-center space-y-4">
          <p className="text-text-secondary">No episodes available</p>
          <button onClick={() => router.push('/')} className="btn-primary">
            Go Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {isAuthenticated && <TokenBalance />}
      
      <FeedScroll
        episodes={episodes}
        story={story || { storyId: selectedStoryId, title: 'Loading...', description: '', thumbnailUrl: '', episodeCount: episodes.length, totalDuration: 0, genres: [], trending: false }}
        userId={playbackUserId!}
        freeEpisodeCount={isAuthenticated ? 5 : 1}
        requireLoginForLockedEpisodes={!isAuthenticated}
        currentIndex={currentIndex}
        onIndexChange={setCurrentIndex}
        onUnlock={handleUnlock}
      />
    </div>
  );
}
