//! Weighted Micro-Pacing Engine for Meditation Audio
//! 
//! This module implements a deterministic pacing algorithm that transforms
//! raw meditation text into ElevenLabs-compatible SSML with precisely
//! calculated silence breaks to hit a target duration.
//! 
//! ## Algorithm Overview
//! 
//! Instead of relying on an LLM to control timing (which is unreliable),
//! this engine mathematically distributes silence between "speech atoms"
//! based on punctuation weights:
//! 
//! - Comma (,): Weight 1 (short pause)
//! - Sentence end (. ? !): Weight 3 (standard pause)  
//! - Paragraph/newline: Weight 5 (long pause)
//! 
//! ## Key Constants (Production-Calibrated)
//! 
//! - **12 characters per second** (observed from TTS data)
//! - **70 words per minute** target density (50/50 speech-to-silence ratio)
//! - **1.1x safety buffer** on silence (TTS often faster than expected)
//! 
//! ## Example
//! 
//! ```rust
//! use zenpal_core::MeditationPacer;
//! 
//! let pacer = MeditationPacer::new();
//! let ssml = pacer.format_meditation_ssml(
//!     "Welcome. Take a deep breath.".to_string(),
//!     60.0
//! );
//! ```

use regex::Regex;

// ============================================
// Constants (Production-Calibrated)
// ============================================

/// Character-based speech rate (characters per second, excluding whitespace)
/// Derived from production data: ~60 words = ~310 chars = 26 seconds
/// 310 / 26 ≈ 12 chars/sec
const CHARS_PER_SECOND: f64 = 12.0;

/// Target words per minute for LLM prompts
/// This ensures a 50/50 speech-to-silence ratio
/// Formula: (60 seconds / 2) * 2.3 words/sec ≈ 70 words/minute
const TARGET_WORDS_PER_MINUTE: f64 = 70.0;

/// Safety buffer multiplier for silence
/// TTS is often faster than estimated, so we add 10% extra silence
const SILENCE_SAFETY_BUFFER: f64 = 1.1;

/// Maximum break duration per tag (ElevenLabs limit)
const MAX_BREAK_SECONDS: f64 = 3.0;

/// Minimum break duration (below this is imperceptible)
const MIN_BREAK_SECONDS: f64 = 0.1;

// ============================================
// Punctuation Weights
// ============================================

/// Weight for comma pauses (short breath)
const WEIGHT_COMMA: u32 = 1;

/// Weight for sentence-ending punctuation (natural pause)
const WEIGHT_SENTENCE: u32 = 3;

/// Weight for paragraph breaks (long contemplative pause)
const WEIGHT_PARAGRAPH: u32 = 5;

// ============================================
// Types
// ============================================

/// The type of punctuation that ends a speech atom
#[derive(Debug, Clone, Copy, PartialEq, Eq)]
pub enum PunctuationType {
    /// Comma - short pause
    Comma,
    /// Period, question mark, exclamation - standard pause
    SentenceEnd,
    /// Newline or paragraph break - long pause
    Paragraph,
    /// No punctuation (end of text)
    None,
}

impl PunctuationType {
    /// Get the silence weight for this punctuation type
    pub fn weight(&self) -> u32 {
        match self {
            PunctuationType::Comma => WEIGHT_COMMA,
            PunctuationType::SentenceEnd => WEIGHT_SENTENCE,
            PunctuationType::Paragraph => WEIGHT_PARAGRAPH,
            PunctuationType::None => 0,
        }
    }
}

/// A single "atom" of speech - text followed by punctuation
#[derive(Debug, Clone)]
pub struct SpeechAtom {
    /// The text content (without trailing punctuation)
    pub text: String,
    /// The punctuation that ends this atom
    pub punctuation: PunctuationType,
    /// The original punctuation character(s)
    pub punctuation_char: String,
    /// Calculated silence weight
    pub weight: u32,
    /// Word count in this atom
    pub word_count: usize,
}

impl SpeechAtom {
    /// Create a new speech atom
    pub fn new(text: String, punctuation: PunctuationType, punctuation_char: String) -> Self {
        let weight = punctuation.weight();
        let word_count = count_words(&text);
        Self {
            text,
            punctuation,
            punctuation_char,
            weight,
            word_count,
        }
    }
}

