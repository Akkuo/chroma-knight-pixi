import { TILE, TILE_SIZE, PHASE } from './constants.js';

/*
  ASCII Map Legend:
  . = Empty
  # = Ground (biome-themed top)
  d = Dirt / Stone fill
  I = Slippery Ice Block
  B = Breakable Brick
  ? = Question Block (coins / powerup)
  S = Solar Phase Block (solid in SOLAR)
  L = Lunar Phase Block (solid in LUNAR)
  ^ = Spikes
  X = Cracked Stone (shatter via Ground Pound or Shell)
  - = One-way wooden/steel catwalk
  C = Crumbling platform
  ~ = Water pool (with real-time reflection)
  ! = Glowing lava hazard
  | = Background decorative pillar

  Entities:
  P = Player spawn
  G = Goal Portal
  c = Coin
  D = Dash-Reset Crystal
  U = Springboard
  K = Checkpoint Lantern
  e = Slime Hopper
  t = Shell Beetle
  w = Solar Wisp
  v = Lunar Wisp
  H = Heart Pickup
  W = Updraft Wind Column (lifts player skyward!)
  F = Rotating Firebar Hazard (spinning flame chain!)
  O = Boost Ring (blasts player forward/upward!)
  @ = Boss Spawn (Prism Golem)
*/

// STAGE 1: Classic Rolling Hills & Secret Upper Roofs (Ruins)
const STAGE_1_MAP = [
  '....................................................................................................',
  '....................................................................................................',
  '....................................................................................................',
  '....................................................................................................',
  '........................................................c.c.c.......................................',
  '.......................................................-------......................c.c.c...........',
  '..................c.c..............................................................B?B?B............',
  '.................B?B?B.......................c.c.c..................................................',
  '............................................LLLLLLL...................c.c.c.........................',
  '..........?.........................................................SSSSSSS...............D.........',
  '..................................c.c.....................................................c.........',
  '.................................SSSSS................c.c.c.........................LLLL............',
  '.....P.......c.c.....e.........|.......|....t....K....XXXXX....e.....|.....t.......c....c......G....',
  '###########..####..######....#############..########..#####..#####..###########..########..#########',
  'ddddddddddd~~dddd~~dddddd~~~~ddddddddddddd!!dddddddd!!ddddd!!ddddd~~ddddddddddd!!dddddddd!!ddddddddd',
  'dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
  'dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
];

// STAGE 2: Open-Air Floating Sky-Islands & Boost-Ring Aerial Highway (Chasm — NO lava, pure sky chasm!)
const STAGE_2_MAP = [
  '..............................................................................................................',
  '..............................................................................................................',
  '............................................................c.c.c.............................................',
  '...........................................................#######............................................',
  '........................................c.c.c.......................................c.c.c.....................',
  '.......................c.c.............LLLLLLL..............c...c..................SSSSSSS....................',
  '......................SSSSS.......................O.............................................O.............',
  '....................................O....................................c.c..................................',
  '..............c.c..................................####..............#########..............c.c...............',
  '.............#####..................................dd.....................................LLLLL..............',
  '......c...................................................c.c..K..c...................................c.c.....',
  '.....P.....O.............D.................D.............###########..........O...........D...............G...',
  '#########...............###.............###..............ddddddddddd..........###...................##########',
  'ddddddddd...............ddd.............ddd...................................ddd...................dddddddddd',
  '..............................................................................................................',
  '..............................................................................................................',
  '..............................................................................................................',
];

// STAGE 3: Lush Two-Tier Rainforest Aqueduct — Reflective Water Canals, Springs & Shell Alleys (NO ice!)
const STAGE_3_MAP = [
  '....................................................................................................................',
  '....................................................................................................................',
  '..................................c.c.c............................c.c.c............................................',
  '.................................B?B?B?B..........................-------.......................c.c.c...............',
  '......................c.c......................................................................B?B?B?B..............',
  '.....................-----...............U.........SSSSSS..................LLLLLL...................................',
  '........................................###.........................................................................',
  '.............c.c..................c.c............................................c.c................................',
  '............LLLLL................#####..........c.c........c.c..........c.c.....#####............c.c................',
  '..................................ddd..........-----......-----........-----.....ddd............SSSSS...............',
  '...................U.........................................................................U......................',
  '..................###.............................................K.........................###.....................',
  '.....P.....c..t...###..c.c..XXXXX..e....t...XXXXX...e.....t...#########..c...c..t...XXXXX...###.....c....c......G...',
  '##########..####..###..##########..#########.....########....###########..######...#######..###...########..########',
  'dddddddddd~~dddd~~ddd~~dddddddddd~~ddddddddd~~~~~dddddddd~~~~ddddddddddd~~dddddd~~~ddddddd~~ddd~~~dddddddd~~dddddddd',
  'dddddddddd~~dddd~~ddd~~dddddddddd~~ddddddddd~~~~~dddddddd~~~~ddddddddddd~~dddddd~~~ddddddd~~ddd~~~dddddddd~~dddddddd',
  'dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
];

