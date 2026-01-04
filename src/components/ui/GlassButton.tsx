// GlassButton Component - Premium button with glass effect and animations
import { LinearGradient } from 'expo-linear-gradient';
import React, { ReactNode } from 'react';
import {
    ActivityIndicator,
    Pressable,
    StyleSheet,
    Text,
    TextStyle,
    ViewStyle
} from 'react-native';
import Animated, {
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming
} from 'react-native-reanimated';
import { springs, timings } from '../../constants/animations';
import { borderRadius, colors, spacing, typography } from '../../constants/theme';
import { useHaptics } from '../../hooks/useHaptics';

type ButtonVariant = 'primary' | 'secondary' | 'glass' | 'danger' | 'success';
type ButtonSize = 'sm' | 'md' | 'lg';

interface GlassButtonProps {
    children: ReactNode;
    onPress: () => void;
    variant?: ButtonVariant;
    size?: ButtonSize;
    disabled?: boolean;
    loading?: boolean;
    fullWidth?: boolean;
    icon?: ReactNode;
    style?: ViewStyle;
    textStyle?: TextStyle;
    haptic?: boolean;
}

export function GlassButton({
    children,
    onPress,
    variant = 'primary',
    size = 'md',
    disabled = false,
    loading = false,
    fullWidth = false,
    icon,
    style,
    textStyle,
    haptic = true,
}: GlassButtonProps) {
    const haptics = useHaptics();
    const pressed = useSharedValue(0);
    const scale = useSharedValue(1);

    const animatedContainerStyle = useAnimatedStyle(() => ({
        transform: [{ scale: scale.value }],
        opacity: withTiming(disabled || loading ? 0.6 : 1, { duration: timings.fast }),
    }));

    const handlePressIn = () => {
        pressed.value = withTiming(1, { duration: timings.fast });
        scale.value = withSpring(0.96, springs.snappy);
        if (haptic && !disabled && !loading) {
            haptics.button();
        }
    };

    const handlePressOut = () => {
        pressed.value = withTiming(0, { duration: timings.fast });
        scale.value = withSpring(1, springs.snappy);
    };

    const handlePress = () => {
        if (!disabled && !loading) {
            onPress();
        }
    };

    const getSizeStyles = (): { container: ViewStyle; text: TextStyle } => {
        switch (size) {
            case 'sm':
                return {
                    container: { paddingVertical: spacing.md, paddingHorizontal: spacing.lg },
                    text: { fontSize: typography.sizes.subhead },
                };
            case 'lg':
                return {
                    container: { paddingVertical: spacing.xl, paddingHorizontal: spacing['3xl'] },
                    text: { fontSize: typography.sizes.headline },
                };
            default:
                return {
                    container: { paddingVertical: spacing.lg, paddingHorizontal: spacing['2xl'] },
                    text: { fontSize: typography.sizes.body },
                };
        }
    };

    const getVariantColors = (): { gradient: string[]; text: string } => {
        switch (variant) {
            case 'secondary':
                return {
                    gradient: [colors.glass.backgroundLight, colors.glass.background],
                    text: colors.text.primary
                };
            case 'glass':
                return {
                    gradient: ['transparent', 'transparent'],
                    text: colors.text.primary
                };
            case 'danger':
                return {
                    gradient: [colors.error, '#ff4757'],
                    text: '#ffffff'
                };
            case 'success':
                return {
                    gradient: [colors.success, '#00b894'],
                    text: '#ffffff'
                };
            default:
                return {
                    gradient: [colors.primary.start, colors.primary.end],
                    text: '#ffffff'
                };
        }
    };

    const sizeStyles = getSizeStyles();
    const variantColors = getVariantColors();

    const glassStyle = variant === 'glass' ? {
        backgroundColor: colors.glass.background,
        borderWidth: 1,
        borderColor: colors.glass.border,
    } : {};

    return (
        <Pressable
            onPress={handlePress}
            onPressIn={handlePressIn}
            onPressOut={handlePressOut}
            disabled={disabled || loading}
        >
            <Animated.View style={[animatedContainerStyle, fullWidth && { width: '100%' }]}>
                <LinearGradient
                    colors={variantColors.gradient as [string, string]}
                    start={{ x: 0, y: 0 }}
                    end={{ x: 1, y: 1 }}
                    style={[
                        styles.container,
                        sizeStyles.container,
                        glassStyle,
                        style,
                    ]}
                >
                    {loading ? (
                        <ActivityIndicator color={variantColors.text} size="small" />
                    ) : (
                        <>
                            {icon && <>{icon}</>}
                            <Text
                                style={[
                                    styles.text,
                                    sizeStyles.text,
                                    { color: variantColors.text },
                                    icon ? { marginLeft: spacing.sm } : undefined,
                                    textStyle,
                                ]}
                            >
                                {children}
                            </Text>
                        </>
                    )}
                </LinearGradient>
            </Animated.View>
        </Pressable>
    );
}

const styles = StyleSheet.create({
    container: {
        flexDirection: 'row',
        alignItems: 'center',
        justifyContent: 'center',
        borderRadius: borderRadius.lg,
        overflow: 'hidden',
        minHeight: 48,
    },
    text: {
        fontWeight: '600',
        textAlign: 'center',
        letterSpacing: 0.3,
    },
});
