'use client';

import { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { useQuery } from '@tanstack/react-query';
import { useAuthStore } from '@/lib/store';
import { apiClient, queryKeys } from '@/lib/api';
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
  const { isAuthenticated } = useAuthStore();

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

  // Error states
  if (contentError) {
    const msg = contentErrorMsg instanceof Error ? contentErrorMsg.message : 'Could not load content';
    return <FeedError message={msg} onRetry={refetchContent} />;
  }
  if (loadingContent) {
    return <FeedSkeleton />;
  }

  const stories = content?.stories ?? [];
  if (stories.length === 0) {
    return <FeedError message="No stories available" onRetry={refetchContent} />;
  }

  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-black p-6">
        <div className="max-w-5xl mx-auto">
          <div className="flex items-center justify-between gap-4">
            <h1 className="text-2xl font-semibold">Trending</h1>
            {!isAuthenticated && (
              <button className="btn-secondary" onClick={() => router.push('/login')}>
                Sign in
              </button>
            )}
          </div>

          <div className="mt-6 grid grid-cols-2 md:grid-cols-3 gap-4">
            {stories.map((s) => (
              <button
                key={s.storyId}
                className="relative aspect-[3/4] overflow-hidden rounded-none border border-surface-light bg-surface text-left"
                onClick={() => router.push(`/stories/${encodeURIComponent(s.storyId)}`)}
              >
                {s.thumbnailUrl ? (
                  <div
                    className="absolute inset-0 bg-cover bg-center"
                    style={{ backgroundImage: `url(${s.thumbnailUrl})` }}
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-b from-surface-light to-black" />
                )}

                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent" />
                <div className="absolute bottom-0 p-3">
                  <div className="text-sm font-semibold">{s.title}</div>
                  <div className="text-xs text-text-secondary line-clamp-2">{s.description}</div>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    </ErrorBoundary>
  );
}
