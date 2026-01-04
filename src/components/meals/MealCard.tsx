// MealCard Component - Swipeable meal card with edit/delete actions
import { LinearGradient } from 'expo-linear-gradient';
import React from 'react';
import { Dimensions, Pressable, StyleSheet, Text, View } from 'react-native';
import { Gesture, GestureDetector } from 'react-native-gesture-handler';
import Animated, {
    Extrapolation,
    interpolate,
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withSpring
} from 'react-native-reanimated';
import { springs } from '../../constants/animations';
import { borderRadius, colors, spacing, typography } from '../../constants/theme';
import { useHaptics } from '../../hooks/useHaptics';
import type { Meal, MealType } from '../../types/nutrition';

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const ACTION_WIDTH = 80;

interface MealCardProps {
    meal: Meal;
    onEdit: (meal: Meal) => void;
    onDelete: (meal: Meal) => void;
    animationDelay?: number;
}

const mealTypeIcons: Record<MealType, string> = {
    breakfast: '🌅',
    lunch: '☀️',
    dinner: '🌙',
    snack: '🍿',
};

export function MealCard({
    meal,
    onEdit,
    onDelete,
    animationDelay = 0,
}: MealCardProps) {
    const haptics = useHaptics();
    const translateX = useSharedValue(0);
    const scale = useSharedValue(1);
    const cardOpacity = useSharedValue(1);
    const entryProgress = useSharedValue(0);

    // Entry animation
    React.useEffect(() => {
        entryProgress.value = withDelay(
            animationDelay,
            withSpring(1, springs.card)
        );
    }, [animationDelay, entryProgress]);

    const panGesture = Gesture.Pan()
        .activeOffsetX([-15, 15])
        .failOffsetY([-15, 15])
        .onUpdate((event) => {
            const clampedX = Math.min(0, Math.max(event.translationX, -ACTION_WIDTH * 2));
            translateX.value = clampedX;
        })
        .onEnd((event) => {
            const velocityThreshold = -500;
            const positionThreshold = -50;

            const shouldOpen = event.velocityX < velocityThreshold ||
                (translateX.value < positionThreshold && event.velocityX < 0);

            if (shouldOpen) {
                translateX.value = withSpring(-ACTION_WIDTH * 2, {
                    damping: 20,
                    stiffness: 300,
                    mass: 0.8,
                });
                runOnJS(haptics.swipe)();
            } else {
                translateX.value = withSpring(0, {
                    damping: 25,
                    stiffness: 400,
                    mass: 0.6,
                });
            }
        });

    const longPressGesture = Gesture.LongPress()
        .minDuration(300)
        .onStart(() => {
            scale.value = withSpring(0.98, springs.snappy);
            runOnJS(haptics.medium)();
        })
        .onEnd(() => {
            scale.value = withSpring(1, springs.snappy);
        });

    const tapGesture = Gesture.Tap()
        .onStart(() => {
            scale.value = withSpring(0.98, springs.snappy);
        })
        .onEnd(() => {
            scale.value = withSpring(1, springs.snappy);
            const isOpen = translateX.value < -10;
            if (isOpen) {
                translateX.value = withSpring(0, springs.snappy);
            } else {
                translateX.value = withSpring(-ACTION_WIDTH * 2 - spacing.sm, {
                    damping: 20,
                    stiffness: 300,
                    mass: 0.8,
                });
                runOnJS(haptics.light)();
            }
        });

    const composed = Gesture.Simultaneous(
        panGesture,
        Gesture.Exclusive(longPressGesture, tapGesture)
    );

    const cardStyle = useAnimatedStyle(() => {
        const entryScale = interpolate(
            entryProgress.value,
            [0, 1],
            [0.95, 1],
            Extrapolation.CLAMP
        );
        const entryOpacity = interpolate(
            entryProgress.value,
            [0, 1],
            [0, 1],
            Extrapolation.CLAMP
        );

        return {
            transform: [
                { translateX: translateX.value },
                { scale: scale.value * entryScale },
            ],
            opacity: cardOpacity.value * entryOpacity,
        };
    });

    const actionStyle = useAnimatedStyle(() => {
        const opacity = interpolate(
            translateX.value,
            [-ACTION_WIDTH * 2, -ACTION_WIDTH, 0],
            [1, 0.5, 0],
            Extrapolation.CLAMP
        );
        return { opacity };
    });

    const handleEdit = () => {
        haptics.button();
        translateX.value = withSpring(0, springs.snappy);
        onEdit(meal);
    };

    const handleDelete = () => {
        haptics.delete();
        onDelete(meal);
    };

    const formatTime = (timestamp: string) => {
        try {
            return new Date(timestamp).toLocaleTimeString([], {
                hour: '2-digit',
                minute: '2-digit'
            });
        } catch {
            return '';
        }
    };

    const getConfidenceBadge = () => {
        if (!meal.confidence) return null;
        const badgeColors = {
            high: colors.success,
            medium: colors.warning,
            low: colors.error,
        };
        return (
            <View style={[styles.confidenceBadge, { backgroundColor: badgeColors[meal.confidence] }]}>
                <Text style={styles.confidenceText}>{meal.confidence}</Text>
            </View>
        );
    };

    return (
        <View style={styles.container}>
            {/* Action buttons */}
            <Animated.View style={[styles.actionsContainer, actionStyle]}>
                <Pressable onPress={handleEdit} style={styles.actionButtonWrapper}>
                    <LinearGradient
                        colors={['rgba(99, 102, 241, 0.9)', 'rgba(79, 70, 229, 0.95)']}
                        style={styles.actionButtonGradient}
                    >
                        <View style={styles.actionIconContainer}>
                            <Text style={styles.actionIcon}>✎</Text>
                        </View>
                        <Text style={styles.actionLabel}>Edit</Text>
                    </LinearGradient>
                </Pressable>

                <View style={{ width: spacing.sm }} />

                <Pressable onPress={handleDelete} style={styles.actionButtonWrapper}>
                    <LinearGradient
                        colors={['rgba(239, 68, 68, 0.9)', 'rgba(220, 38, 38, 0.95)']}
                        style={styles.actionButtonGradient}
                    >
                        <View style={styles.actionIconContainer}>
                            <Text style={styles.actionIcon}>✕</Text>
                        </View>
                        <Text style={styles.actionLabel}>Delete</Text>
                    </LinearGradient>
                </Pressable>
            </Animated.View>

            {/* Main card */}
            <GestureDetector gesture={composed}>
                <Animated.View style={[styles.cardContainer, cardStyle]}>
                    <LinearGradient
                        colors={[colors.glass.background, 'rgba(255,255,255, 0.02)']}
                        start={{ x: 0, y: 0 }}
                        end={{ x: 1, y: 1 }}
                        style={styles.cardGradient}
                    >
                        {/* Header */}
                        <View style={styles.header}>
                            <View style={styles.titleRow}>
                                {meal.mealType && (
                                    <Text style={styles.mealTypeIcon}>
                                        {mealTypeIcons[meal.mealType]}
                                    </Text>
                                )}
                                <Text style={styles.name} numberOfLines={1}>
                                    {meal.name}
                                </Text>
                                {getConfidenceBadge()}
                            </View>
                            <Text style={styles.timestamp}>{formatTime(meal.timestamp)}</Text>
                        </View>

                        {/* Serving size if available */}
                        {meal.serving_size && (
                            <Text style={styles.servingSize}>{meal.serving_size}</Text>
                        )}

                        {/* Nutrition grid */}
                        <View style={styles.nutritionGrid}>
                            <NutrientPill
                                value={meal.calories}
                                unit=""
                                label="cal"
                                color={colors.calories}
                            />
                            <NutrientPill
                                value={meal.protein}
                                unit="g"
                                label="protein"
                                color={colors.protein}
                            />
                            <NutrientPill
                                value={meal.carbs}
                                unit="g"
                                label="carbs"
                                color={colors.carbs}
                            />
                            <NutrientPill
                                value={meal.fats}
                                unit="g"
                                label="fats"
                                color={colors.fats}
                            />
                        </View>
                    </LinearGradient>
                </Animated.View>
            </GestureDetector>
        </View>
    );
}

