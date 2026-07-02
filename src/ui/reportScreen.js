import { save, persist } from '../state/save.js';
import { showScreen } from './screens.js';
import { syncTitle } from './titleScreen.js';
import { openMeta } from './metaShop.js';

const $ = id => document.getElementById(id);

// Wired onto a fresh Game instance as game.endRun, called by combat.js's
// damageBase() once the base is destroyed (or by abortRun() below).
export function attachReportFlow(game) {
  game.endRun = destroyed => endRun(game, destroyed);
}

function endRun(game, destroyed) {
  if (game.runningState === 'over') return;
  game.runningState = 'over';
  save.salvage += game.salvageRun;
  save.best = Math.max(save.best, game.score);
  save.runs += 1;
  persist();

  $('r-title').textContent = destroyed ? 'Base destroyed' : 'Run complete';
  $('r-title').classList.toggle('destroyed', destroyed);
  $('r-date').textContent = new Date().toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' });
  $('r-score').textContent = game.score.toLocaleString();
  $('r-wave').textContent = game.waves.wave;
  $('r-kills').textContent = game.kills;
  $('r-cores').textContent = game.coresCollected;
  $('r-salvage').textContent = '+' + game.salvageRun;
  setTimeout(() => showScreen('report'), 700); // let final burst show
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
