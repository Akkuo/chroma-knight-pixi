import { PHASE, PHYSICS, TILE, TILE_SIZE } from './constants.js';

function overlaps(a, b) {
  return a.x < b.x + b.w && a.x + a.w > b.x && a.y < b.y + b.h && a.y + a.h > b.y;
}

export class Coin {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.baseY = y;
    this.w = 10;
    this.h = 10;
    this.collected = false;
    this.phase = Math.random() * Math.PI * 2;
  }

  update(dt, time, player, game) {
    if (this.collected) return;
    this.y = this.baseY + Math.sin(time * 4.5 + this.phase) * 2.2;

    // Gentle magnetic pull when close
    const dx = player.cx - (this.x + 5);
    const dy = player.cy - (this.y + 5);
    const dist = Math.hypot(dx, dy);
    if (dist < 26 && dist > 0.1) {
      this.x += (dx / dist) * 115 * dt;
      this.baseY += (dy / dist) * 115 * dt;
    }

    if (overlaps(this, player)) {
      this.collected = true;
      game.coins += 1;
      game.combo = Math.min(20, game.combo + 1);
      game.comboTimer = 2.6;
      const pts = 50 + (game.combo > 1 ? game.combo * 10 : 0);
      game.addScore(pts, this.x + 5, this.y, game.combo > 2 ? `+${pts} ${game.combo}x` : `+${pts}`);
      game.sound.playCoin(game.combo);
      game.particles.burst(this.x + 5, this.y + 5, 7, '#ffe66d', { speedMax: 75, gravity: 120, glow: true });
    }
  }
}

export class HeartPickup {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.baseY = y;
    this.w = 10;
    this.h = 10;
    this.collected = false;
  }

  update(dt, time, player, game) {
    if (this.collected) return;
    this.y = this.baseY + Math.sin(time * 3.8) * 2.5;
    if (overlaps(this, player)) {
      this.collected = true;
      player.hp = Math.min(player.maxHp, player.hp + 1);
      game.sound.playPowerup();
      game.addScore(200, this.x + 5, this.y, 'HP +1!');
      game.particles.burst(this.x + 5, this.y + 5, 14, '#ff5978', { speedMax: 105, gravity: 60, glow: true });
    }
  }
}

export class DashCrystal {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.baseY = y;
    this.w = 12;
    this.h = 12;
    this.cooldown = 0;
  }

  update(dt, time, player, game) {
    this.y = this.baseY + Math.sin(time * 3.5 + this.x * 0.05) * 2.5;
    if (this.cooldown > 0) {
      this.cooldown -= dt;
      return;
    }
    if (overlaps(this, player) && !player.canDash) {
      player.canDash = true;
      player.dashCooldown = 0;
      this.cooldown = 2.4;
      game.hitstop = 0.035;
      game.sound.playDashCrystal();
      game.particles.burst(this.x + 6, this.y + 6, 14, '#4af7c8', { speedMax: 120, gravity: 0, glow: true });
      game.particles.spawnText(this.x + 6, this.y - 2, 'DASH!', '#8effe0');
    }
  }
}

export class Springboard {
  constructor(x, y) {
    this.x = x;
    this.y = y + 6;
    this.w = 16;
    this.h = 10;
    this.compress = 0;
  }

  update(dt, player, game) {
    if (this.compress > 0) this.compress = Math.max(0, this.compress - dt * 5);
    if (overlaps(this, player) && player.vy >= 0) {
      const superLaunch = player.groundPounding;
      player.groundPounding = false;
      player.vy = superLaunch ? PHYSICS.SPRING_POUND_VEL : PHYSICS.SPRING_VEL;
      player.onGround = false;
      player.canDash = true;
      player.setSquash(0.68, 1.44);
      this.compress = 1;
      game.sound.playSpring();
      game.addShake(superLaunch ? 5 : 2.5);
      game.particles.burst(this.x + 8, this.y, 12, '#ffe066', {
        speedMin: 40,
        speedMax: 130,
        angleOffset: -Math.PI * 0.5,
        spread: Math.PI * 0.7,
        glow: true,
      });
      if (superLaunch) {
        game.particles.spawnText(this.x + 8, this.y - 6, 'SUPER BOUNCE!', '#fff3a8');
      }
    }
  }
}

