// The duel's rules and state, with no drawing and no browser in it: two 30-life duelists,
// a 40-card deck each, ember that refills every round, and the Resonance rule — the second
// card of the same suit played in one turn hits 2 harder. Every move returns what happened
// as events, so the caller can animate and announce without the duel knowing about screens
// or sound. The rival's brain is deliberately readable: it goes for the kill when it can,
// patches itself up when it is hurt, and otherwise plays its best card — so you can see its
// plan coming and answer it.
import { DUEL } from './config.js';
import { freshDeck } from './cards.js';
import { shuffled } from './random.js';

export const PHASE_TITLE = 'title';
export const PHASE_PLAYER = 'player';
export const PHASE_AI = 'ai';
export const PHASE_WON = 'won';
export const PHASE_LOST = 'lost';

export const EVENT_DAMAGE = 'damage';
export const EVENT_HEAL = 'heal';
export const EVENT_SHIELD = 'shield';
export const EVENT_DRAW = 'draw';
export const EVENT_RESONANCE = 'resonance';
export const EVENT_WIN = 'win';
export const EVENT_LOSE = 'lose';

export function createDuel(random) {
  const state = {
    phase: PHASE_TITLE,
    round: 0,
    you: null,
    foe: null,
    log: [],
    lastPlay: null,
    stats: { cardsPlayed: 0, damageDealt: 0, damageTaken: 0, rounds: 0 },
  };

  function freshSide() {
    return { hp: DUEL.maxHp, shield: 0, ember: 0, emberMax: 0, deck: [], hand: [], discard: [], lastSuit: null };
  }

  function say(line) {
    state.log.push(line);
    if (state.log.length > 3) state.log.shift();
  }

  /**
   * Draw `count` cards for `side`. A deck that runs out does not come back — instead the
   * ember burns: every card that cannot be drawn costs 2 life. The burn is the duel's
   * clock, so no game can turtle forever.
   */
  function drawCards(side, count) {
    let drawn = 0;
    for (let n = 0; n < count; n += 1) {
      if (side.hand.length >= DUEL.handCap) break;
      if (side.deck.length === 0) {
        side.hp = Math.max(0, side.hp - 2);
        continue;
      }
      side.hand.push(side.deck.pop());
      drawn += 1;
    }
    return drawn;
  }

  /** Both duelists' ember refills for the round: the round number plus two, capped at ten. */
  function refillEmber() {
    const amount = Math.min(DUEL.emberCap, DUEL.emberBase + state.round);
    state.you.ember = amount;
    state.you.emberMax = amount;
    state.foe.ember = amount;
    state.foe.emberMax = amount;
  }

  /** Deal `amount` damage to `side`, shield soaking first; returns the life lost. */
  function hurt(side, amount) {
    const soaked = Math.min(side.shield, amount);
    side.shield -= soaked;
    const life = amount - soaked;
    side.hp = Math.max(0, side.hp - life);
    return { soaked, life };
  }

  /**
   * Resolve one card for `side` against `other`. `resonance` adds the bonus when this is
   * the second card of the same suit this turn. Returns the events the play caused.
   */
  function resolveCard(side, other, cardValue, resonance) {
    const events = [];
    const power = cardValue.power + (resonance ? DUEL.resonanceBonus : 0);
    if (resonance) events.push({ type: EVENT_RESONANCE, amount: DUEL.resonanceBonus });
    if (cardValue.suit === 'flame') {
      const hit = hurt(other, power);
      events.push({ type: EVENT_DAMAGE, amount: power, soaked: hit.soaked, life: hit.life });
    } else if (cardValue.suit === 'tide') {
      const healed = Math.min(DUEL.maxHp - side.hp, power);
      side.hp += healed;
      events.push({ type: EVENT_HEAL, amount: healed });
    } else if (cardValue.suit === 'gale') {
      const drawn = drawCards(side, 2);
      const hit = hurt(other, power);
      events.push({ type: EVENT_DRAW, amount: drawn });
      events.push({ type: EVENT_DAMAGE, amount: power, soaked: hit.soaked, life: hit.life });
    } else {
      side.shield += power;
      events.push({ type: EVENT_SHIELD, amount: power });
    }
    return events;
  }

  function checkEnd() {
    if (state.foe.hp === 0) {
      state.phase = PHASE_WON;
      return EVENT_WIN;
    }
    if (state.you.hp === 0) {
      state.phase = PHASE_LOST;
      return EVENT_LOSE;
    }
    return null;
  }

  function reset() {
    state.round = 0;
    state.you = freshSide();
    state.foe = freshSide();
    state.log = [];
    state.lastPlay = null;
    state.stats = { cardsPlayed: 0, damageDealt: 0, damageTaken: 0, rounds: 0 };
    state.you.deck = shuffled(freshDeck(), random);
    state.foe.deck = shuffled(freshDeck(), random);
    state.phase = PHASE_TITLE;
  }

  function startDuel() {
    reset();
    state.round = 1;
    state.stats.rounds = 1;
    drawCards(state.you, DUEL.openingHand);
    drawCards(state.foe, DUEL.openingHand);
    refillEmber();
    state.phase = PHASE_PLAYER;
    say('Round 1 — your move. Play cards, then end your turn.');
  }

  /** Begin a round: both duelists draw, ember refills, Resonance resets. */
  function startRound() {
    state.round += 1;
    state.stats.rounds = state.round;
    state.you.lastSuit = null;
    state.foe.lastSuit = null;
    drawCards(state.you, DUEL.drawPerRound);
    drawCards(state.foe, DUEL.drawPerRound);
    refillEmber();
    if (checkEnd() !== null) return;
    state.phase = PHASE_PLAYER;
    say(`Round ${state.round} — ${state.you.ember} ember. Your move.`);
  }

  function canPlayCard(index) {
    if (state.phase !== PHASE_PLAYER) return false;
    const cardValue = state.you.hand[index];
    return cardValue !== undefined && cardValue.cost <= state.you.ember;
  }

  /**
   * Play the player's card at `index`. Returns `{ ok, reason, events }`; on success the
   * card leaves the hand for the discard pile and the events say what it did.
   */
  function playCard(index) {
    if (state.phase !== PHASE_PLAYER) return { ok: false, reason: 'Not your turn.' };
    const cardValue = state.you.hand[index];
    if (cardValue === undefined) return { ok: false, reason: 'No card there.' };
    if (cardValue.cost > state.you.ember) return { ok: false, reason: `Needs ${cardValue.cost} ember.` };
    state.you.ember -= cardValue.cost;
    state.you.hand.splice(index, 1);
    state.you.discard.push(cardValue);
    const resonance = state.you.lastSuit === cardValue.suit;
    state.you.lastSuit = cardValue.suit;
    const events = resolveCard(state.you, state.foe, cardValue, resonance);
    state.lastPlay = { side: 'you', card: cardValue, resonance, events };
    state.stats.cardsPlayed += 1;
    for (const event of events) {
      if (event.type === EVENT_DAMAGE) state.stats.damageDealt += event.life;
    }
    say(`You played ${cardValue.name}${resonance ? ' — RESONANCE +2!' : ''}.`);
    const end = checkEnd();
    if (end !== null) events.push({ type: end });
    return { ok: true, reason: '', events };
  }

  /** End the player's turn; the rival's turn begins. */
  function endTurn() {
    if (state.phase !== PHASE_PLAYER) return false;
    state.phase = PHASE_AI;
    state.foe.lastSuit = null;
    say('Cinder takes the table…');
    return true;
  }

  /**
   * How much the rival wants a card in hand, in its shoes: the kill first, then healing
   * and shielding when hurt, then drawing when its hand is thin, then raw power.
   */
  function aiCardValue(cardValue) {
    const resonance = state.foe.lastSuit === cardValue.suit;
    const power = cardValue.power + (resonance ? DUEL.resonanceBonus : 0);
    if (cardValue.suit === 'flame' || cardValue.suit === 'gale') {
      if (power >= state.you.hp + state.you.shield) return 1000;
      return power + (cardValue.suit === 'gale' ? 3 : 0);
    }
    if (cardValue.suit === 'tide') {
      return state.foe.hp < DUEL.maxHp ? power + (state.foe.hp <= 12 ? 6 : 0) : -1;
    }
    return state.foe.hp <= 12 ? power + 4 : power * 0.8;
  }

  /** The rival's best affordable card, or -1 when it should pass. */
  function chooseAiCard() {
    let best = -1;
    let bestValue = 0;
    for (let index = 0; index < state.foe.hand.length; index += 1) {
      const cardValue = state.foe.hand[index];
      if (cardValue.cost > state.foe.ember) continue;
      const value = aiCardValue(cardValue);
      if (value > bestValue) {
        bestValue = value;
        best = index;
      }
    }
    return best;
  }

  /** Play one rival card (its whole turn when `instant`): returns its events. */
  function aiPlayOne() {
    const index = chooseAiCard();
    if (index === -1) return null;
    const cardValue = state.foe.hand[index];
    state.foe.ember -= cardValue.cost;
    state.foe.hand.splice(index, 1);
    state.foe.discard.push(cardValue);
    const resonance = state.foe.lastSuit === cardValue.suit;
    state.foe.lastSuit = cardValue.suit;
    const events = resolveCard(state.foe, state.you, cardValue, resonance);
    state.lastPlay = { side: 'foe', card: cardValue, resonance, events };
    for (const event of events) {
      if (event.type === EVENT_DAMAGE) state.stats.damageTaken += event.life;
    }
    say(`Cinder played ${cardValue.name}${resonance ? ' — RESONANCE +2!' : ''}.`);
    const end = checkEnd();
    if (end !== null) events.push({ type: end });
    return { card: cardValue, resonance, events };
  }

  /** The rival's full turn at once (screenshot staging): up to three cards, then the next round. */
  function aiTakeTurn() {
    let played = 0;
    while (played < DUEL.aiCardsPerTurn && state.phase === PHASE_AI) {
      if (aiPlayOne() === null) break;
      played += 1;
    }
    if (state.phase === PHASE_AI) startRound();
    return played;
  }

  reset();
  return {
    state,
    reset,
    startDuel,
    startRound,
    canPlayCard,
    playCard,
    endTurn,
    chooseAiCard,
    aiPlayOne,
    aiTakeTurn,
  };
}
