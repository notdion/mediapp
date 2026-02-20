// ============================================
// ULTRA-OPTIMIZED API Service
// Target: <30s total meditation generation
// ============================================
// Optimizations:
// 1. Single GPT call for mood + script
// 2. ElevenLabs turbo model with optimized settings
// 3. Parallel processing where possible
// 4. Minimal audio processing overhead
// 5. Streaming responses

import type { MoodTag, SubscriptionTier } from '../types';
import { 
  getAvailableIntros, 
  getAvailableOutros, 
  getIntroClipById,
  getOutroClipById,
  markComboUsed, 
  getMiddleDurationForFreeTier, 
  prefetchAudioBuffers, 
  concatenateWithSilenceGaps,
  getAudioDuration,
  type MeditationCombo
} from './freeTierAudio';
// Audio stretching no longer needed - pauses are built into script via SSML break tags

// ============================================
// Meditation Closing Phrases (50 variations)
// ============================================
const CLOSING_PHRASES = [
  "Gently open your eyes and return to the room.",
  "Slowly bring your awareness back to this moment.",
  "When you're ready, softly open your eyes.",
  "Take your time coming back to the present.",
  "Gradually return your attention to your surroundings.",
  "Allow yourself to gently awaken.",
  "Softly bring your focus back to the room.",
  "When it feels right, open your eyes slowly.",
  "Ease yourself back into the present moment.",
  "Let your eyes flutter open when you're ready.",
  "Gently reconnect with the space around you.",
  "Slowly return to the here and now.",
  "Allow your senses to reawaken gradually.",
  "Bring your awareness back to your body.",
  "When you feel ready, return to the room.",
  "Softly transition back to wakefulness.",
  "Let yourself gradually come back.",
  "Gently bring your attention to your surroundings.",
  "Take a moment before opening your eyes.",
  "Slowly reconnect with the present.",
  "Allow yourself to gently return.",
  "When the time is right, open your eyes.",
  "Ease back into awareness of the room.",
  "Softly awaken to your environment.",
  "Bring yourself back when you're ready.",
  "Gradually let the world back in.",
  "Gently transition to full awareness.",
  "Allow your eyes to open naturally.",
  "Slowly become aware of your surroundings.",
  "Return to the present at your own pace.",
  "Softly come back to this space.",
  "Let yourself gently resurface.",
  "When ready, bring your focus back.",
  "Ease your way back to alertness.",
  "Gradually open your eyes and look around.",
  "Allow the room to come back into focus.",
  "Gently wake your body and mind.",
  "Softly return to full consciousness.",
  "Take your time rejoining the world.",
  "Let yourself slowly reemerge.",
  "Bring your attention back to this room.",
  "When you feel complete, open your eyes.",
  "Gradually reconnect with reality.",
  "Allow yourself to gently awaken fully.",
  "Softly bring yourself back to now.",
  "Ease into awareness of your surroundings.",
  "Let your eyes open when they're ready.",
  "Gently return to the present moment.",
  "Slowly allow the meditation to close.",
  "Come back to the room feeling refreshed.",
];

// Get a random closing phrase with a pause before it (for premium users only)
function getRandomClosingPhrase(): string {
  const phrase = CLOSING_PHRASES[Math.floor(Math.random() * CLOSING_PHRASES.length)];
  return ` <break time="4.0s"/> ${phrase}`;
}

// ============================================
// GPT-Based Intro/Outro Selection (Free Tier)
// ============================================

interface ClipSelection {
  introId: string;
  outroId: string;
}

