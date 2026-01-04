// Haptics Hook - Centralized haptic feedback patterns
import * as Haptics from 'expo-haptics';
import { useCallback } from 'react';
import { Platform } from 'react-native';

type HapticPattern =
    | 'light'
    | 'medium'
    | 'heavy'
    | 'success'
    | 'warning'
    | 'error'
    | 'selection'
    | 'button'
    | 'toggle'
    | 'swipe'
    | 'delete';

/**
 * Hook providing consistent haptic feedback patterns
 */
export function useHaptics() {
    const trigger = useCallback(async (pattern: HapticPattern) => {
        // Haptics don't work well on Android, so we selectively use them
        if (Platform.OS === 'android') {
            // Only use basic impact on Android
            if (['light', 'button', 'selection'].includes(pattern)) {
                try {
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                } catch { }
            }
            return;
        }

        // iOS gets the full haptic experience
        try {
            switch (pattern) {
                case 'light':
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    break;

                case 'medium':
                case 'button':
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                    break;

                case 'heavy':
                case 'delete':
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
                    break;

                case 'success':
                    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
                    break;

                case 'warning':
                    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning);
                    break;

                case 'error':
                    await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
                    break;

                case 'selection':
                case 'toggle':
                    await Haptics.selectionAsync();
                    break;

                case 'swipe':
                    await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                    break;
            }
        } catch (error) {
            // Haptics may not be available on all devices
            console.debug('Haptics not available:', error);
        }
    }, []);

    // Pre-bound convenience methods
    const light = useCallback(() => trigger('light'), [trigger]);
    const medium = useCallback(() => trigger('medium'), [trigger]);
    const heavy = useCallback(() => trigger('heavy'), [trigger]);
    const success = useCallback(() => trigger('success'), [trigger]);
    const warning = useCallback(() => trigger('warning'), [trigger]);
    const error = useCallback(() => trigger('error'), [trigger]);
    const selection = useCallback(() => trigger('selection'), [trigger]);
    const button = useCallback(() => trigger('button'), [trigger]);
    const toggle = useCallback(() => trigger('toggle'), [trigger]);
    const swipe = useCallback(() => trigger('swipe'), [trigger]);
    const deleteAction = useCallback(() => trigger('delete'), [trigger]);

    return {
        trigger,
        light,
        medium,
        heavy,
        success,
        warning,
        error,
        selection,
        button,
        toggle,
        swipe,
        delete: deleteAction,
    };
}

/**
 * Standalone haptic functions for use outside components
 */
export const haptics = {
    light: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => { }),
    medium: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium).catch(() => { }),
    heavy: () => Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy).catch(() => { }),
    success: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => { }),
    warning: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Warning).catch(() => { }),
    error: () => Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error).catch(() => { }),
    selection: () => Haptics.selectionAsync().catch(() => { }),
};
