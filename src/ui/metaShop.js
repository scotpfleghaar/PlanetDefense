import { META } from '../data/metaUpgrades.js';
import { save, persist } from '../state/save.js';
import { syncTitle } from './titleScreen.js';

const $ = id => document.getElementById(id);
const metaModal = $('meta-modal');

export function openMeta() {
  renderMeta();
  metaModal.classList.add('open');
}

function renderMeta() {
  $('meta-balance').textContent = save.salvage.toLocaleString() + ' SALVAGE';
  const body = $('meta-body');
  body.innerHTML = '';
  META.forEach(m => {
    const lvl = save.meta[m.id] || 0;
    const cost = m.cost(lvl);
    const card = document.createElement('div');
    card.className = 'shop-card';
    let pips = '';
    const pipCount = Math.min(lvl, 10);
    for (let i = 0; i < pipCount; i++) pips += `<span class="pip on"></span>`;
    if (lvl > 10) pips += `<span class="pip-extra">+${lvl - 10}</span>`;
    card.innerHTML = `
      <div class="s-top">
        <span class="s-name">${m.name}</span>
        <span class="s-lvl">LV ${lvl}</span>
      </div>
      <div class="s-desc">${m.desc(lvl)}</div>
      <div class="pips">${pips}</div>
      <button class="shop-buy" ${save.salvage<cost?'disabled':''}>
        ${cost.toLocaleString()} SALVAGE
      </button>`;
    card.querySelector('.shop-buy').addEventListener('click', () => {
      if (save.salvage >= cost) {
        save.salvage -= cost;
        save.meta[m.id] = lvl + 1;
        persist();
        renderMeta();
      }
    });
    body.appendChild(card);
  });
}

export function initMetaShop() {
  $('meta-btn').addEventListener('click', openMeta);
  $('meta-close').addEventListener('click', () => {
    metaModal.classList.remove('open');
    syncTitle();
  });
  metaModal.addEventListener('click', e => { if (e.target === metaModal) { metaModal.classList.remove('open'); syncTitle(); } });
}
