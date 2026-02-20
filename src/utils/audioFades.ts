const DEFAULT_STEP_MS = 50;

/**
 * Smoothly fades an audio element's volume to a target level.
 * Returns a promise that resolves once the fade has finished.
 *
 * This utility keeps the fade logic deterministic and framework-agnostic,
 * which makes future Swift migration (e.g. AVAudioPlayer fades) easier.
 */
export function fadeAudioVolume(
  audio: HTMLAudioElement,
  toVolume: number,
  durationMs: number
): Promise<void> {
  const clampedTarget = Math.max(0, Math.min(1, toVolume));
  if (durationMs <= 0) {
    audio.volume = clampedTarget;
    return Promise.resolve();
  }

  const startingVolume = audio.volume;
  const delta = clampedTarget - startingVolume;
  if (delta === 0) {
    return Promise.resolve();
  }

  const totalSteps = Math.max(1, Math.ceil(durationMs / DEFAULT_STEP_MS));
  const volumeStep = delta / totalSteps;
  let currentStep = 0;

  return new Promise((resolve) => {
    const interval = setInterval(() => {
      currentStep += 1;
      if (currentStep >= totalSteps) {
        audio.volume = clampedTarget;
        clearInterval(interval);
        resolve();
        return;
      }
      audio.volume = Math.max(0, Math.min(1, startingVolume + volumeStep * currentStep));
    }, DEFAULT_STEP_MS);
  });
}
