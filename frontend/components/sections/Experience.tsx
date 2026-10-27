import { TrendingUp } from 'lucide-react';
import { experience } from '@/lib/profile';
import { Reveal } from '@/components/ui/Reveal';
import { Section } from '@/components/ui/Section';
import { ChipList } from '@/components/ui/Chips';

export function Experience() {
  return (
    <Section
      id="experience"
      eyebrow="Experience"
      title="Nine years of shipping in regulated industries."
      lead="Banking, healthcare, logistics, and telecom: platforms where security, auditability, and release discipline are part of the job."
    >
      <ol className="timeline">
        {experience.map((job, i) => {
          const compact = job.impact.length === 0 && job.highlights.length <= 1;
          return (
            <li key={job.id} className="timeline__item">
              <Reveal delay={i * 40}>
                <article className="grid gap-4 md:grid-cols-[11rem_1fr] md:gap-8" aria-labelledby={`exp-${job.id}`}>
                  <header className="md:pt-6">
                    <p className="font-mono text-xs uppercase tracking-wide text-ink-subtle">
                      <time>{job.start}</time> – <time>{job.end}</time>
                    </p>
                    {job.end === 'Present' && <p className="mt-2 inline-flex items-center gap-1.5 text-xs font-medium text-accent"><span className="pulse-dot" aria-hidden /> Current role</p>}
                  </header>
                  <div className={`card card-hover ${compact ? 'p-5' : 'p-6 sm:p-7'}`}>
                    <h3 id={`exp-${job.id}`} className="text-xl font-semibold tracking-tight">
                      {job.title}
                      <span className="text-ink-subtle"> · </span>
                      <span className="text-accent">{job.company}</span>
                    </h3>
                    {job.context && <p className="mt-1 text-sm text-ink-subtle">{job.context}</p>}
                    <ul className="mt-4 space-y-2.5 text-[0.95rem] leading-relaxed text-ink-muted">
                      {job.highlights.map((h) => (
                        <li key={h} className="bullet">
                          {h}
                        </li>
                      ))}
                    </ul>
                    {job.impact.length > 0 && (
                      <div className="mt-5 rounded-xl border border-accent-line bg-accent-soft p-4">
                        <p className="flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wider text-accent">
                          <TrendingUp size={14} aria-hidden /> Impact
                        </p>
                        <ul className="mt-2 space-y-1.5 text-sm leading-relaxed text-ink">
                          {job.impact.map((m) => (
                            <li key={m} className="bullet bullet--accent">
                              {m}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    <div className="mt-5">
                      <ChipList items={job.technologies} label={`Technologies used at ${job.company}`} />
                    </div>
                  </div>
                </article>
              </Reveal>
            </li>
          );
        })}
      </ol>
    </Section>
  );
}
