import { BOSS } from '../data/tuning.js';
import { Projectile } from './Projectile.js';
import { Enemy } from './Enemy.js';
import { damageBase } from '../systems/combat.js';

// The wave-50 Dreadnought. Lives in game.enemies alongside regular enemies so
// all of combat.js (targeting, projectiles, lasers, splash, damageEnemy/killEnemy)
// works on it unchanged — it just brings its own update() instead of the shared
// data-driven Enemy loop. Three phases by remaining hull:
//   1. descends to a hover point and fires telegraphed volleys at the base
//   2. (≤66%) raises armor plating and launches escort wings
//   3. (≤33%) desperation — faster volleys plus a charged spinal beam
export class Boss {
  constructor(game, hpMult, speedMult) {
    this.type = 'boss';
    this.r = BOSS.r;
    this.hp = this.maxhp = BOSS.hp * hpMult;
    this.hpMult = hpMult; this.speedMult = speedMult; // inherited by escorts
    this.x = game.W / 2; this.y = -BOSS.r - 20;
    this.vx = 0; this.vy = BOSS.descentSpeed;
    this.pts = BOSS.pts; this.dmg = 0; this.color = '#20262F';
    this.armor = 0; this.phased = false; this.carrier = false; this.splits = 0;
    this.dead = false; this.reachedBase = false;
    this.phase = Math.random() * 6.28;

    this.stage = 1;                 // 1 | 2 | 3, advances with lost hull
    this.volleyT = BOSS.volley.interval * 0.8;
    this.chargeT = 0;               // >0 while a volley telegraph glows
    this.escortT = 0;
    this.beamT = 0;
    this.beamChargeT = 0;           // >0 while the spinal beam telegraphs
  }

  update(dt, game) {
    const e = this;
    const hpFrac = e.hp / e.maxhp;
    if (e.stage < 3 && hpFrac <= BOSS.phase3.at) this.enterStage(game, 3);
    else if (e.stage < 2 && hpFrac <= BOSS.phase2.at) this.enterStage(game, 2);

    // descend to the hover altitude, then sway across the top of the field
    const hoverY = game.H * BOSS.hoverFrac;
    if (e.y < hoverY) {
      e.vy = BOSS.descentSpeed; e.vx = 0;
      e.y = Math.min(hoverY, e.y + e.vy * dt);
    } else {
      const cx = game.W / 2, amp = game.W * BOSS.swayFrac;
      const want = cx + Math.sin(game.t * 0.35 + e.phase) * amp;
      e.vx = (want - e.x) * 0.8; e.vy = 0;
      e.x += e.vx * dt;
    }
    e.phase += dt;

    // ── volley: glow telegraph, then a fan of slow shots at the base ──
    const volleyGap = BOSS.volley.interval * (e.stage === 3 ? BOSS.phase3.volleyMult : 1);
    e.volleyT -= dt;
    if (e.volleyT <= 0) { e.volleyT = volleyGap; e.chargeT = BOSS.volley.charge; }
    if (e.chargeT > 0) {
      e.chargeT -= dt;
      if (e.chargeT <= 0) this.fireVolley(game);
    }

    // ── phase 2+: periodic escort wings from the flanks ──
    if (e.stage >= 2) {
      e.escortT -= dt;
      if (e.escortT <= 0) {
        e.escortT = BOSS.phase2.escortEvery;
        for (const type of BOSS.phase2.escorts) {
          const side = Math.random() < 0.5 ? -1 : 1;
          game.enemies.push(new Enemy(type, e.hpMult, e.speedMult,
            e.x + side * (e.r + 18), e.y + (Math.random() - 0.5) * e.r));
        }
        game.particles.spawnBurst(e.x, e.y + e.r * 0.6, '#FC3D21', 8);
      }
    }

    // ── phase 3: charged spinal beam — long telegraph, then a heavy base hit ──
    if (e.stage === 3) {
      if (e.beamChargeT > 0) {
        e.beamChargeT -= dt;
        if (e.beamChargeT <= 0) {
          damageBase(game, BOSS.phase3.beamDmg, game.bx, game.by - 24);
          game.beams.push({ x1: e.x, y1: e.y + e.r * 0.6, x2: game.bx, y2: game.by - 20,
            w: 5, life: 0.35, life0: 0.35, color: '#FC3D21' });
          game.particles.spawnBurst(game.bx, game.by - 24, '#FC3D21', 14);
        }
      } else {
        e.beamT -= dt;
        if (e.beamT <= 0) { e.beamT = BOSS.phase3.beamEvery; e.beamChargeT = BOSS.phase3.beamCharge; }
      }
    }
  }

  enterStage(game, stage) {
    this.stage = stage;
    if (stage === 2) { this.armor = BOSS.phase2.armor; this.escortT = 1.2; }
    if (stage === 3) { this.beamT = 3; }
    game.particles.spawnBurst(this.x, this.y, '#FC3D21', 20);
    game.shake = Math.min(14, game.shake + 8);
  }

  fireVolley(game) {
    const v = BOSS.volley;
    const oy = this.y + this.r * 0.6;
    const base = Math.atan2(game.by - 20 - oy, game.bx - this.x);
    const shots = v.shots + (this.stage - 1); // fans out wider as phases advance
    for (let i = 0; i < shots; i++) {
      const a = base + (shots > 1 ? (i / (shots - 1) - 0.5) : 0) * v.spread;
      game.projectiles.push(new Projectile({ x: this.x, y: oy,
        vx: Math.cos(a) * v.speed, vy: Math.sin(a) * v.speed,
        r: 4, dmg: v.dmg, pierce: 0, life: 12, hostile: true }));
    }
    game.particles.spawnBurst(this.x, oy, '#FC3D21', 6);
  }
}
