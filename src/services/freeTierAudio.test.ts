import { beforeEach, describe, expect, it, vi } from 'vitest';
import { concatenateWithSilenceGaps } from './freeTierAudio';

class MockAudioBuffer {
  numberOfChannels: number;
  length: number;
  sampleRate: number;
  private channels: Float32Array[];

  constructor(numberOfChannels: number, length: number, sampleRate: number) {
    this.numberOfChannels = numberOfChannels;
    this.length = length;
    this.sampleRate = sampleRate;
    this.channels = Array.from({ length: numberOfChannels }, () => new Float32Array(length));
  }

  get duration() {
    return this.length / this.sampleRate;
  }

  getChannelData(index: number) {
    return this.channels[index];
  }
}

class MockAudioContext {
  decodeAudioData = vi.fn(async () => new MockAudioBuffer(1, 100, 10));
  createBuffer = vi.fn((channels: number, length: number, sampleRate: number) =>
    new MockAudioBuffer(channels, length, sampleRate)
  );
  close = vi.fn(async () => undefined);
}

describe('concatenateWithSilenceGaps', () => {
  beforeEach(() => {
    vi.stubGlobal('AudioContext', MockAudioContext as unknown as typeof AudioContext);
  });

  it('returns a WAV blob with target 60 second output length', async () => {
    const result = await concatenateWithSilenceGaps(
      new ArrayBuffer(8),
      new ArrayBuffer(8),
      new ArrayBuffer(8)
    );

    // sampleRate=10, outputDuration=60s -> 600 samples -> 1200 bytes PCM + 44-byte WAV header
    expect(result.type).toBe('audio/wav');
    expect(result.size).toBe(1244);
  });
});
