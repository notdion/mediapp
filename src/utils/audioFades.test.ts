import { describe, expect, it, vi, afterEach } from 'vitest';
import { fadeAudioVolume } from './audioFades';

describe('fadeAudioVolume', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('smoothly fades from current volume to target volume', async () => {
    vi.useFakeTimers();
    const audio = { volume: 1 } as HTMLAudioElement;

    const fadePromise = fadeAudioVolume(audio, 0.2, 200);
    await vi.advanceTimersByTimeAsync(250);
    await fadePromise;

    expect(audio.volume).toBeCloseTo(0.2, 3);
  });

  it('clamps the target volume to valid bounds', async () => {
    vi.useFakeTimers();
    const audio = { volume: 0.6 } as HTMLAudioElement;

    const fadePromise = fadeAudioVolume(audio, 5, 100);
    await vi.advanceTimersByTimeAsync(120);
    await fadePromise;

    expect(audio.volume).toBe(1);
  });
});
