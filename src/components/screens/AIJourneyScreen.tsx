import { motion, AnimatePresence } from 'framer-motion';
import { ArrowLeft, Sparkles, Play, Loader2 } from 'lucide-react';
import { useState, useEffect, useCallback, useRef } from 'react';
import { ZenBuddy } from '../mascot/ZenBuddy';
import { MOOD_COLORS, MOOD_LABELS } from '../../types';
import type { MoodTag } from '../../types';
import type { DbSession } from '../../services/supabase';
import type { JourneyAnalysis, JourneyMeditation, CalendarDay, ProgressBarData } from '../../services/aiJourney';
import {
  analyzeJourney,
  generateJourneyMeditationScript,
  generateJourneyMeditationAudio,
  getCachedJourney,
  setCachedJourney,
  getNewestSessionTimestamp,
} from '../../services/aiJourney';
import { isBlobUrl, revokeBlobUrl } from '../../utils/objectUrl';

// ============================================
// Props
// ============================================

interface AIJourneyScreenProps {
  sessions: DbSession[];
  userId: string;
  onBack: () => void;
  onStartMeditation: (meditation: JourneyMeditation) => void;
}

// ============================================
// Day labels for calendar header
// ============================================

// Day-of-week abbreviations are rendered per-cell (not as a separate header)
// because the 14-day grid doesn't necessarily start on Sunday.

// ============================================
// Sub-components
// ============================================

