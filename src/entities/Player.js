import { META } from '../data/metaUpgrades.js';

// The turret/base stat bag for one run. Constructed fresh each run from the
// base stat block plus whatever permanent Salvage Bay (META) levels are owned.
export class Player {
  constructor(save) {
    this.baseMax = 100; this.baseHP = 100;
    this.shieldMax = 30; this.shield = 30; this.shieldRegen = 8; this.shieldDelay = 3.5;
    this.damage = 3; this.fireInterval = 0.55; this.projSpeed = 360; this.range = 240;
    this.multishot = 1; this.pierce = 0; this.critChance = 0;
    this.slow = 1;
    this.scoreMult = 1; this.coreValue = 1; this.carrierBoost = 1; this.buildingWeightMult = 1;

    for (const m of META) {
      const lvl = save.meta[m.id] || 0;
      if (lvl > 0) m.apply(this, lvl);
    }
    this.baseHP = this.baseMax;
    this.shield = this.shieldMax;
    this.defaultWeapon = 'cannon'; // what a fresh turret mount fires (modifiers may override)
    this.turretWeapons = new Array(this.multishot).fill(this.defaultWeapon);
  }

  // Convert one turret to a weapon — preferring a default mount, else any different turret.
  refitTurret(weaponId) {
    while (this.turretWeapons.length < this.multishot) this.turretWeapons.push(this.defaultWeapon);
    let idx = this.turretWeapons.indexOf(this.defaultWeapon);
    if (idx === -1) idx = this.turretWeapons.findIndex(w => w !== weaponId);
    if (idx === -1) idx = 0;
    this.turretWeapons[idx] = weaponId;
  }

  // keep the per-turret weapon list sized to the turret count
  ensureLoadout() {
    const tw = this.turretWeapons;
    while (tw.length < this.multishot) tw.push(this.defaultWeapon);
    if (tw.length > this.multishot) tw.length = this.multishot;
  }
}
