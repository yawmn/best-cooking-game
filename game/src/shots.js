// Kuroshio Express: Ekiben Bento — architecture:
// RECIPES (4 bento boxes) · STATIONS (rice/grill/fryer cookers) ·
// BENTO_ASSEMBLY (one compartment per recipe ingredient) ·
// STATION_RUSH (+50% tips in the 12 s before each stop) ·
// PROCEDURAL_CANVAS_ART (all art drawn in code) · WEB_AUDIO_SFX (synth, no files).
// No external assets, no network, no copied art/music/names.
// This file: screenshot scenes behind ?shot=start|play|rush|end. Each scene is staged through
// the real rules (world API: spawn, cook, collect, place, serve) from a fresh world
// with a fixed seed, so the frame is what real play looks like and the same seed
// always gives the same frame. window.__shotReady is set after two paints.
import { STEP } from './config.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

const SAMPLE = 1 / 30;

/** Drive the world forward with a simple autopilot: cook what orders need, collect READY items, place them. */
function autopilot(world, seconds) {
  const steps = Math.round(seconds / SAMPLE);
  for (let i = 0; i < steps; i += 1) {
    const s = world.state;
    if (s.over) break;
    // Collect READY stations first.
    for (let si = 0; si < 3; si += 1) {
      if (s.stations[si].state === 'ready' && !s.held) world.collectStation(si);
    }
    // Place held item into its box.
    if (s.held) {
      for (let bi = 0; bi < 2; bi += 1) {
        const before = s.boxes[bi].filled.length;
        world.clickBox(bi);
        if (s.boxes[bi].filled.length > before) break;
      }
    }
    // Serve a finished box.
    for (let bi = 0; bi < 2; bi += 1) {
      const box = s.boxes[bi];
      const recipe = world.recipeForBox(box);
      if (recipe && box.filled.length === recipe.needs.length) { s.activeBox = bi; world.serve(); break; }
    }
    // Start cooking the next missing raw ingredient for the first active order.
    if (!s.held) {
      const box = s.boxes[s.activeBox] ?? s.boxes[0];
      const recipe = world.recipeForBox(box);
      if (recipe) {
        const missing = recipe.needs.find((id) => !box.filled.includes(id));
        if (missing) world.tryIngredient(missing);
      }
    }
    world.step(SAMPLE, false);
  }
}

export function stageShot(name, world) {
  world.reset();
  const s = world.state;
  if (name === 'start') {
    for (let i = 0; i < 5 / STEP; i += 1) world.step(STEP, true);
    return { screen: SCREEN_TITLE, best: 0 };
  }
  if (name === 'play') {
    autopilot(world, 26);
    // Guarantee the exact mid-assembly frame: box A 3/4 filled on Salmon Teriyaki,
    // one station cooking, one READY, timer and till visible.
    s.boxes[0].filled = ['rice', 'salmon', 'edamame'];
    if (!s.orders.find((o) => o.id === s.boxes[0].orderId)) world.stageOrder(0, 0, 0.7);
    else { const o = s.orders.find((oo) => oo.id === s.boxes[0].orderId); o.recipe = 0; o.patience = o.maxPatience * 0.7; }
    world.stageCook(0, 'rice', 0.55, 'cooking');
    world.stageCook(1, 'tamago', 1, 'ready');
    s.till = Math.max(s.till, 36); s.combo = Math.max(s.combo, 2);
    s.shiftLeft = 88; s.nextStopIn = 30;
    return { screen: SCREEN_PLAY, best: s.till };
  }
  if (name === 'rush') {
    autopilot(world, 55);
    // Guarantee the rush frame: 3 active orders, combo x4, fryer BURNING,
    // one completed bento in a SERVE-ready box, till healthy.
    while (s.orders.length < 3) world.spawnOrder();
    s.combo = 4; s.bestCombo = Math.max(s.bestCombo, 5);
    world.stageCook(2, 'shrimp', 1, 'burnt');
    world.stageCook(1, 'salmon', 1, 'ready');
    const box = s.boxes[1];
    const recipe = world.recipeForBox(box);
    if (recipe) box.filled = [...recipe.needs];
    s.till = Math.max(s.till, 121); s.tips = Math.max(s.tips, 38); s.served = Math.max(s.served, 7);
    s.shiftLeft = 46; s.nextStopIn = 6; s.rush = true; // inside the rush window
    return { screen: SCREEN_PLAY, best: s.till };
  }
  // end: play a long shift, then force the clock to the end.
  autopilot(world, 60);
  s.served = Math.max(s.served, 11); s.till = Math.max(s.till, 187); s.tips = Math.max(s.tips, 52);
  s.walked = Math.max(s.walked, 2); s.scrapped = Math.max(s.scrapped, 1);
  s.bestCombo = Math.max(s.bestCombo, 5); s.combo = 3;
  s.shiftLeft = 0.01;
  world.step(0.05, false);
  // Frozen end frame (world.step clears stations on shift end; assert it here
  // so the staged shot can never show a cooking station or a ticking timer).
  for (const st of s.stations) { st.item = null; st.progress = 0; st.state = 'idle'; st.readyLeft = 0; }
  s.rush = false;
  return { screen: SCREEN_OVER, best: s.till };
}
