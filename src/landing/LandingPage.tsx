import { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Mail, Sparkles, Heart, Brain, Mic, ArrowRight, Check, Apple, X } from 'lucide-react';
import { slothImages } from '../components/mascot/slothAssets';
import './LandingPage.css';

export function LandingPage() {
  const [email, setEmail] = useState('');
  const [isSubscribed, setIsSubscribed] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFeatures, setShowFeatures] = useState(false);
  const [showSlothBubble, setShowSlothBubble] = useState(false);
  const particles = useMemo(
    () => Array.from({ length: 30 }, (_, i) => ({
      left: `${(i * 17) % 100}%`,
      animationDelay: `${(i % 8) * 0.9}s`,
      animationDuration: `${8 + (i % 6)}s`,
      width: `${3 + (i % 4)}px`,
      height: `${3 + (i % 4)}px`,
    })),
    []
  );

  const handleSubscribe = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email.trim()) return;
    
    setIsSubmitting(true);
    await new Promise(resolve => setTimeout(resolve, 1000));
    setIsSubscribed(true);
    setIsSubmitting(false);
  };

  const handleQRClick = () => {
    // In production, this would link to App Store
    window.open('https://apps.apple.com', '_blank');
  };

  const features = [
    { icon: Mic, text: 'Voice-powered meditation' },
    { icon: Brain, text: 'AI-personalized sessions' },
    { icon: Heart, text: 'Mood-adaptive guidance' },
  ];

  return (
    <div className="landing-page">
      {/* Foggy green background */}
      <div className="bg-fog">
        <div className="fog-layer fog-1" />
        <div className="fog-layer fog-2" />
        <div className="fog-layer fog-3" />
      </div>

      {/* Floating particles moving up */}
      <div className="particles">
        {particles.map((particle, i) => (
          <div key={i} className="particle" style={particle} />
        ))}
      </div>

      {/* Main content */}
      <div className="landing-content">
        {/* Logo/Title - positioned above the cards */}
        <div className="hero-section">
          <motion.div 
            className="logo-centered"
            initial={{ opacity: 0, y: -30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8 }}
          >
            <h1 className="logo-text-large">ZenPal</h1>
          </motion.div>
        </div>

        {/* Cards Section - Moved left toward sloth */}
        <div className="cards-section">
          {/* Features Button with animated label */}
          <motion.div 
            className="features-button-container"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.5, delay: 0.4 }}
          >
            <div className="features-label-wrapper">
              <span className="features-label">Features</span>
            </div>
            <button 
              className="features-button"
              onClick={() => setShowFeatures(!showFeatures)}
              onMouseEnter={() => setShowFeatures(true)}
              onMouseLeave={() => setShowFeatures(false)}
            >
              <Sparkles size={20} />
            </button>

            {/* Features Popup */}
            <AnimatePresence>
              {showFeatures && (
                <motion.div 
                  className="features-popup"
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                >
                  <button 
                    className="features-close"
                    onClick={() => setShowFeatures(false)}
                  >
                    <X size={14} />
                  </button>
                  {features.map((feature, i) => (
                    <motion.div 
                      key={i}
                      className="feature-item"
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.1 }}
                    >
                      <feature.icon size={18} />
                      <span>{feature.text}</span>
                    </motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Download Card */}
          <motion.div 
            className="card-wrapper"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <div className="card glow-card">
              <div className="card-content">
                <div className="card-header">
                  <Apple size={20} />
                  <span>Download on iOS</span>
                </div>
                <div className="qr-code" onClick={handleQRClick}>
                  <svg viewBox="0 0 100 100" className="qr-svg">
                    <rect x="10" y="10" width="25" height="25" fill="currentColor" />
                    <rect x="65" y="10" width="25" height="25" fill="currentColor" />
                    <rect x="10" y="65" width="25" height="25" fill="currentColor" />
                    <rect x="15" y="15" width="15" height="15" fill="white" />
                    <rect x="70" y="15" width="15" height="15" fill="white" />
                    <rect x="15" y="70" width="15" height="15" fill="white" />
                    <rect x="18" y="18" width="9" height="9" fill="currentColor" />
                    <rect x="73" y="18" width="9" height="9" fill="currentColor" />
                    <rect x="18" y="73" width="9" height="9" fill="currentColor" />
                    <rect x="40" y="40" width="20" height="20" fill="currentColor" />
                    <rect x="44" y="44" width="12" height="12" fill="white" />
                    <rect x="47" y="47" width="6" height="6" fill="currentColor" />
                    <rect x="40" y="12" width="5" height="5" fill="currentColor" />
                    <rect x="48" y="12" width="5" height="5" fill="currentColor" />
                    <rect x="40" y="20" width="5" height="5" fill="currentColor" />
                    <rect x="52" y="20" width="5" height="5" fill="currentColor" />
                    <rect x="12" y="40" width="5" height="5" fill="currentColor" />
                    <rect x="20" y="48" width="5" height="5" fill="currentColor" />
                    <rect x="28" y="40" width="5" height="5" fill="currentColor" />
                    <rect x="12" y="52" width="5" height="5" fill="currentColor" />
                    <rect x="65" y="40" width="5" height="5" fill="currentColor" />
                    <rect x="75" y="48" width="5" height="5" fill="currentColor" />
                    <rect x="83" y="40" width="5" height="5" fill="currentColor" />
                    <rect x="65" y="52" width="5" height="5" fill="currentColor" />
                    <rect x="40" y="65" width="5" height="5" fill="currentColor" />
                    <rect x="48" y="75" width="5" height="5" fill="currentColor" />
                    <rect x="52" y="65" width="5" height="5" fill="currentColor" />
                    <rect x="40" y="83" width="5" height="5" fill="currentColor" />
                    <rect x="75" y="65" width="5" height="5" fill="currentColor" />
                    <rect x="83" y="75" width="5" height="5" fill="currentColor" />
                    <rect x="65" y="83" width="5" height="5" fill="currentColor" />
                  </svg>
                </div>
                <p className="card-hint">Scan or click to download</p>
              </div>
            </div>
          </motion.div>

          {/* Newsletter Card */}
          <motion.div 
            className="card-wrapper"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.7 }}
          >
            <div className="card glow-card">
              <div className="card-content">
                <div className="newsletter-header">
                  <Mail size={22} className="newsletter-icon" />
                  <div>
                    <h3>Meditation Station</h3>
                    <p>Weekly mindfulness tips</p>
                  </div>
                </div>

                {!isSubscribed ? (
                  <form onSubmit={handleSubscribe} className="newsletter-form">
                    <input
                      type="email"
                      placeholder="Enter your email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                    />
                    <button type="submit" disabled={isSubmitting}>
                      {isSubmitting ? (
                        <div className="spinner" />
                      ) : (
                        <ArrowRight size={18} />
                      )}
                    </button>
                  </form>
                ) : (
                  <motion.div 
                    className="success-message"
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                  >
                    <div className="success-icon">
                      <Check size={20} />
                    </div>
                    <p>You're in! Check your inbox.</p>
                  </motion.div>
                )}
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Sloth mascot - static at bottom left corner with hover speech bubble */}
      <div 
        className="landing-mascot"
        onMouseEnter={() => setShowSlothBubble(true)}
        onMouseLeave={() => setShowSlothBubble(false)}
      >
        <img src={slothImages.landing} alt="ZenPal Sloth" />
        <AnimatePresence>
          {showSlothBubble && (
            <motion.div 
              className="sloth-speech-bubble"
              initial={{ opacity: 0, y: 10, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: 10, scale: 0.95 }}
              transition={{ duration: 0.3 }}
            >
              <span>Hi, I'm Zen! 👋 Meet me in the app for free meditations! 🧘‍♀️</span>
              <div className="speech-bubble-tail" />
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
