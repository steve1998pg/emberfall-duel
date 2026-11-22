// Boot and the one loop: input is read every frame, the rival's turn advances on a timer
// so each of its cards lands with a beat, and the renderer paints what is there. The game
// moves between four screens: title, play, won and lost.
//
// ?seed=N fixes the shuffle. ?shot=title|table|win|loss (with &seed=N) stages that scene
// instead of running the loop, paints it twice and sets window.__shotReady for a screenshot.
import { BEST_ROUNDS_KEY, WINS_KEY } from './config.js';
import { createRandom } from './random.js';
import { createDuel, EVENT_DAMAGE, EVENT_DRAW, EVENT_HEAL, EVENT_LOSE, EVENT_RESONANCE, EVENT_SHIELD, EVENT_WIN, PHASE_AI, PHASE_LOST, PHASE_PLAYER, PHASE_WON } from './duel.js';
import { ACTION_CONFIRM, ACTION_END_TURN, createInput } from './input.js';
import { createAudio } from './audio.js';
import { createRenderer, SCREEN_LOST, SCREEN_PLAY, SCREEN_TITLE, SCREEN_WON } from './render.js';
import { stageShot } from './shots.js';

/** Seconds between the rival's cards, so its turn reads one move at a time. */
const AI_BEAT = 0.85;

const params = new URLSearchParams(window.location.search);
const shot = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '', 10);
const seed = Number.isInteger(seedParam) ? seedParam : Math.floor(Math.random() * 4294967296);

const canvas = document.getElementById('game');
const status = document.getElementById('status');
const duel = createDuel(createRandom(seed));
const renderer = createRenderer(canvas);
const audio = createAudio();

function readRecord(key) {
  try {
    return Number.parseInt(window.localStorage.getItem(key) ?? '0', 10) || 0;
  } catch {
    return 0;
  }
}

function saveRecord(key, value) {
  try {
    window.localStorage.setItem(key, String(value));
  } catch {
    // Storage can be off (private windows): the record then lasts this visit only.
  }
}

/** Turn a play's events into floating numbers, sparks and sound. */
function showEvents(events, targetYou) {
  const at = targetYou ? { x: 1110, y: 100 } : { x: 170, y: 100 };
  for (const event of events) {
    if (event.type === EVENT_DAMAGE) {
      renderer.spawnFloat(at.x, at.y, `-${event.life}`, '#ff6b5e');
      renderer.spawnBurst(640, 312, '#e5534b');
      audio.hit();
    } else if (event.type === EVENT_HEAL) {
      renderer.spawnFloat(at.x, at.y, `+${event.amount}`, '#8ecdf5');
      audio.heal();
    } else if (event.type === EVENT_SHIELD) {
      renderer.spawnFloat(at.x, at.y, `+${event.amount} 🛡`, '#8ecdf5');
      audio.shield();
    } else if (event.type === EVENT_DRAW) {
      audio.draw();
    } else if (event.type === EVENT_RESONANCE) {
      renderer.spawnFloat(640, 190, 'RESONANCE +2', '#f2c94c');
    }
  }
}

function runShot(name) {
  const scene = stageShot(name, duel);
  let painted = 0;
  function paint() {
    renderer.resize();
    renderer.draw(duel.state, scene.screen, { hoverIndex: -1, endHover: false, wins: 0, bestRounds: 0 }, 1.0);
    painted += 1;
    if (painted < 2) requestAnimationFrame(paint);
    else window.__shotReady = true;
  }
  requestAnimationFrame(paint);
}

