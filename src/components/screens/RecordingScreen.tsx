import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Clock, ChevronDown } from 'lucide-react';
import { useEffect, useRef, useState, useCallback } from 'react';
import { slothImages } from '../mascot/slothAssets';
import { RecordButton } from '../ui/RecordButton';
import { WaveformVisualizer } from '../ui/WaveformVisualizer';
import { useAppStore } from '../../store/useAppStore';
import '../mascot/ZenBuddy.css';

interface RecordingScreenProps {
  onComplete: (audioBlob: Blob, selectedDuration?: number) => void;
  onCancel: () => void;
  defaultDuration?: number;
  onDurationChange?: (duration: number) => void;
}

// Duration options for premium users (in seconds)
const DURATION_OPTIONS = [
  { label: '30 sec', value: 30 },
  { label: '1 min', value: 60 },
  { label: '2 min', value: 120 },
  { label: '5 min', value: 300 },
  { label: '10 min', value: 600 },
  { label: '15 min', value: 900 },
];

export function RecordingScreen({ onComplete, onCancel, defaultDuration = 60, onDurationChange }: RecordingScreenProps) {
  const { user, setMascotState, setIsRecording, setRecordingDuration } = useAppStore();
  
  // Recording duration (how long user can speak): Premium 60s, Free 15s
  const maxRecordingDuration = user?.tier === 'premium' ? 60 : 15;
  
  // Meditation duration: Free users always get 60s, Premium can choose up to 15 min
  const FREE_USER_MEDITATION_DURATION = 60; // 1 minute for free users
  const isPremium = user?.tier === 'premium';
  
  const [isRecording, setLocalRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [progress, setProgress] = useState(0);
  const [showSettings] = useState(isPremium);
  // Free users always get 60 seconds, premium users can customize
  const [selectedMeditationDuration, setSelectedMeditationDuration] = useState(
    isPremium ? defaultDuration : FREE_USER_MEDITATION_DURATION
  );
  const [showDurationPicker, setShowDurationPicker] = useState(false);
  const [currentSlothImage, setCurrentSlothImage] = useState(slothImages.setup);
  
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  const handleDurationSelect = (value: number) => {
    setSelectedMeditationDuration(value);
    setShowDurationPicker(false);
    if (onDurationChange) {
      onDurationChange(value);
    }
  };

  const formatDuration = (seconds: number) => {
    if (seconds < 60) return `${seconds} sec`;
    return `${seconds / 60} min`;
  };

  const stopRecording = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      // Real recording - stop will trigger onstop callback which calls onComplete
      mediaRecorderRef.current.stop();
    } else {
      // Demo mode - manually create dummy blob and complete
      const dummyBlob = new Blob(['demo audio'], { type: 'audio/webm' });
      onComplete(dummyBlob, selectedMeditationDuration);
    }
    
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
    }
    setLocalRecording(false);
    setIsRecording(false);
    setMascotState('thinking');
    setCurrentSlothImage(slothImages.meditating);
  }, [setIsRecording, setMascotState, onComplete, selectedMeditationDuration]);

  // Demo mode fallback when microphone is not available
  const startDemoRecording = () => {
    setLocalRecording(true);
    setIsRecording(true);
    setMascotState('listening');
    setCurrentSlothImage(slothImages.listening);
    setDuration(0);
    setProgress(0);
    
    const startTime = Date.now();
    
    timerRef.current = setInterval(() => {
      const elapsed = (Date.now() - startTime) / 1000;
      setDuration(Math.min(elapsed, maxRecordingDuration));
      setRecordingDuration(elapsed);
      setProgress(elapsed / maxRecordingDuration);
      
      // Only auto-complete when time runs out
      if (elapsed >= maxRecordingDuration) {
        if (timerRef.current) clearInterval(timerRef.current);
        setLocalRecording(false);
        setIsRecording(false);
        setMascotState('thinking');
        setCurrentSlothImage(slothImages.meditating);
        const dummyBlob = new Blob(['demo audio'], { type: 'audio/webm' });
        onComplete(dummyBlob, selectedMeditationDuration);
      }
    }, 100);
  };

  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      
      // Try to use a supported MIME type
      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus') 
        ? 'audio/webm;codecs=opus'
        : MediaRecorder.isTypeSupported('audio/webm')
        ? 'audio/webm'
        : MediaRecorder.isTypeSupported('audio/mp4')
        ? 'audio/mp4'
        : '';
      
      const mediaRecorder = mimeType 
        ? new MediaRecorder(stream, { mimeType })
        : new MediaRecorder(stream);
      
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];
      
      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };
      
      mediaRecorder.onstop = () => {
        // Determine the correct MIME type for the blob
        const blobType = mediaRecorder.mimeType || 'audio/webm';
        const blob = new Blob(chunksRef.current, { type: blobType });
        console.log('Recording complete, blob size:', blob.size, 'type:', blobType);
        onComplete(blob, selectedMeditationDuration);
      };
      
      // Start recording with timeslice to ensure data is collected regularly
      mediaRecorder.start(1000); // Collect data every 1 second
      setLocalRecording(true);
      setIsRecording(true);
      setMascotState('listening');
      setCurrentSlothImage(slothImages.listening);
      setDuration(0);
      setProgress(0);
      
      const startTime = Date.now();
      timerRef.current = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        setDuration(Math.min(elapsed, maxRecordingDuration));
        setRecordingDuration(elapsed);
        setProgress(elapsed / maxRecordingDuration);
        
        // Only auto-complete when time runs out
        if (elapsed >= maxRecordingDuration) {
          stopRecording();
        }
      }, 100);
      
    } catch (err) {
      console.error('Error accessing microphone, using demo mode:', err);
      startDemoRecording();
    }
  };

  const handleRecordPress = () => {
    if (isRecording) {
      // User manually stops recording - this triggers completion
      stopRecording();
    } else {
      startRecording();
    }
  };

  const handleCancel = () => {
    if (isRecording) {
      if (mediaRecorderRef.current) {
        mediaRecorderRef.current.ondataavailable = null;
        mediaRecorderRef.current.onstop = null;
      }
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
      setLocalRecording(false);
      setIsRecording(false);
    }
    setMascotState('idle');
    onCancel();
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (streamRef.current) {
        streamRef.current.getTracks().forEach(track => track.stop());
      }
    };
  }, []);

  return (
    <div className="recording-screen">
      {/* Header */}
      <motion.header 
        className="recording-header"
        initial={{ y: -20, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
      >
        <button className="back-button" onClick={handleCancel}>
          <ArrowLeft size={22} />
        </button>
        <h1 className="header-title">
          {isRecording ? "I'm listening..." : 'Tell me about your day'}
        </h1>
        <div style={{ width: 40 }} />
      </motion.header>

      {/* Content */}
      <div className="recording-content">
        {/* Premium Settings - Compact */}
        {user?.tier === 'premium' && showSettings && !isRecording && (
          <motion.div 
            className="premium-settings"
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
          >
            <div className="settings-card">
              <div className="settings-row">
                <div className="settings-label">
                  <Clock size={16} />
                  <span>Meditation</span>
                </div>
                
                <button 
                  className="duration-selector"
                  onClick={() => setShowDurationPicker(!showDurationPicker)}
                >
                  <span>{formatDuration(selectedMeditationDuration)}</span>
                  <ChevronDown size={16} className={showDurationPicker ? 'rotate' : ''} />
                </button>
              </div>

              <AnimatePresence>
                {showDurationPicker && (
                  <motion.div 
                    className="duration-options"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: 'auto' }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    {DURATION_OPTIONS.map((option) => (
                      <button
                        key={option.value}
                        className={`duration-option ${selectedMeditationDuration === option.value ? 'selected' : ''}`}
                        onClick={() => handleDurationSelect(option.value)}
                      >
                        {option.label}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </motion.div>
        )}

        {/* Mascot - Using direct image control */}
        <motion.div 
          className="mascot-container"
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <div className="zen-buddy-container" style={{ width: 200, height: 200 }}>
            <div className={`zen-buddy-wrapper ${isRecording ? 'animate-wiggle' : 'animate-float'}`}>
              <motion.img
                key={currentSlothImage}
                src={currentSlothImage}
                alt="ZenPal Sloth"
                className="zen-buddy-image"
                width={200}
                height={200}
                draggable={false}
                initial={{ opacity: 0.8 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>
        </motion.div>

        {/* Instruction or Waveform */}
        <motion.div 
          className="feedback-section"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          {isRecording ? (
            <>
              <WaveformVisualizer isActive={isRecording} />
              <div className="timer-display">
                <span className="timer-current">{Math.floor(duration)}</span>
                <span className="timer-separator">/</span>
                <span className="timer-max">{maxRecordingDuration}s</span>
              </div>
            </>
          ) : (
            <div className="instruction-text">
              <p className="main-instruction">
                Press the button and tell me what's on your mind
              </p>
              <p className="sub-instruction">
                {user?.tier === 'premium' 
                  ? `Up to 60 seconds • ${formatDuration(selectedMeditationDuration)} meditation`
                  : 'Free users get 15 seconds'
                }
              </p>
            </div>
          )}
        </motion.div>

        {/* Record Button */}
        <motion.div 
          className="button-section"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <RecordButton 
            isRecording={isRecording}
            onPress={handleRecordPress}
            progress={progress}
            maxDuration={maxRecordingDuration}
          />
        </motion.div>

        {/* Help Text */}
        <motion.p 
          className="help-text"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          {isRecording ? 'Tap to finish early' : 'Tap to start recording'}
        </motion.p>
      </div>

      <style>{`
        .recording-screen {
          display: flex;
          flex-direction: column;
          height: 100%;
          background: linear-gradient(180deg, #FAFFF8 0%, #E8F5EC 100%);
          overflow: hidden;
        }

        .recording-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 12px 16px;
          flex-shrink: 0;
        }

        .back-button {
          width: 40px;
          height: 40px;
          border-radius: 10px;
          background: white;
          color: #6C7D6C;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 0 2px 8px rgba(0, 0, 0, 0.08);
        }

        .header-title {
          font-size: 1rem;
          font-weight: 800;
          color: #1A2E1A;
        }

        .recording-content {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: space-evenly;
          padding: 8px 20px 20px;
          gap: 8px;
        }

        .premium-settings {
          width: 100%;
          max-width: 300px;
        }

        .settings-card {
          background: white;
          border-radius: 14px;
          padding: 12px 14px;
          box-shadow: 0 2px 12px rgba(90, 158, 107, 0.1);
          border: 2px solid #C8E6CF;
        }

        .settings-row {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 12px;
        }

        .settings-label {
          display: flex;
          align-items: center;
          gap: 6px;
          color: #5A9E6B;
          font-size: 0.8125rem;
          font-weight: 700;
        }

        .duration-selector {
          display: flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          background: linear-gradient(135deg, #5A9E6B 0%, #7CB78B 100%);
          border-radius: 10px;
          color: white;
          font-weight: 800;
          font-size: 0.9375rem;
          border: none;
          cursor: pointer;
        }

        .duration-selector .rotate {
          transform: rotate(180deg);
        }

        .duration-options {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 6px;
          margin-top: 10px;
          overflow: hidden;
        }

        .duration-option {
          padding: 8px;
          border-radius: 8px;
          border: 2px solid #C8E6CF;
          background: white;
          color: #1A2E1A;
          font-weight: 700;
          font-size: 0.75rem;
          cursor: pointer;
          transition: all 0.2s ease;
        }

        .duration-option:hover {
          border-color: #5A9E6B;
          background: #E8F5EC;
        }

        .duration-option.selected {
          border-color: #5A9E6B;
          background: #5A9E6B;
          color: white;
        }

        .mascot-container {
          flex-shrink: 0;
        }

        .feedback-section {
          width: 100%;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 10px;
          min-height: 80px;
        }

        .instruction-text {
          text-align: center;
        }

        .main-instruction {
          font-size: 1rem;
          font-weight: 700;
          color: #1A2E1A;
          margin-bottom: 4px;
        }

        .sub-instruction {
          font-size: 0.8125rem;
          font-weight: 600;
          color: #5A9E6B;
        }

        .timer-display {
          display: flex;
          align-items: baseline;
          gap: 4px;
          padding: 6px 16px;
          background: white;
          border-radius: 16px;
          box-shadow: 0 2px 8px rgba(90, 158, 107, 0.12);
        }

        .timer-current {
          font-size: 1.5rem;
          font-weight: 900;
          color: #5A9E6B;
        }

        .timer-separator {
          font-size: 1rem;
          font-weight: 600;
          color: #CED9CE;
        }

        .timer-max {
          font-size: 1rem;
          font-weight: 700;
          color: #ADB8AD;
        }

        .button-section {
          flex-shrink: 0;
        }

        .help-text {
          font-size: 0.8125rem;
          font-weight: 600;
          color: #6C7D6C;
        }
      `}</style>
    </div>
  );
}
