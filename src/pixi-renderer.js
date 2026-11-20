import * as PIXI from 'https://cdn.jsdelivr.net/npm/pixi.js@8.6.6/dist/pixi.min.mjs';
import { GAME_WIDTH, GAME_HEIGHT, TILE, TILE_SIZE, PHASE, PALETTES, BIOME_THEMES, STATE } from './constants.js';

// Custom PixiJS v8 GLSL Filter: Refractive Shockwave + 9-Tap Bloom + Chromatic Aberration
const CHROMA_FILTER_FRAG = `
precision mediump float;
varying vec2 vTextureCoord;
uniform sampler2D uTexture;
uniform float uAberration;
uniform float uShockTime;
uniform vec2 uShockCenter;
uniform float uPhaseMix;
uniform float uBloom;

vec3 sampleBright(vec2 uv) {
  vec3 c = texture2D(uTexture, clamp(uv, 0.001, 0.999)).rgb;
  float l = dot(c, vec3(0.299, 0.587, 0.114));
  return c * smoothstep(0.68, 0.96, l);
}

void main() {
  vec2 uv = vTextureCoord;

  // 1. Refractive Space-Warping Shockwave Ring (triggers on Phase Shift / Ground Pound / Boss Hit)
  if (uShockTime < 0.75) {
    vec2 diff = uv - uShockCenter;
    float d = length(diff);
    float radius = uShockTime * 1.15;
    float band = 1.0 - smoothstep(0.0, 0.09, abs(d - radius));
    float fade = 1.0 - (uShockTime / 0.75);
    vec2 dir = d > 0.0001 ? diff / d : vec2(0.0);
    uv -= dir * band * fade * 0.022;
  }

  // 2. Radial Chromatic Aberration
  vec2 centered = uv - vec2(0.5);
  float dist = length(centered);
  vec2 cdir = dist > 0.0001 ? centered / dist : vec2(0.0);
  float ca = uAberration * (0.003 + dist * 0.016);
  vec3 base = vec3(
    texture2D(uTexture, clamp(uv + cdir * ca, 0.001, 0.999)).r,
    texture2D(uTexture, clamp(uv, 0.001, 0.999)).g,
    texture2D(uTexture, clamp(uv - cdir * ca, 0.001, 0.999)).b
  );

  // 3. 9-Tap Multi-Sample Bloom
  vec2 px = vec2(0.0022, 0.0038);
  vec3 bloom = sampleBright(uv) * 0.24;
  bloom += (sampleBright(uv + vec2(px.x, 0.0)) + sampleBright(uv - vec2(px.x, 0.0))
          + sampleBright(uv + vec2(0.0, px.y)) + sampleBright(uv - vec2(0.0, px.y))) * 0.12;
  bloom += (sampleBright(uv + px * 1.4) + sampleBright(uv - px * 1.4)
          + sampleBright(uv + vec2(px.x, -px.y) * 1.4) + sampleBright(uv + vec2(-px.x, px.y) * 1.4)) * 0.07;

  vec3 tint = mix(vec3(1.08, 0.96, 0.85), vec3(0.84, 0.98, 1.12), uPhaseMix);
  vec3 col = base + bloom * tint * uBloom;
  gl_FragColor = vec4(col, 1.0);
}
`;

function toNearestTexture(canvas) {
  const tex = PIXI.Texture.from(canvas);
  tex.source.scaleMode = 'nearest';
  return tex;
}

function hexNum(css) {
  return parseInt(css.replace('#', ''), 16);
}

class SpritePool {
  constructor(parent) {
    this.parent = parent;
    this.pool = [];
    this.used = 0;
  }

  begin() {
    this.used = 0;
  }

  draw(tex, x, y, opts = {}) {
    let spr = this.pool[this.used];
    if (!spr) {
      spr = new PIXI.Sprite(tex);
      this.parent.addChild(spr);
      this.pool.push(spr);
    } else if (spr.texture !== tex) {
      spr.texture = tex;
    }
    spr.visible = true;
    spr.x = x;
    spr.y = y;
    spr.alpha = opts.alpha ?? 1;
    spr.tint = opts.tint ?? 0xffffff;
    spr.scale.set(opts.scaleX ?? 1, opts.scaleY ?? 1);
    spr.anchor.set(opts.anchorX ?? 0, opts.anchorY ?? 0);
    this.used++;
    return spr;
  }

  end() {
    for (let i = this.used; i < this.pool.length; i++) {
      this.pool[i].visible = false;
    }
  }
}

export class PixiRenderer {
  constructor(mountEl, atlas) {
    this.mountEl = mountEl;
    this.atlas = atlas;
    this.app = null;
    this.textures = { tiles: {}, biomes: {}, player: { solar: {}, lunar: {} }, enemies: {}, items: {} };
    this.filtersEnabled = true;
    this.aberration = 0;
    this.shockTime = 2.0;
    this.shockCenter = new Float32Array([0.5, 0.5]);
    this.phaseMix = 0;
    this.activeSprites = 0;
    this.stars = [];
    for (let i = 0; i < 64; i++) {
      this.stars.push({
        x: Math.random() * GAME_WIDTH,
        y: Math.random() * (GAME_HEIGHT * 0.65),
        size: Math.random() < 0.25 ? 2 : 1,
        speed: 1.5 + Math.random() * 3,
        phase: Math.random() * Math.PI * 2,
      });
    }
  }

