// Abyssal Pulse — simulation. Fixed timestep (1/60s), no rendering here.
// Phases: title -> playing -> upgrade -> playing ... -> gameover.

import { VIEW, PLAYER, ENEMIES, WAVES, UPGRADES } from './config.js';
import { clamp, dist2, angleTo, rand, randInt, pick } from './random.js';

export function createWorld() {
  return {
    phase: 'title',
    paused: false,
    time: 0,
    wave: 0,
    score: 0,
    pearls: 0,
    kills: 0,
    best: 0,
    player: null,
    bullets: [],
    enemyBullets: [],
    enemies: [],
    particles: [],
    floaters: [],
    pearlDrops: [],
    spawnQueue: [],
    spawnTimer: 0,
    waveActive: false,
    boss: null,
    upgradeChoices: [],
    uiCards: [],
    taken: {},
    shake: 0,
    flash: 0,
    waveBanner: 0,
    ambientTimer: 0,
    stats: { shots: 0, hits: 0 },
  };
}

function makePlayer() {
  return {
    x: VIEW.w / 2, y: VIEW.h / 2, vx: 0, vy: 0,
    radius: PLAYER.radius,
    hp: PLAYER.hp, maxHp: PLAYER.hp,
    angle: -Math.PI / 2,
    fireTimer: 0,
    dashTimer: 0, dashCooldown: 0,
    dashDirX: 1, dashDirY: 0,
    invuln: 0,
    multishot: 1, pierce: 0,
    dmgMul: 1, fireMul: 1, speedMul: 1, bulletSpeedMul: 1,
    dashCdMul: 1, magnetMul: 1,
  };
}

export function startGame(world, sfx) {
  world.phase = 'playing';
  world.paused = false;
  world.time = 0;
  world.wave = 0;
  world.score = 0;
  world.pearls = 0;
  world.kills = 0;
  world.bullets = [];
  world.enemyBullets = [];
  world.enemies = [];
  world.particles = [];
  world.floaters = [];
  world.pearlDrops = [];
  world.spawnQueue = [];
  world.boss = null;
  world.taken = {};
  world.shake = 0;
  world.flash = 0;
  world.player = makePlayer();
  startWave(world, 1, sfx);
}

function waveComposition(n) {
  const queue = [];
  let budget = WAVES.budgetBase + (n - 1) * WAVES.budgetPerWave;
  const table = [
    { type: 'mite', cost: 1, minWave: 1, weight: 10 },
    { type: 'spitter', cost: 2, minWave: 2, weight: 5 },
    { type: 'splitter', cost: 3, minWave: 3, weight: 4 },
    { type: 'bulwark', cost: 4, minWave: 4, weight: 3 },
  ];
  const avail = table.filter((t) => t.minWave <= n);
  let guard = 0;
  while (budget > 0 && guard++ < 200) {
    const affordable = avail.filter((t) => t.cost <= budget);
    if (!affordable.length) break;
    const total = affordable.reduce((s, t) => s + t.weight, 0);
    let roll = Math.random() * total;
    let chosen = affordable[0];
    for (const t of affordable) { roll -= t.weight; if (roll <= 0) { chosen = t; break; } }
    queue.push(chosen.type);
    budget -= chosen.cost;
  }
  // Shuffle so the trickle mixes types.
  for (let i = queue.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [queue[i], queue[j]] = [queue[j], queue[i]];
  }
  return queue;
}

export function startWave(world, n, sfx) {
  world.wave = n;
  world.waveActive = true;
  world.waveBanner = 2.2;
  world.spawnQueue = waveComposition(n);
  world.spawnTimer = 0.5;
  if (n % WAVES.bossEvery === 0) {
    spawnEnemy(world, 'leviathan', VIEW.w / 2, -80);
  }
  if (sfx) sfx.wave();
}

function edgePoint(margin) {
  const side = randInt(0, 3);
  if (side === 0) return { x: rand(-margin, VIEW.w + margin), y: -margin };
  if (side === 1) return { x: rand(-margin, VIEW.w + margin), y: VIEW.h + margin };
  if (side === 2) return { x: -margin, y: rand(0, VIEW.h) };
  return { x: VIEW.w + margin, y: rand(0, VIEW.h) };
}

