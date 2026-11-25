// Drawing only: the kitchen's state and the current screen in, pixels out. The
// 1280x720 playfield is scaled to fit the window and centred, the margin filled
// with the backdrop colour. Flat shapes and canvas text for the HUD and the
// panels; every food icon is drawn from primitives, so the game needs no image
// files at all. Text that holds a number is rebuilt only when the number
// changes, so a frame allocates nothing.

import { FIELD, FONT, INGREDIENTS, LAYOUT, PALETTE } from './config.js';
import { ingredientById } from './kitchen.js';
import { recipeById } from './orders.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_PAUSED = 'paused';
export const SCREEN_OVER = 'over';

const PANEL = { width: 640, top: 110, line: 36, bottom: 84 };

function cachedLabel(prefix) {
  let value = null;
  let text = '';
  return function label(next) {
    if (next !== value) {
      value = next;
      text = prefix + next;
    }
    return text;
  };
}

function roundRect(ctx, x, y, width, height, radius) {
  const r = Math.min(radius, width / 2, height / 2);
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + width, y, x + width, y + height, r);
  ctx.arcTo(x + width, y + height, x, y + height, r);
  ctx.arcTo(x, y + height, x, y, r);
  ctx.arcTo(x, y, x + width, y, r);
  ctx.closePath();
}

