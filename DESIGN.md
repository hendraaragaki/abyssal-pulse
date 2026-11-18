# Abyssal Pulse — design (best-game-01, second entry)

## Why a second game
- Bounty: make.fun best-game-01, "Make the best game", $1,000 (1st $400, 2nd $200,
  3rd $120, 4th–10th $40). Entries close Thu 19 Nov 2026 01:00 WIB; result due 3 Dec 2026.
- First entry "Gondola Langit" (2D canvas arcade, gondola cleaning windows) is already
  submitted and accepted — this is a deliberate second, different game: the last
  submission before the deadline is the final entry.
- Repo: https://github.com/hendraaragaki/abyssal-pulse (public, created 18 Nov 2026
  ~20:03 WIB, after the bounty opened). Same account @hendra-aragaki, same payout
  wallet 4VkXB6iP6Zod1EqQ57iHZdAKbKs4fX3XjS6TUQULK54D.

## The game — neon deep-sea arena shooter (2D canvas, keyboard + mouse)
You are Lumen, a lantern-drone. The trench never sleeps: creatures come in waves.
- Goal: survive. Each wave spawns a budget of enemies; clear the wave, pick 1 of 3
  upgrade cards, next wave. Boss (Leviathan) every 5 waves. Lose = HP hits 0.
- Controls: WASD / arrows move; mouse aims; hold click shoots; Space/Shift dashes
  (brief invulnerability); P pause; M mute; Enter start/restart; 1/2/3 or click
  picks an upgrade card.
- Depth: 9 upgrades with levels (damage, fire rate, multishot, speed, max HP,
  dash cooldown, pierce, magnet, bullet speed); pearls dropped by kills (score +
  magnet pickup); enemy variety with distinct behaviors (chase / ranged / split /
  tank / boss with radial bursts + charges + minions); scaling HP/speed per wave.
- Feedback: HUD (HP bar, score, wave, pearls, kills, dash readiness, boss bar,
  radar minimap); title / upgrade / pause / game-over screens; particles
  (bubbles, sparks, floating damage numbers), screen shake, damage flash,
  parallax trench (rock ridge, kelp, plankton, god rays); procedural WebAudio
  (shoot, hit, explosion, pearl, wave horn, upgrade, boss, game over).
- Screenshots: `?shot=start|play|boss|end` staging in shots.js, captured by
  shot.mjs (headless Chromium over CDP, file:// load, waits for __shotReady).

## Build plan
- One-clear-job-per-file, mirroring the starter architecture (fixed 1/60s steps):
  config.js (tuning) · random.js (seeded RNG) · audio.js (WebAudio synth) ·
  input.js (keyboard+mouse) · world.js (simulation: player, enemies, waves,
  upgrades, collisions) · render.js (background, entities, HUD, screens) ·
  shots.js (staged scenes) · main.js (boot + loop).
- Validate: node --check every module; dossier build via main.ts; soak test;
  4 screenshots via shot.mjs; bundle transcripts; push; submit before 01:00 WIB.
