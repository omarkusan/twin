import { describe, expect, it } from 'vitest';
import { data } from '@/lib/profile';

const urls = (obj: unknown): string[] => JSON.stringify(obj).match(/https?:\/\/[^"\s)]+/g) ?? [];

describe('profile content', () => {
  it('has complete experience entries', () => {
    expect(data.experience.length).toBeGreaterThan(0);
    for (const job of data.experience) {
      expect(job.company, job.id).toBeTruthy();
      expect(job.title, job.id).toBeTruthy();
      expect(job.start, job.id).toMatch(/^[A-Z][a-z]{2} \d{4}$/);
      expect(job.end, job.id).toMatch(/^([A-Z][a-z]{2} \d{4}|Present)$/);
      expect(job.highlights.length, job.id).toBeGreaterThan(0);
    }
  });

  it('only uses https links and has no placeholder text', () => {
    for (const url of urls(data)) expect(url.startsWith('https://'), url).toBe(true);
    expect(JSON.stringify(data)).not.toMatch(/lorem|TODO|TBD|example\.com|your_/i);
  });

  it('lists exactly one featured project and no fabricated links for the others', () => {
    expect(data.projects.filter((p) => p.featured)).toHaveLength(1);
    for (const p of data.projects.filter((p) => !p.featured)) expect(p.links, p.id).toEqual({});
  });

  it('keeps contact details to the documented public channels', () => {
    const { links } = data.profile;
    expect(links.email).toMatch(/^[^@\s]+@[^@\s]+\.[a-z]+$/);
    expect(JSON.stringify(data)).not.toMatch(/\b\d{3}[.\-\s]\d{3}[.\-\s]\d{4}\b/); // no phone numbers
  });

  it('labels exploratory skills as exploring', () => {
    const exploring = data.skills.find((s) => s.status === 'exploring');
    expect(exploring?.items.join(' ')).toMatch(/RAG|Retrieval/);
  });

  it('provides starters for the twin', () => {
    expect(data.twin.starters.length).toBeGreaterThanOrEqual(4);
  });
});
