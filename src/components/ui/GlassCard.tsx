// GlassCard Component - Glassmorphism card with blur effects
import { BlurView } from 'expo-blur';
import React, { ReactNode } from 'react';
import { Platform, StyleProp, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring
} from 'react-native-reanimated';
import { springs } from '../../constants/animations';
import { borderRadius, colors, shadows, spacing } from '../../constants/theme';

interface GlassCardProps {
    children: ReactNode;
    style?: StyleProp<ViewStyle>;
    variant?: 'default' | 'light' | 'dark' | 'solid';
    blurIntensity?: number;
    animated?: boolean;
    onPressIn?: () => void;
    onPressOut?: () => void;
}

export function GlassCard({
    children,
    style,
    variant = 'default',
    blurIntensity = 20,
    animated = false,
}: GlassCardProps) {
    const scale = useSharedValue(1);

    const animatedStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
    }));

    const handlePressIn = () => {
        if (animated) {
            scale.value = withSpring(0.98, springs.snappy);
        }
    };

    const handlePressOut = () => {
        if (animated) {
            scale.value = withSpring(1, springs.snappy);
        }
    };

    const getVariantStyles = (): ViewStyle => {
        switch (variant) {
            case 'light':
                return {
                    backgroundColor: colors.glass.backgroundLight,
                    borderColor: colors.glass.borderLight,
                };
            case 'dark':
                return {
                    backgroundColor: colors.glass.backgroundDark,
                    borderColor: colors.glass.border,
                };
            case 'solid':
                return {
                    backgroundColor: colors.background.card,
                    borderColor: colors.glass.border,
                };
            default:
                return {
                    backgroundColor: colors.glass.background,
                    borderColor: colors.glass.border,
                };
        }
    };

    const content = (
        <>
            {Platform.OS === 'ios' && variant !== 'solid' && (
                <BlurView
                    intensity={blurIntensity}
                    tint="dark"
                    style={StyleSheet.absoluteFill}
                />
            )}
            <View style={styles.content}>
                {children}
            </View>
        </>
    );

    if (animated) {
        return (
            <Animated.View
                style={[
                    styles.container,
                    getVariantStyles(),
                    shadows.md,
                    style,
                    animatedStyle,
                ]}
                onTouchStart={handlePressIn}
                onTouchEnd={handlePressOut}
                onTouchCancel={handlePressOut}
            >
                {content}
            </Animated.View>
        );
    }

    return (
        <View style={[styles.container, getVariantStyles(), shadows.md, style]}>
            {content}
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        borderRadius: borderRadius.xl,
        borderWidth: 1,
        overflow: 'hidden',
    },
    content: {
        padding: spacing['2xl'],
    },
});
