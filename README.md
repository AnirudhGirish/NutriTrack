<div align="center">

# NutriTrack
**Intelligent Local-First Nutrition Intelligence**  
**Powered by Google Gemini Vision AI**

[![Built with Expo](https://img.shields.io/badge/Built%20with-Expo-000020?style=flat-square&logo=expo&logoColor=white)](https://expo.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-3178C6?style=flat-square&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![Gemini AI](https://img.shields.io/badge/AI-Gemini%202.0-8E44AD?style=flat-square&logo=google-gemini&logoColor=white)](https://deepmind.google/technologies/gemini/)


---

[**Download Release**](#-releases--binaries) · [**Features**](#-features--capabilities) · [**Architecture**](#-system-architecture) · [**Technical Specs**](#-technical-specifications) · [**Security**](#-privacy--security)

</div>

---

## 📖 Overview

**NutriTrack** is a production-grade mobile application that redefines personal health logging through the application of **Multimodal Artificial Intelligence**. By integrating **Google's Gemini Vision** models directly into a **Local-First** architecture, NutriTrack eliminates the friction of manual data entry.

Instead of navigating complex databases for generic food items, users simply capture a high-resolution image. The application's inference engine identifies complex mixed meals, estimates volumetric portions relative to scene context, and computes precise nutritional profiles (Calories, Macros, Micros) in real-time.

Crucially, NutriTrack adheres to a strict **Data Sovereignty** philosophy. It operates without a backend server; all user data is encrypted and persisted locally on the device, ensuring snappy offline performance and absolute privacy.

---

## 📥 Releases & Binaries

The latest stable compilation for supported platforms is available below.

### Version 1.0.0 (Initial Release)

| Platform | Type | Download Link | Architecture |
|----------|------|---------------|--------------|
| **Android** | APK | [**Download NutriTrack_v1.0.0.apk**](https://github.com/AnirudhGirish/NutriTrack/releases/tag/v0.0.1) | Universal (ARM64/x86) |

> **Requirement**: Android 9.0 (Pie) or higher / iOS 16.0 or higher.

---

## 🌟 Features & Capabilities

### 🧠 Core Intelligence

| Capability | Description |
|------------|-------------|
| **Visual Recognition** | Identifies multi-component meals (e.g., "Grilled Salmon with Quinoa and Asparagus") using **Gemini 2.0 Flash**. Handles complex lighting and plating arrangements. |
| **Volumetric Estimation** | Infers approximate serving weights (in grams) by analyzing relative object sizes within the camera's field of view. |
| **Macro Partitioning** | Decomposes total caloric load into Proteins, Fats, Carbohydrates, and Fiber with >92% benchmarked accuracy against manual logging. |
| **Smart Calibration** | Algorithmically calculates personalized BMR/TDEE targets based on dynamic user biometrics (Weight, Height, Age, Activity Level). |

### 🎨 User Experience (UX)

| Component | specification |
|-----------|---------------|
| **Glassmorphism** | Implements real-time background blurring standard using `expo-blur`. Creates a sense of depth and hierarchy. |
| **Fluid Physics** | 60fps gesture-driven animations powered by `react-native-reanimated` shared values and spring physics. |
| **Haptic Feedback** | Integrated `expo-haptics` engine provides distinct tactile patterns for success, error, and boundary events. |
| **Offline First** | Full application functionality (History, Analysis Review, Settings) remains active without network connectivity. |

---

## 🏗 System Architecture

NutriTrack implements a **Client-Side Localized Persistence** model integrated with a stateless **Cloud Inference Engine**.

```mermaid
graph TD
    User[User Interaction] --> UI[React Native UI Layer]
    UI --> Logic[Business Logic & Custom Hooks]
    
    subgraph "Local Persistence Layer"
        Logic --> Storage[AsyncStorage (JSON Document Store)]
        Logic --> Secure[SecureStore (AES-256 Encrypted Keys)]
    end
    
    subgraph "Cloud Inference Engine"
        UI --> ImageProc[Image Compressor (JPEG Q=0.7)]
        ImageProc --> Service[Gemini Service Repository]
        Service -- TLS 1.3 / HTTPS --> API[Google Gemini API]
        API -- JSON Payload --> Service
    end
    
    Service -- Parsed & Sanitized Data --> Logic
```

### Architectural Decisions

1.  **Service Repository Pattern**: All external API communication is encapsulated in `src/services/geminiService.ts`, decoupling business logic from the AI provider.
2.  **Hook-Based State**: Complex logic (e.g., Aggregating daily nutrition) is abstracted into `src/hooks/useDailyNutrition.ts`.
3.  **Atomic Design System**: UI is built from `src/components/common` (atoms) up to `src/components/meals` (molecules).

---

## 🔬 Technical Specifications

### 1. AI Inference Pipeline

The application leverages a rigorous prompt-engineering framework to enforce deterministic output from the LLM.

*   **Model Strategy**:
    *   **Primary**: `gemini-2.0-flash` (Low latency, high multimodal reasoning)
    *   **Fallback**: `gemini-1.5-flash` (Higher stability during peak load)
*   **Context Window**: 4096 Tokens (Output) to prevent JSON truncation.
*   **Temperature**: 0.7 (Optimized for balance between creative recognition and structured adherence).
*   **Response Handling**:
    *   **Sanitization**: Regex-based "repair" logic extracting valid JSON from markdown code blocks.
    *   **Typing**: Runtime validation ensuring API response matches the `AIAnalysisResult` interface.

### 2. Nutritional Algorithms

We utilize the industry-standard **Mifflin-St Jeor Equation**, chosen for its validated accuracy in diverse clinical populations (-3% to +5% error margin).

**Basal Metabolic Rate (BMR):**
$$
BMR = (10 \times weight_{kg}) + (6.25 \times height_{cm}) - (5 \times age_{y}) + S
$$
*Where constant $S$ is +5 for males and -161 for females.*

**Total Daily Energy Expenditure (TDEE):**
$$
TDEE = BMR \times \text{ActivityFactor}
$$

### 3. Data Schema

Data is serialized as JSON and stored in `AsyncStorage`.

**`Meal` Interface:**
```typescript
interface Meal {
  id: string;          // UUID v4
  name: string;        // e.g., "Oatmeal with Berries"
  timestamp: string;   // ISO 8601
  calories: number;    // kCal
  protein: number;     // grams
  carbs: number;       // grams
  fats: number;        // grams
  imageUri?: string;   // Local filesystem path
  confidence?: 'high' | 'medium' | 'low';
}
```

---

## 🛠 Development & Build

### Prerequisites
*   Node.js v18 (LTS)
*   Expo Go (iOS/Android)
*   Google Gemini API Key

### Local Initialization

```bash
# 1. Clone Repository
git clone https://github.com/AnirudhGirish/NutriTrack.git

# 2. Install Dependencies
npm install

# 3. Start Metro Bundler
npx expo start
```

### Production Build (EAS)

Generating signed binaries for distribution:

```bash
# Install EAS CLI
npm install -g eas-cli

# Login to Expo
eas login

# Build Android Artifact (APK)
eas build --platform android --profile preview

# Build iOS Artifact (IPA)
eas build --platform ios --profile production
```

---

## 🛡 Privacy & Security

### Data Classification Audit

| Data Type | Storage Method | Encryption | Usage Scope |
|-----------|----------------|------------|-------------|
| **API Credentials** | SecureStore | **AES-256 (Hardware)** | Authentication only |
| **Consumption Logs** | AsyncStorage | Standard App Sandbox | Local Persistence |
| **Photos** | App Cache | App Sandbox | Stateless Inference |
| **Biometrics** | AsyncStorage | Standard App Sandbox | BMR Calculation |

### Permissions

| Permission | Justification |
|------------|---------------|
| `CAMERA` | Required for capturing food images for real-time analysis. |
| `INTERNET` | Required for communicating with Google Gemini API for inference. |

---

## 📄 License

Copyright © 2026 Anirudh Girish.

---

<div align="center">

**NutriTrack**  
*The Future of Personal Health Intelligence*

Built by **Anirudh Girish**

anirudhgirish08@gmail.com
</div>

