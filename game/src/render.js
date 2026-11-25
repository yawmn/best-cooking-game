// Kuroshio Express: Ekiben Bento — architecture:
// RECIPES (4 bento boxes) · STATIONS (rice/grill/fryer cookers) ·
// BENTO_ASSEMBLY (one compartment per recipe ingredient) ·
// STATION_RUSH (+50% tips in the 12 s before each stop) ·
// PROCEDURAL_CANVAS_ART (all art drawn in code) · WEB_AUDIO_SFX (synth, no files).
// No external assets, no network, no copied art/music/names.
// This file: drawing only — the world's state and the current screen in, pixels out.
// 1280x720 field scaled to fit; margin filled with indigo. All art is procedural
// canvas shapes — no external assets, no network. Text is canvas text, rebuilt
// per frame from state (cheap at this size, always legible).
import { FIELD, FONT, INGREDIENTS, ING_BY_ID, LAYOUT, PALETTE, RECIPES, STATION_FOR, STATIONS } from './config.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const BOX_LETTERS = ['A', 'B'];

function rr(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const fonts = new Map();

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.round(window.innerWidth * ratio);
    canvas.height = Math.round(window.innerHeight * ratio);
    view.scale = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height);
    view.x = (canvas.width - FIELD.width * view.scale) / 2;
    view.y = (canvas.height - FIELD.height * view.scale) / 2;
  }

  function text(value, x, y, size, color, align = 'left', bold = false) {
    const key = size + (bold ? 'b' : '');
    if (!fonts.has(key)) fonts.set(key, `${bold ? '700 ' : ''}${size}px ${FONT}`);
    ctx.font = fonts.get(key);
    ctx.fillStyle = color;
    ctx.textAlign = align;
    ctx.textBaseline = 'alphabetic';
    ctx.fillText(value, x, y);
  }

  function fmtTime(sec) {
    const s = Math.max(0, Math.ceil(sec));
    return `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
  }

  // --- Procedural ingredient icons (drawn, never images). ---
  function drawIngredient(id, cx, cy, r, alpha = 1) {
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.lineWidth = Math.max(1.5, r * 0.09);
    switch (id) {
      case 'rice': {
        ctx.fillStyle = '#FFF8E7'; ctx.strokeStyle = '#D9C9A3';
        ctx.beginPath(); ctx.ellipse(cx, cy + r * 0.25, r, r * 0.62, 0, Math.PI, 0); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#E8D9B8';
        for (const [dx, dy] of [[-0.4, -0.1], [0, -0.35], [0.4, -0.05]]) { ctx.beginPath(); ctx.arc(cx + dx * r, cy + dy * r, r * 0.12, 0, Math.PI * 2); ctx.fill(); }
        break;
      }
      case 'nori': {
        ctx.fillStyle = '#1F4D2E'; ctx.strokeStyle = '#2E7D46';
        rr(ctx, cx - r * 0.85, cy - r * 0.7, r * 1.7, r * 1.4, r * 0.15); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = '#3E8E5A'; ctx.lineWidth = r * 0.07;
        for (const dy of [-0.3, 0, 0.3]) { ctx.beginPath(); ctx.moveTo(cx - r * 0.6, cy + dy * r); ctx.lineTo(cx + r * 0.6, cy + dy * r); ctx.stroke(); }
        break;
      }
      case 'salmon': {
        ctx.fillStyle = '#FF7A66'; ctx.strokeStyle = '#E63946';
        ctx.beginPath(); ctx.ellipse(cx, cy, r * 0.95, r * 0.55, -0.15, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = '#FFD9D2'; ctx.lineWidth = r * 0.12;
        for (const dx of [-0.4, 0, 0.4]) { ctx.beginPath(); ctx.moveTo(cx + dx * r, cy - r * 0.35); ctx.lineTo(cx + dx * r * 0.7, cy + r * 0.35); ctx.stroke(); }
        break;
      }
      case 'tamago': {
        ctx.fillStyle = '#FFB703'; ctx.strokeStyle = '#E09E00';
        rr(ctx, cx - r * 0.9, cy - r * 0.5, r * 1.8, r, r * 0.3); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = '#FFF3C4'; ctx.beginPath(); ctx.arc(cx, cy, r * 0.3, 0, Math.PI * 1.5); ctx.stroke();
        break;
      }
      case 'shrimp': {
        ctx.strokeStyle = '#E86A1C'; ctx.fillStyle = '#FF9E5E'; ctx.lineWidth = r * 0.42;
        ctx.beginPath(); ctx.arc(cx, cy + r * 0.15, r * 0.62, Math.PI * 1.05, Math.PI * 1.95); ctx.stroke();
        ctx.fillStyle = '#FF9E5E';
        ctx.beginPath(); ctx.moveTo(cx - r * 0.75, cy - r * 0.45); ctx.lineTo(cx - r * 1.05, cy - r * 0.75); ctx.lineTo(cx - r * 0.5, cy - r * 0.7); ctx.closePath(); ctx.fill();
        break;
      }
      case 'octopus': {
        ctx.fillStyle = '#B388EB'; ctx.strokeStyle = '#7E57C2';
        ctx.beginPath(); ctx.arc(cx, cy - r * 0.15, r * 0.55, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = '#B388EB'; ctx.lineWidth = r * 0.22;
        for (const dx of [-0.5, -0.17, 0.17, 0.5]) { ctx.beginPath(); ctx.moveTo(cx + dx * r, cy + r * 0.25); ctx.quadraticCurveTo(cx + dx * r, cy + r * 0.75, cx + dx * r * 1.3, cy + r * 0.8); ctx.stroke(); }
        ctx.fillStyle = '#22303C';
        ctx.beginPath(); ctx.arc(cx - r * 0.2, cy - r * 0.2, r * 0.08, 0, Math.PI * 2); ctx.fill();
        ctx.beginPath(); ctx.arc(cx + r * 0.2, cy - r * 0.2, r * 0.08, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case 'edamame': {
        ctx.fillStyle = '#7BC96F'; ctx.strokeStyle = '#2A9D8F';
        ctx.beginPath(); ctx.ellipse(cx, cy, r * 0.95, r * 0.5, 0.2, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#A8E063';
        for (const dx of [-0.5, 0, 0.5]) { ctx.beginPath(); ctx.arc(cx + dx * r, cy, r * 0.22, 0, Math.PI * 2); ctx.fill(); }
        break;
      }
      case 'ume': {
        ctx.fillStyle = '#E63946'; ctx.strokeStyle = '#B71C2B';
        ctx.beginPath(); ctx.arc(cx, cy, r * 0.7, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#FFB3BA'; ctx.beginPath(); ctx.arc(cx - r * 0.25, cy - r * 0.25, r * 0.18, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#43A047'; ctx.beginPath(); ctx.ellipse(cx + r * 0.5, cy - r * 0.65, r * 0.3, r * 0.14, 0.6, 0, Math.PI * 2); ctx.fill();
        break;
      }
      case 'shiso': {
        ctx.fillStyle = '#43A047'; ctx.strokeStyle = '#1B5E20';
        ctx.beginPath(); ctx.moveTo(cx, cy - r * 0.8); ctx.quadraticCurveTo(cx + r * 0.9, cy - r * 0.2, cx, cy + r * 0.7); ctx.quadraticCurveTo(cx - r * 0.9, cy - r * 0.2, cx, cy - r * 0.8); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = '#A5D6A7'; ctx.beginPath(); ctx.moveTo(cx, cy - r * 0.7); ctx.lineTo(cx, cy + r * 0.6); ctx.stroke();
        break;
      }
      case 'sesame': {
        ctx.fillStyle = '#F5E6C8'; ctx.strokeStyle = '#B89B5E';
        for (const [dx, dy, rot] of [[-0.4, -0.2, 0.5], [0.35, -0.35, -0.4], [0, 0.35, 0.1], [0.45, 0.3, 0.8]]) {
          ctx.save(); ctx.translate(cx + dx * r, cy + dy * r); ctx.rotate(rot);
          ctx.beginPath(); ctx.ellipse(0, 0, r * 0.28, r * 0.16, 0, 0, Math.PI * 2); ctx.fill(); ctx.stroke(); ctx.restore();
        }
        break;
      }
      case 'teriyaki': {
        ctx.fillStyle = '#6D4C41'; ctx.strokeStyle = '#4E342E';
        rr(ctx, cx - r * 0.35, cy - r * 0.6, r * 0.7, r * 1.2, r * 0.15); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#FFB703'; rr(ctx, cx - r * 0.35, cy - r * 0.6, r * 0.7, r * 0.3, r * 0.1); ctx.fill();
        ctx.strokeStyle = '#8D6E63'; ctx.lineWidth = r * 0.1;
        ctx.beginPath(); ctx.moveTo(cx - r * 0.5, cy + r * 0.85); ctx.quadraticCurveTo(cx, cy + r * 0.5, cx + r * 0.5, cy + r * 0.85); ctx.stroke();
        break;
      }
      case 'tea': {
        ctx.fillStyle = '#2A9D8F'; ctx.strokeStyle = '#1F7A6E';
        ctx.beginPath(); ctx.moveTo(cx - r * 0.6, cy - r * 0.4); ctx.lineTo(cx + r * 0.6, cy - r * 0.4); ctx.lineTo(cx + r * 0.45, cy + r * 0.55); ctx.lineTo(cx - r * 0.45, cy + r * 0.55); ctx.closePath(); ctx.fill(); ctx.stroke();
        ctx.strokeStyle = '#2A9D8F'; ctx.lineWidth = r * 0.14;
        ctx.beginPath(); ctx.arc(cx + r * 0.65, cy, r * 0.3, -Math.PI / 2, Math.PI / 2); ctx.stroke();
        ctx.strokeStyle = '#B2DFDB'; ctx.lineWidth = r * 0.09;
        for (const dx of [-0.2, 0.2]) { ctx.beginPath(); ctx.moveTo(cx + dx * r, cy - r * 0.55); ctx.quadraticCurveTo(cx + dx * r + r * 0.15, cy - r * 0.8, cx + dx * r, cy - r * 1.0); ctx.stroke(); }
        break;
      }
      default: break;
    }
    ctx.restore();
  }

  function drawWindow(state) {
    const w = LAYOUT.window;
    const g = ctx.createLinearGradient(0, 0, 0, w.h);
    g.addColorStop(0, '#8FB8D8'); g.addColorStop(0.55, '#3E7CB1'); g.addColorStop(1, '#1B365D');
    ctx.fillStyle = g; ctx.fillRect(w.x, w.y, w.w, w.h);
    // Mt Fuji + sea parallax (moves with elapsed time).
    const off = (state.elapsed * 14) % 240;
    ctx.fillStyle = '#EAF3FA';
    ctx.beginPath(); ctx.moveTo(880, w.h); ctx.lineTo(1000, 6); ctx.lineTo(1120, w.h); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#FFFFFF';
    ctx.beginPath(); ctx.moveTo(982, 6); ctx.lineTo(1000, 6); ctx.lineTo(1018, 6); ctx.lineTo(1006, 22); ctx.lineTo(994, 22); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#F2C94C'; ctx.beginPath(); ctx.arc(660, 24, 15, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (let i = 0; i < 2; i += 1) {
      const cx = 730 + i * 140 - ((state.elapsed * 7) % 120);
      ctx.beginPath(); ctx.ellipse(cx, 18, 34, 9, 0, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.ellipse(cx + 22, 24, 24, 7, 0, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    for (let i = 0; i < 16; i += 1) {
      const wx = ((i * 97 - off * 1.6) % 1280 + 1280) % 1280;
      ctx.fillRect(wx, 44 + (i % 2) * 5, 46, 2);
    }
    // Window frames.
    ctx.fillStyle = PALETTE.woodDark;
    for (const fx of [0, 426, 852]) ctx.fillRect(fx, 0, 6, w.h);
    ctx.fillRect(0, w.h - 5, w.w, 5);
    text('KUROSHIO EXPRESS', 18, 34, 24, '#FFFFFF', 'left', true);
    text('EKIBEN BENTO  •  COASTAL LINE', 300, 33, 15, '#DDEEF7');
    // NEXT STOP pill: solid dark-blue background on ALL screens, so the text
    // never collides with Mt Fuji / sky behind it.
    const nextLabel = state.rush ? 'NEXT STOP: ' + state.stopName + ' — RUSH! +50% TIP'
      : 'NEXT STOP: ' + state.stopName + ' in ' + Math.ceil(state.nextStopIn) + 's';
    ctx.font = `${state.rush ? '700 ' : ''}16px ${FONT}`;
    const nextW = ctx.measureText(nextLabel).width;
    ctx.fillStyle = 'rgba(15,33,61,0.88)';
    rr(ctx, 1262 - nextW - 28, 12, nextW + 28, 30, 15); ctx.fill();
    text(nextLabel, 1248, 34, 16, state.rush ? '#FFB703' : '#FFFFFF', 'right', state.rush);
  }

  function drawHud(state) {
    const h = LAYOUT.hud;
    ctx.fillStyle = PALETTE.panel; ctx.fillRect(h.x, h.y, h.w, h.h);
    ctx.fillStyle = PALETTE.hinoki; ctx.fillRect(h.x, h.y + h.h - 3, h.w, 3);
    // SHIFT timer.
    text('SHIFT', 28, h.y + 24, 13, PALETTE.muted, 'left', true);
    text(fmtTime(state.shiftLeft), 28, h.y + 54, 32, state.shiftLeft <= 30 ? PALETTE.salmon : PALETTE.indigo, 'left', true);
    // Combo.
    const cx = 300;
    text('COMBO', cx, h.y + 24, 13, PALETTE.muted, 'center', true);
    text('x' + Math.max(1, state.combo), cx, h.y + 54, 32, state.combo >= 3 ? PALETTE.salmon : PALETTE.ink, 'center', true);
    // Station rush pill.
    const rx = 430, rw = 300;
    ctx.fillStyle = state.rush ? PALETTE.tamago : PALETTE.indigo;
    rr(ctx, rx, h.y + 12, rw, 38, 19); ctx.fill();
    text(state.rush ? 'STATION RUSH — +50% TIPS NOW!' : 'Next stop ' + state.stopName + ' · ' + Math.ceil(state.nextStopIn) + 's',
      rx + rw / 2, h.y + 37, 15, state.rush ? PALETTE.ink : '#FFFFFF', 'center', true);
    // IN HAND.
    text('IN HAND', 790, h.y + 24, 13, PALETTE.muted, 'center', true);
    ctx.fillStyle = state.held ? '#FFF3C4' : '#EFEAD9';
    ctx.strokeStyle = PALETTE.wood; ctx.lineWidth = 1.5;
    rr(ctx, 752, h.y + 30, 76, 26, 8); ctx.fill(); ctx.stroke();
    if (state.held) {
      drawIngredient(state.held, 772, h.y + 43, 10);
      text(ING_BY_ID[state.held].name, 790, h.y + 48, 12, PALETTE.ink, 'left', true);
    } else text('— empty —', 790, h.y + 48, 12, PALETTE.muted, 'center');
    // TILL.
    text('TILL', 1090, h.y + 24, 13, PALETTE.muted, 'right', true);
    text('$' + state.till, 1090, h.y + 54, 32, PALETTE.matchaDark, 'right', true);
    text('served ' + state.served, 1256, h.y + 30, 14, PALETTE.muted, 'right');
    text('tips $' + state.tips, 1256, h.y + 50, 14, PALETTE.muted, 'right');
  }

  function drawOrders(state) {
    const o = LAYOUT.orders;
    const cw = 400, gap = 16;
    for (let i = 0; i < 3; i += 1) {
      const x = o.x + i * (cw + gap);
      const order = state.orders[i];
      ctx.fillStyle = order ? '#FFFFFF' : '#EFEAD9';
      ctx.strokeStyle = order ? PALETTE.indigo : '#D9C9A3'; ctx.lineWidth = 2;
      rr(ctx, x, o.y, cw, o.h, 10); ctx.fill(); ctx.stroke();
      if (!order) { text('— no order yet —', x + cw / 2, o.y + 44, 15, PALETTE.muted, 'center'); continue; }
      const recipe = RECIPES[order.recipe];
      const boxIdx = state.boxes.findIndex((b) => b.orderId === order.id);
      text('#' + order.id + '  ' + recipe.short, x + 14, o.y + 28, 19, PALETTE.indigo, 'left', true);
      text('$' + recipe.price, x + cw - 14, o.y + 28, 22, PALETTE.matchaDark, 'right', true);
      if (boxIdx >= 0) text('BOX ' + BOX_LETTERS[boxIdx], x + cw - 14, o.y + 67, 12, PALETTE.woodDark, 'right', true);
      // Patience bar.
      const frac = Math.max(0, order.patience / order.maxPatience);
      ctx.fillStyle = '#EFEAD9'; rr(ctx, x + 14, o.y + 40, cw - 28, 10, 5); ctx.fill();
      ctx.fillStyle = frac > 0.5 ? PALETTE.matcha : frac > 0.25 ? PALETTE.tamago : PALETTE.salmon;
      if (frac > 0) { rr(ctx, x + 14, o.y + 40, (cw - 28) * frac, 10, 5); ctx.fill(); }
      // Ingredient dots.
      let dx = x + 14;
      for (const id of recipe.needs) {
        ctx.fillStyle = ING_BY_ID[id].color; ctx.strokeStyle = ING_BY_ID[id].ring; ctx.lineWidth = 1.5;
        ctx.beginPath(); ctx.arc(dx + 8, o.y + 63, 8, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        dx += 22;
      }
      text(recipe.needs.length + ' items', x + 14 + recipe.needs.length * 22, o.y + 67, 12, PALETTE.muted);
    }
  }

  function drawStations(state) {
    const s = LAYOUT.stations;
    const sh = 74, gap = 8;
    for (let i = 0; i < 3; i += 1) {
      const st = state.stations[i];
      const def = STATIONS[i];
      const y = s.y + i * (sh + gap);
      const burntFlash = st.state === 'burnt' && Math.floor(state.elapsed * 4) % 2 === 0;
      ctx.fillStyle = burntFlash ? '#FDECEC' : '#FFFFFF';
      ctx.strokeStyle = st.state === 'ready' ? PALETTE.ready : st.state === 'burnt' ? PALETTE.burn : PALETTE.wood;
      ctx.lineWidth = 2.5;
      rr(ctx, s.x, y, s.w, sh, 10); ctx.fill(); ctx.stroke();
      text(def.name, s.x + 14, y + 26, 18, PALETTE.indigo, 'left', true);
      text(def.sub, s.x + 14, y + 50, 13, PALETTE.muted);
      // Progress ring.
      const cx = s.x + s.w - 52, cy = y + sh / 2, r = 26;
      ctx.fillStyle = '#EFEAD9'; ctx.beginPath(); ctx.arc(cx, cy, r, 0, Math.PI * 2); ctx.fill();
      if (st.state === 'cooking') {
        ctx.strokeStyle = PALETTE.tamago; ctx.lineWidth = 7;
        ctx.beginPath(); ctx.arc(cx, cy, r - 3, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * Math.min(1, st.progress)); ctx.stroke();
        drawIngredient(st.item, cx, cy, 14);
        text('COOKING ' + Math.round(st.progress * 100) + '%', s.x + s.w - 92, y + 62, 12, PALETTE.muted, 'right', true);
      } else if (st.state === 'ready') {
        ctx.strokeStyle = PALETTE.ready; ctx.lineWidth = 7;
        ctx.beginPath(); ctx.arc(cx, cy, r - 3, 0, Math.PI * 2); ctx.stroke();
        drawIngredient(st.item, cx, cy, 14);
        text('READY! click', s.x + s.w - 92, y + 62, 13, PALETTE.ready, 'right', true);
      } else if (st.state === 'burnt') {
        ctx.strokeStyle = PALETTE.burn; ctx.lineWidth = 7;
        ctx.beginPath(); ctx.arc(cx, cy, r - 3, 0, Math.PI * 2); ctx.stroke();
        text('BURN!', cx, cy + 5, 13, PALETTE.burn, 'center', true);
        text('click to discard', s.x + s.w - 92, y + 62, 12, PALETTE.burn, 'right', true);
      } else {
        text('empty', cx, cy + 5, 13, PALETTE.muted, 'center');
        text('send an ingredient', s.x + s.w - 92, y + 62, 12, PALETTE.muted, 'right');
      }
    }
  }

  function drawBento(state) {
    const b = LAYOUT.bento;
    const bw = 408, gap = 20;
    for (let bi = 0; bi < 2; bi += 1) {
      const box = state.boxes[bi];
      const x = b.x + bi * (bw + gap);
      const order = state.orders.find((o) => o.id === box.orderId);
      const recipe = order ? RECIPES[order.recipe] : null;
      const isActive = state.activeBox === bi;
      const shakeX = state.shake > 0 && isActive ? Math.sin(state.elapsed * 40) * 5 : 0;
      ctx.save(); ctx.translate(shakeX, 0);
      ctx.fillStyle = isActive ? '#FFF8E0' : '#FFFFFF';
      ctx.strokeStyle = isActive ? PALETTE.tamago : PALETTE.wood; ctx.lineWidth = isActive ? 3 : 2;
      rr(ctx, x, b.y, bw, b.h, 12); ctx.fill(); ctx.stroke();
      text('BOX ' + BOX_LETTERS[bi], x + 14, b.y + 26, 15, PALETTE.woodDark, 'left', true);
      if (recipe) {
        text(recipe.short, x + 84, b.y + 26, 18, PALETTE.indigo, 'left', true);
        text('$' + recipe.price, x + bw - 14, b.y + 26, 20, PALETTE.matchaDark, 'right', true);
        // Compartments: 3 columns x 2 rows.
        const cols = 3, cw = 122, ch = 72, gx = x + 14, gy = b.y + 40;
        recipe.needs.forEach((id, idx) => {
          const cx = gx + (idx % cols) * (cw + 6);
          const cy = gy + Math.floor(idx / cols) * (ch + 6);
          const filled = box.filled.includes(id);
          ctx.fillStyle = filled ? '#FDF6E3' : '#F2EEDF';
          ctx.strokeStyle = filled ? PALETTE.matcha : '#C9BFA5';
          ctx.setLineDash(filled ? [] : [5, 4]); ctx.lineWidth = 1.5;
          rr(ctx, cx, cy, cw, ch, 8); ctx.fill(); ctx.stroke(); ctx.setLineDash([]);
          if (filled) {
            drawIngredient(id, cx + 26, cy + ch / 2, 20);
            text(ING_BY_ID[id].name, cx + 52, cy + ch / 2 + 4, 13, PALETTE.ink, 'left', true);
          } else {
            drawIngredient(id, cx + 26, cy + ch / 2, 20, 0.28);
            text(ING_BY_ID[id].name, cx + 52, cy + ch / 2 + 4, 13, '#9AA79B', 'left');
          }
        });
        const done = box.filled.length === recipe.needs.length;
        text(done ? 'READY TO SERVE — press SPACE!' : box.filled.length + ' / ' + recipe.needs.length + ' filled — add ' + recipe.needs.find((id) => !box.filled.includes(id)) + ' next',
          x + 14, b.y + b.h - 12, 13, done ? PALETTE.ready : PALETTE.muted, 'left', done);
      } else {
        text('— waiting for an order —', x + bw / 2, b.y + 110, 16, PALETTE.muted, 'center');
        text('New tickets appear on the board above.', x + bw / 2, b.y + 140, 13, PALETTE.muted, 'center');
      }
      ctx.restore();
    }
  }

  function drawRail(state) {
    const r = LAYOUT.rail;
    const sw = 99, gap = 3.4;
    INGREDIENTS.forEach((ing, i) => {
      const x = r.x + i * (sw + gap);
      const needsCook = !!ing.cook;
      const stationBusy = needsCook && state.stations[STATION_FOR[ing.cook]].state !== 'idle';
      const inHand = state.held === ing.id;
      ctx.fillStyle = inHand ? '#FFF3C4' : '#FFFFFF';
      ctx.strokeStyle = inHand ? PALETTE.tamago : PALETTE.wood; ctx.lineWidth = inHand ? 3 : 1.5;
      rr(ctx, x, r.y, sw, r.h, 10); ctx.fill(); ctx.stroke();
      // Key badge.
      ctx.fillStyle = PALETTE.indigo; rr(ctx, x + 6, r.y + 6, 24, 20, 5); ctx.fill();
      text(ing.key, x + 18, r.y + 21, 13, '#FFFFFF', 'center', true);
      if (needsCook) {
        // COOK badge tracks the station's live state: bright red COOK only when
        // the station is EMPTY (can cook now); dim grey BUSY while it is
        // cooking / READY / burnt. The 'station busy' sub-text below uses the
        // same stationBusy flag, so badge and sub-text can never disagree.
        ctx.fillStyle = stationBusy ? '#8A949B' : PALETTE.salmon;
        rr(ctx, x + sw - 40, r.y + 6, 34, 20, 5); ctx.fill();
        text(stationBusy ? 'BUSY' : 'COOK', x + sw - 23, r.y + 21, 10, '#FFFFFF', 'center', true);
      }
      ctx.globalAlpha = stationBusy ? 0.45 : 1;
      drawIngredient(ing.id, x + sw / 2, r.y + 74, 30);
      ctx.globalAlpha = 1;
      text(ing.name, x + sw / 2, r.y + 128, 13, PALETTE.ink, 'center', true);
      text(needsCook ? STATIONS.find((s) => s.id === ing.cook).name : 'ready to place', x + sw / 2, r.y + 148, 11, PALETTE.muted, 'center');
      if (stationBusy) text('station busy', x + sw / 2, r.y + 165, 11, PALETTE.salmon, 'center', true);
    });
  }

  function drawFooter(state, best) {
    const f = LAYOUT.footer;
    ctx.fillStyle = PALETTE.indigo; ctx.fillRect(0, f.y, FIELD.width, f.h);
    text('Keys 1–9 Q W E: ingredients  •  Click a station when READY  •  Click a bento box to place  •  SPACE: serve  •  P: pause',
      24, f.y + 28, 15, '#FFFFFF');
    text('Best till $' + best, 1256, f.y + 28, 15, PALETTE.tamago, 'right', true);
    text('Kuroshio Express — original game, all art drawn in code, no network, no copied assets.',
      24, f.y + 52, 12, '#9FB6CC');
  }

  function drawPanel(title, lines, prompt, accent) {
    const w = 780, h = 130 + lines.length * 30 + 56;
    const x = (FIELD.width - w) / 2, y = (FIELD.height - h) / 2;
    // Modal backdrop: dark enough that background kitchen text can never look
    // clipped by the panel edge.
    ctx.fillStyle = 'rgba(11,22,40,0.78)'; ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.fillStyle = PALETTE.panel; ctx.strokeStyle = accent; ctx.lineWidth = 3;
    rr(ctx, x, y, w, h, 16); ctx.fill(); ctx.stroke();
    text(title, FIELD.width / 2, y + 62, 44, PALETTE.indigo, 'center', true);
    lines.forEach((line, i) => text(line.text, FIELD.width / 2, y + 104 + i * 30, line.size || 18, line.color || PALETTE.ink, 'center', !!line.bold));
    text(prompt, FIELD.width / 2, y + h - 28, 20, PALETTE.salmon, 'center', true);
  }

  function drawField(state, best) {
    ctx.fillStyle = PALETTE.cream; ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    drawWindow(state); drawHud(state); drawOrders(state); drawStations(state); drawBento(state); drawRail(state); drawFooter(state, best);
  }

  function grade(state) {
    if (state.served >= 12 && state.walked === 0) return 'S';
    if (state.served >= 9) return 'A';
    if (state.served >= 6) return 'B';
    if (state.served >= 3) return 'C';
    return 'D';
  }

  function draw(state, screen, best) {
    ctx.setTransform(1, 0, 0, 1, 0, 0);
    ctx.fillStyle = PALETTE.indigo; ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawField(state, best);
    if (screen === SCREEN_TITLE) {
      const lines = [
        { text: 'The dining car is hungry — fill the bento boxes before the next stop!', size: 18, color: PALETTE.muted },
        { text: '' },
        ...RECIPES.map((r) => ({ text: r.name + '  —  $' + r.price + '  ·  ' + r.needs.map((id) => ING_BY_ID[id].name).join(' + '), size: 16 })),
        { text: '' },
        { text: 'Cook raw fish & egg on the grill, fry shrimp & octopus, then place each item in its compartment.', size: 16, color: PALETTE.muted },
        { text: 'Serve with SPACE during a Station Rush for +50% tips. Burnt food is lost!', size: 16, color: PALETTE.muted },
      ];
      drawPanel('KUROSHIO EXPRESS', lines, 'Press SPACE or click to start the shift  •  Best till $' + best, PALETTE.tamago);
      return;
    }
    if (screen === SCREEN_PAUSED) {
      drawPanel('PAUSED', [{ text: 'The train waits for you.' }], 'Press P to resume', PALETTE.indigo);
      return;
    }
    if (screen === SCREEN_OVER) {
      const g = grade(state);
      const lines = [
        { text: 'The dining car closes at the ' + state.stopName + ' terminus', size: 20, color: PALETTE.muted, bold: true },
        { text: '' },
        { text: 'Orders served: ' + state.served + '    •    Customers walked: ' + state.walked + '    •    Food scrapped: ' + state.scrapped, size: 18 },
        { text: 'Tips earned: $' + state.tips + '    •    Best combo: x' + Math.max(1, state.bestCombo), size: 18 },
        { text: 'TILL: $' + state.till + '        GRADE: ' + g, size: 26, bold: true, color: g === 'S' ? PALETTE.salmon : PALETTE.indigo },
        { text: 'Best till ever: $' + best, size: 16, color: PALETTE.muted },
      ];
      drawPanel('END OF SHIFT', lines, 'Press SPACE or click to play again', PALETTE.matcha);
    }
  }

  resize();
  window.addEventListener('resize', resize);
  return { draw };
}
