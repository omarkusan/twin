'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { isTwinError, makeError, sendChat } from '@/lib/twin/api';
import { MAX_MESSAGE_CHARS, type ChatMessage, type TwinError } from '@/lib/twin/types';

/**
 * Shared conversation state for every place the twin appears (hero card, embedded section,
 * expanded dialog). One provider means one conversation, whichever surface is used.
 */

const STORAGE_KEY = 'twin.chat.v1';
const MAX_STORED_MESSAGES = 40;

export type TwinStatus = 'idle' | 'sending';

interface TwinContextValue {
  messages: ChatMessage[];
  status: TwinStatus;
  error: TwinError | null;
  suggestions: string[];
  /** Returns a visitor-facing validation message, or null when the message was accepted. */
  send: (text: string) => string | null;
  retry: () => void;
  reset: () => void;
  expanded: boolean;
  openTwin: (question?: string) => void;
  closeTwin: () => void;
}

const TwinContext = createContext<TwinContextValue | null>(null);

interface Stored {
  sessionId?: string;
  messages: ChatMessage[];
  suggestions: string[];
}

function readStorage(): Stored | null {
  try {
    const raw = window.sessionStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Stored;
    return Array.isArray(parsed.messages) ? parsed : null;
  } catch {
    return null;
  }
}

function newId() {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export function validateMessage(text: string): string | null {
  const trimmed = text.trim();
  if (!trimmed) return 'Type a question first.';
  if (trimmed.length > MAX_MESSAGE_CHARS) return `Please keep messages under ${MAX_MESSAGE_CHARS} characters.`;
  return null;
}

export function TwinProvider({ children }: { children: ReactNode }) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [status, setStatus] = useState<TwinStatus>('idle');
  const [error, setError] = useState<TwinError | null>(null);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [expanded, setExpanded] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  const sessionRef = useRef<string | undefined>(undefined);
  const abortRef = useRef<AbortController | null>(null);
  const busyRef = useRef(false);

  // Restore the conversation after mount (sessionStorage is not available during static rendering).
  useEffect(() => {
    const stored = readStorage();
    if (stored) {
      sessionRef.current = stored.sessionId;
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time restore from sessionStorage after hydration
      setMessages(stored.messages);
      setSuggestions(stored.suggestions ?? []);
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      if (messages.length === 0) {
        window.sessionStorage.removeItem(STORAGE_KEY);
      } else {
        const data: Stored = { sessionId: sessionRef.current, messages: messages.slice(-MAX_STORED_MESSAGES), suggestions };
        window.sessionStorage.setItem(STORAGE_KEY, JSON.stringify(data));
      }
    } catch {
      // Storage may be unavailable (private mode); the conversation still works in memory.
    }
  }, [messages, suggestions, hydrated]);

  const request = useCallback(async (text: string) => {
    busyRef.current = true;
    setStatus('sending');
    setError(null);
    const controller = new AbortController();
    abortRef.current = controller;
    try {
      const reply = await sendChat({ message: text, sessionId: sessionRef.current, signal: controller.signal });
      sessionRef.current = reply.sessionId;
      setMessages((prev) => [...prev, { id: newId(), role: 'assistant', content: reply.response, createdAt: Date.now(), sources: reply.sources }]);
      setSuggestions(reply.suggestions);
    } catch (err) {
      if (controller.signal.aborted) return;
      setError(isTwinError(err) ? err : makeError('unknown'));
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null;
        busyRef.current = false;
        setStatus('idle');
      }
    }
  }, []);

  const send = useCallback(
    (text: string) => {
      const invalid = validateMessage(text);
      if (invalid) return invalid;
      if (busyRef.current) return 'Please wait for the current answer to finish.';
      const content = text.trim();
      setMessages((prev) => [...prev, { id: newId(), role: 'user', content, createdAt: Date.now() }]);
      setSuggestions([]);
      void request(content);
      return null;
    },
    [request],
  );

  const retry = useCallback(() => {
    if (busyRef.current) return;
    const last = [...messages].reverse().find((m) => m.role === 'user');
    if (last) void request(last.content);
  }, [messages, request]);

  const reset = useCallback(() => {
    abortRef.current?.abort();
    abortRef.current = null;
    busyRef.current = false;
    sessionRef.current = undefined;
    setMessages([]);
    setSuggestions([]);
    setError(null);
    setStatus('idle');
  }, []);

  const openTwin = useCallback(
    (question?: string) => {
      setExpanded(true);
      if (question) send(question);
    },
    [send],
  );
  const closeTwin = useCallback(() => setExpanded(false), []);

  const value = useMemo<TwinContextValue>(
    () => ({ messages, status, error, suggestions, send, retry, reset, expanded, openTwin, closeTwin }),
    [messages, status, error, suggestions, send, retry, reset, expanded, openTwin, closeTwin],
  );

  return <TwinContext.Provider value={value}>{children}</TwinContext.Provider>;
}

export function useTwin(): TwinContextValue {
  const ctx = useContext(TwinContext);
  if (!ctx) throw new Error('useTwin must be used inside <TwinProvider>');
  return ctx;
}
