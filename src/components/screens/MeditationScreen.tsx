import { AnimatePresence, motion } from 'framer-motion';
import { Play, Pause, X, Volume2, VolumeX } from 'lucide-react';
import { useCallback, useEffect, useState, useRef, useMemo } from 'react';
import { slothImages } from '../mascot/slothAssets';
import { useAppStore } from '../../store/useAppStore';
import type { MoodTag } from '../../types';
import { MOOD_THEMES } from '../../theme/moodThemes';
import { FADE_TRANSITION } from '../../theme/motion';
import { fadeAudioVolume } from '../../utils/audioFades';
import '../mascot/ZenBuddy.css';

// Clean script text by removing SSML tags for display
function cleanScriptText(script: string): string {
  return script
    .replace(/<break[^>]*\/>/gi, '') // Remove break tags
    .replace(/<[^>]+>/g, '') // Remove any other tags
    .replace(/\s+/g, ' ') // Normalize whitespace
    .trim();
}

// Simple script display component (no highlighting)
function ScriptDisplay({ 
  script, 
  primaryColor,
}: { 
  script: string; 
  primaryColor: string;
}) {
  const cleanedScript = useMemo(() => cleanScriptText(script), [script]);

  return (
    <div className="script-display">
      <p className="script-text" style={{ color: primaryColor }}>
        {cleanedScript}
      </p>
    </div>
  );
}

// Import meditation music tracks
import ambientMeditation from '../MeditationMusic/ambient-for-meditation-184568.mp3';
import forestMelody from '../MeditationMusic/forest-melody-background-music-for-meditation-and-yoga-49-second-314442.mp3';
import guitarMeditation from '../MeditationMusic/guitar-meditation-128839.mp3';
import meditationBackground from '../MeditationMusic/meditation-background-462870.mp3';
import meditationBackgroundMusic from '../MeditationMusic/meditation-background-music-386976.mp3';
import meditationMusic from '../MeditationMusic/meditation-music-338902.mp3';
import meditationMusicShort from '../MeditationMusic/meditation-music-for-youtube-shorts-under-1-minute-121598-121600.mp3';
import meditationMusicNoCopyright from '../MeditationMusic/meditation-music-no-copyright-388791.mp3';
import meditationSpiritual from '../MeditationMusic/meditation-spiritual-music-330169.mp3';
import rainforestMeditation from '../MeditationMusic/rainforest-meditation-2-387546.mp3';
import sacralChakra from '../MeditationMusic/sacral-chakra-svadhisthana-meditation-sounds-367682.mp3';
import sunriseMeditation from '../MeditationMusic/sunrise-meditation-369921.mp3';
import yogaMeditation from '../MeditationMusic/yoga-meditation-music-328749.mp3';

// All available meditation music tracks with durations
const ALL_TRACKS = [
  { src: forestMelody, duration: 49 },
  { src: meditationMusicShort, duration: 60 },
  { src: guitarMeditation, duration: 90 },
  { src: meditationMusicNoCopyright, duration: 120 },
  { src: meditationBackground, duration: 300 },
  { src: meditationBackgroundMusic, duration: 300 },
  { src: meditationSpiritual, duration: 300 },
  { src: yogaMeditation, duration: 300 },
  { src: meditationMusic, duration: 600 },
  { src: rainforestMeditation, duration: 600 },
  { src: sacralChakra, duration: 600 },
  { src: ambientMeditation, duration: 900 },
  { src: sunriseMeditation, duration: 900 },
];

const IMAGE_SWAP_DELAYS_MS = [20000, 26000, 32000, 38000, 44000, 50000];
const SOFT_START_COUNTDOWN_SECONDS = 3;
const AUDIO_FADE_IN_MS = 1400;
const AUDIO_FADE_OUT_MS = 450;
const AMBIENT_CIRCLE_MOTION = [
  { duration: 8, xOffset: 0, yOffset: 50 },
  { duration: 10, xOffset: 48, yOffset: 15 },
  { duration: 12, xOffset: 30, yOffset: -40 },
  { duration: 14, xOffset: -30, yOffset: -40 },
  { duration: 16, xOffset: -48, yOffset: 15 },
] as const;

