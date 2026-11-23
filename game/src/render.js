// The table: everything the player sees, drawn on one canvas at a fixed
// 1280x720 logical size. Suits are told apart by colour AND shape. The
// Resonance hint is drawn BEFORE the player chooses: while it is the
// player's turn, every hand card whose suit matches state.you.lastSuit gets
// a gold glow ring and a small "✦ RESONANCE" tag under the card.
import { PALETTE, SUITS, TUNE } from './config.js';
import { suitOf } from './cards.js';

export const VIEW_W = 1280;
export const VIEW_H = 720;

const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function inRect(px, py, r) {
  return px >= r.x && px <= r.x + r.w && py >= r.y && py <= r.y + r.h;
}

export function pointInRect(px, py, r) {
  return inRect(px, py, r);
}

/** The on-screen rectangles of the player's hand cards, left to right.
 *  The hand lives between the player panel (left) and the END TURN button
 *  (right), and leaves room below for the Resonance tag. */
export function handCardRects(state, hoverIndex = -1) {
  const n = state.you.hand.length;
  if (n === 0) return [];
  const gap = 10;
  const regionX = 300;
  const regionW = 740;
  const w = Math.min(112, Math.floor((regionW - (n - 1) * gap) / n));
  const h = Math.floor((w * 150) / 112);
  const total = n * w + (n - 1) * gap;
  const startX = regionX + (regionW - total) / 2;
  const baseY = VIEW_H - h - 45;
  return state.you.hand.map((_, i) => ({
    x: startX + i * (w + gap),
    y: baseY - (i === hoverIndex ? 16 : 0),
    w,
    h,
  }));
}

/** The END TURN button rectangle. */
export function endTurnRect() {
  return { x: VIEW_W - 218, y: VIEW_H - 64, w: 190, h: 46 };
}

/** The START button rectangle on the title screen. */
export function startRect() {
  return { x: VIEW_W / 2 - 130, y: 520, w: 260, h: 56 };
}

function drawGlyph(ctx, glyph, cx, cy, size, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  if (glyph === 'triangle') {
    ctx.moveTo(cx, cy - size);
    ctx.lineTo(cx + size * 0.9, cy + size * 0.7);
    ctx.lineTo(cx - size * 0.9, cy + size * 0.7);
  } else if (glyph === 'diamond') {
    ctx.moveTo(cx, cy - size);
    ctx.lineTo(cx + size * 0.8, cy);
    ctx.lineTo(cx, cy + size);
    ctx.lineTo(cx - size * 0.8, cy);
  } else if (glyph === 'square') {
    ctx.rect(cx - size * 0.75, cy - size * 0.75, size * 1.5, size * 1.5);
  } else {
    // drop
    ctx.moveTo(cx, cy - size);
    ctx.bezierCurveTo(cx + size * 0.9, cy - size * 0.1, cx + size * 0.75, cy + size * 0.8, cx, cy + size * 0.8);
    ctx.bezierCurveTo(cx - size * 0.75, cy + size * 0.8, cx - size * 0.9, cy - size * 0.1, cx, cy - size);
  }
  ctx.closePath();
  ctx.fill();
}

