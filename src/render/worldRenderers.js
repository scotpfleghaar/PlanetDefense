import { WEAPONS } from '../data/weapons.js';
import { BUILDINGS } from '../data/buildings.js';
import { turretLayout } from './turretLayout.js';
import { cloudSprite } from './sprites.js';

export function drawCore(ctx, c) {
  ctx.save();
  ctx.translate(c.x, c.y); ctx.rotate(c.spin);
  ctx.shadowColor = '#C98A00'; ctx.shadowBlur = 12;
  ctx.fillStyle = '#C98A00';
  ctx.beginPath(); ctx.moveTo(0,-c.r); ctx.lineTo(c.r,0); ctx.lineTo(0,c.r); ctx.lineTo(-c.r,0); ctx.closePath(); ctx.fill();
  ctx.shadowBlur = 0;
  ctx.fillStyle = '#FFF8E6';
  ctx.beginPath(); ctx.arc(0,0,2.5,0,6.2832); ctx.fill();
  ctx.restore();
}

function ridgePath(ctx, pts, W, H) {
  ctx.beginPath();
  ctx.moveTo(-4, H + 4);
  for (const pt of pts) ctx.lineTo(pt.x, pt.y);
  ctx.lineTo(W + 4, H + 4);
  ctx.closePath();
}

export function drawHill(ctx, game) {
  if (!game.hill) return;
  ctx.fillStyle = 'rgba(11,61,145,0.16)'; // far ridge
  ridgePath(ctx, game.hillBack, game.W, game.H); ctx.fill();
  ctx.fillStyle = '#0A0E14';               // near hill silhouette
  ridgePath(ctx, game.hill, game.W, game.H); ctx.fill();
}

// Ground buildings — solid black silhouettes; only the glowing top accent distinguishes them.
export function drawBuilding(ctx, b) {
  const body = '#0A0E14';
  const lit = b.type === 'repair' ? (b.glow || 0) : b.flash; // accent brightness
  ctx.save();
  ctx.translate(b.x, b.y);
  ctx.fillStyle = body;

  if (b.type === 'silo') {                 // bunker with a launch hatch
    ctx.beginPath(); ctx.moveTo(-9, 2); ctx.lineTo(-6, -9); ctx.lineTo(6, -9); ctx.lineTo(9, 2); ctx.closePath(); ctx.fill();
    ctx.fillStyle = `rgba(252,61,33,${0.45 + lit * 0.55})`;
    ctx.beginPath(); ctx.ellipse(0, -9, 5, 2.2, 0, 0, 6.2832); ctx.fill();

  } else if (b.type === 'arc') {           // slim tower with a crackling coil orb
    ctx.fillRect(-4, -12, 8, 14);
    ctx.shadowColor = '#37A6E6'; ctx.shadowBlur = 6 + lit * 12;
    ctx.fillStyle = `rgba(55,166,230,${0.6 + lit * 0.4})`;
    ctx.beginPath(); ctx.arc(0, -14, 3.4, 0, 6.2832); ctx.fill();
    ctx.shadowBlur = 0;

  } else if (b.type === 'mortar') {        // squat block with an angled tube
    ctx.fillRect(-8, -6, 16, 8);
    ctx.save(); ctx.rotate(-0.5);
    ctx.fillStyle = body; ctx.fillRect(-2.6, -16, 5.2, 13); // black tube
    ctx.fillStyle = `rgba(201,138,0,${0.6 + lit * 0.4})`;
    ctx.beginPath(); ctx.arc(0, -16, 2.4, 0, 6.2832); ctx.fill(); // glowing muzzle
    ctx.restore();

  } else if (b.type === 'repair') {        // dome with a pulsing green cross
    ctx.beginPath(); ctx.arc(0, 0, 9, Math.PI, 0); ctx.fill();
    ctx.fillRect(-9, 0, 18, 3);
    ctx.fillStyle = `rgba(30,127,79,${0.55 + lit * 0.45})`;
    ctx.fillRect(-1.4, -7, 2.8, 8); ctx.fillRect(-4, -4.5, 8, 2.8);
  }
  const lvl = b.level || 1;
  if (lvl > 1) { // small level pips beneath an upgraded building
    const accent = BUILDINGS[b.type].accent, n = Math.min(lvl - 1, 5);
    ctx.fillStyle = accent;
    for (let i = 0; i < n; i++) ctx.fillRect(-((n - 1) * 4) / 2 + i * 4, 5, 2.4, 2.4);
  }
  ctx.restore();
}

