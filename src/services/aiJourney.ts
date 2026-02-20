// AI Journey Service
// Analyzes user's meditation history, builds calendar data, generates recap & journey meditation

import type { MoodTag } from '../types';
import { MOOD_COLORS, MOOD_LABELS } from '../types';
import type { DbSession } from './supabase';
import { generateVoiceAudioStreaming, injectSilenceBetweenSentences } from './apiOptimized';
import type { WordAlignment } from './apiOptimized';

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
// Use the same model as apiOptimized.ts — hardcoded because the env var may be stale
const OPENAI_MODEL = 'gpt-4.1-nano';

// Journey meditations use 45 WPM (vs 28 WPM for daily meditations) because
// a journey reflection needs more substance, more specifics, more spoken content.
const JOURNEY_WORDS_PER_MINUTE = 45;

// ============================================
// Types
// ============================================

export interface CalendarDay {
  date: Date;
  dateStr: string;          // e.g. "2025-02-09"
  dayOfWeek: number;        // 0 = Sun, 6 = Sat
  dayLabel: string;         // e.g. "9"
  hasMeditation: boolean;
  mood: MoodTag | null;     // Dominant mood for that day
  sessionCount: number;
}

export interface ProgressBarData {
  startMood: MoodTag;
  middleMood: MoodTag;
  endMood: MoodTag;
  startColor: string;
  middleColor: string;
  endColor: string;
  isUniform: boolean;
}

export interface JourneyAnalysis {
  calendarDays: CalendarDay[];
  progressBar: ProgressBarData;
  recap: string;
  recapIsAI: boolean;         // false = fallback was used
  sessionCount: number;
  daysWithSessions: number;
}

export interface JourneyMeditation {
  script: string;
  voiceAudioUrl: string | null;
  duration: number;
  alignment?: WordAlignment[];
}

// ============================================
// Mood Helpers
// ============================================

/** Find the dominant (most frequent) mood in a list of sessions */
function getDominantMood(sessions: DbSession[]): MoodTag {
  const counts: Partial<Record<MoodTag, number>> = {};
  for (const s of sessions) {
    counts[s.mood] = (counts[s.mood] || 0) + 1;
  }
  let best: MoodTag = sessions[0]?.mood || 'CALMING';
  let bestCount = 0;
  for (const [mood, count] of Object.entries(counts)) {
    if (count! > bestCount) {
      bestCount = count!;
      best = mood as MoodTag;
    }
  }
  return best;
}

// ============================================
// Calendar Builder
// ============================================

