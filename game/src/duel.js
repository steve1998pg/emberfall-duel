// The rules of Emberfall Duel, with no DOM in them: a headless test can
// import this file in Node and play whole duels. Two duelists, 30 life each,
// 40-card decks, four suits, ember that refills every round. Playing a card
// whose suit matches the last suit you played this turn resonates for +2.
// A deck that runs out does not come back: every card that cannot be drawn
// burns 2 life, so no duel can stall forever.
import { TUNE } from './config.js';
import { freshDeck } from './cards.js';
import { mulberry32, shuffle } from './random.js';

const SIDES = ['you', 'foe'];

function makeDuelist(name, deck) {
  return {
    name,
    life: TUNE.startLife,
    shield: 0,
    ember: 0,
    deck,
    hand: [],
    discard: [],
    lastSuit: null,
  };
}

/** A fresh duel. `seed` drives both deck shuffles, so the duel replays. */
export function createGame(seed = 1) {
  const rng = mulberry32(seed);
  const state = {
    seed,
    rng,
    round: 1,
    phase: 'player',
    you: makeDuelist('Ember Warden', shuffle(freshDeck(), rng)),
    foe: makeDuelist('Cinder', shuffle(freshDeck(), rng)),
    log: [],
    winner: null,
    stats: { cardsPlayed: 0, resonanceCount: 0, burns: 0 },
  };
  state.you.ember = TUNE.emberForRound(1);
  state.foe.ember = TUNE.emberForRound(1);
  drawCards(state, 'you', TUNE.startHand);
  drawCards(state, 'foe', TUNE.startHand);
  pushLog(state, 'The duel begins. Ember Warden vs Cinder, the Ashbringer.');
  return state;
}

function other(side) {
  return side === 'you' ? 'foe' : 'you';
}

function pushLog(state, text) {
  state.log.push(text);
  if (state.log.length > 48) state.log.splice(0, state.log.length - 48);
}

/** Whether `side` is out of the duel, and who won if so. */
export function isOver(state) {
  return state.phase === 'over';
}

export function winnerOf(state) {
  return state.winner;
}

function endDuel(state, winner) {
  state.phase = 'over';
  state.winner = winner;
  const name = winner === 'you' ? 'Ember Warden' : 'Cinder';
  pushLog(state, `${name} wins the duel.`);
}

/** Draw `n` cards for `side`. Each card that cannot be drawn burns 2 life. */
export function drawCards(state, side, n) {
  const duelist = state[side];
  for (let i = 0; i < n; i++) {
    if (state.phase === 'over') return;
    if (duelist.deck.length === 0) {
      state.stats.burns += 1;
      duelist.life = Math.max(0, duelist.life - TUNE.burnDamage);
      pushLog(state, `${duelist.name}'s deck is empty — deck-burn for ${TUNE.burnDamage} life!`);
      if (duelist.life <= 0) endDuel(state, other(side));
      continue;
    }
    duelist.hand.push(duelist.deck.pop());
  }
}

/** Damage that shield soaks first, then life. May end the duel. */
export function dealDamage(state, side, amount) {
  const target = state[side];
  const soaked = Math.min(target.shield, amount);
  target.shield -= soaked;
  const rest = amount - soaked;
  target.life = Math.max(0, target.life - rest);
  if (soaked > 0) pushLog(state, `${target.name}'s shield soaks ${soaked}.`);
  if (rest > 0) pushLog(state, `${target.name} takes ${rest} damage.`);
  if (target.life <= 0) endDuel(state, other(side));
  return rest;
}

function heal(state, side, amount) {
  const duelist = state[side];
  const before = duelist.life;
  duelist.life = Math.min(TUNE.maxLife, duelist.life + amount);
  const gained = duelist.life - before;
  pushLog(state, `${duelist.name} heals ${gained} life.`);
  return gained;
}

/** Would playing `card` resonate for `side` right now? */
export function resonates(state, side, card) {
  const last = state[side].lastSuit;
  return last !== null && card.suit === last;
}

/**
 * Play the card at `handIndex` for `side`. Returns { ok, resonance, reason }.
 * `side` 'you' plays only during phase 'player'; 'foe' only during 'ai'.
 */
