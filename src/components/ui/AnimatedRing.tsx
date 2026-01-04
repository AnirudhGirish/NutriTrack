// AnimatedRing Component - Circular progress with animated stroke and glow
import React, { useEffect } from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import Animated, {
    Easing,
    useAnimatedProps,
    useAnimatedStyle,
    useSharedValue,
    withDelay,
    withRepeat,
    withSequence,
    withTiming
} from 'react-native-reanimated';
import Svg, { Circle, Defs, Stop, LinearGradient as SvgGradient } from 'react-native-svg';
import { timings } from '../../constants/animations';
import { colors, typography } from '../../constants/theme';

const AnimatedCircle = Animated.createAnimatedComponent(Circle);

interface AnimatedRingProps {
    size?: number;
    strokeWidth?: number;
    progress: number; // 0-100
    color: string;
    gradientEnd?: string;
    label: string;
    value: string | number;
    showGlow?: boolean;
    animateOnMount?: boolean;
    delay?: number;
    style?: ViewStyle;
}

export function AnimatedRing({
    size = 90,
    strokeWidth = 8,
    progress,
    color,
    gradientEnd,
    label,
    value,
    showGlow = true,
    animateOnMount = true,
    delay = 0,
    style,
}: AnimatedRingProps) {
    const radius = (size - strokeWidth) / 2;
    const circumference = radius * 2 * Math.PI;
    const center = size / 2;

    // Animated progress value
    const animatedProgress = useSharedValue(animateOnMount ? 0 : progress);

    // Glow pulse animation
    const glowOpacity = useSharedValue(0.3);

    useEffect(() => {
        // Animate progress on mount or when value changes
        animatedProgress.value = withDelay(
            delay,
            withTiming(Math.min(progress, 100), {
                duration: timings.ringDraw,
                easing: Easing.bezier(0.25, 0.1, 0.25, 1),
            })
        );

        // Start glow pulse when near goal (>80%)
        if (progress >= 80 && showGlow) {
            glowOpacity.value = withRepeat(
                withSequence(
                    withTiming(0.6, { duration: 1000 }),
                    withTiming(0.3, { duration: 1000 })
                ),
                -1, // infinite
                true
            );
        }
    }, [progress, delay, animatedProgress, glowOpacity, showGlow]);

    // Animated stroke props
    const animatedStrokeProps = useAnimatedProps(() => {
        const strokeDashoffset = circumference - (animatedProgress.value / 100) * circumference;
        return {
            strokeDashoffset,
        };
    });

    // Animated glow style
    const glowStyle = useAnimatedStyle(() => {
        if (!showGlow || progress < 80) {
            return { opacity: 0 };
        }
        return {
            opacity: glowOpacity.value,
        };
    });

    // Percentage text
    const percentText = `${Math.round(progress)}%`;

    return (
        <View style={[styles.container, { width: size, height: size }, style]}>
            {/* Glow effect for high progress */}
            {showGlow && progress >= 80 && (
                <Animated.View
                    style={[
                        styles.glow,
                        {
                            width: size + 20,
                            height: size + 20,
                            borderRadius: (size + 20) / 2,
                            backgroundColor: color,
                        },
                        glowStyle,
                    ]}
                />
            )}

            <Svg width={size} height={size} style={styles.svg}>
                <Defs>
                    <SvgGradient id={`gradient-${label}`} x1="0%" y1="0%" x2="100%" y2="100%">
                        <Stop offset="0%" stopColor={color} />
                        <Stop offset="100%" stopColor={gradientEnd || color} />
                    </SvgGradient>
                </Defs>

                {/* Background track */}
                <Circle
                    cx={center}
                    cy={center}
                    r={radius}
                    stroke={colors.glass.background}
                    strokeWidth={strokeWidth}
                    fill="transparent"
                />

                {/* Animated progress */}
                <AnimatedCircle
                    cx={center}
                    cy={center}
                    r={radius}
                    stroke={`url(#gradient-${label})`}
                    strokeWidth={strokeWidth}
                    fill="transparent"
                    strokeDasharray={circumference}
                    animatedProps={animatedStrokeProps}
                    strokeLinecap="round"
                    rotation={-90}
                    origin={`${center}, ${center}`}
                />
            </Svg>

            {/* Center content */}
            <View style={styles.centerContent}>
                <Text
                    style={[
                        styles.value,
                        { fontSize: size > 150 ? 42 : size > 80 ? 24 : 14 }
                    ]}
                    numberOfLines={1}
                >
                    {value}
                </Text>
                <Text style={[styles.label, { fontSize: size > 150 ? 16 : size > 80 ? 12 : 9 }]}>
                    {label}
                </Text>
                <Text style={[styles.percent, { color, fontSize: size > 150 ? 14 : size > 80 ? 11 : 8 }]}>
                    {percentText}
                </Text>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        alignItems: 'center',
        justifyContent: 'center',
    },
    svg: {
        transform: [{ rotate: '-90deg' }],
    },
    glow: {
        position: 'absolute',
        top: -10,
        left: -10,
    },
    centerContent: {
        position: 'absolute',
        alignItems: 'center',
        justifyContent: 'center',
        width: '100%',
        height: '100%',
    },
    value: {
        fontWeight: typography.weights.bold,
        color: colors.text.primary,
        marginBottom: 2,
    },
    label: {
        color: colors.text.tertiary,
        marginBottom: 1,
    },
    percent: {
        fontWeight: typography.weights.semibold,
    },
});
