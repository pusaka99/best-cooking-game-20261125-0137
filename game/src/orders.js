// The menu and the order queue: which dishes exist, which of them a level may
// serve, and how customers arrive, wait and leave. An order is a dish plus the
// patience its customer has left; serving the right dish before patience runs
// out is the whole game.

import { PATIENCE, RECIPES, SPAWN } from './config.js';

export const MAX_ORDERS = 3;

const CUSTOMERS = [
  { name: 'Bu Ratna', color: '#e8915a', hat: 'bun' },
  { name: 'Pak Dedi', color: '#8a5a33', hat: 'cap' },
  { name: 'Mbak Sari', color: '#c98a2e', hat: 'bun' },
  { name: 'Mas Budi', color: '#4a90b8', hat: 'cap' },
  { name: 'Neng Lia', color: '#b85a7a', hat: 'bun' },
  { name: 'Bang Jaka', color: '#5da85d', hat: 'cap' },
];

let nextOrderId = 1;

export function recipeById(id) {
  return RECIPES.find((recipe) => recipe.id === id) ?? null;
}

export function recipesForLevel(level) {
  return RECIPES.filter((recipe) => (recipe.minLevel ?? 1) <= level);
}

/** Patience for a fresh order at this level, in seconds. */
export function patienceForLevel(level) {
  return Math.max(PATIENCE.min, PATIENCE.base - PATIENCE.perLevel * (level - 1));
}

/** Seconds between new orders at this level. */
export function spawnIntervalForLevel(level) {
  return Math.max(SPAWN.min, SPAWN.base - SPAWN.perLevel * (level - 1));
}

/**
 * The queue of live orders. `random` picks the dish and the customer; the
 * caller steps it and reads `orders`, a fixed-length array with null holes.
 */
export function createOrderQueue(random) {
  const orders = [null, null, null];
  let spawnTimer = 4;
  let customerIndex = 0;

  function spawn(level) {
    const free = orders.findIndex((slot) => slot === null);
    if (free === -1) return null;
    const menu = recipesForLevel(level);
    const recipe = menu[Math.floor(random() * menu.length)];
    const customer = CUSTOMERS[customerIndex % CUSTOMERS.length];
    customerIndex += 1;
    const patience = patienceForLevel(level);
    const order = {
      id: nextOrderId,
      dish: recipe.id,
      name: recipe.name,
      price: recipe.price,
      needs: recipe.needs.map((need) => ({ ...need, done: false })),
      patience,
      maxPatience: patience,
      customer,
    };
    nextOrderId += 1;
    orders[free] = order;
    return order;
  }

  return {
    orders,
    /** Fill the opening rush: two orders at once so the board is never empty. */
    open(level) {
      spawn(level);
      spawn(level);
      spawnTimer = spawnIntervalForLevel(level);
    },
    /**
     * Advance the queue one step. Returns the orders whose patience ran out
     * this step (their customers walk out); the caller removes them.
     */
    step(dt, level) {
      const walkedOut = [];
      for (let index = 0; index < orders.length; index += 1) {
        const order = orders[index];
        if (order === null) continue;
        order.patience -= dt;
        if (order.patience <= 0) {
          walkedOut.push(order);
          orders[index] = null;
        }
      }
      spawnTimer -= dt;
      if (spawnTimer <= 0) {
        spawn(level);
        spawnTimer = spawnIntervalForLevel(level);
      }
      return walkedOut;
    },
    /** The first order whose dish matches, or null. */
    findDish(dishId) {
      return orders.find((order) => order !== null && order.dish === dishId) ?? null;
    },
    remove(order) {
      const index = orders.indexOf(order);
      if (index !== -1) orders[index] = null;
    },
  };
}
