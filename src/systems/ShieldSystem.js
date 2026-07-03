import { shieldRadius } from '../render/turretLayout.js';
import { SHIELD } from '../data/tuning.js';

// Ephemeral shield presentation + reaction state: localized impact ripples, the
// low-shield instability sputter, the rebuild-from-zero flare, and the break
// shockwave/knockback. Shield HP itself stays on Player and combat.js remains
// the sole owner of the numbers — this system only reacts to their transitions.
export class ShieldSystem {
  constructor() {
    this.impacts = [];      // {ang, strength, life, life0} — one ripple per absorbed hit
    this.glow = 0;          // whole-dome pulse, bumped by any absorbed hit
    this.flicker = 1;       // instability multiplier applied to every drawn layer
    this.flickerTarget = 1;
    this.flickerT = 0;
    this.rebuilding = 0;    // 1 → 0 flare after the dome regenerates from zero
    this.prevShield = 1;    // for detecting the 0 → positive rebuild edge
  }

  // A hit (or debris bounce) landed at world (x, y): ripple at that spot on the dome.
  registerImpact(game, x, y, strength = 1) {
    let ang = Math.atan2(y - (game.by + 4), x - game.bx);
    if (ang > 0) ang = -ang; // mirror onto the drawn upper hemisphere
    if (this.impacts.length >= SHIELD.maxRipples) this.impacts.shift();
    this.impacts.push({ ang, strength, life: SHIELD.rippleLife, life0: SHIELD.rippleLife });
    this.glow = Math.max(this.glow, strength);
  }

  // Shield just hit zero: the dome shatters outward and shoves nearby enemies back,
  // buying the turrets a beat to thin out whatever was crowding the base.
  triggerBreak(game) {
    const shR = shieldRadius(game.p);
    const cx = game.bx, cy = game.by + 4; // dome centre (matches the drawn arc)
    game.beams.push({ ring: true, x: cx, y: cy, r: shR, life: SHIELD.breakRingLife, life0: SHIELD.breakRingLife, color: '#8FD4FF' });
    game.beams.push({ ring: true, x: cx, y: cy, r: shR * 1.6, life: SHIELD.breakRingLife * 0.6, life0: SHIELD.breakRingLife * 0.6, color: '#CFEFFF' });
    game.particles.spawnShieldShards(cx, cy, shR);
    game.shake = Math.max(game.shake, 10);

    const R = shR * SHIELD.knockRadiusMult;
    for (const e of game.enemies) {
      if (e.dead) continue;
      const dx = e.x - cx, dy = e.y - cy, d = Math.hypot(dx, dy) || 1;
      if (d > R) continue;
      const falloff = 1 - 0.5 * (d / R); // harder shove the closer they are
      e.kbDur = SHIELD.knockDuration;
      e.kbT = e.kbDur;
      e.kbVx = (dx / d) * SHIELD.knockForce * falloff;
      e.kbVy = (dy / d) * SHIELD.knockForce * falloff;
    }
    this.impacts.length = 0; // dome is gone; nothing left to ripple
    this.glow = 0;
  }

  update(game, dt) {
    const p = game.p;
    for (const h of this.impacts) h.life -= dt;
    this.impacts = this.impacts.filter(h => h.life > 0);
    if (this.glow > 0) this.glow = Math.max(0, this.glow - dt * 3);
    if (this.rebuilding > 0) this.rebuilding = Math.max(0, this.rebuilding - dt / SHIELD.rebuildTime);

    // rebuild edge — the dome powering back on after a break
    if (this.prevShield <= 0 && p.shield > 0) {
      this.rebuilding = 1;
      game.beams.push({ ring: true, x: game.bx, y: game.by + 4, r: shieldRadius(p) * 0.5, life: 0.35, life0: 0.35, color: '#8FD4FF' });
    }
    this.prevShield = p.shield;

    // instability sputter — below the threshold the dome dims unevenly; the target
    // rerolls at a nervous cadence and is eased so it reads as sputter, not strobe
    const sf = p.shieldMax > 0 ? p.shield / p.shieldMax : 0;
    if (p.shield > 0 && sf < SHIELD.instabilityFrac) {
      this.flickerT -= dt;
      if (this.flickerT <= 0) {
        this.flickerT = 0.04 + Math.random() * 0.12;
        const lowness = 1 - sf / SHIELD.instabilityFrac;
        this.flickerTarget = 1 - lowness * Math.random() * 0.8;
      }
    } else this.flickerTarget = 1;
    this.flicker += (this.flickerTarget - this.flicker) * Math.min(1, dt * 18);
  }
}
