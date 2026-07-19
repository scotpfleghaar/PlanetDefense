import { ENEMY_DEFS } from '../data/enemies.js';
import { RANKS } from '../data/ranks.js';

// One hostile craft/asteroid. Behavior is data-driven off ENEMY_DEFS rather than
// a subclass per type — the 15 types share this exact update loop and only differ
// in a handful of optional behavior flags (weave/cloak/spawner/healer/blink) plus
// their bespoke render function (see render/enemyRenderers.js).
export class Enemy {
  constructor(type, hpMult, speedMult, x, y, rank = null) {
    const def = ENEMY_DEFS[type];
    this.type = type; this.x = x; this.y = y; this.r = def.r;
    this.hp = def.hp * hpMult; this.maxhp = def.hp * hpMult;
    this.speed = def.speed * speedMult;
    this.pts = def.pts; this.dmg = def.dmg; this.color = def.color;
    this.carrier = !!def.carrier; this.armor = def.armor || 0; this.weave = def.weave || 0;
    this.splits = def.splits || 0; this.child = def.child || null;
    this.rock = !!def.rock; this.comet = !!def.comet;
    this.hpMult = hpMult; this.speedMult = speedMult; this.phase = Math.random() * 6.28;
    this.dead = false; this.reachedBase = false;

    if (def.rock) { // each rock gets its own irregular silhouette, tumble rate and craters
      const n = 7 + Math.floor(Math.random() * 4);
      this.verts = [];
      for (let i = 0; i < n; i++)
        this.verts.push({ a: (i / n) * 6.2832 + (Math.random() - 0.5) * 0.35, k: 0.68 + Math.random() * 0.44 });
      this.spin = (Math.random() < 0.5 ? -1 : 1) * (0.25 + Math.random() * 0.55);
      this.craters = [];
      if (!def.comet) for (let i = 0, nc = 2 + Math.floor(Math.random() * 2); i < nc; i++) {
        const a = Math.random() * 6.2832, d = Math.random() * this.r * 0.5;
        this.craters.push({ x: Math.cos(a) * d, y: Math.sin(a) * d, r: this.r * (0.12 + Math.random() * 0.14) });
      }
    }
    // high-wave behaviours (timers staggered so groups don't act in lockstep)
    if (def.spawner) { this.spawner = def.spawner; this.spawnT = def.spawner.interval * (0.5 + Math.random() * 0.7); this.brood = def.spawner.brood; this.hatch = 0; }
    if (def.cloak)   { this.cloak = def.cloak; this.solid = true; this.phased = false; this.fade = 1; this.cloakT = def.cloak.solid * (0.4 + Math.random() * 0.8); }
    if (def.healer)  { this.healer = def.healer; this.healT = def.healer.interval * (0.5 + Math.random() * 0.8); this.pulse = 0; }
    if (def.blink)   { this.blink = def.blink; this.blinkT = def.blink.interval * (0.7 + Math.random() * 0.6); this.blinkFx = 0; }

    // generic attributes any enemy can carry — from its base def, its rank, or both
    this.applyAttributes(def);
    if (rank && RANKS[rank]) {
      this.rank = rank;
      this.rankColor = RANKS[rank].color;
      this.applyAttributes(RANKS[rank]);
    }
  }

  // Apply a generic attribute bundle (stat mults + regen + shield). Works for any
  // enemy type: stats scale multiplicatively, regen stacks, the stronger shield wins.
  applyAttributes(src) {
    if (src.hpMult)    { this.maxhp *= src.hpMult; this.hp = this.maxhp; }
    if (src.speedMult) this.speed *= src.speedMult;
    if (src.ptsMult)   this.pts = Math.round(this.pts * src.ptsMult);
    if (src.regen)     this.regen = (this.regen || 0) + src.regen; // frac of maxhp per second
    if (src.shield) {
      const max = src.shield.frac * this.maxhp;
      if (!this.maxShield || max > this.maxShield) {
        this.maxShield = max; this.shield = max;
        this.shieldRegen = src.shield.regen * max; // hp/s once recharging
        this.shieldDelay = src.shield.delay;       // seconds unhit before recharge
        this.shieldT = 0; this.shieldFx = 0;
      }
    }
  }

