// API Service for OpenAI and ElevenLabs integrations

// Audio stretching no longer needed - pauses are built into script via SSML break tags

import type { MoodTag } from '../types';

const OPENAI_API_KEY = import.meta.env.VITE_OPENAI_API_KEY;
const OPENAI_MODEL = import.meta.env.VITE_OPENAI_MODEL || 'gpt-5-nano';
const ELEVENLABS_API_KEY = import.meta.env.VITE_ELEVENLABS_API_KEY;
const ELEVENLABS_VOICE_ID = import.meta.env.VITE_ELEVENLABS_VOICE_ID || '7AvtJrjTNyBhBxEvNPIZ';

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

// Get a random closing phrase with a pause before it
function getRandomClosingPhrase(): string {
  const phrase = CLOSING_PHRASES[Math.floor(Math.random() * CLOSING_PHRASES.length)];
  return ` <break time="4.0s"/> ${phrase}`;
}

// ============================================
// OpenAI Whisper - Speech to Text
// ============================================

// Check if the blob contains actual audio data (not demo placeholder)
function isValidAudioBlob(blob: Blob): boolean {
  // Demo blobs are tiny (just text "demo audio" = ~10 bytes)
  // Real audio recordings are typically at least a few KB
  return blob.size > 1000;
}

export async function transcribeAudio(audioBlob: Blob): Promise<string> {
  // Check if this is a demo/placeholder blob (no real audio)
  if (!isValidAudioBlob(audioBlob)) {
    console.log('Demo mode detected - using simulated transcript');
    // Return a simulated transcript for demo mode
    const demoTranscripts = [
      "I've been feeling a bit stressed lately with work deadlines and just need to find some calm and peace in my day.",
      "Today was actually pretty good. I'm feeling grateful for the little things and want to maintain this positive energy.",
      "I'm having trouble sleeping and my mind keeps racing with thoughts about everything I need to do tomorrow.",
      "I need to focus on an important project but I keep getting distracted. I want to clear my mind and concentrate.",
      "I've been feeling anxious about some upcoming changes in my life and could use some help calming down.",
    ];
    return demoTranscripts[Math.floor(Math.random() * demoTranscripts.length)];
  }

  const formData = new FormData();
  formData.append('file', audioBlob, 'audio.webm');
  formData.append('model', 'gpt-4o-mini-transcribe');
  formData.append('language', 'en');

  try {
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
      },
      body: formData,
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to transcribe audio');
    }

    const data = await response.json();
    return data.text;
  } catch (error) {
    console.error('Transcription error:', error);
    throw error;
  }
}

// ============================================
// GPT-5-nano - Mood Detection
// ============================================

export async function detectMoodFromTranscript(transcript: string): Promise<MoodTag> {
  const systemPrompt = `You are an emotional intelligence expert. Analyze the user's message and determine their primary emotional state.
  
Return ONLY one of these mood tags (exactly as written):
- UPLIFTING (for happy, positive, joyful feelings)
- CALMING (for needing peace, relaxation, stress relief)
- ENERGIZING (for needing motivation, energy boost)
- HEALING (for emotional pain, sadness, grief)
- FOCUSED (for needing concentration, clarity, productivity)
- SLEEPY (for tiredness, insomnia, needing rest)
- ANXIOUS (for worry, anxiety, nervousness)
- GRATEFUL (for thankfulness, appreciation)
- MOTIVATED (for goal-setting, ambition, determination)

Respond with ONLY the mood tag, nothing else.`;

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: transcript }
        ],
        // Note: gpt-5-nano does not accept temperature parameter
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to detect mood');
    }

    const data = await response.json();
    const moodResponse = data.choices[0].message.content.trim().toUpperCase();
    
    // Validate it's a valid mood tag
    const validMoods: MoodTag[] = ['UPLIFTING', 'CALMING', 'ENERGIZING', 'HEALING', 'FOCUSED', 'SLEEPY', 'ANXIOUS', 'GRATEFUL', 'MOTIVATED'];
    if (validMoods.includes(moodResponse as MoodTag)) {
      return moodResponse as MoodTag;
    }
    
    // Default fallback
    return 'CALMING';
  } catch (error) {
    console.error('Mood detection error:', error);
    return 'CALMING'; // Default fallback
  }
}

