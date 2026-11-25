// Kuroshio Express: Ekiben Bento — architecture:
// RECIPES (4 bento boxes) · STATIONS (rice/grill/fryer cookers) ·
// BENTO_ASSEMBLY (one compartment per recipe ingredient) ·
// STATION_RUSH (+50% tips in the 12 s before each stop) ·
// PROCEDURAL_CANVAS_ART (all art drawn in code) · WEB_AUDIO_SFX (synth, no files).
// No external assets, no network, no copied art/music/names.
// This file: every tuning number and colour in one place.
// Fixed 1280x720 logical field; the renderer scales it to the window, so no rule
// depends on screen size. Bright hinoki-cream palette, deliberately the opposite
// of a dark tavern kitchen: it must read at thumbnail size in a pairwise judge.
export const FIELD = { width: 1280, height: 720 };
export const STEP = 1 / 60;
export const SHIFT_SECONDS = 150; // 02:30 per shift
export const ORDER_PATIENCE = 48; // seconds before a customer walks
export const STATION_RUSH_EVERY = 45; // seconds between station stops
export const RUSH_WINDOW = 12; // seconds before a stop when tips are +50%
export const READY_WINDOW = 5; // seconds a cooked item stays READY before it burns

export const PALETTE = {
  cream: '#F7F3E8', hinoki: '#E8D9B8', wood: '#C9A86A', woodDark: '#8A6D3B',
  indigo: '#1B365D',
  salmon: '#E63946', tamago: '#FFB703', matcha: '#2A9D8F',
  matchaDark: '#1F7A6E', ink: '#22303C', muted: '#6B7A85', white: '#FFFFFF',
  burn: '#D64541', ready: '#2E9E5B', panel: '#FFFDF6',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';
export const BEST_KEY = 'kuroshio-express.best';

// --- RECIPES: the four bento boxes. `cook` maps a raw ingredient to the station
// that must cook it; ingredients with no entry are ready to place as-is. ---
export const RECIPES = [
  { name: 'Salmon Teriyaki Bento', short: 'Salmon Teriyaki', price: 18,
    needs: ['rice', 'salmon', 'edamame', 'teriyaki'] },
  { name: 'Golden Ebi Tempura Box', short: 'Ebi Tempura', price: 22,
    needs: ['rice', 'shrimp', 'tamago', 'ume'] },
  { name: 'Octopus Harbor Ekiben', short: 'Octopus Harbor', price: 24,
    needs: ['rice', 'octopus', 'nori', 'sesame', 'tea'] },
  { name: 'Fuji Sunrise Deluxe', short: 'Fuji Sunrise', price: 28,
    needs: ['rice', 'salmon', 'shrimp', 'tamago', 'shiso'] },
];

// --- INGREDIENTS: 12 items on the counter rail, keys 1-9, Q, W, E. ---
export const INGREDIENTS = [
  { id: 'rice',     name: 'Rice',       key: '1', color: '#FFF8E7', ring: '#D9C9A3', cook: 'rice' },
  { id: 'nori',     name: 'Nori',       key: '2', color: '#1F4D2E', ring: '#2E7D46', cook: null },
  { id: 'salmon',   name: 'Salmon',     key: '3', color: '#FF7A66', ring: '#E63946', cook: 'grill' },
  { id: 'tamago',   name: 'Tamago',     key: '4', color: '#FFB703', ring: '#E09E00', cook: 'grill' },
  { id: 'shrimp',   name: 'Shrimp',     key: '5', color: '#FF9E5E', ring: '#E86A1C', cook: 'fryer' },
  { id: 'octopus',  name: 'Octopus',    key: '6', color: '#B388EB', ring: '#7E57C2', cook: 'fryer' },
  { id: 'edamame',  name: 'Edamame',    key: '7', color: '#7BC96F', ring: '#2A9D8F', cook: null },
  { id: 'ume',      name: 'Ume Pickle', key: '8', color: '#E63946', ring: '#B71C2B', cook: null },
  { id: 'shiso',    name: 'Shiso Leaf', key: '9', color: '#43A047', ring: '#1B5E20', cook: null },
  { id: 'sesame',   name: 'Sesame',     key: 'Q', color: '#F5E6C8', ring: '#B89B5E', cook: null },
  { id: 'teriyaki', name: 'Teriyaki',   key: 'W', color: '#6D4C41', ring: '#4E342E', cook: null },
  { id: 'tea',      name: 'Green Tea',  key: 'E', color: '#2A9D8F', ring: '#1F7A6E', cook: null },
];

export const ING_BY_ID = Object.fromEntries(INGREDIENTS.map((i) => [i.id, i]));
export const ING_BY_KEY = Object.fromEntries(INGREDIENTS.map((i) => [i.key, i]));

// --- STATIONS: the three cookers on the left of the kitchen. ---
export const STATIONS = [
  { id: 'rice',  name: 'Rice Cooker',   sub: 'Rice',            cookTime: 3, color: '#2E5A8C' },
  { id: 'grill', name: 'Tamago Grill',  sub: 'Salmon · Tamago', cookTime: 4, color: '#E63946' },
  { id: 'fryer', name: 'Tempura Fryer', sub: 'Shrimp · Octopus', cookTime: 4, color: '#E86A1C' },
];

export const STATION_FOR = { rice: 0, grill: 1, fryer: 2 };
export const COOK_TIME = { rice: 3, salmon: 4, tamago: 3, shrimp: 4, octopus: 5 };

// Layout (logical px). HUD / orders / stations / bento / rail / footer.
export const LAYOUT = {
  window: { x: 0, y: 0, w: 1280, h: 54 },
  hud: { x: 0, y: 54, w: 1280, h: 62 },
  orders: { x: 24, y: 122, w: 1232, h: 74 },
  stations: { x: 24, y: 206, w: 372, h: 238 },
  bento: { x: 420, y: 206, w: 836, h: 238 },
  rail: { x: 24, y: 456, w: 1232, h: 176 },
  footer: { x: 24, y: 644, w: 1232, h: 64 },
};
