import { WEATHER } from '../data/tuning.js';
import { damageEnemy } from './combat.js';

function makeCloud(game, seeded) {
  const n = 3 + Math.floor(Math.random() * 3), scale = 0.7 + Math.random() * 0.9;
  const puffs = [];
  for (let i = 0; i < n; i++) {
    puffs.push({ dx: (i - (n-1)/2) * 26 * scale + (Math.random()-0.5)*10,
                 dy: (Math.random()-0.5) * 14 * scale,
                 r: (26 + Math.random()*22) * scale });
  }
  const ext = n * 26 * scale;
  const band = WEATHER.cloudBand;
  return {
    x: seeded ? Math.random() * game.W : -ext - Math.random() * game.W * 0.4,
    y: game.H * (band[0] + Math.random() * (band[1] - band[0])),
    speed: WEATHER.cloudSpeed[0] + Math.random() * (WEATHER.cloudSpeed[1] - WEATHER.cloudSpeed[0]),
    puffs, ext,
  };
}

function jaggedSegments(x1, y1, x2, y2) {
  const pts = [{ x: x1, y: y1 }], steps = 6 + Math.floor(Math.random()*4);
  for (let i = 1; i < steps; i++) {
    const t = i / steps, jit = (Math.random()-0.5) * 26;
    pts.push({ x: x1 + (x2-x1)*t + jit, y: y1 + (y2-y1)*t + jit*0.2 });
  }
  pts.push({ x: x2, y: y2 });
  return pts;
}

// Clouds, rain and lightning — the storm's visual/animation state. Whether a
// storm is active this wave (and its gameplay range/speed debuffs) is decided
// by WaveManager.next() and stored directly on Game as storm/weatherRange/
// weatherSlow, since combat and building placement read those constantly.
export class WeatherSystem {
  constructor() {
    this.cloudDark = 0; this.cloudsSeeded = false;
    this.clouds = []; this.rain = []; this.lightning = [];
    this.lightningTimer = 0; this.flash = 0;
  }

  update(game, dt) {
    // ease the overcast darkness toward the storm state
    this.cloudDark += ((game.storm ? 1 : 0) - this.cloudDark) * Math.min(1, dt * 0.7);

    // clouds drift right; despawn off the right edge; refill from the left up to target
    if (!this.cloudsSeeded) { this.cloudsSeeded = true; for (let i = 0; i < WEATHER.ambientClouds; i++) this.clouds.push(makeCloud(game, true)); }
    const target = game.storm ? WEATHER.stormClouds : WEATHER.ambientClouds;
    for (const cl of this.clouds) cl.x += cl.speed * (game.storm ? 1.5 : 1) * dt;
    this.clouds = this.clouds.filter(cl => cl.x - cl.ext < game.W + 30);
    while (this.clouds.length < target) this.clouds.push(makeCloud(game));

    // enemies passing through a cloud shed wisps
    for (const e of game.enemies) {
      for (const cl of this.clouds) {
        if (Math.abs(e.x - cl.x) < cl.ext && Math.abs(e.y - cl.y) < 30) {
          if (Math.random() < 0.12) game.particles.spawnWisp(e.x, e.y);
          break;
        }
      }
    }

    // rain follows the overcast; cleared once the sky brightens
    if (this.cloudDark > 0.05) this.updateRain(game, dt); else if (this.rain.length) this.rain.length = 0;

    // storm lightning strikes a random enemy on a timer
    if (game.storm) {
      this.lightningTimer -= dt;
      if (this.lightningTimer <= 0 && game.enemies.length) {
        this.strikeLightning(game);
        this.lightningTimer = WEATHER.lightningGap[0] + Math.random() * (WEATHER.lightningGap[1] - WEATHER.lightningGap[0]);
      }
    }
    for (const lb of this.lightning) lb.life -= dt;
    this.lightning = this.lightning.filter(lb => lb.life > 0);
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 4);
  }

  updateRain(game, dt) {
    while (this.rain.length < WEATHER.rainCount) this.rain.push({ x: Math.random()*game.W, y: Math.random()*game.H, len: 10 + Math.random()*10, sp: 520 + Math.random()*220 });
    for (const d of this.rain) {
      d.y += d.sp * dt; d.x += d.sp * 0.18 * dt;
      if (d.y > game.H) { d.y = -10; d.x = Math.random() * game.W; }
      if (d.x > game.W) d.x -= game.W;
    }
  }

  strikeLightning(game) {
    const p = game.p;
    const target = game.enemies[Math.floor(Math.random() * game.enemies.length)];
    if (!target) return;
    const dmg = WEATHER.lightningDmg + p.damage * 2;
    this.lightning.push({ segs: jaggedSegments(target.x + (Math.random()-0.5)*60, -10, target.x, target.y), life: 0.32, life0: 0.32 });
    game.particles.spawnBurst(target.x, target.y, '#FFFFFF', 9);
    damageEnemy(game, target, dmg);
    // chain to up to two nearby enemies
    let from = target; const hit = new Set([target]);
    for (let c = 0; c < 2; c++) {
      let nxt = null, bd = 170;
      for (const e of game.enemies) { if (e.dead || hit.has(e)) continue; const d = Math.hypot(e.x-from.x, e.y-from.y); if (d < bd) { bd = d; nxt = e; } }
      if (!nxt) break;
      hit.add(nxt);
      this.lightning.push({ segs: jaggedSegments(from.x, from.y, nxt.x, nxt.y), life: 0.24, life0: 0.24 });
      game.particles.spawnBurst(nxt.x, nxt.y, '#37A6E6', 5);
      damageEnemy(game, nxt, dmg * 0.6);
      from = nxt;
    }
    this.flash = 1;
  }
}
