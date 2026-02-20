import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface MobileFrameProps {
  children: ReactNode;
}

export function MobileFrame({ children }: MobileFrameProps) {
  return (
    <div className="mobile-frame-container">
      <motion.div 
        className="mobile-frame"
        initial={{ scale: 0.9, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.5, ease: [0.34, 1.56, 0.64, 1] }}
      >
        {/* Phone Notch */}
        <div className="phone-notch">
          <div className="notch-camera" />
        </div>
        
        {/* App Content */}
        <div className="mobile-content">
          {children}
        </div>
        
        {/* Home Indicator */}
        <div className="home-indicator-container">
          <div className="home-indicator" />
        </div>
      </motion.div>
      
      <style>{`
        .mobile-frame-container {
          display: flex;
          justify-content: center;
          align-items: center;
          min-height: 100vh;
          min-height: 100dvh;
          padding: 1rem;
        }
        
        .mobile-frame {
          position: relative;
          width: 100%;
          max-width: 390px;
          height: 844px;
          max-height: 95vh;
          background: linear-gradient(180deg, #FAFFF8 0%, #F0F7EE 100%);
          border-radius: 48px;
          box-shadow: 
            0 0 0 12px #1A2E1A,
            0 0 0 14px #2D442D,
            0 25px 80px rgba(90, 158, 107, 0.3),
            0 10px 30px rgba(0, 0, 0, 0.2),
            inset 0 0 80px rgba(90, 158, 107, 0.03);
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        
        .phone-notch {
          position: absolute;
          top: 0;
          left: 50%;
          transform: translateX(-50%);
          width: 160px;
          height: 34px;
          background: #1A2E1A;
          border-radius: 0 0 24px 24px;
          z-index: 100;
          display: flex;
          justify-content: center;
          align-items: center;
          padding-top: 4px;
        }
        
        .notch-camera {
          width: 12px;
          height: 12px;
          background: #2D442D;
          border-radius: 50%;
          box-shadow: inset 0 0 4px rgba(90, 158, 107, 0.5);
        }
        
        .mobile-content {
          flex: 1;
          overflow-y: auto;
          overflow-x: hidden;
          padding-top: 54px;
          padding-bottom: 34px;
          -webkit-overflow-scrolling: touch;
        }
        
        .mobile-content::-webkit-scrollbar {
          display: none;
        }
        
        .home-indicator-container {
          position: absolute;
          bottom: 8px;
          left: 50%;
          transform: translateX(-50%);
          z-index: 100;
        }
        
        .home-indicator {
          width: 134px;
          height: 5px;
          background: #1A2E1A;
          border-radius: 3px;
          opacity: 0.3;
        }
        
        @media (max-width: 420px) {
          .mobile-frame-container {
            padding: 0;
          }
          
          .mobile-frame {
            max-width: 100%;
            height: 100vh;
            height: 100dvh;
            max-height: none;
            border-radius: 0;
            box-shadow: none;
          }
          
          .phone-notch {
            display: none;
          }
          
          .mobile-content {
            padding-top: env(safe-area-inset-top, 20px);
            padding-bottom: env(safe-area-inset-bottom, 20px);
          }
        }
      `}</style>
    </div>
  );
}
