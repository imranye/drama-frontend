// API Response Types matching drama-backend

export interface User {
  userId: string;
  email?: string;
  createdAt: number;
  lastActive: number;
}

export interface Episode {
  episodeId: string;
  storyId: string;
  sequenceNumber: number;
  title: string;
  duration: number;
  thumbnailUrl?: string;
  videoUrl?: string;
  tokenCost: number;
  storyWeight: number;
  createdAt: number;
}

export interface Story {
  storyId: string;
  title: string;
  description: string;
  thumbnailUrl: string;
  episodeCount: number;
  totalDuration: number;
  genres: string[];
  trending: boolean;
}

export interface Character {
  characterId: string;
  name: string;
  description: string;
  traits: string[];
  relationships: Record<string, number>;
}

export interface CharacterState {
  relationship: number; // 0-100
  alive: boolean;
  traits: string[];
  customData: Record<string, any>;
}

export interface NarrativeState {
  storyId: string;
  currentEpisode: number;
  unlockedEpisodes: string[];
  characterStates: {
    [characterId: string]: CharacterState;
  };
  personalizations: string[];
  nextEpisodes: string[];
}

export interface TokenBalance {
  balance: number;
  lastUpdated: number;
  dailyEarned: number;
  dailySpent: number;
}

export interface UnlockRequest {
  userId: string;
  storyId: string;
  episodeId: string;
  tokensToSpend: number;
}

export interface UnlockResponse {
  success: boolean;
  episodeId: string;
  videoUrl: string;
  remainingTokens: number;
  nextEpisodeId?: string;
}

export interface PlaybackRequest {
  userId: string;
  episodeId: string;
}

export interface PlaybackResponse {
  videoUrl: string;
  thumbnailUrl: string;
  duration: number;
  metadata: {
    title: string;
    sequenceNumber: number;
  };
}

export interface ContentFeed {
  stories: Story[];
  total: number;
  hasMore: boolean;
}

export interface TelemetryEvent {
  eventType: 'watch' | 'skip' | 'pause' | 'complete' | 'exit';
  episodeId: string;
  timestamp: number;
  duration?: number;
  metadata?: Record<string, any>;
}

export interface AuthResponse {
  token: string;
  userId: string;
  expiresAt: number;
}

// Frontend-specific types

export interface VideoPlayerState {
  currentEpisodeId: string | null;
  isPlaying: boolean;
  isMuted: boolean;
  currentTime: number;
  duration: number;
  isBuffering: boolean;
}

export interface AppState {
  user: User | null;
  token: string | null;
  balance: number;
  isAuthenticated: boolean;
}
