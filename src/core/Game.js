import { save } from '../state/save.js';
import { Player } from '../entities/Player.js';
import { ParticleSystem } from '../systems/ParticleSystem.js';
import { ShieldSystem } from '../systems/ShieldSystem.js';
import { WaveManager } from '../systems/WaveManager.js';
import { WeatherSystem } from '../systems/WeatherSystem.js';
import { TruckSystem } from '../systems/TruckSystem.js';
import { acquireTargets, aimBarrels, fireTurrets, updateProjectiles, damageBase } from '../systems/combat.js';

// One run of the game. Owns the player, every live entity array, and the four
// per-run systems (waves, weather, particles, truck). update(dt) is the single
// per-frame orchestrator, replacing the old flat update() function — each step
// below matches its original order exactly so behavior doesn't drift.
//
// UI modules attach optional callbacks after construction: openUpgrade (research
// bar filled), endRun (base destroyed), onWaveStart (wave banner).
export class Game {
  constructor(W, H) {
    this.p = new Player(save);
    this.W = 0; this.H = 0;
    this.enemies = []; this.projectiles = []; this.cores = [];
    this.particles = new ParticleSystem();
    this.score = 0; this.kills = 0; this.coresCollected = 0; this.salvageRun = 0;
    this.waves = new WaveManager();
    this.turretTimers = []; this.beams = []; this.buildings = [];
    this.research = 0; this.researchNeed = 120; this.pendingPicks = 0;
    this.flashBase = 0; this.shake = 0; this.shieldCooldown = 0;
    this.shieldFx = new ShieldSystem(); // ripples/flicker/break FX (shield HP lives on p)
    this.locks = []; this.barrelAngles = []; this.t = 0;
    // weather: storm/weatherRange/weatherSlow are gameplay multipliers rolled by
    // WaveManager each wave; `weather` holds the cloud/rain/lightning animation state.
    this.storm = false; this.weatherRange = 1; this.weatherSlow = 1;
    this.weather = new WeatherSystem();
    this.truck = new TruckSystem();
    this.hill = null; this.hillBack = null;
    this.runningState = 'playing'; // idle | playing | paused | upgrading | over

    // ui hooks, wired by ui/* init() calls
    this.openUpgrade = null;
    this.endRun = null;
    this.onWaveStart = null;

    this.resize(W, H);
  }

  // Called on construction and on every canvas resize.
  resize(W, H) {
    this.W = W; this.H = H;
    this.bx = W / 2; this.by = H - 70;
    this.diag = Math.hypot(W, H);
    this.buildHill();
  }

  // Rocky hill the base sits on — a deterministic silhouette built per resize.
  buildHill() {
    if (!this.W || !this.H) return;
    const segs = Math.max(18, Math.round(this.W / 26));
    const baseEl = 20;   // rocky ridge height at the edges
    const crest  = 50;   // central rise under the base
    const cx = this.W / 2;
    const frac = i => { const s = Math.sin(i * 127.1 + 3.7) * 43758.5453; return s - Math.floor(s); };
    const front = [], back = [];
    for (let i = 0; i <= segs; i++) {
      const x = (this.W * i) / segs;
      const t = (x - cx) / (this.W * 0.5);
      const bump = Math.max(0, 1 - t * t);          // parabolic hill, peak at centre
      const spike = (i % 3 === 0 ? frac(i) * 16 : frac(i) * 7) * (1 - bump * 0.7);
      front.push({ x, y: this.H - (baseEl + bump * crest + spike) });
      back.push({ x, y: this.H - (baseEl * 0.6 + bump * crest * 0.66 + frac(i + 9) * 7 + 10) });
    }
    this.hill = front; this.hillBack = back;
  }

  // Height of the rocky hill at a given x (interpolated from the silhouette profile).
  groundYAt(x) {
    const hill = this.hill;
    if (!hill || hill.length < 2 || !this.W) return this.H;
    const seg = hill.length - 1;
    const f = Math.max(0, Math.min(seg, (x / this.W) * seg));
    const i = Math.min(seg - 1, Math.floor(f));
    return hill[i].y + (hill[i+1].y - hill[i].y) * (f - i);
  }

  update(dt) {
    // spawning / wave progression
    this.waves.update(this, dt);

    // enemies move toward base + their own behaviors; resolve base hits inline
    // (same order as the original single-pass loop)
    for (const e of this.enemies) {
      e.update(dt, this);
      if (e.reachedBase) {
        damageBase(this, e.dmg, e.x, e.y);
        this.particles.spawnBurst(e.x, e.y, e.color, 6);
      }
    }
    this.enemies = this.enemies.filter(e => !e.dead);

    // targeting — lock the nearest enemies (pre-targeted even before in range) and aim
    acquireTargets(this);
    aimBarrels(this, dt);

    // firing — each turret runs its own weapon on its own cadence, against its locked target
    fireTurrets(this, dt);

    // ground buildings act on their own cadence
    for (const b of this.buildings) b.update(dt, this);
    this.truck.update(this, dt);     // ambient little space truck
    this.weather.update(this, dt);   // clouds, rain, lightning

    // projectiles
    updateProjectiles(this, dt);

    // beam/explosion effects fade out
    for (const b of this.beams) b.life -= dt;
    this.beams = this.beams.filter(b => b.life > 0);

    // cores streak to the base as feedback only (salvage already banked on the kill)
    for (const c of this.cores) {
      const dx = this.bx - c.x, dy = this.by - c.y;
      const d = Math.hypot(dx, dy) || 1;
      const sp = 240 + (1 - Math.min(1, d / 400)) * 240; // accelerate as it nears
      c.x += (dx / d) * sp * dt;
      c.y += (dy / d) * sp * dt;
      c.spin += dt * 6;
      if (d < 24) { this.particles.spawnBurst(this.bx, this.by - 10, '#C98A00', 8); c.dead = true; }
    }
    this.cores = this.cores.filter(c => !c.dead);

    // particles — plain sparks fade fast; debris keeps its momentum, falls under gravity,
    // bounces off a raised shield, and gently crashes / settles onto the ground.
    this.particles.update(this, dt);

    // shield recharge — only after a lull with no incoming damage
    const p = this.p;
    if (this.shieldCooldown > 0) this.shieldCooldown = Math.max(0, this.shieldCooldown - dt);
    else if (p.shield < p.shieldMax) p.shield = Math.min(p.shieldMax, p.shield + p.shieldRegen * dt);
    this.shieldFx.update(this, dt); // after regen, so it sees this frame's rebuild edge

    if (this.shake > 0) this.shake = Math.max(0, this.shake - dt * 60);
    if (this.flashBase > 0) this.flashBase = Math.max(0, this.flashBase - dt * 3);
    this.t += dt;
  }
}
