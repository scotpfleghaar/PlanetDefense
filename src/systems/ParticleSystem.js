import { turretLayout } from '../render/turretLayout.js';

// Sparks, debris and weather wisps. Plain sparks fade fast; debris keeps its
// momentum, bounces off a raised shield, and gently crashes / settles onto
// the ground.
export class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  spawnBurst(x, y, color, n) {
    for (let i = 0; i < n; i++) {
      const a = Math.random() * 6.28, s = 30 + Math.random() * 110;
      this.particles.push({ x, y, vx:Math.cos(a)*s, vy:Math.sin(a)*s, life:0.3+Math.random()*0.3, color });
    }
  }

  spawnWisp(x, y) {
    if (this.particles.length > 360) return; // share the particle budget
    this.particles.push({ x: x + (Math.random()-0.5)*8, y: y + (Math.random()-0.5)*8,
      vx: 5 + (Math.random()-0.5)*14, vy: -6 - Math.random()*8,
      life: 0.3 + Math.random()*0.3, color: 'rgba(150,160,178,0.35)', size: 1 + Math.random()*1.4 });
  }

  // Debris flung from a destroyed enemy: inherits its momentum, then physics takes over.
  spawnDebris(e) {
    if (this.particles.length > 340) return; // soft cap keeps things cheap under heavy fire
    const n = Math.min(13, 5 + Math.round(e.r * 0.5));
    for (let i = 0; i < n; i++) {
      // carry the enemy's full velocity (speed + heading); add only a slight break-apart scatter
      const a = Math.random() * 6.28, s = 6 + Math.random() * 18;
      this.particles.push({
        x: e.x + (Math.random()-0.5) * e.r,
        y: e.y + (Math.random()-0.5) * e.r,
        vx: (e.vx || 0) + Math.cos(a) * s,
        vy: (e.vy || 0) + Math.sin(a) * s,
        life: 1.5 + Math.random() * 1.3,
        color: e.color, size: 1.6 + Math.random() * 1.9,
        phys: true, rest: 0,
      });
    }
  }

  update(game, dt) {
    const p = game.p;
    const shieldUp = p.shield > 0 && p.shieldMax > 0;
    const shR = shieldUp ? turretLayout(p).hw + 22 : 0;
    for (const pa of this.particles) {
      if (pa.phys) {
        // gravity disabled — debris coasts purely along the enemy's heading
        if (shieldUp) {    // bounce off the upper shield dome
          const dx = pa.x - game.bx, dy = pa.y - (game.by + 4), dist = Math.hypot(dx, dy) || 1;
          if (dy < 0 && dist < shR && dist > shR - 10) {
            const nx = dx/dist, ny = dy/dist, vdot = pa.vx*nx + pa.vy*ny;
            if (vdot < 0) {
              pa.vx = (pa.vx - 1.7*vdot*nx) * 0.7;
              pa.vy = (pa.vy - 1.7*vdot*ny) * 0.7;
              pa.x = game.bx + nx*shR; pa.y = (game.by + 4) + ny*shR;
              game.shieldFlash = Math.max(game.shieldFlash, 0.4);
            }
          }
        }
        pa.x += pa.vx * dt; pa.y += pa.vy * dt;
        pa.vx *= 0.99;
        const gy = game.groundYAt(pa.x);
        if (pa.y >= gy) {                 // hit the ground
          pa.y = gy;
          if (Math.abs(pa.vy) > 28) { pa.vy *= -0.3; pa.vx *= 0.55; } // gentle bounce
          else { pa.vy = 0; pa.vx *= 0.7; pa.rest = (pa.rest || 0) + dt; } // settle
        }
        pa.life -= dt * (pa.rest ? 1.8 : 0.7); // linger in flight, fade once settled
      } else {
        pa.x += pa.vx * dt; pa.y += pa.vy * dt;
        pa.vx *= 0.92; pa.vy *= 0.92;
        pa.life -= dt;
      }
    }
    this.particles = this.particles.filter(pa => pa.life > 0);
  }
}
