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
        cost: episode.unlockCost,
      };
      return apiClient.unlockEpisode(request);
    },
    onMutate: async (episodeId) => {
      // Optimistic update
      setOptimisticUnlocked((prev) => new Set(prev).add(episodeId));
      
      // Update balance optimistically
      const episode = episodes?.find((e) => e.episodeId === episodeId);
      if (episode && balance !== null) {
        updateBalance(balance - episode.unlockCost);
      }
    },
    onSuccess: (data) => {
      // Update server balance
      updateBalance(data.remainingBalance);
      
      // Refetch narrative to get server state
      queryClient.invalidateQueries({ queryKey: queryKeys.narrative(selectedStoryId!) });
    },
    onError: (error: any, episodeId) => {
      // Revert optimistic update
      setOptimisticUnlocked((prev) => {
        const next = new Set(prev);
        next.delete(episodeId);
        return next;
      });
      
      // Refetch balance to get accurate state
      queryClient.invalidateQueries({ queryKey: queryKeys.balance() });
      
      if (error.message?.includes('Insufficient')) {
        setPendingUnlockEpisodeId(episodeId);
        setBuyModalOpen(true);
      }
    },
  });

  const handleUnlock = () => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    const currentEpisode = episodes?.[currentIndex];
    if (!currentEpisode) return;

    unlockMutation.mutate(currentEpisode.episodeId);
  };

  const handlePurchaseComplete = () => {
    setBuyModalOpen(false);
    
    // Retry the pending unlock if any
    if (pendingUnlockEpisodeId) {
      unlockMutation.mutate(pendingUnlockEpisodeId);
      setPendingUnlockEpisodeId(null);
    }
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-black">
      {/* Token Balance (top-right) */}
      {isAuthenticated && (
        <div className="absolute top-4 right-4 z-50">
          <TokenBalance 
            balance={balance ?? 0}
            onBuyCoins={() => setBuyModalOpen(true)}
          />
        </div>
      )}

      {/* Feed Scroll */}
      <FeedScroll
        episodes={episodes || []}
        story={story}
        userId={playbackUserId}
        freeEpisodeCount={3}
        unlockedEpisodeIds={unlockedEpisodeIds}
        requireLoginForLockedEpisodes={!isAuthenticated}
        onUnlock={handleUnlock}
        currentIndex={currentIndex}
        onIndexChange={setCurrentIndex}
        isReady={!loadingEpisodes}
      />

      {/* Buy Coins Modal */}
      <BuyCoinsModal
        open={buyModalOpen}
        onClose={() => setBuyModalOpen(false)}
        onPurchaseComplete={handlePurchaseComplete}
      />
    </div>
  );
}
