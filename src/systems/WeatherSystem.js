import { WEATHER } from '../data/tuning.js';
import { damageEnemy } from './combat.js';

// Puff clusters per stratum. Every cloud is { x, y, speed, puffs, ext, extY,
// layer, dark, front, sx, sy } — puffs are blob offsets/radii around (x, y)
// plus a shade index (0 lit / 1 mid / 2 dark) so crowns read sunlit over
// shaded flat bases; ext/extY are the half-width/upward reach and sx/sy a
// per-cloud stretch applied at draw time (cirrus are ordinary blobs smeared
// into thin streaks). dark marks storm clouds, front the rolling squall line.

function cirrusPuffs(scale) {
  const n = 2 + Math.floor(Math.random() * 3), puffs = [];
  for (let i = 0; i < n; i++) {
    puffs.push({ dx: (i - (n-1)/2) * 60 * scale + (Math.random()-0.5)*24,
                 dy: (Math.random()-0.5) * 8,
                 r: (16 + Math.random()*10) * scale, shade: 1 });
  }
  return { puffs, ext: n * 60 * scale * 1.6, extY: 14 * scale, sx: 3.2, sy: 0.32 };
}

function cumulusPuffs(scale) {
  // billowy lit crown along a dome profile over a flat shaded underside
  const hw = (52 + Math.random() * 36) * scale, puffs = [];
  const nTop = 5 + Math.floor(Math.random() * 3);
  for (let i = 0; i < nTop; i++) {
    const t = i / (nTop - 1), dome = Math.sin(t * Math.PI);
    puffs.push({ dx: (t - 0.5) * 2 * hw * 0.85 + (Math.random()-0.5) * 8 * scale,
                 dy: -(8 + dome * (24 + Math.random()*12)) * scale,
                 r: (15 + dome * 11 + Math.random()*6) * scale, shade: 0 });
  }
  for (let i = 0; i < 3; i++)
    puffs.push({ dx: (i - 1) * hw * 0.75, dy: 0,
                 r: (23 + Math.random()*8) * scale, shade: 1 });
  return { puffs, ext: hw + 30 * scale, extY: 52 * scale, sx: 1, sy: 0.8 };
}

function cumulonimbusPuffs(scale) {
  const puffs = [];
  for (let i = 0; i < 4; i++)   // dark flat base
    puffs.push({ dx: (i - 1.5) * 28 * scale, dy: 0,
                 r: (30 + Math.random()*10) * scale, shade: 2 });
  for (let i = 0; i < 4; i++)   // billowing column, brightening with height
    puffs.push({ dx: (Math.random()-0.5) * 26 * scale, dy: -(22 + i * 22) * scale,
                 r: (26 + Math.random()*12) * scale * (1 - i * 0.08), shade: i < 2 ? 2 : 1 });
  for (let i = 0; i < 4; i++)   // anvil spreading downwind
    puffs.push({ dx: (i - 1.2) * 34 * scale + 10 * scale, dy: -(96 + Math.random()*8) * scale,
                 r: (20 + Math.random()*8) * scale, shade: 1 });
  return { puffs, ext: 85 * scale, extY: 125 * scale, sx: 1, sy: 0.9 };
}

// A squall line spanning more than the whole screen: a ragged dark shelf along
// the leading underside, a dense core, an upper bank reaching past the top of
// the screen, and towering heads punching up through it. Spawned off the left
// edge when a storm rolls in.
function makeStormFront(game) {
  const H = game.H, hw = game.W * (0.55 + Math.random() * 0.15);
  const puffs = [];
  for (let x = -hw; x <= hw; x += 34) {
    // slow sine undulation + light jitter so the underside billows instead of banding
    const jag = Math.sin(x * 0.011) * 0.025 * H + (Math.random() - 0.5) * 0.015 * H;
    puffs.push({ dx: x + (Math.random()-0.5)*10, dy: jag + 0.012 * H,
                 r: 30 + Math.random()*14, shade: 2 });                       // shelf
    puffs.push({ dx: x + (Math.random()-0.5)*16, dy: -0.09 * H + jag,
                 r: 52 + Math.random()*24, shade: 2 });                       // core
    puffs.push({ dx: x + (Math.random()-0.5)*24, dy: -0.20 * H + (Math.random()-0.5) * 0.04 * H,
                 r: 56 + Math.random()*26, shade: 1 });                       // upper bank
  }
  const nT = 3 + Math.floor(Math.random() * 3);
  for (let i = 0; i < nT; i++) {
    const tx = -hw + (i + 0.5) * (2 * hw / nT) + (Math.random()-0.5)*60;
    for (let k = 0; k < 3; k++)
      puffs.push({ dx: tx + (Math.random()-0.5)*22, dy: -0.26 * H - k * 0.055 * H,
                   r: 40 - k * 7 + Math.random()*12, shade: 1 });             // tower heads
  }
  const ext = hw + 90;
  return {
    x: -ext, y: H * 0.38,
    speed: 20 + Math.random() * 8,
    puffs, ext, extY: H * 0.45, layer: 'front', dark: true, front: true, sx: 1, sy: 1,
  };
}

