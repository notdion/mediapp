import { motion, AnimatePresence } from 'framer-motion';
import { X, Sparkles, Infinity as InfinityIcon, Brain, Shield, Zap } from 'lucide-react';
import { Button } from './Button';
import { slothImages } from '../mascot/slothAssets';
import '../mascot/ZenBuddy.css';

interface PaywallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUpgrade: () => void;
}

const sparkleColors = ['#FFD93D', '#FF6B6B', '#58CC9C', '#54C7FC', '#9B7DFF', '#FF9F43', '#6C47FF', '#FFD93D'];

export function PaywallModal({ isOpen, onClose, onUpgrade }: PaywallModalProps) {
  const features = [
    { icon: <InfinityIcon size={20} />, text: 'Unlimited daily meditations' },
    { icon: <Brain size={20} />, text: 'AI remembers your journey' },
    { icon: <Zap size={20} />, text: '60 second voice input' },
    { icon: <Shield size={20} />, text: '1 streak freeze per month' },
  ];

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          className="paywall-overlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
        >
          <motion.div
            className="paywall-modal"
            initial={{ scale: 0.8, y: 50, opacity: 0 }}
            animate={{ scale: 1, y: 0, opacity: 1 }}
            exit={{ scale: 0.8, y: 50, opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            onClick={(e) => e.stopPropagation()}
          >
            <button className="close-button" onClick={onClose}>
              <X size={24} />
            </button>

            <div className="paywall-content">
              <div className="mascot-section">
                {/* Colorful celebration sparkles behind the sloth */}
                <div className="celebration-sparkles-container">
                  {sparkleColors.map((color, i) => (
                    <motion.div
                      key={i}
                      className="paywall-sparkle"
                      style={{
                        left: `${15 + (i % 4) * 22}%`,
                        top: `${15 + Math.floor(i / 4) * 35}%`,
                        backgroundColor: color,
                      }}
                      animate={{ 
                        scale: [0, 1.5, 0],
                        opacity: [0, 1, 0],
                        y: [0, -15, -30],
                      }}
                      transition={{ 
                        duration: 1.4,
                        delay: i * 0.18,
                        repeat: Infinity,
                        repeatDelay: 0.4,
                      }}
                    />
                  ))}
                </div>
                
                <div className="zen-buddy-container" style={{ width: 200, height: 200, position: 'relative', zIndex: 2 }}>
                  <div className="zen-buddy-wrapper animate-bounce-happy">
                    <img
                      src={slothImages.posing}
                      alt="ZenPal Sloth"
                      className="zen-buddy-image"
                      width={200}
                      height={200}
                      draggable={false}
                    />
                  </div>
                </div>
              </div>

              <motion.div
                className="premium-badge"
                animate={{ 
                  boxShadow: [
                    '0 0 20px rgba(255, 217, 61, 0.3)',
                    '0 0 40px rgba(255, 217, 61, 0.5)',
                    '0 0 20px rgba(255, 217, 61, 0.3)',
                  ],
                }}
                transition={{ repeat: Infinity, duration: 2 }}
              >
                <Sparkles size={16} />
                ZenPal Premium
              </motion.div>

              <h2 className="paywall-title">
                Unlock Your Full Zen Potential
              </h2>

              <p className="paywall-subtitle">
                You've completed your free meditation today! 
                Upgrade for unlimited access.
              </p>

              <div className="features-list">
                {features.map((feature, index) => (
                  <motion.div
                    key={index}
                    className="feature-item"
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 + index * 0.1 }}
                  >
                    <div className="feature-icon">{feature.icon}</div>
                    <span>{feature.text}</span>
                  </motion.div>
                ))}
              </div>

              <div className="pricing-section">
                <div className="price">
                  <span className="amount">$9.99</span>
                  <span className="period">/month</span>
                </div>
                <p className="price-note">Cancel anytime • 7-day free trial</p>
              </div>

              <div className="action-buttons">
                <Button variant="gold" fullWidth onClick={onUpgrade}>
                  <Sparkles size={18} />
                  Start Free Trial
                </Button>
                <Button variant="ghost" fullWidth onClick={onClose}>
                  Maybe Later
                </Button>
              </div>
            </div>

            <style>{`
              .paywall-overlay {
                position: fixed;
                inset: 0;
                background: rgba(26, 46, 26, 0.8);
                backdrop-filter: blur(8px);
                display: flex;
                align-items: center;
                justify-content: center;
                z-index: 1000;
                padding: 20px;
              }

              .paywall-modal {
                position: relative;
                width: 100%;
                max-width: 360px;
                background: linear-gradient(180deg, #FFFFFF 0%, #F8FFF8 100%);
                border-radius: 32px;
                padding: 32px 24px;
                box-shadow: 
                  0 20px 60px rgba(90, 158, 107, 0.3),
                  0 0 0 1px rgba(90, 158, 107, 0.1);
                overflow: hidden;
              }

              .paywall-modal::before {
                content: '';
                position: absolute;
                top: 0;
                left: 0;
                right: 0;
                height: 4px;
                background: linear-gradient(90deg, #5A9E6B, #FFD93D, #FF6B6B, #7CB78B, #5A9E6B);
                background-size: 200% 100%;
                animation: shimmer 3s linear infinite;
              }

              @keyframes shimmer {
                0% { background-position: 200% 0; }
                100% { background-position: -200% 0; }
              }

              .close-button {
                position: absolute;
                top: 16px;
                right: 16px;
                width: 36px;
                height: 36px;
                border-radius: 50%;
                background: rgba(90, 158, 107, 0.1);
                color: #5A9E6B;
                display: flex;
                align-items: center;
                justify-content: center;
                transition: all 0.2s ease;
                z-index: 10;
              }

              .close-button:hover {
                background: rgba(90, 158, 107, 0.2);
                transform: scale(1.1);
              }

              .paywall-content {
                display: flex;
                flex-direction: column;
                align-items: center;
                text-align: center;
              }

              .mascot-section {
                position: relative;
                margin-bottom: 16px;
              }

              .celebration-sparkles-container {
                position: absolute;
                inset: 0;
                z-index: 1;
                pointer-events: none;
              }

              .paywall-sparkle {
                position: absolute;
                width: 12px;
                height: 12px;
                border-radius: 50%;
              }

              .premium-badge {
                display: inline-flex;
                align-items: center;
                gap: 6px;
                padding: 8px 16px;
                background: linear-gradient(135deg, #FFD93D 0%, #FF9F43 100%);
                color: #1A2E1A;
                font-size: 0.875rem;
                font-weight: 800;
                border-radius: 20px;
                margin-bottom: 16px;
              }

              .paywall-title {
                font-size: 1.5rem;
                font-weight: 900;
                color: #1A2E1A;
                margin-bottom: 8px;
                line-height: 1.2;
              }

              .paywall-subtitle {
                font-size: 0.9375rem;
                color: #6C7D6C;
                margin-bottom: 24px;
                line-height: 1.5;
              }

              .features-list {
                width: 100%;
                display: flex;
                flex-direction: column;
                gap: 12px;
                margin-bottom: 24px;
              }

              .feature-item {
                display: flex;
                align-items: center;
                gap: 12px;
                padding: 12px 16px;
                background: white;
                border-radius: 12px;
                border: 2px solid #C8E6CF;
                font-weight: 600;
                color: #1A2E1A;
                text-align: left;
              }

              .feature-icon {
                width: 36px;
                height: 36px;
                border-radius: 10px;
                background: linear-gradient(135deg, #5A9E6B 0%, #7CB78B 100%);
                color: white;
                display: flex;
                align-items: center;
                justify-content: center;
                flex-shrink: 0;
              }

              .pricing-section {
                margin-bottom: 20px;
              }

              .price {
                display: flex;
                align-items: baseline;
                justify-content: center;
                gap: 4px;
              }

              .amount {
                font-size: 2.5rem;
                font-weight: 900;
                color: #1A2E1A;
              }

              .period {
                font-size: 1rem;
                font-weight: 600;
                color: #6C7D6C;
              }

              .price-note {
                font-size: 0.8125rem;
                color: #5A9E6B;
                font-weight: 600;
                margin-top: 4px;
              }

              .action-buttons {
                width: 100%;
                display: flex;
                flex-direction: column;
                gap: 8px;
              }
            `}</style>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
