// NutriTrack - Production-Ready App
// Liquid Glass Design with AI-Powered Food Analysis

import AsyncStorage from '@react-native-async-storage/async-storage';
import * as FileSystem from 'expo-file-system/legacy';
import { manipulateAsync, SaveFormat } from 'expo-image-manipulator';
import * as ImagePicker from 'expo-image-picker';
import { LinearGradient } from 'expo-linear-gradient';
import * as Sharing from 'expo-sharing';
import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Dimensions,
  Image,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StatusBar,
  StyleSheet,
  Text,
  TextInput,
  TouchableWithoutFeedback,
  View
} from 'react-native';
import { LineChart } from 'react-native-chart-kit';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import Animated, {
  FadeIn,
  FadeOut,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withSpring,
  withTiming
} from 'react-native-reanimated';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

// Local imports
import {
  AnimatedRing,
  EmptyState,
  EmptyStates,
  GlassButton,
  GlassCard,
  GlassModal,
  MealCard
} from '../src/components';
import { springs, stagger, timings } from '../src/constants/animations';
import { borderRadius, colors, spacing, typography } from '../src/constants/theme';
import { useHaptics } from '../src/hooks/useHaptics';
import { isOnboardingComplete, setOnboardingComplete, useDailyNutrition, useGoals, useWeekData } from '../src/hooks/useStorage';
import { analyzeFood, analyzeWeeklyProgress, getApiKey, getNotFoodMessage, isValidApiKeyFormat, saveApiKey, validateApiKey } from '../src/services/geminiService';
import type { AIAnalysisResult, Meal, MealType, NutritionData, TabType } from '../src/types/nutrition';

import { Ionicons, MaterialCommunityIcons } from '@expo/vector-icons';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// Tab bar calculations
const TAB_BAR_HORIZONTAL_PADDING = spacing.xl * 2;
const TAB_BAR_INNER_PADDING = spacing.xs * 2;
const TAB_BAR_USABLE_WIDTH = SCREEN_WIDTH - TAB_BAR_HORIZONTAL_PADDING - TAB_BAR_INNER_PADDING;
const SINGLE_TAB_WIDTH = TAB_BAR_USABLE_WIDTH / 4;

// ============================================================================
// HELPER FUNCTIONS
// ============================================================================

const calculateBMR = (weight: number, height: number, age: number, gender: string) => {
  // Mifflin-St Jeor Equation
  if (!weight || !height || !age) return 0;
  if (gender === 'male') {
    return (10 * weight) + (6.25 * height) - (5 * age) + 5;
  } else {
    return (10 * weight) + (6.25 * height) - (5 * age) - 161;
  }
};

const calculateTDEE = (bmr: number, activityLevel: string) => {
  const multipliers: Record<string, number> = {
    sedentary: 1.2,
    light: 1.375,
    moderate: 1.55,
    active: 1.725,
    very_active: 1.9,
  };
  return bmr * (multipliers[activityLevel] || 1.2);
};

const calculateTargetCalories = (tdee: number, fitnessGoal: string) => {
  const goalModifiers: Record<string, number> = {
    lose: 0.8,     // 20% deficit
    maintain: 1.0,
    gain: 1.15,    // 15% surplus
  };
  return Math.round(tdee * (goalModifiers[fitnessGoal] || 1.0));
};

const calculateMacros = (calories: number) => {
  // Balanced Split: 40% Carbs, 30% Protein, 30% Fats
  return {
    calories,
    protein: Math.round((calories * 0.3) / 4),
    carbs: Math.round((calories * 0.4) / 4),
    fats: Math.round((calories * 0.3) / 9),
  };
};

// ============================================================================
// PRIVACY MODAL
// ============================================================================

function PrivacyModal({ visible, onClose }: { visible: boolean; onClose: () => void }) {
  return (
    <GlassModal
      visible={visible}
      onClose={onClose}
      title="Privacy Policy"
    >
      <ScrollView
        style={{ maxHeight: SCREEN_HEIGHT * 0.6 }}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: spacing.xl }}
      >
        <Text style={[styles.modalText, { marginBottom: spacing.lg, fontSize: typography.sizes.body, lineHeight: 24 }]}>
          Your privacy is our priority. NutriTrack operates with a strict "Local-First" policy.
        </Text>

        <View style={{ marginBottom: spacing.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs }}>
            <MaterialCommunityIcons name="database-lock" size={20} color={colors.primary.end} style={{ marginRight: spacing.sm }} />
            <Text style={styles.inputLabel}>Local Storage</Text>
          </View>
          <Text style={[styles.modalText, { color: colors.text.secondary }]}>
            All your meal logs, goals, and personal profile data are stored 100% locally on your device. We do not operate a backend server, and we never access, sell, or share your personal data.
          </Text>
        </View>

        <View style={{ marginBottom: spacing.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs }}>
            <MaterialCommunityIcons name="robot" size={20} color={colors.primary.end} style={{ marginRight: spacing.sm }} />
            <Text style={styles.inputLabel}>AI Analysis</Text>
          </View>
          <Text style={[styles.modalText, { color: colors.text.secondary }]}>
            When you analyze a meal, the image is sent directly to Google's Gemini API using your own API key. The image is processed for nutrition data and then discarded.
          </Text>
        </View>

        <View style={{ marginBottom: spacing.lg }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs }}>
            <MaterialCommunityIcons name="shield-check" size={20} color={colors.primary.end} style={{ marginRight: spacing.sm }} />
            <Text style={styles.inputLabel}>API Keys</Text>
          </View>
          <Text style={[styles.modalText, { color: colors.text.secondary }]}>
            Your Gemini API key is stored securely on your device. It is only used to authenticate your requests to Google's servers.
          </Text>
        </View>

        <View style={{ marginBottom: spacing.sm }}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.xs }}>
            <MaterialCommunityIcons name="email-check" size={20} color={colors.primary.end} style={{ marginRight: spacing.sm }} />
            <Text style={styles.inputLabel}>Contact & Feedback</Text>
          </View>
          <Text style={[styles.modalText, { color: colors.text.secondary }]}>
            For any privacy concerns or feedback, please contact the developer directly at anirudhgirish08@gmail.com.
          </Text>
        </View>

        <View style={{ marginTop: spacing.xl, alignItems: 'center', padding: spacing.md, backgroundColor: colors.glass.backgroundLight, borderRadius: borderRadius.md }}>
          <Text style={[styles.hydrationSubtitle, { fontSize: 12 }]}>Last Updated: January 2026</Text>
        </View>
      </ScrollView>

      <View style={{ marginTop: spacing.md }}>
        <GlassButton onPress={onClose} fullWidth>
          Close
        </GlassButton>
      </View>
    </GlassModal>
  );
}

// ============================================================================
// ONBOARDING SCREEN
// ============================================================================

function OnboardingScreen({ onComplete, onInfoUpdate }: { onComplete: () => void; onInfoUpdate: (info: any) => void }) {
  const insets = useSafeAreaInsets();
  const haptic = useHaptics();
  const [step, setStep] = useState(0);
  const [apiKey, setApiKey] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState('');

  const steps = [
    { icon: '🎉', title: 'Welcome to NutriTrack', message: 'Your AI-powered nutrition companion that helps you track meals and reach your health goals.' },
    { icon: '👋', title: 'What\'s your name?', message: 'Let\'s personalize your experience.' },
    { icon: '📸', title: 'Snap & Track', message: 'Take a photo of your food and our AI will instantly analyze the nutritional content.' },
    { icon: '📊', title: 'Monitor Progress', message: 'Track daily intake, view weekly trends, and stay on top of your nutrition goals.' },
    { icon: '🔑', title: 'Setup API Key', message: 'Get your free Gemini API key to enable AI food analysis.' },
  ];

  const handleNext = () => {
    if (step === 1 && !name.trim()) {
      haptic.error();
      return;
    }
    if (step === 1) {
      onInfoUpdate({ name });
    }
    haptic.selection();
    setStep(s => s + 1);
  };

  const handleBack = () => {
    haptic.light();
    setStep(s => s - 1);
  };

  const handleComplete = async () => {
    if (!apiKey.trim()) {
      setError('Please enter your API key');
      return;
    }

    if (!isValidApiKeyFormat(apiKey)) {
      setError('Invalid API key format. Should start with "AIza"');
      return;
    }

    setLoading(true);
    setError('');

    const validation = await validateApiKey(apiKey);

    if (!validation.valid) {
      setError(validation.error || 'Invalid API key');
      setLoading(false);
      return;
    }

    const saved = await saveApiKey(apiKey);
    if (!saved) {
      setError('Failed to save API key');
      setLoading(false);
      return;
    }

    await setOnboardingComplete();
    haptic.success();
    onComplete();
  };

  return (
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={0}
      >
        <View style={[styles.onboardingContainer, { paddingTop: insets.top + 40, paddingBottom: insets.bottom + 20 }]}>
          <StatusBar barStyle="light-content" />

          <LinearGradient
            colors={[colors.primary.start, colors.primary.end, colors.background.primary]}
            style={StyleSheet.absoluteFill}
          />

          <ScrollView
            contentContainerStyle={styles.onboardingScrollContent}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            <Animated.View
              key={step}
              entering={FadeIn.duration(300)}
              style={styles.onboardingContent}
            >
              <Text style={styles.onboardingIcon}>{steps[step].icon}</Text>
              <Text style={styles.onboardingTitle}>{steps[step].title}</Text>
              <Text style={styles.onboardingMessage}>{steps[step].message}</Text>
            </Animated.View>

            {step === 4 ? (
              <View style={styles.onboardingApiSection}>
                <Text style={styles.onboardingSubtext}>Get your free API key from:</Text>
                <Text style={styles.onboardingLink}>aistudio.google.com</Text>

                <View style={styles.onboardingInputContainer}>
                  <TextInput
                    style={[styles.onboardingInput, error && styles.inputError]}
                    placeholder="Paste your Gemini API key"
                    placeholderTextColor={colors.text.muted}
                    value={apiKey}
                    onChangeText={(text) => { setApiKey(text); setError(''); }}
                    autoCapitalize="none"
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={Keyboard.dismiss}
                  />
                  {error ? <Text style={styles.errorText}>{error}</Text> : null}
                </View>

                <GlassButton
                  onPress={handleComplete}
                  variant="secondary"
                  loading={loading}
                  fullWidth
                >
                  Get Started
                </GlassButton>

                <Pressable onPress={handleBack} style={styles.backButton}>
                  <Text style={styles.backButtonText}>Back</Text>
                </Pressable>
              </View>
            ) : step === 1 ? (
              <View style={styles.onboardingApiSection}>
                <View style={[styles.onboardingInputContainer, { marginTop: spacing['2xl'] }]}>
                  <TextInput
                    style={styles.onboardingInput}
                    placeholder="Your Name"
                    placeholderTextColor={colors.text.muted}
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                    autoCorrect={false}
                    returnKeyType="done"
                    onSubmitEditing={handleNext}
                    autoFocus
                  />
                </View>

                <GlassButton onPress={handleNext} variant="secondary" fullWidth style={{ marginTop: spacing.xl }}>
                  Next
                </GlassButton>

                <Pressable onPress={handleBack} style={styles.backButton}>
                  <Text style={styles.backButtonText}>Back</Text>
                </Pressable>
              </View>
            ) : (
              <View style={styles.onboardingFooter}>
                <View style={styles.dots}>
                  {steps.map((_, i) => (
                    <View
                      key={i}
                      style={[styles.dot, i === step && styles.dotActive]}
                    />
                  ))}
                </View>

                <GlassButton onPress={handleNext} variant="secondary" fullWidth>
                  Next
                </GlassButton>

                {step > 0 && (
                  <Pressable onPress={handleBack} style={styles.backButton}>
                    <Text style={styles.backButtonText}>Back</Text>
                  </Pressable>
                )}
              </View>
            )}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
  );
}

// ============================================================================
// SETTINGS SCREEN
// ============================================================================


// ============================================================================
// SETTINGS SCREEN
// ============================================================================

