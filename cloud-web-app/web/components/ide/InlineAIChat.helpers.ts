import {
  Check,
  Code2,
  FileText,
  Sparkles,
  type LucideIcon,
} from "lucide-react";
import {
  buildTraceArtifact,
  type AIChatTraceArtifact,
} from "@/components/ai-chat/ai-chat-evidence";

export interface InlineAIFileContext {
  path: string;
  content: string;
  language: string;
}

export interface InlineAIProjectContext {
  name: string;
  files: string[];
}

export interface InlineAIChatProps {
  activeFile?: InlineAIFileContext;
  projectContext?: InlineAIProjectContext;
  onApplyCode?: (code: string) => void;
  onReviewCode?: (code: string) => void;
  onClose?: () => void;
}

export interface InlineAIMessageCodeBlock {
  language: string;
  code: string;
}

export interface InlineAIMessage {
  id: string;
  role: "user" | "assistant" | "system";
  content: string;
  timestamp: Date;
  codeBlocks?: InlineAIMessageCodeBlock[];
  isStreaming?: boolean;
  traceArtifact?: AIChatTraceArtifact | null;
}

export interface SuggestionChip {
  id: string;
  icon: LucideIcon;
  label: string;
  prompt: string;
  operatorHint: string;
}

export interface InlineAIContextSummary {
  statusLabel: string;
  scopeLabel: string;
  operatorLabel: string;
  detailLabel: string;
  canApplyDirectly: boolean;
}

const FILE_SUGGESTIONS: SuggestionChip[] = [
  {
    id: "explain-file",
    icon: Code2,
    label: "Explain file",
    prompt:
      "Explain what this code does and which parts need the most attention.",
    operatorHint: "Guided reading of the current file",
  },
  {
    id: "refactor-file",
    icon: Sparkles,
    label: "Refactor",
    prompt:
      "Propose a safe refactor for this file and highlight what should change first.",
    operatorHint: "Focus on clarity and separation of responsibilities",
  },
  {
    id: "document-file",
    icon: FileText,
    label: "Add docs",
    prompt: "Suggest concise documentation or comments for this file.",
    operatorHint: "Prepares concise docs in the current context",
  },
  {
    id: "review-file",
    icon: Check,
    label: "Review risks",
    prompt: "Review this file for bugs, UX risks, and maintainability issues.",
    operatorHint: "Risk and regression checklist",
  },
];

const PROJECT_SUGGESTIONS: SuggestionChip[] = [
  {
    id: "new-feature",
    icon: Sparkles,
    label: "Plan feature",
    prompt:
      "Help me design a new feature without losing sight of the current project contracts.",
    operatorHint: "Guided and incremental planning",
  },
  {
    id: "review-project",
    icon: Code2,
    label: "Read architecture",
    prompt:
      "Summarize the current project structure and suggest where to start this task.",
    operatorHint: "Repository overview before editing",
  },
];

export function createInlineAIMessage(
  role: InlineAIMessage["role"],
  content: string,
  extras: Partial<
    Omit<InlineAIMessage, "id" | "role" | "content" | "timestamp">
  > = {},
): InlineAIMessage {
  return {
    id: createMessageId(role),
    role,
    content,
    timestamp: new Date(),
    ...extras,
  };
}

export function buildWelcomeMessage(
  activeFile?: InlineAIFileContext,
): InlineAIMessage {
  return createInlineAIMessage(
    "system",
    activeFile
      ? `I am tracking **${activeFile.path}**. I can explain it, review risks, draft an initial patch, or prepare code for you to apply.`
      : "Hello! This inline space is for quick operations: explain, review, plan changes, and generate applicable code blocks without leaving the flow.",
  );
}

export function buildContextShiftMessage(
  activeFile?: InlineAIFileContext,
  previousPath?: string,
): InlineAIMessage {
  if (activeFile && previousPath) {
    return createInlineAIMessage(
      "system",
      `I switched active context from **${previousPath}** to **${activeFile.path}**. I can continue in the new file without losing operational focus.`,
    );
  }

  if (activeFile) {
    return createInlineAIMessage(
      "system",
      `New active context: **${activeFile.path}** (${activeFile.language}). I can work against this file and generate code ready for manual application.`,
    );
  }

  return createInlineAIMessage(
    "system",
    previousPath
      ? `The file **${previousPath}** left focus. I will continue at the project and general-instruction level.`
      : "No file is attached right now. I can continue in project consultation mode.",
  );
}