function makeCloud(game, seeded, layer) {
  const cfg = WEATHER.cloudLayers[layer];
  const scale = 0.7 + Math.random() * 0.9;
  const dark = layer === 'low' && game.storm;
  const shape = layer === 'high' ? cirrusPuffs(scale)
              : dark             ? cumulonimbusPuffs(scale)
              :                    cumulusPuffs(scale);
  return {
    x: seeded ? Math.random() * game.W : -shape.ext - Math.random() * game.W * 0.4,
    y: game.H * (cfg.band[0] + Math.random() * (cfg.band[1] - cfg.band[0])) + shape.extY * 0.5,
    speed: cfg.speed[0] + Math.random() * (cfg.speed[1] - cfg.speed[0]),
    layer, dark, ...shape,
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
    // accumulated horizontal drift per stratum (uv widths) for the WebGL cloud
    // field; random start so each run opens on a different sky
    this.drift = { high: Math.random() * 7, mid: Math.random() * 7, low: Math.random() * 7 };
  }

  // Leading/trailing edge of the storm front in x01, for the shader's wall.
  frontSpan(game) {
    for (const cl of this.clouds)
      if (cl.front) return { edge: (cl.x + cl.ext) / game.W, back: (cl.x - cl.ext) / game.W };
    return null;
  }

  update(game, dt) {
    // ease the overcast darkness toward the storm state
    this.cloudDark += ((game.storm ? 1 : 0) - this.cloudDark) * Math.min(1, dt * 0.7);

    // advance each stratum's drift (parallax: lower strata move faster)
    const dm = game.storm ? 1.5 : 1;
    for (const k in WEATHER.strataDrift) this.drift[k] += WEATHER.strataDrift[k] * dm * dt;

    // clouds drift right; despawn off the right edge; refill each stratum from
    // the left up to its target. During a storm, new low-stratum spawns are
    // cumulonimbus — fair-weather cumulus already in the sky just drift out.
    if (!this.cloudsSeeded) {
      this.cloudsSeeded = true;
      for (const layer in WEATHER.cloudLayers)
        for (let i = 0; i < WEATHER.cloudLayers[layer].count[0]; i++)
          this.clouds.push(makeCloud(game, true, layer));
    }
    for (const cl of this.clouds) {
      // the front races in from the left, settles to a crawl over the field,
      // and is swept out quickly once the storm passes; other clouds just drift
      const mul = cl.front ? (!game.storm ? 4 : cl.x < game.W * 0.45 ? 3 : 1)
                           : (game.storm ? 1.5 : 1);
      cl.x += cl.speed * mul * dt;
    }
    this.clouds = this.clouds.filter(cl => cl.x - cl.ext < game.W + 30);
    if (game.storm && !this.clouds.some(cl => cl.front)) this.clouds.push(makeStormFront(game));
    for (const layer in WEATHER.cloudLayers) {
      const target = WEATHER.cloudLayers[layer].count[game.storm ? 1 : 0];
      let n = 0;
      for (const cl of this.clouds) if (cl.layer === layer) n++;
      while (n++ < target) this.clouds.push(makeCloud(game, false, layer));
    }

    // enemies passing through a cloud drawn in front of them shed wisps; the
    // front is huge, so its rate is kept low to avoid a constant particle spray
    for (const e of game.enemies) {
      for (const cl of this.clouds) {
        if (cl.layer !== 'low' && !cl.front) continue;
        if (Math.abs(e.x - cl.x) < cl.ext && e.y < cl.y + 24 && e.y > cl.y - cl.extY) {
          if (Math.random() < (cl.front ? 0.04 : 0.12)) game.particles.spawnWisp(e.x, e.y);
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
