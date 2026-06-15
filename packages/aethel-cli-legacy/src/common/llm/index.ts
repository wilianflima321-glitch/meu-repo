/**
 * ═══════════════════════════════════════════════════════════════
 * LLM MODULE - EXPORTS
 * ═══════════════════════════════════════════════════════════════
 * 
 * Exportações centralizadas do módulo LLM
 */

// Real LLM Client
export {
  RealLLMClient,
  getLLMClient,
  createLLMClient,
  type LLMProvider,
  type LLMConfig,
  type CompletionResult,
  type Message,
  type StreamChunk,
} from './real-llm-client';

// LLM Integration Bridge
export {
  LLMIntegrationBridge,
  getLLMBridge,
  createLLMBridge,
  type LLMBridgeConfig,
  type PlanningRequest,
  type PlanningResult,
  type PlanStep,
  type TradingAnalysisRequest,
  type TradingAnalysisResult,
  type ChatCommandResult,
} from './llm-integration-bridge';

// LLM Router (se existir exports)
export * from './llm-router';
