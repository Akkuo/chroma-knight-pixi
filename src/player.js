import { PHYSICS, PHASE, TILE, TILE_SIZE } from './constants.js';

export class Player {
  constructor(x, y) {
    this.w = 10;
    this.h = 15;
    this.respawnX = x;
    this.respawnY = y;
    this.reset(x, y);
  }

  reset(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.facing = 1;
    this.onGround = false;
    this.onIce = false;
    this.wallDir = 0; // -1 left wall, 1 right wall
    this.coyoteTimer = 0;
    this.wallCoyoteTimer = 0;
    this.lastWallDir = 0;
    this.jumpBufferTimer = 0;

    this.canDash = true;
    this.dashTimer = 0;
    this.dashCooldown = 0;
    this.dashDirX = 1;
    this.dashDirY = 0;
    this.afterimageTimer = 0;

    this.groundPounding = false;
    this.poundWindup = 0;

    this.hp = 3;
    this.maxHp = 3;
    this.invulnTimer = 0;
    this.dead = false;

    this.scaleX = 1;
    this.scaleY = 1;
    this.animTimer = 0;
    this.standingPlatform = null;

    // Verlet flowing cape (6 nodes)
    this.cape = [];
    for (let i = 0; i < 6; i++) {
      this.cape.push({ x: x - i * 3, y: y + 6 + i, px: x - i * 3, py: y + 6 + i });
    }
  }

  get cx() {
    return this.x + this.w * 0.5;
  }

  get cy() {
    return this.y + this.h * 0.5;
  }

  setSquash(sx, sy) {
    this.scaleX = sx;
    this.scaleY = sy;
  }

  hurt(game, knockDir = -1) {
    if (this.invulnTimer > 0 || this.dead) return false;
    this.hp -= 1;
    this.invulnTimer = 1.35;
    this.groundPounding = false;
    this.dashTimer = 0;
    this.vx = knockDir * 155;
    this.vy = -215;
    this.setSquash(1.3, 0.7);
    game.sound.playHurt();
    game.addShake(6);
    game.hitstop = 0.06;
    game.combo = 0;
    game.particles.burst(this.cx, this.cy, 14, '#ff5978', { speedMax: 140, glow: true });
    if (this.hp <= 0) {
      this.dead = true;
      game.onPlayerDeath();
    }
    return true;
  }

