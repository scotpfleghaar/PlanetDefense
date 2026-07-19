const STORE = 'planet_defense_v1';

const defaultSave = () => ({
  salvage: 0, best: 0, runs: 0, deepestWave: 0, meta: {}, autoRandom: false,
  prestige: 0,          // victories over the wave-50 Dreadnought; scales NG+ difficulty
  prestigeTokens: 0,    // unclaimed victory rewards (spent on the report screen)
  startBuildings: {},   // { type: level } — structures standing at the start of every run
});

function loadSave() {
  try { return Object.assign(defaultSave(), JSON.parse(localStorage.getItem(STORE)) || {}); }
  catch { return defaultSave(); }
}

// Singleton save state, loaded once at module init and mutated in place by callers.
export const save = loadSave();

export function persist() {
  try { localStorage.setItem(STORE, JSON.stringify(save)); } catch {}
}

export function resetSave() {
  try { localStorage.removeItem(STORE); } catch {}
  Object.assign(save, defaultSave());
}