export function spawnEnemy(world, type, x, y) {
  const base = ENEMIES[type];
  const n = world.wave || 1;
  const hpScale = 1 + (n - 1) * WAVES.hpScalePerWave;
  const spScale = Math.min(1.5, 1 + (n - 1) * WAVES.speedScalePerWave);
  const p = x === undefined ? edgePoint(40) : { x, y };
  const e = {
    type, x: p.x, y: p.y, vx: 0, vy: 0,
    hp: Math.round(base.hp * hpScale),
    maxHp: Math.round(base.hp * hpScale),
    radius: base.radius,
    speed: base.speed * spScale,
    damage: base.damage,
    score: base.score,
    pearls: base.pearls,
    color: base.color, glow: base.glow,
    behavior: base.behavior,
    shotTimer: rand(1, 2),
    t: rand(0, Math.PI * 2),
    radialTimer: 2.0,
    chargeTimer: 4.0,
    chargeState: 'chase',
    chargeT: 0,
    flash: 0,
  };
  world.enemies.push(e);
  if (type === 'leviathan') world.boss = e;
  return e;
}

function burst(world, x, y, color, count, speed, life, size) {
  for (let i = 0; i < count; i++) {
    const a = rand(0, Math.PI * 2);
    const s = rand(speed * 0.3, speed);
    world.particles.push({
      x, y, vx: Math.cos(a) * s, vy: Math.sin(a) * s,
      life: rand(life * 0.5, life), maxLife: life,
      size: rand(size * 0.5, size * 1.4), color, type: 'spark',
    });
  }
}

function bubbles(world, x, y, count) {
  for (let i = 0; i < count; i++) {
    world.particles.push({
      x: x + rand(-14, 14), y: y + rand(-14, 14),
      vx: rand(-12, 12), vy: rand(-70, -30),
      life: rand(0.5, 1.1), maxLife: 1.1,
      size: rand(2, 6), color: 'rgba(180, 240, 255, 0.5)', type: 'bubble',
    });
  }
}

function floater(world, x, y, text, color) {
  world.floaters.push({ x, y, text, color: color || '#dff6ff', life: 0.9, maxLife: 0.9 });
}

function damagePlayer(world, dmg, sfx) {
  const p = world.player;
  if (!p || p.invuln > 0 || world.phase !== 'playing') return;
  p.hp -= dmg;
  p.invuln = PLAYER.invulnTime;
  world.flash = 1;
  world.shake = Math.max(world.shake, 9);
  if (sfx) sfx.hurt();
  burst(world, p.x, p.y, '#ff5d5d', 10, 160, 0.5, 3);
  if (p.hp <= 0) {
    p.hp = 0;
    world.phase = 'gameover';
    world.best = Math.max(world.best, world.score);
    burst(world, p.x, p.y, '#5ef2ff', 46, 320, 1.0, 4);
    bubbles(world, p.x, p.y, 14);
    world.shake = 16;
    if (sfx) sfx.gameover();
  }
}

function killEnemy(world, e, sfx) {
  world.kills++;
  world.score += e.score;
  floater(world, e.x, e.y - e.radius - 6, `+${e.score}`, '#ffe9a8');
  burst(world, e.x, e.y, e.color, e.type === 'leviathan' ? 60 : 16, 260, 0.7, 4);
  bubbles(world, e.x, e.y, 6);
  if (sfx) sfx.explode();
  world.shake = Math.max(world.shake, e.type === 'leviathan' ? 14 : 4);
  for (let i = 0; i < e.pearls; i++) {
    const a = rand(0, Math.PI * 2);
    world.pearlDrops.push({
      x: e.x, y: e.y,
      vx: Math.cos(a) * rand(40, 130), vy: Math.sin(a) * rand(40, 130),
      value: 1, life: 9,
    });
  }
  if (e.type === 'splitter') {
    for (let i = 0; i < ENEMIES.splitter.children; i++) {
      const c = spawnEnemy(world, ENEMIES.splitter.childType, e.x + rand(-20, 20), e.y + rand(-20, 20));
      c.hp = Math.min(c.hp, ENEMIES.mite.hp);
      c.maxHp = c.hp;
    }
  }
  if (e.type === 'leviathan') world.boss = null;
}

export function offerUpgrades(world) {
  const avail = UPGRADES.filter((u) => (world.taken[u.id] || 0) < u.max);
  const picks = [];
  const pool = [...avail];
  while (pool.length && picks.length < 3) {
    picks.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
  }
  world.upgradeChoices = picks;
  world.phase = 'upgrade';
}

