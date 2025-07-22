import { Action, ActionPanel, Detail, Form, getSelectedText, Icon, Keyboard, showToast, Toast } from "@raycast/api";
import * as fs from "fs";
import React, { useEffect, useState } from "react";
import { createAIProvider } from "./aiProvider";
import { getCmd } from "./commands";
import { useCommandHistory } from "./history";
import { AIConfig, RequestStats } from "./types";
import { calculateItemCost, renderStats } from "./utils";

// --- Main component ---
export default function GemAI(aiConfig: AIConfig) {
  const PageState = { Form: 0, Response: 1 };

  // Init states
  const [markdown, setMarkdown] = useState("");
  const [page, setPage] = useState(PageState.Response);
  const [isLoading, setIsLoading] = useState(true);
  const [textarea, setTextarea] = useState("");
  const [navigationTitle, setNavigationTitle] = useState("GemAI -> " + getCmd(aiConfig.request.actionName).name);
  const [renderedText, setRenderedText] = useState("");
  const [latestQuery, setLatestQuery] = useState<{ query?: string; attachmentFile?: string }>({
    query: undefined,
    attachmentFile: undefined,
  });
  const { addToHistory, getHistoryStats } = useCommandHistory();

  const getAiResponse = async (query?: string, attachmentFile?: string) => {
    setPage(PageState.Response);
    setLatestQuery({ query: query, attachmentFile: attachmentFile });

    await showToast({
      style: Toast.Style.Animated,
      title: `Waiting for ${aiConfig.model.modelNameUser}...`,
    });

    const startTime = Date.now();

    try {
      const provider = createAIProvider(aiConfig);
      const actualFilePath = attachmentFile || aiConfig.request.attachmentFile;
      const attachment = await provider.prepareAttachment(actualFilePath);
      const response = provider.sendRequest(aiConfig, query, attachment);

      let markdown = "";
      let usageMetadata: any = undefined;
      let firstRespTime: number | null = null; // Will be set on first chunk
      let requestStats: RequestStats = {
        prompt: 0,
        input: 0,
        thoughts: 0,
        total: 0,
        firstRespTime: 0,
        totalTime: 0,
      };

      for await (const chunk of response) {
        // Measure first response time on first chunk with content
        if (firstRespTime === null && chunk.text) {
          firstRespTime = (Date.now() - startTime) / 1000;
        }

        if (chunk.text) {
          markdown += chunk.text;
          setRenderedText(markdown);
        }

        if (chunk.usageMetadata) {
          usageMetadata = chunk.usageMetadata;
        }

        const totalTime = (Date.now() - startTime) / 1000;
        requestStats.totalTime = totalTime;

        showToast({ style: Toast.Style.Success, title: `Typing...` });
      }


      // Get final token stats - always call this, not just when query exists
      requestStats = await provider.getTokenStats(aiConfig, usageMetadata, query || "", attachment);
      requestStats.firstRespTime = firstRespTime || 0; // Use 0 if no content chunks received
      requestStats.totalTime = (Date.now() - startTime) / 1000;

      setMarkdown(markdown);

      await showToast({
        style: Toast.Style.Success,
        title: "OK",
        message: `Total time: ${requestStats.totalTime.toFixed(1)}s; Tokens: ${requestStats.total}`,
      });

      const stats = renderStats(aiConfig.model.modelNameUser, aiConfig.model.temperature, requestStats);

      const historyItem = {
        timestamp: Date.now(),
        actionName: aiConfig.request.actionName,
        model: aiConfig.model.modelName,
        query: query || "",
        isAttachmentFile: !!actualFilePath,
        response: markdown,
        stats: stats,
        requestStats: requestStats,
      };

      await addToHistory(historyItem);

      const cost = `\$${calculateItemCost(historyItem).toFixed(4)}`;
      const historyStatsMessage = await getHistoryStats();

      setRenderedText(`${markdown}\n\n----\n\n*${stats}; ${cost}*\n\n*${historyStatsMessage}*`);
    } catch (e: any) {
      console.error(e);
      await showToast({ style: Toast.Style.Failure, title: "Response Failed" });
      setRenderedText(`## Fatal Error\n\n----\n\n${e.message}\n\n----\n\n${(Date.now() - startTime) / 1000} seconds`);
    }

    setIsLoading(false);
  };

  useEffect(() => {
    (async () => {
      try {
        let selectedText = "";

        if (aiConfig.ui.useSelected) {
          try {
            selectedText = await getSelectedText();
          } catch (e) {
            await showToast({ style: Toast.Style.Success, title: "No selected text. Use form." });
            selectedText = "";
          }
        }

        const hasUserPrompt = aiConfig.request.userPrompt.trim() !== "";
        const hasSelected = selectedText.trim() !== "";

        if (!hasUserPrompt && !hasSelected) {
          setPage(PageState.Form);
          return;
        }

        if (hasUserPrompt) {
          getAiResponse(aiConfig.request.userPrompt);
        } else if (hasSelected) {
          getAiResponse(selectedText);
        }
      } catch (e: any) {
        console.error("Fatal error in useEffect:", e);
        await showToast({ style: Toast.Style.Failure, title: "An error occurred", message: e.message });
        setPage(PageState.Response);
        setMarkdown(e.message);
      }
    })();
  }, []);

  return page === PageState.Response ? (
    <Detail
      actions={
        !isLoading && (
          <ActionPanel>
            {aiConfig.ui.allowPaste && <Action.Paste content={markdown} />}
            <Action.CopyToClipboard shortcut={Keyboard.Shortcut.Common.Copy} content={markdown} />
            <Action
              title="Submit Again"
              icon={Icon.Repeat}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={async () => {
                setMarkdown("");
                setRenderedText("Resent request. Waiting...");
                getAiResponse(latestQuery.query, latestQuery.attachmentFile);
              }}
            />
          </ActionPanel>
        )
      }
      isLoading={isLoading}
      markdown={renderedText}
      navigationTitle={navigationTitle}
    />
  ) : (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            onSubmit={(values) => {
              setMarkdown("");

              let filePathValue = undefined;
              if (values?.file?.length > 0 && fs.existsSync(values.file[0]) && fs.lstatSync(values.file[0]).isFile()) {
                filePathValue = values.file[0];
              }

              getAiResponse(values.query, filePathValue);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="query"
        title="User Prompt"
        value={textarea}
        onChange={(value) => setTextarea(value)}
        placeholder={aiConfig.ui.placeholder}
        autoFocus={true}
      />
      {!aiConfig.request.attachmentFile && (
        <>
          <Form.Description title="Attachment" text="You can attach image or file to analyze it." />
          <Form.FilePicker id="file" title="" showHiddenFiles={true} allowMultipleSelection={false} />
        </>
      )}

      <Form.Description
        title=""
        text={"Model: " + aiConfig.model.modelNameUser + "; " + aiConfig.model.temperature + "°"}
      />
    </Form>
  );
}
