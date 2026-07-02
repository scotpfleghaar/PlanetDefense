// Weapon types (per-turret) — each turret runs one weapon on its own cadence
// (= base fireInterval × fireMult).
export const WEAPONS = {
  cannon:  { name:'Cannon',  fireMult:1.0,  tip:null },
  missile: { name:'Missile', fireMult:2.0,  dmgMult:2.4, speed:230, splash:46, tip:'#FC3D21' },
  laser:   { name:'Laser',   fireMult:0.45, dmgMult:0.55, halfW:4,  tip:'#37A6E6' },
  railgun: { name:'Railgun', fireMult:3.2,  dmgMult:4.6, halfW:7,  tip:'#0B3D91' },
  flak:    { name:'Flak',    fireMult:1.5,  dmgMult:0.5, pellets:5, spread:0.55, rangeMult:0.5, tip:'#1E7F4F' },
};
