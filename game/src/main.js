// Boot and the one loop: input is read every frame, the kitchen advances in
// fixed 1/60 s steps (several in a slow frame, none in a fast one), and the
// renderer paints what is there. The game moves between four screens: title,
// play, paused and game over.
//
// ?seed=N fixes the order pattern. ?shot=cover|play|serve|rush (with &seed=N)
// stages that scene instead of running the loop, paints it twice and sets
// window.__shotReady for a screenshot.
import { BEST_KEY, INGREDIENTS, STEP } from './config.js';
import { createRandom } from './random.js';
import { createKitchen, EVENT_BURNT, EVENT_CHOP_DONE, EVENT_COOK_DONE, EVENT_FAIL, EVENT_OVER, EVENT_PICK, EVENT_PLATED, EVENT_SERVED, EVENT_TRASH, EVENT_WALKOUT } from './kitchen.js';
import { ACTION_CONFIRM, ACTION_PAUSE, ACTION_SERVE, ACTION_TRASH, createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer, SCREEN_OVER, SCREEN_PAUSED, SCREEN_PLAY, SCREEN_TITLE } from './render.js';
import { stageShot } from './shots.js';

/** The longest frame the loop catches up on; a longer stall (a hidden tab) is dropped, not replayed. */
const MAX_FRAME = 0.25;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const kitchen = createKitchen(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

/** Any uncaught error is recorded on the window so a headless check can see it. */
window.__gameErrors = [];
window.addEventListener('error', (event) => {
  window.__gameErrors.push(String(event.message ?? event.error));
});

function readBest() {
  try {
    return Number.parseInt(window.localStorage.getItem(BEST_KEY) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveBest(value) {
  try {
    window.localStorage.setItem(BEST_KEY, String(value));
  } catch {
    // Storage can be off (private windows): the best score then lasts this visit only.
  }
}

function runShot(name) {
  const scene = stageShot(name, kitchen);
  let painted = 0;
  function paint() {
    renderer.draw(kitchen, scene.screen, scene.best, null, null);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let best = readBest();
  let accumulator = 0;
  let last = performance.now();

  // Screen readers (and anyone watching the page's text) hear the screen changes and each serve.
  function announce(message) {
    status.textContent = message;
  }

  function playEvents(events) {
    if (events & EVENT_PICK) audio.pick();
    if (events & EVENT_CHOP_DONE) audio.chop();
    if (events & EVENT_COOK_DONE) audio.sizzle();
    if (events & EVENT_PLATED) audio.plate();
    if (events & EVENT_SERVED) audio.serve();
    if (events & EVENT_FAIL) audio.fail();
    if (events & EVENT_BURNT) audio.fail();
    if (events & EVENT_TRASH) audio.chop();
    if (events & EVENT_WALKOUT) audio.fail();
    if (events & EVENT_OVER) endGame();
  }

  function startGame() {
    kitchen.reset();
    accumulator = 0;
    screen = SCREEN_PLAY;
    announce('Main. Klik bahan, potong atau masak, rakit di piring, antar ke pelanggan.');
  }

  function endGame() {
    screen = SCREEN_OVER;
    if (kitchen.state.score > best) {
      best = kitchen.state.score;
      saveBest(best);
    }
    announce(`Shift selesai. Skor ${kitchen.state.score}, koin ${kitchen.state.coins}. Terbaik ${best}.`);
  }

  function handleClicks() {
    const click = input.takeClick();
    if (click === null) return;
    if (screen === SCREEN_TITLE || screen === SCREEN_OVER) {
      startGame();
      return;
    }
    if (screen === SCREEN_PAUSED) {
      screen = SCREEN_PLAY;
      return;
    }
    const events = kitchen.actAt(click.x, click.y);
    playEvents(events);
  }

  function handleKeys() {
    const actions = input.takeActions();
    if (actions & ACTION_PAUSE) {
      if (screen === SCREEN_PLAY) {
        screen = SCREEN_PAUSED;
        announce('Jeda.');
      } else if (screen === SCREEN_PAUSED) {
        screen = SCREEN_PLAY;
        announce('Lanjut main.');
      }
      return;
    }
    if (actions & ACTION_CONFIRM && (screen === SCREEN_TITLE || screen === SCREEN_OVER)) {
      startGame();
      return;
    }
    if (screen !== SCREEN_PLAY) return;
    if (actions & ACTION_SERVE) {
      const order = kitchen.orders.find((o) => o !== null && o.dish === kitchen.state.plate.dish);
      if (order !== null) playEvents(kitchen.serveOrder(order));
      return;
    }
    if (actions & ACTION_TRASH) {
      playEvents(kitchen.trash());
      return;
    }
    const digits = input.takeDigits();
    if (digits.length > 0) {
      const ingredient = INGREDIENTS[digits[0] - 1];
      if (ingredient !== undefined) playEvents(kitchen.pickIngredient(ingredient.id));
    }
  }

  function step() {
    const events = kitchen.step(STEP);
    playEvents(events);
  }

  function frame(now) {
    requestAnimationFrame(frame);
    accumulator += Math.min((now - last) / 1000, MAX_FRAME);
    last = now;
    handleKeys();
    handleClicks();
    if (screen === SCREEN_PLAY) {
      while (accumulator >= STEP && screen === SCREEN_PLAY) {
        step();
        accumulator -= STEP;
      }
    } else {
      accumulator = 0;
    }
    const hover = input.hover();
    const highlight = screen === SCREEN_PLAY ? kitchen.zoneAt(hover.x, hover.y) : null;
    renderer.draw(kitchen, screen, best, highlight, hover);
  }

  // Leaving the tab pauses a running game rather than letting patience run out unseen.
  document.addEventListener('visibilitychange', () => {
    if (document.hidden && screen === SCREEN_PLAY) {
      screen = SCREEN_PAUSED;
      announce('Jeda.');
    }
  });
  window.addEventListener('keydown', (event) => {
    if (event.code === 'KeyM') {
      const on = audio.toggle();
      announce(on ? 'Suara hidup.' : 'Suara mati.');
    }
  });

  announce('Warung Rush. Klik atau tekan Spasi untuk mulai.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