  async init() {
    const app = new PIXI.Application();
    const rect = this.mountEl.getBoundingClientRect();
    await app.init({
      width: Math.max(960, Math.round(rect.width || 960)),
      height: Math.max(540, Math.round(rect.height || 540)),
      backgroundColor: 0x0a0c16,
      antialias: false,
      resolution: Math.min(window.devicePixelRatio || 1, 2),
      autoDensity: true,
    });
    this.app = app;
    app.canvas.style.width = '100%';
    app.canvas.style.height = '100%';
    app.canvas.style.display = 'block';
    this.mountEl.innerHTML = '';
    this.mountEl.appendChild(app.canvas);

    this._bakeGpuTextures();

    // --- PIXI SCENE GRAPH ---
    this.sceneContainer = new PIXI.Container();
    this.bgGfx = new PIXI.Graphics();
    this.godrayGfx = new PIXI.Graphics();
    this.godrayGfx.blendMode = 'add';

    this.worldContainer = new PIXI.Container();
    this.tileSpritesContainer = new PIXI.Container();
    this.worldGfx = new PIXI.Graphics();
    this.entitySpritesContainer = new PIXI.Container();
    this.fxGfx = new PIXI.Graphics();
    this.fxGfx.blendMode = 'add';

    this.worldContainer.addChild(
      this.tileSpritesContainer,
      this.worldGfx,
      this.entitySpritesContainer,
      this.fxGfx
    );

    this.sceneContainer.addChild(this.bgGfx, this.godrayGfx, this.worldContainer);

    // Crisp Hi-Res HUD Container (outside world filter so text never blurs during shockwaves!)
    this.hudContainer = new PIXI.Container();
    this.hudGfx = new PIXI.Graphics();
    this.hudSpritesContainer = new PIXI.Container();
    this.hudTextsContainer = new PIXI.Container();
    this.hudContainer.addChild(this.hudGfx, this.hudSpritesContainer, this.hudTextsContainer);

    app.stage.addChild(this.sceneContainer, this.hudContainer);

    this.tilePool = new SpritePool(this.tileSpritesContainer);
    this.entityPool = new SpritePool(this.entitySpritesContainer);
    this.hudIconPool = new SpritePool(this.hudSpritesContainer);

    // Pre-create reusable HUD Text objects
    const font = '"Noto Sans TC", "Microsoft JhengHei", ui-monospace, sans-serif';
    this.txtPhase = this._makeText('', 13, 0xffe38a, font, true);
    this.txtDash = this._makeText('DASH', 13, 0xd8fff4, font, true);
    this.txtStage = this._makeText('', 15, 0xedf2ff, font, true, 0.5);
    this.txtCoins = this._makeText('', 14, 0xffe169, 'ui-monospace, monospace', true, 1);
    this.txtScore = this._makeText('', 14, 0xffffff, 'ui-monospace, monospace', true, 1);
    this.txtTime = this._makeText('', 14, 0xa7bce8, 'ui-monospace, monospace', true, 1);
    this.txtGpu = this._makeText('', 11, 0x7dffb2, 'ui-monospace, monospace', true, 0);
    this.txtCombo = this._makeText('', 20, 0xffdf5c, 'ui-monospace, sans-serif', true, 0);
    this.txtHint = this._makeText('', 14, 0xf0f5ff, font, false, 0.5);
    this.txtBoss = this._makeText('PRISM GOLEM — 稜鏡巨像', 14, 0xff8a9e, font, true, 0.5);
    this.txtOverlayTitle = this._makeText('', 54, 0xffd561, 'ui-monospace, monospace', true, 0.5);
    this.txtOverlaySub = this._makeText('', 22, 0xedf3ff, font, true, 0.5);
    this.txtOverlayBody = this._makeText('', 15, 0xc4d3f5, font, false, 0.5);
    this.txtOverlayPrompt = this._makeText('', 21, 0xfff0a0, font, true, 0.5);
    this.txtOverlayFoot = this._makeText('', 13, 0x9db2de, font, false, 0.5);

    this.floatingTextPool = [];

    // Custom PixiJS v8 Filter (Shockwave + Bloom + Chromatic Aberration)
    try {
      this.chromaFilter = new PIXI.Filter({
        glProgram: PIXI.GlProgram.from({
          vertex: PIXI.defaultFilterVert,
          fragment: CHROMA_FILTER_FRAG,
        }),
        resources: {
          chromaUniforms: {
            uAberration: { value: 0, type: 'f32' },
            uShockTime: { value: 2.0, type: 'f32' },
            uShockCenter: { value: this.shockCenter, type: 'vec2<f32>' },
            uPhaseMix: { value: 0, type: 'f32' },
            uBloom: { value: 0.34, type: 'f32' },
          },
        },
      });
      this.sceneContainer.filters = [this.chromaFilter];
    } catch (err) {
      console.warn('PixiJS custom filter fallback:', err);
      this.chromaFilter = null;
    }

    this.resize();
  }

  _makeText(str, size, fill, fontFamily, bold = false, anchorX = 0) {
    const t = new PIXI.Text({
      text: str,
      style: {
        fontFamily,
        fontSize: size,
        fontWeight: bold ? '800' : '600',
        fill,
        dropShadow: { color: 0x0a0a16, distance: 2, alpha: 0.85 },
      },
    });
    t.anchor.set(anchorX, 0);
    this.hudTextsContainer.addChild(t);
    return t;
  }

  _bakeGpuTextures() {
    for (const [k, c] of Object.entries(this.atlas.tiles)) {
      this.textures.tiles[k] = toNearestTexture(c);
    }
    for (const [bName, bObj] of Object.entries(this.atlas.biomes)) {
      this.textures.biomes[bName] = {
        groundSolar: toNearestTexture(bObj.groundSolar),
        groundLunar: toNearestTexture(bObj.groundLunar),
        dirtSolar: toNearestTexture(bObj.dirtSolar),
        dirtLunar: toNearestTexture(bObj.dirtLunar),
      };
    }
    for (const ph of ['solar', 'lunar']) {
      for (const [k, c] of Object.entries(this.atlas.player[ph])) {
        this.textures.player[ph][k] = toNearestTexture(c);
      }
    }
    for (const [k, c] of Object.entries(this.atlas.enemies)) {
      this.textures.enemies[k] = toNearestTexture(c);
    }
    for (const [k, c] of Object.entries(this.atlas.items)) {
      this.textures.items[k] = toNearestTexture(c);
    }
  }

  get canvas() {
    return this.app ? this.app.canvas : null;
  }

  resize() {
    if (!this.app) return;
    const rect = this.mountEl.getBoundingClientRect();
    const w = Math.max(640, Math.round(rect.width || 960));
    const h = Math.max(360, Math.round(rect.height || 540));
    this.app.renderer.resize(w, h);
    this.sceneScaleX = w / GAME_WIDTH;
    this.sceneScaleY = h / GAME_HEIGHT;
    this.sceneContainer.scale.set(this.sceneScaleX, this.sceneScaleY);
    this.hudContainer.scale.set(w / 960, h / 540);
  }