function SettingsScreen({
  onApiKeyUpdate,
  hapticsEnabled,
  setHapticsEnabled,
  onShowPrivacy,
  hydrationGoal
}: {
  onApiKeyUpdate: (key: string) => void;
  hapticsEnabled: boolean;
  setHapticsEnabled: (enabled: boolean) => void;
  onShowPrivacy: () => void;
  hydrationGoal: number;
}) {
  const [apiKey, setApiKey] = useState('');
  const [showKeyInput, setShowKeyInput] = useState(false);
  const haptic = useHaptics();

  // Trigger haptic only if enabled
  const triggerHaptic = (type: 'light' | 'success' | 'warning') => {
    if (hapticsEnabled) {
      if (type === 'light') haptic.light();
      if (type === 'success') haptic.success();
      if (type === 'warning') haptic.warning();
    }
  };

  const handleSaveKey = async () => {
    if (apiKey.trim()) {
      onApiKeyUpdate(apiKey.trim());
      setApiKey('');
      setShowKeyInput(false);
      triggerHaptic('success');
    }
  };

  return (
    <Animated.View exiting={FadeOut} entering={FadeIn.duration(300)} style={styles.settingsContainer}>
      {/* App Info Header */}
      <View style={styles.settingsHeader}>
        <Image
          source={require('../assets/images/icon.png')}
          style={{ width: 80, height: 80, borderRadius: 20, marginBottom: spacing.md }}
        />
        <Text style={styles.appName}>NutriTrack</Text>
        <Text style={styles.appVersion}>Version 1.0.0 • Premium</Text>
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 100 }}>

        {/* API Configuration */}
        <Text style={styles.settingsSectionHeader}>Configuration</Text>
        <GlassCard style={styles.apiCard}>
          <LinearGradient
            colors={['#4facfe', '#00f2fe']}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.apiGradient}
          />
          <View style={styles.apiContent}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <View>
                <Text style={styles.apiLabel}>GEMINI API KEY</Text>
                <Text style={styles.apiStatus}>● Connected</Text>
              </View>
              <MaterialCommunityIcons name="key" size={24} color="white" style={{ opacity: 0.8 }} />
            </View>
            <View style={{ marginTop: spacing.xl }}>
              <Text style={styles.apiDescription}>Powered by Google Gemini 1.5 Flash</Text>
              <GlassButton
                onPress={() => { setShowKeyInput(true); triggerHaptic('light'); }}
                style={{ marginTop: spacing.md, backgroundColor: 'rgba(255,255,255,0.2)', borderWidth: 0 }}
              >
                Update Key
              </GlassButton>
            </View>
          </View>
        </GlassCard>

        {/* Preferences */}
        <Text style={styles.settingsSectionHeader}>Preferences</Text>
        <GlassCard style={styles.settingsCard}>
          <View style={styles.settingRow}>
            <View style={styles.settingIconBox}>
              <MaterialCommunityIcons name="fingerprint" size={20} color={colors.text.primary} />
            </View>
            <View style={[styles.settingInfo, { flex: 1 }]}>
              <Text style={styles.settingLabel}>Haptic Feedback</Text>
              <Text style={styles.settingDesc}>Always on for better experience</Text>
            </View>
            <MaterialCommunityIcons name="lock" size={16} color={colors.text.tertiary} />
          </View>

          <View style={[styles.settingRow, { borderBottomWidth: 0 }]}>
            <View style={styles.settingIconBox}>
              <MaterialCommunityIcons name="ruler" size={20} color={colors.text.primary} />
            </View>
            <View style={[styles.settingInfo, { flex: 1 }]}>
              <Text style={styles.settingLabel}>Units</Text>
              <Text style={styles.settingDesc}>Metric (kg, cm, ml)</Text>
            </View>
            <MaterialCommunityIcons name="lock" size={16} color={colors.text.tertiary} />
          </View>
        </GlassCard>

        {/* Support */}
        <Text style={styles.settingsSectionHeader}>Support</Text>
        <GlassCard style={styles.settingsCard}>
          <Pressable
            style={styles.settingRow}
            onPress={() => {
              triggerHaptic('light');
              onShowPrivacy();
            }}
          >
            <View style={styles.settingIconBox}>
              <MaterialCommunityIcons name="shield-check" size={20} color={colors.text.primary} />
            </View>
            <Text style={[styles.settingLabel, { flex: 1 }]}>Privacy Policy</Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color={colors.text.tertiary} />
          </Pressable>

          <Pressable
            style={styles.settingRow}
            onPress={() => {
              triggerHaptic('light');
              Linking.openURL('mailto:anirudhgirish08@gmail.com?subject=NutriTrack Feedback');
            }}
          >
            <View style={styles.settingIconBox}>
              <MaterialCommunityIcons name="email" size={20} color={colors.text.primary} />
            </View>
            <Text style={[styles.settingLabel, { flex: 1 }]}>Send Feedback</Text>
            <MaterialCommunityIcons name="open-in-new" size={20} color={colors.text.tertiary} />
          </Pressable>

          <Pressable
            style={[styles.settingRow, { borderBottomWidth: 0 }]}
            onPress={() => {
              triggerHaptic('light');
              Alert.alert('Coming Soon', 'App Store rating will be available soon! ⭐');
            }}
          >
            <View style={styles.settingIconBox}>
              <MaterialCommunityIcons name="star" size={20} color={colors.text.primary} />
            </View>
            <Text style={[styles.settingLabel, { flex: 1 }]}>Rate the App</Text>
            <MaterialCommunityIcons name="chevron-right" size={20} color={colors.text.tertiary} />
          </Pressable>
        </GlassCard>

        {/* About */}
        <Text style={styles.settingsSectionHeader}>About</Text>
        <GlassCard style={styles.settingsCard}>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>Developed By</Text>
            <Text style={styles.aboutValue}>Anirudh Girish</Text>
          </View>
          <View style={styles.aboutRow}>
            <Text style={styles.aboutLabel}>Data Storage</Text>
            <Text style={styles.aboutValue}>100% Local</Text>
          </View>
          <View style={[styles.aboutRow, { borderBottomWidth: 0 }]}>
            <Text style={styles.aboutLabel}>Privacy</Text>
            <Text style={styles.aboutValue}>🔒 Private</Text>
          </View>
        </GlassCard>

        {/* Data Management */}
        <Pressable
          style={styles.dangerButton}
          onPress={() => {
            triggerHaptic('warning');
            Alert.alert('Clear All Data?', 'This action cannot be undone.', [
              { text: 'Cancel', style: 'cancel' },
              {
                text: 'Clear', style: 'destructive', onPress: () => {
                  AsyncStorage.clear();
                  triggerHaptic('success');
                }
              }
            ]);
          }}
        >
          <MaterialCommunityIcons name="trash-can-outline" size={20} color="#FF6B6B" style={{ marginRight: spacing.sm }} />
          <Text style={styles.dangerText}>Reset App Data</Text>
        </Pressable>

        <View style={styles.copyrightContainer}>
          <Text style={styles.copyrightText}>© 2026 NutriTrack. All rights reserved.</Text>
          <Text style={styles.copyrightText}>Made with 💜 by Anirudh Girish</Text>
        </View>

      </ScrollView>

      {/* API Key Modal */}
      <GlassModal
        visible={showKeyInput}
        onClose={() => setShowKeyInput(false)}
        title="Update API Key"
      >
        <TextInput
          style={styles.modalInput}
          value={apiKey}
          onChangeText={setApiKey}
          placeholder="Paste your Gemini API key"
          placeholderTextColor={colors.text.muted}
          secureTextEntry
        />
        <GlassButton onPress={handleSaveKey} fullWidth>
          Save Key
        </GlassButton>
      </GlassModal>
    </Animated.View>
  );
}

// ============================================================================
// PROFILE SCREEN
// ============================================================================

function ProfileScreen({
  profile,
  onSave,
}: {
  profile: any,
  onSave: (newProfile: any) => void
}) {
  const [editing, setEditing] = useState(false);
  const [localProfile, setLocalProfile] = useState(profile);
  const haptic = useHaptics();

  // Calculate live stats
  const bmr = calculateBMR(profile.weight, profile.height, profile.age, profile.gender);
  const tdee = calculateTDEE(bmr, profile.activityLevel || 'sedentary');

  // Sync when not editing
  useEffect(() => {
    if (!editing) setLocalProfile(profile);
  }, [profile, editing]);

  const handleSave = () => {
    onSave(localProfile);
    setEditing(false);
    haptic.success();
  };

  const renderInputRow = (label: string, key: string, numeric = false, unit = '') => (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={[styles.inputLabel, { marginBottom: 4 }]}>{label}</Text>
      {editing ? (
        <TextInput
          style={styles.modalInput}
          value={localProfile[key]?.toString()}
          onChangeText={(text) => setLocalProfile({ ...localProfile, [key]: numeric ? (parseFloat(text) || 0) : text })}
          keyboardType={numeric ? 'numeric' : 'default'}
          placeholder={label}
          placeholderTextColor={colors.text.muted}
        />
      ) : (
        <View style={{ padding: spacing.md, backgroundColor: colors.glass.backgroundLight, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.glass.border }}>
          <Text style={{ fontSize: typography.sizes.body, color: colors.text.primary, fontWeight: '500' }}>
            {localProfile[key]} {unit}
          </Text>
        </View>
      )}
    </View>
  );

  const renderSelectRow = (label: string, key: string, options: { label: string, value: string }[]) => (
    <View style={{ marginBottom: spacing.md }}>
      <Text style={[styles.inputLabel, { marginBottom: spacing.sm }]}>{label}</Text>
      {editing ? (
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          {options.map(opt => (
            <Pressable
              key={opt.value}
              onPress={() => { haptic.selection(); setLocalProfile({ ...localProfile, [key]: opt.value }); }}
              style={[
                styles.chip,
                localProfile[key] === opt.value && styles.chipActive
              ]}
            >
              <Text style={[styles.chipText, localProfile[key] === opt.value && styles.chipTextActive]}>
                {opt.label}
              </Text>
            </Pressable>
          ))}
        </View>
      ) : (
        <View style={{ padding: spacing.md, backgroundColor: colors.glass.backgroundLight, borderRadius: borderRadius.md, borderWidth: 1, borderColor: colors.glass.border }}>
          <Text style={{ fontSize: typography.sizes.body, color: colors.text.primary, fontWeight: '500' }}>
            {options.find(o => o.value === localProfile[key])?.label || localProfile[key]}
          </Text>
        </View>
      )}
    </View>
  );

  return (
    <Animated.View entering={FadeIn.duration(300)} style={styles.settingsContainer}>
      {/* Profile Header */}
      <GlassCard style={{ marginBottom: spacing.lg, alignItems: 'center', padding: spacing.xl }}>
        <View style={{
          width: 100, height: 100,
          borderRadius: 50,
          backgroundColor: colors.primary.surface,
          alignItems: 'center', justifyContent: 'center',
          marginBottom: spacing.md,
          borderWidth: 2, borderColor: colors.primary.solid
        }}>
          <Text style={{ fontSize: 40, fontWeight: 'bold', color: colors.primary.solid }}>
            {profile.name ? profile.name.charAt(0).toUpperCase() : '👤'}
          </Text>
        </View>
        <Text style={{ fontSize: typography.sizes.title2, fontWeight: 'bold', color: colors.text.primary, marginBottom: 4 }}>
          {profile.name || 'User'}
        </Text>
        <View style={{ flexDirection: 'row', alignItems: 'center' }}>
          <Ionicons name="ribbon" size={16} color={colors.text.tertiary} style={{ marginRight: 4 }} />
          <Text style={{ fontSize: typography.sizes.caption, color: colors.text.tertiary }}>
            Member since 2026
          </Text>
        </View>
      </GlassCard>

      {/* Key Stats Summary */}
      {!editing && (
        <View style={{ flexDirection: 'row', gap: spacing.md, marginBottom: spacing.lg }}>
          <GlassCard style={{ flex: 1, padding: spacing.md, alignItems: 'center' }}>
            <Text style={{ fontSize: 12, color: colors.text.tertiary, textTransform: 'uppercase' }}>BMR</Text>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text.primary, marginTop: 4 }}>
              {Math.round(bmr)}
            </Text>
            <Text style={{ fontSize: 10, color: colors.text.secondary }}>kcal/day</Text>
          </GlassCard>
          <GlassCard style={{ flex: 1, padding: spacing.md, alignItems: 'center' }}>
            <Text style={{ fontSize: 12, color: colors.text.tertiary, textTransform: 'uppercase' }}>TDEE</Text>
            <Text style={{ fontSize: 18, fontWeight: 'bold', color: colors.text.primary, marginTop: 4 }}>
              {Math.round(tdee)}
            </Text>
            <Text style={{ fontSize: 10, color: colors.text.secondary }}>kcal/day</Text>
          </GlassCard>
        </View>
      )}

      <GlassCard style={styles.settingsCard}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: spacing.lg, borderBottomWidth: 1, borderBottomColor: colors.glass.border }}>
          <Text style={styles.cardTitle}>Personal Details</Text>
          <Pressable onPress={() => { haptic.selection(); editing ? handleSave() : setEditing(true); }}>
            <View style={{ backgroundColor: editing ? colors.primary.solid : colors.glass.backgroundLight, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 12 }}>
              <Text style={{ color: editing ? 'white' : colors.primary.solid, fontWeight: 'bold', fontSize: 12 }}>
                {editing ? 'Done' : 'Edit Profile'}
              </Text>
            </View>
          </Pressable>
        </View>

        <View style={{ padding: spacing.lg }}>
          {renderInputRow('Name', 'name')}
          {renderSelectRow('Gender', 'gender', [{ label: 'Male', value: 'male' }, { label: 'Female', value: 'female' }])}
          <View style={{ flexDirection: 'row', gap: spacing.md }}>
            <View style={{ flex: 1 }}>{renderInputRow('Age', 'age', true, 'years')}</View>
            <View style={{ flex: 1 }}>{renderInputRow('Height', 'height', true, 'cm')}</View>
            <View style={{ flex: 1 }}>{renderInputRow('Weight', 'weight', true, 'kg')}</View>
          </View>
          {renderSelectRow('Activity Level', 'activityLevel', [
            { label: 'Sedentary', value: 'sedentary' },
            { label: 'Light', value: 'light' },
            { label: 'Moderate', value: 'moderate' },
            { label: 'Active', value: 'active' },
            { label: 'Very Active', value: 'very_active' }
          ])}
          {renderSelectRow('Fitness Goal', 'fitnessGoal', [
            { label: 'Lose Weight', value: 'lose' },
            { label: 'Maintain', value: 'maintain' },
            { label: 'Gain Muscle', value: 'gain' }
          ])}
          {renderSelectRow('Diet Preference', 'dietType', [
            { label: 'Veg', value: 'veg' },
            { label: 'Non-Veg', value: 'nonveg' },
            { label: 'Vegan', value: 'vegan' },
            { label: 'Eggetarian', value: 'eggetarian' }
          ])}
        </View>
      </GlassCard>

      {editing && (
        <GlassButton onPress={handleSave} fullWidth style={{ marginTop: spacing.lg }}>
          Save & Update Goals
        </GlassButton>
      )}

      <View style={{ height: 100 }} />
    </Animated.View>
  );
}

