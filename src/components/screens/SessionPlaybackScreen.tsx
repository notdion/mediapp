import { motion } from 'framer-motion';
import { Play, Pause, Volume2, ArrowLeft } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { ZenBuddy } from '../mascot/ZenBuddy';
import type { Session, MoodTag } from '../../types';

interface SessionPlaybackScreenProps {
  session: Session;
  onClose: () => void;
}

export function SessionPlaybackScreen({ session, onClose }: SessionPlaybackScreenProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const duration = session.duration || 60;

  const moodColors: Record<MoodTag, { primary: string; secondary: string; bg: string }> = {
    UPLIFTING: { primary: '#FFD93D', secondary: '#FF9F43', bg: '#FFF9E6' },
    CALMING: { primary: '#7CB78B', secondary: '#5A9E6B', bg: '#E8F5EC' },
    ENERGIZING: { primary: '#FF9F43', secondary: '#FF6B6B', bg: '#FFF4E6' },
    HEALING: { primary: '#5A9E6B', secondary: '#7EC8E3', bg: '#E8F5EC' },
    FOCUSED: { primary: '#5A9E6B', secondary: '#7CB78B', bg: '#E8F5EC' },
    SLEEPY: { primary: '#B8A9C9', secondary: '#7CB78B', bg: '#F5F3FF' },
    ANXIOUS: { primary: '#A8D5BA', secondary: '#7CB78B', bg: '#F0F7EE' },
    GRATEFUL: { primary: '#FF6B6B', secondary: '#FF9F43', bg: '#FFF0F0' },
    MOTIVATED: { primary: '#FF9F43', secondary: '#FFD93D', bg: '#FFF4E6' },
  };

  const colors = moodColors[session.mood] || moodColors.CALMING;

  const togglePlayback = () => {
    setIsPlaying(!isPlaying);
  };

  useEffect(() => {
    if (isPlaying) {
      timerRef.current = setInterval(() => {
        setCurrentTime(prev => {
          const newTime = prev + 0.1;
          const newProgress = (newTime / duration) * 100;
          setProgress(newProgress);
          
          if (newTime >= duration) {
            setIsPlaying(false);
            clearInterval(timerRef.current!);
            // Reset for replay
            setCurrentTime(0);
            setProgress(0);
          }
          
          return newTime;
        });
      }, 100);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isPlaying, duration]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <div className="session-playback-screen" style={{ background: colors.bg }}>
      {/* Header */}
      <motion.header 
        className="playback-header"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <button className="back-button" onClick={onClose}>
          <ArrowLeft size={24} />
        </button>
        <h1 className="header-title">Past Meditation</h1>
        <div style={{ width: 44 }} />
      </motion.header>

      {/* Session Info */}
      <motion.div 
        className="session-info"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <div 
          className="mood-badge"
          style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})` }}
        >
          {session.mood.toLowerCase()}
        </div>
        <p className="session-date">{formatDate(session.createdAt)}</p>
      </motion.div>

      {/* Ambient Background */}
      <div className="ambient-bg">
        {[...Array(3)].map((_, i) => (
          <motion.div
            key={i}
            className="ambient-circle"
            style={{ 
              background: `radial-gradient(circle, ${colors.primary}15 0%, transparent 70%)`,
            }}
            animate={{
              scale: [1, 1.3, 1],
              opacity: [0.2, 0.4, 0.2],
            }}
            transition={{
              duration: 6 + i * 2,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>

      {/* Content */}
      <motion.div 
        className="playback-content"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
      >
        {/* Mascot */}
        <div className="mascot-section">
          <ZenBuddy state={isPlaying ? 'sleeping' : 'idle'} size="md" />
        </div>

        {/* Script Preview */}
        <div className="script-section">
          <motion.p 
            className="script-text"
            animate={{ opacity: isPlaying ? 1 : 0.7 }}
          >
            {session.meditationScript.slice(0, 200)}...
          </motion.p>
        </div>

        {/* Playback Controls */}
        <div className="playback-section">
          <div className="progress-ring-container">
            <svg className="progress-ring" viewBox="0 0 120 120">
              <circle
                cx="60"
                cy="60"
                r="54"
                fill="none"
                stroke="rgba(255,255,255,0.3)"
                strokeWidth="8"
              />
              <motion.circle
                cx="60"
                cy="60"
                r="54"
                fill="none"
                stroke={colors.primary}
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={339.292}
                strokeDashoffset={339.292 * (1 - progress / 100)}
                transform="rotate(-90 60 60)"
              />
            </svg>
            
            <motion.button 
              className="play-button"
              onClick={togglePlayback}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              style={{ 
                background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})`,
              }}
            >
              {isPlaying ? <Pause size={32} /> : <Play size={32} style={{ marginLeft: 4 }} />}
            </motion.button>
          </div>

          <div className="time-display">
            <span className="current-time">{formatTime(currentTime)}</span>
            <span className="separator">/</span>
            <span className="total-time">{formatTime(duration)}</span>
          </div>

          <div className="volume-indicator">
            <Volume2 size={18} />
            <div className="volume-bars">
              {[...Array(5)].map((_, i) => (
                <motion.div
                  key={i}
                  className="volume-bar"
                  style={{ background: colors.primary }}
                  animate={isPlaying ? {
                    scaleY: [0.3 + Math.random() * 0.3, 0.6 + Math.random() * 0.4, 0.3 + Math.random() * 0.3],
                  } : { scaleY: 0.3 }}
                  transition={{
                    duration: 0.5 + Math.random() * 0.5,
                    repeat: Infinity,
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        <motion.p 
          className="instruction"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          {isPlaying ? 'Relax and breathe...' : 'Tap to replay this meditation'}
        </motion.p>

        <p className="replay-note">
          Replaying past meditations doesn't affect your streak
        </p>
      </motion.div>

      <style>{`
        .session-playback-screen {
          position: relative;
          display: flex;
          flex-direction: column;
          min-height: 100%;
          padding-bottom: 40px;
          overflow: hidden;
        }

        .playback-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 20px;
          z-index: 10;
        }

        .back-button {
          width: 44px;
          height: 44px;
          border-radius: 12px;
          background: rgba(255, 255, 255, 0.8);
          color: #6C7D6C;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }

        .header-title {
          font-size: 1.125rem;
          font-weight: 800;
          color: #1A2E1A;
        }

        .session-info {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          padding: 0 20px;
          z-index: 10;
        }

        .mood-badge {
          padding: 8px 20px;
          border-radius: 20px;
          color: white;
          font-size: 0.875rem;
          font-weight: 800;
          text-transform: capitalize;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
        }

        .session-date {
          font-size: 0.875rem;
          font-weight: 600;
          color: #6C7D6C;
        }

        .ambient-bg {
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
        }

        .ambient-circle {
          position: absolute;
          width: 300px;
          height: 300px;
          border-radius: 50%;
        }

        .ambient-circle:nth-child(1) { top: 10%; left: -50px; }
        .ambient-circle:nth-child(2) { top: 40%; right: -80px; }
        .ambient-circle:nth-child(3) { bottom: 10%; left: 20%; }

        .playback-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 20px;
          z-index: 1;
          width: 100%;
          max-width: 320px;
          margin: 0 auto;
          padding: 20px;
        }

        .mascot-section {
          margin-bottom: 8px;
        }

        .script-section {
          padding: 16px 20px;
          background: rgba(255, 255, 255, 0.7);
          backdrop-filter: blur(10px);
          border-radius: 16px;
          max-height: 120px;
          overflow: hidden;
        }

        .script-text {
          font-size: 0.875rem;
          font-weight: 600;
          color: #1A2E1A;
          line-height: 1.6;
          font-style: italic;
        }

        .playback-section {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 16px;
        }

        .progress-ring-container {
          position: relative;
          width: 120px;
          height: 120px;
        }

        .progress-ring {
          position: absolute;
          inset: 0;
        }

        .play-button {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          width: 80px;
          height: 80px;
          border-radius: 50%;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
        }

        .time-display {
          display: flex;
          align-items: baseline;
          gap: 4px;
        }

        .current-time {
          font-size: 1.5rem;
          font-weight: 900;
          color: #1A2E1A;
        }

        .separator {
          font-size: 1rem;
          color: #CED9CE;
        }

        .total-time {
          font-size: 1rem;
          font-weight: 600;
          color: #6C7D6C;
        }

        .volume-indicator {
          display: flex;
          align-items: center;
          gap: 8px;
          color: #6C7D6C;
        }

        .volume-bars {
          display: flex;
          align-items: center;
          gap: 3px;
          height: 20px;
        }

        .volume-bar {
          width: 4px;
          height: 100%;
          border-radius: 2px;
          transform-origin: bottom;
        }

        .instruction {
          font-size: 0.875rem;
          font-weight: 600;
          color: #6C7D6C;
          text-align: center;
        }

        .replay-note {
          font-size: 0.75rem;
          font-weight: 600;
          color: #ADB8AD;
          text-align: center;
          padding: 8px 16px;
          background: rgba(255, 255, 255, 0.5);
          border-radius: 12px;
        }
      `}</style>
    </div>
  );
}
