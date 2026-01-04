// Nutrition Tracker Type Definitions

export interface NutritionTotals {
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
}

export interface NutritionData extends NutritionTotals {
  name: string;
  serving_size?: string;
  fiber?: number;
  confidence?: 'high' | 'medium' | 'low';
  notes?: string;
}

export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';

export interface Meal extends NutritionData {
  id: string;
  timestamp: string;
  mealType?: MealType;
  imageUri?: string;
}

export interface DailyNutrition extends NutritionTotals {
  meals: Meal[];
  waterIntake?: number; // ml
}

export interface Goals extends NutritionTotals {
  waterGoal?: number; // ml
}

export interface WeekData {
  day: string;
  date: Date;
  calories: number;
  protein: number;
  carbs: number;
  fats: number;
  mealCount: number;
}

export type TabType = 'home' | 'weekly' | 'goals' | 'settings' | 'profile';

// AI Response Types
export interface AIFoodResult {
  type: 'food';
  data: NutritionData;
}

export interface AINotFoodResult {
  type: 'not_food';
  reason: string;
}

export interface AIErrorResult {
  type: 'error';
  message: string;
}

export type AIAnalysisResult = AIFoodResult | AINotFoodResult | AIErrorResult;

// Animation Types
export interface SpringConfig {
  damping: number;
  stiffness: number;
  mass?: number;
}

export interface GlassStyle {
  backgroundColor: string;
  borderColor: string;
  blurIntensity: number;
}