// ============================================================================
// MAIN APP
// ============================================================================

export default function App() {
  const insets = useSafeAreaInsets();
  const haptic = useHaptics();

  // App state
  const [isReady, setIsReady] = useState(false);
  const [needsOnboarding, setNeedsOnboarding] = useState(false);
  const [activeTab, setActiveTab] = useState<TabType>('home');
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [hasApiKey, setHasApiKey] = useState(false);

  // Analysis state
  const [image, setImage] = useState<ImagePicker.ImagePickerAsset | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  // Modal state
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [goalsModalVisible, setGoalsModalVisible] = useState(false);
  const [selectedMeal, setSelectedMeal] = useState<Meal | null>(null);
  const [editedMeal, setEditedMeal] = useState<Partial<NutritionData>>({});

  // New feature state
  const [waterIntake, setWaterIntake] = useState(0);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualMeal, setManualMeal] = useState<Partial<NutritionData>>({
    name: '',
    calories: 0,
    protein: 0,
    carbs: 0,
    fats: 0,
  });

  // AI Goal Assistant state
  const [hydrationGoal, setHydrationGoal] = useState(2500); // ml
  const [customHydration, setCustomHydration] = useState('');
  const [showAssistant, setShowAssistant] = useState(false);
  const [assistantStep, setAssistantStep] = useState(0);
  const [hapticsEnabled, setHapticsEnabled] = useState(true);
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [userProfile, setUserProfile] = useState({
    name: '',
    gender: '' as 'male' | 'female' | '',
    age: 0,
    height: 0, // cm
    weight: 0, // kg
    activityLevel: '' as 'sedentary' | 'light' | 'moderate' | 'active' | 'very_active' | '',
    dietType: '' as 'veg' | 'nonveg' | 'vegan' | 'eggetarian' | '',
    fitnessGoal: '' as 'lose' | 'maintain' | 'gain' | '',
  });

  // Data hooks
  const { data: todayData, loading: dataLoading, reload: reloadData, addMeal, updateMeal, deleteMeal } = useDailyNutrition(selectedDate);
  const { goals, saveGoals } = useGoals();
  const { weekData, reload: reloadWeekData } = useWeekData(selectedDate);

  // Weekly Analysis State
  const [weeklyInsight, setWeeklyInsight] = useState('');
  const [analyzingWeekly, setAnalyzingWeekly] = useState(false);

  // Animations
  const tabIndicator = useSharedValue(0);
  const indicatorOpacity = useSharedValue(1);
  const contentOpacity = useSharedValue(0);
  const headerScale = useSharedValue(0.95);

  // Initialize app
  useEffect(() => {
    initializeApp();
  }, []);

  // Save User Profile
  useEffect(() => {
    if (isReady && userProfile) {
      AsyncStorage.setItem('@UserProfile', JSON.stringify(userProfile));
    }
  }, [userProfile, isReady]);

  const initializeApp = async () => {
    try {
      const [onboarding, apiKey, savedProfile] = await Promise.all([
        isOnboardingComplete(),
        getApiKey(),
        AsyncStorage.getItem('@UserProfile'),
      ]);

      if (savedProfile) {
        setUserProfile(JSON.parse(savedProfile));
      }

      setNeedsOnboarding(!onboarding || !apiKey);
      setHasApiKey(!!apiKey);
      setIsReady(true);

      // Animate in
      contentOpacity.value = withDelay(100, withTiming(1, { duration: timings.normal }));
      headerScale.value = withSpring(1, springs.gentle);
    } catch (error) {
      console.error('Init error:', error);
      setIsReady(true);
    }
  };

  const handleOnboardingComplete = async () => {
    const key = await getApiKey();
    setHasApiKey(!!key);
    setNeedsOnboarding(false);
  };

  const handleApiKeyUpdate = async (key?: string) => {
    if (key) {
      await saveApiKey(key);
    }
    const currentKey = await getApiKey();
    setHasApiKey(!!currentKey);
  };

  const switchTab = (tab: TabType | 'profile') => {
    haptic.selection();
    const tabIndex = ['home', 'weekly', 'goals', 'settings'].indexOf(tab as TabType);

    if (tabIndex !== -1) {
      tabIndicator.value = withSpring(tabIndex * SINGLE_TAB_WIDTH, springs.snappy);
      indicatorOpacity.value = withTiming(1, { duration: 200 });
    } else {
      indicatorOpacity.value = withTiming(0, { duration: 200 });
    }

    setActiveTab(tab);
  };

  const tabIndicatorStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: tabIndicator.value }],
    opacity: indicatorOpacity.value,
  }));

  // Date navigation
  const changeDate = (days: number) => {
    haptic.light();
    const newDate = new Date(selectedDate);
    newDate.setDate(newDate.getDate() + days);
    setSelectedDate(newDate);
  };

  const isToday = selectedDate.toDateString() === new Date().toDateString();

  // Get week days for calendar strip
  const getWeekDays = () => {
    const days: { date: Date; label: string }[] = [];
    const startOfWeek = new Date(selectedDate);
    const dayOfWeek = startOfWeek.getDay();
    startOfWeek.setDate(startOfWeek.getDate() - dayOfWeek);

    const dayLabels = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];
    for (let i = 0; i < 7; i++) {
      const day = new Date(startOfWeek);
      day.setDate(startOfWeek.getDate() + i);
      days.push({ date: day, label: dayLabels[i] });
    }
    return days;
  };

  // Image picking & analysis
  const pickImage = async (useCamera: boolean) => {
    if (!hasApiKey) {
      Alert.alert('API Key Required', 'Please configure your Gemini API key in Settings');
      return;
    }

    haptic.medium();

    const permission = useCamera
      ? await ImagePicker.requestCameraPermissionsAsync()
      : await ImagePicker.requestMediaLibraryPermissionsAsync();

    if (!permission.granted) {
      Alert.alert('Permission Required', `Please grant ${useCamera ? 'camera' : 'photo library'} access`);
      return;
    }

    const result = useCamera
      ? await ImagePicker.launchCameraAsync({ mediaTypes: 'images', quality: 0.7 })
      : await ImagePicker.launchImageLibraryAsync({ mediaTypes: 'images', quality: 0.7 });

    if (!result.canceled && result.assets?.length) {
      const asset = result.assets[0];

      // Compress image
      const compressed = await manipulateAsync(
        asset.uri,
        [{ resize: { width: 1024 } }],
        { compress: 0.7, format: SaveFormat.JPEG, base64: true }
      );

      if (!compressed.base64) {
        Alert.alert('Error', 'Unable to process image');
        return;
      }

      setImage({ ...asset, uri: compressed.uri });
      await analyzeFoodImage(compressed.base64);
    }
  };

  const analyzeFoodImage = async (base64: string) => {
    setAnalyzing(true);
    Keyboard.dismiss();

    try {
      const result: AIAnalysisResult = await analyzeFood(base64);

      if (result.type === 'error') {
        Alert.alert('Analysis Error', result.message);
        setImage(null);
        return;
      }

      if (result.type === 'not_food') {
        const message = getNotFoodMessage(result.reason);
        Alert.alert('Not Food', message, [
          { text: 'Try Again', onPress: () => pickImage(true) },
          { text: 'Cancel', style: 'cancel' },
        ]);
        setImage(null);
        return;
      }

      // Success - add to tracker
      const meal = await addMeal({
        ...result.data,
        mealType: suggestMealType(),
      });

      await reloadWeekData();
      haptic.success();
      Alert.alert('Added!', `${result.data.name} has been logged.`);
      setImage(null);

    } catch (error) {
      console.error('Analysis error:', error);
      Alert.alert('Error', 'Failed to analyze food. Please try again.');
    } finally {
      setAnalyzing(false);
    }
  };

  const suggestMealType = (): MealType => {
    const hour = new Date().getHours();
    if (hour >= 5 && hour < 11) return 'breakfast';
    if (hour >= 11 && hour < 15) return 'lunch';
    if (hour >= 17 && hour < 22) return 'dinner';
    return 'snack';
  };

  // Meal actions
  const handleEditMeal = (meal: Meal) => {
    setSelectedMeal(meal);
    setEditedMeal({
      name: meal.name,
      calories: meal.calories,
      protein: meal.protein,
      carbs: meal.carbs,
      fats: meal.fats,
    });
    setEditModalVisible(true);
  };

  const handleDeleteMeal = (meal: Meal) => {
    Alert.alert('Delete Meal', `Remove ${meal.name}?`, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: async () => {
          await deleteMeal(meal.id);
          await reloadWeekData();
          haptic.success();
        },
      },
    ]);
  };

  const saveEditedMealHandler = async () => {
    if (!selectedMeal || !editedMeal.name?.trim()) {
      Alert.alert('Error', 'Meal name is required');
      return;
    }

    await updateMeal(selectedMeal.id, {
      name: editedMeal.name.trim(),
      calories: editedMeal.calories ?? selectedMeal.calories,
      protein: editedMeal.protein ?? selectedMeal.protein,
      carbs: editedMeal.carbs ?? selectedMeal.carbs,
      fats: editedMeal.fats ?? selectedMeal.fats,
    });

    await reloadWeekData();
    haptic.success();
    setEditModalVisible(false);
  };

  const handleAddManualMeal = async () => {
    if (!manualMeal.name?.trim()) {
      Alert.alert('Error', 'Please enter a meal name');
      return;
    }

    const now = new Date();
    const hour = now.getHours();
    let mealType: MealType = 'snack';
    if (hour >= 5 && hour < 11) mealType = 'breakfast';
    else if (hour >= 11 && hour < 15) mealType = 'lunch';
    else if (hour >= 17 && hour < 22) mealType = 'dinner';

    const newMeal: Omit<Meal, 'id'> = {
      name: manualMeal.name.trim(),
      calories: manualMeal.calories || 0,
      protein: manualMeal.protein || 0,
      carbs: manualMeal.carbs || 0,
      fats: manualMeal.fats || 0,
      mealType,
      timestamp: now.toISOString(),
      confidence: 'high',
    };

    await addMeal(newMeal as Meal);
    await reloadWeekData();
    haptic.success();
    setShowManualEntry(false);
    setManualMeal({ name: '', calories: 0, protein: 0, carbs: 0, fats: 0 });
  };

  // Refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await reloadData();
    haptic.light();
    setRefreshing(false);
  };

  // Weekly Analysis Handler
  const handleWeeklyAnalysis = async () => {
    setAnalyzingWeekly(true);
    try {
      if (weekData.length === 0) {
        Alert.alert('No Data', 'Not enough data for this week to analyze.');
        return;
      }
      const insight = await analyzeWeeklyProgress(weekData, userProfile);
      setWeeklyInsight(insight);
      haptic.success();
    } catch (e) {
      Alert.alert('Error', 'Failed to generate weekly insight.');
    } finally {
      setAnalyzingWeekly(false);
    }
  };

  // AI Goal Calculator (Mifflin-St Jeor equation)
  const calculateGoalsFromProfile = () => {
    const { gender, age, height, weight, activityLevel, fitnessGoal } = userProfile;

    if (!gender || !age || !height || !weight || !activityLevel || !fitnessGoal) {
      return null;
    }

    // BMR calculation (Mifflin-St Jeor)
    let bmr: number;
    if (gender === 'male') {
      bmr = 10 * weight + 6.25 * height - 5 * age + 5;
    } else {
      bmr = 10 * weight + 6.25 * height - 5 * age - 161;
    }

    // Activity multiplier
    const activityMultipliers = {
      sedentary: 1.2,
      light: 1.375,
      moderate: 1.55,
      active: 1.725,
      very_active: 1.9,
    };
    const tdee = bmr * (activityMultipliers[activityLevel] || 1.55);

    // Goal modifier
    const goalModifiers = {
      lose: 0.8, // 20% deficit
      maintain: 1.0,
      gain: 1.15, // 15% surplus
    };
    const targetCalories = Math.round(tdee * (goalModifiers[fitnessGoal] || 1.0));

    // Macro calculation
    const proteinPerKg = fitnessGoal === 'gain' ? 2.2 : fitnessGoal === 'lose' ? 2.0 : 1.6;
    const protein = Math.round(weight * proteinPerKg);
    const fatPercentage = 0.25;
    const fats = Math.round((targetCalories * fatPercentage) / 9);
    const carbCalories = targetCalories - (protein * 4) - (fats * 9);
    const carbs = Math.round(carbCalories / 4);

    // Hydration (30-35ml per kg)
    const hydration = Math.round(weight * 33);

    return {
      calories: targetCalories,
      protein,
      carbs: Math.max(carbs, 50), // Minimum 50g carbs
      fats,
      hydration,
    };
  };

  const applyCalculatedGoals = () => {
    const calculated = calculateGoalsFromProfile();
    if (calculated) {
      saveGoals({
        calories: calculated.calories,
        protein: calculated.protein,
        carbs: calculated.carbs,
        fats: calculated.fats,
      });
      setHydrationGoal(calculated.hydration);
      setShowAssistant(false);
      setAssistantStep(0);
      haptic.success();
      Alert.alert('Goals Updated!', `Your personalized goals have been set based on your profile.`);
    }
  };

  // Progress calculation
  const getProgress = (current: number, goal: number) =>
    Math.min((current / goal) * 100, 100);

  // Export
  const exportData = async () => {
    haptic.medium();
    try {
      const exportObj = {
        date: selectedDate.toISOString(),
        today: todayData,
        goals,
        exportedAt: new Date().toISOString(),
      };

      const jsonString = JSON.stringify(exportObj, null, 2);
      const fileUri = `${FileSystem.documentDirectory}nutritrack_${Date.now()}.json`;

      await FileSystem.writeAsStringAsync(fileUri, jsonString);

      if (await Sharing.isAvailableAsync()) {
        await Sharing.shareAsync(fileUri);
        haptic.success();
      } else {
        Alert.alert('Saved', `Data saved to ${fileUri}`);
      }
    } catch (error) {
      console.error('Export error:', error);
      Alert.alert('Error', 'Failed to export data');
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 5) return 'Good Night';
    if (hour < 12) return 'Good Morning';
    if (hour < 17) return 'Good Afternoon';
    if (hour < 21) return 'Good Evening';
    return 'Good Night';
  };

  // Loading state
  if (!isReady) {
    return (
      <View style={styles.loadingContainer}>
        <StatusBar barStyle="light-content" />
        <LinearGradient
          colors={[colors.primary.start, colors.background.primary]}
          style={StyleSheet.absoluteFill}
        />
        <ActivityIndicator size="large" color={colors.text.primary} />
      </View>
    );
  }

  // Onboarding
  if (needsOnboarding) {
    return (
      <OnboardingScreen
        onComplete={handleOnboardingComplete}
        onInfoUpdate={(info) => setUserProfile({ ...userProfile, ...info })}
      />
    );
  }

  // Main app
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <View style={styles.container}>
        <StatusBar barStyle="light-content" />

        {/* Background gradient */}
        <LinearGradient
          colors={[colors.primary.start, colors.primary.end, colors.background.primary]}
          locations={[0, 0.3, 0.5]}
          style={StyleSheet.absoluteFill}
        />

        {/* Header */}
        <View style={[styles.header, { paddingTop: insets.top + spacing.lg, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
          <View>
            <Text style={[styles.headerSubtitle, { color: colors.text.tertiary, marginBottom: 4 }]}>
              {new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' }).toUpperCase()}
            </Text>
            <Text style={styles.headerTitle}>
              {getGreeting()},{userProfile.name ? `\n${userProfile.name}` : ''}
            </Text>
          </View>
          <Pressable
            onPress={() => switchTab('profile')}
            style={{
              width: 44, height: 44,
              borderRadius: 22,
              backgroundColor: 'rgba(255,255,255,0.15)',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.2)'
            }}
          >
            <Text style={{ fontSize: 18, fontWeight: '600', color: colors.text.primary }}>
              {userProfile.name ? userProfile.name.charAt(0).toUpperCase() : '👤'}
            </Text>
          </Pressable>
        </View>

        {/* Tab Bar */}
        <View style={styles.tabBar}>
          <View style={styles.tabBarInner}>
            <Animated.View style={[styles.tabIndicator, tabIndicatorStyle]} />
            {(['home', 'weekly', 'goals', 'settings'] as TabType[]).map((tab) => (
              <Pressable
                key={tab}
                style={styles.tab}
                onPress={() => switchTab(tab)}
              >
                <Text style={[
                  styles.tabText,
                  activeTab === tab && styles.tabTextActive,
                ]}>
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        {/* Content */}
        <ScrollView
          style={styles.content}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={colors.text.primary}
            />
          }
        >
          {/* HOME TAB - Premium Redesign */}
          {activeTab === 'home' && (
            <Animated.View entering={FadeIn.duration(300)}>
              {/* Quick Actions (Moved to Top) */}
              <View style={styles.quickActionsContainer}>
                <Pressable onPress={() => pickImage(true)} style={[styles.quickActionBtn, { backgroundColor: colors.primary.surface }]}>
                  <Ionicons name="camera" size={24} color={colors.primary.solid} />
                  <Text style={styles.quickActionLabel}>Camera</Text>
                </Pressable>
                <Pressable onPress={() => pickImage(false)} style={[styles.quickActionBtn, { backgroundColor: colors.accent.surface }]}>
                  <Ionicons name="images" size={24} color={colors.accent.solid} />
                  <Text style={styles.quickActionLabel}>Gallery</Text>
                </Pressable>
                <Pressable onPress={() => setShowManualEntry(true)} style={[styles.quickActionBtn, { backgroundColor: colors.secondary.surface }]}>
                  <Ionicons name="create" size={24} color={colors.secondary.solid} />
                  <Text style={styles.quickActionLabel}>Manual</Text>
                </Pressable>
              </View>

              {/* Analyzing Indicator (Moved here) */}
              {analyzing && (
                <GlassCard style={{ marginBottom: spacing.lg, padding: spacing.lg, alignItems: 'center' }}>
                  <ActivityIndicator color={colors.primary.solid} size="large" />
                  <Text style={{ marginTop: spacing.md, color: colors.text.secondary }}>Analyzing your food...</Text>
                </GlassCard>
              )}

              {/* Progress Rings - 2x2 Premium Grid */}
              <GlassCard style={{ padding: spacing.xl, alignItems: 'center', marginBottom: spacing.lg }}>
                {/* Main Hero Ring (Centered) */}
                <View style={{ alignItems: 'center', marginBottom: spacing.xl }}>
                  <AnimatedRing
                    size={220}
                    strokeWidth={20}
                    progress={getProgress(todayData.calories, goals.calories)}
                    color={colors.primary.solid}
                    gradientEnd={colors.primary.end}
                    label="Calories"
                    value={Math.round(todayData.calories)}
                    delay={0}
                  />
                  <View style={{ marginTop: -40, alignItems: 'center' }}>
                    <Text style={{ fontSize: 14, color: colors.text.tertiary, marginTop: 45 }}>
                      of {goals.calories} kcal
                    </Text>
                  </View>
                </View>

                {/* 2x2 Macro Grid */}
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: spacing.xl }}>
                  <View style={{ alignItems: 'center' }}>
                    <AnimatedRing
                      size={95}
                      strokeWidth={10}
                      progress={getProgress(todayData.protein, goals.protein)}
                      color={colors.protein}
                      gradientEnd="#7effd1"
                      label="Protein"
                      value={`${Math.round(todayData.protein)}g`}
                      delay={100}
                    />
                  </View>
                  <View style={{ alignItems: 'center' }}>
                    <AnimatedRing
                      size={95}
                      strokeWidth={10}
                      progress={getProgress(todayData.carbs, goals.carbs)}
                      color={colors.carbs}
                      gradientEnd="#fff09d"
                      label="Carbs"
                      value={`${Math.round(todayData.carbs)}g`}
                      delay={200}
                    />
                  </View>
                  <View style={{ alignItems: 'center' }}>
                    <AnimatedRing
                      size={95}
                      strokeWidth={10}
                      progress={getProgress(todayData.fats, goals.fats)}
                      color={colors.fats}
                      gradientEnd="#c3f9d8"
                      label="Fats"
                      value={`${Math.round(todayData.fats)}g`}
                      delay={300}
                    />
                  </View>
                  <View style={{ alignItems: 'center' }}>
                    <AnimatedRing
                      size={95}
                      strokeWidth={10}
                      progress={Math.min((waterIntake / hydrationGoal) * 100, 100)}
                      color="#4facfe"
                      gradientEnd="#00f2fe"
                      label="Water"
                      value={`${Math.round(waterIntake / 1000 * 10) / 10}L`}
                      delay={400}
                    />
                  </View>
                </View>
              </GlassCard>

              {/* Hydration Tracking */}
              <GlassCard style={styles.hydrationCard}>
                <View style={styles.hydrationHeader}>
                  <View style={styles.hydrationTitleRow}>
                    <View style={styles.hydrationIcon}>
                      <Ionicons name="water" size={20} color={colors.primary.solid} />
                    </View>
                    <View>
                      <Text style={styles.cardTitle}>Hydration</Text>
                      <Text style={styles.hydrationSubtitle}>
                        {waterIntake}ml / {hydrationGoal}ml
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.hydrationPercent}>
                    {Math.round((waterIntake / hydrationGoal) * 100)}%
                  </Text>
                </View>
                <View style={styles.hydrationBar}>
                  <Animated.View
                    style={[
                      styles.hydrationProgress,
                      { width: `${Math.min((waterIntake / hydrationGoal) * 100, 100)}%` }
                    ]}
                  />
                </View>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.xs }}>
                  <Pressable
                    style={{ alignItems: 'center', opacity: waterIntake > 0 ? 1 : 0.5 }}
                    onPress={() => {
                      haptic.light();
                      setWaterIntake(w => Math.max(0, w - 250));
                    }}
                    disabled={waterIntake === 0}
                  >
                    <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(255,100,100,0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
                      <Ionicons name="remove" size={24} color="#FF6B6B" />
                    </View>
                    <Text style={{ fontSize: 12, color: colors.text.secondary }}>Undo</Text>
                  </Pressable>

                  <Pressable
                    style={{ alignItems: 'center' }}
                    onPress={() => {
                      haptic.button();
                      setWaterIntake(w => w + 250);
                    }}
                  >
                    <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(100,200,255,0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
                      <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#4ECDC4' }}>250</Text>
                    </View>
                  </Pressable>

                  <Pressable
                    style={{ alignItems: 'center' }}
                    onPress={() => {
                      haptic.button();
                      setWaterIntake(w => w + 500);
                    }}
                  >
                    <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(100,200,255,0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
                      <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#4ECDC4' }}>500</Text>
                    </View>
                  </Pressable>

                  <Pressable
                    style={{ alignItems: 'center' }}
                    onPress={() => {
                      haptic.button();
                      setWaterIntake(w => w + 1000);
                    }}
                  >
                    <View style={{ width: 50, height: 50, borderRadius: 25, backgroundColor: 'rgba(100,200,255,0.1)', alignItems: 'center', justifyContent: 'center', marginBottom: 4 }}>
                      <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#4ECDC4' }}>1L</Text>
                    </View>
                  </Pressable>
                </View>
              </GlassCard>



              {/* Image preview */}
              {image && !analyzing && (
                <GlassCard style={styles.imageCard}>
                  <Image source={{ uri: image.uri }} style={styles.previewImage} />
                </GlassCard>
              )}

              {/* Meals list */}
              {todayData.meals.length > 0 ? (
                <View style={styles.mealsSection}>
                  <View style={styles.mealsSectionHeader}>
                    <Text style={styles.sectionTitle}>Today's Meals</Text>
                    <Text style={styles.mealCount}>{todayData.meals.length} items</Text>
                  </View>
                  {todayData.meals.map((meal, index) => (
                    <MealCard
                      key={meal.id}
                      meal={meal}
                      onEdit={handleEditMeal}
                      onDelete={handleDeleteMeal}
                      animationDelay={index * stagger.normal}
                    />
                  ))}
                </View>
              ) : (
                <EmptyState
                  {...EmptyStates.noMeals}
                  onAction={() => pickImage(false)}
                />
              )}

              {/* Calendar Week Strip (Moved to Bottom) */}
              <GlassCard style={[styles.calendarCard, { marginTop: spacing.lg }]}>
                <View style={styles.calendarHeader}>
                  <Pressable onPress={() => changeDate(-7)} style={styles.calendarNavBtn}>
                    <Text style={styles.calendarNavIcon}>‹</Text>
                  </Pressable>
                  <Text style={styles.calendarMonth}>
                    {selectedDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
                  </Text>
                  <Pressable
                    onPress={() => changeDate(7)}
                    style={styles.calendarNavBtn}
                    disabled={isToday}
                  >
                    <Text style={[styles.calendarNavIcon, isToday && styles.calendarNavDisabled]}>›</Text>
                  </Pressable>
                </View>
                <View style={styles.weekDays}>
                  {getWeekDays().map((day, i) => {
                    const isSelected = day.date.toDateString() === selectedDate.toDateString();
                    const isTodayDate = day.date.toDateString() === new Date().toDateString();
                    return (
                      <Pressable
                        key={i}
                        style={[
                          styles.dayButton,
                          isSelected && styles.dayButtonSelected,
                          isTodayDate && !isSelected && styles.dayButtonToday,
                        ]}
                        onPress={() => {
                          haptic.selection();
                          setSelectedDate(day.date);
                        }}
                      >
                        <Text style={[styles.dayLabel, isSelected && styles.dayLabelSelected]}>
                          {day.label}
                        </Text>
                        <Text style={[styles.dayNumber, isSelected && styles.dayNumberSelected]}>
                          {day.date.getDate()}
                        </Text>
                        {isTodayDate && <View style={styles.todayDot} />}
                      </Pressable>
                    );
                  })}
                </View>
              </GlassCard>

              {/* Branding Footer */}
              <View style={{ alignItems: 'center', marginTop: spacing['2xl'], opacity: 0.5 }}>
                <Text style={{ fontSize: 12, color: colors.text.tertiary, letterSpacing: 1 }}>NUTRITION TRACKER AI</Text>
                <Text style={{ fontSize: 10, color: colors.text.tertiary, marginTop: 4 }}>v1.0.0 • Premium Edition</Text>
              </View>
            </Animated.View>
          )}

          {/* WEEKLY TAB */}
          {activeTab === 'weekly' && (
            <Animated.View entering={FadeIn.duration(300)}>
              {weekData.some(d => d.calories > 0) ? (
                <>
                  {/* AI Weekly Insight */}
                  {/* AI Weekly Insight */}
                  <GlassCard style={{ marginBottom: spacing.lg, padding: spacing.lg }}>
                    <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: spacing.md }}>
                      <Ionicons name="sparkles" size={20} color={colors.primary.solid} style={{ marginRight: spacing.sm }} />
                      <Text style={{ color: colors.text.primary, fontWeight: 'bold', fontSize: typography.sizes.body }}>AI Weekly Insight</Text>
                    </View>

                    {analyzingWeekly ? (
                      <View style={{ padding: spacing.lg, alignItems: 'center' }}>
                        <ActivityIndicator color={colors.primary.solid} />
                        <Text style={{ marginTop: spacing.md, color: colors.text.tertiary, fontSize: 13 }}>Analyzing your week...</Text>
                      </View>
                    ) : weeklyInsight ? (
                      <Text style={{ color: colors.text.secondary, fontSize: typography.sizes.body, lineHeight: 22 }}>
                        {weeklyInsight}
                      </Text>
                    ) : (
                      <Text style={{ color: colors.text.secondary, fontSize: typography.sizes.body, marginBottom: spacing.md }}>
                        Get a personalized analysis of your weekly nutrition trends.
                      </Text>
                    )}

                    {!analyzingWeekly && (
                      <GlassButton onPress={handleWeeklyAnalysis} style={{ marginTop: spacing.md }} fullWidth>
                        {weeklyInsight ? "Refresh Analysis" : "Analyze Week"}
                      </GlassButton>
                    )}
                  </GlassCard>

                  <GlassCard style={styles.chartCard}>
                    <Text style={styles.cardTitle}>Weekly Activity</Text>
                    <LineChart
                      data={{
                        labels: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
                        datasets: [{ data: weekData.map(d => d.calories || 10) }],
                      }}
                      width={SCREEN_WIDTH - spacing['2xl'] * 4}
                      height={200}
                      withInnerLines={false}
                      withOuterLines={false}
                      chartConfig={{
                        backgroundColor: 'transparent',
                        backgroundGradientFrom: colors.primary.start,
                        backgroundGradientTo: colors.primary.end,
                        fillShadowGradientFrom: colors.primary.solid,
                        fillShadowGradientTo: 'transparent',
                        fillShadowGradientOpacity: 0.3,
                        decimalPlaces: 0,
                        color: (opacity = 1) => `rgba(255, 255, 255, ${opacity})`,
                        labelColor: () => colors.text.secondary,
                        propsForDots: { r: '4', strokeWidth: '2', stroke: colors.primary.end },
                        propsForBackgroundLines: { strokeDasharray: '' } // solid lines if visible
                      }}
                      bezier
                      style={styles.chart}
                    />
                  </GlassCard>

                  <GlassCard style={styles.statsCard}>
                    <Text style={styles.cardTitle}>Weekly Totals</Text>
                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', paddingHorizontal: spacing.xs, marginTop: spacing.md }}>
                      {[
                        { label: 'Kcal', val: weekData.reduce((s, d) => s + d.calories, 0), goal: goals.calories * 7, col: colors.calories },
                        { label: 'Prot', val: weekData.reduce((s, d) => s + d.protein, 0), goal: goals.protein * 7, col: colors.protein },
                        { label: 'Carb', val: weekData.reduce((s, d) => s + d.carbs, 0), goal: goals.carbs * 7, col: colors.carbs },
                        { label: 'Fat', val: weekData.reduce((s, d) => s + d.fats, 0), goal: goals.fats * 7, col: colors.fats },
                      ].map((stat, i) => (
                        <View key={stat.label} style={{ alignItems: 'center' }}>
                          <AnimatedRing
                            size={65}
                            strokeWidth={6}
                            progress={Math.min((stat.val / stat.goal) * 100, 100)}
                            color={stat.col}
                            gradientEnd={stat.col}
                            label={stat.label}
                            value={Math.round(stat.val) + (stat.label === 'Kcal' ? '' : 'g')}
                            showGlow={false}
                            delay={i * 100}
                          />
                        </View>
                      ))}
                    </View>
                  </GlassCard>

                  <GlassButton onPress={exportData} variant="success" fullWidth>
                    📊 Export Data
                  </GlassButton>
                </>
              ) : (
                <EmptyState {...EmptyStates.noWeekData} />
              )}
            </Animated.View>
          )}

          {/* GOALS TAB */}
          {activeTab === 'goals' && (
            <Animated.View entering={FadeIn.duration(300)}>
              {/* AI Goal Assistant Card */}
              <GlassCard style={styles.goalsCard}>
                <LinearGradient
                  colors={[colors.primary.solid, '#a18cd1']}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 1 }}
                  style={{
                    position: 'absolute',
                    top: 0, left: 0, right: 0, bottom: 0,
                    borderRadius: borderRadius.lg,
                    opacity: 0.1
                  }}
                />
                <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>Smart Goal Assistant</Text>
                    <Text style={styles.hydrationSubtitle}>
                      Let AI calculate your personalized nutrition targets based on your unique profile.
                    </Text>
                  </View>
                  <View style={{
                    width: 50, height: 50,
                    borderRadius: 25,
                    backgroundColor: 'rgba(255,255,255,0.1)',
                    alignItems: 'center', justifyContent: 'center'
                  }}>
                    <Ionicons name="sparkles" size={24} color={colors.primary.end} />
                  </View>
                </View>
                <GlassButton
                  onPress={() => {
                    setShowAssistant(true);
                    hapticsEnabled && haptic.selection();
                  }}
                  fullWidth
                  style={{ marginTop: spacing.lg }}
                >
                  {userProfile.gender ? 'Update My Profile' : 'Start Assistant'}
                </GlassButton>
              </GlassCard>

              {/* Progress Summary Grid */}
              <View style={styles.progressGrid}>
                <GlassCard style={{ width: '47%', padding: spacing.md, marginBottom: spacing.md }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs }}>
                    <MaterialCommunityIcons name="fire" size={20} color="#FF6B6B" />
                    <Text style={{ fontSize: 12, color: colors.text.tertiary }}>Kcal</Text>
                  </View>
                  <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text.primary }}>{goals.calories}</Text>
                  <Text style={{ fontSize: 12, color: colors.text.secondary }}>Target</Text>
                </GlassCard>

                <GlassCard style={{ width: '47%', padding: spacing.md, marginBottom: spacing.md }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs }}>
                    <MaterialCommunityIcons name="dumbbell" size={20} color="#4ECDC4" />
                    <Text style={{ fontSize: 12, color: colors.text.tertiary }}>Prot</Text>
                  </View>
                  <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text.primary }}>{goals.protein}g</Text>
                  <Text style={{ fontSize: 12, color: colors.text.secondary }}>Target</Text>
                </GlassCard>

                <GlassCard style={{ width: '47%', padding: spacing.md }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs }}>
                    <MaterialCommunityIcons name="barley" size={20} color="#FFE66D" />
                    <Text style={{ fontSize: 12, color: colors.text.tertiary }}>Carb</Text>
                  </View>
                  <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text.primary }}>{goals.carbs}g</Text>
                  <Text style={{ fontSize: 12, color: colors.text.secondary }}>Target</Text>
                </GlassCard>

                <GlassCard style={{ width: '47%', padding: spacing.md }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: spacing.xs }}>
                    <MaterialCommunityIcons name="water-percent" size={20} color="#A8D5E2" />
                    <Text style={{ fontSize: 12, color: colors.text.tertiary }}>Fat</Text>
                  </View>
                  <Text style={{ fontSize: 20, fontWeight: 'bold', color: colors.text.primary }}>{goals.fats}g</Text>
                  <Text style={{ fontSize: 12, color: colors.text.secondary }}>Target</Text>
                </GlassCard>
              </View>

              <GlassCard style={[styles.goalsCard, { marginTop: spacing.lg }]}>
                <View style={styles.settingsSectionHeader}>
                  <View style={styles.settingsIconContainer}>
                    <MaterialCommunityIcons name="tune" size={20} color={colors.text.primary} />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>Manual Override</Text>
                    <Text style={styles.hydrationSubtitle}>Fine-tune your daily macro limits</Text>
                  </View>
                </View>
                <GlassButton
                  onPress={() => setGoalsModalVisible(true)}
                  fullWidth
                  style={{ marginTop: spacing.lg }}
                >
                  Edit Goals Manually
                </GlassButton>
              </GlassCard>

              {/* Hydration Goal Editor */}
              <GlassCard style={styles.goalsCard}>
                <View style={styles.settingsSectionHeader}>
                  <View style={styles.settingsIconContainer}>
                    <MaterialCommunityIcons name="water" size={20} color="#4facfe" />
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.cardTitle}>Hydration Goal</Text>
                    <Text style={styles.hydrationSubtitle}>Set your daily water target</Text>
                  </View>
                </View>
                <View style={styles.hydrationQuickButtons}>
                  {[2000, 2500, 3000, 3500].map((amount) => (
                    <Pressable
                      key={amount}
                      style={[
                        styles.hydrationQuickBtn,
                        hydrationGoal === amount && styles.hydrationQuickBtnActive
                      ]}
                      onPress={() => {
                        setHydrationGoal(amount);
                        setCustomHydration('');
                        hapticsEnabled && haptic.light();
                      }}
                    >
                      <Text style={[
                        styles.hydrationQuickBtnText,
                        hydrationGoal === amount && styles.hydrationQuickBtnTextActive
                      ]}>
                        {amount / 1000}L
                      </Text>
                    </Pressable>
                  ))}
                </View>
                <View style={[styles.inputRow, { marginTop: spacing.md }]}>
                  <TextInput
                    style={[styles.modalInput, { flex: 1, marginBottom: 0 }]}
                    value={customHydration}
                    onChangeText={setCustomHydration}
                    placeholder="Custom (ml)"
                    keyboardType="numeric"
                    placeholderTextColor={colors.text.muted}
                  />
                  <View style={{ width: spacing.md }} />
                  <Pressable
                    style={[styles.hydrationQuickBtn, styles.hydrationQuickBtnActive, { flex: 0, paddingHorizontal: spacing.lg }]}
                    onPress={() => {
                      const val = parseInt(customHydration);
                      if (val && val > 0) {
                        setHydrationGoal(val);
                        hapticsEnabled && haptic.success();
                      }
                    }}
                  >
                    <Text style={[styles.hydrationQuickBtnText, styles.hydrationQuickBtnTextActive]}>Set</Text>
                  </Pressable>
                </View>
              </GlassCard>

              {/* User Profile Summary - REMOVED (Now in Profile Tab) */}
            </Animated.View>
          )}

          {/* SETTINGS TAB */}
          {activeTab === 'settings' && (
            <SettingsScreen
              onApiKeyUpdate={handleApiKeyUpdate}
              hapticsEnabled={hapticsEnabled}
              setHapticsEnabled={setHapticsEnabled}
              onShowPrivacy={() => setShowPrivacyModal(true)}
              hydrationGoal={hydrationGoal}
            />
          )}

          {/* PROFILE SCREEN */}
          {activeTab === 'profile' && (
            <ProfileScreen
              profile={userProfile}
              onSave={async (newProfile) => {
                setUserProfile(newProfile);
                // Recalculate based on new profile
                if (newProfile.fitnessGoal) {
                  const bmr = calculateBMR(newProfile.weight, newProfile.height, newProfile.age, newProfile.gender);
                  const tdee = calculateTDEE(bmr, newProfile.activityLevel || 'sedentary');
                  const targetCalories = calculateTargetCalories(tdee, newProfile.fitnessGoal);
                  const newGoals = calculateMacros(targetCalories); // Use default balanced split for now
                  await saveGoals(newGoals);
                }
                await AsyncStorage.setItem('@UserProfile', JSON.stringify(newProfile));
                haptic.success();
                // Optionally switch back to goals or home
              }}
            />
          )}

          <View style={{ height: insets.bottom + 40 }} />
        </ScrollView>

        {/* Edit Meal Modal */}
        <GlassModal
          visible={editModalVisible}
          onClose={() => setEditModalVisible(false)}
          title="Edit Meal"
        >
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Food Name</Text>
            <TextInput
              style={styles.modalInput}
              value={editedMeal.name}
              onChangeText={(text) => setEditedMeal({ ...editedMeal, name: text })}
              placeholder="e.g., Grilled Chicken Salad"
              placeholderTextColor={colors.text.muted}
            />
          </View>
          <View style={styles.inputRow}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>Calories</Text>
              <TextInput
                style={styles.modalInput}
                value={editedMeal.calories?.toString()}
                onChangeText={(text) => setEditedMeal({ ...editedMeal, calories: parseFloat(text) || 0 })}
                placeholder="kcal"
                keyboardType="numeric"
                placeholderTextColor={colors.text.muted}
              />
            </View>
            <View style={{ width: spacing.md }} />
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>Protein (g)</Text>
              <TextInput
                style={styles.modalInput}
                value={editedMeal.protein?.toString()}
                onChangeText={(text) => setEditedMeal({ ...editedMeal, protein: parseFloat(text) || 0 })}
                placeholder="g"
                keyboardType="numeric"
                placeholderTextColor={colors.text.muted}
              />
            </View>
          </View>
          <View style={styles.inputRow}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>Carbs (g)</Text>
              <TextInput
                style={styles.modalInput}
                value={editedMeal.carbs?.toString()}
                onChangeText={(text) => setEditedMeal({ ...editedMeal, carbs: parseFloat(text) || 0 })}
                placeholder="g"
                keyboardType="numeric"
                placeholderTextColor={colors.text.muted}
              />
            </View>
            <View style={{ width: spacing.md }} />
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>Fats (g)</Text>
              <TextInput
                style={styles.modalInput}
                value={editedMeal.fats?.toString()}
                onChangeText={(text) => setEditedMeal({ ...editedMeal, fats: parseFloat(text) || 0 })}
                placeholder="g"
                keyboardType="numeric"
                placeholderTextColor={colors.text.muted}
              />
            </View>
          </View>
          <View style={styles.modalButtons}>
            <GlassButton
              onPress={() => setEditModalVisible(false)}
              variant="glass"
              style={{ flex: 1 }}
            >
              Cancel
            </GlassButton>
            <View style={{ width: spacing.md }} />
            <GlassButton
              onPress={saveEditedMealHandler}
              style={{ flex: 1 }}
            >
              Save
            </GlassButton>
          </View>
        </GlassModal>

        {/* Goals Modal */}
        <GlassModal
          visible={goalsModalVisible}
          onClose={() => setGoalsModalVisible(false)}
          title="Set Daily Goals"
        >
          {['calories', 'protein', 'carbs', 'fats'].map((field) => (
            <View key={field} style={styles.inputGroup}>
              <Text style={styles.inputLabel}>
                {field.charAt(0).toUpperCase() + field.slice(1)} {field !== 'calories' ? '(g)' : '(kcal)'}
              </Text>
              <TextInput
                style={styles.modalInput}
                value={goals[field as keyof typeof goals]?.toString()}
                onChangeText={(text) => saveGoals({ ...goals, [field]: parseFloat(text) || 0 })}
                placeholder={`Daily ${field} target`}
                keyboardType="numeric"
                placeholderTextColor={colors.text.muted}
              />
            </View>
          ))}
          <GlassButton
            onPress={() => { saveGoals(goals); haptic.success(); setGoalsModalVisible(false); }}
            fullWidth
          >
            Save Goals
          </GlassButton>
        </GlassModal>

        {/* AI Goal Assistant Modal */}
        <GlassModal
          visible={showAssistant}
          onClose={() => { setShowAssistant(false); setAssistantStep(0); }}
          title={`🤖 Goal Assistant (Step ${assistantStep + 1}/4)`}
        >
          {/* Step 0: Body Measurements */}
          {assistantStep === 0 && (
            <>
              <Text style={styles.assistantStepTitle}>Tell me about yourself</Text>
              <View style={styles.chipRow}>
                {['male', 'female'].map((g) => (
                  <Pressable
                    key={g}
                    style={[styles.chip, userProfile.gender === g && styles.chipActive]}
                    onPress={() => setUserProfile({ ...userProfile, gender: g as 'male' | 'female' })}
                  >
                    <Text style={[styles.chipText, userProfile.gender === g && styles.chipTextActive]}>
                      {g === 'male' ? '👨 Male' : '👩 Female'}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.inputRow}>
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Age</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={userProfile.age ? userProfile.age.toString() : ''}
                    onChangeText={(t) => setUserProfile({ ...userProfile, age: parseInt(t) || 0 })}
                    placeholder="Years"
                    keyboardType="numeric"
                    placeholderTextColor={colors.text.muted}
                  />
                </View>
                <View style={{ width: spacing.md }} />
                <View style={[styles.inputGroup, { flex: 1 }]}>
                  <Text style={styles.inputLabel}>Height (cm)</Text>
                  <TextInput
                    style={styles.modalInput}
                    value={userProfile.height ? userProfile.height.toString() : ''}
                    onChangeText={(t) => setUserProfile({ ...userProfile, height: parseInt(t) || 0 })}
                    placeholder="cm"
                    keyboardType="numeric"
                    placeholderTextColor={colors.text.muted}
                  />
                </View>
              </View>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Weight (kg)</Text>
                <TextInput
                  style={styles.modalInput}
                  value={userProfile.weight ? userProfile.weight.toString() : ''}
                  onChangeText={(t) => setUserProfile({ ...userProfile, weight: parseFloat(t) || 0 })}
                  placeholder="kg"
                  keyboardType="numeric"
                  placeholderTextColor={colors.text.muted}
                />
              </View>
              <GlassButton
                onPress={() => setAssistantStep(1)}
                fullWidth
                disabled={!userProfile.gender || !userProfile.age || !userProfile.height || !userProfile.weight}
              >
                Next →
              </GlassButton>
            </>
          )}

          {/* Step 1: Activity Level */}
          {assistantStep === 1 && (
            <>
              <Text style={styles.assistantStepTitle}>How active are you?</Text>
              {[
                { key: 'sedentary', label: '🪑 Sedentary', desc: 'Little to no exercise' },
                { key: 'light', label: '🚶 Lightly Active', desc: 'Light exercise 1-3 days/week' },
                { key: 'moderate', label: '🏃 Moderately Active', desc: 'Exercise 3-5 days/week' },
                { key: 'active', label: '💪 Very Active', desc: 'Hard exercise 6-7 days/week' },
                { key: 'very_active', label: '🏋️ Extra Active', desc: 'Physical job or intense training' },
              ].map((opt) => (
                <Pressable
                  key={opt.key}
                  style={[styles.optionCard, userProfile.activityLevel === opt.key && styles.optionCardActive]}
                  onPress={() => setUserProfile({ ...userProfile, activityLevel: opt.key as typeof userProfile.activityLevel })}
                >
                  <Text style={[styles.optionLabel, userProfile.activityLevel === opt.key && styles.optionLabelActive]}>
                    {opt.label}
                  </Text>
                  <Text style={styles.optionDesc}>{opt.desc}</Text>
                </Pressable>
              ))}
              <View style={styles.modalButtons}>
                <GlassButton onPress={() => setAssistantStep(0)} variant="glass" style={{ flex: 1 }}>
                  ← Back
                </GlassButton>
                <View style={{ width: spacing.md }} />
                <GlassButton onPress={() => setAssistantStep(2)} style={{ flex: 1 }} disabled={!userProfile.activityLevel}>
                  Next →
                </GlassButton>
              </View>
            </>
          )}

          {/* Step 2: Diet Type */}
          {assistantStep === 2 && (
            <>
              <Text style={styles.assistantStepTitle}>What's your diet preference?</Text>
              <View style={styles.chipGrid}>
                {[
                  { key: 'nonveg', label: '🍖 Non-Veg' },
                  { key: 'veg', label: '🥗 Vegetarian' },
                  { key: 'vegan', label: '🌱 Vegan' },
                  { key: 'eggetarian', label: '🥚 Eggetarian' },
                ].map((opt) => (
                  <Pressable
                    key={opt.key}
                    style={[styles.chipLarge, userProfile.dietType === opt.key && styles.chipActive]}
                    onPress={() => setUserProfile({ ...userProfile, dietType: opt.key as typeof userProfile.dietType })}
                  >
                    <Text style={[styles.chipText, userProfile.dietType === opt.key && styles.chipTextActive]}>
                      {opt.label}
                    </Text>
                  </Pressable>
                ))}
              </View>
              <View style={styles.modalButtons}>
                <GlassButton onPress={() => setAssistantStep(1)} variant="glass" style={{ flex: 1 }}>
                  ← Back
                </GlassButton>
                <View style={{ width: spacing.md }} />
                <GlassButton onPress={() => setAssistantStep(3)} style={{ flex: 1 }} disabled={!userProfile.dietType}>
                  Next →
                </GlassButton>
              </View>
            </>
          )}

          {/* Step 3: Fitness Goal */}
          {assistantStep === 3 && (
            <>
              <Text style={styles.assistantStepTitle}>What's your fitness goal?</Text>
              {[
                { key: 'lose', label: '📉 Lose Weight', desc: '20% calorie deficit' },
                { key: 'maintain', label: '⚖️ Maintain Weight', desc: 'Keep current weight' },
                { key: 'gain', label: '📈 Gain Weight', desc: '15% calorie surplus' },
              ].map((opt) => (
                <Pressable
                  key={opt.key}
                  style={[styles.optionCard, userProfile.fitnessGoal === opt.key && styles.optionCardActive]}
                  onPress={() => setUserProfile({ ...userProfile, fitnessGoal: opt.key as typeof userProfile.fitnessGoal })}
                >
                  <Text style={[styles.optionLabel, userProfile.fitnessGoal === opt.key && styles.optionLabelActive]}>
                    {opt.label}
                  </Text>
                  <Text style={styles.optionDesc}>{opt.desc}</Text>
                </Pressable>
              ))}
              <View style={styles.modalButtons}>
                <GlassButton onPress={() => setAssistantStep(2)} variant="glass" style={{ flex: 1 }}>
                  ← Back
                </GlassButton>
                <View style={{ width: spacing.md }} />
                <GlassButton onPress={applyCalculatedGoals} style={{ flex: 1 }} disabled={!userProfile.fitnessGoal}>
                  ✨ Calculate Goals
                </GlassButton>
              </View>
            </>
          )}
        </GlassModal>

        {/* Manual Entry Modal */}
        <GlassModal
          visible={showManualEntry}
          onClose={() => setShowManualEntry(false)}
          title="Add Meal Manually"
        >
          <View style={styles.inputGroup}>
            <Text style={styles.inputLabel}>Food Name</Text>
            <TextInput
              style={styles.modalInput}
              value={manualMeal.name}
              onChangeText={(text) => setManualMeal({ ...manualMeal, name: text })}
              placeholder="e.g., Oatmeal with Banana"
              placeholderTextColor={colors.text.muted}
            />
          </View>
          <View style={styles.inputRow}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>Calories</Text>
              <TextInput
                style={styles.modalInput}
                value={manualMeal.calories?.toString()}
                onChangeText={(text) => setManualMeal({ ...manualMeal, calories: parseFloat(text) || 0 })}
                placeholder="kcal"
                keyboardType="numeric"
                placeholderTextColor={colors.text.muted}
              />
            </View>
            <View style={{ width: spacing.md }} />
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>Protein (g)</Text>
              <TextInput
                style={styles.modalInput}
                value={manualMeal.protein?.toString()}
                onChangeText={(text) => setManualMeal({ ...manualMeal, protein: parseFloat(text) || 0 })}
                placeholder="g"
                keyboardType="numeric"
                placeholderTextColor={colors.text.muted}
              />
            </View>
          </View>
          <View style={styles.inputRow}>
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>Carbs (g)</Text>
              <TextInput
                style={styles.modalInput}
                value={manualMeal.carbs?.toString()}
                onChangeText={(text) => setManualMeal({ ...manualMeal, carbs: parseFloat(text) || 0 })}
                placeholder="g"
                keyboardType="numeric"
                placeholderTextColor={colors.text.muted}
              />
            </View>
            <View style={{ width: spacing.md }} />
            <View style={[styles.inputGroup, { flex: 1 }]}>
              <Text style={styles.inputLabel}>Fats (g)</Text>
              <TextInput
                style={styles.modalInput}
                value={manualMeal.fats?.toString()}
                onChangeText={(text) => setManualMeal({ ...manualMeal, fats: parseFloat(text) || 0 })}
                placeholder="g"
                keyboardType="numeric"
                placeholderTextColor={colors.text.muted}
              />
            </View>
          </View>
          <View style={styles.modalButtons}>
            <GlassButton
              onPress={() => setShowManualEntry(false)}
              variant="glass"
              style={{ flex: 1 }}
            >
              Cancel
            </GlassButton>
            <View style={{ width: spacing.md }} />
            <GlassButton
              onPress={handleAddManualMeal}
              style={{ flex: 1 }}
            >
              Add Meal
            </GlassButton>
          </View>
        </GlassModal>

        {/* Global Privacy Modal */}
        <PrivacyModal
          visible={showPrivacyModal}
          onClose={() => setShowPrivacyModal(false)}
        />
      </View>
    </GestureHandlerRootView >
  );
}