export function buildSuggestionChips(
  activeFile?: InlineAIFileContext,
): SuggestionChip[] {
  return activeFile ? FILE_SUGGESTIONS : PROJECT_SUGGESTIONS;
}

export function buildContextSummary(
  activeFile?: InlineAIFileContext,
  projectContext?: InlineAIProjectContext,
): InlineAIContextSummary {
  if (activeFile && projectContext) {
    return {
      statusLabel: "Context ready",
      scopeLabel: `${getInlineAIFileName(activeFile.path)} + ${projectContext.name}`,
      operatorLabel: `I will prioritize the current file (${activeFile.language}) and pull project details from ${projectContext.name} only when that improves answer confidence.`,
      detailLabel:
        "Quick suggestions only fill the composer. Nothing enters the editor until you use Apply.",
      canApplyDirectly: true,
    };
  }

  if (activeFile) {
    return {
      statusLabel: "File attached",
      scopeLabel: getInlineAIFileName(activeFile.path),
      operatorLabel: `I am reading ${activeFile.language} directly from the current file, which helps with review, explanation, and more surgical patch proposals.`,
      detailLabel:
        "When I return code, sending it to the editor remains manual and explicit.",
      canApplyDirectly: true,
    };
  }

  if (projectContext) {
    return {
      statusLabel: "Project attached",
      scopeLabel: `${projectContext.name} · ${projectContext.files.length} files`,
      operatorLabel: `With no active file, I will answer at the architecture and project-flow level for ${projectContext.name}.`,
      detailLabel:
        "Open a file when you want to switch from broad consultation to localized operation.",
      canApplyDirectly: false,
    };
  }

  return {
    statusLabel: "Consultation mode",
    scopeLabel: "No attached context",
    operatorLabel:
      "I can help with general questions, but an open file makes answers much more operational.",
    detailLabel:
      "Use quick suggestions to structure the request before sending.",
    canApplyDirectly: false,
  };
}

export function getLoadingLabel(
  activeFile?: InlineAIFileContext,
  projectContext?: InlineAIProjectContext,
): string {
  if (activeFile) {
    return `Drafting an answer with context from ${getInlineAIFileName(activeFile.path)}.`;
  }

  if (projectContext) {
    return `Drafting an answer with context from project ${projectContext.name}.`;
  }

  return "Drafting a general answer.";
}

export function buildInlineAIRequestMessage(params: {
  prompt: string;
  activeFile?: InlineAIFileContext;
  projectContext?: InlineAIProjectContext;
}): string {
  const sections: string[] = [];
  const normalizedPrompt = params.prompt.trim();

  if (params.activeFile) {
    sections.push(
      [
        "INLINE_FILE_CONTEXT",
        `path: ${params.activeFile.path}`,
        `language: ${params.activeFile.language}`,
        "content:",
        params.activeFile.content.slice(0, 6000),
      ].join("\n"),
    );
  }

  if (params.projectContext) {
    sections.push(
      [
        "INLINE_PROJECT_CONTEXT",
        `project: ${params.projectContext.name}`,
        `knownFiles: ${params.projectContext.files.slice(0, 24).join(", ") || "n/a"}`,
      ].join("\n"),
    );
  }

  sections.push(
    [
      "INLINE_OPERATOR_GOAL",
      normalizedPrompt,
      "",
      "Respond operationally. When suggesting code, prefer applicable blocks and briefly explain the change target.",
    ].join("\n"),
  );

  return sections.join("\n\n");
}

export function getInlineAIFileName(path: string): string {
  const segments = path.split(/[\\/]/);
  return segments[segments.length - 1] || path;
}

export function extractCodeBlocks(content: string): InlineAIMessageCodeBlock[] {
  const blocks: InlineAIMessageCodeBlock[] = [];
  const regex = /```([\w-]+)?\n([\s\S]*?)```/g;
  let match: RegExpExecArray | null = regex.exec(content);

  while (match) {
    blocks.push({
      language: match[1] || "text",
      code: match[2].trim(),
    });

    match = regex.exec(content);
  }

  return blocks;
}

