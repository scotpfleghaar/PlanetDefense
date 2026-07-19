import { drawEnemy } from './enemyRenderers.js';
import {
  drawCore, drawHill, drawMountains, drawBuilding, drawBeams, drawTargeting, drawMissile,
  drawBase, drawTruck, drawCloudsBack, drawCloudsFront, drawRain, drawLightning,
} from './worldRenderers.js';
import { cloudGL } from './cloudGL.js';

// Owns the canvas + 2D context and the top-level per-frame draw order. Every
// individual draw* function is a plain function taking (ctx, ...) rather than
// a method here, so they can be unit-picked/reused without a Renderer instance.
export class Renderer {
  constructor(canvas) {
    this.cv = canvas;
    this.ctx = canvas.getContext('2d');
    this.W = 0; this.H = 0; this.dpr = 1;
  }

  // Measures the canvas's CSS size and (re)configures its backing store.
  // Pass the active game (if any) so its bx/by/diag/hill stay in sync.
  resize(game) {
    const r = this.cv.getBoundingClientRect(); // canvas is sized to the full viewport via CSS
    this.dpr = Math.min(window.devicePixelRatio || 1, 2);
    this.W = r.width; this.H = r.height;
    this.cv.width = Math.round(this.W * this.dpr);
    this.cv.height = Math.round(this.H * this.dpr);
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    cloudGL.setup(this.W, this.H);
    if (game) game.resize(this.W, this.H);
  }

  render(game) {
    const ctx = this.ctx, p = game.p, W = this.W, H = this.H;
    ctx.clearRect(0, 0, W, H);

    let sx = 0, sy = 0;
    if (game.shake > 0) { sx = (Math.random()-0.5)*game.shake; sy = (Math.random()-0.5)*game.shake; }
    ctx.save();
    ctx.translate(sx, sy);

    // storm overcast tint + the high/mid cloud strata behind the action.
    // Clouds render as a live WebGL density field when available, with the
    // sprite pipeline as fallback.
    if (game.weather.cloudDark > 0.01) { ctx.fillStyle = `rgba(22,30,48,${0.16 * game.weather.cloudDark})`; ctx.fillRect(-sx-20, -sy-20, W+40, H+40); }
    if (cloudGL.ok) { cloudGL.renderBack(game); ctx.drawImage(cloudGL.cv, 0, 0, W, H); }
    else drawCloudsBack(ctx, game);

    // distant mountain tiers on the horizon, behind everything else
    drawMountains(ctx, game);

    // range ring (shrinks during a storm)
    ctx.strokeStyle = 'rgba(11,61,145,0.12)';
    ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(game.bx, game.by, p.range * game.weatherRange, 0, 6.2832); ctx.stroke();

    // cores
    for (const c of game.cores) drawCore(ctx, c);

    // enemies
    for (const e of game.enemies) drawEnemy(ctx, e, game);

    // pre-target aim lines from the turret to its locked targets
    drawTargeting(ctx, game);

    // projectiles
    for (const pr of game.projectiles) {
      if (pr.missile) { drawMissile(ctx, pr); continue; }
      ctx.strokeStyle = pr.hostile ? 'rgba(252,61,33,0.5)' : 'rgba(11,61,145,0.45)'; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.moveTo(pr.x, pr.y);
      ctx.lineTo(pr.x - pr.vx*0.02, pr.y - pr.vy*0.02); ctx.stroke();
      ctx.fillStyle = pr.hostile ? '#20262F' : '#FC3D21';
      ctx.beginPath(); ctx.arc(pr.x, pr.y, pr.r, 0, 6.2832); ctx.fill();
    }

    // laser/railgun beams and explosion shockwaves
    drawBeams(ctx, game);

    // low cloud stratum in front of the enemies, so they pass behind it
    if (cloudGL.ok) { cloudGL.renderFront(game); ctx.drawImage(cloudGL.cv, 0, 0, W, H); }
    else drawCloudsFront(ctx, game);

    // storm lightning bolts (over the enemies they strike)
    drawLightning(ctx, game);

    // particles
    for (const pa of game.particles.particles) {
      ctx.globalAlpha = Math.max(0, Math.min(1, pa.life * 2.5));
      ctx.fillStyle = pa.color;
      const s = pa.size || 3;
      ctx.fillRect(pa.x - s/2, pa.y - s/2, s, s);
    }
    ctx.globalAlpha = 1;

    // rocky hill silhouette, ground buildings + ambient truck on it, then the base
    drawHill(ctx, game);
    for (const b of game.buildings) drawBuilding(ctx, b);
    drawTruck(ctx, game);
    drawBase(ctx, game, game.bx, game.by, p.baseHP / p.baseMax, game.flashBase);

    drawRain(ctx, game); // falls in front of the whole field

    ctx.restore();

    // brief white flash on a lightning strike (over the field, under the HUD)
    if (game.weather.flash > 0) { ctx.fillStyle = `rgba(255,255,255,${0.5 * game.weather.flash})`; ctx.fillRect(0, 0, W, H); }
  }
}
