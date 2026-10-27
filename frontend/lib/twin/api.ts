import type { ChatReply, Source, TwinError, TwinErrorCode } from './types';

// Only the public API URL is configured here. Model credentials never reach the browser:
// the backend calls Amazon Bedrock with its own IAM role.
const API_URL = (process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000').replace(/\/$/, '');

/** API Gateway cuts requests at 30s, so give up slightly after that. */
export const REQUEST_TIMEOUT_MS = 35_000;

const MESSAGES: Record<TwinErrorCode, { message: string; retryable: boolean }> = {
  rate_limited: { message: "You're sending messages quickly. Give it a few seconds and try again.", retryable: true },
  model_busy: { message: 'The AI service is busy right now. Please try again in a few seconds.', retryable: true },
  timeout: { message: 'That answer took too long to generate. Try again, or ask a shorter question.', retryable: true },
  unavailable: { message: 'The twin is temporarily unavailable. Please try again shortly.', retryable: true },
  invalid_request: { message: 'That message could not be sent. Please check it and try again.', retryable: false },
  conversation_limit: { message: 'This conversation has reached its length limit. Start a new conversation to continue.', retryable: false },
  offline: { message: "I couldn't reach the server. Check your connection and try again.", retryable: true },
  unknown: { message: 'Something went wrong. Please try again.', retryable: true },
};

export function makeError(code: TwinErrorCode, extra: Partial<TwinError> = {}): TwinError {
  return { code, ...MESSAGES[code], ...extra };
}

interface ErrorBody {
  detail?: { code?: string; message?: string; request_id?: string };
  message?: string;
}

function codeFromStatus(status: number): TwinErrorCode {
  if (status === 429) return 'rate_limited';
  if (status === 504 || status === 408) return 'timeout';
  if (status === 400 || status === 422) return 'invalid_request';
  if (status >= 500) return 'unavailable';
  return 'unknown';
}

const KNOWN: ReadonlySet<string> = new Set(Object.keys(MESSAGES));

export async function readError(res: Response): Promise<TwinError> {
  let body: ErrorBody = {};
  try {
    body = (await res.json()) as ErrorBody;
  } catch {
    // Non-JSON error (for example from the API gateway); fall back to the status code.
  }
  const apiCode = body.detail?.code;
  const code: TwinErrorCode = apiCode && KNOWN.has(apiCode) ? (apiCode as TwinErrorCode) : codeFromStatus(res.status);
  const retryAfter = Number(res.headers.get('Retry-After'));
  return makeError(code, {
    requestId: body.detail?.request_id,
    retryAfterSeconds: Number.isFinite(retryAfter) && retryAfter > 0 ? retryAfter : undefined,
  });
}

interface RawReply {
  response?: unknown;
  session_id?: unknown;
  request_id?: unknown;
  sources?: unknown;
  suggestions?: unknown;
}

function parseReply(raw: RawReply): ChatReply {
  if (typeof raw.response !== 'string' || !raw.response.trim() || typeof raw.session_id !== 'string') {
    throw makeError('unknown');
  }
  const sources = Array.isArray(raw.sources)
    ? (raw.sources as Source[]).filter((s) => s && typeof s.id === 'string' && typeof s.title === 'string')
    : [];
  const suggestions = Array.isArray(raw.suggestions) ? (raw.suggestions as unknown[]).filter((s): s is string => typeof s === 'string') : [];
  return {
    response: raw.response,
    sessionId: raw.session_id,
    requestId: typeof raw.request_id === 'string' ? raw.request_id : '',
    sources,
    suggestions,
  };
}

export async function sendChat(params: { message: string; sessionId?: string; signal?: AbortSignal }): Promise<ChatReply> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(new DOMException('timeout', 'TimeoutError')), REQUEST_TIMEOUT_MS);
  const onAbort = () => controller.abort(params.signal?.reason);
  params.signal?.addEventListener('abort', onAbort);

  try {
    const res = await fetch(`${API_URL}/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: params.message, session_id: params.sessionId || undefined }),
      signal: controller.signal,
    });
    if (!res.ok) throw await readError(res);
    return parseReply((await res.json()) as RawReply);
  } catch (err) {
    if (isTwinError(err)) throw err;
    if (params.signal?.aborted) throw err; // caller cancelled; let it handle that
    if (controller.signal.aborted) throw makeError('timeout');
    throw makeError('offline');
  } finally {
    clearTimeout(timer);
    params.signal?.removeEventListener('abort', onAbort);
  }
}

export function isTwinError(err: unknown): err is TwinError {
  return typeof err === 'object' && err !== null && 'code' in err && 'retryable' in err && 'message' in err;
}
