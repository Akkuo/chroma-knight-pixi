// Speedrun Ghost Replay System (30Hz recording + localStorage best run persistence)

const STORAGE_PREFIX = 'chroma_knight_ghost_v1_stage_';

export class GhostSystem {
  constructor() {
    this.enabled = true;
    this.recording = [];
    this.bestRun = null; // { time: number, frames: Array }
    this.recordAccum = 0;
    this.stageId = 1;
    this.lastSavedNewRecord = false;
  }

  startStage(stageId) {
    this.stageId = stageId;
    this.recording = [];
    this.recordAccum = 0;
    this.lastSavedNewRecord = false;
    this.bestRun = this._load(stageId);
  }

  recordFrame(dt, player, phase) {
    this.recordAccum += dt;
    if (this.recordAccum < 1 / 30) return;
    this.recordAccum -= 1 / 30;
    // Cap recording length at 5 minutes (9000 frames)
    if (this.recording.length >= 9000) return;
    this.recording.push([
      Math.round(player.x * 10) / 10,
      Math.round(player.y * 10) / 10,
      player.facing >= 0 ? 1 : -1,
      phase === 'lunar' ? 1 : 0,
      player.onGround ? (Math.abs(player.vx) > 15 ? 1 : 0) : 2,
    ]);
  }

  finishStage(clearTime) {
    if (this.recording.length < 10) return false;
    if (!this.bestRun || clearTime < this.bestRun.time) {
      const payload = {
        time: Math.round(clearTime * 100) / 100,
        frames: this.recording,
      };
      this.bestRun = payload;
      this.lastSavedNewRecord = true;
      this._save(this.stageId, payload);
      return true;
    }
    return false;
  }

  getPlaybackFrame(stageTime) {
    if (!this.enabled || !this.bestRun || !this.bestRun.frames.length) return null;
    const idx = Math.min(this.bestRun.frames.length - 1, Math.floor(stageTime * 30));
    const f = this.bestRun.frames[idx];
    return {
      x: f[0],
      y: f[1],
      facing: f[2],
      phase: f[3] === 1 ? 'lunar' : 'solar',
      pose: f[4],
      bestTime: this.bestRun.time,
      finished: idx >= this.bestRun.frames.length - 1,
    };
  }

  _load(stageId) {
    try {
      const raw = localStorage.getItem(STORAGE_PREFIX + stageId);
      if (!raw) return null;
      const parsed = JSON.parse(raw);
      if (parsed && typeof parsed.time === 'number' && Array.isArray(parsed.frames)) {
        return parsed;
      }
    } catch {
      // Ignore storage errors
    }
    return null;
  }

  _save(stageId, payload) {
    try {
      localStorage.setItem(STORAGE_PREFIX + stageId, JSON.stringify(payload));
    } catch {
      // Ignore quota errors
    }
  }
}
