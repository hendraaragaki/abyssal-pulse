// Abyssal Pulse — boot + game loop. Fixed 1/60s steps, Node-free in browser.
// ?shot=start|play|boss|end renders one staged scene and sets __shotReady.

import { VIEW } from './config.js';
import { createWorld, startGame, updateWorld, applyUpgrade } from './world.js';
import { render } from './render.js';
import { Input } from './input.js';
import { Sfx } from './audio.js';
import { stageShot } from './shots.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
canvas.width = VIEW.w;
canvas.height = VIEW.h;

const input = new Input(canvas);
const sfx = new Sfx();
const world = createWorld();

const BEST_KEY = 'abyssal-pulse-best';
try { world.best = Number(localStorage.getItem(BEST_KEY) || 0) || 0; } catch (e) { /* no storage */ }
function saveBest() {
  try { localStorage.setItem(BEST_KEY, String(world.best)); } catch (e) { /* no storage */ }
}

const params = new URLSearchParams(location.search);
const shot = params.get('shot');
const DT = 1 / 60;

// Debug/test handle (used by the headless soak test; harmless in play).
window.__abyssal = world;

function handlePhaseInput() {
  if (input.pressed('m', 'M')) sfx.toggleMute();
  if (world.phase === 'title') {
    if (input.pressed('Enter') || input.mousePressed) {
      sfx.ensure();
      startGame(world, sfx);
    }
  } else if (world.phase === 'playing') {
    if (input.pressed('p', 'P', 'Escape')) world.paused = !world.paused;
  } else if (world.phase === 'upgrade') {
    const choices = world.upgradeChoices;
    for (let i = 0; i < choices.length; i++) {
      if (input.pressed(String(i + 1))) { applyUpgrade(world, choices[i].id, sfx); return; }
    }
    if (input.mousePressed) {
      for (const card of world.uiCards) {
        if (input.mouse.x >= card.x && input.mouse.x <= card.x + card.w &&
            input.mouse.y >= card.y && input.mouse.y <= card.y + card.h) {
          applyUpgrade(world, card.id, sfx);
          return;
        }
      }
    }
  } else if (world.phase === 'gameover') {
    if (input.pressed('Enter') || input.mousePressed) {
      saveBest();
      sfx.ensure();
      startGame(world, sfx);
    }
  }
}

if (shot) {
  stageShot(world, shot);
  // Settle particles a touch so the frame is alive, not frozen.
  for (let i = 0; i < 12; i++) updateWorld(world, input, DT, null);
  render(ctx, world);
  window.__shotReady = true;
} else {
  let acc = 0;
  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    let dt = (now - last) / 1000;
    last = now;
    if (dt > 0.25) dt = 0.25;
    acc += dt;
    handlePhaseInput();
    while (acc >= DT) {
      if (!world.paused) updateWorld(world, input, DT, sfx);
      else { world.time += DT; }
      acc -= DT;
    }
    if (world.phase === 'gameover') saveBest();
    render(ctx, world);
    input.endFrame();
  }
  requestAnimationFrame(frame);
}
