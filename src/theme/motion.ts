import type { Transition } from 'framer-motion';

export const CALM_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

export const SCREEN_TRANSITION: Transition = {
  duration: 0.45,
  ease: CALM_EASE,
};

export const FADE_TRANSITION: Transition = {
  duration: 0.3,
  ease: CALM_EASE,
};
