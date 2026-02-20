import { motion } from 'framer-motion';
import { Crown, Settings, Calendar, Sparkles } from 'lucide-react';
import { useState, useEffect } from 'react';
import { ZenBuddy } from '../mascot/ZenBuddy';
import { StreakDisplay } from '../ui/StreakDisplay';
import { RecordButton } from '../ui/RecordButton';
import { Button } from '../ui/Button';
import { useAppStore } from '../../store/useAppStore';

interface HomeScreenProps {
  onStartRecording: () => void;
  onOpenJourney?: () => void;
  journeyAvailable?: boolean; // True if user has 3+ days of data in last 2 weeks
}

// Cycling welcome phrases (before meditation)
const WELCOME_PHRASES = [
  "Ready for some zen? 🧘‍♀️",
  "Let's catch some Zen ✨",
  "Ready to find your calm? 🌿",
  "Time for a peaceful moment? 💚",
  "Let's meditate together! 🦥",
  "Your tranquility awaits 🌸",
  "Shall we find inner peace? ☁️",
  "Ready to unwind? 🍃",
  "Let's breathe and be present 🌱",
  "Your zen moment awaits ✨",
];

// Congrats phrases (after meditation completion)
const CONGRATS_PHRASES = [
  "Amazing job today! 🌟",
  "You're on fire! 🔥",
  "Keep that zen flowing! ✨",
  "Proud of you! 💚",
  "Way to go, zen master! 🧘‍♀️",
  "You're crushing it! 🎉",
  "Inner peace unlocked! 🔓",
  "That was beautiful! 🌸",
];

// Best streak phrases
const STREAK_PHRASES = [
  "New personal best! 🏆",
  "You're on your best streak! 🔥",
  "Record-breaking zen! ⭐",
  "You're unstoppable! 💪",
];