  update(dt, input, game) {
    if (this.dead) return;

    const { level, phase, sound, particles, atlas } = game;
    const isLunar = phase === PHASE.LUNAR;
    const prevOnGround = this.onGround;

    // Carry from moving platform
    if (this.standingPlatform) {
      this.x += this.standingPlatform.dx;
      this.y += this.standingPlatform.dy;
      this.standingPlatform = null;
    }

    // Recover squash & stretch
    this.scaleX += (1 - this.scaleX) * Math.min(1, dt * 16);
    this.scaleY += (1 - this.scaleY) * Math.min(1, dt * 16);

    if (this.invulnTimer > 0) this.invulnTimer -= dt;
    if (this.dashCooldown > 0) this.dashCooldown -= dt;
    if (this.coyoteTimer > 0) this.coyoteTimer -= dt;
    if (this.wallCoyoteTimer > 0) this.wallCoyoteTimer -= dt;
    if (this.jumpBufferTimer > 0) this.jumpBufferTimer -= dt;

    if (input.jumpPressed) {
      this.jumpBufferTimer = PHYSICS.JUMP_BUFFER;
    }

    const moveX = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const moveY = (input.down ? 1 : 0) - (input.up ? 1 : 0);
    if (moveX !== 0 && this.dashTimer <= 0) {
      this.facing = moveX;
    }

    // --- GROUND POUND ---
    if (!this.onGround && !this.groundPounding && this.dashTimer <= 0 && input.downPressed && this.wallDir === 0) {
      this.groundPounding = true;
      this.poundWindup = PHYSICS.GROUND_POUND_WINDUP;
      this.vx = 0;
      this.vy = -40;
      this.setSquash(0.72, 1.38);
      particles.burst(this.cx, this.cy, 8, isLunar ? '#7eeeff' : '#ffd06b', { speedMax: 75, gravity: 0, glow: true });
    }

    if (this.groundPounding) {
      if (this.poundWindup > 0) {
        this.poundWindup -= dt;
        this.vy = 0;
      } else {
        this.vy = PHYSICS.GROUND_POUND_SPEED;
        this.vx = 0;
        if (Math.random() < 0.7) {
          particles.burst(this.cx, this.y, 1, isLunar ? '#4ae3ff' : '#ffae38', { speedMax: 25, gravity: -40, lifeMax: 0.18, glow: true });
        }
      }
    }

    // --- DASH ---
    if (input.dashPressed && this.canDash && this.dashCooldown <= 0 && this.dashTimer <= 0) {
      this.groundPounding = false;
      this.canDash = false;
      this.dashTimer = PHYSICS.DASH_TIME;
      this.dashCooldown = PHYSICS.DASH_COOLDOWN;
      let dx = moveX;
      let dy = moveY;
      if (dx === 0 && dy === 0) dx = this.facing;
      const len = Math.hypot(dx, dy) || 1;
      this.dashDirX = dx / len;
      this.dashDirY = dy / len;
      this.vx = this.dashDirX * PHYSICS.DASH_SPEED;
      this.vy = this.dashDirY * PHYSICS.DASH_SPEED;
      this.setSquash(Math.abs(dx) >= Math.abs(dy) ? 1.38 : 0.74, Math.abs(dx) >= Math.abs(dy) ? 0.72 : 1.35);
      sound.playDash(isLunar);
      game.addShake(3.2);
      game.hitstop = 0.025;
      particles.burst(this.cx, this.cy, 12, isLunar ? '#5ce6ff' : '#ffba42', {
        speedMax: 115,
        gravity: 0,
        glow: true,
      });
    }

    if (this.dashTimer > 0) {
      this.dashTimer -= dt;
      this.vx = this.dashDirX * PHYSICS.DASH_SPEED;
      this.vy = this.dashDirY * PHYSICS.DASH_SPEED;
      this.afterimageTimer -= dt;
      if (this.afterimageTimer <= 0) {
        this.afterimageTimer = 0.026;
        const spr = this.getSprite(atlas, phase);
        particles.spawnAfterimage(this.x - 3, this.y - 3, spr, isLunar ? '#4ae3ff' : '#ffae38');
      }
      if (this.dashTimer <= 0) {
        this.vx *= 0.56;
        this.vy *= 0.45;
      }
    } else if (!this.groundPounding) {
      // --- HORIZONTAL MOVEMENT ---
      const accel = this.onGround ? (this.onIce ? PHYSICS.GROUND_ACCEL * 0.24 : PHYSICS.GROUND_ACCEL) : PHYSICS.AIR_ACCEL;
      const decel = this.onGround ? (this.onIce ? PHYSICS.GROUND_DECEL * 0.12 : PHYSICS.GROUND_DECEL) : PHYSICS.AIR_DECEL;
      if (moveX !== 0) {
        const target = moveX * (this.onIce ? PHYSICS.RUN_SPEED * 1.18 : PHYSICS.RUN_SPEED);
        if (this.vx < target) this.vx = Math.min(target, this.vx + accel * dt);
        else if (this.vx > target) this.vx = Math.max(target, this.vx - accel * dt);
      } else {
        if (this.vx > 0) this.vx = Math.max(0, this.vx - decel * dt);
        else if (this.vx < 0) this.vx = Math.min(0, this.vx + decel * dt);
      }

      // --- GRAVITY ---
      const g = PHYSICS.GRAVITY * (isLunar ? PHYSICS.LUNAR_GRAVITY_MULT : 1.0);
      this.vy += g * dt;

      // Wall slide cap
      if (!this.onGround && this.wallDir !== 0 && this.vy > 0 && moveX === this.wallDir) {
        if (this.vy > PHYSICS.WALL_SLIDE_MAX) this.vy = PHYSICS.WALL_SLIDE_MAX;
        if (Math.random() < 0.35) {
          particles.burst(
            this.wallDir > 0 ? this.x + this.w : this.x,
            this.y + 4,
            1,
            '#dce4f7',
            { speedMax: 24, gravity: 40, lifeMax: 0.25 }
          );
        }
      } else if (this.vy > PHYSICS.MAX_FALL) {
        this.vy = PHYSICS.MAX_FALL;
      }

      // --- JUMPING (GROUND / COYOTE / WALL) ---
      if (this.jumpBufferTimer > 0) {
        if (this.coyoteTimer > 0) {
          this.vy = PHYSICS.JUMP_VEL;
          this.onGround = false;
          this.coyoteTimer = 0;
          this.jumpBufferTimer = 0;
          this.setSquash(0.76, 1.32);
          sound.playJump(isLunar);
          particles.burst(this.cx, this.y + this.h, 7, '#e2e8f5', {
            speedMin: 18,
            speedMax: 70,
            angleOffset: -Math.PI * 0.5,
            spread: Math.PI * 0.85,
            gravity: 160,
          });
        } else if (this.wallCoyoteTimer > 0 && this.lastWallDir !== 0) {
          this.vy = PHYSICS.WALL_JUMP_Y;
          this.vx = -this.lastWallDir * PHYSICS.WALL_JUMP_X;
          this.facing = -this.lastWallDir;
          this.wallCoyoteTimer = 0;
          this.jumpBufferTimer = 0;
          this.setSquash(0.75, 1.32);
          sound.playWallJump();
          particles.burst(
            this.lastWallDir > 0 ? this.x + this.w : this.x,
            this.cy,
            8,
            isLunar ? '#7eeeff' : '#ffd06b',
            { speedMax: 90, gravity: 120, glow: true }
          );
        }
      }

      // Variable jump height cut
      if (!input.jump && this.vy < -60) {
        this.vy *= Math.pow(PHYSICS.JUMP_CUT_MULT, dt * 18);
      }
    }

    // --- MOVE & COLLIDE X ---
    this.x += this.vx * dt;
    this.wallDir = 0;
    this._resolveX(level, phase);

    // --- MOVE & COLLIDE Y ---
    const prevBottom = this.y + this.h;
    this.y += this.vy * dt;
    this.onGround = false;
    this.onIce = false;
    this._resolveY(level, phase, prevBottom, game);

    // Moving platforms collision (one-way top)
    if (this.vy >= 0) {
      for (const p of game.platforms) {
        const horiz = this.x + this.w > p.x && this.x < p.x + p.w;
        if (horiz && prevBottom <= p.y + 4 && this.y + this.h >= p.y) {
          this.y = p.y - this.h;
          this.vy = 0;
          this.onGround = true;
          this.standingPlatform = p;
          if (this.groundPounding) {
            this._finishGroundPound(game);
          }
        }
      }
    }

    // Landed feedback
    if (this.onGround) {
      this.coyoteTimer = PHYSICS.COYOTE_TIME;
      if (this.dashTimer <= 0) this.canDash = true;
      if (!prevOnGround) {
        if (this.groundPounding) {
          this._finishGroundPound(game);
        } else {
          this.setSquash(1.24, 0.78);
          particles.burst(this.cx, this.y + this.h, 5, '#dce4f5', {
            speedMin: 15,
            speedMax: 55,
            angleOffset: -Math.PI * 0.5,
            spread: Math.PI,
            gravity: 140,
            lifeMax: 0.25,
          });
        }
      }
      if (Math.abs(this.vx) > 25) {
        particles.disturbGrass(this.cx, this.y + this.h, this.vx);
      }
    }

    if (this.wallDir !== 0 && !this.onGround) {
      this.wallCoyoteTimer = PHYSICS.WALL_COYOTE_TIME;
      this.lastWallDir = this.wallDir;
    }

    // Check hazards (spikes / lava / falling off bottom)
    this._checkHazards(level, game);

    // Animation timer
    if (this.onGround && Math.abs(this.vx) > 12) {
      this.animTimer += dt * (Math.abs(this.vx) / 16);
    } else {
      this.animTimer = 0;
    }

    // Update Verlet Cape
    this._updateCape(dt, game.time);
  }

