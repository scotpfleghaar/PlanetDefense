// Wave scaling — all unbounded, so difficulty/enemy counts grow forever. Tune here.
export const WAVE = {
  baseCount: 5,          // enemies in wave 1
  countLinear: 2,        // + this many enemies per wave
  countQuad: 0.15,       // + this many per wave² (accelerating, uncapped swarms)
  hpPerWave: 0.16,       // enemy HP scaling per wave
  speedPerWave: 0.035,   // enemy speed scaling per wave
  spawnWindow: 10,       // the whole wave's enemies spawn spread over ~this many seconds
  spawnGapMin: 0.02,     // floor on the per-enemy gap
};

export const SHIELD = {
  rippleLife: 0.45,        // seconds a localized impact ripple lasts on the dome
  maxRipples: 6,           // concurrent ripple cap (oldest dropped first)
  hexSize: 11,             // hex-cell circumradius (px) in the baked lattice
  instabilityFrac: 0.30,   // below this shield fraction the dome starts sputtering
  breakRingLife: 0.5,      // shockwave ring duration on shield break
  shardCount: 22,          // shield fragments flung outward on break
  knockRadiusMult: 2.6,    // knockback reach = shield radius × this
  knockForce: 260,         // outward shove speed (px/s) at the dome, before falloff
  knockDuration: 0.55,     // seconds the shove takes to ease back into normal seeking
  rebuildTime: 1.0,        // seconds of power-on flare after regenerating from zero
};

export const WEATHER = {
  // Three cloud strata. band = altitude as a fraction of H, speed = drift px/s,
  // count = sky population as [clear, storm]. Farther strata drift slower
  // (parallax); the low stratum renders in front of enemies, high/mid behind.
  cloudLayers: {
    high: { band: [0.03, 0.14], speed: [3, 7],   count: [2, 3] },  // cirrus streaks
    mid:  { band: [0.14, 0.30], speed: [7, 14],  count: [3, 5] },  // small cumulus
    low:  { band: [0.28, 0.45], speed: [14, 26], count: [2, 3] },  // big cumulus / storm cumulonimbus
    // storms additionally roll a screen-spanning squall-line front in from the left
  },
  // horizontal drift of the WebGL cloud field per stratum, in screen-widths/s
  strataDrift: { high: 0.002, mid: 0.005, low: 0.012 },
  stormChance: 0.12,                  // per wave (from wave 3+)
  rangeMul: 0.8,                      // storm turret-range debuff
  slowMul: 0.85,                      // storm enemy-speed debuff
  rainCount: 150,
  lightningGap: [2.0, 4.5],           // seconds between strikes during a storm
  lightningDmg: 30,                   // + 2× player damage; chains to 2 nearby
};
