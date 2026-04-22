import { beforeEach, describe, expect, it } from 'vitest';
import { createSoundEffects, resetSharedSoundEffects } from '../player/soundEffects';

class FakeOscillator {
  public readonly frequency = {
    setValueAtTime: (value: number) => {
      this.startFrequency = value;
    },
    exponentialRampToValueAtTime: (value: number) => {
      this.endFrequency = value;
    },
  };
  public startTime = -1;
  public stopTime = -1;
  public startFrequency = 0;
  public endFrequency = 0;

  connect() {}
  start(time: number) {
    this.startTime = time;
  }
  stop(time: number) {
    this.stopTime = time;
  }
}

class FakeGain {
  public readonly gain = {
    setValueAtTime: (value: number) => {
      this.startGain = value;
    },
    exponentialRampToValueAtTime: (value: number) => {
      this.endGain = value;
    },
  };
  public startGain = 0;
  public endGain = 0;

  connect() {}
}

class FakeAudioContext {
  public currentTime = 2;
  public oscillators: FakeOscillator[] = [];
  public gains: FakeGain[] = [];
  public destination = {};

  createOscillator() {
    const osc = new FakeOscillator();
    this.oscillators.push(osc);
    return osc;
  }

  createGain() {
    const gain = new FakeGain();
    this.gains.push(gain);
    return gain;
  }
}

describe('soundEffects', () => {
  beforeEach(() => {
    resetSharedSoundEffects();
  });

  it('reuses a shared audio context across sound plays', () => {
    let created = 0;
    const sounds = createSoundEffects(() => {
      created++;
      return new FakeAudioContext();
    });

    sounds.play('break', () => 0);
    sounds.play('place', () => 0);

    expect(created).toBe(1);
  });

  it('uses distinct envelopes for break and place sounds', () => {
    const ctx = new FakeAudioContext();
    const sounds = createSoundEffects(() => ctx);

    sounds.play('break', () => 0);
    sounds.play('place', () => 0);

    expect(ctx.oscillators).toHaveLength(2);
    expect(ctx.gains).toHaveLength(2);

    expect(ctx.oscillators[0].startFrequency).toBe(200);
    expect(ctx.oscillators[0].endFrequency).toBe(50);
    expect(ctx.oscillators[0].stopTime).toBe(2.1);
    expect(ctx.gains[0].startGain).toBe(0.15);

    expect(ctx.oscillators[1].startFrequency).toBe(400);
    expect(ctx.oscillators[1].stopTime).toBe(2.08);
    expect(ctx.gains[1].startGain).toBe(0.1);
  });
});
