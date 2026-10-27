'use client';

import { ArrowRight, Globe } from 'lucide-react';
import { GithubIcon } from '@/components/ui/BrandIcons';
import { useRef, useState } from 'react';
import { projects, type Project } from '@/lib/profile';
import { ButtonLink } from '@/components/ui/Button';
import { Reveal } from '@/components/ui/Reveal';
import { Section } from '@/components/ui/Section';
import { ChipList } from '@/components/ui/Chips';
import { FlowDiagram } from './FlowDiagram';
import { ProjectDialog } from './ProjectDialog';

export function Projects() {
  const [selected, setSelected] = useState<Project | null>(null);
  const opener = useRef<HTMLElement | null>(null);
  const featured = projects.find((p) => p.featured);
  const others = projects.filter((p) => !p.featured);

  function open(p: Project, e: React.MouseEvent<HTMLElement>) {
    opener.current = e.currentTarget;
    setSelected(p);
  }
  function close() {
    setSelected(null);
    opener.current?.focus();
  }

  return (
    <Section
      id="projects"
      eyebrow="Projects"
      title="Practical AI systems, built end to end."
      lead="Agents, MCP, and a full-stack AI application in production. Details come from what I built; nothing here is padded."
    >
      {featured && (
        <Reveal>
          <article className="card card-accent mb-6 grid grid-cols-1 gap-8 p-6 sm:p-8 lg:grid-cols-[minmax(0,1.1fr)_minmax(0,1fr)]" aria-labelledby={`project-${featured.id}`}>
            <div className="flex flex-col">
              <p className="eyebrow flex items-center gap-2">
                <span className="pulse-dot" aria-hidden /> Featured · {featured.status}
              </p>
              <h3 id={`project-${featured.id}`} className="heading-display mt-3 text-3xl sm:text-4xl">
                {featured.name}
              </h3>
              <p className="mt-3 leading-relaxed text-ink-muted">{featured.summary}</p>
              <p className="mt-4 text-sm leading-relaxed text-ink-muted">
                <strong className="font-semibold text-ink">Problem: </strong>
                {featured.problem}
              </p>
              <div className="mt-5">
                <ChipList items={featured.stack.slice(0, 8)} label="Main technologies" />
              </div>
              <div className="mt-auto flex flex-wrap items-center gap-3 pt-7">
                <button type="button" className="btn btn-primary" onClick={(e) => open(featured, e)}>
                  Read the write-up <ArrowRight size={16} aria-hidden />
                </button>
                {featured.links.demo && (
                  <ButtonLink href={featured.links.demo} icon={<Globe size={16} aria-hidden />}>
                    Live
                  </ButtonLink>
                )}
                {featured.links.github && (
                  <ButtonLink href={featured.links.github} icon={<GithubIcon size={16} />}>
                    GitHub
                  </ButtonLink>
                )}
              </div>
            </div>
            <div className="rounded-2xl border border-line bg-page p-5 sm:p-6">
              <p className="eyebrow mb-4">Request path</p>
              <FlowDiagram steps={featured.flow} label="Request path of the AI twin" />
              <p className="mt-5 border-t border-line pt-4 text-xs leading-relaxed text-ink-subtle">
                Infrastructure managed with Terraform and deployed with GitHub Actions. Model credentials stay on the server side.
              </p>
            </div>
          </article>
        </Reveal>
      )}

      <ul className="grid gap-5 md:grid-cols-3">
        {others.map((p, i) => (
          <li key={p.id}>
            <Reveal delay={i * 70} className="h-full">
              <article className="card card-hover flex h-full flex-col p-6" aria-labelledby={`project-${p.id}`}>
                <p className="eyebrow">
                  {p.kind} · {p.status}
                </p>
                <h3 id={`project-${p.id}`} className="mt-3 text-xl font-semibold leading-snug tracking-tight">
                  {p.name}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-ink-muted">{p.summary}</p>
                <div className="mt-4">
                  <ChipList items={p.stack.slice(0, 4)} label="Main technologies" />
                </div>
                <button type="button" className="link-arrow mt-auto pt-6" onClick={(e) => open(p, e)} aria-label={`View details: ${p.name}`}>
                  View details <ArrowRight size={15} aria-hidden />
                </button>
              </article>
            </Reveal>
          </li>
        ))}
      </ul>

      <ProjectDialog project={selected} onClose={close} />
    </Section>
  );
}