// ============================================================================
// STYLES
// ============================================================================

const styles = StyleSheet.create({
  // Layout
  container: {
    flex: 1,
    backgroundColor: colors.background.primary,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    paddingHorizontal: spacing.xl,
  },

  // Header
  header: {
    paddingHorizontal: spacing.xl,
    paddingBottom: spacing['2xl'],
  },
  headerTitle: {
    fontSize: typography.sizes.title1,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  headerSubtitle: {
    fontSize: typography.sizes.body,
    color: colors.text.secondary,
  },

  // Tab Bar
  tabBar: {
    paddingHorizontal: spacing.xl,
    marginBottom: spacing.xl,
  },
  tabBarInner: {
    flexDirection: 'row',
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.xl,
    padding: spacing.xs,
    borderWidth: 1,
    borderColor: colors.glass.border,
    position: 'relative',
  },
  tab: {
    flex: 1,
    paddingVertical: spacing.md,
    alignItems: 'center',
    zIndex: 1,
  },
  tabText: {
    fontSize: typography.sizes.subhead,
    fontWeight: typography.weights.medium,
    color: colors.text.tertiary,
  },
  tabTextActive: {
    color: colors.text.primary,
  },
  tabIndicator: {
    position: 'absolute',
    top: spacing.xs,
    left: spacing.xs,
    width: SINGLE_TAB_WIDTH,
    height: '100%',
    backgroundColor: colors.primary.solid,
    borderRadius: borderRadius.lg,
  },

  // Cards
  dateCard: {
    marginBottom: spacing.lg,
  },
  progressCard: {
    marginBottom: spacing.lg,
  },
  chartCard: {
    marginBottom: spacing.lg,
    alignItems: 'center',
  },
  statsCard: {
    marginBottom: spacing.lg,
  },
  goalsCard: {
    marginBottom: spacing.lg,
  },
  imageCard: {
    marginBottom: spacing.lg,
    padding: 0,
    overflow: 'hidden',
  },
  analyzingCard: {
    alignItems: 'center',
    marginBottom: spacing.lg,
  },

  // Date selector
  dateSelector: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dateArrow: {
    fontSize: 24,
    color: colors.primary.solid,
    paddingHorizontal: spacing.lg,
  },
  dateArrowDisabled: {
    color: colors.text.muted,
  },
  dateText: {
    fontSize: typography.sizes.headline,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
  },

  // Progress grid
  progressGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-around',
    marginTop: spacing.lg,
  },

  // Titles
  cardTitle: {
    fontSize: typography.sizes.title3,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginBottom: spacing.md,
  },
  sectionTitle: {
    fontSize: typography.sizes.headline,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginBottom: spacing.lg,
  },

  // Action buttons
  actionButtons: {
    flexDirection: 'row',
    marginBottom: spacing.lg,
  },
  buttonIcon: {
    fontSize: 18,
    marginRight: spacing.sm,
  },

  // Analyzing
  analyzingText: {
    marginTop: spacing.lg,
    fontSize: typography.sizes.body,
    color: colors.text.secondary,
  },

  // Image preview
  previewImage: {
    width: '100%',
    height: 200,
    borderRadius: borderRadius.xl,
  },

  // Meals
  mealsSection: {
    marginTop: spacing.lg,
  },
  mealsSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  mealCount: {
    fontSize: typography.sizes.subhead,
    color: colors.text.tertiary,
  },

  // Calendar Strip
  calendarCard: {
    marginBottom: spacing.lg,
  },
  calendarHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  calendarNavBtn: {
    padding: spacing.sm,
  },
  calendarNavIcon: {
    fontSize: 28,
    color: colors.primary.solid,
    fontWeight: '300',
  },
  calendarNavDisabled: {
    color: colors.text.muted,
  },
  calendarMonth: {
    fontSize: typography.sizes.headline,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
  },
  weekDays: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  dayButton: {
    alignItems: 'center',
    justifyContent: 'center',
    width: 40,
    height: 60,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.03)',
  },
  dayButtonSelected: {
    backgroundColor: colors.primary.solid,
  },
  dayButtonToday: {
    borderWidth: 1,
    borderColor: colors.primary.solid,
  },
  dayLabel: {
    fontSize: 10,
    fontWeight: '600',
    color: colors.text.tertiary,
    marginBottom: 6,
    textTransform: 'uppercase',
  },
  dayLabelSelected: {
    color: colors.text.primary,
  },
  dayNumber: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    color: colors.text.secondary,
  },
  dayNumberSelected: {
    color: colors.text.primary,
  },
  todayDot: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: colors.primary.solid,
    marginTop: 4,
  },

  // Progress Grid - 2x2 layout
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  progressDate: {
    fontSize: typography.sizes.subhead,
    color: colors.text.tertiary,
  },
  progressRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: spacing.lg,
  },

  // Hydration Card
  hydrationCard: {
    marginBottom: spacing.lg,
  },
  hydrationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.lg,
  },
  hydrationTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  hydrationIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(116, 185, 255, 0.2)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  iconText: {
    fontSize: 20,
  },

  hydrationPercent: {
    fontSize: typography.sizes.title3,
    fontWeight: typography.weights.bold,
    color: colors.water,
  },
  hydrationBar: {
    height: 8,
    backgroundColor: colors.glass.background,
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: spacing.lg,
  },
  hydrationProgress: {
    height: '100%',
    backgroundColor: colors.water,
    borderRadius: 4,
  },
  hydrationButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  waterBtn: {
    flex: 1,
    paddingVertical: spacing.md,
    backgroundColor: colors.glass.backgroundLight,
    borderRadius: borderRadius.md,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  waterBtnFull: {
    backgroundColor: 'rgba(116, 185, 255, 0.2)',
    borderColor: colors.water,
  },
  waterBtnText: {
    fontSize: typography.sizes.subhead,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
  },
  waterBtnUndo: {
    backgroundColor: 'rgba(239, 68, 68, 0.15)',
    borderColor: 'rgba(239, 68, 68, 0.3)',
  },
  waterBtnTextUndo: {
    fontSize: typography.sizes.subhead,
    fontWeight: typography.weights.semibold,
    color: colors.error,
  },

  // Quick Actions FABs
  quickActions: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.lg,
    marginBottom: spacing.xl,
  },
  quickActionsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.lg,
    gap: spacing.md,
  },
  quickActionBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    gap: spacing.xs,
  },
  quickActionLabel: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.medium,
    color: colors.text.primary,
  },
  fabButton: {
    borderRadius: borderRadius.xl,
    overflow: 'hidden',
  },
  fabGradient: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing['2xl'],
    alignItems: 'center',
    borderRadius: borderRadius.xl,
  },
  fabIcon: {
    fontSize: 24,
    color: colors.text.primary,
    marginBottom: 4,
  },
  fabLabel: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
  },
  fabButtonSecondary: {
    paddingVertical: spacing.lg,
    paddingHorizontal: spacing.xl,
    backgroundColor: colors.glass.backgroundLight,
    borderRadius: borderRadius.xl,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  fabIconSecondary: {
    fontSize: 24,
    color: colors.text.secondary,
    marginBottom: 4,
  },
  fabLabelSecondary: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.medium,
    color: colors.text.secondary,
  },

  // Chart
  chart: {
    borderRadius: borderRadius.lg,
    marginTop: spacing.md,
  },

  // Stats grid
  statsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  statItem: {
    width: '48%',
    backgroundColor: colors.glass.background,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    marginBottom: spacing.md,
    alignItems: 'center',
  },
  statValue: {
    fontSize: typography.sizes.title2,
    fontWeight: typography.weights.bold,
  },
  statLabel: {
    fontSize: typography.sizes.caption,
    color: colors.text.tertiary,
    marginTop: spacing.xs,
  },

  // Goals
  goalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.divider,
  },
  goalLabel: {
    fontSize: typography.sizes.body,
    color: colors.text.secondary,
  },
  goalValue: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.primary.solid,
  },
  goalLabelRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  goalIcon: {
    fontSize: 18,
    marginRight: spacing.sm,
  },
  progressItem: {
    marginBottom: spacing.lg,
  },
  progressItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: spacing.sm,
  },
  progressBarBackground: {
    height: 8,
    backgroundColor: colors.glass.background,
    borderRadius: 4,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    borderRadius: 4,
  },
  hydrationGoalHeader: {
    marginBottom: spacing.md,
  },
  tipItem: {
    paddingVertical: spacing.sm,
  },
  tipText: {
    fontSize: typography.sizes.body,
    color: colors.text.secondary,
    lineHeight: 22,
  },


  // Wizard Styles





  // Onboarding
  onboardingContainer: {
    flex: 1,
    paddingHorizontal: spacing['2xl'],
  },
  onboardingScrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
  },
  onboardingContent: {
    alignItems: 'center',
    paddingVertical: spacing['3xl'],
  },
  onboardingIcon: {
    fontSize: 80,
    marginBottom: spacing['3xl'],
  },
  onboardingTitle: {
    fontSize: typography.sizes.title1,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    textAlign: 'center',
    marginBottom: spacing.lg,
  },
  onboardingMessage: {
    fontSize: typography.sizes.body,
    color: colors.text.secondary,
    textAlign: 'center',
    lineHeight: typography.sizes.body * typography.lineHeights.relaxed,
    paddingHorizontal: spacing.xl,
  },
  onboardingApiSection: {
    alignItems: 'center',
    paddingBottom: spacing['4xl'],
  },
  onboardingSubtext: {
    fontSize: typography.sizes.body,
    color: colors.text.secondary,
    marginBottom: spacing.sm,
  },
  onboardingLink: {
    fontSize: typography.sizes.headline,
    fontWeight: typography.weights.bold,
    color: colors.warning,
    marginBottom: spacing['2xl'],
  },
  onboardingInputContainer: {
    width: '100%',
    marginBottom: spacing.xl,
  },
  onboardingInput: {
    backgroundColor: colors.glass.backgroundLight,
    borderRadius: borderRadius.lg,
    padding: spacing.lg,
    fontSize: typography.sizes.body,
    color: colors.text.primary,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  onboardingFooter: {
    alignItems: 'center',
    paddingBottom: spacing['4xl'],
  },
  dots: {
    flexDirection: 'row',
    marginBottom: spacing['2xl'],
    gap: spacing.sm,
  },
  dot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: colors.glass.background,
  },
  dotActive: {
    width: 24,
    backgroundColor: colors.text.primary,
  },
  backButton: {
    marginTop: spacing.lg,
  },
  backButtonText: {
    color: colors.text.secondary,
    fontSize: typography.sizes.body,
  },



  // Error
  inputError: {
    borderColor: colors.error,
  },
  errorText: {
    color: colors.error,
    fontSize: typography.sizes.caption,
    marginTop: spacing.sm,
    marginLeft: spacing.sm,
  },


  settingInfo: {
    flex: 1,
  },
  settingRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.glass.border,
  },
  settingIconBox: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.glass.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  settingLabel: {
    fontSize: typography.sizes.body,
    color: colors.text.primary,
    fontWeight: typography.weights.medium,
  },
  settingDesc: {
    fontSize: typography.sizes.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  settingValueText: {
    fontSize: typography.sizes.body,
    color: colors.text.secondary,
  },
  settingArrow: {
    fontSize: 18,
    color: colors.text.tertiary,
    marginLeft: spacing.sm,
  },
  dangerButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: spacing.lg,
    backgroundColor: 'rgba(255, 107, 107, 0.1)',
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: 'rgba(255, 107, 107, 0.3)',
    marginTop: spacing.xl,
    marginBottom: spacing.xl,
  },
  dangerText: {
    color: '#FF6B6B',
    fontWeight: typography.weights.bold,
    fontSize: typography.sizes.body,
  },
  copyrightContainer: {
    alignItems: 'center',
    paddingBottom: spacing['4xl'],
  },
  copyrightText: {
    fontSize: typography.sizes.caption,
    color: colors.text.muted,
    marginBottom: 4,
  },
  modalText: {
    fontSize: typography.sizes.body,
    color: colors.text.secondary,
    lineHeight: 22,
  },
  apiCard: {
    padding: 0,
    overflow: 'hidden',
    marginBottom: spacing.lg,
    minHeight: 180,
  },
  apiGradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    bottom: 0,
    opacity: 0.15,
  },
  apiContent: {
    padding: spacing.xl,
    flex: 1,
    justifyContent: 'space-between',
  },
  apiLabel: {
    fontSize: typography.sizes.caption,
    color: 'rgba(255,255,255,0.7)',
    fontWeight: typography.weights.bold,
    letterSpacing: 1,
    marginBottom: 4,
  },
  apiStatus: {
    fontSize: typography.sizes.subhead,
    color: '#4ECDC4',
    fontWeight: typography.weights.bold,
  },
  apiDescription: {
    fontSize: typography.sizes.caption,
    color: 'rgba(255,255,255,0.6)',
    marginBottom: spacing.xs,
  },
  aboutRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: colors.glass.border,
  },
  aboutLabel: {
    fontSize: typography.sizes.body,
    color: colors.text.primary,
  },
  aboutValue: {
    fontSize: typography.sizes.body,
    color: colors.text.secondary,
    fontWeight: typography.weights.medium,
  },

  // Profile Screen
  profileRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: colors.glass.border,
  },
  profileLabel: {
    fontSize: typography.sizes.body,
    color: colors.text.secondary,
    fontWeight: typography.weights.medium,
  },
  profileValue: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.semibold,
    color: colors.text.primary,
  },
  chipGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: spacing.lg,
  },
  chipLarge: {
    backgroundColor: colors.glass.backgroundLight,
    paddingHorizontal: spacing.lg,
    paddingVertical: spacing.md,
    borderRadius: borderRadius.lg,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  chip: {
    backgroundColor: colors.glass.backgroundLight,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.xs,
    borderRadius: borderRadius.full,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  chipActive: {
    borderColor: colors.primary.solid,
    backgroundColor: 'rgba(78, 205, 196, 0.15)',
  },
  chipText: {
    fontSize: typography.sizes.body,
    color: colors.text.secondary,
  },
  chipTextActive: {
    color: colors.primary.solid,
    fontWeight: typography.weights.bold,
  },
  settingsContainer: {
    marginBottom: spacing['2xl'],
  },
  profileSummary: {
    marginTop: spacing.md,
  },

  // Hydration & Goals
  hydrationSubtitle: {
    fontSize: typography.sizes.caption,
    color: colors.text.secondary,
    marginTop: 2,
  },
  hydrationQuickButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.md,
  },
  hydrationQuickBtn: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    borderRadius: borderRadius.lg,
    backgroundColor: colors.glass.backgroundLight,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  hydrationQuickBtnActive: {
    backgroundColor: '#4facfe',
    borderColor: '#4facfe',
  },
  hydrationQuickBtnText: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
    color: colors.text.secondary,
  },
  hydrationQuickBtnTextActive: {
    color: '#fff',
  },
  settingsSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: spacing.lg,
    paddingBottom: spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: colors.glass.border,
  },
  settingsIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 8,
    backgroundColor: colors.glass.backgroundLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },

  // Assistant & Options
  assistantStepTitle: {
    fontSize: typography.sizes.title3,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginBottom: spacing.lg,
    textAlign: 'center',
  },
  chipRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: spacing.md,
    marginBottom: spacing.lg,
  },
  optionCard: {
    backgroundColor: colors.glass.backgroundLight,
    padding: spacing.md,
    borderRadius: borderRadius.lg,
    width: '100%',
    marginBottom: spacing.sm,
    borderWidth: 1,
    borderColor: colors.glass.border,
  },
  optionCardActive: {
    borderColor: colors.primary.solid,
    backgroundColor: 'rgba(78, 205, 196, 0.1)',
  },
  optionLabel: {
    fontSize: typography.sizes.body,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginBottom: 4,
  },
  optionLabelActive: {
    color: colors.primary.solid,
  },
  optionDesc: {
    fontSize: typography.sizes.caption,
    color: colors.text.secondary,
  },

  // Missing Profile & Settings Styles
  settingsHeader: {
    alignItems: 'center',
    marginBottom: spacing.xl,
    marginTop: spacing.lg,
  },
  appName: {
    fontSize: typography.sizes.title1,
    fontWeight: typography.weights.bold,
    color: colors.text.primary,
    marginBottom: spacing.xs,
  },
  appVersion: {
    fontSize: typography.sizes.caption,
    color: colors.text.tertiary,
    letterSpacing: 1,
  },
  settingsCard: {
    marginBottom: spacing.lg,
    padding: 0,
    overflow: 'hidden',
  },

  // Form Inputs
  inputRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: spacing.md,
  },
  inputGroup: {
    marginBottom: spacing.md,
  },
  inputLabel: {
    fontSize: typography.sizes.caption,
    fontWeight: typography.weights.bold,
    color: colors.text.secondary,
    marginBottom: 8,
    marginLeft: 4,
  },
  modalInput: {
    backgroundColor: colors.glass.backgroundLight,
    borderWidth: 1,
    borderColor: colors.glass.border,
    borderRadius: borderRadius.lg,
    padding: spacing.md,
    color: colors.text.primary,
    fontSize: typography.sizes.body,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: spacing.xl,
  },
});
