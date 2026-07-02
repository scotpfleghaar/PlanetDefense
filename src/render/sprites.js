// Pre-rendered soft shadow sprite, built once. Drawing a cached blob with
// drawImage is dramatically cheaper than a per-frame canvas blur filter.
export const shadowSprite = (() => {
  const s = 128, c = document.createElement('canvas');
  c.width = c.height = s;
  const sc = c.getContext('2d');
  const g = sc.createRadialGradient(s/2, s/2, 0, s/2, s/2, s/2);
  g.addColorStop(0,    'rgba(9,12,20,1)');
  g.addColorStop(0.40, 'rgba(9,12,20,0.5)');
  g.addColorStop(1,    'rgba(9,12,20,0)');
  sc.fillStyle = g;
  sc.beginPath(); sc.arc(s/2, s/2, s/2, 0, 6.2832); sc.fill();
  return c;
})();

// Pre-rendered cloud puffs (radial blobs); alpha sets how pale/overcast they
// read. The dense core + quick falloff gives clouds a defined billowy edge
// rather than a uniform blur; the three tones let a cloud carry lit crowns
// over shaded flat bases, which is what makes the shapes read as real clouds.
function makePuffSprite(r, g, b) {
  const s = 128, c = document.createElement('canvas');
  c.width = c.height = s;
  const sc = c.getContext('2d');
  const grad = sc.createRadialGradient(s/2, s/2, 0, s/2, s/2, s/2);
  grad.addColorStop(0,    `rgba(${r},${g},${b},1)`);
  grad.addColorStop(0.5,  `rgba(${r},${g},${b},0.9)`);
  grad.addColorStop(0.8,  `rgba(${r},${g},${b},0.35)`);
  grad.addColorStop(1,    `rgba(${r},${g},${b},0)`);
  sc.fillStyle = grad;
  sc.beginPath(); sc.arc(s/2, s/2, s/2, 0, 6.2832); sc.fill();
  return c;
}
export const cloudLitSprite  = makePuffSprite(112, 122, 140); // sunlit crowns
export const cloudSprite     = makePuffSprite(84, 94, 112);   // mid grey body
export const cloudDarkSprite = makePuffSprite(40, 47, 60);    // shaded bases / storm slate
