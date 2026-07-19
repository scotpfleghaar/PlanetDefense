// Run modifiers — Halo-skull-style rule changes picked on launch. Any number
// can be active at once; selections persist between runs but each one only
// alters the run it's launched with. `apply(game)` (optional) mutates the
// fresh Game/Player at run start; flag-only modifiers are read via game.mods.
export const MODIFIERS = [
  { id: 'autopick', name: 'Auto-Pick', tag: 'Chaos',
    desc: 'Research chooses for you — a random upgrade card is applied instantly, no pause.' },
  { id: 'noshield', name: 'No Shield', tag: 'Hardcore',
    desc: 'Zero shield all run — every hit goes straight to base integrity. Shield cards are removed from research.',
    apply(game) { const p = game.p; p.shieldMax = 0; p.shield = 0; p.shieldRegen = 0; } },
  { id: 'missiles', name: 'Missiles Only', tag: 'Loadout',
    desc: 'Every turret starts as a missile launcher, and new turret mounts arrive as missiles.',
    apply(game) { const p = game.p; p.defaultWeapon = 'missile'; p.turretWeapons = p.turretWeapons.map(() => 'missile'); } },
];