export function HomeScreen({ onStartRecording, onOpenJourney, journeyAvailable = false }: HomeScreenProps) {
  const { user, mascotState, dailyLimit, checkDailyLimit, setScreen } = useAppStore();
  const isPremium = user?.tier === 'premium';
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [congratsVariant, setCongratsVariant] = useState(0);
  
  const canMeditate = checkDailyLimit();
  const greeting = getGreeting();
  const isOnBestStreak = user?.currentStreak === user?.longestStreak && (user?.currentStreak || 0) > 0;
  const hasCompletedSession = mascotState === 'success' || !canMeditate;
  
  // Cycle through phrases every 60 seconds (1 minute)
  useEffect(() => {
    const interval = setInterval(() => {
      if (hasCompletedSession) {
        // Cycle through congrats/streak phrases and alternate image variant
        const phrases = isOnBestStreak ? STREAK_PHRASES : CONGRATS_PHRASES;
        setPhraseIndex((prev) => (prev + 1) % phrases.length);
        setCongratsVariant((prev) => (prev + 1) % 2);
      } else {
        setPhraseIndex((prev) => (prev + 1) % WELCOME_PHRASES.length);
      }
    }, 60000); // 60 seconds
    
    return () => clearInterval(interval);
  }, [hasCompletedSession, isOnBestStreak]);
  
  const handleRecordPress = () => {
    if (!canMeditate) {
      setScreen('paywall');
      return;
    }
    onStartRecording();
  };

  // Determine current phrase based on state
  let currentPhrase: string;
  if (hasCompletedSession) {
    if (isOnBestStreak) {
      currentPhrase = STREAK_PHRASES[phraseIndex % STREAK_PHRASES.length];
    } else {
      currentPhrase = CONGRATS_PHRASES[phraseIndex % CONGRATS_PHRASES.length];
    }
  } else {
    currentPhrase = WELCOME_PHRASES[phraseIndex % WELCOME_PHRASES.length];
  }

  // Determine mascot state - use 'success' with variant for congrats rotation
  // Use 'idle' (standing) for before meditation
  const displayMascotState = hasCompletedSession ? 'success' : 'idle';

  return (
    <div className="home-screen">
      {/* Light top section with wave as bottom edge */}
      <div className="top-section">
        <div className="top-content">
          {/* Header */}
          <motion.header 
            className="home-header"
            initial={{ y: -20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.1 }}
          >
            <div className="header-left">
              <span className="greeting">{greeting}</span>
              <h1 className="user-name">{user?.name || 'Friend'}</h1>
            </div>
            <div className="header-right">
              {user?.tier === 'premium' ? (
                <div className="premium-badge">
                  <Crown size={14} />
                  PRO
                </div>
              ) : null}
              <button className="icon-button" onClick={() => setScreen('profile')}>
                <Settings size={22} />
              </button>
            </div>
          </motion.header>

          {/* Streak Display */}
          <motion.div 
            className="streak-section"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2 }}
          >
            <StreakDisplay 
              currentStreak={user?.currentStreak || 0} 
              longestStreak={user?.longestStreak}
              showRecord
            />
          </motion.div>

          {/* Mascot Section with speech bubble on top */}
          <motion.div 
            className="mascot-section"
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.3, type: 'spring', damping: 15 }}
          >
            {/* Speech bubble positioned on top of the sloth */}
            <motion.div 
              className="speech-bubble"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <motion.p
                key={`${hasCompletedSession}-${phraseIndex}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              >
                {currentPhrase}
              </motion.p>
            </motion.div>
            
            <div className="zen-buddy-scale-wrapper">
              <ZenBuddy 
                state={displayMascotState} 
                size="sm" 
                variant={hasCompletedSession ? congratsVariant : undefined}
              />
            </div>
          </motion.div>
        </div>

        {/* Wave as bottom edge of top section */}
        <div className="wave-edge">
          <svg viewBox="0 0 1200 50" preserveAspectRatio="none">
            <path 
              d="M0,0 Q600,45 1200,0 L1200,50 L0,50 Z" 
              fill="#2D5A3D"
            />
          </svg>
        </div>
      </div>

      {/* Dark green bottom section - Primary focus area */}
      <div className="bottom-section">
        {/* Record Button Section - Main CTA */}
        <motion.div 
          className="record-section"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <div className="record-button-wrapper">
            <RecordButton 
              isRecording={false}
              onPress={handleRecordPress}
              disabled={false}
            />
          </div>
          
          <motion.p 
            className="record-instruction"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.6 }}
          >
            {canMeditate 
              ? 'Tap to tell me about your day'
              : 'Come back tomorrow for your next session'
            }
          </motion.p>
          
          {user?.tier === 'free' && (
            <motion.div 
              className="daily-limit-info"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.7 }}
            >
              <Calendar size={14} />
              <span>{dailyLimit.sessionsToday}/{dailyLimit.maxSessions} daily session used</span>
            </motion.div>
          )}
        </motion.div>

        {/* AI Journey Button (for premium users) */}
        {isPremium && (
          <motion.div 
            className="journey-banner"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <div className="banner-content">
              <Sparkles size={16} className="journey-icon" />
              <div className="banner-text">
                <span className="banner-title">AI Journey</span>
                <span className="banner-subtitle">
                  {journeyAvailable ? 'See your wellness insights' : 'Need 3+ days of data'}
                </span>
              </div>
            </div>
            <Button 
              variant="primary" 
              size="sm" 
              onClick={onOpenJourney}
              disabled={!journeyAvailable}
            >
              {journeyAvailable ? 'View' : 'Soon'}
            </Button>
          </motion.div>
        )}

        {/* Upgrade Banner (for free users) */}
        {!isPremium && (
          <motion.div 
            className="upgrade-banner"
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.8 }}
          >
            <div className="banner-content">
              <Crown size={16} className="banner-icon" />
              <div className="banner-text">
                <span className="banner-title">Unlock Customization!</span>
                <span className="banner-subtitle">Plus AI memory & more</span>
              </div>
            </div>
            <Button variant="gold" size="sm" onClick={() => setScreen('paywall')}>
              Upgrade
            </Button>
          </motion.div>
        )}
      </div>

      <style>{`
        .home-screen {
          display: flex;
          flex-direction: column;
          height: 100%;
          overflow: hidden;
        }

        .top-section {
          background: linear-gradient(180deg, #FAFFF8 0%, #E8F5EC 100%);
          flex-shrink: 0;
          display: flex;
          flex-direction: column;
        }

        .top-content {
          padding: 12px 20px 8px;
        }

        .home-header {
          display: flex;
          justify-content: space-between;
          align-items: flex-start;
          margin-bottom: 6px;
        }

        .header-left {
          display: flex;
          flex-direction: column;
          gap: 1px;
        }

        .greeting {
          font-size: 0.75rem;
          font-weight: 600;
          color: #6C7D6C;
        }

        .user-name {
          font-size: 1.125rem;
          font-weight: 900;
          color: #1A2E1A;
        }

        .header-right {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .premium-badge {
          display: flex;
          align-items: center;
          gap: 4px;
          padding: 5px 8px;
          background: linear-gradient(135deg, #FFD93D 0%, #FF9F43 100%);
          color: #1A2E1A;
          font-size: 0.625rem;
          font-weight: 800;
          border-radius: 6px;
          text-transform: uppercase;
        }

        .icon-button {
          width: 36px;
          height: 36px;
          border-radius: 10px;
          background: white;
          color: #6C7D6C;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }

        .streak-section {
          display: flex;
          justify-content: center;
          margin-bottom: 6px;
        }

        .mascot-section {
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .speech-bubble {
          padding: 8px 16px;
          background: white;
          border-radius: 16px;
          border: 2px solid #2D5A3D;
          box-shadow: 0 3px 12px rgba(45, 90, 61, 0.15);
          margin-bottom: -12px;
          position: absolute;
          top: 188px;
          z-index: 10;
        }

        .zen-buddy-scale-wrapper {
          transform: scale(1.3);
          transform-origin: top center;
          margin-top: 12px;
        }

        .speech-bubble::after {
          content: '';
          position: absolute;
          bottom: -9px;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 9px solid transparent;
          border-right: 9px solid transparent;
          border-top: 9px solid #2D5A3D;
        }

        .speech-bubble::before {
          content: '';
          position: absolute;
          bottom: -6px;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 7px solid transparent;
          border-right: 7px solid transparent;
          border-top: 7px solid white;
          z-index: 1;
        }

        .speech-bubble p {
          font-size: 0.8125rem;
          font-weight: 700;
          color: #1A2E1A;
          text-align: center;
          line-height: 1.3;
          white-space: nowrap;
        }

        .wave-edge {
          width: 100%;
          height: 35px;
          flex-shrink: 0;
        }

        .wave-edge svg {
          width: 100%;
          height: 100%;
          display: block;
        }

        .bottom-section {
          flex: 1;
          background: #2D5A3D;
          padding: 16px 20px 24px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-between;
        }

        .record-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 12px;
          flex: 1;
          justify-content: center;
        }

        .record-button-wrapper {
          transform: scale(1.1);
        }

        .record-instruction {
          font-size: 0.9375rem;
          font-weight: 700;
          color: rgba(255, 255, 255, 0.9);
          text-align: center;
        }

        .daily-limit-info {
          display: flex;
          align-items: center;
          gap: 6px;
          font-size: 0.75rem;
          font-weight: 600;
          color: #A8D5BA;
          padding: 6px 12px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 16px;
        }

        .upgrade-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 12px;
          background: rgba(255, 255, 255, 0.12);
          border-radius: 12px;
          width: 100%;
          max-width: 300px;
          border: 1px solid rgba(255, 255, 255, 0.15);
          flex-shrink: 0;
        }

        .journey-banner {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 10px 12px;
          background: rgba(255, 255, 255, 0.15);
          border-radius: 12px;
          width: 100%;
          max-width: 300px;
          border: 2px solid rgba(255, 217, 61, 0.4);
          flex-shrink: 0;
        }

        .journey-icon {
          color: #FFD93D;
        }

        .banner-content {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .banner-icon {
          color: #FFD93D;
        }

        .banner-text {
          display: flex;
          flex-direction: column;
          gap: 1px;
        }

        .banner-title {
          font-size: 0.6875rem;
          font-weight: 800;
          color: white;
        }

        .banner-subtitle {
          font-size: 0.5625rem;
          font-weight: 600;
          color: rgba(255, 255, 255, 0.6);
        }
      `}</style>
    </div>
  );
}

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning,';
  if (hour < 17) return 'Good afternoon,';
  return 'Good evening,';
}
