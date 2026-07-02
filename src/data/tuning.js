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

export const WEATHER = {
  ambientClouds: 3, stormClouds: 8,   // sky population (clear vs overcast)
  cloudBand: [0.05, 0.42],            // cloud altitude as a fraction of H
  cloudSpeed: [6, 16],                // horizontal drift px/s
  stormChance: 0.12,                  // per wave (from wave 3+)
  rangeMul: 0.8,                      // storm turret-range debuff
  slowMul: 0.85,                      // storm enemy-speed debuff
  rainCount: 150,
  lightningGap: [2.0, 4.5],           // seconds between strikes during a storm
  lightningDmg: 30,                   // + 2× player damage; chains to 2 nearby
};
