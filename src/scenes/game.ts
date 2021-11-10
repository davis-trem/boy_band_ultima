import { Scene, Events } from 'phaser';
import MidiPlayer from '../lib/midiPlayer';
import CharacterBuilder from '../lib/characterBuilder';

export class Game extends Scene {
  private characterBuilder: CharacterBuilder;
  private emitter: Events.EventEmitter;

  constructor() {
    super({
      key: 'GameScene',
    });
    this.emitter = new Events.EventEmitter();
    this.characterBuilder = new CharacterBuilder(this, this.emitter);
  }

  preload(): void {
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
      .createSprite(this.cameras.main.width - 46 * 3, this.cameras.main.centerY + 46)
      .setScale(4);

    const midiPlayer = new MidiPlayer(this.cache.binary.get('mymidi'));
    await midiPlayer.waitUntillReady();

    midiPlayer.onTickPlayed((data) => {
      this.emitter.emit('TICK_PLAYED', data);
    });

    image.on('pointerdown', () => {
      midiPlayer.togglePlay();
    });

    this.input.keyboard.on('keydown-SPACE', () => {
      midiPlayer.togglePlay();
    });
  }
}
