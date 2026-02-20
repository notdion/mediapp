import { motion } from 'framer-motion';
import { Flame } from 'lucide-react';

interface StreakDisplayProps {
  currentStreak: number;
  longestStreak?: number;
  showRecord?: boolean;
}

export function StreakDisplay({ currentStreak, longestStreak, showRecord = false }: StreakDisplayProps) {
  const isOnFire = currentStreak >= 3;
  const showBestBadge = showRecord && longestStreak !== undefined && longestStreak > 0;
  
  return (
    <motion.div 
      className="streak-display"
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
    >
      <div className="streak-main-wrapper">
        {/* Best badge on top border */}
        {showBestBadge && (
          <motion.div 
            className="best-badge"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 0.3 }}
          >
            Best: {longestStreak} days
          </motion.div>
        )}
        
        <div className="streak-main">
          <motion.div 
            className={`streak-icon ${isOnFire ? 'on-fire' : ''}`}
            animate={isOnFire ? { 
              scale: [1, 1.15, 1],
              rotate: [0, -5, 5, 0],
            } : {}}
            transition={{ 
              repeat: Infinity,
              duration: 1.5,
              ease: 'easeInOut',
            }}
          >
            <Flame size={28} />
            {isOnFire && (
              <motion.div 
                className="fire-glow"
                animate={{ 
                  opacity: [0.4, 0.8, 0.4],
                  scale: [1, 1.3, 1],
                }}
                transition={{ repeat: Infinity, duration: 1 }}
              />
            )}
          </motion.div>
          
          <div className="streak-info">
            <motion.span 
              className="streak-count"
              key={currentStreak}
              initial={{ y: -20, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 500, damping: 25 }}
            >
              {currentStreak}
            </motion.span>
            <span className="streak-label">day streak</span>
          </div>
        </div>
      </div>
      
      <style>{`
        .streak-display {
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        
        .streak-main-wrapper {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: center;
        }
        
        .best-badge {
          position: absolute;
          top: -10px;
          left: 50%;
          transform: translateX(-50%);
          font-size: 0.625rem;
          font-weight: 700;
          color: white;
          padding: 3px 10px;
          background: linear-gradient(135deg, #5A9E6B 0%, #7CB78B 100%);
          border-radius: 10px;
          white-space: nowrap;
          z-index: 10;
          box-shadow: 0 2px 6px rgba(90, 158, 107, 0.3);
        }
        
        .streak-main {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 10px 20px;
          background: linear-gradient(135deg, #FFF9E6 0%, #FFEFCC 100%);
          border-radius: 50px;
          border: 3px solid #FFD93D;
          box-shadow: 
            0 4px 0 #F5C400,
            0 6px 20px rgba(255, 217, 61, 0.3);
        }
        
        .streak-icon {
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #FF9F43;
        }
        
        .streak-icon.on-fire {
          color: #FF6B6B;
        }
        
        .fire-glow {
          position: absolute;
          inset: -8px;
          background: radial-gradient(circle, rgba(255, 107, 107, 0.4) 0%, transparent 70%);
          border-radius: 50%;
          z-index: -1;
        }
        
        .streak-info {
          display: flex;
          align-items: baseline;
          gap: 4px;
        }
        
        .streak-count {
          font-size: 1.75rem;
          font-weight: 900;
          color: #1A2E1A;
          line-height: 1;
        }
        
        .streak-label {
          font-size: 0.875rem;
          font-weight: 700;
          color: #6C7D6C;
        }
      `}</style>
    </motion.div>
  );
}