  update(dt, game) {
    const e = this;
    const dx = game.bx - e.x, dy = game.by - e.y;
    const d = Math.hypot(dx, dy) || 1;
    const sp = e.speed * game.p.slow * game.weatherSlow; // storms slow enemies
    let vx = (dx/d) * sp, vy = (dy/d) * sp;
    if (e.weave) { // weavers strafe side-to-side as they approach
      const wob = Math.sin(game.t * 3 + e.phase) * e.weave * game.p.slow * game.weatherSlow;
      vx += (-dy/d) * wob; vy += (dx/d) * wob;
    }
    if (e.kbT > 0) {          // shield-break shove — dominates steering, then eases back out
      e.kbT = Math.max(0, e.kbT - dt);
      const k = e.kbT / e.kbDur; // 1 → 0
      vx = e.kbVx * k + vx * (1 - k);
      vy = e.kbVy * k + vy * (1 - k);
    }
    e.vx = vx; e.vy = vy; // remembered so debris can inherit momentum
    e.x += vx * dt;
    e.y += vy * dt;
    e.phase += dt * 3;

    // ── high-wave behaviours ──
    if (e.spawner && e.brood > 0) {          // hive births a child from its rear hatch
      e.spawnT -= dt;
      if (e.spawnT <= 0) {
        e.spawnT = e.spawner.interval;
        e.brood--;
        e.hatch = 1;
        const c = new Enemy(e.spawner.child, e.hpMult, e.speedMult,
                             e.x + (Math.random() - 0.5) * e.r, e.y + e.r * 0.8);
        game.enemies.push(c);
        game.particles.spawnBurst(e.x, e.y + e.r * 0.8, c.color, 3);
      }
    }
    if (e.hatch) e.hatch = Math.max(0, e.hatch - dt * 2.5);
    if (e.cloak) {                           // phantom toggles between solid and faded
      e.cloakT -= dt;
      if (e.cloakT <= 0) { e.solid = !e.solid; e.cloakT = e.solid ? e.cloak.solid : e.cloak.faded; }
      e.phased = !e.solid;
      e.fade += ((e.solid ? 1 : 0.22) - e.fade) * Math.min(1, dt * 6);
    }
    if (e.healer) {                          // tender pulse-heals damaged neighbours
      e.healT -= dt;
      if (e.healT <= 0) {
        e.healT = e.healer.interval;
        for (const o of game.enemies) {
          if (o === e || o.dead || o.hp >= o.maxhp) continue;
          if (Math.hypot(o.x - e.x, o.y - e.y) > e.healer.radius) continue;
          o.hp = Math.min(o.maxhp, o.hp + e.healer.amount * e.hpMult);
          game.beams.push({ x1: e.x, y1: e.y, x2: o.x, y2: o.y, w: 1.5, life: 0.2, life0: 0.2, color: '#1E7F4F' });
        }
        e.pulse = 1;
      }
    }
    if (e.pulse) e.pulse = Math.max(0, e.pulse - dt * 3);
    if (e.blink) {                           // blinker hops toward the base, never onto it
      e.blinkT -= dt;
      if (e.blinkT <= 0) {
        e.blinkT = e.blink.interval;
        if (d > 150) {
          game.particles.spawnBurst(e.x, e.y, e.color, 6);
          const hop = Math.min(e.blink.dist, d - 120);
          e.x += (dx / d) * hop; e.y += (dy / d) * hop;
          game.particles.spawnBurst(e.x, e.y, e.color, 6);
          e.blinkFx = 1;
        }
      }
    }
    if (e.blinkFx) e.blinkFx = Math.max(0, e.blinkFx - dt * 4);

    // ── generic attributes (ranks / def) ──
    if (e.regen && e.hp < e.maxhp) e.hp = Math.min(e.maxhp, e.hp + e.regen * e.maxhp * dt);
    if (e.maxShield && e.shield < e.maxShield) { // recharge after a spell unhit
      e.shieldT = Math.max(0, e.shieldT - dt);
      if (e.shieldT <= 0) e.shield = Math.min(e.maxShield, e.shield + e.shieldRegen * dt);
    }
    if (e.shieldFx) e.shieldFx = Math.max(0, e.shieldFx - dt * 4);

    // reached base? — flagged here, resolved by Game.update (damage + burst + removal)
    if (d < 30 + e.r) {
      e.dead = true;
      e.reachedBase = true;
    }
  }
}
