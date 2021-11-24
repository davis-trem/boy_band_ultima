import { Scene, GameObjects, Events } from 'phaser';
import { TickPlayedData } from './midiPlayer';
import BattleBar from '../components/battleBar';

class CharacterBuilder {
  private scene: Scene;
  private emitter: Events.EventEmitter;
  private battleBar: BattleBar;
  private CHARGING_BEAT_COUNT = 2;
  private MAX_CHARGING_BEAT_COUNT = 4;

  constructor(scene: Scene, emitter: Events.EventEmitter, battleBar: BattleBar) {
    this.scene = scene;
    this.emitter = emitter;
    this.battleBar = battleBar;
  }

  loadSprite(): void {
    this.scene.load.spritesheet('character', '../../assets/image/test_char.png', {
      frameWidth: 48,
      frameHeight: 48,
    });
  }

  loadAnimations(): void {
    this.scene.anims.create({
      key: 'character_walk',
      frames: this.scene.anims.generateFrameNumbers('character', { frames: [0, 1, 2, 3] }),
      frameRate: 8,
      repeat: -1,
    });

    this.scene.anims.create({
      key: 'character_idle',
      frames: this.scene.anims.generateFrameNumbers('character', { frames: [5, 6, 7, 8] }),
      frameRate: 8,
      repeat: -1,
    });

    this.scene.anims.create({
      key: 'character_kick',
      frames: this.scene.anims.generateFrameNumbers('character', { frames: [10, 11, 12, 13, 10] }),
      frameRate: 8,
      repeat: 0,
    });

    this.scene.anims.create({
      key: 'character_punch',
      frames: this.scene.anims.generateFrameNumbers('character', {
        frames: [15, 16, 17, 18, 17, 15],
      }),
      frameRate: 8,
      repeat: -1,
      repeatDelay: 2000,
    });

    this.scene.anims.create({
      key: 'character_jump',
      frames: this.scene.anims.generateFrameNumbers('character', { frames: [20, 21, 22, 23] }),
      frameRate: 8,
      repeat: -1,
    });

    this.scene.anims.create({
      key: 'character_jumpkick',
      frames: this.scene.anims.generateFrameNumbers('character', {
        frames: [20, 21, 22, 23, 25, 23, 22, 21],
      }),
      frameRate: 8,
      repeat: -1,
    });

    this.scene.anims.create({
      key: 'character_win',
      frames: this.scene.anims.generateFrameNumbers('character', { frames: [30, 31] }),
      frameRate: 8,
      repeat: -1,
      repeatDelay: 2000,
    });

    this.scene.anims.create({
      key: 'character_die',
      frames: this.scene.anims.generateFrameNumbers('character', { frames: [35, 36, 37] }),
      frameRate: 8,
      repeat: 0,
      // repeatDelay: 2000,
    });
  }

  createSprite(x: number, y: number, isPlayable: boolean): GameObjects.Sprite {
    const char = this.scene.add.sprite(x, y, 'character').setDataEnabled();
    if (isPlayable) {
      char.setInteractive();
    }
    char.setData({
      chargingAttack: false,
      attacking: false,
      beatsSinceCharging: null,
    });
    char.play('character_idle');

    char.on('pointerdown', () => {
      const [chargingAttack, attacking, beatsSinceCharging, percentageToBeat] = char.getData([
        'chargingAttack',
        'attacking',
        'beatsSinceCharging',
        'percentageToBeat',
      ]);
      if (attacking) return;

      if (chargingAttack) {
        console.log({ percentageToBeat, beatsSinceCharging, targetBeat: this.CHARGING_BEAT_COUNT });
        char.setData({ attacking: true, percentageToBeat: null });
        char.play('character_kick');
        char.once('animationcomplete', () => {
          char.setData({ attacking: false, beatsSinceCharging: null });
          char.playAfterRepeat('character_idle');
        });
      } else {
        char.play('character_walk');
      }
      char.setData({ chargingAttack: !chargingAttack });
    });

    this.emitter.on(
      'TICK_PLAYED',
      ({ tickHasReachBeat, closestBeat, percentageToBeat }: TickPlayedData) => {
        char.setData({ percentageToBeat });
        const [chargingAttack, beatsSinceCharging] = char.getData([
          'chargingAttack',
          'beatsSinceCharging',
        ]);
        if (!chargingAttack) {
          return;
        }

        if (beatsSinceCharging !== null && tickHasReachBeat) {
          char.setData({ beatsSinceCharging: beatsSinceCharging + 1 });
          console.log('beat played', beatsSinceCharging, closestBeat);
        }
        if (beatsSinceCharging === null) {
          char.setData({ beatsSinceCharging: 1 });
          console.log(beatsSinceCharging, closestBeat);
        }

        if (beatsSinceCharging > this.CHARGING_BEAT_COUNT && percentageToBeat > 0.5) {
          char.setData({ chargingAttack: false });
          console.log('diiiiiie');
          char.play('character_die');
          this.battleBar.offsetPlayerValueBy(-0.15);
          char.once('animationcomplete', () => {
            char.anims.reverse();
            char.setData({ attacking: false, beatsSinceCharging: null });
            char.play('character_idle');
          });
        }
      },
    );

    return char;
  }
}

export default CharacterBuilder;
