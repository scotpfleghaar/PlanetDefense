import { abortRun } from './reportScreen.js';

const $ = id => document.getElementById(id);
const pauseOverlay = $('pause-overlay');

export function closePauseOverlay() {
  pauseOverlay.classList.remove('open');
}

export function initPauseOverlay(gameLoop) {
  $('pause-btn').addEventListener('click', () => {
    const game = gameLoop.game;
    if (!game || game.runningState !== 'playing') return;
    game.runningState = 'paused';
    pauseOverlay.classList.add('open');
  });
  $('resume-btn').addEventListener('click', () => {
    const game = gameLoop.game;
    if (!game || game.runningState !== 'paused') return;
    game.runningState = 'playing';
    pauseOverlay.classList.remove('open');
    gameLoop.resetClock();
  });
  $('abort-btn').addEventListener('click', () => {
    pauseOverlay.classList.remove('open');
    if (gameLoop.game) abortRun(gameLoop.game);
  });
}
