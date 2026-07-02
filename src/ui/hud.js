const $ = id => document.getElementById(id);

// Called every 'playing' frame by GameLoop.onFrame.
export function syncHud(game) {
  $('h-score').textContent = game.score.toLocaleString();
  $('h-salvage').textContent = game.salvageRun;
  $('h-cores').textContent = game.coresCollected;
  $('h-wave').textContent = game.waves.wave;
  const intPct = Math.max(0, Math.round(game.p.baseHP / game.p.baseMax * 100));
  $('m-int-bar').style.width = intPct + '%';
  $('m-int-pct').textContent = intPct + '%';
  if (game.p.shieldMax > 0) {
    $('shield-row').style.display = '';
    $('shield-meter').style.display = '';
    const shPct = Math.max(0, Math.round(game.p.shield / game.p.shieldMax * 100));
    $('m-shd-bar').style.width = shPct + '%';
    $('m-shd-pct').textContent = shPct + '%';
  } else {
    $('shield-row').style.display = 'none';
    $('shield-meter').style.display = 'none';
  }
  const resPct = Math.min(100, Math.round(game.research / game.researchNeed * 100));
  $('m-res-bar').style.width = resPct + '%';
  $('m-res-pct').textContent = resPct + '%';
}

let wbTimer = null;

// Wired as game.onWaveStart — fired by WaveManager.next().
export function showWaveBanner(wave, storm) {
  const wb = $('wave-banner');
  wb.textContent = 'Wave ' + wave + (storm ? '  ·  ⛈ STORM' : '');
  wb.classList.toggle('storm', !!storm);
  wb.classList.add('show');
  clearTimeout(wbTimer);
  wbTimer = setTimeout(() => wb.classList.remove('show'), storm ? 2400 : 1600);
}
