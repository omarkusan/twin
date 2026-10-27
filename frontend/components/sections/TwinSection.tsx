'use client';

import { FlaskConical, Maximize2, ShieldCheck, Sparkles } from 'lucide-react';
import { ChatPanel } from '@/components/twin/ChatPanel';
import { useTwin } from '@/components/twin/TwinProvider';
import { Reveal } from '@/components/ui/Reveal';
import { Section } from '@/components/ui/Section';

const PRINCIPLES = [
  {
    icon: Sparkles,
    title: 'Grounded in a structured profile',
    body: 'Answers come from one verified JSON profile, the same file that renders this site. The whole profile fits in the prompt, so there is no vector database to maintain.',
  },
  {
    icon: ShieldCheck,
    title: 'Honest about gaps',
    body: "If something isn't documented, the twin says so instead of improvising. It separates my documented experience from general technical explanation.",
  },
  {
    icon: FlaskConical,
    title: 'Tested like software',
    body: 'Offline tests and a separate live evaluation suite check grounding, missing information, invented achievements, and prompt-extraction attempts.',
  },
];

export function TwinSection() {
  const { expanded, openTwin } = useTwin();
  return (
    <Section
      id="twin"
      eyebrow="AI Digital Twin"
      title="Don't just read about me. Ask."
      lead="This is an AI representation of me. It answers from my documented background, explains technical topics, and tells you when it doesn't know."
    >
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)]">
        <Reveal>
          {expanded ? (
            <div className="grid h-[34rem] place-items-center rounded-3xl border border-dashed border-line-strong bg-surface-muted/50 p-8 text-center">
              <div>
                <Maximize2 size={22} aria-hidden className="mx-auto text-accent" />
                <p className="mt-3 font-medium">The conversation is open in expanded view.</p>
                <p className="mt-1 text-sm text-ink-subtle">Close it to continue here. Your messages are kept.</p>
              </div>
            </div>
          ) : (
            <ChatPanel variant="embedded" className="h-[34rem] sm:h-[38rem]" />
          )}
        </Reveal>

        <div className="space-y-4">
          {PRINCIPLES.map((p, i) => (
            <Reveal key={p.title} delay={i * 70}>
              <article className="card p-5">
                <h3 className="flex items-center gap-2.5 font-semibold">
                  <p.icon size={18} aria-hidden className="text-accent" />
                  {p.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">{p.body}</p>
              </article>
            </Reveal>
          ))}
          <Reveal delay={220}>
            <p className="px-1 text-xs leading-relaxed text-ink-subtle">
              Messages are sent to Amazon Bedrock and stored server-side so follow-up questions have context. Please don&apos;t share sensitive information.{' '}
              <button type="button" className="underline underline-offset-2 hover:text-accent" onClick={() => openTwin()}>
                Open full-screen chat
              </button>
            </p>
          </Reveal>
        </div>
      </div>
    </Section>
  );
}
