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

// The wave-50 Dreadnought. Its HP rides the normal per-wave hpMult (so prestige
// scaling applies automatically); everything else here is the fight's own shape.
export const BOSS = {
  wave: 50,            // the run ends in victory when this wave's boss falls
  hp: 520,             // × the wave's hpMult (≈8.8 at wave 50, more with prestige)
  r: 40,
  pts: 2000,
  hoverFrac: 0.24,     // hover altitude as a fraction of screen height
  swayFrac: 0.16,      // horizontal sway amplitude as a fraction of screen width
  descentSpeed: 46,
  volley: { interval: 4.2, charge: 0.8, shots: 3, spread: 0.5, speed: 150, dmg: 14 },
  phase2: { at: 0.66, armor: 0.3, escortEvery: 7, escorts: ['sprinter', 'weaver', 'drone'] },
  phase3: { at: 0.33, volleyMult: 0.55, beamEvery: 9, beamCharge: 1.6, beamDmg: 55 },
};

// NG+ scaling per prestige level (victories). Applied on top of the normal
// per-wave formulas in WaveManager, from wave 1.
export const PRESTIGE = {
  hpPerLevel: 0.25,      // +25% enemy HP per prestige level
  speedPerLevel: 0.05,
  countPerLevel: 0.10,
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
