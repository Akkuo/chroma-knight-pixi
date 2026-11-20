import { GAME_WIDTH, GAME_HEIGHT, PHASE, STATE, TILE, TILE_SIZE } from './constants.js';
import { Level, STAGE_DEFS } from './levels.js';
import { Player } from './player.js';
import { ParticleSystem } from './particles.js';
import { GhostSystem } from './ghost.js';
import {
  Coin,
  HeartPickup,
  DashCrystal,
  Springboard,
  Checkpoint,
  MovingPlatform,
  UpdraftColumn,
  Firebar,
  BoostRing,
  SlimeEnemy,
  BeetleEnemy,
  WispEnemy,
  PrismGolemBoss,
} from './entities.js';

export class Game {
  constructor(atlas, sound, onPhaseChange, onAberration = null) {
    this.atlas = atlas;
    this.sound = sound;
    this.onPhaseChange = onPhaseChange;
    this.onAberration = onAberration;
    this.particles = new ParticleSystem();
    this.ghost = new GhostSystem();
    this.editor = null;

    this.state = STATE.TITLE;
    this.stageIndex = 0;
    this.phase = PHASE.SOLAR;
    this.time = 0;
    this.stageTime = 0;
    this.hitstop = 0;
    this.showDebug = false;
    this.fps = 60;

    this.score = 0;
    this.coins = 0;
    this.combo = 0;
    this.comboTimer = 0;

    this.camera = { x: 0, y: 0, shake: 0, shakeX: 0, shakeY: 0 };

    this.level = null;
    this.player = null;
    this.coinsList = [];
    this.hearts = [];
    this.dashCrystals = [];
    this.springs = [];
    this.checkpoints = [];
    this.platforms = [];
    this.updrafts = [];
    this.firebars = [];
    this.boostRings = [];
    this.enemies = [];
    this.projectiles = [];
    this.boss = null;
    this.input = {};

    // Load Stage 1 in background so title screen has a living world!
    this.loadStage(0, false);
  }

  loadStage(index, enterPlaying = true) {
    this.stageIndex = Math.max(0, Math.min(STAGE_DEFS.length - 1, index));
    const def = STAGE_DEFS[this.stageIndex];
    this.level = new Level(def);
    this.phase = def.startPhase;
    this.rebuildRuntimeFromLevel(true);

    if (this.onPhaseChange) this.onPhaseChange(this.phase);
    if (enterPlaying) {
      this.state = STATE.PLAYING;
      this.sound.setBgmMode(this.phase);
    }
  }

  rebuildRuntimeFromLevel(resetPlayer = true) {
    this.stageTime = 0;
    this.combo = 0;
    this.comboTimer = 0;
    this.hitstop = 0;

    if (resetPlayer || !this.player) {
      this.player = new Player(this.level.spawn.x, this.level.spawn.y);
      this.camera.x = Math.max(0, Math.min(this.level.widthPx - GAME_WIDTH, this.player.cx - GAME_WIDTH * 0.5));
      this.camera.y = 0;
    }
    this.coinsList = [];
    this.hearts = [];
    this.dashCrystals = [];
    this.springs = [];
    this.checkpoints = [];
    this.platforms = [];
    this.updrafts = [];
    this.firebars = [];
    this.boostRings = [];
    this.enemies = [];
    this.projectiles = [];
    this.boss = null;

    for (const sp of this.level.entitySpawns) {
      switch (sp.type) {
        case 'coin': this.coinsList.push(new Coin(sp.x, sp.y)); break;
        case 'heart': this.hearts.push(new HeartPickup(sp.x, sp.y)); break;
        case 'dash_crystal': this.dashCrystals.push(new DashCrystal(sp.x, sp.y)); break;
        case 'spring': this.springs.push(new Springboard(sp.x, sp.y)); break;
        case 'checkpoint': this.checkpoints.push(new Checkpoint(sp.x, sp.y)); break;
        case 'platform': this.platforms.push(new MovingPlatform(sp.x, sp.y, sp.w, sp.rangeX, sp.rangeY, sp.speed)); break;
        case 'updraft': this.updrafts.push(new UpdraftColumn(sp.x, sp.y, sp.h)); break;
        case 'firebar': this.firebars.push(new Firebar(sp.x, sp.y, sp.count, sp.speed)); break;
        case 'boost_ring': this.boostRings.push(new BoostRing(sp.x, sp.y, sp.dirX, sp.dirY)); break;
        case 'slime': this.enemies.push(new SlimeEnemy(sp.x, sp.y)); break;
        case 'beetle': this.enemies.push(new BeetleEnemy(sp.x, sp.y)); break;
        case 'wisp': this.enemies.push(new WispEnemy(sp.x, sp.y, sp.phase)); break;
        case 'boss': this.boss = new PrismGolemBoss(sp.x, sp.y); break;
      }
    }

    this.particles.clear();
    this.particles.initGrass(this.level);
    this.particles.initAmbient(this.level.widthPx, this.level.heightPx);
    this.camera.shake = 0;
    this.ghost.startStage(this.level.id);
  }

