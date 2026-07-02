const STORE = 'planet_defense_v1';

const defaultSave = () => ({ salvage: 0, best: 0, runs: 0, deepestWave: 0, meta: {}, autoRandom: false });

function loadSave() {
  try { return Object.assign(defaultSave(), JSON.parse(localStorage.getItem(STORE)) || {}); }
  catch { return defaultSave(); }
}

// Singleton save state, loaded once at module init and mutated in place by callers.
export const save = loadSave();

export function persist() {
  try { localStorage.setItem(STORE, JSON.stringify(save)); } catch {}
}
