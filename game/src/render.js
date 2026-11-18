// Abyssal Pulse — all drawing. Canvas 2D only, no images, no network.
// Reads the world; never mutates it except for uiCards (upgrade hit rects).

import { VIEW, COLORS, PLAYER, UPGRADES } from './config.js';
import { mulberry32, clamp } from './random.js';

const rng = mulberry32(1337);
const ROCKS = [];
for (let i = 0; i <= 24; i++) ROCKS.push({ x: (i / 24) * VIEW.w, h: 40 + rng() * 90 });
const KELP = [];
for (let i = 0; i < 14; i++) KELP.push({ x: rng() * VIEW.w, h: 90 + rng() * 170, ph: rng() * Math.PI * 2, hue: rng() });
const PLANKTON = [];
for (let i = 0; i < 90; i++) PLANKTON.push({ x: rng() * VIEW.w, y: rng() * VIEW.h, s: 1 + rng() * 2.2, ph: rng() * Math.PI * 2 });

function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function glowCircle(ctx, x, y, r, color, glow) {
  ctx.save();
  ctx.shadowColor = glow;
  ctx.shadowBlur = 18;
  ctx.fillStyle = color;
  ctx.beginPath(); ctx.arc(x, y, r, 0, Math.PI * 2); ctx.fill();
  ctx.restore();
}

function drawBackground(ctx, world) {
  const g = ctx.createLinearGradient(0, 0, 0, VIEW.h);
  g.addColorStop(0, COLORS.bgTop);
  g.addColorStop(0.55, COLORS.bgMid);
  g.addColorStop(1, COLORS.bgBottom);
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);

  // God rays from the surface.
  ctx.save();
  ctx.globalAlpha = 0.5;
  for (let i = 0; i < 5; i++) {
    const sway = Math.sin(world.time * 0.12 + i * 1.7) * 40;
    const x = 140 + i * 260 + sway;
    ctx.fillStyle = COLORS.ray;
    ctx.beginPath();
    ctx.moveTo(x, 0); ctx.lineTo(x + 70, 0);
    ctx.lineTo(x + 170, VIEW.h); ctx.lineTo(x + 40, VIEW.h);
    ctx.closePath(); ctx.fill();
  }
  ctx.restore();

  // Parallax drift follows the player slightly.
  const px = world.player ? (world.player.x - VIEW.w / 2) * -0.02 : 0;
  const py = world.player ? (world.player.y - VIEW.h / 2) * -0.015 : 0;

  // Rock ridge (far).
  ctx.save();
  ctx.translate(px, py);
  ctx.fillStyle = '#082238';
  ctx.beginPath();
  ctx.moveTo(-20, VIEW.h);
  for (const r of ROCKS) ctx.lineTo(r.x, VIEW.h - r.h);
  ctx.lineTo(VIEW.w + 20, VIEW.h);
  ctx.closePath(); ctx.fill();
  ctx.restore();

  // Kelp (mid).
  ctx.save();
  ctx.translate(px * 1.6, py * 1.6);
  ctx.strokeStyle = 'rgba(28, 130, 110, 0.55)';
  ctx.lineWidth = 5;
  ctx.lineCap = 'round';
  for (const k of KELP) {
    const sway = Math.sin(world.time * 0.7 + k.ph) * 16;
    ctx.beginPath();
    ctx.moveTo(k.x, VIEW.h);
    ctx.quadraticCurveTo(k.x + sway, VIEW.h - k.h * 0.6, k.x + sway * 1.6, VIEW.h - k.h);
    ctx.stroke();
  }
  ctx.restore();

  // Plankton (near).
  ctx.save();
  for (const pt of PLANKTON) {
    const a = 0.25 + 0.35 * (0.5 + 0.5 * Math.sin(world.time * 1.3 + pt.ph));
    ctx.fillStyle = `rgba(170, 225, 255, ${a.toFixed(3)})`;
    ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.s, 0, Math.PI * 2); ctx.fill();
  }
  ctx.restore();
}

