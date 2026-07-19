import { save, persist, resetSave } from '../state/save.js';
import { MODIFIERS } from '../data/modifiers.js';

const $ = id => document.getElementById(id);

export function syncTitle() {
  $('t-salvage').textContent = save.salvage.toLocaleString();
  $('t-best').textContent = save.best.toLocaleString();
  $('t-runs').textContent = save.runs;
  $('t-wave').textContent = save.deepestWave;
  const ps = $('t-prestige');
  ps.style.display = save.prestige > 0 ? '' : 'none';
  if (save.prestige > 0) ps.textContent = `★ Prestige ${save.prestige} — hostiles are ${Math.round(save.prestige * 25)}% stronger`;
}

// Pre-launch modifier select — toggle cards, any combination allowed.
function renderMods() {
  const body = $('mods-body');
  body.innerHTML = '';
  for (const m of MODIFIERS) {
    const on = !!save.modifiers[m.id];
    const btn = document.createElement('button');
    btn.className = 'card mod-card' + (on ? ' on' : '');
    btn.setAttribute('aria-pressed', on);
    btn.innerHTML = `<div class="c-top"><span class="c-name">${m.name}</span><span class="c-tag">${m.tag}</span></div>
                     <div class="c-desc">${m.desc}</div>
                     <div class="c-state">${on ? '■ ACTIVE' : '□ OFF'}</div>`;
    btn.addEventListener('click', () => {
      save.modifiers[m.id] = !save.modifiers[m.id];
      persist();
      renderMods();
    });
    body.appendChild(btn);
  }
  const n = MODIFIERS.filter(m => save.modifiers[m.id]).length;
  $('mods-count').textContent = `${n} ACTIVE`;
}

export function initTitleScreen({ onLaunch }) {
  $('launch-btn').addEventListener('click', () => {
    renderMods();
    $('mods-modal').classList.add('open');
  });
  $('mods-cancel').addEventListener('click', () => $('mods-modal').classList.remove('open'));
  $('mods-launch').addEventListener('click', () => {
    $('mods-modal').classList.remove('open');
    onLaunch();
  });
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