/** 14-day calendar with mood-colored dots */
function JourneyCalendar({
  days,
  onDotClick,
  selectedDay,
}: {
  days: CalendarDay[];
  onDotClick: (day: CalendarDay) => void;
  selectedDay: CalendarDay | null;
}) {
  // 14 days in a 7-col × 2-row grid. Today = last cell.
  const DOW_ABBREV = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

  return (
    <div className="jc-calendar">
      {/* Grid */}
      <div className="jc-cal-grid">
        {days.map((day, idx) => {
          const isSelected = selectedDay?.dateStr === day.dateStr;
          const isToday = idx === days.length - 1;

          return (
            <motion.button
              key={day.dateStr}
              className={`jc-cal-cell ${isToday ? 'today' : ''} ${isSelected ? 'selected' : ''}`}
              onClick={() => day.hasMeditation && onDotClick(day)}
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ delay: 0.05 * idx, type: 'spring', stiffness: 300 }}
              disabled={!day.hasMeditation}
            >
              <span className="jc-cal-dow">{DOW_ABBREV[day.dayOfWeek]}</span>
              <span className="jc-cal-date">{day.dayLabel}</span>
              {day.hasMeditation && day.mood ? (
                <motion.div
                  className="jc-mood-dot"
                  style={{ background: MOOD_COLORS[day.mood] }}
                  whileHover={{ scale: 1.3 }}
                  whileTap={{ scale: 0.9 }}
                  layoutId={`dot-${day.dateStr}`}
                />
              ) : (
                <span className="jc-no-session">x</span>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Selected day tooltip */}
      <AnimatePresence>
        {selectedDay && selectedDay.mood && (
          <motion.div
            className="jc-tooltip"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 8 }}
          >
            <div
              className="jc-tooltip-dot"
              style={{ background: MOOD_COLORS[selectedDay.mood] }}
            />
            <span className="jc-tooltip-label">
              {MOOD_LABELS[selectedDay.mood]}
            </span>
            <span className="jc-tooltip-date">
              {new Date(selectedDay.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

/** Compact mood legend */
function MoodLegend() {
  const moods: MoodTag[] = ['UPLIFTING', 'CALMING', 'ENERGIZING', 'HEALING', 'FOCUSED', 'SLEEPY', 'ANXIOUS', 'GRATEFUL', 'MOTIVATED'];

  return (
    <div className="jc-legend">
      {moods.map(mood => (
        <div key={mood} className="jc-legend-item">
          <div className="jc-legend-dot" style={{ background: MOOD_COLORS[mood] }} />
          <span>{MOOD_LABELS[mood]}</span>
        </div>
      ))}
    </div>
  );
}

/** Gradient progress bar showing mood arc */
function ProgressBar({
  data,
  onSectionClick,
  activeSection,
}: {
  data: ProgressBarData;
  onSectionClick: (section: 'start' | 'middle' | 'end') => void;
  activeSection: 'start' | 'middle' | 'end' | null;
}) {
  const gradient = data.isUniform
    ? data.startColor
    : `linear-gradient(to right, ${data.startColor}, ${data.middleColor}, ${data.endColor})`;

  return (
    <div className="jc-progress-wrap">
      {/* Labels row */}
      <div className="jc-progress-labels">
        <span>2 weeks ago</span>
        <span>1 week ago</span>
        <span>Today</span>
      </div>

      {/* Bar */}
      <div className="jc-progress-bar" style={{ background: gradient }}>
        {data.isUniform && (
          <span className="jc-progress-uniform-label">{MOOD_LABELS[data.startMood]}</span>
        )}

        {/* Clickable sections (invisible overlay) */}
        <button
          className={`jc-progress-section left ${activeSection === 'start' ? 'active' : ''}`}
          onClick={() => onSectionClick('start')}
        />
        <button
          className={`jc-progress-section middle ${activeSection === 'middle' ? 'active' : ''}`}
          onClick={() => onSectionClick('middle')}
        />
        <button
          className={`jc-progress-section right ${activeSection === 'end' ? 'active' : ''}`}
          onClick={() => onSectionClick('end')}
        />
      </div>

      {/* Active section tooltip */}
      <AnimatePresence>
        {activeSection && (
          <motion.div
            className="jc-progress-tooltip"
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              left: activeSection === 'start' ? '16.6%' : activeSection === 'middle' ? '50%' : '83.3%',
            }}
          >
            <div
              className="jc-tooltip-dot"
              style={{
                background: activeSection === 'start' ? data.startColor
                  : activeSection === 'middle' ? data.middleColor
                  : data.endColor,
              }}
            />
            <span>
              {MOOD_LABELS[
                activeSection === 'start' ? data.startMood
                  : activeSection === 'middle' ? data.middleMood
                  : data.endMood
              ]}
            </span>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// ============================================
// Main Screen
// ============================================

export function AIJourneyScreen({ sessions, userId, onBack, onStartMeditation }: AIJourneyScreenProps) {
  const [analysis, setAnalysis] = useState<JourneyAnalysis | null>(null);
  const [meditation, setMeditation] = useState<JourneyMeditation | null>(null);
  const [isLoadingAnalysis, setIsLoadingAnalysis] = useState(true);
  const [isLoadingMeditation, setIsLoadingMeditation] = useState(false);
  const [meditationStep, setMeditationStep] = useState('');
  const [error, setError] = useState<string | null>(null);

  const [selectedCalDay, setSelectedCalDay] = useState<CalendarDay | null>(null);
  const [activeProgressSection, setActiveProgressSection] = useState<'start' | 'middle' | 'end' | null>(null);

  const generatingRef = useRef(false);
  const meditationAudioUrlRef = useRef<string | null>(null);
  const adoptedMeditationAudioUrlRef = useRef<string | null>(null);

  const setMeditationWithCleanup = useCallback((nextMeditation: JourneyMeditation | null) => {
    const previousAudioUrl = meditationAudioUrlRef.current;
    const nextAudioUrl = nextMeditation?.voiceAudioUrl ?? null;
    if (
      previousAudioUrl
      && previousAudioUrl !== nextAudioUrl
      && previousAudioUrl !== adoptedMeditationAudioUrlRef.current
      && isBlobUrl(previousAudioUrl)
    ) {
      revokeBlobUrl(previousAudioUrl);
    }
    meditationAudioUrlRef.current = nextAudioUrl;
    setMeditation(nextMeditation);
  }, []);

  useEffect(() => {
    return () => {
      if (
        meditationAudioUrlRef.current
        && meditationAudioUrlRef.current !== adoptedMeditationAudioUrlRef.current
        && isBlobUrl(meditationAudioUrlRef.current)
      ) {
        revokeBlobUrl(meditationAudioUrlRef.current);
      }
    };
  }, []);

  // ---- Load analysis + meditation (with IndexedDB caching) ----
  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        setIsLoadingAnalysis(true);
        const newestTimestamp = getNewestSessionTimestamp(sessions);

        // ---- Step 1: Check IndexedDB cache ----
        const cached = await getCachedJourney(userId, newestTimestamp);

        if (cached) {
          console.log('[Journey] Full cache hit — using cached analysis + audio');
          setAnalysis(cached.analysis);
          setIsLoadingAnalysis(false);

          // If audio blob is cached, create URL instantly — no network calls needed
          if (cached.audioBlob && cached.meditationScript) {
            const url = URL.createObjectURL(cached.audioBlob);
            setMeditationWithCleanup({
              script: cached.meditationScript,
              voiceAudioUrl: url,
              duration: 300,
            });
            console.log('[Journey] Instant playback from cached audio blob');
          } else if (cached.meditationScript && !generatingRef.current) {
            // Script cached but no audio — regenerate audio only
            generatingRef.current = true;
            setIsLoadingMeditation(true);
            setMeditationStep('Preparing your meditation...');
            const { meditation: med, audioBlob } = await generateJourneyMeditationAudio(cached.meditationScript);
            if (!cancelled) {
              setMeditationWithCleanup(med);
              setIsLoadingMeditation(false);
              generatingRef.current = false;
              // Update cache with the audio blob
              await setCachedJourney(userId, cached.analysis, cached.meditationScript, audioBlob, newestTimestamp);
            }
          }
          return;
        }

        // ---- Step 2: Generate fresh analysis ----
        console.log('[Journey] Cache miss — generating fresh analysis');
        const result = await analyzeJourney(sessions);
        if (cancelled) return;
        setAnalysis(result);
        setIsLoadingAnalysis(false);

        // ---- Step 3: Generate meditation script + audio ----
        if (!generatingRef.current) {
          generatingRef.current = true;
          setIsLoadingMeditation(true);
          setMeditationStep('Writing your meditation...');

          const script = await generateJourneyMeditationScript(result.recap, sessions);
          if (cancelled) return;

          setMeditationStep('Bringing your meditation to life...');
          const { meditation: med, audioBlob } = await generateJourneyMeditationAudio(script);
          if (cancelled) return;

          setMeditationWithCleanup(med);
          setIsLoadingMeditation(false);
          generatingRef.current = false;

          // Cache everything (analysis + script + audio blob) in IndexedDB
          await setCachedJourney(userId, result, script, audioBlob, newestTimestamp);
          console.log('[Journey] Cached analysis + script + audio for future visits');
        }
      } catch (err) {
        console.error('[Journey] Load error:', err);
        if (!cancelled) {
          setError('Something went wrong. Please try again.');
          setIsLoadingAnalysis(false);
          setIsLoadingMeditation(false);
          generatingRef.current = false;
        }
      }
    }

    load();
    return () => { cancelled = true; };
  }, [sessions, setMeditationWithCleanup, userId]);

  // ---- Handlers ----
  const handleDotClick = useCallback((day: CalendarDay) => {
    setSelectedCalDay(prev => prev?.dateStr === day.dateStr ? null : day);
  }, []);

  const handleProgressClick = useCallback((section: 'start' | 'middle' | 'end') => {
    setActiveProgressSection(prev => prev === section ? null : section);
  }, []);

  const handlePlayMeditation = useCallback(() => {
    if (meditation) {
      adoptedMeditationAudioUrlRef.current = meditation.voiceAudioUrl || null;
      onStartMeditation(meditation);
    }
  }, [meditation, onStartMeditation]);

  // ---- Loading state ----
  if (isLoadingAnalysis) {
    return (
      <div className="jc-screen jc-centered">
        <motion.div className="jc-loading" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          <ZenBuddy state="thinking" size="md" />
          <h2>Reflecting on your path...</h2>
          <p>Analyzing your last 2 weeks</p>
        </motion.div>
        <style>{journeyCSS}</style>
      </div>
    );
  }

  // ---- Error state ----
  if (error || !analysis) {
    return (
      <div className="jc-screen jc-centered">
        <button className="jc-back" onClick={onBack}><ArrowLeft size={22} /></button>
        <div className="jc-loading">
          <h2>Oops</h2>
          <p>{error || 'Something went wrong'}</p>
          <button className="jc-btn-primary" onClick={onBack}>Go Back</button>
        </div>
        <style>{journeyCSS}</style>
      </div>
    );
  }

  // ---- Main content ----
  return (
    <div className="jc-screen">
      {/* Header */}
      <motion.header className="jc-header" initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }}>
        <button className="jc-back" onClick={onBack}><ArrowLeft size={22} /></button>
        <div className="jc-header-title">
          <Sparkles size={18} color="#FFD93D" />
          <h1>Your Journey</h1>
        </div>
        <div style={{ width: 44 }} />
      </motion.header>

      <div className="jc-body">
        {/* Calendar */}
        <motion.section
          className="jc-card"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.1 }}
        >
          <h3 className="jc-section-title">Last 14 Days</h3>
          <JourneyCalendar
            days={analysis.calendarDays}
            onDotClick={handleDotClick}
            selectedDay={selectedCalDay}
          />
          <MoodLegend />
        </motion.section>

        {/* Progress Bar */}
        <motion.section
          className="jc-card"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.2 }}
        >
          <h3 className="jc-section-title">Your Mood Arc</h3>
          <ProgressBar
            data={analysis.progressBar}
            onSectionClick={handleProgressClick}
            activeSection={activeProgressSection}
          />
        </motion.section>

        {/* Recap */}
        <motion.section
          className="jc-recap-card"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.3 }}
        >
          <p className="jc-recap-text">{analysis.recap}</p>
        </motion.section>

        {/* Journey Meditation */}
        <motion.section
          className="jc-meditation-card"
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ delay: 0.4 }}
        >
          <div className="jc-med-header">
            <Sparkles size={20} color="#FFD93D" />
            <div>
              <h3>Your Journey Meditation</h3>
              <p>A personalized 5-minute reflection on your path</p>
            </div>
          </div>

          {isLoadingMeditation ? (
            <div className="jc-med-loading">
              <Loader2 size={20} className="jc-spinner" />
              <span>{meditationStep || 'Generating...'}</span>
            </div>
          ) : meditation ? (
            <motion.button
              className="jc-play-btn"
              onClick={handlePlayMeditation}
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
            >
              <Play size={22} />
              <span>Listen Now</span>
            </motion.button>
          ) : (
            <p className="jc-med-error">Could not generate meditation. Try again later.</p>
          )}
        </motion.section>

        {/* Bottom padding */}
        <div style={{ height: 40 }} />
      </div>

      <style>{journeyCSS}</style>
    </div>
  );
}