  respawnAtCheckpoint() {
    this.player.reset(this.player.respawnX, this.player.respawnY);
    this.projectiles.length = 0;
    this.combo = 0;
    this.state = STATE.PLAYING;
    this.sound.setBgmMode(this.boss && this.boss.active && this.boss.alive ? 'boss' : this.phase);
    this.particles.burst(this.player.cx, this.player.cy, 16, '#fff3a8', { speedMax: 110, glow: true });
  }

  addShake(amount) {
    this.camera.shake = Math.max(this.camera.shake, amount);
    if (amount >= 6 && this.onAberration) {
      this.onAberration(Math.min(1.2, amount * 0.09));
    }
  }

  addScore(pts, x, y, label) {
    this.score += pts;
    if (label) {
      this.particles.spawnText(x, y, label);
    }
  }

  togglePhase() {
    this.phase = this.phase === PHASE.SOLAR ? PHASE.LUNAR : PHASE.SOLAR;
    const isLunar = this.phase === PHASE.LUNAR;
    this.sound.playPhaseShift(isLunar);
    if (this.onAberration) this.onAberration(1.0);
    if (!this.boss || !this.boss.active || !this.boss.alive) {
      this.sound.setBgmMode(this.phase);
    }
    if (this.onPhaseChange) this.onPhaseChange(this.phase);

    if (this.player) {
      const col = isLunar ? '#4ae3ff' : '#ffbe44';
      this.particles.spawnRipple(this.player.cx, this.player.cy, col, 220);
      this.particles.burst(this.player.cx, this.player.cy, 14, col, { speedMax: 120, gravity: 0, glow: true });
      this.addShake(2.2);
      this.hitstop = 0.02;
      this._antiCrushPlayer();
    }
  }

  _antiCrushPlayer() {
    const p = this.player;
    const isOverlappingSolid = () => {
      const l = Math.floor(p.x / TILE_SIZE);
      const r = Math.floor((p.x + p.w - 0.01) / TILE_SIZE);
      const t = Math.floor(p.y / TILE_SIZE);
      const b = Math.floor((p.y + p.h - 0.01) / TILE_SIZE);
      for (let ty = t; ty <= b; ty++) {
        for (let tx = l; tx <= r; tx++) {
          if (this.level.isSolid(tx, ty, this.phase)) return true;
        }
      }
      return false;
    };
    if (!isOverlappingSolid()) return;
    // Try nudging upward first so player pops cleanly on top of a materialized phase block
    for (let dy = 1; dy <= 16; dy++) {
      p.y -= 1;
      if (!isOverlappingSolid()) {
        p.vy = Math.min(p.vy, -80);
        return;
      }
    }
    p.y += 16;
  }

