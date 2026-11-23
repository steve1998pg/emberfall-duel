// Tuning, palette and suits for Emberfall Duel. Everything the rules and
// the renderer agree on lives here, so a balance tweak is one edit.

export const TUNE = {
  startLife: 30,
  maxLife: 30,
  startHand: 5,
  deckSize: 40,
  drawPerRound: 2,
  maxEmber: 10,
  // Ember refills to round + 2 each round (round 1 -> 3 ember).
  emberForRound: (round) => Math.min(10, round + 2),
  // Playing a card whose suit matches the last suit you played this turn.
  resonanceBonus: 2,
  // Life lost for each card that cannot be drawn from an empty deck.
  burnDamage: 2,
  // How long the "RESONANCE +2" banner stays on screen (ms).
  announceMs: 1600,
};

// The four suits. `glyph` is the shape drawn on the card; `color` the suit
// colour, `dark` its shaded edge, `light` the glow used for Resonance hints.
export const SUITS = {
  flame: {
    key: 'flame',
    name: 'Flame',
    glyph: 'triangle',
    color: '#e5484d',
    dark: '#8f1d22',
    light: '#ff8a7a',
    does: 'Deals damage',
  },
  tide: {
    key: 'tide',
    name: 'Tide',
    glyph: 'drop',
    color: '#3e9bff',
    dark: '#144a8a',
    light: '#8ec9ff',
    does: 'Heals your life',
  },
  gale: {
    key: 'gale',
    name: 'Gale',
    glyph: 'diamond',
    color: '#43b581',
    dark: '#1d6b45',
    light: '#8fe3b8',
    does: 'Draw 2, deal a little',
  },
  stone: {
    key: 'stone',
    name: 'Stone',
    glyph: 'square',
    color: '#e8a33d',
    dark: '#8a5a12',
    light: '#ffcf7d',
    does: 'Shield soaks damage',
  },
};

export const SUIT_KEYS = ['flame', 'tide', 'gale', 'stone'];

export const PALETTE = {
  table: '#14532d',
  tableDark: '#0c331b',
  tableEdge: '#0a2a17',
  feltLine: '#1e6b3a',
  gold: '#f5c542',
  goldDim: '#b98a1e',
  cream: '#f7f0dc',
  ink: '#241d12',
  muted: '#8a8272',
  panel: '#1c1408',
  panelEdge: '#3d2f14',
  aiRed: '#c0392b',
  youTeal: '#2e8b74',
  button: '#7c5cff',
  buttonEdge: '#4b2fd6',
};
