'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAuthStore } from '@/lib/store';
import { motion } from 'framer-motion';

export default function HomePage() {
  const router = useRouter();
  const { isAuthenticated } = useAuthStore();

  // Auto-redirect authenticated users straight to feed
  useEffect(() => {
    if (isAuthenticated) {
      router.push('/feed');
    }
  }, [isAuthenticated, router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-6 text-center">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="max-w-lg space-y-8"
      >
        {/* Brand */}
        <div className="space-y-3">
          <h1 className="text-5xl font-bold text-accent tracking-tight">Cliffhanger</h1>
          <p className="text-text-secondary text-lg leading-relaxed">
            Binge-worthy vertical drama. Every episode ends on a cliffhanger.
          </p>
        </div>

        {/* CTA buttons */}
        <div className="flex flex-col gap-4">
          <button
            onClick={() => router.push('/feed')}
            className="btn-primary text-lg py-4"
          >
            Watch Now — It&apos;s Free
          </button>
          <button
            onClick={() => router.push('/login')}
            className="btn-secondary"
          >
            Sign In
          </button>
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-3 text-sm text-text-secondary">
          {['Vertical Video', 'AI-Generated', 'New Episodes Daily', 'Free to Start'].map((tag) => (
            <span key={tag} className="px-3 py-1 bg-surface rounded-none border border-text-disabled">
              {tag}
            </span>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
