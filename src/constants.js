export const GAME_WIDTH = 480;
export const GAME_HEIGHT = 270;
export const TILE_SIZE = 16;

export const PHASE = {
  SOLAR: 'solar',
  LUNAR: 'lunar',
};

export const STATE = {
  TITLE: 'title',
  PLAYING: 'playing',
  PAUSED: 'paused',
  STAGE_CLEAR: 'stage_clear',
  GAME_OVER: 'game_over',
  VICTORY: 'victory',
};

export const TILE = {
  EMPTY: 0,
  GROUND: 1,       // Grass-topped earth / stone
  DIRT: 2,         // Deep earth / stone fill
  BRICK: 3,        // Breakable brick
  QUESTION: 4,     // ? block (coin/item)
  USED: 5,         // Depleted ? block
  SOLAR_BLOCK: 6,  // Solid only in SOLAR phase
  LUNAR_BLOCK: 7,  // Solid only in LUNAR phase
  SPIKE: 8,        // Hazard spikes
  CRACKED: 9,      // Shatters on Ground Pound or Shell
  ONE_WAY: 10,     // Jump-through bridge platform
  CRUMBLE: 11,     // Breaks briefly after standing on it
  WATER: 12,       // Decorative/hazardous animated pool (shallow water or plasma)
  PILLAR: 13,      // Background decorative stone column (non-solid)
  LAVA: 14,        // Glowing hazard lava/abyss
  BOUNCE_PAD: 15,  // Embedded spring tile
  GOAL_GATE: 16,   // Stage exit portal
  ICE: 17,         // Low-friction slippery ice block
};

export const PHYSICS = {
  GRAVITY: 960,
  LUNAR_GRAVITY_MULT: 0.78,
  MAX_FALL: 370,
  WALL_SLIDE_MAX: 68,

  RUN_SPEED: 148,
  GROUND_ACCEL: 1550,
  GROUND_DECEL: 1650,
  AIR_ACCEL: 1080,
  AIR_DECEL: 540,

  JUMP_VEL: -312,
  JUMP_CUT_MULT: 0.48,
  WALL_JUMP_X: 168,
  WALL_JUMP_Y: -288,
  STOMP_BOUNCE: -265,
  STOMP_HIGH_BOUNCE: -348,
  SPRING_VEL: -425,
  SPRING_POUND_VEL: -505,

  DASH_SPEED: 345,
  DASH_TIME: 0.145,
  DASH_COOLDOWN: 0.14,

  GROUND_POUND_SPEED: 430,
  GROUND_POUND_WINDUP: 0.08,

  COYOTE_TIME: 0.105,
  JUMP_BUFFER: 0.125,
  WALL_COYOTE_TIME: 0.11,
  CORNER_CORRECT_PX: 5,
};