// Use GPT to select the best intro/outro based on user's transcript
async function selectBestIntroOutro(
  transcript: string,
  availableIntros: { id: string; scriptText: string }[],
  availableOutros: { id: string; scriptText: string }[],
): Promise<ClipSelection> {
  // Build the prompt with all available clips
  const introList = availableIntros.map((clip, i) => `${i + 1}. ID: "${clip.id}" - Text: "${clip.scriptText}"`).join('\n');
  const outroList = availableOutros.map((clip, i) => `${i + 1}. ID: "${clip.id}" - Text: "${clip.scriptText}"`).join('\n');

  const systemPrompt = `You are helping select the best meditation intro and outro clips based on what the user shared about their day/mood.

AVAILABLE INTRO CLIPS:
${introList}

AVAILABLE OUTRO CLIPS:
${outroList}

Select ONE intro and ONE outro that best match the user's emotional state and needs.
Consider: tone, theme, and how well they complement what the user shared.

OUTPUT FORMAT (JSON only):
{"introId":"exact_id_from_list","outroId":"exact_id_from_list"}

IMPORTANT: Use the exact ID string from the lists above.`;

  const requestBody: Record<string, unknown> = {
    model: OPENAI_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `User shared: "${transcript}"\n\nSelect the best intro and outro. Respond with JSON only.` }
    ],
    max_tokens: 100,
    temperature: 0.3, // Lower temperature for more consistent selection
  };

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      throw new Error(`GPT selection failed: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices[0].message.content.trim();
    
    // Parse the JSON response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      // Validate that the IDs exist in available clips
      const introExists = availableIntros.some(c => c.id === parsed.introId);
      const outroExists = availableOutros.some(c => c.id === parsed.outroId);
      
      if (introExists && outroExists) {
        return { introId: parsed.introId, outroId: parsed.outroId };
      }
    }
  } catch (error) {
    console.error('[GPT Selection] Failed:', error);
  }
  
  // Fallback: random selection
  const randomIntro = availableIntros[Math.floor(Math.random() * availableIntros.length)];
  const randomOutro = availableOutros[Math.floor(Math.random() * availableOutros.length)];
  return { introId: randomIntro.id, outroId: randomOutro.id };
}

// ============================================
// Free Tier Middle Script Generation
// ============================================

// Generate the middle portion of a free tier meditation (EXACTLY 18 seconds)
// Now context-aware: knows what the intro says and what the outro will say
async function generateFreeTierMiddleScript(
  transcript: string,
  middleDurationSeconds: number,
  introScript: string,
  outroScript: string
): Promise<{ mood: MoodTag; script: string }> {
  console.log(`[GPT] Generating free tier middle script (${middleDurationSeconds}s) with intro/outro context`);
  
  // STRICT: 18 seconds total = ~8 seconds speech + ~10 seconds pauses
  // At 1.5 words/sec meditation pace = 12 words of spoken content
  const targetWords = 12;
  const totalPauseTime = 10;
  
  console.log(`[GPT] Free tier middle: ${targetWords} words, ${totalPauseTime}s pauses`);

  const systemPrompt = `You are a meditation guide creating a SHORT middle portion of a meditation. The intro and outro are pre-recorded.

OUTPUT FORMAT (JSON only):
{"mood":"MOOD_TAG","script":"meditation text here"}

MOOD_TAG — pick the ONE that best matches the user's input:
UPLIFTING (joy/hope), CALMING (peace/stress relief), ENERGIZING (need a boost),
HEALING (grief/pain/illness), FOCUSED (clarity/productivity), SLEEPY (tired/rest),
ANXIOUS (worry/fear/overwhelm), GRATEFUL (appreciation/thankfulness), MOTIVATED (goals/drive)

CONTEXT:
- INTRO (pre-recorded): "${introScript}"
- YOUR MIDDLE: [Personalized - you write this]
- OUTRO (pre-recorded): "${outroScript}"

STRICT REQUIREMENTS (18 seconds total):
- Write EXACTLY ${targetWords} words of spoken content (no more, no less)
- Add EXACTLY ${totalPauseTime} seconds of pauses total using <break time="X.Xs"/> tags
- Personalize based on what the user shared
- DO NOT include any greeting or closing

PAUSE FORMAT: <break time="X.Xs"/>
Examples: <break time="3.0s"/> or <break time="4.0s"/>

EXAMPLE (12 words, 10 seconds pauses = 18 seconds):
"Let that feeling wash over you. <break time="4.0s"/> You deserve this peace. <break time="3.0s"/> Breathe. <break time="3.0s"/>"

Keep it SHORT. Only ${targetWords} words.`;

  const requestBody: Record<string, unknown> = {
    model: OPENAI_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `User shared: "${transcript}"\n\nRespond with JSON only. Remember: EXACTLY ${targetWords} words.` }
    ],
  };
  
  // gpt-4.1-nano supports these parameters
  requestBody.max_tokens = 300;
  requestBody.temperature = 0.7;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('[GPT] Free tier middle API Error:', response.status, errorData);
    throw new Error(`Failed to generate meditation: ${errorData.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content.trim();
  const validMoods: MoodTag[] = ['UPLIFTING', 'CALMING', 'ENERGIZING', 'HEALING', 'FOCUSED', 'SLEEPY', 'ANXIOUS', 'GRATEFUL', 'MOTIVATED'];
  
  // Try strict JSON parsing first
  try {
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const mood = validMoods.includes(parsed.mood?.toUpperCase()) ? parsed.mood.toUpperCase() as MoodTag : 'CALMING';
      // No closing phrase for free tier - outro handles that
      if (parsed.script) {
        return { mood, script: parsed.script };
      }
    }
  } catch {
    console.warn('[GPT] Free tier JSON parse failed, attempting fallback extraction');
  }
  
  // Fallback 1: Extract script content using regex even if JSON is malformed
  const scriptMatch = content.match(/"script"\s*:\s*"([\s\S]*?)(?:"\s*}|"$)/);
  if (scriptMatch && scriptMatch[1]) {
    console.log('[GPT] Extracted script via fallback regex');
    // Also try to extract mood
    const moodMatch = content.match(/"mood"\s*:\s*"([^"]+)"/i);
    const mood = moodMatch && validMoods.includes(moodMatch[1].toUpperCase() as MoodTag) 
      ? moodMatch[1].toUpperCase() as MoodTag 
      : 'CALMING';
    return { mood, script: scriptMatch[1] };
  }
  
  // Fallback 2: Clean any JSON artifacts from raw content
  console.warn('[GPT] Using last resort JSON artifact cleanup');
  const cleanedContent = content
    .replace(/^\s*\{[^}]*"script"\s*:\s*"/i, '')  // Remove JSON prefix like {"mood":"X","script":"
    .replace(/"\s*\}\s*$/i, '')                    // Remove JSON suffix like "}
    .replace(/\{"mood":[^,]*,/gi, '')              // Remove standalone mood field
    .replace(/^\s*"script"\s*:\s*"/i, '')          // Remove script field prefix if at start
    .trim();
  
  return { mood: 'CALMING', script: cleanedContent || content };
}

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const OPENAI_MODEL = 'gpt-4.1-nano'; // Forced to gpt-4.1-nano for meditation script generation
const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY;
const ELEVENLABS_VOICE_ID = import.meta.env.VITE_ELEVENLABS_VOICE_ID || '7AvtJrjTNyBhBxEvNPIZ';

// ============================================
// Whisper Transcription (optimized)
// ============================================

function isValidAudioBlob(blob: Blob): boolean {
  return blob.size > 1000;
}

export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  console.log('[Transcribe] Starting transcription, blob size:', audioBlob.size);
  
  if (!isValidAudioBlob(audioBlob)) {
    console.log('[Transcribe] Demo mode - blob too small');
    const demos = [
      "I've been feeling stressed with work deadlines and need to find some calm.",
      "Today was good. I'm grateful and want to keep this positive energy.",
      "Having trouble sleeping, my mind keeps racing with thoughts.",
      "Need to focus on a project but keep getting distracted.",
      "Feeling anxious about upcoming changes, need help calming down.",
    ];
    return demos[Math.floor(Math.random() * demos.length)];
  }

  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.webm');
  formData.append('model', 'gpt-4o-mini-transcribe');
  formData.append('language', 'en');

  const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${OPENAI_API_KEY}` },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    console.error('[Transcribe] API Error:', response.status, error);
    throw new Error(error.error?.message || 'Transcription failed');
  }

  const result = await response.json();
  console.log('[Transcribe] Success, text length:', result.text?.length);
  return result.text;
}

// ============================================
// Combined Mood + Script (single GPT call)
// ============================================

interface MoodAndScript {
  mood: MoodTag;
  script: string;
}

export async function generateMoodAndScript(
  transcript: string,
  durationSeconds: number
): Promise<MoodAndScript> {
  console.log('[GPT] Starting mood + script generation');
  console.log('[GPT] Using model:', OPENAI_MODEL);
  console.log('[GPT] Transcript:', transcript.substring(0, 100) + '...');
  
  // Calculate word count and pause time for target duration
  // - 40 words per minute of meditation (increased from 30)
  // - ElevenLabs speaks at ~2.0 words/second for slow meditation pace
  // - So 40 words takes ~20 seconds to speak per minute
  // - Remaining 40 seconds should be filled with pauses
  const wordsPerMinute = 40;
  const targetWords = Math.floor((durationSeconds / 60) * wordsPerMinute);
  
  // Calculate speaking time and pause time
  const speakingWordsPerSecond = 2.0; // Slow meditation pace
  const speakingTimeSeconds = Math.floor(targetWords / speakingWordsPerSecond);
  const totalPauseTimeSeconds = durationSeconds - speakingTimeSeconds;
  
  const minutes = Math.floor(durationSeconds / 60);
  const durationStr = minutes >= 1 
    ? `${minutes} minute${minutes > 1 ? 's' : ''}`
    : `${durationSeconds} seconds`;

  console.log(`[GPT] Target: ${targetWords} words, ~${speakingTimeSeconds}s speech, ~${totalPauseTimeSeconds}s pauses`);

  const systemPrompt = `You are an emotional intelligence expert AND meditation guide. Analyze and create a meditation in ONE response.

OUTPUT FORMAT (JSON only):
{"mood":"MOOD_TAG","script":"meditation text here"}

MOOD_TAG: UPLIFTING, CALMING, ENERGIZING, HEALING, FOCUSED, SLEEPY, ANXIOUS, GRATEFUL, or MOTIVATED

CRITICAL TIMING REQUIREMENTS for ${durationStr} meditation:
- Write EXACTLY ${targetWords} words of spoken content (not counting break tags)
- Add EXACTLY ${totalPauseTimeSeconds} seconds of total pause time using <break time="X.Xs"/> tags
- The spoken words + pauses must total ${durationSeconds} seconds

PAUSE TAG FORMAT: <break time="X.Xs"/> where X.X is seconds (e.g., <break time="3.0s"/>)

PAUSE DISTRIBUTION for ${totalPauseTimeSeconds} seconds total:
- Use <break time="2.0s"/> to <break time="4.0s"/> between sentences
- Use <break time="5.0s"/> to <break time="8.0s"/> for breathing exercises
- Distribute pauses evenly throughout the meditation

CONTENT GUIDELINES:
- Short sentences (5-10 words each)
- Structure: greeting → deep breaths → visualization → affirmations → closing
- Second person ("you")
- Warm, soothing tone

EXAMPLE (30 words, 48 seconds of pauses = 1 minute total):
"Welcome. <break time="3.0s"/> Take a deep breath in. <break time="5.0s"/> And slowly release. <break time="5.0s"/> Feel your body relaxing. <break time="4.0s"/> Let go of any tension. <break time="5.0s"/> You are safe here. <break time="4.0s"/> Breathe in peace. <break time="6.0s"/> Breathe out stress. <break time="5.0s"/> You are calm. <break time="4.0s"/> You are at peace. <break time="7.0s"/>"`;

  // Build request body - note: gpt-5-nano does not accept temperature or max_tokens parameters
  const requestBody: Record<string, unknown> = {
    model: OPENAI_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `User said: "${transcript}"\n\nRespond with JSON only.` }
    ],
  };
  
  // gpt-4.1-nano supports these parameters
  requestBody.max_tokens = 1500;
  requestBody.temperature = 0.7;

  const response = await fetch('https://api.openai.com/v1/chat/completions', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    console.error('[GPT] API Error:', response.status, errorData);
    throw new Error(`Failed to generate meditation: ${errorData.error?.message || response.statusText}`);
  }

  const data = await response.json();
  const content = data.choices[0].message.content.trim();
  
  // Get a random closing phrase to append
  const closingPhrase = getRandomClosingPhrase();
  
  try {
    // Try to extract JSON from response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const parsed = JSON.parse(jsonMatch[0]);
      const validMoods: MoodTag[] = ['UPLIFTING', 'CALMING', 'ENERGIZING', 'HEALING', 'FOCUSED', 'SLEEPY', 'ANXIOUS', 'GRATEFUL', 'MOTIVATED'];
      const mood = validMoods.includes(parsed.mood?.toUpperCase()) ? parsed.mood.toUpperCase() as MoodTag : 'CALMING';
      const scriptWithClosing = (parsed.script || content) + closingPhrase;
      return { mood, script: scriptWithClosing };
    }
  } catch {
    console.warn('[GPT] JSON parse failed, using fallback');
  }
  
  return { mood: 'CALMING', script: content + closingPhrase };
}

// ============================================
// ElevenLabs Voice Generation (optimized)
// ============================================

// Word timing from ElevenLabs alignment data
export interface WordAlignment {
  word: string;
  startTime: number;
  endTime: number;
}

// Convert character-level alignment to word-level alignment
function characterAlignmentToWords(
  characters: string[],
  startTimes: number[],
  endTimes: number[]
): WordAlignment[] {
  const words: WordAlignment[] = [];
  let currentWord = '';
  let wordStartTime = 0;
  let wordEndTime = 0;
  const pushWord = () => {
    const cleaned = currentWord.trim();
    if (!cleaned) {
      currentWord = '';
      return;
    }
    // Defensive: skip any SSML tags if they appear
    if (cleaned.startsWith('<') || cleaned.includes('break')) {
      currentWord = '';
      return;
    }
    words.push({
      word: cleaned,
      startTime: wordStartTime,
      endTime: wordEndTime,
    });
    currentWord = '';
  };
  
  for (let i = 0; i < characters.length; i++) {
    const char = characters[i];
    const isWhitespace = /\s/.test(char);
    
    if (isWhitespace) {
      // End of word
      pushWord();
    } else {
      // Part of a word
      if (currentWord === '') {
        wordStartTime = startTimes[i];
      }
      currentWord += char;
      wordEndTime = endTimes[i];
    }
  }
  
  // Don't forget the last word
  pushWord();
  
  return words;
}

// ============================================
// Audio Slicing & Silence Injection
// ============================================

// ============================================
// Step 4: Find Splice Points (Sentence Ends)
// ============================================

/** A sentence end where silence will be injected */
interface SplicePoint {
  /** End time of the sentence-ending word in seconds */
  endTime: number;
  /** The word that ends the sentence */
  word: string;
}

/**
 * Parse ElevenLabs alignment timestamps to find sentence-end splice points.
 * Looks for words ending with terminal punctuation (. ? !).
 */
function findSplicePoints(alignment: WordAlignment[]): SplicePoint[] {
  const points: SplicePoint[] = [];
  
  for (let i = 0; i < alignment.length; i++) {
    const word = alignment[i].word;
    if (/[.?!]$/.test(word)) {
      points.push({
        endTime: alignment[i].endTime,
        word,
      });
    }
  }
  
  return points;
}

// ============================================
// Step 3 & 5: Calculate Silence + Splice Audio
// ============================================

/** 2 seconds of silence reserved for the very end */
const END_SILENCE_SECONDS = 2.0;

/**
 * Encode an AudioBuffer as a WAV Blob.
 * WAV is uncompressed — can be freely sliced at any sample boundary.
 */
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
  const channels: Float32Array[] = [];
  for (let ch = 0; ch < numChannels; ch++) {
    channels.push(audioBuffer.getChannelData(ch));
  }
  for (let i = 0; i < numSamples; i++) {
    for (let ch = 0; ch < numChannels; ch++) {
      const sample = Math.max(-1, Math.min(1, channels[ch][i]));
      const int16 = sample < 0 ? sample * 0x8000 : sample * 0x7FFF;
      view.setInt16(writeOffset, int16, true);
      writeOffset += 2;
    }
  }
  
  return new Blob([buffer], { type: 'audio/wav' });
}

/**
 * 5-step silence injection pipeline:
 * 
 * 1. Decode MP3 → PCM (via Web Audio API) for clean splicing
 * 2. Calculate: total_silence_needed = target_duration - actual_audio_duration
 * 3. Find splice points: sentence ends (. ? !) from ElevenLabs timestamps
 * 4. Divide: silence_chunk_duration = (total_silence - 2s end) / splice_point_count
 * 5. Build output: [Segment 1][Silence][Segment 2][Silence]...[Last Segment][2s End Silence]
 * 
 * Final audio ends at (target - 2s), giving 2 seconds of empty space.
 */
export async function injectSilenceBetweenSentences(
  audioBuffer: ArrayBuffer,
  alignment: WordAlignment[],
  targetDurationSeconds: number
): Promise<Blob> {
  // --- Step 1: Decode MP3 to raw PCM ---
  const audioCtx = new AudioContext();
  let decodedAudio: AudioBuffer;
  try {
    decodedAudio = await audioCtx.decodeAudioData(audioBuffer.slice(0));
  } catch (error) {
    console.error('[Splice] Failed to decode audio:', error);
    await audioCtx.close();
    return new Blob([audioBuffer], { type: 'audio/mpeg' });
  }
  
  const sampleRate = decodedAudio.sampleRate;
  const numChannels = decodedAudio.numberOfChannels;
  const decodedDuration = decodedAudio.duration;
  
  // Use alignment timestamps for speech end (more accurate than decoded MP3 duration).
  // decodedAudio.duration includes MP3 encoder padding/trailing silence that inflates
  // the reported duration. The alignment's last word end time is the TRUE speech end.
  const lastAlignmentEndTime = alignment.length > 0 ? alignment[alignment.length - 1].endTime : 0;
  const actualSpeechEnd = lastAlignmentEndTime > 0 ? lastAlignmentEndTime : decodedDuration;
  
  console.log(`[Splice] Decoded buffer: ${decodedDuration.toFixed(2)}s | Alignment speech end: ${lastAlignmentEndTime.toFixed(2)}s | Using: ${actualSpeechEnd.toFixed(2)}s`);
  console.log(`[Splice] Sample rate: ${sampleRate}Hz, ${numChannels}ch`);
  
  // --- Step 2: Calculate total silence needed ---
  // Use alignment-based speech end, NOT decoded buffer duration
  const totalSilenceNeeded = Math.max(0, targetDurationSeconds - actualSpeechEnd);
  
  if (totalSilenceNeeded <= 0) {
    console.log('[Splice] Speech already meets/exceeds target, returning as-is');
    const wavBlob = audioBufferToWav(decodedAudio);
    await audioCtx.close();
    return wavBlob;
  }
  
  // Reserve 2 seconds for the end
  const endSilence = Math.min(END_SILENCE_SECONDS, totalSilenceNeeded);
  const distributableSilence = totalSilenceNeeded - endSilence;
  
  console.log(`[Splice] Target: ${targetDurationSeconds}s | Speech end: ${actualSpeechEnd.toFixed(2)}s | Silence needed: ${totalSilenceNeeded.toFixed(1)}s`);
  console.log(`[Splice] Distributing ${distributableSilence.toFixed(1)}s across sentences + ${endSilence.toFixed(1)}s at end`);
  
  // --- Step 3: Find splice points (sentence ends) ---
  const splicePoints = findSplicePoints(alignment);
  
  if (splicePoints.length === 0) {
    console.log('[Splice] No sentence ends found — adding all silence at end');
    const totalSamples = Math.ceil(targetDurationSeconds * sampleRate);
    const outputBuffer = audioCtx.createBuffer(numChannels, totalSamples, sampleRate);
    for (let ch = 0; ch < numChannels; ch++) {
      outputBuffer.getChannelData(ch).set(decodedAudio.getChannelData(ch));
    }
    const wavBlob = audioBufferToWav(outputBuffer);
    await audioCtx.close();
    return wavBlob;
  }
  
  // --- Step 4: Calculate silence_chunk_duration ---
  // Distribute evenly across all splice points (except we skip adding after the very last one)
  const insertionPoints = splicePoints.length > 1 ? splicePoints.length - 1 : splicePoints.length;
  const silenceChunkDuration = distributableSilence > 0 ? distributableSilence / insertionPoints : 0;
  
  console.log(`[Splice] ${splicePoints.length} sentence ends found | ${insertionPoints} insertion points`);
  console.log(`[Splice] Silence per splice: ${silenceChunkDuration.toFixed(2)}s`);
  
  // --- Step 5: Build output AudioBuffer ---
  const totalOutputSamples = Math.ceil(targetDurationSeconds * sampleRate);
  const outputBuffer = audioCtx.createBuffer(numChannels, totalOutputSamples, sampleRate);
  
  for (let ch = 0; ch < numChannels; ch++) {
    const sourceData = decodedAudio.getChannelData(ch);
    const outputData = outputBuffer.getChannelData(ch);
    // outputData is zero-filled (silence) by default
    
    let writePos = 0;       // write position in output (samples)
    let prevEndSample = 0;  // read position in source (samples)
    
    for (let i = 0; i < splicePoints.length; i++) {
      const isLast = i === splicePoints.length - 1;
      const endSample = Math.min(
        Math.floor(splicePoints[i].endTime * sampleRate),
        sourceData.length
      );
      
      // Copy speech segment: [prevEndSample → endSample]
      const chunkLen = endSample - prevEndSample;
      if (chunkLen > 0 && writePos + chunkLen <= outputData.length) {
        outputData.set(sourceData.subarray(prevEndSample, endSample), writePos);
        writePos += chunkLen;
      }
      
      // Insert silence chunk (skip after the very last sentence — end silence handles it)
      if (!isLast && silenceChunkDuration > 0) {
        writePos += Math.floor(silenceChunkDuration * sampleRate);
      }
      
      prevEndSample = endSample;
    }
    
    // Copy any remaining speech after the last splice point, up to the alignment end
    // (Avoids copying MP3 decoder padding beyond the actual speech content)
    const speechEndSample = Math.min(
      Math.ceil(actualSpeechEnd * sampleRate),
      sourceData.length
    );
    if (prevEndSample < speechEndSample) {
      const remaining = speechEndSample - prevEndSample;
      if (writePos + remaining <= outputData.length) {
        outputData.set(sourceData.subarray(prevEndSample, speechEndSample), writePos);
      }
    }
    // Everything beyond writePos is zero-filled (silence): distributed gaps + 2s end silence
  }
  
  // --- Encode as WAV ---
  const wavBlob = audioBufferToWav(outputBuffer);
  await audioCtx.close();
  
  const distributedTotal = silenceChunkDuration * insertionPoints;
  console.log(`[Splice] Output: ${targetDurationSeconds}s (speech: ${actualSpeechEnd.toFixed(1)}s + ${distributedTotal.toFixed(1)}s distributed + ${endSilence.toFixed(1)}s end)`);
  console.log(`[Splice] Verify: ${actualSpeechEnd.toFixed(1)} + ${distributedTotal.toFixed(1)} + ${endSilence.toFixed(1)} = ${(actualSpeechEnd + distributedTotal + endSilence).toFixed(1)}s (target: ${targetDurationSeconds}s)`);
  
  return wavBlob;
}

export async function generateVoiceAudioStreaming(
  script: string
): Promise<{ audioUrl: string; rawBuffer: ArrayBuffer; wasStretched: boolean; alignment?: WordAlignment[] }> {
  const t0 = performance.now();
  
  if (!ELEVENLABS_API_KEY) {
    throw new Error('ElevenLabs API key not configured');
  }

  // Clean the script — no SSML, no pause markers
  // Silence is injected in post-processing from timestamp data
  const cleanScript = script
    .replace(/<break[^>]*\/?>/gi, '')
    .replace(/\[long pause\]/gi, '')
    .replace(/\[pause\]/gi, '')
    .replace(/\.\.\./g, '')
    .replace(/\s+/g, ' ')
    .trim();

  // Use the /with-timestamps endpoint to get character-level timing
  // Request MP3 format (ElevenLabs doesn't support PCM on this endpoint)
  // We decode to PCM immediately in injectSilenceBetweenSentences via Web Audio API
  const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}/with-timestamps`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'xi-api-key': ELEVENLABS_API_KEY,
    },
    body: JSON.stringify({
      text: cleanScript,
      model_id: 'eleven_turbo_v2_5',
      output_format: 'mp3_44100_128',
      speed: 1.05,
      voice_settings: {
        stability: 0.51,
        similarity_boost: 0.51,
        style: 0,
        use_speaker_boost: true,
      },
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`ElevenLabs error (${response.status}): ${errorText}`);
  }

  const data = await response.json();
  
  // Decode base64 audio to raw ArrayBuffer
  const audioBytes = atob(data.audio_base64);
  const audioArray = new Uint8Array(audioBytes.length);
  for (let i = 0; i < audioBytes.length; i++) {
    audioArray[i] = audioBytes.charCodeAt(i);
  }
  const rawBuffer = audioArray.buffer;
  const audioBlob = new Blob([audioArray], { type: 'audio/mpeg' });
  
  // Extract word-level alignment from character-level data
  let alignment: WordAlignment[] | undefined;
  const alignmentSource = data.normalized_alignment || data.alignment;
  if (alignmentSource) {
    const { characters, character_start_times_seconds, character_end_times_seconds } = alignmentSource;
    alignment = characterAlignmentToWords(
      characters,
      character_start_times_seconds,
      character_end_times_seconds
    );
    console.log(`[Voice] Got alignment for ${alignment.length} words`);
  }
  
  console.log(`[Voice] Generated in ${(performance.now() - t0).toFixed(0)}ms, size: ${audioBlob.size}`);
  return { 
    audioUrl: URL.createObjectURL(audioBlob),
    rawBuffer,
    wasStretched: false,
    alignment 
  };
}