export function playCard(state, side, handIndex) {
  if (state.phase === 'over') return { ok: false, resonance: false, reason: 'the duel is over' };
  if (side === 'you' && state.phase !== 'player') return { ok: false, resonance: false, reason: 'not your turn' };
  if (side === 'foe' && state.phase !== 'ai') return { ok: false, resonance: false, reason: 'not Cinder’s turn' };
  const duelist = state[side];
  const card = duelist.hand[handIndex];
  if (!card) return { ok: false, resonance: false, reason: 'no such card' };
  if (card.cost > duelist.ember) return { ok: false, resonance: false, reason: 'not enough ember' };

  const resonance = resonates(state, side, card);
  const bonus = resonance ? TUNE.resonanceBonus : 0;
  duelist.ember -= card.cost;
  duelist.hand.splice(handIndex, 1);
  duelist.discard.push(card);
  duelist.lastSuit = card.suit;
  state.stats.cardsPlayed += 1;
  if (resonance) state.stats.resonanceCount += 1;

  const resText = resonance ? ' ✦ RESONANCE +2 ✦' : '';
  pushLog(state, `${duelist.name} plays ${card.name} (${card.suit}).${resText}`);

  if (card.suit === 'flame') {
    dealDamage(state, other(side), card.power + bonus);
  } else if (card.suit === 'tide') {
    heal(state, side, card.power + bonus);
  } else if (card.suit === 'gale') {
    drawCards(state, side, 2);
    if (state.phase !== 'over') dealDamage(state, other(side), card.power + bonus);
  } else {
    duelist.shield += card.power + bonus;
    pushLog(state, `${duelist.name} gains ${card.power + bonus} shield.`);
  }
  return { ok: true, resonance, reason: '' };
}

/** Score a playable card for Cinder. Higher is better; -Infinity means never. */
function scoreAiCard(state, card) {
  const foe = state.foe;
  const you = state.you;
  const bonus = card.suit === foe.lastSuit ? TUNE.resonanceBonus : 0;
  const resonanceScore = card.suit === foe.lastSuit ? 1500 : 0;

  if (card.suit === 'flame' || card.suit === 'gale') {
    const damage = card.power + bonus;
    if (damage >= you.life + you.shield) return 10000 + damage;
    if (card.suit === 'flame') return damage * 100 + resonanceScore;
    // Gale: the draw is worth playing when the hand runs thin.
    const drawScore = foe.hand.length <= 2 ? 4000 : 200;
    return damage * 100 + drawScore + resonanceScore;
  }
  if (card.suit === 'tide') {
    if (foe.life >= TUNE.maxLife) return -Infinity;
    if (foe.life <= 12) return 5000 + card.power * 10 + resonanceScore;
    return card.power * 10 + resonanceScore;
  }
  // Stone: shield matters most when the Warden is about to hit hard.
  const threat = you.life <= 10 ? 80 : 40;
  return (card.power + bonus) * threat + resonanceScore;
}

/** Cinder's brain, written so a player can read it: kill when it can, patch
 *  itself up when hurt, draw when its hand runs thin, chain its own suit for
 *  Resonance, and otherwise play its strongest affordable card. */
export function chooseAiCard(state) {
  let best = null;
  for (let i = 0; i < state.foe.hand.length; i++) {
    const card = state.foe.hand[i];
    if (card.cost > state.foe.ember) continue;
    const score = scoreAiCard(state, card);
    if (!Number.isFinite(score)) continue;
    if (
      best === null ||
      score > best.score ||
      (score === best.score && card.cost < state.foe.hand[best.index].cost)
    ) {
      best = { index: i, score };
    }
  }
  return best;
}

/** Play Cinder's whole turn, synchronously. The renderer paces it visually. */
export function aiTakeTurn(state) {
  state.phase = 'ai';
  let played = 0;
  while (played < 20 && state.phase !== 'over') {
    const pick = chooseAiCard(state);
    if (pick === null) break;
    const result = playCard(state, 'foe', pick.index);
    if (!result.ok) break;
    played += 1;
  }
  if (state.phase === 'ai') pushLog(state, 'Cinder ends its turn.');
}

/** Start the next round: refill both embers, reset Resonance chains, draw 2. */
export function startRound(state) {
  if (state.phase === 'over') return;
  state.round += 1;
  state.you.ember = TUNE.emberForRound(state.round);
  state.foe.ember = TUNE.emberForRound(state.round);
  state.you.lastSuit = null;
  state.foe.lastSuit = null;
  pushLog(state, `— Round ${state.round} — ember refills to ${state.you.ember}.`);
  drawCards(state, 'you', TUNE.drawPerRound);
  if (state.phase !== 'over') drawCards(state, 'foe', TUNE.drawPerRound);
  if (state.phase !== 'over') state.phase = 'player';
}

/** The player ends their turn: Cinder plays, then the next round starts.
 *  Callable from phase 'player' — or from phase 'ai', when the renderer has
 *  already flipped the phase to show "Cinder is thinking…" during the beat
 *  before Cinder's cards hit the table. */
export function endPlayerTurn(state) {
  if (state.phase !== 'player' && state.phase !== 'ai') return false;
  aiTakeTurn(state);
  if (state.phase !== 'over') startRound(state);
  return true;
}

export { SIDES };
