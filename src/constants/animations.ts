// Animation Constants and Spring Configurations
import { Easing } from 'react-native';

// Spring Presets (for react-native-reanimated)
export const springs = {
    // Gentle spring - for subtle UI feedback
    gentle: {
        damping: 20,
        stiffness: 100,
        mass: 1,
    },

    // Snappy spring - for quick interactions
    snappy: {
        damping: 15,
        stiffness: 200,
        mass: 0.8,
    },

    // Bouncy spring - for playful animations
    bouncy: {
        damping: 10,
        stiffness: 150,
        mass: 1,
    },

    // Stiff spring - for precise movements
    stiff: {
        damping: 25,
        stiffness: 300,
        mass: 0.5,
    },

    // Modal spring - for modal transitions
    modal: {
        damping: 18,
        stiffness: 120,
        mass: 1,
    },

    // Card spring - for card animations
    card: {
        damping: 16,
        stiffness: 140,
        mass: 0.9,
    },
};

// Timing Presets (for Animated API)
export const timings = {
    fast: 150,
    normal: 250,
    slow: 400,
    verySlow: 600,

    // Specific use cases
    fadeIn: 200,
    fadeOut: 150,
    slideIn: 300,
    slideOut: 250,
    scale: 200,
    shimmer: 1500,
    pulse: 1000,
    ringDraw: 800,
};

// Easing Presets
export const easings = {
    // Standard Material easings
    standard: Easing.bezier(0.4, 0, 0.2, 1),
    accelerate: Easing.bezier(0.4, 0, 1, 1),
    decelerate: Easing.bezier(0, 0, 0.2, 1),

    // iOS-like easings
    easeOutExpo: Easing.bezier(0.16, 1, 0.3, 1),
    easeInOutExpo: Easing.bezier(0.87, 0, 0.13, 1),

    // Bounce
    bounce: Easing.bounce,
    elastic: Easing.elastic(1),
};

// Stagger Delays
export const stagger = {
    fast: 30,
    normal: 50,
    slow: 80,
    verySlow: 120,
};

// Scale Values
export const scales = {
    pressed: 0.96,
    hover: 1.02,
    active: 0.98,
    bounce: 1.05,
};

// Opacity Values
export const opacities = {
    disabled: 0.5,
    pressed: 0.8,
    muted: 0.6,
    subtle: 0.4,
};

// Animation Delay Presets
export const delays = {
    short: 50,
    medium: 100,
    long: 200,
    afterEntrance: 300,
};

// Progress Ring Animation Config
export const progressRing = {
    duration: timings.ringDraw,
    initialDelay: 100,
    glowPulseDuration: 2000,
};

// Skeleton Shimmer Config
export const shimmer = {
    width: 200, // % of container
    duration: timings.shimmer,
    baseOpacity: 0.3,
    highlightOpacity: 0.7,
};

// Tab Transition Config
export const tabTransition = {
    spring: springs.snappy,
    staggerDelay: stagger.fast,
    fadeInDelay: delays.short,
};

// Card Swipe Config
export const cardSwipe = {
    threshold: 80,
    velocity: 500,
    spring: springs.card,
    actionRevealWidth: 100,
};

// Modal Transition Config  
export const modalTransition = {
    spring: springs.modal,
    backdropOpacity: 0.6,
    backdropDuration: timings.normal,
};