// ============================================
// Main Meditation Creation Pipeline
// ============================================

export interface MeditationResult {
  transcript: string;
  mood: MoodTag;
  script: string;
  voiceAudioUrl: string | null;
  alignment?: WordAlignment[];
  // Free tier specific
  introUrl?: string;
  outroUrl?: string;
  introDuration?: number;
  outroDuration?: number;
  introScript?: string;
  outroScript?: string;
}

export interface MeditationProgress {
  step: string;
  canStartMeditation: boolean;
  voiceReady: boolean;
  result?: Partial<MeditationResult>;
}

export async function createMeditationFast(
  audioBlob: Blob,
  durationSeconds: number,
  onProgress?: (progress: MeditationProgress) => void,
  userTier: SubscriptionTier = 'free',
  userId?: string
): Promise<MeditationResult> {
  console.log(`=== Meditation Pipeline Started (${userTier} tier) ===`);
  const t0 = Date.now();

  // Step 1: Transcribe
  onProgress?.({ step: 'Preparing your meditation...', canStartMeditation: false, voiceReady: false });
  const transcript = await transcribeAudio(audioBlob);

  // Branch based on user tier
  if (userTier === 'free') {
    return createFreeTierMeditation(transcript, onProgress, userId, t0);
  } else {
    return createPremiumMeditation(transcript, durationSeconds, onProgress, t0);
  }
}

