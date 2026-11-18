// Abyssal Pulse — tuning. One place for every number the game balances on.
// All original: a neon deep-sea arena shooter. No assets, no network.

export const VIEW = { w: 1280, h: 720 };

export const PLAYER = {
  radius: 14,
  accel: 2600,
  maxSpeed: 330,
  drag: 0.88, // velocity kept per fixed step (1/60s)
  hp: 100,
  fireInterval: 0.16,
  bulletSpeed: 660,
  bulletDamage: 12,
  bulletRadius: 4,
  bulletLife: 0.85,
  dashSpeed: 920,
  dashTime: 0.16,
  dashCooldown: 2.2,
  invulnTime: 0.7,
  magnetRadius: 110,
};

// Enemy types. hp/speed scale mildly with wave in world.js.
export const ENEMIES = {
  mite: {
    name: 'Mite', radius: 12, hp: 20, speed: 125, damage: 7, score: 50,
    pearls: 1, color: '#ff5d8f', glow: '#ff2e78', behavior: 'chase',
  },
  spitter: {
    name: 'Spitter', radius: 15, hp: 34, speed: 95, damage: 10, score: 100,
    pearls: 2, color: '#ffb020', glow: '#ff8c00', behavior: 'ranged',
    range: 280, shotInterval: 2.3, orbSpeed: 190, orbRadius: 6,
  },
  splitter: {
    name: 'Splitter', radius: 19, hp: 48, speed: 75, damage: 12, score: 150,
    pearls: 2, color: '#7CFF6B', glow: '#37d67a', behavior: 'chase',
    children: 2, childType: 'mite',
  },
  bulwark: {
    name: 'Bulwark', radius: 27, hp: 150, speed: 48, damage: 16, score: 250,
    pearls: 4, color: '#b78cff', glow: '#8a5cf6', behavior: 'chase',
  },
  leviathan: {
    name: 'Leviathan', radius: 62, hp: 1300, speed: 55, damage: 22, score: 2000,
    pearls: 20, color: '#ff4040', glow: '#ff2020', behavior: 'boss',
    radialCount: 12, radialInterval: 2.6, chargeInterval: 5.0, chargeSpeed: 520,
  },
};

export const WAVES = {
  budgetBase: 5,
  budgetPerWave: 4,
  spawnInterval: 0.75,
  cost: { mite: 1, spitter: 2, splitter: 3, bulwark: 4 },
  bossEvery: 5,
  hpScalePerWave: 0.09, // +9% enemy hp per wave
  speedScalePerWave: 0.012, // +1.2% enemy speed per wave, capped in world.js
};

// Upgrade cards offered between waves. `max` = times it can be taken.
export const UPGRADES = [
  { id: 'damage', name: 'Taring Tajam', desc: '+25% damage peluru', max: 5 },
  { id: 'firerate', name: 'Pulsa Cepat', desc: '+20% kecepatan tembak', max: 5 },
  { id: 'multishot', name: 'Kipas Peluru', desc: '+1 peluru per tembakan', max: 3 },
  { id: 'speed', name: 'Sirip Gesit', desc: '+12% kecepatan gerak', max: 4 },
  { id: 'maxhp', name: 'Cangkang Tebal', desc: '+25 HP maks & pulih 25 HP', max: 5 },
  { id: 'dash', name: 'Arus Kilat', desc: '-25% cooldown dash', max: 3 },
  { id: 'pierce', name: 'Tembus Karang', desc: 'Peluru menembus +1 musuh', max: 3 },
  { id: 'magnet', name: 'Pesona Mutiara', desc: '+60% jangkauan tarik mutiara', max: 3 },
  { id: 'bulletspeed', name: 'Aliran Deras', desc: '+15% kecepatan peluru', max: 3 },
];

export const COLORS = {
  bgTop: '#04122b',
  bgMid: '#062a4d',
  bgBottom: '#03101f',
  ray: 'rgba(90, 200, 255, 0.05)',
  player: '#5ef2ff',
  playerGlow: '#19c8ff',
  bullet: '#bffbff',
  pearl: '#ffe9a8',
  text: '#dff6ff',
  textDim: '#8fb8cc',
  danger: '#ff5d5d',
  card: 'rgba(6, 38, 66, 0.92)',
  cardBorder: '#2f7ea8',
};
