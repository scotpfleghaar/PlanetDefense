import { shadowSprite } from './sprites.js';

// Trace an enemy's irregular rock silhouette (scaled) into the current path.
function rockPath(ctx, e, scale) {
  ctx.beginPath();
  for (let i = 0; i < e.verts.length; i++) {
    const v = e.verts[i], fx = Math.cos(v.a) * e.r * v.k * scale, fy = Math.sin(v.a) * e.r * v.k * scale;
    i ? ctx.lineTo(fx, fy) : ctx.moveTo(fx, fy);
  }
  ctx.closePath();
}

// Regular n-gon path centred on the current origin.
function polyPath(ctx, n, r, a0) {
  ctx.beginPath();
  for (let i = 0; i < n; i++) {
    const a = a0 + (i / n) * 6.2832, fx = Math.cos(a) * r, fy = Math.sin(a) * r;
    i ? ctx.lineTo(fx, fy) : ctx.moveTo(fx, fy);
  }
  ctx.closePath();
}

// One bespoke draw function per enemy "kind" (type, or 'rock' for any asteroid/
// pebble/comet). Each receives the shared per-frame values computed once in
// drawEnemy() below, and draws relative to an origin already translated to (e.x, e.y).
const RENDERERS = {
  carrier(ctx, e, game) {
    ctx.rotate(e.phase * 0.4);
    // glow ring
    ctx.shadowColor = '#FC3D21'; ctx.shadowBlur = 16;
    ctx.strokeStyle = '#FC3D21'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0,0,e.r,0,6.2832); ctx.stroke();
    ctx.shadowBlur = 0;
    ctx.fillStyle = 'rgba(252,61,33,0.18)';
    ctx.beginPath(); ctx.arc(0,0,e.r,0,6.2832); ctx.fill();
    // hull brackets + survey ticks around the ring
    ctx.fillStyle = '#0A0E14';
    for (let i=0;i<4;i++){ ctx.rotate(1.5708); ctx.fillRect(-2.5, -e.r-2, 5, 6); }
    ctx.strokeStyle = '#FC3D21';
    for (let i=0;i<4;i++){ ctx.rotate(1.5708); ctx.beginPath(); ctx.moveTo(0,-e.r-4); ctx.lineTo(0,-e.r-9); ctx.stroke(); }
    // gold payload core, pulsing — counter-rotated so it reads as slung cargo
    ctx.rotate(-e.phase * 0.4);
    const pulse = 0.8 + 0.2 * Math.sin(game.t * 5 + e.phase);
    ctx.fillStyle = '#C98A00';
    ctx.save(); ctx.scale(pulse, pulse);
    ctx.beginPath(); ctx.moveTo(0,-5.5); ctx.lineTo(5.5,0); ctx.lineTo(0,5.5); ctx.lineTo(-5.5,0); ctx.closePath(); ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#FFF8E6';
    ctx.beginPath(); ctx.arc(0,0,1.7,0,6.2832); ctx.fill();
  },

  rock(ctx, e, game, { hpFrac }) { // asteroid / pebble / comet nucleus — tumbling irregular slab
    ctx.rotate(e.phase * e.spin);
    ctx.fillStyle = e.color;
    ctx.strokeStyle = '#0A0E14'; ctx.lineWidth = 1.5;
    rockPath(ctx, e, 1); ctx.fill(); ctx.stroke();
    // lit facet toward the upper-left light source
    ctx.fillStyle = e.comet ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.14)';
    ctx.save(); ctx.translate(-e.r*0.18, -e.r*0.18); rockPath(ctx, e, 0.62); ctx.fill(); ctx.restore();
    // craters
    ctx.fillStyle = 'rgba(10,14,20,0.28)';
    for (const c of e.craters) { ctx.beginPath(); ctx.arc(c.x, c.y, c.r, 0, 6.2832); ctx.fill(); }
    // stress fractures spread once it's been chipped below half
    if (hpFrac < 0.55 && !e.comet) {
      ctx.strokeStyle = 'rgba(10,14,20,0.55)'; ctx.lineWidth = 1;
      ctx.beginPath();
      for (let i = 0; i < 3; i++) {
        const v = e.verts[(i * 2) % e.verts.length];
        ctx.moveTo(0, 0); ctx.lineTo(Math.cos(v.a) * e.r * v.k * 0.8, Math.sin(v.a) * e.r * v.k * 0.8);
      }
      ctx.stroke();
    }
  },

  hulk(ctx, e, game, { heading, flick }) { // riveted freighter slab
    ctx.rotate(heading);
    const w2 = e.r * 0.85, h2 = e.r;
    // twin engine glows at the rear
    ctx.fillStyle = `rgba(252,61,33,${0.4 * flick})`;
    ctx.fillRect(-w2*0.6 - 2, h2, 4, 4 + 3*flick);
    ctx.fillRect( w2*0.6 - 2, h2, 4, 4 + 3*flick);
    // hull with a chamfered nose
    ctx.fillStyle = e.color;
    ctx.strokeStyle = '#0A0E14'; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-w2, -h2*0.55); ctx.lineTo(-w2*0.55, -h2); ctx.lineTo(w2*0.55, -h2); ctx.lineTo(w2, -h2*0.55);
    ctx.lineTo(w2, h2); ctx.lineTo(-w2, h2); ctx.closePath();
    ctx.fill(); ctx.stroke();
    // plating seams + rivets
    ctx.strokeStyle = 'rgba(10,14,20,0.4)'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-w2, -h2*0.1); ctx.lineTo(w2, -h2*0.1);
    ctx.moveTo(-w2, h2*0.5);  ctx.lineTo(w2, h2*0.5);
    ctx.stroke();
    ctx.fillStyle = 'rgba(10,14,20,0.5)';
    for (const [rx, ry] of [[-w2*0.6,-h2*0.35],[w2*0.6,-h2*0.35],[-w2*0.6,h2*0.75],[w2*0.6,h2*0.75]]) {
      ctx.beginPath(); ctx.arc(rx, ry, 1.4, 0, 6.2832); ctx.fill();
    }
    // vermilion hazard chevron on the nose
    ctx.strokeStyle = 'rgba(252,61,33,0.85)'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.moveTo(-w2*0.4, -h2*0.6); ctx.lineTo(0, -h2*0.82); ctx.lineTo(w2*0.4, -h2*0.6); ctx.stroke();
  },

  swarm(ctx, e, game, { heading, flick }) { // tiny dart with a wing shimmer
    ctx.rotate(heading);
    ctx.fillStyle = `rgba(30,127,79,${0.28 * flick})`;
    ctx.beginPath(); ctx.ellipse(0, e.r*0.2, e.r*1.3, e.r*0.45, 0, 0, 6.2832); ctx.fill();
    ctx.fillStyle = e.color;
    ctx.beginPath(); ctx.moveTo(0,-e.r); ctx.lineTo(e.r*0.8, e.r); ctx.lineTo(0, e.r*0.45); ctx.lineTo(-e.r*0.8, e.r); ctx.closePath(); ctx.fill();
    ctx.fillStyle = '#F3F5F8';
    ctx.fillRect(-0.8, -e.r*0.45, 1.6, 1.6);
  },

  sprinter(ctx, e, game, { heading, flick }) { // teal needle with an afterburner
    ctx.rotate(heading);
    // trailing speed lines
    ctx.strokeStyle = 'rgba(14,124,139,0.35)'; ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(-e.r*0.5, e.r*1.0); ctx.lineTo(-e.r*0.5, e.r*1.0 + 7);
    ctx.moveTo( e.r*0.5, e.r*1.0); ctx.lineTo( e.r*0.5, e.r*1.0 + 7);
    ctx.stroke();
    // afterburner flame
    ctx.fillStyle = `rgba(252,61,33,${0.55 * flick})`;
    ctx.beginPath(); ctx.moveTo(-2, e.r*0.75); ctx.lineTo(0, e.r*0.75 + 6 + 5*flick); ctx.lineTo(2, e.r*0.75); ctx.closePath(); ctx.fill();
    // needle hull + canopy stripe
    ctx.fillStyle = e.color;
    ctx.beginPath(); ctx.moveTo(0, -e.r*1.5); ctx.lineTo(e.r*0.55, e.r*0.8); ctx.lineTo(0, e.r*0.4); ctx.lineTo(-e.r*0.55, e.r*0.8); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = 'rgba(243,245,248,0.8)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, -e.r*1.1); ctx.lineTo(0, -e.r*0.2); ctx.stroke();
  },

  brute(ctx, e, game, { hpFrac }) { // hexagonal dreadnought, slow self-rotation
    ctx.rotate(e.phase * 0.15);
    ctx.fillStyle = e.color;
    ctx.strokeStyle = '#0A0E14'; ctx.lineWidth = 2;
    polyPath(ctx, 6, e.r, Math.PI/6); ctx.fill(); ctx.stroke();
    // inner armour line + vertex bolts
    ctx.strokeStyle = 'rgba(127,168,224,0.35)'; ctx.lineWidth = 1.5;
    polyPath(ctx, 6, e.r*0.72, Math.PI/6); ctx.stroke();
    ctx.fillStyle = '#0A0E14';
    for (let i=0;i<6;i++){ const a=Math.PI/6 + i*Math.PI/3; ctx.beginPath(); ctx.arc(Math.cos(a)*e.r*0.85, Math.sin(a)*e.r*0.85, 1.8, 0, 6.2832); ctx.fill(); }
    // reactor core — runs blue, glows angry vermilion once the hull is half gone
    const coreCol = hpFrac > 0.5 ? '11,61,145' : '252,61,33';
    ctx.fillStyle = `rgba(${coreCol},${0.55 + 0.35 * Math.sin(game.t * 4 + e.phase)})`;
    polyPath(ctx, 6, e.r*0.32, Math.PI/6); ctx.fill();
  },

  splitter(ctx, e, game, { hpFrac }) { // organic cell, nuclei drift apart as it nears splitting
    const wob = 1 + 0.06 * Math.sin(game.t * 6 + e.phase);
    ctx.fillStyle = 'rgba(122,61,145,0.28)';
    ctx.strokeStyle = e.color; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(0, 0, e.r * wob, 0, 6.2832); ctx.fill(); ctx.stroke();
    const sep = e.r * (0.22 + 0.38 * (1 - hpFrac));
    const bob = Math.sin(game.t * 3 + e.phase) * 1.5, nr = e.r * 0.34;
    ctx.fillStyle = e.color;
    ctx.beginPath(); ctx.arc(-sep,  bob, nr, 0, 6.2832); ctx.fill();
    ctx.beginPath(); ctx.arc( sep, -bob, nr, 0, 6.2832); ctx.fill();
    ctx.fillStyle = '#F3F5F8';
    ctx.beginPath(); ctx.arc(-sep,  bob, 1.4, 0, 6.2832); ctx.fill();
    ctx.beginPath(); ctx.arc( sep, -bob, 1.4, 0, 6.2832); ctx.fill();
  },

  weaver(ctx, e, game) { // spinning gold star with a shimmer halo
    ctx.fillStyle = `rgba(201,138,0,${0.12 + 0.08 * Math.sin(game.t * 8 + e.phase)})`;
    ctx.beginPath(); ctx.arc(0, 0, e.r*1.25, 0, 6.2832); ctx.fill();
    ctx.rotate(e.phase * 1.2);
    ctx.fillStyle = e.color;
    ctx.strokeStyle = '#0A0E14'; ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i=0;i<8;i++){ const a=i*Math.PI/4, rr=(i%2===0)?e.r:e.r*0.4, fx=Math.cos(a)*rr, fy=Math.sin(a)*rr; i?ctx.lineTo(fx,fy):ctx.moveTo(fx,fy); }
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#0A0E14';
    polyPath(ctx, 4, e.r*0.28, 0); ctx.fill();
    ctx.fillStyle = '#F3F5F8';
    ctx.beginPath(); ctx.arc(0, 0, 1.2, 0, 6.2832); ctx.fill();
  },

  armored(ctx, e, game, { hpFrac }) { // steel core ringed by plates that shear off with damage
    ctx.rotate(e.phase * 0.25);
    ctx.fillStyle = '#3A4250';
    ctx.strokeStyle = '#0A0E14'; ctx.lineWidth = 1;
    polyPath(ctx, 8, e.r*0.62, Math.PI/8); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(252,61,33,0.9)';
    ctx.beginPath(); ctx.arc(0, 0, 2.2, 0, 6.2832); ctx.fill();
    // one plate falls away per eighth of hp lost — armour visibly wearing down
    const plates = Math.ceil(hpFrac * 8);
    ctx.fillStyle = e.color;
    for (let i = 0; i < plates; i++) {
      const a1 = Math.PI/8 + i*Math.PI/4 + 0.06, a2 = Math.PI/8 + (i+1)*Math.PI/4 - 0.06;
      ctx.beginPath();
      ctx.arc(0, 0, e.r + 1.5, a1, a2);
      ctx.arc(0, 0, e.r * 0.72, a2, a1, true);
      ctx.closePath(); ctx.fill(); ctx.stroke();
    }
  },

  hive(ctx, e, game, { heading }) { // segmented carapace carrier that births swarm darts
    ctx.rotate(heading);
    // rear hatch — glows when a child is born
    ctx.fillStyle = `rgba(30,127,79,${0.25 + (e.hatch || 0) * 0.6})`;
    ctx.beginPath(); ctx.ellipse(0, e.r * 0.8, e.r * 0.42, e.r * 0.26, 0, 0, 6.2832); ctx.fill();
    // carapace with segment seams
    ctx.fillStyle = e.color;
    ctx.strokeStyle = '#0A0E14'; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.ellipse(0, 0, e.r * 0.8, e.r, 0, 0, 6.2832); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(10,14,20,0.4)'; ctx.lineWidth = 1;
    for (let i = -1; i <= 1; i++) {
      const sy2 = i * e.r * 0.42, sw = e.r * 0.78 * Math.sqrt(1 - Math.pow(sy2 / e.r, 2));
      ctx.beginPath(); ctx.moveTo(-sw, sy2); ctx.lineTo(sw, sy2); ctx.stroke();
    }
    // brood pips along the flanks — one dims for each dart already hatched
    const total = e.spawner.brood;
    for (let i = 0; i < total; i++) {
      const side = i % 2 ? 1 : -1, row = Math.floor(i / 2);
      const py2 = -e.r * 0.55 + row * e.r * 0.32;
      ctx.fillStyle = i < e.brood ? '#F3F5F8' : 'rgba(10,14,20,0.55)';
      ctx.beginPath(); ctx.arc(side * e.r * 0.5, py2, 1.6, 0, 6.2832); ctx.fill();
    }
  },

  phantom(ctx, e, game, { heading }) { // ghost craft — dashed outline while faded out
    ctx.globalAlpha = e.fade;
    ctx.rotate(heading);
    ctx.fillStyle = 'rgba(127,168,224,0.18)';
    ctx.strokeStyle = e.color; ctx.lineWidth = 1.5;
    ctx.setLineDash(e.solid ? [] : [4, 3]);
    ctx.beginPath();
    ctx.moveTo(0, -e.r * 1.2);
    ctx.quadraticCurveTo( e.r, -e.r * 0.2, 0, e.r);
    ctx.quadraticCurveTo(-e.r, -e.r * 0.2, 0, -e.r * 1.2);
    ctx.closePath(); ctx.fill(); ctx.stroke();
    ctx.setLineDash([]);
    // sensor eye stays lit even when the hull fades
    ctx.fillStyle = e.color;
    ctx.beginPath(); ctx.arc(0, -e.r * 0.3, 2, 0, 6.2832); ctx.fill();
  },

  tender(ctx, e, game, { heading }) { // steel medic drone with a green cross
    if (e.pulse) { // expanding heal ring
      ctx.strokeStyle = `rgba(30,127,79,${e.pulse * 0.5})`; ctx.lineWidth = 1.5;
      ctx.beginPath(); ctx.arc(0, 0, e.r + (1 - e.pulse) * 26, 0, 6.2832); ctx.stroke();
    }
    ctx.rotate(heading);
    ctx.fillStyle = e.color;
    ctx.strokeStyle = '#0A0E14'; ctx.lineWidth = 1.5;
    polyPath(ctx, 6, e.r, 0); ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#1E7F4F';
    ctx.fillRect(-1.8, -e.r * 0.55, 3.6, e.r * 1.1);
    ctx.fillRect(-e.r * 0.55, -1.8, e.r * 1.1, 3.6);
  },

  blinker(ctx, e) { // unstable twin-triangle drive that spins up, then jumps
    const charge = 1 - Math.max(0, Math.min(1, e.blinkT / e.blink.interval));
    if (e.blinkFx) { // rematerialise flash
      ctx.strokeStyle = `rgba(122,61,145,${e.blinkFx * 0.7})`; ctx.lineWidth = 2;
      ctx.beginPath(); ctx.arc(0, 0, e.r + 3 + (1 - e.blinkFx) * 10, 0, 6.2832); ctx.stroke();
    }
    ctx.rotate(e.phase * 2 + charge * charge * 6); // accelerating spin telegraphs the jump
    ctx.fillStyle = e.color;
    ctx.strokeStyle = '#0A0E14'; ctx.lineWidth = 1;
    polyPath(ctx, 3, e.r, -Math.PI / 2); ctx.fill(); ctx.stroke();
    ctx.fillStyle = 'rgba(243,245,248,0.55)';
    polyPath(ctx, 3, e.r * 0.55, Math.PI / 2); ctx.fill();
    // drive core brightens toward vermilion as the charge completes
    ctx.fillStyle = `rgba(252,61,33,${0.2 + charge * 0.8})`;
    ctx.beginPath(); ctx.arc(0, 0, 2.2, 0, 6.2832); ctx.fill();
  },

  titan(ctx, e, game, { hpFrac }) { // layered dreadnought — carries two brutes inside
    ctx.rotate(e.phase * 0.1);
    ctx.fillStyle = e.color;
    ctx.strokeStyle = '#0A0E14'; ctx.lineWidth = 2.5;
    polyPath(ctx, 8, e.r, Math.PI / 8); ctx.fill(); ctx.stroke();
    // vermilion hazard ticks on alternating facets
    ctx.strokeStyle = 'rgba(252,61,33,0.7)'; ctx.lineWidth = 2;
    for (let i = 0; i < 8; i += 2) {
      const a = Math.PI / 8 + (i + 0.5) * Math.PI / 4;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * e.r * 0.82, Math.sin(a) * e.r * 0.82);
      ctx.lineTo(Math.cos(a) * e.r * 0.95, Math.sin(a) * e.r * 0.95);
      ctx.stroke();
    }
    // counter-rotating inner platform
    ctx.rotate(-e.phase * 0.28);
    ctx.fillStyle = '#3A4250';
    ctx.strokeStyle = '#0A0E14'; ctx.lineWidth = 1.5;
    polyPath(ctx, 6, e.r * 0.6, 0); ctx.fill(); ctx.stroke();
    // the two brute cores it splits into, pulsing harder as the hull fails
    const beat = 0.6 + 0.4 * Math.sin(game.t * (3 + (1 - hpFrac) * 5) + e.phase);
    ctx.fillStyle = `rgba(127,168,224,${0.35 + beat * 0.4})`;
    polyPath(ctx, 6, e.r * 0.2, Math.PI / 6); ctx.fill();
    ctx.save(); ctx.translate(-e.r * 0.3, 0); polyPath(ctx, 6, e.r * 0.14, 0); ctx.fill(); ctx.restore();
    ctx.save(); ctx.translate( e.r * 0.3, 0); polyPath(ctx, 6, e.r * 0.14, 0); ctx.fill(); ctx.restore();
  },

  boss(ctx, e, game, { hpFrac }) { // the wave-50 Dreadnought — layered command ship
    // spinal-beam telegraph — a pulsing sightline from the keel to the base
    if (e.beamChargeT > 0) {
      const pulse = 0.25 + 0.45 * Math.abs(Math.sin(game.t * 14));
      ctx.strokeStyle = `rgba(252,61,33,${pulse})`; ctx.lineWidth = 2;
      ctx.setLineDash([6, 5]);
      ctx.beginPath(); ctx.moveTo(0, e.r * 0.6); ctx.lineTo(game.bx - e.x, game.by - 20 - e.y); ctx.stroke();
      ctx.setLineDash([]);
    }
    // volley charge glow under the keel
    if (e.chargeT > 0) {
      const k = 1 - Math.min(1, e.chargeT / 0.8);
      ctx.fillStyle = `rgba(252,61,33,${0.15 + k * 0.45})`;
      ctx.beginPath(); ctx.arc(0, e.r * 0.6, 5 + k * 7, 0, 6.2832); ctx.fill();
    }
    // outer hull ring, slow self-rotation
    ctx.save();
    ctx.rotate(e.phase * 0.08);
    ctx.fillStyle = e.color;
    ctx.strokeStyle = '#0A0E14'; ctx.lineWidth = 3;
    polyPath(ctx, 12, e.r, Math.PI / 12); ctx.fill(); ctx.stroke();
    // hazard ticks on alternating facets
    ctx.strokeStyle = 'rgba(252,61,33,0.75)'; ctx.lineWidth = 2.5;
    for (let i = 0; i < 12; i += 2) {
      const a = Math.PI / 12 + (i + 0.5) * Math.PI / 6;
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * e.r * 0.84, Math.sin(a) * e.r * 0.84);
      ctx.lineTo(Math.cos(a) * e.r * 0.96, Math.sin(a) * e.r * 0.96);
      ctx.stroke();
    }
    // phase-2 armor plating — steel segments ringing the hull while armor holds
    if (e.stage >= 2) {
      ctx.fillStyle = '#5B6471'; ctx.strokeStyle = '#0A0E14'; ctx.lineWidth = 1.5;
      for (let i = 0; i < 8; i++) {
        const a1 = i * Math.PI / 4 + 0.08, a2 = (i + 1) * Math.PI / 4 - 0.08;
        ctx.beginPath();
        ctx.arc(0, 0, e.r * 1.12, a1, a2);
        ctx.arc(0, 0, e.r * 1.0, a2, a1, true);
        ctx.closePath(); ctx.fill(); ctx.stroke();
      }
    }
    ctx.restore();
    // counter-rotating command platform
    ctx.save();
    ctx.rotate(-e.phase * 0.2);
    ctx.fillStyle = '#3A4250';
    ctx.strokeStyle = '#0A0E14'; ctx.lineWidth = 2;
    polyPath(ctx, 6, e.r * 0.58, 0); ctx.fill(); ctx.stroke();
    ctx.strokeStyle = 'rgba(127,168,224,0.35)'; ctx.lineWidth = 1.5;
    polyPath(ctx, 6, e.r * 0.42, 0); ctx.stroke();
    ctx.restore();
    // reactor core — blue → gold → angry vermilion as phases advance
    const coreCol = e.stage === 1 ? '11,61,145' : e.stage === 2 ? '201,138,0' : '252,61,33';
    const beat = 0.5 + 0.4 * Math.sin(game.t * (3 + e.stage * 2) + e.phase);
    ctx.fillStyle = `rgba(${coreCol},${beat})`;
    polyPath(ctx, 6, e.r * 0.24, Math.PI / 6); ctx.fill();
    ctx.fillStyle = '#F3F5F8';
    ctx.beginPath(); ctx.arc(0, 0, 2.4, 0, 6.2832); ctx.fill();
    // wide hull-integrity bar above the ship (replaces the tiny generic bar)
    ctx.fillStyle = 'rgba(10,14,20,0.25)';
    ctx.fillRect(-e.r * 1.3, -e.r - 16, e.r * 2.6, 5);
    ctx.fillStyle = '#FC3D21';
    ctx.fillRect(-e.r * 1.3, -e.r - 16, e.r * 2.6 * hpFrac, 5);
  },

  drone(ctx, e, game, { heading, flick }) { // small blueprint-blue craft (also the default)
    ctx.rotate(heading);
    // engine flicker at the tail
    ctx.fillStyle = `rgba(252,61,33,${0.35 * flick})`;
    ctx.beginPath(); ctx.moveTo(-2.5, e.r*0.85); ctx.lineTo(0, e.r*0.85 + 5*flick); ctx.lineTo(2.5, e.r*0.85); ctx.closePath(); ctx.fill();
    // stub fins
    ctx.fillStyle = '#0A0E14';
    ctx.beginPath(); ctx.moveTo(-e.r, e.r*0.6); ctx.lineTo(-e.r*0.25, -e.r*0.1); ctx.lineTo(-e.r*0.25, e.r*0.75); ctx.closePath(); ctx.fill();
    ctx.beginPath(); ctx.moveTo( e.r, e.r*0.6); ctx.lineTo( e.r*0.25, -e.r*0.1); ctx.lineTo( e.r*0.25, e.r*0.75); ctx.closePath(); ctx.fill();
    // hull — elongated diamond with a canopy window
    ctx.fillStyle = e.color;
    ctx.strokeStyle = '#0A0E14'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(0, -e.r*1.1); ctx.lineTo(e.r*0.55, e.r*0.35); ctx.lineTo(0, e.r*0.85); ctx.lineTo(-e.r*0.55, e.r*0.35); ctx.closePath();
    ctx.fill(); ctx.stroke();
    ctx.fillStyle = '#F3F5F8';
    ctx.beginPath(); ctx.arc(0, -e.r*0.35, Math.max(1.2, e.r*0.18), 0, 6.2832); ctx.fill();
  },
};

