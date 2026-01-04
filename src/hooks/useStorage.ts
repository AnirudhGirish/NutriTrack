// Storage Hook - Type-safe AsyncStorage operations
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { defaultGoals } from '../constants/theme';
import type { DailyNutrition, Goals, Meal, NutritionTotals } from '../types/nutrition';

// Storage Keys
const STORAGE_KEYS = {
    GOALS: 'nutrition_goals',
    ONBOARDING: 'onboarding_complete',
    DAY_PREFIX: 'nutrition_',
    MONTH_PREFIX: 'nutrition_month_',
} as const;

// Initial values
const initialDailyNutrition: DailyNutrition = {
    calories: 0,
    protein: 0,
    carbs: 0,
    fats: 0,
    meals: [],
    waterIntake: 0,
};

/**
 * Generate unique meal ID
 */
export const createMealId = (): string =>
    globalThis.crypto?.randomUUID?.() ??
    `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;

/**
 * Calculate totals from meal list
 */
export const calculateMealTotals = (meals: Meal[]): NutritionTotals =>
    meals.reduce<NutritionTotals>(
        (acc, meal) => ({
            calories: acc.calories + (meal.calories || 0),
            protein: acc.protein + (meal.protein || 0),
            carbs: acc.carbs + (meal.carbs || 0),
            fats: acc.fats + (meal.fats || 0),
        }),
        { calories: 0, protein: 0, carbs: 0, fats: 0 }
    );

/**
 * Format date to storage key
 */
const getDateKey = (date: Date): string => date.toDateString();

/**
 * Format month to storage key
 */
const getMonthKey = (date: Date): string =>
    `${date.getFullYear()}_${date.getMonth()}`;

/**
 * Safely parse and normalize meal data from storage
 */
const normalizeMeal = (meal: unknown, index: number): Meal => {
    if (!meal || typeof meal !== 'object') {
        return {
            id: createMealId(),
            timestamp: new Date().toISOString(),
            name: `Meal ${index + 1}`,
            calories: 0,
            protein: 0,
            carbs: 0,
            fats: 0,
        };
    }

    const record = meal as Record<string, unknown>;

    const ensureNumber = (value: unknown, fallback = 0): number => {
        if (typeof value === 'number' && Number.isFinite(value)) {
            return Math.max(0, value);
        }
        if (typeof value === 'string') {
            const parsed = Number(value);
            return Number.isFinite(parsed) ? Math.max(0, parsed) : fallback;
        }
        return fallback;
    };

    const timestamp = typeof record.timestamp === 'string' && record.timestamp.trim()
        ? record.timestamp
        : new Date().toISOString();

    const id = typeof record.id === 'string' && record.id.trim()
        ? record.id
        : `${timestamp}-${index}-${Math.random().toString(36).slice(2, 8)}`;

    return {
        id,
        timestamp,
        name: typeof record.name === 'string' && record.name.trim()
            ? record.name.trim()
            : `Meal ${index + 1}`,
        calories: ensureNumber(record.calories),
        protein: ensureNumber(record.protein),
        carbs: ensureNumber(record.carbs),
        fats: ensureNumber(record.fats),
        fiber: record.fiber !== undefined ? ensureNumber(record.fiber) : undefined,
        serving_size: typeof record.serving_size === 'string' ? record.serving_size : undefined,
        confidence: ['high', 'medium', 'low'].includes(record.confidence as string)
            ? (record.confidence as 'high' | 'medium' | 'low')
            : undefined,
        mealType: ['breakfast', 'lunch', 'dinner', 'snack'].includes(record.mealType as string)
            ? (record.mealType as 'breakfast' | 'lunch' | 'dinner' | 'snack')
            : undefined,
        imageUri: typeof record.imageUri === 'string' ? record.imageUri : undefined,
        notes: typeof record.notes === 'string' ? record.notes : undefined,
    };
};

/**
 * Normalize daily nutrition data from storage
 */
const normalizeDailyNutrition = (input: unknown): DailyNutrition => {
    if (!input || typeof input !== 'object') {
        return { ...initialDailyNutrition };
    }

    const record = input as Record<string, unknown>;
    const mealsRaw = Array.isArray(record.meals) ? record.meals : [];
    const meals = mealsRaw.map((meal, index) => normalizeMeal(meal, index));
    const totals = calculateMealTotals(meals);

    const ensureNumber = (value: unknown, fallback: number): number => {
        if (typeof value === 'number' && Number.isFinite(value)) {
            return Math.max(0, value);
        }
        return fallback;
    };

    return {
        calories: ensureNumber(record.calories, totals.calories),
        protein: ensureNumber(record.protein, totals.protein),
        carbs: ensureNumber(record.carbs, totals.carbs),
        fats: ensureNumber(record.fats, totals.fats),
        meals,
        waterIntake: ensureNumber(record.waterIntake, 0),
    };
};

/**
 * Hook for managing daily nutrition data
 */
export function useDailyNutrition(date: Date) {
    const [data, setData] = useState<DailyNutrition>(initialDailyNutrition);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        try {
            const key = `${STORAGE_KEYS.DAY_PREFIX}${getDateKey(date)}`;
            const stored = await AsyncStorage.getItem(key);

            if (stored) {
                const parsed = normalizeDailyNutrition(JSON.parse(stored));
                setData(parsed);
            } else {
                setData({ ...initialDailyNutrition });
            }
        } catch (error) {
            console.error('Error loading daily nutrition:', error);
            setData({ ...initialDailyNutrition });
        } finally {
            setLoading(false);
        }
    }, [date]);

    const save = useCallback(async (newData: DailyNutrition) => {
        try {
            const key = `${STORAGE_KEYS.DAY_PREFIX}${getDateKey(date)}`;
            await AsyncStorage.setItem(key, JSON.stringify(newData));
            setData(newData);
        } catch (error) {
            console.error('Error saving daily nutrition:', error);
        }
    }, [date]);

    const addMeal = useCallback(async (meal: Omit<Meal, 'id' | 'timestamp'>) => {
        const newMeal: Meal = {
            ...meal,
            id: createMealId(),
            timestamp: new Date().toISOString(),
        };

        const meals = [...data.meals, newMeal];
        const totals = calculateMealTotals(meals);
        const newData: DailyNutrition = {
            ...totals,
            meals,
            waterIntake: data.waterIntake,
        };

        await save(newData);
        return newMeal;
    }, [data, save]);

    const updateMeal = useCallback(async (mealId: string, updates: Partial<Meal>) => {
        const meals = data.meals.map(m =>
            m.id === mealId ? { ...m, ...updates } : m
        );
        const totals = calculateMealTotals(meals);
        const newData: DailyNutrition = {
            ...totals,
            meals,
            waterIntake: data.waterIntake,
        };

        await save(newData);
    }, [data, save]);

    const deleteMeal = useCallback(async (mealId: string) => {
        const meals = data.meals.filter(m => m.id !== mealId);
        const totals = calculateMealTotals(meals);
        const newData: DailyNutrition = {
            ...totals,
            meals,
            waterIntake: data.waterIntake,
        };

        await save(newData);
    }, [data, save]);

    const addWater = useCallback(async (ml: number) => {
        const newData: DailyNutrition = {
            ...data,
            waterIntake: (data.waterIntake || 0) + ml,
        };
        await save(newData);
    }, [data, save]);

    useEffect(() => {
        void load();
    }, [load]);

    return {
        data,
        loading,
        reload: load,
        addMeal,
        updateMeal,
        deleteMeal,
        addWater,
    };
}

/**
 * Hook for managing goals
 */
export function useGoals() {
    const [goals, setGoals] = useState<Goals>(defaultGoals);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        try {
            const stored = await AsyncStorage.getItem(STORAGE_KEYS.GOALS);
            if (stored) {
                setGoals({ ...defaultGoals, ...JSON.parse(stored) });
            }
        } catch (error) {
            console.error('Error loading goals:', error);
        } finally {
            setLoading(false);
        }
    }, []);

    const save = useCallback(async (newGoals: Goals) => {
        try {
            await AsyncStorage.setItem(STORAGE_KEYS.GOALS, JSON.stringify(newGoals));
            setGoals(newGoals);
        } catch (error) {
            console.error('Error saving goals:', error);
        }
    }, []);

    useEffect(() => {
        void load();
    }, [load]);

    return { goals, loading, saveGoals: save };
}

/**
 * Hook for week data
 */
export function useWeekData(endDate: Date) {
    const [weekData, setWeekData] = useState<DailyNutrition[]>([]);
    const [loading, setLoading] = useState(true);

    const load = useCallback(async () => {
        try {
            const days: DailyNutrition[] = [];

            for (let i = 6; i >= 0; i--) {
                const date = new Date(endDate);
                date.setDate(date.getDate() - i);
                const key = `${STORAGE_KEYS.DAY_PREFIX}${getDateKey(date)}`;
                const stored = await AsyncStorage.getItem(key);

                if (stored) {
                    days.push(normalizeDailyNutrition(JSON.parse(stored)));
                } else {
                    days.push({ ...initialDailyNutrition });
                }
            }

            setWeekData(days);
        } catch (error) {
            console.error('Error loading week data:', error);
        } finally {
            setLoading(false);
        }
    }, [endDate]);

    useEffect(() => {
        void load();
    }, [load]);

    return { weekData, loading, reload: load };
}

/**
 * Check/set onboarding status
 */
export async function isOnboardingComplete(): Promise<boolean> {
    try {
        const value = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING);
        return value === 'true';
    } catch {
        return false;
    }
}

export async function setOnboardingComplete(): Promise<void> {
    await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING, 'true');
}
