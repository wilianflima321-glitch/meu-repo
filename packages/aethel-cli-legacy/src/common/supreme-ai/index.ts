/**
 * =================================================================
 * AETHEL SUPREME AI - MÓDULO CENTRAL DE EXPORTAÇÃO
 * =================================================================
 * 
 * Este arquivo centraliza todas as exportações do sistema Supreme AI,
 * permitindo importações limpas e organizadas.
 * 
 * @module SupremeAI
 * @version 2.0.0
 */

// ═══════════════════════════════════════════════════════════════
// IMPORTS PARA USO LOCAL
// ═══════════════════════════════════════════════════════════════
import { createBrowserClient } from '../web-automation/browser-client';
import { createScalpingEngine } from '../trading/hft/scalping-engine';
import { createMissionSystem } from '../mission-system/mission-executor';
import { createCloudDeployer } from '../cloud-deploy/cloud-deployer';
import { createLearningSystem } from '../learning-system/learning-system';
import { createSupremeOrchestrator } from '../supreme-orchestrator';

// ═══════════════════════════════════════════════════════════════
// WEB AUTOMATION
// ═══════════════════════════════════════════════════════════════
export {
  BrowserClient,
  createBrowserClient,
  type BrowserConfig,
  type NavigationResult,
  type PageAnalysis,
  type LoginResult,
} from '../web-automation/browser-client';

// ═══════════════════════════════════════════════════════════════
// TRADING HFT
// ═══════════════════════════════════════════════════════════════
export {
  ScalpingEngine,
  NeuralForecaster,
  createScalpingEngine,
  type ScalpingConfig,
  type Signal,
  type ScalpingTrade,
  type PredictionResult,
  type Candle,
  type Tick,
} from '../trading/hft/scalping-engine';

// ═══════════════════════════════════════════════════════════════
// MISSION SYSTEM
// ═══════════════════════════════════════════════════════════════
export {
  MissionExecutor,
  AIPlanner,
  createMissionSystem,
  type Mission,
  type Task,
  type MissionPlan,
  type ExecutionContext,
  type TaskTemplate,
} from '../mission-system/mission-executor';

// ═══════════════════════════════════════════════════════════════
// CLOUD DEPLOY
// ═══════════════════════════════════════════════════════════════
export {
  CloudDeployer,
  createCloudDeployer,
  type CloudProvider,
  type DeployConfig,
  type DeployResult,
  type ProjectType,
  type Deployment,
} from '../cloud-deploy/cloud-deployer';

// ═══════════════════════════════════════════════════════════════
// LEARNING SYSTEM
// ═══════════════════════════════════════════════════════════════
export {
  LearningSystem,
  createLearningSystem,
  type Experience,
  type Pattern,
  type UserPreference,
  type Strategy,
  type LearningMetrics,
  type LearningConfig,
} from '../learning-system/learning-system';

// ═══════════════════════════════════════════════════════════════
// SUPREME ORCHESTRATOR
// ═══════════════════════════════════════════════════════════════
export {
  SupremeOrchestrator,
  createSupremeOrchestrator,
  type OrchestratorConfig,
  type Task as OrchestratorTask,
  type SystemStatus,
} from '../supreme-orchestrator';

// ═══════════════════════════════════════════════════════════════
// TIPOS GLOBAIS
// ═══════════════════════════════════════════════════════════════

/**
 * Status de qualquer operação do sistema
 */
export type OperationStatus = 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';

/**
 * Níveis de prioridade para tarefas
 */
export type PriorityLevel = 'critical' | 'high' | 'medium' | 'low';

/**
 * Resultado genérico de operação
 */
export interface OperationResult<T = unknown> {
  success: boolean;
  data?: T;
  error?: string;
  duration?: number;
  timestamp: number;
}

/**
 * Evento do sistema
 */
export interface SystemEvent {
  type: string;
  source: string;
  data: unknown;
  timestamp: number;
}

/**
 * Configuração de conexão
 */
export interface ConnectionConfig {
  host: string;
  port: number;
  secure?: boolean;
  timeout?: number;
  retries?: number;
}

/**
 * Credenciais de autenticação
 */
export interface AuthCredentials {
  type: 'basic' | 'bearer' | 'api_key' | 'oauth2';
  credentials: Record<string, string>;
}

// ═══════════════════════════════════════════════════════════════
// CONSTANTES GLOBAIS
// ═══════════════════════════════════════════════════════════════

/**
 * Versão atual do sistema
 */
export const SUPREME_AI_VERSION = '2.0.0';

/**
 * Timeframes suportados para trading
 */
export const SUPPORTED_TIMEFRAMES = ['5s', '10s', '15s', '30s', '1m', '5m', '15m', '1h', '4h', '1d'] as const;

/**
 * Provedores de cloud suportados
 */
export const SUPPORTED_CLOUD_PROVIDERS = [
  'vercel',
  'netlify',
  'railway',
  'render',
  'fly',
  'aws',
  'gcp',
  'azure',
  'digitalocean',
  'heroku'
] as const;

/**
 * Serviços suportados para criação de conta
 */
