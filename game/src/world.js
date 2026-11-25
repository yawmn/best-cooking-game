// Kuroshio Express: Ekiben Bento — architecture:
// RECIPES (4 bento boxes) · STATIONS (rice/grill/fryer cookers) ·
// BENTO_ASSEMBLY (one compartment per recipe ingredient) ·
// STATION_RUSH (+50% tips in the 12 s before each stop) ·
// PROCEDURAL_CANVAS_ART (all art drawn in code) · WEB_AUDIO_SFX (synth, no files).
// No external assets, no network, no copied art/music/names.
// This file: rules and state, no drawing and no browser in it.
// SHIFT_STATE: timer, till, combo, orders, bento boxes, stations, held item.
// ORDERS: up to 3 tickets; each has a recipe, a patience bar, and a bento box.
// STATIONS: cook one raw ingredient each; READY, then BURN if left too long.
// ASSEMBLY: a bento box has one compartment per recipe ingredient; a held item
// only lands in a compartment that still needs it. SPACE serves a finished box.
import {
  COOK_TIME, ING_BY_ID, ORDER_PATIENCE, READY_WINDOW, RECIPES,
  RUSH_WINDOW, SHIFT_SECONDS, STATION_FOR, STATION_RUSH_EVERY, STATIONS,
} from './config.js';

export const EVENT_SERVE = 1;
export const EVENT_WALK = 2;
export const EVENT_BURN = 4;
export const EVENT_READY = 8;
export const EVENT_OVER = 16;
export const EVENT_PLACE = 32;
export const EVENT_BAD = 64;

const STATION_NAMES = ['Atami', 'Odawara', 'Mishima', 'Numazu', 'Fuji City'];