// Nutrient pill sub-component
function NutrientPill({
    value,
    unit,
    label,
    color
}: {
    value: number;
    unit: string;
    label: string;
    color: string;
}) {
    return (
        <View style={[styles.nutrientPill, { borderColor: color + '40', backgroundColor: color + '15' }]}>
            <Text style={[styles.nutrientValue, { color }]}>
                {Math.round(value)}{unit}
            </Text>
            <Text style={styles.nutrientLabel}>{label}</Text>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        marginBottom: spacing.lg,
        position: 'relative',
    },
    actionsContainer: {
        position: 'absolute',
        right: 0,
        top: 0,
        bottom: 0,
        flexDirection: 'row',
        alignItems: 'center',
        paddingVertical: 2, // Slight indent
    },
    actionButtonWrapper: {
        width: ACTION_WIDTH - 8,
        height: '90%',
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 4 },
        shadowOpacity: 0.3,
        shadowRadius: 5,
        elevation: 5,
    },
    actionButtonGradient: {
        flex: 1,
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: borderRadius.xl,
        borderWidth: 1,
        borderColor: 'rgba(255,255,255,0.2)',
    },
    actionIconContainer: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: 'rgba(255, 255, 255, 0.25)',
        alignItems: 'center',
        justifyContent: 'center',
        marginBottom: 4,
    },
    actionIcon: {
        fontSize: 16,
        color: '#fff',
    },
    actionLabel: {
        color: '#fff',
        fontSize: typography.sizes.micro,
        fontWeight: typography.weights.bold,
        letterSpacing: 0.5,
    },
    cardContainer: {
        borderRadius: borderRadius.xl,
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 8 },
        shadowOpacity: 0.4,
        shadowRadius: 12,
        elevation: 10,
    },
    cardGradient: {
        borderRadius: borderRadius.xl,
        borderWidth: 1,
        borderColor: colors.glass.border,
        padding: spacing['2xl'],
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: spacing.sm,
    },
    titleRow: {
        flexDirection: 'row',
        alignItems: 'center',
        flex: 1,
        gap: spacing.sm,
    },
    mealTypeIcon: {
        fontSize: 18,
    },
    name: {
        fontSize: typography.sizes.headline,
        fontWeight: typography.weights.bold,
        color: colors.text.primary,
        flex: 1,
        textShadowColor: 'rgba(0,0,0,0.5)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 2,
    },
    confidenceBadge: {
        paddingHorizontal: spacing.sm,
        paddingVertical: 2,
        borderRadius: borderRadius.sm,
    },
    confidenceText: {
        fontSize: typography.sizes.micro,
        fontWeight: typography.weights.semibold,
        color: '#000',
        textTransform: 'capitalize',
    },
    timestamp: {
        fontSize: typography.sizes.caption,
        color: colors.text.tertiary,
        marginLeft: spacing.sm,
    },
    servingSize: {
        fontSize: typography.sizes.subhead,
        color: colors.text.secondary,
        marginBottom: spacing.md,
    },
    nutritionGrid: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        marginTop: spacing.md,
    },
    nutrientPill: {
        alignItems: 'center',
        paddingVertical: spacing.sm,
        paddingHorizontal: spacing.md,
        borderRadius: borderRadius.md,
        borderWidth: 1,
        minWidth: 70,
    },
    nutrientValue: {
        fontSize: typography.sizes.body,
        fontWeight: typography.weights.bold,
        textShadowColor: 'rgba(0,0,0,0.3)',
        textShadowOffset: { width: 0, height: 1 },
        textShadowRadius: 1,
    },
    nutrientLabel: {
        fontSize: typography.sizes.micro,
        color: colors.text.tertiary,
        marginTop: 2,
        fontWeight: '500',
    },
});
