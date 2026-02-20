// ============================================
// Free Tier Audio Service
// Manages intro/outro clips for free tier meditations
// ============================================

// Dynamically import all intro and outro clips
const introModules = import.meta.glob('../components/audio/Free Intros/*.mp3', {
  eager: true,
  query: '?url',
  import: 'default'
}) as Record<string, string>;
const outroModules = import.meta.glob('../components/audio/Free Outros/*.mp3', {
  eager: true,
  query: '?url',
  import: 'default'
}) as Record<string, string>;

// Import the silence file for gap filling
import silenceUrl from '../components/audio/Accessories/Meditation - Silence.mp3';

// Cache for silence audio buffer
let silenceBuffer: ArrayBuffer | null = null;
let silenceDuration: number = 0;

// Load and cache the silence file
async function getSilenceBuffer(): Promise<{ buffer: ArrayBuffer; duration: number }> {
  if (silenceBuffer && silenceDuration > 0) {
    return { buffer: silenceBuffer, duration: silenceDuration };
  }
  
  const response = await fetch(silenceUrl);
  silenceBuffer = await response.arrayBuffer();
  
  // Get duration using Audio element
  silenceDuration = await new Promise<number>((resolve) => {
    const audio = new Audio(silenceUrl);
    audio.addEventListener('loadedmetadata', () => resolve(audio.duration));
    audio.addEventListener('error', () => resolve(10)); // Default 10s if error
  });
  
  return { buffer: silenceBuffer, duration: silenceDuration };
}

// Export for use in premium meditation
export async function getSilenceBufferData(): Promise<{ buffer: ArrayBuffer; duration: number }> {
  return getSilenceBuffer();
}

// Get audio duration from a blob URL
export async function getAudioDurationFromUrl(url: string): Promise<number> {
  return new Promise((resolve) => {
    const audio = new Audio(url);
    audio.addEventListener('loadedmetadata', () => resolve(audio.duration));
    audio.addEventListener('error', () => resolve(0));
  });
}

function audioBufferToWav(audioBuffer: AudioBuffer): Blob {
  const numChannels = audioBuffer.numberOfChannels;
  const sampleRate = audioBuffer.sampleRate;
  const bitsPerSample = 16;
  const bytesPerSample = bitsPerSample / 8;
  const blockAlign = numChannels * bytesPerSample;
  const numSamples = audioBuffer.length;
  const dataSize = numSamples * blockAlign;
  const headerSize = 44;
  const totalSize = headerSize + dataSize;

  const buffer = new ArrayBuffer(totalSize);
  const view = new DataView(buffer);

  const writeString = (offset: number, str: string) => {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(offset + i, str.charCodeAt(i));
    }
  };

  writeString(0, 'RIFF');
  view.setUint32(4, totalSize - 8, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * blockAlign, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, bitsPerSample, true);
  writeString(36, 'data');
  view.setUint32(40, dataSize, true);

  let writeOffset = headerSize;
  for (let i = 0; i < numSamples; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, audioBuffer.getChannelData(ch)[i]));
      const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7fff;
      view.setInt16(writeOffset, int16, true);
      writeOffset += 2;
    }
  }

  return new Blob([buffer], { type: 'audio/wav' });
}

// Audio clip metadata
interface AudioClip {
  id: string;
  url: string;
  duration: number; // in seconds
  scriptText: string; // The spoken text extracted from filename
}

// Pre-mapped combination for a user's meditation sequence
export interface MeditationCombo {
  introId: string;
  outroId: string;
  introUrl: string;
  outroUrl: string;
  introDuration: number;
  outroDuration: number;
  totalClipDuration: number;
  introScript: string; // The spoken text for the intro
  outroScript: string; // The spoken text for the outro
}

// Storage keys
const USED_INTROS_KEY = 'zenpal-used-intros';
const USED_OUTROS_KEY = 'zenpal-used-outros';

// Extract script text from filename (replace -- with ?)
function extractScriptFromFilename(filename: string): string {
  // Remove .mp3 extension
  const withoutExtension = filename.replace(/\.mp3$/i, '');
  // Replace -- with ? (filenames don't support question marks)
  return withoutExtension.replace(/--/g, '?');
}

// Convert module paths to clip arrays
function getClipsFromModules(modules: Record<string, string>): AudioClip[] {
  return Object.entries(modules).map(([path, url]) => {
    // Extract filename as ID
    const filename = path.split('/').pop() || path;
    const id = filename.replace('.mp3', '');
    const scriptText = extractScriptFromFilename(filename);
    return {
      id,
      url,
      duration: 0, // Will be populated when audio is loaded
      scriptText,
    };
  });
}

