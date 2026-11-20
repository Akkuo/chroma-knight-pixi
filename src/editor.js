import { GAME_WIDTH, GAME_HEIGHT, TILE, TILE_SIZE, PHASE } from './constants.js';

export const EDITOR_PALETTE = [
  { id: 'tile:1', label: '草地', kind: 'tile', tile: TILE.GROUND, color: '#44c767' },
  { id: 'tile:2', label: '岩土', kind: 'tile', tile: TILE.DIRT, color: '#7a4b38' },
  { id: 'tile:3', label: '磚塊', kind: 'tile', tile: TILE.BRICK, color: '#dc7a5c' },
  { id: 'tile:4', label: '問號磚', kind: 'tile', tile: TILE.QUESTION, color: '#ffbe2e' },
  { id: 'tile:6', label: '熾陽磚', kind: 'tile', tile: TILE.SOLAR_BLOCK, color: '#ff9838' },
  { id: 'tile:7', label: '星月磚', kind: 'tile', tile: TILE.LUNAR_BLOCK, color: '#4ae3ff' },
  { id: 'tile:9', label: '裂石', kind: 'tile', tile: TILE.CRACKED, color: '#9aa0ba' },
  { id: 'tile:10', label: '單向橋', kind: 'tile', tile: TILE.ONE_WAY, color: '#c47b43' },
  { id: 'tile:11', label: '崩塌磚', kind: 'tile', tile: TILE.CRUMBLE, color: '#d6bca5' },
  { id: 'tile:8', label: '尖刺', kind: 'tile', tile: TILE.SPIKE, color: '#ff5978' },
  { id: 'tile:12', label: '水面', kind: 'tile', tile: TILE.WATER, color: '#38c7e0' },
  { id: 'tile:14', label: '岩漿', kind: 'tile', tile: TILE.LAVA, color: '#ff5238' },
  { id: 'tile:17', label: '冰塊', kind: 'tile', tile: TILE.ICE, color: '#8ae8ff' },
  { id: 'tile:13', label: '石柱', kind: 'tile', tile: TILE.PILLAR, color: '#6b7299' },
  { id: 'tile:0', label: '橡皮擦', kind: 'tile', tile: TILE.EMPTY, color: '#33384d' },
  { id: 'ent:coin', label: '金幣', kind: 'entity', ent: 'coin', color: '#ffe169' },
  { id: 'ent:dash_crystal', label: '衝刺晶', kind: 'entity', ent: 'dash_crystal', color: '#4af7c8' },
  { id: 'ent:spring', label: '彈簧', kind: 'entity', ent: 'spring', color: '#ff6b7a' },
  { id: 'ent:boost_ring', label: '彈射環', kind: 'entity', ent: 'boost_ring', color: '#ffe066' },
  { id: 'ent:updraft', label: '氣流柱', kind: 'entity', ent: 'updraft', color: '#b5f6ff' },
  { id: 'ent:firebar', label: '火球鏈', kind: 'entity', ent: 'firebar', color: '#ff6a2e' },
  { id: 'ent:checkpoint', label: '存檔燈', kind: 'entity', ent: 'checkpoint', color: '#ffd966' },
  { id: 'ent:slime', label: '史萊姆', kind: 'entity', ent: 'slime', color: '#58e076' },
  { id: 'ent:beetle', label: '甲殼蟲', kind: 'entity', ent: 'beetle', color: '#e0485e' },
  { id: 'ent:wisp_solar', label: '熾陽火', kind: 'entity', ent: 'wisp_solar', color: '#ffaa38' },
  { id: 'ent:wisp_lunar', label: '星月火', kind: 'entity', ent: 'wisp_lunar', color: '#5ce6ff' },
  { id: 'ent:heart', label: '愛心', kind: 'entity', ent: 'heart', color: '#ff4265' },
  { id: 'ent:spawn', label: '起點P', kind: 'spawn', color: '#ffffff' },
  { id: 'ent:goal', label: '終點門', kind: 'goal', color: '#b78cff' },
];

export class LevelEditor {
  constructor(canvas, game, uiRoot) {
    this.canvas = canvas;
    this.game = game;
    this.uiRoot = uiRoot;
    this.active = false;
    this.selected = EDITOR_PALETTE[0];
    this.hoverTx = -1;
    this.hoverTy = -1;
    this.mouseDownBtn = -1;
    this.toastText = '';
    this.toastTimer = 0;

    this._buildUI();
    this._bindEvents();
  }

