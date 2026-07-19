import { Renderer } from './render/Renderer.js';
import { GameLoop } from './core/GameLoop.js';
import { Game } from './core/Game.js';
import { initScreens, showScreen } from './ui/screens.js';
import { syncHud, showWaveBanner } from './ui/hud.js';
import { syncTitle, initTitleScreen } from './ui/titleScreen.js';
import { attachUpgradeFlow } from './ui/upgradeModal.js';
import { attachReportFlow, initReportScreen } from './ui/reportScreen.js';
import { initPauseOverlay, closePauseOverlay } from './ui/pauseOverlay.js';
import { initMetaShop } from './ui/metaShop.js';
import { Building } from './entities/Building.js';
import { save } from './state/save.js';

initScreens();

const renderer = new Renderer(document.getElementById('cv'));
const gameLoop = new GameLoop(renderer);
gameLoop.onFrame = syncHud;

window.addEventListener('resize', () => renderer.resize(gameLoop.game));

function startRun() {
  showScreen('game');
  renderer.resize(null); // measure only after the game screen is visible (non-zero size)
  const game = new Game(renderer.W, renderer.H);
  attachUpgradeFlow(game, gameLoop);
  attachReportFlow(game);
  game.onWaveStart = showWaveBanner;
  // prestige rewards: structures earned from Dreadnought victories stand from wave 1
  for (const [type, lvl] of Object.entries(save.startBuildings || {})) {
    if (lvl > 0) { Building.addOrUpgrade(game, type); game.buildings[game.buildings.length - 1].level = lvl; }
  }
  closePauseOverlay();
  game.waves.next(game);
  gameLoop.start(game);
}

initTitleScreen({ onLaunch: startRun });
initReportScreen({ onLaunchAgain: startRun });
initPauseOverlay(gameLoop);
initMetaShop();

syncTitle();
showScreen('title');
