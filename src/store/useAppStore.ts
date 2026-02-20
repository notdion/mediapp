import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { AppScreen, MascotState, User, Session, MoodTag, SubscriptionTier, DailyLimit } from '../types';

// Demo sessions for testing the Recent Sessions feature
const getDemoSessions = (): Session[] => {
  const now = new Date();
  return [
    {
      id: 'demo-session-1',
      userId: 'demo-user',
      transcript: 'I had a really stressful day at work today. My boss gave me a tight deadline and I felt overwhelmed.',
      summary: 'Work stress and deadline pressure',
      mood: 'CALMING' as MoodTag,
      meditationScript: 'Take a deep breath and let go of the tension from your workday...',
      audioUrl: null,
      duration: 180,
      createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000).toISOString(), // 1 day ago
    },
    {
      id: 'demo-session-2',
      userId: 'demo-user',
      transcript: 'Feeling grateful today! Had a wonderful morning walk and enjoyed coffee with a friend.',
      summary: 'Gratitude and connection with friend',
      mood: 'GRATEFUL' as MoodTag,
      meditationScript: 'Let this feeling of gratitude wash over you...',
      audioUrl: null,
      duration: 240,
      createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000).toISOString(), // 3 days ago
    },
    {
      id: 'demo-session-3',
      userId: 'demo-user',
      transcript: 'I need to focus on my big presentation tomorrow. Feeling a bit anxious but want to be prepared.',
      summary: 'Preparation for important presentation',
      mood: 'FOCUSED' as MoodTag,
      meditationScript: 'Clear your mind and visualize success...',
      audioUrl: null,
      duration: 300,
      createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
    },
    {
      id: 'demo-session-4',
      userId: 'demo-user',
      transcript: 'Had trouble sleeping last night. Mind was racing with thoughts about everything.',
      summary: 'Sleep difficulties and racing thoughts',
      mood: 'SLEEPY' as MoodTag,
      meditationScript: 'Let your thoughts drift away like clouds...',
      audioUrl: null,
      duration: 360,
      createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString(), // 7 days ago
    },
  ];
};

interface AppState {
  // Onboarding
  hasCompletedOnboarding: boolean;
  setOnboardingComplete: (complete: boolean) => void;
  clearOnboarding: () => void;
  
  // Navigation
  currentScreen: AppScreen;
  setScreen: (screen: AppScreen) => void;
  
  // User
  user: User | null;
  setUser: (user: User | null) => void;
  updateStreak: () => void;
  
  // Mascot
  mascotState: MascotState;
  setMascotState: (state: MascotState) => void;
  
  // Recording
  isRecording: boolean;
  recordingDuration: number;
  audioBlob: Blob | null;
  transcript: string;
  setIsRecording: (recording: boolean) => void;
  setRecordingDuration: (duration: number) => void;
  setAudioBlob: (blob: Blob | null) => void;
  setTranscript: (transcript: string) => void;
  
  // Meditation
  currentMood: MoodTag | null;
  meditationScript: string;
  meditationAudioUrl: string | null;
  isPlaying: boolean;
  playbackProgress: number;
  setCurrentMood: (mood: MoodTag | null) => void;
  setMeditationScript: (script: string) => void;
  setMeditationAudioUrl: (url: string | null) => void;
  setIsPlaying: (playing: boolean) => void;
  setPlaybackProgress: (progress: number) => void;
  
  // Sessions
  sessions: Session[];
  addSession: (session: Session) => void;
  getRecentSessions: (count: number) => Session[];
  
  // Daily limits
  dailyLimit: DailyLimit;
  checkDailyLimit: () => boolean;
  incrementDailySession: () => void;
  resetDailyLimit: () => void;
  
  // Utility
  resetMeditation: () => void;
}

const getDefaultUser = (): User => ({
  id: 'demo-user',
  email: 'demo@zenpal.app',
  name: 'Zen Explorer',
  tier: 'free' as SubscriptionTier,
  currentStreak: 3,
  longestStreak: 7,
  totalSessions: 12,
  lastSessionDate: null,
  streakFreezeAvailable: false,
  createdAt: new Date().toISOString(),
});

const getTodayDateString = () => new Date().toISOString().split('T')[0];