export class Checkpoint {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.w = 16;
    this.h = 24;
    this.active = false;
  }

  update(dt, player, game) {
    if (!this.active && overlaps(this, player)) {
      this.active = true;
      player.respawnX = this.x + 2;
      player.respawnY = this.y + 6;
      player.hp = player.maxHp;
      game.sound.playCheckpoint();
      game.particles.burst(this.x + 8, this.y + 6, 20, '#ffd966', { speedMax: 120, gravity: 80, glow: true });
      game.particles.spawnText(this.x + 8, this.y - 4, 'CHECKPOINT!', '#fff3a8');
    }
  }
}

export class MovingPlatform {
  constructor(x, y, w = 48, rangeX = 48, rangeY = 0, speed = 1.5) {
    this.startX = x;
    this.startY = y;
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = 8;
    this.rangeX = rangeX;
    this.rangeY = rangeY;
    this.speed = speed;
    this.dx = 0;
    this.dy = 0;
    this.t = 0;
  }

  update(dt) {
    const prevX = this.x;
    const prevY = this.y;
    this.t += dt * this.speed;
    this.x = this.startX + Math.sin(this.t) * this.rangeX;
    this.y = this.startY + Math.sin(this.t) * this.rangeY;
    this.dx = this.x - prevX;
    this.dy = this.y - prevY;
  }
}

export class UpdraftColumn {
  constructor(x, y, h = 112) {
    this.x = x;
    this.y = y - h + 16;
    this.w = 24;
    this.h = h;
  }

  update(dt, player, game) {
    if (overlaps(this, player)) {
      const lift = game.input.jump ? -1380 : -1060;
      player.vy = Math.max(-210, player.vy + lift * dt);
      player.canDash = true;
      if (Math.random() < 0.35) {
        game.particles.burst(
          this.x + Math.random() * this.w,
          this.y + this.h - 4,
          1,
          game.phase === PHASE.LUNAR ? '#9ef6ff' : '#fff2c4',
          { speedMin: 40, speedMax: 90, angleOffset: -Math.PI * 0.5, spread: 0.25, gravity: -80, lifeMax: 0.4 }
        );
      }
    }
  }
}

export class Firebar {
  constructor(x, y, count = 4, speed = 2.0) {
    this.cx = x + 8;
    this.cy = y + 8;
    this.count = count;
    this.speed = speed;
    this.angle = Math.random() * Math.PI * 2;
  }

  update(dt, player, game) {
    this.angle += this.speed * dt;
    for (let i = 1; i <= this.count; i++) {
      const fx = this.cx + Math.cos(this.angle) * (i * 11);
      const fy = this.cy + Math.sin(this.angle) * (i * 11);
      const box = { x: fx - 3, y: fy - 3, w: 6, h: 6 };
      if (overlaps(box, player)) {
        player.hurt(game, player.cx < fx ? -1 : 1);
        return;
      }
    }
  }
}

export class BoostRing {
  constructor(x, y, dirX = 1, dirY = -0.35) {
    this.x = x;
    this.y = y;
    this.w = 18;
    this.h = 18;
    const len = Math.hypot(dirX, dirY) || 1;
    this.dirX = dirX / len;
    this.dirY = dirY / len;
    this.cooldown = 0;
  }

  update(dt, player, game) {
    if (this.cooldown > 0) {
      this.cooldown -= dt;
      return;
    }
    if (overlaps(this, player)) {
      this.cooldown = 0.45;
      player.groundPounding = false;
      player.dashTimer = 0;
      player.vx = this.dirX * 330;
      player.vy = this.dirY * 330;
      player.canDash = true;
      player.onGround = false;
      player.setSquash(1.38, 0.72);
      game.sound.playSpring();
      game.hitstop = 0.03;
      game.addShake(4);
      const col = game.phase === PHASE.LUNAR ? '#4ae3ff' : '#ffd54f';
      game.particles.burst(this.x + 9, this.y + 9, 16, col, { speedMax: 150, gravity: 0, glow: true });
      game.particles.spawnRipple(this.x + 9, this.y + 9, col, 48);
      game.particles.spawnText(this.x + 9, this.y - 4, 'BOOST!', '#fff3a8');
    }
  }
}

class BaseEnemy {
  constructor(x, y, w, h) {
    this.x = x;
    this.y = y;
    this.w = w;
    this.h = h;
    this.vx = -36;
    this.vy = 0;
    this.alive = true;
    this.onGround = false;
  }

