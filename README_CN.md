# Raycast GemAI - Universal AI Assistant

**Raycast GemAI** 是一个强大的 Raycast 扩展，将 **Google Gemini** 和 **OpenAI GPT** 模型直接集成到您的工作流程中。执行各种任务——从起草邮件和复杂推理到分析截图和翻译语言——所有这些都无需离开 Raycast。凭借通用 AI 提供商支持、高级推理能力和智能模型切换，GemAI 是您完成任何任务的通用助手。

## ✨ 主要功能

### 🤖 通用 AI 提供商支持
- **双提供商架构：** 在 Google Gemini 和 OpenAI 模型之间无缝切换
- **自动提供商检测：** 模型自动路由到正确的 AI 提供商
- **自定义模型支持：** 添加您自己的 OpenAI 兼容模型（Azure、本地部署等）
- **智能模型切换：** 需要时自动回退到支持视觉的模型

### 🧠 高级 AI 功能
- **推理模型：** 完全支持 OpenAI 的 o1-preview 和 o1-mini，具有增强的思维能力
- **图像处理：** 使用 GPT-4o 和 Gemini Vision 模型进行图像分析
- **多模态支持：** 处理文本、图像和文档，支持所有提供商
- **实时令牌跟踪：** 准确的使用统计和成本计算

## 📝 文本处理工具

### 主要命令
- **Ask AI** — 使用最先进的模型（GPT-4o、o1-series、Gemini Pro）提问
- **Chat Room** — 在具有上下文记忆的持久对话室中进行交互式聊天
- **Summarize It** — 通过智能摘要压缩长文本
- **Explain It** — 通过详细解释理解复杂概念
- **Rephrase It** — 重写文本，保持含义和风格
- **Make It Longer/Shorter** — 根据需要扩展或压缩内容
- **Fix Grammar** — 完善语法、拼写和标点符号
- **Change Tone** — 将文本转换为更友好或更专业的风格
- **Translate** — 具有自动检测的多语言翻译
- **Count Tokens** — 估算成本并优化使用

### 专业工具
- **Professional Tone** — 将文本转换为正式商务风格
- **Friendly Tone** — 使交流更加非正式和温暖
- **Prompt Builder** — 为 AI 创建更好的提示

## 🖼️ 截图和图像分析

- **Screenshot to Markdown** — 将截图转换为完美格式化的 GitHub Flavored Markdown
- **Screenshot Analysis** — 使用视觉模型进行全面的图像分析和问答
- **Screenshot Translation** — 从任何图像中提取和翻译文本

## 🛠️ 高级配置

- **多个 AI 提供商：** 配置 Gemini 和 OpenAI API 密钥
- **模型选择：** 从 10+ 模型中选择，包括 GPT-4o、o1-series 和 Gemini 模型
- **自定义系统提示：** 为每个命令使用自定义提示来定制 AI 行为
- **语言偏好：** 为翻译设置主要/次要语言
- **温度控制：** 微调创造性和随机性
- **使用分析：** 详细统计，包括成本跟踪和令牌使用

## 🚀 安装

### 选项 1：Raycast Store（推荐）
1. 在您的 macOS 上安装 Raycast
2. 打开 Raycast Store 并搜索 "GemAI"
3. 点击安装并按照设置说明操作

### 选项 2：本地开发安装

#### 先决条件：
```bash
# 确保您安装了 Node.js 18+
node --version
npm --version
```

#### 克隆和设置：
```bash
git clone https://github.com/smetdenis/raycast-gemai.git
cd raycast-gemai
npm install
```

#### 构建扩展：
```bash
npm run build
```

#### 在 Raycast 中安装：
1. 打开 Raycast 偏好设置
2. 转到 Extensions → Add Extension
3. 选择构建的扩展文件夹（`dist/`）
4. 配置您的 API 密钥

## ⚙️ 配置

通过 **Raycast Preferences → Extensions → GemAI** 访问所有设置：

