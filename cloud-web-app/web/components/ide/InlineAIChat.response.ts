import { buildTraceArtifact, type AIChatTraceArtifact } from "@/components/agents";
import type {
  InlineAIFileContext,
  InlineAIMessage,
  InlineAIMessageCodeBlock,
} from "./InlineAIChat.types";

export function createInlineAIMessage(
  role: InlineAIMessage["role"],
  content: string,
  extras: Partial<Omit<InlineAIMessage, "id" | "role" | "content" | "timestamp">> = {},
): InlineAIMessage {
  return {
    id: createMessageId(role),
    role,
    content,
    timestamp: new Date(),
    ...extras,
  };
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
    return data?.choices?.[0]?.message?.content || data?.message?.content || data?.content || data?.output?.text || raw;
  } catch {
    return raw;
  }
}

export function extractAdvancedTraceArtifact(raw: string): AIChatTraceArtifact | null {
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

  if (includesAny(normalizedInput, ["explicar", "explain", "entender", "understand"])) {
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

  if (includesAny(normalizedInput, ["refator", "refactor", "limpar", "cleanup"])) {
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

  if (includesAny(normalizedInput, ["docs", "documentacao", "documentation", "comentario", "comentarios"])) {
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

  if (includesAny(normalizedInput, ["bug", "bugs", "error", "errors", "failure", "failures", "risk", "risco"])) {
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
    `Understood the request about "${input}". ${fileContext}`,
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
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return `${prefix}-${crypto.randomUUID()}`;
  }

  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}
