import raw from '@/content/profile.json';

/**
 * Typed access to the shared profile (`/content/profile.json` at the repo root).
 * The same file grounds the AI twin on the backend, so edit the JSON, not this module.
 */

export interface ProofPoint {
  value: string;
  label: string;
  company: string;
}

export interface Principle {
  title: string;
  body: string;
  evidence: string;
}

export interface Experience {
  id: string;
  company: string;
  title: string;
  start: string;
  end: string;
  context: string;
  highlights: string[];
  impact: string[];
  technologies: string[];
}

export interface SkillGroup {
  id: string;
  title: string;
  status: 'hands-on' | 'core' | 'exploring';
  items: string[];
  note?: string;
}

export interface Project {
  id: string;
  name: string;
  featured: boolean;
  status: string;
  kind: string;
  summary: string;
  problem: string;
  approach: string[];
  stack: string[];
  flow: string[];
  links: { github?: string; demo?: string };
  limits: string;
}

export interface LearningItem {
  title: string;
  detail: string;
  kind?: string;
}

export interface Profile {
  meta: { version: string };
  profile: {
    fullName: string;
    preferredName: string;
    headline: string;
    location: string;
    yearsExperience: number;
    summary: string;
    heroHeadline: string;
    heroCopy: string;
    about: string[];
    principles: Principle[];
    links: { email: string; linkedin: string; github: string; site: string };
    proofPoints: ProofPoint[];
  };
  experience: Experience[];
  skills: SkillGroup[];
  projects: Project[];
  learning: {
    now: LearningItem[];
    completed: LearningItem[];
    building: LearningItem[];
    engineeringNotes: LearningItem[];
    focus: string;
  };
  education: { title: string; institution: string; detail: string }[];
  twin: {
    greeting: string;
    starters: string[];
    followups: Record<string, string[]>;
  };
}

export const data = raw as unknown as Profile;
export const { profile, experience, skills, projects, learning, education, twin } = data;
