import { WEAPONS } from '../data/weapons.js';
import { Enemy } from '../entities/Enemy.js';
import { Projectile } from '../entities/Projectile.js';
import { turretLayout } from '../render/turretLayout.js';

// Targeting, firing, damage resolution, and projectile physics — the stateless
// glue between the Player, Enemy, Projectile and Building entities. Everything
// here is a plain function that takes the Game instance rather than a class,
// since none of it owns state of its own.

// Assign one target per turret, prioritising enemies actually in range:
//  • spread turrets across the in-range targets (a separate target each),
//  • if there are more turrets than in-range targets, the extras wrap around and
//    concentrate on them (so when only one is in range, all turrets hit it),
//  • only when nothing is in range do turrets fall back to pre-targeting the
//    nearest approaching enemies (aim lines, holding fire until they arrive).
export function acquireTargets(game) {
  const n = game.p.multishot, range = game.p.range * game.weatherRange;
  const sorted = game.enemies
    .filter(e => !e.phased) // faded phantoms can't be locked
    .map(e => ({ e, d: Math.hypot(e.x - game.bx, e.y - game.by) }))
    .sort((a, b) => a.d - b.d);
  const inRange = [], outRange = [];
  for (const o of sorted) (o.d <= range ? inRange : outRange).push(o.e);
  const pref = inRange.length ? inRange : outRange;
  const locks = [];
  if (pref.length) for (let i = 0; i < n; i++) locks.push(pref[i % pref.length]);
  game.locks = locks;
}

// Rotate each barrel smoothly toward its locked target (servo motion); barrels with
// no target ease back to their resting fan angle.
export function aimBarrels(game, dt) {
  const n = game.p.multishot;
  if (game.barrelAngles.length !== n) game.barrelAngles = new Array(n).fill(0);
  const k = Math.min(1, dt * 12);
  for (let i = 0; i < n; i++) {
    let desired = 0; // idle turrets point straight up
    const tgt = game.locks[i];
    if (tgt) {
      let rot = Math.atan2(tgt.y - game.by, tgt.x - game.bx) + Math.PI / 2;
      if (rot > Math.PI) rot -= 2 * Math.PI;
      else if (rot < -Math.PI) rot += 2 * Math.PI;
      desired = Math.max(-1.55, Math.min(1.55, rot)); // never aim into the ground
    }
    game.barrelAngles[i] += (desired - game.barrelAngles[i]) * k;
  }
}

// Countdown each turret's own cadence and fire when its locked target is in range.
export function fireTurrets(game, dt) {
  const p = game.p;
  p.ensureLoadout();
  for (let i = 0; i < p.multishot; i++) {
    if (game.turretTimers[i] === undefined) game.turretTimers[i] = 0;
    game.turretTimers[i] -= dt;
    if (game.turretTimers[i] > 0) continue;
    const e = game.locks[i];
    if (!e || e.dead) continue;
    const w = WEAPONS[p.turretWeapons[i]] || WEAPONS.cannon;
    const wRange = p.range * game.weatherRange * (w.rangeMult || 1);
    if (Math.hypot(e.x - game.bx, e.y - game.by) > wRange) continue; // pre-targeted, not yet in range
    fireTurret(game, i, e);
    game.turretTimers[i] = p.fireInterval * w.fireMult;
  }
}

// Fire turret i (using its own weapon) at target e.
function fireTurret(game, i, e) {
  const p = game.p, L = turretLayout(p);
  const ox = game.bx + (L.xs[i] || 0), oy = game.by + L.muzzleY;
  const w = p.turretWeapons[i] || 'cannon';
  const ang = Math.atan2(e.y - oy, e.x - ox);
  const dx = Math.cos(ang), dy = Math.sin(ang);

  if (w === 'missile') {
    game.projectiles.push(new Projectile({ x: ox, y: oy, vx: dx*WEAPONS.missile.speed, vy: dy*WEAPONS.missile.speed,
      r: 4, dmg: p.damage * WEAPONS.missile.dmgMult, pierce: 0, life: 3.5,
      missile: true, target: e, splash: WEAPONS.missile.splash }));

  } else if (w === 'laser' || w === 'railgun') {
    const cfg = WEAPONS[w], isRail = w === 'railgun';
    const reach = p.range * game.weatherRange * 1.05, halfW = cfg.halfW, dmg = p.damage * cfg.dmgMult;
    for (const en of game.enemies) {           // hitscan — damage everything along the ray
      if (en.dead || en.phased) continue;
      const t = (en.x - ox)*dx + (en.y - oy)*dy;
      if (t < 0 || t > reach) continue;
      const px = ox + dx*t, py = oy + dy*t;
      if (Math.hypot(en.x - px, en.y - py) <= en.r + halfW) {
        const crit = Math.random() < p.critChance;
        game.particles.spawnBurst(px, py, crit ? '#FC3D21' : cfg.tip, 2);
        damageEnemy(game, en, dmg * (crit ? 3 : 1));
      }
    }
    game.beams.push({ x1: ox, y1: oy, x2: ox + dx*reach, y2: oy + dy*reach,
      w: halfW, life: isRail ? 0.18 : 0.10, life0: isRail ? 0.18 : 0.10, color: cfg.tip });

  } else if (w === 'flak') {
    const cfg = WEAPONS.flak, sp = p.projSpeed * 0.85, reach = p.range * game.weatherRange * cfg.rangeMult;
    for (let k = 0; k < cfg.pellets; k++) {
      const a = ang + (Math.random() - 0.5) * cfg.spread;
      game.projectiles.push(new Projectile({ x: ox, y: oy, vx: Math.cos(a)*sp, vy: Math.sin(a)*sp,
        r: 2.5, dmg: p.damage * cfg.dmgMult, pierce: 0, life: reach / sp }));
    }

  } else { // cannon
    game.projectiles.push(new Projectile({ x: ox, y: oy, vx: dx*p.projSpeed, vy: dy*p.projSpeed,
      r: 3, dmg: p.damage, pierce: p.pierce, life: 2.2 }));
  }
}