/**
 * Select the best track for the meditation duration
 * Prefers tracks that are within 15 seconds of the target duration, or longer (will fade out)
 */
function selectTrackForDuration(durationSeconds: number): { src: string; duration: number } {
  // Find tracks within acceptable range (duration - 15 to duration + any amount longer)
  const minDuration = durationSeconds - 15;
  
  // Sort by how close they are to the target (prefer slightly longer tracks)
  const suitable = ALL_TRACKS
    .filter(t => t.duration >= minDuration)
    .sort((a, b) => {
      const aDiff = Math.abs(a.duration - durationSeconds);
      const bDiff = Math.abs(b.duration - durationSeconds);
      return aDiff - bDiff;
    });
  
  if (suitable.length > 0) {
    // Pick randomly from top 3 closest matches to add variety
    const topChoices = suitable.slice(0, Math.min(3, suitable.length));
    return topChoices[Math.floor(Math.random() * topChoices.length)];
  }
  
  // Fallback: use any track that can loop (all can loop)
  return ALL_TRACKS[Math.floor(Math.random() * ALL_TRACKS.length)];
}

interface MeditationScreenProps {
  mood: MoodTag;
  script: string;
  duration?: number; // Duration in seconds
  voiceAudioUrl?: string | null; // ElevenLabs generated voice
  onComplete: () => void;
  onClose: () => void;
}