// STAGE 4: Enclosed Indoor Volcanic Castle / Foundry — Solid Ceiling, Rotating Firebars & Lava Elevators (NO boost rings!)
const STAGE_4_MAP = [
  'dddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddddd',
  '########################################################################################################################',
  '........................................................................................................................',
  '.....................................c.c.c...........................................c.c.c..............................',
  '....................................-------.........................................B?B?B...............................',
  '...................c.c..................................c.c.......................................c.c...................',
  '..................#####..........F.....................#####..........F..........................SSSSS..................',
  '...................ddd..................................ddd.............................................................',
  '.................................................................................c.c....................................',
  '...........c.c..........................c.c.....................................CCCCC.......D...........c.c.............',
  '..........CCCCC........................SSSSS......D...............K....................................LLLLL............',
  '...............................................................#######...........F......................................',
  '.....P..........F.......t.........w.............XXXXX....H.....ddddddd.....t.............e.....U.................G......',
  '#########.....#####...#####.............#####...#####..#####.............#####.........#####..###..........#############',
  'ddddddddd!!!!!ddddd!!!ddddd!!!!!!!!!!!!!ddddd!!!ddddd!!ddddd!!!!!!!!!!!!!ddddd!!!!!!!!!ddddd!!ddd!!!!!!!!!!ddddddddddddd',
  'ddddddddd!!!!!ddddd!!!ddddd!!!!!!!!!!!!!ddddd!!!ddddd!!ddddd!!!!!!!!!!!!!ddddd!!!!!!!!!ddddd!!ddd!!!!!!!!!!ddddddddddddd',
  'ddddddddd!!!!!ddddd!!!ddddd!!!!!!!!!!!!!ddddd!!!ddddd!!ddddd!!!!!!!!!!!!!ddddd!!!!!!!!!ddddd!!ddd!!!!!!!!!!ddddddddddddd',
];

// STAGE 5: Pure Arctic Aurora Peak — Slippery Ice Slopes, Updraft Wind Columns & Vertical Wall-Jump Chimneys (NO lava, NO water!)
const STAGE_5_MAP = [
  '........................................................................................................................',
  '........................................................................................................................',
  '...................................#.......#...................................................c.c.c....................',
  '...................................#..c.c..#......................c.c.c.......................IIIIIII..........c.c......',
  '...................................#..LLL..#.....................-------......................................IIIII.....',
  '...................c.c.c...........#.......#.........................................#.......#.................ddd......',
  '..................IIIIIII..........#..SSS..#.........................................#..c.c..#..........................',
  '...................................#...D...#.........................................#..SSS..#..........................',
  '............c.c....................#.......#.................c.c.....................#.......#..........................',
  '...........IIIII...................#..LLL..#................CCCCC.........D..........#..LLL..#................c.c.......',
  '............ddd....................#.......#.........................................#...D...#...............LLLLL......',
  '........................W..........#..SSS..#.........K.......................W.......#.......#......W...................',
  '.....P..c.........e................#.......#.....#########.....t.....................#.......#....H...............G.....',
  '#########..IIIII..####.............#..III..#.....ddddddddd..IIIIIII..................#..SSS..#..IIIII.........##########',
  'ddddddddd..ddddd..dddd.............d.......d.....ddddddddd..ddddddd..................d.......d..ddddd.........dddddddddd',
  '........................................................................................................................',
  '........................................................................................................................',
];

