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
    limit: number = 20,
    offset: number = 0
  ): Promise<ContentFeed> {
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

  // Token Management
  async getBalance(): Promise<TokenBalance> {
    return this.request<TokenBalance>('/tokens/balance');
  }

  async unlockEpisode(episodeId: string): Promise<UnlockResponse> {
    return this.request<UnlockResponse>('/tokens/unlock', {
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

  async confirmSolanaTopUp(signature: string): Promise<SolanaTopUpConfirmResponse> {
    return this.request<SolanaTopUpConfirmResponse>('/payments/solana/confirm', {
      method: 'POST',
      body: JSON.stringify({ signature }),
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

  async verifyWallet(
    publicKey: string,
    signature: string
  ): Promise<WalletVerifyResponse> {
    return this.request<WalletVerifyResponse>('/auth/wallet/verify', {
      method: 'POST',
      body: JSON.stringify({ publicKey, signature }),
    });
  }

  // Progress Tracking
  async getNarrativeState(storyId: string): Promise<NarrativeState> {
    return this.request<NarrativeState>(`/narrative/${storyId}/state`);
  }

  async updateNarrativeState(
    storyId: string,
    state: Partial<NarrativeState>
  ): Promise<NarrativeState> {
    return this.request<NarrativeState>(`/narrative/${storyId}/state`, {
      method: 'PUT',
      body: JSON.stringify(state),
    });
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
export default api;
