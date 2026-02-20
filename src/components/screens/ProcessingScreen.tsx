import { motion } from 'framer-motion';
import { useEffect, useState, useRef } from 'react';
import { ZenBuddy } from '../mascot/ZenBuddy';

interface ProcessingScreenProps {
  onComplete: () => void;
  currentStep?: string;
  error?: string | null;
}

const processingSteps = [
  { text: 'Listening to your thoughts...', duration: 2000 },
  { text: 'Crafting your meditation...', duration: 2500 },
  { text: 'Bringing your meditation to life...', duration: 2500 },
  { text: 'Perfecting the timing...', duration: 1500 },
];

export function ProcessingScreen({ onComplete, currentStep: externalStep, error }: ProcessingScreenProps) {
  const [currentStepIndex, setCurrentStepIndex] = useState(0);
  const [progress, setProgress] = useState(0);
  const [displayText, setDisplayText] = useState(processingSteps[0].text);
  const completedRef = useRef(false);
  const hasStartedRef = useRef(false);
  const onCompleteRef = useRef(onComplete);
  
  // Keep onComplete ref updated
  useEffect(() => {
    onCompleteRef.current = onComplete;
  }, [onComplete]);

  // Update display text based on external step or internal step
  useEffect(() => {
    if (externalStep) {
      setDisplayText(externalStep);
      // Map external step to index for progress
      const stepIndex = processingSteps.findIndex(s => s.text === externalStep);
      if (stepIndex !== -1) {
        setCurrentStepIndex(stepIndex);
        setProgress(((stepIndex + 1) / processingSteps.length) * 100);
      }
    }
  }, [externalStep]);

  // Handle completion when processing is done (progress reaches 100 or we get final step)
  useEffect(() => {
    // Trigger completion on final step
    const isCompleteStep = 
      externalStep === 'Perfecting the timing...' || 
      externalStep === 'Ready!' ||
      externalStep === "Let's get started!";
    if (isCompleteStep && !completedRef.current) {
      completedRef.current = true;
      setProgress(100);
      // Short delay for visual feedback, then complete
      const timer = setTimeout(() => {
        onCompleteRef.current();
      }, 800);
      return () => clearTimeout(timer);
    }
  }, [externalStep]);

  // Fallback timer for demo mode (when no external steps are provided)
  useEffect(() => {
    if (hasStartedRef.current) return;
    hasStartedRef.current = true;

    // Only use fallback timing if no external steps
    if (!externalStep) {
      let totalDuration = 0;
      const stepTimers: NodeJS.Timeout[] = [];

      processingSteps.forEach((step, index) => {
        const timer = setTimeout(() => {
          setCurrentStepIndex(index);
          setDisplayText(step.text);
        }, totalDuration);
        stepTimers.push(timer);
        totalDuration += step.duration;
      });

      // Progress animation
      const progressInterval = setInterval(() => {
        setProgress(prev => {
          if (prev >= 100) {
            clearInterval(progressInterval);
            return 100;
          }
          return prev + 2;
        });
      }, totalDuration / 50);

      // Complete after all steps
      const completeTimer = setTimeout(() => {
        if (!completedRef.current) {
          completedRef.current = true;
          onCompleteRef.current();
        }
      }, totalDuration + 500);

      return () => {
        stepTimers.forEach(clearTimeout);
        clearInterval(progressInterval);
        clearTimeout(completeTimer);
      };
    }
  }, [externalStep]);

  return (
    <div className="processing-screen">
      <motion.div 
        className="processing-content"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        {/* Mascot */}
        <motion.div 
          className="mascot-container"
          animate={{ 
            y: [0, -10, 0],
          }}
          transition={{ 
            repeat: Infinity,
            duration: 2,
            ease: 'easeInOut',
          }}
        >
          <ZenBuddy state="thinking" size="lg" />
        </motion.div>

        {/* Processing Text */}
        <motion.div 
          className="processing-text"
          key={displayText}
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h2>{error ? `Error: ${error}` : displayText}</h2>
        </motion.div>

        {/* Progress Bar */}
        <div className="progress-container">
          <div className="progress-bar">
            <motion.div 
              className="progress-fill"
              initial={{ width: '0%' }}
              animate={{ width: `${progress}%` }}
              transition={{ duration: 0.1 }}
            />
          </div>
          <span className="progress-text">{Math.round(progress)}%</span>
        </div>

        {/* Step Indicators */}
        <div className="step-indicators">
          {processingSteps.map((_, index) => (
            <motion.div
              key={index}
              className={`step-dot ${index <= currentStepIndex ? 'active' : ''}`}
              initial={{ scale: 0.8 }}
              animate={{ 
                scale: index === currentStepIndex ? [1, 1.2, 1] : 1,
              }}
              transition={{ 
                repeat: index === currentStepIndex ? Infinity : 0,
                duration: 1,
              }}
            />
          ))}
        </div>

        {/* Floating Elements */}
        <div className="floating-elements">
          {['🌿', '🧘', '💭', '🌸', '☁️'].map((emoji, i) => (
            <motion.span
              key={i}
              className="floating-emoji"
              initial={{ opacity: 0, y: 50 }}
              animate={{ 
                opacity: [0, 1, 0],
                y: [-20, -80, -140],
                x: Math.sin(i * 45) * 30,
              }}
              transition={{
                duration: 3,
                repeat: Infinity,
                delay: i * 0.6,
                ease: 'easeOut',
              }}
              style={{
                left: `${15 + i * 18}%`,
              }}
            >
              {emoji}
            </motion.span>
          ))}
        </div>
      </motion.div>

      <style>{`
        .processing-screen {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          min-height: 100%;
          padding: 40px 20px;
          background: linear-gradient(180deg, #F0F7EE 0%, #E8F5EC 100%);
          position: relative;
          overflow: hidden;
        }

        .processing-content {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 32px;
          z-index: 1;
        }

        .mascot-container {
          position: relative;
        }

        .processing-text {
          text-align: center;
          min-height: 60px;
          display: flex;
          align-items: center;
        }

        .processing-text h2 {
          font-size: 1.25rem;
          font-weight: 800;
          color: #1A2E1A;
          line-height: 1.3;
        }

        .progress-container {
          display: flex;
          flex-direction: column;
          align-items: center;
          gap: 8px;
          width: 100%;
          max-width: 280px;
        }

        .progress-bar {
          width: 100%;
          height: 12px;
          background: rgba(90, 158, 107, 0.15);
          border-radius: 6px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #5A9E6B 0%, #7CB78B 50%, #FFD93D 100%);
          background-size: 200% 100%;
          animation: shimmer 2s linear infinite;
          border-radius: 6px;
        }

        @keyframes shimmer {
          0% { background-position: 200% 0; }
          100% { background-position: -200% 0; }
        }

        .progress-text {
          font-size: 0.875rem;
          font-weight: 700;
          color: #5A9E6B;
        }

        .step-indicators {
          display: flex;
          gap: 12px;
        }

        .step-dot {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: rgba(90, 158, 107, 0.2);
          transition: background 0.3s ease;
        }

        .step-dot.active {
          background: #5A9E6B;
        }

        .floating-elements {
          position: absolute;
          inset: 0;
          pointer-events: none;
          overflow: hidden;
        }

        .floating-emoji {
          position: absolute;
          bottom: 20%;
          font-size: 1.5rem;
        }
      `}</style>
    </div>
  );
}
