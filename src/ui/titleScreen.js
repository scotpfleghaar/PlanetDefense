import { save, persist } from '../state/save.js';

const $ = id => document.getElementById(id);
const autopickBtn = $('autopick-btn');

export function syncTitle() {
  $('t-salvage').textContent = save.salvage.toLocaleString();
  $('t-best').textContent = save.best.toLocaleString();
  $('t-runs').textContent = save.runs;
  $('t-wave').textContent = save.deepestWave;
  syncAutopick();
}

function syncAutopick() {
  autopickBtn.textContent = 'Auto-pick upgrades: ' + (save.autoRandom ? 'On' : 'Off');
  autopickBtn.classList.toggle('on', !!save.autoRandom);
}

export function initTitleScreen({ onLaunch }) {
  autopickBtn.addEventListener('click', () => {
    save.autoRandom = !save.autoRandom;
    persist();
    syncAutopick();
  });
  $('launch-btn').addEventListener('click', onLaunch);
  $('how-btn').addEventListener('click', () => $('how-modal').classList.add('open'));
  $('how-close').addEventListener('click', () => $('how-modal').classList.remove('open'));
}