/// Configuration for the pacing engine
#[derive(Debug, Clone)]
pub struct PacingConfig {
    /// Character-based speech rate (chars per second, excluding whitespace)
    pub chars_per_second: f64,
    /// Safety buffer multiplier for silence (e.g., 1.1 = 10% extra)
    pub silence_safety_buffer: f64,
    /// Maximum seconds per break tag
    pub max_break_seconds: f64,
    /// Minimum seconds per break tag
    pub min_break_seconds: f64,
    /// Weight for comma pauses
    pub weight_comma: u32,
    /// Weight for sentence-end pauses
    pub weight_sentence: u32,
    /// Weight for paragraph pauses
    pub weight_paragraph: u32,
}

impl Default for PacingConfig {
    fn default() -> Self {
        Self {
            chars_per_second: CHARS_PER_SECOND,
            silence_safety_buffer: SILENCE_SAFETY_BUFFER,
            max_break_seconds: MAX_BREAK_SECONDS,
            min_break_seconds: MIN_BREAK_SECONDS,
            weight_comma: WEIGHT_COMMA,
            weight_sentence: WEIGHT_SENTENCE,
            weight_paragraph: WEIGHT_PARAGRAPH,
        }
    }
}

/// Result of the pacing calculation
#[derive(Debug, Clone)]
pub struct PacingResult {
    /// The final SSML string
    pub ssml: String,
    /// Total character count (excluding whitespace)
    pub total_chars: usize,
    /// Total word count
    pub total_words: usize,
    /// Estimated speech duration in seconds (based on char count)
    pub estimated_speech_seconds: f64,
    /// Raw silence budget before safety buffer
    pub raw_silence_budget: f64,
    /// Final silence budget after safety buffer (1.1x)
    pub final_silence_budget: f64,
    /// Total silence actually added in seconds
    pub total_silence_added: f64,
    /// Target duration that was requested
    pub target_duration_seconds: f64,
    /// Actual estimated total duration
    pub estimated_total_seconds: f64,
    /// Number of speech atoms
    pub atom_count: usize,
}

// ============================================
// Main Pacer Struct
// ============================================

/// The main meditation pacing engine
/// 
/// This struct encapsulates all pacing logic and can be easily
/// bridged to Swift or other languages.
#[derive(Debug, Clone)]
pub struct MeditationPacer {
    config: PacingConfig,
}

impl MeditationPacer {
    /// Create a new pacer with default configuration
    pub fn new() -> Self {
        Self {
            config: PacingConfig::default(),
        }
    }

    /// Create a new pacer with custom configuration
    pub fn with_config(config: PacingConfig) -> Self {
        Self { config }
    }

    /// Format meditation text into SSML with calculated breaks
    /// 
    /// This is the main entry point. It takes raw text and a target
    /// duration, and returns an SSML string ready for ElevenLabs.
    /// 
    /// # Arguments
    /// * `text` - The raw meditation script text
    /// * `target_duration_seconds` - Desired total duration in seconds
    /// 
    /// # Returns
    /// A complete SSML string with `<break>` tags
    pub fn format_meditation_ssml(&self, text: String, target_duration_seconds: f64) -> String {
        let result = self.calculate_pacing(text, target_duration_seconds);
        result.ssml
    }

    /// Calculate pacing and return detailed results
    /// 
    /// Use this when you need access to timing metadata.
    /// 
    /// ## Algorithm Steps
    /// 
    /// A. **Sanitize & Analyze**: Count characters (excluding whitespace)
    /// B. **Safety Buffer**: Apply 1.1x multiplier to silence budget
    /// C. **Distribution**: Distribute silence based on punctuation weights
    pub fn calculate_pacing(&self, text: String, target_duration_seconds: f64) -> PacingResult {
        // Step A: Sanitize & Analyze
        let atoms = self.atomize_text(&text);
        
        // Count characters (excluding whitespace) for accurate TTS estimation
        let total_chars: usize = atoms.iter()
            .map(|a| a.text.chars().filter(|c| !c.is_whitespace()).count())
            .sum();
        let total_words: usize = atoms.iter().map(|a| a.word_count).sum();
        
        // Calculate total weight (excluding last atom - no break at end)
        let total_weight: u32 = if atoms.len() > 1 {
            atoms.iter().take(atoms.len() - 1).map(|a| a.weight).sum()
        } else {
            0
        };
        
        // Estimate speech time using character-based formula
        // Production data: 12 chars/sec
        let estimated_speech_seconds = total_chars as f64 / self.config.chars_per_second;
        
        // Step B: Calculate silence budget with safety buffer
        let raw_silence_budget = (target_duration_seconds - estimated_speech_seconds).max(0.0);
        let final_silence_budget = raw_silence_budget * self.config.silence_safety_buffer;
        
        // Calculate time per weight unit
        let time_per_unit = if total_weight > 0 {
            final_silence_budget / total_weight as f64
        } else {
            0.0
        };
        
        // Step C: Build SSML with distributed silence
        let mut ssml = String::with_capacity(text.len() * 2);
        let mut total_silence_added = 0.0;
        let atom_count = atoms.len();
        
        for (i, atom) in atoms.iter().enumerate() {
            let is_last = i == atom_count - 1;
            
            // Add the text
            ssml.push_str(&atom.text);
            ssml.push_str(&atom.punctuation_char);
            
            // DO NOT add break after the very last atom
            if !is_last && atom.weight > 0 && time_per_unit > 0.0 {
                let break_duration = atom.weight as f64 * time_per_unit;
                
                // Only add break if it's above minimum threshold
                if break_duration >= self.config.min_break_seconds {
                    let break_ssml = self.format_break_tags(break_duration);
                    ssml.push_str(&break_ssml);
                    total_silence_added += break_duration;
                }
            }
            
            // Add space after punctuation (except at end)
            if !is_last {
                ssml.push(' ');
            }
        }
        
        PacingResult {
            ssml,
            total_chars,
            total_words,
            estimated_speech_seconds,
            raw_silence_budget,
            final_silence_budget,
            total_silence_added,
            target_duration_seconds,
            estimated_total_seconds: estimated_speech_seconds + total_silence_added,
            atom_count,
        }
    }

