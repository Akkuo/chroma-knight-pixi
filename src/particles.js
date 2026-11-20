// Particles, shatter debris, floating combat/score text, phase ripples, and interactive grass

export class ParticleSystem {
  constructor() {
    this.particles = [];
    this.texts = [];
    this.ripples = [];
    this.afterimages = [];
    this.grass = [];
    this.ambient = [];
  }

  clear() {
    this.particles.length = 0;
    this.texts.length = 0;
    this.ripples.length = 0;
    this.afterimages.length = 0;
    this.grass.length = 0;
    this.ambient.length = 0;
  }

  initGrass(level) {
    this.grass.length = 0;
    for (let y = 1; y < level.height; y++) {
      for (let x = 0; x < level.width; x++) {
        if (level.getTile(x, y) === 1 && level.getTile(x, y - 1) === 0) {
          for (let i = 0; i < 3; i++) {
            this.grass.push({
              x: x * 16 + 2 + i * 5 + Math.random() * 2,
              y: y * 16,
              h: 4 + Math.random() * 4,
              angle: 0,
              vel: 0,
              phaseOffset: Math.random() * Math.PI * 2,
            });
          }
        }
      }
    }
  }

  initAmbient(widthPx, heightPx) {
    this.ambient.length = 0;
    for (let i = 0; i < 42; i++) {
      this.ambient.push({
        x: Math.random() * widthPx,
        y: Math.random() * heightPx,
        vx: (Math.random() - 0.5) * 10,
        vy: -4 - Math.random() * 10,
        size: Math.random() < 0.35 ? 2 : 1,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  burst(x, y, count, color, opts = {}) {
    const {
      speedMin = 20,
      speedMax = 110,
      lifeMin = 0.2,
      lifeMax = 0.55,
      gravity = 260,
      size = 2,
      glow = false,
      spread = Math.PI * 2,
      angleOffset = 0,
    } = opts;

    for (let i = 0; i < count; i++) {
      const a = angleOffset + (Math.random() - 0.5) * spread;
      const sp = speedMin + Math.random() * (speedMax - speedMin);
      this.particles.push({
        x,
        y,
        vx: Math.cos(a) * sp,
        vy: Math.sin(a) * sp,
        life: lifeMin + Math.random() * (lifeMax - lifeMin),
        maxLife: lifeMax,
        gravity,
        size: Math.random() < 0.3 ? size + 1 : size,
        color,
        glow,
      });
    }
  }

  spawnDebris(x, y, color1, color2) {
    for (let i = 0; i < 8; i++) {
      this.particles.push({
        x: x + (Math.random() - 0.5) * 10,
        y: y + (Math.random() - 0.5) * 10,
        vx: (Math.random() - 0.5) * 170,
        vy: -120 - Math.random() * 130,
        life: 0.65 + Math.random() * 0.35,
        maxLife: 1.0,
        gravity: 680,
        size: 3 + (i % 2),
        color: i % 2 === 0 ? color1 : color2,
        glow: false,
      });
    }
  }

  spawnText(x, y, text, color = '#fff4a3') {
    this.texts.push({
      x,
      y,
      vy: -36,
      text,
      color,
      life: 0.85,
      maxLife: 0.85,
    });
  }

  spawnRipple(x, y, color, maxRadius = 260) {
    this.ripples.push({
      x,
      y,
      r: 6,
      maxRadius,
      color,
      life: 0.34,
      maxLife: 0.34,
    });
  }

  spawnAfterimage(x, y, sprite, tint) {
    this.afterimages.push({
      x,
      y,
      sprite,
      tint,
      life: 0.18,
      maxLife: 0.18,
    });
  }

  disturbGrass(x, y, vx) {
    for (let i = 0; i < this.grass.length; i++) {
      const g = this.grass[i];
      if (Math.abs(g.x - x) < 12 && Math.abs(g.y - y) < 14) {
        g.vel += Math.max(-18, Math.min(18, vx * 0.11));
      }
    }
  }

  update(dt, time, levelWidthPx, levelHeightPx) {
    for (let i = this.particles.length - 1; i >= 0; i--) {
      const p = this.particles[i];
      p.life -= dt;
      if (p.life <= 0) {
        this.particles.splice(i, 1);
        continue;
      }
      p.vy += p.gravity * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
    }

    for (let i = this.texts.length - 1; i >= 0; i--) {
      const t = this.texts[i];
      t.life -= dt;
      if (t.life <= 0) {
        this.texts.splice(i, 1);
        continue;
      }
      t.y += t.vy * dt;
      t.vy *= 0.94;
    }

    for (let i = this.ripples.length - 1; i >= 0; i--) {
      const r = this.ripples[i];
      r.life -= dt;
      if (r.life <= 0) {
        this.ripples.splice(i, 1);
        continue;
      }
      const p = 1 - r.life / r.maxLife;
      r.r = 6 + (r.maxRadius - 6) * (1 - Math.pow(1 - p, 3));
    }

    for (let i = this.afterimages.length - 1; i >= 0; i--) {
      const a = this.afterimages[i];
      a.life -= dt;
      if (a.life <= 0) this.afterimages.splice(i, 1);
    }

    // Spring-damper physics on grass blades
    for (let i = 0; i < this.grass.length; i++) {
      const g = this.grass[i];
      const wind = Math.sin(time * 2.2 + g.phaseOffset) * 0.18;
      const target = wind;
      const force = (target - g.angle) * 48 - g.vel * 6.5;
      g.vel += force * dt;
      g.angle += g.vel * dt;
    }

    // Ambient fireflies / embers
    for (let i = 0; i < this.ambient.length; i++) {
      const a = this.ambient[i];
      a.x += (a.vx + Math.sin(time * 1.4 + a.phase) * 7) * dt;
      a.y += a.vy * dt;
      if (a.y < -8) {
        a.y = levelHeightPx + 4;
        a.x = Math.random() * levelWidthPx;
      }
      if (a.x < 0) a.x = levelWidthPx;
      if (a.x > levelWidthPx) a.x = 0;
    }
  }
}