  onBlockBump(tx, ty) {
    const t = this.level.getTile(tx, ty);
    const wx = tx * TILE_SIZE + 8;
    const wy = ty * TILE_SIZE + 8;

    if (t === TILE.QUESTION) {
      this.level.setTile(tx, ty, TILE.USED);
      this.level.bumpTile(tx, ty);
      this.coins += 1;
      this.sound.playCoin(this.combo + 1);
      this.addScore(100, wx, wy - 12, '+100');
      this.particles.burst(wx, wy - 8, 10, '#ffe066', { speedMax: 95, glow: true });
      // Every 5th coin from a ? block spawns a Heart if player is hurt!
      if (this.player.hp < this.player.maxHp && Math.random() < 0.45) {
        this.hearts.push(new HeartPickup(wx - 5, wy - 20));
      }
    } else if (t === TILE.BRICK) {
      this.level.setTile(tx, ty, TILE.EMPTY);
      this.sound.playShatter();
      this.addShake(3);
      this.particles.spawnDebris(wx, wy, '#dc7a5c', '#7d302f');
      this.addScore(50, wx, wy - 8, '+50');
    } else {
      this.level.bumpTile(tx, ty);
      this.sound.playBlockBump();
    }
  }

  onPlayerDeath() {
    this.state = STATE.GAME_OVER;
    this.sound.setBgmMode('off');
  }

  update(dt, input) {
    this.input = input;
    this.time += dt;
    this.sound.update(dt);

    // Quick stage shortcuts (1-6)
    if (input.stage1) { this.score = 0; this.coins = 0; this.loadStage(0, true); return; }
    if (input.stage2) { this.score = 0; this.coins = 0; this.loadStage(1, true); return; }
    if (input.stage3) { this.score = 0; this.coins = 0; this.loadStage(2, true); return; }
    if (input.stage4) { this.score = 0; this.coins = 0; this.loadStage(3, true); return; }
    if (input.stage5) { this.score = 0; this.coins = 0; this.loadStage(4, true); return; }
    if (input.stage6) { this.score = 0; this.coins = 0; this.loadStage(5, true); return; }

    // Title screen interactive loop
    if (this.state === STATE.TITLE) {
      this.camera.x = (Math.sin(this.time * 0.25) * 0.5 + 0.5) * Math.max(0, this.level.widthPx - GAME_WIDTH);
      this.particles.update(dt, this.time, this.level.widthPx, this.level.heightPx);
      if (input.phasePressed) this.togglePhase();
      if (input.startPressed || input.jumpPressed) {
        this.score = 0;
        this.coins = 0;
        this.loadStage(0, true);
      }
      return;
    }

    if (this.state === STATE.PAUSED) {
      if (input.pausePressed) this.state = STATE.PLAYING;
      if (input.restartPressed) this.loadStage(this.stageIndex, true);
      return;
    }

    if (this.state === STATE.GAME_OVER) {
      this.particles.update(dt, this.time, this.level.widthPx, this.level.heightPx);
      if (input.jumpPressed || input.restartPressed || input.startPressed) {
        this.respawnAtCheckpoint();
      } else if (input.pausePressed) {
        this.state = STATE.TITLE;
      }
      return;
    }

    if (this.state === STATE.STAGE_CLEAR) {
      this.particles.update(dt, this.time, this.level.widthPx, this.level.heightPx);
      if (input.startPressed || input.jumpPressed) {
        this.loadStage(this.stageIndex + 1, true);
      }
      return;
    }

    if (this.state === STATE.VICTORY) {
      this.particles.update(dt, this.time, this.level.widthPx, this.level.heightPx);
      if (input.startPressed || input.jumpPressed) {
        this.state = STATE.TITLE;
        this.loadStage(0, false);
      }
      return;
    }

    // --- LIVE EDITOR MODE ---
    if (this.editor && this.editor.active) {
      this.editor.update(dt, input);
      if (input.phasePressed) this.togglePhase();
      return;
    }

    // --- PLAYING STATE ---
    if (input.pausePressed) {
      this.state = STATE.PAUSED;
      return;
    }
    if (input.restartPressed) {
      this.loadStage(this.stageIndex, true);
      return;
    }
    if (input.phasePressed) {
      this.togglePhase();
    }

    // Hitstop freeze frames for tactile impact
    if (this.hitstop > 0) {
      this.hitstop -= dt;
      this._updateCamera(dt);
      return;
    }

    this.stageTime += dt;
    this.ghost.recordFrame(dt, this.player, this.phase);
    if (this.comboTimer > 0) {
      this.comboTimer -= dt;
      if (this.comboTimer <= 0) this.combo = 0;
    }

    this.level.update(dt, this.particles);

    for (const p of this.platforms) p.update(dt);
    this.player.update(dt, input, this);
    for (const u of this.updrafts) u.update(dt, this.player, this);
    for (const fb of this.firebars) fb.update(dt, this.player, this);
    for (const br of this.boostRings) br.update(dt, this.player, this);
    for (const s of this.springs) s.update(dt, this.player, this);
    for (const cp of this.checkpoints) cp.update(dt, this.player, this);
    for (const c of this.coinsList) c.update(dt, this.time, this.player, this);
    for (const h of this.hearts) h.update(dt, this.time, this.player, this);
    for (const d of this.dashCrystals) d.update(dt, this.time, this.player, this);
    for (const e of this.enemies) e.update(dt, this.player, this);
    if (this.boss && this.boss.alive) {
      this.boss.update(dt, this.player, this);
    }
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
      this.projectiles[i].update(dt, this.player, this);
      if (!this.projectiles[i].alive) this.projectiles.splice(i, 1);
    }