export function createWorld(random) {
  const state = {
    elapsed: 0, shiftLeft: SHIFT_SECONDS, over: false,
    till: 0, tips: 0, combo: 0, bestCombo: 0, served: 0, walked: 0, scrapped: 0,
    held: null, activeBox: 0, shake: 0, flash: 0,
    nextStopIn: STATION_RUSH_EVERY, stopName: STATION_NAMES[0], stopIndex: 0,
    rush: false, spawnTimer: 0.5, orderSeq: 0,
    orders: [], // {id, recipe, patience, maxPatience}
    boxes: [], // {orderId, filled: string[]}
    stations: STATIONS.map(() => ({ item: null, progress: 0, state: 'idle', readyLeft: 0 })),
  };

  function reset() {
    state.elapsed = 0; state.shiftLeft = SHIFT_SECONDS; state.over = false;
    state.till = 0; state.tips = 0; state.combo = 0; state.bestCombo = 0;
    state.served = 0; state.walked = 0; state.scrapped = 0;
    state.held = null; state.activeBox = 0; state.shake = 0; state.flash = 0;
    state.nextStopIn = STATION_RUSH_EVERY; state.stopName = STATION_NAMES[0];
    state.stopIndex = 0; state.rush = false; state.spawnTimer = 0.5; state.orderSeq = 0;
    state.orders = [];
    state.boxes = [{ orderId: null, filled: [] }, { orderId: null, filled: [] }];
    for (const s of state.stations) { s.item = null; s.progress = 0; s.state = 'idle'; s.readyLeft = 0; }
    spawnOrder(); spawnOrder();
  }

  function pickRecipe() {
    return Math.floor(random() * RECIPES.length);
  }

  function spawnOrder() {
    if (state.orders.length >= 3) return null;
    const order = { id: state.orderSeq + 1, recipe: pickRecipe(), patience: ORDER_PATIENCE, maxPatience: ORDER_PATIENCE };
    state.orderSeq += 1;
    state.orders.push(order);
    // Bind the order to the first free bento box.
    const box = state.boxes.find((b) => b.orderId === null);
    if (box) box.orderId = order.id;
    return order;
  }

  function orderForBox(box) {
    return state.orders.find((o) => o.id === box.orderId) ?? null;
  }

  function recipeForBox(box) {
    const o = orderForBox(box);
    return o ? RECIPES[o.recipe] : null;
  }

  /** Player picks an ingredient from the rail (key or click). */
  function tryIngredient(id) {
    if (state.over || state.held) return false;
    const ing = ING_BY_ID[id];
    if (!ing) return false;
    if (ing.cook) {
      const si = STATION_FOR[ing.cook];
      const st = state.stations[si];
      if (st.state !== 'idle') return false; // station busy: no silent queue
      st.item = id; st.progress = 0; st.state = 'cooking'; st.readyLeft = 0;
      return true;
    }
    state.held = id;
    return true;
  }

  /** Player clicks a station: collect a READY item, or discard a BURNT one. */
  function collectStation(index) {
    if (state.over) return 0;
    const st = state.stations[index];
    if (!st) return 0;
    if (st.state === 'ready' && !state.held) {
      state.held = st.item; st.item = null; st.state = 'idle'; st.progress = 0;
      return EVENT_PLACE;
    }
    if (st.state === 'burnt') {
      st.item = null; st.state = 'idle'; st.progress = 0; state.scrapped += 1;
      state.combo = 0;
      return EVENT_BURN;
    }
    return 0;
  }

  /** Player clicks a bento box: select it, or place the held item into it. */
  function clickBox(index) {
    if (state.over) return 0;
    const box = state.boxes[index];
    if (!box) return 0;
    state.activeBox = index;
    if (!state.held) return 0;
    const recipe = recipeForBox(box);
    if (!recipe) { state.shake = 0.35; return EVENT_BAD; }
    if (!recipe.needs.includes(state.held) || box.filled.includes(state.held)) {
      state.shake = 0.35;
      return EVENT_BAD;
    }
    box.filled.push(state.held);
    state.held = null;
    return EVENT_PLACE;
  }

  /** SPACE: serve the active box if its bento is complete. */
  function serve() {
    if (state.over) return 0;
    const box = state.boxes[state.activeBox];
    const order = orderForBox(box);
    const recipe = recipeForBox(box);
    if (!order || !recipe || box.filled.length !== recipe.needs.length) {
      state.shake = 0.35;
      return EVENT_BAD;
    }
    const mult = 1 + Math.min(state.combo, 8) * 0.1;
    const rushBonus = state.rush ? 1.5 : 1;
    const earned = Math.round(recipe.price * mult * rushBonus);
    const tip = earned - recipe.price;
    state.till += earned; state.tips += tip;
    state.combo += 1; state.bestCombo = Math.max(state.bestCombo, state.combo);
    state.served += 1; state.flash = 0.4;
    state.orders = state.orders.filter((o) => o.id !== order.id);
    box.orderId = null; box.filled = [];
    state.spawnTimer = Math.min(state.spawnTimer, 0.8);
    return EVENT_SERVE;
  }

  function step(dt, harmless) {
    if (state.over) return 0;
    let events = 0;
    state.elapsed += dt;
    if (state.shake > 0) state.shake = Math.max(0, state.shake - dt);
    if (state.flash > 0) state.flash = Math.max(0, state.flash - dt);

    // Shift clock.
    state.shiftLeft = Math.max(0, state.shiftLeft - dt);
    if (state.shiftLeft <= 0) {
      state.over = true;
      // Freeze the end-of-shift frame: the train timer stops counting, the
      // rush ends, and every station goes idle — no station may still show
      // COOKING / READY / BURN at 00:00.
      state.rush = false;
      for (const st of state.stations) { st.item = null; st.progress = 0; st.state = 'idle'; st.readyLeft = 0; }
      return EVENT_OVER;
    }

    // Station rush: a stop every 45 s; the last 12 s before it pay +50% tips.
    state.nextStopIn -= dt;
    if (state.nextStopIn <= 0) {
      state.nextStopIn += STATION_RUSH_EVERY;
      state.stopIndex = (state.stopIndex + 1) % STATION_NAMES.length;
      state.stopName = STATION_NAMES[state.stopIndex];
    }
    state.rush = state.nextStopIn <= RUSH_WINDOW;

    // New orders drift in.
    state.spawnTimer -= dt;
    if (state.spawnTimer <= 0) {
      if (spawnOrder()) state.spawnTimer = 6 + random() * 5;
      else state.spawnTimer = 2;
    }

    // Patience: a walked customer frees the box and breaks the combo.
    if (!harmless) {
      for (let i = state.orders.length - 1; i >= 0; i -= 1) {
        const o = state.orders[i];
        o.patience -= dt;
        if (o.patience <= 0) {
          state.orders.splice(i, 1);
          const box = state.boxes.find((b) => b.orderId === o.id);
          if (box) { box.orderId = null; box.filled = []; }
          state.walked += 1; state.combo = 0;
          events |= EVENT_WALK;
        }
      }
    }

    // Cooking: COOKING -> READY (5 s window) -> BURNT.
    for (const st of state.stations) {
      if (st.state === 'cooking') {
        st.progress += dt / COOK_TIME[st.item];
        if (st.progress >= 1) { st.state = 'ready'; st.readyLeft = READY_WINDOW; events |= EVENT_READY; }
      } else if (st.state === 'ready') {
        st.readyLeft -= dt;
        if (st.readyLeft <= 0) { st.state = 'burnt'; events |= EVENT_BURN; }
      }
    }
    return events;
  }

  // --- Shot staging helpers: build exact scenes through the real rules. ---
  function stageCook(stationIndex, item, progress, stState) {
    const st = state.stations[stationIndex];
    st.item = item; st.progress = progress; st.state = stState;
    st.readyLeft = stState === 'ready' ? READY_WINDOW : 0;
  }
  function stageFill(boxIndex, recipeIndex, count) {
    const box = state.boxes[boxIndex];
    const recipe = RECIPES[recipeIndex];
    box.filled = recipe.needs.slice(0, count);
  }
  function stageOrder(boxIndex, recipeIndex, patienceFrac) {
    const order = { id: state.orderSeq + 1, recipe: recipeIndex, patience: ORDER_PATIENCE * patienceFrac, maxPatience: ORDER_PATIENCE };
    state.orderSeq += 1;
    state.orders.push(order);
    state.boxes[boxIndex].orderId = order.id;
    return order;
  }

  reset();
  return {
    state, reset, step, spawnOrder, tryIngredient, collectStation, clickBox, serve,
    orderForBox, recipeForBox, stageCook, stageFill, stageOrder,
  };
}
