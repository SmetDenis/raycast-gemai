import { createPartFromUri, GoogleGenAI, Part } from "@google/genai";
import { showToast, Toast } from "@raycast/api";
import * as fs from "fs";
import mime from "mime-types";
import OpenAI from "openai";
import * as path from "path";
import { getModelInfo } from "./models";
import { AIConfig, RequestStats } from "./types";

// Universal AI Provider interface
export interface AIProvider {
  prepareAttachment(filePath?: string): Promise<any>;
  sendRequest(config: AIConfig, query?: string, attachment?: any): AsyncGenerator<any, void, unknown>;
  getTokenStats(config: AIConfig, usageMetadata: any, query: string, attachment?: any): Promise<RequestStats>;
  countTokens(config: AIConfig, text: string, attachment?: any): Promise<number>;
}

// Gemini Provider Implementation
export class GeminiProvider implements AIProvider {
  private ai: GoogleGenAI;

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey: apiKey || "" });
  }

  async prepareAttachment(actualFilePath?: string): Promise<Part | null> {
    if (!actualFilePath || !fs.existsSync(actualFilePath) || !fs.lstatSync(actualFilePath).isFile()) {
      return null;
    }

    try {
      const fileName = path.basename(actualFilePath);
      const mimeType = mime.lookup(fileName) || "application/octet-stream";
      const fileBuffer = fs.readFileSync(actualFilePath);
      const blob = new Blob([fileBuffer], { type: mimeType });
      const file = await this.ai.files.upload({ file: blob, config: { displayName: fileName, mimeType: mimeType } });

      if (file.name) {
        let getFile = await this.ai.files.get({ name: file.name });
        while (getFile.state === "PROCESSING") {
          await new Promise((resolve) => setTimeout(resolve, 1000));
          getFile = await this.ai.files.get({ name: file.name });
        }

        if (getFile.state === "FAILED") {
          throw new Error("File processing failed");
        }
      }

      if (file.uri && file.mimeType) {
        return createPartFromUri(file.uri, file.mimeType);
      }

      return null;
    } catch (fileError: any) {
      console.error("Error processing file:", fileError);
      await showToast({ style: Toast.Style.Failure, title: "File processing failed", message: fileError.message });
      return null;
    }
  }

  async *sendRequest(config: AIConfig, query?: string, filePart?: Part): AsyncGenerator<any, void, unknown> {
    const contents = [query || ""];
    if (filePart) {
      // @ts-ignore
      contents.push(filePart);
    }

    const requestParams = {
      model: config.model.modelName.replace("__thinking", ""),
      contents: contents,
      config: {
        maxOutputTokens: config.model.maxOutputTokens,
        temperature: config.model.temperature,
        thinkingConfig: config.model.thinkingConfig,
        systemInstruction: config.model.systemPrompt,
        frequencyPenalty: config.model.frequencyPenalty,
        presencePenalty: config.model.presencePenalty,
        topK: config.model.topK,
        topP: config.model.topP,
        safetySettings: config.model.safetySettings,
      },
    };

    const response = await this.ai.models.generateContentStream(requestParams);

    for await (const chunk of response) {
      yield chunk;
    }
  }

  async getTokenStats(config: AIConfig, usageMetadata: any, query: string, filePart?: Part): Promise<RequestStats> {
    const inputTokens = await this.ai.models.countTokens({
      model: config.model.modelName.replace("__thinking", ""),
      contents: filePart ? [query, filePart] : [query],
    });

    // For Gemini:
    // - promptTokenCount = all input tokens (system + user)
    // - candidatesTokenCount = output tokens from model
    // - totalTokenCount = promptTokenCount + candidatesTokenCount

    const outputTokens = usageMetadata?.candidatesTokenCount ?? 0;
    const systemPromptTokens = Math.ceil((config.model.systemPrompt || "").length / 4);
    const userInputTokens = Math.max(0, (usageMetadata?.promptTokenCount ?? 0) - systemPromptTokens);

    return {
      prompt: usageMetadata?.promptTokenCount ?? 0, // All input tokens (system + user)
      input: userInputTokens, // Estimated user-only tokens
      thoughts: usageMetadata?.thoughtsTokenCount ?? 0, // Thinking tokens for reasoning models
      total: usageMetadata?.totalTokenCount ?? 0,
      firstRespTime: 0,
      totalTime: 0,
    };
  }

  async countTokens(config: AIConfig, text: string, attachment?: any): Promise<number> {
    try {
      const contents = [text];
      if (attachment) {
        // @ts-ignore
        contents.push(attachment);
      }

      const result = await this.ai.models.countTokens({
        model: config.model.modelName.replace("__thinking", ""),
        contents: contents,
      });

      return result.totalTokens || 0;
    } catch (error: any) {
      // Fallback to character-based estimation
      console.error("[GeminiProvider.countTokens] API failed:", error.message);
      console.error("[GeminiProvider.countTokens] Full error:", error);
      const estimated = Math.ceil(text.length / 4);
      console.log("[GeminiProvider.countTokens] Using character-based estimation:", estimated);
      return estimated;
    }
  }
}

