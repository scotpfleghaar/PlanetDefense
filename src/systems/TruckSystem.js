// Ambient little space truck (purely cosmetic). It runs deliveries: departs the base
// off one side, waits off-screen, then returns from a (random) side back to the base.
//   parked → outbound (base → edge) → away → inbound (edge → base) → parked …
export class TruckSystem {
  constructor() {
    this.truck = null; // lazily initialised once the hill exists
  }

  update(game, dt) {
    if (!game.hill) return;
    if (!this.truck) this.truck = { state: 'parked', timer: 1 + Math.random()*4, x: game.bx, dir: 1, speed: 0, angle: 0, visible: false };
    const t = this.truck;
    const newSpeed = () => 7 + Math.random() * 7;

    if (t.state === 'parked' || t.state === 'away') {  // waiting off-screen / at base
      t.visible = false;
      t.timer -= dt;
      if (t.timer <= 0) {
        if (t.state === 'parked') {                    // head out from the base to a random edge
          t.state = 'outbound'; t.x = game.bx;
          t.dir = Math.random() < 0.5 ? -1 : 1; t.speed = newSpeed(); t.visible = true;
        } else {                                       // return from a random edge toward the base
          const fromLeft = Math.random() < 0.5;
          t.state = 'inbound'; t.x = fromLeft ? -16 : game.W + 16;
          t.dir = fromLeft ? 1 : -1; t.speed = newSpeed(); t.visible = true;
        }
      }
      return;
    }

    t.visible = true;
    t.x += t.dir * t.speed * dt;
    if (t.state === 'outbound') {
      if (t.x < -16 || t.x > game.W + 16) { t.state = 'away'; t.timer = 3 + Math.random()*6; t.visible = false; }
    } else { // inbound — despawn once it reaches the base
      if ((t.dir > 0 && t.x >= game.bx) || (t.dir < 0 && t.x <= game.bx)) {
        t.state = 'parked'; t.timer = 3 + Math.random()*7; t.visible = false;
      }
    }
    t.y = game.groundYAt(t.x);
    const dx = 9, slope = (game.groundYAt(t.x + dx) - game.groundYAt(t.x - dx)) / (2 * dx);
    t.angle += (Math.atan(slope) - t.angle) * Math.min(1, dt * 8); // lean with the terrain
  }
}