export const BIOME_THEMES = {
  ruins: {
    weather: 'fireflies',
    bgStyle: 'arches',
    solar: {
      skyTop: '#24143a', skyMid: '#7c2f4b', skyBot: '#f0944d',
      sunColor: '#fff2b0', sunGlow: 'rgba(255, 194, 88, 0.35)',
      mountainFar: '#3d1f44', mountainMid: '#582949', propColor: '#46223e',
      ambient: 'rgba(255, 174, 72, 0.05)', grass: '#74e86b',
      tileTop: '#44c767', tileTopDark: '#268a4d', tileTopHi: '#7ee872',
      tileDirt: '#7a4b38', tileDirtDark: '#522f26', tileDirtHi: '#9e674d',
    },
    lunar: {
      skyTop: '#070b1c', skyMid: '#13244b', skyBot: '#1d4c73',
      sunColor: '#d9f8ff', sunGlow: 'rgba(84, 218, 255, 0.34)',
      mountainFar: '#101d3b', mountainMid: '#162d54', propColor: '#122442',
      ambient: 'rgba(64, 200, 255, 0.07)', grass: '#6ef7e8',
      tileTop: '#39c9c4', tileTopDark: '#1d7588', tileTopHi: '#8cf7ee',
      tileDirt: '#3a355c', tileDirtDark: '#25213e', tileDirtHi: '#564f82',
    },
  },
  chasm: {
    weather: 'prism',
    bgStyle: 'crystals',
    solar: {
      skyTop: '#2a0f3b', skyMid: '#7a225c', skyBot: '#e86f7c',
      sunColor: '#ffe0b5', sunGlow: 'rgba(255, 140, 150, 0.38)',
      mountainFar: '#40174f', mountainMid: '#5e215e', propColor: '#8f3a84',
      ambient: 'rgba(255, 110, 140, 0.06)', grass: '#ff96b4',
      tileTop: '#d95b8b', tileTopDark: '#8f2d5e', tileTopHi: '#ffa6c6',
      tileDirt: '#59335c', tileDirtDark: '#381d3d', tileDirtHi: '#7d4d82',
    },
    lunar: {
      skyTop: '#0d0924', skyMid: '#241a59', skyBot: '#2d5b8f',
      sunColor: '#e2d9ff', sunGlow: 'rgba(154, 128, 255, 0.36)',
      mountainFar: '#191342', mountainMid: '#252163', propColor: '#4848a8',
      ambient: 'rgba(120, 110, 255, 0.07)', grass: '#9ef2ff',
      tileTop: '#6b7cff', tileTopDark: '#3c43a8', tileTopHi: '#b5c4ff',
      tileDirt: '#2c2754', tileDirtDark: '#1a1638', tileDirtHi: '#463f7d',
    },
  },
  aqueduct: {
    weather: 'rain',
    bgStyle: 'waterfalls',
    solar: {
      skyTop: '#163826', skyMid: '#2f7848', skyBot: '#b5db7b',
      sunColor: '#fff8c4', sunGlow: 'rgba(220, 250, 150, 0.36)',
      mountainFar: '#1e4d33', mountainMid: '#2b6b42', propColor: '#3a7d4e',
      ambient: 'rgba(130, 224, 110, 0.05)', grass: '#a6ff78',
      tileTop: '#52cc47', tileTopDark: '#267d2e', tileTopHi: '#b4ff8a',
      tileDirt: '#6e6446', tileDirtDark: '#47402c', tileDirtHi: '#968a64',
    },
    lunar: {
      skyTop: '#071c16', skyMid: '#0f4236', skyBot: '#1d7860',
      sunColor: '#d4ffe8', sunGlow: 'rgba(84, 245, 180, 0.34)',
      mountainFar: '#0c2e24', mountainMid: '#134739', propColor: '#1d614e',
      ambient: 'rgba(54, 214, 156, 0.07)', grass: '#7effc4',
      tileTop: '#2ed98c', tileTopDark: '#147a56', tileTopHi: '#9effd4',
      tileDirt: '#2a453c', tileDirtDark: '#182b25', tileDirtHi: '#41695c',
    },
  },
  foundry: {
    weather: 'embers',
    bgStyle: 'gears',
    solar: {
      skyTop: '#1f090d', skyMid: '#5e1714', skyBot: '#c94c1a',
      sunColor: '#ffcf66', sunGlow: 'rgba(255, 120, 32, 0.42)',
      mountainFar: '#330e10', mountainMid: '#4d1714', propColor: '#66241c',
      ambient: 'rgba(255, 102, 34, 0.08)', grass: '#ff9447',
      tileTop: '#cc522b', tileTopDark: '#7d2416', tileTopHi: '#ff9654',
      tileDirt: '#3d2a2e', tileDirtDark: '#24181c', tileDirtHi: '#5c4147',
    },
    lunar: {
      skyTop: '#12081c', skyMid: '#2e1238', skyBot: '#611d4a',
      sunColor: '#ffd4e5', sunGlow: 'rgba(255, 88, 152, 0.36)',
      mountainFar: '#1f0d2b', mountainMid: '#331542', propColor: '#4c205e',
      ambient: 'rgba(200, 68, 160, 0.07)', grass: '#ff80c4',
      tileTop: '#9c4287', tileTopDark: '#591e52', tileTopHi: '#e080c8',
      tileDirt: '#291e36', tileDirtDark: '#181021', tileDirtHi: '#423154',
    },
  },
  spire: {
    weather: 'snow',
    bgStyle: 'aurora',
    solar: {
      skyTop: '#1c2a54', skyMid: '#4c6ca8', skyBot: '#d9ecff',
      sunColor: '#ffffff', sunGlow: 'rgba(235, 246, 255, 0.45)',
      mountainFar: '#3a4e7a', mountainMid: '#5a73a6', propColor: '#8aa4d4',
      ambient: 'rgba(220, 240, 255, 0.05)', grass: '#ffffff',
      tileTop: '#e8f6ff', tileTopDark: '#96bde0', tileTopHi: '#ffffff',
      tileDirt: '#68799c', tileDirtDark: '#435070', tileDirtHi: '#94a7cc',
    },
    lunar: {
      skyTop: '#080e26', skyMid: '#152a5c', skyBot: '#2e5c96',
      sunColor: '#ffffff', sunGlow: 'rgba(170, 220, 255, 0.4)',
      mountainFar: '#122147', mountainMid: '#1f3970', propColor: '#365da6',
      ambient: 'rgba(140, 200, 255, 0.07)', grass: '#d4f2ff',
      tileTop: '#bfe6ff', tileTopDark: '#5b8ec4', tileTopHi: '#ffffff',
      tileDirt: '#34466e', tileDirtDark: '#1e2a47', tileDirtHi: '#526ca3',
    },
  },
  sanctum: {
    weather: 'runes',
    bgStyle: 'cathedral',
    solar: {
      skyTop: '#1a0f2e', skyMid: '#4a2359', skyBot: '#c98838',
      sunColor: '#fff5ba', sunGlow: 'rgba(255, 210, 96, 0.42)',
      mountainFar: '#2b1842', mountainMid: '#422559', propColor: '#5c366b',
      ambient: 'rgba(255, 200, 88, 0.07)', grass: '#ffe078',
      tileTop: '#e0a938', tileTopDark: '#8f5916', tileTopHi: '#fff0a6',
      tileDirt: '#382c4a', tileDirtDark: '#221a30', tileDirtHi: '#574670',
    },
    lunar: {
      skyTop: '#06071a', skyMid: '#151842', skyBot: '#29387a',
      sunColor: '#d9f5ff', sunGlow: 'rgba(110, 210, 255, 0.4)',
      mountainFar: '#101233', mountainMid: '#1b2052', propColor: '#2c3575',
      ambient: 'rgba(100, 175, 255, 0.08)', grass: '#9ef2ff',
      tileTop: '#5ce0ff', tileTopDark: '#2472ad', tileTopHi: '#d4fcff',
      tileDirt: '#202242', tileDirtDark: '#121329', tileDirtHi: '#373b6b',
    },
  },
};

export const PALETTES = {
  solar: {
    ...BIOME_THEMES.ruins.solar,
    accent: '#ffbe44',
    accentBright: '#fff1a8',
    cape: '#ff5247',
    capeTip: '#ffcb47',
  },
  lunar: {
    ...BIOME_THEMES.ruins.lunar,
    accent: '#4ae3ff',
    accentBright: '#d4fcff',
    cape: '#35d0ff',
    capeTip: '#b57cff',
  },
};
