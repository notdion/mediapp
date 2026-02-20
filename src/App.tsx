import { useCallback, useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { MobileFrame } from './components/ui/MobileFrame';
import { OnboardingScreen } from './components/screens/OnboardingScreen';
import { HomeScreen } from './components/screens/HomeScreen';
import { RecordingScreen } from './components/screens/RecordingScreen';
import { ProcessingScreen } from './components/screens/ProcessingScreen';
import { MeditationScreen } from './components/screens/MeditationScreen';
import { ProfileScreen } from './components/screens/ProfileScreen';
import { SessionPlaybackScreen } from './components/screens/SessionPlaybackScreen';
import { AIJourneyScreen } from './components/screens/AIJourneyScreen';
import { PaywallModal } from './components/ui/PaywallModal';
import { SuccessAnimation } from './components/ui/SuccessAnimation';
import { useAppStore } from './store/useAppStore';
import { createMeditationFast, generateSummary } from './services/apiOptimized';
import { getJourneyData, type DbSession } from './services/supabase';
import type { JourneyMeditation } from './services/aiJourney';
import type { MoodTag, Session } from './types';
import { isBlobUrl, replaceManagedObjectUrl, revokeBlobUrl } from './utils/objectUrl';
import { SCREEN_TRANSITION } from './theme/motion';

// Sample meditation scripts for demo - base scripts that can be expanded
const SAMPLE_SCRIPTS: Record<MoodTag, string> = {
  UPLIFTING: "Let that feeling of lightness wash over you. Breathe in deeply, feeling your chest expand with possibility. Each breath draws in golden warmth, filling your entire being with renewed energy. Notice how your shoulders naturally begin to lift, your heart feeling open and ready for whatever comes next...",
  CALMING: "Close your eyes and let that tension in your shoulders melt away. Breathe in slowly through your nose, counting to four. Hold for a moment. Now release, letting go of everything that's weighing on you. Feel your body becoming heavier, sinking into peaceful stillness...",
  ENERGIZING: "Feel the energy building at the base of your spine. With each breath, draw that vibrant force upward through your body. Let it spark and crackle with potential. Your mind is clearing, focusing, becoming sharp and ready for action...",
  HEALING: "Place your hand gently over your heart. Feel its steady rhythm, a reminder of your resilience. With each beat, imagine healing light spreading through your body, touching every cell with compassion and renewal...",
  FOCUSED: "Let your attention narrow to a single point of light in your mind's eye. All distractions fade to the periphery. There is only this moment, this breath, this clear and present awareness. Your mind is a still pond, reflecting only what matters most...",
  SLEEPY: "Let your eyelids grow heavy. Each breath draws you deeper into peaceful rest. Your thoughts are clouds, drifting slowly across a twilight sky. There's nothing to do, nowhere to be. Only this gentle descent into dreams...",
  ANXIOUS: "Notice that racing feeling, but don't fight it. Instead, imagine each anxious thought as a leaf on a stream. Watch them float by, acknowledging them without holding on. Your breath is an anchor, keeping you grounded in this present moment...",
  GRATEFUL: "Bring to mind something small that brought you joy today. Hold it gently in your awareness. Feel how gratitude softens your heart, opens your chest. Each blessing, no matter how small, is a light that dispels the darkness...",
  MOTIVATED: "Feel the fire of determination igniting within you. You have overcome challenges before, and you will overcome this. Each breath fans the flames of your inner strength. You are capable. You are ready. You will succeed...",
};

// Extended meditation content for longer durations
const EXTENDED_CONTENT: Record<MoodTag, string[]> = {
  UPLIFTING: [
    "Now, with each breath, imagine a warm golden light beginning at your feet. Feel it rising slowly through your body, bringing warmth and comfort to every part of you.",
    "This light represents all the good that exists in your life. It may be small things – a kind word, a moment of laughter, the warmth of the sun on your face.",
    "Let this light gather in your chest, around your heart. Feel it expanding with each breath, growing brighter and warmer.",
    "You are worthy of this light. You are worthy of joy, of peace, of all good things. Let this truth settle into your bones.",
    "As you continue to breathe, imagine this light extending beyond your body, touching everyone you love, spreading out into the world.",
  ],
  CALMING: [
    "Picture yourself in a peaceful garden. The air is soft and warm. You can hear the gentle trickle of water from a nearby fountain.",
    "Walk slowly along the winding path. Notice the flowers on either side – their colors vibrant, their petals soft.",
    "Find a comfortable bench beneath an old oak tree. Sit down and feel the solid earth beneath you, supporting you completely.",
    "A gentle breeze carries the scent of lavender and jasmine. Let it wash over you, carrying away any remaining tension.",
    "You are safe here. You are held. There is nothing you need to do but breathe and be present in this moment.",
  ],
  ENERGIZING: [
    "Visualize yourself standing at the top of a mountain at dawn. The air is crisp and clean, filling your lungs with vitality.",
    "Watch as the first rays of sunlight break over the horizon. Feel their warmth on your face, energizing every cell in your body.",
    "With each breath, draw in this light. Feel it coursing through your veins, awakening your body and sharpening your mind.",
    "You are powerful. You are capable. This energy within you can accomplish great things.",
    "Carry this feeling with you as you move through your day. You have unlimited reserves of strength and determination.",
  ],
  HEALING: [
    "Imagine a gentle, healing light entering through the top of your head. It's soft and warm, like liquid gold.",
    "This light knows exactly where you need healing. Let it flow to those places – physical, emotional, or spiritual.",
    "As the light touches these areas, feel old wounds beginning to close. Feel old pain beginning to dissolve.",
    "You don't have to force anything. Healing happens in its own time. Simply allow the light to do its work.",
    "With each breath, you are becoming more whole. With each moment, you are healing. Trust in your body's wisdom.",
  ],
  FOCUSED: [
    "Imagine your mind as a clear mountain lake. Its surface is perfectly still, reflecting the sky above.",
    "When thoughts arise, they are merely ripples on the surface. Watch them form and fade away, returning to stillness.",
    "Beneath the surface, there is profound depth and clarity. This is your true mind – clear, focused, and infinitely capable.",
    "Draw your attention to a single point in the center of your awareness. Let everything else fade into the background.",
    "From this place of clarity, you can accomplish anything. Your focus is sharp. Your intention is clear.",
  ],
  SLEEPY: [
    "Imagine yourself sinking into the softest cloud. It holds you perfectly, conforming to every curve of your body.",
    "With each exhale, you sink a little deeper. The cloud supports you completely. You don't have to hold anything up.",
    "Around you, the sky is turning from soft pink to deep purple to the velvet darkness of night.",
    "Stars begin to appear, one by one. Each one represents a worry leaving your mind, floating up into the cosmos.",
    "You are drifting now, gently, peacefully. Sleep is coming to welcome you like an old friend.",
  ],
  ANXIOUS: [
    "Imagine you're standing on a beach. The waves come in and go out, a constant, reliable rhythm.",
    "With each wave that comes in, bring your attention to your breath. With each wave that goes out, release your worries.",
    "You are safe here. The anxiety you feel is just weather – it will pass. You are the sky beneath it.",
    "Place your feet firmly in the sand. Feel the earth supporting you. You are grounded. You are present.",
    "Whatever happens, you can handle it. You have faced challenges before. You have always found your way.",
  ],
  GRATEFUL: [
    "Think of someone who has shown you kindness. Hold their image in your mind. Send them silent thanks.",
    "Now think of your body – this incredible vessel that carries you through life. Thank it for its constant service.",
    "Consider the simple miracles around you – the air you breathe, the ground that holds you, the light that lets you see.",
    "Gratitude is a garden. Each thing you appreciate is a seed that grows into more beauty, more joy, more abundance.",
    "Let your heart overflow with thankfulness. There is so much good in your life. There is so much to celebrate.",
  ],
  MOTIVATED: [
    "Visualize your goal clearly in your mind. See it in vivid detail. Make it real in your imagination.",
    "Now see yourself achieving it. Feel the satisfaction, the pride, the joy of accomplishment.",
    "This vision is your compass. It will guide you through difficulties, keep you on track when you want to give up.",
    "You have everything you need within you. Your determination is your superpower. Your persistence will prevail.",
    "Today, take one step forward. Then another. Progress, not perfection. Consistency, not intensity.",
  ],
};

// Generate meditation script based on duration
function generateMeditationScript(mood: MoodTag, durationSeconds: number): string {
  const baseScript = SAMPLE_SCRIPTS[mood];
  const extensions = EXTENDED_CONTENT[mood];
  
  // For short meditations (30s-60s), just use base script
  if (durationSeconds <= 60) {
    return baseScript;
  }
  
  // For longer meditations, add extended content
  const scriptsNeeded = Math.min(Math.floor(durationSeconds / 120), extensions.length);
  let fullScript = baseScript;
  
  for (let i = 0; i < scriptsNeeded; i++) {
    fullScript += "\n\n" + extensions[i];
  }
  
  // Add closing for longer meditations
  if (durationSeconds >= 300) {
    fullScript += "\n\nAs we begin to close this meditation, take a moment to appreciate the time you've given yourself. This is an act of self-love, a gift of presence.";
    fullScript += "\n\nWhen you're ready, begin to deepen your breath. Wiggle your fingers and toes. Slowly return your awareness to your surroundings.";
    fullScript += "\n\nCarry this peace with you. It is always available to you. You need only close your eyes and breathe.";
  }
  
  return fullScript;
}

// Simulated mood detection based on keywords (would use AI in production)
function detectMood(transcript: string): MoodTag {
  const lowerText = transcript.toLowerCase();
  
  if (lowerText.includes('stress') || lowerText.includes('anxious') || lowerText.includes('worried')) {
    return 'ANXIOUS';
  }
  if (lowerText.includes('tired') || lowerText.includes('sleep') || lowerText.includes('exhausted')) {
    return 'SLEEPY';
  }
  if (lowerText.includes('sad') || lowerText.includes('hurt') || lowerText.includes('pain')) {
    return 'HEALING';
  }
  if (lowerText.includes('happy') || lowerText.includes('good') || lowerText.includes('great')) {
    return 'UPLIFTING';
  }
  if (lowerText.includes('work') || lowerText.includes('focus') || lowerText.includes('productive')) {
    return 'FOCUSED';
  }
  if (lowerText.includes('grateful') || lowerText.includes('thankful') || lowerText.includes('blessed')) {
    return 'GRATEFUL';
  }
  if (lowerText.includes('motivated') || lowerText.includes('goal') || lowerText.includes('achieve')) {
    return 'MOTIVATED';
  }
  if (lowerText.includes('energy') || lowerText.includes('excited') || lowerText.includes('pump')) {
    return 'ENERGIZING';
  }
  
  // Default to calming
  return 'CALMING';
}

function App() {
  const {
    currentScreen,
    setScreen,
    user,
    setUser,
    setMascotState,
    updateStreak,
    incrementDailySession,
    checkDailyLimit,
    addSession,
    resetMeditation,
    setTranscript,
    setCurrentMood,
    setMeditationScript,
    sessions,
    hasCompletedOnboarding,
    setOnboardingComplete,
  } = useAppStore();

  const [showPaywall, setShowPaywall] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const [currentMood, setLocalMood] = useState<MoodTag>('CALMING');
  const [meditationScript, setLocalScript] = useState('');
  const [meditationDuration, setMeditationDuration] = useState(60); // Default 60 seconds
  const [playingSession, setPlayingSession] = useState<Session | null>(null);
  const [voiceAudioUrl, setVoiceAudioUrl] = useState<string | null>(null);
  const voiceAudioUrlRef = useRef<string | null>(null);
  const [processingStep, setProcessingStep] = useState('Processing...');
  const [processingError, setProcessingError] = useState<string | null>(null);
  
  // AI Journey state
  const [journeyAvailable, setJourneyAvailable] = useState(false);
  const [journeySessions, setJourneySessions] = useState<DbSession[]>([]);

  /**
   * Centralized object-URL ownership for meditation audio.
   * We keep the lifecycle here so audio URL semantics remain portable for the
   * planned Swift migration (single owner -> predictable release timing).
   */
  const updateVoiceAudioUrl = useCallback((nextAudioUrl: string | null) => {
    voiceAudioUrlRef.current = replaceManagedObjectUrl(voiceAudioUrlRef.current, nextAudioUrl);
    setVoiceAudioUrl(voiceAudioUrlRef.current);
  }, []);

  useEffect(() => {
    return () => {
      revokeBlobUrl(voiceAudioUrlRef.current);
    };
  }, []);
  
  // Check if AI Journey is available (3+ days of data in last 2 weeks)
  useEffect(() => {
    async function checkJourneyAvailability() {
      if (user?.tier === 'premium' && user?.id) {
        try {
          const { sessions: dbSessions, hasEnoughData } = await getJourneyData(user.id);
          
          // If we got data from Supabase, use it
          if (dbSessions.length > 0) {
            setJourneyAvailable(hasEnoughData);
            setJourneySessions(dbSessions);
            return;
          }
        } catch (err) {
          console.log('Journey data check failed:', err);
        }
        
        // Fallback: use local sessions for demo mode
        // Count unique days in local sessions (within last 14 days)
        const twoWeeksAgo = Date.now() - 14 * 24 * 60 * 60 * 1000;
        const recentSessions = sessions.filter(s => new Date(s.createdAt).getTime() > twoWeeksAgo);
        const uniqueDays = new Set(recentSessions.map(s => new Date(s.createdAt).toDateString()));
        
        if (uniqueDays.size >= 3) {
          setJourneyAvailable(true);
          // Convert local sessions to DbSession format for demo
          const demoDbSessions: DbSession[] = recentSessions.map(s => ({
            id: s.id,
            user_id: s.userId,
            transcript: s.transcript,
            summary: s.summary,
            mood: s.mood,
            meditation_script: s.meditationScript,
            audio_url: s.audioUrl,
            duration: s.duration,
            created_at: s.createdAt,
          }));
          setJourneySessions(demoDbSessions);
        } else {
          setJourneyAvailable(false);
          setJourneySessions([]);
        }
      }
    }
    checkJourneyAvailability();
  }, [sessions, user?.id, user?.tier]);

  const handleStartRecording = () => {
    if (!checkDailyLimit()) {
      setShowPaywall(true);
      return;
    }
    setScreen('recording');
    setMascotState('idle');
  };

  const handleRecordingComplete = useCallback(async (audioBlob: Blob, selectedDuration?: number) => {
    const duration = selectedDuration || meditationDuration;
    setMeditationDuration(duration);
    setProcessingError(null);
    setScreen('processing');
    
    // Get user tier and ID for meditation generation
    const userTier = user?.tier || 'free';
    const userId = user?.id;
    
    try {
      // Use OPTIMIZED API - ~60-70% faster
      // Pass user tier to determine if we use intro/outro clips (free) or full generation (premium)
      const result = await createMeditationFast(audioBlob, duration, (progress) => {
        setProcessingStep(progress.step);
        
        // Store partial results as they become available
        if (progress.result) {
          if (progress.result.transcript) setTranscript(progress.result.transcript);
          if (progress.result.mood) {
            setLocalMood(progress.result.mood);
            setCurrentMood(progress.result.mood);
          }
          if (progress.result.script) {
            setLocalScript(progress.result.script);
            setMeditationScript(progress.result.script);
          }
          if (progress.result.voiceAudioUrl) {
            updateVoiceAudioUrl(progress.result.voiceAudioUrl);
          }
        }
      }, userTier, userId);
      
      // Ensure final results are set
      setTranscript(result.transcript);
      setLocalMood(result.mood);
      setCurrentMood(result.mood);
      setLocalScript(result.script);
      setMeditationScript(result.script);
      updateVoiceAudioUrl(result.voiceAudioUrl);
      
    } catch (error) {
      console.error('Error creating meditation:', error);
      setProcessingError(error instanceof Error ? error.message : 'Failed to create meditation');
      
      // Fallback to demo mode if API fails
      const simulatedTranscript = "I've been feeling a bit stressed lately with work and just need to find some calm and peace in my day.";
      const detectedMood = detectMood(simulatedTranscript);
      const script = generateMeditationScript(detectedMood, duration);
      
      setTranscript(simulatedTranscript);
      setLocalMood(detectedMood);
      setCurrentMood(detectedMood);
      setLocalScript(script);
      setMeditationScript(script);
      updateVoiceAudioUrl(null);
    }
  }, [setTranscript, setScreen, setCurrentMood, setMeditationScript, meditationDuration, updateVoiceAudioUrl, user]);

  const handleProcessingComplete = async () => {
    // Credit is used when meditation is CREATED (after processing)
    incrementDailySession();
    
    // Get transcript from store
    const { transcript } = useAppStore.getState();
    
    // Generate summary using AI
    let summary = "A personalized meditation session";
    try {
      summary = await generateSummary(transcript || "meditation session");
    } catch {
      console.log('Summary generation failed, using default');
    }
    
    // Create session record
    const session: Session = {
      id: Date.now().toString(),
      userId: user?.id || 'demo',
      transcript: transcript || "Demo transcript",
      summary,
      mood: currentMood,
      meditationScript: meditationScript,
      audioUrl: isBlobUrl(voiceAudioUrl) ? null : voiceAudioUrl,
      duration: meditationDuration,
      createdAt: new Date().toISOString(),
    };
    addSession(session);
    
    setScreen('meditation');
    setMascotState('sleeping');
  };

  const handleMeditationComplete = () => {
    // Update streak only when they complete listening
    updateStreak();
    
    // Show success animation
    setShowSuccess(true);
    setMascotState('celebrating');
  };

  const handleSuccessComplete = () => {
    setShowSuccess(false);
    resetMeditation();
    updateVoiceAudioUrl(null);
    setScreen('home');
    setMascotState('idle');
  };

  const handleMeditationClose = () => {
    resetMeditation();
    updateVoiceAudioUrl(null);
    setScreen('home');
    setMascotState('idle');
  };

  const handleUpgrade = () => {
    // In production, this would open payment flow
    setShowPaywall(false);
    alert('Payment integration would go here! For now, go to Profile to toggle premium status.');
  };

  const handlePlaySession = (session: Session) => {
    setPlayingSession(session);
    setScreen('sessionPlayback');
  };

  const handleSessionPlaybackClose = () => {
    setPlayingSession(null);
    setScreen('profile');
  };

  // AI Journey handlers
  const handleOpenJourney = () => {
    if (journeyAvailable) {
      setScreen('journey');
    }
  };

  const handleJourneyMeditationStart = (meditation: JourneyMeditation) => {
    setLocalMood('CALMING'); // Journey meditations are generally calming/reflective
    setLocalScript(meditation.script);
    setMeditationDuration(meditation.duration);
    updateVoiceAudioUrl(meditation.voiceAudioUrl);
    setScreen('meditation');
    setMascotState('sleeping');
  };

  const handleJourneyClose = () => {
    setScreen('home');
  };

  // Onboarding handlers
  const handleOnboardingComplete = (userData: { name: string; email: string; phone: string }) => {
    // Update user with their info
    if (user) {
      setUser({
        ...user,
        name: userData.name || 'Zen Explorer',
        email: userData.email || 'demo@zenpal.app',
      });
    }
    setOnboardingComplete(true);
    setScreen('home');
  };

  const handleSkipOffer = () => {
    // User continues with free plan
    console.log('User skipped premium offer');
  };

  const handleAcceptOffer = () => {
    // User accepted the offer - upgrade to premium
    if (user) {
      setUser({
        ...user,
        tier: 'premium',
      });
    }
    console.log('User accepted premium offer');
  };

  // If onboarding not complete, show onboarding
  if (!hasCompletedOnboarding) {
    return (
      <MobileFrame>
        <OnboardingScreen
          onComplete={handleOnboardingComplete}
          onSkipOffer={handleSkipOffer}
          onAcceptOffer={handleAcceptOffer}
        />
      </MobileFrame>
    );
  }

  const renderScreen = () => {
    switch (currentScreen) {
      case 'home':
        return (
          <HomeScreen 
            onStartRecording={handleStartRecording}
            onOpenJourney={handleOpenJourney}
            journeyAvailable={journeyAvailable}
          />
        );
      case 'recording':
        return (
          <RecordingScreen 
            onComplete={handleRecordingComplete}
            onCancel={() => {
              resetMeditation();
              setScreen('home');
            }}
            defaultDuration={meditationDuration}
            onDurationChange={setMeditationDuration}
          />
        );
      case 'processing':
        return (
          <ProcessingScreen 
            onComplete={handleProcessingComplete}
            currentStep={processingStep}
            error={processingError}
          />
        );
      case 'meditation':
        return (
          <MeditationScreen 
            mood={currentMood}
            script={meditationScript}
            duration={meditationDuration}
            voiceAudioUrl={voiceAudioUrl}
            onComplete={handleMeditationComplete}
            onClose={handleMeditationClose}
          />
        );
      case 'profile':
        return (
          <ProfileScreen 
            onBack={() => setScreen('home')}
            onUpgrade={() => setShowPaywall(true)}
            onPlaySession={handlePlaySession}
          />
        );
      case 'sessionPlayback':
        return playingSession ? (
          <SessionPlaybackScreen
            session={playingSession}
            onClose={handleSessionPlaybackClose}
          />
        ) : (
          <ProfileScreen 
            onBack={() => setScreen('home')}
            onUpgrade={() => setShowPaywall(true)}
            onPlaySession={handlePlaySession}
          />
        );
      case 'journey':
        return (
          <AIJourneyScreen
            sessions={journeySessions}
            userId={user?.id || 'demo'}
            onBack={handleJourneyClose}
            onStartMeditation={handleJourneyMeditationStart}
          />
        );
      case 'paywall':
        return (
          <>
            <HomeScreen 
              onStartRecording={handleStartRecording}
              onOpenJourney={handleOpenJourney}
              journeyAvailable={journeyAvailable}
            />
          </>
        );
      default:
        return (
          <HomeScreen 
            onStartRecording={handleStartRecording}
            onOpenJourney={handleOpenJourney}
            journeyAvailable={journeyAvailable}
          />
        );
    }
  };

  return (
    <>
      <MobileFrame>
        <AnimatePresence mode="wait">
          <motion.div
            key={currentScreen}
            initial={{ opacity: 0, x: currentScreen === 'home' ? -20 : 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: currentScreen === 'home' ? 20 : -20 }}
            transition={SCREEN_TRANSITION}
            style={{ height: '100%' }}
          >
            {renderScreen()}
          </motion.div>
        </AnimatePresence>
      </MobileFrame>

      {/* Global Modals */}
      <PaywallModal 
        isOpen={showPaywall || currentScreen === 'paywall'}
        onClose={() => {
          setShowPaywall(false);
          if (currentScreen === 'paywall') setScreen('home');
        }}
        onUpgrade={handleUpgrade}
      />
      
      <SuccessAnimation 
        isVisible={showSuccess}
        streakCount={user?.currentStreak || 1}
        onComplete={handleSuccessComplete}
      />
    </>
  );
}

export default App;
