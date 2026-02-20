// ============================================
// Weighted Micro-Pacing Engine for Meditation Audio
// ============================================
// 
// This module implements a deterministic pacing algorithm that calculates
// silence distribution between speech segments to hit a target duration.
//
// Key Constants (Production-Calibrated):
// - 12 characters per second (observed from TTS data)
// - 70 words per minute target density (50/50 speech-to-silence ratio)
// - 1.1x safety buffer on silence (TTS often faster than expected)

// ============================================
// Constants (Production-Calibrated)
// ============================================

/** Character-based speech rate (characters per second, excluding whitespace) */
export const CHARS_PER_SECOND = 12.0;

/** Target words per minute for LLM prompts.
 * 28 wpm produces sparse text (~40% speech, ~60% silence).
 * This gives the silence injection pipeline plenty of room to work with,
 * ensuring we always hit the target duration without rushing. */
export const TARGET_WORDS_PER_MINUTE = 28.0;

/** Safety buffer multiplier for silence (TTS is often faster than estimated) */
export const SILENCE_SAFETY_BUFFER = 1.1;

/** Maximum break duration per tag (ElevenLabs limit) */
export const MAX_BREAK_SECONDS = 3.0;

/** Minimum break duration (below this is imperceptible) */
export const MIN_BREAK_SECONDS = 0.1;

// ============================================
// Punctuation Weights
// ============================================

/** Weight for comma pauses (short breath) */
export const WEIGHT_COMMA = 1;

/** Weight for sentence-ending punctuation (natural pause) */
export const WEIGHT_SENTENCE = 3;

/** Weight for paragraph breaks (long contemplative pause) */
export const WEIGHT_PARAGRAPH = 5;

// ============================================
// Types
// ============================================

/** The type of punctuation that ends a speech atom */
export type PunctuationType = 'comma' | 'sentenceEnd' | 'paragraph' | 'none';

/** A single "atom" of speech - text followed by punctuation */
export interface SpeechAtom {
  /** The text content (without trailing punctuation) */
  text: string;
  /** The punctuation that ends this atom */
  punctuation: PunctuationType;
  /** The original punctuation character(s) */
  punctuationChar: string;
  /** Calculated silence weight */
  weight: number;
  /** Word count in this atom */
  wordCount: number;
  /** Character count (excluding whitespace) */
  charCount: number;
}

/** Configuration for the pacing engine */
export interface PacingConfig {
  /** Character-based speech rate (chars per second) */
  charsPerSecond: number;
  /** Safety buffer multiplier for silence */
  silenceSafetyBuffer: number;
  /** Maximum seconds per break tag */
  maxBreakSeconds: number;
  /** Minimum seconds per break tag */
  minBreakSeconds: number;
  /** Weight for comma pauses */
  weightComma: number;
  /** Weight for sentence-end pauses */
  weightSentence: number;
  /** Weight for paragraph pauses */
  weightParagraph: number;
}

/** Result of the pacing calculation */
export interface PacingResult {
  /** The final SSML string (if needed) */
  ssml: string;
  /** Total character count (excluding whitespace) */
  totalChars: number;
  /** Total word count */
  totalWords: number;
  /** Estimated speech duration in seconds */
  estimatedSpeechSeconds: number;
  /** Raw silence budget before safety buffer */
  rawSilenceBudget: number;
  /** Final silence budget after safety buffer (1.1x) */
  finalSilenceBudget: number;
  /** Total silence to be added in seconds */
  totalSilenceToAdd: number;
  /** Target duration that was requested */
  targetDurationSeconds: number;
  /** Actual estimated total duration */
  estimatedTotalSeconds: number;
  /** Number of speech atoms */
  atomCount: number;
  /** The speech atoms with their calculated silence durations */
  atoms: SpeechAtomWithSilence[];
}

/** Speech atom with calculated silence duration */
export interface SpeechAtomWithSilence extends SpeechAtom {
  /** Silence duration to add after this atom (0 for last atom) */
  silenceAfter: number;
}

// ============================================
// Default Configuration
// ============================================

export const DEFAULT_CONFIG: PacingConfig = {
  charsPerSecond: CHARS_PER_SECOND,
  silenceSafetyBuffer: SILENCE_SAFETY_BUFFER,
  maxBreakSeconds: MAX_BREAK_SECONDS,
  minBreakSeconds: MIN_BREAK_SECONDS,
  weightComma: WEIGHT_COMMA,
  weightSentence: WEIGHT_SENTENCE,
  weightParagraph: WEIGHT_PARAGRAPH,
};