  triggerShockwave(strength = 1.0, normX = 0.5, normY = 0.5) {
    this.aberration = Math.max(this.aberration, strength);
    this.shockTime = 0.0;
    this.shockCenter[0] = Math.max(0.05, Math.min(0.95, normX));
    this.shockCenter[1] = Math.max(0.05, Math.min(0.95, normY));
  }

  updateEffects(dt, isLunar) {
    const target = isLunar ? 1 : 0;
    this.phaseMix += (target - this.phaseMix) * Math.min(1, dt * 8);
    if (this.aberration > 0.002) this.aberration *= Math.pow(0.004, dt);
    else this.aberration = 0;
    if (this.shockTime < 1.2) this.shockTime += dt * 1.35;

    if (this.chromaFilter) {
      const u = this.chromaFilter.resources.chromaUniforms.uniforms;
      u.uAberration = this.aberration;
      u.uShockTime = this.shockTime;
      u.uShockCenter = this.shockCenter;
      u.uPhaseMix = this.phaseMix;
      u.uBloom = 0.34;
      this.sceneContainer.filters = this.filtersEnabled ? [this.chromaFilter] : null;
    }
  }

  render(game) {
    if (!this.app) return;
    const { phase, time, level, player, particles, camera } = game;
    const biomeId = (level && level.biome) || 'ruins';
    const biomeDef = BIOME_THEMES[biomeId] || BIOME_THEMES.ruins;
    const pal = { ...PALETTES[phase], ...biomeDef[phase] };

    const camX = Math.round(camera.x + camera.shakeX);
    const camY = Math.round(camera.y + camera.shakeY);
    this.worldContainer.position.set(-camX, -camY);

    // 1. Background & Godrays
    this._drawBackground(pal, biomeDef, phase, time, camera.x);

    // 2. GPU Tilemap & Entities
    this.tilePool.begin();
    this.entityPool.begin();
    this.worldGfx.clear();
    this.fxGfx.clear();

    if (level) {
      this._drawTiles(level, phase, time, camX);
      this._drawInteractiveGrass(particles.grass, pal.grass);
      this._drawUpdrafts(game.updrafts, phase, time);
      this._drawPlatforms(game.platforms, phase);
      this._drawSprings(game.springs);
      this._drawBoostRings(game.boostRings, phase, time);
      this._drawFirebars(game.firebars, time);
      this._drawCheckpoints(game.checkpoints, time, phase);
      this._drawPickups(game.coinsList, game.hearts, game.dashCrystals, time);
      this._drawEnemies(game.enemies, phase, time);
      if (game.boss && game.boss.alive) this._drawBoss(game.boss, time);
      this._drawProjectiles(game.projectiles, phase, time);
    }

    if (game.state === STATE.PLAYING && !(game.editor && game.editor.active)) {
      this._drawGhost(game, time);
    }
    if (player && !player.dead && game.state !== STATE.TITLE) {
      this._drawCape(player, pal);
      this._drawPlayer(player, phase, time);
    }

    if (level) {
      this._drawAmbient(particles.ambient, biomeDef.weather, phase, time, camX);
      this._drawParticles(particles.particles);
      this._drawRipples(particles.ripples);
      this._drawAdditiveLights(game, phase, time);
      if (game.editor && game.editor.active) {
        this._drawEditorGrid(game.editor, camX);
      }
    }

    this.tilePool.end();
    this.entityPool.end();
    this.activeSprites = this.tilePool.used + this.entityPool.used;

    // 3. Hi-Res HUD & Overlays
    this._drawHUD(game, camX, camY, time);
  }

