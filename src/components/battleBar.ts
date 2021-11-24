import { Scene, GameObjects } from 'phaser';

class BattleBar {
  private enemyBar: GameObjects.Rectangle;
  private playerBar: GameObjects.Rectangle;
  private playerValue: number;

  constructor(scene: Scene) {
    const barWidth = scene.cameras.main.width - 40;
    scene.add.rectangle(scene.cameras.main.width / 2, 80, barWidth, 50, 0x000000).setDepth(100);
    this.enemyBar = scene.add
      .rectangle(20, 80, barWidth / 2, 50, 0xff0000)
      .setOrigin(0, 0.5)
      .setDepth(100);
    this.playerBar = scene.add
      .rectangle(scene.cameras.main.width - 20, 80, barWidth / 2, 50, 0x00ff00)
      .setOrigin(1, 0.5)
      .setDepth(100);

    this.playerValue = 0.5;

    // scene.game.events.on('create', () => {
    //   console.log('CREAAAATE!!!');
    // });
  }

  offsetPlayerValueBy(percentage: number): number {
    this.playerValue += percentage;
    if (this.playerValue > 1) {
      this.playerValue = 1;
    }

    if (this.playerValue < 0) {
      this.playerValue = 0;
    }
    this.playerBar.setScale(2 * this.playerValue, 1);
    this.enemyBar.setScale(2 * (1 - this.playerValue), 1);
    return this.playerValue;
  }
}

export default BattleBar;