  _buildUI() {
    if (!this.uiRoot) return;
    this.uiRoot.innerHTML = '';

    const header = document.createElement('div');
    header.className = 'ed-header';
    header.innerHTML = `
      <span class="ed-title">LIVE LEVEL EDITOR (F2)</span>
      <span class="ed-hint">左鍵繪製 / 右鍵擦除 / WASD 移動鏡頭</span>
      <div class="ed-actions">
        <button data-act="play" class="ed-btn primary">▶ 即時試玩 (F2)</button>
        <button data-act="export" class="ed-btn">📤 匯出 JSON</button>
        <button data-act="import" class="ed-btn">📥 匯入 JSON</button>
        <button data-act="reset" class="ed-btn danger">↺ 重置本關</button>
      </div>
    `;
    this.uiRoot.appendChild(header);

    const paletteBar = document.createElement('div');
    paletteBar.className = 'ed-palette';
    for (const item of EDITOR_PALETTE) {
      const btn = document.createElement('button');
      btn.className = 'ed-swatch' + (item === this.selected ? ' active' : '');
      btn.dataset.id = item.id;
      btn.innerHTML = `<span class="dot" style="background:${item.color}"></span>${item.label}`;
      btn.addEventListener('click', () => {
        this.selected = item;
        paletteBar.querySelectorAll('.ed-swatch').forEach((el) => {
          el.classList.toggle('active', el.dataset.id === item.id);
        });
      });
      paletteBar.appendChild(btn);
    }
    this.uiRoot.appendChild(paletteBar);

    this.toastEl = document.createElement('div');
    this.toastEl.className = 'ed-toast';
    this.uiRoot.appendChild(this.toastEl);

    header.addEventListener('click', (e) => {
      const act = e.target?.dataset?.act;
      if (!act) return;
      if (act === 'play') this.toggle();
      else if (act === 'export') this.exportJSON();
      else if (act === 'import') this.importJSON();
      else if (act === 'reset') {
        this.game.loadStage(this.game.stageIndex, true);
        this.showToast('已重置為內建關卡');
      }
    });
  }

  _bindEvents() {
    const getTileCoords = (e) => {
      const rect = this.canvas.getBoundingClientRect();
      const nx = (e.clientX - rect.left) / rect.width;
      const ny = (e.clientY - rect.top) / rect.height;
      const wx = nx * GAME_WIDTH + this.game.camera.x;
      const wy = ny * GAME_HEIGHT + this.game.camera.y;
      return {
        tx: Math.floor(wx / TILE_SIZE),
        ty: Math.floor(wy / TILE_SIZE),
      };
    };

    this.canvas.addEventListener('contextmenu', (e) => {
      if (this.active) e.preventDefault();
    });

    this.canvas.addEventListener('pointerdown', (e) => {
      if (!this.active) return;
      this.mouseDownBtn = e.button;
      const { tx, ty } = getTileCoords(e);
      this.hoverTx = tx;
      this.hoverTy = ty;
      this._applyAt(tx, ty, e.button === 2);
    });

    this.canvas.addEventListener('pointermove', (e) => {
      if (!this.active) return;
      const { tx, ty } = getTileCoords(e);
      const changed = tx !== this.hoverTx || ty !== this.hoverTy;
      this.hoverTx = tx;
      this.hoverTy = ty;
      if (this.mouseDownBtn !== -1 && changed) {
        this._applyAt(tx, ty, this.mouseDownBtn === 2);
      }
    });

    window.addEventListener('pointerup', () => {
      this.mouseDownBtn = -1;
    });
  }

  toggle() {
    this.active = !this.active;
    if (this.uiRoot) {
      this.uiRoot.classList.toggle('open', this.active);
    }
    if (this.active) {
      this.game.sound.setBgmMode('off');
      this.showToast('編輯模式：滑鼠直接繪製，按 F2 即時試玩');
    } else {
      this.game.rebuildRuntimeFromLevel();
      this.game.sound.setBgmMode(this.game.phase);
    }
  }

  showToast(msg) {
    this.toastText = msg;
    this.toastTimer = 2.6;
    if (this.toastEl) {
      this.toastEl.textContent = msg;
      this.toastEl.classList.add('show');
    }
  }

  update(dt, input) {
    if (this.toastTimer > 0) {
      this.toastTimer -= dt;
      if (this.toastTimer <= 0 && this.toastEl) {
        this.toastEl.classList.remove('show');
      }
    }
    if (!this.active) return;
    const panSpeed = 240;
    const dx = (input.right ? 1 : 0) - (input.left ? 1 : 0);
    const dy = (input.down ? 1 : 0) - (input.up ? 1 : 0);
    this.game.camera.x = Math.max(
      0,
      Math.min(this.game.level.widthPx - GAME_WIDTH, this.game.camera.x + dx * panSpeed * dt)
    );
    this.game.camera.y = Math.max(
      0,
      Math.min(this.game.level.heightPx - GAME_HEIGHT, this.game.camera.y + dy * panSpeed * dt)
    );
  }