  get cx() { return this.x + this.w * 0.5; }
  get cy() { return this.y + this.h * 0.5; }

  moveAndCollide(dt, level, phase, turnAtLedge = true) {
    this.vy = Math.min(340, this.vy + PHYSICS.GRAVITY * dt);
    this.x += this.vx * dt;

    const topTy = Math.floor(this.y / TILE_SIZE);
    const botTy = Math.floor((this.y + this.h - 1) / TILE_SIZE);

    if (this.vx > 0) {
      const rtx = Math.floor((this.x + this.w) / TILE_SIZE);
      for (let ty = topTy; ty <= botTy; ty++) {
        if (level.isSolid(rtx, ty, phase)) {
          this.x = rtx * TILE_SIZE - this.w - 0.01;
          this.vx = -Math.abs(this.vx);
          return true; // hit wall
        }
      }
    } else if (this.vx < 0) {
      const ltx = Math.floor(this.x / TILE_SIZE);
      for (let ty = topTy; ty <= botTy; ty++) {
        if (level.isSolid(ltx, ty, phase)) {
          this.x = (ltx + 1) * TILE_SIZE + 0.01;
          this.vx = Math.abs(this.vx);
          return true;
        }
      }
    }

    this.y += this.vy * dt;
    this.onGround = false;
    const leftTx = Math.floor(this.x / TILE_SIZE);
    const rightTx = Math.floor((this.x + this.w - 1) / TILE_SIZE);
    const footTy = Math.floor((this.y + this.h) / TILE_SIZE);
    for (let tx = leftTx; tx <= rightTx; tx++) {
      if (level.isSolid(tx, footTy, phase)) {
        this.y = footTy * TILE_SIZE - this.h;
        this.vy = 0;
        this.onGround = true;
        break;
      }
    }

    if (turnAtLedge && this.onGround && Math.abs(this.vx) > 0) {
      const aheadTx = Math.floor((this.vx > 0 ? this.x + this.w + 2 : this.x - 2) / TILE_SIZE);
      if (!level.isSolid(aheadTx, footTy, phase)) {
        this.vx = -this.vx;
      }
    }

    if (this.y > level.heightPx + 32) this.alive = false;
    return false;
  }
}

export class SlimeEnemy extends BaseEnemy {
  constructor(x, y) {
    super(x, y, 14, 12);
    this.type = 'slime';
    this.hopTimer = 0.8 + Math.random();
    this.vx = -34;
  }

  onStomped(game, fromShockwave = false) {
    this.alive = false;
    game.combo = Math.min(20, game.combo + 1);
    game.comboTimer = 2.8;
    const pts = 100 * Math.min(5, game.combo);
    game.addScore(pts, this.cx, this.y, game.combo > 1 ? `+${pts} ${game.combo}x!` : `+${pts}`);
    game.sound.playStomp(game.combo);
    game.particles.burst(this.cx, this.cy, 12, '#6df07c', { speedMax: 120, glow: true });
    if (!fromShockwave) {
      game.hitstop = 0.035;
      game.addShake(2.5);
    }
  }

  update(dt, player, game) {
    if (!this.alive) return;
    this.hopTimer -= dt;
    if (this.onGround && this.hopTimer <= 0) {
      this.vy = -170;
      this.hopTimer = 1.4 + Math.random() * 0.6;
    }
    const speedMult = game.phase === PHASE.SOLAR ? 1.15 : 0.88;
    const origVx = this.vx;
    this.vx = Math.sign(origVx || -1) * 34 * speedMult;
    this.moveAndCollide(dt, game.level, game.phase, true);

    if (overlaps(this, player)) {
      const stomping = (player.vy > 0 && player.y + player.h - this.y < 10) || player.groundPounding || player.dashTimer > 0;
      if (stomping) {
        this.onStomped(game);
        if (!player.groundPounding && player.dashTimer <= 0) {
          player.vy = game.input.jump ? PHYSICS.STOMP_HIGH_BOUNCE : PHYSICS.STOMP_BOUNCE;
          player.canDash = true;
          player.setSquash(0.75, 1.35);
        }
      } else {
        player.hurt(game, player.cx < this.cx ? -1 : 1);
      }
    }
  }
}

