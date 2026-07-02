// A fired round — cannon shot, missile, flak pellet, or a building's silo/mortar
// shell. Shape varies by weapon (see systems/combat.js call sites); collision
// resolution against enemies is a cross-entity concern and lives in combat.js,
// but a projectile owns its own motion (including missile homing).
export class Projectile {
  constructor(props) {
    Object.assign(this, props);
    this.hit = props.hit || new Set();
    this.dead = false;
  }

  // Homing missiles climb straight up first (if `climb`), then curve toward
  // the nearest live enemy with a turn-rate limit for a smooth intercept curve.
  steer(dt, game) {
    const pr = this;
    if (pr.climb) {                       // climb straight up first, then begin homing at apex
      if (pr.y <= pr.climbTo) pr.climb = false;
      else return;
    }
    let tgt = pr.target;
    if (!tgt || tgt.dead) tgt = pr.target = nearestEnemyTo(game, pr.x, pr.y);
    if (!tgt) return;
    const want = Math.atan2(tgt.y - pr.y, tgt.x - pr.x);
    const cur = Math.atan2(pr.vy, pr.vx);
    let da = want - cur;
    while (da > Math.PI) da -= 2*Math.PI;
    while (da < -Math.PI) da += 2*Math.PI;
    const turn = pr.turn || 5;            // turn-rate-limited → a smooth curve into the target
    const na = cur + Math.max(-turn*dt, Math.min(turn*dt, da));
    const sp = Math.hypot(pr.vx, pr.vy);
    pr.vx = Math.cos(na) * sp; pr.vy = Math.sin(na) * sp;
  }

  move(dt) {
    this.x += this.vx * dt; this.y += this.vy * dt;
    this.life -= dt;
  }
}

function nearestEnemyTo(game, x, y) {
  let best = null, bd = Infinity;
  for (const e of game.enemies) {
    if (e.dead || e.phased) continue;
    const d = Math.hypot(e.x - x, e.y - y);
    if (d < bd) { bd = d; best = e; }
  }
  return best;
}
