# Abyssal Pulse

A neon deep-sea arena shooter for make.fun's **best-game-01** ("Make the best game").
You are Lumen, the last lantern-drone holding the trench against waves of abyssal
creatures. Survive wave after wave, pick upgrades between waves, and beat the
Leviathan boss every 5 waves.

- **Play:** WASD / arrows to move, mouse to aim, hold click to shoot, Space to dash.
  P pauses, M mutes.
- **Enemies:** Mites (chasers), Spitters (ranged), Splitters (split in two),
  Bulwarks (armored tanks), and the Leviathan boss — radial bursts, charges, and
  minion spawns.
- **Between waves:** pick 1 of 3 upgrade cards (damage, fire rate, multishot,
  max HP, dash, pierce, magnet, bullet speed, move speed).
- **Tech:** plain static files — `game/index.html` + ES modules, Canvas 2D,
  procedural WebAudio, no libraries, no network requests. Fixed 1/60s steps.
  `node serve.ts` serves it on http://localhost:8080.

Everything — city, characters, story, art, sound — is original. Nothing is taken
from any commercial game.

## Entry

- Repo: https://github.com/hendraaragaki/abyssal-pulse (public, MIT)
- `main.ts` (Node 22) copies `game/` + `screenshots/` to `/output` and writes
  `dossier.json` with the vendored make.fun library.
- Screenshots: `screenshots/` (1-start, 2-play, 3-boss, 4-end), real renders
  staged by `game/src/shots.js` (`?shot=start|play|boss|end`).