// ============================================
// Helper Functions
// ============================================

/** Count words in a string */
export function countWords(text: string): number {
  return text.trim().split(/\s+/).filter(w => w.length > 0).length;
}

/** Count characters excluding whitespace */
export function countChars(text: string): number {
  return text.replace(/\s/g, '').length;
}

/** Get the weight for a punctuation type */
export function getPunctuationWeight(type: PunctuationType, config: PacingConfig = DEFAULT_CONFIG): number {
  switch (type) {
    case 'comma': return config.weightComma;
    case 'sentenceEnd': return config.weightSentence;
    case 'paragraph': return config.weightParagraph;
    case 'none': return 0;
  }
}

/** Classify punctuation and return type + character */
export function classifyPunctuation(punct: string): { type: PunctuationType; char: string } {
  if (!punct || punct.length === 0) {
    return { type: 'none', char: '' };
  }

  // Check for paragraph/newline first (higher priority)
  if (punct.includes('\n')) {
    return { type: 'paragraph', char: punct };
  }

  // Check for sentence-ending punctuation
  if (punct.includes('.') || punct.includes('?') || punct.includes('!')) {
    const char = punct.charAt(0);
    return { type: 'sentenceEnd', char };
  }

  // Check for comma
  if (punct.includes(',')) {
    return { type: 'comma', char: ',' };
  }

  return { type: 'none', char: '' };
}

// ============================================
// Core Functions
// ============================================

/**
 * Calculate the target word count for an LLM prompt.
 * 
 * This ensures a 50/50 speech-to-silence ratio by using ~70 words per minute.
 * Use this when building prompts for GPT to generate meditation scripts.
 * 
 * @param targetDurationSeconds - The total desired meditation duration
 * @returns The number of words to request from the LLM
 * 
 * @example
 * calculateTargetWordCount(300) // 5 minutes -> 350 words
 */
export function calculateTargetWordCount(targetDurationSeconds: number): number {
  const minutes = targetDurationSeconds / 60.0;
  return Math.round(minutes * TARGET_WORDS_PER_MINUTE);
}

/**
 * Estimate speech duration based on character count.
 * 
 * Uses production-calibrated rate of 12 chars/sec.
 * 
 * @param text - The text to estimate duration for
 * @returns Estimated duration in seconds
 */
export function estimateSpeechDuration(text: string): number {
  const chars = countChars(text);
  return chars / CHARS_PER_SECOND;
}

/**
 * Atomize text into speech atoms based on punctuation.
 * 
 * Splits text at punctuation boundaries, capturing the punctuation
 * and assigning weights for silence distribution.
 * 
 * @param text - The text to atomize
 * @param config - Pacing configuration
 * @returns Array of speech atoms
 */
export function atomizeText(text: string, config: PacingConfig = DEFAULT_CONFIG): SpeechAtom[] {
  const atoms: SpeechAtom[] = [];

  // Regex to split on punctuation while capturing the punctuation
  // Matches: content followed by optional punctuation (comma, period, question, exclamation, or newline)
  const regex = /([^,.?!\n]+)([,.?!\n]*)/g;
  let match;

  while ((match = regex.exec(text)) !== null) {
    const content = match[1].trim();
    const punct = match[2] || '';

    if (!content) continue;

    const { type, char } = classifyPunctuation(punct);
    const weight = getPunctuationWeight(type, config);

    atoms.push({
      text: content,
      punctuation: type,
      punctuationChar: char,
      weight,
      wordCount: countWords(content),
      charCount: countChars(content),
    });
  }

  return atoms;
}

/**
 * Distribute silence budget across atoms based on their weights.
 * 
 * @param atoms - Speech atoms to distribute silence between
 * @param silenceBudget - Total silence to distribute in seconds
 * @param config - Pacing configuration
 * @returns Atoms with silenceAfter property set
 */
