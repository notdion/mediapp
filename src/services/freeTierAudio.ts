// ============================================
// Free Tier Audio Service
// Manages intro/outro clips for free tier meditations
// ============================================

// Dynamically import all intro and outro clips
const introModules = import.meta.glob('../components/audio/Free Intros/*.mp3', { eager: true, as: 'url' });
const outroModules = import.meta.glob('../components/audio/Free Outros/*.mp3', { eager: true, as: 'url' });

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

// Create silence of a specific duration by repeating/trimming the silence file
async function createSilenceForDuration(targetSeconds: number): Promise<ArrayBuffer> {
  const { buffer: sourceBuffer, duration: sourceDuration } = await getSilenceBuffer();
  
  if (targetSeconds <= 0) {
    return new ArrayBuffer(0);
  }
  
  // Calculate bytes per second (approximate for MP3)
  const bytesPerSecond = sourceBuffer.byteLength / sourceDuration;
  const targetBytes = Math.floor(targetSeconds * bytesPerSecond);
  
  // If target is shorter than source, trim it
  if (targetSeconds <= sourceDuration) {
    return sourceBuffer.slice(0, targetBytes);
  }
  
  // If target is longer, repeat the silence
  const result = new Uint8Array(targetBytes);
  const source = new Uint8Array(sourceBuffer);
  let offset = 0;
  
  while (offset < targetBytes) {
    const remaining = targetBytes - offset;
    const copyLength = Math.min(source.byteLength, remaining);
    result.set(source.subarray(0, copyLength), offset);
    offset += copyLength;
  }
  
  return result.buffer;
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
// Uses actual silence audio file for proper gaps
export async function concatenateWithSilenceGaps(
  introBuffer: ArrayBuffer,
  introUrl: string,
  middleBuffer: ArrayBuffer,
  middleUrl: string,
  outroBuffer: ArrayBuffer,
  outroUrl: string
): Promise<Blob> {
  // Get actual durations of all three audio pieces
  const [introDuration, middleDuration, outroDuration] = await Promise.all([
    getAudioDurationFromUrl(introUrl),
    getAudioDurationFromUrl(middleUrl),
    getAudioDurationFromUrl(outroUrl)
  ]);
  
  const totalClipDuration = introDuration + middleDuration + outroDuration;
  const targetDuration = 60;
  const remainingTime = Math.max(1, targetDuration - totalClipDuration); // At least 1 second total gap
  const gapDuration = remainingTime / 2; // Split between two gaps
  
  console.log(`[Concatenation] Intro: ${introDuration.toFixed(1)}s, Middle: ${middleDuration.toFixed(1)}s, Outro: ${outroDuration.toFixed(1)}s`);
  console.log(`[Concatenation] Total clips: ${totalClipDuration.toFixed(1)}s, Each gap: ${gapDuration.toFixed(1)}s`);
  
  // Create silence buffers for the gaps
  const [gap1Buffer, gap2Buffer] = await Promise.all([
    createSilenceForDuration(gapDuration),
    createSilenceForDuration(gapDuration)
  ]);
  
  // Concatenate: intro + gap + middle + gap + outro
  const totalLength = introBuffer.byteLength + gap1Buffer.byteLength + middleBuffer.byteLength + gap2Buffer.byteLength + outroBuffer.byteLength;
  const combined = new Uint8Array(totalLength);
  
  let offset = 0;
  combined.set(new Uint8Array(introBuffer), offset);
  offset += introBuffer.byteLength;
  
  combined.set(new Uint8Array(gap1Buffer), offset);
  offset += gap1Buffer.byteLength;
  
  combined.set(new Uint8Array(middleBuffer), offset);
  offset += middleBuffer.byteLength;
  
  combined.set(new Uint8Array(gap2Buffer), offset);
  offset += gap2Buffer.byteLength;
  
  combined.set(new Uint8Array(outroBuffer), offset);
  
  return new Blob([combined], { type: 'audio/mpeg' });
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
export function getMiddleDurationForFreeTier(_introDuration: number, _outroDuration: number): number {
  // Fixed 18 seconds for the personalized middle portion
  return 18;
}
