import { save, persist } from '../state/save.js';
import { showScreen } from './screens.js';
import { syncTitle } from './titleScreen.js';
import { openMeta } from './metaShop.js';
import { BUILDINGS } from '../data/buildings.js';

const $ = id => document.getElementById(id);

// Wired onto a fresh Game instance: game.endRun is called by combat.js's
// damageBase() once the base is destroyed (or by abortRun() below);
// game.winRun is called by WaveManager when the wave-50 Dreadnought falls.
export function attachReportFlow(game) {
  game.endRun = destroyed => endRun(game, destroyed);
  game.winRun = () => winRun(game);
}

// Bank the run and fill the shared report stats. Both endings route through here.
function closeOutRun(game, title, titleClass) {
  save.salvage += game.salvageRun;
  save.best = Math.max(save.best, game.score);
  save.runs += 1;
  persist();

  const t = $('r-title');
  t.textContent = title;
  t.classList.toggle('destroyed', titleClass === 'destroyed');
  t.classList.toggle('victory', titleClass === 'victory');
  $('r-date').textContent = new Date().toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' });
  $('r-score').textContent = game.score.toLocaleString();
  $('r-wave').textContent = game.waves.wave;
  $('r-kills').textContent = game.kills;
  $('r-cores').textContent = game.coresCollected;
  $('r-salvage').textContent = '+' + game.salvageRun;
}

function endRun(game, destroyed) {
  if (game.runningState === 'over') return;
  game.runningState = 'over';
  closeOutRun(game, destroyed ? 'Base destroyed' : 'Run complete', destroyed ? 'destroyed' : '');
  renderPrestigePicker(); // shows only if a reward from an earlier victory went unclaimed
  setTimeout(() => showScreen('report'), 700); // let final burst show
}

// Victory: the Dreadnought is down. Prestige rises (harder NG+ runs from wave 1)
// and a reward token is banked, spent right here on a permanent starting structure.
function winRun(game) {
  if (game.runningState === 'over') return;
  game.runningState = 'over';
  save.prestige = (save.prestige || 0) + 1;
  save.prestigeTokens = (save.prestigeTokens || 0) + 1;
  closeOutRun(game, 'Planet saved', 'victory');
  renderPrestigePicker();
  setTimeout(() => showScreen('report'), 1100); // let the wreck burn a moment longer
}

// Reward cards: pick one structure to stand at run start, permanently. Picking a
// type already owned raises its starting level instead (mirrors in-run cards).
function renderPrestigePicker() {
  const box = $('r-prestige');
  const tokens = save.prestigeTokens || 0;
  box.style.display = tokens > 0 ? '' : 'none';
  if (tokens <= 0) return;
  $('r-prestige-body').innerHTML = '';
  for (const [type, def] of Object.entries(BUILDINGS)) {
    const lvl = save.startBuildings[type] || 0;
    const btn = document.createElement('button');
    btn.className = 'card';
    btn.innerHTML = `<div class="c-top"><span class="c-name">${def.name}</span><span class="c-tag">${lvl > 0 ? 'LV ' + lvl + ' → ' + (lvl + 1) : 'New'}</span></div>
                     <div class="c-desc">${lvl > 0 ? `Begin every run with it at level ${lvl + 1}.` : 'Stands ready at the start of every future run.'}</div>`;
    btn.addEventListener('click', () => {
      save.startBuildings[type] = lvl + 1;
      save.prestigeTokens -= 1;
      persist();
      renderPrestigePicker();
    });
    $('r-prestige-body').appendChild(btn);
  }
}

export function abortRun(game) {
  if (game.endRun) game.endRun(false);
  else endRun(game, false);
}

export function initReportScreen({ onLaunchAgain }) {
  $('r-again-btn').addEventListener('click', onLaunchAgain);
  $('r-title-btn').addEventListener('click', () => { syncTitle(); showScreen('title'); });
  $('r-meta-btn').addEventListener('click', openMeta);
}
