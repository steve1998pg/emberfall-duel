// The card catalogue: 40 original cards, ten per suit. A card is one line of rules:
// Flame deals damage, Tide heals, Gale draws two and deals a little, Stone grants shield.
// `power` is the amount the verb applies to; `cost` is the ember it takes to play.
// Every card is an object of its own so the deck, the hand and the discard pile can move
// cards around without ever copying their rules.
import { SUITS } from './config.js';

/**
 * Build one card. `suit` is a key of SUITS, `name` its own name, `cost` its ember price
 * and `power` the strength of its verb. `text` is the one line the card shows.
 */
function card(suit, name, cost, power, text) {
  return { suit, name, cost, power, text };
}

export const CATALOG = [
  // Flame: deal damage.
  card('flame', 'Ember Spark', 1, 2, 'Deal 2 damage.'),
  card('flame', 'Blaze Step', 1, 3, 'Deal 3 damage.'),
  card('flame', 'Ash Fang', 2, 3, 'Deal 3 damage.'),
  card('flame', 'Cinder Lash', 2, 4, 'Deal 4 damage.'),
  card('flame', 'Flame Tongue', 3, 5, 'Deal 5 damage.'),
  card('flame', 'Pyre Song', 3, 6, 'Deal 6 damage.'),
  card('flame', 'Wildfire', 4, 7, 'Deal 7 damage.'),
  card('flame', 'Dragon Breath', 4, 8, 'Deal 8 damage.'),
  card('flame', 'Inferno Crown', 5, 9, 'Deal 9 damage.'),
  card('flame', 'Phoenix Rise', 6, 11, 'Deal 11 damage.'),
  // Tide: heal yourself.
  card('tide', 'Dew Drop', 1, 2, 'Heal 2 life.'),
  card('tide', 'Rain Kiss', 1, 3, 'Heal 3 life.'),
  card('tide', 'Spring Mend', 2, 3, 'Heal 3 life.'),
  card('tide', "River's Gift", 2, 4, 'Heal 4 life.'),
  card('tide', 'Tidal Embrace', 3, 5, 'Heal 5 life.'),
  card('tide', 'Moonwell', 3, 6, 'Heal 6 life.'),
  card('tide', 'Deep Renewal', 4, 7, 'Heal 7 life.'),
  card('tide', 'Flood of Life', 4, 8, 'Heal 8 life.'),
  card('tide', "Ocean's Mercy", 5, 9, 'Heal 9 life.'),
  card('tide', 'Rebirth Tide', 6, 10, 'Heal 10 life.'),
  // Gale: draw two cards, then deal a little damage.
  card('gale', 'Zephyr Note', 1, 1, 'Draw 2. Deal 1 damage.'),
  card('gale', 'Breeze', 1, 2, 'Draw 2. Deal 2 damage.'),
  card('gale', 'Swift Letter', 2, 2, 'Draw 2. Deal 2 damage.'),
  card('gale', 'Wind Runner', 2, 3, 'Draw 2. Deal 3 damage.'),
  card('gale', 'Storm Call', 3, 3, 'Draw 2. Deal 3 damage.'),
  card('gale', 'Sky Hunt', 3, 4, 'Draw 2. Deal 4 damage.'),
  card('gale', 'Cyclone', 4, 4, 'Draw 2. Deal 4 damage.'),
  card('gale', 'Tempest', 4, 5, 'Draw 2. Deal 5 damage.'),
  card('gale', 'Hurricane', 5, 6, 'Draw 2. Deal 6 damage.'),
  card('gale', 'Skyfall', 6, 7, 'Draw 2. Deal 7 damage.'),
  // Stone: gain shield, which soaks damage before life does.
  card('stone', 'Stone Skin', 1, 2, 'Gain 2 shield.'),
  card('stone', 'Pebble Wall', 1, 3, 'Gain 3 shield.'),
  card('stone', 'Granite Guard', 2, 4, 'Gain 4 shield.'),
  card('stone', 'Ironhide', 2, 5, 'Gain 5 shield.'),
  card('stone', 'Bastion', 3, 6, 'Gain 6 shield.'),
  card('stone', "Mountain's Back", 3, 7, 'Gain 7 shield.'),
  card('stone', 'Fortress', 4, 8, 'Gain 8 shield.'),
  card('stone', 'Diamond Shell', 4, 9, 'Gain 9 shield.'),
  card('stone', "Titan's Aegis", 5, 10, 'Gain 10 shield.'),
  card('stone', 'World Anchor', 6, 12, 'Gain 12 shield.'),
];

/** The suit's display name, colour and shape for a card. */
export function suitOf(cardValue) {
  return SUITS[cardValue.suit];
}

/** A fresh 40-card deck: one of every card in the catalogue. */
export function freshDeck() {
  return CATALOG.map((entry) => ({ ...entry }));
}
