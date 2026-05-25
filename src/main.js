import { Game } from './core/Game.js?v=golem-hp-harvest-1';
import { CURRENT_BATTLE } from './battles/currentBattle.js?v=golem-hp-harvest-1';

export function bootGame(doc = document) {
  const game = new Game({
    arena: doc.getElementById('arena'),
    pauseBtn: doc.getElementById('pauseBtn'),
    resetBtn: doc.getElementById('resetBtn'),
    battle: CURRENT_BATTLE
  });

  return { game, runtime: game.start() };
}

if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  try {
    const { game, runtime } = bootGame(document);
    window.game = game;
    window.gameRuntime = runtime;
  } catch (error) {
    window.gameBootError = error;
    console.error(error);
  }
}
