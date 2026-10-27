import Image from 'next/image';
import { MapPin } from 'lucide-react';
import { profile } from '@/lib/profile';
import { Reveal } from '@/components/ui/Reveal';
import { HeroActions, HeroTwinCard } from './HeroTwin';

const FOUNDATION = ['Java 21 · Spring Boot', 'React · Next.js', 'AWS · Kubernetes', 'Secure APIs · CI/CD'];
const NOW = ['LLM agents', 'Tool calling', 'MCP servers', 'Evaluation'];

/** CSS-only entrance for above-the-fold content, so it never waits for JavaScript (keeps LCP fast). */
function Rise({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  return (
    <div className={`rise ${className}`} style={delay ? { animationDelay: `${delay}ms` } : undefined}>
      {children}
    </div>
  );
}

function BridgeStrip() {
  return (
    <div className="bridge" role="group" aria-label="From enterprise software engineering to agentic AI">
      <div className="bridge__row">
        <span className="bridge__label">Foundation</span>
        <ul>
          {FOUNDATION.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </div>
      <div className="bridge__join" aria-hidden>
        <span />
      </div>
      <div className="bridge__row bridge__row--now">
        <span className="bridge__label">Now building</span>
        <ul>
          {NOW.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      </div>
    </div>
  );
}

export function Hero() {
  return (
    <section id="home" data-nav="home" aria-labelledby="hero-title" className="hero">
      <div className="container-page grid grid-cols-1 items-center gap-12 lg:grid-cols-[minmax(0,1.15fr)_minmax(0,0.85fr)] lg:gap-16">
        <div>
          <Rise>
            <p className="eyebrow flex flex-wrap items-center gap-x-2 gap-y-1">
              <span>{profile.headline}</span>
              <span aria-hidden className="hidden size-1 rounded-full bg-line-strong sm:block" />
              <span className="inline-flex items-center gap-1 normal-case tracking-normal text-ink-subtle">
                <MapPin size={13} aria-hidden /> {profile.location}
              </span>
            </p>
          </Rise>
          <Rise delay={60}>
            <h1 id="hero-title" className="heading-display mt-5 text-[2.9rem] leading-[1.02] sm:text-6xl lg:text-[4.4rem]">
              Building intelligent software. <em className="text-accent">Exploring the future of AI.</em>
            </h1>
          </Rise>
          <Rise delay={120}>
            <p className="mt-6 max-w-xl text-lg leading-relaxed text-ink-muted sm:text-xl sm:leading-relaxed">
              <strong className="font-semibold text-ink">{profile.fullName}.</strong> {profile.heroCopy}
            </p>
          </Rise>
          <Rise delay={180}>
            <HeroActions />
          </Rise>
          <Rise delay={240}>
            <BridgeStrip />
          </Rise>
        </div>

        <Rise delay={150} className="lg:justify-self-end">
          <div className="hero-card">
            <div className="hero-card__photo">
              <Image src="/portrait.webp" alt={`Portrait of ${profile.fullName}`} width={600} height={750} priority sizes="(min-width: 1024px) 380px, 80vw" className="size-full object-cover object-top" />
              <span className="hero-card__badge">AI twin available</span>
            </div>
            <HeroTwinCard />
          </div>
        </Rise>
      </div>

      <div className="container-page mt-16 md:mt-20">
        <Reveal>
          <ul className="proof" aria-label="Documented results">
            {profile.proofPoints.map((p) => (
              <li key={p.label} className="proof__item">
                <p className="font-display text-4xl leading-none sm:text-[2.6rem]">{p.value}</p>
                <p className="mt-2 text-sm leading-snug text-ink-muted">{p.label}</p>
                <p className="mt-1 text-xs text-ink-subtle">{p.company}</p>
              </li>
            ))}
          </ul>
        </Reveal>
      </div>
    </section>
  );
}
