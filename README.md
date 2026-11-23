# Emberfall Duel

[![make.fun · best-card-game-20261122-1826](https://make.fun/badge/best-card-game-20261122-1826.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![rank](https://make.fun/badge/best-card-game-20261122-1826/steve1998pg/emberfall-duel/rank.svg)](https://make.fun/bounty/best-card-game-20261122-1826/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![reward](https://make.fun/badge/best-card-game-20261122-1826/steve1998pg/emberfall-duel/reward.svg)](https://make.fun/bounty/best-card-game-20261122-1826?utm_source=github&utm_medium=readme&utm_campaign=best-card-game-20261122-1826)
[![make.fun bounty](https://img.shields.io/badge/make.fun-bounty-7c5cff)](https://make.fun/bounty/best-card-game-20261122-1826)
[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

A complete, original turn-based card duel that plays offline in a desktop browser —
my entry for the [make.fun "Make the best card game" bounty](https://make.fun/bounty/best-card-game-20261122-1826).

You are the **Ember Warden**, duelling **Cinder, the Ashbringer**, across a green baize
table. Both duelists have 30 life, a 40-card deck, and ember that refills every round.
Play cards, chain suits, and reduce Cinder to 0 life before yours burns out.

## The four suits

| Suit | Colour & shape | Does |
| --- | --- | --- |
| **Flame** | red triangle | Deals damage |
| **Tide** | blue drop | Heals your life |
| **Gale** | green diamond | Draws 2 cards, deals a little damage |
| **Stone** | amber square | Grants shield, which soaks damage first |

**Resonance:** play two cards of the same suit in one turn and the second hits **+2**
harder. The hint is on the table before you choose: while it is your turn, every
card in hand whose suit matches the last suit you played gets a gold glow ring and
a small "✦ RESONANCE" tag underneath. That is the whole mind game: spend ember now
for a combo, or hold it and shield.

**The rival reads you back:** Cinder goes for the kill when it can, patches itself up
when hurt, and draws when its hand runs thin — so you can see its plan coming and answer it.

## How to play

- **Mouse:** click a card to play it, click **END TURN** to pass.
- **Keyboard:** `1`–`9` play a card, `E` ends your turn, `Space` starts a duel.
- Each round refills your ember (round + 2, up to 10) and both duelists draw 2 cards.
- A deck that runs out does not come back: every card that cannot be drawn burns 2 life,
  so no duel can turtle forever — and no dead ends, the cards in hand still play.
- Win by reducing Cinder to 0 life; lose if yours reaches 0.

## Play it

```sh
node serve.ts
# open http://localhost:8080/game/index.html
```

No build step, no network request, no library: `game/index.html` and its ES modules
under `game/src/` are the whole game. Sounds are synthesised with WebAudio.

## Layout

- `game/` — the playable game as static files
  - `game/src/config.js` — tuning, palette, suits
  - `game/src/cards.js` — the 40-card catalogue
  - `game/src/random.js` — seeded RNG, so a duel replays from its seed
  - `game/src/duel.js` — rules, turns, ember, Resonance, the rival's brain
  - `game/src/render.js` — table, cards, life bars, screens, Resonance hints
  - `game/src/input.js` — mouse and keyboard
  - `game/src/audio.js` — synthesised sound
  - `game/src/shots.js` — deterministic screenshot scenes (`?shot=title|table|win|loss`)
  - `game/src/main.js` — boot and the game loop
- `screenshots/` — real renders of the game's own code (table, title, win, loss)
- `main.ts` — hands the game in: copies `game/` + `screenshots/` and writes `dossier.json`
- `vendor/makefun-game.ts` — the kit's dossier library, unchanged

## License

MIT — see [LICENSE](LICENSE).
