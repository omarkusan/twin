// Copies the repo-level profile (single source of truth shared with the AI twin's backend)
// into the frontend so it can be imported with a normal module path.
import { copyFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const here = dirname(fileURLToPath(import.meta.url));
const source = resolve(here, '../../content/profile.json');
const target = resolve(here, '../content/profile.json');

if (!existsSync(source)) {
  console.error(`sync-content: ${source} not found`);
  process.exit(1);
}
mkdirSync(dirname(target), { recursive: true });
copyFileSync(source, target);
console.log('sync-content: content/profile.json updated');
