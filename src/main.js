import { PHASE, STATE, GAME_WIDTH, GAME_HEIGHT } from './constants.js';
import { SoundEngine } from './audio.js';
import { createSpriteAtlas } from './sprites.js';
import { PixiRenderer } from './pixi-renderer.js';
import { LevelEditor } from './editor.js';
import { Game } from './game.js';

const mountEl = document.getElementById('pixi-mount');
const canvasWrap = document.getElementById('canvas-wrap');
const crtOverlay = document.getElementById('crt-overlay');
const phasePill = document.getElementById('phase-pill');
const editorRoot = document.getElementById('editor-ui');

const sound = new SoundEngine();
const atlas = createSpriteAtlas();
const renderer = new PixiRenderer(mountEl, atlas);

function syncPhaseUI(phase) {
  const isLunar = phase === PHASE.LUNAR;
  canvasWrap.classList.toggle('phase-lunar', isLunar);
  canvasWrap.classList.toggle('phase-solar', !isLunar);
  phasePill.className = `badge ${isLunar ? 'lunar' : 'solar'}`;
  phasePill.textContent = isLunar ? 'PIXI v8 • LUNAR' : 'PIXI v8 • SOLAR';
}

const game = new Game(atlas, sound, syncPhaseUI, (strength) => {
  const nx = game.player ? (game.player.cx - game.camera.x) / GAME_WIDTH : 0.5;
  const ny = game.player ? (game.player.cy - game.camera.y) / GAME_HEIGHT : 0.5;
  renderer.triggerShockwave(strength, nx, ny);
});

const keys = new Set();
const justPressed = new Set();
const PREVENT_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space', 'F2', 'F3']);

window.addEventListener('keydown', (e) => {
  sound.unlock();
  if (PREVENT_KEYS.has(e.code)) e.preventDefault();
  if (!keys.has(e.code)) justPressed.add(e.code);
  keys.add(e.code);

  if (e.code === 'KeyM') sound.toggleMute();
  else if (e.code === 'KeyV') crtOverlay.classList.toggle('crt-on');
  else if (e.code === 'KeyG') {
    renderer.filtersEnabled = !renderer.filtersEnabled;
    game.particles.spawnText(game.player.cx, game.player.y - 8, renderer.filtersEnabled ? 'PIXI FILTER ON' : 'PIXI FILTER OFF', '#7eeeff');
  } else if (e.code === 'KeyT') {
    game.ghost.enabled = !game.ghost.enabled;
    game.particles.spawnText(game.player.cx, game.player.y - 8, game.ghost.enabled ? 'GHOST ON' : 'GHOST OFF', '#4af7c8');
  } else if (e.code === 'F2' && game.editor) {
    if (game.state === STATE.TITLE) game.loadStage(0, true);
    game.editor.toggle();
  } else if (e.code === 'F3') {
    game.showDebug = !game.showDebug;
  }
});

window.addEventListener('keyup', (e) => keys.delete(e.code));
window.addEventListener('blur', () => keys.clear());

// Mobile Virtual Gamepad
const touchRoot = document.getElementById('touch-controls');
const touchToggleBtn = document.getElementById('touch-toggle-btn');
const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
if (touchRoot && isTouchDevice) touchRoot.classList.add('visible');
if (touchToggleBtn && touchRoot) {
  touchToggleBtn.addEventListener('click', () => {
    touchRoot.classList.toggle('visible');
    renderer.resize();
  });
}
if (touchRoot) {
  const activePointers = new Map();
  const releasePointer = (pid) => {
    const entry = activePointers.get(pid);
    if (!entry) return;
    activePointers.delete(pid);
    entry.btn.classList.remove('pressed');
    let stillHeld = false;
    for (const v of activePointers.values()) if (v.code === entry.code) stillHeld = true;
    if (!stillHeld) keys.delete(entry.code);
  };
  touchRoot.querySelectorAll('.tbtn[data-key]').forEach((btn) => {
    const code = btn.dataset.key;
    btn.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      sound.unlock();
      btn.setPointerCapture(e.pointerId);
      activePointers.set(e.pointerId, { code, btn });
      if (!keys.has(code)) justPressed.add(code);
      keys.add(code);
      btn.classList.add('pressed');
    });
    btn.addEventListener('pointerup', (e) => { e.preventDefault(); releasePointer(e.pointerId); });
    btn.addEventListener('pointercancel', (e) => releasePointer(e.pointerId));
  });
}

