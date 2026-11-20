import { BIOME_THEMES } from './constants.js';

// Procedural 16-bit style Pixel Art Sprite & Tile Atlas Generator

function makeCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function drawPixelArt(grid, palette, scale = 1) {
  const h = grid.length;
  const w = grid[0].length;
  const c = makeCanvas(w * scale, h * scale);
  const ctx = c.getContext('2d');
  for (let y = 0; y < h; y++) {
    const row = grid[y];
    for (let x = 0; x < w; x++) {
      const ch = row[x];
      if (ch === '.' || ch === ' ') continue;
      const color = palette[ch];
      if (!color) continue;
      ctx.fillStyle = color;
      ctx.fillRect(x * scale, y * scale, scale, scale);
    }
  }
  return c;
}

function flipH(src) {
  const c = makeCanvas(src.width, src.height);
  const ctx = c.getContext('2d');
  ctx.translate(src.width, 0);
  ctx.scale(-1, 1);
  ctx.drawImage(src, 0, 0);
  return c;
}

export function createSpriteAtlas() {
  const atlas = {
    tiles: {},
    biomes: {},
    player: { solar: {}, lunar: {} },
    enemies: {},
    items: {},
  };

  // --- PER-BIOME GROUND & DIRT TILES (6 Biomes x Solar/Lunar) ---
  for (const [bName, bDef] of Object.entries(BIOME_THEMES)) {
    const s = bDef.solar;
    const l = bDef.lunar;
    atlas.biomes[bName] = {
      groundSolar: bakeGroundTile(s.tileTop, s.tileTopDark, s.tileTopHi, s.tileDirt, s.tileDirtDark, s.tileDirtHi),
      groundLunar: bakeGroundTile(l.tileTop, l.tileTopDark, l.tileTopHi, l.tileDirt, l.tileDirtDark, l.tileDirtHi),
      dirtSolar: bakeDirtTile(s.tileDirt, s.tileDirtDark, s.tileDirtHi, '#1a1218'),
      dirtLunar: bakeDirtTile(l.tileDirt, l.tileDirtDark, l.tileDirtHi, '#0e101c'),
    };
  }

  // --- SHARED TILES (16x16) ---
  atlas.tiles.groundSolar = atlas.biomes.ruins.groundSolar;
  atlas.tiles.groundLunar = atlas.biomes.ruins.groundLunar;
  atlas.tiles.dirtSolar = atlas.biomes.ruins.dirtSolar;
  atlas.tiles.dirtLunar = atlas.biomes.ruins.dirtLunar;
  atlas.tiles.brick = bakeBrickTile();
  atlas.tiles.question = bakeQuestionTile(false);
  atlas.tiles.questionGlow = bakeQuestionTile(true);
  atlas.tiles.used = bakeUsedTile();
  atlas.tiles.cracked = bakeCrackedTile();
  atlas.tiles.oneWay = bakeOneWayTile();
  atlas.tiles.crumble = bakeCrumbleTile();
  atlas.tiles.spike = bakeSpikeTile();
  atlas.tiles.pillar = bakePillarTile();
  atlas.tiles.solarSolid = bakePhaseTile('#ffb638', '#ff7b1c', '#fff3a8', '#8a3509', true);
  atlas.tiles.solarGhost = bakePhaseTile('#ffb638', '#ff7b1c', '#fff3a8', '#8a3509', false);
  atlas.tiles.lunarSolid = bakePhaseTile('#3ee0ff', '#2782e6', '#d8fcff', '#103875', true);
  atlas.tiles.lunarGhost = bakePhaseTile('#3ee0ff', '#2782e6', '#d8fcff', '#103875', false);
  atlas.tiles.ice = bakeIceTile();

  // --- PLAYER SPRITES (16x18) ---
  const playerIdle = [
    '.....oooooo.....',
    '....oHHHHHHo....',
    '...oHhhhhhhHo...',
    '...oHWWooWWHo...',
    '...oHWWooWWHo...',
    '...oHddddddHo...',
    '....oooooooo....',
    '...oCCAAAAACo...',
    '..oCAAAAAAAAAo..',
    '..oCAAgAAgAAAo..',
    '..oCAAAAAAAAAo..',
    '...oAAggggAAo...',
    '...oAAAAAAAAo...',
    '....ooBBBBoo....',
    '....oBo..oBo....',
    '....oBo..oBo....',
    '...oBBo..oBBo...',
    '...ooo....ooo...',
  ];

  const playerRun1 = [
    '.....oooooo.....',
    '....oHHHHHHo....',
    '...oHhhhhhhHo...',
    '...oHWWooWWHo...',
    '...oHWWooWWHo...',
    '...oHddddddHo...',
    '....oooooooo....',
    '...oCCAAAAACo...',
    '..oCAAAAAAAAAo..',
    '..oCAAgAAgAAAo..',
    '...oAAAAAAAAo...',
    '...oAAggggAAo...',
    '....oAAAAAAo....',
    '...oBoBBBBoo....',
    '..oBo....oBo....',
    '..oo......oBBo..',
    '...........ooo..',
    '................',
  ];

  const playerRun2 = [
    '................',
    '.....oooooo.....',
    '....oHHHHHHo....',
    '...oHhhhhhhHo...',
    '...oHWWooWWHo...',
    '...oHWWooWWHo...',
    '...oHddddddHo...',
    '....oooooooo....',
    '...oCCAAAAACo...',
    '..oCAAAAAAAAAo..',
    '..oCAAgAAgAAAo..',
    '...oAAAAAAAAo...',
    '...oAAggggAAo...',
    '....ooBBBBoo....',
    '.....oBo.oBo....',
    '....oBBo.oBo....',
    '....ooo..oo.....',
    '................',
  ];

  const playerJump = [
    '.....oooooo.....',
    '....oHHHHHHo....',
    '...oHhhhhhhHo...',
    '...oHWWooWWHo...',
    '...oHWWooWWHo...',
    '...oHddddddHo...',
    '....oooooooo....',
    '..oCCCAAAAACo...',
    '.oCCAAAAAAAAAo..',
    '..oCAAgAAgAAAo..',
    '...oAAggggAAo...',
    '...oAAAAAAAAo...',
    '...oBooBBooBo...',
    '..oBBo....oBBo..',
    '..ooo......ooo..',
    '................',
    '................',
    '................',
  ];

  const playerWall = [
    '....oooooo......',
    '...oHHHHHHo.....',
    '..oHhhhhhhHo....',
    '..oHWWooWWHo....',
    '..oHWWooWWHo....',
    '..oHddddddHo....',
    '...oooooooo.....',
    '..oCCAAAAACo....',
    '..oCAAAAAAAAo...',
    '..oCAAgAAgAAo...',
    '...oAAggggAAo...',
    '...oAAAAAAo.....',
    '...oBBBBoo......',
    '..oBo..oBo......',
    '..oBo...oBo.....',
    '..oo....oo......',
    '................',
    '................',
  ];

  const solarPal = {
    o: '#1b1124',
    H: '#f8fafc',
    h: '#dbe4f5',
    d: '#8a95b4',
    W: '#ffcf48',
    A: '#3a4a7a',
    g: '#ffb833',
    C: '#ff4f45',
    B: '#262b44',
  };

  const lunarPal = {
    o: '#0c1328',
    H: '#e6fcff',
    h: '#b4e4f7',
    d: '#6389b0',
    W: '#4ae8ff',
    A: '#2b396b',
    g: '#5ce6ff',
    C: '#32c8ff',
    B: '#182240',
  };

  for (const [phaseName, pal] of [
    ['solar', solarPal],
    ['lunar', lunarPal],
  ]) {
    const idleR = drawPixelArt(playerIdle, pal);
    const run1R = drawPixelArt(playerRun1, pal);
    const run2R = drawPixelArt(playerRun2, pal);
    const jumpR = drawPixelArt(playerJump, pal);
    const wallR = drawPixelArt(playerWall, pal);
    atlas.player[phaseName] = {
      idleR,
      idleL: flipH(idleR),
      run1R,
      run1L: flipH(run1R),
      run2R,
      run2L: flipH(run2R),
      jumpR,
      jumpL: flipH(jumpR),
      wallR,
      wallL: flipH(wallR),
    };
  }

  // --- ENEMIES ---
  const slimeGrid1 = [
    '................',
    '................',
    '....oooooooo....',
    '..ooGGGGGGGGoo..',
    '.oGGggggggggGGo.',
    '.oGggGGGGGGggGo.',
    'oGggGWWGGWWGggGo',
    'oGggGWKGGWKGggGo',
    'oGggGGGGGGGGggGo',
    'oGggggDDDDggggGo',
    'oGGggDDDDDDggGGo',
    '.oGGGGDDDDGGGGo.',
    '.oooooooooooooo.',
    '................',
  ];
  const slimeGrid2 = [
    '................',
    '................',
    '................',
    '................',
    '...oooooooooo...',
    '.ooGGGGGGGGGGoo.',
    'oGGggggggggggGGo',
    'oGggGWWGGWWGggGo',
    'oGggGWKGGWKGggGo',
    'oGggggDDDDggggGo',
    'oGGggDDDDDDggGGo',
    'oGGGGDDDDDDGGGGo',
    '.oooooooooooooo.',
    '................',
  ];
  const slimePal = { o: '#1d1226', G: '#45d464', g: '#98ff92', D: '#228748', W: '#ffffff', K: '#1d1226' };
  atlas.enemies.slime1 = drawPixelArt(slimeGrid1, slimePal);
  atlas.enemies.slime2 = drawPixelArt(slimeGrid2, slimePal);

  const beetleGrid = [
    '................',
    '....oooooooo....',
    '..ooRRRRRRRRoo..',
    '.oRRrrrrrrrrRRo.',
    '.oRrRYYYYYYRrRo.',
    'oRrRYRRRRRRYRrRo',
    'oRRRRRRRRRRRRRRo',
    'oRddddddddddddRo',
    'ooodWWWWWWWWWdoo',
    '..oWKWddddWKWo..',
    '..oWWWWddddddo..',
    '...ooBBooBBoo...',
    '...oBBo..oBBo...',
    '...ooo....ooo...',
  ];
  const shellGrid = [
    '................',
    '................',
    '................',
    '....oooooooo....',
    '..ooRRRRRRRRoo..',
    '.oRRrrrrrrrrRRo.',
    '.oRrRYYYYYYRrRo.',
    'oRrRYRRRRRRYRrRo',
    'oRRRRRRRRRRRRRRo',
    'oRddddddddddddRo',
    'oRRRRRRRRRRRRRRo',
    '.oooooooooooooo.',
    '................',
    '................',
  ];
  const beetlePal = { o: '#1b1124', R: '#d93b4f', r: '#ff7582', Y: '#ffd561', d: '#7a1c31', W: '#fff5df', K: '#1b1124', B: '#33293d' };
  atlas.enemies.beetleR = drawPixelArt(beetleGrid, beetlePal);
  atlas.enemies.beetleL = flipH(atlas.enemies.beetleR);
  atlas.enemies.shell = drawPixelArt(shellGrid, beetlePal);

  const wispGrid = [
    '......oooo......',
    '....ooCCCCoo....',
    '...oCCccccCCo...',
    '..oCCcWWWWcCCo..',
    '..oCcWWKKWWcCo..',
    '..oCcWWKKWWcCo..',
    '..oCCcWWWWcCCo..',
    '...oCCccccCCo...',
    '....oCCccCCo....',
    '.....oCccCo.....',
    '......oCCo......',
    '.......oo.......',
  ];
  atlas.enemies.wispSolar = drawPixelArt(wispGrid, { o: '#2b1210', C: '#ff7e26', c: '#ffd15c', W: '#fffce0', K: '#5c140e' });
  atlas.enemies.wispLunar = drawPixelArt(wispGrid, { o: '#0d1530', C: '#38b6ff', c: '#9ff2ff', W: '#ffffff', K: '#12285c' });

  // --- ITEMS ---
  const coinGrid = [
    '..oooooo..',
    '.oYYYYYYo.',
    'oYYyyyyYYo',
    'oYyYYYYyYo',
    'oYyYwwYyYo',
    'oYyYwwYyYo',
    'oYyYYYYyYo',
    'oYYddddYYo',
    '.oYYYYYYo.',
    '..oooooo..',
  ];
  atlas.items.coin = drawPixelArt(coinGrid, { o: '#2e1a0c', Y: '#ffbe2e', y: '#fff08a', w: '#ffffff', d: '#d47e13' });

  const crystalGrid = [
    '.....oo.....',
    '....oCCo....',
    '...oCccCo...',
    '..oCcWWcCo..',
    '.oCcWWWWcCo.',
    'oCcWWWWWWcCo',
    'oCCcWWWWcCCo',
    '.oCCcWWcCCo.',
    '..oCCccCCo..',
    '...oCCCCo...',
    '....oCCo....',
    '.....oo.....',
  ];
  atlas.items.dashCrystal = drawPixelArt(crystalGrid, { o: '#10243a', C: '#3df5c4', c: '#9effe2', W: '#ffffff' });

  const heartGrid = [
    '.ooo..ooo.',
    'oRRRoORRR.',
    'oRwwRRRRRo',
    'oRwRRRRRRo',
    'oRRRRRRRRo',
    '.oRRRRRRo.',
    '..oRRRRo..',
    '...oRRo...',
    '....oo....',
  ];
  atlas.items.heart = drawPixelArt(heartGrid, { o: '#2b0d1b', O: '#2b0d1b', R: '#ff4265', w: '#ffc4d0' });

  return atlas;
}

