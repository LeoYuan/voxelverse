export type SoundKind = 'break' | 'place';

type AudioOscillatorLike = {
  frequency: {
    setValueAtTime(value: number, time: number): void;
    exponentialRampToValueAtTime(value: number, time: number): void;
  };
  connect(destination: unknown): void;
  start(time: number): void;
  stop(time: number): void;
};

type AudioGainLike = {
  gain: {
    setValueAtTime(value: number, time: number): void;
    exponentialRampToValueAtTime(value: number, time: number): void;
  };
  connect(destination: unknown): void;
};

type AudioContextLike = {
  currentTime: number;
  destination: unknown;
  createOscillator(): AudioOscillatorLike;
  createGain(): AudioGainLike;
};

type AudioContextFactory = () => AudioContextLike;

function playWithContext(
  ctx: AudioContextLike,
  type: SoundKind,
  random: () => number,
  volume: number
) {
  if (volume <= 0) return;

  const osc = ctx.createOscillator();
  const gain = ctx.createGain();
  osc.connect(gain);
  gain.connect(ctx.destination);

  if (type === 'break') {
    osc.frequency.setValueAtTime(200 + random() * 100, ctx.currentTime);
    osc.frequency.exponentialRampToValueAtTime(50, ctx.currentTime + 0.1);
    gain.gain.setValueAtTime(0.15 * volume, ctx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.1);
    osc.start(ctx.currentTime);
    osc.stop(ctx.currentTime + 0.1);
    return;
  }

  osc.frequency.setValueAtTime(400 + random() * 50, ctx.currentTime);
  gain.gain.setValueAtTime(0.1 * volume, ctx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.08);
  osc.start(ctx.currentTime);
  osc.stop(ctx.currentTime + 0.08);
}

export function createSoundEffects(factory: AudioContextFactory) {
  let ctx: AudioContextLike | null = null;
  let muted = false;
  let volume = 0.8;

  return {
    play(type: SoundKind, random: () => number = Math.random) {
      if (muted) return;
      ctx ??= factory();
      playWithContext(ctx, type, random, volume);
    },
    setMuted(nextMuted: boolean) {
      muted = nextMuted;
    },
    setVolume(nextVolume: number) {
      volume = Math.max(0, Math.min(1, nextVolume));
    },
    getSettings() {
      return { muted, volume };
    },
  };
}

let sharedSoundEffects: ReturnType<typeof createSoundEffects> | null = null;

export function getSharedSoundEffects() {
  if (!sharedSoundEffects) {
    sharedSoundEffects = createSoundEffects(() => new AudioContext());
  }
  return sharedSoundEffects;
}

export function resetSharedSoundEffects() {
  sharedSoundEffects = null;
}