// OpenAI Provider Implementation
export class OpenAIProvider implements AIProvider {
  private client: OpenAI;

  constructor(apiKey: string, baseURL?: string) {
    this.client = new OpenAI({
      apiKey: apiKey || "",
      ...(baseURL && { baseURL }),
    });
  }

  async prepareAttachment(actualFilePath?: string): Promise<any> {
    if (!actualFilePath || !fs.existsSync(actualFilePath) || !fs.lstatSync(actualFilePath).isFile()) {
      return null;
    }

    try {
      const fileName = path.basename(actualFilePath);
      const mimeType = mime.lookup(fileName) || "application/octet-stream";

      // For images, encode as base64 for vision models
      if (mimeType.startsWith("image/")) {
        const fileBuffer = fs.readFileSync(actualFilePath);
        const base64 = fileBuffer.toString("base64");
        return {
          type: "image_url",
          image_url: {
            url: `data:${mimeType};base64,${base64}`,
          },
        };
      }

      // For other files, upload to OpenAI (if supported)
      // Note: OpenAI file uploads are mainly for assistants API
      // For now, we'll handle images only
      return null;
    } catch (fileError: any) {
      console.error("Error processing file:", fileError);
      await showToast({ style: Toast.Style.Failure, title: "File processing failed", message: fileError.message });
      return null;
    }
  }

  async *sendRequest(originalConfig: AIConfig, query?: string, attachment?: any): AsyncGenerator<any, void, unknown> {
    let config = originalConfig;

    // Check if this is a reasoning model with an image attachment
    const isReasoningModel = config.model.modelName.startsWith("o1");

    // Auto-switch reasoning models to vision-capable models when image is provided
    if (isReasoningModel && attachment) {
      config = switchToVisionModel(config);

      await showToast({
        style: Toast.Style.Success,
        title: "Model auto-switched",
        message: `Switched to GPT-4o for image processing (was ${originalConfig.model.modelNameUser})`,
      });
    }

    // Re-check if this is still a reasoning model after potential switch
    const isFinalReasoningModel = config.model.modelName.startsWith("o1");

    const messages: any[] = [];

    // For reasoning models, include system prompt in user message
    // For regular models, use separate system message
    if (!isFinalReasoningModel) {
      messages.push({
        role: "system",
        content: config.model.systemPrompt,
      });
    }

    // Prepare user message with optional attachment
    let userContent = query || "";

    // For reasoning models, prepend system prompt to user message
    if (isFinalReasoningModel && config.model.systemPrompt) {
      userContent = `${config.model.systemPrompt}\n\n---\n\n${userContent}`;
    }

    const userMessage: any = {
      role: "user",
      content: attachment ? [{ type: "text", text: userContent }, attachment] : userContent,
    };

    messages.push(userMessage);

    const requestParams: any = {
      model: config.model.modelName,
      messages: messages,
      stream: true,
      stream_options: {
        include_usage: true, // Required to get usage stats in streaming mode
      },
    };

    requestParams.temperature = config.model.temperature;
    requestParams.top_p = config.model.topP;
    requestParams.frequency_penalty = config.model.frequencyPenalty;
    requestParams.presence_penalty = config.model.presencePenalty;

    const response = (await this.client.chat.completions.create(requestParams)) as any;

    for await (const chunk of response) {
      yield {
        text: chunk.choices[0]?.delta?.content || "",
        usageMetadata: chunk.usage, // Will be available on last chunk
        finishReason: chunk.choices[0]?.finish_reason,
      };
    }
  }

