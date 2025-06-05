// Chat service specific types
import { ChatMessage, Citation } from './chat';

export interface ChatServiceConfig {
  url: string;
  userId: string;
  authToken?: string;
  timezone: string;
}

export interface ChatServiceEvents {
  message: (message: ChatMessage) => void;
  connected: () => void;
  disconnected: (reason: string) => void;
  error: (error: Error) => void;
  typing: (isTyping: boolean) => void;
  authRequired: (authUrl: string) => void;
}

export interface QueuedMessage {
  id: string;
  content: string;
  metadata?: any;
  timestamp: number;
  retryCount: number;
}

export interface ChatServiceState {
  messages: ChatMessage[];
  isConnected: boolean;
  isTyping: boolean;
  error: string | null;
  context: ChatContext | null;
}

export interface ChatContext {
  userId: string;
  timezone: string;
  capabilities: string[];
  preferences: Record<string, any>;
}

export interface OutgoingMessage {
  id: string;
  content: string;
  metadata?: any;
  timestamp: number;
}

export interface TransformOptions {
  includeMetadata?: boolean;
  maxConfidence?: number;
}