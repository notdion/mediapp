import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

interface SuccessAnimationProps {
  isVisible: boolean;
  streakCount: number;
  onComplete?: () => void;
}

export function SuccessAnimation({ isVisible, streakCount, onComplete }: SuccessAnimationProps) {
  const [confetti, setConfetti] = useState<Array<{ id: number; color: string; x: number; delay: number }>>([]);
  
  useEffect(() => {
    if (isVisible) {
      const colors = ['#FFD93D', '#FF6B6B', '#5A9E6B', '#7CB78B', '#A8D5BA', '#FF9F43'];
      const newConfetti = Array.from({ length: 40 }, (_, i) => ({
        id: i,
        color: colors[Math.floor(Math.random() * colors.length)],
        x: Math.random() * 100,
        delay: Math.random() * 0.5,
      }));
      setConfetti(newConfetti);
      
      const timer = setTimeout(() => {
        onComplete?.();
      }, 3000);
      
      return () => clearTimeout(timer);
    }
  }, [isVisible, onComplete]);
  
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          className="success-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
        >
          {/* Confetti */}
          <div className="confetti-container">
            {confetti.map((piece) => (
              <motion.div
                key={piece.id}
                className="confetti-piece"
                style={{
                  backgroundColor: piece.color,
                  left: `${piece.x}%`,
                }}
                initial={{ y: -20, opacity: 1, rotate: 0 }}
                animate={{ 
                  y: '100vh',
                  opacity: [1, 1, 0],
                  rotate: 720,
                }}
                transition={{
                  duration: 2.5,
                  delay: piece.delay,
                  ease: 'easeOut',
                }}
              />
            ))}
          </div>
          
          {/* Success Content */}
          <motion.div
            className="success-content"
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ 
              type: 'spring',
              damping: 15,
              stiffness: 200,
              delay: 0.2,
            }}
          >
            <motion.div
              className="success-circle"
              animate={{
                scale: [1, 1.1, 1],
                boxShadow: [
                  '0 0 0 0 rgba(90, 158, 107, 0.4)',
                  '0 0 0 30px rgba(90, 158, 107, 0)',
                  '0 0 0 0 rgba(90, 158, 107, 0)',
                ],
              }}
              transition={{ repeat: 2, duration: 1 }}
            >
              <motion.svg
                viewBox="0 0 24 24"
                width="60"
                height="60"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: 1 }}
                transition={{ duration: 0.5, delay: 0.5 }}
              >
                <motion.path
                  d="M4 12l6 6L20 6"
                  fill="none"
                  stroke="white"
                  strokeWidth="3"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  initial={{ pathLength: 0 }}
                  animate={{ pathLength: 1 }}
                  transition={{ duration: 0.5, delay: 0.5 }}
                />
              </motion.svg>
            </motion.div>
            
            <motion.h2
              className="success-title"
              initial={{ y: 20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 0.6 }}
            >
              Day Complete!
            </motion.h2>
            
            <motion.div
              className="streak-celebration"
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.8 }}
            >
              <motion.span
                className="streak-number"
                animate={{ scale: [1, 1.2, 1] }}
                transition={{ delay: 1, duration: 0.5 }}
              >
                {streakCount}
              </motion.span>
              <span className="streak-text">Day Streak!</span>
            </motion.div>
            
            <motion.p
              className="success-message"
              initial={{ y: 10, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ delay: 1 }}
            >
              You're building something beautiful. See you tomorrow! 🧘‍♀️
            </motion.p>
          </motion.div>
          
          <style>{`
            .success-overlay {
              position: fixed;
              inset: 0;
              background: rgba(26, 46, 26, 0.9);
              backdrop-filter: blur(10px);
              display: flex;
              align-items: center;
              justify-content: center;
              z-index: 1000;
              overflow: hidden;
            }
            
            .confetti-container {
              position: absolute;
              inset: 0;
              pointer-events: none;
              overflow: hidden;
            }
            
            .confetti-piece {
              position: absolute;
              width: 12px;
              height: 12px;
              border-radius: 3px;
            }
            
            .success-content {
              display: flex;
              flex-direction: column;
              align-items: center;
              text-align: center;
              padding: 40px;
            }
            
            .success-circle {
              width: 120px;
              height: 120px;
              border-radius: 50%;
              background: linear-gradient(135deg, #5A9E6B 0%, #7CB78B 100%);
              display: flex;
              align-items: center;
              justify-content: center;
              margin-bottom: 24px;
              box-shadow: 0 8px 30px rgba(90, 158, 107, 0.4);
            }
            
            .success-title {
              font-size: 2rem;
              font-weight: 900;
              color: white;
              margin-bottom: 16px;
            }
            
            .streak-celebration {
              display: flex;
              flex-direction: column;
              align-items: center;
              gap: 4px;
              padding: 16px 32px;
              background: linear-gradient(135deg, #FFD93D 0%, #FF9F43 100%);
              border-radius: 20px;
              margin-bottom: 20px;
              box-shadow: 0 4px 20px rgba(255, 217, 61, 0.4);
            }
            
            .streak-number {
              font-size: 3rem;
              font-weight: 900;
              color: #1A2E1A;
              line-height: 1;
            }
            
            .streak-text {
              font-size: 1.125rem;
              font-weight: 800;
              color: #1A2E1A;
            }
            
            .success-message {
              font-size: 1rem;
              color: rgba(255, 255, 255, 0.8);
              font-weight: 600;
              max-width: 280px;
              line-height: 1.5;
            }
          `}</style>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