  _finishGroundPound(game) {
    this.groundPounding = false;
    this.setSquash(1.45, 0.58);
    game.sound.playGroundPound();
    game.addShake(7);
    game.hitstop = 0.045;
    const color = game.phase === PHASE.LUNAR ? '#4ae3ff' : '#ffae38';
    game.particles.burst(this.cx, this.y + this.h, 18, color, {
      speedMin: 40,
      speedMax: 165,
      angleOffset: -Math.PI * 0.5,
      spread: Math.PI * 0.9,
      gravity: 260,
      glow: true,
    });
    game.particles.spawnRipple(this.cx, this.y + this.h, color, 58);

    // Shatter cracked blocks beneath player
    const footTy = Math.floor((this.y + this.h + 2) / TILE_SIZE);
    const leftTx = Math.floor((this.x - 4) / TILE_SIZE);
    const rightTx = Math.floor((this.x + this.w + 4) / TILE_SIZE);
    for (let tx = leftTx; tx <= rightTx; tx++) {
      const t = game.level.getTile(tx, footTy);
      if (t === TILE.CRACKED || t === TILE.BRICK) {
        game.level.setTile(tx, footTy, TILE.EMPTY);
        game.sound.playShatter();
        game.particles.spawnDebris(tx * 16 + 8, footTy * 16 + 8, '#9aa0ba', '#484b5e');
        game.addScore(50, tx * 16 + 8, footTy * 16, '+50');
      }
    }

    // Shockwave knocks nearby enemies
    for (const e of game.enemies) {
      if (!e.alive) continue;
      if (Math.hypot(e.cx - this.cx, e.cy - (this.y + this.h)) < 48) {
        e.onStomped(game, true);
      }
    }
  }

