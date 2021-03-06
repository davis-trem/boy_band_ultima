// https://github.com/grimmdude/MidiPlayerJS
import MidiPlayerJS, { Event } from 'midi-player-js';
// https://github.com/surikov/webaudiofont
import * as WebAudioFontPlayer from 'webaudiofont';

interface TrackType {
  maxVolume: number;
  expression: number;
  notes: {
    [key: string]: { [key: number]: Event & { startInSec: number; endInSec: number } };
  };
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  instrument?: any;
}

const INSTRUMENT_TYPES = [
  'Piano',
  'Chromatic Percussion',
  'Organ',
  'Guitar',
  'Bass',
  'Strings',
  'Ensemble',
  'Brass',
  'Reed',
  'Pipe',
  'Synth Lead',
  'Synth Pad',
  'Synth Effects',
  'Ethnic',
  'Percussive',
  'Sound Effects',
];

export type TickPlayedData = {
  tick: number;
  tickHasReachBeat: boolean;
  closestBeat: number;
  percentageToBeat: number;
  ticksFromPreviousBeat: number;
  ticksToNextBeat: number;
};
type TickPlayedCallBackType = (data: TickPlayedData) => void;

class MidiPlayer {
  private audioContext: AudioContext;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private instrumentFiles: { regular: { [key: number]: any }; percussion: { [key: number]: any } };
  private isLoading: boolean;
  private player: MidiPlayerJS.Player;
  private readyPromise: Promise<void>;
  private readyResolver: (value: void | PromiseLike<void>) => void;
  private tickPreSecIntervalId: NodeJS.Timeout;
  private tickPlayedCallBack: TickPlayedCallBackType;
  private ticksPerQuarterNote: number;
  private tracks: TrackType[];
  private webAudioFontPlayer: WebAudioFontPlayer;

  constructor(midiBinary: ArrayBuffer) {
    this.isLoading = false;
    this.readyPromise = new Promise((resolve) => {
      this.readyResolver = resolve;
    });

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const AudioContextFunc = window.AudioContext || (window as any).webkitAudioContext;
    this.audioContext = new AudioContextFunc();
    this.webAudioFontPlayer = new WebAudioFontPlayer();

    this.instrumentFiles = { regular: {}, percussion: {} };
    this.tracks = [];

    // Set callbacks incase it doesn't get set
    this.tickPlayedCallBack = () => null;

    this.player = new MidiPlayerJS.Player();
    this.handleFileLoaded();
    this.handleMidiEvent();
    this.player.loadArrayBuffer(midiBinary);
  }

  waitUntillReady(): Promise<void> {
    return this.readyPromise;
  }

  togglePlay(): void {
    if (!this.isLoading) {
      if (this.player.isPlaying()) {
        // Pause song and set start time to begining of current measure
        this.player.pause();
        this.webAudioFontPlayer.cancelQueue(this.audioContext);
        // clearInterval(this.bpsIntervalId);
        clearInterval(this.tickPreSecIntervalId);

        const beatsPlayedInCurrentMeasure = this.getBeatsPlayedInCurrentMeasure();
        const ticksPerBeatsInCurrentMeasure =
          beatsPlayedInCurrentMeasure * this.ticksPerQuarterNote;
        const measureStartTick = this.player.getCurrentTick() - ticksPerBeatsInCurrentMeasure;
        this.player.skipToTick(measureStartTick);
      } else {
        this.player.play();

        const tickDuration = 60000 / (this.player.tempo * this.player.division); // in millisec
        // TODO: calulate better way for tick separator, instead of "5"
        const tickSect = this.player.division / 5;
        let tick = 0;
        this.tickPlayedCallBack(this.calculateTickPlayedData(tick));
        this.tickPreSecIntervalId = setInterval(() => {
          tick += tickSect;
          this.tickPlayedCallBack(this.calculateTickPlayedData(tick));
        }, tickDuration * tickSect);
      }
    }
  }

  onTickPlayed(callback: TickPlayedCallBackType): void {
    this.tickPlayedCallBack = callback;
  }

  private getBeatsPlayedInCurrentMeasure(): number {
    // start at begining of current measure
    const amountOfBeatsPlayed = this.player.getCurrentTick() / this.ticksPerQuarterNote;
    return amountOfBeatsPlayed % 4;
  }

  private calculateTickPlayedData(tick: number): TickPlayedData {
    const beat = Math.round(tick / this.ticksPerQuarterNote) + 1;
    const beatInMeasure = beat % 4 || 4;
    const ticksFromPreviousBeat =
      tick - Math.floor(tick / this.ticksPerQuarterNote) * this.ticksPerQuarterNote;
    const ticksToNextBeat =
      Math.ceil(tick / this.ticksPerQuarterNote) * this.ticksPerQuarterNote - tick;
    return {
      tick,
      tickHasReachBeat: tick % this.ticksPerQuarterNote === 0,
      closestBeat: beatInMeasure,
      percentageToBeat: (tick % this.ticksPerQuarterNote) / this.ticksPerQuarterNote,
      ticksFromPreviousBeat,
      ticksToNextBeat,
    };
  }

