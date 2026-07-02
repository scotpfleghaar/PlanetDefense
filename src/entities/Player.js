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
    this.turretWeapons = new Array(this.multishot).fill('cannon'); // every turret starts as a cannon
  }

  // Convert one turret to a weapon — preferring a basic cannon, else any different turret.
  refitTurret(weaponId) {
    while (this.turretWeapons.length < this.multishot) this.turretWeapons.push('cannon');
    let idx = this.turretWeapons.indexOf('cannon');
    if (idx === -1) idx = this.turretWeapons.findIndex(w => w !== weaponId);
    if (idx === -1) idx = 0;
    this.turretWeapons[idx] = weaponId;
  }

  // keep the per-turret weapon list sized to the turret count
  ensureLoadout() {
    const tw = this.turretWeapons;
    while (tw.length < this.multishot) tw.push('cannon');
    if (tw.length > this.multishot) tw.length = this.multishot;
  }
}
