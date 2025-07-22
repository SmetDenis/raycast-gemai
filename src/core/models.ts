export const DEFAULT_MODEL = "gemini-2.5-flash";

export const DEFAULT_TEMP = 0.2;
export const DEFAULT_TEMP_CREATIVE = 0.6;
export const DEFAULT_TEMP_ARTIST = 1.0;

export interface ModelInfo {
  id: string;
  name: string;
  price_input: number;
  price_output: number;
  price_output_thinking: number;
  thinking_budget: number;
  provider: string;
}

/**
 * Determines provider for custom models based on common naming patterns
 */
export function detectProviderFromModelName(modelName: string): string {
  return modelName.toLowerCase();
}

/**
 * Gets custom model pricing from preferences
 */
export function getCustomModelPricing(prefs: any): { inputPrice?: number; outputPrice?: number } {
  const inputPrice = prefs.customModelInputPrice?.trim();
  const outputPrice = prefs.customModelOutputPrice?.trim();

  return {
    inputPrice: inputPrice && inputPrice !== "" ? parseFloat(inputPrice) : undefined,
    outputPrice: outputPrice && outputPrice !== "" ? parseFloat(outputPrice) : undefined,
  };
}

/**
 * Gets model info for any model, including custom models with pricing
 */
export function getModelInfo(modelName: string, prefs?: any): ModelInfo {
  const existingModel = allModels[modelName];

  if (existingModel) {
    return existingModel;
  }

  // For custom models, create ModelInfo with custom pricing or defaults
  const customPricing = prefs ? getCustomModelPricing(prefs) : {};

  // Default pricing for unknown models (conservative estimates)
  const defaultInputPrice = 1.0; // $1.00 per 1M tokens
  const defaultOutputPrice = 3.0; // $3.00 per 1M tokens

  return {
    id: modelName,
    name: modelName,
    price_input: customPricing.inputPrice ?? defaultInputPrice,
    price_output: customPricing.outputPrice ?? defaultOutputPrice,
    price_output_thinking: customPricing.outputPrice ?? defaultOutputPrice,
    thinking_budget: 0,
    provider: detectProviderFromModelName(modelName),
  };
}

export const allModels: Record<string, ModelInfo> = {
  "gemini-2.5-flash": {
    id: "gemini-2.5-flash",
    name: "2.5 Flash",
    price_input: 0.15,
    price_output: 0.6,
    price_output_thinking: 3.5,
    thinking_budget: 0,
    provider: "gemini",
  },
  "gemini-2.5-flash__thinking": {
    id: "gemini-2.5-flash",
    name: "2.5 Flash (thinking)",
    price_input: 0.15,
    price_output: 0.6,
    price_output_thinking: 3.5,
    thinking_budget: 500,
    provider: "gemini",
  },
  "gemini-2.5-pro": {
    id: "gemini-2.5-pro",
    name: "2.5 Pro",
    price_input: 1.25,
    price_output: 10,
    price_output_thinking: 10,
    thinking_budget: 4000,
    provider: "gemini",
  },

  "o4-mini": {
    id: "o4-mini",
    name: "o4-mini",
    price_input: 1.1,
    price_output: 4.4,
    price_output_thinking: 4.4,
    thinking_budget: 32768, // 32K thinking tokens budget for reasoning model
    provider: "openai",
  },

  "custom": {
    id: "custom",
    name: "Custom",
    price_input: 1,
    price_output: 1,
    price_output_thinking: 1,
    thinking_budget: 32768, // 32K thinking tokens budget for reasoning model
    provider: "custom",
  },
};
