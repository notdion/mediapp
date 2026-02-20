import type { MoodTag } from '../types';

export interface MoodTheme {
  primary: string;
  secondary: string;
  background: string;
}

export const MOOD_THEMES: Record<MoodTag, MoodTheme> = {
  UPLIFTING: { primary: '#FFD93D', secondary: '#FF9F43', background: '#FFF9E6' },
  CALMING: { primary: '#7CB78B', secondary: '#5A9E6B', background: '#E8F5EC' },
  ENERGIZING: { primary: '#FF9F43', secondary: '#FF6B6B', background: '#FFF4E6' },
  HEALING: { primary: '#5A9E6B', secondary: '#7EC8E3', background: '#E8F5EC' },
  FOCUSED: { primary: '#5A9E6B', secondary: '#7CB78B', background: '#E8F5EC' },
  SLEEPY: { primary: '#B8A9C9', secondary: '#7CB78B', background: '#F5F3FF' },
  ANXIOUS: { primary: '#A8D5BA', secondary: '#7CB78B', background: '#F0F7EE' },
  GRATEFUL: { primary: '#FF6B6B', secondary: '#FF9F43', background: '#FFF0F0' },
  MOTIVATED: { primary: '#FF9F43', secondary: '#FFD93D', background: '#FFF4E6' },
};