    /// Atomize text into speech atoms based on punctuation
    fn atomize_text(&self, text: &str) -> Vec<SpeechAtom> {
        let mut atoms = Vec::new();
        
        // Regex to split on punctuation while capturing the punctuation
        // Matches: comma, period, question, exclamation, or newline
        let re = Regex::new(r"([^,.\?!\n]+)([,.\?!\n]*)").unwrap();
        
        for cap in re.captures_iter(text) {
            let content = cap.get(1).map_or("", |m| m.as_str()).trim();
            let punct = cap.get(2).map_or("", |m| m.as_str());
            
            if content.is_empty() {
                continue;
            }
            
            let (punct_type, punct_char) = classify_punctuation(punct);
            
            atoms.push(SpeechAtom::new(
                content.to_string(),
                punct_type,
                punct_char,
            ));
        }
        
        atoms
    }

    /// Format break duration into SSML break tags
    /// 
    /// Since ElevenLabs has a max of 3 seconds per break,
    /// longer durations are split into multiple tags.
    fn format_break_tags(&self, total_seconds: f64) -> String {
        let mut result = String::new();
        let mut remaining = total_seconds;
        
        while remaining > self.config.min_break_seconds {
            let break_duration = remaining.min(self.config.max_break_seconds);
            result.push_str(&format!("<break time=\"{:.1}s\"/>", break_duration));
            remaining -= break_duration;
        }
        
        result
    }
}

impl Default for MeditationPacer {
    fn default() -> Self {
        Self::new()
    }
}

// ============================================
// Helper Functions
// ============================================

/// Count words in a string
fn count_words(text: &str) -> usize {
    text.split_whitespace().count()
}

/// Classify punctuation and return type + character
fn classify_punctuation(punct: &str) -> (PunctuationType, String) {
    if punct.is_empty() {
        return (PunctuationType::None, String::new());
    }
    
    // Check for paragraph/newline first (higher priority)
    if punct.contains('\n') {
        return (PunctuationType::Paragraph, punct.to_string());
    }
    
    // Check for sentence-ending punctuation
    if punct.contains('.') || punct.contains('?') || punct.contains('!') {
        // Return just the first punctuation mark
        let char = punct.chars().next().unwrap_or('.');
        return (PunctuationType::SentenceEnd, char.to_string());
    }
    
    // Check for comma
    if punct.contains(',') {
        return (PunctuationType::Comma, ",".to_string());
    }
    
    (PunctuationType::None, String::new())
}

// ============================================
// Convenience Functions (for FFI)
// ============================================

/// Simple function signature for easy FFI bridging
/// 
/// This is the simplest possible interface for calling from
/// Swift, JavaScript, or other languages.
pub fn format_meditation_ssml(text: String, target_duration_seconds: f64) -> String {
    let pacer = MeditationPacer::new();
    pacer.format_meditation_ssml(text, target_duration_seconds)
}

/// Get detailed pacing result as a simple struct
pub fn calculate_pacing_details(text: String, target_duration_seconds: f64) -> PacingResult {
    let pacer = MeditationPacer::new();
    pacer.calculate_pacing(text, target_duration_seconds)
}

