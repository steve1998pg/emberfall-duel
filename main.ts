// SPDX-License-Identifier: MIT
// Emberfall Duel — the make.fun entrypoint. Run with `node main.ts` (Node 22+,
// no flags, no build, no install). It hands the game in: copies game/ and
// screenshots/ into /output and writes /output/dossier.json with the kit's
// dossier library, so the dossier the scorer rebuilds is the dossier here.
import { buildDossier } from './vendor/makefun-game.ts';
import { createHash } from 'node:crypto';
import {
  cpSync,
  existsSync,
  mkdirSync,
  readdirSync,
  rmSync,
  statSync,
  writeFileSync,
} from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

// The grader may point output elsewhere via MAKEFUN_OUTPUT_DIR; default
// stays /output as the kit expects.
const OUT = process.env.MAKEFUN_OUTPUT_DIR || '/output';
// The grader runs `node /bot/main.ts` from an arbitrary cwd, so the game
// tree must be located relative to this script, not process.cwd().
const ROOT = dirname(fileURLToPath(import.meta.url));

// Drop a previous hand-in first, so a stale file can never survive into
// this one: the dossier must describe exactly what is copied below.
for (const stale of ['game', 'screenshots', 'dossier.json']) {
  const path = join(OUT, stale);
  if (existsSync(path)) rmSync(path, { recursive: true, force: true });
}

function copyTree(src: string, dest: string): number {
  let files = 0;
  mkdirSync(dest, { recursive: true });
  for (const entry of readdirSync(src).sort()) {
    const from = join(src, entry);
    const to = join(dest, entry);
    if (statSync(from).isDirectory()) {
      files += copyTree(from, to);
    } else {
      cpSync(from, to);
      files += 1;
    }
  }
  return files;
}

const gameFiles = copyTree(join(ROOT, 'game'), join(OUT, 'game'));
const shotFiles = copyTree(join(ROOT, 'screenshots'), join(OUT, 'screenshots'));

const dossier = buildDossier(OUT, {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
});
writeFileSync(join(OUT, 'dossier.json'), dossier);

const sha256 = createHash('sha256').update(dossier).digest('hex');
console.log(`game/: ${gameFiles} files`);
console.log(`screenshots/: ${shotFiles} files`);
console.log(`dossier.json: ${dossier.length} bytes, sha256 ${sha256}`);
