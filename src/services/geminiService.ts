// Gemini AI Service for Food Analysis
import * as SecureStore from 'expo-secure-store';
import type { AIAnalysisResult, NutritionData } from '../types/nutrition';

const API_KEY_STORAGE = 'gemini_api_key';
// Include stable models as fallbacks if user's custom models fail
const GEMINI_MODEL_PREFERENCE = [
    'gemini-2.0-flash',
    'gemini-2.0-flash-lite',
    'gemini-2.5-pro',
    'gemini-2.5-flash',
    'gemini-2.5-flash-lite'
] as const;

// Bulletproof AI Prompt - handles all edge cases
const FOOD_ANALYSIS_PROMPT = `You are a professional nutritionist AI analyzing food images.

CRITICAL RULES:
1. ONLY analyze if the image clearly shows FOOD or BEVERAGES meant for human consumption
2. If the image is NOT food (people, animals, objects, landscapes, text, screenshots, documents, memes, artwork, selfies, etc.), return EXACTLY: {"is_food": false, "reason": "brief explanation of what was detected instead"}
3. If image is blurry, too dark, or unrecognizable, return: {"is_food": false, "reason": "Image too unclear to analyze accurately"}
4. If you cannot confidently identify the food, return: {"is_food": false, "reason": "Unable to identify food items with confidence"}

FOR VALID FOOD IMAGES, return this JSON structure:
{
  "is_food": true,
  "name": "Descriptive food name (e.g., 'Grilled Chicken Breast with Steamed Broccoli and Brown Rice')",
  "items": ["chicken breast", "broccoli", "brown rice"],
  "serving_size": "Estimated portion (e.g., '1 medium plate, approximately 350g')",
  "calories": number (total estimated kcal, whole number),
  "protein": number (grams, whole number),
  "carbs": number (grams, whole number),
  "fats": number (grams, whole number),
  "fiber": number (grams, optional, whole number),
  "confidence": "high" | "medium" | "low",
  "notes": "Brief notes about estimation (e.g., 'Portion size estimated from plate reference')"
}

ESTIMATION GUIDELINES:
- Use USDA nutrition database as primary reference
- For restaurant/homemade food, provide middle-range conservative estimates
- If multiple items visible, calculate and sum all nutritional values
- Always round to nearest whole number
- Use "low" confidence for unusual, mixed, or partially visible dishes
- Use "medium" confidence for common foods with some uncertainty
- Use "high" confidence for clearly identifiable standard portions

COMMON EDGE CASES TO HANDLE:
- Empty plates/containers → NOT food
- Food packaging without visible food → NOT food  
- Recipes/menus/nutrition labels → NOT food
- Pet food → NOT food (unless clearly human food)
- Raw ingredients (valid) vs decorative items (invalid)

IMPORTANT: Return ONLY valid JSON. Do not include markdown formatting (like \`\`\`json), comments, or any conversational text. Just the raw JSON string.`;

/**
 * Get the stored API key
 */
export async function getApiKey(): Promise<string | null> {
    try {
        return await SecureStore.getItemAsync(API_KEY_STORAGE);
    } catch (error) {
        console.error('Error retrieving API key:', error);
        return null;
    }
}

/**
 * Save API key securely
 */
export async function saveApiKey(key: string): Promise<boolean> {
    try {
        await SecureStore.setItemAsync(API_KEY_STORAGE, key.trim());
        return true;
    } catch (error) {
        console.error('Error saving API key:', error);
        return false;
    }
}

/**
 * Delete stored API key
 */
export async function deleteApiKey(): Promise<boolean> {
    try {
        await SecureStore.deleteItemAsync(API_KEY_STORAGE);
        return true;
    } catch (error) {
        console.error('Error deleting API key:', error);
        return false;
    }
}

/**
 * Validate API key format
 */
export function isValidApiKeyFormat(key: string): boolean {
    return key.trim().startsWith('AIza') && key.trim().length > 30;
}

/**
 * Test API key against Gemini API
 */
