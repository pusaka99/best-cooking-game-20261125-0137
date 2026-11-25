// The game's rules and state, with no drawing and no browser in it: the cook's
// hands, the chopping board and the wok, the plate being assembled, the order
// queue, coins, hearts and the shift clock. step() advances one fixed step and
// returns what happened as bit flags, so the caller can react (and play sounds)
// without the kitchen knowing about screens. Nothing here allocates after
// createKitchen returns, except the small event lists a step hands back.

import {
  HEARTS, INGREDIENTS, LAYOUT, LEVEL, PREP, RECIPES, SHIFT_SECONDS, STEP,
} from './config.js';
import { MAX_ORDERS, createOrderQueue, recipeById } from './orders.js';

export const EVENT_PICK = 1;
export const EVENT_CHOP_DONE = 2;
export const EVENT_COOK_DONE = 4;
export const EVENT_BURNT = 8;
export const EVENT_PLATED = 16;
export const EVENT_SERVED = 32;
export const EVENT_FAIL = 64;
export const EVENT_WALKOUT = 128;
export const EVENT_OVER = 256;
export const EVENT_TRASH = 512;

export function ingredientById(id) {
  return INGREDIENTS.find((item) => item.id === id) ?? null;
}

/** A prepared component: its ingredient and the prep state it is in. */
export function makeComponent(ing, prep) {
  return { ing, prep };
}

function sameComponent(a, b) {
  return a.ing === b.ing && a.prep === b.prep;
}

/** True when `items` holds exactly the components a recipe needs, in any order. */
export function dishMatches(items, recipe) {
  if (items.length !== recipe.needs.length) return false;
  const remaining = recipe.needs.slice();
  for (const item of items) {
    const index = remaining.findIndex((need) => sameComponent(item, need));
    if (index === -1) return false;
    remaining.splice(index, 1);
  }
  return remaining.length === 0;
}

/** The recipes the plate's items could still become (every item is one they need). */
export function plateCandidates(items) {
  return RECIPES.filter((recipe) => {
    const remaining = recipe.needs.slice();
    for (const item of items) {
      const index = remaining.findIndex((need) => sameComponent(item, need));
      if (index === -1) return false;
      remaining.splice(index, 1);
    }
    return true;
  });
}

function binRect(index) {
  const bins = LAYOUT.bins;
  const col = index % bins.cols;
  const row = Math.floor(index / bins.cols);
  return {
    x: bins.x + col * (bins.cellW + bins.gap),
    y: bins.y + row * (bins.cellH + bins.gap),
    width: bins.cellW,
    height: bins.cellH,
  };
}

function inside(rect, x, y) {
  return x >= rect.x && x < rect.x + rect.width && y >= rect.y && y < rect.y + rect.height;
}