  private handleFileLoaded() {
    this.player.on('fileLoaded', () => {
      const { instruments, tempo, tracks, division: ticksPerQuarterNote } = this.player;
      this.ticksPerQuarterNote = ticksPerQuarterNote;

      let percussionInstruments = [];

      const ticksPerSecond = (tempo * ticksPerQuarterNote) / 60;
      this.tracks = Array(tracks.length)
        .fill('')
        .map((_, index) => ({
          maxVolume: 127,
          expression: 127,
          notes: tracks[index].events.reduce(
            (map, ev) => {
              if (ev.name !== 'Note on' && ev.name !== 'Note off') {
                return map;
              }

              // Get Percussion Intruments since we're already looping thru the events
              if (index === 10) {
                percussionInstruments.push(ev.noteNumber);
              }

              const obj = map[ev.noteName] || {};
              let pendingNotes = map.pendingNotes.slice();
              if (pendingNotes.includes(ev.noteName) || ev.name === 'Note off') {
                const lastTick = Object.keys(obj).slice().pop();
                obj[lastTick].endInSec = ev.tick / ticksPerSecond;
                const noteIndex = pendingNotes.indexOf(ev.noteName);
                pendingNotes = [
                  ...pendingNotes.slice(0, noteIndex),
                  ...pendingNotes.slice(noteIndex + 1, pendingNotes.length),
                ];
              } else if (ev.velocity !== 0 && ev.name === 'Note on') {
                obj[ev.tick] = { ...ev, startInSec: ev.tick / ticksPerSecond };
                pendingNotes.push(ev.noteName);
              }

              return { ...map, pendingNotes, [ev.noteName]: obj };
            },
            { pendingNotes: [] },
          ),
        }));

      percussionInstruments = Array.from(new Set(percussionInstruments));

      instruments.forEach((instrument) => {
        const nn = this.webAudioFontPlayer.loader.findInstrument(instrument);
        const info = this.webAudioFontPlayer.loader.instrumentInfo(nn);
        this.webAudioFontPlayer.loader.startLoad(this.audioContext, info.url, info.variable);
        this.webAudioFontPlayer.loader.waitLoad(() => {
          this.instrumentFiles.regular[instrument] = window[info.variable];
          this.onInstrumentLoaded(instruments.length, percussionInstruments.length);
        });
      });

      percussionInstruments.forEach((instrument) => {
        const nn = this.webAudioFontPlayer.loader.findDrum(instrument);
        const info = this.webAudioFontPlayer.loader.drumInfo(nn);
        this.webAudioFontPlayer.loader.startLoad(this.audioContext, info.url, info.variable);
        this.webAudioFontPlayer.loader.waitLoad(() => {
          this.instrumentFiles.percussion[instrument] = window[info.variable];
        });
      });
    });
  }

  private onInstrumentLoaded(instrumentsLength: number, percussionInstrumentsLength: number) {
    if (
      Object.keys(this.instrumentFiles.regular).length === instrumentsLength &&
      Object.keys(this.instrumentFiles.percussion).length !== percussionInstrumentsLength
    ) {
      console.log('All instruments loaded...');
      this.isLoading = false;
      this.readyResolver();
    }
  }

  private handleMidiEvent() {
    this.player.on('midiEvent', (ev: Event) => {
      const isPercussion = ev.track === 11;
      switch (ev.name) {
        case 'Program Change':
          if (!isPercussion) {
            this.tracks[ev.track - 1].instrument = this.instrumentFiles.regular[ev.value];
          }
          break;
        case 'Controller Change':
          switch (ev.number) {
            case 7:
              this.tracks[ev.track - 1].maxVolume = ev.value;
              break;
            case 11:
              this.tracks[ev.track - 1].expression = ev.value;
              break;
          }
          break;
        case 'Note on': {
          if (ev.velocity === 0) {
            break;
          }
          const volume =
            ((((ev.velocity / 127) * this.tracks[ev.track - 1].expression) / 127) *
              this.tracks[ev.track - 1].maxVolume) /
            127;
          this.webAudioFontPlayer.queueWaveTable(
            this.audioContext,
            this.audioContext.destination,
            ev.track !== 11
              ? this.tracks[ev.track - 1].instrument
              : this.instrumentFiles.percussion[ev.noteNumber],
            0,
            ev.noteNumber,
            this.tracks[ev.track - 1].notes[ev.noteName][ev.tick].endInSec -
              this.tracks[ev.track - 1].notes[ev.noteName][ev.tick].startInSec,
            volume / (isPercussion ? 2 : 7),
          );
          break;
        }
        case 'Note off':
        case 'Sequence/Track Name':
        case 'MIDI Port':
        case 'Time Signature':
        case 'Key Signature':
        case 'Set Tempo':
        case 'End of Track':
        case 'Text Event':
        case 'Copyright Notice':
        case 'Instrument Name':
        case 'Lyric':
        case 'Marker':
        case 'Cue Point':
        case 'Device Name':
        case 'MIDI Channel Prefix':
        case 'Sequencer-Specific Meta-event':
        case 'Sysex':
        case 'Polyphonic Key Pressure':
        case 'Channel Key Pressure':
        case 'Pitch Bend':
          break;
      }
    });
  }
}

export default MidiPlayer;
