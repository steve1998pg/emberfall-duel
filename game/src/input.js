// Keyboard and pointer input. One-shot presses (start, end turn, play a card) are queued
// as events and taken once by the loop, so a press between two frames is never lost and
// never counted twice. Pointer moves are kept as the latest logical position for hover.
export const ACTION_CONFIRM = 1;
export const ACTION_END_TURN = 2;

const CONFIRM = new Set(['Space', 'Enter']);
const END_TURN = new Set(['KeyE']);
const CARD_KEYS = new Set(['Digit1', 'Digit2', 'Digit3', 'Digit4', 'Digit5', 'Digit6', 'Digit7']);

export function createInput(canvas) {
  let actions = 0;
  let cardKey = -1;
  let pointer = { x: -1, y: -1, down: false, downX: -1, downY: -1, clicked: false };

  window.addEventListener('keydown', (event) => {
    if (CONFIRM.has(event.code)) {
      if (!event.repeat) actions |= ACTION_CONFIRM;
    } else if (END_TURN.has(event.code)) {
      if (!event.repeat) actions |= ACTION_END_TURN;
    } else if (CARD_KEYS.has(event.code)) {
      if (!event.repeat) cardKey = Number(event.code.slice(5)) - 1;
    } else return;
    event.preventDefault();
  });

  function toLogical(event) {
    const rect = canvas.getBoundingClientRect();
    const scale = Math.min(rect.width / 1280, rect.height / 720);
    const offsetX = (rect.width - 1280 * scale) / 2;
    const offsetY = (rect.height - 720 * scale) / 2;
    return { x: (event.clientX - rect.left - offsetX) / scale, y: (event.clientY - rect.top - offsetY) / scale };
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
    pointer.down = true;
    pointer.downX = at.x;
    pointer.downY = at.y;
  });
  canvas.addEventListener('pointerup', (event) => {
    const at = toLogical(event);
    pointer.x = at.x;
    pointer.y = at.y;
    pointer.down = false;
    if (Math.hypot(at.x - pointer.downX, at.y - pointer.downY) < 8) pointer.clicked = true;
  });
  canvas.addEventListener('pointerleave', () => {
    pointer.x = -1;
    pointer.y = -1;
    pointer.down = false;
  });

  return {
    /** The pointer's logical position and whether it clicked since the last take. */
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