export const SUPPORTED_SERVICES = [
  'gmail',
  'outlook',
  'vercel',
  'netlify',
  'railway',
  'render',
  'upwork',
  'fiverr',
  'freelancer',
  'binance',
  'bybit',
  'github',
  'gitlab',
  'digitalocean',
  'aws'
] as const;

/**
 * Tipos de missão disponíveis
 */
export const MISSION_TYPES = [
  'web_scrape',
  'deploy_cloud',
  'apply_freelance',
  'trading_setup',
  'custom'
] as const;

// ═══════════════════════════════════════════════════════════════
// FACTORY FUNCTIONS
// ═══════════════════════════════════════════════════════════════

/**
 * Cria uma instância completa do sistema Supreme AI
 * com todas as configurações padrão
 */
export function createSupremeAI(options: {
  enableTrading?: boolean;
  enableWebAutomation?: boolean;
  enableCloudDeploy?: boolean;
  enableMissions?: boolean;
  enableLearning?: boolean;
  mode?: 'autonomous' | 'supervised' | 'manual';
} = {}) {
  const {
    enableTrading = true,
    enableWebAutomation = true,
    enableCloudDeploy = true,
    enableMissions = true,
    enableLearning = true,
    mode = 'supervised'
  } = options;

  return createSupremeOrchestrator({
    enableWebAutomation,
    enableTrading,
    enableCloudDeploy,
    enableMissions,
    enableLearning,
    mode
  });
}

/**
 * Verifica se o sistema está pronto para uso
 */
export async function checkSystemReadiness(): Promise<{
  ready: boolean;
  components: Record<string, boolean>;
  missing: string[];
}> {
  const missing: string[] = [];

  const llmReady = Boolean(
    process.env.OPENAI_API_KEY ||
      process.env.ANTHROPIC_API_KEY ||
      process.env.GOOGLE_API_KEY ||
      process.env.GROQ_API_KEY
  );
  if (!llmReady) missing.push('Nenhuma chave de LLM configurada (OPENAI_API_KEY/ANTHROPIC_API_KEY/GOOGLE_API_KEY/GROQ_API_KEY).');

  // Playwright é opcional no projeto, então webAutomation só fica true quando realmente disponível.
  let webAutomationReady = false;
  try {
    await import('playwright');
    webAutomationReady = true;
  } catch {
    missing.push('Playwright não disponível (instale/playwright) — web automation desabilitada.');
  }

  const tradingReady = process.env.AETHEL_ENABLE_HFT === '1';
  if (!tradingReady) missing.push('Trading HFT desabilitado (defina AETHEL_ENABLE_HFT=1 para habilitar).');

  const cloudDeployReady = Boolean(process.env.AETHEL_ENABLE_CLOUD_DEPLOY === '1');
  if (!cloudDeployReady) missing.push('Cloud deploy desabilitado (defina AETHEL_ENABLE_CLOUD_DEPLOY=1 para habilitar).');

  const missionsReady = true;

  return {
    ready: missing.length === 0,
    components: {
      llm: llmReady,
      webAutomation: webAutomationReady,
      trading: tradingReady,
      cloudDeploy: cloudDeployReady,
      missions: missionsReady,
    },
    missing,
  };
}

// ═══════════════════════════════════════════════════════════════
// UTILITÁRIOS
// ═══════════════════════════════════════════════════════════════

/**
 * Formata um timestamp para display
 */
export function formatTimestamp(timestamp: number): string {
  return new Date(timestamp).toISOString();
}

/**
 * Calcula duração em formato legível
 */
export function formatDuration(ms: number): string {
  if (ms < 1000) return `${ms}ms`;
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`;
  if (ms < 3600000) return `${(ms / 60000).toFixed(1)}min`;
  return `${(ms / 3600000).toFixed(1)}h`;
}

/**
 * Gera um ID único
 */
export function generateId(prefix: string = ''): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 8);
  return prefix ? `${prefix}_${timestamp}_${random}` : `${timestamp}_${random}`;
}

/**
 * Delay assíncrono
 */
export function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry com backoff exponencial
 */
export async function retryWithBackoff<T>(
  fn: () => Promise<T>,
  maxRetries: number = 3,
  baseDelay: number = 1000
): Promise<T> {
  let lastError: Error | undefined;
  
  for (let i = 0; i < maxRetries; i++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error as Error;
      if (i < maxRetries - 1) {
        await delay(baseDelay * Math.pow(2, i));
      }
    }
  }
  
  throw lastError;
}

// ═══════════════════════════════════════════════════════════════
// EXPORT DEFAULT
// ═══════════════════════════════════════════════════════════════

export default {
  createSupremeAI,
  createSupremeOrchestrator,
  createBrowserClient,
  createScalpingEngine,
  createMissionSystem,
  createCloudDeployer,
  createLearningSystem,
  checkSystemReadiness,
  SUPREME_AI_VERSION,
  SUPPORTED_TIMEFRAMES,
  SUPPORTED_CLOUD_PROVIDERS,
  MISSION_TYPES
};