function bakeGroundTile(top, topDark, topHi, dirt, dirtDark, dirtHi) {
  const c = makeCanvas(16, 16);
  const ctx = c.getContext('2d');
  ctx.fillStyle = dirt;
  ctx.fillRect(0, 0, 16, 16);
  // Subtle brick/pebble noise
  ctx.fillStyle = dirtDark;
  ctx.fillRect(2, 7, 3, 2);
  ctx.fillRect(10, 9, 4, 2);
  ctx.fillRect(5, 13, 3, 2);
  ctx.fillStyle = dirtHi;
  ctx.fillRect(1, 6, 2, 1);
  ctx.fillRect(9, 8, 2, 1);
  ctx.fillRect(13, 13, 2, 1);
  // Grass cap
  ctx.fillStyle = topDark;
  ctx.fillRect(0, 0, 16, 5);
  ctx.fillStyle = top;
  ctx.fillRect(0, 0, 16, 4);
  ctx.fillStyle = topHi;
  ctx.fillRect(0, 0, 16, 1);
  ctx.fillRect(2, 1, 3, 1);
  ctx.fillRect(10, 1, 4, 1);
  // Overhang tufts
  ctx.fillStyle = topDark;
  ctx.fillRect(2, 5, 2, 1);
  ctx.fillRect(7, 5, 3, 1);
  ctx.fillRect(13, 5, 2, 1);
  return c;
}

