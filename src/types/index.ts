export type MoodTag = 
  | 'UPLIFTING'
  | 'CALMING'
  | 'ENERGIZING'
  | 'HEALING'
  | 'FOCUSED'
  | 'SLEEPY'
  | 'ANXIOUS'
  | 'GRATEFUL'
  | 'MOTIVATED';

export type SubscriptionTier = 'free' | 'premium';

export type MascotState = 'idle' | 'listening' | 'thinking' | 'success' | 'sleeping' | 'celebrating' | 'meditating';

export type AppScreen = 'home' | 'recording' | 'processing' | 'meditation' | 'complete' | 'paywall' | 'profile' | 'sessionPlayback' | 'journey';

export interface User {
  id: string;
  email: string;
  name: string;
  tier: SubscriptionTier;
  currentStreak: number;
  longestStreak: number;
  totalSessions: number;
  lastSessionDate: string | null;
  streakFreezeAvailable: boolean;
  createdAt: string;
}

export interface Session {
  id: string;
  userId: string;
  transcript: string;
  summary: string;
  mood: MoodTag;
  meditationScript: string;
  audioUrl: string | null;
  duration: number;
  createdAt: string;
}

export interface DailyLimit {
  canMeditate: boolean;
  sessionsToday: number;
  maxSessions: number;
  nextResetTime: string;
}

export interface MeditationConfig {
  voiceProfile: 'alloy' | 'shimmer' | 'echo' | 'fable' | 'onyx' | 'nova';
  maxInputSeconds: number;
  meditationDuration: 'short' | 'extended';
}

export const MOOD_COLORS: Record<MoodTag, string> = {
  UPLIFTING: '#FFD93D',   // Golden yellow — sunshine, joy
  CALMING: '#54C7FC',     // Sky blue — peace, tranquility
  ENERGIZING: '#FF9F43',  // Orange — energy, vitality
  HEALING: '#58CC9C',     // Mint/teal — renewal, recovery
  FOCUSED: '#6C47FF',     // Indigo — concentration, clarity
  SLEEPY: '#9B7DFF',      // Lavender — rest, drowsy
  ANXIOUS: '#F97066',     // Coral red — tension, unease
  GRATEFUL: '#FF6B6B',    // Rose — love, appreciation
  MOTIVATED: '#F59E0B',   // Amber — drive, determination
};

/** Human-readable mood labels for display */
export const MOOD_LABELS: Record<MoodTag, string> = {
  UPLIFTING: 'Uplifting',
  CALMING: 'Calm',
  ENERGIZING: 'Energized',
  HEALING: 'Healing',
  FOCUSED: 'Focused',
  SLEEPY: 'Sleepy',
  ANXIOUS: 'Anxious',
  GRATEFUL: 'Grateful',
  MOTIVATED: 'Motivated',
};

export const MOOD_TRACKS: Record<MoodTag, string> = {
  UPLIFTING: '/audio/uplifting.mp3',
  CALMING: '/audio/calming.mp3',
  ENERGIZING: '/audio/energizing.mp3',
  HEALING: '/audio/healing.mp3',
  FOCUSED: '/audio/focused.mp3',
  SLEEPY: '/audio/sleepy.mp3',
  ANXIOUS: '/audio/anxious.mp3',
  GRATEFUL: '/audio/grateful.mp3',
  MOTIVATED: '/audio/motivated.mp3',
};
