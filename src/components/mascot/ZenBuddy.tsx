import { memo } from 'react';
import { motion } from 'framer-motion';
import type { MascotState } from '../../types';
import './ZenBuddy.css';

// Import sloth images
import slothStanding from '../Sloth/Sloth - Standing.png';
import slothWaving from '../Sloth/Sloth - Waving.png';
import slothMeditating from '../Sloth/Sloth - Meditating.png';
import slothLaughing from '../Sloth/Sloth - Laughing.png';
import slothSleep from '../Sloth/Sloth - Sleep.png';
import slothSetup from '../Sloth/Sloth - Setup.png';
import slothListening from '../Sloth/Sloth - Listening.png';
import slothPosing from '../Sloth/Sloth - Posing.png';
import slothCongrats from '../Sloth/Sloth - Congrats.png';
import slothCongrats1 from '../Sloth/Sloth - Congrats(1).png';
import slothNotifications from '../Sloth/Sloth - Notifications.png';
import slothMail from '../Sloth/Sloth - Mail.png';
import slothHammock from '../Sloth/Sloth - Hammock.png';
import slothPhone from '../Sloth/Sloth - Phone.png';
import slothHumanCursor from '../Sloth/Sloth - Human Cursor.png';
import slothLanding from '../Sloth/Sloth - Landing.png';

interface ZenBuddyProps {
  state: MascotState;
  size?: 'sm' | 'md' | 'lg';
  variant?: number; // For alternating between image variants
}

// Map states to images - updated with new images
const stateToImage: Record<MascotState, string> = {
  idle: slothStanding,        // Standing for main screen before meditation
  listening: slothListening,  // Listening when recording
  thinking: slothMeditating,
  success: slothCongrats,     // Congrats after completion
  celebrating: slothPosing,   // Posing for paywall
  sleeping: slothSleep,
  meditating: slothMeditating,
};

// Alternate congrats images
export const congratsImages = [slothCongrats, slothCongrats1];

// Profile page sloth images (standing, meditating, sleeping)
export const profileSlothImages = [slothStanding, slothMeditating, slothSleep];

// Export for use in other components
export const slothImages = {
  standing: slothStanding,
  waving: slothWaving,
  meditating: slothMeditating,
  laughing: slothLaughing,
  sleeping: slothSleep,
  setup: slothSetup,
  listening: slothListening,
  posing: slothPosing,
  congrats: slothCongrats,
  congrats1: slothCongrats1,
  notifications: slothNotifications,
  mail: slothMail,
  hammock: slothHammock,
  phone: slothPhone,
  cursor: slothHumanCursor,
  landing: slothLanding,
};

// Map states to CSS animation class names
const stateToAnimation: Record<MascotState, string> = {
  idle: 'animate-float',
  listening: 'animate-wiggle',
  thinking: 'animate-pulse-gentle',
  success: 'animate-bounce-happy',
  celebrating: 'animate-bounce-happy',
  sleeping: 'animate-breathe',
  meditating: 'animate-pulse-gentle',
};

const sizeMap: Record<string, number> = {
  sm: 160,
  md: 256,
  lg: 352,
};

function ZenBuddyComponent({ state, size = 'lg', variant = 0 }: ZenBuddyProps) {
  const dimension = sizeMap[size];
  
  // Handle congrats state with variant for alternating images
  let currentImage: string;
  if (state === 'success' && variant !== undefined) {
    currentImage = congratsImages[variant % 2];
  } else {
    currentImage = stateToImage[state] || slothStanding;
  }
  
  const animationClass = stateToAnimation[state] || 'animate-float';
  
  return (
    <div className="zen-buddy-container" style={{ width: dimension, height: dimension }}>
      {/* Celebration sparkles - BEHIND the sloth */}
      {(state === 'success' || state === 'celebrating') && <CelebrationSparkles />}
      
      {/* Main sloth with CSS animation */}
      <div className={`zen-buddy-wrapper ${animationClass}`} style={{ position: 'relative', zIndex: 2 }}>
        <img
          src={currentImage}
          alt="ZenPal Sloth"
          className="zen-buddy-image"
          width={dimension}
          height={dimension}
          draggable={false}
        />
      </div>
      
      {/* Listening indicator rings */}
      {state === 'listening' && <ListeningRings />}
      
      {/* Thinking dots */}
      {state === 'thinking' && <ThinkingDots />}
    </div>
  );
}

// Memoize to prevent re-renders when parent updates
export const ZenBuddy = memo(ZenBuddyComponent);

// Separate memoized components for effects
const ListeningRings = memo(function ListeningRings() {
  return (
    <div className="listening-rings">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="listening-ring"
          animate={{ 
            scale: [0.8, 1.3, 1.6],
            opacity: [0, 0.5, 0],
          }}
          transition={{ 
            duration: 1.5,
            delay: i * 0.4,
            repeat: Infinity,
          }}
        />
      ))}
    </div>
  );
});

const ThinkingDots = memo(function ThinkingDots() {
  return (
    <div className="thinking-dots">
      {[0, 1, 2].map((i) => (
        <motion.div
          key={i}
          className="thinking-dot"
          animate={{ 
            y: [0, -12, 0],
            opacity: [0.4, 1, 0.4],
          }}
          transition={{ 
            duration: 0.8,
            delay: i * 0.2,
            repeat: Infinity,
          }}
        />
      ))}
    </div>
  );
});

const sparkleColors = ['#FFD93D', '#FF6B6B', '#58CC9C', '#54C7FC', '#9B7DFF', '#FF9F43', '#6C47FF', '#FFD93D'];

const CelebrationSparkles = memo(function CelebrationSparkles() {
  return (
    <div className="celebration-sparkles" style={{ zIndex: 1 }}>
      {sparkleColors.map((color, i) => (
        <motion.div
          key={i}
          className="sparkle"
          style={{
            left: `${20 + (i % 4) * 20}%`,
            top: `${10 + Math.floor(i / 4) * 30}%`,
            backgroundColor: color,
          }}
          animate={{ 
            scale: [0, 1.5, 0],
            opacity: [0, 1, 0],
            y: [0, -20, -40],
          }}
          transition={{ 
            duration: 1.2,
            delay: i * 0.15,
            repeat: Infinity,
            repeatDelay: 0.3,
          }}
        />
      ))}
    </div>
  );
});