// STAGE 6: Royal Cathedral Gauntlet (All 4 New Gimmicks Combined) -> Prism Golem Boss Arena (Sanctum)
const STAGE_6_MAP = [
  '...............................................................................................................',
  '...............................................................................................................',
  '...............................................................................................................',
  '............................................................................................|.............|....',
  '.............................................c.c.c..........................................|.............|....',
  '............................................#######.........................................|...c.....c...|....',
  '......................c.c.......................................c.c.........................|..SSS...LLL..|....',
  '.....................SSSSS..........O..........................LLLLL........................|.............|....',
  '..................................................F.........................................|......D......|....',
  '...........c.c...........................................................c.c................|.............|....',
  '..........LLLLL..............D..................................D.......CCCCC.......H.......|.............|....',
  '........................................W...................................................|.............|....',
  '.....P..........F.......t........................XXXXX....v.............t.....K.............|......@......|..G.',
  '#########.....#####...#####..........#######.....#####..#####...IIIII..###########..........###################',
  'ddddddddd!!!!!ddddd!!!ddddd!!!!!!!!!!ddddddd!!!!!ddddd!!ddddd!!!ddddd!!ddddddddddd!!!!!!!!!!ddddddddddddddddddd',
  'ddddddddd!!!!!ddddd!!!ddddd!!!!!!!!!!ddddddd!!!!!ddddd!!ddddd!!!ddddd!!ddddddddddd!!!!!!!!!!ddddddddddddddddddd',
  'ddddddddd!!!!!ddddd!!!ddddd!!!!!!!!!!ddddddd!!!!!ddddd!!ddddd!!!ddddd!!ddddddddddd!!!!!!!!!!ddddddddddddddddddd',
];

export const STAGE_DEFS = [
  {
    id: 1,
    biome: 'ruins',
    name: 'STAGE 1/6 — 晨光遺跡',
    subtitle: 'Sunlit Ruins',
    startPhase: PHASE.SOLAR,
    map: STAGE_1_MAP,
    hint: '按 [Shift / E / K] 切換 熾陽/星月 相位！空中按 [↓] 重擊可擊碎裂石！',
    hasBoss: false,
  },
  {
    id: 2,
    biome: 'chasm',
    name: 'STAGE 2/6 — 稜鏡峽谷',
    subtitle: 'Prism Chasm',
    startPhase: PHASE.LUNAR,
    map: STAGE_2_MAP,
    hint: '浮空島與彈射光環！衝進發光環高速飛躍深淵，善用上升氣流登頂！',
    hasBoss: false,
  },
  {
    id: 3,
    biome: 'aqueduct',
    name: 'STAGE 3/6 — 翡翠水殿',
    subtitle: 'Emerald Aqueduct',
    startPhase: PHASE.SOLAR,
    map: STAGE_3_MAP,
    hint: '上下雙層分支路線！下層冰道踢龜殼橫掃裂石，上層水橋直衝秘寶庫！',
    hasBoss: false,
  },
  {
    id: 4,
    biome: 'foundry',
    name: 'STAGE 4/6 — 熾焰鍛爐',
    subtitle: 'Solar Foundry',
    startPhase: PHASE.SOLAR,
    map: STAGE_4_MAP,
    hint: '高危岩漿工廠！閃避旋轉火球鏈，把握鋼骨天橋與升降梯節奏！',
    hasBoss: false,
  },
  {
    id: 5,
    biome: 'spire',
    name: 'STAGE 5/6 — 星月高塔',
    subtitle: 'Lunar Spire',
    startPhase: PHASE.LUNAR,
    map: STAGE_5_MAP,
    hint: '極光雪峰攀升！冰面加速起跳 ＋ 上升氣流 ＋ 雙塔井道相位蹬牆跳！',
    hasBoss: false,
  },
  {
    id: 6,
    biome: 'sanctum',
    name: 'STAGE 6/6 — 雙相聖殿',
    subtitle: 'Twin-Phase Sanctum',
    startPhase: PHASE.SOLAR,
    map: STAGE_6_MAP,
    hint: '終極試煉：融合彈射環、火球鏈、上升氣流與冰道，挑戰聖殿【稜鏡巨像】！',
    hasBoss: true,
  },
];