export function buildCalendar(sessions: DbSession[]): CalendarDay[] {
  const today = new Date();
  today.setHours(23, 59, 59, 999);

  const sessionsByDate: Record<string, DbSession[]> = {};
  for (const s of sessions) {
    const d = new Date(s.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    if (!sessionsByDate[key]) sessionsByDate[key] = [];
    sessionsByDate[key].push(s);
  }

  const days: CalendarDay[] = [];
  for (let i = 13; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(today.getDate() - i);
    date.setHours(0, 0, 0, 0);
    const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    const daySessions = sessionsByDate[dateStr] || [];

    days.push({
      date,
      dateStr,
      dayOfWeek: date.getDay(),
      dayLabel: String(date.getDate()),
      hasMeditation: daySessions.length > 0,
      mood: daySessions.length > 0 ? getDominantMood(daySessions) : null,
      sessionCount: daySessions.length,
    });
  }
  return days;
}

// ============================================
// Progress Bar Builder
// ============================================

export function buildProgressBar(sessions: DbSession[]): ProgressBarData {
  if (sessions.length === 0) {
    return {
      startMood: 'CALMING', middleMood: 'CALMING', endMood: 'CALMING',
      startColor: MOOD_COLORS.CALMING, middleColor: MOOD_COLORS.CALMING, endColor: MOOD_COLORS.CALMING,
      isUniform: true,
    };
  }

  const sorted = [...sessions].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const third = Math.max(1, Math.ceil(sorted.length / 3));
  const startSessions = sorted.slice(0, third);
  const middleSessions = sorted.slice(third, third * 2);
  const endSessions = sorted.slice(third * 2);

  const startMood = getDominantMood(startSessions);
  const middleMood = middleSessions.length > 0 ? getDominantMood(middleSessions) : startMood;
  const endMood = endSessions.length > 0 ? getDominantMood(endSessions) : middleMood;
  const isUniform = startMood === middleMood && middleMood === endMood;

  return {
    startMood, middleMood, endMood,
    startColor: MOOD_COLORS[startMood],
    middleColor: MOOD_COLORS[middleMood],
    endColor: MOOD_COLORS[endMood],
    isUniform,
  };
}

// ============================================
// AI Recap Generation
// ============================================

/**
 * Build rich context from sessions for AI consumption.
 * Includes transcripts (what the user said), summaries, and meditation script excerpts.
 */
function buildSessionContext(sessions: DbSession[]): string {
  const sorted = [...sessions].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  const lines: string[] = [];

  for (let i = 0; i < sorted.length; i++) {
    const s = sorted[i];
    const date = new Date(s.created_at).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
    const mood = MOOD_LABELS[s.mood] || s.mood;

    // For the most recent 10 sessions, include full transcript + meditation excerpt
    // For older sessions, include transcript snippet + summary
    const isDetailed = i >= Math.max(0, sorted.length - 10);

    const transcript = s.transcript && s.transcript !== 'Demo transcript'
      ? s.transcript.slice(0, isDetailed ? 500 : 150)
      : null;

    const meditationExcerpt = isDetailed && s.meditation_script
      ? s.meditation_script.slice(0, 200)
      : null;

    let line = `[${date}] Mood: ${mood}`;
    if (transcript) {
      line += `\n  What they said: "${transcript}"`;
    }
    if (s.summary && s.summary !== 'A personalized meditation session') {
      line += `\n  Session summary: ${s.summary}`;
    }
    if (meditationExcerpt) {
      line += `\n  Meditation excerpt: "${meditationExcerpt}..."`;
    }

    lines.push(line);
  }

  return lines.join('\n\n');
}

/** Generate a deeply personalized 1-paragraph (max 5 sentence) recap. */
async function generateRecap(sessions: DbSession[]): Promise<{ text: string; isAI: boolean }> {
  if (sessions.length === 0) {
    return { text: "You're just getting started. Every session is a step forward.", isAI: false };
  }

  const context = buildSessionContext(sessions);
  const progressBar = buildProgressBar(sessions);
  const startLabel = MOOD_LABELS[progressBar.startMood];
  const endLabel = MOOD_LABELS[progressBar.endMood];

  // Count unique themes from transcripts
  const transcripts = sessions
    .filter(s => s.transcript && s.transcript !== 'Demo transcript')
    .map(s => s.transcript);

  const prompt = `You are a deeply perceptive wellness coach who has been listening to everything this person has shared over the past 2 weeks. Write a personal recap that proves you know them — not a summary of moods, but a reflection of who they are right now.

=== THEIR MEDITATION SESSIONS (${sessions.length} total) ===

${context}

=== MOOD ARC ===
Started: ${startLabel} → Now: ${endLabel}
Total unique transcripts: ${transcripts.length}

=== YOUR TASK ===
Write 1 paragraph, EXACTLY 4-5 sentences. Here is what each sentence must do:

SENTENCE 1: Reference something SPECIFIC they said in their EARLIEST sessions. Quote or paraphrase their actual words. Example: "Two weeks ago, you sat down carrying the weight of a tough week at work — you mentioned feeling pulled in every direction."

SENTENCE 2-3: Describe how their emotional landscape SHIFTED over the two weeks. What themes kept coming up? Did they start talking about different things? Did their language change? Be specific: "By midweek, something shifted — you started mentioning gratitude, and your words carried less tension."

SENTENCE 4: Describe where they are NOW based on their most recent sessions. What are they focused on? How do they sound compared to 2 weeks ago?

SENTENCE 5: Close with a single warm, specific encouragement. NOT generic ("you're doing great"). Instead, tie it back to THEIR specific progress: "The version of you who sat down two weeks ago would be proud of where you are now" or "You went from surviving to showing up with intention — that's real growth."

ABSOLUTE RULES:
- You MUST reference their actual words or topics. If they talked about work stress, SAY "work stress." If they mentioned sleep, SAY "sleep."
- Do NOT write anything that could apply to any random person. Every sentence must be unmistakably about THIS person.
- Do NOT list moods. Do NOT say "you went from calm to uplifting." Describe the FEELING, not the label.
- Write in second person ("You...").
- No bullet points, no headers. One flowing paragraph.

Respond with ONLY the paragraph. No JSON, no quotes.`;

  try {
    console.log(`[Journey] Generating recap with ${sessions.length} sessions, ${context.length} chars of context`);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: 'You are a perceptive, compassionate wellness coach. You have deep empathy and an incredible memory for what people share. You write like a close friend who truly listens — warm, specific, never generic.' },
          { role: 'user', content: prompt },
        ],
        max_tokens: 500,
        temperature: 0.85,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'unknown');
      console.error(`[Journey] Recap API error ${response.status}:`, errorBody);
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    const recap = data.choices[0].message.content.trim().replace(/^["']|["']$/g, '').trim();
    console.log('[Journey] Recap generated successfully:', recap.slice(0, 100) + '...');
    return { text: recap, isAI: true };
  } catch (error) {
    console.error('[Journey] Recap generation failed:', error);
    // Return a fallback, but mark it as non-AI so it won't be cached
    const startMoodLabel = MOOD_LABELS[progressBar.startMood];
    const endMoodLabel = MOOD_LABELS[progressBar.endMood];
    return {
      text: `Over the past two weeks, you've shown up ${sessions.length} times for yourself — that consistency alone speaks volumes. You started feeling ${startMoodLabel.toLowerCase()} and have moved toward feeling ${endMoodLabel.toLowerCase()}. You're showing up for yourself, and that's what matters most.`,
      isAI: false,
    };
  }
}

