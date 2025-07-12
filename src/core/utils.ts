import * as fs from "fs";
import * as os from "os";
import * as path from "path";
import { getCmd } from "./commands"; // Import getCmd here
import { allModels, getModelInfo } from "./models";
import { GroupStats, HistoryItem, RequestStats } from "./types"; // Import GroupStats

// Export time constants for use in stats calculations
export const MS_PER_SECOND = 1000;
export const MS_PER_MINUTE = 60 * MS_PER_SECOND;
export const MS_PER_HOUR = 60 * MS_PER_MINUTE;
export const MS_PER_DAY = 24 * MS_PER_HOUR;
export const MS_PER_WEEK = 7 * MS_PER_DAY;
export const MS_PER_MONTH = 30 * MS_PER_DAY; // Approximation for 30 days

export function getSystemPrompt(promptPath: string | undefined, defaultPrompt?: string): string {
  let resolvedPath = promptPath ? promptPath.trim() : "";

  if (resolvedPath.startsWith("~")) {
    resolvedPath = path.join(os.homedir(), resolvedPath.slice(1));
  }

  let finalPrompt = "";

  if (resolvedPath && fs.existsSync(resolvedPath)) {
    let fileContent = fs.readFileSync(resolvedPath, "utf8");
    
    // Remove YAML frontmatter if present
    fileContent = fileContent.replace(/^---[\s\S]*?---\s*/, "");
    
    // Try to extract prompt from markdown code block after "System Prompt" or "Prompt" heading
    // Pattern explanation:
    // - ##?\s* - matches ## or # followed by optional whitespace
    // - (?:system\s+)?prompt - matches "system prompt" or just "prompt" (case insensitive)
    // - \s*\n+ - matches whitespace and one or more newlines
    // - ```(?:markdown)?\s*\n - matches opening code block (with optional "markdown" language)
    // - ([\s\S]*?) - captures the prompt content (non-greedy)
    // - \n\s*``` - matches closing code block
    const markdownPromptMatch = fileContent.match(/##?\s*(?:system\s+)?prompt\s*\n+```(?:markdown)?\s*\n([\s\S]*?)\n\s*```/i);
    
    if (markdownPromptMatch) {
      // Extract and clean the prompt from markdown code block
      finalPrompt = markdownPromptMatch[1].trim();
    } else {
      // Use the entire file content as prompt (original behavior)
      finalPrompt = fileContent.trim();
    }
    
    finalPrompt = finalPrompt + "\n";
  } else if (defaultPrompt) {
    finalPrompt = defaultPrompt.trim() + "\n";
  }

  return finalPrompt;
}

export function formatDate(date: Date): string {
  const day = date.getDate();
  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];
  const month = monthNames[date.getMonth()];
  const hours = date.getHours().toString().padStart(2, "0");
  const minutes = date.getMinutes().toString().padStart(2, "0");
  const seconds = date.getSeconds().toString().padStart(2, "0");
  return `${hours}:${minutes}:${seconds}, ${month} ${day}`;
}

// This function formats stats for a single history item, used in the Detail view footer
export function renderStats(modelNameUser: string, temperature: number, stats: RequestStats): string {
  const timeStr =
    // Show only total time if first response time is very close to total time
    Math.abs(stats.totalTime - stats.firstRespTime) < 0.1
      ? `Time: ${stats.totalTime.toFixed(1)} sec`
      : `Time: ${stats.firstRespTime.toFixed(1)}+${(stats.totalTime - stats.firstRespTime).toFixed(1)} sec`;

  return (
    `${modelNameUser}; ${temperature}°; ${timeStr}; ` +
    `P:${stats.prompt ?? 0} + I:${stats.input ?? 0} + T:${stats.thoughts ?? 0} ~ ${stats.total ?? 0} tokens`
  );
}

export function dump(variable: unknown, label?: string): void {
  if (label) {
    console.debug(label + ":", JSON.stringify(variable, null, 2));
  } else {
    console.debug(JSON.stringify(variable, null, 2));
  }
}

export function dumpLog(variable: unknown, label?: string): void {
  if (label) {
    console.debug(label + ":", variable);
  } else {
    console.debug(variable);
  }
}