export function createRenderer(canvas) {
  const context = canvas.getContext('2d');
  const view = { scale: 1, x: 0, y: 0 };
  const coinsLabel = cachedLabel('Koin ');
  const scoreLabel = cachedLabel('Skor ');
  const levelLabel = cachedLabel('Level ');
  const timeLabel = cachedLabel('');
  const fonts = new Map();

  function resize() {
    const ratio = window.devicePixelRatio || 1;
    const width = Math.round(window.innerWidth * ratio);
    const height = Math.round(window.innerHeight * ratio);
    canvas.width = width;
    canvas.height = height;
    view.scale = Math.min(width / FIELD.width, height / FIELD.height);
    view.x = (width - FIELD.width * view.scale) / 2;
    view.y = (height - FIELD.height * view.scale) / 2;
  }

  function text(value, x, y, size, color, align, weight) {
    const key = `${size}|${weight ?? ''}`;
    if (!fonts.has(key)) fonts.set(key, `${weight ?? ''} ${size}px ${FONT}`.trim());
    context.font = fonts.get(key);
    context.fillStyle = color;
    context.textAlign = align ?? 'left';
    context.textBaseline = 'alphabetic';
    context.fillText(value, x, y);
  }

  function bar(x, y, width, height, fraction, fill, background) {
    context.fillStyle = background;
    roundRect(context, x, y, width, height, height / 2);
    context.fill();
    if (fraction > 0) {
      context.fillStyle = fill;
      roundRect(context, x, y, width * Math.min(1, fraction), height, height / 2);
      context.fill();
    }
  }

  /** One ingredient's icon, drawn from primitives at (cx, cy) with the given size. */
  function drawIngredient(id, cx, cy, size, prep) {
    const s = size / 2;
    context.save();
    context.translate(cx, cy);
    if (prep === 'burnt') {
      context.fillStyle = '#22201e';
      context.beginPath();
      context.arc(0, 0, s * 0.8, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#555';
      text('X', 0, s * 0.25, s, '#ddd', 'center', 'bold');
      context.restore();
      return;
    }
    if (id === 'nasi') {
      context.fillStyle = '#f5f0dc';
      context.beginPath();
      context.ellipse(0, s * 0.25, s, s * 0.55, 0, Math.PI, 0);
      context.fill();
      context.fillStyle = '#e2d9b8';
      for (let i = -2; i <= 2; i += 1) {
        context.beginPath();
        context.arc(i * s * 0.28, -s * 0.15 - Math.abs(i) * -s * 0.05, s * 0.12, 0, Math.PI * 2);
        context.fill();
      }
    } else if (id === 'mie') {
      context.strokeStyle = '#f2c94c';
      context.lineWidth = s * 0.22;
      context.lineCap = 'round';
      for (let i = -1; i <= 1; i += 1) {
        context.beginPath();
        context.moveTo(-s * 0.8, i * s * 0.45);
        context.bezierCurveTo(-s * 0.3, i * s * 0.45 - s * 0.35, s * 0.3, i * s * 0.45 + s * 0.35, s * 0.8, i * s * 0.45);
        context.stroke();
      }
    } else if (id === 'ayam') {
      context.fillStyle = '#e8915a';
      context.beginPath();
      context.arc(-s * 0.15, -s * 0.1, s * 0.62, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = '#f5f0dc';
      context.lineWidth = s * 0.22;
      context.beginPath();
      context.moveTo(s * 0.35, s * 0.35);
      context.lineTo(s * 0.85, s * 0.8);
      context.moveTo(s * 0.55, s * 0.15);
      context.lineTo(s * 0.9, s * 0.55);
      context.stroke();
    } else if (id === 'telur') {
      context.fillStyle = '#fdf6d8';
      context.beginPath();
      context.ellipse(0, 0, s * 0.85, s * 0.65, 0, 0, Math.PI * 2);
      context.fill();
      context.fillStyle = '#f2a93b';
      context.beginPath();
      context.arc(s * 0.1, 0, s * 0.38, 0, Math.PI * 2);
      context.fill();
    } else if (id === 'sayur') {
      context.fillStyle = '#5da85d';
      for (let i = -1; i <= 1; i += 1) {
        context.beginPath();
        context.ellipse(i * s * 0.5, i * s * 0.18, s * 0.42, s * 0.6, i * 0.5, 0, Math.PI * 2);
        context.fill();
      }
      context.strokeStyle = '#3f7a3a';
      context.lineWidth = s * 0.1;
      context.beginPath();
      context.moveTo(0, -s * 0.7);
      context.lineTo(0, s * 0.7);
      context.stroke();
    } else if (id === 'sate') {
      context.strokeStyle = '#8a5a33';
      context.lineWidth = s * 0.14;
      context.beginPath();
      context.moveTo(-s * 0.9, 0);
      context.lineTo(s * 0.9, 0);
      context.stroke();
      context.fillStyle = '#b0713a';
      for (let i = -1; i <= 1; i += 1) {
        roundRect(context, i * s * 0.55 - s * 0.26, -s * 0.3, s * 0.52, s * 0.6, s * 0.12);
        context.fill();
      }
    } else if (id === 'teh') {
      context.fillStyle = '#e8e0d0';
      context.beginPath();
      context.moveTo(-s * 0.55, -s * 0.7);
      context.lineTo(s * 0.55, -s * 0.7);
      context.lineTo(s * 0.4, s * 0.7);
      context.lineTo(-s * 0.4, s * 0.7);
      context.closePath();
      context.fill();
      context.fillStyle = '#c98a2e';
      context.fillRect(-s * 0.42, -s * 0.1, s * 0.84, s * 0.6);
      context.strokeStyle = '#d94f3d';
      context.lineWidth = s * 0.12;
      context.beginPath();
      context.moveTo(s * 0.2, -s * 0.7);
      context.lineTo(s * 0.45, -s * 1.05);
      context.stroke();
    } else if (id === 'es') {
      context.fillStyle = '#9fd8ef';
      context.strokeStyle = '#dff3fb';
      context.lineWidth = s * 0.08;
      roundRect(context, -s * 0.7, -s * 0.5, s * 0.6, s * 0.6, s * 0.1);
      context.fill();
      context.stroke();
      roundRect(context, s * 0.1, -s * 0.1, s * 0.6, s * 0.6, s * 0.1);
      context.fill();
      context.stroke();
    }
    if (prep === 'chopped') {
      // Two short knife cuts across one corner: the piece has been chopped.
      context.strokeStyle = 'rgba(46,33,24,0.75)';
      context.lineWidth = s * 0.09;
      context.lineCap = 'round';
      context.beginPath();
      context.moveTo(-s * 0.15, -s * 0.75);
      context.lineTo(s * 0.15, -s * 0.45);
      context.moveTo(s * 0.3, -s * 0.75);
      context.lineTo(s * 0.6, -s * 0.45);
      context.stroke();
    } else if (prep === 'cooked') {
      context.strokeStyle = 'rgba(255,255,255,0.85)';
      context.lineWidth = s * 0.1;
      context.lineCap = 'round';
      for (let i = -1; i <= 1; i += 1) {
        context.beginPath();
        context.moveTo(i * s * 0.4, -s * 0.9);
        context.quadraticCurveTo(i * s * 0.4 + s * 0.2, -s * 1.15, i * s * 0.4, -s * 1.35);
        context.stroke();
      }
    }
    context.restore();
  }

  function drawCustomerFace(customer, cx, cy, radius) {
    context.fillStyle = customer.color;
    context.beginPath();
    context.arc(cx, cy, radius, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = '#2e2118';
    context.beginPath();
    context.arc(cx - radius * 0.35, cy - radius * 0.1, radius * 0.09, 0, Math.PI * 2);
    context.arc(cx + radius * 0.35, cy - radius * 0.1, radius * 0.09, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = '#2e2118';
    context.lineWidth = radius * 0.08;
    context.beginPath();
    context.arc(cx, cy + radius * 0.25, radius * 0.35, 0.15 * Math.PI, 0.85 * Math.PI);
    context.stroke();
    if (customer.hat === 'cap') {
      context.fillStyle = '#2e2118';
      context.beginPath();
      context.ellipse(cx, cy - radius * 0.75, radius * 0.9, radius * 0.45, 0, Math.PI, 0);
      context.fill();
    } else {
      context.fillStyle = '#2e2118';
      context.beginPath();
      context.arc(cx, cy - radius * 0.85, radius * 0.4, 0, Math.PI * 2);
      context.fill();
    }
  }

  function drawHud(kitchen) {
    const hud = LAYOUT.hud;
    context.fillStyle = PALETTE.accent;
    context.fillRect(hud.x, hud.y, hud.width, hud.height);
    text('WARUNG RUSH', 20, 38, 26, '#fff8e7', 'left', 'bold');
    text(coinsLabel(kitchen.state.coins), 280, 37, 22, '#ffe9a8', 'left', 'bold');
    text(scoreLabel(kitchen.state.score), 430, 37, 22, '#fff8e7', 'left');
    text(levelLabel(kitchen.state.level), 580, 37, 22, '#fff8e7', 'left');
    const minutes = Math.floor(kitchen.state.shiftLeft / 60);
    const seconds = Math.floor(kitchen.state.shiftLeft % 60);
    text(timeLabel(`${minutes}:${String(seconds).padStart(2, '0')}`), 700, 37, 22, kitchen.state.shiftLeft < 30 ? '#ffd166' : '#fff8e7', 'left', 'bold');
    for (let i = 0; i < 3; i += 1) {
      context.fillStyle = i < kitchen.state.hearts ? '#ff6b6b' : 'rgba(255,255,255,0.3)';
      context.beginPath();
      const hx = 880 + i * 34;
      context.arc(hx, 26, 9, 0, Math.PI * 2);
      context.arc(hx + 11, 26, 9, 0, Math.PI * 2);
      context.fill();
      context.beginPath();
      context.moveTo(hx - 8, 30);
      context.lineTo(hx + 19, 30);
      context.lineTo(hx + 5.5, 46);
      context.closePath();
      context.fill();
    }
    if (kitchen.state.combo >= 2) {
      text(`Combo x${kitchen.state.combo}`, 990, 37, 22, '#ffe9a8', 'left', 'bold');
    }
    text('P jeda', 1240, 37, 15, 'rgba(255,248,231,0.75)', 'right');
  }

  function drawBins(kitchen, highlight) {
    const bins = LAYOUT.bins;
    for (let index = 0; index < INGREDIENTS.length; index += 1) {
      const ingredient = INGREDIENTS[index];
      const rect = kitchen.binRect(index);
      const hovered = highlight !== null && highlight.kind === 'bin' && highlight.ingredient === ingredient.id;
      context.fillStyle = hovered ? '#e8d3a8' : PALETTE.panel;
      roundRect(context, rect.x, rect.y, rect.width, rect.height, 12);
      context.fill();
      context.strokeStyle = PALETTE.panelEdge;
      context.lineWidth = 2;
      context.stroke();
      drawIngredient(ingredient.id, rect.x + rect.width / 2, rect.y + 52, 64, 'raw');
      text(ingredient.name, rect.x + rect.width / 2, rect.y + 112, 19, PALETTE.text, 'center', 'bold');
      const verb = ingredient.prep === 'chop' ? 'potong' : ingredient.prep === 'cook' ? 'masak' : 'tuang';
      text(`${ingredient.key} · ${verb}`, rect.x + rect.width / 2, rect.y + 134, 14, PALETTE.muted, 'center');
    }
  }

  function drawStations(kitchen, highlight) {
    const board = LAYOUT.board;
    const wok = LAYOUT.wok;
    const plate = LAYOUT.plate;

    // Talenan (chopping board)
    context.fillStyle = highlight !== null && highlight.kind === 'board' ? '#e8d3a8' : PALETTE.board;
    roundRect(context, board.x, board.y, board.width, board.height, 14);
    context.fill();
    context.fillStyle = 'rgba(0,0,0,0.08)';
    context.fillRect(board.x + 16, board.y + 16, board.width - 32, board.height - 32);
    text('TALENAN', board.x + 20, board.y + 36, 18, '#5a3a1e', 'left', 'bold');
    const boardItem = kitchen.state.board.item;
    if (boardItem !== null) {
      drawIngredient(boardItem.ing, board.x + board.width / 2, board.y + 96, 84, 'raw');
      bar(board.x + 30, board.y + 148, board.width - 60, 14, kitchen.state.board.progress, '#4e7a3a', 'rgba(0,0,0,0.2)');
      text(kitchen.state.board.progress >= 1 ? 'Siap diambil!' : 'Memotong…', board.x + board.width / 2, board.y + 182, 15, '#5a3a1e', 'center');
    } else {
      text('Klik bahan potong', board.x + board.width / 2, board.y + 100, 16, 'rgba(90,58,30,0.6)', 'center');
      text('Ayam · Sayur', board.x + board.width / 2, board.y + 126, 15, 'rgba(90,58,30,0.6)', 'center');
    }

    // Wajan (wok)
    context.fillStyle = highlight !== null && highlight.kind === 'wok' ? '#e8d3a8' : PALETTE.panel;
    roundRect(context, wok.x, wok.y, wok.width, wok.height, 14);
    context.fill();
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 2;
    context.stroke();
    text('WAJAN', wok.x + 20, wok.y + 36, 18, PALETTE.text, 'left', 'bold');
    const wokState = kitchen.state.wok;
    if (wokState.item !== null) {
      context.fillStyle = PALETTE.wok;
      context.beginPath();
      context.ellipse(wok.x + wok.width / 2, wok.y + 108, 96, 34, 0, 0, Math.PI * 2);
      context.fill();
      drawIngredient(wokState.item.ing, wok.x + wok.width / 2, wok.y + 96, 72, wokState.burnt ? 'burnt' : wokState.done ? 'cooked' : 'raw');
      const fraction = Math.min(1, wokState.progress / 3.0);
      bar(wok.x + 30, wok.y + 148, wok.width - 60, 14, fraction, wokState.burnt ? '#d94f3d' : '#e8a91c', 'rgba(0,0,0,0.2)');
      text(wokState.burnt ? 'HANGUS! Klik untuk buang.' : wokState.done ? 'Matang! Klik untuk ambil.' : 'Memasak…', wok.x + wok.width / 2, wok.y + 182, 15, wokState.burnt ? '#d94f3d' : PALETTE.text, 'center');
    } else {
      text('Klik bahan masak', wok.x + wok.width / 2, wok.y + 100, 16, PALETTE.muted, 'center');
      text('Nasi · Mie · Telur · Sate', wok.x + wok.width / 2, wok.y + 126, 15, PALETTE.muted, 'center');
    }

    // Piring (plate)
    const ready = kitchen.state.plate.dish !== null;
    context.fillStyle = ready ? '#fff3c4' : PALETTE.plate;
    roundRect(context, plate.x, plate.y, plate.width, plate.height, 14);
    context.fill();
    context.strokeStyle = ready ? '#e8a91c' : PALETTE.panelEdge;
    context.lineWidth = ready ? 4 : 2;
    context.stroke();
    text('PIRING', plate.x + 20, plate.y + 36, 18, PALETTE.text, 'left', 'bold');
    if (ready) {
      const recipe = recipeById(kitchen.state.plate.dish);
      text(`✓ ${recipe.name} — SIAP DIANTAR!`, plate.x + 220, plate.y + 36, 18, '#4e7a3a', 'left', 'bold');
    } else if (kitchen.state.plate.items.length > 0) {
      const candidates = kitchen.plateCandidates();
      const hint = candidates.length > 0 ? candidates.map((r) => r.name).join(' / ') : '—';
      text(`Merakit: ${hint}`, plate.x + 220, plate.y + 36, 16, PALETTE.muted, 'left');
    }
    context.fillStyle = '#fdfaf2';
    context.strokeStyle = '#d9b380';
    context.lineWidth = 2;
    context.beginPath();
    context.ellipse(plate.x + 150, plate.y + 130, 110, 62, 0, 0, Math.PI * 2);
    context.fill();
    context.stroke();
    const items = kitchen.state.plate.items;
    for (let i = 0; i < items.length; i += 1) {
      drawIngredient(items[i].ing, plate.x + 90 + i * 62, plate.y + 130, 56, items[i].prep);
    }
    for (let i = items.length; i < 3; i += 1) {
      context.strokeStyle = 'rgba(0,0,0,0.15)';
      context.setLineDash([6, 6]);
      context.beginPath();
      context.arc(plate.x + 90 + i * 62, plate.y + 130, 24, 0, Math.PI * 2);
      context.stroke();
      context.setLineDash([]);
    }
    text('Klik piring untuk menambah bahan.', plate.x + 330, plate.y + 100, 15, PALETTE.muted, 'left');
    text('Klik pesanan untuk mengantar.', plate.x + 330, plate.y + 126, 15, PALETTE.muted, 'left');
    text('T = buang isi piring.', plate.x + 330, plate.y + 152, 15, PALETTE.muted, 'left');

    // Tempat sampah
    const trash = LAYOUT.trash;
    context.fillStyle = highlight !== null && highlight.kind === 'trash' ? '#e8d3a8' : '#6b7280';
    roundRect(context, trash.x, trash.y, trash.width, trash.height, 10);
    context.fill();
    text('BUANG', trash.x + trash.width / 2, trash.y + 42, 15, '#fff', 'center', 'bold');
  }

  function drawOrders(kitchen, highlight) {
    const orders = LAYOUT.orders;
    for (let index = 0; index < kitchen.orders.length; index += 1) {
      const rect = {
        x: orders.x,
        y: orders.y + index * (orders.height + orders.gap),
        width: orders.width,
        height: orders.height,
      };
      const order = kitchen.orders[index];
      const hovered = highlight !== null && highlight.kind === 'order' && highlight.order === order;
      if (order === null) {
        context.fillStyle = 'rgba(255,248,231,0.45)';
        roundRect(context, rect.x, rect.y, rect.width, rect.height, 12);
        context.fill();
        context.strokeStyle = 'rgba(217,179,128,0.6)';
        context.setLineDash([6, 6]);
        context.stroke();
        context.setLineDash([]);
        text('Menunggu pelanggan…', rect.x + rect.width / 2, rect.y + rect.height / 2 + 6, 15, PALETTE.muted, 'center');
        continue;
      }
      const urgent = order.patience < order.maxPatience * 0.3;
      context.fillStyle = hovered ? '#ffe9a8' : PALETTE.panel;
      roundRect(context, rect.x, rect.y, rect.width, rect.height, 12);
      context.fill();
      context.strokeStyle = urgent ? '#d94f3d' : PALETTE.panelEdge;
      context.lineWidth = urgent ? 3 : 2;
      context.stroke();
      drawCustomerFace(order.customer, rect.x + 34, rect.y + 34, 22);
      text(order.customer.name, rect.x + 66, rect.y + 30, 16, PALETTE.text, 'left', 'bold');
      text(order.name, rect.x + 66, rect.y + 54, 20, PALETTE.accent, 'left', 'bold');
      text(`Rp ${order.price}`, rect.x + rect.width - 14, rect.y + 30, 16, '#4e7a3a', 'right', 'bold');
      // Component chips: what the dish needs, checked off as the plate matches.
      const plateItems = kitchen.state.plate.items;
      const remaining = plateItems.slice();
      for (let i = 0; i < order.needs.length; i += 1) {
        const need = order.needs[i];
        const cx = rect.x + 40 + i * 78;
        const cy = rect.y + 108;
        context.fillStyle = '#f3e2c2';
        context.beginPath();
        context.arc(cx, cy, 28, 0, Math.PI * 2);
        context.fill();
        drawIngredient(need.ing, cx, cy, 44, need.prep);
        const doneIndex = remaining.findIndex((item) => item.ing === need.ing && item.prep === need.prep);
        if (doneIndex !== -1) {
          remaining.splice(doneIndex, 1);
          context.fillStyle = '#4e7a3a';
          context.beginPath();
          context.arc(cx + 18, cy + 18, 11, 0, Math.PI * 2);
          context.fill();
          text('✓', cx + 18, cy + 22, 14, '#fff', 'center', 'bold');
        }
        const label = need.prep === 'chopped' ? 'potong' : need.prep === 'cooked' ? 'masak' : 'tuang';
        text(label, cx, cy + 46, 12, PALETTE.muted, 'center');
      }
      bar(rect.x + 16, rect.y + rect.height - 24, rect.width - 32, 12, order.patience / order.maxPatience, urgent ? '#d94f3d' : '#4e7a3a', 'rgba(0,0,0,0.15)');
    }
  }

  function drawHands(kitchen, hover) {
    const hands = LAYOUT.hands;
    context.fillStyle = PALETTE.panel;
    roundRect(context, hands.x, hands.y, hands.width, hands.height, 12);
    context.fill();
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 2;
    context.stroke();
    text('TANGAN', hands.x + 16, hands.y + 28, 15, PALETTE.muted, 'left', 'bold');
    if (kitchen.state.carrying !== null) {
      const item = kitchen.state.carrying;
      drawIngredient(item.ing, hands.x + 52, hands.y + 58, 56, item.prep);
      const ingredient = ingredientById(item.ing);
      const prepName = item.prep === 'raw' ? 'mentah' : item.prep === 'chopped' ? 'dipotong' : item.prep === 'cooked' ? 'matang' : 'dituang';
      text(`${ingredient.name} (${prepName})`, hands.x + 92, hands.y + 52, 17, PALETTE.text, 'left', 'bold');
      text('Klik talenan / wajan / piring', hands.x + 92, hands.y + 74, 13, PALETTE.muted, 'left');
    } else {
      text('Kosong — klik bahan di kiri.', hands.x + 16, hands.y + 58, 16, PALETTE.muted, 'left');
    }
    if (hover !== null && kitchen.state.carrying !== null && hover.x >= 0) {
      context.fillStyle = 'rgba(255,248,231,0.95)';
      context.beginPath();
      context.arc(hover.x, hover.y - 18, 26, 0, Math.PI * 2);
      context.fill();
      context.strokeStyle = PALETTE.panelEdge;
      context.stroke();
      drawIngredient(kitchen.state.carrying.ing, hover.x, hover.y - 18, 40, kitchen.state.carrying.prep);
    }
  }

  function drawHint(kitchen) {
    const hint = LAYOUT.hint;
    context.fillStyle = 'rgba(255,248,231,0.75)';
    roundRect(context, hint.x, hint.y, hint.width, hint.height, 10);
    context.fill();
    text('Cara main: klik bahan → potong/masak → rakit di piring → antar.', hint.x + 14, hint.y + 25, 14, PALETTE.text, 'left');
    text('Tombol 1-8 pilih bahan · Spasi mulai · S antar piring jadi · T buang', hint.x + 14, hint.y + 46, 13, PALETTE.muted, 'left');
    const toast = LAYOUT.toast;
    if (kitchen.state.messageTimer > 0 && kitchen.state.message !== '') {
      context.fillStyle = 'rgba(46,33,24,0.85)';
      roundRect(context, toast.x, toast.y, toast.width, toast.height, 10);
      context.fill();
      text(kitchen.state.message, toast.x + toast.width / 2, toast.y + 26, 16, '#fff8e7', 'center');
    }
  }

  function drawKitchen(kitchen, highlight, hover) {
    context.fillStyle = PALETTE.wall;
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.fillStyle = PALETTE.wallTrim;
    context.fillRect(0, LAYOUT.hud.height, FIELD.width, 6);
    context.fillStyle = PALETTE.floor;
    context.fillRect(0, 604, FIELD.width, 116);
    context.fillStyle = PALETTE.counter;
    context.fillRect(308, 60, 648, 536);
    context.fillStyle = PALETTE.counterTop;
    context.fillRect(308, 60, 648, 10);
    drawHud(kitchen);
    drawBins(kitchen, highlight);
    drawStations(kitchen, highlight);
    drawOrders(kitchen, highlight);
    drawHands(kitchen, hover);
    drawHint(kitchen);
  }

  function drawPanel(title, lines, prompt) {
    const x = (FIELD.width - PANEL.width) / 2;
    let height = PANEL.top + PANEL.line * lines.length + PANEL.bottom;
    const y = (FIELD.height - height) / 2;
    context.fillStyle = 'rgba(36,26,18,0.55)';
    context.fillRect(0, 0, FIELD.width, FIELD.height);
    context.fillStyle = PALETTE.panel;
    roundRect(context, x, y, PANEL.width, height, 16);
    context.fill();
    context.strokeStyle = PALETTE.panelEdge;
    context.lineWidth = 2;
    context.stroke();
    text(title, x + PANEL.width / 2, y + 58, 34, PALETTE.accent, 'center', 'bold');
    for (let i = 0; i < lines.length; i += 1) {
      text(lines[i].text, x + PANEL.width / 2, y + 104 + i * PANEL.line, lines[i].size ?? 18, lines[i].color ?? PALETTE.text, 'center', lines[i].weight);
    }
    if (prompt !== null) {
      text(prompt, x + PANEL.width / 2, y + height - 30, 17, PALETTE.muted, 'center');
    }
  }

  function draw(kitchen, screen, best, highlight, hover) {
    resize();
    context.setTransform(1, 0, 0, 1, 0, 0);
    context.fillStyle = PALETTE.backdrop;
    context.fillRect(0, 0, canvas.width, canvas.height);
    context.setTransform(view.scale, 0, 0, view.scale, view.x, view.y);
    drawKitchen(kitchen, highlight, hover);
    if (screen === SCREEN_TITLE) {
      drawPanel('WARUNG RUSH', [
        { text: 'Masak cepat, antar tepat waktu!', size: 20 },
        { text: 'Klik bahan → potong / masak → rakit di piring → antar.', size: 17 },
        { text: 'Pelanggan kehabisan sabar = hati hilang. Shift 2,5 menit.', size: 17 },
        { text: `Skor terbaik: ${best}`, size: 17, color: '#4e7a3a', weight: 'bold' },
      ], 'Klik atau tekan Spasi untuk mulai');
    } else if (screen === SCREEN_PAUSED) {
      drawPanel('JEDA', [
        { text: 'Istirahat sebentar, dapur menunggu.', size: 18 },
      ], 'Tekan P atau klik untuk lanjut');
    } else if (screen === SCREEN_OVER) {
      const state = kitchen.state;
      drawPanel('SHIFT SELESAI', [
        { text: state.overReason, size: 18 },
        { text: `Skor ${state.score} · Koin ${state.coins}`, size: 22, weight: 'bold' },
        { text: `Hidangan diantar: ${state.dishesServed} · Combo terbaik x${state.bestCombo}`, size: 17 },
        { text: `Skor terbaik: ${best}`, size: 17, color: '#4e7a3a', weight: 'bold' },
      ], 'Klik atau tekan Spasi untuk main lagi');
    }
  }

  return { draw, drawIngredient };
}