  _drawBackground(pal, biomeDef, phase, time, camX) {
    const g = this.bgGfx;
    g.clear();

    // Multi-band sky gradient
    const bands = 10;
    const cTop = hexNum(pal.skyTop);
    const cMid = hexNum(pal.skyMid);
    const cBot = hexNum(pal.skyBot);
    const lerpCol = (a, b, t) => {
      const ar = (a >> 16) & 255, ag = (a >> 8) & 255, ab = a & 255;
      const br = (b >> 16) & 255, bg = (b >> 8) & 255, bb = b & 255;
      return ((Math.round(ar + (br - ar) * t) << 16) | (Math.round(ag + (bg - ag) * t) << 8) | Math.round(ab + (bb - ab) * t));
    };
    for (let i = 0; i < bands; i++) {
      const t = i / (bands - 1);
      const col = t < 0.55 ? lerpCol(cTop, cMid, t / 0.55) : lerpCol(cMid, cBot, (t - 0.55) / 0.45);
      g.rect(0, (i / bands) * GAME_HEIGHT, GAME_WIDTH, GAME_HEIGHT / bands + 1).fill(col);
    }

    // Stars
    const starAlpha = phase === PHASE.LUNAR || biomeDef.bgStyle === 'aurora' || biomeDef.bgStyle === 'cathedral' ? 0.88 : 0.25;
    for (const s of this.stars) {
      const tw = 0.4 + 0.6 * Math.sin(time * s.speed + s.phase);
      g.rect(Math.floor(s.x), Math.floor(s.y), s.size, s.size).fill({ color: 0xebf8ff, alpha: tw * starAlpha });
    }

    // Aurora Borealis for Stage 5
    if (biomeDef.bgStyle === 'aurora') {
      for (let b = 0; b < 3; b++) {
        const col = b === 0 ? 0x48f5d2 : b === 1 ? 0x5cb4ff : 0xba78ff;
        g.moveTo(0, 42 + b * 18);
        for (let x = 0; x <= GAME_WIDTH; x += 24) {
          g.lineTo(x, 42 + b * 18 + Math.sin(x * 0.018 + time * 1.4 + b * 2) * 14);
        }
        g.stroke({ width: 9, color: col, alpha: 0.22 });
      }
    }

    // Sun / Crescent Moon
    const orbX = 365 - ((camX * 0.03) % 80);
    const orbY = 58;
    g.circle(orbX, orbY, 34).fill({ color: hexNum(pal.sunColor), alpha: 0.14 });
    g.circle(orbX, orbY, 16).fill(hexNum(pal.sunColor));
    if (phase === PHASE.LUNAR) {
      g.circle(orbX + 6, orbY - 3, 13).fill(cTop);
    }

    // Parallax Mountains
    this._drawMountains(g, camX * 0.14, 168, 52, 72, hexNum(pal.mountainFar));
    this._drawMountains(g, camX * 0.3, 196, 36, 54, hexNum(pal.mountainMid));

    // Biome landmarks
    const scroll = camX * 0.42;
    const pCol = hexNum(pal.propColor);
    if (biomeDef.bgStyle === 'arches' || biomeDef.bgStyle === 'cathedral') {
      const sp = 96;
      const start = Math.floor(scroll / sp) - 1;
      for (let i = start; i < start + 7; i++) {
        const ax = Math.floor(i * sp - scroll);
        const h = 42 + (Math.abs(i * 17) % 3) * 14;
        g.rect(ax, GAME_HEIGHT - h - 22, 10, h + 22).fill(pCol);
        g.rect(ax + 24, GAME_HEIGHT - h - 22, 10, h + 22).fill(pCol);
        g.rect(ax - 2, GAME_HEIGHT - h - 26, 38, 6).fill(pCol);
        if (biomeDef.bgStyle === 'cathedral') {
          g.rect(ax + 12, GAME_HEIGHT - h - 14, 10, 34).fill({ color: phase === PHASE.LUNAR ? 0x5ce0ff : 0xffd260, alpha: 0.35 });
        }
      }
    } else if (biomeDef.bgStyle === 'crystals') {
      const sp = 84;
      const start = Math.floor(scroll / sp) - 1;
      for (let i = start; i < start + 8; i++) {
        const cx = Math.floor(i * sp - scroll);
        const h = 48 + (Math.abs(i * 23) % 4) * 16;
        g.poly([cx, GAME_HEIGHT, cx + 11, GAME_HEIGHT - h - 18, cx + 22, GAME_HEIGHT]).fill(pCol);
      }
    } else if (biomeDef.bgStyle === 'waterfalls') {
      const sp = 104;
      const start = Math.floor(scroll / sp) - 1;
      for (let i = start; i < start + 7; i++) {
        const wx = Math.floor(i * sp - scroll);
        g.rect(wx, 92, 14, GAME_HEIGHT - 92).fill(pCol);
        g.rect(wx + 42, 92, 14, GAME_HEIGHT - 92).fill(pCol);
        g.rect(wx + 16, 96, 24, GAME_HEIGHT - 96).fill({ color: phase === PHASE.LUNAR ? 0x48e0f5 : 0x80f5e1, alpha: 0.34 });
      }
    } else if (biomeDef.bgStyle === 'gears') {
      const sp = 112;
      const start = Math.floor(scroll / sp) - 1;
      for (let i = start; i < start + 7; i++) {
        const gx = Math.floor(i * sp - scroll) + 32;
        const gy = 160 + (i % 2) * 28;
        const r = i % 2 === 0 ? 24 : 16;
        g.circle(gx, gy, r).fill(pCol);
        g.circle(gx, gy, r * 0.4).fill(hexNum(pal.mountainMid));
      }
    }

    // PixiJS Exclusive Additive Godray Light Shafts!
    const gr = this.godrayGfx;
    gr.clear();
    const rayCol = phase === PHASE.LUNAR ? 0x5ce0ff : 0xffd878;
    for (let i = 0; i < 4; i++) {
      const rx = ((i * 140 - camX * 0.12 + Math.sin(time * 0.7 + i) * 16) % (GAME_WIDTH + 120) + GAME_WIDTH + 120) % (GAME_WIDTH + 120) - 60;
      gr.poly([rx, 0, rx + 34, 0, rx - 38, GAME_HEIGHT, rx - 78, GAME_HEIGHT]).fill({ color: rayCol, alpha: 0.055 });
    }
  }

  _drawMountains(g, offset, baseY, amp, step, col) {
    const pts = [0, GAME_HEIGHT];
    const startIdx = Math.floor(offset / step) - 1;
    for (let i = startIdx; i <= startIdx + Math.ceil(GAME_WIDTH / step) + 2; i++) {
      pts.push(i * step - offset, baseY - Math.abs(Math.sin(i * 1.7 + 0.5)) * amp);
    }
    pts.push(GAME_WIDTH, GAME_HEIGHT);
    g.poly(pts).fill(col);
  }