export function toMdJson(variable: unknown): string {
  return ["```json", JSON.stringify(variable, null, 2), "```"].join("\n");
}

// Calculates cost for a single HistoryItem
export function calculateItemCost(item: HistoryItem): number {
  const modelName = item.model ?? "gemini-2.5-flash"; // Use default if model is undefined
  // Ensure requestStats exists before accessing its properties
  if (!item.requestStats) {
    return 0; // Cannot calculate cost without stats
  }
  return calculatePricePerMillionTokens(modelName, item.requestStats);
}

// GroupStats interface is defined in types.ts and imported

// Calculates aggregated stats for a group of HistoryItems
export function calculateAggregatedStatsForGroup(group: HistoryItem[]): GroupStats {
  if (group.length === 0) {
    return { count: 0, totalCost: 0, totalTokens: 0, avgTotalTokens: 0, totalTimeSum: 0, avgTotalTime: 0 };
  }

  let totalCost = 0;
  let totalTokensSum = 0;
  let totalTimeSum = 0;
  let validStatsCount = 0; // Count items with valid requestStats for averaging

  for (const item of group) {
    totalCost += calculateItemCost(item); // calculateItemCost now handles missing requestStats

    // Only include items with full requestStats in token and time sums for averaging
    if (item.requestStats && item.requestStats.total !== undefined && item.requestStats.totalTime !== undefined) {
      totalTokensSum += item.requestStats.total;
      totalTimeSum += item.requestStats.totalTime;
      validStatsCount++;
    }
  }

  const avgTotalTokens = validStatsCount > 0 ? totalTokensSum / validStatsCount : 0;
  const avgTotalTime = validStatsCount > 0 ? totalTimeSum / validStatsCount : 0;

  return {
    count: group.length, // Count all items in the group
    totalCost: totalCost,
    totalTokens: totalTokensSum, // Sum of tokens from items with valid stats
    avgTotalTokens: avgTotalTokens, // Average tokens from items with valid stats
    totalTimeSum: totalTimeSum, // Sum of time from items with valid stats
    avgTotalTime: avgTotalTime, // Average time from items with valid stats
  };
}

export function groupHistoryByKey<K extends keyof HistoryItem>(
  history: HistoryItem[],
  key: K,
): Record<string, HistoryItem[]> {
  return history.reduce(
    (acc, item) => {
      // Use a fallback key if the item's property is null or undefined
      const groupValue = String(item[key] ?? `undefined_${String(key)}`);
      if (!acc[groupValue]) {
        acc[groupValue] = [];
      }
      acc[groupValue].push(item);
      return acc;
    },
    {} as Record<string, HistoryItem[]>,
  );
}

export function oneHourAgo(): Date {
  const now = new Date();
  now.setHours(now.getHours() - 1);
  return now;
}

export function startOfToday(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

export function startOfYesterday(): Date {
  const today = startOfToday();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  return yesterday;
}

// ISO 8601 week date: Get the date of the Monday of the current week
export function startOfWeek(): Date {
  const now = new Date();
  const dayOfWeek = now.getDay(); // 0 for Sunday, 1 for Monday, ... 6 for Saturday
  // Adjust date to Monday of the current week (ISO 8601 week starts on Monday)
  // If today is Sunday (0), diff should be -6 to get to the previous Monday.
  // Otherwise, diff is 1 - dayOfWeek.
  const diff = dayOfWeek === 0 ? -6 : 1 - dayOfWeek;
  const start = new Date(now.getFullYear(), now.getMonth(), now.getDate() + diff);
  start.setHours(0, 0, 0, 0); // Set time to midnight
  return start;
}

export function startOfMonth(): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1); // Set date to the 1st of the month
}

