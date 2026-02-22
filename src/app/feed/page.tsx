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

// ── Skeleton ────────────────────────────────────────────────────────────────
function FeedSkeleton() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-black">
      <div className="w-16 h-16 rounded-full bg-surface animate-pulse" />
      <div className="space-y-3 text-center">
        <div className="w-40 h-4 bg-surface rounded animate-pulse mx-auto" />
        <div className="w-24 h-3 bg-surface rounded animate-pulse mx-auto" />
      </div>
    </div>
  );
}

// ── Error screen ─────────────────────────────────────────────────────────────
function FeedError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-6 p-6 text-center bg-black">
      <p className="text-error text-lg font-semibold">Something went wrong</p>
      <p className="text-text-secondary text-sm">{message}</p>
      <button onClick={onRetry} className="btn-primary px-8">
        Try Again
      </button>
    </div>
  );
}

// ── Page ─────────────────────────────────────────────────────────────────────
export default function FeedPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const { isAuthenticated, user, balance, updateBalance } = useAuthStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedStoryId, setSelectedStoryId] = useState<string | null>(null);
  const [optimisticUnlocked, setOptimisticUnlocked] = useState<Set<string>>(() => new Set());
  const [buyModalOpen, setBuyModalOpen] = useState(false);
  const [pendingUnlockEpisodeId, setPendingUnlockEpisodeId] = useState<string | null>(null);

  // Public preview: guests use 'public' as userId
  const playbackUserId = user?.userId ?? 'public';

  // Load trending content
  const {
    data: content,
    isLoading: loadingContent,
    isError: contentError,
    error: contentErrorMsg,
    refetch: refetchContent,
  } = useQuery({
    queryKey: queryKeys.content('trending', 0),
    queryFn: () => apiClient.getContent('trending', 20, 0),
    retry: 2,
    staleTime: 60_000,
  });

  useEffect(() => {
    if (selectedStoryId) return;
    const first = content?.stories?.[0]?.storyId;
    if (first) setSelectedStoryId(first);
  }, [content?.stories, selectedStoryId]);

  // Fetch episodes
  const {
    data: episodes,
    isLoading: loadingEpisodes,
    isError: episodesError,
    error: episodesErrorMsg,
    refetch: refetchEpisodes,
  } = useQuery({
    queryKey: queryKeys.episodes(selectedStoryId || 'none'),
    queryFn: () => apiClient.getStoryEpisodes(selectedStoryId!),
    enabled: Boolean(selectedStoryId),
    retry: 2,
    staleTime: 60_000,
  });

  // Fetch story details
  const { data: story } = useQuery({
    queryKey: queryKeys.story(selectedStoryId || 'none'),
    queryFn: () => apiClient.getStory(selectedStoryId!),
    enabled: Boolean(selectedStoryId),
    retry: 2,
    staleTime: 60_000,
  });

  // Narrative — ONLY for authenticated users
  const { data: narrative } = useQuery({
    queryKey: queryKeys.narrative(selectedStoryId || 'none'),
    queryFn: () => apiClient.getNarrativeState(selectedStoryId!),
    enabled: isAuthenticated && Boolean(selectedStoryId),
    retry: 1,
    staleTime: 30_000,
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
        cost: episode.unlockCost || 0,
      };
      return apiClient.unlockEpisode(request);
    },
    onMutate: async (episodeId) => {
      setOptimisticUnlocked((prev) => new Set([...prev, episodeId]));
      setPendingUnlockEpisodeId(null);
    },
    onSuccess: (data) => {
      updateBalance(data.newBalance);
      queryClient.invalidateQueries({ queryKey: queryKeys.narrative(selectedStoryId!) });
      queryClient.invalidateQueries({ queryKey: queryKeys.balance() });
    },
    onError: (error: any, episodeId) => {
      setOptimisticUnlocked((prev) => {
        const next = new Set(prev);
        next.delete(episodeId);
        return next;
      });
      if (error.message?.includes('Insufficient')) {
        setPendingUnlockEpisodeId(episodeId);
        setBuyModalOpen(true);
      } else {
        alert(`Failed to unlock: ${error.message}`);
      }
    },
  });

  const handleUnlock = (episodeId: string) => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }
    unlockMutation.mutate(episodeId);
  };

  const handlePurchaseSuccess = () => {
    setBuyModalOpen(false);
    if (pendingUnlockEpisodeId) {
      unlockMutation.mutate(pendingUnlockEpisodeId);
    }
  };

  // ── Loading state ──────────────────────────────────────────────────────────
  if (loadingContent || (selectedStoryId && loadingEpisodes)) {
    return <FeedSkeleton />;
  }

  // ── Error state ────────────────────────────────────────────────────────────
  if (contentError) {
    return (
      <FeedError
        message={(contentErrorMsg as Error)?.message ?? 'Could not load content.'}
        onRetry={() => refetchContent()}
      />
    );
  }

  if (episodesError) {
    return (
      <FeedError
        message={(episodesErrorMsg as Error)?.message ?? 'Could not load episodes.'}
        onRetry={() => refetchEpisodes()}
      />
    );
  }

  // No content yet (backend empty)
  if (!selectedStoryId || !episodes || episodes.length === 0) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center bg-black">
        <p className="text-text-secondary text-lg">No episodes available yet.</p>
        <p className="text-text-disabled text-sm">Check back soon — new content drops daily.</p>
      </div>
    );
  }

  // ── Main feed ─────────────────────────────────────────────────────────────
  return (
    <div className="relative w-full h-screen overflow-hidden">
      {isAuthenticated && (
        <div className="absolute top-4 right-4 z-50">
          <TokenBalance balance={balance} onBuyCoins={() => setBuyModalOpen(true)} />
        </div>
      )}

      <FeedScroll
        episodes={episodes}
        story={story!}
        userId={playbackUserId}
        freeEpisodeCount={story?.freeEpisodeCount ?? 1}
        unlockedEpisodeIds={unlockedEpisodeIds}
        requireLoginForLockedEpisodes={!isAuthenticated}
        currentIndex={currentIndex}
        onIndexChange={setCurrentIndex}
        onUnlock={handleUnlock}
        isReady={!loadingEpisodes}
      />

      {buyModalOpen && (
        <BuyCoinsModal
          isOpen={buyModalOpen}
          onClose={() => setBuyModalOpen(false)}
          onSuccess={handlePurchaseSuccess}
        />
      )}
    </div>
  );
}