function bakeDirtTile(base, dark, hi, deep) {
  const c = makeCanvas(16, 16);
  const ctx = c.getContext('2d');
  ctx.fillStyle = base;
  ctx.fillRect(0, 0, 16, 16);
  ctx.fillStyle = dark;
  ctx.fillRect(1, 3, 4, 2);
  ctx.fillRect(9, 1, 5, 2);
  ctx.fillRect(6, 9, 4, 3);
  ctx.fillRect(12, 12, 3, 2);
  ctx.fillStyle = hi;
  ctx.fillRect(2, 2, 2, 1);
  ctx.fillRect(10, 8, 2, 1);
  ctx.fillStyle = deep;
  ctx.fillRect(0, 15, 16, 1);
  return c;
}

function bakeBrickTile() {
  const c = makeCanvas(16, 16);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#331c24';
  ctx.fillRect(0, 0, 16, 16);
  const bricks = [
    [1, 1, 6, 6],
    [8, 1, 7, 6],
    [0, 8, 3, 7],
    [4, 8, 7, 7],
    [12, 8, 4, 7],
  ];
  for (const [x, y, w, h] of bricks) {
    ctx.fillStyle = '#b55243';
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = '#dc7a5c';
    ctx.fillRect(x, y, w, 1);
    ctx.fillRect(x, y, 1, h - 1);
    ctx.fillStyle = '#7d302f';
    ctx.fillRect(x, y + h - 1, w, 1);
  }
  return c;
}