### 必需设置
- **Gemini API Key：** 在 [Google AI Studio](https://aistudio.google.com/app/apikey) 获取
- **OpenAI API Key：** 在 [OpenAI Platform](https://platform.openai.com/api-keys) 获取

### 模型配置
- **Default Model：** 为所有命令选择您首选的模型
- **特定命令模型：** 为每种命令类型覆盖默认模型
- **自定义模型：** 添加具有自定义名称的 OpenAI 兼容模型

### 高级设置
- **OpenAI Base URL：** 配置自定义端点（Azure、本地部署）
- **Temperature：** 控制 AI 创造性（0.0 = 专注，1.0 = 创造性）
- **自定义提示：** 指向包含自定义系统提示的目录
- **语言：** 为翻译设置主要/次要语言

## 🎨 自定义系统提示

GemAI 允许您使用自己的 Markdown 文件，其中包含覆盖内置提示的自定义系统提示。这使您能够完全控制每个命令的 AI 行为。

### 如何使用自定义提示

1. **创建提示目录：**
   ```bash
   mkdir ~/Documents/Prompts/Raycast
   ```

2. **创建自定义提示文件**（例如，`AskQuestion.md`）：
   ```markdown
   # 自定义 Ask AI 提示
   
   您是一位专门的技术顾问，在软件开发方面具有专业知识。
   始终提供实用的、可操作的建议，并在适当时提供代码示例。
   专注于现代最佳实践和当前行业标准。
   ```

3. **在 Raycast 中配置：**
   - 转到 **Raycast Preferences → Extensions → GemAI**
   - 将 **Prompt Directory** 设置为 `~/Documents/Prompts/Raycast`
   - 对于个别命令，将 **Markdown file with system prompt** 设置为您的自定义文件名

### 可用的提示文件

每个命令都可以使用自定义提示文件。常见文件名：
- `AskQuestion.md` - 用于 Ask AI 命令
- `ChatRoom.md` - 用于聊天室对话
- `Explainer.md` - 用于 Explain It 命令
- `Grammar.md` - 用于 Fix Grammar 命令
- `Professional.md` - 用于 Professional Tone
- `Friend.md` - 用于 Friendly Tone
- `Translator.md` - 用于翻译任务
- `Screenshot-Explain.md` - 用于截图分析
- `Screenshot-Markdown.md` - 用于截图到 markdown 转换

### 提示工程最佳实践

要创建有效的自定义提示，请参考这些资源：

**官方指南：**
- [OpenAI Prompt Engineering Guide](https://platform.openai.com/docs/guides/prompt-engineering)
- [Google AI Studio Prompt Design](https://ai.google.dev/docs/prompt_design)

**社区资源：**
- [Prompt Engineering Patterns](https://www.promptingguide.ai/)
- [Learn Prompting](https://learnprompting.org/)

### 自定义提示示例

**技术代码审查：**
```markdown
# 代码审查助手

您是一位进行代码审查的专家软件工程师。
专注于：
- 代码质量和最佳实践
- 安全漏洞
- 性能优化
- 可维护性和可读性
- 测试覆盖率

始终提供具体的、可操作的反馈和示例。
```

**创意写作：**
```markdown
# 创意写作助手

您是一位专门从事故事讲述的创意写作教练。
帮助用户发展：
- 引人入胜的叙述
- 角色发展
- 对话和节奏
- 特定类型的技巧
- 声音和风格

提供建设性反馈和写作练习。
```

## 📋 可用命令

| 命令 | 描述 | 输入类型 |
|------|------|----------|
| **Ask AI** | 使用任何可用模型提问 | 文本/选择 |
| **Chat Room** | 具有持久上下文的交互式聊天 | 文本输入 |
| **Explain It** | 带上下文的详细解释 | 选择 |
| **Summarize It** | 智能文本摘要 | 选择 |
| **Rephrase It** | 重写，保持含义 | 选择 |
| **Fix Grammar** | 语法和风格纠正 | 选择 |
| **Professional Tone** | 正式商务写作 | 选择 |
| **Friendly Tone** | 随意、温暖的交流 | 选择 |
| **Make Longer** | 扩展和详细说明内容 | 选择 |
| **Make Shorter** | 简洁、专注的版本 | 选择 |
| **Translate** | 多语言翻译 | 选择 |
| **Prompt Builder** | 为 AI 创建更好的提示 | 文本输入 |
| **Count Tokens** | 估算成本并优化使用 | 文本/选择 |
| **Screenshot → Markdown** | 将图像转换为 Markdown | 截图 |
| **Screenshot → Explain** | 分析和描述图像 | 截图 |
| **Screenshot → Translate** | 从图像中提取和翻译文本 | 截图 |
| **Usage Statistics** | 详细分析和成本 | - |
| **Command History** | 之前的交互和结果 | - |

## 💡 使用示例

### 文本处理
```bash
# 选择任何文本并运行：
→ Fix Grammar: "there dog is running" → "Their dog is running"
→ Professional: "hey, can u help?" → "Could you please assist me?"
→ Summarize: [长文章] → [包含关键点的简洁摘要]
```

### 交互式聊天
```bash
# 使用 Chat Room 进行持续对话：
→ Chat Room: 开始具有上下文记忆的持久对话
→ 使用完整对话历史提出后续问题
→ 非常适合头脑风暴、调试或复杂讨论
```

### 高级推理
```bash
# 使用 o1-series 模型解决复杂问题：
→ Ask AI (o1-preview): "逐步解决这个微分方程..."
→ Explain It (o1-mini): "这个算法为什么有效？"
```

### 图像和截图
```bash
# 截图并：
→ Screenshot → Markdown: 将 UI 元素转换为格式化的 Markdown
→ Screenshot → Explain: "这张图表中发生了什么？"
→ Screenshot → Translate: 提取并翻译外文文本
```

### 成本优化
```bash
# 使用 Count Tokens 估算成本：
→ Count Tokens: "您的文本" → 显示令牌数量和估算成本
→ 在处理前比较不同模型的成本
```

## 🎯 如何帮助您

### 对于开发者
- 快速解释代码和算法
- 将代码截图转换为 Markdown 用于文档
- 在交互式聊天中使用 AI 进行调试
- 创建技术描述和 README

### 对于作家和内容创作者
- 修正语法和风格
- 根据受众调整文本语调
- 压缩或扩展内容
- 翻译成不同语言

### 对于企业
- 创建专业的信件和文档
- 分析和总结长文本
- 翻译商业文档
- 创建演示材料

### 对于日常任务
- 快速回答问题
- 解释复杂概念
- 分析图像和截图
- 帮助学习语言

## 🔧 成本管理

- **使用跟踪：** 监控所有模型的令牌使用和成本
- **令牌计数：** 使用 Count Tokens 命令在处理前估算成本
- **模型优化：** 选择经济高效模型的建议

## 🤝 支持

如果您有问题或遇到问题：
- 在 GitHub 仓库中创建 issue
- 检查 API 密钥设置文档
- 确保您安装了最新版本的 Raycast

---

**GemAI** — 您的通用 AI 助手，让在 Raycast 中使用人工智能变得简单、快速和高效。

---

> 🇷🇺 **Русская версия:** [README_RUS.md](README_RUS.md) - Полное описание функций на русском языке с инструкциями по установке 