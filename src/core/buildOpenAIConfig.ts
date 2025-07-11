import { allModels, getModelInfo } from "./models";
import { AIConfig, RaycastProps } from "./types";
import {
  buildRealPrompt,
  getCurrentModel,
  getTemperature,
  getConfigPreferences,
  getHistoryMessagesCount,
} from "./configUtils";

// OpenAI reasoning models (o-series)
const reasoningModels = ["o1-preview", "o1-mini", "o4-mini"];

export function buildOpenAIConfig(actionName: string, props: RaycastProps, fallbackPrompt?: string): AIConfig {
  const prefs = getConfigPreferences();

  const currentModelName = getCurrentModel(prefs);
  const [isCustomPrompt, realSystemPrompt] = buildRealPrompt(actionName, prefs, fallbackPrompt);

  // Configure reasoning for o-series models
  const isReasoningModel = reasoningModels.includes(currentModelName) || 
                          currentModelName.startsWith("o1") || 
                          currentModelName.startsWith("o4");
  const modelInfo = getModelInfo(currentModelName, prefs);
  const thinkingConfig =
    isReasoningModel && modelInfo
      ? {
          includeThoughts: false,
          thinkingBudget: modelInfo.thinking_budget,
        }
      : undefined;

  const config: AIConfig = {
    provider: "openai",
    model: {
      // OpenAI-specific fields
      openaiApiKey: prefs.openaiApiKey?.trim(),
      openaiBaseUrl: prefs.openaiBaseUrl?.trim() || undefined,

      // Universal fields
      modelName: currentModelName,
      modelNameUser: (isCustomPrompt ? "💭 " : "") + modelInfo.name,
      maxOutputTokens: isReasoningModel ? 16000 : 4000, // Reasoning models need more tokens due to thinking process
      temperature: isReasoningModel ? 1 : getTemperature(prefs), // Reasoning models require temperature = 1
      systemPrompt: realSystemPrompt,

      // OpenAI generation parameters (only for non-reasoning models)
      topP: isReasoningModel ? undefined : 0.95,
      frequencyPenalty: isReasoningModel ? undefined : 0,
      presencePenalty: isReasoningModel ? undefined : 0,

      // Reasoning configuration for o-series models
      ...(thinkingConfig && { thinkingConfig }),
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
