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
} from '@/types';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || 'https://drama-backend.imuthuvappa.workers.dev';

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
    return this.request<TokenBalance>('/balance');
  }

  // Unlock Episode
  async unlockEpisode(request: UnlockRequest): Promise<UnlockResponse> {
    return this.request<UnlockResponse>('/unlock', {
      method: 'POST',
      body: JSON.stringify(request),
    });
  }

  // Narrative State
  async getNarrativeState(storyId: string): Promise<NarrativeState> {
    const params = new URLSearchParams({ storyId });
    return this.request<NarrativeState>(`/narrative?${params}`);
  }

  // Telemetry
  async sendTelemetry(event: TelemetryEvent): Promise<{ success: boolean }> {
    return this.request<{ success: boolean }>('/telemetry', {
      method: 'POST',
      body: JSON.stringify(event),
    });
  }

  // Health Check
  async healthCheck(): Promise<{ status: string; version: string }> {
    return this.request<{ status: string; version: string }>('/health');
  }
}

export const apiClient = new ApiClient(API_URL);

// React Query helpers
export const queryKeys = {
  content: (type: string, offset: number) => ['content', type, offset] as const,
  story: (storyId: string) => ['story', storyId] as const,
  episodes: (storyId: string) => ['episodes', storyId] as const,
  balance: () => ['balance'] as const,
  narrative: (storyId: string) => ['narrative', storyId] as const,
  playback: (episodeId: string) => ['playback', episodeId] as const,
};
