import { Action, ActionPanel, Detail, Form, getSelectedText, Icon, Keyboard, showToast, Toast } from "@raycast/api";
import * as fs from "fs";
import { useEffect, useState } from "react";
import { createAIProvider } from "./core/aiProvider";
import { buildAIConfig } from "./core/buildAIConfig";
import { CMD_COUNT_TOKENS, getCmd } from "./core/commands";

export default function CountTokens() {
  const PageState = { Form: 0, Response: 1 };

  const [markdown, setMarkdown] = useState<string>("Counting tokens...");
  const [page, setPage] = useState(PageState.Response);
  const [isLoading, setIsLoading] = useState(true);
  const [textarea, setTextarea] = useState("");
  const [navigationTitle] = useState("GemAI -> Count Tokens");

  const countTokens = async (text?: string, attachmentFile?: string) => {

    setPage(PageState.Response);
    setIsLoading(true);
    setMarkdown("Counting tokens...");

    await showToast({
      style: Toast.Style.Animated,
      title: "Counting tokens...",
    });

    try {
      // Build AI configuration using universal system
      const config = buildAIConfig(getCmd(CMD_COUNT_TOKENS).id, {
        arguments: { query: text || "" },
        fallbackText: text || "",
        launchType: "immediate",
      });

      // Create appropriate provider based on configuration
      const provider = createAIProvider(config);

      let tokenCount: number;
      let contentInfo = "";

      if (attachmentFile && fs.existsSync(attachmentFile) && fs.lstatSync(attachmentFile).isFile()) {

        // For token counting, we can read file content as text instead of using API upload
        // This works for text files, code files, etc.
        try {
          const fileContent = fs.readFileSync(attachmentFile, "utf8");
          const combinedText = text ? `${text}\n\n--- File Content ---\n${fileContent}` : fileContent;
          tokenCount = await provider.countTokens(config, combinedText);

          const fileName = attachmentFile.split("/").pop();
          const fileSize = fs.statSync(attachmentFile).size;
          contentInfo = `**Content:** Text + File (${fileName}, ${fileSize} bytes)\n\n`;

        } catch (fileError: any) {
          // Fallback: try to use provider's attachment method (for images, etc.)
          try {
            const attachment = await provider.prepareAttachment(attachmentFile);
            tokenCount = await provider.countTokens(config, text || "", attachment);
            contentInfo = `**Content:** Text + File (${attachmentFile.split("/").pop()})\n\n`;
          } catch (attachmentError: any) {
            console.error("[CountTokens] Both file reading methods failed:", attachmentError.message);
            throw new Error(`Cannot process file: ${attachmentError.message}`);
          }
        }
      } else {
        // Count tokens for text only
        tokenCount = await provider.countTokens(config, text || "");
        if (text) {
          contentInfo = `**Content:** Text (${text.length} characters)\n\n`;
        }
      }

      const result = `**Token count:** ${tokenCount}\n\n${contentInfo}**Model:** ${config.model.modelNameUser}\n\n**Provider:** ${config.provider.toUpperCase()}`;

      setMarkdown(result);

      await showToast({
        style: Toast.Style.Success,
        title: "Tokens counted",
        message: `${tokenCount} tokens`,
      });
    } catch (error: any) {
      console.error("Token counting error:", error);
      console.error("Error stack:", error.stack);

      await showToast({
        style: Toast.Style.Failure,
        title: "Error counting tokens",
        message: error.message || "Unknown error",
      });

      setMarkdown(
        `**Failed to count tokens**\n\n**Error:** ${error.message || "Unknown error"}\n\n**Details:** ${error.stack ? error.stack.split("\n")[0] : "No details"}`,
      );
    }

    setIsLoading(false);
  };

  useEffect(() => {
    (async () => {
      try {
        let selectedText = "";

        try {
          selectedText = await getSelectedText();
        } catch (e) {
          // No selected text, will show form
          selectedText = "";
        }

        if (selectedText.trim() === "") {
          setPage(PageState.Form);
          setIsLoading(false);
          return;
        }

        // Count tokens for selected text immediately
        countTokens(selectedText);
      } catch (e: any) {
        console.error("Fatal error in useEffect:", e);
        await showToast({ style: Toast.Style.Failure, title: "An error occurred", message: e.message });
        setPage(PageState.Response);
        setMarkdown(`**Error:** ${e.message}`);
        setIsLoading(false);
      }
    })();
  }, []);

  return page === PageState.Response ? (
    <Detail
      actions={
        !isLoading && (
          <ActionPanel>
            <Action.CopyToClipboard shortcut={Keyboard.Shortcut.Common.Copy} content={markdown} title="Copy Result" />
            <Action
              title="Count Again"
              icon={Icon.Repeat}
              shortcut={Keyboard.Shortcut.Common.Refresh}
              onAction={() => {
                setPage(PageState.Form);
                setTextarea("");
              }}
            />
          </ActionPanel>
        )
      }
      isLoading={isLoading}
      markdown={markdown}
      navigationTitle={navigationTitle}
    />
  ) : (
    <Form
      actions={
        <ActionPanel>
          <Action.SubmitForm
            title="Count Tokens"
            onSubmit={(values: { text?: string; file?: string[] }) => {
              const textValue = values.text?.trim() || "";
              let filePathValue = undefined;

              if (values?.file?.length && values.file.length > 0) {
                const filePath = values.file[0];
                if (fs.existsSync(filePath) && fs.lstatSync(filePath).isFile()) {
                  filePathValue = filePath;
                }
              }

              if (!textValue && !filePathValue) {
                showToast({
                  style: Toast.Style.Failure,
                  title: "Input required",
                  message: "Please enter text or select a file",
                });
                return;
              }

              countTokens(textValue, filePathValue);
            }}
          />
        </ActionPanel>
      }
    >
      <Form.TextArea
        id="text"
        title="Text to Count"
        value={textarea}
        onChange={setTextarea}
        placeholder="Enter text to count tokens..."
        autoFocus={true}
      />

      <Form.Description
        title="File Attachment"
        text="Optionally attach a file to count tokens including the file content. Supported: images, documents, etc."
      />
      <Form.FilePicker
        id="file"
        title="Select File"
        showHiddenFiles={false}
        allowMultipleSelection={false}
        canChooseFiles={true}
        canChooseDirectories={false}
      />

      <Form.Description
        title="Model Info"
        text={`This will use your currently configured model and provider for token counting.`}
      />
    </Form>
  );
}
