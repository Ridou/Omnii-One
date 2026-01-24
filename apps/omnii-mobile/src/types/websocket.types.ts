// WebSocket types matching the backend system
export enum WebSocketMessageType {
  COMMAND = 'command',
  RESPONSE = 'response',
  PING = 'ping',
  PONG = 'pong',
  ERROR = 'error'
}

export enum CommandType {
  TEXT_COMMAND = 'text_command',
  VOICE_COMMAND = 'voice_command'
}

export enum WebSocketResponseStatus {
  SUCCESS = 'success',
  ERROR = 'error',
  PROCESSING = 'processing'
}

export interface WebSocketMessage {
  type: WebSocketMessageType;
  payload: any;
  timestamp: number;
}

export interface CommandPayload {
  commandType: CommandType;
  message: string;
  userId: string;
  userTimezone: string;
  metadata?: Record<string, any>;
}

export interface WebSocketResponse {
  type: WebSocketMessageType.RESPONSE;
  status: WebSocketResponseStatus;
  data: {
    message?: string;
    requiresAuth?: boolean;
    authUrl?: string;
    actions?: any[];
    metadata?: {
      reasoning?: string;
      suggestions?: string[];
      context?: string[];
      source?: string;
      sourceType?: string;
    };
  };
  timestamp: number;
}

export interface WebSocketError {
  type: WebSocketMessageType.ERROR;
  error: {
    code: string;
    message: string;
    details?: any;
  };
  timestamp: number;
}

export interface PingMessage {
  type: WebSocketMessageType.PING;
  payload: {
    userId: string;
    sequence: number;
  };
  timestamp: number;
}

export interface PongMessage {
  type: WebSocketMessageType.PONG;
  data: {
    pong: boolean;
    sequence: number;
  };
  timestamp: number;
}