const getDefaultDailyLimit = (): DailyLimit => ({
  canMeditate: true,
  sessionsToday: 0,
  maxSessions: 1,
  nextResetTime: new Date(new Date().setHours(24, 0, 0, 0)).toISOString(),
});

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // Onboarding
      hasCompletedOnboarding: false,
      setOnboardingComplete: (complete) => set({ hasCompletedOnboarding: complete }),
      clearOnboarding: () => set({ 
        hasCompletedOnboarding: false,
        user: getDefaultUser(),
      }),
      
      // Navigation
      currentScreen: 'home',
      setScreen: (screen) => set({ currentScreen: screen }),
      
      // User
      user: getDefaultUser(),
      setUser: (user) => set({ user }),
      updateStreak: () => {
        const { user } = get();
        if (!user) return;
        
        const today = getTodayDateString();
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        
        let newStreak = user.currentStreak;
        
        if (user.lastSessionDate === today) {
          // Already did a session today
          return;
        } else if (user.lastSessionDate === yesterday) {
          // Continuing streak
          newStreak = user.currentStreak + 1;
        } else if (user.lastSessionDate === null) {
          // First session ever
          newStreak = 1;
        } else {
          // Streak broken, start over
          newStreak = 1;
        }
        
        set({
          user: {
            ...user,
            currentStreak: newStreak,
            longestStreak: Math.max(user.longestStreak, newStreak),
            totalSessions: user.totalSessions + 1,
            lastSessionDate: today,
          },
        });
      },
      
      // Mascot
      mascotState: 'idle',
      setMascotState: (mascotState) => set({ mascotState }),
      
      // Recording
      isRecording: false,
      recordingDuration: 0,
      audioBlob: null,
      transcript: '',
      setIsRecording: (isRecording) => set({ isRecording }),
      setRecordingDuration: (recordingDuration) => set({ recordingDuration }),
      setAudioBlob: (audioBlob) => set({ audioBlob }),
      setTranscript: (transcript) => set({ transcript }),
      
      // Meditation
      currentMood: null,
      meditationScript: '',
      meditationAudioUrl: null,
      isPlaying: false,
      playbackProgress: 0,
      setCurrentMood: (currentMood) => set({ currentMood }),
      setMeditationScript: (meditationScript) => set({ meditationScript }),
      setMeditationAudioUrl: (meditationAudioUrl) => set({ meditationAudioUrl }),
      setIsPlaying: (isPlaying) => set({ isPlaying }),
      setPlaybackProgress: (playbackProgress) => set({ playbackProgress }),
      
      // Sessions
      sessions: getDemoSessions(),
      addSession: (session) => set((state) => ({ 
        sessions: [session, ...state.sessions].slice(0, 30) 
      })),
      getRecentSessions: (count) => get().sessions.slice(0, count),
      
      // Daily limits
      dailyLimit: getDefaultDailyLimit(),
      checkDailyLimit: () => {
        const { user, dailyLimit } = get();
        const today = getTodayDateString();
        const lastReset = dailyLimit.nextResetTime;
        
        // Reset if it's a new day
        if (new Date() > new Date(lastReset)) {
          set({ dailyLimit: getDefaultDailyLimit() });
          return true;
        }
        
        // Premium users have unlimited
        if (user?.tier === 'premium') return true;
        
        return dailyLimit.sessionsToday < dailyLimit.maxSessions;
      },
      incrementDailySession: () => {
        const { dailyLimit, user } = get();
        const newCount = dailyLimit.sessionsToday + 1;
        const canMeditate = user?.tier === 'premium' || newCount < dailyLimit.maxSessions;
        
        set({
          dailyLimit: {
            ...dailyLimit,
            sessionsToday: newCount,
            canMeditate,
          },
        });
      },
      resetDailyLimit: () => {
        set({ dailyLimit: getDefaultDailyLimit() });
      },
      
      // Utility
      resetMeditation: () => set({
        isRecording: false,
        recordingDuration: 0,
        audioBlob: null,
        transcript: '',
        currentMood: null,
        meditationScript: '',
        meditationAudioUrl: null,
        isPlaying: false,
        playbackProgress: 0,
        mascotState: 'idle',
      }),
    }),
    {
      name: 'zenpal-storage',
      partialize: (state) => ({
        user: state.user,
        sessions: state.sessions,
        dailyLimit: state.dailyLimit,
      }),
      merge: (persistedState, currentState) => {
        const persisted = persistedState as Partial<AppState>;
        return {
          ...currentState,
          ...persisted,
          // Use demo sessions if persisted sessions array is empty
          sessions: (persisted.sessions && persisted.sessions.length > 0) 
            ? persisted.sessions 
            : getDemoSessions(),
        };
      },
    }
  )
);
