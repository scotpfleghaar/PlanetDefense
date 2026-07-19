import { save, persist, resetSave } from '../state/save.js';

const $ = id => document.getElementById(id);
const autopickBtn = $('autopick-btn');

export function syncTitle() {
  $('t-salvage').textContent = save.salvage.toLocaleString();
  $('t-best').textContent = save.best.toLocaleString();
  $('t-runs').textContent = save.runs;
  $('t-wave').textContent = save.deepestWave;
  const ps = $('t-prestige');
  ps.style.display = save.prestige > 0 ? '' : 'none';
  if (save.prestige > 0) ps.textContent = `★ Prestige ${save.prestige} — hostiles are ${Math.round(save.prestige * 25)}% stronger`;
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
  $('reset-btn').addEventListener('click', () => $('reset-modal').classList.add('open'));
  $('reset-cancel').addEventListener('click', () => $('reset-modal').classList.remove('open'));
  $('reset-confirm').addEventListener('click', () => {
    resetSave();
    $('reset-modal').classList.remove('open');
    syncTitle();
  });
}
