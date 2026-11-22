// Everything the eye sees, and nothing the rules need: the green baize table, the two
// life bars, the rival's face-down hand, your fanned hand, the card faces (cost, suit shape,
// name, power, one line of rules), the title, victory and defeat screens, and the small
// flourishes — floating damage numbers, ember bursts, drifting motes. The table is drawn in
// a fixed 1280x720 logical space and scaled to the window, so a screenshot and a live game
// look the same. Every suit is told by colour AND shape, so the cards read at thumbnail size.
import { CARD, DUEL, FIELD, FOE_CARD, FONT, PALETTE, SUITS } from './config.js';
import { suitOf } from './cards.js';

export const SCREEN_TITLE = 'title';
export const SCREEN_PLAY = 'play';
export const SCREEN_WON = 'won';
export const SCREEN_LOST = 'lost';

const HAND_Y = 470;
const FOE_Y = 78;
const STAGE = { x: 565, y: 222, w: 150, h: 208 };
const END_BUTTON = { x: 1064, y: 600, w: 192, h: 56 };

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

/** The suit's shape: triangle, drop, diamond or square, centred on (cx, cy). */
function drawSuitShape(ctx, shape, cx, cy, size, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  if (shape === 'triangle') {
    ctx.moveTo(cx, cy - size);
    ctx.lineTo(cx + size * 0.9, cy + size * 0.75);
    ctx.lineTo(cx - size * 0.9, cy + size * 0.75);
  } else if (shape === 'drop') {
    ctx.moveTo(cx, cy - size);
    ctx.quadraticCurveTo(cx + size, cy + size * 0.2, cx, cy + size * 0.9);
    ctx.quadraticCurveTo(cx - size, cy + size * 0.2, cx, cy - size);
  } else if (shape === 'diamond') {
    ctx.moveTo(cx, cy - size);
    ctx.lineTo(cx + size * 0.8, cy);
    ctx.lineTo(cx, cy + size);
    ctx.lineTo(cx - size * 0.8, cy);
  } else {
    ctx.rect(cx - size * 0.8, cy - size * 0.8, size * 1.6, size * 1.6);
  }
  ctx.closePath();
  ctx.fill();
}