  _drawTiles(level, phase, time, camX) {
    const startTx = Math.max(0, Math.floor(camX / TILE_SIZE) - 1);
    const endTx = Math.min(level.width - 1, Math.ceil((camX + GAME_WIDTH) / TILE_SIZE) + 1);
    const t = this.textures.tiles;
    const bt = this.textures.biomes[level.biome] || t;
    const isLunar = phase === PHASE.LUNAR;
    const qTex = Math.floor(time * 4) % 2 === 0 ? t.question : t.questionGlow;
    const wg = this.worldGfx;

    for (let ty = 0; ty < level.height; ty++) {
      for (let tx = startTx; tx <= endTx; tx++) {
        const idx = ty * level.width + tx;
        const tile = level.tiles[idx];
        if (tile === TILE.EMPTY) continue;
        const px = tx * TILE_SIZE;
        const py = ty * TILE_SIZE + level.bumpOffsets[idx];

        switch (tile) {
          case TILE.GROUND: this.tilePool.draw(isLunar ? bt.groundLunar : bt.groundSolar, px, py); break;
          case TILE.DIRT: this.tilePool.draw(isLunar ? bt.dirtLunar : bt.dirtSolar, px, py); break;
          case TILE.ICE: this.tilePool.draw(t.ice, px, py); break;
          case TILE.BRICK: this.tilePool.draw(t.brick, px, py); break;
          case TILE.QUESTION: this.tilePool.draw(qTex, px, py); break;
          case TILE.USED: this.tilePool.draw(t.used, px, py); break;
          case TILE.CRACKED: this.tilePool.draw(t.cracked, px, py); break;
          case TILE.ONE_WAY: this.tilePool.draw(t.oneWay, px, py); break;
          case TILE.SPIKE: this.tilePool.draw(t.spike, px, py); break;
          case TILE.PILLAR: this.tilePool.draw(t.pillar, px, py); break;
          case TILE.SOLAR_BLOCK: this.tilePool.draw(phase === PHASE.SOLAR ? t.solarSolid : t.solarGhost, px, py); break;
          case TILE.LUNAR_BLOCK: this.tilePool.draw(phase === PHASE.LUNAR ? t.lunarSolid : t.lunarGhost, px, py); break;
          case TILE.CRUMBLE: {
            const c = level.crumbleTimers.get(idx);
            if (!c) this.tilePool.draw(t.crumble, px, py);
            else if (c.state === 'shaking') this.tilePool.draw(t.crumble, px + (Math.random() - 0.5) * 3, py);
            else wg.rect(px + 2, py + 2, 12, 12).stroke({ width: 1, color: 0xd6bca5, alpha: 0.3 });
            break;
          }
          case TILE.WATER: {
            const wave = Math.sin(time * 4 + tx * 0.9) * 1.5;
            wg.rect(px, py + 3 + wave, 16, 13 - wave).fill({ color: isLunar ? 0x2aa8e0 : 0x36b4d2, alpha: 0.65 });
            wg.rect(px, py + 3 + wave, 16, 2).fill({ color: 0xd2faff, alpha: 0.75 });
            break;
          }
          case TILE.LAVA: {
            const wave = Math.sin(time * 5 + tx * 1.1) * 1.6;
            wg.rect(px, py + 3 + wave, 16, 13 - wave).fill(0xd9342b);
            wg.rect(px, py + 3 + wave, 16, 3).fill(0xff9838);
            break;
          }
          case TILE.GOAL_GATE: {
            wg.rect(px - 2, py - 20, 20, 36).fill(0x333652);
            wg.rect(px + 2, py - 15, 12, 31).fill(0x1b1433);
            wg.rect(px + 4, py - 11, 8, 22).fill(0xffbe44);
            wg.rect(px + 6, py - 7, 4, 14).fill(0x4ae3ff);
            break;
          }
        }
      }
    }
  }

  _drawInteractiveGrass(grass, cssColor) {
    const wg = this.worldGfx;
    const col = hexNum(cssColor || '#74e86b');
    for (let i = 0; i < grass.length; i++) {
      const g = grass[i];
      wg.moveTo(g.x, g.y).lineTo(g.x + Math.sin(g.angle) * g.h, g.y - Math.cos(g.angle) * g.h);
    }
    wg.stroke({ width: 1, color: col });
  }

  _drawUpdrafts(updrafts, phase, time) {
    const wg = this.worldGfx;
    const col = phase === PHASE.LUNAR ? 0x78f5ff : 0xfff2b9;
    for (const u of updrafts || []) {
      wg.rect(u.x, u.y, u.w, u.h).fill({ color: col, alpha: 0.18 });
      for (let i = 0; i < 5; i++) {
        const sy = u.y + u.h - ((time * 120 + i * 27) % u.h);
        wg.rect(u.x + 3 + i * 4.5, sy, 1.5, 10).fill({ color: 0xffffff, alpha: 0.55 });
      }
    }
  }

  _drawPlatforms(platforms, phase) {
    const wg = this.worldGfx;
    const acc = phase === PHASE.LUNAR ? 0x4ae3ff : 0xffba42;
    for (const p of platforms) {
      wg.rect(Math.round(p.x), Math.round(p.y), p.w, p.h).fill(0x24273d);
      wg.rect(Math.round(p.x) + 1, Math.round(p.y) + 1, p.w - 2, p.h - 2).fill(0x5d658c);
      wg.rect(Math.round(p.x) + 2, Math.round(p.y) + 1, p.w - 4, 2).fill(acc);
    }
  }

  _drawSprings(springs) {
    const wg = this.worldGfx;
    for (const s of springs) {
      const comp = s.compress * 5;
      wg.rect(s.x + 1, s.y + 7, 14, 3).fill(0x2c2f45);
      wg.rect(s.x + 5, s.y + 3 + comp, 6, 4 - comp * 0.5).fill(0x9aa4c2);
      wg.rect(s.x + 1, s.y + comp, 14, 4).fill(0xff4b5c);
    }
  }

  _drawBoostRings(rings, phase, time) {
    const wg = this.worldGfx;
    const col = phase === PHASE.LUNAR ? 0x4ae3ff : 0xffd54f;
    for (const r of rings || []) {
      const cx = r.x + 9, cy = r.y + 9;
      wg.circle(cx, cy, 8 + Math.sin(time * 8) * 1.4).stroke({ width: 2, color: col, alpha: r.cooldown > 0 ? 0.3 : 0.95 });
      wg.circle(cx + r.dirX * 3, cy + r.dirY * 3, 2.5).fill(0xffffff);
    }
  }

  _drawFirebars(firebars, time) {
    const wg = this.worldGfx;
    for (const fb of firebars || []) {
      wg.rect(fb.cx - 4, fb.cy - 4, 8, 8).fill(0x292230);
      for (let i = 1; i <= fb.count; i++) {
        const fx = fb.cx + Math.cos(fb.angle) * (i * 11);
        const fy = fb.cy + Math.sin(fb.angle) * (i * 11);
        wg.circle(fx, fy, 4 + Math.sin(time * 18 + i) * 0.5).fill(0xff4229);
        wg.circle(fx, fy, 2).fill(0xfff399);
      }
    }
  }

  _drawCheckpoints(checkpoints, time, phase) {
    const wg = this.worldGfx;
    for (const cp of checkpoints) {
      wg.rect(cp.x + 7, cp.y + 6, 2, 18).fill(0x363b54);
      wg.rect(cp.x + 4, cp.y + 2, 8, 8).fill(0x24273b);
      const lit = cp.active ? (phase === PHASE.LUNAR ? 0x6ef3ff : 0xffd966) : 0x474c66;
      wg.rect(cp.x + 5, cp.y + 3, 6, 6).fill(lit);
    }
  }