export function createKitchen(random) {
  const queue = createOrderQueue(random);
  const state = {
    coins: 0,
    score: 0,
    hearts: HEARTS,
    level: 1,
    elapsed: 0,
    shiftLeft: SHIFT_SECONDS,
    combo: 0,
    bestCombo: 0,
    dishesServed: 0,
    customersLost: 0,
    carrying: null,
    board: { item: null, progress: 0 },
    wok: { item: null, progress: 0, done: false, burnt: false },
    plate: { items: [], dish: null },
    message: '',
    messageTimer: 0,
    over: false,
    overReason: '',
  };

  function say(message, seconds) {
    state.message = message;
    state.messageTimer = seconds ?? 2;
  }

  function reset() {
    state.coins = 0;
    state.score = 0;
    state.hearts = HEARTS;
    state.level = 1;
    state.elapsed = 0;
    state.shiftLeft = SHIFT_SECONDS;
    state.combo = 0;
    state.bestCombo = 0;
    state.dishesServed = 0;
    state.customersLost = 0;
    state.carrying = null;
    state.board = { item: null, progress: 0 };
    state.wok = { item: null, progress: 0, done: false, burnt: false };
    state.plate = { items: [], dish: null };
    state.message = '';
    state.messageTimer = 0;
    state.over = false;
    state.overReason = '';
    queue.open(1);
  }

  function refreshPlateDish() {
    state.plate.dish = null;
    for (const recipe of RECIPES) {
      if (dishMatches(state.plate.items, recipe)) {
        state.plate.dish = recipe.id;
        return;
      }
    }
  }

  /** Pick an ingredient off the counter into the cook's hands. */
  function pickIngredient(id) {
    if (state.carrying !== null) {
      say('Tangan penuh — taruh dulu di piring atau buang.');
      return 0;
    }
    const ingredient = ingredientById(id);
    if (ingredient === null) return 0;
    state.carrying = makeComponent(id, ingredient.prep === 'pour' ? 'poured' : 'raw');
    return EVENT_PICK;
  }

  /** Use the chopping board: put a choppable down, or pick up what is chopped. */
  function useBoard() {
    const board = state.board;
    if (board.item !== null && board.progress >= 1) {
      state.carrying = makeComponent(board.item.ing, 'chopped');
      board.item = null;
      board.progress = 0;
      return EVENT_PICK;
    }
    if (board.item !== null) {
      say('Masih dipotong — tunggu sebentar.');
      return 0;
    }
    if (state.carrying === null) return 0;
    const ingredient = ingredientById(state.carrying.ing);
    if (ingredient === null || ingredient.prep !== 'chop' || state.carrying.prep !== 'raw') {
      say('Bahan ini tidak dipotong di talenan.');
      return 0;
    }
    board.item = state.carrying;
    board.progress = 0;
    state.carrying = null;
    return EVENT_PICK;
  }

  /** Use the wok: put a cookable in, take out what is cooked, or clear a burnt one. */
  function useWok() {
    const wok = state.wok;
    if (wok.item !== null && wok.burnt) {
      wok.item = null;
      wok.progress = 0;
      wok.done = false;
      wok.burnt = false;
      say('Hangus! Dibuang.');
      return EVENT_TRASH;
    }
    if (wok.item !== null && wok.done) {
      state.carrying = makeComponent(wok.item.ing, 'cooked');
      wok.item = null;
      wok.progress = 0;
      wok.done = false;
      return EVENT_PICK;
    }
    if (wok.item !== null) {
      say('Masih dimasak — tunggu sebentar.');
      return 0;
    }
    if (state.carrying === null) return 0;
    const ingredient = ingredientById(state.carrying.ing);
    if (ingredient === null || ingredient.prep !== 'cook' || state.carrying.prep !== 'raw') {
      say('Bahan ini tidak dimasak di wajan.');
      return 0;
    }
    wok.item = state.carrying;
    wok.progress = 0;
    wok.done = false;
    wok.burnt = false;
    state.carrying = null;
    return EVENT_PICK;
  }

  /** Add what the cook carries to the plate being assembled. */
  function usePlate() {
    if (state.carrying === null) {
      if (state.plate.items.length > 0) say('Piring sudah ada isinya — antar ke pelanggan.');
      return 0;
    }
    if (state.plate.items.length >= 3) {
      say('Piring penuh — antar dulu.');
      return 0;
    }
    const candidates = plateCandidates([...state.plate.items, state.carrying]);
    if (candidates.length === 0) {
      say('Bahan ini tidak cocok dengan piring ini.');
      return EVENT_FAIL;
    }
    state.plate.items.push(state.carrying);
    state.carrying = null;
    refreshPlateDish();
    return EVENT_PLATED;
  }

  /** Serve the finished plate to a matching order. */
  function serveOrder(order) {
    if (order === null) return 0;
    if (state.plate.dish === null) {
      say('Piring belum jadi hidangan.');
      return EVENT_FAIL;
    }
    if (state.plate.dish !== order.dish) {
      say(`Pelanggan ini pesan ${order.name}, bukan ${recipeById(state.plate.dish).name}.`);
      return EVENT_FAIL;
    }
    const tip = Math.round((order.patience / order.maxPatience) * 10);
    const perfect = order.patience / order.maxPatience >= 0.7;
    const bonus = perfect ? 5 : 0;
    const earned = order.price + tip + bonus;
    state.coins += earned;
    state.score += earned;
    state.combo += 1;
    state.bestCombo = Math.max(state.bestCombo, state.combo);
    state.dishesServed += 1;
    state.plate = { items: [], dish: null };
    queue.remove(order);
    say(perfect ? `SEMPURNA! +${earned} koin (tip ${tip} + bonus ${bonus}).` : `+${earned} koin${tip > 0 ? ` (termasuk tip ${tip})` : ''}!`);
    return EVENT_SERVED;
  }

  /** Throw away what the cook carries, or clear the plate when hands are empty. */
  function trash() {
    if (state.carrying !== null) {
      state.carrying = null;
      return EVENT_TRASH;
    }
    if (state.plate.items.length > 0) {
      state.plate = { items: [], dish: null };
      return EVENT_TRASH;
    }
    return 0;
  }

  /** Where a click lands: a bin, a station, the plate, the trash, or an order. */
  function zoneAt(x, y) {
    for (let index = 0; index < INGREDIENTS.length; index += 1) {
      if (inside(binRect(index), x, y)) return { kind: 'bin', ingredient: INGREDIENTS[index].id };
    }
    if (inside(LAYOUT.board, x, y)) return { kind: 'board' };
    if (inside(LAYOUT.wok, x, y)) return { kind: 'wok' };
    if (inside(LAYOUT.plate, x, y)) return { kind: 'plate' };
    if (inside(LAYOUT.trash, x, y)) return { kind: 'trash' };
    for (let index = 0; index < MAX_ORDERS; index += 1) {
      const rect = {
        x: LAYOUT.orders.x,
        y: LAYOUT.orders.y + index * (LAYOUT.orders.height + LAYOUT.orders.gap),
        width: LAYOUT.orders.width,
        height: LAYOUT.orders.height,
      };
      if (inside(rect, x, y)) return { kind: 'order', order: queue.orders[index] };
    }
    return { kind: 'none' };
  }

  /** Route one click to the action its zone means. */
  function actAt(x, y) {
    const zone = zoneAt(x, y);
    if (zone.kind === 'bin') return pickIngredient(zone.ingredient);
    if (zone.kind === 'board') return useBoard();
    if (zone.kind === 'wok') return useWok();
    if (zone.kind === 'plate') return usePlate();
    if (zone.kind === 'trash') return trash();
    if (zone.kind === 'order') return serveOrder(zone.order);
    return 0;
  }

  /**
   * One fixed step. Returns what happened as EVENT_* flags: the caller plays
   * sounds and announcements from them.
   */
  function step(dt) {
    let events = 0;
    if (state.over) return events;
    state.elapsed += dt;
    state.shiftLeft -= dt;
    state.level = Math.min(LEVEL.max, 1 + Math.floor(state.elapsed / LEVEL.seconds));
    if (state.messageTimer > 0) state.messageTimer -= dt;

    const board = state.board;
    if (board.item !== null && board.progress < 1) {
      board.progress += dt / PREP.chopSeconds;
      if (board.progress >= 1) {
        board.progress = 1;
        events |= EVENT_CHOP_DONE;
      }
    }
    const wok = state.wok;
    if (wok.item !== null && !wok.burnt) {
      wok.progress += dt;
      if (!wok.done && wok.progress >= PREP.cookSeconds) {
        wok.done = true;
        events |= EVENT_COOK_DONE;
      }
      if (wok.progress >= PREP.burnSeconds) {
        wok.burnt = true;
        events |= EVENT_BURNT;
        say('Wajan hangus! Klik wajan untuk membuang.');
      }
    }

    const walkedOut = queue.step(dt, state.level);
    for (const order of walkedOut) {
      state.hearts -= 1;
      state.combo = 0;
      state.customersLost += 1;
      events |= EVENT_WALKOUT;
      say(`${order.customer.name} pergi kecewa.`);
    }

    if (state.hearts <= 0) {
      state.over = true;
      state.overReason = 'Semua pelanggan pergi kecewa.';
      events |= EVENT_OVER;
    } else if (state.shiftLeft <= 0) {
      state.shiftLeft = 0;
      state.over = true;
      state.overReason = 'Shift selesai — warung tutup.';
      events |= EVENT_OVER;
    }
    return events;
  }

  reset();
  return {
    state,
    orders: queue.orders,
    reset,
    step,
    pickIngredient,
    useBoard,
    useWok,
    usePlate,
    serveOrder,
    trash,
    zoneAt,
    actAt,
    binRect,
    plateCandidates: () => plateCandidates(state.plate.items),
  };
}