function kindOf(e) {
  if (e.type === 'carrier') return 'carrier';
  if (e.rock) return 'rock';
  return e.type;
}

export function drawEnemy(ctx, e, game) {
  // proximity shadow cast on the surface below — a cached soft sprite, offset away
  // from a fixed light source and squashed to the ground plane. Far from the surface
  // it is wide and faint; as it descends it draws in and darkens into a contact shadow.
  const dToBase = Math.hypot(e.x - game.bx, e.y - game.by);
  const prox = Math.max(0, Math.min(1, 1 - dToBase / ((game.diag || Math.hypot(game.W, game.H)) * 0.62)));
  const far = 1 - prox;
  {
    const off = far * e.r * 1.1;             // displaced from object when high up
    const sx  = e.x + off * 0.30;            // light from upper-left → shadow lower-right
    const sy  = e.y + e.r * 0.2 + off * 0.55;
    const w   = e.r * (2.7 + far * 3.4);     // tight when close → wide when far
    const h   = w * 0.6;                      // squashed to the ground plane
    ctx.globalAlpha = 0.05 + prox * 0.16;    // faint when far → a touch darker when close
    ctx.drawImage(shadowSprite, sx - w/2, sy - h/2, w, h);
    ctx.globalAlpha = 1;
  }

  // comet ion tail — streams opposite the velocity, drawn in world space under the body
  if (e.comet) {
    const spd = Math.hypot(e.vx || 0, e.vy || 1) || 1;
    const tx = -(e.vx || 0) / spd, ty = -(e.vy || 1) / spd;
    const len = e.r * (5 + Math.sin(game.t * 9 + e.phase) * 0.8);
    const grad = ctx.createLinearGradient(e.x, e.y, e.x + tx * len, e.y + ty * len);
    grad.addColorStop(0, 'rgba(55,166,230,0.45)');
    grad.addColorStop(1, 'rgba(55,166,230,0)');
    ctx.fillStyle = grad;
    const px = -ty, py = tx; // perpendicular, sets the tail's width at the head
    ctx.beginPath();
    ctx.moveTo(e.x + px * e.r * 0.7, e.y + py * e.r * 0.7);
    ctx.lineTo(e.x + tx * len, e.y + ty * len);
    ctx.lineTo(e.x - px * e.r * 0.7, e.y - py * e.r * 0.7);
    ctx.closePath(); ctx.fill();
  }

  // rank halo — pulsing ring in the rank's color behind the craft
  if (e.rank) {
    ctx.strokeStyle = e.rankColor;
    ctx.globalAlpha = 0.45 + 0.25 * Math.sin(game.t * 4 + e.phase);
    ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 4, 0, 6.2832); ctx.stroke();
    ctx.globalAlpha = 1;
  }

  ctx.save();
  ctx.translate(e.x, e.y);
  const hpFrac = e.hp / e.maxhp;
  // craft sprites are drawn nose-up and rotated to their heading; rocks tumble instead
  const heading = Math.atan2(e.vy ?? 60, e.vx ?? 0) + Math.PI / 2;
  const flick = 0.6 + 0.4 * Math.sin(game.t * 22 + e.phase * 7); // shared engine flicker

  const renderer = RENDERERS[kindOf(e)] || RENDERERS.drone;
  renderer(ctx, e, game, { hpFrac, heading, flick });

  ctx.restore();
  // overshield bubble — brightens and flares when hit, dims as it drains
  if (e.maxShield && e.shield > 0) {
    const sf = e.shield / e.maxShield, flare = e.shieldFx || 0;
    ctx.beginPath(); ctx.arc(e.x, e.y, e.r + 6, 0, 6.2832);
    ctx.strokeStyle = '#7FA8E0';
    ctx.lineWidth = 1.5 + flare * 2;
    ctx.globalAlpha = 0.22 + sf * 0.3 + flare * 0.4;
    ctx.stroke();
    ctx.fillStyle = '#7FA8E0';
    ctx.globalAlpha = 0.05 + flare * 0.15;
    ctx.fill();
    ctx.globalAlpha = 1;
  }
  // hp bar for tougher/ranked enemies (the boss draws its own wide bar)
  if (hpFrac < 1 && (e.r >= 13 || e.rank) && e.type !== 'boss') {
    ctx.fillStyle = 'rgba(11,61,145,0.18)';
    ctx.fillRect(e.x - e.r, e.y - e.r - 7, e.r*2, 3);
    ctx.fillStyle = e.type === 'carrier' ? '#C98A00' : '#FC3D21';
    ctx.fillRect(e.x - e.r, e.y - e.r - 7, e.r*2*hpFrac, 3);
  }
  // shield bar above the hp bar
  if (e.maxShield && e.shield < e.maxShield && e.type !== 'boss') {
    ctx.fillStyle = 'rgba(127,168,224,0.18)';
    ctx.fillRect(e.x - e.r, e.y - e.r - 11, e.r*2, 3);
    ctx.fillStyle = '#7FA8E0';
    ctx.fillRect(e.x - e.r, e.y - e.r - 11, e.r*2*(e.shield/e.maxShield), 3);
  }
}
