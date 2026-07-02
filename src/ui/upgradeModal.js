import { UPGRADES } from '../data/upgrades.js';
import { save } from '../state/save.js';

const $ = id => document.getElementById(id);
const upgradeModal = $('upgrade-modal');

// Wired onto a fresh Game instance as game.openUpgrade, called by combat.js
// whenever the research bar fills.
export function attachUpgradeFlow(game, gameLoop) {
  game.openUpgrade = () => openUpgrade(game, gameLoop);
}

function openUpgrade(game, gameLoop) {
  // auto-pick mode: instantly apply a random offered card, no modal / no pause
  if (save.autoRandom) {
    while (game.pendingPicks > 0) {
      const picks = pick3(game);
      picks[Math.floor(Math.random() * picks.length)].apply(game.p, game);
      game.pendingPicks--;
    }
    return; // stays in 'playing'
  }
  game.runningState = 'upgrading';
  const picks = pick3(game);
  const body = $('upgrade-body');
  body.innerHTML = '';
  $('upg-count').textContent = game.pendingPicks > 1 ? `PICK 1 · ${game.pendingPicks} QUEUED` : 'PICK 1';
  picks.forEach(u => {
    const btn = document.createElement('button');
    btn.className = 'card';
    btn.innerHTML = `<div class="c-top"><span class="c-name">${u.name}</span><span class="c-tag">${u.tag}</span></div>
                     <div class="c-desc">${typeof u.desc === 'function' ? u.desc(game) : u.desc}</div>`;
    btn.addEventListener('click', () => chooseUpgrade(game, gameLoop, u));
    body.appendChild(btn);
  });
  upgradeModal.classList.add('open');
}

// rare cards (buildings) appear far less often, boosted by Construction Corps
function pick3(game) {
  const pool = UPGRADES.slice();
  const out = [];
  const wt = c => (c.rare ? 0.18 * (game.p.buildingWeightMult || 1) : 1);
  for (let n = 0; n < 3 && pool.length; n++) {
    let total = 0; for (const c of pool) total += wt(c);
    let r = Math.random() * total, idx = 0;
    for (let i = 0; i < pool.length; i++) { r -= wt(pool[i]); if (r <= 0) { idx = i; break; } }
    out.push(pool.splice(idx, 1)[0]);
  }
  return out;
}

function chooseUpgrade(game, gameLoop, u) {
  u.apply(game.p, game);
  game.pendingPicks--;
  upgradeModal.classList.remove('open');
  if (game.pendingPicks > 0) {
    setTimeout(() => openUpgrade(game, gameLoop), 60);
  } else {
    game.runningState = 'playing';
    gameLoop.resetClock();
  }
}
