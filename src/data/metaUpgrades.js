// Permanent upgrades bought with Salvage. Unlimited levels; cost follows the
// Fibonacci sequence so early levels stay affordable and deep levels ramp hard:
// fibCost(base) charges base/2 for the first two levels, then ~1.6× per level.
function fibCost(base) {
  return l => {
    let a = 1, b = 1;
    for (let i = 0; i < l; i++) [a, b] = [b, a + b];
    return Math.max(5, Math.round(base * a / 10) * 5);
  };
}

export const META = [
  { id:'integrity', name:'Reinforced Hull', cost:fibCost(40),
    desc:l=>`Base integrity +${20*(l)} → +${20*(l+1)}`,
    apply:(p,l)=>{ p.baseMax += 20*l; } },
  { id:'firepower', name:'Heavy Munitions', cost:fibCost(50),
    desc:l=>`Starting damage +${l} → +${l+1}`,
    apply:(p,l)=>{ p.damage += l; } },
  { id:'velocity', name:'Servo Tuning', cost:fibCost(60),
    desc:l=>`Fire rate ${Math.round((1-Math.pow(0.9,l))*100)}% → ${Math.round((1-Math.pow(0.9,l+1))*100)}% faster`,
    apply:(p,l)=>{ p.fireInterval *= Math.pow(0.9,l); } },
  { id:'multiplier', name:'Telemetry Uplink', cost:fibCost(70),
    desc:l=>`Score ×${(1+0.1*l).toFixed(1)} → ×${(1+0.1*(l+1)).toFixed(1)}`,
    apply:(p,l)=>{ p.scoreMult *= (1+0.1*l); } },
  { id:'corevalue', name:'Salvage Refinery', cost:fibCost(80),
    desc:l=>`Salvage per core +${l} → +${l+1}`,
    apply:(p,l)=>{ p.coreValue += l; } },
  { id:'vanguard', name:'Twin Vanguard', cost:fibCost(140),
    desc:l=>`Start with +${l} extra barrel → +${l+1}`,
    apply:(p,l)=>{ p.multishot += l; } },
  { id:'beacon', name:'Carrier Beacon', cost:fibCost(90),
    desc:l=>`Carrier spawn rate +${l*25}% → +${(l+1)*25}%`,
    apply:(p,l)=>{ p.carrierBoost = 1 + 0.25*l; } },
  { id:'shield', name:'Aegis Plating', cost:fibCost(70),
    desc:l=>`Start with +${25*l} → +${25*(l+1)} shield`,
    apply:(p,l)=>{ p.shieldMax += 25*l; } },
  { id:'pierce', name:'Piercing Rounds', cost:fibCost(65),
    desc:l=>`Rounds pass through +${l} → +${l+1} enemy`,
    apply:(p,l)=>{ p.pierce += l; } },
  { id:'precision', name:'Precision Optics', cost:fibCost(85),
    desc:l=>`Crit chance +${Math.round(5*l)}% → +${Math.round(5*(l+1))}%`,
    apply:(p,l)=>{ p.critChance += 0.05*l; } },
  { id:'cryo', name:'Cryo Field', cost:fibCost(75),
    desc:l=>`Enemies in range ${Math.round((1-Math.pow(0.96,l))*100)}% → ${Math.round((1-Math.pow(0.96,l+1))*100)}% slower`,
    apply:(p,l)=>{ p.slow *= Math.pow(0.96,l); } },
  { id:'recharge', name:'Shield Regenerator', cost:fibCost(65),
    desc:l=>`Shield regen +${2*l} → +${2*(l+1)}/s`,
    apply:(p,l)=>{ p.shieldRegen += 2*l; } },
  { id:'optics', name:'Extended Range', cost:fibCost(55),
    desc:l=>`Turret range +${Math.round((Math.pow(1.05,l)-1)*100)}% → +${Math.round((Math.pow(1.05,l+1)-1)*100)}%`,
    apply:(p,l)=>{ p.range *= Math.pow(1.05,l); } },
  { id:'construction', name:'Construction Corps', cost:fibCost(90),
    desc:l=>`Building cards ${l===0?'':`+${Math.round(l*40)}% → `}+${Math.round((l+1)*40)}% more common`,
    apply:(p,l)=>{ p.buildingWeightMult = 1 + 0.4*l; } },
];
