// API Client for drama-backend

import type {
  AuthResponse,
  ContentFeed,
  Episode,
  NarrativeState,
  PlaybackRequest,
  PlaybackResponse,
  Story,
  TelemetryEvent,
  TokenBalance,
  UnlockRequest,
  UnlockResponse,
  SolanaTopUpIntentResponse,
  SolanaTopUpConfirmResponse,
  StripeCheckoutResponse,
  StripePackId,
  WalletNonceResponse,
  WalletVerifyResponse,
} from '@/types';

const API_URL = (
  process.env.NEXT_PUBLIC_API_URL || 'https://drama-backend.imuthuvappa.workers.dev'
).replace(/\/$/, '');

class ApiClient {
  private baseUrl: string;
  private token: string | null = null;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  setToken(token: string | null) {
    this.token = token;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers = new Headers(options.headers);
    headers.set('Content-Type', 'application/json');

    // Add JWT token if available
    if (this.token) {
      headers.set('Authorization', `Bearer ${this.token}`);
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      throw new Error(
        errorData.message || `API Error: ${response.status} ${response.statusText}`
      );
    }

    return response.json();
  }

  // Authentication
  async login(email: string, password: string): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async register(email: string, password: string): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  async guest(): Promise<AuthResponse> {
    return this.request<AuthResponse>('/auth/guest', {
      method: 'POST',
    });
  }

  // Content Discovery
  async getContent(
    type: 'trending' | 'new' | 'recommended' | 'continue' = 'trending',
    offsetOrLimit: number = 20,
    offsetMaybe: number = 0
  ): Promise<ContentFeed> {
    // Back-compat: some callers pass (type, offset) expecting default limit.
    const limit = arguments.length === 2 ? 20 : offsetOrLimit;
    const offset = arguments.length === 2 ? offsetOrLimit : offsetMaybe;
    const params = new URLSearchParams({
      type,
      limit: limit.toString(),
      offset: offset.toString(),
    });
    return this.request<ContentFeed>(`/content?${params}`);
  }

  async getStory(storyId: string): Promise<Story> {
    return this.request<Story>(`/stories/${storyId}`);
  }

  async getStoryEpisodes(storyId: string): Promise<Episode[]> {
    return this.request<Episode[]>(`/stories/${storyId}/episodes`);
  }

  // Playback
  async getPlaybackUrl(episodeId: string, userId: string): Promise<PlaybackResponse> {
    return this.request<PlaybackResponse>('/playback', {
      method: 'POST',
      body: JSON.stringify({ userId, episodeId }),
    });
  }

  // Newer Feed API (client-side convenience wrappers)
  async getUser(): Promise<{ balance: number }> {
    const res = await this.request<{ balance: number }>('/balance', { method: 'GET' });
    return { balance: typeof res?.balance === 'number' ? res.balance : 0 };
  }

  async getEpisodes(args: { storyId: string; userId: string }): Promise<{ episodes: Episode[] }> {
    const episodes = await this.getStoryEpisodes(args.storyId);

    // If authenticated, try to merge unlocked state from narrative.
    let unlockedIds = new Set<string>();
    try {
      if (this.token) {
        const narrative = await this.getNarrativeState(args.storyId);
        unlockedIds = new Set(narrative?.unlockedEpisodes ?? []);
      }
    } catch {
      // ignore
    }

    const merged = episodes.map((ep) => {
      const isFree = ep.sequenceNumber <= 3; // server enforces too
      const unlocked = isFree || unlockedIds.has(ep.episodeId);
      const unlockCost = isFree ? 0 : ep.tokenCost || 10;
      return { ...ep, unlocked, unlockCost };
    });

    return { episodes: merged };
  }

  async unlock(req: { episodeId: string; storyId: string; userId: string }): Promise<{ unlocked: boolean; coinsUsed: number; newBalance: number }> {
    const res = await this.request<UnlockResponse>('/unlock', {
      method: 'POST',
      body: JSON.stringify({ episodeId: req.episodeId, storyId: req.storyId }),
    });

    return {
      unlocked: Boolean(res?.success),
      coinsUsed: 0,
      newBalance: typeof res?.remainingTokens === 'number' ? res.remainingTokens : 0,
    };
  }

