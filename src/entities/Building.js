import { BUILDINGS } from '../data/buildings.js';
import { Projectile } from './Projectile.js';
import { damageEnemy } from '../systems/combat.js';

function randomEnemy(game) {
  const es = game.enemies;
  return es.length ? es[Math.floor(Math.random() * es.length)] : null;
}

function mostAdvancedEnemy(game) { // closest to the base = most dangerous
  let best = null, bd = Infinity;
  for (const e of game.enemies) {
    const d = Math.hypot(e.x - game.bx, e.y - game.by);
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}

// A ground structure (silo/arc/mortar/repair) placed within tower range via a
// rare in-run upgrade card. Each acts on its own cadence, independent of the
// turret's targeting. Picking a card for a type you already own upgrades it
// in place instead of adding a duplicate — see addOrUpgrade().
export class Building {
  constructor(type, x, y) {
    this.type = type;
    this.level = 1;
    this.x = x; this.y = y;
    this.timer = 0.6 + Math.random() * 1.2;
    this.flash = 0;
    this.glow = 0;
  }

  // Text shown on an in-run building card: a fresh build blurb, or an upgrade
  // blurb once that type is already standing.
  static cardDesc(game, type, verb) {
    const owned = game && game.buildings.find(b => b.type === type);
    if (!owned) return `Build a structure within tower range that ${verb}.`;
    return `Upgrade ${BUILDINGS[type].name} to level ${(owned.level || 1) + 1} — faster and stronger.`;
  }

  // Place a new building somewhere on the ground within the tower's current range
  // ring (clear of the base footprint), or — if one of this type already stands —
  // level it up in place instead of adding a duplicate.
  static addOrUpgrade(game, type) {
    const existing = game.buildings.find(b => b.type === type);
    if (existing) { existing.level = (existing.level || 1) + 1; existing.flash = 1; return; }
    const range = game.p.range * game.weatherRange;
    let x = game.bx;
    for (let tries = 0; tries < 20; tries++) {
      const cand = Math.max(26, Math.min(game.W - 26, game.bx + (Math.random() * 2 - 1) * range));
      x = cand;
      if (Math.abs(cand - game.bx) > 34 && Math.hypot(cand - game.bx, game.groundYAt(cand) - game.by) <= range) break;
    }
    game.buildings.push(new Building(type, x, game.groundYAt(x) - 1));
  }

  update(dt, game) {
    const p = game.p;
    if (this.flash > 0) this.flash = Math.max(0, this.flash - dt * 3);
    const def = BUILDINGS[this.type], lvl = this.level || 1;
    if (this.type === 'repair') {                 // passive integrity regen
      if (p.baseHP < p.baseMax) { p.baseHP = Math.min(p.baseMax, p.baseHP + def.healRate(lvl) * dt); this.glow = 1; }
      else this.glow = Math.max(0, (this.glow || 0) - dt * 2);
      return;
    }
    if (!game.enemies.length) return;
    this.timer -= dt;
    if (this.timer <= 0) {
      this.timer = def.interval(lvl);
      this.fire(game);
      this.flash = 1;
    }
  }

  fire(game) {
    const p = game.p;
    const def = BUILDINGS[this.type], lvl = this.level || 1;
    const ox = this.x, oy = this.y - 8;
    if (this.type === 'silo') {
      const tgt = randomEnemy(game); if (!tgt) return; // pre-select a target at launch
      const sp = 240;
      game.projectiles.push(new Projectile({ x: ox, y: oy, vx: 0, vy: -sp, // straight up, then curve in
        r: 4, dmg: p.damage * 3 * def.dmgMult(lvl), pierce: 0, life: 6,
        missile: true, target: tgt, splash: 44 + def.splashAdd(lvl), turn: 3.5,
        climb: true, climbTo: oy - game.H / 3 })); // climb ~a third of the screen before homing

    } else if (this.type === 'mortar') {
      const tgt = mostAdvancedEnemy(game); if (!tgt) return;
      const a = Math.atan2(tgt.y - oy, tgt.x - ox), sp = 300;
      game.projectiles.push(new Projectile({ x: ox, y: oy, vx: Math.cos(a)*sp, vy: Math.sin(a)*sp,
        r: 4.5, dmg: p.damage * 2.5 * def.dmgMult(lvl), pierce: 0, life: 3, splash: 66 + def.splashAdd(lvl) }));

    } else if (this.type === 'arc') {
      let from = { x: ox, y: oy };
      const hit = new Set();
      const dmg = p.damage * 1.6 * def.dmgMult(lvl);
      const reach = 260 + def.radiusAdd(lvl);
      for (let chain = 0; chain < 3; chain++) {       // zap nearest, then chain
        let tgt = null, bd = Infinity;
        for (const e of game.enemies) {
          if (e.dead || e.phased || hit.has(e)) continue;
          const d = Math.hypot(e.x - from.x, e.y - from.y);
          if (d < bd) { bd = d; tgt = e; }
        }
        if (!tgt || bd > reach) break;
        hit.add(tgt);
        game.particles.spawnBurst(tgt.x, tgt.y, '#37A6E6', 3);
        game.beams.push({ x1: from.x, y1: from.y, x2: tgt.x, y2: tgt.y, w: 2, life: 0.12, life0: 0.12, color: '#37A6E6' });
        damageEnemy(game, tgt, dmg);
        from = { x: tgt.x, y: tgt.y };
      }
    }
  }
}
