// Global State Management with Zustand

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { User, TokenBalance } from '@/types';
import { apiClient } from './api';

interface AuthState {
  user: User | null;
  token: string | null;
  balance: number;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
  hasHydrated: boolean;

  // Actions
  login: (email: string, password: string) => Promise<void>;
  loginWithWallet: (publicKey: string, signMessage: (message: Uint8Array) => Promise<Uint8Array>) => Promise<void>;
  logout: () => void;
  setToken: (token: string, user: User) => void;
  updateBalance: (balance: number) => void;
  fetchBalance: () => Promise<void>;
  clearError: () => void;
  setHasHydrated: (value: boolean) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      balance: 0,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      hasHydrated: false,

      login: async (email: string, password: string) => {
        set({ isLoading: true, error: null });
        try {
          let response;
          try {
            response = await apiClient.login(email, password);
          } catch (error) {
            const message = error instanceof Error ? error.message : '';
            const isDemoCredentials =
              ['demo@drama.app', 'demo@cliffhanger.gg'].includes(email.toLowerCase()) &&
              password === 'demo123';

            if (isDemoCredentials && message.toLowerCase().includes('unauthorized')) {
              response = await apiClient.register(email, password);
            } else {
              throw error;
            }
          }
          
          const user: User = {
            userId: response.userId,
            email,
            createdAt: Date.now(),
            lastActive: Date.now(),
          };

          apiClient.setToken(response.token);
          set({
            user,
            token: response.token,
            isAuthenticated: true,
            isLoading: false,
          });

          // Fetch initial balance
          await get().fetchBalance();
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Login failed';
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      loginWithWallet: async (publicKey: string, signMessage) => {
        set({ isLoading: true, error: null });
        try {
          const { nonce, message } = await apiClient.getWalletLoginNonce();
          const sigBytes = await signMessage(new TextEncoder().encode(message));
          const signature = btoa(String.fromCharCode(...sigBytes));

          const res = await apiClient.verifyWalletLogin({ publicKey, signature, nonce });

          const user: User = {
            userId: res.userId,
            email: `wallet:${publicKey}`,
            createdAt: Date.now(),
            lastActive: Date.now(),
          };

          apiClient.setToken(res.token);
          set({ user, token: res.token, isAuthenticated: true, isLoading: false });
          await get().fetchBalance();
        } catch (error) {
          const message = error instanceof Error ? error.message : 'Wallet login failed';
          set({ error: message, isLoading: false });
          throw error;
        }
      },

      logout: () => {
        apiClient.setToken(null);
        set({
          user: null,
          token: null,
          balance: 0,
          isAuthenticated: false,
          error: null,
        });
      },

      setToken: (token: string, user: User) => {
        apiClient.setToken(token);
        set({
          token,
          user,
          isAuthenticated: true,
        });
      },

      updateBalance: (balance: number) => {
        set({ balance });
      },

      fetchBalance: async () => {
        try {
          const balanceData = await apiClient.getBalance();
          set({ balance: balanceData.balance });
        } catch (error) {
          console.error('Failed to fetch balance:', error);
        }
      },

      clearError: () => {
        set({ error: null });
      },

      setHasHydrated: (value: boolean) => {
        set({ hasHydrated: value });
      },
    }),
    {
      name: 'drama-auth-storage',
      partialize: (state) => ({
        user: state.user,
        token: state.token,
        balance: state.balance,
        isAuthenticated: state.isAuthenticated,
      }),
      onRehydrateStorage: () => (state) => {
        // Restore token to API client after rehydration
        if (state?.token) {
          apiClient.setToken(state.token);
        }

        // Migrate away from old persisted "guest as authenticated" sessions.
        // A guest session uses an empty email; treat it as logged out.
        if (state?.user && !state.user.email) {
          state.logout();
        }

        // Mark hydration as complete
        state?.setHasHydrated(true);
      },
    }
  )
);

// Video Player State
interface VideoPlayerState {
  currentEpisodeId: string | null;
  currentStoryId: string | null;
  isPlaying: boolean;
  isMuted: boolean;
  currentTime: number;
  duration: number;
  isBuffering: boolean;
  
  // Actions
  setCurrentEpisode: (episodeId: string, storyId: string) => void;
  setPlaying: (isPlaying: boolean) => void;
  setMuted: (isMuted: boolean) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setBuffering: (isBuffering: boolean) => void;
  reset: () => void;
}

export const useVideoPlayerStore = create<VideoPlayerState>((set) => ({
  currentEpisodeId: null,
  currentStoryId: null,
  isPlaying: false,
  isMuted: false,
  currentTime: 0,
  duration: 0,
  isBuffering: false,

  setCurrentEpisode: (episodeId: string, storyId: string) => {
    set({ currentEpisodeId: episodeId, currentStoryId: storyId, currentTime: 0 });
  },

  setPlaying: (isPlaying: boolean) => {
    set({ isPlaying });
  },

  setMuted: (isMuted: boolean) => {
    set({ isMuted });
  },

  setCurrentTime: (time: number) => {
    set({ currentTime: time });
  },

  setDuration: (duration: number) => {
    set({ duration });
  },

  setBuffering: (isBuffering: boolean) => {
    set({ isBuffering });
  },

  reset: () => {
    set({
      currentEpisodeId: null,
      currentStoryId: null,
      isPlaying: false,
      currentTime: 0,
      duration: 0,
      isBuffering: false,
    });
  },
}));
