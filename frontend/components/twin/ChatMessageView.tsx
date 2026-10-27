'use client';

import { BookOpenText, Check, Copy } from 'lucide-react';
import { lazy, Suspense, useState } from 'react';
import { copyText } from '@/lib/clipboard';
import type { ChatMessage } from '@/lib/twin/types';
import { TwinAvatar } from './TwinAvatar';

// Markdown + syntax highlighting is only needed once the twin has answered, so load it on demand.
const Markdown = lazy(() => import('./Markdown'));

function CopyMessage({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      type="button"
      className="icon-btn"
      aria-label={copied ? 'Answer copied' : 'Copy answer'}
      onClick={async () => {
        if (await copyText(text)) {
          setCopied(true);
          window.setTimeout(() => setCopied(false), 1800);
        }
      }}
    >
      {copied ? <Check size={15} aria-hidden /> : <Copy size={15} aria-hidden />}
    </button>
  );
}

export function GreetingMessage({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3">
      <TwinAvatar size={32} className="mt-0.5 shrink-0" />
      <div className="max-w-[min(100%,40rem)] rounded-2xl rounded-tl-md border border-line bg-surface px-4 py-3 text-[0.95rem] leading-relaxed shadow-sm">
        <p className="sr-only">AI twin says:</p>
        {text}
      </div>
    </div>
  );
}

export function ChatMessageView({ message }: { message: ChatMessage }) {
  if (message.role === 'user') {
    return (
      <div className="flex justify-end">
        <div className="max-w-[min(85%,36rem)] whitespace-pre-wrap break-words rounded-2xl rounded-tr-md bg-ink px-4 py-2.5 text-[0.95rem] leading-relaxed text-page">
          <p className="sr-only">You said:</p>
          {message.content}
        </div>
      </div>
    );
  }

  return (
    <div className="group flex items-start gap-3">
      <TwinAvatar size={32} className="mt-0.5 shrink-0" />
      <div className="min-w-0 max-w-[min(100%,42rem)]">
        <div className="rounded-2xl rounded-tl-md border border-line bg-surface px-4 py-3 text-[0.95rem] leading-relaxed shadow-sm">
          <p className="sr-only">AI twin says:</p>
          <Suspense fallback={<p className="whitespace-pre-wrap">{message.content}</p>}>
            <Markdown>{message.content}</Markdown>
          </Suspense>
        </div>
        <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 pl-1">
          <CopyMessage text={message.content} />
          {message.sources && message.sources.length > 0 && (
            <p className="flex min-w-0 flex-wrap items-center gap-1.5 text-xs text-ink-subtle">
              <BookOpenText size={13} aria-hidden className="shrink-0" />
              <span className="shrink-0">Related profile sections:</span>
              {message.sources.map((s) => (
                <span key={s.id} className="rounded-full border border-line bg-surface-muted px-2 py-0.5 text-ink-muted">
                  {s.title}
                </span>
              ))}
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
