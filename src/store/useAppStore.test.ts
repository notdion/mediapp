import { beforeEach, describe, expect, it } from 'vitest';
import type { User } from '../types';
import { useAppStore } from './useAppStore';

const baseUser: User = {
  id: 'test-user',
  email: 'test@zenpal.app',
  name: 'Test User',
  tier: 'free',
  currentStreak: 0,
  longestStreak: 0,
  totalSessions: 0,
  lastSessionDate: null,
  streakFreezeAvailable: false,
  createdAt: new Date().toISOString(),
};

describe('useAppStore daily limit logic', () => {
  beforeEach(() => {
    localStorage.clear();
    useAppStore.setState({
      ...useAppStore.getState(),
      user: baseUser,
      dailyLimit: {
        canMeditate: false,
        sessionsToday: 1,
        maxSessions: 1,
        nextResetTime: new Date(Date.now() - 60_000).toISOString(),
      },
    });
  });

  it('checkDailyLimit treats expired limits as reset without mutating state', () => {
    const canMeditate = useAppStore.getState().checkDailyLimit();
    expect(canMeditate).toBe(true);
    expect(useAppStore.getState().dailyLimit.sessionsToday).toBe(1);
  });

  it('refreshDailyLimit resets stale daily limit counters', () => {
    useAppStore.getState().refreshDailyLimit();
    const { dailyLimit } = useAppStore.getState();
    expect(dailyLimit.sessionsToday).toBe(0);
    expect(dailyLimit.maxSessions).toBe(1);
    expect(dailyLimit.canMeditate).toBe(true);
  });

  it('incrementDailySession resets stale counters before incrementing', () => {
    useAppStore.getState().incrementDailySession();
    const { dailyLimit } = useAppStore.getState();
    expect(dailyLimit.sessionsToday).toBe(1);
    expect(dailyLimit.canMeditate).toBe(false);
  });
});
