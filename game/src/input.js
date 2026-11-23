// Mouse and keyboard input for Emberfall Duel. The canvas is scaled to fit
// the window, so pointer positions are converted back to the 1280x720
// logical table before hit-testing. One-shot presses (start, end turn, play
// a card) are queued and taken once by the loop, so a press between two
// frames is never lost and never counted twice.
import { VIEW_W, VIEW_H } from './render.js';

export const ACTION_START = 1;
export const ACTION_END_TURN = 2;

const START_KEYS = new Set(['Space', 'Enter']);
const END_TURN_KEYS = new Set(['KeyE']);
const CARD_KEY_CODES = ['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7', 'Digit8', 'Digit9'];

export function createInput(canvas) {
  let actions = 0;
  let cardKey = -1;
  let pointer = { x: -1, y: -1, clicked: false, downX: -1, downY: -1 };

  window.addEventListener('keydown', (event) => {
    if (START_KEYS.has(event.code)) {
      if (!event.repeat) actions |= ACTION_START;
    } else if (END_TURN_KEYS.has(event.code)) {
      if (!event.repeat) actions |= ACTION_END_TURN;
    } else if (CARD_KEY_CODES.includes(event.code)) {
      if (!event.repeat) cardKey = CARD_KEY_CODES.indexOf(event.code);
    } else {
      return;
    }
    event.preventDefault();
  });

  function toLogical(event) {
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(rect.width / VIEW_W, rect.height / VIEW_H);
    const offsetX = (rect.width - VIEW_W * scale) / 2;
    const offsetY = (rect.height - VIEW_H * scale) / 2;
    return {
      x: (event.clientX - rect.left - offsetX) / scale,
      y: (event.clientY - rect.top - offsetY) / scale,
    };
  }

  canvas.addEventListener('pointermove', (event) => {
    const at = toLogical(event);
    pointer.x = at.x;
    pointer.y = at.y;
  });
  canvas.addEventListener('pointerdown', (event) => {
    const at = toLogical(event);
    pointer.x = at.x;
    pointer.y = at.y;
    pointer.downX = at.x;
    pointer.downY = at.y;
  });
  canvas.addEventListener('pointerup', (event) => {
    const at = toLogical(event);
    pointer.x = at.x;
    pointer.y = at.y;
    if (Math.hypot(at.x - pointer.downX, at.y - pointer.downY) < 8) pointer.clicked = true;
  });
  canvas.addEventListener('pointerleave', () => {
    pointer.x = -1;
    pointer.y = -1;
  });

  return {
    /** The pointer's logical position and whether it clicked since last take. */
    pointer() {
      return pointer;
    },
    /** One-shot actions since the last call, as ACTION_* flags. */
    takeActions() {
      const taken = actions;
      actions = 0;
      return taken;
    },
    /** The card key (0-based) pressed since the last call, or -1. */
    takeCardKey() {
      const taken = cardKey;
      cardKey = -1;
      return taken;
    },
    /** Clear a consumed click. */
    clearClick() {
      pointer.clicked = false;
    },
  };
}
