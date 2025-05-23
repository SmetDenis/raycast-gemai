import { buildGemAIConfig } from "./core/buildGemAIConfig";
import { CMD_SUMMATOR, getCmd } from "./core/commands";
import GemAI from "./core/gemai";
import { RaycastProps } from "./core/types";

export default function Summator(props: RaycastProps) {
  const fallbackPrompt = `Summarize the following text very concisely
(3-10 sentences; for very long texts, up to 15 sentences and a list of key points),
conveying only the main ideas, facts, and conclusions. If the original text is already brief, return its essence.
Provide the response objectively and clearly, returning EXCLUSIVELY the summary itself, without any explanations.`;

  const gemAiConfig = buildGemAIConfig(getCmd(CMD_SUMMATOR).id, props, fallbackPrompt);
  gemAiConfig.ui.placeholder = getCmd(CMD_SUMMATOR).ui_placeholder;

  return GemAI(gemAiConfig);
}
