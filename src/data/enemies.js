export const ENEMY_DEFS = {
  drone:    { hp:3,   r:9,  speed:42,  pts:10,  dmg:8,  color:'#0B3D91' },
  swarm:    { hp:1,   r:6,  speed:78,  pts:6,   dmg:4,  color:'#1E7F4F' },
  rock:     { hp:12,  r:15, speed:26,  pts:30,  dmg:18, color:'#6E675E', rock:true, splits:2, child:'pebble' }, // tumbling asteroid, cracks into pebbles
  pebble:   { hp:2,   r:6,  speed:52,  pts:5,   dmg:5,  color:'#847B70', rock:true }, // asteroid fragment
  hulk:     { hp:22,  r:19, speed:22,  pts:55,  dmg:26, color:'#5B6471' },
  sprinter: { hp:5,   r:8,  speed:120, pts:18,  dmg:10, color:'#0E7C8B' }, // very fast, fragile
  comet:    { hp:6,   r:9,  speed:100, pts:28,  dmg:12, color:'#37A6E6', rock:true, comet:true }, // fast ice chunk with an ion tail
  brute:    { hp:60,  r:26, speed:15,  pts:120, dmg:44, color:'#3A4250' }, // mega-tank
  splitter: { hp:14,  r:15, speed:34,  pts:40,  dmg:14, color:'#7A3D91', splits:2, child:'swarm' },
  weaver:   { hp:8,   r:10, speed:62,  pts:25,  dmg:10, color:'#C98A00', weave:70 }, // zig-zags
  armored:  { hp:26,  r:16, speed:26,  pts:70,  dmg:22, color:'#5B6471', armor:0.5 }, // halves damage
  carrier:  { hp:10,  r:14, speed:30,  pts:35,  dmg:12, color:'#FC3D21', carrier:true },
  // ── high-wave roster ──
  hive:     { hp:70,  r:24, speed:14,  pts:150, dmg:40, color:'#1E7F4F', spawner:{ interval:3.2, child:'swarm', brood:8 } }, // births swarm darts mid-flight
  phantom:  { hp:16,  r:11, speed:48,  pts:60,  dmg:16, color:'#7FA8E0', cloak:{ solid:1.8, faded:1.4 } }, // phases out — untargetable while faded
  tender:   { hp:20,  r:13, speed:28,  pts:80,  dmg:12, color:'#5B6471', healer:{ interval:1.6, amount:3, radius:120 } }, // pulse-heals nearby enemies
  blinker:  { hp:12,  r:10, speed:20,  pts:65,  dmg:18, color:'#7A3D91', blink:{ interval:2.2, dist:110 } }, // teleports toward the base in hops
  titan:    { hp:220, r:34, speed:10,  pts:400, dmg:80, color:'#20262F', armor:0.35, splits:2, child:'brute' }, // mini-boss; breaks into two brutes
};

// Roster introduces a new type every couple of waves. Spawn picker draws (weighted)
// from whatever is unlocked at the current wave; tougher/rarer types carry lower weight.
export const ENEMY_ROSTER = [
  { type:'drone',    unlock:1,  weight:1.00 },
  { type:'swarm',    unlock:1,  weight:0.50 },
  { type:'rock',     unlock:2,  weight:0.60 },
  { type:'hulk',     unlock:3,  weight:0.55 },
  { type:'sprinter', unlock:6,  weight:0.45 },
  { type:'comet',    unlock:8,  weight:0.40 },
  { type:'brute',    unlock:9,  weight:0.28 },
  { type:'splitter', unlock:12, weight:0.38 },
  { type:'weaver',   unlock:15, weight:0.42 },
  { type:'armored',  unlock:18, weight:0.35 },
  { type:'hive',     unlock:20, weight:0.30 },
  { type:'phantom',  unlock:22, weight:0.40 },
  { type:'tender',   unlock:25, weight:0.32 },
  { type:'blinker',  unlock:28, weight:0.38 },
  { type:'titan',    unlock:32, weight:0.15 },
];

export function unlockedRoster(w) {
  return ENEMY_ROSTER.filter(r => w >= r.unlock);
}

// weighted random draw over a set of {type, weight} roster entries
export function weightedPick(entries) {
  let total = 0;
  for (const e of entries) total += e.weight;
  let x = Math.random() * total;
  for (const e of entries) {
    x -= e.weight;
    if (x <= 0) return e.type;
  }
  return entries[entries.length - 1]?.type ?? 'drone';
}

export function pickEnemyType(w) {
  return weightedPick(unlockedRoster(w));
}
