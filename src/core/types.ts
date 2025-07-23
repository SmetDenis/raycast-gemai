import { SafetySetting } from "@google/genai";

// Universal AI configuration interface
export interface AIConfig {
  provider: string;
  request: {
    actionName: string;
    origProps: object;
    primaryLanguage: string;
    userPrompt: string;
    attachmentFile?: string;
  };
  model: {
    // Universal fields
    systemPrompt: string;
    modelName: string;
    modelNameUser: string;
    maxOutputTokens: number;
    temperature: number;

    // Provider-specific fields
    geminiApiKey?: string;
    openaiApiKey?: string;
    openaiBaseUrl?: string;

    // Common generation parameters
    topK?: number;
    topP?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;

    // Thinking/reasoning config
    thinkingConfig?: {
      includeThoughts?: boolean;
      thinkingBudget?: number;
    };

    // Gemini-specific safety settings
    safetySettings?: SafetySetting[];
  };
  ui: {
    placeholder: string;
    allowPaste: boolean;
    useSelected: boolean;
  };
  // Chat-specific settings
  chat?: {
    historyMessagesCount?: number;
  };
}

// Legacy interface for backward compatibility
export interface GemAIConfig extends AIConfig {
  provider: "gemini";
  model: AIConfig["model"] & {
    geminiApiKey: string;
    topK: number;
    topP: number;
    frequencyPenalty: number;
    presencePenalty: number;
    safetySettings: SafetySetting[];
  };
}

export interface HistoryItem {
  timestamp: number;
  actionName: string;
  model: string;
  query: string;
  isAttachmentFile?: boolean;
  response: string;
  requestStats: RequestStats;
  stats?: string;
}

export interface ChatMessage {
  id: string;
  timestamp: number;
  role: "user" | "assistant";
  content: string;
  model?: string;
  requestStats?: RequestStats;
  isStreaming?: boolean;
}

export interface RequestStats {
  prompt: number;
  input: number;
  thoughts: number;
  total: number;
  totalTime: number;
  firstRespTime: number;
}

export interface HistoryStats {
  hour: number;
  day: number;
  week: number;
  month: number;
  total: number;
}

export interface RaycastProps {
  arguments: {
    query?: string;
    [key: string]: unknown;
  };
  fallbackText?: string;
  launchType: string;
  launchContext?: {
    props?: RaycastProps;
    attachmentFile?: string;
    gemAiConfig?: GemAIConfig;
    [key: string]: unknown;
  };
}

export interface GroupStats {
  count: number;
  totalCost: number;
  totalTokens: number; // Sum of tokens
  avgTotalTokens: number; // Average tokens per request
  totalTimeSum: number; // Sum of total time in seconds
  avgTotalTime: number; // Average total time per request in seconds
}
