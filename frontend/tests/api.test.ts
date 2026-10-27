import { afterEach, describe, expect, it, vi } from 'vitest';
import { REQUEST_TIMEOUT_MS, sendChat } from '@/lib/twin/api';

const ok = {
  response: 'Hello',
  session_id: 'abc-12345',
  request_id: 'r1',
  sources: [{ id: 'profile', title: 'Profile and summary', type: 'profile' }, { bad: true }],
  suggestions: ['One', 2, 'Two'],
};

function json(body: unknown, status = 200, headers: Record<string, string> = {}) {
  return new Response(JSON.stringify(body), { status, headers: { 'Content-Type': 'application/json', ...headers } });
}

afterEach(() => {
  vi.unstubAllGlobals();
  vi.useRealTimers();
});

describe('sendChat', () => {
  it('posts the message and session id, and normalizes the reply', async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(ok));
    vi.stubGlobal('fetch', fetchMock);

    const reply = await sendChat({ message: 'Hi', sessionId: 'sess-1234' });

    const [url, init] = fetchMock.mock.calls[0];
    expect(String(url)).toMatch(/\/chat$/);
    expect(JSON.parse(init.body)).toEqual({ message: 'Hi', session_id: 'sess-1234' });
    expect(reply.sessionId).toBe('abc-12345');
    expect(reply.sources).toHaveLength(1); // malformed source dropped
    expect(reply.suggestions).toEqual(['One', 'Two']); // non-strings dropped
  });

  it.each([
    [429, { detail: { code: 'rate_limited', message: 'x', request_id: 'rid' } }, 'rate_limited', true],
    [429, { detail: { code: 'conversation_limit', message: 'x' } }, 'conversation_limit', false],
    [504, { detail: { code: 'timeout', message: 'internal' } }, 'timeout', true],
    [503, { detail: { code: 'unavailable', message: 'internal' } }, 'unavailable', true],
    [400, { detail: { code: 'invalid_request', message: 'x' } }, 'invalid_request', false],
    [429, { message: 'Too Many Requests' }, 'rate_limited', true], // API Gateway throttling body
    [500, { detail: { code: 'something_new' } }, 'unavailable', true], // unknown code falls back to status
  ])('maps HTTP %i to %s', async (status, body, code, retryable) => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json(body, status)));
    await expect(sendChat({ message: 'Hi' })).rejects.toMatchObject({ code, retryable });
  });

  it('never surfaces server-provided message text to the visitor', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ detail: { code: 'unavailable', message: 'arn:aws:secret internals' } }, 503)));
    const err = await sendChat({ message: 'Hi' }).catch((e) => e);
    expect(JSON.stringify(err)).not.toContain('arn:aws');
  });

  it('handles non-JSON error bodies from a gateway', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(new Response('Bad Gateway', { status: 502 })));
    await expect(sendChat({ message: 'Hi' })).rejects.toMatchObject({ code: 'unavailable' });
  });

  it('reads Retry-After', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ detail: { code: 'rate_limited' } }, 429, { 'Retry-After': '7' })));
    await expect(sendChat({ message: 'Hi' })).rejects.toMatchObject({ retryAfterSeconds: 7 });
  });

  it('reports an offline error when the request cannot be made', async () => {
    vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new TypeError('Failed to fetch')));
    await expect(sendChat({ message: 'Hi' })).rejects.toMatchObject({ code: 'offline', retryable: true });
  });

  it('rejects a malformed success body instead of showing an empty answer', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(json({ response: '   ', session_id: 's' })));
    await expect(sendChat({ message: 'Hi' })).rejects.toMatchObject({ code: 'unknown' });
  });

  it('times out slow requests', async () => {
    vi.useFakeTimers();
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, init: RequestInit) => new Promise((_, reject) => init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError'))))),
    );
    const pending = sendChat({ message: 'Hi' });
    const assertion = expect(pending).rejects.toMatchObject({ code: 'timeout' });
    await vi.advanceTimersByTimeAsync(REQUEST_TIMEOUT_MS + 10);
    await assertion;
  });

  it('lets the caller cancel without turning it into an error message', async () => {
    const controller = new AbortController();
    vi.stubGlobal(
      'fetch',
      vi.fn((_url: string, init: RequestInit) => new Promise((_, reject) => init.signal?.addEventListener('abort', () => reject(new DOMException('aborted', 'AbortError'))))),
    );
    const pending = sendChat({ message: 'Hi', signal: controller.signal });
    controller.abort();
    await expect(pending).rejects.toMatchObject({ name: 'AbortError' });
  });
});