  _drawPickups(coins, hearts, crystals, time) {
    for (const c of coins) {
      if (c.collected) continue;
      const sx = Math.max(0.25, Math.abs(Math.cos(time * 5 + c.phase)));
      this.entityPool.draw(this.textures.items.coin, Math.round(c.x + 5), Math.round(c.y + 5), { scaleX: sx, anchorX: 0.5, anchorY: 0.5 });
    }
    for (const h of hearts) {
      if (!h.collected) this.entityPool.draw(this.textures.items.heart, Math.round(h.x), Math.round(h.y));
    }
    for (const d of crystals) {
      if (d.cooldown <= 0) this.entityPool.draw(this.textures.items.dashCrystal, Math.round(d.x), Math.round(d.y));
      else this.worldGfx.rect(d.x + 2, d.y + 2, 8, 8).stroke({ width: 1, color: 0x4af7c8, alpha: 0.35 });
    }
  }

  _drawEnemies(enemies, phase, time) {
    const te = this.textures.enemies;
    for (const e of enemies) {
      if (!e.alive) continue;
      if (e.type === 'slime') {
        this.entityPool.draw(Math.floor(time * 6) % 2 === 0 ? te.slime1 : te.slime2, Math.round(e.x - 1), Math.round(e.y - 2));
      } else if (e.type === 'beetle') {
        const tex = e.state === 'walk' ? (e.vx >= 0 ? te.beetleR : te.beetleL) : te.shell;
        this.entityPool.draw(tex, Math.round(e.x - 1), Math.round(e.y - 1));
      } else if (e.type === 'wisp') {
        const tangible = e.wispPhase === phase;
        this.entityPool.draw(e.wispPhase === PHASE.SOLAR ? te.wispSolar : te.wispLunar, Math.round(e.x - 2), Math.round(e.y), { alpha: tangible ? 1 : 0.28 });
      }
    }
  }

  _drawBoss(boss, time) {
    const wg = this.worldGfx;
    const isSolar = boss.bossPhase === PHASE.SOLAR;
    const main = isSolar ? 0xff9d2e : 0x32c8ff;
    const core = isSolar ? 0xfff4a3 : 0xd8fcff;
    const flash = boss.hurtTimer > 0 && Math.floor(time * 24) % 2 === 0;
    const bx = Math.round(boss.x), by = Math.round(boss.y);
    wg.rect(bx, by + 4, 32, 28).fill(flash ? 0xffffff : 0x3a3f63);
    wg.rect(bx + 8, by - 2, 16, 8).fill(main);
    wg.rect(bx + 12, by, 8, 4).fill(core);
    wg.rect(bx + 6, by + 12, 6, 5).fill(main);
    wg.rect(bx + 20, by + 12, 6, 5).fill(main);
    wg.rect(bx + 11, by + 20, 10, 6).fill(core);
  }

  _drawProjectiles(projectiles, phase) {
    const wg = this.worldGfx;
    for (const p of projectiles) {
      if (!p.alive) continue;
      const col = p.phase === PHASE.SOLAR ? 0xffae38 : 0x4ae3ff;
      wg.circle(p.x + 4, p.y + 4, 4.5).fill({ color: col, alpha: p.phase === phase ? 1 : 0.25 });
      wg.rect(p.x + 3, p.y + 3, 2, 2).fill(0xffffff);
    }
  }

  _drawGhost(game, time) {
    const gf = game.ghost.getPlaybackFrame(game.stageTime);
    if (!gf) return;
    const set = this.textures.player[gf.phase];
    const r = gf.facing >= 0;
    const tex = gf.pose === 2 ? (r ? set.jumpR : set.jumpL) : (r ? set.idleR : set.idleL);
    this.entityPool.draw(tex, Math.round(gf.x - 3), Math.round(gf.y - 3), { alpha: 0.42 + Math.sin(time * 8) * 0.08, tint: 0x7ef7ff });
  }

  _drawCape(player, pal) {
    const wg = this.worldGfx;
    const pts = player.cape;
    const col = hexNum(pal.cape);
    const tip = hexNum(pal.capeTip);
    for (let i = 0; i < pts.length - 1; i++) {
      wg.moveTo(pts[i].x, pts[i].y).lineTo(pts[i + 1].x, pts[i + 1].y).stroke({
        width: Math.max(2, 5 - i * 0.6),
        color: i >= pts.length - 2 ? tip : col,
      });
    }
  }

  _drawPlayer(player, phase, time) {
    if (player.invulnTimer > 0 && Math.floor(time * 20) % 2 === 0) return;
    const set = this.textures.player[phase];
    const r = player.facing >= 0;
    let tex = r ? set.idleR : set.idleL;
    if (!player.onGround && player.wallDir !== 0) tex = player.wallDir > 0 ? set.wallR : set.wallL;
    else if (!player.onGround) tex = r ? set.jumpR : set.jumpL;
    else if (Math.abs(player.vx) > 15) tex = Math.floor(player.animTimer) % 2 === 0 ? (r ? set.run1R : set.run1L) : (r ? set.run2R : set.run2L);

    this.entityPool.draw(tex, Math.round(player.x + player.w * 0.5), Math.round(player.y + player.h), {
      anchorX: 0.5,
      anchorY: 1,
      scaleX: player.scaleX,
      scaleY: player.scaleY,
    });
  }