  _applyAt(tx, ty, erase) {
    const level = this.game.level;
    if (!level || tx < 0 || tx >= level.width || ty < 0 || ty >= level.height) return;

    const px = tx * TILE_SIZE;
    const py = ty * TILE_SIZE;

    // Helper to remove any entity spawn at this cell
    const removeEntityAtCell = () => {
      level.entitySpawns = level.entitySpawns.filter((sp) => {
        const stx = Math.floor((sp.x + 2) / TILE_SIZE);
        const sty = Math.floor((sp.y + 4) / TILE_SIZE);
        return !(stx === tx && sty === ty);
      });
    };

    if (erase) {
      level.setTile(tx, ty, TILE.EMPTY);
      removeEntityAtCell();
      this.game.rebuildRuntimeFromLevel(false);
      return;
    }

    const sel = this.selected;
    if (sel.kind === 'tile') {
      level.setTile(tx, ty, sel.tile);
      if (sel.tile !== TILE.EMPTY) removeEntityAtCell();
    } else if (sel.kind === 'spawn') {
      level.setTile(tx, ty, TILE.EMPTY);
      level.spawn = { x: px, y: py - 2 };
      this.game.player.reset(level.spawn.x, level.spawn.y);
    } else if (sel.kind === 'goal') {
      // Clear previous goal tiles
      for (let i = 0; i < level.tiles.length; i++) {
        if (level.tiles[i] === TILE.GOAL_GATE) level.tiles[i] = TILE.EMPTY;
      }
      level.setTile(tx, ty, TILE.GOAL_GATE);
      level.goal = { x: px, y: py };
    } else if (sel.kind === 'entity') {
      level.setTile(tx, ty, TILE.EMPTY);
      removeEntityAtCell();
      let spawn = null;
      if (sel.ent === 'coin') spawn = { type: 'coin', x: px + 3, y: py + 3 };
      else if (sel.ent === 'dash_crystal') spawn = { type: 'dash_crystal', x: px + 2, y: py + 2 };
      else if (sel.ent === 'spring') spawn = { type: 'spring', x: px, y: py };
      else if (sel.ent === 'boost_ring') spawn = { type: 'boost_ring', x: px - 1, y: py - 1, dirX: 1, dirY: -0.38 };
      else if (sel.ent === 'updraft') spawn = { type: 'updraft', x: px - 4, y: py + 16, h: 128 };
      else if (sel.ent === 'firebar') spawn = { type: 'firebar', x: px, y: py, count: 4, speed: 2.0 };
      else if (sel.ent === 'checkpoint') spawn = { type: 'checkpoint', x: px, y: py - 8 };
      else if (sel.ent === 'slime') spawn = { type: 'slime', x: px, y: py + 2 };
      else if (sel.ent === 'beetle') spawn = { type: 'beetle', x: px, y: py + 2 };
      else if (sel.ent === 'wisp_solar') spawn = { type: 'wisp', x: px, y: py, phase: PHASE.SOLAR };
      else if (sel.ent === 'wisp_lunar') spawn = { type: 'wisp', x: px, y: py, phase: PHASE.LUNAR };
      else if (sel.ent === 'heart') spawn = { type: 'heart', x: px + 3, y: py + 3 };
      if (spawn) level.entitySpawns.push(spawn);
    }

    this.game.rebuildRuntimeFromLevel(false);
  }

  exportJSON() {
    const level = this.game.level;
    const data = {
      version: 1,
      name: `${level.name} (Custom)`,
      width: level.width,
      height: level.height,
      startPhase: this.game.phase,
      spawn: level.spawn,
      goal: level.goal,
      tiles: Array.from(level.tiles),
      entitySpawns: level.entitySpawns,
    };
    const json = JSON.stringify(data, null, 2);

    if (navigator.clipboard?.writeText) {
      navigator.clipboard.writeText(json).catch(() => {});
    }

    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `chroma-knight-stage-${level.id}-custom.json`;
    a.click();
    URL.revokeObjectURL(url);
    this.showToast('已下載 JSON 並複製到剪貼簿！');
  }

  importJSON() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json,application/json';
    input.onchange = () => {
      const file = input.files?.[0];
      if (!file) return;
      const reader = new FileReader();
      reader.onload = () => {
        try {
          const data = JSON.parse(String(reader.result));
          if (!Array.isArray(data.tiles) || !data.width || !data.height) {
            throw new Error('格式不符');
          }
          const level = this.game.level;
          level.width = data.width;
          level.height = data.height;
          level.widthPx = data.width * TILE_SIZE;
          level.heightPx = data.height * TILE_SIZE;
          level.tiles = new Uint8Array(data.tiles);
          level.bumpOffsets = new Float32Array(data.width * data.height);
          level.crumbleTimers.clear();
          level.spawn = data.spawn || level.spawn;
          level.goal = data.goal || level.goal;
          level.entitySpawns = Array.isArray(data.entitySpawns) ? data.entitySpawns : [];
          if (data.name) level.name = data.name;
          this.game.rebuildRuntimeFromLevel(true);
          this.showToast('已成功匯入自訂關卡 JSON！');
        } catch (err) {
          this.showToast('JSON 匯入失敗：' + err.message);
        }
      };
      reader.readAsText(file);
    };
    input.click();
  }
}
