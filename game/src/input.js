// Kuroshio Express: Ekiben Bento — architecture:
// RECIPES (4 bento boxes) · STATIONS (rice/grill/fryer cookers) ·
// BENTO_ASSEMBLY (one compartment per recipe ingredient) ·
// STATION_RUSH (+50% tips in the 12 s before each stop) ·
// PROCEDURAL_CANVAS_ART (all art drawn in code) · WEB_AUDIO_SFX (synth, no files).
// No external assets, no network, no copied art/music/names.
// This file: keyboard and pointer input for the game.
// Keys 1-9/Q/W/E pick an ingredient; SPACE serves; P pauses; Enter/Space confirms.
// Pointer clicks are reported as logical field coordinates (the main loop maps
// them to stations, bento boxes, the rail and the serve area). One-shot presses
// are queued as bit flags and taken once, so a press is never lost or double-counted.
import { ING_BY_KEY } from './config.js';

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_SERVE = 4;

const PAUSE = new Set(['KeyP', 'Escape']);
const SERVE = new Set(['Space']);

export function createInput(canvas) {
  let actions = 0;
  let click = null; // {x, y} in logical field coordinates, taken once
  let ingredientKey = null; // ingredient id pressed this frame

  function toLogical(event) {
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(rect.width / 1280, rect.height / 720);
    const ox = (rect.width - 1280 * scale) / 2;
    const oy = (rect.height - 720 * scale) / 2;
    return { x: (event.clientX - rect.left - ox) / scale, y: (event.clientY - rect.top - oy) / scale };
  }

  window.addEventListener('keydown', (event) => {
    if (event.repeat) return;
    if (PAUSE.has(event.code)) { actions |= ACTION_PAUSE; event.preventDefault(); return; }
    if (SERVE.has(event.code)) { actions |= ACTION_SERVE | ACTION_CONFIRM; event.preventDefault(); return; }
    if (event.code === 'Enter') { actions |= ACTION_CONFIRM; event.preventDefault(); return; }
    const ing = ING_BY_KEY[event.key.toUpperCase()];
    if (ing) { ingredientKey = ing.id; event.preventDefault(); }
  });
  window.addEventListener('blur', () => { ingredientKey = null; });

  canvas.addEventListener('pointerdown', (event) => {
    click = toLogical(event);
    actions |= ACTION_CONFIRM;
  });

  return {
    takeActions() { const taken = actions; actions = 0; return taken; },
    takeClick() { const c = click; click = null; return c; },
    takeIngredientKey() { const k = ingredientKey; ingredientKey = null; return k; },
  };
}
