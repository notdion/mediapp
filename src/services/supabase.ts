// Supabase Client Configuration
import { createClient } from '@supabase/supabase-js';
import type { MoodTag, Session } from '../types';

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const SUPABASE_SERVICE_ROLE_KEY = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY;

// Create Supabase client (will be null if not configured)
export const supabase = SUPABASE_URL && SUPABASE_ANON_KEY 
  ? createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
  : null;

// Service role client for admin operations (bypasses RLS)
// Only use for seeding test data - never expose to users
const supabaseAdmin = SUPABASE_URL && SUPABASE_SERVICE_ROLE_KEY
  ? createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY)
  : null;

// ============================================
// Database Types
// ============================================

export interface DbUser {
  id: string;
  email: string;
  name: string;
  tier: 'free' | 'premium';
  current_streak: number;
  longest_streak: number;
  total_sessions: number;
  last_session_date: string | null;
  streak_freeze_available: boolean;
  created_at: string;
  updated_at: string;
}

export interface DbSession {
  id: string;
  user_id: string;
  transcript: string;
  summary: string;
  mood: MoodTag;
  meditation_script: string;
  audio_url: string | null;
  duration: number;
  created_at: string;
}

// ============================================
// User Operations
// ============================================

export async function getUser(userId: string): Promise<DbUser | null> {
  if (!supabase) return null;
  
  const { data, error } = await supabase
    .from('users')
    .select('*')
    .eq('id', userId)
    .single();
  
  if (error) {
    console.error('Error fetching user:', error);
    return null;
  }
  
  return data;
}

export async function createOrUpdateUser(user: Partial<DbUser> & { id: string }): Promise<DbUser | null> {
  if (!supabase) return null;
  
  const { data, error } = await supabase
    .from('users')
    .upsert({
      ...user,
      updated_at: new Date().toISOString(),
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error upserting user:', error);
    return null;
  }
  
  return data;
}

export async function updateUserStreak(userId: string, newStreak: number, longestStreak: number, totalSessions: number): Promise<void> {
  if (!supabase) return;
  
  await supabase
    .from('users')
    .update({
      current_streak: newStreak,
      longest_streak: longestStreak,
      total_sessions: totalSessions,
      last_session_date: new Date().toISOString().split('T')[0],
      updated_at: new Date().toISOString(),
    })
    .eq('id', userId);
}

// ============================================
// Session Operations
// ============================================

export async function saveSession(session: Omit<DbSession, 'created_at'>): Promise<DbSession | null> {
  if (!supabase) return null;
  
  const { data, error } = await supabase
    .from('sessions')
    .insert({
      ...session,
      created_at: new Date().toISOString(),
    })
    .select()
    .single();
  
  if (error) {
    console.error('Error saving session:', error);
    return null;
  }
  
  return data;
}

export async function getUserSessions(userId: string, limit: number = 30): Promise<DbSession[]> {
  if (!supabase) return [];
  
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) {
    console.error('Error fetching sessions:', error);
    return [];
  }
  
  return data || [];
}

export async function getSessionsForDateRange(
  userId: string, 
  startDate: Date, 
  endDate: Date
): Promise<DbSession[]> {
  if (!supabase) return [];
  
  const { data, error } = await supabase
    .from('sessions')
    .select('*')
    .eq('user_id', userId)
    .gte('created_at', startDate.toISOString())
    .lte('created_at', endDate.toISOString())
    .order('created_at', { ascending: true });
  
  if (error) {
    console.error('Error fetching sessions for range:', error);
    return [];
  }
  
  return data || [];
}

// ============================================
// AI Journey - Get Last 2 Weeks of Data
// ============================================

export async function getJourneyData(userId: string): Promise<{
  sessions: DbSession[];
  daysWithData: number;
  hasEnoughData: boolean;
}> {
  const twoWeeksAgo = new Date();
  twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);
  
  // Use admin client if available (for demo mode)
  const client = supabaseAdmin || supabase;
  
  if (!client) {
    return { sessions: [], daysWithData: 0, hasEnoughData: false };
  }

  // For demo mode, use the fixed demo user ID
  const effectiveUserId = userId === 'demo-user' 
    ? '00000000-0000-0000-0000-000000000001' 
    : userId;
  
  const { data, error } = await client
    .from('sessions')
    .select('*')
    .eq('user_id', effectiveUserId)
    .gte('created_at', twoWeeksAgo.toISOString())
    .lte('created_at', new Date().toISOString())
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching journey sessions:', error);
    return { sessions: [], daysWithData: 0, hasEnoughData: false };
  }

  const sessions = data || [];
  
  // Count unique days with sessions
  const uniqueDays = new Set(
    sessions.map(s => new Date(s.created_at).toDateString())
  );
  
  return {
    sessions,
    daysWithData: uniqueDays.size,
    hasEnoughData: uniqueDays.size >= 3, // Minimum 3 days required
  };
}

// ============================================
// Convert between DB and App types
// ============================================

