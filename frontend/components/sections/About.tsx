import { GraduationCap, Layers, ShieldCheck, Bot } from 'lucide-react';
import { education, profile } from '@/lib/profile';
import { Reveal } from '@/components/ui/Reveal';
import { Section } from '@/components/ui/Section';

const ICONS = [Layers, ShieldCheck, Bot];

export function About() {
  return (
    <Section id="about" eyebrow="About" title="An enterprise engineer, now building agents.">
      <div className="grid grid-cols-1 gap-12 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,1fr)] lg:gap-16">
        <div className="space-y-5 text-[1.05rem] leading-[1.75] text-ink-muted">
          {profile.about.map((p, i) => (
            <Reveal key={i} delay={i * 60}>
              <p>{p}</p>
            </Reveal>
          ))}
          <Reveal delay={200}>
            <p className="flex items-start gap-3 rounded-2xl border border-line bg-surface p-4 text-sm leading-relaxed">
              <GraduationCap size={20} aria-hidden className="mt-0.5 shrink-0 text-accent" />
              <span>
                <strong className="font-semibold text-ink">{education[0].title}</strong>, {education[0].institution}.{' '}
                <span className="text-ink-subtle">{education[0].detail}</span>
              </span>
            </p>
          </Reveal>
        </div>

        <div>
          <h3 className="eyebrow mb-4">How I work</h3>
          <ul className="space-y-4">
            {profile.principles.map((p, i) => {
              const Icon = ICONS[i % ICONS.length];
              return (
                <li key={p.title}>
                  <Reveal delay={i * 80}>
                    <article className="card card-hover p-5">
                      <div className="flex items-center gap-3">
                        <span className="grid size-9 place-items-center rounded-lg bg-accent-soft text-accent">
                          <Icon size={18} aria-hidden />
                        </span>
                        <h4 className="font-semibold">{p.title}</h4>
                      </div>
                      <p className="mt-3 text-sm leading-relaxed text-ink-muted">{p.body}</p>
                      <p className="mt-3 border-t border-line pt-3 text-xs leading-relaxed text-ink-subtle">
                        <span className="font-medium text-ink-muted">Evidence: </span>
                        {p.evidence}
                      </p>
                    </article>
                  </Reveal>
                </li>
              );
            })}
          </ul>
        </div>
      </div>
    </Section>
  );
}