export class BeetleEnemy extends BaseEnemy {
  constructor(x, y) {
    super(x, y, 14, 13);
    this.type = 'beetle';
    this.state = 'walk'; // 'walk' | 'shell_idle' | 'shell_slide'
    this.vx = -38;
    this.kickGrace = 0;
  }

  onStomped(game, fromShockwave = false) {
    if (this.state === 'walk') {
      this.state = 'shell_idle';
      this.vx = 0;
      this.h = 11;
      this.y += 2;
      this.kickGrace = 0.14;
      game.sound.playStomp(1);
      game.particles.burst(this.cx, this.cy, 8, '#ff7582', { speedMax: 85 });
      if (!fromShockwave) {
        game.hitstop = 0.03;
        game.addShake(2);
      }
    } else if (this.state === 'shell_slide') {
      this.state = 'shell_idle';
      this.vx = 0;
      this.kickGrace = 0.14;
      game.sound.playStomp(1);
    } else if (fromShockwave) {
      this.alive = false;
      game.particles.burst(this.cx, this.cy, 12, '#ff7582', { speedMax: 120 });
    }
  }

  kick(dir, game) {
    this.state = 'shell_slide';
    this.vx = dir * 235;
    this.kickGrace = 0.16;
    game.sound.playShellKick();
    game.addShake(3);
    game.particles.burst(this.cx, this.cy, 8, '#ffd561', { speedMax: 100, glow: true });
  }

  update(dt, player, game) {
    if (!this.alive) return;
    if (this.kickGrace > 0) this.kickGrace -= dt;

    if (this.state === 'walk') {
      this.moveAndCollide(dt, game.level, game.phase, true);
    } else if (this.state === 'shell_idle') {
      this.moveAndCollide(dt, game.level, game.phase, false);
    } else if (this.state === 'shell_slide') {
      const prevVx = this.vx;
      const hitWall = this.moveAndCollide(dt, game.level, game.phase, false);
      if (hitWall) {
        // Smash brick / cracked tile on shell impact!
        const checkTx = Math.floor((prevVx > 0 ? this.x + this.w + 3 : this.x - 3) / TILE_SIZE);
        const checkTy = Math.floor(this.cy / TILE_SIZE);
        const t = game.level.getTile(checkTx, checkTy);
        if (t === TILE.BRICK || t === TILE.CRACKED) {
          game.level.setTile(checkTx, checkTy, TILE.EMPTY);
          game.sound.playShatter();
          game.particles.spawnDebris(checkTx * 16 + 8, checkTy * 16 + 8, '#dc7a5c', '#7d302f');
        } else {
          game.sound.playBlockBump();
        }
      }
      // Sliding shell knocks out other enemies & damages boss!
      for (const other of game.enemies) {
        if (other === this || !other.alive) continue;
        if (overlaps(this, other)) {
          other.onStomped(game, true);
        }
      }
      if (game.boss && game.boss.alive && overlaps(this, game.boss)) {
        game.boss.takeDamage(game, 2);
        this.alive = false;
        game.particles.burst(this.cx, this.cy, 14, '#ffd561', { speedMax: 135, glow: true });
        return;
      }
    }

    if (overlaps(this, player)) {
      if (this.state === 'shell_idle' && this.kickGrace <= 0) {
        const dir = player.cx < this.cx ? 1 : -1;
        this.kick(dir, game);
        return;
      }
      const stomping = (player.vy > 0 && player.y + player.h - this.y < 10) || player.groundPounding;
      if (stomping) {
        this.onStomped(game);
        if (!player.groundPounding) {
          player.vy = game.input.jump ? PHYSICS.STOMP_HIGH_BOUNCE : PHYSICS.STOMP_BOUNCE;
          player.canDash = true;
          player.setSquash(0.76, 1.32);
        }
      } else if (this.kickGrace <= 0) {
        if (player.dashTimer > 0 && this.state === 'walk') {
          this.onStomped(game);
          this.kick(player.facing, game);
        } else {
          player.hurt(game, player.cx < this.cx ? -1 : 1);
        }
      }
    }
  }
}

export class WispEnemy {
  constructor(x, y, wispPhase) {
    this.type = 'wisp';
    this.baseX = x;
    this.baseY = y;
    this.x = x;
    this.y = y;
    this.w = 12;
    this.h = 12;
    this.wispPhase = wispPhase;
    this.alive = true;
    this.t = Math.random() * Math.PI * 2;
  }

