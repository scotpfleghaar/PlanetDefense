let screens = null;

export function initScreens() {
  screens = { title: document.getElementById('title'), game: document.getElementById('game'), report: document.getElementById('report') };
}

export function showScreen(name) {
  for (const k in screens) screens[k].classList.toggle('active', k === name);
}
