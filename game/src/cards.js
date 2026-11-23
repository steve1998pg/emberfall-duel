// The card catalogue: 40 original cards, ten per suit. One card is one line
// of rules: Flame deals damage, Tide heals, Gale draws two and deals a little,
// Stone grants shield. `power` is the strength of the verb; `cost` is the
// ember it takes to play. Each duelist's deck holds one of every card.
import { SUITS } from './config.js';

function card(suit, name, cost, power) {
  const verb =
    suit === 'flame'
      ? `Deal ${power} damage.`
      : suit === 'tide'
        ? `Heal ${power} life.`
        : suit === 'gale'
          ? `Draw 2 cards. Deal ${power} damage.`
          : `Gain ${power} shield.`;
  return { suit, name, cost, power, text: verb };
}

export const CATALOG = [
  // Flame: deal damage.
  card('flame', 'Ember Spark', 1, 3),
  card('flame', 'Fireball', 2, 5),
  card('flame', 'Cinder Slash', 2, 4),
  card('flame', 'Flame Lash', 1, 2),
  card('flame', 'Wildfire', 3, 6),
  card('flame', 'Phoenix Dive', 3, 7),
  card('flame', 'Coal Toss', 1, 2),
  card('flame', 'Magma Burst', 4, 9),
  card('flame', 'Ashen Edge', 2, 4),
  card('flame', 'Inferno', 4, 8),
  // Tide: heal yourself.
  card('tide', 'Spring Water', 1, 3),
  card('tide', 'Healing Rain', 2, 5),
  card('tide', 'Deep Well', 3, 7),
  card('tide', 'Mist Veil', 1, 2),
  card('tide', 'Tidal Surge', 3, 6),
  card('tide', 'Moon Pool', 2, 4),
  card('tide', 'Dew Drop', 1, 2),
  card('tide', "River's Gift", 2, 5),
  card('tide', 'Ocean Embrace', 4, 9),
  card('tide', 'Trickle', 1, 3),
  // Gale: draw two cards, then deal a little damage.
  card('gale', 'Swift Gust', 1, 1),
  card('gale', 'Storm Call', 3, 3),
  card('gale', 'Zephyr', 1, 1),
  card('gale', 'Tailwind', 2, 2),
  card('gale', 'Cyclone', 4, 3),
  card('gale', 'Breeze', 1, 1),
  card('gale', 'Howling Wind', 2, 2),
  card('gale', 'Sky Dart', 2, 2),
  card('gale', 'Tempest', 3, 3),
  card('gale', 'Feather Fall', 1, 1),
  // Stone: gain shield, which soaks damage before life does.
  card('stone', 'Pebble Guard', 1, 3),
  card('stone', 'Granite Wall', 3, 7),
  card('stone', 'Stone Skin', 2, 5),
  card('stone', 'Boulder', 2, 4),
  card('stone', 'Mountain Stance', 4, 9),
  card('stone', 'Gravel Shield', 1, 2),
  card('stone', 'Iron Rock', 3, 6),
  card('stone', 'Sand Barrier', 1, 3),
  card('stone', 'Cliff Face', 2, 5),
  card('stone', 'Obsidian Plate', 3, 6),
];

/** The suit record (name, colours, glyph) for a card. */
export function suitOf(aCard) {
  return SUITS[aCard.suit];
}

/** A fresh 40-card deck: one of every card in the catalogue. */
export function freshDeck() {
  return CATALOG.map((entry) => ({ ...entry }));
}
