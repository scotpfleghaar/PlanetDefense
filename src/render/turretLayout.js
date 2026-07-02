// Layout for the turret units. Up to ten sit adjacently across the platform; beyond
// ten they stack at the centre (barrels fanning from one spot, as the base did before).
// Pure function of player stats — shared by combat (muzzle origins) and rendering
// (turret sprites), so it lives outside both.
export function turretLayout(p) {
  const hw     = Math.min(40, 20 + Math.max(0, p.baseMax - 100) * 0.075); // platform half-width ← integrity
  const sr     = 4.5;                                                      // small turret dome radius
  const blen   = 3;                                                        // fixed barrel length (range no longer stretches it)
  const bthick = Math.min(4.5, 1.8 + Math.max(0, p.damage - 3) * 0.18);   // barrel girth ← damage
  const n      = Math.max(1, p.multishot);
  const stacked = n > 10;
  const platformTop = -4;
  const xs = [];
  if (stacked) {
    for (let i = 0; i < n; i++) xs.push(0);                 // all at centre — stacked into one
  } else {
    let spacing = sr * 2.2;
    const maxSpan = hw * 1.7;
    if (n > 1 && (n - 1) * spacing > maxSpan) spacing = maxSpan / (n - 1);
    for (let i = 0; i < n; i++) xs.push((i - (n - 1) / 2) * spacing); // centred row
  }
  return { hw, sr, blen, bthick, n, stacked, xs, platformTop, muzzleY: platformTop - sr };
}
