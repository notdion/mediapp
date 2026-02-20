// ============================================
// ULTRA-OPTIMIZED Audio Processing
// Target: <500ms for audio stretching
// ============================================

interface BreakPoint {
  pos: number;   // Sample position
  len: number;   // Silence length
}

// Pre-computed fade curve (30ms at 44100Hz = 1323 samples)
const FADE_SAMPLES = 1323;
const FADE_CURVE_IN = new Float32Array(FADE_SAMPLES);
const FADE_CURVE_OUT = new Float32Array(FADE_SAMPLES);
for (let i = 0; i < FADE_SAMPLES; i++) {
  const t = i / FADE_SAMPLES;
  const smooth = t * t * (3 - 2 * t); // Smoothstep
  FADE_CURVE_IN[i] = smooth;
  FADE_CURVE_OUT[i] = 1 - smooth;
}

/**
 * Ultra-fast RMS calculation using typed array reduction
 * Processes in blocks for cache efficiency
 */
function fastRMS(data: Float32Array, start: number, end: number): number {
  let sum = 0;
  for (let i = start; i < end; i++) {
    sum += data[i] * data[i];
  }
  return Math.sqrt(sum / (end - start));
}

/**
 * Find silence regions with coarse-to-fine approach
 * First scan at 100ms intervals, then refine boundaries
 */
function findBreaksFast(data: Float32Array, sampleRate: number): BreakPoint[] {
  const threshold = 0.012;
  const minSilenceMs = 350; // Slightly lower threshold for more break points
  const coarseWindowMs = 80; // Larger windows for speed
  
  const coarseWindow = Math.floor(sampleRate * coarseWindowMs / 1000);
  const minSilenceSamples = Math.floor(sampleRate * minSilenceMs / 1000);
  const breaks: BreakPoint[] = [];
  
  // Skip edges
  const startOffset = Math.floor(sampleRate * 0.4);
  const endOffset = data.length - Math.floor(sampleRate * 0.4);
  
  let silenceStart = -1;
  
  for (let i = startOffset; i < endOffset; i += coarseWindow) {
    const end = Math.min(i + coarseWindow, data.length);
    const rms = fastRMS(data, i, end);
    
    if (rms < threshold) {
      if (silenceStart < 0) silenceStart = i;
    } else if (silenceStart >= 0) {
      const len = i - silenceStart;
      if (len >= minSilenceSamples) {
        // Use center of silence for cleanest cut
        breaks.push({ pos: silenceStart + (len >> 1), len });
      }
      silenceStart = -1;
    }
  }
  
  return breaks;
}

/**
 * Apply pre-computed fade curves (much faster than per-sample calculation)
 */
function applyFadeOut(data: Float32Array, pos: number, sampleRate: number): void {
  const fadeSamples = Math.min(Math.floor(sampleRate * 0.03), FADE_SAMPLES);
  const start = Math.max(0, pos - fadeSamples);
  const scale = FADE_SAMPLES / fadeSamples;
  
  for (let i = 0; i < fadeSamples && start + i < data.length; i++) {
    data[start + i] *= FADE_CURVE_OUT[Math.floor(i * scale)] || 0;
  }
}

function applyFadeIn(data: Float32Array, pos: number, sampleRate: number): void {
  const fadeSamples = Math.min(Math.floor(sampleRate * 0.03), FADE_SAMPLES);
  const scale = FADE_SAMPLES / fadeSamples;
  
  for (let i = 0; i < fadeSamples && pos + i < data.length; i++) {
    data[pos + i] *= FADE_CURVE_IN[Math.floor(i * scale)] || 1;
  }
}

/**
 * Fast WAV encoding - direct buffer manipulation
 */
function encodeWavFast(channels: Float32Array[], sampleRate: number): ArrayBuffer {
  const numChannels = channels.length;
  const numSamples = channels[0].length;
  const dataSize = numSamples * numChannels * 2;
  const buffer = new ArrayBuffer(44 + dataSize);
  const view = new DataView(buffer);
  const samples = new Int16Array(buffer, 44);
  
  // Write WAV header (44 bytes)
  view.setUint32(0, 0x46464952, false); // "RIFF"
  view.setUint32(4, 36 + dataSize, true);
  view.setUint32(8, 0x45564157, false); // "WAVE"
  view.setUint32(12, 0x20746d66, false); // "fmt "
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, sampleRate * numChannels * 2, true);
  view.setUint16(32, numChannels * 2, true);
  view.setUint16(34, 16, true);
  view.setUint32(36, 0x61746164, false); // "data"
  view.setUint32(40, dataSize, true);
  
  // Interleave and convert to 16-bit
  if (numChannels === 1) {
    const ch = channels[0];
    for (let i = 0; i < numSamples; i++) {
      samples[i] = Math.max(-32768, Math.min(32767, (ch[i] * 32767) | 0));
    }
  } else {
    let idx = 0;
    for (let i = 0; i < numSamples; i++) {
      for (let c = 0; c < numChannels; c++) {
        samples[idx++] = Math.max(-32768, Math.min(32767, (channels[c][i] * 32767) | 0));
      }
    }
  }
  
  return buffer;
}