export function dbSessionToAppSession(dbSession: DbSession): Session {
  return {
    id: dbSession.id,
    userId: dbSession.user_id,
    transcript: dbSession.transcript,
    summary: dbSession.summary,
    mood: dbSession.mood,
    meditationScript: dbSession.meditation_script,
    audioUrl: dbSession.audio_url,
    duration: dbSession.duration,
    createdAt: dbSession.created_at,
  };
}

export function appSessionToDbSession(session: Session): Omit<DbSession, 'created_at'> {
  return {
    id: session.id,
    user_id: session.userId,
    transcript: session.transcript,
    summary: session.summary,
    mood: session.mood,
    meditation_script: session.meditationScript,
    audio_url: session.audioUrl,
    duration: session.duration,
  };
}

// ============================================
// Check if Supabase is configured
// ============================================

export function isSupabaseConfigured(): boolean {
  return supabase !== null;
}

// ============================================
// Seed Demo Data for Testing AI Journey
// Creates 4 sessions spread across different days in the last 14 days
// ============================================

export async function seedDemoSessions(userId: string): Promise<{ success: boolean; count: number }> {
  // Use admin client to bypass RLS
  if (!supabaseAdmin) {
    console.log('Supabase admin not configured, cannot seed demo data');
    return { success: false, count: 0 };
  }

  const now = new Date();
  
  // First, ensure we have a user record
  // Generate a deterministic UUID from the demo user ID
  const demoUserId = '00000000-0000-0000-0000-000000000001';
  
  // Upsert demo user
  await supabaseAdmin.from('users').upsert({
    id: demoUserId,
    email: 'demo@zenpal.app',
    name: 'Zen Explorer',
    tier: 'premium',
    current_streak: 1,
    longest_streak: 7,
    total_sessions: 4,
  });
  
  // Demo sessions with different moods and dates
  const demoSessions: Array<Omit<DbSession, 'id'>> = [
    {
      user_id: demoUserId,
      transcript: "I've been feeling really stressed at work lately. There's so much pressure with deadlines and I find it hard to switch off when I get home.",
      summary: 'Work stress and difficulty relaxing',
      mood: 'CALMING',
      meditation_script: 'Take a deep breath and let go of the tension from your workday. Feel your shoulders drop away from your ears. Notice how the day\'s worries can wait until tomorrow.',
      audio_url: null,
      duration: 300,
      created_at: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000).toISOString(), // 2 days ago
    },
    {
      user_id: demoUserId,
      transcript: "Had a great morning walk today and caught up with an old friend. Feeling grateful for the small moments of joy in life.",
      summary: 'Gratitude for friendship and nature',
      mood: 'GRATEFUL',
      meditation_script: 'Let this warm feeling of gratitude wash over you. Remember the smile of your friend, the fresh air of the morning. These moments are treasures.',
      audio_url: null,
      duration: 300,
      created_at: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000).toISOString(), // 5 days ago
    },
    {
      user_id: demoUserId,
      transcript: "I need to prepare for a big presentation next week. Feeling a mix of excitement and nervousness. Want to channel that energy positively.",
      summary: 'Preparation for important presentation',
      mood: 'FOCUSED',
      meditation_script: 'Visualize yourself standing confidently before your audience. Your words flow naturally. You are prepared, you are capable, you are ready.',
      audio_url: null,
      duration: 300,
      created_at: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000).toISOString(), // 8 days ago
    },
    {
      user_id: demoUserId,
      transcript: "Haven't been sleeping well lately. Mind keeps racing with thoughts about everything I need to do. Need some peace before bed.",
      summary: 'Sleep difficulties and racing thoughts',
      mood: 'SLEEPY',
      meditation_script: 'Let your thoughts drift away like clouds in a night sky. Each breath takes you deeper into calm. Your body is heavy, warm, and ready for rest.',
      audio_url: null,
      duration: 300,
      created_at: new Date(now.getTime() - 11 * 24 * 60 * 60 * 1000).toISOString(), // 11 days ago
    },
  ];

  try {
    const { data, error } = await supabaseAdmin
      .from('sessions')
      .insert(demoSessions.map(s => ({
        ...s,
        id: crypto.randomUUID(),
      })))
      .select();

    if (error) {
      console.error('Error seeding demo sessions:', error);
      return { success: false, count: 0 };
    }

    console.log('Seeded', data?.length || 0, 'demo sessions for user', demoUserId);
    return { success: true, count: data?.length || 0 };
  } catch (err) {
    console.error('Failed to seed demo sessions:', err);
    return { success: false, count: 0 };
  }
}

// Clear all sessions for a user (for testing)
export async function clearUserSessions(userId: string): Promise<boolean> {
  if (!supabase) return false;

  try {
    const { error } = await supabase
      .from('sessions')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('Error clearing sessions:', error);
      return false;
    }

    return true;
  } catch (err) {
    console.error('Failed to clear sessions:', err);
    return false;
  }
}
