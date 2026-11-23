// The screenshot scenes behind ?shot=title|table|win|loss. Each one plays the real rules
// forward from a fresh duel for a fixed number of rounds, steered by a simple autopilot,
// so the frame is what a short game really looks like and the same seed always gives the
// same frame. The win scene's pilot plays boldly and the loss scene's plays passively —
// the way a hurried player and a careless one do — and the table scene stops mid-duel in
// round four, both hands full and both life bars marked.
import { PHASE_AI, PHASE_LOST, PHASE_PLAYER, PHASE_WON } from './duel.js';
import { SCREEN_LOST, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WON } from './render.js';

/**
 * The autopilot's taste in cards. A bold pilot chases damage; a passive one never attacks
 * and only mends and shields, which is how a duel is lost.
 */
function cardValue(duel, index, bold) {
  const state = duel.state;
  const cardValue = state.you.hand[index];
  if (cardValue === undefined || cardValue.cost > state.you.ember) return -1;
  const resonance = state.you.lastSuit === cardValue.suit ? 2 : 0;
  const power = cardValue.power + resonance;
  if (cardValue.suit === 'flame') return bold ? power + 4 : -1;
  if (cardValue.suit === 'gale') return bold ? power + 3 : -1;
  if (cardValue.suit === 'tide') return state.you.hp < 30 ? power + (bold ? 0 : 5) : -1;
  return power * 0.8 + (bold ? 0 : 2);
}

/** Play the player's turn with the autopilot, up to four cards, then end it. */
function autoPlayerTurn(duel, bold) {
  let played = 0;
  while (played < 4 && duel.state.phase === PHASE_PLAYER) {
    let best = -1;
    let bestValue = 0;
    for (let index = 0; index < duel.state.you.hand.length; index += 1) {
      const value = cardValue(duel, index, bold);
      if (value > bestValue) {
        bestValue = value;
        best = index;
      }
    }
    if (best === -1) break;
    duel.playCard(best);
    played += 1;
  }
  if (duel.state.phase === PHASE_PLAYER) duel.endTurn();
  if (duel.state.phase === PHASE_AI) duel.aiTakeTurn();
}

/** Play whole rounds until `stop` says the scene is ready, or the duel ends, or 40 rounds pass. */
function playUntil(duel, bold, stop) {
  for (let round = 0; round < 40; round += 1) {
    if (duel.state.phase === PHASE_WON || duel.state.phase === PHASE_LOST) return;
    if (stop(duel)) return;
    if (duel.state.phase === PHASE_PLAYER) autoPlayerTurn(duel, bold);
    else if (duel.state.phase === PHASE_AI) duel.aiTakeTurn();
  }
}

/**
 * Set `duel` to the named scene (title, table, win or loss; any other name is title) and
 * return the screen to draw over it.
 */
export function stageShot(name, duel) {
  if (name === 'table') {
    duel.startDuel();
    playUntil(duel, true, (d) => d.state.phase === PHASE_PLAYER && d.state.round >= 4);
    // Play one card first: startRound() resets lastSuit, so a frame stopped right
    // at the round's start would have no Resonance hint to show. Prefer a card
    // whose suit still sits in the hand afterwards, so the gold ring lands on a
    // real card and the frame shows the rule in action.
    if (duel.state.phase === PHASE_PLAYER) {
      const hand = duel.state.you.hand;
      const counts = {};
      for (const card of hand) counts[card.suit] = (counts[card.suit] ?? 0) + 1;
      let pick = -1;
      for (let i = 0; i < hand.length; i += 1) {
        if (hand[i].cost <= duel.state.you.ember && counts[hand[i].suit] >= 2) { pick = i; break; }
      }
      if (pick === -1) {
        for (let i = 0; i < hand.length; i += 1) {
          if (hand[i].cost <= duel.state.you.ember) { pick = i; break; }
        }
      }
      if (pick !== -1) duel.playCard(pick);
    }
    return { screen: SCREEN_PLAY };
  }
  if (name === 'win') {
    duel.startDuel();
    playUntil(duel, true, () => false);
    return { screen: duel.state.phase === PHASE_WON ? SCREEN_WON : SCREEN_PLAY };
  }
  if (name === 'loss') {
    duel.startDuel();
    playUntil(duel, false, () => false);
    return { screen: duel.state.phase === PHASE_LOST ? SCREEN_LOST : SCREEN_PLAY };
  }
  duel.reset();
  return { screen: SCREEN_TITLE };
}
