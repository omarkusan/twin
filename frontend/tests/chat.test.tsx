import { render, screen, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { ChatPanel } from '@/components/twin/ChatPanel';
import { TwinProvider } from '@/components/twin/TwinProvider';
import { twin } from '@/lib/profile';

function reply(text: string, extra: Record<string, unknown> = {}) {
  return new Response(
    JSON.stringify({
      response: text,
      session_id: 'sess-12345678',
      request_id: 'req1',
      sources: [{ id: 'experience:pnc', title: 'PNC Bank (Full Stack Tech Lead Engineer)', type: 'experience' }],
      suggestions: ['What are you learning right now?'],
      ...extra,
    }),
    { status: 200, headers: { 'Content-Type': 'application/json' } },
  );
}

function setup() {
  render(
    <TwinProvider>
      <ChatPanel variant="embedded" />
    </TwinProvider>,
  );
  return userEvent.setup();
}

let fetchMock: ReturnType<typeof vi.fn>;

beforeEach(() => {
  fetchMock = vi.fn();
  vi.stubGlobal('fetch', fetchMock);
});
afterEach(() => vi.unstubAllGlobals());

describe('digital twin chat', () => {
  it('introduces itself as an AI and offers conversation starters', () => {
    setup();
    expect(screen.getByText(/I'm the AI twin of Omar/)).toBeInTheDocument();
    expect(screen.getByText(/AI representation/i)).toBeInTheDocument();
    for (const q of twin.starters.slice(0, 4)) {
      expect(screen.getByRole('button', { name: q })).toBeInTheDocument();
    }
  });

  it('sends a message, renders markdown and code, and offers sources and follow-ups', async () => {
    fetchMock.mockResolvedValue(reply('I **own** the architecture.\n\n```java\n@RestController\nclass A {}\n```'));
    const user = setup();

    await user.type(screen.getByLabelText(/Message to Omar/), 'What do you do at PNC?{Enter}');

    expect(screen.getByText('What do you do at PNC?')).toBeInTheDocument();
    expect(await screen.findByText('own')).toBeInTheDocument(); // rendered as <strong>
    expect(await screen.findByRole('button', { name: 'Copy code' })).toBeInTheDocument();
    expect(screen.getByText('PNC Bank (Full Stack Tech Lead Engineer)')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'What are you learning right now?' })).toBeInTheDocument();

    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body).toEqual({ message: 'What do you do at PNC?', session_id: undefined });
  });

  it('continues the same session on follow-ups', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(reply('Answer')));
    const user = setup();
    const input = screen.getByLabelText(/Message to Omar/);
    await user.type(input, 'First{Enter}');
    await screen.findAllByText('Answer');
    await user.type(input, 'Second{Enter}');
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).session_id).toBe('sess-12345678');
  });

  it('does not send empty messages', async () => {
    const user = setup();
    expect(screen.getByRole('button', { name: 'Send message' })).toBeDisabled();
    await user.type(screen.getByLabelText(/Message to Omar/), '   {Enter}');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('keeps Shift+Enter for new lines', async () => {
    const user = setup();
    const input = screen.getByLabelText(/Message to Omar/) as HTMLTextAreaElement;
    await user.type(input, 'line one{Shift>}{Enter}{/Shift}line two');
    expect(input.value).toBe('line one\nline two');
    expect(fetchMock).not.toHaveBeenCalled();
  });

  it('shows a friendly error and retries the same message without duplicating it', async () => {
    fetchMock
      .mockResolvedValueOnce(new Response(JSON.stringify({ detail: { code: 'model_busy', message: 'internal', request_id: 'rid9' } }), { status: 429 }))
      .mockResolvedValueOnce(reply('Recovered answer'));
    const user = setup();

    await user.type(screen.getByLabelText(/Message to Omar/), 'Hello{Enter}');

    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText(/busy right now/)).toBeInTheDocument();
    expect(within(alert).getByText(/rid9/)).toBeInTheDocument();
    expect(within(alert).queryByText(/internal/)).not.toBeInTheDocument();

    await user.click(within(alert).getByRole('button', { name: 'Try again' }));
    expect(await screen.findByText(/Recovered answer/)).toBeInTheDocument();
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getAllByText('Hello')).toHaveLength(1);
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).message).toBe('Hello');
  });

  it('offers a new conversation when the length limit is reached', async () => {
    fetchMock.mockResolvedValue(new Response(JSON.stringify({ detail: { code: 'conversation_limit' } }), { status: 429 }));
    const user = setup();
    await user.type(screen.getByLabelText(/Message to Omar/), 'Hello{Enter}');
    const alert = await screen.findByRole('alert');
    expect(within(alert).queryByRole('button', { name: 'Try again' })).not.toBeInTheDocument();
    await user.click(within(alert).getByRole('button', { name: 'Start a new conversation' }));
    expect(screen.queryByRole('alert')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: twin.starters[0] })).toBeInTheDocument();
  });

  it('resets the conversation, including the server session', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(reply('Answer')));
    const user = setup();
    await user.type(screen.getByLabelText(/Message to Omar/), 'Hi{Enter}');
    await screen.findByText('Answer');

    await user.click(screen.getByRole('button', { name: 'Start a new conversation' }));
    expect(screen.queryByText('Answer')).not.toBeInTheDocument();

    await user.type(screen.getByLabelText(/Message to Omar/), 'Again{Enter}');
    await waitFor(() => expect(fetchMock).toHaveBeenCalledTimes(2));
    expect(JSON.parse(fetchMock.mock.calls[1][1].body).session_id).toBeUndefined();
  });

  it('restores the conversation from sessionStorage after a reload', async () => {
    fetchMock.mockImplementation(() => Promise.resolve(reply('Stored answer')));
    const user = setup();
    await user.type(screen.getByLabelText(/Message to Omar/), 'Remember me{Enter}');
    await screen.findByText('Stored answer');
    expect(window.sessionStorage.getItem('twin.chat.v1')).toContain('Remember me');
  });
});
