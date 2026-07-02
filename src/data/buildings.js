// Ground buildings — structures placed on the ground within the tower's range
// ring, each acting on its own cadence (attack range itself stays unlimited —
// they're independent emplacements, not turret extensions). Added via rare
// building cards; picking a card for a building you already own upgrades it
// in place instead of adding a duplicate, so each type levels up (faster +
// stronger) over a run.
export const BUILDINGS = {
  silo:   { name:'Missile Silo',   accent:'#FC3D21',
            interval:l=>2.4*Math.pow(0.92,l-1), dmgMult:l=>1+0.15*(l-1), splashAdd:l=>4*(l-1) },
  arc:    { name:'Arc Tower',      accent:'#37A6E6',
            interval:l=>1.5*Math.pow(0.92,l-1), dmgMult:l=>1+0.15*(l-1), radiusAdd:l=>20*(l-1) },
  mortar: { name:'Mortar Battery', accent:'#C98A00',
            interval:l=>3.2*Math.pow(0.92,l-1), dmgMult:l=>1+0.15*(l-1), splashAdd:l=>6*(l-1) },
  repair: { name:'Repair Bay',     accent:'#1E7F4F',
            healRate:l=>5+1.5*(l-1) }, // passive, no interval
};
