// Every tuning number, colour and suit in one place. The table is a fixed 1280x720 logical
// area; the renderer scales it to the window, so no rule below depends on the screen size.
// Suits are told apart by colour AND shape, never by text alone: Flame is a red triangle,
// Tide a blue drop, Gale a green diamond, Stone an amber square.

export const FIELD = { width: 1280, height: 720 };

export const DUEL = {
  maxHp: 30,
  openingHand: 4,
  drawPerRound: 2,
  handCap: 7,
  emberBase: 2,
  emberCap: 10,
  resonanceBonus: 2,
  aiCardsPerTurn: 3,
};

export const CARD = { width: 150, height: 208, radius: 12 };
export const FOE_CARD = { width: 86, height: 120, radius: 8 };

export const SUITS = {
  flame: { name: 'Flame', color: '#e5534b', dark: '#8f1f1a', light: '#ff8a7a', shape: 'triangle', verb: 'Deal' },
  tide: { name: 'Tide', color: '#4aa3df', dark: '#174a75', light: '#8ecdf5', shape: 'drop', verb: 'Heal' },
  gale: { name: 'Gale', color: '#58b368', dark: '#1e5c2e', light: '#93d9a0', shape: 'diamond', verb: 'Draw 2, deal' },
  stone: { name: 'Stone', color: '#e0a63c', dark: '#7a5410', light: '#f4cd7d', shape: 'square', verb: 'Shield' },
};

export const PALETTE = {
  felt: '#14261c',
  feltDark: '#0d1a13',
  table: '#1d3a2a',
  tableEdge: '#c9a227',
  panel: '#101b16',
  panelEdge: '#2e4a3a',
  text: '#f4efe2',
  muted: '#a8b8a4',
  gold: '#f2c94c',
  ember: '#ff7a2f',
  hp: '#e5534b',
  hpBack: '#3a1512',
  shield: '#8ecdf5',
  button: '#c9a227',
  buttonText: '#241a05',
  danger: '#ff6b5e',
};

export const FONT = 'system-ui, -apple-system, "Segoe UI", sans-serif';

/** Where wins and the fastest win are kept between visits (this browser only). */
export const WINS_KEY = 'emberfall-duel.wins';
export const BEST_ROUNDS_KEY = 'emberfall-duel.best-rounds';
