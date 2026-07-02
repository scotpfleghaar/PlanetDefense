// WebGL cloud-field renderer. Instead of stamping baked sprite silhouettes,
// every pixel evaluates a live 3D density field (domain-warped fBm with time as
// the third dimension), so clouds continuously boil, grow and dissipate, have
// soft volumetric interiors, and — via a self-shadowing sample of the mass
// overhead — genuinely dark flat bases and bright tops. Rendered at half
// resolution into an offscreen canvas that Renderer composites into the 2D
// scene (back strata behind the enemies, the low stratum in front). If WebGL
// is unavailable the old sprite pipeline in worldRenderers takes over.

const VS = `
attribute vec2 aP;
void main() { gl_Position = vec4(aP, 0.0, 1.0); }
`;

const FS = `
precision highp float;
uniform vec2  uRes;
uniform vec2  uBand;    // stratum top/bottom in y01 (0 = top of screen)
uniform vec2  uNScale;  // noise frequency in x / y
uniform float uWarp;    // domain-warp strength
uniform float uDrift;   // accumulated horizontal drift, in uv widths
uniform float uEvolve;  // accumulated evolution time (noise z)
uniform float uCov;     // sky coverage 0..1
uniform float uAlpha;   // layer max alpha
uniform float uDark;    // storm overcast 0..1
uniform vec3  uFront;   // (leading edge x01, trailing edge x01, wall density); z=0 disables

float hash(vec3 p) {
  p = fract(p * vec3(443.897, 441.423, 437.195));
  p += dot(p, p.yzx + 19.19);
  return fract((p.x + p.y) * p.z);
}
float vnoise(vec3 p) {
  vec3 i = floor(p), f = fract(p);
  f = f * f * (3.0 - 2.0 * f);
  float n00 = mix(hash(i),                       hash(i + vec3(1.0, 0.0, 0.0)), f.x);
  float n10 = mix(hash(i + vec3(0.0, 1.0, 0.0)), hash(i + vec3(1.0, 1.0, 0.0)), f.x);
  float n01 = mix(hash(i + vec3(0.0, 0.0, 1.0)), hash(i + vec3(1.0, 0.0, 1.0)), f.x);
  float n11 = mix(hash(i + vec3(0.0, 1.0, 1.0)), hash(i + vec3(1.0, 1.0, 1.0)), f.x);
  return mix(mix(n00, n10, f.y), mix(n01, n11, f.y), f.z);
}
float fbm(vec3 p) {
  float f = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { f += a * vnoise(p); p = p * 2.03 + 17.1; a *= 0.5; }
  return f * 1.032;
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  uv.y = 1.0 - uv.y;                          // y01 = 0 at the top of the screen
  float aspect = uRes.x / uRes.y;

  // stratum band with feathered edges
  float yb = (uv.y - uBand.x) / (uBand.y - uBand.x); // 0 stratum top .. 1 base
  float band = smoothstep(0.0, 0.3, yb) * (1.0 - smoothstep(0.7, 1.0, yb));
  if (band < 0.003) { gl_FragColor = vec4(0.0); return; }

  // domain-warped fBm density; uEvolve slides through the 3rd dimension so the
  // field itself churns rather than translating a frozen shape
  vec3 P = vec3((uv.x * aspect + uDrift) * uNScale.x, uv.y * uNScale.y, uEvolve);
  vec2 w = vec2(fbm(P * 0.55 + 4.7), fbm(P * 0.55 + 9.2)) - 0.5;
  vec3 Q = P + vec3(w * uWarp, 0.0);
  float d = fbm(Q);

  // coverage: ambient + the storm-front wall between its trailing/leading edges
  float cov = uCov, wall = 0.0;
  if (uFront.z > 0.0) {
    float rag = (fbm(vec3(uv.y * 5.0, uEvolve * 0.6, 33.7)) - 0.5) * 0.16;
    wall = uFront.z * smoothstep(uFront.x + rag, uFront.x + rag - 0.22, uv.x)
                    * smoothstep(uFront.y - 0.15, uFront.y + 0.1, uv.x);
    cov += wall;
  }

  // condensation threshold: more coverage condenses more of the field; rising
  // sharply toward the stratum base gives the flat undersides of real cumulus
  float thr = mix(0.62, 0.38, clamp(cov, 0.0, 1.0));
  thr += smoothstep(0.5, 1.0, yb) * 0.16;
  float dens = smoothstep(thr, thr + 0.17, d) * band;
  if (dens < 0.003) { gl_FragColor = vec4(0.0); return; }

  // self-shadowing: sample the field a little higher — the more cloud mass
  // overhead, the darker this pixel. Bases go dark because they are underneath
  // the cloud, tops stay lit.
  float dUp = fbm(Q - vec3(0.0, uNScale.y * 0.10, 0.0));
  float overhead = clamp((dUp - thr) * 2.6, 0.0, 1.0);
  float shade = clamp(overhead * 0.55 + yb * 0.5 + uDark * 0.25 + wall * 0.3, 0.0, 1.0);

  vec3 lit  = mix(vec3(0.80, 0.82, 0.87), vec3(0.58, 0.61, 0.68), uDark);
  vec3 base = mix(vec3(0.44, 0.48, 0.56), vec3(0.15, 0.17, 0.23), uDark);
  vec3 col = mix(lit, base, shade);

  float a = dens * uAlpha;
  gl_FragColor = vec4(col * a, a);            // premultiplied alpha
}
`;