function drawPearls(ctx, world) {
  for (const pd of world.pearlDrops) {
    const tw = 0.7 + 0.3 * Math.sin(world.time * 6 + pd.x);
    ctx.save();
    ctx.globalAlpha = clamp(tw, 0, 1);
    ctx.shadowColor = '#ffd76a'; ctx.shadowBlur = 10;
    ctx.fillStyle = COLORS.pearl;
    ctx.beginPath();
    ctx.moveTo(pd.x, pd.y - 6); ctx.lineTo(pd.x + 5, pd.y);
    ctx.lineTo(pd.x, pd.y + 6); ctx.lineTo(pd.x - 5, pd.y);
    ctx.closePath(); ctx.fill();
    ctx.restore();
  }
}

function drawEnemy(ctx, e, world) {
  ctx.save();
  ctx.translate(e.x, e.y);
  const flash = e.flash > 0.4;
  const body = flash ? '#ffffff' : e.color;
  ctx.shadowColor = e.glow; ctx.shadowBlur = 16;
  if (e.type === 'mite') {
    // Spiky little hunter.
    ctx.fillStyle = body;
    ctx.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2 + world.time * 2;
      const r = i % 2 === 0 ? e.radius + 5 : e.radius - 2;
      const x = Math.cos(a) * r, y = Math.sin(a) * r;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#1a0a12';
    ctx.beginPath(); ctx.arc(3, -2, 3, 0, Math.PI * 2); ctx.arc(-4, 3, 3, 0, Math.PI * 2); ctx.fill();
  } else if (e.type === 'spitter') {
    ctx.fillStyle = body;
    ctx.beginPath(); ctx.arc(0, 0, e.radius, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    // Mouth barrel toward the player.
    const p = world.player;
    if (p) {
      const a = Math.atan2(p.y - e.y, p.x - e.x);
      ctx.strokeStyle = '#3a2405'; ctx.lineWidth = 7; ctx.lineCap = 'round';
      ctx.beginPath(); ctx.moveTo(0, 0);
      ctx.lineTo(Math.cos(a) * (e.radius + 8), Math.sin(a) * (e.radius + 8)); ctx.stroke();
    }
    ctx.fillStyle = '#2a1a05';
    ctx.beginPath(); ctx.arc(0, 0, e.radius * 0.45, 0, Math.PI * 2); ctx.fill();
  } else if (e.type === 'splitter') {
    ctx.fillStyle = body;
    ctx.beginPath(); ctx.arc(-7, 0, e.radius * 0.62, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(7, 0, e.radius * 0.62, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(10, 40, 16, 0.8)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(-7, 0, e.radius * 0.62, 0, Math.PI * 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(7, 0, e.radius * 0.62, 0, Math.PI * 2); ctx.stroke();
  } else if (e.type === 'bulwark') {
    ctx.fillStyle = body;
    ctx.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * Math.PI * 2 + Math.PI / 6;
      const x = Math.cos(a) * e.radius, y = Math.sin(a) * e.radius;
      if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
    }
    ctx.closePath(); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.strokeStyle = 'rgba(30, 10, 50, 0.85)'; ctx.lineWidth = 3;
    ctx.beginPath(); ctx.arc(0, 0, e.radius * 0.55, 0, Math.PI * 2); ctx.stroke();
    ctx.fillStyle = '#1c0a33';
    ctx.beginPath(); ctx.arc(0, 0, 5, 0, Math.PI * 2); ctx.fill();
  } else if (e.type === 'leviathan') {
    // The boss: big jawed maw, spines, glowing eyes.
    const windup = e.chargeState === 'windup';
    ctx.fillStyle = windup ? '#ffffff' : body;
    ctx.beginPath(); ctx.arc(0, 0, e.radius, 0, Math.PI * 2); ctx.fill();
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#2a0202';
    ctx.beginPath();
    ctx.moveTo(-e.radius * 0.55, -e.radius * 0.25);
    ctx.quadraticCurveTo(0, e.radius * 0.55, e.radius * 0.55, -e.radius * 0.25);
    ctx.quadraticCurveTo(0, e.radius * 0.15, -e.radius * 0.55, -e.radius * 0.25);
    ctx.fill();
    // Teeth.
    ctx.fillStyle = '#fff';
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath();
      ctx.moveTo(i * 12 - 4, 4); ctx.lineTo(i * 12 + 4, 4); ctx.lineTo(i * 12, 14);
      ctx.closePath(); ctx.fill();
    }
    // Eyes.
    ctx.fillStyle = '#ffe9a8';
    ctx.beginPath(); ctx.arc(-20, -24, 7, 0, Math.PI * 2); ctx.arc(20, -24, 7, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#200000';
    ctx.beginPath(); ctx.arc(-20, -24, 3, 0, Math.PI * 2); ctx.arc(20, -24, 3, 0, Math.PI * 2); ctx.fill();
    // Spines.
    ctx.strokeStyle = e.glow; ctx.lineWidth = 4; ctx.lineCap = 'round';
    for (let i = -2; i <= 2; i++) {
      ctx.beginPath(); ctx.moveTo(i * 22, -e.radius + 6); ctx.lineTo(i * 26, -e.radius - 12); ctx.stroke();
    }
  }
  ctx.restore();

  // HP bar for tough enemies.
  if (e.maxHp >= 130 && e.hp < e.maxHp) {
    const w = e.radius * 2;
    ctx.fillStyle = 'rgba(0,0,0,0.55)';
    ctx.fillRect(e.x - w / 2, e.y - e.radius - 12, w, 5);
    ctx.fillStyle = '#ff5d5d';
    ctx.fillRect(e.x - w / 2, e.y - e.radius - 12, w * (e.hp / e.maxHp), 5);
  }
}

function drawPlayer(ctx, world) {
  const p = world.player;
  if (!p) return;
  ctx.save();
  ctx.translate(p.x, p.y);
  if (p.invuln > 0 && Math.floor(world.time * 14) % 2 === 0) ctx.globalAlpha = 0.45;
  // Lantern light cone toward the aim.
  ctx.save();
  ctx.rotate(p.angle);
  const lg = ctx.createLinearGradient(0, 0, 190, 0);
  lg.addColorStop(0, 'rgba(94, 242, 255, 0.20)');
  lg.addColorStop(1, 'rgba(94, 242, 255, 0)');
  ctx.fillStyle = lg;
  ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(190, -34); ctx.lineTo(190, 34); ctx.closePath(); ctx.fill();
  ctx.restore();
  // Body: little drone with fins.
  ctx.shadowColor = COLORS.playerGlow; ctx.shadowBlur = 20;
  ctx.fillStyle = COLORS.player;
  ctx.beginPath(); ctx.arc(0, 0, p.radius, 0, Math.PI * 2); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#062a3a';
  ctx.beginPath(); ctx.arc(0, 0, p.radius * 0.55, 0, Math.PI * 2); ctx.fill();
  // Eye toward aim.
  ctx.save();
  ctx.rotate(p.angle);
  ctx.fillStyle = '#eafcff';
  ctx.beginPath(); ctx.arc(6, 0, 4.5, 0, Math.PI * 2); ctx.fill();
  ctx.fillStyle = '#062a3a';
  ctx.beginPath(); ctx.arc(7.5, 0, 2, 0, Math.PI * 2); ctx.fill();
  // Fins.
  ctx.fillStyle = COLORS.player;
  ctx.beginPath(); ctx.moveTo(-6, -10); ctx.lineTo(-16, -16); ctx.lineTo(-10, -4); ctx.closePath(); ctx.fill();
  ctx.beginPath(); ctx.moveTo(-6, 10); ctx.lineTo(-16, 16); ctx.lineTo(-10, 4); ctx.closePath(); ctx.fill();
  ctx.restore();
  // Dash ring.
  if (p.dashTimer > 0) {
    ctx.strokeStyle = 'rgba(94, 242, 255, 0.8)';
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(0, 0, p.radius + 8, 0, Math.PI * 2); ctx.stroke();
  }
  ctx.restore();
}

function drawHud(ctx, world) {
  const p = world.player;
  ctx.save();
  ctx.textBaseline = 'alphabetic';
  // Top-left: HP, score, wave, pearls.
  ctx.fillStyle = 'rgba(3, 16, 31, 0.6)';
  roundRect(ctx, 16, 14, 300, 86, 10); ctx.fill();
  ctx.fillStyle = COLORS.text;
  ctx.font = 'bold 20px system-ui, sans-serif';
  ctx.fillText(`SKOR  ${world.score.toLocaleString('en-US')}`, 30, 42);
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillStyle = COLORS.textDim;
  ctx.fillText(`Gelombang ${Math.max(1, world.wave)}   •   Mutiara ${world.pearls}   •   Bunuh ${world.kills}`, 30, 66);
  // HP bar.
  ctx.fillStyle = 'rgba(0,0,0,0.6)';
  roundRect(ctx, 30, 76, 200, 12, 6); ctx.fill();
  const hpFrac = p ? clamp(p.hp / p.maxHp, 0, 1) : 0;
  ctx.fillStyle = hpFrac > 0.5 ? '#37d67a' : hpFrac > 0.25 ? '#ffb020' : '#ff5d5d';
  if (hpFrac > 0) { roundRect(ctx, 30, 76, 200 * hpFrac, 12, 6); ctx.fill(); }
  ctx.fillStyle = COLORS.text;
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText(p ? `${Math.ceil(p.hp)} / ${p.maxHp} HP` : '', 238, 87);

  // Dash cooldown pip, bottom-left.
  if (p) {
    const ready = p.dashCooldown <= 0;
    ctx.fillStyle = 'rgba(3, 16, 31, 0.6)';
    roundRect(ctx, 16, VIEW.h - 52, 210, 36, 10); ctx.fill();
    ctx.fillStyle = ready ? '#5ef2ff' : '#5a7d90';
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.fillText(ready ? 'DASH siap  [Spasi]' : `Dash … ${p.dashCooldown.toFixed(1)} dtk`, 30, VIEW.h - 29);
  }
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '12px system-ui, sans-serif';
  ctx.fillText('WASD gerak  •  mouse bidik  •  tahan klik tembak  •  P jeda  •  M suara', 16, VIEW.h - 62);

  // Boss bar.
  if (world.boss) {
    const b = world.boss;
    ctx.fillStyle = 'rgba(3, 16, 31, 0.7)';
    roundRect(ctx, VIEW.w / 2 - 260, 16, 520, 30, 8); ctx.fill();
    ctx.fillStyle = '#ff4040';
    roundRect(ctx, VIEW.w / 2 - 250, 24, 500 * clamp(b.hp / b.maxHp, 0, 1), 14, 7); ctx.fill();
    ctx.fillStyle = '#fff';
    ctx.font = 'bold 13px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('LEVIATHAN', VIEW.w / 2, 35);
    ctx.textAlign = 'left';
  }

  // Radar, bottom-right.
  const cx = VIEW.w - 86, cy = VIEW.h - 86, R = 62;
  ctx.fillStyle = 'rgba(3, 16, 31, 0.6)';
  ctx.beginPath(); ctx.arc(cx, cy, R + 6, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = 'rgba(94, 242, 255, 0.5)';
  ctx.lineWidth = 1.5;
  ctx.beginPath(); ctx.arc(cx, cy, R, 0, Math.PI * 2); ctx.stroke();
  const scale = R / 700;
  if (p) {
    for (const e of world.enemies) {
      const dx = (e.x - p.x) * scale, dy = (e.y - p.y) * scale;
      const len = Math.hypot(dx, dy);
      const cl = len > R - 4 ? (R - 4) / len : 1;
      ctx.fillStyle = e.color;
      ctx.beginPath(); ctx.arc(cx + dx * cl, cy + dy * cl, e.type === 'leviathan' ? 5 : 3, 0, Math.PI * 2); ctx.fill();
    }
    ctx.fillStyle = '#5ef2ff';
    ctx.beginPath(); ctx.arc(cx, cy, 4, 0, Math.PI * 2); ctx.fill();
  }
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '11px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('RADAR', cx, cy + R + 18);
  ctx.textAlign = 'left';

  // Wave banner.
  if (world.waveBanner > 0) {
    const a = clamp(world.waveBanner / 0.6, 0, 1);
    ctx.save();
    ctx.globalAlpha = a;
    ctx.fillStyle = '#eafcff';
    ctx.font = 'bold 54px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.shadowColor = '#19c8ff'; ctx.shadowBlur = 26;
    ctx.fillText(world.wave % 5 === 0 ? `GELOMBANG ${world.wave} — LEVIATHAN` : `GELOMBANG ${world.wave}`, VIEW.w / 2, 200);
    ctx.restore();
    ctx.textAlign = 'left';
  }
  ctx.restore();
}

function drawTitle(ctx, world) {
  ctx.save();
  ctx.fillStyle = 'rgba(2, 10, 22, 0.55)';
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#eafcff';
  ctx.shadowColor = '#19c8ff'; ctx.shadowBlur = 30;
  ctx.font = 'bold 76px system-ui, sans-serif';
  ctx.fillText('ABYSSAL PULSE', VIEW.w / 2, 210);
  ctx.shadowBlur = 0;
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '20px system-ui, sans-serif';
  ctx.fillText('Penjaga lentera terakhir di palung yang tak pernah tidur.', VIEW.w / 2, 252);
  ctx.fillStyle = COLORS.text;
  ctx.font = '17px system-ui, sans-serif';
  ctx.fillText('WASD / panah — bergerak      Mouse — membidik      Tahan klik — menembak', VIEW.w / 2, 330);
  ctx.fillText('Spasi — dash      P — jeda      M — suara', VIEW.w / 2, 360);
  ctx.fillStyle = '#ffe9a8';
  ctx.font = '16px system-ui, sans-serif';
  ctx.fillText('Bertahanlah dari gelombang demi gelombang. Kalahkan Leviathan tiap 5 gelombang.', VIEW.w / 2, 402);
  const pulse = 0.65 + 0.35 * Math.sin(world.time * 3);
  ctx.globalAlpha = pulse;
  ctx.fillStyle = '#5ef2ff';
  ctx.font = 'bold 24px system-ui, sans-serif';
  ctx.fillText('Klik atau tekan Enter untuk mulai', VIEW.w / 2, 470);
  ctx.globalAlpha = 1;
  if (world.best > 0) {
    ctx.fillStyle = COLORS.textDim;
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillText(`Skor terbaik: ${world.best.toLocaleString('en-US')}`, VIEW.w / 2, 510);
  }
  ctx.restore();
  ctx.textAlign = 'left';
}

function drawUpgrade(ctx, world) {
  ctx.save();
  ctx.fillStyle = 'rgba(2, 10, 22, 0.62)';
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#eafcff';
  ctx.font = 'bold 40px system-ui, sans-serif';
  ctx.fillText(`Gelombang ${world.wave} bersih!`, VIEW.w / 2, 150);
  ctx.fillStyle = COLORS.textDim;
  ctx.font = '18px system-ui, sans-serif';
  ctx.fillText('Pilih satu peningkatan — klik kartunya atau tekan 1 / 2 / 3', VIEW.w / 2, 188);
  const cards = world.upgradeChoices;
  const cw = 300, ch = 190, gap = 28;
  const total = cards.length * cw + (cards.length - 1) * gap;
  const x0 = (VIEW.w - total) / 2;
  const y0 = 250;
  world.uiCards = [];
  cards.forEach((u, i) => {
    const x = x0 + i * (cw + gap);
    const lvl = world.taken[u.id] || 0;
    const up = UPGRADES.find((o) => o.id === u.id);
    ctx.fillStyle = COLORS.card;
    roundRect(ctx, x, y0, cw, ch, 14); ctx.fill();
    ctx.strokeStyle = COLORS.cardBorder;
    ctx.lineWidth = 2;
    roundRect(ctx, x, y0, cw, ch, 14); ctx.stroke();
    ctx.fillStyle = '#5ef2ff';
    ctx.font = 'bold 15px system-ui, sans-serif';
    ctx.fillText(`[${i + 1}]`, x + cw / 2, y0 + 34);
    ctx.fillStyle = '#eafcff';
    ctx.font = 'bold 22px system-ui, sans-serif';
    ctx.fillText(u.name, x + cw / 2, y0 + 72);
    ctx.fillStyle = COLORS.textDim;
    ctx.font = '16px system-ui, sans-serif';
    ctx.fillText(u.desc, x + cw / 2, y0 + 108);
    ctx.fillStyle = '#ffe9a8';
    ctx.font = '14px system-ui, sans-serif';
    ctx.fillText(`Level ${lvl + 1} / ${up.max}`, x + cw / 2, y0 + 148);
    world.uiCards.push({ x, y: y0, w: cw, h: ch, id: u.id });
  });
  ctx.restore();
  ctx.textAlign = 'left';
}

function drawGameOver(ctx, world) {
  ctx.save();
  ctx.fillStyle = 'rgba(10, 2, 8, 0.6)';
  ctx.fillRect(0, 0, VIEW.w, VIEW.h);
  ctx.textAlign = 'center';
  ctx.fillStyle = '#ff8a8a';
  ctx.font = 'bold 64px system-ui, sans-serif';
  ctx.fillText('CAHAYA PADAM', VIEW.w / 2, 230);
  ctx.fillStyle = COLORS.text;
  ctx.font = '22px system-ui, sans-serif';
  ctx.fillText(`Skor  ${world.score.toLocaleString('en-US')}      •      Gelombang ${world.wave}      •      ${world.kills} musuh dikalahkan`, VIEW.w / 2, 300);
  ctx.fillStyle = '#ffe9a8';
  ctx.font = '18px system-ui, sans-serif';
  ctx.fillText(`Skor terbaik: ${world.best.toLocaleString('en-US')}`, VIEW.w / 2, 340);
  const pulse = 0.65 + 0.35 * Math.sin(world.time * 3);
  ctx.globalAlpha = pulse;
  ctx.fillStyle = '#5ef2ff';
  ctx.font = 'bold 22px system-ui, sans-serif';
  ctx.fillText('Tekan Enter atau klik untuk bermain lagi', VIEW.w / 2, 420);
  ctx.restore();
  ctx.textAlign = 'left';
}

export function render(ctx, world) {
  ctx.save();
  if (world.shake > 0.2) {
    ctx.translate((Math.random() - 0.5) * world.shake, (Math.random() - 0.5) * world.shake);
  }
  drawBackground(ctx, world);
  drawPearls(ctx, world);
  for (const e of world.enemies) drawEnemy(ctx, e, world);
  // Bullets.
  for (const b of world.bullets) {
    ctx.save();
    ctx.shadowColor = '#aef6ff'; ctx.shadowBlur = 10;
    ctx.strokeStyle = COLORS.bullet; ctx.lineWidth = 3.5; ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.moveTo(b.x - b.vx * 0.02, b.y - b.vy * 0.02);
    ctx.lineTo(b.x, b.y);
    ctx.stroke();
    ctx.restore();
  }
  // Enemy orbs.
  for (const b of world.enemyBullets) {
    glowCircle(ctx, b.x, b.y, b.radius, '#ff7a3c', '#ff4400');
  }
  // Particles.
  for (const pt of world.particles) {
    const a = clamp(pt.life / pt.maxLife, 0, 1);
    if (pt.type === 'bubble') {
      ctx.strokeStyle = pt.color;
      ctx.globalAlpha = a * 0.8;
      ctx.lineWidth = 1.2;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size, 0, Math.PI * 2); ctx.stroke();
      ctx.globalAlpha = 1;
    } else {
      ctx.globalAlpha = a;
      ctx.fillStyle = pt.color;
      ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size * a + 0.5, 0, Math.PI * 2); ctx.fill();
      ctx.globalAlpha = 1;
    }
  }
  drawPlayer(ctx, world);
  // Floating texts.
  ctx.save();
  ctx.font = 'bold 15px system-ui, sans-serif';
  ctx.textAlign = 'center';
  for (const f of world.floaters) {
    ctx.globalAlpha = clamp(f.life / f.maxLife, 0, 1);
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.restore();
  ctx.textAlign = 'left';

  if (world.phase === 'playing' || world.phase === 'upgrade') drawHud(ctx, world);
  if (world.phase === 'title') drawTitle(ctx, world);
  if (world.phase === 'upgrade') drawUpgrade(ctx, world);
  if (world.phase === 'gameover') drawGameOver(ctx, world);
  if (world.paused && world.phase === 'playing') {
    ctx.save();
    ctx.fillStyle = 'rgba(2, 10, 22, 0.6)';
    ctx.fillRect(0, 0, VIEW.w, VIEW.h);
    ctx.fillStyle = '#eafcff';
    ctx.font = 'bold 48px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('JEDA', VIEW.w / 2, VIEW.h / 2);
    ctx.font = '18px system-ui, sans-serif';
    ctx.fillText('Tekan P untuk lanjut', VIEW.w / 2, VIEW.h / 2 + 40);
    ctx.restore();
    ctx.textAlign = 'left';
  }
  // Damage flash.
  if (world.flash > 0.02) {
    ctx.fillStyle = `rgba(255, 40, 40, ${(world.flash * 0.22).toFixed(3)})`;
    ctx.fillRect(0, 0, VIEW.w, VIEW.h);
  }
  ctx.restore();
}