function bakeQuestionTile(glow) {
  const c = makeCanvas(16, 16);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#2d1810';
  ctx.fillRect(0, 0, 16, 16);
  ctx.fillStyle = glow ? '#ffda59' : '#f2a929';
  ctx.fillRect(1, 1, 14, 14);
  ctx.fillStyle = '#fff5b0';
  ctx.fillRect(1, 1, 14, 2);
  ctx.fillRect(1, 1, 2, 14);
  ctx.fillStyle = '#b85f14';
  ctx.fillRect(1, 13, 14, 2);
  ctx.fillRect(13, 1, 2, 14);
  // Corner rivets
  ctx.fillStyle = '#5c2c0e';
  ctx.fillRect(2, 2, 1, 1);
  ctx.fillRect(13, 2, 1, 1);
  ctx.fillRect(2, 13, 1, 1);
  ctx.fillRect(13, 13, 1, 1);
  // ? glyph
  ctx.fillStyle = '#5c2c0e';
  ctx.fillRect(6, 4, 5, 2);
  ctx.fillRect(9, 6, 2, 2);
  ctx.fillRect(7, 8, 3, 2);
  ctx.fillRect(7, 11, 2, 2);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(5, 3, 5, 2);
  ctx.fillRect(8, 5, 2, 2);
  ctx.fillRect(6, 7, 3, 2);
  ctx.fillRect(6, 10, 2, 2);
  return c;
}

