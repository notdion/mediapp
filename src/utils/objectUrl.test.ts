import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { isBlobUrl, replaceManagedObjectUrl, revokeBlobUrl } from './objectUrl';

describe('objectUrl utilities', () => {
  const originalRevoke = URL.revokeObjectURL;

  beforeEach(() => {
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      writable: true,
      value: vi.fn(),
    });
  });

  afterEach(() => {
    Object.defineProperty(URL, 'revokeObjectURL', {
      configurable: true,
      writable: true,
      value: originalRevoke,
    });
  });

  it('identifies blob URLs correctly', () => {
    expect(isBlobUrl('blob:abc123')).toBe(true);
    expect(isBlobUrl('https://example.com/audio.mp3')).toBe(false);
    expect(isBlobUrl(null)).toBe(false);
  });

  it('revokeBlobUrl only revokes blob URLs', () => {
    revokeBlobUrl('blob:temp-url');
    revokeBlobUrl('https://example.com/audio.mp3');

    expect(URL.revokeObjectURL).toHaveBeenCalledTimes(1);
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:temp-url');
  });

  it('replaceManagedObjectUrl revokes previous blob URL when replacing', () => {
    const next = replaceManagedObjectUrl('blob:old-audio', 'blob:new-audio');
    expect(next).toBe('blob:new-audio');
    expect(URL.revokeObjectURL).toHaveBeenCalledWith('blob:old-audio');
  });

  it('replaceManagedObjectUrl does not revoke when URL is unchanged', () => {
    const next = replaceManagedObjectUrl('blob:same-audio', 'blob:same-audio');
    expect(next).toBe('blob:same-audio');
    expect(URL.revokeObjectURL).not.toHaveBeenCalled();
  });
});