  async getTokenStats(config: AIConfig, usageMetadata: any, query: string, attachment?: any): Promise<RequestStats> {
    // Use real usage data from OpenAI API response when available
    if (usageMetadata) {
      // Calculate approximate user input tokens by estimating system prompt tokens
      const systemPromptTokens = Math.ceil((config.model.systemPrompt || "").length / 4);
      const userInputTokens = Math.max(0, (usageMetadata.prompt_tokens || 0) - systemPromptTokens);

      return {
        prompt: usageMetadata.prompt_tokens || 0, // All input tokens (system + user)
        input: userInputTokens, // Estimated user-only tokens
        thoughts: usageMetadata.completion_tokens_details?.reasoning_tokens || 0, // o1 reasoning tokens
        total: usageMetadata.total_tokens || 0,
        firstRespTime: 0,
        totalTime: 0,
      };
    }

    // Fallback: approximate token count when usage data is not available
    const estimatedUserTokens = Math.ceil(query.length / 4);
    const estimatedSystemTokens = Math.ceil((config.model.systemPrompt || "").length / 4);
    const estimatedTotalPrompt = estimatedUserTokens + estimatedSystemTokens;

    return {
      prompt: estimatedTotalPrompt, // System + user
      input: estimatedUserTokens, // User only
      thoughts: 0,
      total: estimatedTotalPrompt,
      firstRespTime: 0,
      totalTime: 0,
    };
  }

  async countTokens(config: AIConfig, text: string, attachment?: any): Promise<number> {
    // For OpenAI, we use character-based estimation
    // More accurate methods would require tiktoken library or API calls
    // Using ~4 characters per token as a reasonable approximation
    let tokenCount = Math.ceil(text.length / 4);

    // Add estimated tokens for attachments (if any)
    if (attachment && attachment.type === "image_url") {
      // Images typically consume 85-170 tokens per tile (512x512 px)
      // Adding a base estimate of 100 tokens per image
      tokenCount += 100;
    }

    return tokenCount;
  }
}

// Helper function to switch reasoning models to vision-capable models when needed
function switchToVisionModel(config: AIConfig): AIConfig {
  const isReasoningModel = config.model.modelName.startsWith("o1");

  if (!isReasoningModel) {
    return config; // No change needed
  }

  // Switch to GPT-4o for vision tasks
  const visionModel = getModelInfo("gpt-4o");
  if (!visionModel) {
    throw new Error("GPT-4o model not found for vision fallback");
  }

  const newConfig = {
    ...config,
    model: {
      ...config.model,
      modelName: "gpt-4o",
      modelNameUser: "GPT-4o (Auto-switched for vision)",
      // Keep same settings but use vision model parameters
      maxOutputTokens: 4096, // GPT-4o default
      temperature: 0.7,
      thinkingConfig: {
        ...config.model.thinkingConfig,
        thinkingBudget: 0, // Regular model, no thinking budget
      },
    },
  };

  return newConfig;
}

// Provider Factory
export function createAIProvider(config: AIConfig): AIProvider {
  switch (config.provider) {
    case "openai":
      if (!config.model.openaiApiKey) {
        throw new Error("OpenAI API key is required for OpenAI models");
      }
      return new OpenAIProvider(config.model.openaiApiKey, config.model.openaiBaseUrl);

    case "gemini":
    default:
      if (!config.model.geminiApiKey) {
        throw new Error("Gemini API key is required for Gemini models");
      }
      return new GeminiProvider(config.model.geminiApiKey);
  }
}
