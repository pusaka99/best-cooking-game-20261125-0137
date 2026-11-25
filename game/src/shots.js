// The screenshot scenes behind ?shot=cover|play|serve|rush. Each one plays the
// real rules forward from a fresh kitchen for a fixed number of steps, steered
// by a simple bot that does what a player does (pick, chop, cook, plate,
// serve), so the frame is what a short game really looks like and the same
// seed always gives the same frame. The bot makes at most one move per step,
// like a hurried cook.
import { STEP } from './config.js';
import { recipeById } from './orders.js';
import { SCREEN_OVER, SCREEN_PLAY, SCREEN_TITLE } from './render.js';

/** The dish the bot is working on: the oldest order the plate could still become. */
function targetDish(kitchen) {
  const candidates = kitchen.plateCandidates();
  const orders = kitchen.orders.filter((order) => order !== null);
  for (const order of orders) {
    if (candidates.some((recipe) => recipe.id === order.dish)) return recipeById(order.dish);
  }
  return orders.length > 0 ? recipeById(orders[0].dish) : null;
}

/**
 * One bot move. `serve` false holds a finished plate up for the camera instead
 * of serving it at once. Returns true when it did something.
 */
function botMove(kitchen, serve) {
  const state = kitchen.state;
  if (state.over) return false;

  // A finished plate goes out at once (unless the shot wants to show it).
  if (state.plate.dish !== null) {
    if (!serve) return false;
    const order = kitchen.orders.find((o) => o !== null && o.dish === state.plate.dish);
    if (order !== null) {
      kitchen.serveOrder(order);
      return true;
    }
    return false;
  }
  // Take finished work off the stations first.
  if (state.board.item !== null && state.board.progress >= 1) {
    kitchen.useBoard();
    return true;
  }
  if (state.wok.item !== null && state.wok.done && !state.wok.burnt) {
    kitchen.useWok();
    return true;
  }
  if (state.wok.item !== null && state.wok.burnt) {
    kitchen.useWok();
    return true;
  }
  // Put what the cook carries where it belongs.
  if (state.carrying !== null) {
    const item = state.carrying;
    if (item.prep === 'raw') {
      if (item.ing === 'sayur' || item.ing === 'ayam') {
        if (state.board.item === null) {
          kitchen.useBoard();
          return true;
        }
      } else if (state.wok.item === null) {
        kitchen.useWok();
        return true;
      }
      return false;
    }
    const dish = targetDish(kitchen);
    if (dish !== null) {
      const remaining = dish.needs.slice();
      for (const onPlate of state.plate.items) {
        const i = remaining.findIndex((x) => x.ing === onPlate.ing && x.prep === onPlate.prep);
        if (i !== -1) remaining.splice(i, 1);
      }
      if (remaining.some((need) => need.ing === item.ing && need.prep === item.prep)) {
        kitchen.usePlate();
        return true;
      }
    }
    return false;
  }
  // Hands empty: fetch the next thing the target dish needs.
  const dish = targetDish(kitchen);
  if (dish === null) return false;
  const missing = [];
  const remaining = dish.needs.slice();
  for (const item of state.plate.items) {
    const i = remaining.findIndex((x) => x.ing === item.ing && x.prep === item.prep);
    if (i !== -1) remaining.splice(i, 1);
  }
  missing.push(...remaining);
  if (missing.length === 0) return false;
  // Prefer a need whose station is free, so the bot never waits on a busy wok.
  let chosen = missing[0];
  for (const candidate of missing) {
    if (candidate.prep === 'poured') { chosen = candidate; break; }
    if (candidate.prep === 'chopped' && state.board.item === null) { chosen = candidate; break; }
    if (candidate.prep === 'cooked' && state.wok.item === null) { chosen = candidate; break; }
  }
  kitchen.pickIngredient(chosen.ing);
  return true;
}

/**
 * Set `kitchen` to the named scene and return the screen to draw over it and
 * the best score to show. Any other name stages the title scene.
 */
export function stageShot(name, kitchen) {
  kitchen.reset();
  const serve = name !== 'serve';
  if (name === 'cover') {
    for (let index = 0; index < 8 / STEP; index += 1) {
      kitchen.step(STEP);
      botMove(kitchen, true);
    }
    return { screen: SCREEN_TITLE, best: 0 };
  }
  const seconds = name === 'rush' ? 60 : name === 'serve' ? 120 : 26;
  for (let index = 0; index < seconds / STEP; index += 1) {
    kitchen.step(STEP);
    botMove(kitchen, serve);
    if (name === 'serve' && kitchen.state.plate.dish !== null) break;
    if (kitchen.state.over) break;
  }
  if (name === 'rush') {
    // Let the orders pile up for the last stretch: no serving, so the frame
    // shows a real rush — three tickets, patience running low.
    for (let index = 0; index < 18 / STEP; index += 1) {
      kitchen.step(STEP);
      if (kitchen.state.over) break;
    }
  }
  const over = kitchen.state.over;
  return { screen: over ? SCREEN_OVER : SCREEN_PLAY, best: kitchen.state.score };
}
