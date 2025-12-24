/**
 * Framer Motion Animation Library
 * Premium micro-interactions inspired by Linear, Stripe, Vercel
 */

import { Variants, Transition, TargetAndTransition } from 'framer-motion';

// ============================================================================
// Easing Functions
// ============================================================================

export const easings = {
  // Smooth, natural easing
  smooth: [0.4, 0, 0.2, 1],
  // Quick start, gradual end
  easeOut: [0, 0, 0.2, 1],
  // Gradual start, quick end
  easeIn: [0.4, 0, 1, 1],
  // Slight overshoot for playful feel
  overshoot: [0.34, 1.56, 0.64, 1],
  // Spring-like bounce
  bounce: [0.68, -0.55, 0.265, 1.55],
  // Linear
  linear: [0, 0, 1, 1],
} as const;

// ============================================================================
// Transition Presets
// ============================================================================

export const transitions = {
  // Fast micro-interaction
  fast: {
    duration: 0.15,
    ease: easings.smooth,
  } as Transition,

  // Standard transition
  default: {
    duration: 0.3,
    ease: easings.smooth,
  } as Transition,

  // Slow, deliberate animation
  slow: {
    duration: 0.5,
    ease: easings.smooth,
  } as Transition,

  // Spring physics
  spring: {
    type: 'spring',
    stiffness: 400,
    damping: 30,
  } as Transition,

  // Gentle spring
  gentleSpring: {
    type: 'spring',
    stiffness: 200,
    damping: 20,
  } as Transition,

  // Bouncy spring
  bouncySpring: {
    type: 'spring',
    stiffness: 500,
    damping: 15,
  } as Transition,
};

// ============================================================================
// Entrance Animations
// ============================================================================

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: transitions.default,
  },
};

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: transitions.default,
  },
};

export const fadeInDown: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: transitions.default,
  },
};

export const fadeInLeft: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: transitions.default,
  },
};

export const fadeInRight: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: transitions.default,
  },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: transitions.default,
  },
};

export const scaleInBounce: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: transitions.bouncySpring,
  },
};

export const slideInFromBottom: Variants = {
  hidden: { y: '100%', opacity: 0 },
  visible: {
    y: 0,
    opacity: 1,
    transition: transitions.gentleSpring,
  },
  exit: {
    y: '100%',
    opacity: 0,
    transition: transitions.fast,
  },
};

// ============================================================================
// Stagger Container
// ============================================================================

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
      delayChildren: 0.1,
    },
  },
};

export const staggerContainerFast: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
      delayChildren: 0.05,
    },
  },
};

export const staggerContainerSlow: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.15,
      delayChildren: 0.2,
    },
  },
};

// Stagger child item
export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: transitions.default,
  },
};

// ============================================================================
// Micro-interactions
// ============================================================================

// Button press effect
export const buttonTap: TargetAndTransition = {
  scale: 0.98,
  transition: transitions.fast,
};

// Button hover effect
export const buttonHover: TargetAndTransition = {
  scale: 1.02,
  transition: transitions.fast,
};

// Card hover - lift effect
export const cardHover: TargetAndTransition = {
  y: -4,
  boxShadow: '0 20px 40px -12px rgba(0, 0, 0, 0.15)',
  transition: transitions.default,
};

// Card select - scale + ring
export const cardSelect: TargetAndTransition = {
  scale: 1.02,
  transition: transitions.spring,
};

// Subtle hover
export const subtleHover: TargetAndTransition = {
  scale: 1.01,
  transition: transitions.fast,
};

// Icon rotation on hover
export const iconRotate: TargetAndTransition = {
  rotate: 15,
  transition: transitions.fast,
};

// ============================================================================
// Loading & Progress
// ============================================================================

export const pulse: Variants = {
  animate: {
    scale: [1, 1.05, 1],
    opacity: [1, 0.8, 1],
    transition: {
      duration: 2,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

export const shimmer: Variants = {
  animate: {
    backgroundPosition: ['200% 0', '-200% 0'],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'linear',
    },
  },
};

export const spin: Variants = {
  animate: {
    rotate: 360,
    transition: {
      duration: 1,
      repeat: Infinity,
      ease: 'linear',
    },
  },
};

export const progressBar: Variants = {
  hidden: { scaleX: 0, originX: 0 },
  visible: (progress: number) => ({
    scaleX: progress,
    transition: transitions.gentleSpring,
  }),
};

// ============================================================================
// Attention & Urgency
// ============================================================================

export const urgencyPulse: Variants = {
  animate: {
    scale: [1, 1.05, 1],
    transition: {
      duration: 0.8,
      repeat: Infinity,
      ease: 'easeInOut',
    },
  },
};

export const urgencyShake: Variants = {
  animate: {
    x: [0, -2, 2, -2, 2, 0],
    transition: {
      duration: 0.5,
      ease: 'easeInOut',
    },
  },
};

export const attentionBounce: Variants = {
  animate: {
    y: [0, -8, 0],
    transition: {
      duration: 0.6,
      repeat: Infinity,
      repeatDelay: 2,
      ease: 'easeOut',
    },
  },
};

export const glowPulse: Variants = {
  animate: {
    boxShadow: [
      '0 0 0 0 rgba(59, 130, 246, 0)',
      '0 0 0 8px rgba(59, 130, 246, 0.3)',
      '0 0 0 0 rgba(59, 130, 246, 0)',
    ],
    transition: {
      duration: 1.5,
      repeat: Infinity,
      ease: 'easeOut',
    },
  },
};

// ============================================================================
// Modal & Overlay
// ============================================================================

export const modalOverlay: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.2 },
  },
  exit: {
    opacity: 0,
    transition: { duration: 0.15 },
  },
};

