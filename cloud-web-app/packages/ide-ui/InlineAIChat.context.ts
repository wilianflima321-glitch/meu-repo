import { Check, Code2, FileText, Sparkles } from "lucide-react";
import type {
  InlineAIContextSummary,
  InlineAIFileContext,
  InlineAIMessage,
  InlineAIProjectContext,
  SuggestionChip,
} from "./InlineAIChat.types";
import { createInlineAIMessage } from "./InlineAIChat.response";

const FILE_SUGGESTIONS: SuggestionChip[] = [
  {
    id: "explain-file",
    icon: Code2,
    label: "Explain file",
    prompt: "Explain what this code does and which parts need the most attention.",
    operatorHint: "Guided reading of the current file",
  },
  {
    id: "refactor-file",
    icon: Sparkles,
    label: "Refactor",
    prompt: "Propose a safe refactor for this file and highlight what should change first.",
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
    prompt: "Help me design a new feature without losing sight of the current project contracts.",
    operatorHint: "Guided and incremental planning",
  },
  {
    id: "review-project",
    icon: Code2,
    label: "Read architecture",
    prompt: "Summarize the current project structure and suggest where to start this task.",
    operatorHint: "Repository overview before editing",
  },
];

export function buildWelcomeMessage(activeFile?: InlineAIFileContext): InlineAIMessage {
  return createInlineAIMessage(
    "system",
    activeFile
      ? `I am tracking **${activeFile.path}**. I can explain it, review risks, draft an initial patch, or prepare code for you to apply.`
      : "Hello! This inline space is for quick operations: explain, review, plan changes, and generate applicable code blocks without leaving the flow.",
  );
}

export function buildContextShiftMessage(activeFile?: InlineAIFileContext, previousPath?: string): InlineAIMessage {
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

export function buildSuggestionChips(activeFile?: InlineAIFileContext): SuggestionChip[] {
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
      detailLabel: "Quick suggestions only fill the composer. Nothing enters the editor until you use Apply.",
      canApplyDirectly: true,
    };
  }

  if (activeFile) {
    return {
      statusLabel: "File attached",
      scopeLabel: getInlineAIFileName(activeFile.path),
      operatorLabel: `I am reading ${activeFile.language} directly from the current file, which helps with review, explanation, and more surgical patch proposals.`,
      detailLabel: "When I return code, sending it to the editor remains manual and explicit.",
      canApplyDirectly: true,
    };
  }

  if (projectContext) {
    return {
      statusLabel: "Project attached",
      scopeLabel: `${projectContext.name} - ${projectContext.files.length} files`,
      operatorLabel: `With no active file, I will answer at the architecture and project-flow level for ${projectContext.name}.`,
      detailLabel: "Open a file when you want to switch from broad consultation to localized operation.",
      canApplyDirectly: false,
    };
  }

  return {
    statusLabel: "Consultation mode",
    scopeLabel: "No attached context",
    operatorLabel: "I can help with general questions, but an open file makes answers much more operational.",
    detailLabel: "Use quick suggestions to structure the request before sending.",
    canApplyDirectly: false,
  };
}

export function getLoadingLabel(
  activeFile?: InlineAIFileContext,
  projectContext?: InlineAIProjectContext,
): string {
  if (activeFile) return `Drafting an answer with context from ${getInlineAIFileName(activeFile.path)}.`;
  if (projectContext) return `Drafting an answer with context from project ${projectContext.name}.`;
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
    sections.push([
      "INLINE_FILE_CONTEXT",
      `path: ${params.activeFile.path}`,
      `language: ${params.activeFile.language}`,
      "content:",
      params.activeFile.content.slice(0, 6000),
    ].join("\n"));
  }

  if (params.projectContext) {
    sections.push([
      "INLINE_PROJECT_CONTEXT",
      `project: ${params.projectContext.name}`,
      `knownFiles: ${params.projectContext.files.slice(0, 24).join(", ") || "n/a"}`,
    ].join("\n"));
  }

  sections.push([
    "INLINE_OPERATOR_GOAL",
    normalizedPrompt,
    "",
    "Respond operationally. When suggesting code, prefer applicable blocks and briefly explain the change target.",
  ].join("\n"));

  return sections.join("\n\n");
}

export function getInlineAIFileName(path: string): string {
  const segments = path.split(/[\\/]/);
  return segments[segments.length - 1] || path;
}
