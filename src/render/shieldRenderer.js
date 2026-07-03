import { shieldRadius } from './turretLayout.js';
import { SHIELD } from '../data/tuning.js';

// The base's energy shield: a faint haze, a baked hex-cell lattice, localized
// impact ripples, and a fresnel rim brightest at the silhouette edges. Every
// layer's alpha is scaled by ShieldSystem's flicker so a nearly-drained dome
// sputters as a whole rather than any one layer strobing on its own.

const latticeCache = new Map(); // keyed by rounded radius — shR only changes on baseMax upgrade steps
const PAD = 3;

function hexPath(c, x, y, s) {
  c.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = Math.PI / 6 + i * Math.PI / 3; // pointy-top hex
    const px = x + Math.cos(a) * s, py = y + Math.sin(a) * s;
    i ? c.lineTo(px, py) : c.moveTo(px, py);
  }
  c.closePath();
}

// Bake the hex lattice once per dome radius — same bake-then-drawImage pattern
// as the clouds, so the per-frame cost is a single drawImage.
function lattice(shR) {
  const key = Math.round(shR);
  let cv = latticeCache.get(key);
  if (cv) return cv;
  cv = document.createElement('canvas');
  cv.width = Math.ceil(shR * 2 + PAD * 2);
  cv.height = Math.ceil(shR + PAD * 2);
  const c = cv.getContext('2d');
  c.translate(shR + PAD, shR + PAD); // dome centre at the canvas bottom-centre
  c.beginPath(); c.arc(0, 0, shR, Math.PI, 2 * Math.PI); c.closePath(); c.clip();
  c.strokeStyle = 'rgba(55,166,230,0.6)'; // saturated enough to read on the pale sky
  c.lineWidth = 1;
  const s = SHIELD.hexSize, colW = s * Math.sqrt(3), rowH = s * 1.5;
  for (let row = 0; s - row * rowH >= -shR - s; row++) {
    const cy = s - row * rowH;
    const off = (row % 2) ? colW / 2 : 0;
    for (let cx = -shR - s + off; cx <= shR + s; cx += colW) {
      if (Math.hypot(cx, cy) > shR + s) continue;
      hexPath(c, cx, cy, s);
      c.stroke();
    }
  }
  latticeCache.set(key, cv);
  return cv;
}

// Drawn from inside drawBase's translated space: (0, 0) is the base origin,
// the dome centre sits at (0, 4) — the same convention the old inline dome used.
export function drawShield(ctx, game) {
  const p = game.p;
  if (p.shieldMax <= 0 || p.shield <= 0) return;
  const fx = game.shieldFx;
  const shR = shieldRadius(p);
  const sf = p.shield / p.shieldMax;
  const flick = fx.flicker;

  ctx.save();
  ctx.translate(0, 4);

  // energy haze — stronger toward full shield, flares during rebuild
  ctx.beginPath(); ctx.arc(0, 0, shR, Math.PI, 2 * Math.PI); ctx.closePath();
  ctx.fillStyle = `rgba(55,166,230,${(0.04 + sf * 0.05 + fx.glow * 0.05 + fx.rebuilding * 0.10) * flick})`;
  ctx.fill();

  // clip the patterned layers to the dome silhouette
  ctx.save();
  ctx.clip(); // reuses the haze path above

  // hex-cell lattice — barely-there at rest, revealed by hits and the rebuild flare
  ctx.globalAlpha = (0.10 + sf * 0.16 + fx.glow * 0.28 + fx.rebuilding * 0.30) * flick;
  ctx.drawImage(lattice(shR), -shR - PAD, -shR - PAD);

  // impact ripples expanding across the dome from where each hit actually landed
  for (const h of fx.impacts) {
    const a = Math.max(0, Math.min(1, h.life / h.life0));
    const px = Math.cos(h.ang) * shR, py = Math.sin(h.ang) * shR;
    const rr = 4 + (1 - a) * shR * 0.45;
    ctx.globalAlpha = a * 0.9 * h.strength * flick;
    ctx.strokeStyle = '#37A6E6'; ctx.lineWidth = 1.5 + a * 2;
    ctx.beginPath(); ctx.arc(px, py, rr, 0, 6.2832); ctx.stroke();
    ctx.globalAlpha = a * 0.6 * h.strength * flick;
    ctx.strokeStyle = '#CFEFFF'; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.arc(px, py, rr * 0.55, 0, 6.2832); ctx.stroke();
  }
  ctx.globalAlpha = 1;
  ctx.restore(); // drop the clip

  // fresnel rim — a hemisphere seen edge-on is brightest where the eye grazes
  // the surface, so weight each segment by |cos| of its angle (max at the two
  // silhouette edges, min at the crown) with a slow traveling shimmer on top
  const SEGS = 28, OVERLAP = Math.PI / SEGS * 0.15; // butt caps + slight overlap tile seamlessly
  for (let i = 0; i < SEGS; i++) {
    const a0 = Math.PI + (i / SEGS) * Math.PI, a1 = Math.PI + ((i + 1) / SEGS) * Math.PI + OVERLAP;
    const mid = (a0 + a1) / 2;
    const fresnel = 0.25 + 0.75 * Math.pow(Math.abs(Math.cos(mid)), 1.6);
    const shimmer = 0.7 + 0.3 * Math.sin(mid * 5 - game.t * 2.6);
    const alpha = (0.18 + sf * 0.5 + fx.glow * 0.3 + fx.rebuilding * 0.3) * fresnel * shimmer * flick;
    // soft halo pass + bright core pass — cheaper than per-segment shadowBlur
    ctx.strokeStyle = `rgba(55,166,230,${alpha * 0.3})`;
    ctx.lineWidth = 5;
    ctx.beginPath(); ctx.arc(0, 0, shR, a0, a1); ctx.stroke();
    ctx.strokeStyle = `rgba(120,205,255,${Math.min(1, alpha)})`;
    ctx.lineWidth = 1.8;
    ctx.beginPath(); ctx.arc(0, 0, shR, a0, a1); ctx.stroke();
  }
  ctx.restore();
}
