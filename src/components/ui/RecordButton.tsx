import { motion } from 'framer-motion';
import { Mic, Square } from 'lucide-react';

interface RecordButtonProps {
  isRecording: boolean;
  onPress: () => void;
  disabled?: boolean;
  progress?: number; // 0-1 for recording progress
  maxDuration?: number; // in seconds
}

export function RecordButton({ 
  isRecording, 
  onPress, 
  disabled = false,
  progress = 0,
  maxDuration = 15,
}: RecordButtonProps) {
  const circumference = 2 * Math.PI * 70;
  const strokeDashoffset = circumference * (1 - progress);
  
  return (
    <motion.button
      className={`record-button ${isRecording ? 'recording' : ''} ${disabled ? 'disabled' : ''}`}
      onClick={onPress}
      disabled={disabled}
      whileHover={!disabled ? { scale: 1.05 } : {}}
      whileTap={!disabled ? { scale: 0.95 } : {}}
      initial={{ scale: 0, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
    >
      {/* Progress ring */}
      <svg className="progress-ring" viewBox="0 0 160 160">
        {/* Background ring */}
        <circle
          cx="80"
          cy="80"
          r="70"
          fill="none"
          stroke="rgba(90, 158, 107, 0.15)"
          strokeWidth="8"
        />
        {/* Progress arc */}
        {isRecording && (
          <motion.circle
            cx="80"
            cy="80"
            r="70"
            fill="none"
            stroke="#5A9E6B"
            strokeWidth="8"
            strokeLinecap="round"
            strokeDasharray={circumference}
            strokeDashoffset={strokeDashoffset}
            transform="rotate(-90 80 80)"
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 0.1 }}
          />
        )}
      </svg>
      
      {/* Button inner */}
      <motion.div 
        className="button-inner"
        animate={isRecording ? {
          scale: [1, 1.1, 1],
          boxShadow: [
            '0 0 0 0 rgba(90, 158, 107, 0.4)',
            '0 0 0 20px rgba(90, 158, 107, 0)',
            '0 0 0 0 rgba(90, 158, 107, 0)',
          ],
        } : {}}
        transition={{ 
          repeat: isRecording ? Infinity : 0,
          duration: 1.5,
        }}
      >
        <motion.div
          initial={false}
          animate={{ 
            rotate: isRecording ? 0 : 0,
            scale: isRecording ? 0.9 : 1,
          }}
          transition={{ duration: 0.2 }}
        >
          {isRecording ? (
            <Square size={32} fill="currentColor" />
          ) : (
            <Mic size={40} />
          )}
        </motion.div>
      </motion.div>
      
      {/* Time indicator */}
      {isRecording && (
        <motion.div 
          className="time-indicator"
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
        >
          {Math.ceil(maxDuration * (1 - progress))}s
        </motion.div>
      )}
      
      {/* Pulse rings when recording */}
      {isRecording && (
        <div className="pulse-rings">
          {[0, 1, 2].map((i) => (
            <motion.div
              key={i}
              className="pulse-ring"
              initial={{ scale: 1, opacity: 0.6 }}
              animate={{ scale: 2, opacity: 0 }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: i * 0.6,
                ease: 'easeOut',
              }}
            />
          ))}
        </div>
      )}
      
      <style>{`
        .record-button {
          position: relative;
          width: 160px;
          height: 160px;
          border: none;
          background: transparent;
          cursor: pointer;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        .record-button.disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }
        
        .progress-ring {
          position: absolute;
          inset: 0;
          width: 100%;
          height: 100%;
        }
        
        .button-inner {
          width: 120px;
          height: 120px;
          border-radius: 50%;
          background: linear-gradient(135deg, #5A9E6B 0%, #7CB78B 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow: 
            0 6px 0 #3D7A4F,
            0 8px 30px rgba(90, 158, 107, 0.4);
          transition: transform 0.15s ease, box-shadow 0.15s ease;
        }
        
        .record-button:not(.disabled):active .button-inner {
          transform: translateY(4px);
          box-shadow: 
            0 2px 0 #3D7A4F,
            0 4px 15px rgba(90, 158, 107, 0.3);
        }
        
        .record-button.recording .button-inner {
          background: linear-gradient(135deg, #FF6B6B 0%, #FF9F43 100%);
          box-shadow: 
            0 6px 0 #CC4545,
            0 8px 30px rgba(255, 107, 107, 0.4);
        }
        
        .time-indicator {
          position: absolute;
          bottom: -30px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 1.25rem;
          font-weight: 800;
          color: #5A9E6B;
          background: white;
          padding: 4px 16px;
          border-radius: 20px;
          box-shadow: 0 2px 10px rgba(90, 158, 107, 0.2);
        }
        
        .pulse-rings {
          position: absolute;
          inset: 0;
          pointer-events: none;
        }
        
        .pulse-ring {
          position: absolute;
          inset: 20px;
          border: 3px solid #5A9E6B;
          border-radius: 50%;
        }
      `}</style>
    </motion.button>
  );
}
