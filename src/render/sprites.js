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

// Pre-rendered soft cloud puff (grey radial blob); alpha sets how pale/overcast it reads.
export const cloudSprite = (() => {
  const s = 128, c = document.createElement('canvas');
  c.width = c.height = s;
  const sc = c.getContext('2d');
  const g = sc.createRadialGradient(s/2, s/2, 0, s/2, s/2, s/2);
  g.addColorStop(0,    'rgba(84,94,112,1)');
  g.addColorStop(0.55, 'rgba(84,94,112,0.5)');
  g.addColorStop(1,    'rgba(84,94,112,0)');
  sc.fillStyle = g;
  sc.beginPath(); sc.arc(s/2, s/2, s/2, 0, 6.2832); sc.fill();
  return c;
})();