export function applyUpgrade(world, id, sfx) {
  const p = world.player;
  world.taken[id] = (world.taken[id] || 0) + 1;
  if (id === 'damage') p.dmgMul *= 1.25;
  if (id === 'firerate') p.fireMul *= 0.8;
  if (id === 'multishot') p.multishot += 1;
  if (id === 'speed') p.speedMul *= 1.12;
  if (id === 'maxhp') { p.maxHp += 25; p.hp = Math.min(p.maxHp, p.hp + 25); }
  if (id === 'dash') p.dashCdMul *= 0.75;
  if (id === 'pierce') p.pierce += 1;
  if (id === 'magnet') p.magnetMul *= 1.6;
  if (id === 'bulletspeed') p.bulletSpeedMul *= 1.15;
  if (sfx) sfx.upgrade();
  p.hp = Math.min(p.maxHp, p.hp + 8); // small breather between waves
  startWave(world, world.wave + 1, sfx);
  world.phase = 'playing';
}

function fireBullets(world, sfx) {
  const p = world.player;
  const n = p.multishot;
  const spread = 0.14;
  const baseAngle = p.angle;
  for (let i = 0; i < n; i++) {
    const off = (i - (n - 1) / 2) * spread;
    const a = baseAngle + off;
    world.bullets.push({
      x: p.x + Math.cos(a) * (p.radius + 6),
      y: p.y + Math.sin(a) * (p.radius + 6),
      vx: Math.cos(a) * PLAYER.bulletSpeed * p.bulletSpeedMul,
      vy: Math.sin(a) * PLAYER.bulletSpeed * p.bulletSpeedMul,
      damage: Math.round(PLAYER.bulletDamage * p.dmgMul),
      radius: PLAYER.bulletRadius,
      life: PLAYER.bulletLife,
      pierce: p.pierce,
    });
  }
  world.stats.shots++;
  if (sfx) sfx.shoot();
}