// Move every projectile (including missile homing), resolve collisions against
// enemies, and detonate splash rounds on impact or expiry.
export function updateProjectiles(game, dt) {
  const p = game.p;
  for (const pr of game.projectiles) {
    if (pr.missile) pr.steer(dt, game);
    pr.move(dt);
    if (pr.x < -30 || pr.x > game.W+30 || pr.y < -30 || pr.y > game.H+30 || pr.life <= 0) {
      if (pr.splash && pr.life <= 0) explode(game, pr.x, pr.y, pr.splash, pr.dmg);
      pr.dead = true;
    } else {
      for (const e of game.enemies) {
        if (e.dead || e.phased || pr.hit.has(e)) continue; // shots pass through faded phantoms
        if (Math.hypot(e.x-pr.x, e.y-pr.y) < e.r + pr.r) {
          if (pr.splash) { explode(game, pr.x, pr.y, pr.splash, pr.dmg); pr.dead = true; break; }
          const crit = Math.random() < p.critChance;
          pr.hit.add(e);
          game.particles.spawnBurst(pr.x, pr.y, crit ? '#FC3D21' : '#0B3D91', crit ? 5 : 2);
          damageEnemy(game, e, pr.dmg * (crit ? 3 : 1));
          if (pr.pierce-- <= 0) { pr.dead = true; break; }
        }
      }
    }
  }
  game.projectiles = game.projectiles.filter(pr => !pr.dead);
}

// Area-of-effect blast (missiles): damages every enemy within radius + a shockwave ring.
export function explode(game, x, y, radius, dmg) {
  game.particles.spawnBurst(x, y, '#FC3D21', 14);
  game.beams.push({ ring: true, x, y, r: radius, life: 0.26, life0: 0.26, color: '#FC3D21' });
  for (const e of game.enemies) {
    if (e.dead) continue;
    if (Math.hypot(e.x - x, e.y - y) <= radius + e.r) {
      damageEnemy(game, e, dmg);
    }
  }
}

// Apply damage to an enemy (armored types take reduced damage) and handle its death.
export function damageEnemy(game, e, dmg) {
  if (e.dead || e.phased) return; // faded phantoms are immune
  e.hp -= e.armor ? dmg * (1 - e.armor) : dmg;
  if (e.hp <= 0) killEnemy(game, e);
}

function killEnemy(game, e) {
  if (e.dead) return;
  e.dead = true;
  game.kills++;
  addScore(game, e.pts);
  addResearch(game, e.pts);
  game.particles.spawnBurst(e.x, e.y, e.color, 4); // quick flash
  game.particles.spawnDebris(e);                   // momentum-carrying debris
  if (e.carrier) grantCore(game, e.x, e.y);
  if (e.splits) spawnChildren(game, e);             // splitters burst into smaller enemies
}

function spawnChildren(game, e) {
  for (let i = 0; i < e.splits; i++) {
    const a = Math.random() * 6.28;
    const c = new Enemy(e.child || 'swarm', e.hpMult, e.speedMult, e.x + Math.cos(a)*e.r, e.y + Math.sin(a)*e.r);
    c.vx = Math.cos(a) * 60; c.vy = Math.sin(a) * 60; // little outward pop
    game.enemies.push(c);
  }
}

// Destroying a carrier banks its salvage immediately — no falling/collecting, so it
// can never be missed. The core that spawns is purely a cosmetic streak to the base.
function grantCore(game, x, y) {
  game.coresCollected++;
  game.salvageRun += game.p.coreValue;
  addScore(game, 50);
  game.flashBase = 1;
  game.cores.push({ x, y, r: 9, spin: 0 });
}

function addScore(game, n) {
  game.score += Math.round(n * game.p.scoreMult);
}

function addResearch(game, n) {
  game.research += n;
  while (game.research >= game.researchNeed) {
    game.research -= game.researchNeed;
    game.researchNeed = Math.round(game.researchNeed * 1.2); // 1.55
    game.pendingPicks++;
  }
  if (game.pendingPicks > 0 && game.runningState === 'playing') game.openUpgrade?.();
}

// x/y is where the hit landed (defaults to just above the dome centre so a
// caller without a position still ripples somewhere sane).
export function damageBase(game, n, x = game.bx, y = game.by - 20) {
  const p = game.p;
  game.shieldCooldown = p.shieldDelay; // any hit pauses shield recharge
  if (p.shield > 0 && n > 0) {       // shield absorbs first
    const absorbed = Math.min(p.shield, n);
    p.shield -= absorbed; n -= absorbed;
    game.shieldFx.registerImpact(game, x, y);
    if (p.shield <= 0) game.shieldFx.triggerBreak(game); // this hit felled the dome
  }
  if (n > 0) {                        // overflow hits the hull
    p.baseHP -= n;
    game.shake = Math.min(14, 6 + n * 0.2);
    game.flashBase = 1;
  }
  if (p.baseHP <= 0) { p.baseHP = 0; game.endRun?.(true); }
}