function drawCardFace(ctx, card, rect, opts = {}) {
  const { x, y, w, h } = rect;
  const suit = suitOf(card);
  const resonant = !!opts.resonant;
  const affordable = opts.affordable !== false;
  const hover = !!opts.hover;

  ctx.save();
  if (resonant) {
    // The Resonance hint: a gold glow ring around the whole card.
    ctx.shadowColor = PALETTE.gold;
    ctx.shadowBlur = 22;
    ctx.strokeStyle = PALETTE.gold;
    ctx.lineWidth = 5;
    roundRect(ctx, x - 3, y - 3, w + 6, h + 6, 12);
    ctx.stroke();
    ctx.shadowBlur = 0;
  }
  roundRect(ctx, x, y, w, h, 10);
  ctx.fillStyle = affordable ? PALETTE.cream : '#cfc7b4';
  ctx.fill();
  ctx.lineWidth = hover ? 3 : 2;
  ctx.strokeStyle = resonant ? PALETTE.gold : suit.dark;
  ctx.stroke();

  // Suit band across the top.
  ctx.save();
  roundRect(ctx, x, y, w, 34, 10);
  ctx.clip();
  ctx.fillStyle = suit.color;
  ctx.fillRect(x, y, w, 34);
  ctx.restore();
  ctx.fillStyle = '#fff';
  ctx.font = `bold ${Math.max(12, Math.floor(w * 0.11))}px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(suit.name.toUpperCase(), x + 10, y + 18);

  // Ember cost, top right.
  ctx.beginPath();
  ctx.arc(x + w - 20, y + 17, 12, 0, Math.PI * 2);
  ctx.fillStyle = '#ff7a2f';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = '#7a2d05';
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = `bold 15px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(String(card.cost), x + w - 20, y + 18);

  // Big suit glyph in the middle.
  drawGlyph(ctx, suit.glyph, x + w / 2, y + h * 0.42, Math.min(26, w * 0.22), suit.color);
  ctx.strokeStyle = suit.dark;
  ctx.lineWidth = 1.5;
  ctx.stroke();

  // Name and rules text.
  ctx.fillStyle = PALETTE.ink;
  ctx.font = `bold ${Math.max(12, Math.floor(w * 0.115))}px ${FONT}`;
  ctx.textAlign = 'center';
  ctx.fillText(card.name, x + w / 2, y + h * 0.62, w - 12);
  ctx.fillStyle = '#4a4232';
  ctx.font = `${Math.max(10, Math.floor(w * 0.095))}px ${FONT}`;
  const words = card.text.split(' ');
  let line = '';
  let ly = y + h * 0.74;
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width > w - 16 && line) {
      ctx.fillText(line, x + w / 2, ly);
      ly += 14;
      line = word;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, x + w / 2, ly);

  if (resonant) {
    // The tag under the card: the hint, in words, before the player chooses.
    const tag = '✦ RESONANCE';
    ctx.font = `bold 13px ${FONT}`;
    const tw = ctx.measureText(tag).width + 18;
    const tx = x + w / 2 - tw / 2;
    const ty = y + h + 7;
    roundRect(ctx, tx, ty, tw, 20, 10);
    ctx.fillStyle = PALETTE.gold;
    ctx.fill();
    ctx.fillStyle = '#241a05';
    ctx.fillText(tag, x + w / 2, ty + 11);
  }
  ctx.restore();
}

function drawCardBack(ctx, x, y, w, h) {
  roundRect(ctx, x, y, w, h, 8);
  ctx.fillStyle = '#5a1f1a';
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = PALETTE.goldDim;
  ctx.stroke();
  roundRect(ctx, x + 6, y + 6, w - 12, h - 12, 6);
  ctx.strokeStyle = '#7a2d22';
  ctx.stroke();
  drawGlyph(ctx, 'triangle', x + w / 2, y + h / 2, Math.min(14, w * 0.2), '#e5484d');
}

function drawLifeBar(ctx, x, y, w, life, maxLife, shield, label, color) {
  ctx.fillStyle = 'rgba(0,0,0,0.45)';
  roundRect(ctx, x - 8, y - 8, w + 16, 52, 8);
  ctx.fill();
  ctx.fillStyle = PALETTE.cream;
  ctx.font = `bold 15px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x, y + 2);
  ctx.fillStyle = '#3a1512';
  roundRect(ctx, x, y + 14, w, 14, 7);
  ctx.fill();
  const frac = Math.max(0, life / maxLife);
  if (frac > 0) {
    ctx.fillStyle = color;
    roundRect(ctx, x, y + 14, Math.max(14, w * frac), 14, 7);
    ctx.fill();
  }
  ctx.fillStyle = PALETTE.cream;
  ctx.font = `bold 13px ${FONT}`;
  ctx.textAlign = 'right';
  ctx.fillText(`${life} / ${maxLife}`, x + w, y + 2);
  if (shield > 0) {
    ctx.fillStyle = '#8ec9ff';
    ctx.textAlign = 'left';
    ctx.fillText(`Shield ${shield}`, x, y + 40);
  }
}

function drawEmber(ctx, x, y, ember, maxEmber, label) {
  ctx.fillStyle = PALETTE.cream;
  ctx.font = `bold 14px ${FONT}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.fillText(label, x, y);
  for (let i = 0; i < maxEmber; i++) {
    const cx = x + 62 + i * 20;
    ctx.beginPath();
    ctx.arc(cx, y, 7, 0, Math.PI * 2);
    ctx.fillStyle = i < ember ? '#ff7a2f' : 'rgba(255,255,255,0.18)';
    ctx.fill();
    ctx.lineWidth = 1.5;
    ctx.strokeStyle = i < ember ? '#7a2d05' : 'rgba(255,255,255,0.25)';
    ctx.stroke();
  }
}

