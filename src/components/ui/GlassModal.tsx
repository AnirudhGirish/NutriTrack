// GlassModal Component - Modal with backdrop blur and spring animations
import { BlurView } from 'expo-blur';
import React, { ReactNode, useEffect } from 'react';
import {
    Dimensions,
    Keyboard,
    KeyboardAvoidingView,
    Modal,
    Platform,
    Pressable,
    StyleSheet,
    Text,
    View,
} from 'react-native';
import Animated, {
    runOnJS,
    useAnimatedStyle,
    useSharedValue,
    withSpring,
    withTiming,
} from 'react-native-reanimated';
import { springs, timings } from '../../constants/animations';
import { borderRadius, colors, shadows, spacing, typography } from '../../constants/theme';
import { useHaptics } from '../../hooks/useHaptics';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface GlassModalProps {
    visible: boolean;
    onClose: () => void;
    title?: string;
    children: ReactNode;
    showCloseButton?: boolean;
    dismissOnBackdrop?: boolean;
    size?: 'sm' | 'md' | 'lg' | 'full';
}

export function GlassModal({
    visible,
    onClose,
    title,
    children,
    showCloseButton = true,
    dismissOnBackdrop = true,
    size = 'md',
}: GlassModalProps) {
    const haptics = useHaptics();
    const backdropOpacity = useSharedValue(0);
    const modalScale = useSharedValue(0.9);
    const modalTranslateY = useSharedValue(50);

    useEffect(() => {
        if (visible) {
            backdropOpacity.value = withTiming(1, { duration: timings.normal });
            modalScale.value = withSpring(1, springs.modal);
            modalTranslateY.value = withSpring(0, springs.modal);
        }
    }, [visible, backdropOpacity, modalScale, modalTranslateY]);

    const closeWithAnimation = () => {
        Keyboard.dismiss();
        haptics.light();

        backdropOpacity.value = withTiming(0, { duration: timings.fast });
        modalScale.value = withTiming(0.9, { duration: timings.fast });
        modalTranslateY.value = withTiming(50, { duration: timings.fast }, () => {
            runOnJS(onClose)();
        });
    };

    const backdropStyle = useAnimatedStyle(() => ({
        opacity: backdropOpacity.value,
    }));

    const modalStyle = useAnimatedStyle(() => ({
        transform: [
            { scale: modalScale.value },
            { translateY: modalTranslateY.value },
        ],
    }));

    const getModalWidth = () => {
        switch (size) {
            case 'sm': return SCREEN_WIDTH * 0.8;
            case 'lg': return SCREEN_WIDTH - 40;
            case 'full': return SCREEN_WIDTH;
            default: return SCREEN_WIDTH - 60;
        }
    };

    return (
        <Modal
            visible={visible}
            transparent
            animationType="none"
            statusBarTranslucent
            onRequestClose={closeWithAnimation}
        >
            <KeyboardAvoidingView
                behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
                style={styles.keyboardView}
            >
                <View style={styles.container}>
                    {/* Backdrop */}
                    <Animated.View style={[styles.backdrop, backdropStyle]}>
                        {Platform.OS === 'ios' ? (
                            <BlurView intensity={30} tint="dark" style={StyleSheet.absoluteFill} />
                        ) : (
                            <View style={[StyleSheet.absoluteFill, { backgroundColor: colors.overlay }]} />
                        )}
                        {dismissOnBackdrop && (
                            <Pressable
                                style={StyleSheet.absoluteFill}
                                onPress={closeWithAnimation}
                            />
                        )}
                    </Animated.View>

                    {/* Modal Content */}
                    <Animated.View
                        style={[
                            styles.modal,
                            shadows.xl,
                            { width: getModalWidth() },
                            size === 'full' && styles.modalFull,
                            modalStyle,
                        ]}
                    >
                        {/* Header */}
                        {(title || showCloseButton) && (
                            <View style={styles.header}>
                                {title && <Text style={styles.title}>{title}</Text>}
                                {showCloseButton && (
                                    <Pressable
                                        style={styles.closeButton}
                                        onPress={closeWithAnimation}
                                        hitSlop={20}
                                    >
                                        <Text style={styles.closeButtonText}>✕</Text>
                                    </Pressable>
                                )}
                            </View>
                        )}

                        {/* Body */}
                        <View style={styles.body}>
                            {children}
                        </View>
                    </Animated.View>
                </View>
            </KeyboardAvoidingView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    keyboardView: {
        flex: 1,
    },
    container: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
    },
    backdrop: {
        ...StyleSheet.absoluteFillObject,
        backgroundColor: Platform.OS === 'android' ? colors.overlay : 'transparent',
    },
    modal: {
        backgroundColor: colors.background.card,
        borderRadius: borderRadius['2xl'],
        borderWidth: 1,
        borderColor: colors.glass.border,
        maxHeight: SCREEN_HEIGHT * 0.85,
        overflow: 'hidden',
    },
    modalFull: {
        borderRadius: 0,
        flex: 1,
        maxHeight: '100%',
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: spacing['2xl'],
        paddingTop: spacing['2xl'],
        paddingBottom: spacing.lg,
        borderBottomWidth: 1,
        borderBottomColor: colors.divider,
    },
    title: {
        fontSize: typography.sizes.title3,
        fontWeight: typography.weights.bold,
        color: colors.text.primary,
        flex: 1,
    },
    closeButton: {
        width: 32,
        height: 32,
        borderRadius: 16,
        backgroundColor: colors.glass.background,
        alignItems: 'center',
        justifyContent: 'center',
    },
    closeButtonText: {
        color: colors.text.secondary,
        fontSize: 16,
    },
    body: {
        padding: spacing['2xl'],
    },
});