  _drawAmbient(ambient, weather, phase, time, camX) {
    const fg = this.fxGfx;
    if (weather === 'rain') {
      for (let i = 0; i < 42; i++) {
        const rx = camX + (((i * 37 - time * 140) % GAME_WIDTH) + GAME_WIDTH) % GAME_WIDTH;
        const ry = (i * 29 + time * 260) % GAME_HEIGHT;
        fg.moveTo(rx, ry).lineTo(rx - 3, ry + 8);
      }
      fg.stroke({ width: 1, color: 0x9ef6ff, alpha: 0.35 });
      return;
    }
    if (weather === 'snow') {
      for (let i = 0; i < 40; i++) {
        const sx = camX + (((i * 41 + Math.sin(time * 1.5 + i) * 18 - time * 16) % GAME_WIDTH) + GAME_WIDTH) % GAME_WIDTH;
        const sy = (i * 23 + time * (26 + (i % 3) * 10)) % GAME_HEIGHT;
        fg.rect(sx, sy, 2, 2).fill({ color: 0xe8fbff, alpha: 0.6 });
      }
      return;
    }
    const col = weather === 'embers' ? 0xff7b2e : phase === PHASE.LUNAR ? 0x80f4ff : 0xffd573;
    for (const a of ambient) {
      fg.rect(a.x, a.y, a.size, a.size).fill({ color: col, alpha: 0.45 });
    }
  }

  _drawParticles(list) {
    const fg = this.fxGfx;
    for (const p of list) {
      fg.rect(p.x - p.size * 0.5, p.y - p.size * 0.5, p.size, p.size).fill({
        color: hexNum(p.color),
        alpha: Math.max(0, p.life / p.maxLife),
      });
    }
  }

  _drawRipples(ripples) {
    const fg = this.fxGfx;
    for (const r of ripples) {
      fg.circle(r.x, r.y, r.r).stroke({ width: 2.5, color: hexNum(r.color), alpha: (r.life / r.maxLife) * 0.7 });
    }
  }

  _drawAdditiveLights(game, phase, time) {
    const fg = this.fxGfx;
    if (game.player && !game.player.dead && game.state !== STATE.TITLE) {
      fg.circle(game.player.cx, game.player.cy, game.player.canDash ? 28 : 16).fill({
        color: phase === PHASE.LUNAR ? 0x40e0ff : 0xffbe4a,
        alpha: 0.14,
      });
    }
    for (const cp of game.checkpoints) {
      if (cp.active) fg.circle(cp.x + 8, cp.y + 6, 30 + Math.sin(time * 8) * 3).fill({ color: 0xffd260, alpha: 0.18 });
    }
    if (game.boss && game.boss.alive) {
      fg.circle(game.boss.cx, game.boss.cy, 44).fill({
        color: game.boss.bossPhase === PHASE.SOLAR ? 0xffa834 : 0x42d8ff,
        alpha: 0.2,
      });
    }
  }

  _drawEditorGrid(editor, camX) {
    const wg = this.worldGfx;
    const startTx = Math.max(0, Math.floor(camX / TILE_SIZE));
    const endTx = Math.ceil((camX + GAME_WIDTH) / TILE_SIZE) + 1;
    for (let tx = startTx; tx <= endTx; tx++) wg.moveTo(tx * 16, 0).lineTo(tx * 16, 17 * 16);
    for (let ty = 0; ty <= 17; ty++) wg.moveTo(startTx * 16, ty * 16).lineTo(endTx * 16, ty * 16);
    wg.stroke({ width: 0.5, color: 0xffffff, alpha: 0.14 });
    if (editor.hoverTx >= 0 && editor.hoverTy >= 0) {
      wg.rect(editor.hoverTx * 16 + 0.5, editor.hoverTy * 16 + 0.5, 15, 15).stroke({ width: 1.5, color: 0x4af7c8 });
    }
  }

