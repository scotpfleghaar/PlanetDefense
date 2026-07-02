import { Enemy } from '../entities/Enemy.js';
import { buildWaveComposition } from '../data/waveArchetypes.js';
import { WAVE, WEATHER } from '../data/tuning.js';
import { save } from '../state/save.js';

// Wave counter + spawn queue. Also rolls each wave's weather (storm on/off and
// its gameplay range/speed debuffs live directly on Game since combat, enemy
// movement and building placement all read them constantly).
export class WaveManager {
  constructor() {
    this.wave = 0;
    this.queue = [];
    this.spawnTimer = 0;
    this.spawnGap = 0.5;
    this.betweenWaves = 1.0;
  }

  update(game, dt) {
    if (this.queue.length > 0) {
      this.spawnTimer -= dt;
      while (this.queue.length > 0 && this.spawnTimer <= 0) { // spread evenly across the spawn window
        this.spawnEnemy(game, this.queue.shift());
        this.spawnTimer += this.spawnGap;
      }
    } else if (game.enemies.length === 0) {
      this.betweenWaves -= dt;
      if (this.betweenWaves <= 0) { this.betweenWaves = 1.6; this.next(game); }
    }
  }

  spawnEnemy(game, spec) {
    // spawn from top band or upper sides
    let x, y;
    const edge = Math.random();
    if (edge < 0.7) { x = 14 + Math.random() * (game.W - 28); y = -14; }
    else if (edge < 0.85) { x = -14; y = Math.random() * (game.H * 0.4); }
    else { x = game.W + 14; y = Math.random() * (game.H * 0.4); }
    game.enemies.push(new Enemy(spec.type, spec.hpMult, spec.speedMult, x, y));
  }

  next(game) {
    this.wave++;
    save.deepestWave = Math.max(save.deepestWave, this.wave);
    const w = this.wave;
    // count grows without bound as waves progress (linear + accelerating term)
    const count = WAVE.baseCount + Math.floor(w * WAVE.countLinear + w * w * WAVE.countQuad);
    const hpMult = 1 + (w-1) * WAVE.hpPerWave;
    const speedMult = 1 + (w-1) * WAVE.speedPerWave;
    const { types } = buildWaveComposition(w, count);
    const q = types.map(type => ({ type, hpMult, speedMult }));
    // carriers: ~1 per wave from wave 2, scaled by beacon meta
    const carriers = Math.max(0, Math.round((w >= 2 ? 1 : 0) * game.p.carrierBoost) + (w >= 5 ? 1 : 0));
    for (let i = 0; i < carriers; i++) {
      const at = Math.floor(Math.random() * q.length);
      q.splice(at, 0, { type:'carrier', hpMult, speedMult });
    }
    this.queue = q;
    this.spawnGap = Math.max(WAVE.spawnGapMin, WAVE.spawnWindow / q.length); // spread the wave over ~spawnWindow seconds
    this.spawnTimer = 0.4;
    // roll the weather for this wave: a small chance of a storm (range debuff + slow + lightning)
    game.storm = w >= 3 && Math.random() < WEATHER.stormChance;
    game.weatherRange = game.storm ? WEATHER.rangeMul : 1;
    game.weatherSlow  = game.storm ? WEATHER.slowMul : 1;
    if (game.storm) game.weather.lightningTimer = 1.2;
    game.onWaveStart?.(w, game.storm);
  }
}
