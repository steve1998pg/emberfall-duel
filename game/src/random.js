// Seeded RNG for Emberfall Duel — deterministic so a duel can be replayed
// from its seed. mulberry32: small, fast, good enough for shuffling decks.

// A function () => a float in [0, 1), seeded by a 32-bit integer.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function next() {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Fisher-Yates shuffle, in place, driven by `rng`. Returns the array.
export function shuffle(deck, rng) {
  for (let i = deck.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    const tmp = deck[i];
    deck[i] = deck[j];
    deck[j] = tmp;
  }
  return deck;
}

// An integer in [0, n).
export function rollInt(rng, n) {
  return Math.floor(rng() * n);
}