function drawTurretUnit(ctx, tx, ty, angle, sr, blen, bthick, ink, weapon) {
  // each weapon shapes its barrel differently and carries a coloured muzzle tip
  let bl = blen, bt = bthick;
  if (weapon === 'laser')        { bt = Math.max(1.4, bthick*0.6); bl = blen*1.3; }
  else if (weapon === 'railgun') { bt = bthick*1.5;               bl = blen*1.55; }
  else if (weapon === 'missile') { bt = bthick*1.8;               bl = blen*0.7; }
  else if (weapon === 'flak')    { bt = bthick*1.5;               bl = blen*0.62; }
  const tip = weapon && WEAPONS[weapon] ? WEAPONS[weapon].tip : null;

  ctx.save();
  ctx.translate(tx, ty);
  ctx.fillStyle = ink;
  // pedestal dropping into the platform body so edge turrets stay planted, not floating
  ctx.beginPath();
  ctx.moveTo(-sr*0.65, -1); ctx.lineTo(sr*0.65, -1);
  ctx.lineTo(sr*0.9, 26);   ctx.lineTo(-sr*0.9, 26);
  ctx.closePath(); ctx.fill();
  ctx.save(); ctx.rotate(angle);
  ctx.fillRect(-bt/2, -(sr + bl), bt, bl + sr);                 // barrel
  if (weapon === 'flak') {                                       // flared muzzle
    ctx.beginPath();
    ctx.moveTo(-bt/2, -(sr + bl)); ctx.lineTo(-bt, -(sr + bl) - 3);
    ctx.lineTo(bt, -(sr + bl) - 3); ctx.lineTo(bt/2, -(sr + bl)); ctx.closePath(); ctx.fill();
  } else if (weapon === 'missile') {                            // boxy launcher head
    ctx.fillRect(-bt*0.75, -(sr + bl) - 2, bt*1.5, 4);
  }
  if (tip) { ctx.fillStyle = tip; ctx.beginPath(); ctx.arc(0, -(sr + bl), bt*0.55 + 0.6, 0, 6.2832); ctx.fill(); }
  ctx.restore();
  ctx.fillStyle = ink;
  ctx.beginPath(); ctx.arc(0, 0, sr, Math.PI, 0); ctx.fill();   // dome
  ctx.restore();
}

// Laser/railgun beams (fading lines) and explosion shockwaves (expanding rings).
export function drawBeams(ctx, game) {
  for (const b of game.beams) {
    const a = Math.max(0, Math.min(1, b.life / b.life0));
    if (b.ring) {
      ctx.globalAlpha = a * 0.7;
      ctx.strokeStyle = b.color; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(b.x, b.y, b.r * (1 + (1 - a) * 0.7), 0, 6.2832); ctx.stroke();
    } else {
      ctx.globalAlpha = a;
      ctx.strokeStyle = b.color; ctx.lineWidth = b.w * 1.6 * a + 1;
      ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke();
      ctx.strokeStyle = '#FFFFFF'; ctx.lineWidth = Math.max(1, b.w * 0.6 * a);
      ctx.beginPath(); ctx.moveTo(b.x1, b.y1); ctx.lineTo(b.x2, b.y2); ctx.stroke();
    }
  }
  ctx.globalAlpha = 1;
}

// Pre-target aim lines: a subtle dashed line from each turret to its locked target,
// fading out with distance. Faint blue while the target is still out of range,
// vermilion with a reticle once it is in range and being fired upon.
export function drawTargeting(ctx, game) {
  if (!game.locks || !game.locks.length) return;
  const L = turretLayout(game.p);
  ctx.save();
  ctx.lineWidth = 1;
  ctx.setLineDash([3, 5]);
  ctx.lineDashOffset = -(game.t * 22) % 8;
  for (let i = 0; i < game.locks.length; i++) {
    const e = game.locks[i];
    if (!e || e.dead) continue;
    const ox = game.bx + (L.xs[i] || 0), oy = game.by + L.muzzleY;
    const inRange = Math.hypot(e.x - game.bx, e.y - game.by) <= game.p.range;
    const tint = inRange ? '252,61,33' : '11,61,145';
    const grad = ctx.createLinearGradient(ox, oy, e.x, e.y);
    grad.addColorStop(0, `rgba(${tint},${inRange ? 0.55 : 0.32})`);
    grad.addColorStop(1, `rgba(${tint},0)`);          // fade out toward the target
    ctx.strokeStyle = grad;
    ctx.beginPath(); ctx.moveTo(ox, oy); ctx.lineTo(e.x, e.y); ctx.stroke();
    if (inRange) {                                     // lock reticle on the engaged target
      ctx.setLineDash([]);
      ctx.strokeStyle = 'rgba(252,61,33,0.55)';
      ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 4, 0, 6.2832); ctx.stroke();
      ctx.setLineDash([3, 5]);
    }
  }
  ctx.restore();
}

