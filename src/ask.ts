import { buildGemAIConfig } from "./core/buildGemAIConfig";
import { CMD_ASK, getCmd } from "./core/commands";
import GemAI from "./core/gemai";
import { RaycastProps } from "./core/types";

export default function Ask(props: RaycastProps) {
  if (props?.launchContext?.attachmentFile) {
    const contextConfig = props.launchContext.gemAiConfig;
    contextConfig.request.attachmentFile = props.launchContext.attachmentFile;
    return GemAI(contextConfig);
  }

  const fallbackPrompt =
    "You are an expert assistant. Respond to the following user request strictly according to the rules: " +
    'start immediately with the core point, without introductory phrases, repeating the request, or "fluff". ' +
    "Structure the response with short paragraphs and one-level lists (not two and more levels of list!), " +
    'use precise terminology and standard capitalization (headings as regular sentences, without "Title Case").' +
    "If necessary, present different viewpoints objectively or request clarification." +
    "ALWAYS return only the answer itself, without any explanations, greetings, or unnecessary words.";

  const gemAiConfig = buildGemAIConfig(getCmd(CMD_ASK).id, props, fallbackPrompt);
  gemAiConfig.ui.placeholder = getCmd(CMD_ASK).ui_placeholder;
  gemAiConfig.ui.useSelected = false;

  return GemAI(gemAiConfig);
}
