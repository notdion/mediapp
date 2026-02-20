import { motion, AnimatePresence } from 'framer-motion';
import { useState, useEffect } from 'react';
import { Bell, ArrowRight, Check, Sparkles, Crown, Gift, Heart, Zap, Brain, History, Mic } from 'lucide-react';
import { slothImages } from '../mascot/ZenBuddy';
import { Button } from '../ui/Button';
import '../mascot/ZenBuddy.css';

type OnboardingStep = 'welcome' | 'notifications' | 'name' | 'email' | 'phone' | 'offer';

interface OnboardingScreenProps {
  onComplete: (userData: { name: string; email: string; phone: string }) => void;
  onSkipOffer: () => void;
  onAcceptOffer: () => void;
}

export function OnboardingScreen({ onComplete, onSkipOffer, onAcceptOffer }: OnboardingScreenProps) {
  const [step, setStep] = useState<OnboardingStep>('welcome');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [notificationGranted, setNotificationGranted] = useState(false);
  const [notificationAnimating, setNotificationAnimating] = useState(false);
  const [isTransitioning, setIsTransitioning] = useState(false);

  // Auto-advance from welcome after 2.5s
  useEffect(() => {
    if (step === 'welcome') {
      const timer = setTimeout(() => handleNextStep(), 2500);
      return () => clearTimeout(timer);
    }
  }, [step]);

  const handleNextStep = () => {
    if (isTransitioning) return;
    
    setIsTransitioning(true);
    setTimeout(() => {
      setIsTransitioning(false);
      switch (step) {
        case 'welcome':
          setStep('notifications');
          break;
        case 'notifications':
          setStep('name');
          break;
        case 'name':
          setStep('email');
          break;
        case 'email':
          setStep('phone');
          break;
        case 'phone':
          setStep('offer');
          break;
        case 'offer':
          onComplete({ name, email, phone });
          break;
      }
    }, 300);
  };

  const handleNotificationRequest = async () => {
    setNotificationAnimating(true);
    
    if ('Notification' in window) {
      const permission = await Notification.requestPermission();
      setNotificationGranted(permission === 'granted');
    } else {
      setNotificationGranted(true);
    }
    
    setTimeout(() => {
      setNotificationAnimating(false);
      handleNextStep();
    }, 1200);
  };

  const handleAcceptOffer = () => {
    onAcceptOffer();
    onComplete({ name, email, phone });
  };

  const handleSkipOffer = () => {
    onSkipOffer();
    onComplete({ name, email, phone });
  };

  const formatPhoneNumber = (value: string) => {
    const numbers = value.replace(/\D/g, '');
    if (numbers.length <= 3) return numbers;
    if (numbers.length <= 6) return `(${numbers.slice(0, 3)}) ${numbers.slice(3)}`;
    return `(${numbers.slice(0, 3)}) ${numbers.slice(3, 6)}-${numbers.slice(6, 10)}`;
  };

  const getStepNumber = () => {
    const steps: OnboardingStep[] = ['welcome', 'notifications', 'name', 'email', 'phone', 'offer'];
    return steps.indexOf(step);
  };

  return (
    <div className="onboarding-screen">
      <AnimatePresence mode="wait">
        {/* Welcome Step */}
        {step === 'welcome' && (
          <motion.div
            key="welcome"
            className="onboarding-page welcome-page"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4 }}
          >
            <div className="welcome-top">
              <motion.div
                className="logo-container"
                initial={{ scale: 0, rotate: -180 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', damping: 12, delay: 0.2 }}
              >
                <div className="logo-circle">
                  <img src={slothImages.waving} alt="ZenPal" className="logo-mascot" />
                </div>
              </motion.div>
              
              <motion.h1
                className="welcome-title"
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                ZenPal
              </motion.h1>
              
              <motion.p
                className="welcome-tagline"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                Your personal meditation companion
              </motion.p>
            </div>
            
            <div className="welcome-bottom">
              <motion.div
                className="loading-indicator"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1 }}
              >
                <div className="loading-dots">
                  {[0, 1, 2].map(i => (
                    <motion.span
                      key={i}
                      className="dot"
                      animate={{ scale: [1, 1.3, 1], opacity: [0.5, 1, 0.5] }}
                      transition={{ duration: 0.8, delay: i * 0.15, repeat: Infinity }}
                    />
                  ))}
                </div>
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* Notifications Step - Using Sloth Notifications Image */}
        {step === 'notifications' && (
          <motion.div
            key="notifications"
            className="onboarding-page"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
          >
            <div className="page-top">
              <div className="step-indicator">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className={`step-dot ${i <= getStepNumber() ? 'active' : ''}`} />
                ))}
              </div>
              
              {/* Notification Sloth Image */}
              <motion.div
                className="notification-mascot"
                initial={{ scale: 0, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ type: 'spring', damping: 12, delay: 0.1 }}
              >
                {notificationGranted ? (
                  <motion.div
                    className="success-overlay"
                    initial={{ scale: 0, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ type: 'spring', damping: 10 }}
                  >
                    <div className="success-check">
                      <Check size={32} strokeWidth={3} />
                    </div>
                  </motion.div>
                ) : null}
                {/* Sloth cursor that clicks the notification */}
                <div className="sloth-cursor-container">
                  <img src={slothImages.cursor} alt="" className="sloth-cursor" />
                </div>
                <motion.img 
                  src={slothImages.notifications} 
                  alt=""
                  className="notification-sloth-img"
                  animate={notificationAnimating ? { 
                    rotate: [0, -5, 5, -5, 5, 0],
                    scale: [1, 1.05, 1]
                  } : {}}
                  transition={{ duration: 0.5 }}
                />
              </motion.div>

              <motion.h2
                className="page-title title-wave"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                {notificationGranted ? 'Perfect!' : 'Stay Consistent'}
              </motion.h2>
              
              <motion.p
                className="page-subtitle"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                {notificationGranted 
                  ? "We'll gently remind you to meditate"
                  : 'Get friendly reminders to keep your streak going'}
              </motion.p>
            </div>
            
            <div className="page-bottom">
              {!notificationGranted && !notificationAnimating && (
                <motion.div
                  className="action-buttons"
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.4 }}
                >
                  <Button variant="primary" onClick={handleNotificationRequest} fullWidth>
                    <Bell size={18} />
                    Enable Reminders
                  </Button>
                  <button className="text-button" onClick={handleNextStep}>
                    Not now
                  </button>
                </motion.div>
              )}
            </div>
          </motion.div>
        )}

        {/* Name Step - Using Sloth Hammock Image with Speech Bubble */}
        {step === 'name' && (
          <motion.div
            key="name"
            className="onboarding-page"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
          >
            <div className="page-top">
              <div className="step-indicator">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className={`step-dot ${i <= getStepNumber() ? 'active' : ''}`} />
                ))}
              </div>
              
              {/* Hammock Sloth with Speech Bubble */}
              <motion.div
                className="hammock-mascot-container"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 12, delay: 0.1 }}
              >
                {/* Speech Bubble - appears when user types their name */}
                <AnimatePresence>
                  {name.trim() && (
                    <motion.div
                      className="name-speech-bubble"
                      initial={{ opacity: 0, scale: 0.8, y: 10, x: "-50%" }}
                      animate={{ opacity: 1, scale: 1, y: 0, x: "-50%" }}
                      exit={{ opacity: 0, scale: 0.8, y: 10, x: "-50%" }}
                      transition={{ type: 'spring', damping: 15 }}
                    >
                      <span>Hi, {name}! 👋</span>
                      <div className="bubble-tail" />
                    </motion.div>
                  )}
                </AnimatePresence>
                <img src={slothImages.hammock} alt="" className="hammock-mascot" />
              </motion.div>

              <motion.h2
                className="page-title title-wave"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                What's your name?
              </motion.h2>
              
              <motion.p
                className="page-subtitle"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                Let's personalize your experience
              </motion.p>

              <motion.div
                className="input-wrapper"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <input
                  type="text"
                  placeholder="Enter your name"
                  value={name}
                  onChange={(e) => setName(e.target.value.slice(0, 15))}
                  maxLength={15}
                  className="text-input"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleNextStep()}
                />
              </motion.div>
            </div>
            
            <div className="page-bottom">
              <motion.div
                className="action-buttons"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Button variant="primary" onClick={handleNextStep} fullWidth>
                  Continue
                  <ArrowRight size={18} />
                </Button>
                {!name.trim() && (
                  <button className="text-button" onClick={handleNextStep}>
                    Skip for now
                  </button>
                )}
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* Email Step - Using Sloth Mail Image */}
        {step === 'email' && (
          <motion.div
            key="email"
            className="onboarding-page"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
          >
            <div className="page-top">
              <div className="step-indicator">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className={`step-dot ${i <= getStepNumber() ? 'active' : ''}`} />
                ))}
              </div>
              
              <motion.div
                className="mascot-avatar mail-mascot"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 12, delay: 0.1 }}
              >
                <img src={slothImages.mail} alt="" />
              </motion.div>

              <motion.h2
                className="page-title title-wave"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                {name ? `Hi ${name}!` : 'Almost there!'}
              </motion.h2>
              
              <motion.p
                className="page-subtitle"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                What's your email address?
              </motion.p>

              <motion.div
                className="input-wrapper"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <input
                  type="email"
                  placeholder="your@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="text-input"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleNextStep()}
                />
              </motion.div>
            </div>
            
            <div className="page-bottom">
              <motion.div
                className="action-buttons"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Button variant="primary" onClick={handleNextStep} fullWidth>
                  Continue
                  <ArrowRight size={18} />
                </Button>
                <button className="text-button" onClick={handleNextStep}>
                  Skip for now
                </button>
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* Phone Step - Using Sloth Phone Image */}
        {step === 'phone' && (
          <motion.div
            key="phone"
            className="onboarding-page"
            initial={{ opacity: 0, x: 50 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -50 }}
            transition={{ duration: 0.3 }}
          >
            <div className="page-top">
              <div className="step-indicator">
                {[1, 2, 3, 4, 5].map(i => (
                  <div key={i} className={`step-dot ${i <= getStepNumber() ? 'active' : ''}`} />
                ))}
              </div>
              
              <motion.div
                className="mascot-avatar phone-mascot"
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ type: 'spring', damping: 12, delay: 0.1 }}
              >
                <img src={slothImages.phone} alt="" />
              </motion.div>

              <motion.h2
                className="page-title title-wave"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 }}
              >
                One last thing!
              </motion.h2>
              
              <motion.p
                className="page-subtitle"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                Add your phone for account recovery
              </motion.p>

              <motion.div
                className="input-wrapper"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                <input
                  type="tel"
                  placeholder="(555) 123-4567"
                  value={phone}
                  onChange={(e) => setPhone(formatPhoneNumber(e.target.value))}
                  className="text-input"
                  autoFocus
                  onKeyDown={(e) => e.key === 'Enter' && handleNextStep()}
                />
              </motion.div>
            </div>
            
            <div className="page-bottom">
              <motion.div
                className="action-buttons"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
              >
                <Button variant="primary" onClick={handleNextStep} fullWidth>
                  Continue
                  <ArrowRight size={18} />
                </Button>
                <button className="text-button" onClick={handleNextStep}>
                  Skip for now
                </button>
              </motion.div>
            </div>
          </motion.div>
        )}

        {/* Special Offer Step */}
        {step === 'offer' && (
          <motion.div
            key="offer"
            className="onboarding-page offer-page"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.4 }}
          >
            <div className="offer-top">
              <motion.div
                className="offer-badge"
                initial={{ scale: 0, rotate: -10 }}
                animate={{ scale: 1, rotate: 0 }}
                transition={{ type: 'spring', damping: 10, delay: 0.1 }}
              >
                <Gift size={16} />
                <span>SPECIAL OFFER</span>
              </motion.div>

              <motion.div
                className="offer-mascot"
                initial={{ scale: 0, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                transition={{ type: 'spring', damping: 12, delay: 0.2 }}
              >
                <img src={slothImages.congrats} alt="" />
              </motion.div>

              <motion.h2
                className="offer-title"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3 }}
              >
                {name ? `${name}, you're all set!` : "You're all set!"}
              </motion.h2>
              
              <motion.p
                className="offer-subtitle"
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.4 }}
              >
                Start your journey with an exclusive offer
              </motion.p>
            </div>

            <motion.div 
              className="offer-bottom"
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
            >
              <div className="premium-card">
                <div className="card-header">
                  <div className="card-title-row">
                    <Crown size={20} className="crown-icon" />
                    <span className="card-title">ZenPal Premium</span>
                  </div>
                  <div className="price-row">
                    <span className="original-price">$9.99</span>
                    <span className="sale-price">$7.49</span>
                    <span className="price-period">/month</span>
                  </div>
                  <div className="discount-pill">
                    <Sparkles size={12} />
                    <span>25% OFF First Month</span>
                  </div>
                </div>

                <div className="features-list">
                  <div className="feature-item">
                    <div className="feature-icon"><Zap size={16} /></div>
                    <span>Unlimited daily meditations</span>
                  </div>
                  <div className="feature-item">
                    <div className="feature-icon"><Mic size={16} /></div>
                    <span>Custom meditation durations</span>
                  </div>
                  <div className="feature-item">
                    <div className="feature-icon"><Brain size={16} /></div>
                    <span>AI Journey insights</span>
                  </div>
                  <div className="feature-item">
                    <div className="feature-icon"><History size={16} /></div>
                    <span>Session replay & history</span>
                  </div>
                  <div className="feature-item">
                    <div className="feature-icon"><Heart size={16} /></div>
                    <span>Priority voice generation</span>
                  </div>
                </div>

                <div className="card-actions">
                  <Button variant="gold" onClick={handleAcceptOffer} fullWidth>
                    <Crown size={18} />
                    Claim 25% Off
                  </Button>
                  <button className="skip-offer-btn" onClick={handleSkipOffer}>
                    Continue with Free
                  </button>
                </div>

                <p className="card-note">Cancel anytime • No commitment</p>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <style>{`
        .onboarding-screen {
          height: 100%;
          overflow: hidden;
        }

        .onboarding-page {
          height: 100%;
          display: flex;
          flex-direction: column;
        }

        /* ============================================
           WELCOME PAGE
           ============================================ */
        .welcome-page {
          background: linear-gradient(180deg, #FAFFF8 0%, #E8F5EC 100%);
        }

        .welcome-top {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          padding: 40px 32px;
        }

        .logo-container {
          margin-bottom: 24px;
        }

        .logo-circle {
          width: 160px;
          height: 160px;
          background: white;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          box-shadow: 
            0 8px 32px rgba(90, 158, 107, 0.2),
            0 2px 8px rgba(0, 0, 0, 0.05);
        }

        .logo-mascot {
          width: 130px;
          height: 130px;
          object-fit: contain;
        }

        .welcome-title {
          font-size: 2.5rem;
          font-weight: 900;
          color: #1A3D2E;
          margin: 0 0 8px 0;
          letter-spacing: -0.02em;
        }

        .welcome-tagline {
          font-size: 1.125rem;
          font-weight: 600;
          color: #5A9E6B;
          margin: 0;
        }

        .welcome-bottom {
          background: #2D5A3D;
          padding: 40px 32px;
          display: flex;
          justify-content: center;
        }

        .loading-dots {
          display: flex;
          gap: 8px;
        }

        .dot {
          width: 10px;
          height: 10px;
          background: rgba(255, 255, 255, 0.8);
          border-radius: 50%;
        }

        /* ============================================
           STANDARD PAGES
           ============================================ */
        .page-top {
          flex: 1;
          background: linear-gradient(180deg, #FAFFF8 0%, #E8F5EC 100%);
          padding: 32px 28px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .step-indicator {
          display: flex;
          gap: 8px;
          margin-bottom: 24px;
        }

        .step-dot {
          width: 8px;
          height: 8px;
          border-radius: 4px;
          background: #D1E8D4;
          transition: all 0.3s ease;
        }

        .step-dot.active {
          width: 24px;
          background: #5A9E6B;
        }

        /* ============================================
           NOTIFICATION MASCOT
           ============================================ */
        .notification-mascot {
          width: 280px;
          height: 280px;
          margin-bottom: 16px;
          position: relative;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .notification-mascot img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          filter: drop-shadow(0 12px 28px rgba(0, 0, 0, 0.15));
        }

        .success-overlay {
          position: absolute;
          top: 20px;
          right: 30px;
          z-index: 10;
        }

        .success-check {
          width: 56px;
          height: 56px;
          background: linear-gradient(135deg, #5A9E6B 0%, #3D7A4D 100%);
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
          color: white;
          box-shadow: 0 4px 12px rgba(90, 158, 107, 0.4);
        }

        /* Subtle y-axis wiggle for notification sloth */
        .notification-sloth-img {
          animation: subtleWiggle 2.5s ease-in-out infinite;
        }

        @keyframes subtleWiggle {
          0%, 100% {
            transform: translateY(0);
          }
          50% {
            transform: translateY(-4px);
          }
        }

        /* Sloth cursor animation */
        .sloth-cursor-container {
          position: absolute;
          top: 50%;
          right: -40px;
          width: 125px;
          height: 125px;
          z-index: 10;
          animation: cursorPath 10s ease-in-out infinite;
        }

        .sloth-cursor {
          width: 100%;
          height: 100%;
          object-fit: contain;
          filter: drop-shadow(0 4px 8px rgba(0, 0, 0, 0.2));
          transform: rotate(-20deg);
          animation: cursorFade 10s ease-in-out infinite;
        }

        @keyframes cursorPath {
          0% {
            transform: translate(80px, 40px);
          }
          /* Move directly toward notification center */
          35% {
            transform: translate(-50px, -15px);
          }
          /* Click moment - small press down */
          40% {
            transform: translate(-50px, -7px) scale(0.92);
          }
          45% {
            transform: translate(-50px, -15px) scale(1);
          }
          /* Hold position after click for 2 seconds */
          65% {
            transform: translate(-50px, -15px);
          }
          /* Stay in place while fading */
          75% {
            transform: translate(-50px, -15px);
          }
          /* Reset position during invisible period */
          76% {
            transform: translate(80px, 40px);
          }
          100% {
            transform: translate(80px, 40px);
          }
        }

        @keyframes cursorFade {
          0% {
            opacity: 0;
          }
          5% {
            opacity: 1;
          }
          /* Visible through movement and click */
          65% {
            opacity: 1;
          }
          /* Fade out */
          75% {
            opacity: 0;
          }
          /* Stay invisible for 2 seconds before reset */
          100% {
            opacity: 0;
          }
        }

        /* Title wave animation - ADA compliant green with shimmer */
        .title-wave {
          color: #1A5D2E;
          background: linear-gradient(
            90deg,
            #1A5D2E 0%,
            #1A5D2E 40%,
            #3D9E5B 50%,
            #1A5D2E 60%,
            #1A5D2E 100%
          );
          background-size: 200% 100%;
          background-clip: text;
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          animation: titleWave 6s ease-in-out infinite;
        }

        @keyframes titleWave {
          0%, 100% {
            background-position: 100% 0;
          }
          50% {
            background-position: 0% 0;
          }
        }

        /* ============================================
           HAMMOCK MASCOT WITH SPEECH BUBBLE
           ============================================ */
        .hammock-mascot-container {
          position: relative;
          width: calc(100% + 56px);
          margin-left: -28px;
          margin-right: -28px;
          height: 220px;
          margin-bottom: 4px;
          display: flex;
          align-items: center;
          justify-content: center;
        }

        .hammock-mascot {
          width: 100%;
          height: 100%;
          object-fit: contain;
          filter: drop-shadow(0 12px 28px rgba(0, 0, 0, 0.15));
        }

        .name-speech-bubble {
          position: absolute;
          top: -14px;
          left: 50%;
          background: white;
          padding: 14px 24px;
          border-radius: 24px;
          box-shadow: 
            0 6px 24px rgba(90, 158, 107, 0.25),
            0 2px 8px rgba(0, 0, 0, 0.08);
          white-space: nowrap;
          z-index: 100;
          border: 2px solid #E8F5EC;
          text-align: center;
        }

        .name-speech-bubble span {
          font-size: 1.125rem;
          font-weight: 700;
          color: #1A3D2E;
          letter-spacing: -0.01em;
          display: block;
          text-align: center;
        }

        .bubble-tail {
          position: absolute;
          bottom: -12px;
          left: 50%;
          transform: translateX(-50%);
          width: 0;
          height: 0;
          border-left: 14px solid transparent;
          border-right: 14px solid transparent;
          border-top: 14px solid white;
          filter: drop-shadow(0 2px 2px rgba(0, 0, 0, 0.05));
        }

        /* ============================================
           MASCOT AVATARS (Mail, Phone)
           ============================================ */
        .mascot-avatar {
          width: 260px;
          height: 260px;
          margin-bottom: 12px;
        }

        .mascot-avatar img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          filter: drop-shadow(0 12px 28px rgba(0, 0, 0, 0.15));
        }

        .mail-mascot,
        .phone-mascot {
          width: 280px;
          height: 280px;
        }

        .page-title {
          font-size: 1.75rem;
          font-weight: 800;
          color: #1A3D2E;
          margin: 0 0 8px 0;
          text-align: center;
        }

        .page-subtitle {
          font-size: 1rem;
          font-weight: 600;
          color: #6B8F76;
          margin: 0;
          text-align: center;
          max-width: 280px;
        }

        .input-wrapper {
          width: 100%;
          max-width: 320px;
          margin-top: 24px;
        }

        .text-input {
          width: 100%;
          padding: 16px 20px;
          font-size: 1.0625rem;
          font-weight: 600;
          color: #1A3D2E;
          background: white;
          border: 2px solid #D1E8D4;
          border-radius: 16px;
          outline: none;
          transition: all 0.2s ease;
          text-align: center;
        }

        .text-input::placeholder {
          color: #A8C5AD;
        }

        .text-input:focus {
          border-color: #5A9E6B;
          box-shadow: 0 0 0 4px rgba(90, 158, 107, 0.12);
        }

        .page-bottom {
          background: #2D5A3D;
          padding: 28px 28px 36px;
          position: relative;
        }

        .action-buttons {
          display: flex;
          flex-direction: column;
          gap: 12px;
          align-items: center;
        }

        .text-button {
          background: none;
          border: none;
          color: rgba(255, 255, 255, 0.6);
          font-size: 0.9375rem;
          font-weight: 600;
          cursor: pointer;
          padding: 8px 16px;
          transition: color 0.2s;
        }

        .text-button:hover {
          color: rgba(255, 255, 255, 0.9);
        }

        /* ============================================
           OFFER PAGE
           ============================================ */
        .offer-page {
          background: linear-gradient(180deg, #FAFFF8 0%, #E8F5EC 50%, #D4EDDA 100%);
        }

        .offer-top {
          padding: 28px 28px 20px;
          display: flex;
          flex-direction: column;
          align-items: center;
        }

        .offer-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          background: linear-gradient(135deg, #FFD93D 0%, #F5B800 100%);
          color: #1A2E1A;
          font-size: 0.6875rem;
          font-weight: 800;
          border-radius: 20px;
          letter-spacing: 0.05em;
          margin-bottom: 16px;
          box-shadow: 0 4px 12px rgba(255, 217, 61, 0.3);
        }

        .offer-mascot {
          width: 120px;
          height: 120px;
          margin-bottom: 16px;
        }

        .offer-mascot img {
          width: 100%;
          height: 100%;
          object-fit: contain;
          filter: drop-shadow(0 8px 20px rgba(0, 0, 0, 0.1));
        }

        .offer-title {
          font-size: 1.5rem;
          font-weight: 800;
          color: #1A3D2E;
          margin: 0 0 6px 0;
          text-align: center;
        }

        .offer-subtitle {
          font-size: 0.9375rem;
          font-weight: 600;
          color: #6B8F76;
          margin: 0;
          text-align: center;
        }

        .offer-bottom {
          flex: 1;
          padding: 0 20px 24px;
          display: flex;
          flex-direction: column;
        }

        .premium-card {
          background: white;
          border-radius: 24px;
          padding: 24px;
          box-shadow: 
            0 8px 32px rgba(90, 158, 107, 0.15),
            0 2px 8px rgba(0, 0, 0, 0.05);
        }

        .card-header {
          text-align: center;
          padding-bottom: 20px;
          border-bottom: 1px solid #E8F5EC;
          margin-bottom: 20px;
        }

        .card-title-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 8px;
          margin-bottom: 12px;
        }

        .crown-icon {
          color: #FFD93D;
        }

        .card-title {
          font-size: 1rem;
          font-weight: 700;
          color: #1A3D2E;
        }

        .price-row {
          display: flex;
          align-items: baseline;
          justify-content: center;
          gap: 8px;
          margin-bottom: 12px;
        }

        .original-price {
          font-size: 1rem;
          font-weight: 600;
          color: #A8C5AD;
          text-decoration: line-through;
        }

        .sale-price {
          font-size: 2.25rem;
          font-weight: 900;
          color: #1A3D2E;
        }

        .price-period {
          font-size: 0.9375rem;
          font-weight: 600;
          color: #6B8F76;
        }

        .discount-pill {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 6px 12px;
          background: linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%);
          color: white;
          font-size: 0.6875rem;
          font-weight: 700;
          border-radius: 12px;
          letter-spacing: 0.02em;
        }

        .features-list {
          display: flex;
          flex-direction: column;
          gap: 14px;
          margin-bottom: 24px;
        }

        .feature-item {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .feature-icon {
          width: 32px;
          height: 32px;
          background: #E8F5EC;
          border-radius: 10px;
          display: flex;
          align-items: center;
          justify-content: center;
          color: #5A9E6B;
          flex-shrink: 0;
        }

        .feature-item span {
          font-size: 0.9375rem;
          font-weight: 600;
          color: #3D5A47;
        }

        .card-actions {
          display: flex;
          flex-direction: column;
          gap: 10px;
        }

        .skip-offer-btn {
          background: none;
          border: none;
          color: #6B8F76;
          font-size: 0.875rem;
          font-weight: 600;
          cursor: pointer;
          padding: 12px;
          transition: color 0.2s;
        }

        .skip-offer-btn:hover {
          color: #3D5A47;
        }

        .card-note {
          text-align: center;
          font-size: 0.75rem;
          color: #A8C5AD;
          margin: 12px 0 0 0;
        }
      `}</style>
    </div>
  );
}
