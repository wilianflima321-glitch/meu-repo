export type {
  InlineAIChatProps,
  InlineAIContextSummary,
  InlineAIFileContext,
  InlineAIMessage,
  InlineAIMessageCodeBlock,
  InlineAIProjectContext,
  SuggestionChip,
} from "./InlineAIChat.types";
export {
  buildContextShiftMessage,
  buildContextSummary,
  buildInlineAIRequestMessage,
  buildSuggestionChips,
  buildWelcomeMessage,
  getInlineAIFileName,
  getLoadingLabel,
} from "./InlineAIChat.context";
export {
  createInlineAIMessage,
  extractAdvancedResponseContent,
  extractAdvancedTraceArtifact,
  extractCodeBlocks,
  generateMockResponse,
  stripCodeBlocks,
} from "./InlineAIChat.response";
