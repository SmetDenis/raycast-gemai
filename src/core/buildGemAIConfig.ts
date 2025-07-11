import { HarmBlockThreshold, HarmCategory } from "@google/genai";
import { allModels, getModelInfo } from "./models";
import { GemAIConfig, RaycastProps } from "./types";
import {
  buildRealPrompt,
  getCurrentModel,
  getTemperature,
  getConfigPreferences,
  getHistoryMessagesCount,
} from "./configUtils";

const thinkingModels = [
  // Stable models (January 2025)
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.5-pro",
  
  // Legacy models (for backward compatibility)
  "gemini-2.5-flash-preview-04-17",
  "gemini-2.5-flash-preview-04-17__thinking",
  "gemini-2.5-pro-preview-05-06",
];

export function buildGemAIConfig(actionName: string, props: RaycastProps, fallbackPrompt?: string): GemAIConfig {
  const prefs = getConfigPreferences();

  const currentModelName = getCurrentModel(prefs);
  const [isCustomPrompt, realSystemPrompt] = buildRealPrompt(actionName, prefs, fallbackPrompt);
  const modelInfo = getModelInfo(currentModelName, prefs);
  const thinkingConfig = modelInfo ? { includeThoughts: false, thinkingBudget: modelInfo.thinking_budget } : undefined;

  const config: GemAIConfig = {
    provider: "gemini",
    model: {
      geminiApiKey: prefs.geminiApiKey.trim(),
      modelName: currentModelName,
      modelNameUser: (isCustomPrompt ? "💭 " : "") + modelInfo.name,
      maxOutputTokens: 32000,
      ...(thinkingModels.includes(currentModelName) && thinkingConfig && { thinkingConfig }),
      temperature: getTemperature(prefs),
      topP: 0.95,
      topK: 0,
      frequencyPenalty: 0,
      presencePenalty: 0,
      systemPrompt: realSystemPrompt,
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ],
    },

    request: {
      actionName: actionName,
      origProps: props,
      primaryLanguage: prefs.primaryLanguage,
      userPrompt: props.arguments?.query || props.fallbackText || "",
    },

    ui: {
      placeholder: "Your question to AI here",
      allowPaste: true,
      useSelected: true,
    },
  };

  // Add chat-specific settings for chat command
  if (actionName === "chat") {
    config.chat = {
      historyMessagesCount: getHistoryMessagesCount(prefs),
    };
  }

  return config;
}