// ============================================
// GPT-5-nano - Meditation Script Generation
// ============================================

export async function generateMeditationScript(
  transcript: string,
  mood: MoodTag,
  durationSeconds: number
): Promise<string> {
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
  const seconds = durationSeconds % 60;
  const durationStr = minutes > 0 ? `${minutes} minute${minutes > 1 ? 's' : ''}${seconds > 0 ? ` ${seconds} seconds` : ''}` : `${seconds} seconds`;
  
  const systemPrompt = `You are a compassionate meditation guide creating personalized meditations. Your voice is warm, soothing, and nurturing.

Create a meditation script based on:
- User's current state: They shared what's on their mind
- Detected mood: ${mood}
- Target duration: ${durationStr}

CRITICAL TIMING REQUIREMENTS:
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
- Acknowledge their mood: ${mood}

EXAMPLE (30 words, 48 seconds of pauses = 1 minute total):
"Welcome. <break time="3.0s"/> Take a deep breath in. <break time="5.0s"/> And slowly release. <break time="5.0s"/> Feel your body relaxing. <break time="4.0s"/> Let go of any tension. <break time="5.0s"/> You are safe here. <break time="4.0s"/> Breathe in peace. <break time="6.0s"/> Breathe out stress. <break time="5.0s"/> You are calm. <break time="4.0s"/> You are at peace. <break time="7.0s"/>"`;


  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: `The user shared: "${transcript}"\n\nCreate a ${mood.toLowerCase()} meditation script for them.` }
        ],
        // Note: gpt-5-nano does not accept temperature parameter
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.error?.message || 'Failed to generate meditation script');
    }

    const data = await response.json();
    const script = data.choices[0].message.content.trim();
    
    // Append a random closing phrase to bring the user back
    return script + getRandomClosingPhrase();
  } catch (error) {
    console.error('Script generation error:', error);
    throw error;
  }
}

// ============================================
// ElevenLabs - Text to Speech
// ============================================