export async function validateApiKey(key: string): Promise<{ valid: boolean; error?: string }> {
    try {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${key.trim()}`
        );

        if (response.ok) {
            return { valid: true };
        }

        const errorData = await response.json().catch(() => ({}));
        return {
            valid: false,
            error: errorData.error?.message || `API returned status ${response.status}`
        };
    } catch (error) {
        return {
            valid: false,
            error: 'Network error - please check your connection'
        };
    }
}

/**
 * Normalize nutrition data with validation
 */
function normalizeNutritionData(input: unknown): NutritionData | null {
    if (!input || typeof input !== 'object') return null;

    const data = input as Record<string, unknown>;

    // Name is required
    const name = typeof data.name === 'string' && data.name.trim().length > 0
        ? data.name.trim()
        : null;

    if (!name) return null;

    // Helper to safely parse numbers
    const toNumber = (value: unknown, fallback = 0): number => {
        if (typeof value === 'number' && Number.isFinite(value)) {
            return Math.max(0, Math.round(value));
        }
        if (typeof value === 'string') {
            const parsed = Number(value.replace(/[^0-9.-]/g, ''));
            return Number.isFinite(parsed) ? Math.max(0, Math.round(parsed)) : fallback;
        }
        return fallback;
    };

    return {
        name,
        serving_size: typeof data.serving_size === 'string' ? data.serving_size : undefined,
        calories: toNumber(data.calories),
        protein: toNumber(data.protein),
        carbs: toNumber(data.carbs),
        fats: toNumber(data.fats),
        fiber: data.fiber !== undefined ? toNumber(data.fiber) : undefined,
        confidence: ['high', 'medium', 'low'].includes(data.confidence as string)
            ? (data.confidence as 'high' | 'medium' | 'low')
            : 'medium',
        notes: typeof data.notes === 'string' ? data.notes : undefined,
    };
}

/**
 * Handle the parsed response object
 */
function handleParsedResponse(parsed: any): AIAnalysisResult {
    // Check if it's explicitly marked as not food
    if (parsed.is_food === false) {
        return {
            type: 'not_food',
            reason: typeof parsed.reason === 'string'
                ? parsed.reason
                : 'This image does not appear to contain food'
        };
    }

    // It's food - normalize the data
    if (parsed.is_food === true || parsed.name) {
        const normalized = normalizeNutritionData(parsed);
        if (normalized) {
            return { type: 'food', data: normalized };
        }
        return { type: 'error', message: 'Invalid nutrition data in response' };
    }

    return { type: 'error', message: 'Unexpected response format from AI' };
}

/**
 * Parse AI response text with multiple fallback patterns
 */
function parseAIResponse(text: string): AIAnalysisResult {


    if (!text || typeof text !== 'string') {
        return { type: 'error', message: 'Empty response from AI' };
    }

    // 1. Try to clean markdown code blocks first
    let cleanText = text
        .replace(/```json/gi, '') // Remove ```json
        .replace(/```/g, '')      // Remove ```
        .trim();                  // Remove whitespace

    // 2. Try parsing the cleaned text directly
    try {
        const parsed = JSON.parse(cleanText);
        return handleParsedResponse(parsed);
    } catch (e) {
        // Continue to regex patterns if direct parse fails
    }

    // 3. Fallback: Regex extraction for JSON objects
    // Matches nested braces somewhat, but JS regex is limited.
    // We try to find the first '{' and the last '}'
    const firstBrace = cleanText.indexOf('{');
    const lastBrace = cleanText.lastIndexOf('}');

    if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
        const jsonSubstring = cleanText.substring(firstBrace, lastBrace + 1);
        try {
            const parsed = JSON.parse(jsonSubstring);
            return handleParsedResponse(parsed);
        } catch (e) {
            console.error('[Gemini] JSON Parse Error (Regex):', e);
        }
    }

    console.error('[Gemini] Failed to parse response. Final text attempted:', cleanText);
    return { type: 'error', message: 'Could not parse AI response as JSON' };
}

/**
 * Request food analysis from Gemini API
 */
async function requestGeminiAnalysis(
    base64Image: string,
    apiKey: string,
    maxRetries = 2
): Promise<AIAnalysisResult> {
    let lastErrorMessage = '';

    for (const model of GEMINI_MODEL_PREFERENCE) {
        for (let attempt = 0; attempt <= maxRetries; attempt++) {
            try {


                const response = await fetch(
                    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
                    {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            contents: [{
                                parts: [
                                    { text: FOOD_ANALYSIS_PROMPT },
                                    {
                                        inline_data: {
                                            mime_type: 'image/jpeg',
                                            data: base64Image,
                                        }
                                    }
                                ]
                            }],
                            generationConfig: {
                                temperature: 0.4,
                                maxOutputTokens: 4096, // Increased limit to prevent JSON truncation
                            },
                        }),
                    }
                );

                if (!response.ok) {
                    const errData = await response.json().catch(() => ({}));
                    lastErrorMessage = errData.error?.message || `Status ${response.status}`;
                    console.warn(`[Gemini] Model ${model} failed: ${lastErrorMessage}`);

                    // If 4xx error (except 429), break model loop as it's likely a request/key issue
                    if (response.status >= 400 && response.status < 500 && response.status !== 429) {
                        break;
                    }
                    continue;
                }

                const data = await response.json();
                const candidate = data.candidates?.[0];
                const textResponse = candidate?.content?.parts?.[0]?.text;
                const finishReason = candidate?.finishReason;

                if (finishReason !== 'STOP') {
                    console.warn(`[Gemini] Warning: Finish reason was ${finishReason}`);
                }

                if (!textResponse) {
                    lastErrorMessage = 'Empty response from AI';
                    console.warn(`[Gemini] Empty response from ${model}`);
                    continue;
                }

                // Try to parse. If it fails, treat it as a retry-able error so we try the next model.
                const result = parseAIResponse(textResponse);

                if (result.type === 'error') {
                    lastErrorMessage = result.message || 'Parsing failed';
                    console.warn(`[Gemini] Parsing failed for ${model}: ${lastErrorMessage}`);
                    continue; // RETRY with next attempt/model
                }

                return result;

            } catch (error: any) {
                console.error(`Gemini analysis error (${model}):`, error);

                let errorMessage = error.message || 'Network error';
                if (errorMessage.includes('Network request failed') || errorMessage.includes('fetch')) {
                    errorMessage = 'No internet connection. Please check your network.';
                }

                lastErrorMessage = errorMessage;
            }
        }
    }

    return {
        type: 'error',
        message: `Analysis failed: ${lastErrorMessage || 'Please check your internet connection'}`
    };
}