export function distributeSilence(
  atoms: SpeechAtom[],
  silenceBudget: number,
  config: PacingConfig = DEFAULT_CONFIG
): SpeechAtomWithSilence[] {
  // Calculate total weight (excluding last atom - no break at end)
  const totalWeight = atoms.length > 1
    ? atoms.slice(0, -1).reduce((sum, a) => sum + a.weight, 0)
    : 0;

  // Calculate time per weight unit
  const timePerUnit = totalWeight > 0 ? silenceBudget / totalWeight : 0;

  // Assign silence to each atom
  return atoms.map((atom, i) => {
    const isLast = i === atoms.length - 1;
    let silenceAfter = 0;

    // DO NOT add silence after the very last atom
    if (!isLast && atom.weight > 0 && timePerUnit > 0) {
      silenceAfter = atom.weight * timePerUnit;
      // Only add if above minimum threshold
      if (silenceAfter < config.minBreakSeconds) {
        silenceAfter = 0;
      }
    }

    return { ...atom, silenceAfter };
  });
}

/**
 * Calculate complete pacing for a meditation text.
 * 
 * This is the main entry point. It takes raw text and a target duration,
 * and returns detailed pacing information including silence distribution.
 * 
 * @param text - The raw meditation script text
 * @param targetDurationSeconds - Desired total duration in seconds
 * @param config - Pacing configuration
 * @returns Complete pacing result with atoms and silence distribution
 */
export function calculatePacing(
  text: string,
  targetDurationSeconds: number,
  config: PacingConfig = DEFAULT_CONFIG
): PacingResult {
  // Step A: Atomize the text
  const atoms = atomizeText(text, config);

  // Count totals
  const totalChars = atoms.reduce((sum, a) => sum + a.charCount, 0);
  const totalWords = atoms.reduce((sum, a) => sum + a.wordCount, 0);

  // Estimate speech time using character-based formula
  const estimatedSpeechSeconds = totalChars / config.charsPerSecond;

  // Step B: Calculate silence budget with safety buffer
  const rawSilenceBudget = Math.max(0, targetDurationSeconds - estimatedSpeechSeconds);
  const finalSilenceBudget = rawSilenceBudget * config.silenceSafetyBuffer;

  // Step C: Distribute silence across atoms
  const atomsWithSilence = distributeSilence(atoms, finalSilenceBudget, config);

  // Calculate total silence actually added
  const totalSilenceToAdd = atomsWithSilence.reduce((sum, a) => sum + a.silenceAfter, 0);

  // Build SSML string (for reference/debugging)
  const ssml = buildSSML(atomsWithSilence, config);

  return {
    ssml,
    totalChars,
    totalWords,
    estimatedSpeechSeconds,
    rawSilenceBudget,
    finalSilenceBudget,
    totalSilenceToAdd,
    targetDurationSeconds,
    estimatedTotalSeconds: estimatedSpeechSeconds + totalSilenceToAdd,
    atomCount: atoms.length,
    atoms: atomsWithSilence,
  };
}

/**
 * Build SSML string from atoms with silence.
 * 
 * Formats break durations into SSML break tags, chaining them
 * if they exceed the 3-second ElevenLabs limit.
 */
function buildSSML(atoms: SpeechAtomWithSilence[], config: PacingConfig): string {
  let ssml = '';

  for (let i = 0; i < atoms.length; i++) {
    const atom = atoms[i];
    const isLast = i === atoms.length - 1;

    // Add the text and punctuation
    ssml += atom.text + atom.punctuationChar;

    // Add break tags if there's silence to add
    if (atom.silenceAfter > 0) {
      ssml += formatBreakTags(atom.silenceAfter, config);
    }

    // Add space after punctuation (except at end)
    if (!isLast) {
      ssml += ' ';
    }
  }

  return ssml;
}

/**
 * Format silence duration into SSML break tags.
 * 
 * Since ElevenLabs has a max of 3 seconds per break,
 * longer durations are split into multiple tags.
 */
export function formatBreakTags(totalSeconds: number, config: PacingConfig = DEFAULT_CONFIG): string {
  let result = '';
  let remaining = totalSeconds;

  while (remaining > config.minBreakSeconds) {
    const breakDuration = Math.min(remaining, config.maxBreakSeconds);
    result += `<break time="${breakDuration.toFixed(1)}s"/>`;
    remaining -= breakDuration;
  }

  return result;
}

/**
 * Find sentence boundaries in atoms.
 * 
 * Returns indices of atoms that end with sentence-ending punctuation.
 * Useful for determining where to inject silence in audio.
 */
export function findSentenceBoundaries(atoms: SpeechAtom[]): number[] {
  const boundaries: number[] = [];
  
  for (let i = 0; i < atoms.length; i++) {
    if (atoms[i].punctuation === 'sentenceEnd' || atoms[i].punctuation === 'paragraph') {
      boundaries.push(i);
    }
  }

  return boundaries;
}
