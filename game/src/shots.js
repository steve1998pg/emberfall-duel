// Staged screenshot scenes for `?shot=title|table|win|loss&seed=N`. Every
// scene is built by playing the real duel with the seeded RNG — no hand-made
// pixels — so a screenshot is a true render of the game's own code.
// The table scene is staged to show the Resonance hint: the player has just
// played a card, and a card of the same suit is still in hand, so the gold
// ring and the "✦ RESONANCE" tag are on screen.
import { createGame, playCard, endPlayerTurn, dealDamage } from './duel.js';

function affordable(state, side) {
  const list = [];
  state[side].hand.forEach((card, i) => {
    if (card.cost <= state[side].ember) list.push(i);
  });
  return list;
}

/** Prefer a card that chains the current suit, else the cheapest affordable. */
function pickChainCard(state) {
  const options = affordable(state, 'you');
  if (options.length === 0) return -1;
  const chained = options.filter((i) => state.you.hand[i].suit === state.you.lastSuit);
  const pool = chained.length > 0 ? chained : options;
  let best = pool[0];
  for (const i of pool) {
    if (state.you.hand[i].cost < state.you.hand[best].cost) best = i;
  }
  return best;
}

/** The hardest-hitting affordable card (Flame and Gale first). */
function pickDamageCard(state) {
  const options = affordable(state, 'you');
  if (options.length === 0) return -1;
  let best = options[0];
  for (const i of options) {
    const card = state.you.hand[i];
    const bestCard = state.you.hand[best];
    const damage = (c) => (c.suit === 'flame' || c.suit === 'gale' ? c.power : 0);
    const score = (c) => damage(c) * 10 + (c.suit === state.you.lastSuit ? 5 : 0) - c.cost;
    if (score(card) > score(bestCard)) best = i;
  }
  return best;
}

function buildTable(seed) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const state = createGame(seed + attempt * 1000);
    for (let round = 0; round < 40 && state.phase !== 'over'; round++) {
      // Play cards until a same-suit card is left in hand: the hint shows.
      for (;;) {
        const pick = pickChainCard(state);
        if (pick === -1) break;
        playCard(state, 'you', pick);
        if (state.phase === 'over') break;
        if (state.you.hand.some((c) => c.suit === state.you.lastSuit)) {
          return {
            state,
            announce: { text: '✦ RESONANCE +2 ✦', until: Number.POSITIVE_INFINITY },
          };
        }
      }
      if (state.phase === 'over') break;
      endPlayerTurn(state);
    }
  }
  // Fallback staging (never hit in practice): point the chain at hand[0].
  const state = createGame(seed);
  if (state.you.hand.length > 0) state.you.lastSuit = state.you.hand[0].suit;
  return {
    state,
    announce: { text: '✦ RESONANCE +2 ✦', until: Number.POSITIVE_INFINITY },
  };
}

function buildWin(seed) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const state = createGame(seed + attempt * 1000);
    for (let round = 0; round < 60 && state.phase !== 'over'; round++) {
      for (;;) {
        const pick = pickDamageCard(state);
        if (pick === -1) break;
        playCard(state, 'you', pick);
        if (state.phase === 'over') break;
      }
      if (state.phase === 'over') break;
      endPlayerTurn(state);
    }
    if (state.phase === 'over' && state.winner === 'you') return { state, announce: null };
  }
  const state = createGame(seed);
  dealDamage(state, 'foe', state.foe.life + state.foe.shield + 50);
  return { state, announce: null };
}

function buildLoss(seed) {
  for (let attempt = 0; attempt < 5; attempt++) {
    const state = createGame(seed + attempt * 1000);
    // A passive Warden: never plays a card, just ends the turn. Cinder wins.
    for (let round = 0; round < 80 && state.phase !== 'over'; round++) {
      endPlayerTurn(state);
    }
    if (state.phase === 'over' && state.winner === 'foe') return { state, announce: null };
  }
  const state = createGame(seed);
  dealDamage(state, 'you', state.you.life + state.you.shield + 50);
  return { state, announce: null };
}

/**
 * Build a staged scene. Returns { state, announce } ready to render, or a
 * title pseudo-state for the title screen.
 */
export function prepareShot(scene, seed) {
  if (scene === 'title') return { state: { phase: 'title' }, announce: null };
  if (scene === 'table') return buildTable(seed);
  if (scene === 'win') return buildWin(seed);
  if (scene === 'loss') return buildLoss(seed);
  return buildTable(seed);
}
