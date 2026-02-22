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
        storyId: selectedStoryId!,
        episodeId,
        unlockCost: episode.unlockCost,
      };
      return apiClient.unlockEpisode(request);
    },
    onMutate: async (episodeId: string) => {
      setOptimisticUnlocked((prev) => new Set(prev).add(episodeId));
    },
    onSuccess: (data) => {
      updateBalance(data.newBalance);
      queryClient.invalidateQueries({ queryKey: queryKeys.narrative(selectedStoryId || 'none') });
    },
    onError: (error: any, episodeId: string) => {
      setOptimisticUnlocked((prev) => {
        const next = new Set(prev);
        next.delete(episodeId);
        return next;
      });

      if (error?.response?.status === 402 || error?.message?.includes('Insufficient')) {
        setPendingUnlockEpisodeId(episodeId);
        setBuyModalOpen(true);
      }
    },
  });

  const handleUnlock = async (episodeId: string) => {
    if (!isAuthenticated) {
      router.push('/auth/login');
      return;
    }

    try {
      await unlockMutation.mutateAsync(episodeId);
    } catch (error) {
      console.error('Failed to unlock episode:', error);
    }
  };

  if (!selectedStoryId || loadingEpisodes) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="text-muted-foreground">Loading feed...</div>
      </div>
    );
  }

  return (
    <>
      <div className="h-screen w-full overflow-hidden relative">
        {/* Token balance overlay */}
        {isAuthenticated && (
          <div className="absolute top-6 right-6 z-10">
            <TokenBalance
              balance={balance}
              onClick={() => setBuyModalOpen(true)}
            />
          </div>
        )}

        {/* Episode feed */}
        <FeedScroll
          episodes={episodes || []}
          story={story}
          userId={playbackUserId}
          freeEpisodeCount={3}
          requireLoginForLockedEpisodes={!isAuthenticated}
          currentIndex={currentIndex}
          onIndexChange={setCurrentIndex}
          unlockedEpisodeIds={unlockedEpisodeIds}
          onUnlock={handleUnlock}
        />
      </div>

      <BuyCoinsModal
        open={buyModalOpen}
        onOpenChange={setBuyModalOpen}
        onSuccess={(newBalance) => {
          updateBalance(newBalance);
          if (pendingUnlockEpisodeId) {
            handleUnlock(pendingUnlockEpisodeId);
            setPendingUnlockEpisodeId(null);
          }
        }}
      />
    </>
  );
}
