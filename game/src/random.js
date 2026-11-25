// Kuroshio Express: Ekiben Bento — architecture:
// RECIPES (4 bento boxes) · STATIONS (rice/grill/fryer cookers) ·
// BENTO_ASSEMBLY (one compartment per recipe ingredient) ·
// STATION_RUSH (+50% tips in the 12 s before each stop) ·
// PROCEDURAL_CANVAS_ART (all art drawn in code) · WEB_AUDIO_SFX (synth, no files).
// No external assets, no network, no copied art/music/names.
// This file: seeded RNG (mulberry32) — the same seed gives the same game,
// which is what makes the screenshot scenes repeatable.
export function createRandom(seed) {
  let a = seed | 0;
  return function random() {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
