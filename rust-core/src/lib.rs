//! ZenPal Core - Portable Meditation Engine
//! 
//! This library provides the core meditation pacing logic that can be:
//! 1. Used directly in Rust applications
//! 2. Compiled to WebAssembly for browser use
//! 3. Bridged to Swift via UniFFI for iOS
//! 
//! The core is intentionally kept simple with no async, no external dependencies
//! beyond regex, and uses only concrete types for easy FFI bridging.
//!
//! ## Key Constants (Production-Calibrated)
//! 
//! - **12 characters per second** (observed from TTS data)
//! - **70 words per minute** target density (50/50 speech-to-silence ratio)
//! - **1.1x safety buffer** on silence (TTS often faster than expected)

pub mod pacing_engine;

// Re-export main types for convenience
pub use pacing_engine::MeditationPacer;
pub use pacing_engine::PacingConfig;
pub use pacing_engine::PacingResult;

// Re-export convenience functions
pub use pacing_engine::format_meditation_ssml;
pub use pacing_engine::calculate_pacing_details;
pub use pacing_engine::calculate_target_words_for_prompt;
pub use pacing_engine::calculate_target_words_custom;
