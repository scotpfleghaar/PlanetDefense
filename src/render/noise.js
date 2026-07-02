// Tileable fractal-noise (fBm: 4 octaves of smoothed value noise) alpha
// texture, generated once at startup. bakeCloud stamps it over a cloud
// silhouette with 'destination-out', eroding the shape into fractal billows —
// the classic fBm cloud look without any per-frame noise evaluation (running
// per-pixel fBm every frame is GPU-shader territory, not canvas 2D).
const SIZE = 256;   // texture px
const CELLS = 32;   // noise lattice size; power of 2 so every octave tiles

export const cloudNoiseTex = (() => {
  const lat = new Float32Array(CELLS * CELLS);
  for (let i = 0; i < lat.length; i++) lat[i] = Math.random();

  // bilinearly smoothed lattice value; indices wrap at `wrap` so the octave tiles
  const val = (x, y, wrap) => {
    const xi = Math.floor(x), yi = Math.floor(y), m = wrap - 1;
    const sm = t => t * t * (3 - 2 * t);
    const u = sm(x - xi), v = sm(y - yi);
    const x0 = xi & m, x1 = (xi + 1) & m, y0 = yi & m, y1 = (yi + 1) & m;
    const a = lat[y0 * CELLS + x0], b = lat[y0 * CELLS + x1];
    const c = lat[y1 * CELLS + x0], d = lat[y1 * CELLS + x1];
    return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
  };

  const c = document.createElement('canvas');
  c.width = c.height = SIZE;
  const sc = c.getContext('2d');
  const img = sc.createImageData(SIZE, SIZE);
  for (let y = 0; y < SIZE; y++) {
    for (let x = 0; x < SIZE; x++) {
      let f = 0, amp = 0.5, freq = 4;          // ~4 large billows across the tile
      for (let o = 0; o < 4; o++) {
        f += amp * val(x / SIZE * freq, y / SIZE * freq, freq);
        amp *= 0.5; freq *= 2;
      }
      // remap so mid densities erode partially and peaks punch clean holes
      const t = Math.max(0, Math.min(1, (f - 0.42) / 0.33));
      img.data[(y * SIZE + x) * 4 + 3] = t * t * (3 - 2 * t) * 255;
    }
  }
  sc.putImageData(img, 0, 0);
  return c;
})();
