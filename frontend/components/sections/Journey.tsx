import { BadgeCheck, Hammer, Lightbulb, Target } from 'lucide-react';
import { learning, type LearningItem } from '@/lib/profile';
import { Reveal } from '@/components/ui/Reveal';
import { Section } from '@/components/ui/Section';

function Column({ title, icon, items, delay }: { title: string; icon: React.ReactNode; items: LearningItem[]; delay: number }) {
  return (
    <Reveal delay={delay} className="h-full">
      <section className="card h-full p-6" aria-label={title}>
        <h3 className="flex items-center gap-2.5 font-semibold">
          <span className="grid size-8 place-items-center rounded-lg bg-accent-soft text-accent">{icon}</span>
          {title}
        </h3>
        <ul className="mt-5 space-y-4">
          {items.map((item) => (
            <li key={item.title}>
              <p className="text-[0.95rem] font-medium leading-snug">{item.title}</p>
              <p className="mt-1 text-sm leading-relaxed text-ink-muted">{item.detail}</p>
            </li>
          ))}
        </ul>
      </section>
    </Reveal>
  );
}

export function Journey() {
  return (
    <Section
      id="journey"
      nav="projects"
      eyebrow="AI engineering journey"
      title="What I'm learning, building, and taking away."
      lead="A factual log rather than a progress bar: courses I've finished, work in progress, and lessons that come from the code in this repository."
    >
      <div className="grid gap-5 md:grid-cols-2 lg:grid-cols-4">
        <Column title="Completed" icon={<BadgeCheck size={17} aria-hidden />} items={learning.completed} delay={0} />
        <Column title="In progress" icon={<Lightbulb size={17} aria-hidden />} items={learning.now} delay={60} />
        <Column title="Building" icon={<Hammer size={17} aria-hidden />} items={learning.building} delay={120} />
        <Column title="Lessons from this build" icon={<Target size={17} aria-hidden />} items={learning.engineeringNotes} delay={180} />
      </div>
      <Reveal delay={100}>
        <p className="mt-6 flex flex-wrap items-baseline gap-x-3 gap-y-1 rounded-2xl border border-line bg-surface px-6 py-5">
          <span className="eyebrow">Current focus</span>
          <span className="font-display text-2xl sm:text-3xl">{learning.focus}</span>
        </p>
      </Reveal>
    </Section>
  );
}