export class Level {
  constructor(def) {
    this.def = def;
    this.id = def.id;
    this.biome = def.biome || 'ruins';
    this.name = def.name;
    this.subtitle = def.subtitle;
    this.hint = def.hint;
    this.hasBoss = def.hasBoss;

    const rows = def.map;
    this.height = rows.length;
    this.width = rows[0].length;
    this.widthPx = this.width * TILE_SIZE;
    this.heightPx = this.height * TILE_SIZE;

    this.tiles = new Uint8Array(this.width * this.height);
    this.bumpOffsets = new Float32Array(this.width * this.height);
    this.crumbleTimers = new Map();

    this.spawn = { x: 48, y: 160 };
    this.goal = { x: (this.width - 4) * TILE_SIZE, y: 12 * TILE_SIZE };
    this.entitySpawns = [];
    this.bossArenaX = null;

    for (let y = 0; y < this.height; y++) {
      const row = rows[y];
      for (let x = 0; x < this.width; x++) {
        const ch = row[x] || '.';
        let t = TILE.EMPTY;
        const px = x * TILE_SIZE;
        const py = y * TILE_SIZE;

        switch (ch) {
          case '#': t = TILE.GROUND; break;
          case 'd': t = TILE.DIRT; break;
          case 'I': t = TILE.ICE; break;
          case 'B': t = TILE.BRICK; break;
          case '?': t = TILE.QUESTION; break;
          case 'S': t = TILE.SOLAR_BLOCK; break;
          case 'L': t = TILE.LUNAR_BLOCK; break;
          case '^': t = TILE.SPIKE; break;
          case 'X': t = TILE.CRACKED; break;
          case '-': t = TILE.ONE_WAY; break;
          case 'C': t = TILE.CRUMBLE; break;
          case '~': t = TILE.WATER; break;
          case '!': t = TILE.LAVA; break;
          case '|': t = TILE.PILLAR; break;
          case 'P': this.spawn = { x: px, y: py - 2 }; break;
          case 'G':
            t = TILE.GOAL_GATE;
            this.goal = { x: px, y: py };
            break;
          case 'c': this.entitySpawns.push({ type: 'coin', x: px + 3, y: py + 3 }); break;
          case 'D': this.entitySpawns.push({ type: 'dash_crystal', x: px + 2, y: py + 2 }); break;
          case 'U': this.entitySpawns.push({ type: 'spring', x: px, y: py }); break;
          case 'K': this.entitySpawns.push({ type: 'checkpoint', x: px, y: py - 8 }); break;
          case 'e': this.entitySpawns.push({ type: 'slime', x: px, y: py + 2 }); break;
          case 't': this.entitySpawns.push({ type: 'beetle', x: px, y: py + 2 }); break;
          case 'w': this.entitySpawns.push({ type: 'wisp', x: px, y: py, phase: PHASE.SOLAR }); break;
          case 'v': this.entitySpawns.push({ type: 'wisp', x: px, y: py, phase: PHASE.LUNAR }); break;
          case 'H': this.entitySpawns.push({ type: 'heart', x: px + 3, y: py + 3 }); break;
          case 'W': this.entitySpawns.push({ type: 'updraft', x: px - 4, y: py + 16, h: 128 }); break;
          case 'F': this.entitySpawns.push({ type: 'firebar', x: px, y: py, count: 4, speed: 2.0 }); break;
          case 'O': this.entitySpawns.push({ type: 'boost_ring', x: px - 1, y: py - 1, dirX: 1, dirY: -0.38 }); break;
          case '@':
            this.bossArenaX = (x - 10) * TILE_SIZE;
            this.entitySpawns.push({ type: 'boss', x: px - 8, y: py - 16 });
            break;
          default: break;
        }
        this.tiles[y * this.width + x] = t;
      }
    }

    // Add moving platforms tailored to each stage's route
    if (this.id === 1) {
      this.entitySpawns.push({ type: 'platform', x: 28 * 16, y: 11 * 16, w: 48, rangeX: 56, rangeY: 0, speed: 1.5 });
    } else if (this.id === 2) {
      this.entitySpawns.push({ type: 'platform', x: 26 * 16, y: 11 * 16, w: 48, rangeX: 44, rangeY: 0, speed: 1.6 });
      this.entitySpawns.push({ type: 'platform', x: 84 * 16, y: 10 * 16, w: 48, rangeX: 46, rangeY: 0, speed: 1.7 });
    } else if (this.id === 3) {
      this.entitySpawns.push({ type: 'platform', x: 46 * 16, y: 7 * 16, w: 48, rangeX: 56, rangeY: 0, speed: 1.5 });
    } else if (this.id === 4) {
      this.entitySpawns.push({ type: 'platform', x: 32 * 16, y: 11 * 16, w: 44, rangeX: 48, rangeY: 0, speed: 1.8 });
      this.entitySpawns.push({ type: 'platform', x: 64 * 16, y: 9 * 16, w: 44, rangeX: 0, rangeY: 42, speed: 1.9 });
      this.entitySpawns.push({ type: 'platform', x: 96 * 16, y: 11 * 16, w: 44, rangeX: 46, rangeY: 0, speed: 1.9 });
    } else if (this.id === 5) {
      this.entitySpawns.push({ type: 'platform', x: 22 * 16, y: 10 * 16, w: 44, rangeX: 0, rangeY: 48, speed: 1.7 });
      this.entitySpawns.push({ type: 'platform', x: 98 * 16, y: 10 * 16, w: 44, rangeX: 44, rangeY: 0, speed: 1.8 });
    } else if (this.id === 6) {
      this.entitySpawns.push({ type: 'platform', x: 28 * 16, y: 11 * 16, w: 44, rangeX: 42, rangeY: 0, speed: 1.9 });
      this.entitySpawns.push({ type: 'platform', x: 76 * 16, y: 11 * 16, w: 48, rangeX: 42, rangeY: 0, speed: 1.9 });
    }
  }