// ============================================
// Styles
// ============================================

const journeyCSS = `
  /* ---- Screen ---- */
  .jc-screen {
    display: flex;
    flex-direction: column;
    min-height: 100%;
    background: linear-gradient(180deg, #FAFFF8 0%, #EFF7F1 50%, #E4F0E8 100%);
  }
  .jc-centered {
    justify-content: center;
    align-items: center;
    padding: 24px;
  }
  .jc-loading {
    display: flex;
    flex-direction: column;
    align-items: center;
    text-align: center;
    gap: 12px;
  }
  .jc-loading h2 {
    font-size: 1.2rem;
    font-weight: 800;
    color: #1A2E1A;
  }
  .jc-loading p {
    font-size: 0.85rem;
    color: #6C7D6C;
  }

  /* ---- Header ---- */
  .jc-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 14px 18px;
    position: sticky;
    top: 0;
    z-index: 10;
    background: rgba(250,255,248,0.85);
    backdrop-filter: blur(12px);
  }
  .jc-back {
    width: 44px;
    height: 44px;
    border-radius: 14px;
    background: white;
    color: #6C7D6C;
    display: flex;
    align-items: center;
    justify-content: center;
    box-shadow: 0 2px 8px rgba(0,0,0,0.07);
    border: none;
    cursor: pointer;
  }
  .jc-header-title {
    display: flex;
    align-items: center;
    gap: 8px;
  }
  .jc-header-title h1 {
    font-size: 1.15rem;
    font-weight: 800;
    color: #1A2E1A;
  }

  /* ---- Body ---- */
  .jc-body {
    flex: 1;
    padding: 0 18px;
    display: flex;
    flex-direction: column;
    gap: 18px;
    overflow-y: auto;
  }

  /* ---- Cards ---- */
  .jc-card {
    background: white;
    border-radius: 20px;
    padding: 20px;
    box-shadow: 0 2px 16px rgba(0,0,0,0.05);
  }
  .jc-section-title {
    font-size: 0.8rem;
    font-weight: 700;
    color: #6C7D6C;
    text-transform: uppercase;
    letter-spacing: 0.6px;
    margin-bottom: 14px;
  }

  /* ---- Calendar ---- */
  .jc-calendar {
    position: relative;
  }
  .jc-cal-grid {
    display: grid;
    grid-template-columns: repeat(7, 1fr);
    gap: 6px 4px;
  }
  .jc-cal-cell {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 3px;
    padding: 5px 2px;
    border-radius: 12px;
    background: none;
    border: 2px solid transparent;
    cursor: default;
    transition: all 0.15s ease;
  }
  .jc-cal-dow {
    font-size: 0.55rem;
    font-weight: 700;
    color: #9CA99C;
    text-transform: uppercase;
    letter-spacing: 0.3px;
  }
  .jc-cal-cell:not(:disabled) {
    cursor: pointer;
  }
  .jc-cal-cell:not(:disabled):hover {
    background: rgba(90,158,107,0.06);
  }
  .jc-cal-cell.selected {
    border-color: #5A9E6B;
    background: rgba(90,158,107,0.08);
  }
  .jc-cal-cell.today .jc-cal-date {
    font-weight: 900;
    color: #5A9E6B;
  }
  .jc-cal-date {
    font-size: 0.7rem;
    font-weight: 600;
    color: #1A2E1A;
  }
  .jc-mood-dot {
    width: 18px;
    height: 18px;
    border-radius: 50%;
    box-shadow: 0 2px 6px rgba(0,0,0,0.15);
  }
  .jc-no-session {
    font-size: 0.6rem;
    font-weight: 600;
    color: #C5CFC5;
    width: 18px;
    height: 18px;
    display: flex;
    align-items: center;
    justify-content: center;
  }

  /* Calendar tooltip */
  .jc-tooltip {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 8px 14px;
    background: white;
    border-radius: 12px;
    box-shadow: 0 4px 16px rgba(0,0,0,0.12);
    margin-top: 10px;
    width: fit-content;
    margin-left: auto;
    margin-right: auto;
  }
  .jc-tooltip-dot {
    width: 12px;
    height: 12px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .jc-tooltip-label {
    font-size: 0.85rem;
    font-weight: 700;
    color: #1A2E1A;
  }
  .jc-tooltip-date {
    font-size: 0.75rem;
    color: #6C7D6C;
    margin-left: 4px;
  }

  /* ---- Legend ---- */
  .jc-legend {
    display: flex;
    flex-wrap: wrap;
    gap: 6px 12px;
    margin-top: 14px;
    padding-top: 12px;
    border-top: 1px solid #F0F4F0;
  }
  .jc-legend-item {
    display: flex;
    align-items: center;
    gap: 5px;
  }
  .jc-legend-dot {
    width: 8px;
    height: 8px;
    border-radius: 50%;
    flex-shrink: 0;
  }
  .jc-legend-item span {
    font-size: 0.6rem;
    font-weight: 600;
    color: #6C7D6C;
  }

  /* ---- Progress Bar ---- */
  .jc-progress-wrap {
    position: relative;
  }
  .jc-progress-labels {
    display: flex;
    justify-content: space-between;
    margin-bottom: 8px;
  }
  .jc-progress-labels span {
    font-size: 0.65rem;
    font-weight: 600;
    color: #9CA99C;
  }
  .jc-progress-bar {
    position: relative;
    height: 32px;
    border-radius: 16px;
    overflow: hidden;
    display: flex;
    align-items: center;
    justify-content: center;
  }
  .jc-progress-uniform-label {
    font-size: 0.75rem;
    font-weight: 800;
    color: white;
    text-shadow: 0 1px 3px rgba(0,0,0,0.25);
    z-index: 2;
    position: relative;
  }
  .jc-progress-section {
    position: absolute;
    top: 0;
    height: 100%;
    width: 33.33%;
    background: none;
    border: none;
    cursor: pointer;
    border-radius: 0;
    transition: all 0.15s ease;
    z-index: 3;
  }
  .jc-progress-section:hover {
    background: rgba(255,255,255,0.15);
  }
  .jc-progress-section.active {
    background: rgba(255,255,255,0.25);
  }
  .jc-progress-section.left { left: 0; border-radius: 16px 0 0 16px; }
  .jc-progress-section.middle { left: 33.33%; }
  .jc-progress-section.right { left: 66.66%; border-radius: 0 16px 16px 0; }

  /* Progress tooltip */
  .jc-progress-tooltip {
    position: absolute;
    bottom: -32px;
    transform: translateX(-50%);
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 5px 12px;
    background: white;
    border-radius: 10px;
    box-shadow: 0 3px 12px rgba(0,0,0,0.12);
    white-space: nowrap;
    z-index: 5;
  }
  .jc-progress-tooltip span {
    font-size: 0.75rem;
    font-weight: 700;
    color: #1A2E1A;
  }

  /* ---- Recap ---- */
  .jc-recap-card {
    background: linear-gradient(135deg, #5A9E6B 0%, #7CB78B 50%, #58CC9C 100%);
    border-radius: 20px;
    padding: 24px;
    box-shadow: 0 4px 20px rgba(90,158,107,0.2);
  }
  .jc-recap-text {
    font-size: 0.9rem;
    font-weight: 500;
    color: white;
    line-height: 1.65;
    margin: 0;
  }

  /* ---- Meditation Card ---- */
  .jc-meditation-card {
    background: white;
    border-radius: 20px;
    padding: 20px;
    border: 2px solid #FFD93D;
    box-shadow: 0 4px 20px rgba(255,217,61,0.15);
  }
  .jc-med-header {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    margin-bottom: 16px;
  }
  .jc-med-header h3 {
    font-size: 0.95rem;
    font-weight: 800;
    color: #1A2E1A;
    margin: 0 0 2px;
  }
  .jc-med-header p {
    font-size: 0.75rem;
    color: #6C7D6C;
    margin: 0;
  }
  .jc-med-loading {
    display: flex;
    align-items: center;
    gap: 10px;
    padding: 12px 0 4px;
    color: #6C7D6C;
    font-size: 0.8rem;
    font-weight: 600;
  }
  .jc-spinner {
    animation: jc-spin 1s linear infinite;
  }
  @keyframes jc-spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  .jc-play-btn {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 10px;
    width: 100%;
    padding: 14px;
    border-radius: 14px;
    border: none;
    background: linear-gradient(135deg, #5A9E6B, #7CB78B);
    color: white;
    font-size: 0.9rem;
    font-weight: 700;
    cursor: pointer;
    box-shadow: 0 4px 15px rgba(90,158,107,0.3);
  }
  .jc-med-error {
    font-size: 0.8rem;
    color: #F97066;
    text-align: center;
    padding: 8px 0;
  }

  /* ---- Utility ---- */
  .jc-btn-primary {
    padding: 12px 28px;
    border-radius: 14px;
    border: none;
    background: linear-gradient(135deg, #5A9E6B, #7CB78B);
    color: white;
    font-size: 0.9rem;
    font-weight: 700;
    cursor: pointer;
  }
`;
