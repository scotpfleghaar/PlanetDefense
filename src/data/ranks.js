import { weightedPick } from './enemies.js';

// Enemy ranks — a prestige-gated modifier layer orthogonal to enemy type.
// A rank scales base stats and grants generic attributes that work on ANY
// enemy (Enemy.js applies them uniformly, combat.js resolves them uniformly):
//   hpMult / speedMult / ptsMult — stat scaling on top of wave multipliers
//   regen  — fraction of maxhp healed per second
//   shield — { frac, regen, delay }: an overshield of frac × maxhp that
//            absorbs damage before hull/armor, and recharges at regen × max
//            per second after delay seconds without being hit
// New ranks (or new attributes shared the same way) are just data here.
export const RANKS = {
  veteran: {
    name: 'Veteran', color: '#C98A00', minPrestige: 1,
    hpMult: 1.6, ptsMult: 2,
    regen: 0.015,
  },
  elite: {
    name: 'Elite', color: '#7FA8E0', minPrestige: 2,
    hpMult: 2.0, ptsMult: 3,
    shield: { frac: 0.5, regen: 0.12, delay: 3.0 },
  },
  champion: {
    name: 'Champion', color: '#FC3D21', minPrestige: 3,
    hpMult: 2.6, speedMult: 1.12, ptsMult: 5,
    regen: 0.02,
    shield: { frac: 0.6, regen: 0.15, delay: 2.5 },
  },
};

// How often a spawn rolls a rank at all; the tier is then a weighted draw over
// whatever the current prestige level has unlocked (higher tiers rarer).
export const RANK_TUNING = {
  chanceBase: 0.05,      // at prestige 1
  chancePerLevel: 0.04,  // + per prestige level beyond 1
  chanceMax: 0.30,
  tierWeights: { veteran: 1.0, elite: 0.5, champion: 0.25 },
};

export function rollRank(prestige) {
  if (!prestige) return null;
  const chance = Math.min(RANK_TUNING.chanceMax,
    RANK_TUNING.chanceBase + (prestige - 1) * RANK_TUNING.chancePerLevel);
  if (Math.random() >= chance) return null;
  const pool = Object.keys(RANKS)
    .filter(k => prestige >= RANKS[k].minPrestige)
    .map(k => ({ type: k, weight: RANK_TUNING.tierWeights[k] ?? 0.3 }));
  return pool.length ? weightedPick(pool) : null;
}
