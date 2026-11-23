// Boot and the game loop for Emberfall Duel. Normal play is a title screen,
// a duel, and an end screen; `?shot=title|table|win|loss&seed=N` renders one
// staged screenshot scene instead. The loop also exposes window.__game for
// scripted playthroughs and sets window.__gameReady / window.__shotReady so
// a harness knows when the canvas is painted.
import { TUNE } from './config.js';
import { createGame, playCard, endPlayerTurn, isOver } from './duel.js';
import {
  render,
  handCardRects,
  endTurnRect,
  startRect,
  pointInRect,
  VIEW_W,
  VIEW_H,
} from './render.js';
import { createInput, ACTION_START, ACTION_END_TURN } from './input.js';
import { createAudio } from './audio.js';
import { prepareShot } from './shots.js';

const canvas = document.getElementById('game');
const statusEl = document.getElementById('status');
const ctx = canvas.getContext('2d');
canvas.width = VIEW_W;
canvas.height = VIEW_H;

const audio = createAudio();
const input = createInput(canvas);
const params = new URLSearchParams(window.location.search);
const shotScene = params.get('shot');
const seedParam = Number.parseInt(params.get('seed') ?? '1', 10);
const shotSeed = Number.isFinite(seedParam) ? seedParam : 1;

let state = { phase: 'title' };
let announce = null;
let aiTimer = null;
let hoverIndex = -1;
let lastStatus = '';

function setStatus(text) {
  if (text === lastStatus) return;
  lastStatus = text;
  if (statusEl) statusEl.textContent = text;
}

function showAnnouncement(text) {
  announce = { text, until: performance.now() + TUNE.announceMs };
}

function startDuel(seed) {
  if (aiTimer !== null) {
    window.clearTimeout(aiTimer);
    aiTimer = null;
  }
  state = createGame(seed);
  announce = null;
  hoverIndex = -1;
  audio.unlock();
  audio.turn();
  setStatus('The duel begins. Your turn — play a card or end your turn.');
}

function playCardAt(index) {
  if (!state || state.phase !== 'player') return;
  const card = state.you.hand[index];
  if (!card) return;
  if (card.cost > state.you.ember) {
    setStatus(`Not enough ember for ${card.name}.`);
    return;
  }
  const result = playCard(state, 'you', index);
  if (!result.ok) return;
  audio.playCard();
  if (card.suit === 'flame' || card.suit === 'gale') audio.hit();
  else if (card.suit === 'tide') audio.heal();
  else audio.shield();
  if (result.resonance) {
    audio.resonance();
    showAnnouncement('✦ RESONANCE +2 ✦');
  }
  if (isOver(state)) {
    if (state.winner === 'you') audio.win();
    else audio.lose();
    setStatus(state.winner === 'you' ? 'Victory! Cinder is defeated.' : 'Defeat. Your ember fades.');
  }
}

function endTurn() {
  if (!state || state.phase !== 'player') return;
  audio.click();
  // Cinder thinks for a beat so its turn reads as a turn, not a blink.
  state.phase = 'ai';
  setStatus('Cinder is thinking…');
  aiTimer = window.setTimeout(() => {
    aiTimer = null;
    endPlayerTurn(state);
    if (isOver(state)) {
      if (state.winner === 'you') audio.win();
      else audio.lose();
      setStatus(state.winner === 'you' ? 'Victory! Cinder is defeated.' : 'Defeat. Your ember fades.');
    } else {
      audio.turn();
      setStatus(`Round ${state.round}. Your turn — play a card or end your turn.`);
    }
  }, 750);
}

function handleClick(x, y) {
  audio.unlock();
  if (!state) return;
  if (state.phase === 'title') {
    if (pointInRect(x, y, startRect())) startDuel((Math.random() * 0x7fffffff) | 0);
    return;
  }
  if (state.phase === 'over') {
    const btn = startRect();
    if (pointInRect(x, y, { x: btn.x, y: btn.y - 20, w: btn.w, h: btn.h })) {
      startDuel((Math.random() * 0x7fffffff) | 0);
    }
    return;
  }
  if (state.phase === 'player') {
    const rects = handCardRects(state, hoverIndex);
    for (let i = rects.length - 1; i >= 0; i--) {
      if (pointInRect(x, y, rects[i])) {
        playCardAt(i);
        return;
      }
    }
    if (pointInRect(x, y, endTurnRect())) endTurn();
  }
}

function frame() {
  const pointer = input.pointer();
  const actions = input.takeActions();
  const cardKey = input.takeCardKey();

  if (actions & ACTION_START) {
    audio.unlock();
    if (state.phase === 'title' || state.phase === 'over') {
      startDuel((Math.random() * 0x7fffffff) | 0);
    }
  }
  if (actions & ACTION_END_TURN) endTurn();
  if (cardKey >= 0) playCardAt(cardKey);

  if (pointer.clicked) {
    input.clearClick();
    handleClick(pointer.x, pointer.y);
  }

  // Hover: the topmost hand card under the pointer.
  hoverIndex = -1;
  if (state && state.phase === 'player') {
    const rects = handCardRects(state, -1);
    for (let i = rects.length - 1; i >= 0; i--) {
      if (pointInRect(pointer.x, pointer.y, rects[i])) {
        hoverIndex = i;
        break;
      }
    }
  }

  render(ctx, state, {
    mouseX: pointer.x,
    mouseY: pointer.y,
    hoverIndex,
    announce,
    now: performance.now(),
  });
  window.requestAnimationFrame(frame);
}

window.addEventListener('error', (event) => {
  window.__gameError = String((event.error && event.error.message) || event.message || event.type);
});

if (shotScene) {
  // Staged screenshot: one deterministic scene, painted once, then flagged.
  const shot = prepareShot(shotScene, shotSeed);
  state = shot.state;
  announce = shot.announce;
  window.__game = {
    get state() {
      return state;
    },
    playCard: playCardAt,
    endTurn,
    start: startDuel,
  };
  render(ctx, state, { mouseX: -1, mouseY: -1, hoverIndex: -1, announce, now: performance.now() });
  window.__gameReady = true;
  window.__shotReady = true;
  window.requestAnimationFrame(frame);
} else {
  window.__game = {
    get state() {
      return state;
    },
    playCard: playCardAt,
    endTurn,
    start: startDuel,
  };
  render(ctx, state, { mouseX: -1, mouseY: -1, hoverIndex: -1, announce: null, now: performance.now() });
  window.__gameReady = true;
  window.requestAnimationFrame(frame);
}
