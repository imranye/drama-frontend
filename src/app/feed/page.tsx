'use client';

import { useEffect, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { FeedScroll } from '@/components/feed-scroll';
import { TokenBalance } from '@/components/token-balance';
import { BuyCoinsModal } from '@/components/buy-coins-modal';
import { useAuthStore } from '@/lib/store';
import { apiClient, queryKeys } from '@/lib/api';
import type { UnlockRequest } from '@/types';

export default function FeedPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated, user, balance, updateBalance } = useAuthStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);
  const [optimisticUnlocked, setOptimisticUnlocked] = useState<Set<string>>(() => new Set());
  const [buyModalOpen, setBuyModalOpen] = useState(false);
  const [pendingUnlockEpisodeId, setPendingUnlockEpisodeId] = useState<string | null>(null);

  // Public preview: we don't require a guest JWT for episode 1.
  const playbackUserId = user?.userId ?? 'public';

  // Load the first available story.
  const { data: content } = useQuery({
    queryKey: queryKeys.content('trending', 0),
    queryFn: () => apiClient.getContent('trending', 20, 0),
  });

  useEffect(() => {
    if (selectedStoryId) return;
    const first = content?.stories?.[0]?.storyId;
    if (first) setSelectedStoryId(first);
  }, [content?.stories, selectedStoryId]);

  // Fetch story episodes
  const { data: episodes, isLoading: loadingEpisodes } = useQuery({
    queryKey: queryKeys.episodes(selectedStoryId || 'none'),
    queryFn: () => apiClient.getStoryEpisodes(selectedStoryId!),
    enabled: Boolean(selectedStoryId),
  });

  // Fetch story details
  const { data: story } = useQuery({
    queryKey: queryKeys.story(selectedStoryId || 'none'),
    queryFn: () => apiClient.getStory(selectedStoryId!),
    enabled: Boolean(selectedStoryId),
  });

  // Fetch narrative (unlocked episodes). Backend will auto-init if missing.
  const { data: narrative } = useQuery({
    queryKey: queryKeys.narrative(selectedStoryId || 'none'),
    queryFn: () => apiClient.getNarrativeState(selectedStoryId!),
    enabled: isAuthenticated && Boolean(selectedStoryId),
  });

  const unlockedEpisodeIds = useMemo(() => {
    const ids = new Set<string>(narrative?.unlockedEpisodes ?? []);
    for (const id of optimisticUnlocked) ids.add(id);
    return Array.from(ids);
  }, [narrative?.unlockedEpisodes, optimisticUnlocked]);

  // Unlock episode mutation
  const unlockMutation = useMutation({
    mutationFn: (episodeId: string) => {
      if (!user) throw new Error('Not authenticated');
      
      const episode = episodes?.find((e) => e.episodeId === episodeId);
      if (!episode) throw new Error('Episode not found');

      const request: UnlockRequest = {
        userId: user.userId,
        storyId: selectedStoryId!,
        episodeId,
        tokensToSpend: episode.tokenCost,
      };

      return apiClient.unlockEpisode(request);
    },
    onSuccess: (data) => {
      // Update balance after successful unlock
      if (typeof data.remainingTokens === 'number') {
        updateBalance(data.remainingTokens);
      }

      setOptimisticUnlocked((prev) => {
        const next = new Set(prev);
        next.add(data.episodeId);
        return next;
      });

      if (selectedStoryId) {
        queryClient.invalidateQueries({ queryKey: queryKeys.narrative(selectedStoryId) });
      }
      
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
      setPendingUnlockEpisodeId(episodeId);
      setBuyModalOpen(true);
      return;
    }

    // Confirm unlock
    if (window.confirm(`Unlock this episode for ${episode.tokenCost} coins?`)) {
      unlockMutation.mutate(episodeId);
    }
  };

  if (loadingEpisodes) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-none animate-spin" />
      </div>
    );
  }

  if (!selectedStoryId) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-none animate-spin" />
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

      <BuyCoinsModal
        open={buyModalOpen}
        onClose={() => {
          setBuyModalOpen(false);
          setPendingUnlockEpisodeId(null);
        }}
        onPurchased={(newBalance) => {
          updateBalance(newBalance);
          setBuyModalOpen(false);

          const toUnlock = pendingUnlockEpisodeId;
          setPendingUnlockEpisodeId(null);

          if (toUnlock && !unlockMutation.isPending) {
            unlockMutation.mutate(toUnlock);
          }
        }}
      />
      
      <FeedScroll
        episodes={episodes}
        story={story || { storyId: selectedStoryId, title: 'Loading...', description: '', thumbnailUrl: '', episodeCount: episodes.length, totalDuration: 0, genres: [], trending: false }}
        userId={playbackUserId}
        freeEpisodeCount={3}
        unlockedEpisodeIds={unlockedEpisodeIds}
        requireLoginForLockedEpisodes={!isAuthenticated}
        currentIndex={currentIndex}
        onIndexChange={setCurrentIndex}
        onUnlock={handleUnlock}
        isReady={true}
      />
    </div>
  );
}