  get cx() { return this.x + 6; }
  get cy() { return this.y + 6; }

  onStomped(game, fromShockwave = false) {
    this.alive = false;
    game.combo = Math.min(20, game.combo + 1);
    game.comboTimer = 2.8;
    const pts = 150 * Math.min(5, game.combo);
    game.addScore(pts, this.cx, this.y, `+${pts} PHASE!`);
    game.sound.playStomp(game.combo);
    game.particles.burst(this.cx, this.cy, 14, this.wispPhase === PHASE.SOLAR ? '#ffb638' : '#4ae3ff', { speedMax: 130, glow: true });
    if (!fromShockwave) {
      game.hitstop = 0.04;
      game.addShake(3);
    }
  }

  update(dt, player, game) {
    if (!this.alive) return;
    this.t += dt * 2.4;
    this.x = this.baseX + Math.cos(this.t * 0.7) * 28;
    this.y = this.baseY + Math.sin(this.t * 1.4) * 14;

    // Only tangible in matching phase!
    const tangible = game.phase === this.wispPhase;
    if (!tangible) return;

    if (overlaps(this, player)) {
      const stomping = (player.vy > 0 && player.y + player.h - this.y < 10) || player.dashTimer > 0 || player.groundPounding;
      if (stomping) {
        this.onStomped(game);
        if (!player.groundPounding && player.dashTimer <= 0) {
          player.vy = PHYSICS.STOMP_BOUNCE;
          player.canDash = true;
        }
      } else {
        player.hurt(game, player.cx < this.cx ? -1 : 1);
      }
    }
  }
}

export class BossProjectile {
  constructor(x, y, vx, vy, phase) {
    this.x = x;
    this.y = y;
    this.w = 8;
    this.h = 8;
    this.vx = vx;
    this.vy = vy;
    this.phase = phase;
    this.life = 4.2;
    this.alive = true;
  }

  update(dt, player, game) {
    if (!this.alive) return;
    this.life -= dt;
    if (this.life <= 0) {
      this.alive = false;
      return;
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Only hurts when matching current world phase — encourages reactive phase-dodging!
    if (this.phase === game.phase && overlaps(this, player)) {
      player.hurt(game, this.vx >= 0 ? 1 : -1);
      this.alive = false;
      game.particles.burst(this.x + 4, this.y + 4, 8, this.phase === PHASE.SOLAR ? '#ffb638' : '#4ae3ff', { speedMax: 90, glow: true });
    }
  }
}

export class PrismGolemBoss {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.w = 32;
    this.h = 32;
    this.vx = 0;
    this.vy = 0;
    this.hp = 8;
    this.maxHp = 8;
    this.alive = true;
    this.active = false;
    this.bossPhase = PHASE.SOLAR;
    this.hurtTimer = 0;
    this.stateTimer = 1.6;
    this.state = 'idle'; // 'idle' | 'leap' | 'orbs'
    this.onGround = false;
    this.homeX = x;
    this.summonedMinion = false;
  }

  get cx() { return this.x + this.w * 0.5; }
  get cy() { return this.y + this.h * 0.5; }

  takeDamage(game, dmg = 1) {
    if (this.hurtTimer > 0 || !this.alive) return;
    this.hp -= dmg;
    this.hurtTimer = 0.75;
    this.bossPhase = this.bossPhase === PHASE.SOLAR ? PHASE.LUNAR : PHASE.SOLAR;
    game.sound.playBossHit();
    game.hitstop = 0.08;
    game.addShake(9);
    const col = this.bossPhase === PHASE.SOLAR ? '#ffba42' : '#4ae3ff';
    game.particles.burst(this.cx, this.cy, 24, col, { speedMax: 170, glow: true });
    game.particles.spawnRipple(this.cx, this.cy, col, 140);
    game.addScore(500, this.cx, this.y - 6, 'CRITICAL!');

    // Phase 2: drop a Shell Beetle minion so player can kick shells for 2x damage!
    if (this.hp > 0 && this.hp <= 4 && !this.summonedMinion) {
      this.summonedMinion = true;
      game.enemies.push(new BeetleEnemy(this.homeX - 56, this.y - 12));
      game.particles.spawnText(this.cx, this.y - 20, 'PHASE 2! SHELL DROP!', '#ffd561');
    }

    if (this.hp <= 0) {
      this.alive = false;
      game.addScore(2500, this.cx, this.y, 'BOSS DEFEATED!');
      game.sound.playVictory();
      game.addShake(14);
      game.particles.burst(this.cx, this.cy, 48, '#fff3a8', { speedMax: 220, lifeMax: 1.1, glow: true });
      game.particles.burst(this.cx, this.cy, 36, '#4ae3ff', { speedMax: 190, lifeMax: 1.0, glow: true });
      game.sound.setBgmMode(game.phase);
    }
  }

