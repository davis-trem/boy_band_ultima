import { Scene, Events } from 'phaser';
import MidiPlayer from '../lib/midiPlayer';
import CharacterBuilder from '../lib/characterBuilder';
import BattleBar from '../components/battleBar';

export class Game extends Scene {
  private battleBar: BattleBar;
  private characterBuilder: CharacterBuilder;
  private emitter: Events.EventEmitter;

  constructor() {
    super({
      key: 'GameScene',
    });
  }

  preload(): void {
    this.emitter = new Events.EventEmitter();
    this.battleBar = new BattleBar(this);
    this.characterBuilder = new CharacterBuilder(this, this.emitter, this.battleBar);

    this.load.binary('mymidi', '../../assets/midi/stickerbush_symphony.mid');
    // this.load.binary('mymidi', '../../assets/midi/fz_mute_city.mid');
    this.load.image('bg', '../../assets/image/test_bg.png');
    this.characterBuilder.loadSprite();
  }

  async create(): Promise<void> {
    this.characterBuilder.loadAnimations();

    const image = this.add
      .image(this.cameras.main.centerX, this.cameras.main.centerY, 'phaser_logo')
      // .setInteractive()
      .setOrigin(0.5);

    this.add
      .image(this.cameras.main.centerX, this.cameras.main.centerY, 'bg')
      .setOrigin(0.5)
      .setScale(2);

    const char = this.characterBuilder
      .createSprite(this.cameras.main.width - 46 * 3, this.cameras.main.centerY + 46, true)
      .setScale(4);

    char.setData({ poo: 23 });

    const enemy = this.characterBuilder
      .createSprite(46 * 3, this.cameras.main.centerY + 46, false)
      .setScale(-4, 4);

    enemy.setData({ poo: 56 });

    const beatText = this.add
      .text(this.cameras.main.centerX, this.cameras.main.centerY, 'GO', {
        fontSize: '8rem',
        strokeThickness: 8,
      })
      .setOrigin(0.5);

    const midiPlayer = new MidiPlayer(this.cache.binary.get('mymidi'));
    await midiPlayer.waitUntillReady();

    midiPlayer.onTickPlayed((data) => {
      this.emitter.emit('TICK_PLAYED', data);
      beatText.setText(`${data.closestBeat + data.percentageToBeat}`);
      beatText.setScale(data.tickHasReachBeat ? 1 : data.percentageToBeat / 2);
      const color = data.tickHasReachBeat ? '#00FF00' : '#FFFFFF';
      beatText.setStyle({ color, stroke: color });
    });

    image.on('pointerdown', () => {
      midiPlayer.togglePlay();
    });

    this.input.keyboard.on('keydown-SPACE', () => {
      midiPlayer.togglePlay();
    });
  }
}