    // Check Goal Portal
    const gx = this.level.goal.x;
    const gy = this.level.goal.y;
    const bossBlocking = this.boss && this.boss.alive;
    if (
      !bossBlocking &&
      Math.abs(this.player.cx - (gx + 8)) < 16 &&
      Math.abs(this.player.cy - (gy - 4)) < 24
    ) {
      const isNewRecord = this.ghost.finishStage(this.stageTime);
      this.sound.playVictory();
      this.sound.setBgmMode('off');
      this.addScore(1000, gx + 8, gy - 16, isNewRecord ? 'NEW RECORD!' : 'CLEAR +1000!');
      this.particles.burst(gx + 8, gy - 4, 34, '#ffe066', { speedMax: 180, glow: true });
      if (this.stageIndex >= STAGE_DEFS.length - 1) {
        this.state = STATE.VICTORY;
      } else {
        this.state = STATE.STAGE_CLEAR;
      }
    }

    this.particles.update(dt, this.time, this.level.widthPx, this.level.heightPx);
    this._updateCamera(dt);
  }

  _updateCamera(dt) {
    if (this.player) {
      // Center-locked camera (no directional lookAhead whip to prevent motion sickness)
      const targetX = Math.max(
        0,
        Math.min(this.level.widthPx - GAME_WIDTH, this.player.cx - GAME_WIDTH * 0.5)
      );
      const targetY = Math.max(
        0,
        Math.min(this.level.heightPx - GAME_HEIGHT, this.player.cy - GAME_HEIGHT * 0.55)
      );
      this.camera.x = targetX;
      this.camera.y += (targetY - this.camera.y) * Math.min(1, dt * 8);
    }

    if (this.camera.shake > 0.1) {
      const s = Math.min(4.5, this.camera.shake);
      this.camera.shakeX = (Math.random() - 0.5) * s * 1.4;
      this.camera.shakeY = (Math.random() - 0.5) * s * 1.4;
      this.camera.shake *= Math.pow(0.0004, dt);
    } else {
      this.camera.shake = 0;
      this.camera.shakeX = 0;
      this.camera.shakeY = 0;
    }
  }
}
