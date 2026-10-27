'use client';

import { AlertCircle, Maximize2, RotateCcw, Sparkles, X } from 'lucide-react';
import { useEffect, useRef } from 'react';
import { twin } from '@/lib/profile';
import { ChatMessageView, GreetingMessage } from './ChatMessageView';
import { Composer } from './Composer';
import { TwinAvatar } from './TwinAvatar';
import { useTwin } from './TwinProvider';
import { TypingIndicator } from './TypingIndicator';

interface ChatPanelProps {
  variant: 'embedded' | 'expanded';
  className?: string;
}

function prefersReducedMotion() {
  return typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;
}

export function ChatPanel({ variant, className = '' }: ChatPanelProps) {
  const { messages, status, error, suggestions, send, retry, reset, openTwin, closeTwin } = useTwin();
  const scroller = useRef<HTMLDivElement>(null);
  const lastMessage = useRef<HTMLDivElement>(null);
  const expanded = variant === 'expanded';
  const busy = status === 'sending';
  const empty = messages.length === 0;
  const starters = expanded ? twin.starters : twin.starters.slice(0, 4);

  // Keep the newest content in view by scrolling the message list itself (never the page).
  const last = messages[messages.length - 1];
  useEffect(() => {
    const box = scroller.current;
    if (!box) return;
    const behavior = prefersReducedMotion() ? 'auto' : 'smooth';
    if (last?.role === 'assistant' && lastMessage.current) {
      // Start at the top of a new answer so it can be read from the beginning.
      box.scrollTo({ top: Math.max(0, lastMessage.current.offsetTop - 12), behavior });
    } else {
      box.scrollTo({ top: box.scrollHeight, behavior });
    }
  }, [messages.length, last?.role, busy, error]);

  return (
    <section
      aria-label="Conversation with Omar's AI twin"
      className={`flex min-h-0 flex-col overflow-hidden border border-line chat-panel ${expanded ? 'rounded-none sm:rounded-3xl' : 'rounded-3xl shadow-md'} ${className}`}
    >
      <header className="flex items-center gap-3 border-b border-line bg-surface px-4 py-3">
        <TwinAvatar size={40} />
        <div className="min-w-0 flex-1">
          <h3 className="truncate font-semibold leading-tight">Omar&apos;s AI twin</h3>
          <p className="flex items-center gap-1.5 text-xs text-ink-subtle">
            <Sparkles size={12} aria-hidden className="shrink-0 text-accent" />
            <span className="truncate">AI representation, grounded in my documented profile</span>
          </p>
        </div>
        <button
          type="button"
          className="btn btn-ghost btn-sm"
          onClick={reset}
          disabled={empty && !busy}
          aria-label="Start a new conversation"
        >
          <RotateCcw size={15} aria-hidden />
          <span className="hidden sm:inline">New chat</span>
        </button>
        {expanded ? (
          <button type="button" className="btn btn-ghost btn-sm" onClick={closeTwin} aria-label="Close expanded chat">
            <X size={17} aria-hidden />
          </button>
        ) : (
          <button type="button" className="btn btn-ghost btn-sm" onClick={() => openTwin()} aria-label="Expand chat to full screen">
            <Maximize2 size={15} aria-hidden />
            <span className="hidden sm:inline">Expand</span>
          </button>
        )}
      </header>

      <div
        ref={scroller}
        role="log"
        aria-live="polite"
        aria-relevant="additions"
        aria-busy={busy}
        tabIndex={0}
        className="min-h-0 flex-1 space-y-4 overflow-y-auto overscroll-contain scroll-smooth px-3 py-4 sm:px-5"
      >
        <GreetingMessage text={twin.greeting} />

        {empty && (
          <div className="pl-11">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-ink-subtle">Try asking</p>
            <ul className="flex flex-wrap gap-2">
              {starters.map((q) => (
                <li key={q}>
                  <button type="button" className="chip-btn" onClick={() => send(q)}>
                    {q}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}

        {messages.map((m, i) => (
          <div key={m.id} ref={i === messages.length - 1 ? lastMessage : undefined} className="animate-in">
            <ChatMessageView message={m} />
          </div>
        ))}

        {busy && <TypingIndicator />}

        {error && (
          <div role="alert" className="ml-11 flex flex-col gap-3 rounded-2xl border border-danger/30 bg-danger-soft px-4 py-3 text-sm">
            <div className="flex items-start gap-2.5">
              <AlertCircle size={18} aria-hidden className="mt-0.5 shrink-0 text-danger" />
              <div>
                <p className="font-medium text-danger">{error.message}</p>
                {error.requestId && <p className="mt-1 font-mono text-xs text-ink-subtle">Reference: {error.requestId}</p>}
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              {error.retryable && (
                <button type="button" className="btn btn-secondary btn-sm" onClick={retry}>
                  Try again
                </button>
              )}
              {!error.retryable && (
                <button type="button" className="btn btn-secondary btn-sm" onClick={reset}>
                  Start a new conversation
                </button>
              )}
            </div>
          </div>
        )}

        {!busy && !error && suggestions.length > 0 && (
          <div className="pl-11">
            <p className="mb-2 text-xs font-medium uppercase tracking-wider text-ink-subtle">Follow up</p>
            <ul className="flex flex-wrap gap-2">
              {suggestions.map((q) => (
                <li key={q}>
                  <button type="button" className="chip-btn" onClick={() => send(q)}>
                    {q}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      <div className="border-t border-line bg-surface">
        <Composer onSend={send} busy={busy} autoFocus={expanded} />
      </div>
    </section>
  );
}
