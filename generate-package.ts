import * as fs from "fs";

import {
  CMD_ASK,
  CMD_CHAT,
  CMD_COUNT_TOKENS,
  CMD_EXPLAINER,
  CMD_FRIEND,
  CMD_GRAMMAR,
  CMD_HISTORY,
  CMD_LONGER,
  CMD_PROFESSIONAL,
  CMD_PROMPT_BUILDER,
  CMD_REPHRASER,
  CMD_SCR_EXPLAIN,
  CMD_SCR_MARKDOWN,
  CMD_SCR_TRANSLATE,
  CMD_SHORTER,
  CMD_STATS,
  CMD_SUMMATOR,
  CMD_TRANSLATOR,
  getCmd
} from "./src/core/commands.ts";
import {
  allModels,
  DEFAULT_MODEL,
  DEFAULT_TEMP,
  DEFAULT_TEMP_ARTIST,
  DEFAULT_TEMP_CREATIVE
} from "./src/core/models.ts";

function capitalizeFirstLetter(str: string): string {
  if (!str) return "";
  return str.charAt(0).toUpperCase() + str.slice(1);
}

const models = Object.entries(allModels).map(([key, model]) => {
  const providerPrefix = model.provider === 'custom' ? '' : model.provider;
  return {title: `${providerPrefix} ${model.name}`, value: key};
});

models.unshift({title: "Default", value: "default"});

const modelPreferences = [
  {
    name: "commandModel",
    title: "Model for the command",
    description: "Specifies the model utilized for this command.",
    type: "dropdown",
    required: false,
    default: "default",
    data: models,
  },
];

const languagePreferences = [
  {
    name: "secondaryLanguage",
    title: "Secondary Language",
    description: "Please specify your second language to better configure the assistant's operation.",
    type: "textfield",
    default: "English",
    required: true,
  },
];

function makeCommand({
                       name,
                       title,
                       description,
                       hasQuery = false,
                       withSecondaryLanguage = false,
                       promptFile,
                       mode = "view",
                       temperature = DEFAULT_TEMP,
                       modelSelector = true,
                       historyMessagesCount = false,
                     }: {
  name: string;
  title: string;
  mode?: string,
  description: string;
  promptFile?: string | boolean;
  hasQuery?: boolean;
  withSecondaryLanguage?: boolean | string;
  temperature?: number | boolean;
  modelSelector?: boolean;
  historyMessagesCount?: boolean | number;
}) {
  const preferences = [
    ...(modelSelector ? modelPreferences : []),
    ...(withSecondaryLanguage
      ? [{
        ...languagePreferences[0],
        ...(typeof withSecondaryLanguage === "string"
          ? {title: withSecondaryLanguage}
          : {})
      }]
      : []),
    ...(temperature !== false
      ? [{
        name: "temperature",
        title: "Temperature",
        description: "Lower temperatures yield deterministic responses (0 is fully deterministic), " +
          "while higher temperatures produce diverse results. Max value is 2.0",
        type: "textfield",
        required: false,
        default: "" + (typeof temperature === "number" ? temperature : DEFAULT_TEMP),
      }]
      : []),
    ...(promptFile !== false
      ? [{
        name: "promptFile",
        title: "Markdown file with system prompt",
        description: "The system prompt to use for this command.",
        type: "textfield",
        required: false,
        default: typeof promptFile === "string" ? promptFile : `${capitalizeFirstLetter(name)}.md`,
      }]
      : []),
    ...(historyMessagesCount !== false
      ? [{
        name: "historyMessagesCount",
        title: "History Messages Count",
        description: "Number of recent messages to include in conversation context (affects memory and cost).",
        type: "textfield",
        required: false,
        default: typeof historyMessagesCount === "number" ? "" + historyMessagesCount : "10",
      }]
      : []),
  ];

  return {
    name,
    title,
    description,
    mode: mode ?? "view",
    ...(hasQuery && {
      arguments: [
        {
          name: "query",
          placeholder: `Quick query text`,
          type: "text",
          required: false,
        },
      ],
    }),
    preferences,
  };
}