  update(dt, player, game) {
    if (!this.alive) return;

    if (!this.active) {
      if (Math.abs(player.cx - this.cx) < 195) {
        this.active = true;
        game.sound.setBgmMode('boss');
        game.particles.spawnText(this.cx, this.y - 16, 'PRISM GOLEM AWAKENS!', '#ff7582');
      }
      return;
    }

    if (this.hurtTimer > 0) this.hurtTimer -= dt;
    this.stateTimer -= dt;

    // Gravity & ground collide
    this.vy = Math.min(360, this.vy + PHYSICS.GRAVITY * dt);
    this.x += this.vx * dt;
    this.y += this.vy * dt;

    // Keep inside arena bounds
    const minX = this.homeX - 96;
    const maxX = this.homeX + 86;
    if (this.x < minX) { this.x = minX; this.vx = Math.abs(this.vx); }
    if (this.x > maxX) { this.x = maxX; this.vx = -Math.abs(this.vx); }

    const footTy = Math.floor((this.y + this.h) / TILE_SIZE);
    const midTx = Math.floor(this.cx / TILE_SIZE);
    const wasAir = !this.onGround;
    if (game.level.isSolid(midTx, footTy, game.phase)) {
      this.y = footTy * TILE_SIZE - this.h;
      this.vy = 0;
      this.onGround = true;
      this.vx *= 0.82;
      if (wasAir && this.state === 'leap') {
        game.sound.playGroundPound();
        game.addShake(7);
        const col = this.bossPhase === PHASE.SOLAR ? '#ffba42' : '#4ae3ff';
        game.particles.spawnRipple(this.cx, this.y + this.h, col, 95);
        // Fire 2 ground shockwave orbs
        game.projectiles.push(new BossProjectile(this.cx - 10, this.y + this.h - 10, -115, 0, this.bossPhase));
        game.projectiles.push(new BossProjectile(this.cx + 10, this.y + this.h - 10, 115, 0, this.bossPhase));
      }
    } else {
      this.onGround = false;
    }

    // Boss AI pattern
    if (this.stateTimer <= 0 && this.onGround) {
      if (this.state === 'idle' || this.state === 'orbs') {
        this.state = 'leap';
        const dir = player.cx < this.cx ? -1 : 1;
        this.vx = dir * 105;
        this.vy = -295;
        this.onGround = false;
        this.stateTimer = 2.0;
      } else {
        this.state = 'orbs';
        this.stateTimer = 1.85;
        // Fire 3-orb radial fan
        const dx = player.cx - this.cx;
        const dy = player.cy - this.cy;
        const baseAngle = Math.atan2(dy, dx);
        for (const offset of [-0.32, 0, 0.32]) {
          const a = baseAngle + offset;
          game.projectiles.push(
            new BossProjectile(this.cx - 4, this.cy - 4, Math.cos(a) * 118, Math.sin(a) * 118, this.bossPhase)
          );
        }
        game.sound.playPhaseShift(this.bossPhase === PHASE.LUNAR);
      }
    }

    // Player collision with Boss
    if (overlaps(this, player)) {
      const stompingCrown = (player.vy > 0 && player.y + player.h - this.y < 14) || player.groundPounding;
      if (stompingCrown && this.hurtTimer <= 0) {
        const dmg = player.groundPounding ? 2 : 1;
        player.groundPounding = false;
        player.vy = PHYSICS.STOMP_HIGH_BOUNCE;
        player.vx = (player.cx < this.cx ? -1 : 1) * 120;
        player.canDash = true;
        this.takeDamage(game, dmg);
      } else if (this.hurtTimer <= 0) {
        player.hurt(game, player.cx < this.cx ? -1 : 1);
      }
    }
  }
}