/// Calculate the target word count for an LLM prompt
/// 
/// This ensures a 50/50 speech-to-silence ratio by using ~70 words per minute.
/// Use this when building prompts for GPT to generate meditation scripts.
/// 
/// # Arguments
/// * `target_duration_seconds` - The total desired meditation duration
/// 
/// # Returns
/// The number of words to request from the LLM
/// 
/// # Example
/// For a 5-minute meditation: 5 * 70 = 350 words
pub fn calculate_target_words_for_prompt(target_duration_seconds: f64) -> usize {
    let minutes = target_duration_seconds / 60.0;
    (minutes * TARGET_WORDS_PER_MINUTE).round() as usize
}

/// Calculate target word count with custom words-per-minute density
/// 
/// Use this if you need to override the default 70 wpm density.
pub fn calculate_target_words_custom(target_duration_seconds: f64, words_per_minute: f64) -> usize {
    let minutes = target_duration_seconds / 60.0;
    (minutes * words_per_minute).round() as usize
}

// ============================================
// Tests
// ============================================

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_word_count() {
        assert_eq!(count_words("hello world"), 2);
        assert_eq!(count_words("one"), 1);
        assert_eq!(count_words("  spaces  between  "), 2);
        assert_eq!(count_words(""), 0);
    }

    #[test]
    fn test_punctuation_classification() {
        assert_eq!(classify_punctuation(".").0, PunctuationType::SentenceEnd);
        assert_eq!(classify_punctuation("?").0, PunctuationType::SentenceEnd);
        assert_eq!(classify_punctuation("!").0, PunctuationType::SentenceEnd);
        assert_eq!(classify_punctuation(",").0, PunctuationType::Comma);
        assert_eq!(classify_punctuation("\n").0, PunctuationType::Paragraph);
        assert_eq!(classify_punctuation("").0, PunctuationType::None);
    }

    #[test]
    fn test_atomize_simple() {
        let pacer = MeditationPacer::new();
        let atoms = pacer.atomize_text("Hello, world.");
        
        assert_eq!(atoms.len(), 2);
        assert_eq!(atoms[0].text, "Hello");
        assert_eq!(atoms[0].punctuation, PunctuationType::Comma);
        assert_eq!(atoms[1].text, "world");
        assert_eq!(atoms[1].punctuation, PunctuationType::SentenceEnd);
    }

    #[test]
    fn test_break_tag_splitting() {
        let pacer = MeditationPacer::new();
        
        // 2 seconds should be single tag
        let tags = pacer.format_break_tags(2.0);
        assert_eq!(tags, "<break time=\"2.0s\"/>");
        
        // 5 seconds should be two tags (3.0 + 2.0)
        let tags = pacer.format_break_tags(5.0);
        assert_eq!(tags, "<break time=\"3.0s\"/><break time=\"2.0s\"/>");
        
        // 9 seconds should be three tags
        let tags = pacer.format_break_tags(9.0);
        assert_eq!(tags, "<break time=\"3.0s\"/><break time=\"3.0s\"/><break time=\"3.0s\"/>");
    }

    #[test]
    fn test_basic_pacing() {
        let pacer = MeditationPacer::new();
        let result = pacer.calculate_pacing(
            "Welcome. Take a deep breath.".to_string(),
            60.0
        );
        
        // Should have 2 atoms (two sentences)
        assert_eq!(result.atom_count, 2);
        
        // Should have 5 words total
        assert_eq!(result.total_words, 5);
        
        // SSML should contain break tags
        assert!(result.ssml.contains("<break"));
        
        // Estimated total should be close to target
        assert!(result.estimated_total_seconds > 0.0);
    }

    #[test]
    fn test_no_overflow_when_speech_exceeds_target() {
        let pacer = MeditationPacer::new();
        
        // Very short target with lots of text
        let long_text = "This is a very long meditation script that contains many many words and will definitely take longer than five seconds to speak aloud.".to_string();
        let result = pacer.calculate_pacing(long_text, 5.0);
        
        // Should not add negative silence
        assert!(result.total_silence_added >= 0.0);
        assert!(result.raw_silence_budget >= 0.0);
        
        // Should still produce valid SSML
        assert!(!result.ssml.is_empty());
    }

    #[test]
    fn test_empty_text() {
        let pacer = MeditationPacer::new();
        let result = pacer.calculate_pacing("".to_string(), 60.0);
        
        assert_eq!(result.total_words, 0);
        assert_eq!(result.total_chars, 0);
        assert_eq!(result.atom_count, 0);
    }

    #[test]
    fn test_character_based_estimation() {
        let pacer = MeditationPacer::new();
        // "Welcome" = 7 chars, "Take" = 4, "a" = 1, "deep" = 4, "breath" = 6
        // Total: 7 + 4 + 1 + 4 + 6 = 22 chars (excluding whitespace)
        // Estimated speech = 22/12 = 1.833... seconds
        let result = pacer.calculate_pacing(
            "Welcome. Take a deep breath.".to_string(),
            60.0
        );
        
        // Check character count (excluding whitespace)
        assert_eq!(result.total_chars, 22);
        
        // Estimated speech should be ~1.833 seconds (22 chars / 12 cps)
        let expected_speech = 22.0 / 12.0;
        assert!((result.estimated_speech_seconds - expected_speech).abs() < 0.01);
        
        // Safety buffer should be applied (1.1x)
        let expected_raw = 60.0 - expected_speech;
        assert!((result.raw_silence_budget - expected_raw).abs() < 0.01);
        assert!((result.final_silence_budget - expected_raw * 1.1).abs() < 0.01);
    }

    #[test]
    fn test_no_break_after_last_atom() {
        let pacer = MeditationPacer::new();
        let result = pacer.calculate_pacing(
            "First sentence. Second sentence.".to_string(),
            60.0
        );
        
        // SSML should NOT end with a break tag
        assert!(!result.ssml.trim_end().ends_with("/>"));
        
        // Should end with the punctuation of the last sentence
        assert!(result.ssml.trim_end().ends_with("."));
    }

    #[test]
    fn test_target_words_for_prompt() {
        // 1 minute = 70 words
        assert_eq!(calculate_target_words_for_prompt(60.0), 70);
        
        // 2 minutes = 140 words
        assert_eq!(calculate_target_words_for_prompt(120.0), 140);
        
        // 5 minutes = 350 words
        assert_eq!(calculate_target_words_for_prompt(300.0), 350);
        
        // 30 seconds = 35 words
        assert_eq!(calculate_target_words_for_prompt(30.0), 35);
    }

    #[test]
    fn test_custom_words_per_minute() {
        // 60 seconds at 100 wpm = 100 words
        assert_eq!(calculate_target_words_custom(60.0, 100.0), 100);
        
        // 120 seconds at 50 wpm = 100 words
        assert_eq!(calculate_target_words_custom(120.0, 50.0), 100);
    }

    #[test]
    fn test_production_calibration() {
        // Test with production-like data
        // Observed: ~60 words = ~310 characters = 26 seconds of speech
        // Our constant: 12 chars/sec -> 310/12 = 25.83 sec (close to observed 26s)
        let pacer = MeditationPacer::new();
        
        // Generate a meditation script with roughly 310 characters
        let meditation_text = "Welcome to this moment of peace. \
            Close your eyes gently. \
            Take a slow, deep breath in. \
            Feel the air fill your lungs completely. \
            Now exhale slowly, releasing all tension. \
            Notice how your body begins to relax. \
            Each breath brings you deeper into calm. \
            Let go of any thoughts that arise. \
            Simply be present in this moment. \
            You are safe. You are at peace.".to_string();
        
        // Count chars (for validation)
        let char_count: usize = meditation_text.chars().filter(|c| !c.is_whitespace()).count();
        println!("Test meditation char count: {}", char_count);
        
        // Target: 60 second meditation
        let result = pacer.calculate_pacing(meditation_text, 60.0);
        
        // Estimated speech time should be roughly 26 seconds (within 5 seconds)
        // 310 chars / 12 cps = ~25.8 seconds
        assert!(result.estimated_speech_seconds > 20.0);
        assert!(result.estimated_speech_seconds < 35.0);
        
        // With 60s target and ~26s speech, we should have ~34s raw silence
        // With 1.1x buffer, final silence budget should be ~37.4s
        assert!(result.final_silence_budget > result.raw_silence_budget);
        
        // Total estimated should overshoot target slightly (safety buffer)
        assert!(result.estimated_total_seconds >= 60.0);
        
        // Should NOT have a break at the very end
        assert!(!result.ssml.ends_with("/>"));
    }

    #[test]
    fn test_density_for_five_minute_meditation() {
        // For a 5-minute meditation at 70 words/minute density
        let target_words = calculate_target_words_for_prompt(300.0);
        assert_eq!(target_words, 350); // 5 minutes * 70 wpm
        
        // This should give us a 50/50 speech-to-silence ratio
        // 350 words at ~5.2 chars/word = ~1820 chars
        // 1820 chars at 12 cps = ~151.7 seconds of speech
        // 300 - 151.7 = 148.3 seconds of raw silence
        // 148.3 * 1.1 = 163 seconds of final silence budget
        // Total: 151.7 + 163 = 314.7 seconds (~5:15 total, slightly over)
    }
}
