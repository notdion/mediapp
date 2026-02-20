import { motion } from 'framer-motion';
import { Play, Pause, Volume2, ArrowLeft } from 'lucide-react';
import { useEffect, useState, useRef } from 'react';
import { ZenBuddy } from '../mascot/ZenBuddy';
import type { Session } from '../../types';
import { MOOD_THEMES } from '../../theme/moodThemes';
import { FADE_TRANSITION } from '../../theme/motion';
import { fadeAudioVolume } from '../../utils/audioFades';

const AMBIENT_CIRCLE_DURATIONS = [6, 8, 10] as const;

interface SessionPlaybackScreenProps {
  session: Session;
  onClose: () => void;
}

export function SessionPlaybackScreen({ session, onClose }: SessionPlaybackScreenProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState<number | null>(null);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const hasPlayableAudio = Boolean(session.audioUrl);

  const duration = audioDuration || session.duration || 60;

  const colors = MOOD_THEMES[session.mood] || MOOD_THEMES.CALMING;

  const togglePlayback = () => {
    const nextPlayingState = !isPlaying;
    setIsPlaying(nextPlayingState);

    if (audioRef.current && hasPlayableAudio) {
      if (nextPlayingState) {
        const activeAudio = audioRef.current;
        activeAudio.volume = 0;
        activeAudio.play().then(() => {
          void fadeAudioVolume(activeAudio, 1, 700);
        }).catch(() => {
          setIsPlaying(false);
        });
      } else {
        const activeAudio = audioRef.current;
        void fadeAudioVolume(activeAudio, 0, 250).then(() => {
          activeAudio.pause();
        });
      }
    }
  };

  useEffect(() => {
    if (!session.audioUrl) return;

    const audio = new Audio(session.audioUrl);
    audio.preload = 'auto';
    audioRef.current = audio;

    const handleLoadedMetadata = () => {
      if (audio.duration > 0) {
        setAudioDuration(audio.duration);
      }
    };

    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      setProgress((audio.currentTime / Math.max(audio.duration || 1, 1)) * 100);
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      setProgress(0);
      audio.currentTime = 0;
    };

    const handleError = () => {
      setIsPlaying(false);
    };

    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.pause();
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
      audioRef.current = null;
    };
  }, [session.audioUrl]);

  useEffect(() => {
    if (isPlaying && !hasPlayableAudio) {
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
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [duration, hasPlayableAudio, isPlaying]);

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
    <div className="session-playback-screen" style={{ background: colors.background }}>
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
        transition={{ ...FADE_TRANSITION, delay: 0.1 }}
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
        {AMBIENT_CIRCLE_DURATIONS.map((duration, i) => (
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
              duration,
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
        transition={{ ...FADE_TRANSITION, delay: 0.2 }}
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
                    scaleY: [0.35 + i * 0.08, 0.65 + i * 0.05, 0.35 + i * 0.08],
                  } : { scaleY: 0.3 }}
                  transition={{
                    duration: 0.65 + i * 0.08,
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