// ============================================
// Full Journey Analysis
// ============================================

export async function analyzeJourney(sessions: DbSession[]): Promise<JourneyAnalysis> {
  const calendarDays = buildCalendar(sessions);
  const progressBar = buildProgressBar(sessions);
  const { text: recap, isAI: recapIsAI } = await generateRecap(sessions);
  const daysWithSessions = calendarDays.filter(d => d.hasMeditation).length;

  return {
    calendarDays,
    progressBar,
    recap,
    recapIsAI,
    sessionCount: sessions.length,
    daysWithSessions,
  };
}

// ============================================
// Journey Meditation Generation
// ============================================

const JOURNEY_CLOSING_PHRASES = [
  "Carry this knowing with you. You are enough.",
  "Let this peace follow you into the rest of your day.",
  "You have everything you need, right here, right now.",
  "Take this stillness with you. It belongs to you.",
  "When you are ready, gently open your eyes. Welcome back.",
];

/**
 * Generate a journey meditation script based on 2-week session data.
 * Uses 45 WPM (vs 28 for daily) for richer spoken content.
 */
export async function generateJourneyMeditationScript(
  recap: string,
  sessions: DbSession[]
): Promise<string> {
  const durationMinutes = 5;
  const targetWords = Math.round(durationMinutes * JOURNEY_WORDS_PER_MINUTE); // ~225 words
  const closingPhrase = JOURNEY_CLOSING_PHRASES[Math.floor(Math.random() * JOURNEY_CLOSING_PHRASES.length)];

  // Build rich context from sessions — include real quotes and themes
  const sorted = [...sessions].sort(
    (a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()
  );

  // Pull specific user quotes for the meditation to reference
  const userQuotes = sorted
    .filter(s => s.transcript && s.transcript !== 'Demo transcript' && s.transcript.length > 20)
    .slice(-8)
    .map(s => {
      const mood = MOOD_LABELS[s.mood];
      return `- (${mood}) "${s.transcript!.slice(0, 200)}"`;
    })
    .join('\n');

  // Pull key themes from meditation scripts
  const recentScripts = sorted.slice(-5).map(s => s.meditation_script?.slice(0, 150) || '').filter(Boolean);
  const scriptExcerpts = recentScripts.map((s) => `- "${s}..."`).join('\n');

  const systemPrompt = `You are a meditation guide. Write a ${durationMinutes}-minute guided meditation that reflects deeply on this person's past 2 weeks.

THIS IS A JOURNEY MEDITATION. It must feel like a wise, caring friend who has been with them through every session — someone who remembers what they said, what they felt, and how they've changed. This is NOT a generic relaxation exercise.

=== THEIR 2-WEEK RECAP ===
${recap}

=== WHAT THEY SHARED IN RECENT SESSIONS (their actual words) ===
${userQuotes || '(No specific transcripts available)'}

=== EXCERPTS FROM THEIR RECENT MEDITATIONS ===
${scriptExcerpts || '(None available)'}

=== WORD COUNT ===
Write EXACTLY ${targetWords} words. Silence will be added between sentences automatically. Write more content than a typical meditation — this is a REFLECTION, not just breathing exercises.

=== WRITING STYLE ===
- Start by grounding them in the present moment (1-2 sentences of breath work).
- Then gently take them back to where they were 2 weeks ago. Reference specific things they shared — their stresses, their hopes, what was on their mind.
- Walk them through how things shifted. What changed? What did they learn about themselves?
- Bring them back to the present. How are they different now? What have they built?
- Reference their ACTUAL WORDS. If they mentioned work stress, talk about work. If they mentioned sleep, talk about rest. If they mentioned a relationship, acknowledge it.
- End with: "${closingPhrase}"

=== WHAT TO AVOID ===
- Generic meditation language that could apply to anyone
- Listing moods ("you felt calm, then anxious, then grateful")
- The word "journey"
- "Now let's move to..." or any transitional signposting
- Repeating "breathe" or "relax" more than twice total

Respond with ONLY the meditation script. No JSON, no formatting.`;

  try {
    console.log(`[Journey] Generating meditation script, target: ${targetWords} words`);

    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: 'You are a deeply empathetic meditation guide who remembers everything this person has shared. Speak directly to them about THEIR specific life, not in generalities.' },
          { role: 'user', content: systemPrompt },
        ],
        max_tokens: Math.max(1000, targetWords * 3),
        temperature: 0.85,
      }),
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => 'unknown');
      console.error(`[Journey] Meditation script API error ${response.status}:`, errorBody);
      throw new Error(`API error: ${response.status}`);
    }

    const data = await response.json();
    let script = data.choices[0].message.content.trim();

    // Clean artifacts
    script = script
      .replace(/<break[^>]*\/?>/gi, '')
      .replace(/<[^>]+>/g, '')
      .replace(/^\s*\{[\s\S]*"script"\s*:\s*"/i, '')
      .replace(/"\s*\}\s*$/i, '')
      .replace(/\s+/g, ' ')
      .trim();

    console.log(`[Journey] Meditation script: ${script.split(/\s+/).length} words`);
    return script;
  } catch (error) {
    console.error('[Journey] Meditation script generation failed:', error);
    return `Hello. Take a slow breath in. And let it go. You have been showing up for yourself, day after day, for two weeks now. That matters more than you know. Think about where you were when you started. The weight you were carrying. The thoughts that kept circling. And now, notice where you are. Something has shifted, even if it is small. You sat with discomfort and chose to breathe through it. You asked for calm and found it waiting for you. Every session you completed was a conversation with yourself. A promise kept. Feel the ground beneath you. This steadiness you feel is something you built. It did not happen to you. You created it. ${closingPhrase}`;
  }
}

/**
 * Generate journey meditation audio using the premium pipeline.
 * Returns both the Blob and the URL.
 */
export async function generateJourneyMeditationAudio(
  script: string
): Promise<{ meditation: JourneyMeditation; audioBlob: Blob | null }> {
  const targetDuration = 300;

  try {
    const voiceResult = await generateVoiceAudioStreaming(script);
    console.log('[Journey] Raw speech generated');

    let voiceAudioUrl: string | null = voiceResult.audioUrl;
    let audioBlob: Blob | null = null;

    if (voiceResult.alignment && voiceResult.alignment.length > 0) {
      audioBlob = await injectSilenceBetweenSentences(
        voiceResult.rawBuffer,
        voiceResult.alignment,
        targetDuration
      );

      URL.revokeObjectURL(voiceResult.audioUrl);
      voiceAudioUrl = URL.createObjectURL(audioBlob);
      console.log('[Journey] Silence injection complete');
    } else {
      // No alignment — use raw audio as-is, convert to blob
      const rawBlob = new Blob([voiceResult.rawBuffer], { type: 'audio/mpeg' });
      audioBlob = rawBlob;
    }

    return {
      meditation: { script, voiceAudioUrl, duration: targetDuration, alignment: voiceResult.alignment },
      audioBlob,
    };
  } catch (error) {
    console.error('[Journey] Audio generation failed:', error);
    return {
      meditation: { script, voiceAudioUrl: null, duration: targetDuration },
      audioBlob: null,
    };
  }
}

// ============================================
// IndexedDB Cache (persists audio blobs across visits)
// ============================================

const IDB_NAME = 'zenpal-journey';
const IDB_STORE = 'cache';
const IDB_VERSION = 1;

interface JourneyCacheEntry {
  id: string;                 // `journey-${userId}`
  analysis: JourneyAnalysis;
  meditationScript: string | null;
  audioBlob: Blob | null;
  newestSessionTimestamp: string;   // ISO of newest session when cache was built
  createdAt: string;                // ISO of when cache was created
}

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(IDB_NAME, IDB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(IDB_STORE)) {
        db.createObjectStore(IDB_STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

/** Get cached journey for a user. Returns null if no cache or if new sessions exist. */
export async function getCachedJourney(
  userId: string,
  currentNewestTimestamp: string
): Promise<JourneyCacheEntry | null> {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const store = tx.objectStore(IDB_STORE);
      const req = store.get(`journey-${userId}`);
      req.onsuccess = () => {
        const entry: JourneyCacheEntry | undefined = req.result;
        if (!entry) {
          resolve(null);
          return;
        }
        // Cache is valid if:
        // 1. The newest session hasn't changed (no new meditations done)
        // 2. The recap was AI-generated (not a fallback)
        if (entry.newestSessionTimestamp === currentNewestTimestamp && entry.analysis.recapIsAI) {
          resolve(entry);
        } else {
          console.log('[Journey] Cache invalidated — new sessions or fallback recap');
          resolve(null);
        }
      };
      req.onerror = () => resolve(null);
    });
  } catch {
    return null;
  }
}

/** Store journey cache in IndexedDB (including audio blob). */
export async function setCachedJourney(
  userId: string,
  analysis: JourneyAnalysis,
  meditationScript: string | null,
  audioBlob: Blob | null,
  newestSessionTimestamp: string
): Promise<void> {
  // Only cache if the recap was AI-generated (not fallback)
  if (!analysis.recapIsAI) {
    console.log('[Journey] Skipping cache — recap was fallback, not AI');
    return;
  }

  try {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      const store = tx.objectStore(IDB_STORE);
      const entry: JourneyCacheEntry = {
        id: `journey-${userId}`,
        analysis,
        meditationScript,
        audioBlob,
        newestSessionTimestamp,
        createdAt: new Date().toISOString(),
      };
      const req = store.put(entry);
      req.onsuccess = () => resolve();
      req.onerror = () => reject(req.error);
    });
  } catch (error) {
    console.warn('[Journey] Failed to cache:', error);
  }
}

/** Get the newest session timestamp from a list of sessions. */
export function getNewestSessionTimestamp(sessions: DbSession[]): string {
  if (sessions.length === 0) return '';
  const sorted = [...sessions].sort(
    (a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  );
  return sorted[0].created_at;
}