export async function generateVoiceAudio(script: string): Promise<Blob> {
  console.log('Generating voice audio for script length:', script.length, 'characters');
  console.log('Using voice ID:', ELEVENLABS_VOICE_ID);
  console.log('API Key present:', !!ELEVENLABS_API_KEY);
  
  if (!ELEVENLABS_API_KEY) {
    throw new Error('ElevenLabs API key is not configured');
  }
  
  try {
    // Script already contains SSML break tags like <break time="3.0s"/>
    // ElevenLabs natively supports these tags, so pass through directly
    // Also convert any legacy pause markers just in case
    const processedScript = script
      .replace(/\[long pause\]/gi, '<break time="7.0s"/>')
      .replace(/\[pause\]/gi, '<break time="3.0s"/>')
      .replace(/\.\.\.\s*\.\.\.\s*\.\.\.\s*\.\.\./g, '<break time="5.0s"/>') // 4+ ellipses
      .replace(/\.\.\.\s*\.\.\.\s*\.\.\./g, '<break time="3.0s"/>') // 3 ellipses
      .replace(/\.\.\.\s*\.\.\./g, '<break time="2.0s"/>') // 2 ellipses
      .replace(/\.\.\./g, '<break time="1.0s"/>'); // single ellipsis
    
    const requestBody = {
      text: processedScript,
      text_type: 'ssml',
      model_id: 'eleven_multilingual_v2',
      output_format: 'mp3_44100_128',
      voice_settings: {
        stability: 0.7,        // Higher stability for calmer, more consistent voice
        similarity_boost: 0.5, // Lower to sound more natural/relaxed
        style: 0.0,            // No style exaggeration
        use_speaker_boost: false, // Softer voice without boost
        speed: 0.85,           // Slightly slower speech rate
      },
    };
    
    console.log('ElevenLabs request:', JSON.stringify(requestBody, null, 2));
    
    const response = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${ELEVENLABS_VOICE_ID}`, {
      method: 'POST',
      headers: {
        'Accept': 'audio/mpeg',
        'Content-Type': 'application/json',
        'xi-api-key': ELEVENLABS_API_KEY,
      },
      body: JSON.stringify(requestBody),
    });

    console.log('ElevenLabs response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('ElevenLabs error response:', errorText);
      throw new Error(`ElevenLabs API error (${response.status}): ${errorText}`);
    }

    const audioBlob = await response.blob();
    console.log('Voice audio generated, blob size:', audioBlob.size, 'bytes');
    
    if (audioBlob.size < 1000) {
      throw new Error('Generated audio is too small, likely failed');
    }
    
    return audioBlob;
  } catch (error) {
    console.error('Voice generation error:', error);
    throw error;
  }
}

// ============================================
// Combined Pipeline
// ============================================

export interface MeditationResult {
  transcript: string;
  mood: MoodTag;
  script: string;
  voiceAudioUrl: string | null;
}

export async function createMeditation(
  audioBlob: Blob,
  durationSeconds: number,
  onProgress?: (step: string) => void
): Promise<MeditationResult> {
  console.log('=== Starting meditation creation ===');
  console.log('Duration requested:', durationSeconds, 'seconds');
  console.log('Audio blob size:', audioBlob.size, 'bytes');
  
  // Step 1: Transcribe audio
  onProgress?.('Listening to your thoughts...');
  console.log('Step 1: Transcribing audio...');
  const transcript = await transcribeAudio(audioBlob);
  console.log('Transcript:', transcript);
  
  // Step 2: Detect mood
  onProgress?.('Understanding your feelings...');
  console.log('Step 2: Detecting mood...');
  const mood = await detectMoodFromTranscript(transcript);
  console.log('Detected mood:', mood);
  
  // Step 3: Generate meditation script
  onProgress?.('Crafting your meditation...');
  console.log('Step 3: Generating meditation script...');
  const script = await generateMeditationScript(transcript, mood, durationSeconds);
  console.log('Script generated, length:', script.length, 'characters');
  console.log('Script preview:', script.substring(0, 200) + '...');
  
  // Step 4: Generate voice audio (pauses are built into script via SSML break tags)
  onProgress?.('Bringing your meditation to life...');
  console.log('Step 4: Generating voice audio with ElevenLabs...');
  let voiceAudioUrl: string | null = null;
  try {
    const voiceBlob = await generateVoiceAudio(script);
    console.log('Voice audio generated, blob size:', voiceBlob.size);
    
    // No stretching needed - pauses are built into the script
    voiceAudioUrl = URL.createObjectURL(voiceBlob);
    console.log('Voice audio URL created:', voiceAudioUrl);
  } catch (error) {
    console.error('Voice generation failed, will use text-only mode:', error);
    if (error instanceof Error) {
      console.error('Error message:', error.message);
      console.error('Error stack:', error.stack);
    }
  }
  
  console.log('=== Meditation creation complete ===');
  console.log('Voice audio URL:', voiceAudioUrl ? 'Generated' : 'Not generated (text-only mode)');
  
  return {
    transcript,
    mood,
    script,
    voiceAudioUrl,
  };
}

// ============================================
// Utility: Create summary from transcript
// ============================================

export async function generateSummary(transcript: string): Promise<string> {
  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: OPENAI_MODEL,
        messages: [
          { 
            role: 'system', 
            content: 'Summarize the following user message in 10 words or less. Focus on the main emotion or topic.' 
          },
          { role: 'user', content: transcript }
        ],
        // Note: gpt-5-nano does not accept temperature parameter
      }),
    });

    if (!response.ok) {
      return 'Personal meditation session';
    }

    const data = await response.json();
    return data.choices[0].message.content.trim();
  } catch {
    return 'Personal meditation session';
  }
}