/**
 * Analyze food image using Gemini Vision
 */
export async function analyzeFood(base64Image: string): Promise<AIAnalysisResult> {
    const apiKey = await getApiKey();

    if (!apiKey) {
        return { type: 'error', message: 'API key not configured. Please add your key in Settings.' };
    }

    if (!isValidApiKeyFormat(apiKey)) {
        return { type: 'error', message: 'Invalid API key format.' };
    }

    return requestGeminiAnalysis(base64Image, apiKey);
}

const WEEKLY_ANALYSIS_PROMPT = `You are a professional nutritionist AI analyzing a user's weekly nutrition data.

INPUT DATA:
- User Profile: {PROFILE_JSON}
- Weekly Log: {WEEK_DATA_JSON}

TASK:
Analyze the user's nutrition progress over the last week relative to their goals.
Provide a concise, motivating, and personalized insight in 2-3 short sentences.
Focus on:
1. Calorie adherence (deficit/surplus consistency).
2. Macro trends (e.g., "Protein is consistently low").
3. Specific advice based on their goal (Lose/Gain/Maintain).

OUTPUT FORMAT:
Return ONLY the raw text response. Do not use JSON, markdown formatting, or bullet points. Keep it conversational but professional.`;

/**
 * Request weekly analysis from Gemini
 */
export async function analyzeWeeklyProgress(
    weekData: any[],
    userProfile: any
): Promise<string> {
    const apiKey = await getApiKey();
    if (!apiKey) return "Please set your API key in Settings to get AI insights.";

    // Filter relevant profile data (exclude name/personal info)
    const profileContext = {
        gender: userProfile.gender,
        age: userProfile.age,
        height: userProfile.height,
        weight: userProfile.weight,
        activityLevel: userProfile.activityLevel,
        fitnessGoal: userProfile.fitnessGoal,
        dietType: userProfile.dietType,
    };

    // Simplify week data to save tokens
    const weekContext = weekData.map(d => ({
        date: new Date(d.date || d.timestamp).toDateString(),
        calories: d.calories,
        protein: d.protein,
        carbs: d.carbs,
        fats: d.fats,
        water: d.waterIntake
    }));

    const prompt = WEEKLY_ANALYSIS_PROMPT
        .replace('{PROFILE_JSON}', JSON.stringify(profileContext))
        .replace('{WEEK_DATA_JSON}', JSON.stringify(weekContext));

    let lastErrorMessage = '';

    for (const model of GEMINI_MODEL_PREFERENCE) {
        try {
            const response = await fetch(
                `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`,
                {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        contents: [{ parts: [{ text: prompt }] }],
                        generationConfig: {
                            temperature: 0.7,
                            maxOutputTokens: 150,
                        },
                    }),
                }
            );

            if (!response.ok) {
                const errData = await response.json().catch(() => ({}));
                lastErrorMessage = errData.error?.message || `API Status ${response.status}`;
                console.error(`Gemini Weekly Error (${model}):`, lastErrorMessage);
                continue;
            }

            const data = await response.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) return text.trim();

        } catch (e: any) {
            console.error(`Error with model ${model}:`, e);
            lastErrorMessage = e.message || 'Network Error';
            continue;
        }
    }

    return `Unable to generate insight. Details: ${lastErrorMessage || 'Service unavailable'}`;
}

/**
 * Get user-friendly message for non-food results
 */
export function getNotFoodMessage(reason: string): string {
    const defaultMessage = "Hmm, that doesn't look like food! Try taking a photo of your meal.";

    if (!reason) return defaultMessage;

    const lowerReason = reason.toLowerCase();

    if (lowerReason.includes('blur') || lowerReason.includes('unclear')) {
        return "The image is a bit unclear. Try taking a clearer photo with better lighting.";
    }

    if (lowerReason.includes('person') || lowerReason.includes('selfie')) {
        return "Nice photo, but I need to see the food! Try pointing the camera at your meal.";
    }

    if (lowerReason.includes('text') || lowerReason.includes('document') || lowerReason.includes('menu')) {
        return "I see text/documents. I need an actual photo of food to analyze its nutrition.";
    }

    if (lowerReason.includes('animal') || lowerReason.includes('pet')) {
        return "Cute! But I can only analyze human food. Snap a pic of what you're eating!";
    }

    if (lowerReason.includes('empty') || lowerReason.includes('plate')) {
        return "Looks like an empty plate! Add some food and I'll analyze it for you.";
    }

    return defaultMessage;
}