  _resolveX(level, phase) {
    const topTy = Math.floor(this.y / TILE_SIZE);
    const botTy = Math.floor((this.y + this.h - 0.01) / TILE_SIZE);

    if (this.vx > 0) {
      const rightTx = Math.floor((this.x + this.w) / TILE_SIZE);
      for (let ty = topTy; ty <= botTy; ty++) {
        if (level.isSolid(rightTx, ty, phase)) {
          this.x = rightTx * TILE_SIZE - this.w - 0.01;
          this.vx = 0;
          this.wallDir = 1;
          break;
        }
      }
    } else if (this.vx < 0) {
      const leftTx = Math.floor(this.x / TILE_SIZE);
      for (let ty = topTy; ty <= botTy; ty++) {
        if (level.isSolid(leftTx, ty, phase)) {
          this.x = (leftTx + 1) * TILE_SIZE + 0.01;
          this.vx = 0;
          this.wallDir = -1;
          break;
        }
      }
    }
    if (this.x < 0) {
      this.x = 0;
      this.vx = 0;
    }
    if (this.x + this.w > level.widthPx) {
      this.x = level.widthPx - this.w;
      this.vx = 0;
    }
  }

  _resolveY(level, phase, prevBottom, game) {
    const leftTx = Math.floor(this.x / TILE_SIZE);
    const rightTx = Math.floor((this.x + this.w - 0.01) / TILE_SIZE);

    if (this.vy >= 0) {
      const botTy = Math.floor((this.y + this.h) / TILE_SIZE);
      for (let tx = leftTx; tx <= rightTx; tx++) {
        const solid = level.isSolid(tx, botTy, phase);
        const oneWay = level.isOneWay(tx, botTy) && prevBottom <= botTy * TILE_SIZE + 4;
        if (solid || oneWay) {
          this.y = botTy * TILE_SIZE - this.h;
          this.vy = 0;
          this.onGround = true;
          const ft = level.getTile(tx, botTy);
          if (ft === TILE.CRUMBLE) {
            level.triggerCrumble(tx, botTy);
          } else if (ft === TILE.ICE) {
            this.onIce = true;
          }
          break;
        }
      }
    } else if (this.vy < 0) {
      const topTy = Math.floor(this.y / TILE_SIZE);
      let hitTiles = [];
      for (let tx = leftTx; tx <= rightTx; tx++) {
        if (level.isSolid(tx, topTy, phase)) {
          hitTiles.push(tx);
        }
      }
      if (hitTiles.length > 0) {
        // Corner correction: if only clipping one edge slightly, nudge smoothly around!
        if (hitTiles.length === 1) {
          const htx = hitTiles[0];
          const tileLeft = htx * TILE_SIZE;
          const tileRight = tileLeft + TILE_SIZE;
          if (this.x + this.w - tileLeft <= PHYSICS.CORNER_CORRECT_PX && !level.isSolid(htx - 1, topTy, phase)) {
            this.x = tileLeft - this.w - 0.05;
            return;
          }
          if (tileRight - this.x <= PHYSICS.CORNER_CORRECT_PX && !level.isSolid(htx + 1, topTy, phase)) {
            this.x = tileRight + 0.05;
            return;
          }
        }
        // Ceiling bonk! Trigger ? / Brick blocks
        this.y = (topTy + 1) * TILE_SIZE + 0.01;
        this.vy = 0;
        const centerTx = Math.floor(this.cx / TILE_SIZE);
        const hitTx = hitTiles.includes(centerTx) ? centerTx : hitTiles[0];
        game.onBlockBump(hitTx, topTy);
      }
    }
  }