// Helper function to get a consistent key for grouping by time period
export function getPeriodKey(timestamp: number, period: "hour" | "day" | "week" | "month" | "year"): string {
  const date = new Date(timestamp);
  const year = date.getFullYear();
  const month = date.getMonth() + 1; // 1-12
  const day = date.getDate(); // 1-31
  const hour = date.getHours(); // 0-23

  switch (period) {
    case "hour":
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")} H${String(hour).padStart(2, "0")}`;
    case "day":
      return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    case "week":
      // ISO 8601 week calculation for consistent grouping
      const d = new Date(Date.UTC(year, date.getMonth(), day));
      const dayNum = d.getUTCDay() || 7;
      d.setUTCDate(d.getUTCDate() + 4 - dayNum);
      const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
      const weekNumber = Math.ceil(((d.getTime() - yearStart.getTime()) / MS_PER_DAY + 1) / 7);
      return `${d.getUTCFullYear()}-W${String(weekNumber).padStart(2, "0")}`;
    case "month":
      return `${year}-${String(month).padStart(2, "0")}`;
    case "year":
      return String(year);
    default:
      const exhaustiveCheck: never = period;
      throw new Error(`Unknown period: ${exhaustiveCheck}`);
  }
}

export function calculatePricePerMillionTokens(modelKey: string, stats: RequestStats, prefs?: any): number {
  const model = getModelInfo(modelKey, prefs);
  if (!model) {
    return 0; // Cannot calculate cost if model info is missing
  }

  // Ensure stats are valid before calculating price, default to 0 if null/undefined
  const inputTokens = stats?.prompt ?? 0; // Use stats.prompt as the total input tokens (from usageMetadata.promptTokenCount)
  const thoughtTokens = stats?.thoughts ?? 0; // Use stats.thoughts for thinking tokens (from usageMetadata.thoughtsTokenCount)
  const totalTokensReported = stats?.total ?? 0; // Total tokens reported by API (from usageMetadata.totalTokenCount)

  // Calculate final response tokens: Total - Input - Thoughts
  // This assumes total = input + final_response + thoughts
  // Clamp at 0 in case of inconsistent stats reporting from the API or mapping issues
  const finalResponseTokens = Math.max(0, totalTokensReported - inputTokens - thoughtTokens);

  // Calculate costs for each component based on their specific prices
  const inputCost = (inputTokens / 1_000_000) * (model?.price_input ?? 0);
  const thoughtCost = (thoughtTokens / 1_000_000) * (model?.price_output_thinking ?? 0); // Use price_output_thinking for thought tokens
  const finalResponseCost = (finalResponseTokens / 1_000_000) * (model?.price_output ?? 0); // Use price_output for final response tokens

  // Total cost is the sum of all components
  const totalCost = inputCost + thoughtCost + finalResponseCost;

  // Return absolute value (should be non-negative with clamping)
  return Math.abs(totalCost);
}

// Define the new interface for detailed sub-group stats
// This extends GroupStats to include the name of the group (command or model)
export interface DetailedSubGroupStatItem extends GroupStats {
  name: string; // Model name or Command name (friendly name)
  count: number;
  totalTokens: number;
  totalCost: number;
  avgTotalTime: number;
}

// Helper function to group history items by a key ('actionName' or 'model')
// and calculate detailed aggregated stats (count, cost, tokens, avg time) for each resulting sub-group.
export function getDetailedSubGroupStats(
  historyItems: HistoryItem[],
  groupByKey: "actionName" | "model",
): DetailedSubGroupStatItem[] {
  const grouped = groupHistoryByKey(historyItems, groupByKey);
  const detailedStats: DetailedSubGroupStatItem[] = [];

  for (const key in grouped) {
    // Ensure the key is a direct property of the grouped object and the group is not empty
    if (Object.prototype.hasOwnProperty.call(grouped, key) && grouped[key].length > 0) {
      const groupItems = grouped[key];
      const mainStats = calculateAggregatedStatsForGroup(groupItems);

      let name: string;
      if (groupByKey === "actionName") {
        // Get friendly command name using the key (which is the actionName ID)
        name = getCmd(key).name;
      } else {
        // groupByKey === 'model'
        // Get friendly model name using the key (which is the model ID) or use key if not found
        name = getModelInfo(key).name;
      }

      detailedStats.push({
        name: name,
        ...mainStats, // Spread all properties from GroupStats (count, totalCost, totalTokens, avgTotalTokens, totalTimeSum, avgTotalTime)
      });
    }
  }

  // Sort the detailed stats by count descending for consistent display
  detailedStats.sort((a, b) => b.count - a.count);

  return detailedStats;
}