function runGame() {
  const input = createInput(canvas);
  let screen = SCREEN_TITLE;
  let wins = readRecord(WINS_KEY);
  let bestRounds = readRecord(BEST_ROUNDS_KEY);
  let hoverIndex = -1;
  let endHover = false;
  let aiTimer = 0;
  let aiPlayed = 0;

  function announce(message) {
    status.textContent = message;
  }

  function startDuel() {
    duel.startDuel();
    screen = SCREEN_PLAY;
    aiTimer = 0;
    aiPlayed = 0;
    announce(`Round 1. You have ${duel.state.you.ember} ember. Play a card or end your turn.`);
  }

  function endDuel(won) {
    screen = won ? SCREEN_WON : SCREEN_LOST;
    if (won) {
      audio.win();
      wins += 1;
      saveRecord(WINS_KEY, wins);
      if (bestRounds === 0 || duel.state.stats.rounds < bestRounds) {
        bestRounds = duel.state.stats.rounds;
        saveRecord(BEST_ROUNDS_KEY, bestRounds);
      }
      announce(`Victory in ${duel.state.stats.rounds} rounds.`);
    } else {
      audio.lose();
      announce(`Defeat in ${duel.state.stats.rounds} rounds.`);
    }
  }

  function checkEnd(events) {
    for (const event of events) {
      if (event.type === EVENT_WIN) endDuel(true);
      else if (event.type === EVENT_LOSE) endDuel(false);
    }
  }

  function playPlayerCard(index) {
    const result = duel.playCard(index);
    if (!result.ok) {
      announce(result.reason);
      return;
    }
    audio.playCard();
    renderer.spawnBurst(640, 312, '#ff7a2f');
    showEvents(result.events, false);
    checkEnd(result.events);
  }

  function endPlayerTurn() {
    if (!duel.endTurn()) return;
    audio.turn();
    aiTimer = 0;
    aiPlayed = 0;
    announce('Cinder takes the table…');
  }

  function advanceRival(dt) {
    if (duel.state.phase !== PHASE_AI) return;
    aiTimer += dt;
    if (aiTimer < AI_BEAT) return;
    aiTimer = 0;
    if (aiPlayed >= 3) {
      duel.startRound();
      announce(`Round ${duel.state.round}. You have ${duel.state.you.ember} ember.`);
      return;
    }
    const played = duel.aiPlayOne();
    if (played === null) {
      duel.startRound();
      announce(`Round ${duel.state.round}. You have ${duel.state.you.ember} ember.`);
      return;
    }
    aiPlayed += 1;
    audio.playCard();
    renderer.spawnBurst(640, 312, '#c9a227');
    showEvents(played.events, true);
    checkEnd(played.events);
  }

  function pointIn(rect, at) {
    return at.x >= rect.x && at.x <= rect.x + rect.w && at.y >= rect.y && at.y <= rect.y + rect.h;
  }

  /** The topmost player card under the pointer, or -1. Later cards are drawn on top. */
  function cardUnder(at) {
    const rects = renderer.playerHandLayout(duel.state.you.hand.length);
    for (let i = rects.length - 1; i >= 0; i -= 1) {
      if (pointIn(rects[i], at)) return i;
    }
    return -1;
  }

  function handlePointer() {
    const at = input.pointer();
    hoverIndex = screen === SCREEN_PLAY ? cardUnder(at) : -1;
    endHover = screen === SCREEN_PLAY && pointIn(renderer.endButton, at);
    if (!at.clicked) return;
    input.clearClick();
    audio.unlock();
    if (screen !== SCREEN_PLAY) {
      startDuel();
      return;
    }
    if (duel.state.phase !== PHASE_PLAYER) return;
    const card = cardUnder(at);
    if (card !== -1) {
      playPlayerCard(card);
      return;
    }
    if (pointIn(renderer.endButton, at)) endPlayerTurn();
  }

  function handleActions() {
    const actions = input.takeActions();
    const cardKey = input.takeCardKey();
    if (actions & ACTION_CONFIRM) {
      audio.unlock();
      if (screen !== SCREEN_PLAY) startDuel();
    }
    if (screen !== SCREEN_PLAY || duel.state.phase !== PHASE_PLAYER) return;
    if (actions & ACTION_END_TURN) endPlayerTurn();
    else if (cardKey !== -1 && cardKey < duel.state.you.hand.length) playPlayerCard(cardKey);
  }

  let last = performance.now();
  let clock = 0;
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min((now - last) / 1000, 0.25);
    last = now;
    clock += dt;
    renderer.updateEffects(dt);
    handleActions();
    handlePointer();
    if (screen === SCREEN_PLAY) advanceRival(dt);
    // Keep the rival's life in the announcements when it changes hands.
    if (duel.state.phase === PHASE_WON && screen === SCREEN_PLAY) endDuel(true);
    else if (duel.state.phase === PHASE_LOST && screen === SCREEN_PLAY) endDuel(false);
    renderer.draw(duel.state, screen, { hoverIndex, endHover, wins, bestRounds }, clock);
  }

  renderer.resize();
  window.addEventListener('resize', () => renderer.resize());
  announce('Emberfall Duel. Press Space or click to duel.');
  requestAnimationFrame(frame);
}

if (shot) runShot(shot);
else runGame();