let prevPadButtons = [];
function readInput() {
  const anyDown = (...codes) => codes.some((c) => keys.has(c));
  const anyPressed = (...codes) => codes.some((c) => justPressed.has(c));
  const input = {
    left: anyDown('ArrowLeft', 'KeyA'),
    right: anyDown('ArrowRight', 'KeyD'),
    up: anyDown('ArrowUp', 'KeyW'),
    down: anyDown('ArrowDown', 'KeyS'),
    downPressed: anyPressed('ArrowDown', 'KeyS'),
    jump: anyDown('Space', 'KeyZ', 'KeyW', 'ArrowUp'),
    jumpPressed: anyPressed('Space', 'KeyZ', 'KeyW', 'ArrowUp'),
    dashPressed: anyPressed('KeyX', 'KeyJ'),
    phasePressed: anyPressed('ShiftLeft', 'ShiftRight', 'KeyK', 'KeyE'),
    startPressed: anyPressed('Enter'),
    pausePressed: anyPressed('Escape', 'KeyP'),
    restartPressed: anyPressed('KeyR'),
    stage1: anyPressed('Digit1'),
    stage2: anyPressed('Digit2'),
    stage3: anyPressed('Digit3'),
    stage4: anyPressed('Digit4'),
    stage5: anyPressed('Digit5'),
    stage6: anyPressed('Digit6'),
  };
  const pads = navigator.getGamepads ? navigator.getGamepads() : [];
  const gp = pads[0];
  if (gp) {
    const btn = (i) => Boolean(gp.buttons[i] && gp.buttons[i].pressed);
    const btnPressed = (i) => btn(i) && !prevPadButtons[i];
    if (gp.axes[0] < -0.35 || btn(14)) input.left = true;
    if (gp.axes[0] > 0.35 || btn(15)) input.right = true;
    if (btn(0)) input.jump = true;
    if (btnPressed(0)) input.jumpPressed = true;
    if (btnPressed(2) || btnPressed(1)) input.dashPressed = true;
    if (btnPressed(3) || btnPressed(4) || btnPressed(5)) input.phasePressed = true;
    if (btnPressed(9)) input.startPressed = true;
    prevPadButtons = gp.buttons.map((b) => Boolean(b.pressed));
  }
  justPressed.clear();
  return input;
}

async function boot() {
  await renderer.init();
  window.addEventListener('resize', () => renderer.resize());
  renderer.canvas.addEventListener('pointerdown', () => sound.unlock());

  const editor = new LevelEditor(renderer.canvas, game, editorRoot);
  game.editor = editor;

  const STEP = 1 / 60;
  let acc = 0;
  let last = performance.now();
  let frames = 0;
  let fpsTimer = 0;

  function loop(now) {
    const rawDt = Math.min(0.05, (now - last) / 1000);
    last = now;
    frames++;
    fpsTimer += rawDt;
    if (fpsTimer >= 0.5) {
      game.fps = Math.round(frames / fpsTimer);
      frames = 0;
      fpsTimer = 0;
    }
    acc += rawDt;
    while (acc >= STEP) {
      game.update(STEP, readInput());
      renderer.updateEffects(STEP, game.phase === PHASE.LUNAR);
      acc -= STEP;
    }
    renderer.render(game);
    requestAnimationFrame(loop);
  }
  requestAnimationFrame(loop);
}

boot();
