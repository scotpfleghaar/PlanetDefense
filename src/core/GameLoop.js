// Drives the requestAnimationFrame loop. Doesn't keep its own play/pause state —
// `game.runningState` (idle | playing | paused | upgrading | over) is the single
// source of truth, same as the rest of the codebase, so ui/* modules can flip it
// directly without going through the loop.
export class GameLoop {
  constructor(renderer) {
    this.renderer = renderer;
    this.game = null;
    this.rafId = null;
    this.lastT = 0;
    this.onFrame = null; // HUD sync hook, called after each 'playing' update
  }

  start(game) {
    this.game = game;
    game.runningState = 'playing';
    this.resetClock();
    if (this.rafId) cancelAnimationFrame(this.rafId);
    this.rafId = requestAnimationFrame(t => this.frame(t));
  }

  // Call after any pause that shouldn't count toward dt (modal close, resume, etc).
  resetClock() {
    this.lastT = performance.now();
  }

  frame(t) {
    this.rafId = requestAnimationFrame(tt => this.frame(tt));
    let dt = (t - this.lastT) / 1000;
    this.lastT = t;
    if (dt > 0.05) dt = 0.05; // clamp big gaps
    if (this.game && this.game.runningState === 'playing') {
      this.game.update(dt);
      this.onFrame?.(this.game);
    }
    if (this.game) this.renderer.render(this.game);
  }
}