function bakeUsedTile() {
  const c = makeCanvas(16, 16);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#1e1c28';
  ctx.fillRect(0, 0, 16, 16);
  ctx.fillStyle = '#58556b';
  ctx.fillRect(1, 1, 14, 14);
  ctx.fillStyle = '#75728c';
  ctx.fillRect(1, 1, 14, 1);
  ctx.fillStyle = '#3b384a';
  ctx.fillRect(1, 14, 14, 1);
  ctx.fillRect(3, 3, 1, 1);
  ctx.fillRect(12, 3, 1, 1);
  ctx.fillRect(3, 12, 1, 1);
  ctx.fillRect(12, 12, 1, 1);
  return c;
}

function bakeCrackedTile() {
  const c = makeCanvas(16, 16);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#242230';
  ctx.fillRect(0, 0, 16, 16);
  ctx.fillStyle = '#6f738a';
  ctx.fillRect(1, 1, 14, 14);
  ctx.fillStyle = '#9aa0ba';
  ctx.fillRect(1, 1, 14, 2);
  ctx.fillStyle = '#484b5e';
  ctx.fillRect(1, 13, 14, 2);
  // Cracks
  ctx.fillStyle = '#191722';
  ctx.fillRect(4, 2, 1, 4);
  ctx.fillRect(5, 5, 3, 1);
  ctx.fillRect(7, 6, 1, 5);
  ctx.fillRect(8, 10, 4, 1);
  ctx.fillRect(11, 4, 1, 3);
  return c;
}

function bakeOneWayTile() {
  const c = makeCanvas(16, 16);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#2e1a12';
  ctx.fillRect(0, 0, 16, 6);
  ctx.fillStyle = '#c47b43';
  ctx.fillRect(0, 1, 16, 4);
  ctx.fillStyle = '#f2b76b';
  ctx.fillRect(0, 1, 16, 1);
  ctx.fillStyle = '#753f1e';
  ctx.fillRect(3, 1, 1, 4);
  ctx.fillRect(11, 1, 1, 4);
  return c;
}

