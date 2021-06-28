import { Scene } from 'phaser';
// https://github.com/surikov/webaudiofont
import * as WebAudioFontPlayer from 'webaudiofont';
// https://github.com/grimmdude/MidiPlayerJS
import MidiPlayerJS, { Event } from 'midi-player-js';

export class Game extends Scene {
  constructor() {
    super({
      key: 'GameScene'
    });
  }

  preload(): void {
    this.load.binary('mymidi', '../../assets/midi/stickerbush_symphony.mid')
  }

  create(): void {
    const image = this.add.image(this.cameras.main.centerX, this.cameras.main.centerY, 'phaser_logo').setInteractive();
    image.setOrigin(0.5);

    const AudioContextFunc = window.AudioContext || (window as any).webkitAudioContext;
    const audioContext = new AudioContextFunc();
    const webAudioFontPlayer = new WebAudioFontPlayer();

    let instrumentFiles = { regular: {}, percussion: {} };
    (window as any).instrumentFiles = instrumentFiles

    let TRACKS = [];
    const Player = new MidiPlayerJS.Player();
    Player.on('fileLoaded', function() {
      console.log('file loaded....')
      const { format, instruments, tempo, tick, tracks } = Player;
      console.log({ format, instruments, tempo, tick, tracks });
      (window as any).ppp = { format, instruments, tempo, tick, tracks }

      const percussionInstruments = Array.from(new Set(
        tracks[10].events.reduce(
          (list, ev) => ev.name === 'Note on' ? list.concat(ev.noteNumber) : list, []
        )
      ));

      TRACKS = Array(tracks.length).fill({ maxVolume: 127, expression: 127, notesPlaying: {} });

      instruments.forEach(instrument => {
        const nn = webAudioFontPlayer.loader.findInstrument(instrument);
        var info = webAudioFontPlayer.loader.instrumentInfo(nn);
        webAudioFontPlayer.loader.startLoad(audioContext, info.url, info.variable);
        webAudioFontPlayer.loader.waitLoad(function () {
          instrumentFiles.regular[instrument] = window[info.variable];
        });
      });

      percussionInstruments.forEach(instrument => {
        const nn = webAudioFontPlayer.loader.findDrum(instrument);
        var info = webAudioFontPlayer.loader.drumInfo(nn);
        webAudioFontPlayer.loader.startLoad(audioContext, info.url, info.variable);
        webAudioFontPlayer.loader.waitLoad(function () {
          instrumentFiles.percussion[instrument] = window[info.variable];
        });
      });
    });

    Player.on('midiEvent', function(ev: Event) {
      if (ev.track === 11) {
        return;
      }
      // if (![2, 5, 7, 9, 12, 17].includes(ev.track)) {
      //   return;
      // }
      // if (ev.track !== 17 && ev.track !== 2) {
      //   return;
      // }
      // console.log(ev)
      switch (ev.name) {
        case 'Program Change':
          if (ev.track !== 11) {
            TRACKS[ev.track - 1].instrument = instrumentFiles.regular[ev.value];
          }
          break;
        case 'Controller Change':
          switch (ev.number) {
            case 7:
              TRACKS[ev.track - 1].maxVolume = ev.value;
              break;
            case 11:
              TRACKS[ev.track - 1].expression = ev.value;
              break;
          }
          break;
        case 'Note on':
          if (ev.velocity === 0) {
            TRACKS[ev.track - 1].notesPlaying[ev.noteName]?.cancel();
          } else {
            const volume = ((((ev.velocity / 127) * TRACKS[ev.track - 1].expression) / 127) * TRACKS[ev.track - 1].maxVolume) / 127;
            TRACKS[ev.track - 1].notesPlaying[ev.noteName] = webAudioFontPlayer.queueWaveTable(
              audioContext,
              audioContext.destination,
              ev.track !== 11 ? TRACKS[ev.track - 1].instrument : instrumentFiles.percussion[ev.noteNumber],
              0,
              ev.noteNumber,
              10,
              volume / (ev.noteNumber > 24 ? 15 : 3)
            );
          }
          
          break;
        case 'Sequence/Track Name':
        case 'MIDI Port':
        case 'Time Signature':
        case 'Key Signature':
        case 'Set Tempo':
        case 'End of Track':
        case 'Sequence/Track Name':
        case 'Set Tempo':
        case 'Sequence/Track Name':
        case 'Set Tempo':
        case 'Sequence/Track Name':
          break;
      }
    });

    Player.loadArrayBuffer(this.cache.binary.get('mymidi'));


    /////////
    var nn = webAudioFontPlayer.loader.findInstrument(42);
    var info = webAudioFontPlayer.loader.instrumentInfo(nn);
    console.log(info);
    webAudioFontPlayer.loader.startLoad(audioContext, info.url, info.variable);
    
    webAudioFontPlayer.loader.waitLoad(function () {
      console.log('done loading....');
      //console.log(window[info.variable])
      
      // setInterval(()=> {
      //   console.log('play nigga');
      //   player.queueWaveTable(audioContext, audioContext.destination, window[info.variable], 0, 55, 0.5);
      // }, 3000)
      
    });

    image.on('pointerdown', function() {
      console.log('clicked');
      
      if (Player.isPlaying()) {
        Player.pause();
        webAudioFontPlayer.cancelQueue(audioContext);
      } else {
        Player.play();
      }

      // const qq = webAudioFontPlayer.queueWaveTable(audioContext, audioContext.destination, window[info.variable], 0, 55, 10);
      // console.log(qq);
      // (window as any).qq = qq;
    });
    
    
    // var nn = player.loader.findInstrument(42);
    // var info = player.loader.instrumentInfo(nn);
    // console.log(info);
    // player.loader.startLoad(audioContext, info.url, info.variable);
    
    // player.loader.waitLoad(function () {
    //   console.log('done loading....');
    //   //console.log(window[info.variable])
    //     //player.queueWaveTable(audioContext, audioContext.destination, window[info.variable], 0, 55, 0.5);
    //   // setInterval(()=> {
    //   //   console.log('play nigga');
    //   //   player.queueWaveTable(audioContext, audioContext.destination, window[info.variable], 0, 55, 0.5);
    //   // }, 3000)
      
    // });

  }
}