function drawTable(ctx) {
  ctx.fillStyle = PALETTE.tableDark;
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.fillStyle = PALETTE.table;
  ctx.beginPath();
  ctx.ellipse(VIEW_W / 2, VIEW_H / 2, 620, 330, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.lineWidth = 3;
  ctx.strokeStyle = PALETTE.feltLine;
  ctx.stroke();
  ctx.strokeStyle = 'rgba(245,197,66,0.25)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.ellipse(VIEW_W / 2, VIEW_H / 2, 560, 280, 0, 0, Math.PI * 2);
  ctx.stroke();
}

function drawLog(ctx, lines) {
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const shown = lines.slice(-3);
  shown.forEach((line, i) => {
    ctx.font = `${i === shown.length - 1 ? 'bold ' : ''}15px ${FONT}`;
    ctx.fillStyle = i === shown.length - 1 ? PALETTE.cream : 'rgba(247,240,220,0.6)';
    ctx.fillText(line, VIEW_W / 2, 340 + i * 22, VIEW_W - 80);
  });
}

function drawAnnouncement(ctx, announce, now) {
  if (!announce || now >= announce.until) return;
  ctx.save();
  ctx.font = `bold 30px ${FONT}`;
  const tw = ctx.measureText(announce.text).width + 48;
  const tx = VIEW_W / 2 - tw / 2;
  const ty = 252;
  ctx.shadowColor = PALETTE.gold;
  ctx.shadowBlur = 24;
  roundRect(ctx, tx, ty, tw, 52, 12);
  ctx.fillStyle = 'rgba(28,20,8,0.92)';
  ctx.fill();
  ctx.shadowBlur = 0;
  ctx.lineWidth = 2;
  ctx.strokeStyle = PALETTE.gold;
  ctx.stroke();
  ctx.fillStyle = PALETTE.gold;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(announce.text, VIEW_W / 2, ty + 27);
  ctx.restore();
}

function drawTitleScreen(ctx, ui) {
  drawTable(ctx);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = PALETTE.gold;
  ctx.font = `bold 74px ${FONT}`;
  ctx.fillText('EMBERFALL DUEL', VIEW_W / 2, 168);
  ctx.fillStyle = PALETTE.cream;
  ctx.font = '26px ' + FONT;
  ctx.fillText('Ember Warden vs Cinder, the Ashbringer', VIEW_W / 2, 232);

  // The four suits, drawn as glyphs.
  const keys = ['flame', 'tide', 'gale', 'stone'];
  keys.forEach((key, i) => {
    const suit = SUITS[key];
    const cx = VIEW_W / 2 - 210 + i * 140;
    drawGlyph(ctx, suit.glyph, cx, 310, 26, suit.color);
    ctx.fillStyle = PALETTE.cream;
    ctx.font = `bold 16px ${FONT}`;
    ctx.fillText(suit.name, cx, 352);
    ctx.fillStyle = 'rgba(247,240,220,0.75)';
    ctx.font = '13px ' + FONT;
    ctx.fillText(suit.does, cx, 376, 130);
  });

  ctx.fillStyle = PALETTE.cream;
  ctx.font = '17px ' + FONT;
  ctx.fillText('Chain the same suit twice in a turn for ✦ Resonance +2 ✦. Reduce Cinder to 0 life to win.', VIEW_W / 2, 438);
  ctx.fillStyle = 'rgba(247,240,220,0.75)';
  ctx.font = '15px ' + FONT;
  ctx.fillText('Mouse: click a card to play it · Keys 1–7 play a card, E ends your turn', VIEW_W / 2, 470);

  const btn = startRect();
  const hover = ui.mouseX >= 0 && inRect(ui.mouseX, ui.mouseY, btn);
  roundRect(ctx, btn.x, btn.y, btn.w, btn.h, 12);
  ctx.fillStyle = hover ? '#8d6bff' : PALETTE.button;
  ctx.fill();
  ctx.lineWidth = 2;
  ctx.strokeStyle = PALETTE.buttonEdge;
  ctx.stroke();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 22px ' + FONT;
  ctx.fillText('BEGIN THE DUEL', VIEW_W / 2, btn.y + 29);

  ctx.fillStyle = 'rgba(247,240,220,0.55)';
  ctx.font = '13px ' + FONT;
  ctx.fillText('A complete turn-based card duel · 40-card decks · plays offline', VIEW_W / 2, 620);
}

function drawEndScreen(ctx, state, ui) {
  const won = state.winner === 'you';
  ctx.fillStyle = 'rgba(6,12,8,0.85)';
  ctx.fillRect(0, 0, VIEW_W, VIEW_H);
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillStyle = won ? PALETTE.gold : '#ff6b5e';
  ctx.font = 'bold 64px ' + FONT;
  ctx.fillText(won ? 'VICTORY' : 'DEFEAT', VIEW_W / 2, 250);
  ctx.fillStyle = PALETTE.cream;
  ctx.font = '24px ' + FONT;
  ctx.fillText(
    won ? 'Cinder is defeated — the ember is yours.' : 'Your ember fades — Cinder takes the duel.',
    VIEW_W / 2,
    316,
  );
  ctx.font = '18px ' + FONT;
  ctx.fillStyle = 'rgba(247,240,220,0.85)';
  ctx.fillText(
    `Rounds: ${state.round} · Cards played: ${state.stats.cardsPlayed} · Resonances: ${state.stats.resonanceCount} · Deck-burns: ${state.stats.burns}`,
    VIEW_W / 2,
    362,
  );
  const btn = startRect();
  const hover = ui.mouseX >= 0 && inRect(ui.mouseX, ui.mouseY, btn);
  roundRect(ctx, btn.x, btn.y - 20, btn.w, btn.h, 12);
  ctx.fillStyle = hover ? '#8d6bff' : PALETTE.button;
  ctx.fill();
  ctx.fillStyle = '#fff';
  ctx.font = 'bold 22px ' + FONT;
  ctx.fillText('PLAY AGAIN', VIEW_W / 2, btn.y + 9);
  ctx.fillStyle = 'rgba(247,240,220,0.6)';
  ctx.font = '14px ' + FONT;
  ctx.fillText('Press Space or click PLAY AGAIN', VIEW_W / 2, 600);
}

function drawTableScreen(ctx, state, ui) {
  drawTable(ctx);
  const foe = state.foe;
  const you = state.you;

  // Cinder, top.
  drawLifeBar(ctx, 36, 30, 260, foe.life, TUNE.maxLife, foe.shield, 'CINDER, THE ASHBRINGER', PALETTE.aiRed);
  drawEmber(ctx, 36, 92, foe.ember, TUNE.maxEmber, 'Ember');
  ctx.fillStyle = PALETTE.cream;
  ctx.font = 'bold 14px ' + FONT;
  ctx.textAlign = 'right';
  ctx.textBaseline = 'middle';
  ctx.fillText(`Deck: ${foe.deck.length} · Hand: ${foe.hand.length}`, VIEW_W - 36, 92);
  // Cinder's hand, face down.
  const foeW = 62;
  const foeH = 86;
  const foeTotal = foe.hand.length * foeW + (foe.hand.length - 1) * 8;
  foe.hand.forEach((_, i) => {
    drawCardBack(ctx, (VIEW_W - foeTotal) / 2 + i * (foeW + 8), 96, foeW, foeH);
  });

  // Round marker, turn line, announcement and log, centre — hidden once the
  // duel is over, so the end screen owns the middle of the table.
  if (state.phase !== 'over') {
    ctx.fillStyle = PALETTE.cream;
    ctx.font = 'bold 15px ' + FONT;
    ctx.textAlign = 'center';
    ctx.fillText(`ROUND ${state.round}`, VIEW_W / 2, 200);
    ctx.fillStyle = 'rgba(247,240,220,0.6)';
    ctx.font = '14px ' + FONT;
    const turnText =
      state.phase === 'player'
        ? 'Your turn — play a card, or end your turn'
        : state.phase === 'ai'
          ? 'Cinder is thinking…'
          : '';
    ctx.fillText(turnText, VIEW_W / 2, 226);
    drawAnnouncement(ctx, ui.announce, ui.now);
    drawLog(ctx, state.log);
  }

  // The player, bottom.
  drawLifeBar(ctx, 36, VIEW_H - 96, 240, you.life, TUNE.maxLife, you.shield, 'EMBER WARDEN (YOU)', PALETTE.youTeal);
  drawEmber(ctx, 36, VIEW_H - 34, you.ember, TUNE.maxEmber, 'Ember');
  ctx.textAlign = 'right';
  ctx.fillText(`Deck: ${you.deck.length} · Discard: ${you.discard.length}`, VIEW_W - 36, VIEW_H - 96);

  // Resonance chain reminder, centred under the log: which suit would
  // resonate right now.
  if (state.phase === 'player' && you.lastSuit) {
    const suit = SUITS[you.lastSuit];
    ctx.fillStyle = PALETTE.gold;
    ctx.font = 'bold 15px ' + FONT;
    ctx.textAlign = 'center';
    ctx.fillText(`Last played: ${suit.name} — a ${suit.name} card resonates +2`, VIEW_W / 2, 404);
  } else if (state.phase === 'player') {
    ctx.fillStyle = 'rgba(247,240,220,0.65)';
    ctx.font = '15px ' + FONT;
    ctx.textAlign = 'center';
    ctx.fillText('Play any card — then chain its suit for Resonance +2', VIEW_W / 2, 404);
  }

  // END TURN button (not while the duel is over).
  if (state.phase !== 'over') {
    const end = endTurnRect();
    const endHover = ui.mouseX >= 0 && inRect(ui.mouseX, ui.mouseY, end);
    const endDisabled = state.phase !== 'player';
    roundRect(ctx, end.x, end.y, end.w, end.h, 10);
    ctx.fillStyle = endDisabled ? '#4a463c' : endHover ? '#8d6bff' : PALETTE.button;
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = endDisabled ? '#33302a' : PALETTE.buttonEdge;
    ctx.stroke();
    ctx.fillStyle = endDisabled ? '#9a958a' : '#fff';
    ctx.font = 'bold 19px ' + FONT;
    ctx.textAlign = 'center';
    ctx.fillText('END TURN  (E)', end.x + end.w / 2, end.y + 24);
  }

  // The player's hand, face up, with the Resonance hint on matching cards.
  // Dimmed once the duel is over, so the end screen reads first.
  if (state.phase === 'over') ctx.globalAlpha = 0.3;
  const rects = handCardRects(state, ui.hoverIndex);
  you.hand.forEach((card, i) => {
    const resonant = state.phase === 'player' && you.lastSuit !== null && card.suit === you.lastSuit;
    drawCardFace(ctx, card, rects[i], {
      resonant,
      hover: i === ui.hoverIndex,
      affordable: state.phase === 'player' && card.cost <= you.ember,
    });
  });
  ctx.globalAlpha = 1;
}

/**
 * Draw the whole game. `ui` carries the pointer, the hovered hand index, the
 * current announcement and the clock: { mouseX, mouseY, hoverIndex, announce, now }.
 */
export function render(ctx, state, ui) {
  ctx.clearRect(0, 0, VIEW_W, VIEW_H);
  ctx.textBaseline = 'middle';
  if (!state || state.phase === 'title') {
    drawTitleScreen(ctx, ui);
    return;
  }
  drawTableScreen(ctx, state, ui);
  if (state.phase === 'over') drawEndScreen(ctx, state, ui);
}