export const modalContent: Variants = {
  hidden: { opacity: 0, scale: 0.95, y: 10 },
  visible: {
    opacity: 1,
    scale: 1,
    y: 0,
    transition: transitions.gentleSpring,
  },
  exit: {
    opacity: 0,
    scale: 0.95,
    y: 10,
    transition: transitions.fast,
  },
};

export const bottomSheet: Variants = {
  hidden: { y: '100%' },
  visible: {
    y: 0,
    transition: transitions.gentleSpring,
  },
  exit: {
    y: '100%',
    transition: transitions.default,
  },
};

// ============================================================================
// Calendar & Date Picker
// ============================================================================

export const calendarDay: Variants = {
  hidden: { opacity: 0, scale: 0.8 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: transitions.fast,
  },
  selected: {
    scale: 1,
    transition: transitions.spring,
  },
};

export const calendarMonth: Variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 50 : -50,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: transitions.default,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -50 : 50,
    opacity: 0,
    transition: transitions.fast,
  }),
};

// ============================================================================
// Time Slot
// ============================================================================

export const timeSlot: Variants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: transitions.fast,
  },
  hover: {
    scale: 1.03,
    y: -2,
    transition: transitions.fast,
  },
  selected: {
    scale: 1.02,
    transition: transitions.spring,
  },
  disabled: {
    opacity: 0.5,
    scale: 1,
  },
};

// ============================================================================
// Form
// ============================================================================

export const formField: Variants = {
  hidden: { opacity: 0, y: 10 },
  visible: {
    opacity: 1,
    y: 0,
    transition: transitions.default,
  },
  error: {
    x: [0, -4, 4, -4, 4, 0],
    transition: { duration: 0.4 },
  },
};

export const fieldFocus: Variants = {
  blur: {
    borderColor: '#E5E7EB',
    boxShadow: '0 0 0 0 rgba(59, 130, 246, 0)',
  },
  focus: {
    borderColor: '#3B82F6',
    boxShadow: '0 0 0 3px rgba(59, 130, 246, 0.1)',
    transition: transitions.fast,
  },
};

export const inputShake: Variants = {
  animate: {
    x: [0, -4, 4, -4, 4, 0],
    transition: { duration: 0.4 },
  },
};

export const floatingLabel: Variants = {
  default: {
    y: 0,
    scale: 1,
    color: '#6B7280',
  },
  focused: {
    y: -24,
    scale: 0.85,
    color: '#3B82F6',
    transition: transitions.fast,
  },
};

export const validationMessage: Variants = {
  hidden: { opacity: 0, y: -10, height: 0 },
  visible: {
    opacity: 1,
    y: 0,
    height: 'auto',
    transition: transitions.fast,
  },
};

// ============================================================================
// Success / Confirmation
// ============================================================================

export const successCheck: Variants = {
  hidden: { pathLength: 0, opacity: 0 },
  visible: {
    pathLength: 1,
    opacity: 1,
    transition: {
      pathLength: { duration: 0.5, ease: 'easeOut' },
      opacity: { duration: 0.2 },
    },
  },
};

export const successCircle: Variants = {
  hidden: { scale: 0, opacity: 0 },
  visible: {
    scale: 1,
    opacity: 1,
    transition: transitions.bouncySpring,
  },
};

export const confetti: Variants = {
  hidden: { opacity: 0, y: 0 },
  visible: (i: number) => ({
    opacity: [0, 1, 0],
    y: [0, -100 - Math.random() * 100],
    x: (i % 2 === 0 ? 1 : -1) * (20 + Math.random() * 40),
    rotate: Math.random() * 360,
    transition: {
      duration: 1 + Math.random() * 0.5,
      ease: 'easeOut',
    },
  }),
};

// ============================================================================
// Page Transitions
// ============================================================================

export const pageTransition: Variants = {
  initial: { opacity: 0, y: 20 },
  animate: {
    opacity: 1,
    y: 0,
    transition: transitions.default,
  },
  exit: {
    opacity: 0,
    y: -20,
    transition: transitions.fast,
  },
};

export const stepTransition: Variants = {
  enter: (direction: number) => ({
    x: direction > 0 ? 100 : -100,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
    transition: transitions.default,
  },
  exit: (direction: number) => ({
    x: direction > 0 ? -100 : 100,
    opacity: 0,
    transition: transitions.fast,
  }),
};

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Create stagger delay for child elements
 */
export function staggerDelay(index: number, baseDelay: number = 0.05): number {
  return index * baseDelay;
}

/**
 * Create variants with custom delay
 */
export function withDelay(variants: Variants, delay: number): Variants {
  return {
    ...variants,
    visible: {
      ...(variants.visible as object),
      transition: {
        ...((variants.visible as any)?.transition || {}),
        delay,
      },
    },
  };
}

/**
 * Combine multiple hover effects
 */
export function combineHover(...hovers: TargetAndTransition[]): TargetAndTransition {
  return hovers.reduce((acc, hover) => ({ ...acc, ...hover }), {});
}
