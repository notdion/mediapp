import { fireEvent, render, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import type { Session } from '../../types';
import { SessionPlaybackScreen } from './SessionPlaybackScreen';

type EventCallback = () => void;

class MockAudio {
  static instances: MockAudio[] = [];

  src = '';
  preload = '';
  currentTime = 0;
  duration = 120;
  paused = true;
  private listeners = new Map<string, Set<EventCallback>>();

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

  addEventListener(type: string, callback: EventCallback) {
    const existing = this.listeners.get(type) || new Set<EventCallback>();
    existing.add(callback);
    this.listeners.set(type, existing);
  }

  removeEventListener(type: string, callback: EventCallback) {
    this.listeners.get(type)?.delete(callback);
  }

  dispatch(type: string) {
    this.listeners.get(type)?.forEach((callback) => callback());
  }
}

const sessionFixture: Session = {
  id: 'session-1',
  userId: 'user-1',
  transcript: 'I had a stressful day at work.',
  summary: 'Work stress',
  mood: 'CALMING',
  meditationScript: 'Take a deep breath and settle into stillness.',
  audioUrl: 'blob:test-audio',
  duration: 90,
  createdAt: new Date().toISOString(),
};

describe('SessionPlaybackScreen', () => {
  beforeEach(() => {
    MockAudio.instances = [];
    vi.stubGlobal('Audio', MockAudio as unknown as typeof Audio);
  });

  it('plays session audio when a session audio URL is present', async () => {
    const { container } = render(
      <SessionPlaybackScreen session={sessionFixture} onClose={() => undefined} />
    );

    expect(MockAudio.instances.length).toBe(1);
    const audioInstance = MockAudio.instances[0];
    audioInstance.dispatch('loadedmetadata');

    const playButton = container.querySelector<HTMLButtonElement>('.play-button');
    expect(playButton).not.toBeNull();
    fireEvent.click(playButton!);

    await waitFor(() => {
      expect(audioInstance.play).toHaveBeenCalledTimes(1);
    });
  });
});