export function createRenderer(canvas) {
  const ctx = canvas.getContext('2d');
  const floaters = [];
  const bursts = [];

  /** A damage or heal number that rises and fades above the table. */
  function spawnFloat(x, y, text, color) {
    floaters.push({ x, y, text, color, t: 0, life: 1.1 });
  }

  /** A spray of ember sparks from a played card. */
  function spawnBurst(x, y, color) {
    for (let i = 0; i < 26; i += 1) {
      const angle = (i / 26) * Math.PI * 2 + 0.3;
      const speed = 60 + (i % 5) * 34;
      bursts.push({ x, y, vx: Math.cos(angle) * speed, vy: Math.sin(angle) * speed - 40, color, t: 0, life: 0.7 + (i % 3) * 0.12 });
    }
  }

  function updateEffects(dt) {
    for (let i = floaters.length - 1; i >= 0; i -= 1) {
      floaters[i].t += dt;
      if (floaters[i].t >= floaters[i].life) floaters.splice(i, 1);
    }
    for (let i = bursts.length - 1; i >= 0; i -= 1) {
      const p = bursts[i];
      p.t += dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vy += 160 * dt;
      if (p.t >= p.life) bursts.splice(i, 1);
    }
  }

  /** Where each card of a hand of `count` sits, fanned around the table's centre. */
  function playerHandLayout(count) {
    const overlap = 18;
    const total = count * CARD.width - (count - 1) * overlap;
    const rects = [];
    for (let i = 0; i < count; i += 1) {
      const x = (FIELD.width - total) / 2 + i * (CARD.width - overlap);
      const middle = (count - 1) / 2;
      const tilt = (i - middle) * 0.028;
      const lift = Math.abs(i - middle) * 3;
      rects.push({ x, y: HAND_Y + lift, w: CARD.width, h: CARD.height, tilt });
    }
    return rects;
  }

  function foeHandLayout(count) {
    const overlap = 30;
    const total = count * FOE_CARD.width - Math.max(0, count - 1) * overlap;
    const rects = [];
    for (let i = 0; i < count; i += 1) {
      rects.push({ x: (FIELD.width - total) / 2 + i * (FOE_CARD.width - overlap), y: FOE_Y, w: FOE_CARD.width, h: FOE_CARD.height, tilt: 0 });
    }
    return rects;
  }

  function drawCardFace(cardValue, x, y, w, h, options) {
    const suit = suitOf(cardValue);
    const scale = w / CARD.width;
    ctx.save();
    ctx.translate(x + w / 2, y + h / 2);
    if (options.tilt) ctx.rotate(options.tilt);
    ctx.translate(-w / 2, -h / 2);
    roundRect(ctx, 0, 0, w, h, CARD.radius * scale);
    ctx.fillStyle = '#f7f1de';
    ctx.fill();
    ctx.lineWidth = 3 * scale;
    ctx.strokeStyle = options.disabled ? '#9a938a' : suit.color;
    ctx.stroke();
    // Suit band across the top.
    ctx.fillStyle = suit.color;
    roundRect(ctx, 0, 0, w, 34 * scale, CARD.radius * scale);
    ctx.fillRect(0, 20 * scale, w, 14 * scale);
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${13 * scale}px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(suit.name.toUpperCase(), 48 * scale, 17 * scale);
    // Cost: a big number in a circle, top left over the band.
    ctx.beginPath();
    ctx.arc(26 * scale, 26 * scale, 17 * scale, 0, Math.PI * 2);
    ctx.fillStyle = options.disabled ? '#8a8378' : suit.dark;
    ctx.fill();
    ctx.lineWidth = 2 * scale;
    ctx.strokeStyle = '#f7f1de';
    ctx.stroke();
    ctx.fillStyle = '#fff';
    ctx.font = `bold ${20 * scale}px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(String(cardValue.cost), 26 * scale, 27 * scale);
    // The suit's shape, big in the middle.
    drawSuitShape(ctx, suit.shape, w / 2, 92 * scale, 26 * scale, suit.color);
    // Power: the number the card hits, heals or shields for.
    ctx.fillStyle = '#241f16';
    ctx.font = `bold ${34 * scale}px ${FONT}`;
    ctx.fillText(String(cardValue.power), w / 2, 138 * scale);
    // Name and the one line of rules.
    ctx.font = `bold ${14.5 * scale}px ${FONT}`;
    ctx.fillText(cardValue.name, w / 2, 164 * scale);
    ctx.font = `${12 * scale}px ${FONT}`;
    ctx.fillStyle = '#5c5546';
    ctx.fillText(cardValue.text, w / 2, 186 * scale);
    if (options.disabled) {
      ctx.fillStyle = 'rgba(40, 36, 28, 0.45)';
      roundRect(ctx, 0, 0, w, h, CARD.radius * scale);
      ctx.fill();
    }
    ctx.restore();
  }

  function drawCardBack(x, y, w, h) {
    roundRect(ctx, x, y, w, h, FOE_CARD.radius);
    ctx.fillStyle = '#1d3a2a';
    ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = PALETTE.tableEdge;
    ctx.stroke();
    drawSuitShape(ctx, 'diamond', x + w / 2, y + h / 2, 16, PALETTE.gold);
    ctx.beginPath();
    ctx.arc(x + w / 2, y + h / 2, 5, 0, Math.PI * 2);
    ctx.fillStyle = PALETTE.ember;
    ctx.fill();
  }

  function drawLifeBar(x, y, w, label, side, alignRight) {
    ctx.textAlign = alignRight ? 'right' : 'left';
    ctx.textBaseline = 'alphabetic';
    ctx.font = `bold 15px ${FONT}`;
    ctx.fillStyle = PALETTE.text;
    const labelX = alignRight ? x + w : x;
    ctx.fillText(label, labelX, y - 8);
    ctx.fillStyle = PALETTE.hpBack;
    roundRect(ctx, x, y, w, 22, 6);
    ctx.fill();
    const fill = Math.max(0, (side.hp / DUEL.maxHp) * w);
    if (fill > 0) {
      ctx.fillStyle = side.hp <= 10 ? PALETTE.danger : PALETTE.hp;
      roundRect(ctx, x, y, fill, 22, 6);
      ctx.fill();
    }
    ctx.font = `bold 15px ${FONT}`;
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.fillText(`${side.hp} / ${DUEL.maxHp}`, x + w / 2, y + 16);
    if (side.shield > 0) {
      ctx.textAlign = alignRight ? 'right' : 'left';
      ctx.fillStyle = PALETTE.shield;
      ctx.font = `bold 15px ${FONT}`;
      ctx.fillText(`🛡 ${side.shield}`, alignRight ? x - 12 : x + w + 12, y + 16);
    }
    ctx.textAlign = 'left';
  }

  function drawEmberPips(side) {
    const label = `EMBER ${side.ember}/${side.emberMax}`;
    ctx.font = `bold 16px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.gold;
    ctx.fillText(label, END_BUTTON.x + END_BUTTON.w / 2, END_BUTTON.y - 34);
    for (let i = 0; i < side.emberMax; i += 1) {
      const cx = END_BUTTON.x + 14 + i * 18;
      const cy = END_BUTTON.y - 16;
      drawSuitShape(ctx, 'diamond', cx, cy, 7, i < side.ember ? PALETTE.ember : '#3a4a3e');
    }
    ctx.textAlign = 'left';
  }

  function drawTable(state, timeSec) {
    // Baize with a gold rim and a soft centre glow.
    ctx.fillStyle = PALETTE.feltDark;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    const glow = ctx.createRadialGradient(640, 330, 60, 640, 330, 620);
    glow.addColorStop(0, PALETTE.table);
    glow.addColorStop(1, PALETTE.felt);
    ctx.fillStyle = glow;
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    ctx.strokeStyle = PALETTE.tableEdge;
    ctx.lineWidth = 4;
    ctx.strokeRect(10, 10, FIELD.width - 20, FIELD.height - 20);
    // Drifting ember motes: pure functions of time, so a staged frame is repeatable.
    for (let i = 0; i < 26; i += 1) {
      const mx = ((i * 197 + timeSec * (9 + (i % 4) * 3)) % 1280);
      const my = 700 - ((i * 131 + timeSec * (14 + (i % 3) * 6)) % 700);
      ctx.globalAlpha = 0.16 + (i % 3) * 0.08;
      ctx.fillStyle = i % 2 ? PALETTE.ember : PALETTE.gold;
      ctx.beginPath();
      ctx.arc(mx, my, 2 + (i % 3), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawStage(state) {
    // The middle of the table: the last card played, large, or the four suits waiting.
    const play = state.lastPlay;
    if (play) {
      const suit = suitOf(play.card);
      ctx.save();
      ctx.shadowColor = suit.color;
      ctx.shadowBlur = 26;
      drawCardFace(play.card, STAGE.x, STAGE.y, STAGE.w, STAGE.h, {});
      ctx.restore();
      ctx.textAlign = 'center';
      ctx.font = `bold 16px ${FONT}`;
      ctx.fillStyle = play.side === 'you' ? PALETTE.gold : '#f0a8a0';
      ctx.fillText(play.side === 'you' ? 'YOU PLAYED' : 'CINDER PLAYED', STAGE.x + STAGE.w / 2, STAGE.y - 12);
      if (play.resonance) {
        ctx.fillStyle = PALETTE.gold;
        ctx.font = `bold 20px ${FONT}`;
        ctx.fillText('✦ RESONANCE +2 ✦', STAGE.x + STAGE.w / 2, STAGE.y + STAGE.h + 26);
      }
      // The damage, heal or shield the card caused, as plain text beside it.
      let line = '';
      for (const event of play.events) {
        if (event.type === 'damage') line = `-${event.life} life${event.soaked ? ` (${event.soaked} soaked)` : ''}`;
        if (event.type === 'heal') line = `+${event.amount} life`;
        if (event.type === 'shield') line = `+${event.amount} shield`;
        if (event.type === 'draw') line = `Drew ${event.amount}`;
      }
      if (line) {
        ctx.fillStyle = PALETTE.text;
        ctx.font = `bold 18px ${FONT}`;
        ctx.fillText(line, STAGE.x + STAGE.w / 2, STAGE.y + STAGE.h + (play.resonance ? 48 : 28));
      }
    } else {
      ctx.textAlign = 'center';
      ctx.fillStyle = PALETTE.muted;
      ctx.font = `bold 17px ${FONT}`;
      ctx.fillText('FOUR SUITS · ONE EMBER', 640, 250);
      const suits = Object.values(SUITS);
      for (let i = 0; i < suits.length; i += 1) {
        drawSuitShape(ctx, suits[i].shape, 490 + i * 100, 300, 24, suits[i].color);
        ctx.fillStyle = PALETTE.text;
        ctx.font = `bold 14px ${FONT}`;
        ctx.fillText(suits[i].name.toUpperCase(), 490 + i * 100, 340);
        ctx.fillStyle = PALETTE.muted;
        ctx.font = '13px ' + FONT;
        ctx.fillText(suits[i].verb, 490 + i * 100, 360);
      }
    }
    ctx.textAlign = 'left';
  }

  function drawPlay(state, ui, timeSec) {
    drawTable(state, timeSec);
    // Life bars: Cinder top left, you top right; the round between them.
    drawLifeBar(24, 40, 300, 'CINDER · THE ASHBRINGER', state.foe, false);
    drawLifeBar(956, 40, 300, 'YOU · EMBER WARDEN', state.you, true);
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.gold;
    ctx.font = `bold 20px ${FONT}`;
    ctx.fillText(`ROUND ${state.round}`, 640, 34);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '14px ' + FONT;
    ctx.fillText(`Decks  ${state.you.deck.length} · ${state.foe.deck.length}`, 640, 56);
    ctx.textAlign = 'left';
    // The rival's hand, face down.
    const foeRects = foeHandLayout(state.foe.hand.length);
    for (const rect of foeRects) drawCardBack(rect.x, rect.y, rect.w, rect.h);
    if (!ui.minimal) drawStage(state);
    // Your hand, fanned; the hovered card lifts, unaffordable cards dim.
    const rects = playerHandLayout(state.you.hand.length);
    for (let i = 0; i < rects.length; i += 1) {
      const rect = rects[i];
      const hovered = ui.hoverIndex === i;
      const y = hovered ? rect.y - 26 : rect.y;
      drawCardFace(state.you.hand[i], rect.x, y, rect.w, rect.h, {
        tilt: hovered ? 0 : rect.tilt,
        disabled: state.phase === 'player' && state.you.hand[i].cost > state.you.ember,
      });
      if (hovered) {
        ctx.font = `bold 13px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.fillStyle = PALETTE.gold;
        ctx.fillText(`[${i + 1}]`, rect.x + rect.w / 2, rect.y - 32);
        ctx.textAlign = 'left';
      }
    }
    // Ember pips and the End Turn button.
    drawEmberPips(state.you);
    const endHover = ui.endHover && state.phase === 'player';
    ctx.fillStyle = state.phase === 'player' ? (endHover ? '#e3b93a' : PALETTE.button) : '#5c5546';
    roundRect(ctx, END_BUTTON.x, END_BUTTON.y, END_BUTTON.w, END_BUTTON.h, 10);
    ctx.fill();
    ctx.fillStyle = state.phase === 'player' ? PALETTE.buttonText : '#cfc8b8';
    ctx.font = `bold 19px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.fillText(state.phase === 'player' ? 'END TURN  ⏎' : 'CINDER…', END_BUTTON.x + END_BUTTON.w / 2, END_BUTTON.y + 35);
    ctx.textAlign = 'left';
    // Turn hint: the last thing that happened, then how to play.
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '13px ' + FONT;
    ctx.textAlign = 'center';
    const lastLine = state.log[state.log.length - 1] ?? '';
    const hint = state.phase === 'player'
      ? `${lastLine}   ·   Click a card to play it · keys 1–7 · E ends turn`
      : lastLine;
    ctx.fillText(hint, 640, 706);
    ctx.textAlign = 'left';
    // Floating numbers and sparks.
    for (const floater of floaters) {
      const progress = floater.t / floater.life;
      ctx.globalAlpha = 1 - progress;
      ctx.fillStyle = floater.color;
      ctx.font = `bold 26px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.fillText(floater.text, floater.x, floater.y - progress * 46);
    }
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
    for (const p of bursts) {
      const progress = p.t / p.life;
      ctx.globalAlpha = 1 - progress;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, 3.5 * (1 - progress * 0.5), 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.globalAlpha = 1;
  }

  function drawTitle(state, ui, timeSec) {
    drawTable(state, timeSec);
    // Four suit cards fanned behind the title.
    const suits = Object.keys(SUITS);
    for (let i = 0; i < suits.length; i += 1) {
      const cardValue = { suit: suits[i], name: SUITS[suits[i]].name, cost: i + 1, power: (i + 1) * 2 + 1, text: SUITS[suits[i]].verb + '.' };
      drawCardFace(cardValue, 415 + i * 130, 400, 120, 166, { tilt: (i - 1.5) * 0.06 });
    }
    ctx.textAlign = 'center';
    ctx.fillStyle = PALETTE.gold;
    ctx.font = `bold 92px ${FONT}`;
    ctx.fillText('EMBERFALL', 640, 190);
    ctx.fillStyle = PALETTE.text;
    ctx.font = `bold 44px ${FONT}`;
    ctx.fillText('— D U E L —', 640, 250);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '19px ' + FONT;
    ctx.fillText('A duel of four suits. Outplay Cinder, the Ashbringer, before your ember burns out.', 640, 300);
    ctx.fillText('Flame wounds · Tide mends · Gale draws · Stone shields — play two of a suit to spark Resonance +2.', 640, 328);
    ctx.fillStyle = PALETTE.text;
    ctx.font = 'bold 17px ' + FONT;
    ctx.fillText('HOW TO PLAY', 640, 380);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '16px ' + FONT;
    ctx.fillText('Each round refills your ember. Cards cost ember. Reduce Cinder to 0 life to win.', 640, 596);
    const pulse = 0.65 + 0.35 * Math.sin(timeSec * 3);
    ctx.globalAlpha = pulse;
    ctx.fillStyle = PALETTE.gold;
    ctx.font = `bold 24px ${FONT}`;
    ctx.fillText('CLICK OR PRESS SPACE TO DUEL', 640, 646);
    ctx.globalAlpha = 1;
    if (ui.wins > 0) {
      ctx.fillStyle = PALETTE.muted;
      ctx.font = '15px ' + FONT;
      ctx.fillText(`Duels won: ${ui.wins}${ui.bestRounds ? ` · fastest win in ${ui.bestRounds} rounds` : ''}`, 640, 682);
    }
    ctx.textAlign = 'left';
  }

  function drawEnd(state, ui, timeSec, won) {
    // The dimmed table behind the result — no stage card or hint, so nothing collides
    // with the big result text.
    drawPlay(state, { hoverIndex: -1, endHover: false, minimal: true }, timeSec);
    ctx.fillStyle = won ? 'rgba(20, 26, 12, 0.72)' : 'rgba(16, 14, 14, 0.78)';
    ctx.fillRect(0, 0, FIELD.width, FIELD.height);
    if (won) {
      for (let i = 0; i < 40; i += 1) {
        const angle = (i / 40) * Math.PI * 2;
        const radius = 90 + ((timeSec * 40 + i * 37) % 260);
        ctx.globalAlpha = 0.5;
        ctx.fillStyle = i % 2 ? PALETTE.gold : PALETTE.ember;
        ctx.beginPath();
        ctx.arc(640 + Math.cos(angle) * radius, 300 + Math.sin(angle) * radius * 0.6, 3, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
    }
    ctx.textAlign = 'center';
    ctx.fillStyle = won ? PALETTE.gold : '#c9c2b8';
    ctx.font = `bold 84px ${FONT}`;
    ctx.fillText(won ? 'VICTORY' : 'DEFEAT', 640, 300);
    ctx.fillStyle = PALETTE.text;
    ctx.font = '22px ' + FONT;
    ctx.fillText(won ? 'The ember is yours — Cinder bows out.' : 'Cinder, the Ashbringer, takes the ember.', 640, 348);
    ctx.fillStyle = PALETTE.muted;
    ctx.font = '18px ' + FONT;
    ctx.fillText(
      `Duel report — ${state.stats.rounds} rounds · ${state.stats.cardsPlayed} cards played · ${state.stats.damageDealt} damage dealt · ${state.you.hp} life left`,
      640, 396,
    );
    const pulse = 0.65 + 0.35 * Math.sin(timeSec * 3);
    ctx.globalAlpha = pulse;
    ctx.fillStyle = PALETTE.gold;
    ctx.font = `bold 22px ${FONT}`;
    ctx.fillText(won ? 'SPACE — DUEL AGAIN' : 'SPACE — TRY AGAIN', 640, 452);
    ctx.globalAlpha = 1;
    ctx.textAlign = 'left';
  }

  /** Paint one frame. `screen` is title, play, won or lost; `ui` carries hover and records. */
  function draw(state, screen, ui, timeSec) {
    const scale = Math.min(canvas.width / FIELD.width, canvas.height / FIELD.height);
    ctx.setTransform(scale, 0, 0, scale, (canvas.width - FIELD.width * scale) / 2, (canvas.height - FIELD.height * scale) / 2);
    ctx.clearRect(0, 0, FIELD.width, FIELD.height);
    if (screen === SCREEN_TITLE) drawTitle(state, ui, timeSec);
    else if (screen === SCREEN_WON) drawEnd(state, ui, timeSec, true);
    else if (screen === SCREEN_LOST) drawEnd(state, ui, timeSec, false);
    else drawPlay(state, ui, timeSec);
    ctx.setTransform(1, 0, 0, 1, 0, 0);
  }

  /** Fit the canvas to its window (device pixels), keeping the 1280x720 table. */
  function resize() {
    const ratio = window.devicePixelRatio || 1;
    canvas.width = Math.floor(window.innerWidth * ratio);
    canvas.height = Math.floor(window.innerHeight * ratio);
  }

  return {
    draw,
    resize,
    updateEffects,
    spawnFloat,
    spawnBurst,
    playerHandLayout,
    foeHandLayout,
    endButton: END_BUTTON,
    stage: STAGE,
  };
}