const commands = [
  makeCommand({
    name: getCmd(CMD_ASK).id,
    title: getCmd(CMD_ASK).name,
    description: getCmd(CMD_ASK).description,
    promptFile: "AskQuestion.md",
  }),
  makeCommand({
    name: getCmd(CMD_CHAT).id,
    title: getCmd(CMD_CHAT).name,
    description: getCmd(CMD_CHAT).description,
    promptFile: "ChatRoom.md",
    historyMessagesCount: true,
  }),
  makeCommand({
    name: getCmd(CMD_EXPLAINER).id,
    title: getCmd(CMD_EXPLAINER).name,
    description: getCmd(CMD_EXPLAINER).description,
    hasQuery: true,
  }),
  makeCommand({
    name: getCmd(CMD_FRIEND).id,
    title: getCmd(CMD_FRIEND).name,
    description: getCmd(CMD_FRIEND).description,
    temperature: DEFAULT_TEMP_CREATIVE
  }),
  makeCommand({
    name: getCmd(CMD_GRAMMAR).id,
    title: getCmd(CMD_GRAMMAR).name,
    description: getCmd(CMD_GRAMMAR).description,
    withSecondaryLanguage: true,
    temperature: DEFAULT_TEMP
  }),
  makeCommand({
    name: getCmd(CMD_HISTORY).id,
    title: getCmd(CMD_HISTORY).name,
    description: getCmd(CMD_HISTORY).description,
    modelSelector: false,
    temperature: false,
    promptFile: false,
  }),
  makeCommand({
    name: getCmd(CMD_LONGER).id,
    title: getCmd(CMD_LONGER).name,
    description: getCmd(CMD_LONGER).description,
    temperature: DEFAULT_TEMP_ARTIST
  }),
  makeCommand({
    name: getCmd(CMD_PROFESSIONAL).id,
    title: getCmd(CMD_PROFESSIONAL).name,
    description: getCmd(CMD_PROFESSIONAL).description,
    temperature: DEFAULT_TEMP_CREATIVE
  }),
  makeCommand({
    name: getCmd(CMD_PROMPT_BUILDER).id,
    title: getCmd(CMD_PROMPT_BUILDER).name,
    description: getCmd(CMD_PROMPT_BUILDER).description,
    temperature: DEFAULT_TEMP
  }),
  makeCommand({
    name: getCmd(CMD_REPHRASER).id,
    title: getCmd(CMD_REPHRASER).name,
    description: getCmd(CMD_REPHRASER).description,
    temperature: DEFAULT_TEMP_ARTIST
  }),
  makeCommand({
    name: getCmd(CMD_SCR_EXPLAIN).id,
    title: getCmd(CMD_SCR_EXPLAIN).name,
    description: getCmd(CMD_SCR_EXPLAIN).description,
    mode: "no-view",
    promptFile: "Screenshot-Explain.md",
  }),
  makeCommand({
    name: getCmd(CMD_SCR_MARKDOWN).id,
    title: getCmd(CMD_SCR_MARKDOWN).name,
    description: getCmd(CMD_SCR_MARKDOWN).description,
    mode: "no-view",
    promptFile: "Screenshot-Markdown.md",
  }),
  makeCommand({
    name: getCmd(CMD_SCR_TRANSLATE).id,
    title: getCmd(CMD_SCR_TRANSLATE).name,
    description: getCmd(CMD_SCR_TRANSLATE).description,
    mode: "no-view",
    promptFile: "Screenshot-Translate.md",
    withSecondaryLanguage: "Source language",
  }),
  makeCommand({
    name: getCmd(CMD_SHORTER).id,
    title: getCmd(CMD_SHORTER).name,
    description: getCmd(CMD_SHORTER).description,
    temperature: DEFAULT_TEMP_ARTIST
  }),
  makeCommand({
    name: getCmd(CMD_STATS).id,
    title: getCmd(CMD_STATS).name,
    description: getCmd(CMD_STATS).description,
    modelSelector: false,
    temperature: false,
    promptFile: false,
  }),
  makeCommand({
    name: getCmd(CMD_SUMMATOR).id,
    title: getCmd(CMD_SUMMATOR).name,
    description: getCmd(CMD_SUMMATOR).description,
  }),
  makeCommand({
    name: getCmd(CMD_TRANSLATOR).id,
    title: getCmd(CMD_TRANSLATOR).name,
    description: getCmd(CMD_TRANSLATOR).description,
    withSecondaryLanguage: true,
    hasQuery: true,
  }),
  makeCommand({
    name: getCmd(CMD_COUNT_TOKENS).id,
    title: getCmd(CMD_COUNT_TOKENS).name,
    description: getCmd(CMD_COUNT_TOKENS).description,
    temperature: false,
    promptFile: false,
  }),
].sort((a, b) => a.name.localeCompare(b.name));

const rootPreferences = [
  {
    name: "geminiApiKey",
    title: "Gemini API Key",
    description: "Find it at your Google AI Studio. Required for Gemini models.",
    type: "password",
    required: false,
  },
  {
    name: "openaiApiKey",
    title: "OpenAI API Key",
    description: "Find it at platform.openai.com. Required for OpenAI models.",
    type: "password",
    required: false,
  },
  {
    description: "Which model for Raycast uses by default (unless overriden by individual commands).",
    name: "defaultModel",
    title: "Default Model",
    type: "dropdown",
    required: true,
    default: DEFAULT_MODEL,
    data: models.slice(1), // без "Default"
  },
  {
    name: "primaryLanguage",
    title: "Primary language",
    description: "The default language for AI responses.",
    type: "textfield",
    default: "English",
    required: true,
  },
  {
    name: "promptDir",
    title: "Prompt Directory",
    description: "The full path to the directory containing Prompts in markdown format.",
    type: "directory",
    required: false,
    default: "~/Documents/Prompts/Raycast",
  },
];

const pkg = {
  $schema: "https://www.raycast.com/schemas/extension.json",
  name: "gemai",
  title: "GemAI",
  description: "AI Toolbox for quick text editing with Gemini & OpenAI support, BYOK.",
  icon: "gemai-icon.png",
  type: "module",
  author: "SmetDenis",
  owner: "SmetDenis",
  categories: ["Productivity", "Developer Tools"],
  license: "MIT",
  commands,
  preferences: rootPreferences,
  dependencies: {
    "@google/genai": "^1.6.0",
    "@raycast/api": "^1.100.2",
    "@raycast/utils": "^2.0.1",
    "mime-types": "^3.0.1",
    "openai": "^5.6.0",
  },
  devDependencies: {
    "@raycast/eslint-config": "^2.0.4",
    "@types/mime-types": "^3.0.1",
    "@types/node": "^24.0.3",
    "@types/react": "^19.1.8",
    "eslint": "^9.29.0",
    "prettier": "^3.5.3",
    "typescript": "^5.8.2",
  },
  scripts: {
    build: "ray build -e dist",
    dev: "ray develop",
    "fix-lint": "ray lint --fix",
    lint: "ray lint",
    pull: "ray pull-contributions",
    publish: "ray publish",
  },
};

fs.writeFileSync("./package.json", JSON.stringify(pkg, null, 2) + "\n", "utf-8");
console.log("package.json updated!");
