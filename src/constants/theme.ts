// Design System Theme Constants
import { Dimensions, Platform } from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Color Palette - Dark Luxe Glass Design
export const colors = {
    // Primary Gradient
    primary: {
        start: '#667eea',
        end: '#764ba2',
        solid: '#667eea',
        surface: 'rgba(102, 126, 234, 0.15)',
    },
    secondary: {
        start: '#FF9966',
        end: '#FF5E62',
        solid: '#FF9966',
        surface: 'rgba(255, 153, 102, 0.15)',
    },
    accent: {
        start: '#4facfe',
        end: '#00f2fe',
        solid: '#4facfe',
        surface: 'rgba(79, 172, 254, 0.15)',
    },

    // Glass Effects
    glass: {
        background: 'rgba(255, 255, 255, 0.08)',
        backgroundLight: 'rgba(255, 255, 255, 0.12)',
        backgroundDark: 'rgba(0, 0, 0, 0.15)',
        border: 'rgba(255, 255, 255, 0.15)',
        borderLight: 'rgba(255, 255, 255, 0.25)',
        highlight: 'rgba(255, 255, 255, 0.4)',
    },

    // Semantic Colors
    success: '#4ECDC4',
    warning: '#FFE66D',
    error: '#FF6B6B',
    info: '#74b9ff',

    // Nutrition Colors
    calories: '#FF6B6B',
    protein: '#4ECDC4',
    carbs: '#FFE66D',
    fats: '#A8E6CF',
    water: '#74b9ff',

    // Neutral Palette
    background: {
        primary: '#0a0a0f',
        secondary: '#12121a',
        tertiary: '#1a1a24',
        card: '#1e1e2a',
    },

    text: {
        primary: '#ffffff',
        secondary: 'rgba(255, 255, 255, 0.75)',
        tertiary: 'rgba(255, 255, 255, 0.5)',
        muted: 'rgba(255, 255, 255, 0.35)',
    },

    // UI Elements
    divider: 'rgba(255, 255, 255, 0.08)',
    overlay: 'rgba(0, 0, 0, 0.6)',
};

// Typography
export const typography = {
    fontFamily: Platform.select({
        ios: 'System',
        android: 'Roboto',
    }),

    sizes: {
        hero: 42,
        title1: 32,
        title2: 26,
        title3: 22,
        headline: 18,
        body: 16,
        callout: 15,
        subhead: 14,
        footnote: 13,
        caption: 12,
        micro: 10,
    },

    weights: {
        regular: '400' as const,
        medium: '500' as const,
        semibold: '600' as const,
        bold: '700' as const,
        heavy: '800' as const,
    },

    lineHeights: {
        tight: 1.1,
        normal: 1.4,
        relaxed: 1.6,
    },
};

// Spacing Scale
export const spacing = {
    xs: 4,
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    '2xl': 24,
    '3xl': 32,
    '4xl': 40,
    '5xl': 48,
    '6xl': 64,
};

// Border Radius
export const borderRadius = {
    sm: 8,
    md: 12,
    lg: 16,
    xl: 20,
    '2xl': 24,
    '3xl': 32,
    full: 9999,
};

// Shadow Presets
export const shadows = {
    sm: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.15,
        shadowRadius: 4,
        elevation: 2,
    },
    md: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.2,
        shadowRadius: 8,
        elevation: 4,
    },
    lg: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.25,
        shadowRadius: 16,
        elevation: 8,
    },
    xl: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 12 },
        shadowOpacity: 0.3,
        shadowRadius: 24,
        elevation: 12,
    },
    glow: (color: string) => ({
        shadowColor: color,
        shadowOffset: { width: 0, height: 0 },
        shadowOpacity: 0.5,
        shadowRadius: 20,
        elevation: 0,
    }),
};

// Glass Card Presets
export const glassPresets = {
    card: {
        backgroundColor: colors.glass.background,
        borderWidth: 1,
        borderColor: colors.glass.border,
    },
    cardLight: {
        backgroundColor: colors.glass.backgroundLight,
        borderWidth: 1,
        borderColor: colors.glass.borderLight,
    },
    modal: {
        backgroundColor: 'rgba(20, 20, 30, 0.85)',
        borderWidth: 1,
        borderColor: colors.glass.border,
    },
    button: {
        backgroundColor: colors.glass.backgroundLight,
        borderWidth: 1,
        borderColor: colors.glass.borderLight,
    },
};

// Layout Constants
export const layout = {
    screenWidth: SCREEN_WIDTH,
    screenHeight: SCREEN_HEIGHT,
    contentPadding: spacing.xl,
    cardPadding: spacing['2xl'],
    headerHeight: 120,
    tabBarHeight: Platform.select({ ios: 85, android: 70 }) ?? 70,
    safeAreaTop: Platform.select({ ios: 50, android: 24 }) ?? 24,
};

// Default Goals
export const defaultGoals = {
    calories: 2000,
    protein: 150,
    carbs: 250,
    fats: 65,
    waterGoal: 2500, // ml
};

// Meal Type Config
export const mealTypeConfig = {
    breakfast: { icon: '🌅', label: 'Breakfast', timeRange: [5, 11] },
    lunch: { icon: '☀️', label: 'Lunch', timeRange: [11, 15] },
    dinner: { icon: '🌙', label: 'Dinner', timeRange: [17, 22] },
    snack: { icon: '🍿', label: 'Snack', timeRange: null },
} as const;
