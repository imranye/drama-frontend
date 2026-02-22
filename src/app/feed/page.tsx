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
import { ErrorBoundary } from '@/components/error-boundary';

// ── Skeleton ──────────────────────────────────────────────────────────────────
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

// ── Error screen ──────────────────────────────────────────────────────────────
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

// ── Page ──────────────────────────────────────────────────────────────────────
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
    queryFn: () => apiClient.getContent('trending', 0),
  });

  // Load user data for unlocks if authenticated
  const {
    data: userData,
    isLoading: loadingUser,
    refetch: refetchUser,
  } = useQuery({
    queryKey: isAuthenticated ? queryKeys.user() : ['no-user'],
    queryFn: isAuthenticated ? apiClient.getUser : async () => null,
    enabled: isAuthenticated,
  });

  // Single story for FeedPage
  const story = useMemo(() => content?.stories?.[0], [content]);
  const storyId = story?.storyId;

  // Persist auto‑unlocked episodes across login
  useEffect(() => {
    if (!story) return;
    const key = `story-${storyId}-unlocked`;
    const stored = localStorage.getItem(key);
    if (stored) {
      try {
        setOptimisticUnlocked(new Set(JSON.parse(stored)));
      } catch {}
    }
  }, [story, storyId]);

  // Fetch episodes for the single feed
  const {
    data: episodesData,
    isLoading: loadingEpisodes,
    isError: episodesError,
    error: episodesErrorMsg,
    refetch: refetchEpisodes,
  } = useQuery({
    queryKey: story ? queryKeys.episodes(story.storyId, playbackUserId) : ['no-story'],
    queryFn: () =>
      apiClient.getEpisodes({
        storyId: story!.storyId,
        userId: playbackUserId,
      }),
    enabled: Boolean(story),
  });

  const episodes = useMemo(() => episodesData?.episodes ?? [], [episodesData]);

  const unlockedEpisodeIds = useMemo(() => {
    const fromServer = new Set(
      episodes.filter((ep) => ep.unlocked).map((ep) => ep.episodeId)
    );
    return new Set([...fromServer, ...optimisticUnlocked]);
  }, [episodes, optimisticUnlocked]);

  // Unlock mutation
  const unlockMutation = useMutation<
    { unlocked: boolean; coinsUsed: number; newBalance: number },
    Error,
    UnlockRequest
  >({
    mutationFn: apiClient.unlock,
    onMutate: async (req) => {
      const eid = req.episodeId;
      setOptimisticUnlocked((prev) => new Set(prev).add(eid));

      const key = story ? `story-${story.storyId}-unlocked` : '';
      if (key) {
        const merged = new Set([...unlockedEpisodeIds, eid]);
        localStorage.setItem(key, JSON.stringify([...merged]));
      }
    },
    onSuccess: (data, req) => {
      if (data.unlocked && data.newBalance != null) {
        updateBalance(data.newBalance);
      }
      queryClient.invalidateQueries({ queryKey: queryKeys.episodes(story!.storyId, playbackUserId) });
      queryClient.invalidateQueries({ queryKey: queryKeys.user() });

      setPendingUnlockEpisodeId(null);
    },
    onError: (err, req) => {
      setOptimisticUnlocked((prev) => {
        const next = new Set(prev);
        next.delete(req.episodeId);
        return next;
      });
      console.error('Failed to unlock:', err);
      setPendingUnlockEpisodeId(null);
    },
  });

  // Purchase success
  const handlePurchaseSuccess = () => {
    refetchUser();

    if (pendingUnlockEpisodeId && story) {
      unlockMutation.mutate({
        episodeId: pendingUnlockEpisodeId,
        storyId: story.storyId,
        userId: user?.userId!,
      });
    }
    setPendingUnlockEpisodeId(null);
  };

  // Unlock handler
  const handleUnlock = (episodeId: string) => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    if (!story || !user?.userId) return;

    const episode = episodes.find((ep) => ep.episodeId === episodeId);
    const cost = episode?.unlockCost ?? 50;

    if (balance < cost) {
      setPendingUnlockEpisodeId(episodeId);
      setBuyModalOpen(true);
      return;
    }

    unlockMutation.mutate({
      episodeId,
      storyId: story.storyId,
      userId: user.userId,
    });
  };

  // Error states
  if (contentError) {
    const msg = contentErrorMsg instanceof Error ? contentErrorMsg.message : 'Could not load content';
    return <FeedError message={msg} onRetry={refetchContent} />;
  }
  if (episodesError) {
    const msg = episodesErrorMsg instanceof Error ? episodesErrorMsg.message : 'Could not load episodes';
    return <FeedError message={msg} onRetry={refetchEpisodes} />;
  }

  // Loading states
  if (loadingContent || loadingUser || !story) {
    return <FeedSkeleton />;
  }

  return (
    <ErrorBoundary>
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
    </ErrorBoundary>
  );
}