  getTile(tx, ty) {
    if (tx < 0 || tx >= this.width) return TILE.DIRT;
    if (ty < 0) return TILE.EMPTY;
    if (ty >= this.height) return TILE.EMPTY;
    return this.tiles[ty * this.width + tx];
  }

  setTile(tx, ty, val) {
    if (tx < 0 || tx >= this.width || ty < 0 || ty >= this.height) return;
    this.tiles[ty * this.width + tx] = val;
  }

  bumpTile(tx, ty) {
    if (tx < 0 || tx >= this.width || ty < 0 || ty >= this.height) return;
    this.bumpOffsets[ty * this.width + tx] = -5;
  }

  triggerCrumble(tx, ty) {
    const idx = ty * this.width + tx;
    if (!this.crumbleTimers.has(idx)) {
      this.crumbleTimers.set(idx, { state: 'shaking', timer: 0.52, tx, ty });
    }
  }

  isSolid(tx, ty, phase) {
    const t = this.getTile(tx, ty);
    if (
      t === TILE.GROUND ||
      t === TILE.DIRT ||
      t === TILE.ICE ||
      t === TILE.BRICK ||
      t === TILE.QUESTION ||
      t === TILE.USED ||
      t === TILE.CRACKED
    ) {
      return true;
    }
    if (t === TILE.SOLAR_BLOCK) return phase === PHASE.SOLAR;
    if (t === TILE.LUNAR_BLOCK) return phase === PHASE.LUNAR;
    if (t === TILE.CRUMBLE) {
      const c = this.crumbleTimers.get(ty * this.width + tx);
      return !c || c.state !== 'gone';
    }
    return false;
  }

  isOneWay(tx, ty) {
    return this.getTile(tx, ty) === TILE.ONE_WAY;
  }

  isHazard(tx, ty) {
    const t = this.getTile(tx, ty);
    return t === TILE.SPIKE || t === TILE.LAVA;
  }

  update(dt, particles) {
    for (let i = 0; i < this.bumpOffsets.length; i++) {
      if (this.bumpOffsets[i] < 0) {
        this.bumpOffsets[i] = Math.min(0, this.bumpOffsets[i] + 38 * dt);
      }
    }

    for (const [idx, c] of this.crumbleTimers.entries()) {
      c.timer -= dt;
      if (c.state === 'shaking' && c.timer <= 0) {
        c.state = 'gone';
        c.timer = 2.6;
        particles.spawnDebris(c.tx * 16 + 8, c.ty * 16 + 8, '#a6876f', '#61493c');
      } else if (c.state === 'gone' && c.timer <= 0) {
        this.crumbleTimers.delete(idx);
        particles.burst(c.tx * 16 + 8, c.ty * 16 + 8, 6, '#f2d9b8', { speedMax: 45, gravity: 0 });
      }
    }
  }
}
