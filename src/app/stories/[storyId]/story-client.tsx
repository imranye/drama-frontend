'use client';

import { useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';

import { FeedScroll } from '@/components/feed-scroll';
import { TokenBalance } from '@/components/token-balance';
import { BuyCoinsModal } from '@/components/buy-coins-modal';
import { ErrorBoundary } from '@/components/error-boundary';
import { useAuthStore } from '@/lib/store';
import { apiClient, queryKeys } from '@/lib/api';

function StorySkeleton() {
  return (
    <div className="min-h-screen flex items-center justify-center bg-black">
      <div className="w-12 h-12 border-4 border-accent border-t-transparent rounded-none animate-spin" />
    </div>
  );
}

function StoryError({ message, onRetry }: { message: string; onRetry: () => void }) {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center gap-4 p-6 text-center bg-black">
      <p className="text-error text-lg font-semibold">Something went wrong</p>
      <p className="text-text-secondary text-sm">{message}</p>
      <button onClick={onRetry} className="btn-primary px-8">
        Try Again
      </button>
    </div>
  );
}

export function StoryClient(props: { storyId: string }) {
  const { storyId } = props;
  const router = useRouter();
  const queryClient = useQueryClient();

  const { isAuthenticated, user, balance, updateBalance } = useAuthStore();
  const [currentIndex, setCurrentIndex] = useState(0);
  const [buyModalOpen, setBuyModalOpen] = useState(false);
  const [pendingUnlockEpisodeId, setPendingUnlockEpisodeId] = useState<string | null>(null);

  const playbackUserId = user?.userId ?? 'public';

  const {
    data: story,
    isLoading: loadingStory,
    isError: storyIsError,
    error: storyError,
    refetch: refetchStory,
  } = useQuery({
    queryKey: queryKeys.story(storyId),
    queryFn: () => apiClient.getStory(storyId),
  });

  const {
    data: episodesData,
    isLoading: loadingEpisodes,
    isError: episodesIsError,
    error: episodesError,
    refetch: refetchEpisodes,
  } = useQuery({
    queryKey: queryKeys.episodes(storyId, playbackUserId),
    queryFn: () => apiClient.getEpisodes({ storyId, userId: playbackUserId }),
  });

  const episodes = useMemo(() => episodesData?.episodes ?? [], [episodesData]);

  const unlockMutation = useMutation({
    mutationFn: (episodeId: string) => {
      if (!user?.userId) throw new Error('Not authenticated');
      return apiClient.unlock({ episodeId, storyId, userId: user.userId });
    },
    onSuccess: (res) => {
      if (typeof res?.newBalance === 'number') updateBalance(res.newBalance);
      queryClient.invalidateQueries({ queryKey: queryKeys.episodes(storyId, playbackUserId) });
      setPendingUnlockEpisodeId(null);
    },
    onError: (err) => {
      console.error('Unlock failed', err);
      setPendingUnlockEpisodeId(null);
    },
  });

  const handleUnlock = (episodeId: string) => {
    if (!isAuthenticated) {
      router.push('/login');
      return;
    }

    const episode = episodes.find((e) => e.episodeId === episodeId);
    const cost = episode?.unlockCost ?? episode?.tokenCost ?? 10;

    if (balance < cost) {
      setPendingUnlockEpisodeId(episodeId);
      setBuyModalOpen(true);
      return;
    }

    unlockMutation.mutate(episodeId);
  };

  if (loadingStory || loadingEpisodes) return <StorySkeleton />;
  if (storyIsError) {
    const msg = storyError instanceof Error ? storyError.message : 'Failed to load story';
    return <StoryError message={msg} onRetry={refetchStory} />;
  }
  if (episodesIsError) {
    const msg = episodesError instanceof Error ? episodesError.message : 'Failed to load episodes';
    return <StoryError message={msg} onRetry={refetchEpisodes} />;
  }
  if (!story || episodes.length === 0) {
    return <StoryError message="No episodes available" onRetry={refetchEpisodes} />;
  }

  return (
    <ErrorBoundary>
      <div className="relative w-full h-screen overflow-hidden bg-black">
        <button
          className="absolute top-4 left-4 z-50 btn-secondary"
          onClick={() => router.push('/feed')}
        >
          Back
        </button>

        {isAuthenticated && <TokenBalance />}

        {isAuthenticated && (
          <button
            className="absolute bottom-6 right-6 z-50 btn-primary"
            onClick={() => setBuyModalOpen(true)}
          >
            Buy coins
          </button>
        )}

        <FeedScroll
          episodes={episodes}
          story={story}
          userId={playbackUserId}
          freeEpisodeCount={3}
          unlockedEpisodeIds={episodes.filter((e) => e.unlocked).map((e) => e.episodeId)}
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
            onSuccess={() => {
              setBuyModalOpen(false);
              if (pendingUnlockEpisodeId) unlockMutation.mutate(pendingUnlockEpisodeId);
            }}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}