export function extractAdvancedResponseContent(raw: string): string {
  try {
    const data = JSON.parse(raw);
    return (
      data?.choices?.[0]?.message?.content ||
      data?.message?.content ||
      data?.content ||
      data?.output?.text ||
      raw
    );
  } catch {
    return raw;
  }
}

export function extractAdvancedTraceArtifact(
  raw: string,
): AIChatTraceArtifact | null {
  try {
    const data = JSON.parse(raw);
    return buildTraceArtifact(data?.traceSummary);
  } catch {
    return null;
  }
}

export function stripCodeBlocks(content: string): string {
  return content
    .replace(/```[\w-]*\n[\s\S]*?```/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export function generateMockResponse(
  input: string,
  activeFile?: Pick<InlineAIFileContext, "path" | "language">,
): string {
  const normalizedInput = input.toLowerCase();

  if (
    includesAny(normalizedInput, [
      "explicar",
      "explain",
      "entender",
      "understand",
    ])
  ) {
    return [
      `This request looks like a guided reading of **${activeFile?.path ?? "a project section"}**.`,
      "",
      "The main flow I would follow is:",
      "1. identify inputs, state, and side effects",
      "2. map where UI and operator logic are mixed",
      "3. highlight what can be separated without breaking contracts",
      "",
      "If you want, the next step can be a component-oriented refactor or a risk-focused review.",
    ].join("\n");
  }

  if (
    includesAny(normalizedInput, ["refator", "refactor", "limpar", "cleanup"])
  ) {
    return [
      "Here is an initial refactor proposal, prioritizing single responsibility and a clearer operator surface:",
      "",
      "```typescript",
      "type InlineAISessionState = {",
      "  messages: InlineAIMessage[]",
      "  input: string",
      "  isLoading: boolean",
      "}",
      "",
      "export function useInlineAISession(activeFile?: InlineAIFileContext) {",
      "  const [state, setState] = useState<InlineAISessionState>({",
      "    messages: [buildWelcomeMessage(activeFile)],",
      "    input: '',",
      "    isLoading: false,",
      "  })",
      "",
      "  const queueResponse = (prompt: string) => {",
      "    // Separates the mock/API flow from the visual layer",
      "  }",
      "",
      "  return {",
      "    ...state,",
      "    queueResponse,",
      "  }",
      "}",
      "```",
      "",
      "The idea is to keep state, mock/API response, and visual components in distinct layers.",
    ].join("\n");
  }

  if (
    includesAny(normalizedInput, [
      "docs",
      "documentacao",
      "documentation",
      "comentario",
      "comentarios",
    ])
  ) {
    return [
      "I can document the operational intent of the flow with something like this:",
      "",
      "```typescript",
      "/**",
      " * Keeps the inline conversation attached to the active file and returns answers",
      " * the operator can review before applying any code to the editor.",
      " */",
      "function enqueueInlineAIResponse(prompt: string) {",
      "  // calls the response layer and preserves the operator UX",
      "}",
      "```",
      "",
      "If you want, I can also suggest targeted comments in higher-risk blocks.",
    ].join("\n");
  }

  if (
    includesAny(normalizedInput, [
      "bug",
      "bugs",
      "error",
      "errors",
      "failure",
      "failures",
      "risk",
      "risco",
    ])
  ) {
    return [
      "The most likely risks here are:",
      "",
      "- coupling between chat state, message renderer, and mock helpers",
      "- unclear affordances about when file context is attached",
      "- responses with code blocks appearing mixed into running text",
      "",
      "I can turn this review into a prioritized correction list or an initial patch.",
    ].join("\n");
  }

  const fileContext = activeFile
    ? `I am tracking **${activeFile.path}** (${activeFile.language}).`
    : "I am in general mode, without an attached file.";

  return [
    `Entendi o pedido sobre "${input}". ${fileContext}`,
    "",
    "I can continue through three paths:",
    "1. explain what already exists",
    "2. propose a safe refactor",
    "3. draft an initial code block for you to apply manually",
  ].join("\n");
}

function includesAny(content: string, candidates: string[]): boolean {
  return candidates.some((candidate) => content.includes(candidate));
}

function createMessageId(prefix: string): string {
  if (
    typeof crypto !== "undefined" &&
    typeof crypto.randomUUID === "function"
  ) {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}