  // Token Management
  async getBalance(): Promise<TokenBalance> {
    return this.request<TokenBalance>('/balance');
  }

  async unlockEpisode(episodeId: string): Promise<UnlockResponse> {
    return this.request<UnlockResponse>('/unlock', {
      method: 'POST',
      body: JSON.stringify({ episodeId }),
    });
  }

  // Solana Payments
  async createSolanaTopUp(tokens: number): Promise<SolanaTopUpIntentResponse> {
    return this.request<SolanaTopUpIntentResponse>('/payments/solana/intent', {
      method: 'POST',
      body: JSON.stringify({ tokens }),
    });
  }

  // Back-compat
  async createSolanaTopUpIntent(): Promise<SolanaTopUpIntentResponse> {
    return this.request<SolanaTopUpIntentResponse>('/payments/solana/intent', {
      method: 'POST',
      body: JSON.stringify({}),
    });
  }

  async confirmSolanaTopUp(signature: string): Promise<SolanaTopUpConfirmResponse> {
    return this.request<SolanaTopUpConfirmResponse>('/payments/solana/confirm', {
      method: 'POST',
      body: JSON.stringify({ signature }),
    });
  }

  // Back-compat
  async confirmSolanaTopUpIntent(intentId: string, signature: string): Promise<SolanaTopUpConfirmResponse> {
    return this.request<SolanaTopUpConfirmResponse>('/payments/solana/confirm', {
      method: 'POST',
      body: JSON.stringify({ intentId, signature }),
    });
  }

  // Stripe Payments
  async createStripeCheckout(packId: StripePackId): Promise<StripeCheckoutResponse> {
    return this.request<StripeCheckoutResponse>('/payments/stripe/checkout', {
      method: 'POST',
      body: JSON.stringify({ packId }),
    });
  }

  // Wallet Authentication
  async getNonce(publicKey: string): Promise<WalletNonceResponse> {
    return this.request<WalletNonceResponse>('/auth/wallet/nonce', {
      method: 'POST',
      body: JSON.stringify({ publicKey }),
    });
  }

  async getWalletLoginNonce(): Promise<WalletNonceResponse> {
    return this.request<WalletNonceResponse>('/auth/wallet/nonce', { method: 'POST' });
  }

  async verifyWallet(
    publicKey: string,
    signature: string
  ): Promise<WalletVerifyResponse> {
    return this.request<WalletVerifyResponse>('/auth/wallet/verify', {
      method: 'POST',
      body: JSON.stringify({ publicKey, signature }),
    });
  }

  async verifyWalletLogin(args: { publicKey: string; signature: string; nonce: string }): Promise<WalletVerifyResponse> {
    return this.request<WalletVerifyResponse>('/auth/wallet/verify', {
      method: 'POST',
      body: JSON.stringify(args),
    });
  }

  // Progress Tracking
  async getNarrativeState(storyId: string): Promise<NarrativeState> {
    const params = new URLSearchParams({ storyId });
    return this.request<NarrativeState>(`/narrative?${params}`);
  }

  async updateNarrativeState(
    storyId: string,
    state: Partial<NarrativeState>
  ): Promise<NarrativeState> {
    // Backend doesn't support updating narrative directly yet.
    return this.getNarrativeState(storyId);
  }

  // Telemetry
  async sendTelemetry(events: TelemetryEvent[]): Promise<void> {
    await this.request<void>('/telemetry', {
      method: 'POST',
      body: JSON.stringify({ events }),
    });
  }
}

// Export singleton instance
export const api = new ApiClient(API_URL);

// Preferred name in app code
export const apiClient = api;

export const queryKeys = {
  content: (type: string, offset: number) => ['content', type, offset] as const,
  story: (storyId: string) => ['story', storyId] as const,
  episodes: (storyId: string, userId: string) => ['episodes', storyId, userId] as const,
  user: () => ['user'] as const,
};

export default api;
