import * as Phaser from 'phaser';
import Boot from './scenes/boot';
import Preload from './scenes/preload';
import { Game as GameScene } from './scenes/game';

const config: Phaser.Types.Core.GameConfig = {
  title: 'Boy Band Ultima',

  scene: [Boot, Preload, GameScene],
  backgroundColor: '#333',
  scale: {
    mode: Phaser.Scale.FIT,
    parent: 'game-container',
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: 800,
    height: 600,
    max: {
      width: 800,
      height: 600,
    },
  },
};

window.addEventListener('load', () => {
  window['game'] = new Phaser.Game(config);
});
