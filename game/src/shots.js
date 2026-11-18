// Staged scenes for the 4 screenshots (?shot=start|play|boss|end).
// Deterministic placement (seeded RNG) so renders are reproducible.

import { VIEW, PLAYER } from './config.js';
import { createWorld, startGame, spawnEnemy } from './world.js';
import { mulberry32 } from './random.js';

function scatterPearls(world, rng, n) {
  for (let i = 0; i < n; i++) {
    world.pearlDrops.push({
      x: 120 + rng() * (VIEW.w - 240), y: 120 + rng() * (VIEW.h - 240),
      vx: 0, vy: 0, value: 1, life: 9,
    });
  }
}

function scatterBubbles(world, rng, n) {
  for (let i = 0; i < n; i++) {
    world.particles.push({
      x: rng() * VIEW.w, y: rng() * VIEW.h,
      vx: rng() * 10 - 5, vy: -rng() * 40 - 10,
      life: 2 + rng() * 2, maxLife: 4,
      size: 1.5 + rng() * 3, color: 'rgba(160, 220, 255, 0.4)', type: 'bubble',
    });
  }
}

export function stageShot(world, name) {
  const rng = mulberry32(name === 'boss' ? 99 : name === 'play' ? 42 : name === 'end' ? 7 : 5);
  world.time = 14;
  world.best = 12500;
  if (name === 'start') {
    world.phase = 'title';
    world.player = null;
    // A few creatures posed behind the title.
    const spots = [
      ['mite', 180, 560], ['spitter', 1060, 520], ['splitter', 300, 160],
      ['bulwark', 980, 170], ['mite', 640, 620], ['mite', 880, 600],
    ];
    world.wave = 1;
    for (const [type, x, y] of spots) spawnEnemy(world, type, x, y);
    scatterPearls(world, rng, 8);
    scatterBubbles(world, rng, 26);
    return;
  }
  if (name === 'play') {
    startGame(world, null);
    world.wave = 3;
    world.score = 4850;
    world.pearls = 37;
    world.kills = 64;
    world.player.x = 560; world.player.y = 380;
    world.player.hp = 82;
    const spots = [
      ['mite', 220, 200], ['mite', 300, 520], ['spitter', 1020, 220],
      ['spitter', 900, 540], ['splitter', 760, 180], ['bulwark', 1120, 380],
      ['mite', 420, 620], ['mite', 980, 420],
    ];
    for (const [type, x, y] of spots) spawnEnemy(world, type, x, y);
    // Bullets mid-flight toward the upper-right pack.
    for (let i = 0; i < 5; i++) {
      world.bullets.push({
        x: 600 + i * 26, y: 360 - i * 18,
        vx: 520, vy: -260, damage: 15, radius: 4, life: 0.8, pierce: 0,
      });
    }
    scatterPearls(world, rng, 10);
    scatterBubbles(world, rng, 20);
    return;
  }
  if (name === 'boss') {
    startGame(world, null);
    world.wave = 5;
    world.score = 12300;
    world.pearls = 91;
    world.kills = 141;
    world.player.x = 620; world.player.y = 560;
    world.player.hp = 64;
    const boss = spawnEnemy(world, 'leviathan', 640, 220);
    boss.hp = Math.round(boss.maxHp * 0.62);
    const spots = [
      ['mite', 300, 300], ['mite', 980, 320], ['spitter', 220, 480], ['mite', 1080, 500],
    ];
    for (const [type, x, y] of spots) spawnEnemy(world, type, x, y);
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * Math.PI * 2;
      world.enemyBullets.push({
        x: 640 + Math.cos(a) * 130, y: 220 + Math.sin(a) * 130,
        vx: Math.cos(a) * 170, vy: Math.sin(a) * 170,
        radius: 7, damage: 12, life: 5,
      });
    }
    for (let i = 0; i < 6; i++) {
      world.bullets.push({
        x: 620 + i * 22, y: 520 - i * 14,
        vx: 60, vy: -640, damage: 15, radius: 4, life: 0.8, pierce: 1,
      });
    }
    scatterPearls(world, rng, 8);
    scatterBubbles(world, rng, 18);
    return;
  }
  // end
  world.phase = 'gameover';
  world.wave = 7;
  world.score = 18750;
  world.kills = 203;
  world.pearls = 148;
  world.player = { x: 640, y: 380, vx: 0, vy: 0, radius: 14, hp: 0, maxHp: 100, angle: 0, fireTimer: 0, dashTimer: 0, dashCooldown: 0, dashDirX: 1, dashDirY: 0, invuln: 0, multishot: 2, pierce: 1, dmgMul: 1.5, fireMul: 0.8, speedMul: 1.12, bulletSpeedMul: 1, dashCdMul: 1, magnetMul: 1 };
  const spots = [['mite', 280, 260], ['spitter', 1000, 300], ['splitter', 420, 560]];
  for (const [type, x, y] of spots) spawnEnemy(world, type, x, y);
  for (let i = 0; i < 30; i++) {
    const a = rng() * Math.PI * 2;
    world.particles.push({
      x: 640, y: 380, vx: Math.cos(a) * (80 + rng() * 260), vy: Math.sin(a) * (80 + rng() * 260),
      life: 0.6 + rng() * 0.5, maxLife: 1.1, size: 2 + rng() * 3,
      color: i % 2 ? '#5ef2ff' : '#ff5d5d', type: 'spark',
    });
  }
  scatterBubbles(world, rng, 14);
}