  _drawHUD(game, camX, camY, time) {
    const hg = this.hudGfx;
    hg.clear();
    this.hudIconPool.begin();

    // Floating combat/score texts
    for (let i = 0; i < game.particles.texts.length; i++) {
      const t = game.particles.texts[i];
      let ft = this.floatingTextPool[i];
      if (!ft) {
        ft = this._makeText('', 14, 0xfff4a3, '"Noto Sans TC", ui-monospace, sans-serif', true, 0.5);
        this.floatingTextPool.push(ft);
      }
      ft.visible = true;
      ft.text = t.text;
      ft.style.fill = hexNum(t.color);
      ft.alpha = Math.min(1, (t.life / t.maxLife) * 1.4);
      ft.position.set((t.x - camX) * 2, (t.y - camY) * 2);
    }
    for (let i = game.particles.texts.length; i < this.floatingTextPool.length; i++) {
      this.floatingTextPool[i].visible = false;
    }

    const isTitle = game.state === STATE.TITLE;
    const showOverlay = isTitle || game.state !== STATE.PLAYING;

    this.txtPhase.visible = !isTitle;
    this.txtDash.visible = !isTitle;
    this.txtStage.visible = !isTitle;
    this.txtCoins.visible = !isTitle;
    this.txtScore.visible = !isTitle;
    this.txtTime.visible = !isTitle;
    this.txtGpu.visible = !isTitle;
    this.txtCombo.visible = false;
    this.txtHint.visible = false;
    this.txtBoss.visible = false;

    if (!isTitle) {
      hg.rect(0, 0, 960, 42).fill({ color: 0x080a14, alpha: 0.68 });
      for (let i = 0; i < game.player.maxHp; i++) {
        this.hudIconPool.draw(this.textures.items.heart, 14 + i * 24, 12, { scaleX: 2, scaleY: 2, alpha: i < game.player.hp ? 1 : 0.22 });
      }
      const isLunar = game.phase === PHASE.LUNAR;
      hg.rect(98, 9, 118, 24).fill({ color: isLunar ? 0x38d4ff : 0xffb238, alpha: 0.22 }).stroke({ width: 1.5, color: isLunar ? 0x4ae3ff : 0xffbe44 });
      this.txtPhase.text = isLunar ? 'LUNAR 星月' : 'SOLAR 熾陽';
      this.txtPhase.style.fill = isLunar ? 0x9ef6ff : 0xffe38a;
      this.txtPhase.position.set(110, 13);

      hg.rect(228, 15, 11, 11).fill(game.player.canDash ? 0x4af7c8 : 0x4a5068);
      this.txtDash.position.set(245, 13);

      this.txtStage.text = game.level.name;
      this.txtStage.position.set(480, 12);

      this.hudIconPool.draw(this.textures.items.coin, 694, 12, { scaleX: 1.8, scaleY: 1.8 });
      this.txtCoins.text = `${game.coins}`;
      this.txtCoins.position.set(744, 13);
      this.txtScore.text = `SCORE ${String(game.score).padStart(6, '0')}`;
      this.txtScore.position.set(878, 13);
      this.txtTime.text = `${game.stageTime.toFixed(1)}s`;
      this.txtTime.position.set(948, 13);

      // PixiJS v8 GPU Telemetry Badge
      this.txtGpu.text = `PIXI v8 GPU | ${game.fps} FPS | SPRITES: ${this.activeSprites} | FILTER: ${this.filtersEnabled ? 'ON' : 'OFF'}`;
      this.txtGpu.position.set(14, 48);

      if (game.combo > 1 && game.comboTimer > 0) {
        this.txtCombo.visible = true;
        this.txtCombo.text = `${game.combo}x COMBO!`;
        this.txtCombo.position.set(14, 68);
      }

      if (game.stageTime < 7.5 && game.level.hint) {
        this.txtHint.visible = true;
        this.txtHint.text = game.level.hint;
        this.txtHint.position.set(480, 504);
        hg.rect(72, 496, 816, 30).fill({ color: 0x0a0e1c, alpha: 0.78 });
      }

      if (game.boss && game.boss.alive && game.boss.active) {
        this.txtBoss.visible = true;
        this.txtBoss.position.set(480, 48);
        hg.rect(290, 44, 380, 38).fill({ color: 0x0a0c18, alpha: 0.84 });
        hg.rect(300, 68, 360, 10).fill(0x2a2238);
        hg.rect(300, 68, 360 * (game.boss.hp / game.boss.maxHp), 10).fill(game.boss.bossPhase === PHASE.SOLAR ? 0xffae38 : 0x4ae3ff);
      }
    }

    // Overlays
    this.txtOverlayTitle.visible = showOverlay;
    this.txtOverlaySub.visible = showOverlay;
    this.txtOverlayBody.visible = showOverlay;
    this.txtOverlayPrompt.visible = showOverlay;
    this.txtOverlayFoot.visible = showOverlay;

    if (isTitle) {
      hg.rect(0, 0, 960, 540).fill({ color: 0x070914, alpha: 0.45 });
      const bob = Math.sin(time * 3) * 6;
      this.txtOverlayTitle.text = 'CHROMA KNIGHT';
      this.txtOverlayTitle.style.fill = game.phase === PHASE.LUNAR ? 0x6ef3ff : 0xffd561;
      this.txtOverlayTitle.position.set(480, 118 + bob);
      this.txtOverlaySub.text = '— PixiJS v8 GPU 引擎版 • 空間折射震波 & 光束 —';
      this.txtOverlaySub.position.set(480, 192 + bob);
      this.txtOverlayBody.text = '6 大獨立生態關卡  •  即時空間扭曲震波  •  耶穌光束  •  F2 關卡編輯器  •  速通殘影';
      this.txtOverlayBody.position.set(480, 254);
      this.txtOverlayPrompt.text = '按 [ENTER] 或 [SPACE] 開始冒險';
      this.txtOverlayPrompt.alpha = 0.65 + 0.35 * Math.sin(time * 5);
      this.txtOverlayPrompt.position.set(480, 330);
      this.txtOverlayFoot.text = '快速選關：[1]晨光遺跡 [2]稜鏡峽谷 [3]翡翠水殿 [4]熾焰鍛爐 [5]星月高塔 [6]雙相聖殿(BOSS)';
      this.txtOverlayFoot.position.set(480, 396);
    } else if (game.state === STATE.PAUSED) {
      hg.rect(0, 0, 960, 540).fill({ color: 0x060812, alpha: 0.72 });
      this.txtOverlayTitle.text = 'PAUSED 暫停中';
      this.txtOverlayTitle.position.set(480, 190);
      this.txtOverlaySub.text = '[ESC / P] 繼續    [R] 重玩    [1–6] 選關    [F2] 編輯器';
      this.txtOverlaySub.position.set(480, 274);
      this.txtOverlayBody.visible = false;
      this.txtOverlayPrompt.visible = false;
      this.txtOverlayFoot.visible = false;
    } else if (game.state === STATE.STAGE_CLEAR || game.state === STATE.VICTORY) {
      hg.rect(0, 0, 960, 540).fill({ color: 0x060a16, alpha: 0.78 });
      this.txtOverlayTitle.text = game.state === STATE.VICTORY ? 'ALL 6 STAGES CLEARED!' : 'STAGE CLEAR!';
      this.txtOverlayTitle.style.fill = 0xffe066;
      this.txtOverlayTitle.position.set(480, 140);
      this.txtOverlaySub.text = `通關時間：${game.stageTime.toFixed(2)}s    金幣：${game.coins}    總分：${game.score}`;
      this.txtOverlaySub.position.set(480, 232);
      this.txtOverlayBody.visible = false;
      this.txtOverlayPrompt.text = game.state === STATE.VICTORY ? '按 [ENTER / SPACE] 返回主畫面' : '按 [ENTER / SPACE] 進入下一關';
      this.txtOverlayPrompt.alpha = 1;
      this.txtOverlayPrompt.position.set(480, 332);
      this.txtOverlayFoot.visible = false;
    } else if (game.state === STATE.GAME_OVER) {
      hg.rect(0, 0, 960, 540).fill({ color: 0x12060c, alpha: 0.78 });
      this.txtOverlayTitle.text = 'FALLEN IN THE CHASM';
      this.txtOverlayTitle.style.fill = 0xff5978;
      this.txtOverlayTitle.position.set(480, 175);
      this.txtOverlaySub.text = `目前分數：${game.score}`;
      this.txtOverlaySub.position.set(480, 260);
      this.txtOverlayBody.visible = false;
      this.txtOverlayPrompt.text = '按 [SPACE / R] 從檢查點立即重生';
      this.txtOverlayPrompt.alpha = 1;
      this.txtOverlayPrompt.position.set(480, 326);
      this.txtOverlayFoot.visible = false;
    }

    this.hudIconPool.end();
  }
}