export function drawBase(ctx, game, x, y, hpFrac, flash) {
  const p = game.p;
  const ink = flash > 0 ? '#FC3D21' : '#0A0E14';
  const L = turretLayout(p);
  const hw = L.hw;
  const arcR = hw + 6;
  const shR  = hw + 22;

  ctx.save();
  ctx.translate(x, y);

  // platform silhouette
  ctx.fillStyle = ink;
  ctx.beginPath();
  ctx.moveTo(-hw, 20); ctx.lineTo(-hw*0.72, -4); ctx.lineTo(hw*0.72, -4); ctx.lineTo(hw, 20);
  ctx.closePath(); ctx.fill();

  // armour plating notches emerge as the hull is reinforced
  if (p.baseMax > 120) {
    ctx.strokeStyle = 'rgba(127,168,224,0.5)';
    ctx.lineWidth = 1;
    const plates = Math.min(4, Math.floor((p.baseMax - 100) / 30));
    for (let i = 1; i <= plates; i++) {
      const px = -hw + (hw * 2) * (i / (plates + 1));
      ctx.beginPath(); ctx.moveTo(px, -2); ctx.lineTo(px, 18); ctx.stroke();
    }
  }

  // turret units mounted on the platform, each aimed at its locked target
  for (let i = 0; i < L.n; i++) {
    const ang = (game.barrelAngles && game.barrelAngles[i] !== undefined) ? game.barrelAngles[i] : 0;
    const weapon = (p.turretWeapons && p.turretWeapons[i]) || 'cannon';
    drawTurretUnit(ctx, L.xs[i], L.platformTop, ang, L.sr, L.blen, L.bthick, ink, weapon);
  }

  // integrity arc — the one bright readout on the silhouette
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(11,61,145,0.18)';
  ctx.beginPath(); ctx.arc(0, 0, arcR, Math.PI*0.15, Math.PI*0.85); ctx.stroke();
  ctx.strokeStyle = hpFrac > 0.3 ? '#1E7F4F' : '#FC3D21';
  ctx.beginPath(); ctx.arc(0, 0, arcR, Math.PI*0.15, Math.PI*0.15 + Math.PI*0.7*hpFrac); ctx.stroke();

  // shield dome — brightness tracks remaining shield; pulses when it absorbs a hit
  if (p.shieldMax > 0 && p.shield > 0) {
    const sf = p.shield / p.shieldMax;
    const fl = game.shieldFlash;
    ctx.fillStyle = `rgba(55,166,230,${0.04 + sf*0.05 + fl*0.13})`;
    ctx.beginPath(); ctx.arc(0, 4, shR, Math.PI, 2*Math.PI); ctx.closePath(); ctx.fill();
    ctx.lineWidth = 2;
    ctx.strokeStyle = `rgba(55,166,230,${0.22 + sf*0.5 + fl*0.35})`;
    ctx.beginPath(); ctx.arc(0, 4, shR, Math.PI, 2*Math.PI); ctx.stroke();
  }
  ctx.restore();
}

export function drawTruck(ctx, game) {
  const t = game.truck.truck;
  if (!t || !t.visible) return;
  ctx.save();
  ctx.translate(t.x, t.y);
  ctx.rotate(t.angle || 0);             // tilt with the ground slope
  ctx.scale(t.dir, 1);                  // face travel direction
  ctx.fillStyle = '#0A0E14';            // black silhouette
  ctx.fillRect(-7, -6, 9, 5);           // cargo box
  ctx.fillRect(2, -4.5, 4, 3.5);        // cab
  ctx.fillRect(-7, -1.5, 13, 1.8);      // chassis
  ctx.beginPath();                      // wheels
  ctx.arc(-4, 0.4, 1.7, 0, 6.2832);
  ctx.arc(4, 0.4, 1.7, 0, 6.2832);
  ctx.fill();
  ctx.restore();
}

export function drawClouds(ctx, game) {
  const w = game.weather;
  if (!w.clouds.length) return;
  ctx.globalAlpha = 0.10 + 0.26 * w.cloudDark; // pale when clear, dense when overcast
  for (const cl of w.clouds)
    for (const pf of cl.puffs)
      ctx.drawImage(cloudSprite, cl.x + pf.dx - pf.r, cl.y + pf.dy - pf.r, pf.r * 2, pf.r * 2);
  ctx.globalAlpha = 1;
}

export function drawRain(ctx, game) {
  const w = game.weather;
  if (!w.rain.length || w.cloudDark < 0.05) return;
  ctx.strokeStyle = `rgba(120,140,170,${0.45 * w.cloudDark})`;
  ctx.lineWidth = 1;
  ctx.beginPath();
  for (const d of w.rain) { ctx.moveTo(d.x, d.y); ctx.lineTo(d.x - d.len*0.18, d.y - d.len); }
  ctx.stroke();
}

export function drawLightning(ctx, game) {
  for (const lb of game.weather.lightning) {
    const a = Math.max(0, lb.life / lb.life0);
    const stroke = () => { ctx.beginPath(); ctx.moveTo(lb.segs[0].x, lb.segs[0].y); for (let i = 1; i < lb.segs.length; i++) ctx.lineTo(lb.segs[i].x, lb.segs[i].y); ctx.stroke(); };
    ctx.strokeStyle = `rgba(120,180,255,${a})`; ctx.lineWidth = 4*a + 1; stroke();
    ctx.strokeStyle = `rgba(255,255,255,${a})`; ctx.lineWidth = 2*a + 0.5; stroke();
  }
}
