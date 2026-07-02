import { ENEMY_DEFS, unlockedRoster, weightedPick } from './enemies.js';

// Waves used to just blend every unlocked type together in one flat weighted
// draw, so they all felt the same once a few types had unlocked. Instead each
// wave now rolls a "role" — a shape for its composition — and fills it from
// whatever's currently unlocked. Roles are derived from existing ENEMY_DEFS
// behaviour flags rather than hand-tagged, so new enemies slot into the
// mechanic-themed roles automatically. countMul reshapes pacing per role
// (fodder-heavy roles run a bit bigger, elite/rare roles run a bit smaller) —
// the underlying count/hp/speed scaling in tuning.js stays untouched and uncapped.
const flag = (type, key) => !!ENEMY_DEFS[type]?.[key];
const isFast = type => ENEMY_DEFS[type]?.speed >= 70;
const isTanky = type => ENEMY_DEFS[type]?.hp >= 40;

export const WAVE_ROLES = {
  horde:       { types: [1, 1], countMul: 1.15 },
  duo:         { types: [2, 2], countMul: 1.0 },
  squad:       { types: [3, 4], countMul: 1.0 },
  elite:       { types: [1, 2], countMul: 0.55, filter: (t, recent) => recent.includes(t) },
  everything:  { types: null,   countMul: 1.0 }, // null = draw from the full unlocked pool, like before
  splitStorm:  { types: [1, 3], countMul: 0.9,  filter: t => flag(t, 'splits') },
  cloak:       { types: [1, 2], countMul: 0.85, filter: t => flag(t, 'cloak') },
  hiveNest:    { types: [1, 2], countMul: 0.85, filter: t => flag(t, 'spawner') },
  regen:       { types: [2, 3], countMul: 0.9,  filter: t => flag(t, 'healer') || isTanky(t) },
  blinkAmbush: { types: [1, 2], countMul: 0.85, filter: t => flag(t, 'blink') },
  rush:        { types: [1, 3], countMul: 1.1,  filter: t => isFast(t) },
  ironclad:    { types: [1, 3], countMul: 0.75, filter: t => flag(t, 'armor') || isTanky(t) },
};

// Rhythm across a 50-wave cycle: bands get progressively more chaotic, and
// every 50th wave (pos === CYCLE_LENGTH) is always a full "everything" wave —
// a finale beat that repeats every cycle. Within a band the role is a
// weighted random pick, so back-to-back cycles don't play out identically.
const CYCLE_LENGTH = 50;
const CYCLE_BANDS = [
  { through: 3,  weights: { duo: 2, squad: 1 } },
  { through: 15, weights: { horde: 2, duo: 2, squad: 2, splitStorm: 1, rush: 1, ironclad: 1 } },
  { through: 30, weights: { horde: 2, duo: 1, squad: 2, elite: 1, splitStorm: 1.5, cloak: 1, hiveNest: 1, blinkAmbush: 1, rush: 1, ironclad: 1 } },
  { through: 45, weights: { horde: 1.5, squad: 1.5, elite: 2, splitStorm: 1.5, cloak: 1.5, hiveNest: 1.5, regen: 1.5, blinkAmbush: 1.5, rush: 1, ironclad: 1.5, everything: 1 } },
  { through: 49, weights: { elite: 2.5, splitStorm: 2, cloak: 2, hiveNest: 2, regen: 2, blinkAmbush: 2, everything: 2 } },
];

function bandFor(pos) {
  return CYCLE_BANDS.find(b => pos <= b.through) ?? CYCLE_BANDS[CYCLE_BANDS.length - 1];
}

function roleSatisfiable(key, roster, recent) {
  const role = WAVE_ROLES[key];
  if (!role.types) return true;
  const [min] = role.types;
  const pool = role.filter ? roster.filter(r => role.filter(r.type, recent)) : roster;
  return pool.length >= min;
}

function rollRole(weights, roster, recent) {
  const candidates = Object.entries(weights).filter(([key]) => roleSatisfiable(key, roster, recent));
  if (candidates.length === 0) return 'everything'; // always satisfiable fallback
  let total = 0;
  for (const [, wt] of candidates) total += wt;
  let x = Math.random() * total;
  for (const [key, wt] of candidates) {
    x -= wt;
    if (x <= 0) return key;
  }
  return candidates[candidates.length - 1][0];
}

// weighted sample without replacement — used to pick which types fill a role
function pickWeightedSubset(entries, n) {
  const pool = [...entries];
  const picked = [];
  for (let i = 0; i < n && pool.length; i++) {
    const type = weightedPick(pool);
    const idx = pool.findIndex(e => e.type === type);
    picked.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return picked;
}

// Builds this wave's enemy type list. `count` is the wave's base enemy count
// (from the existing uncapped formula) before the role's countMul is applied.
export function buildWaveComposition(w, count) {
  const roster = unlockedRoster(w);
  const recent = [...roster].sort((a, b) => b.unlock - a.unlock).slice(0, 3).map(r => r.type);
  const pos = ((w - 1) % CYCLE_LENGTH) + 1;
  const roleKey = pos === CYCLE_LENGTH ? 'everything' : rollRole(bandFor(pos).weights, roster, recent);
  const role = WAVE_ROLES[roleKey];

  let pool = roster;
  if (role.types) {
    const filtered = role.filter ? roster.filter(r => role.filter(r.type, recent)) : roster;
    const [min, max] = role.types;
    const n = Math.min(filtered.length, min + Math.floor(Math.random() * (max - min + 1)));
    pool = pickWeightedSubset(filtered, n);
  }

  const total = Math.max(1, Math.round(count * role.countMul));
  const types = [];
  for (let i = 0; i < total; i++) types.push(weightedPick(pool));
  return { role: roleKey, types };
}