  _checkHazards(level, game) {
    if (this.y > level.heightPx + 18) {
      this.hp = 0;
      this.dead = true;
      game.sound.playHurt();
      game.onPlayerDeath();
      return;
    }
    const leftTx = Math.floor((this.x + 2) / TILE_SIZE);
    const rightTx = Math.floor((this.x + this.w - 2) / TILE_SIZE);
    const topTy = Math.floor((this.y + 3) / TILE_SIZE);
    const botTy = Math.floor((this.y + this.h - 2) / TILE_SIZE);

    for (let ty = topTy; ty <= botTy; ty++) {
      for (let tx = leftTx; tx <= rightTx; tx++) {
        if (level.isHazard(tx, ty)) {
          this.hurt(game, -this.facing);
          return;
        }
      }
    }
  }

  _updateCape(dt, time) {
    const anchorX = this.cx - this.facing * 2;
    const anchorY = this.y + 7;
    this.cape[0].x = anchorX;
    this.cape[0].y = anchorY;

    const windX = -this.facing * 26 + Math.sin(time * 7) * 14;
    for (let i = 1; i < this.cape.length; i++) {
      const n = this.cape[i];
      const vx = (n.x - n.px) * 0.82;
      const vy = (n.y - n.py) * 0.82;
      n.px = n.x;
      n.py = n.y;
      n.x += vx + windX * dt * dt * 16;
      n.y += vy + 240 * dt * dt;
    }

    // Distance constraints
    const segLen = 2.6;
    for (let iter = 0; iter < 3; iter++) {
      this.cape[0].x = anchorX;
      this.cape[0].y = anchorY;
      for (let i = 1; i < this.cape.length; i++) {
        const a = this.cape[i - 1];
        const b = this.cape[i];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
        const dist = Math.hypot(dx, dy) || 0.001;
        const diff = (dist - segLen) / dist;
        b.x -= dx * diff;
        b.y -= dy * diff;
      }
    }
  }

  getSprite(atlas, phase) {
    const set = atlas.player[phase];
    const r = this.facing >= 0;
    if (!this.onGround && this.wallDir !== 0) {
      return this.wallDir > 0 ? set.wallR : set.wallL;
    }
    if (!this.onGround) {
      return r ? set.jumpR : set.jumpL;
    }
    if (Math.abs(this.vx) > 15) {
      const frame = Math.floor(this.animTimer) % 2;
      if (frame === 0) return r ? set.run1R : set.run1L;
      return r ? set.run2R : set.run2L;
    }
    return r ? set.idleR : set.idleL;
  }
}