export function MeditationScreen({ mood, script, duration = 60, voiceAudioUrl, onComplete, onClose }: MeditationScreenProps) {
  const { setMascotState, setIsPlaying, setPlaybackProgress } = useAppStore();
  
  const [isPlaying, setLocalPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [currentSlothImage, setCurrentSlothImage] = useState(slothImages.meditating);
  const [isMusicMuted, setIsMusicMuted] = useState(false);
  const [isVoiceMuted, setIsVoiceMuted] = useState(false);
  const [countdownSeconds, setCountdownSeconds] = useState<number | null>(null);
  
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const imageSwapTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const countdownTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startPlaybackTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const playbackActionIdRef = useRef(0);
  const musicAudioRef = useRef<HTMLAudioElement | null>(null);
  const voiceAudioRef = useRef<HTMLAudioElement | null>(null);
  const imageSwapIndexRef = useRef(0);
  
  // Real-time tracking refs to eliminate timer drift.
  // setInterval(fn, 100) drifts ~8-10ms per tick, accumulating 15-25s of error over 5 minutes.
  // Instead, we measure actual elapsed wall-clock time with Date.now().
  const playStartTimestampRef = useRef<number>(0);   // Date.now() when current play session began
  const accumulatedSecondsRef = useRef<number>(0);    // Total seconds accumulated from previous play sessions (before pause)
  // Base music volume (before any fading)
  const BASE_MUSIC_VOLUME = 0.15;
  const FADE_DURATION = 2; // Fade out over last 2 seconds

  const colors = MOOD_THEMES[mood] || MOOD_THEMES.CALMING;

  // Initialize background music - select appropriate track for duration
  useEffect(() => {
    const selectedTrack = selectTrackForDuration(duration);
    console.log('[MeditationScreen] Selected music track, duration:', selectedTrack.duration, 's for meditation:', duration, 's');
    
    const musicAudio = new Audio(selectedTrack.src);
    // Loop if track is shorter than meditation (with buffer)
    musicAudio.loop = selectedTrack.duration < duration + 15;
    // Lower volume for background music so voice is prominent
    musicAudio.volume = 0.15;
    // Preload the audio
    musicAudio.preload = 'auto';
    musicAudioRef.current = musicAudio;

    return () => {
      if (musicAudioRef.current) {
        musicAudioRef.current.pause();
        musicAudioRef.current = null;
      }
    };
  }, [duration]);

  const lastVoiceUrlRef = useRef<string | null>(null);

  // Initialize voice audio if available - handles seamless URL switching during playback
  useEffect(() => {
    if (!voiceAudioUrl) return;
    
    // Skip if same URL AND we already have audio loaded
    if (lastVoiceUrlRef.current === voiceAudioUrl && voiceAudioRef.current) return;
    
    const wasPlaying = voiceAudioRef.current && !voiceAudioRef.current.paused;
    const currentPosition = voiceAudioRef.current?.currentTime || 0;
    const isUpgrade = lastVoiceUrlRef.current && lastVoiceUrlRef.current !== voiceAudioUrl;
    
    // Clean up old audio
    if (voiceAudioRef.current) {
      voiceAudioRef.current.pause();
      voiceAudioRef.current = null;
    }
    
    // Create new audio element
    const voiceAudio = new Audio(voiceAudioUrl);
    voiceAudio.volume = 1.0;
    voiceAudioRef.current = voiceAudio;
    lastVoiceUrlRef.current = voiceAudioUrl;
    
    // If this is an upgrade (intro -> full audio) and user was playing, seamlessly continue
    if (isUpgrade && wasPlaying && currentPosition > 0) {
      voiceAudio.addEventListener('loadedmetadata', () => {
        voiceAudio.currentTime = currentPosition;
        voiceAudio.play().catch(() => {});
      }, { once: true });
    }

    return () => {};
  }, [voiceAudioUrl]);

  // Cleanup voice audio on unmount
  useEffect(() => {
    return () => {
      if (voiceAudioRef.current) {
        voiceAudioRef.current.pause();
        voiceAudioRef.current = null;
      }
    };
  }, []);

  // Handle music mute toggle
  useEffect(() => {
    if (musicAudioRef.current) {
      musicAudioRef.current.muted = isMusicMuted;
    }
  }, [isMusicMuted]);

  // Handle voice mute toggle
  useEffect(() => {
    if (voiceAudioRef.current) {
      voiceAudioRef.current.muted = isVoiceMuted;
    }
  }, [isVoiceMuted]);

  const clearPreparationTimers = useCallback(() => {
    if (countdownTimerRef.current) {
      clearInterval(countdownTimerRef.current);
      countdownTimerRef.current = null;
    }
    if (startPlaybackTimerRef.current) {
      clearTimeout(startPlaybackTimerRef.current);
      startPlaybackTimerRef.current = null;
    }
  }, []);

  // Random swap between meditating and sleeping images
  const scheduleImageSwap = useCallback(function scheduleNextImageSwap() {
    const delay = IMAGE_SWAP_DELAYS_MS[imageSwapIndexRef.current % IMAGE_SWAP_DELAYS_MS.length];
    imageSwapIndexRef.current += 1;
    imageSwapTimerRef.current = setTimeout(() => {
      setCurrentSlothImage(prev => 
        prev === slothImages.meditating ? slothImages.sleeping : slothImages.meditating
      );
      scheduleNextImageSwap(); // Schedule next swap
    }, delay);
  }, []);

  const startPlaybackNow = useCallback(async () => {
    playbackActionIdRef.current += 1;
    const actionId = playbackActionIdRef.current;

    setLocalPlaying(true);
    setIsPlaying(true);
    setMascotState('meditating');
    setCurrentSlothImage(slothImages.meditating);
    scheduleImageSwap();

    if (musicAudioRef.current) {
      musicAudioRef.current.volume = isMusicMuted ? BASE_MUSIC_VOLUME : 0;
      await musicAudioRef.current.play().catch(() => undefined);
      if (!isMusicMuted && actionId === playbackActionIdRef.current) {
        void fadeAudioVolume(musicAudioRef.current, BASE_MUSIC_VOLUME, AUDIO_FADE_IN_MS);
      }
    }

    if (voiceAudioRef.current) {
      voiceAudioRef.current.volume = isVoiceMuted ? 1 : 0;
      await voiceAudioRef.current.play().catch(() => undefined);
      if (!isVoiceMuted && actionId === playbackActionIdRef.current) {
        void fadeAudioVolume(voiceAudioRef.current, 1, AUDIO_FADE_IN_MS);
      }
    }
  }, [isMusicMuted, isVoiceMuted, scheduleImageSwap, setIsPlaying, setMascotState]);

  const pausePlaybackNow = useCallback(async () => {
    playbackActionIdRef.current += 1;
    clearPreparationTimers();
    setCountdownSeconds(null);

    if (imageSwapTimerRef.current) {
      clearTimeout(imageSwapTimerRef.current);
      imageSwapTimerRef.current = null;
    }

    setLocalPlaying(false);
    setIsPlaying(false);
    setMascotState('idle');

    if (playStartTimestampRef.current > 0) {
      accumulatedSecondsRef.current += (Date.now() - playStartTimestampRef.current) / 1000;
      playStartTimestampRef.current = 0;
    }

    const activeMusic = musicAudioRef.current;
    const activeVoice = voiceAudioRef.current;

    if (activeMusic) {
      if (!isMusicMuted) {
        await fadeAudioVolume(activeMusic, 0, AUDIO_FADE_OUT_MS);
      }
      activeMusic.pause();
    }
    if (activeVoice) {
      if (!isVoiceMuted) {
        await fadeAudioVolume(activeVoice, 0, AUDIO_FADE_OUT_MS);
      }
      activeVoice.pause();
    }
  }, [clearPreparationTimers, isMusicMuted, isVoiceMuted, setIsPlaying, setMascotState]);

  const beginSoftStart = useCallback(() => {
    clearPreparationTimers();
    setCountdownSeconds(SOFT_START_COUNTDOWN_SECONDS);

    countdownTimerRef.current = setInterval(() => {
      setCountdownSeconds((previous) => {
        if (previous === null) return previous;
        return previous > 1 ? previous - 1 : 1;
      });
    }, 1000);

    startPlaybackTimerRef.current = setTimeout(() => {
      clearPreparationTimers();
      setCountdownSeconds(null);
      void startPlaybackNow();
    }, SOFT_START_COUNTDOWN_SECONDS * 1000);
  }, [clearPreparationTimers, startPlaybackNow]);

  const togglePlayback = () => {
    if (isPlaying) {
      void pausePlaybackNow();
      return;
    }
    if (countdownSeconds !== null) {
      return;
    }
    if (currentTime <= 0.1) {
      beginSoftStart();
      return;
    }
    void startPlaybackNow();
  };

  const toggleMusicMute = () => {
    setIsMusicMuted(prev => !prev);
  };

  const toggleVoiceMute = () => setIsVoiceMuted(prev => !prev);

  useEffect(() => {
    if (isPlaying) {
      // Record wall-clock start of this play session
      playStartTimestampRef.current = Date.now();
      
      timerRef.current = setInterval(() => {
        // Calculate real elapsed time (immune to setInterval drift)
        const elapsed = accumulatedSecondsRef.current + 
          (Date.now() - playStartTimestampRef.current) / 1000;
        
        // Clamp to duration so we never overshoot
        const clampedTime = Math.min(elapsed, duration);
        
        setCurrentTime(clampedTime);
        const newProgress = (clampedTime / duration) * 100;
        setProgress(newProgress);
        setPlaybackProgress(newProgress / 100);
        
        // Fade out music in the last 2 seconds
        const timeRemaining = duration - clampedTime;
        if (timeRemaining <= FADE_DURATION && timeRemaining > 0 && musicAudioRef.current && !isMusicMuted) {
          // Linear fade from BASE_MUSIC_VOLUME to 0
          const fadeProgress = timeRemaining / FADE_DURATION;
          musicAudioRef.current.volume = BASE_MUSIC_VOLUME * fadeProgress;
        }
        
        // Also fade out voice in the last 1 second for smoother ending
        if (timeRemaining <= 1 && timeRemaining > 0 && voiceAudioRef.current && !isVoiceMuted) {
          voiceAudioRef.current.volume = timeRemaining;
        }
        
        if (elapsed >= duration) {
          setLocalPlaying(false);
          setIsPlaying(false);
          clearPreparationTimers();
          setCountdownSeconds(null);
          if (imageSwapTimerRef.current) {
            clearTimeout(imageSwapTimerRef.current);
            imageSwapTimerRef.current = null;
          }
          // Stop both audio sources
          if (musicAudioRef.current) {
            if (!isMusicMuted) {
              void fadeAudioVolume(musicAudioRef.current, 0, AUDIO_FADE_OUT_MS).then(() => {
                musicAudioRef.current?.pause();
              });
            } else {
              musicAudioRef.current.pause();
            }
          }
          if (voiceAudioRef.current) {
            if (!isVoiceMuted) {
              void fadeAudioVolume(voiceAudioRef.current, 0, AUDIO_FADE_OUT_MS).then(() => {
                voiceAudioRef.current?.pause();
              });
            } else {
              voiceAudioRef.current.pause();
            }
          }
          clearInterval(timerRef.current!);
          // Reset accumulated time for next session
          accumulatedSecondsRef.current = 0;
          playStartTimestampRef.current = 0;
          setTimeout(onComplete, 1000);
        }
      }, 200);
    } else {
      // When pausing: save elapsed time from this play session
      if (playStartTimestampRef.current > 0) {
        accumulatedSecondsRef.current += (Date.now() - playStartTimestampRef.current) / 1000;
        playStartTimestampRef.current = 0;
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      // Save accumulated time on cleanup (in case effect re-runs while playing)
      if (playStartTimestampRef.current > 0) {
        accumulatedSecondsRef.current += (Date.now() - playStartTimestampRef.current) / 1000;
        playStartTimestampRef.current = 0;
      }
    };
  }, [clearPreparationTimers, isMusicMuted, isPlaying, isVoiceMuted, duration, onComplete, setIsPlaying, setPlaybackProgress]);

  // Cleanup image swap timer on unmount
  useEffect(() => {
    return () => {
      clearPreparationTimers();
      if (imageSwapTimerRef.current) {
        clearTimeout(imageSwapTimerRef.current);
        imageSwapTimerRef.current = null;
      }
    };
  }, [clearPreparationTimers]);

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="meditation-screen" style={{ background: colors.background }}>
      {/* Close Button */}
      <motion.button 
        className="close-button"
        onClick={onClose}
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        <X size={24} />
      </motion.button>

      {/* Mood Badge */}
      <motion.div 
        className="mood-badge"
        style={{ background: `linear-gradient(135deg, ${colors.primary}, ${colors.secondary})` }}
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ delay: 0.2 }}
      >
        {mood.toLowerCase()} • {formatTime(duration)}
      </motion.div>

      {/* Ambient Background */}
      <div className="ambient-bg">
        {AMBIENT_CIRCLE_MOTION.map((circle, i) => (
          <motion.div
            key={i}
            className="ambient-circle"
            style={{ 
              background: `radial-gradient(circle, ${colors.primary}20 0%, transparent 70%)`,
            }}
            animate={{
              scale: [1, 1.5, 1],
              opacity: [0.3, 0.6, 0.3],
              x: [0, circle.xOffset, 0],
              y: [0, circle.yOffset, 0],
            }}
            transition={{
              duration: circle.duration,
              repeat: Infinity,
              ease: 'easeInOut',
            }}
          />
        ))}
      </div>

      {/* Content */}
      <motion.div 
        className="meditation-content"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
      >
        {/* Mascot with direct image control */}
        <div className="mascot-section">
          <div className="zen-buddy-container" style={{ width: 256, height: 256 }}>
            <div className={`zen-buddy-wrapper ${isPlaying ? 'animate-breathe' : 'animate-float'}`}>
              <motion.img
                key={currentSlothImage}
                src={currentSlothImage}
                alt="ZenPal Sloth"
                className="zen-buddy-image"
                width={256}
                height={256}
                draggable={false}
                initial={{ opacity: 0.8 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.5 }}
              />
            </div>
          </div>
        </div>

        {/* Script Display */}
        <div className="script-section">
          <ScriptDisplay 
            script={script}
            primaryColor={colors.primary}
          />
        </div>

        {/* Playback Controls */}
        <div className="playback-section">
          {/* Progress Ring */}
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
            
            <div className="play-button-wrapper">
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

            <AnimatePresence>
              {countdownSeconds !== null && (
                <motion.div
                  className="soft-start-overlay"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.8 }}
                  transition={FADE_TRANSITION}
                >
                  <span className="soft-start-title">Breathe in</span>
                  <span className="soft-start-count">{countdownSeconds}</span>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Time Display */}
          <div className="time-display">
            <span className="current-time">{formatTime(currentTime)}</span>
            <span className="separator">/</span>
            <span className="total-time">{formatTime(duration)}</span>
          </div>

          {/* Audio Controls */}
          <div className="audio-controls">
            <motion.button 
              className="volume-control"
              onClick={toggleMusicMute}
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              {isMusicMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
              <span className="volume-label">Music</span>
            </motion.button>
            
            {voiceAudioUrl && (
              <motion.button 
                className="volume-control"
                onClick={toggleVoiceMute}
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                {isVoiceMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
                <span className="volume-label">Voice</span>
              </motion.button>
            )}
          </div>
        </div>

        {/* Instruction */}
        <motion.p 
          className="instruction"
          animate={{ opacity: [0.5, 1, 0.5] }}
          transition={{ duration: 3, repeat: Infinity }}
        >
          {isPlaying ? 'Close your eyes and breathe...' : 'Tap to begin your meditation'}
        </motion.p>
      </motion.div>

      <style>{`
        .meditation-screen {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
          min-height: 100%;
          padding: 60px 20px 40px;
          overflow: hidden;
        }

        .close-button {
          position: absolute;
          top: 16px;
          right: 16px;
          width: 44px;
          height: 44px;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.8);
          color: #6C7D6C;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
          z-index: 10;
        }

        .mood-badge {
          position: absolute;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          padding: 8px 20px;
          border-radius: 20px;
          color: white;
          font-size: 0.875rem;
          font-weight: 800;
          text-transform: capitalize;
          box-shadow: 0 4px 15px rgba(0, 0, 0, 0.15);
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

        .ambient-circle:nth-child(1) { top: -50px; left: -50px; }
        .ambient-circle:nth-child(2) { top: 20%; right: -100px; }
        .ambient-circle:nth-child(3) { bottom: 20%; left: -80px; }
        .ambient-circle:nth-child(4) { bottom: -50px; right: -50px; }
        .ambient-circle:nth-child(5) { top: 50%; left: 50%; transform: translate(-50%, -50%); }

        .meditation-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 24px;
          z-index: 1;
          width: 100%;
          max-width: 320px;
        }

        .mascot-section {
          margin-bottom: 8px;
        }

        .script-section {
          padding: 24px 20px;
          background: rgba(255, 255, 255, 0.75);
          backdrop-filter: blur(12px);
          border-radius: 24px;
          height: 160px;
          display: flex;
          align-items: center;
          justify-content: center;
          width: 100%;
          overflow: hidden;
        }

        .script-display {
          width: 100%;
          height: 100%;
          overflow-y: auto;
          overflow-x: hidden;
          display: flex;
          align-items: flex-start;
          justify-content: center;
          padding: 4px 8px;
        }

        .script-text {
          font-size: 1rem;
          font-weight: 500;
          line-height: 1.6;
          text-align: center;
          margin: 0;
          word-wrap: break-word;
          overflow-wrap: break-word;
          max-width: 100%;
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
          transform: rotate(-90deg);
        }

        .play-button-wrapper {
          position: absolute;
          top: 50%;
          left: 50%;
          transform: translate(-50%, -50%);
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .play-button {
          width: 80px;
          height: 80px;
          border-radius: 50%;
          border: none;
          color: white;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 4px 20px rgba(0, 0, 0, 0.2);
          cursor: pointer;
        }

        .soft-start-overlay {
          position: absolute;
          inset: 0;
          border-radius: 50%;
          background: rgba(255, 255, 255, 0.82);
          backdrop-filter: blur(6px);
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          z-index: 6;
          pointer-events: none;
        }

        .soft-start-title {
          font-size: 0.72rem;
          font-weight: 700;
          color: #6C7D6C;
          text-transform: uppercase;
          letter-spacing: 0.08em;
        }

        .soft-start-count {
          font-size: 2rem;
          font-weight: 900;
          color: #1A2E1A;
          line-height: 1;
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

        .audio-controls {
          display: flex;
          gap: 12px;
        }

        .volume-control {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          background: rgba(255, 255, 255, 0.7);
          border-radius: 20px;
          color: #6C7D6C;
          font-weight: 600;
          font-size: 0.75rem;
          border: none;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .volume-control:hover {
          background: rgba(255, 255, 255, 0.9);
        }

        .volume-label {
          color: #1A2E1A;
        }

        .instruction {
          font-size: 0.875rem;
          font-weight: 600;
          color: #6C7D6C;
          text-align: center;
        }
      `}</style>
    </div>
  );
}
