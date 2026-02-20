import { motion } from 'framer-motion';
import { ArrowLeft, Crown, User, Calendar, Target, TrendingUp, ChevronRight, Play, Database, RotateCcw } from 'lucide-react';
import { useState, useEffect } from 'react';
import { profileSlothImages } from '../mascot/slothAssets';
import { Button } from '../ui/Button';
import { useAppStore } from '../../store/useAppStore';
import { seedDemoSessions, isSupabaseConfigured } from '../../services/supabase';
import type { Session } from '../../types';
import '../mascot/ZenBuddy.css';

interface ProfileScreenProps {
  onBack: () => void;
  onUpgrade: () => void;
  onPlaySession?: (session: Session) => void;
}

export function ProfileScreen({ onBack, onUpgrade, onPlaySession }: ProfileScreenProps) {
  const { user, sessions, setUser, resetDailyLimit, clearOnboarding } = useAppStore();
  const [currentSlothIndex, setCurrentSlothIndex] = useState(0);
  const [isSeeding, setIsSeeding] = useState(false);
  const [seedResult, setSeedResult] = useState<string | null>(null);
  
  // Cycle through standing, meditating, sleeping every minute (random choice)
  useEffect(() => {
    const interval = setInterval(() => {
      // Pick a random different index
      let newIndex: number;
      do {
        newIndex = Math.floor(Math.random() * profileSlothImages.length);
      } while (newIndex === currentSlothIndex && profileSlothImages.length > 1);
      setCurrentSlothIndex(newIndex);
    }, 60000); // 60 seconds
    
    return () => clearInterval(interval);
  }, [currentSlothIndex]);
  
  const stats = [
    { icon: <Calendar size={20} />, label: 'Total Sessions', value: user?.totalSessions || 0 },
    { icon: <Target size={20} />, label: 'Current Streak', value: `${user?.currentStreak || 0} days` },
    { icon: <TrendingUp size={20} />, label: 'Longest Streak', value: `${user?.longestStreak || 0} days` },
  ];

  const toggleTier = () => {
    if (!user) return;
    setUser({
      ...user,
      tier: user.tier === 'free' ? 'premium' : 'free',
    });
  };

  const handleResetLimit = () => {
    resetDailyLimit();
  };

  const handleSeedDemoData = async () => {
    if (!user?.id) return;
    setIsSeeding(true);
    setSeedResult(null);
    
    try {
      const result = await seedDemoSessions();
      if (result.success) {
        setSeedResult(`✓ Added ${result.count} demo sessions`);
      } else {
        setSeedResult('✗ Failed to seed data');
      }
    } catch {
      setSeedResult('✗ Error seeding data');
    }
    
    setIsSeeding(false);
    // Clear message after 3 seconds
    setTimeout(() => setSeedResult(null), 3000);
  };

  const handleSessionClick = (session: Session) => {
    // Free users cannot replay sessions - show paywall instead
    if (user?.tier === 'free') {
      onUpgrade();
      return;
    }
    
    if (onPlaySession) {
      onPlaySession(session);
    }
  };

  return (
    <div className="profile-screen">
      {/* Header */}
      <motion.header 
        className="profile-header"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <button className="back-button" onClick={onBack}>
          <ArrowLeft size={24} />
        </button>
        <h1 className="header-title">Profile</h1>
        <div style={{ width: 44 }} />
      </motion.header>

      <div className="profile-content">
        {/* User Info */}
        <motion.div 
          className="user-section"
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div className="avatar-container">
            <div className="zen-buddy-container" style={{ width: 200, height: 200 }}>
              <div className="zen-buddy-wrapper animate-float">
                <motion.img
                  key={currentSlothIndex}
                  src={profileSlothImages[currentSlothIndex]}
                  alt="ZenPal Sloth"
                  className="zen-buddy-image"
                  width={200}
                  height={200}
                  draggable={false}
                  initial={{ opacity: 0.8 }}
                  animate={{ opacity: 1 }}
                  transition={{ duration: 0.5 }}
                />
              </div>
            </div>
          </div>
          
          <h2 className="user-name">{user?.name}</h2>
          <p className="user-email">{user?.email}</p>
          
          {user?.tier === 'premium' ? (
            <div className="premium-badge">
              <Crown size={14} />
              Premium Member
            </div>
          ) : (
            <button className="tier-badge" onClick={onUpgrade}>
              <User size={14} />
              Free Account
              <ChevronRight size={14} />
            </button>
          )}
        </motion.div>

        {/* Stats Grid */}
        <motion.div 
          className="stats-section"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="section-title">Your Progress</h3>
          <div className="stats-grid">
            {stats.map((stat, index) => (
              <motion.div 
                key={index}
                className="stat-card"
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ delay: 0.3 + index * 0.1 }}
              >
                <div className="stat-icon">{stat.icon}</div>
                <span className="stat-value">{stat.value}</span>
                <span className="stat-label">{stat.label}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Recent Sessions */}
        {sessions.length > 0 && (
          <motion.div 
            className="sessions-section"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.4 }}
          >
            <div className="section-header">
              <h3 className="section-title">Recent Sessions</h3>
              <span className="section-hint">- Click to Play</span>
            </div>
            <div className="sessions-list">
              {sessions.slice(0, 5).map((session) => (
                <motion.button 
                  key={session.id} 
                  className="session-item"
                  onClick={() => handleSessionClick(session)}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                >
                  <div className="session-mood" style={{ background: getMoodColor(session.mood) }} />
                  <div className="session-info">
                    <span className="session-date">
                      {new Date(session.createdAt).toLocaleDateString('en-US', {
                        weekday: 'short',
                        month: 'short',
                        day: 'numeric',
                      })}
                    </span>
                    <span className="session-summary">
                      {session.summary.slice(0, 40)}...
                    </span>
                  </div>
                  <div className="session-play-indicator">
                    <Play size={14} />
                  </div>
                  <span className="session-mood-tag">{session.mood.toLowerCase()}</span>
                </motion.button>
              ))}
            </div>
          </motion.div>
        )}

        {/* Upgrade Banner (for free users) */}
        {user?.tier === 'free' && (
          <motion.div 
            className="upgrade-section"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.5 }}
          >
            <div className="upgrade-content">
              <Crown size={32} className="upgrade-icon" />
              <h3>Unlock ZenPal Premium</h3>
              <p>Get unlimited meditations, AI memory, and more.</p>
              <Button variant="gold" fullWidth onClick={onUpgrade}>
                Upgrade Now
              </Button>
            </div>
          </motion.div>
        )}

        {/* Demo Toggle (for testing) */}
        <motion.div 
          className="demo-section"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.6 }}
        >
          <p className="demo-note">Demo Controls</p>
          <div className="demo-buttons">
            <Button 
              variant="ghost" 
              size="sm" 
              onClick={toggleTier}
            >
              Toggle to {user?.tier === 'free' ? 'Premium' : 'Free'}
            </Button>
            <Button
              variant="ghost"
              size="sm"
              onClick={handleResetLimit}
            >
              Reset Daily Limit
            </Button>
          </div>
          {isSupabaseConfigured() && (
            <div className="demo-buttons" style={{ marginTop: 8 }}>
              <Button
                variant="ghost"
                size="sm"
                onClick={handleSeedDemoData}
                disabled={isSeeding}
              >
                <Database size={14} />
                {isSeeding ? 'Seeding...' : 'Seed AI Journey Data'}
              </Button>
            </div>
          )}
          {seedResult && (
            <p className="seed-result" style={{ 
              color: seedResult.startsWith('✓') ? '#5A9E6B' : '#FF6B6B',
              fontSize: '0.75rem',
              fontWeight: 600,
              marginTop: 8
            }}>
              {seedResult}
            </p>
          )}
          <div className="demo-buttons" style={{ marginTop: 8 }}>
            <Button
              variant="ghost"
              size="sm"
              onClick={clearOnboarding}
            >
              <RotateCcw size={14} />
              Clear Onboarding
            </Button>
          </div>
        </motion.div>
      </div>

      <style>{`
        .profile-screen {
          display: flex;
          flex-direction: column;
          min-height: 100%;
          background: linear-gradient(180deg, #FAFFF8 0%, #E8F5EC 100%);
        }

        .profile-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
        }

        .back-button {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: white;
          color: #6C7D6C;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }

        .header-title {
          font-size: 1.25rem;
          font-weight: 800;
          color: #1A2E1A;
        }

        .profile-content {
          flex: 1;
          padding: 0 20px 40px;
          display: flex;
          flex-direction: column;
          gap: 24px;
        }

        .user-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          padding: 20px;
          background: white;
          border-radius: 24px;
          box-shadow: 0 4px 20px rgba(90, 158, 107, 0.1);
        }

        .avatar-container {
          margin-bottom: 12px;
        }

        .user-name {
          font-size: 1.5rem;
          font-weight: 900;
          color: #1A2E1A;
          margin-bottom: 4px;
        }

        .user-email {
          font-size: 0.875rem;
          font-weight: 600;
          color: #6C7D6C;
          margin-bottom: 12px;
        }

        .premium-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background: linear-gradient(135deg, #FFD93D 0%, #FF9F43 100%);
          color: #1A2E1A;
          font-size: 0.8125rem;
          font-weight: 800;
          border-radius: 20px;
        }

        .tier-badge {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 16px;
          background: rgba(90, 158, 107, 0.1);
          color: #5A9E6B;
          font-size: 0.8125rem;
          font-weight: 700;
          border-radius: 20px;
          transition: all 0.2s ease;
        }

        .tier-badge:hover {
          background: rgba(90, 158, 107, 0.2);
        }

        .section-header {
          display: flex;
          align-items: baseline;
          gap: 8px;
          margin-bottom: 12px;
        }

        .section-title {
          font-size: 1rem;
          font-weight: 800;
          color: #1A2E1A;
          margin-bottom: 0;
        }

        .section-hint {
          font-size: 0.75rem;
          font-weight: 600;
          color: #ADB8AD;
          font-style: italic;
        }

        .stats-section .section-title {
          margin-bottom: 12px;
        }

        .stats-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }

        .stat-card {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 6px;
          padding: 16px 12px;
          background: white;
          border-radius: 16px;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.06);
        }

        .stat-icon {
          width: 40px;
          height: 40px;
          border-radius: 12px;
          background: linear-gradient(135deg, #5A9E6B 0%, #7CB78B 100%);
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .stat-value {
          font-size: 1.25rem;
          font-weight: 900;
          color: #1A2E1A;
        }

        .stat-label {
          font-size: 0.6875rem;
          font-weight: 600;
          color: #6C7D6C;
          text-align: center;
        }

        .sessions-list {
          display: flex;
          flex-direction: column;
          gap: 8px;
        }

        .session-item {
          display: flex;
          align-items: center;
          gap: 12px;
          padding: 12px 16px;
          background: white;
          border-radius: 12px;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.04);
          border: none;
          width: 100%;
          text-align: left;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .session-item:hover {
          box-shadow: 0 4px 12px rgba(90, 158, 107, 0.15);
        }

        .session-mood {
          width: 8px;
          height: 40px;
          border-radius: 4px;
          flex-shrink: 0;
        }

        .session-info {
          flex: 1;
          display: flex;
          flex-direction: column;
          gap: 2px;
          min-width: 0;
        }

        .session-date {
          font-size: 0.8125rem;
          font-weight: 700;
          color: #1A2E1A;
        }

        .session-summary {
          font-size: 0.75rem;
          font-weight: 600;
          color: #6C7D6C;
          white-space: nowrap;
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .session-play-indicator {
          width: 28px;
          height: 28px;
          border-radius: 50%;
          background: rgba(90, 158, 107, 0.1);
          color: #5A9E6B;
          display: flex;
          align-items: center;
          justify-content: center;
          flex-shrink: 0;
        }

        .session-mood-tag {
          font-size: 0.6875rem;
          font-weight: 700;
          color: #5A9E6B;
          padding: 4px 10px;
          background: rgba(90, 158, 107, 0.1);
          border-radius: 10px;
          text-transform: capitalize;
          flex-shrink: 0;
        }

        .upgrade-section {
          padding: 24px;
          background: linear-gradient(135deg, #5A9E6B 0%, #7CB78B 100%);
          border-radius: 24px;
          box-shadow: 0 4px 20px rgba(90, 158, 107, 0.3);
        }

        .upgrade-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          text-align: center;
          gap: 12px;
        }

        .upgrade-icon {
          color: #FFD93D;
        }

        .upgrade-content h3 {
          font-size: 1.25rem;
          font-weight: 900;
          color: white;
        }

        .upgrade-content p {
          font-size: 0.875rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.8);
          margin-bottom: 8px;
        }

        .demo-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 16px;
          border-top: 1px dashed #C8E6CF;
        }

        .demo-note {
          font-size: 0.75rem;
          font-weight: 600;
          color: #ADB8AD;
          text-transform: uppercase;
          letter-spacing: 0.1em;
        }

        .demo-buttons {
          display: flex;
          gap: 8px;
        }
      `}</style>
    </div>
  );
}

function getMoodColor(mood: string): string {
  const colors: Record<string, string> = {
    UPLIFTING: '#FFD93D',
    CALMING: '#7CB78B',
    ENERGIZING: '#FF9F43',
    HEALING: '#5A9E6B',
    FOCUSED: '#5A9E6B',
    SLEEPY: '#B8A9C9',
    ANXIOUS: '#A8D5BA',
    GRATEFUL: '#FF6B6B',
    MOTIVATED: '#FF9F43',
  };
  return colors[mood] || '#5A9E6B';
}
