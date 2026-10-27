export type ChatRole = 'user' | 'assistant';

export interface Source {
  id: string;
  title: string;
  type: string;
}

export interface ChatMessage {
  id: string;
  role: ChatRole;
  content: string;
  createdAt: number;
  sources?: Source[];
}

export interface ChatReply {
  response: string;
  sessionId: string;
  requestId: string;
  sources: Source[];
  suggestions: string[];
}

export type TwinErrorCode =
  | 'rate_limited'
  | 'model_busy'
  | 'timeout'
  | 'unavailable'
  | 'invalid_request'
  | 'conversation_limit'
  | 'offline'
  | 'unknown';

export interface TwinError {
  code: TwinErrorCode;
  /** Visitor-facing explanation. Never contains server internals. */
  message: string;
  /** Whether re-sending the same message can reasonably succeed. */
  retryable: boolean;
  requestId?: string;
  retryAfterSeconds?: number;
}

export const MAX_MESSAGE_CHARS = 2000;
