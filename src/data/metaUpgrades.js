// Permanent upgrades bought with Salvage. Unlimited levels; every upgrade
// shares the same Fibonacci cost curve starting at 5:
// 5, 10, 15, 25, 40, 65, 105, 170, ...
function fibCost(l) {
  let a = 1, b = 2;
  for (let i = 0; i < l; i++) [a, b] = [b, a + b];
  return a * 5;
}

export const META = [
  { id:'integrity', name:'Reinforced Hull', cost:fibCost,
    desc:l=>`Base integrity +${15*(l)} → +${15*(l+1)}`,
    apply:(p,l)=>{ p.baseMax += 15*l; } },
  { id:'firepower', name:'Heavy Munitions', cost:fibCost,
    desc:l=>`Starting damage +${l} → +${l+1}`,
    apply:(p,l)=>{ p.damage += l; } },
  { id:'velocity', name:'Servo Tuning', cost:fibCost,
    desc:l=>`Fire rate ${Math.round((1-Math.pow(0.92,l))*100)}% → ${Math.round((1-Math.pow(0.92,l+1))*100)}% faster`,
    apply:(p,l)=>{ p.fireInterval *= Math.pow(0.92,l); } },
  { id:'multiplier', name:'Telemetry Uplink', cost:fibCost,
    desc:l=>`Score ×${(1+0.1*l).toFixed(1)} → ×${(1+0.1*(l+1)).toFixed(1)}`,
    apply:(p,l)=>{ p.scoreMult *= (1+0.1*l); } },
  { id:'corevalue', name:'Salvage Refinery', cost:fibCost,
    desc:l=>`Salvage per core +${l} → +${l+1}`,
    apply:(p,l)=>{ p.coreValue += l; } },
  { id:'vanguard', name:'Twin Vanguard', cost:fibCost,
    desc:l=>`Start with +${l} extra barrel → +${l+1}`,
    apply:(p,l)=>{ p.multishot += l; } },
  { id:'beacon', name:'Carrier Beacon', cost:fibCost,
    desc:l=>`Carrier spawn rate +${l*20}% → +${(l+1)*20}%`,
    apply:(p,l)=>{ p.carrierBoost = 1 + 0.2*l; } },
  { id:'shield', name:'Aegis Plating', cost:fibCost,
    desc:l=>`Start with +${15*l} → +${15*(l+1)} shield`,
    apply:(p,l)=>{ p.shieldMax += 15*l; } },
  { id:'pierce', name:'Piercing Rounds', cost:fibCost,
    desc:l=>`Rounds pass through +${l} → +${l+1} enemy`,
    apply:(p,l)=>{ p.pierce += l; } },
  { id:'precision', name:'Precision Optics', cost:fibCost,
    desc:l=>`Crit chance +${Math.round(4*l)}% → +${Math.round(4*(l+1))}%`,
    apply:(p,l)=>{ p.critChance += 0.04*l; } },
  { id:'cryo', name:'Cryo Field', cost:fibCost,
    desc:l=>`Enemies in range ${Math.round((1-Math.pow(0.97,l))*100)}% → ${Math.round((1-Math.pow(0.97,l+1))*100)}% slower`,
    apply:(p,l)=>{ p.slow *= Math.pow(0.97,l); } },
  { id:'recharge', name:'Shield Regenerator', cost:fibCost,
    desc:l=>`Shield regen +${l} → +${l+1}/s`,
    apply:(p,l)=>{ p.shieldRegen += l; } },
  { id:'optics', name:'Extended Range', cost:fibCost,
    desc:l=>`Turret range +${Math.round((Math.pow(1.04,l)-1)*100)}% → +${Math.round((Math.pow(1.04,l+1)-1)*100)}%`,
    apply:(p,l)=>{ p.range *= Math.pow(1.04,l); } },
  { id:'construction', name:'Construction Corps', cost:fibCost,
    desc:l=>`Building cards ${l===0?'':`+${Math.round(l*30)}% → `}+${Math.round((l+1)*30)}% more common`,
    apply:(p,l)=>{ p.buildingWeightMult = 1 + 0.3*l; } },
];
