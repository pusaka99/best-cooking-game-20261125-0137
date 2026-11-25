// Keyboard and pointer input. Clicks arrive as logical-field coordinates (the
// canvas scales the 1280x720 playfield to the window, so a click is divided by
// that scale); one-shot presses (start, pause, shortcuts) are queued as bit
// flags and taken once by the loop, so a press between two frames is never
// lost and never counted twice.

import { FIELD } from './config.js';

export const ACTION_CONFIRM = 1;
export const ACTION_PAUSE = 2;
export const ACTION_SERVE = 4;
export const ACTION_TRASH = 8;

const CONFIRM = new Set(['Space', 'Enter']);
const PAUSE = new Set(['KeyP', 'Escape']);
const SERVE = new Set(['KeyS']);
const TRASH = new Set(['KeyT', 'Delete', 'Backspace']);

export function createInput(canvas) {
  let actions = 0;
  let click = null;
  let hover = { x: -1, y: -1 };
  const keys = new Set();

  function toField(event) {
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(rect.width / FIELD.width, rect.height / FIELD.height);
    const ox = (rect.width - FIELD.width * scale) / 2;
    const oy = (rect.height - FIELD.height * scale) / 2;
    return {
      x: (event.clientX - rect.left - ox) / scale,
      y: (event.clientY - rect.top - oy) / scale,
    };
  }

  window.addEventListener('keydown', (event) => {
    if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (PAUSE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_PAUSE;
    } else if (SERVE.has(event.code)) {
      if (!event.repeat) actions |= ACTION_SERVE;
    } else if (TRASH.has(event.code)) {
      if (!event.repeat) actions |= ACTION_TRASH;
    } else {
      keys.add(event.code);
      return;
    }
    event.preventDefault();
  });
  window.addEventListener('keyup', (event) => {
    keys.delete(event.code);
  });
  window.addEventListener('blur', () => {
    keys.clear();
  });

  canvas.addEventListener('pointerdown', (event) => {
    click = toField(event);
    actions |= ACTION_CONFIRM;
  });
  canvas.addEventListener('pointermove', (event) => {
    hover = toField(event);
  });
  canvas.addEventListener('pointerleave', () => {
    hover = { x: -1, y: -1 };
  });

  return {
    /** The click since the last call, in field coordinates, or null. */
    takeClick() {
      const taken = click;
      click = null;
      return taken;
    },
    /** Where the pointer is now, in field coordinates. */
    hover() {
      return hover;
    },
    /** The one-shot presses since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** True while the key is held down (KeyA-style codes, or Digit1..Digit8). */
    held(code) {
      return keys.has(code);
    },
    /** The digit keys pressed since the last call (for the 1-8 ingredient bins). */
    takeDigits() {
      const found = [];
      for (let n = 1; n <= 8; n += 1) {
        if (keys.has(`Digit${n}`)) found.push(n);
      }
      for (const n of found) keys.delete(`Digit${n}`);
      return found;
    },
  };
}
