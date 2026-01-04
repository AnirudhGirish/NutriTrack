// SkeletonLoader Component - Premium shimmer skeleton animation
import { LinearGradient } from 'expo-linear-gradient';
import React, { useEffect } from 'react';
import { Dimensions, StyleSheet, View, ViewStyle } from 'react-native';
import Animated, {
    Easing,
    interpolate,
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withTiming,
} from 'react-native-reanimated';
import { shimmer } from '../../constants/animations';
import { borderRadius, colors, spacing } from '../../constants/theme';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type SkeletonVariant = 'text' | 'circle' | 'rect' | 'card' | 'meal';

interface SkeletonLoaderProps {
    variant?: SkeletonVariant;
    width?: number | string;
    height?: number;
    borderRadius?: number;
    style?: ViewStyle;
}

function SkeletonBase({
    width = '100%',
    height = 20,
    borderRadius: radius = borderRadius.md,
    style,
}: SkeletonLoaderProps) {
    const shimmerPosition = useSharedValue(-1);

    useEffect(() => {
        shimmerPosition.value = withRepeat(
            withTiming(1, {
                duration: shimmer.duration,
                easing: Easing.linear,
            }),
            -1, // infinite
            false
        );
    }, [shimmerPosition]);

    const shimmerStyle = useAnimatedStyle(() => {
        const translateX = interpolate(
            shimmerPosition.value,
            [-1, 1],
            [-SCREEN_WIDTH, SCREEN_WIDTH]
        );
        return {
            transform: [{ translateX }],
        };
    });

    return (
        <View
            style={[
                styles.skeleton,
                {
                    width: width as number,
                    height,
                    borderRadius: radius,
                },
                style,
            ]}
        >
            <Animated.View style={[styles.shimmer, shimmerStyle]}>
                <LinearGradient
                    colors={[
                        'transparent',
                        colors.glass.backgroundLight,
                        'transparent',
                    ]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 0 }}
                    style={styles.gradient}
                />
            </Animated.View>
        </View>
    );
}

// Preset skeleton for text lines
function SkeletonText({ width = '100%', style }: SkeletonLoaderProps) {
    return <SkeletonBase height={16} width={width} style={style} />;
}

// Preset skeleton for circles/avatars
function SkeletonCircle({ width = 48, style }: SkeletonLoaderProps) {
    const size = typeof width === 'number' ? width : 48;
    return (
        <SkeletonBase
            width={size}
            height={size}
            borderRadius={size / 2}
            style={style}
        />
    );
}

// Preset skeleton for meal cards
function SkeletonMealCard({ style }: { style?: ViewStyle }) {
    return (
        <View style={[styles.mealCard, style]}>
            <View style={styles.mealHeader}>
                <SkeletonBase height={20} width="60%" />
                <SkeletonBase height={14} width={60} />
            </View>
            <View style={styles.mealNutrients}>
                <SkeletonBase height={36} width="22%" borderRadius={borderRadius.sm} />
                <SkeletonBase height={36} width="22%" borderRadius={borderRadius.sm} />
                <SkeletonBase height={36} width="22%" borderRadius={borderRadius.sm} />
                <SkeletonBase height={36} width="22%" borderRadius={borderRadius.sm} />
            </View>
            <View style={styles.mealActions}>
                <SkeletonBase height={40} width="48%" borderRadius={borderRadius.md} />
                <SkeletonBase height={40} width="48%" borderRadius={borderRadius.md} />
            </View>
        </View>
    );
}

// Preset skeleton for daily progress card
function SkeletonProgressCard({ style }: { style?: ViewStyle }) {
    return (
        <View style={[styles.progressCard, style]}>
            <SkeletonBase height={24} width="40%" style={{ marginBottom: spacing.xl }} />
            <View style={styles.progressRings}>
                <SkeletonCircle width={90} />
                <SkeletonCircle width={90} />
                <SkeletonCircle width={90} />
                <SkeletonCircle width={90} />
            </View>
        </View>
    );
}

// Main export with variants
export function SkeletonLoader({ variant = 'rect', ...props }: SkeletonLoaderProps) {
    switch (variant) {
        case 'text':
            return <SkeletonText {...props} />;
        case 'circle':
            return <SkeletonCircle {...props} />;
        case 'meal':
            return <SkeletonMealCard style={props.style} />;
        case 'card':
            return <SkeletonProgressCard style={props.style} />;
        default:
            return <SkeletonBase {...props} />;
    }
}

// Export individual components for custom layouts
export { SkeletonBase, SkeletonCircle, SkeletonMealCard, SkeletonProgressCard, SkeletonText };

const styles = StyleSheet.create({
    skeleton: {
        backgroundColor: colors.glass.backgroundDark,
        overflow: 'hidden',
    },
    shimmer: {
        width: '100%',
        height: '100%',
        position: 'absolute',
    },
    gradient: {
        flex: 1,
        width: SCREEN_WIDTH * 0.6,
    },
    mealCard: {
        backgroundColor: colors.glass.background,
        borderRadius: borderRadius.xl,
        borderWidth: 1,
        borderColor: colors.glass.border,
        padding: spacing['2xl'],
        marginBottom: spacing.lg,
    },
    mealHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: spacing.lg,
    },
    mealNutrients: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginBottom: spacing.lg,
    },
    mealActions: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        gap: spacing.md,
    },
    progressCard: {
        backgroundColor: colors.glass.background,
        borderRadius: borderRadius.xl,
        borderWidth: 1,
        borderColor: colors.glass.border,
        padding: spacing['2xl'],
        marginBottom: spacing.xl,
    },
    progressRings: {
        flexDirection: 'row',
        justifyContent: 'space-around',
        flexWrap: 'wrap',
    },
});
