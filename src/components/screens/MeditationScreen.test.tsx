import { fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { MeditationScreen } from './MeditationScreen';

class MockAudio {
  static instances: MockAudio[] = [];

  src = '';
  loop = false;
  volume = 1;
  muted = false;
  preload = '';
  currentTime = 0;
  paused = true;

  play = vi.fn(async () => {
    this.paused = false;
  });

  pause = vi.fn(() => {
    this.paused = true;
  });

  constructor(src?: string) {
    if (src) this.src = src;
    MockAudio.instances.push(this);
  }

  addEventListener() {}
  removeEventListener() {}
}

describe('MeditationScreen soft start', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    MockAudio.instances = [];
    vi.stubGlobal('Audio', MockAudio as unknown as typeof Audio);
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('waits for countdown before starting playback', async () => {
    const onComplete = vi.fn();
    render(
      <MeditationScreen
        mood="CALMING"
        script="Breathe in, breathe out."
        duration={120}
        onComplete={onComplete}
        onClose={() => undefined}
      />
    );

    const playButton = document.querySelector<HTMLButtonElement>('.play-button');
    expect(playButton).not.toBeNull();
    fireEvent.click(playButton!);

    expect(screen.getByText('Breathe in')).toBeInTheDocument();
    expect(MockAudio.instances[0]?.play).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(2900);
    expect(MockAudio.instances[0]?.play).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(200);
    await Promise.resolve();
    expect(MockAudio.instances[0]?.play).toHaveBeenCalledTimes(1);
  });
});