export function updateWorld(world, input, dt, sfx) {
  world.time += dt;
  world.shake = Math.max(0, world.shake - dt * 26);
  world.flash = Math.max(0, world.flash - dt * 2.4);
  world.waveBanner = Math.max(0, world.waveBanner - dt);

  // Ambient bubbles drifting up, always.
  world.ambientTimer -= dt;
  if (world.ambientTimer <= 0) {
    world.ambientTimer = 0.25;
    world.particles.push({
      x: rand(0, VIEW.w), y: VIEW.h + 8,
      vx: rand(-8, 8), vy: rand(-46, -22),
      life: rand(2, 4), maxLife: 4,
      size: rand(1.5, 4), color: 'rgba(160, 220, 255, 0.35)', type: 'bubble',
    });
  }

  // Particles + floaters always animate (even on title, for life).
  for (const pt of world.particles) {
    pt.x += pt.vx * dt; pt.y += pt.vy * dt;
    pt.vy += pt.type === 'bubble' ? -14 * dt : 0;
    pt.life -= dt;
  }
  world.particles = world.particles.filter((pt) => pt.life > 0);
  for (const f of world.floaters) { f.y -= 34 * dt; f.life -= dt; }
  world.floaters = world.floaters.filter((f) => f.life > 0);

  if (world.phase !== 'playing' || world.paused) return;

  const p = world.player;
  if (!p) return;

  // --- spawning trickle ---
  if (world.spawnQueue.length) {
    world.spawnTimer -= dt;
    if (world.spawnTimer <= 0) {
      world.spawnTimer = WAVES.spawnInterval * rand(0.8, 1.2);
      spawnEnemy(world, world.spawnQueue.shift());
    }
  }

  // --- player movement ---
  const ax = input.axis();
  p.angle = angleTo(p.x, p.y, input.mouse.x, input.mouse.y);
  if (p.dashTimer > 0) {
    p.dashTimer -= dt;
    p.vx = p.dashDirX * PLAYER.dashSpeed;
    p.vy = p.dashDirY * PLAYER.dashSpeed;
  } else {
    p.vx += ax.x * PLAYER.accel * p.speedMul * dt;
    p.vy += ax.y * PLAYER.accel * p.speedMul * dt;
    const damp = Math.pow(PLAYER.drag, dt * 60);
    p.vx *= damp; p.vy *= damp;
    const sp = Math.hypot(p.vx, p.vy);
    const max = PLAYER.maxSpeed * p.speedMul;
    if (sp > max) { p.vx = (p.vx / sp) * max; p.vy = (p.vy / sp) * max; }
  }
  p.x = clamp(p.x + p.vx * dt, p.radius, VIEW.w - p.radius);
  p.y = clamp(p.y + p.vy * dt, p.radius, VIEW.h - p.radius);
  p.dashCooldown = Math.max(0, p.dashCooldown - dt);
  p.invuln = Math.max(0, p.invuln - dt);

  if (input.pressed(' ', 'Shift')) {
    if (p.dashCooldown <= 0 && p.dashTimer <= 0) {
      let dx = ax.x, dy = ax.y;
      if (dx === 0 && dy === 0) { dx = Math.cos(p.angle); dy = Math.sin(p.angle); }
      const len = Math.hypot(dx, dy) || 1;
      p.dashDirX = dx / len; p.dashDirY = dy / len;
      p.dashTimer = PLAYER.dashTime;
      p.dashCooldown = PLAYER.dashCooldown * p.dashCdMul;
      p.invuln = Math.max(p.invuln, PLAYER.dashTime + 0.12);
      burst(world, p.x, p.y, '#5ef2ff', 8, 140, 0.4, 3);
      if (sfx) sfx.dash();
    }
  }

  // --- firing ---
  p.fireTimer -= dt;
  if (input.mouse.down && p.fireTimer <= 0) {
    p.fireTimer = PLAYER.fireInterval * p.fireMul;
    fireBullets(world, sfx);
  }

  // --- enemies ---
  for (const e of world.enemies) {
    e.t += dt;
    e.flash = Math.max(0, e.flash - dt * 6);
    const d = Math.hypot(p.x - e.x, p.y - e.y) || 1;
    const nx = (p.x - e.x) / d, ny = (p.y - e.y) / d;
    if (e.behavior === 'chase') {
      e.vx += nx * e.speed * 3 * dt;
      e.vy += ny * e.speed * 3 * dt;
      const sp = Math.hypot(e.vx, e.vy);
      if (sp > e.speed) { e.vx = (e.vx / sp) * e.speed; e.vy = (e.vy / sp) * e.speed; }
      e.x += e.vx * dt; e.y += e.vy * dt;
    } else if (e.behavior === 'ranged') {
      const want = ENEMIES.spitter.range;
      const dir = d > want + 30 ? 1 : d < want - 60 ? -1 : 0;
      e.vx += nx * dir * e.speed * 2 * dt;
      e.vy += ny * dir * e.speed * 2 * dt;
      const strafe = Math.sin(e.t * 1.4) * 40;
      e.x += (e.vx + -ny * strafe) * dt;
      e.y += (e.vy + nx * strafe) * dt;
      e.shotTimer -= dt;
      if (e.shotTimer <= 0 && d < 520) {
        e.shotTimer = ENEMIES.spitter.shotInterval * rand(0.9, 1.15);
        world.enemyBullets.push({
          x: e.x, y: e.y, vx: nx * ENEMIES.spitter.orbSpeed, vy: ny * ENEMIES.spitter.orbSpeed,
          radius: ENEMIES.spitter.orbRadius, damage: e.damage, life: 4,
        });
      }
    } else if (e.behavior === 'boss') {
      e.radialTimer -= dt;
      e.chargeTimer -= dt;
      if (e.chargeState === 'chase') {
        e.vx += nx * e.speed * 2 * dt;
        e.vy += ny * e.speed * 2 * dt;
        const sp = Math.hypot(e.vx, e.vy);
        if (sp > e.speed) { e.vx = (e.vx / sp) * e.speed; e.vy = (e.vy / sp) * e.speed; }
        e.x += e.vx * dt; e.y += e.vy * dt;
        if (e.radialTimer <= 0) {
          e.radialTimer = ENEMIES.leviathan.radialInterval;
          for (let i = 0; i < ENEMIES.leviathan.radialCount; i++) {
            const a = (i / ENEMIES.leviathan.radialCount) * Math.PI * 2 + e.t;
            world.enemyBullets.push({
              x: e.x, y: e.y,
              vx: Math.cos(a) * 170, vy: Math.sin(a) * 170,
              radius: 7, damage: 12, life: 5,
            });
          }
          if (sfx) sfx.boss();
        }
        if (e.chargeTimer <= 0) {
          e.chargeState = 'windup'; e.chargeT = 0.6;
          e.chargeDirX = nx; e.chargeDirY = ny;
        }
      } else if (e.chargeState === 'windup') {
        e.chargeT -= dt;
        e.vx *= 0.9; e.vy *= 0.9;
        if (e.chargeT <= 0) { e.chargeState = 'charge'; e.chargeT = 0.7; }
      } else if (e.chargeState === 'charge') {
        e.chargeT -= dt;
        e.x += e.chargeDirX * ENEMIES.leviathan.chargeSpeed * dt;
        e.y += e.chargeDirY * ENEMIES.leviathan.chargeSpeed * dt;
        if (e.chargeT <= 0) {
          e.chargeState = 'chase';
          e.chargeTimer = ENEMIES.leviathan.chargeInterval * rand(0.9, 1.2);
          for (let i = 0; i < 2; i++) spawnEnemy(world, 'mite', e.x + rand(-50, 50), e.y + rand(-50, 50));
        }
      }
      e.x = clamp(e.x, e.radius, VIEW.w - e.radius);
      e.y = clamp(e.y, e.radius, VIEW.h - e.radius);
    }
  }

  // --- bullets ---
  for (const b of world.bullets) {
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
  }
  world.bullets = world.bullets.filter((b) => b.life > 0 && b.x > -20 && b.x < VIEW.w + 20 && b.y > -20 && b.y < VIEW.h + 20);
  for (const b of world.enemyBullets) {
    b.x += b.vx * dt; b.y += b.vy * dt; b.life -= dt;
  }
  world.enemyBullets = world.enemyBullets.filter((b) => b.life > 0 && b.x > -30 && b.x < VIEW.w + 30 && b.y > -30 && b.y < VIEW.h + 30);

  // --- bullet vs enemy ---
  for (const b of world.bullets) {
    if (b.pierce < 0) continue;
    for (const e of world.enemies) {
      if (e.hp <= 0) continue;
      const rr = b.radius + e.radius;
      if (dist2(b.x, b.y, e.x, e.y) < rr * rr) {
        e.hp -= b.damage;
        e.flash = 1;
        world.stats.hits++;
        burst(world, b.x, b.y, e.color, 4, 120, 0.3, 2.5);
        floater(world, e.x + rand(-8, 8), e.y - e.radius - 4, `${b.damage}`, '#ffffff');
        if (sfx) sfx.hit();
        b.pierce--;
        if (b.pierce < 0) break;
      }
    }
  }
  world.bullets = world.bullets.filter((b) => b.pierce >= 0);

  // --- remove dead enemies ---
  const dead = world.enemies.filter((e) => e.hp <= 0);
  for (const e of dead) killEnemy(world, e, sfx);
  world.enemies = world.enemies.filter((e) => e.hp > 0);

  // --- enemy vs player ---
  for (const e of world.enemies) {
    const rr = e.radius + PLAYER.radius - 2;
    if (dist2(e.x, e.y, p.x, p.y) < rr * rr) {
      damagePlayer(world, e.damage, sfx);
      // Push the enemy back a little so one touch is not a grind.
      const d = Math.hypot(p.x - e.x, p.y - e.y) || 1;
      e.x -= ((p.x - e.x) / d) * 26;
      e.y -= ((p.y - e.y) / d) * 26;
      if (world.phase !== 'playing') break;
    }
  }

  // --- enemy bullets vs player ---
  if (world.phase === 'playing') {
    for (const b of world.enemyBullets) {
      const rr = b.radius + PLAYER.radius - 2;
      if (dist2(b.x, b.y, p.x, p.y) < rr * rr) {
        b.life = 0;
        damagePlayer(world, b.damage, sfx);
        if (world.phase !== 'playing') break;
      }
    }
    world.enemyBullets = world.enemyBullets.filter((b) => b.life > 0);
  }

  // --- pearls ---
  const magnetR = PLAYER.magnetRadius * p.magnetMul;
  for (const pd of world.pearlDrops) {
    pd.life -= dt;
    const d2 = dist2(pd.x, pd.y, p.x, p.y);
    if (d2 < magnetR * magnetR) {
      const d = Math.sqrt(d2) || 1;
      const pull = 900 * (1 - d / magnetR) + 240;
      pd.vx += ((p.x - pd.x) / d) * pull * dt * 4;
      pd.vy += ((p.y - pd.y) / d) * pull * dt * 4;
    }
    pd.vx *= 0.94; pd.vy *= 0.94;
    pd.x += pd.vx * dt; pd.y += pd.vy * dt;
    if (d2 < 26 * 26) {
      pd.life = 0;
      world.pearls += pd.value;
      world.score += 25 * pd.value;
      if (sfx) sfx.pearl();
    }
  }
  world.pearlDrops = world.pearlDrops.filter((pd) => pd.life > 0);

  // --- wave clear ---
  if (world.waveActive && !world.spawnQueue.length && !world.enemies.length && world.phase === 'playing') {
    world.waveActive = false;
    offerUpgrades(world);
  }
}
