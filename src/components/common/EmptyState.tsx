// EmptyState Component - Illustrated empty states with call-to-action
import React from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withRepeat,
    withSequence,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import { springs } from '../../constants/animations';
import { borderRadius, colors, spacing, typography } from '../../constants/theme';
import { useHaptics } from '../../hooks/useHaptics';
import { GlassButton } from '../ui/GlassButton';

interface EmptyStateProps {
    icon: string;
    title: string;
    message: string;
    actionText?: string;
    onAction?: () => void;
    secondaryActionText?: string;
    onSecondaryAction?: () => void;
    variant?: 'default' | 'compact' | 'minimal';
}

export function EmptyState({
    icon,
    title,
    message,
    actionText,
    onAction,
    secondaryActionText,
    onSecondaryAction,
    variant = 'default',
}: EmptyStateProps) {
    const haptics = useHaptics();
    const iconBounce = useSharedValue(0);
    const iconScale = useSharedValue(1);

    // Gentle bounce animation for icon
    React.useEffect(() => {
        iconBounce.value = withRepeat(
            withSequence(
                withTiming(-10, { duration: 1000 }),
                withTiming(0, { duration: 1000 })
            ),
            -1,
            true
        );
    }, [iconBounce]);

    const iconStyle = useAnimatedStyle(() => ({
        transform: [
            { translateY: iconBounce.value },
            { scale: iconScale.value },
        ],
    }));

    const handleIconPress = () => {
        haptics.light();
        iconScale.value = withSequence(
            withSpring(1.2, springs.bouncy),
            withSpring(1, springs.gentle)
        );
    };

    const isCompact = variant === 'compact';
    const isMinimal = variant === 'minimal';

    return (
        <View style={[
            styles.container,
            isCompact && styles.containerCompact,
            isMinimal && styles.containerMinimal,
        ]}>
            <Pressable onPress={handleIconPress}>
                <Animated.Text style={[
                    styles.icon,
                    isCompact && styles.iconCompact,
                    isMinimal && styles.iconMinimal,
                    iconStyle,
                ]}>
                    {icon}
                </Animated.Text>
            </Pressable>

            <Text style={[
                styles.title,
                isCompact && styles.titleCompact,
                isMinimal && styles.titleMinimal,
            ]}>
                {title}
            </Text>

            <Text style={[
                styles.message,
                isCompact && styles.messageCompact,
                isMinimal && styles.messageMinimal,
            ]}>
                {message}
            </Text>

            {actionText && onAction && (
                <View style={styles.actions}>
                    <GlassButton
                        onPress={onAction}
                        variant="primary"
                        size={isCompact ? 'sm' : 'md'}
                    >
                        {actionText}
                    </GlassButton>

                    {secondaryActionText && onSecondaryAction && (
                        <GlassButton
                            onPress={onSecondaryAction}
                            variant="glass"
                            size={isCompact ? 'sm' : 'md'}
                            style={{ marginTop: spacing.md }}
                        >
                            {secondaryActionText}
                        </GlassButton>
                    )}
                </View>
            )}
        </View>
    );
}

// Preset empty states
export const EmptyStates = {
    noMeals: {
        icon: '🍽️',
        title: 'No meals yet',
        message: "Take a photo or upload an image of your food to get started!",
        actionText: 'Add Your First Meal',
    },
    noWeekData: {
        icon: '📊',
        title: 'No data this week',
        message: 'Start tracking your meals to see weekly trends and insights!',
    },
    noSearchResults: {
        icon: '🔍',
        title: 'No results found',
        message: 'Try adjusting your search or browse all meals.',
    },
    analysisError: {
        icon: '😕',
        title: 'Analysis failed',
        message: "We couldn't analyze that image. Please try again with a clearer photo.",
        actionText: 'Try Again',
    },
    notFood: {
        icon: '🤔',
        title: "That's not food!",
        message: 'Please take a photo of your meal to track its nutrition.',
        actionText: 'Take New Photo',
        secondaryActionText: 'Enter Manually',
    },
    offline: {
        icon: '📡',
        title: 'No connection',
        message: "You're offline. Some features may not be available.",
    },
};

const styles = StyleSheet.create({
    container: {
        backgroundColor: colors.glass.background,
        borderRadius: borderRadius['2xl'],
        borderWidth: 1,
        borderColor: colors.glass.border,
        padding: spacing['4xl'],
        alignItems: 'center',
        marginVertical: spacing.xl,
    },
    containerCompact: {
        padding: spacing['2xl'],
    },
    containerMinimal: {
        backgroundColor: 'transparent',
        borderWidth: 0,
        padding: spacing.xl,
    },
    icon: {
        fontSize: 72,
        marginBottom: spacing['2xl'],
    },
    iconCompact: {
        fontSize: 48,
        marginBottom: spacing.lg,
    },
    iconMinimal: {
        fontSize: 40,
        marginBottom: spacing.md,
    },
    title: {
        fontSize: typography.sizes.title3,
        fontWeight: typography.weights.bold,
        color: colors.text.primary,
        textAlign: 'center',
        marginBottom: spacing.md,
    },
    titleCompact: {
        fontSize: typography.sizes.headline,
    },
    titleMinimal: {
        fontSize: typography.sizes.body,
    },
    message: {
        fontSize: typography.sizes.body,
        color: colors.text.secondary,
        textAlign: 'center',
        lineHeight: typography.sizes.body * typography.lineHeights.relaxed,
        marginBottom: spacing.xl,
        paddingHorizontal: spacing.lg,
    },
    messageCompact: {
        fontSize: typography.sizes.subhead,
        marginBottom: spacing.lg,
    },
    messageMinimal: {
        fontSize: typography.sizes.footnote,
        marginBottom: spacing.md,
    },
    actions: {
        width: '100%',
        alignItems: 'center',
    },
});