// Free tier meditation: intro + personalized middle + outro
// Uses GPT to select the best intro/outro based on user's transcript
async function createFreeTierMeditation(
  transcript: string,
  onProgress?: (progress: MeditationProgress) => void,
  userId?: string,
  t0: number = Date.now()
): Promise<MeditationResult> {
  // Step 1: Get available (unused) clips for this user
  onProgress?.({ step: 'Preparing your meditation...', canStartMeditation: false, voiceReady: false });
  const availableIntros = getAvailableIntros(userId);
  const availableOutros = getAvailableOutros(userId);
  
  // Step 2: Use GPT to select the best intro/outro for this user's transcript
  onProgress?.({ step: 'Choosing the perfect tune...', canStartMeditation: false, voiceReady: false });
  const selection = await selectBestIntroOutro(
    transcript,
    availableIntros.map(c => ({ id: c.id, scriptText: c.scriptText })),
    availableOutros.map(c => ({ id: c.id, scriptText: c.scriptText }))
  );
  
  // Get the selected clips
  const selectedIntro = getIntroClipById(selection.introId);
  const selectedOutro = getOutroClipById(selection.outroId);
  
  if (!selectedIntro || !selectedOutro) {
    throw new Error('Failed to find selected clips');
  }
  
  // Mark these clips as used for this user
  markComboUsed(selection.introId, selection.outroId, userId);
  
  // Get clip durations (may need to load them)
  const [introDuration, outroDuration] = await Promise.all([
    selectedIntro.duration || getAudioDuration(selectedIntro.url),
    selectedOutro.duration || getAudioDuration(selectedOutro.url)
  ]);
  
  // Build combo object
  const combo: MeditationCombo = {
    introId: selectedIntro.id,
    outroId: selectedOutro.id,
    introUrl: selectedIntro.url,
    outroUrl: selectedOutro.url,
    introDuration,
    outroDuration,
    totalClipDuration: introDuration + outroDuration,
    introScript: selectedIntro.scriptText,
    outroScript: selectedOutro.scriptText,
  };
  
  // Calculate middle duration (fixed 18 seconds)
  const middleDuration = getMiddleDurationForFreeTier();
  
  // OPTIMIZATION: Start prefetching intro/outro audio IN PARALLEL with script generation
  const audioPrefetchPromise = prefetchAudioBuffers(combo.introUrl, combo.outroUrl);
  
  // Step 3: Generate personalized middle script with intro/outro context
  onProgress?.({ step: 'Setting up the space...', canStartMeditation: false, voiceReady: false });
  const { mood, script: middleScript } = await generateFreeTierMiddleScript(
    transcript, 
    middleDuration,
    combo.introScript,
    combo.outroScript
  );

  // Build full script for display: intro + middle + outro
  const cleanMiddleScript = middleScript
    .replace(/<break[^>]*\/>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();
  
  const fullScript = `${combo.introScript} ${cleanMiddleScript} ${combo.outroScript}`;

  // ============================================
  // EARLY START: Signal ready NOW with intro audio
  // User can start listening to intro while we generate the middle
  // ============================================
  onProgress?.({ 
    step: "Let's get started!", 
    canStartMeditation: true, 
    voiceReady: false,
    result: { 
      transcript, 
      mood, 
      script: fullScript, 
      voiceAudioUrl: combo.introUrl,
      introUrl: combo.introUrl,
      outroUrl: combo.outroUrl,
      introDuration: combo.introDuration,
      outroDuration: combo.outroDuration,
      introScript: combo.introScript,
      outroScript: combo.outroScript
    }
  });

  // Step 4: Generate middle voice audio IN BACKGROUND while user may already be listening
  let voiceAudioUrl: string | null = combo.introUrl; // Fallback to intro if generation fails
  let alignment: WordAlignment[] | undefined;
  
  try {
    // Run voice generation and wait for audio prefetch in parallel
    const [voiceResult, prefetchedBuffers] = await Promise.all([
      generateVoiceAudioStreaming(middleScript),
      audioPrefetchPromise
    ]);
    
    // Get middle audio as ArrayBuffer and create a URL for duration calculation
    const middleBuffer = await fetch(voiceResult.audioUrl).then(r => r.arrayBuffer());
    const middleBlob = new Blob([middleBuffer], { type: 'audio/mpeg' });
    const middleUrl = URL.createObjectURL(middleBlob);
    
    // Concatenate with dynamic silence gaps based on actual audio durations
    // This uses the actual silence MP3 file for proper gaps
    const combinedBlob = await concatenateWithSilenceGaps(
      prefetchedBuffers.introBuffer,
      combo.introUrl,
      middleBuffer,
      middleUrl,
      prefetchedBuffers.outroBuffer,
      combo.outroUrl
    );
    
    // Clean up temporary URL
    URL.revokeObjectURL(middleUrl);
    
    voiceAudioUrl = URL.createObjectURL(combinedBlob);
    alignment = voiceResult.alignment;
    
    // Update with full audio
    onProgress?.({ 
      step: "Let's get started!", 
      canStartMeditation: true, 
      voiceReady: true,
      result: { 
        transcript, 
        mood, 
        script: fullScript, 
        voiceAudioUrl,
        alignment,
        introUrl: combo.introUrl,
        outroUrl: combo.outroUrl,
        introDuration: combo.introDuration,
        outroDuration: combo.outroDuration,
        introScript: combo.introScript,
        outroScript: combo.outroScript
      }
    });
  } catch (error) {
    console.error('[Pipeline] Voice generation failed:', error);
    // Fallback to intro only
    onProgress?.({ 
      step: "Let's get started!", 
      canStartMeditation: true, 
      voiceReady: true,
      result: { 
        transcript, 
        mood, 
        script: fullScript, 
        voiceAudioUrl: combo.introUrl,
        introUrl: combo.introUrl,
        outroUrl: combo.outroUrl,
        introDuration: combo.introDuration,
        outroDuration: combo.outroDuration,
        introScript: combo.introScript,
        outroScript: combo.outroScript
      }
    });
  }
  
  const total = Date.now() - t0;
  console.log(`=== Free Tier Pipeline Complete: ${total}ms (${(total/1000).toFixed(1)}s) ===`);

  return { 
    transcript, 
    mood, 
    script: fullScript, 
    voiceAudioUrl, 
    alignment,
    introUrl: combo.introUrl,
    outroUrl: combo.outroUrl,
    introDuration: combo.introDuration,
    outroDuration: combo.outroDuration,
    introScript: combo.introScript,
    outroScript: combo.outroScript
  };
}

// Premium meditation: clean script + post-audio silence injection for precise duration
// Uses 70 words per minute for 50/50 speech-to-silence ratio
// Silence is injected AFTER audio generation using alignment timestamps
async function createPremiumMeditation(
  transcript: string,
  durationSeconds: number,
  onProgress?: (progress: MeditationProgress) => void,
  t0: number = Date.now()
): Promise<MeditationResult> {
  const durationMinutes = Math.ceil(durationSeconds / 60);
  
  console.log(`[Premium] Creating ${durationMinutes} minute meditation (${durationSeconds}s target)`);
  
  // Step 1: Generate clean script (no SSML breaks - silence injected post-audio)
  onProgress?.({ step: 'Preparing your meditation...', canStartMeditation: false, voiceReady: false });
  const { mood, script } = await generatePremiumScript(transcript, durationMinutes);
  console.log(`[Premium] Script generated: ${Date.now() - t0}ms`);
  
  // Script is already clean (no SSML tags)
  const displayScript = script;
  
  // Step 2: Signal that we have the script (can show text while generating audio)
  onProgress?.({ 
    step: 'Setting up the space...', 
    canStartMeditation: true, 
    voiceReady: false,
    result: { transcript, mood, script: displayScript }
  });
  
  // Step 3: Generate speech-only audio (no pauses) from ElevenLabs
  let voiceAudioUrl: string | null = null;
  
  try {
    onProgress?.({ 
      step: 'Bringing your meditation to life...', 
      canStartMeditation: true, 
      voiceReady: false,
      result: { transcript, mood, script: displayScript }
    });
    
    // Generate speech-only audio (ElevenLabs returns audio + alignment timestamps)
    const voiceResult = await generateVoiceAudioStreaming(script);
    console.log(`[Premium] Raw speech generated: ${Date.now() - t0}ms`);
    
    // Step 4: Inject silence at sentence boundaries to hit exact target duration
    if (voiceResult.alignment && voiceResult.alignment.length > 0) {
      onProgress?.({ 
        step: 'Adding the finishing touches...', 
        canStartMeditation: true, 
        voiceReady: false,
        result: { transcript, mood, script: displayScript }
      });
      
      // Use the rawBuffer directly (no re-fetch needed)
      const finalAudioBlob = await injectSilenceBetweenSentences(
        voiceResult.rawBuffer,
        voiceResult.alignment,
        durationSeconds
      );
      
      // Clean up raw audio URL
      URL.revokeObjectURL(voiceResult.audioUrl);
      
      voiceAudioUrl = URL.createObjectURL(finalAudioBlob);
      console.log(`[Premium] Silence injection complete: ${Date.now() - t0}ms`);
    } else {
      // Fallback: no alignment data, use raw audio as-is
      console.warn('[Premium] No alignment data — using raw audio without silence injection');
      voiceAudioUrl = voiceResult.audioUrl;
    }
  } catch (error) {
    console.error('[Premium] Audio generation/processing failed:', error);
  }
  
  // Step 5: Complete
  onProgress?.({ 
    step: "Let's get started!", 
    canStartMeditation: true, 
    voiceReady: true,
    result: { transcript, mood, script: displayScript, voiceAudioUrl }
  });

  const total = Date.now() - t0;
  console.log(`=== Premium Pipeline Complete: ${total}ms (${(total/1000).toFixed(1)}s) ===`);

  return { transcript, mood, script: displayScript, voiceAudioUrl };
}

// Generate a premium meditation script (clean text, NO SSML breaks)
// Uses ~28 words per minute for sparse generation (~40% speech, ~60% silence)
// Silence will be injected post-audio at sentence boundaries
async function generatePremiumScript(
  transcript: string,
  durationMinutes: number
): Promise<{ mood: MoodTag; script: string }> {
  const { calculateTargetWordCount } = await import('./pacingEngine');
  
  const totalSeconds = durationMinutes * 60;
  const targetWords = calculateTargetWordCount(totalSeconds);
  
  // Pick a random closing phrase to avoid repetition across sessions
  const closingPhrase = CLOSING_PHRASES[Math.floor(Math.random() * CLOSING_PHRASES.length)];
  
  const systemPrompt = `You are a meditation guide. Write a ${durationMinutes}-minute guided meditation.

RESPOND WITH JSON ONLY:
{"mood":"MOOD_TAG","script":"your meditation text"}

MOOD_TAG — pick the ONE that best matches what the user shared:
- UPLIFTING: They express joy, hope, optimism, or lightness
- CALMING: They seek peace, relaxation, or relief from daily stress
- ENERGIZING: They need energy, a boost, or feel drained but want vitality
- HEALING: They are processing grief, pain, illness, loss, or deep emotional wounds
- FOCUSED: They need concentration, clarity, direction, or productivity
- SLEEPY: They are tired, preparing for sleep, or need deep rest
- ANXIOUS: They express worry, fear, overwhelm, racing thoughts, or chronic stress
- GRATEFUL: They express appreciation, thankfulness, counting blessings, or contentment
- MOTIVATED: They have goals, ambitions, upcoming challenges, or need drive

CRITICAL — WORD COUNT:
Write EXACTLY ${targetWords} words. Long silence will be added between your sentences automatically, so write SPARSE, minimal text. Each sentence carries weight. Every word matters.

WRITING STYLE:
- Write as a continuous, flowing meditation — NOT in sections or phases.
- Do NOT use labels like "opening", "body scan", "grounding", "visualization", or "closing".
- Do NOT repeat the same idea twice. Every sentence must introduce a new thought, image, or sensation.
- Vary your rhythm: mix 3-word sentences with longer 10-word ones.
- Be specific and vivid. Instead of "feel calm", say "notice the warmth behind your eyes."
- Respond directly to what the user shared. Weave their words and feelings into the fabric of the meditation.
- Make it feel like a one-on-one conversation, not a template.

CONTENT GUIDANCE:
- Start gently — a breath, a greeting, an invitation.
- Move through the body, emotions, imagery, or breath work in whatever order feels natural for THIS person.
- End with: "${closingPhrase}"
- The closing sentence should be the ONLY closing. Do not add extra wrap-up sentences.

WHAT TO AVOID:
- "Now let's move to..." or any transitional signposting
- Repeating "breathe" or "relax" more than twice in the entire script
- Generic affirmations that could apply to anyone
- Lists of body parts (don't do a full body scan)
- The word "journey"

EXAMPLE for 2 minutes (~56 words):
"Hello. Take one deep breath in. Let it go. You mentioned feeling scattered today. Picture those scattered pieces as leaves, drifting in a slow wind. You don't need to chase them. Watch them settle, one by one. Notice the quiet between each landing. That quiet lives in you. It always has. ${closingPhrase}"`;

  const requestBody = {
    model: OPENAI_MODEL,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: `The user shared: "${transcript}"\n\nWrite a ${durationMinutes}-minute meditation, exactly ${targetWords} words. JSON only.` }
    ],
    max_tokens: Math.max(800, targetWords * 3),
    temperature: 0.85,
  };

  const validMoods: MoodTag[] = ['UPLIFTING', 'CALMING', 'ENERGIZING', 'HEALING', 'FOCUSED', 'SLEEPY', 'ANXIOUS', 'GRATEFUL', 'MOTIVATED'];
  
  const cleanScript = (text: string) => text
    .replace(/<break[^>]*\/?>/gi, '')
    .replace(/<[^>]+>/g, '')
    .replace(/\s+/g, ' ')
    .trim();

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (response.ok) {
      const data = await response.json();
      const content = data.choices[0].message.content.trim();
      
      // Try strict JSON parsing first
      try {
        const jsonMatch = content.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          const mood = validMoods.includes(parsed.mood?.toUpperCase()) ? parsed.mood.toUpperCase() as MoodTag : 'CALMING';
          if (parsed.script) {
            return { mood, script: cleanScript(parsed.script) };
          }
        }
      } catch {
        console.warn('[Premium] JSON parse failed, attempting fallback extraction');
      }
      
      // Fallback 1: Extract script via regex
      const scriptMatch = content.match(/"script"\s*:\s*"([\s\S]*?)(?:"\s*}|"$)/);
      if (scriptMatch && scriptMatch[1]) {
        console.log('[Premium] Extracted script via fallback regex');
        const moodMatch = content.match(/"mood"\s*:\s*"([^"]+)"/i);
        const mood = moodMatch && validMoods.includes(moodMatch[1].toUpperCase() as MoodTag) 
          ? moodMatch[1].toUpperCase() as MoodTag 
          : 'CALMING';
        return { mood, script: cleanScript(scriptMatch[1]) };
      }
      
      // Fallback 2: Strip JSON artifacts
      console.warn('[Premium] Using last resort JSON artifact cleanup');
      const cleanedContent = content
        .replace(/^\s*\{[^}]*"script"\s*:\s*"/i, '')
        .replace(/"\s*\}\s*$/i, '')
        .replace(/\{"mood":[^,]*,/gi, '')
        .replace(/^\s*"script"\s*:\s*"/i, '')
        .trim();
      
      return { mood: 'CALMING', script: cleanScript(cleanedContent || content) };
    }
  } catch (error) {
    console.error('[Premium] Script generation failed:', error);
  }
  
  // Fallback
  return { 
    mood: 'CALMING', 
    script: `Hello. Take one slow breath in. And let it go. You are here. That is enough. Feel the weight of your body settling. Notice the quiet. It has been waiting for you. Let it hold you. ${closingPhrase}`
  };
}

// ============================================
// Summary Generation (for history)
// ============================================

export async function generateSummary(transcript: string): Promise<string> {
  try {
    const requestBody: Record<string, unknown> = {
      model: OPENAI_MODEL,
      messages: [
        { role: 'system', content: 'Summarize in 10 words or less. Focus on emotion or topic.' },
        { role: 'user', content: transcript }
      ],
      max_tokens: 50,
    };
    
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) return 'Personal meditation session';
    return (await response.json()).choices[0].message.content.trim();
  } catch {
    return 'Personal meditation session';
  }
}
