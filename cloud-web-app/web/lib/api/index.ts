/**
 * API Client Index
 * Central export for all API clients
 */

import { getLSPApiClient } from './lsp-api';
import { getDAPApiClient } from './dap-api';
import { getAIApiClient } from './ai-api';

export { LSPApiClient, getLSPApiClient } from './lsp-api';
export type { LSPServerConfig, LSPRequest, LSPResponse, LSPNotification } from './lsp-api';

export { DAPApiClient, getDAPApiClient } from './dap-api';
export type { DAPAdapterConfig, DAPRequest, DAPResponse, DAPEvent } from './dap-api';

export { AIApiClient, getAIApiClient } from './ai-api';
export type {
  AICompletionRequest,
  AICompletionResponse,
  AIHoverRequest,
  AIHoverResponse,
  AICodeActionRequest,
  AICodeActionResponse,
  AIDebugAnalysisRequest,
  AIDebugAnalysisResponse,
  AITestGenerationRequest,
  AITestGenerationResponse,
  AICommitMessageRequest,
  AICommitMessageResponse,
  AICodeReviewRequest,
  AICodeReviewResponse,
  AIConflictResolutionRequest,
  AIConflictResolutionResponse,
} from './ai-api';

/**
 * Initialize all API clients
 */
export function initializeApiClients(): void {
  getLSPApiClient();
  getDAPApiClient();
  getAIApiClient();
  console.log('[API] All clients initialized');
}