// Per-stratum field parameters. cov/alpha ramp with the overcast (cloudDark);
// the low stratum renders in front of enemies, so its alpha stays capped below
// full so threats never completely vanish inside a storm.
const LAYERS = {
  high: { band: [0.02, 0.15], ns: [2.6, 30.0], warp: 0.6, evolve: 0.010, seed: 3.7,
          cov: k => 0.26 + 0.10 * k, alpha: k => 0.42 + 0.10 * k, front: false },
  mid:  { band: [0.10, 0.34], ns: [4.4, 8.6],  warp: 1.6, evolve: 0.020, seed: 11.3,
          cov: k => 0.32 + 0.26 * k, alpha: k => 0.60 + 0.15 * k, front: false },
  low:  { band: [0.24, 0.52], ns: [3.1, 6.2],  warp: 2.2, evolve: 0.030, seed: 27.9,
          cov: k => 0.27 + 0.30 * k, alpha: k => 0.60 + 0.18 * k, front: true },
};

class CloudGL {
  constructor() { this.ok = false; this.tried = false; }

  setup(w, h) {
    if (!this.tried) { this.tried = true; this.init(); }
    if (!this.ok) return;
    // half resolution: the field is soft, the upscale is invisible, the fill cost quarters
    const gw = Math.max(2, Math.round(w / 2)), gh = Math.max(2, Math.round(h / 2));
    if (gw !== this.cv.width || gh !== this.cv.height) {
      this.cv.width = gw; this.cv.height = gh;
      this.gl.viewport(0, 0, gw, gh);
    }
  }

  init() {
    try {
      const cv = document.createElement('canvas');
      const gl = cv.getContext('webgl', { alpha: true, premultipliedAlpha: true, depth: false, stencil: false, antialias: false });
      if (!gl) return;
      const compile = (type, src) => {
        const s = gl.createShader(type);
        gl.shaderSource(s, src); gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s));
        return s;
      };
      const prog = gl.createProgram();
      gl.attachShader(prog, compile(gl.VERTEX_SHADER, VS));
      gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FS));
      gl.linkProgram(prog);
      if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) throw new Error(gl.getProgramInfoLog(prog));
      gl.useProgram(prog);

      const buf = gl.createBuffer();
      gl.bindBuffer(gl.ARRAY_BUFFER, buf);
      gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
      const aP = gl.getAttribLocation(prog, 'aP');
      gl.enableVertexAttribArray(aP);
      gl.vertexAttribPointer(aP, 2, gl.FLOAT, false, 0, 0);

      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE_MINUS_SRC_ALPHA); // premultiplied

      this.u = {};
      for (const n of ['uRes', 'uBand', 'uNScale', 'uWarp', 'uDrift', 'uEvolve', 'uCov', 'uAlpha', 'uDark', 'uFront'])
        this.u[n] = gl.getUniformLocation(prog, n);

      cv.addEventListener('webglcontextlost', () => { this.ok = false; });
      this.cv = cv; this.gl = gl; this.ok = true;
    } catch (e) {
      this.ok = false;
    }
  }

  drawLayer(game, name) {
    const gl = this.gl, u = this.u, L = LAYERS[name];
    const wsys = game.weather, dark = wsys.cloudDark;
    gl.uniform2f(u.uRes, this.cv.width, this.cv.height);
    gl.uniform2f(u.uBand, L.band[0], L.band[1]);
    gl.uniform2f(u.uNScale, L.ns[0], L.ns[1]);
    gl.uniform1f(u.uWarp, L.warp);
    gl.uniform1f(u.uDrift, wsys.drift[name]);
    gl.uniform1f(u.uEvolve, game.t * L.evolve + L.seed);
    gl.uniform1f(u.uCov, L.cov(dark));
    gl.uniform1f(u.uAlpha, L.alpha(dark));
    gl.uniform1f(u.uDark, dark);
    const span = L.front ? wsys.frontSpan(game) : null;
    if (span) gl.uniform3f(u.uFront, span.edge, span.back, 0.62);
    else      gl.uniform3f(u.uFront, 2.0, 2.0, 0.0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  renderBack(game) {
    const gl = this.gl;
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    this.drawLayer(game, 'high');
    this.drawLayer(game, 'mid');
  }

  renderFront(game) {
    const gl = this.gl;
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    this.drawLayer(game, 'low');
  }
}

export const cloudGL = new CloudGL();
