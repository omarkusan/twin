import { FlaskConical } from 'lucide-react';
import { skills } from '@/lib/profile';
import { Reveal } from '@/components/ui/Reveal';
import { Section } from '@/components/ui/Section';

export function Skills() {
  const ai = skills.find((s) => s.id === 'ai');
  const rest = skills.filter((s) => s.id !== 'ai');

  return (
    <Section
      id="skills"
      nav="experience"
      eyebrow="Technical skills"
      title="Depth where it counts, and honest about the frontier."
      lead="Core strengths come from production work. AI engineering is hands-on and growing; areas still being explored are labelled as such."
    >
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-6">
        {ai && (
          <Reveal className="md:col-span-2 lg:col-span-6">
            <article className="card card-accent p-6 sm:p-8">
              <div className="flex flex-wrap items-baseline justify-between gap-2">
                <h3 className="font-display text-3xl">{ai.title}</h3>
                <p className="eyebrow">Hands-on · growing</p>
              </div>
              <ul className="mt-5 grid gap-x-8 gap-y-2.5 sm:grid-cols-2 lg:grid-cols-3">
                {ai.items.map((item) => (
                  <li key={item} className="bullet bullet--accent text-[0.95rem] leading-snug text-ink">
                    {item}
                  </li>
                ))}
              </ul>
            </article>
          </Reveal>
        )}
        {rest.map((group, i) => {
          const exploring = group.status === 'exploring';
          return (
            <Reveal key={group.id} delay={(i % 3) * 60} className="lg:col-span-2">
              <article className={`card h-full p-6 ${exploring ? 'card-dashed' : 'card-hover'}`}>
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-semibold">{group.title}</h3>
                  {exploring && (
                    <span className="inline-flex items-center gap-1 text-xs font-medium text-accent">
                      <FlaskConical size={13} aria-hidden /> Exploring
                    </span>
                  )}
                </div>
                <ul className="mt-4 space-y-1.5 text-sm leading-snug text-ink-muted">
                  {group.items.map((item) => (
                    <li key={item} className="bullet">
                      {item}
                    </li>
                  ))}
                </ul>
                {group.note && <p className="mt-4 border-t border-line pt-3 text-xs leading-relaxed text-ink-subtle">{group.note}</p>}
              </article>
            </Reveal>
          );
        })}
      </div>
    </Section>
  );
}
