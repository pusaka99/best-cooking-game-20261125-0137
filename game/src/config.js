// Every tuning number, colour and layout rect for Warung Rush in one place.
// The playfield is a fixed 1280x720 logical area; the renderer scales it to the
// window, so no rule below depends on the screen size.

export const FIELD = { width: 1280, height: 720 };

/** The simulation's fixed step, in seconds: 60 updates a second whatever the display's rate. */
export const STEP = 1 / 60;

/** A whole shift lasts this long; when it runs out the game ends with a score. */
export const SHIFT_SECONDS = 150;

export const HEARTS = 3;

/** Seconds of play per level; patience and spawn speed stop growing at the last level. */
export const LEVEL = { seconds: 30, max: 4 };

/** How long chopping takes, how long cooking takes, and when food left in the wok burns. */
export const PREP = { chopSeconds: 1.2, cookSeconds: 3.0, burnSeconds: 6.0 };

/** A customer's patience, in seconds, at level 1; each level shortens it. */
export const PATIENCE = { base: 48, perLevel: 5, min: 28 };

/** Seconds between new orders arriving, at level 1; each level shortens it. */
export const SPAWN = { base: 12, perLevel: 1.5, min: 7 };

/** The eight ingredients on the counter, in bin order. `prep` is what the ingredient
 *  needs before it can go on a plate: chop it, cook it, or just pour it straight on. */
export const INGREDIENTS = [
  { id: 'nasi', name: 'Nasi', prep: 'cook', key: '1', color: '#f5f0dc' },
  { id: 'mie', name: 'Mie', prep: 'cook', key: '2', color: '#f2c94c' },
  { id: 'ayam', name: 'Ayam', prep: 'chop', key: '3', color: '#e8915a' },
  { id: 'telur', name: 'Telur', prep: 'cook', key: '4', color: '#fdf6d8' },
  { id: 'sayur', name: 'Sayur', prep: 'chop', key: '5', color: '#5da85d' },
  { id: 'sate', name: 'Sate', prep: 'cook', key: '6', color: '#b0713a' },
  { id: 'teh', name: 'Teh', prep: 'pour', key: '7', color: '#c98a2e' },
  { id: 'es', name: 'Es', prep: 'pour', key: '8', color: '#9fd8ef' },
];

/** The menu. A dish is the set of components it needs, each named by ingredient and
 *  the prep state it must be in when it reaches the plate. */
export const RECIPES = [
  {
    id: 'nasi-goreng', name: 'Nasi Goreng', price: 30,
    needs: [
      { ing: 'nasi', prep: 'cooked' },
      { ing: 'telur', prep: 'cooked' },
      { ing: 'sayur', prep: 'chopped' },
    ],
  },
  {
    id: 'mie-goreng', name: 'Mie Goreng', price: 30,
    needs: [
      { ing: 'mie', prep: 'cooked' },
      { ing: 'ayam', prep: 'chopped' },
      { ing: 'sayur', prep: 'chopped' },
    ],
  },
  {
    id: 'sate-ayam', name: 'Sate Ayam', price: 40, minLevel: 2,
    needs: [
      { ing: 'sate', prep: 'cooked' },
      { ing: 'nasi', prep: 'cooked' },
      { ing: 'sayur', prep: 'chopped' },
    ],
  },
  {
    id: 'es-teh', name: 'Es Teh', price: 15,
    needs: [
      { ing: 'teh', prep: 'poured' },
      { ing: 'es', prep: 'poured' },
    ],
  },
];

/** Warm warung palette: wood, terracotta, cream and banana-leaf green. */
export const PALETTE = {
  backdrop: '#241a12',
  wall: '#f3e2c2',
  wallTrim: '#e8cfa0',
  floor: '#8a5a33',
  counter: '#a06a3b',
  counterTop: '#c08a4e',
  board: '#d9a066',
  wok: '#3a3f45',
  plate: '#fdfaf2',
  panel: '#fff8e7',
  panelEdge: '#d9b380',
  text: '#2e2118',
  muted: '#7a6a58',
  accent: '#c0392b',
  green: '#4e7a3a',
  gold: '#e8a91c',
  red: '#d94f3d',
  blue: '#4a90b8',
  shadow: 'rgba(0,0,0,0.25)',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where the best score is kept between visits (this browser only). */
export const BEST_KEY = 'warung-rush.best';

/** Layout: three columns — ingredients left, stations centre, orders right. */
export const LAYOUT = {
  hud: { x: 0, y: 0, width: 1280, height: 56 },
  bins: { x: 20, y: 68, cols: 2, rows: 4, cellW: 138, cellH: 146, gap: 8 },
  board: { x: 330, y: 76, width: 290, height: 190 },
  wok: { x: 650, y: 76, width: 290, height: 190 },
  plate: { x: 330, y: 290, width: 610, height: 220 },
  trash: { x: 860, y: 530, width: 80, height: 60 },
  hint: { x: 330, y: 530, width: 510, height: 60 },
  orders: { x: 972, y: 68, width: 288, height: 190, gap: 12 },
  hands: { x: 20, y: 614, width: 288, height: 86 },
  toast: { x: 330, y: 600, width: 610, height: 40 },
};