// Get all intro clips
export function getIntroClips(): AudioClip[] {
  return getClipsFromModules(introModules);
}

// Get all outro clips
export function getOutroClips(): AudioClip[] {
  return getClipsFromModules(outroModules);
}

// Get used intro IDs for a user
function getUsedIntros(userId?: string): Set<string> {
  try {
    const key = userId ? `${USED_INTROS_KEY}-${userId}` : USED_INTROS_KEY;
    const stored = localStorage.getItem(key);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

// Get used outro IDs for a user
function getUsedOutros(userId?: string): Set<string> {
  try {
    const key = userId ? `${USED_OUTROS_KEY}-${userId}` : USED_OUTROS_KEY;
    const stored = localStorage.getItem(key);
    return stored ? new Set(JSON.parse(stored)) : new Set();
  } catch {
    return new Set();
  }
}

// Mark intro as used
function markIntroUsed(introId: string, userId?: string): void {
  try {
    const key = userId ? `${USED_INTROS_KEY}-${userId}` : USED_INTROS_KEY;
    const used = getUsedIntros(userId);
    used.add(introId);
    localStorage.setItem(key, JSON.stringify([...used]));
  } catch {
    // Ignore storage errors
  }
}

// Mark outro as used
function markOutroUsed(outroId: string, userId?: string): void {
  try {
    const key = userId ? `${USED_OUTROS_KEY}-${userId}` : USED_OUTROS_KEY;
    const used = getUsedOutros(userId);
    used.add(outroId);
    localStorage.setItem(key, JSON.stringify([...used]));
  } catch {
    // Ignore storage errors
  }
}

// Get available (unused) intros for a user
export function getAvailableIntros(userId?: string): AudioClip[] {
  const allIntros = getIntroClips();
  const usedIntros = getUsedIntros(userId);
  
  // If all have been used, reset and return all
  if (usedIntros.size >= allIntros.length) {
    resetUsedClips(userId);
    return allIntros;
  }
  
  return allIntros.filter(clip => !usedIntros.has(clip.id));
}

// Get available (unused) outros for a user
export function getAvailableOutros(userId?: string): AudioClip[] {
  const allOutros = getOutroClips();
  const usedOutros = getUsedOutros(userId);
  
  // If all have been used, reset and return all
  if (usedOutros.size >= allOutros.length) {
    resetUsedClips(userId);
    return allOutros;
  }
  
  return allOutros.filter(clip => !usedOutros.has(clip.id));
}

// Reset used clips for a user
export function resetUsedClips(userId?: string): void {
  try {
    const introKey = userId ? `${USED_INTROS_KEY}-${userId}` : USED_INTROS_KEY;
    const outroKey = userId ? `${USED_OUTROS_KEY}-${userId}` : USED_OUTROS_KEY;
    localStorage.removeItem(introKey);
    localStorage.removeItem(outroKey);
  } catch {
    // Ignore storage errors
  }
}

// Mark a combo as used
export function markComboUsed(introId: string, outroId: string, userId?: string): void {
  markIntroUsed(introId, userId);
  markOutroUsed(outroId, userId);
}

// Load audio duration for a clip
export async function getAudioDuration(url: string): Promise<number> {
  return new Promise((resolve) => {
    const audio = new Audio();
    audio.addEventListener('loadedmetadata', () => {
      resolve(audio.duration);
    });
    audio.addEventListener('error', () => {
      resolve(20); // Default to 20 seconds if we can't load
    });
    audio.src = url;
  });
}

// Get clip by ID from intros
export function getIntroClipById(id: string): AudioClip | undefined {
  return getIntroClips().find(clip => clip.id === id);
}

// Get clip by ID from outros
export function getOutroClipById(id: string): AudioClip | undefined {
  return getOutroClips().find(clip => clip.id === id);
}

// Concatenate audio blobs (intro + middle + outro)
// Note: Silence gaps are now handled via SSML breaks in the middle audio generation
export async function concatenateAudio(
  introUrl: string,
  middleBlob: Blob,
  outroUrl: string
): Promise<Blob> {
  // Fetch intro and outro as array buffers
  const [introResponse, outroResponse] = await Promise.all([
    fetch(introUrl),
    fetch(outroUrl),
  ]);
  
  const [introBuffer, outroBuffer] = await Promise.all([
    introResponse.arrayBuffer(),
    outroResponse.arrayBuffer(),
  ]);
  
  const middleBuffer = await middleBlob.arrayBuffer();
  
  // Simple concatenation: intro + middle (with SSML silence) + outro
  const totalLength = introBuffer.byteLength + middleBuffer.byteLength + outroBuffer.byteLength;
  const combined = new Uint8Array(totalLength);
  
  let offset = 0;
  combined.set(new Uint8Array(introBuffer), offset);
  offset += introBuffer.byteLength;
  
  combined.set(new Uint8Array(middleBuffer), offset);
  offset += middleBuffer.byteLength;
  
  combined.set(new Uint8Array(outroBuffer), offset);
  
  return new Blob([combined], { type: 'audio/mpeg' });
}

// Pre-fetch intro and outro audio buffers (call this early to parallelize)
export async function prefetchAudioBuffers(
  introUrl: string,
  outroUrl: string
): Promise<{ introBuffer: ArrayBuffer; outroBuffer: ArrayBuffer }> {
  const [introResponse, outroResponse] = await Promise.all([
    fetch(introUrl),
    fetch(outroUrl),
  ]);
  
  const [introBuffer, outroBuffer] = await Promise.all([
    introResponse.arrayBuffer(),
    outroResponse.arrayBuffer(),
  ]);
  
  return { introBuffer, outroBuffer };
}

// Concatenate with dynamic silence gaps to reach exactly 60 seconds
// Uses decoded PCM composition (not byte concatenation) for consistent playback.
// This mirrors the architecture we'll use in Swift (decode -> mix -> render),
// which keeps migration behavior deterministic across platforms.
export async function concatenateWithSilenceGaps(
  introBuffer: ArrayBuffer,
  middleBuffer: ArrayBuffer,
  outroBuffer: ArrayBuffer,
): Promise<Blob> {
  const audioContext = new AudioContext();

  try {
    const [introAudio, middleAudio, outroAudio] = await Promise.all([
      audioContext.decodeAudioData(introBuffer.slice(0)),
      audioContext.decodeAudioData(middleBuffer.slice(0)),
      audioContext.decodeAudioData(outroBuffer.slice(0)),
    ]);

    const sampleRate = introAudio.sampleRate;
    const numberOfChannels = Math.max(
      introAudio.numberOfChannels,
      middleAudio.numberOfChannels,
      outroAudio.numberOfChannels
    );

    const totalClipDuration = introAudio.duration + middleAudio.duration + outroAudio.duration;
    const targetDuration = 60;
    const remainingTime = Math.max(1, targetDuration - totalClipDuration);
    const gapDuration = remainingTime / 2;

    console.log(`[Concatenation] Intro: ${introAudio.duration.toFixed(1)}s, Middle: ${middleAudio.duration.toFixed(1)}s, Outro: ${outroAudio.duration.toFixed(1)}s`);
    console.log(`[Concatenation] Total clips: ${totalClipDuration.toFixed(1)}s, Each gap: ${gapDuration.toFixed(1)}s`);

    const outputDuration = totalClipDuration + gapDuration * 2;
    const outputLength = Math.ceil(outputDuration * sampleRate);
    const output = audioContext.createBuffer(numberOfChannels, outputLength, sampleRate);

    let writeOffset = 0;
    const writeBuffer = (source: AudioBuffer) => {
      for (let channelIndex = 0; channelIndex < numberOfChannels; channelIndex++) {
        const sourceChannel = source.getChannelData(Math.min(channelIndex, source.numberOfChannels - 1));
        output.getChannelData(channelIndex).set(sourceChannel, writeOffset);
      }
      writeOffset += source.length;
    };
    const writeSilence = (seconds: number) => {
      writeOffset += Math.floor(seconds * sampleRate);
    };

    writeBuffer(introAudio);
    writeSilence(gapDuration);
    writeBuffer(middleAudio);
    writeSilence(gapDuration);
    writeBuffer(outroAudio);

    return audioBufferToWav(output);
  } finally {
    await audioContext.close();
  }
}

// Simple concatenation without gaps (for backward compatibility)
export function concatenateWithPrefetchedBuffers(
  introBuffer: ArrayBuffer,
  middleBlob: ArrayBuffer,
  outroBuffer: ArrayBuffer
): Blob {
  const totalLength = introBuffer.byteLength + middleBlob.byteLength + outroBuffer.byteLength;
  const combined = new Uint8Array(totalLength);
  
  let offset = 0;
  combined.set(new Uint8Array(introBuffer), offset);
  offset += introBuffer.byteLength;
  
  combined.set(new Uint8Array(middleBlob), offset);
  offset += middleBlob.byteLength;
  
  combined.set(new Uint8Array(outroBuffer), offset);
  
  return new Blob([combined], { type: 'audio/mpeg' });
}

// Get the target duration for the middle portion of a free tier meditation
// Total meditation should be ~60 seconds: intro (15-24s) + middle (~18s) + outro (15-24s)
export function getMiddleDurationForFreeTier(): number {
  // Fixed 18 seconds for the personalized middle portion
  return 18;
}