function bakeCrumbleTile() {
  const c = makeCanvas(16, 16);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#2d1e2b';
  ctx.fillRect(0, 0, 16, 16);
  ctx.fillStyle = '#a6876f';
  ctx.fillRect(1, 1, 14, 14);
  ctx.fillStyle = '#d6bca5';
  ctx.fillRect(1, 1, 14, 2);
  ctx.fillStyle = '#61493c';
  ctx.fillRect(3, 4, 2, 4);
  ctx.fillRect(5, 7, 5, 1);
  ctx.fillRect(10, 8, 2, 5);
  ctx.fillRect(1, 13, 14, 2);
  return c;
}

function bakeSpikeTile() {
  const c = makeCanvas(16, 16);
  const ctx = c.getContext('2d');
  for (let i = 0; i < 2; i++) {
    const ox = i * 8;
    ctx.fillStyle = '#1c1826';
    ctx.fillRect(ox + 3, 4, 2, 12);
    ctx.fillRect(ox + 2, 7, 4, 9);
    ctx.fillRect(ox + 1, 10, 6, 6);
    ctx.fillRect(ox, 13, 8, 3);
    ctx.fillStyle = '#c8d4e8';
    ctx.fillRect(ox + 3, 5, 1, 10);
    ctx.fillRect(ox + 2, 8, 2, 7);
    ctx.fillStyle = '#ff5978';
    ctx.fillRect(ox + 4, 6, 1, 9);
    ctx.fillRect(ox + 5, 11, 2, 4);
  }
  return c;
}

function bakePillarTile() {
  const c = makeCanvas(16, 16);
  const ctx = c.getContext('2d');
  ctx.fillStyle = 'rgba(26, 24, 42, 0.55)';
  ctx.fillRect(2, 0, 12, 16);
  ctx.fillStyle = 'rgba(72, 72, 104, 0.55)';
  ctx.fillRect(3, 0, 10, 16);
  ctx.fillStyle = 'rgba(116, 120, 158, 0.45)';
  ctx.fillRect(4, 0, 2, 16);
  ctx.fillRect(9, 0, 2, 16);
  return c;
}

function bakePhaseTile(main, mid, hi, dark, solid) {
  const c = makeCanvas(16, 16);
  const ctx = c.getContext('2d');
  if (solid) {
    ctx.fillStyle = dark;
    ctx.fillRect(0, 0, 16, 16);
    ctx.fillStyle = main;
    ctx.fillRect(1, 1, 14, 14);
    ctx.fillStyle = mid;
    ctx.fillRect(3, 3, 10, 10);
    ctx.fillStyle = hi;
    ctx.fillRect(1, 1, 14, 2);
    ctx.fillRect(1, 1, 2, 14);
    // Inner diamond emblem
    ctx.fillRect(7, 5, 2, 6);
    ctx.fillRect(5, 7, 6, 2);
  } else {
    ctx.strokeStyle = main;
    ctx.globalAlpha = 0.48;
    ctx.lineWidth = 1;
    ctx.strokeRect(1.5, 1.5, 13, 13);
    ctx.fillStyle = main;
    ctx.globalAlpha = 0.14;
    ctx.fillRect(2, 2, 12, 12);
    ctx.globalAlpha = 0.5;
    ctx.fillRect(7, 6, 2, 4);
    ctx.fillRect(6, 7, 4, 2);
  }
  return c;
}

function bakeIceTile() {
  const c = makeCanvas(16, 16);
  const ctx = c.getContext('2d');
  ctx.fillStyle = '#295b8c';
  ctx.fillRect(0, 0, 16, 16);
  ctx.fillStyle = '#73d4ff';
  ctx.fillRect(1, 1, 14, 14);
  ctx.fillStyle = '#c4f5ff';
  ctx.fillRect(1, 1, 14, 3);
  ctx.fillRect(2, 5, 4, 2);
  ctx.fillRect(9, 8, 5, 2);
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(2, 1, 5, 1);
  ctx.fillRect(10, 2, 3, 1);
  return c;
}