/**
 * MAIN FUNCTION: Stretch audio to target duration
 * Optimized for <500ms processing time
 */
export async function stretchAudioToFitDuration(
  audioBlob: Blob,
  targetDurationSeconds: number
): Promise<Blob> {
  const t0 = performance.now();
  
  // Decode audio
  const audioContext = new AudioContext({ sampleRate: 44100 });
  const arrayBuffer = await audioBlob.arrayBuffer();
  const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
  
  const sampleRate = audioBuffer.sampleRate;
  const originalDuration = audioBuffer.duration;
  const numChannels = audioBuffer.numberOfChannels;
  
  console.log(`[Audio] Input: ${originalDuration.toFixed(1)}s, Target: ${targetDurationSeconds}s`);
  
  // Early exit if already long enough
  if (originalDuration >= targetDurationSeconds * 0.95) {
    console.log(`[Audio] Already meets duration (${(performance.now() - t0).toFixed(0)}ms)`);
    await audioContext.close();
    return audioBlob;
  }
  
  const silenceNeeded = targetDurationSeconds - originalDuration;
  const silenceNeededSamples = Math.floor(silenceNeeded * sampleRate);
  
  // Find break points in first channel
  const breaks = findBreaksFast(audioBuffer.getChannelData(0), sampleRate);
  console.log(`[Audio] Found ${breaks.length} breaks (${(performance.now() - t0).toFixed(0)}ms)`);
  
  // Calculate output size
  const targetSamples = Math.ceil(targetDurationSeconds * sampleRate);
  
  // Process channels
  const outputChannels: Float32Array[] = [];
  
  if (breaks.length === 0) {
    // No breaks - pad at the end
    for (let c = 0; c < numChannels; c++) {
      const input = audioBuffer.getChannelData(c);
      const output = new Float32Array(targetSamples);
      output.set(input);
      applyFadeOut(output, input.length, sampleRate);
      outputChannels.push(output);
    }
  } else {
    // Distribute silence across breaks
    const silencePerBreak = Math.floor(silenceNeededSamples / breaks.length);
    breaks.sort((a, b) => a.pos - b.pos);
    
    for (let c = 0; c < numChannels; c++) {
      const input = audioBuffer.getChannelData(c);
      const output = new Float32Array(targetSamples);
      
      let readPos = 0;
      let writePos = 0;
      
      for (const bp of breaks) {
        // Copy segment up to break
        const segLen = bp.pos - readPos;
        if (segLen > 0 && writePos + segLen <= output.length) {
          output.set(input.subarray(readPos, bp.pos), writePos);
          writePos += segLen;
        }
        readPos = bp.pos;
        
        // Fade out before silence
        applyFadeOut(output, writePos, sampleRate);
        
        // Add silence (array is already zeroed)
        writePos += silencePerBreak;
        
        // Fade in after silence
        if (writePos < output.length && readPos < input.length) {
          const copyLen = Math.min(1000, input.length - readPos, output.length - writePos);
          output.set(input.subarray(readPos, readPos + copyLen), writePos);
          applyFadeIn(output, writePos, sampleRate);
        }
      }
      
      // Copy remaining audio
      const remaining = input.length - readPos;
      if (remaining > 0 && writePos < output.length) {
        const copyLen = Math.min(remaining, output.length - writePos);
        output.set(input.subarray(readPos, readPos + copyLen), writePos);
      }
      
      outputChannels.push(output);
    }
  }
  
  // Encode to WAV
  const wavBuffer = encodeWavFast(outputChannels, sampleRate);
  await audioContext.close();
  
  const elapsed = performance.now() - t0;
  console.log(`[Audio] Done in ${elapsed.toFixed(0)}ms, output: ${(targetSamples / sampleRate).toFixed(1)}s`);
  
  return new Blob([wavBuffer], { type: 'audio/wav' });
}

/**
 * Create stretched audio URL
 */
export async function createStretchedAudioUrl(
  audioBlob: Blob,
  targetDurationSeconds: number
): Promise<string> {
  const stretchedBlob = await stretchAudioToFitDuration(audioBlob, targetDurationSeconds);
  return URL.createObjectURL(stretchedBlob);
}
