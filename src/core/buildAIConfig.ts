import { HarmBlockThreshold, HarmCategory } from "@google/genai";
import { buildGemAIConfig } from "./buildGemAIConfig";
import { buildOpenAIConfig } from "./buildOpenAIConfig";
import { allModels, getModelInfo, detectProviderFromModelName } from "./models";
import { AIConfig, GemAIConfig, RaycastProps } from "./types";
import { getCurrentModel, getConfigPreferences, getTemperature, getHistoryMessagesCount } from "./configUtils";
import { CMD_COUNT_TOKENS, CMD_HISTORY, CMD_STATS } from "./commands";

/**
 * List of utility commands that don't need complex system prompts
 */
const UTILITY_COMMANDS = [CMD_COUNT_TOKENS, CMD_HISTORY, CMD_STATS];

/**
 * Creates a minimal AI configuration for utility commands
 */
function buildUtilityConfig(actionName: string, props: RaycastProps, provider: string): AIConfig {
  const prefs = getConfigPreferences();
  const currentModelName = getCurrentModel(prefs);
  const modelInfo = getModelInfo(currentModelName, prefs);

  const config: AIConfig = {
    provider: provider,
    request: {
      actionName: actionName,
      origProps: props,
      primaryLanguage: prefs.primaryLanguage || "English",
      userPrompt: props.arguments?.query || props.fallbackText || "",
    },
    model: {
      systemPrompt: "", // No system prompt for utility commands
      modelName: currentModelName,
      modelNameUser: modelInfo.name,
      maxOutputTokens: 4096, // Minimal for utility commands
      temperature: getTemperature(prefs),
      geminiApiKey: prefs.geminiApiKey?.trim(),
      openaiApiKey: prefs.openaiApiKey?.trim(),
      openaiBaseUrl: prefs.openaiBaseUrl?.trim(),
      topK: 0,
      topP: 0.95,
      frequencyPenalty: 0,
      presencePenalty: 0,
      safetySettings: [
        { category: HarmCategory.HARM_CATEGORY_HARASSMENT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_HATE_SPEECH, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT, threshold: HarmBlockThreshold.BLOCK_NONE },
        { category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT, threshold: HarmBlockThreshold.BLOCK_NONE },
      ],
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

/**
 * Universal AI configuration builder that routes to appropriate provider
 * based on the selected model's provider field in models.ts
 */
export function buildAIConfig(
  actionName: string,
  props: RaycastProps,
  fallbackPrompt?: string,
): AIConfig | GemAIConfig {
  const prefs = getConfigPreferences();
  const currentModelName = getCurrentModel(prefs);

  // Get provider from model definition or detect for custom models
  const modelInfo = getModelInfo(currentModelName, prefs);
  const provider = modelInfo.provider || "gemini";

  // Special handling for utility commands - create minimal configuration
  if (UTILITY_COMMANDS.includes(actionName)) {
    return buildUtilityConfig(actionName, props, provider);
  }

  // Route to appropriate provider configuration for regular commands
  switch (provider) {
    case "openai":
      return buildOpenAIConfig(actionName, props, fallbackPrompt);

    case "gemini":
    default:
      // For Gemini, return the legacy GemAIConfig for backward compatibility
      return buildGemAIConfig(actionName, props, fallbackPrompt);
  }
}

/**
 * Legacy function for backward compatibility
 * @deprecated Use buildAIConfig instead
 */
export function buildGemAIConfigCompat(actionName: string, props: RaycastProps, fallbackPrompt?: string): GemAIConfig {
  const config = buildAIConfig(actionName, props, fallbackPrompt);

  // Ensure backward compatibility by casting to GemAIConfig if it's Gemini
  if (config.provider === "gemini") {
    return config as GemAIConfig;
  }

  // If somehow we get an OpenAI config, throw an error for this legacy function
  throw new Error("buildGemAIConfigCompat can only be used with Gemini models");
}
