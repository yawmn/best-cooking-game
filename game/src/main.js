// Kuroshio Express: Ekiben Bento — architecture:
// RECIPES (4 bento boxes) · STATIONS (rice/grill/fryer cookers) ·
// BENTO_ASSEMBLY (one compartment per recipe ingredient) ·
// STATION_RUSH (+50% tips in the 12 s before each stop) ·
// PROCEDURAL_CANVAS_ART (all art drawn in code) · WEB_AUDIO_SFX (synth, no files).
// No external assets, no network, no copied art/music/names.
// This file: boot and the one loop — input every frame, the world advances
// in fixed 1/60 s steps, the renderer paints what is there. Screens: title, play,
// paused, end-of-shift. ?seed=N fixes the pattern. ?shot=start|play|rush|end
// (with &seed=N) stages that scene instead, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, LAYOUT, STEP } from './config.js';
import { createRandom } from './random.js';
import { createWorld, EVENT_BAD, EVENT_BURN, EVENT_OVER, EVENT_READY, EVENT_SERVE, EVENT_WALK } from './world.js';
import { ACTION_CONFIRM, ACTION_PAUSE, ACTION_SERVE, createInput } from './input.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

const MAX_FRAME = 0.25;
const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const world = createWorld(createRandom(seed));
const renderer = createRenderer(canvas);

// --- AUDIO: tiny WebAudio synth, no files. Created on the first gesture. ---
let audioCtx = null;
function beep(freq, dur, type = 'sine', gain = 0.08, when = 0) {
  try {
    audioCtx = audioCtx ?? new (window.AudioContext || window.webkitAudioContext)();
    if (audioCtx.state === 'suspended') void audioCtx.resume();
    const t = audioCtx.currentTime + when;
    const o = audioCtx.createOscillator(); const g = audioCtx.createGain();
    o.type = type; o.frequency.setValueAtTime(freq, t);
    g.gain.setValueAtTime(gain, t); g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(audioCtx.destination); o.start(t); o.stop(t + dur);
  } catch { /* sound is optional */ }
}
function soundFor(events) {
  if (events & EVENT_SERVE) { beep(660, 0.12); beep(880, 0.18, 'sine', 0.08, 0.1); }
  else if (events & EVENT_READY) beep(880, 0.1, 'triangle');
  else if (events & EVENT_BURN) beep(140, 0.25, 'sawtooth', 0.06);
  else if (events & EVENT_WALK) { beep(330, 0.15, 'sine', 0.06); beep(220, 0.2, 'sine', 0.06, 0.12); }
  else if (events & EVENT_BAD) beep(160, 0.12, 'square', 0.05);
  else if (events & EVENT_OVER) { beep(523, 0.15); beep(659, 0.15, 'sine', 0.08, 0.14); beep(784, 0.25, 'sine', 0.08, 0.28); }
}

function readBest() {
  try { return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0; } catch { return 0; }
}
function saveBest(value) {
  try { window.localStorage.setItem(BEST_KEY, String(value)); } catch { /* private window */ }
}

function runShot(name) {
  const scene = stageShot(name, world);
  // Debug hook, same as the live game: lets a screenshot driver read the
  // staged state (station states, timer, over flag) to verify the frame.
  window.__world = world;
  let painted = 0;
  function paint() {
    renderer.draw(world.state, scene.screen, scene.best);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  function announce(message) { status.textContent = message; }
  function startGame() {
    world.reset(); accumulator = 0; screen = SCREEN_PLAY;
    announce('Playing. Fill the bento boxes, serve with Space.');
  }
  function endGame() {
    screen = SCREEN_OVER;
    if (world.state.till > best) { best = world.state.till; saveBest(best); }
    announce(`End of shift. Till $${world.state.till}. Served ${world.state.served}. Best $${best}.`);
  }

  function stationAt(p) {
    const s = LAYOUT.stations;
    if (p.x < s.x || p.x > s.x + s.w || p.y < s.y || p.y > s.y + s.h) return -1;
    const i = Math.floor((p.y - s.y) / 82);
    return i >= 0 && i < 3 ? i : -1;
  }
  function boxAt(p) {
    const b = LAYOUT.bento;
    if (p.y < b.y || p.y > b.y + b.h) return -1;
    if (p.x >= b.x && p.x < b.x + 408) return 0;
    if (p.x >= b.x + 428 && p.x < b.x + 428 + 408) return 1;
    return -1;
  }
  function railAt(p) {
    const r = LAYOUT.rail;
    if (p.y < r.y || p.y > r.y + r.h || p.x < r.x || p.x > r.x + r.w) return -1;
    return Math.min(11, Math.floor((p.x - r.x) / 102.4));
  }

  function handleClick(p) {
    if (!p || screen !== SCREEN_PLAY) return;
    const si = stationAt(p);
    if (si >= 0) { soundFor(world.collectStation(si)); return; }
    const bi = boxAt(p);
    if (bi >= 0) {
      const box = world.state.boxes[bi];
      const recipe = world.recipeForBox(box);
      if (recipe && box.filled.length === recipe.needs.length && !world.state.held) {
        world.state.activeBox = bi;
        const ev = world.serve();
        soundFor(ev);
        if (ev & EVENT_OVER) endGame();
        return;
      }
      soundFor(world.clickBox(bi));
      return;
    }
    const ri = railAt(p);
    if (ri >= 0) {
      const id = ['rice', 'nori', 'salmon', 'tamago', 'shrimp', 'octopus', 'edamame', 'ume', 'shiso', 'sesame', 'teriyaki', 'tea'][ri];
      if (!world.tryIngredient(id)) soundFor(EVENT_BAD);
      else if (world.state.held) beep(520, 0.07, 'triangle', 0.05);
    }
  }

  function handleActions() {
    const actions = input.takeActions();
    const click = input.takeClick();
    const keyIng = input.takeIngredientKey();
    if (screen === SCREEN_TITLE || screen === SCREEN_OVER) {
      if (actions & ACTION_CONFIRM) startGame();
      return;
    }
    if (screen === SCREEN_PAUSED) {
      if (actions & (ACTION_PAUSE | ACTION_CONFIRM)) { screen = SCREEN_PLAY; announce('Playing.'); }
      return;
    }
    // SCREEN_PLAY
    if (actions & ACTION_PAUSE) { screen = SCREEN_PAUSED; announce('Paused.'); return; }
    if (keyIng) {
      if (!world.tryIngredient(keyIng)) soundFor(EVENT_BAD);
      else if (world.state.held) beep(520, 0.07, 'triangle', 0.05);
    }
    if (click) handleClick(click);
    if (actions & ACTION_SERVE) {
      const ev = world.serve();
      soundFor(ev);
      if (ev & EVENT_OVER) endGame();
    }
  }

  function step() {
    if (screen === SCREEN_TITLE) { world.step(STEP, true); return; }
    const events = world.step(STEP, false);
    soundFor(events);
    if (events & EVENT_OVER) endGame();
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleActions();
    if (screen === SCREEN_TITLE || screen === SCREEN_PLAY) {
      while (accumulator >= STEP && (screen === SCREEN_TITLE || screen === SCREEN_PLAY)) {
        step(); accumulator -= STEP;
      }
    } else accumulator = 0;
    renderer.draw(world.state, screen, best);
  }

  // Debug hook for automated playtests (read-only state inspection).
  window.__world = world;
  window.__getScreen = () => screen;

  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) { screen = SCREEN_PAUSED; announce('Paused.'); }
  });

  announce('Kuroshio Express. Press Space or click to start.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
