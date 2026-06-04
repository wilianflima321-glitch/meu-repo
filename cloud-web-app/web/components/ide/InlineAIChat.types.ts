import type { LucideIcon } from "lucide-react";
import type { AIChatTraceArtifact } from "@/components/ai-chat/ai-chat-evidence";

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
