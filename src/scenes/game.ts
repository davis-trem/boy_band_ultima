import { Scene } from 'phaser';
import MidiPlayer from '../lib/midiPlayer';

export class Game extends Scene {
  constructor() {
    super({
      key: 'GameScene',
    });
  }

  preload(): void {
    this.load.binary('mymidi', '../../assets/midi/stickerbush_symphony.mid');
    // this.load.binary('mymidi', '../../assets/midi/fz_mute_city.mid');
  }

  async create(): Promise<void> {
    const image = this.add
      .image(this.cameras.main.centerX, this.cameras.main.centerY, 'phaser_logo')
      .setInteractive();
    image.setOrigin(0.5);

    const midiPlayer = new MidiPlayer(this.cache.binary.get('mymidi'));
    await midiPlayer.waitUntillReady();

    midiPlayer.onBeatPlayed(() => {
      console.log('bbbbbb');
    });

    image.on('pointerdown', () => {
      midiPlayer.togglePlay();
    });
  }
}
