// Kuroshio Express: Ekiben Bento — entrypoint for the make.fun cooking-game bounty.
//
// What this program does, in three moves:
//   1. copies the playable game (game/) and its screenshots (screenshots/) into the
//      output directory the grader reads (/output, or MAKEFUN_OUTPUT_DIR locally),
//   2. asks the vendored make.fun library to summarise that directory as a dossier,
//   3. writes the dossier to /output/dossier.json and checks the result before exiting.
//
// The game itself is plain static files: game/index.html plus ES modules under
// game/src/, no libraries, no network requests, playable offline in desktop Chrome.
// Serve it locally with `node serve.ts`, then open http://localhost:8080.
// Outside the grader's container, MAKEFUN_OUTPUT_DIR stands in for /output:
//   mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
//
// Node 22, standard library only — no build step, no install. Written as plain
// JavaScript in a .ts file so it runs under `node main.ts` with no flags.

import { cpSync, existsSync, mkdirSync, readdirSync, statSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildDossier } from './vendor/makefun-game.ts';

// ---------------------------------------------------------------- configuration

// The scorer's gate caps (reference/gate.json): only text_max_bytes shapes the
// dossier bytes; the other caps make this program refuse an entry the scorer
// would refuse — more than 4 screenshots or one over 256 KiB, more than 993
// entries or 48 MiB in game/, or a game path over 1000 bytes.
const GATE_CAPS = {
  text_max_bytes: 163840,
  screenshots: { max: 4, max_bytes: 262144 },
  game_max_files: 993,
  game_max_bytes: 50331648,
  game_path_max_bytes: 1000,
};

// The dossier must stay under the platform's 1.5 MiB ceiling.
const DOSSIER_MAX_BYTES = 1572864;

// A screenshot the gate accepts: a PNG or JPEG under the 256 KiB cap.
const SHOT_SUFFIXES = ['.png', '.jpg', '.jpeg'];

// ---------------------------------------------------------------- small helpers

// The directory this file lives in — the repository root.
function repoRoot() {
  return fileURLToPath(new URL('.', import.meta.url));
}

// Where the entry goes: the grader's /output, or MAKEFUN_OUTPUT_DIR locally.
function outputDir() {
  const local = process.env.MAKEFUN_OUTPUT_DIR;
  return local === undefined || local === '' ? '/output' : local;
}

// How many entries (files plus directories) a tree holds, walked recursively.
function countEntries(dir) {
  let total = 0;
  for (const name of readdirSync(dir)) {
    const path = join(dir, name);
    total += 1;
    if (statSync(path).isDirectory()) total += countEntries(path);
  }
  return total;
}

// The screenshot files of a directory, in name order, with their sizes.
function listShots(dir) {
  return readdirSync(dir)
    .filter((name) => SHOT_SUFFIXES.some((suffix) => name.toLowerCase().endsWith(suffix)))
    .sort()
    .map((name) => ({ name, bytes: statSync(join(dir, name)).size }));
}

// ---------------------------------------------------------------- the three moves

// Copy game/ and screenshots/ beside this file into the output directory.
function handInGame(root, out) {
  const gameSrc = join(root, 'game');
  const shotsSrc = join(root, 'screenshots');
  if (!existsSync(gameSrc)) throw new Error('game/: no such directory beside ' + root);
  if (!existsSync(join(gameSrc, 'index.html'))) throw new Error('game/index.html: missing — a game needs its page at game/');

  mkdirSync(out, { recursive: true });
  cpSync(gameSrc, join(out, 'game'), { recursive: true });
  const gameEntries = countEntries(join(out, 'game'));

  mkdirSync(join(out, 'screenshots'), { recursive: true });
  if (!existsSync(shotsSrc)) throw new Error('screenshots/: no such directory beside the entrypoint');
  cpSync(shotsSrc, join(out, 'screenshots'), { recursive: true });
  const shots = listShots(join(out, 'screenshots'));
  if (shots.length < 3) throw new Error('screenshots/: only ' + shots.length + ' image(s), the bounty needs 3 or 4');
  for (const shot of shots) {
    if (shot.bytes > GATE_CAPS.screenshots.max_bytes) {
      throw new Error('screenshots/' + shot.name + ': ' + shot.bytes + ' bytes, over the ' + GATE_CAPS.screenshots.max_bytes + ' a screenshot may be');
    }
  }
  return { gameEntries, shots };
}

// Build the dossier for the handed-in directory and write it to dossier.json.
function writeDossier(out) {
  const bytes = buildDossier(out, {
    text_max_bytes: GATE_CAPS.text_max_bytes,
    screenshots: { max: GATE_CAPS.screenshots.max, max_bytes: GATE_CAPS.screenshots.max_bytes },
    game_max_files: GATE_CAPS.game_max_files,
    game_max_bytes: GATE_CAPS.game_max_bytes,
    game_path_max_bytes: GATE_CAPS.game_path_max_bytes,
  });
  if (bytes.length > DOSSIER_MAX_BYTES) {
    throw new Error('dossier.json: ' + bytes.length + ' bytes, over the ' + DOSSIER_MAX_BYTES + ' allowed');
  }
  writeFileSync(join(out, 'dossier.json'), bytes);
  return bytes.length;
}

// Sanity-check the finished output before reporting success.
function verifyHandIn(out, shots) {
  const dossierPath = join(out, 'dossier.json');
  if (!existsSync(dossierPath)) throw new Error('dossier.json: was not written');
  if (statSync(dossierPath).size === 0) throw new Error('dossier.json: empty');
  if (!existsSync(join(out, 'game', 'index.html'))) throw new Error('game/index.html: did not reach the output');
  for (const shot of shots) {
    if (!existsSync(join(out, 'screenshots', shot.name))) throw new Error('screenshots/' + shot.name + ': did not reach the output');
  }
}

// ---------------------------------------------------------------- main

function main() {
  const root = repoRoot();
  const out = outputDir();
  const { gameEntries, shots } = handInGame(root, out);
  const dossierBytes = writeDossier(out);
  verifyHandIn(out, shots);
  console.log('BUILD-OK: game/ (' + gameEntries + ' entries) + ' + shots.length + ' screenshots copied to ' + out);
  console.log('BUILD-OK: screenshots: ' + shots.map((s) => s.name + ' (' + s.bytes + ' bytes)').join(', '));
  console.log('BUILD-OK: dossier.json written (' + dossierBytes + ' bytes)');
}

try {
  main();
} catch (err) {
  console.error('BUILD-FAIL: ' + err.message);
  process.exit(1);
}
