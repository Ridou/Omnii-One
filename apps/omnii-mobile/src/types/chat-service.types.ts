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

// Enhanced Multi-Request Support Types
export interface RequestContext {
  id: string;
  content: string;
  timestamp: number;
  priority: RequestPriority;
  status: RequestStatus;
  progress?: AIProgressStage;
  metadata?: any;
}

export interface PriorityRequest {
  id: string;
  content: string;
  priority: RequestPriority;
  timestamp: number;
  metadata?: any;
}

export interface AIProgressStage {
  stage: 'context_analysis' | 'rdf_processing' | 'response_generation' | 'task_creation' | 'completed' | 'idle';
  percentage: number;
  details: string;
  timestamp?: number;
  requestId?: string;
  variations?: number;
  citations?: number;
}

export enum RequestPriority {
  LOW = 1,
  NORMAL = 2,
  HIGH = 3,
  URGENT = 4
}

export enum RequestStatus {
  QUEUED = 'queued',
  PROCESSING = 'processing',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

// Shape of AI - Enhanced Events
export interface EnhancedChatServiceEvents extends ChatServiceEvents {
  progress: (stage: AIProgressStage) => void;
  queueUpdate: (queueLength: number, activeRequests: number) => void;
  multiRequestStart: (requestIds: string[]) => void;
  multiRequestComplete: (results: RequestResult[]) => void;
}

export interface RequestResult {
  id: string;
  status: RequestStatus;
  response?: ChatMessage;
  error?: Error;
  completedAt: number;
}