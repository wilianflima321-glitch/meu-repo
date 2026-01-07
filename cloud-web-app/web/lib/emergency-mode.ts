/**
 * Emergency Mode System - Controle de Custo e Botão de Pânico
 * 
 * Sistema para:
 * 1. Monitorar gastos em tempo real
 * 2. Ativar modo emergência quando custo explode
 * 3. Fallback automático para modelos baratos
 * 4. Alertas por email/webhook
 * 
 * @see PLANO_ACAO_TECNICA_2026.md - Seção 7.A
 */

import { prisma } from './db';
import { EventEmitter } from 'events';

// ============================================================================
// TIPOS
// ============================================================================

export type EmergencyLevel = 'normal' | 'warning' | 'critical' | 'shutdown';

export interface EmergencyState {
  level: EmergencyLevel;
  activatedAt: Date | null;
  activatedBy: string | null;
  reason: string | null;
  settings: EmergencySettings;
  metrics: CostMetrics;
}

export interface EmergencySettings {
  // Limites de custo (USD)
  dailyBudget: number;
  hourlyBudget: number;
  monthlyBudget: number;
  
  // Thresholds para alertas (%)
  warningThreshold: number;  // ex: 70% do budget
  criticalThreshold: number; // ex: 90% do budget
  
  // Ações automáticas
  autoDowngradeOnWarning: boolean;
  autoShutdownOnCritical: boolean;
  
  // Fallbacks
  fallbackModel: string;
  
  // Notificações
  alertEmails: string[];
  webhookUrl: string | null;
}

export interface CostMetrics {
  hourlySpend: number;
  dailySpend: number;
  monthlySpend: number;
  totalTokensToday: number;
  totalRequestsToday: number;
  avgCostPerRequest: number;
  lastUpdated: Date;
}

export interface ModelConfig {
  name: string;
  provider: 'openai' | 'anthropic' | 'google';
  inputCostPer1M: number;
  outputCostPer1M: number;
  isEmergencyAllowed: boolean;
}

// ============================================================================
// CONFIGURAÇÃO DE MODELOS
// ============================================================================

export const MODEL_CONFIGS: Record<string, ModelConfig> = {
  // OpenAI - Caros
  'gpt-4o': {
    name: 'GPT-4o',
    provider: 'openai',
    inputCostPer1M: 5.0,
    outputCostPer1M: 15.0,
    isEmergencyAllowed: false, // Bloqueado em emergência
  },
  'gpt-4-turbo': {
    name: 'GPT-4 Turbo',
    provider: 'openai',
    inputCostPer1M: 10.0,
    outputCostPer1M: 30.0,
    isEmergencyAllowed: false,
  },
  
  // OpenAI - Baratos (permitidos em emergência)
  'gpt-4o-mini': {
    name: 'GPT-4o Mini',
    provider: 'openai',
    inputCostPer1M: 0.15,
    outputCostPer1M: 0.60,
    isEmergencyAllowed: true,
  },
  'gpt-3.5-turbo': {
    name: 'GPT-3.5 Turbo',
    provider: 'openai',
    inputCostPer1M: 0.50,
    outputCostPer1M: 1.50,
    isEmergencyAllowed: true,
  },
  
  // Anthropic
  'claude-3-5-sonnet-20241022': {
    name: 'Claude 3.5 Sonnet',
    provider: 'anthropic',
    inputCostPer1M: 3.0,
    outputCostPer1M: 15.0,
    isEmergencyAllowed: false,
  },
  'claude-3-5-haiku-20241022': {
    name: 'Claude 3.5 Haiku',
    provider: 'anthropic',
    inputCostPer1M: 0.80,
    outputCostPer1M: 4.0,
    isEmergencyAllowed: true,
  },
  
  // Google
  'gemini-1.5-pro': {
    name: 'Gemini 1.5 Pro',
    provider: 'google',
    inputCostPer1M: 3.50,
    outputCostPer1M: 10.50,
    isEmergencyAllowed: false,
  },
  'gemini-1.5-flash': {
    name: 'Gemini 1.5 Flash',
    provider: 'google',
    inputCostPer1M: 0.075,
    outputCostPer1M: 0.30,
    isEmergencyAllowed: true,
  },
};

// ============================================================================
// CLASSE PRINCIPAL: EMERGENCY CONTROLLER
// ============================================================================

class EmergencyController extends EventEmitter {
  private state: EmergencyState;
  private metricsCache: CostMetrics | null = null;
  private lastMetricsUpdate: number = 0;
  
  constructor() {
    super();
    this.state = this.getDefaultState();
  }
  
  // ============================================================================
  // GETTERS
  // ============================================================================
  
  private getDefaultState(): EmergencyState {
    return {
      level: 'normal',
      activatedAt: null,
      activatedBy: null,
      reason: null,
      settings: {
        dailyBudget: parseFloat(process.env.AI_DAILY_BUDGET || '100'),
        hourlyBudget: parseFloat(process.env.AI_HOURLY_BUDGET || '20'),
        monthlyBudget: parseFloat(process.env.AI_MONTHLY_BUDGET || '2000'),
        warningThreshold: 70,
        criticalThreshold: 90,
        autoDowngradeOnWarning: true,
        autoShutdownOnCritical: false,
        fallbackModel: 'gpt-4o-mini',
        alertEmails: (process.env.ALERT_EMAILS || '').split(',').filter(Boolean),
        webhookUrl: process.env.ALERT_WEBHOOK_URL || null,
      },
      metrics: {
        hourlySpend: 0,
        dailySpend: 0,
        monthlySpend: 0,
        totalTokensToday: 0,
        totalRequestsToday: 0,
        avgCostPerRequest: 0,
        lastUpdated: new Date(),
      },
    };
  }
  
  /**
   * Retorna o estado atual do sistema de emergência
   */
  getState(): EmergencyState {
    return { ...this.state };
  }
  
  /**
   * Verifica se estamos em modo emergência
   */
  isEmergencyActive(): boolean {
    return this.state.level !== 'normal';
  }
  
  /**
   * Verifica se um modelo pode ser usado no estado atual
   */
  canUseModel(modelId: string): boolean {
    const config = MODEL_CONFIGS[modelId];
    if (!config) return false;
    
    // Em modo normal, todos os modelos são permitidos
    if (this.state.level === 'normal') return true;
    
    // Em modo shutdown, nenhum modelo é permitido
    if (this.state.level === 'shutdown') return false;
    
    // Em warning/critical, apenas modelos baratos são permitidos
    return config.isEmergencyAllowed;
  }
  
  /**
   * Retorna o modelo que deve ser usado (fallback se necessário)
   */
  getEffectiveModel(requestedModel: string): string {
    if (this.canUseModel(requestedModel)) {
      return requestedModel;
    }
    return this.state.settings.fallbackModel;
  }
  
  // ============================================================================
  // AÇÕES DE CONTROLE
  // ============================================================================
  
  /**
   * Ativa modo de emergência manualmente (Botão de Pânico)
   */
  async activateEmergency(
    level: EmergencyLevel,
    activatedBy: string,
    reason: string
  ): Promise<void> {
    const previousLevel = this.state.level;
    
    this.state.level = level;
    this.state.activatedAt = new Date();
    this.state.activatedBy = activatedBy;
    this.state.reason = reason;
    
    // Emite evento
    this.emit('emergency:activated', {
      previousLevel,
      newLevel: level,
      activatedBy,
      reason,
      timestamp: new Date(),
    });
    
    // Registra no banco
    await this.logEmergencyAction('EMERGENCY_ACTIVATED', {
      previousLevel,
      newLevel: level,
      activatedBy,
      reason,
    });
    
    // Envia alertas
    await this.sendAlerts(`🚨 EMERGENCY MODE ACTIVATED: ${level}`, reason);
    
    console.log(`[EmergencyController] Emergency activated: ${level} by ${activatedBy}`);
  }
  
  /**
   * Desativa modo de emergência
   */
  async deactivateEmergency(deactivatedBy: string): Promise<void> {
    const previousLevel = this.state.level;
    
    this.state.level = 'normal';
    this.state.activatedAt = null;
    this.state.activatedBy = null;
    this.state.reason = null;
    
    this.emit('emergency:deactivated', {
      previousLevel,
      deactivatedBy,
      timestamp: new Date(),
    });
    
    await this.logEmergencyAction('EMERGENCY_DEACTIVATED', {
      previousLevel,
      deactivatedBy,
    });
    
    await this.sendAlerts('✅ Emergency mode deactivated', `Deactivated by ${deactivatedBy}`);
    
    console.log(`[EmergencyController] Emergency deactivated by ${deactivatedBy}`);
  }
  
  /**
   * Atualiza métricas de custo
   */
  async updateMetrics(): Promise<CostMetrics> {
    const currentTime = Date.now();
    
    // Cache por 30 segundos
    if (this.metricsCache && currentTime - this.lastMetricsUpdate < 30000) {
      return this.metricsCache;
    }
    
    try {
      const now = new Date();
      const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate());
      const startOfHour = new Date(now.getFullYear(), now.getMonth(), now.getDate(), now.getHours());
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
      
      // Busca dados do banco - usando createdAt que é o campo correto
      const [hourly, daily, monthly] = await Promise.all([
        prisma.creditLedgerEntry.aggregate({
          where: {
            createdAt: { gte: startOfHour },
            type: { in: ['usage', 'ai_generation'] },
          },
          _sum: { amount: true },
          _count: { _all: true },
        }),
        prisma.creditLedgerEntry.aggregate({
          where: {
            createdAt: { gte: startOfDay },
            type: { in: ['usage', 'ai_generation'] },
          },
          _sum: { amount: true },
          _count: { _all: true },
        }),
        prisma.creditLedgerEntry.aggregate({
          where: {
            createdAt: { gte: startOfMonth },
            type: { in: ['usage', 'ai_generation'] },
          },
          _sum: { amount: true },
          _count: { _all: true },
        }),
      ]);
      
      // Converte créditos para USD (assumindo 1 crédito = $0.001)
      const creditsToUSD = (credits: number) => credits * 0.001;
      
      const hourlyAmount = hourly._sum?.amount || 0;
      const dailyAmount = daily._sum?.amount || 0;
      const monthlyAmount = monthly._sum?.amount || 0;
      const dailyCount = daily._count?._all || 0;
      
      const metrics: CostMetrics = {
        hourlySpend: creditsToUSD(Math.abs(hourlyAmount)),
        dailySpend: creditsToUSD(Math.abs(dailyAmount)),
        monthlySpend: creditsToUSD(Math.abs(monthlyAmount)),
        totalTokensToday: dailyCount * 1000, // Estimativa
        totalRequestsToday: dailyCount,
        avgCostPerRequest: dailyCount > 0 
          ? creditsToUSD(Math.abs(dailyAmount)) / dailyCount 
          : 0,
        lastUpdated: new Date(),
      };
      
      this.state.metrics = metrics;
      this.metricsCache = metrics;
      this.lastMetricsUpdate = currentTime;
      
      // Verifica thresholds automaticamente
      await this.checkThresholds(metrics);
      
      return metrics;
      
    } catch (error) {
      console.error('[EmergencyController] Failed to update metrics:', error);
      return this.state.metrics;
    }
  }
  
  /**
   * Verifica thresholds e ativa emergência automaticamente se necessário
   */
  private async checkThresholds(metrics: CostMetrics): Promise<void> {
    const { settings } = this.state;
    
    // Calcula percentuais
    const dailyPercent = (metrics.dailySpend / settings.dailyBudget) * 100;
    const hourlyPercent = (metrics.hourlySpend / settings.hourlyBudget) * 100;
    
    const maxPercent = Math.max(dailyPercent, hourlyPercent);
    
    // Critical threshold
    if (maxPercent >= settings.criticalThreshold) {
      if (this.state.level !== 'critical' && this.state.level !== 'shutdown') {
        if (settings.autoShutdownOnCritical) {
          await this.activateEmergency(
            'shutdown',
            'SYSTEM_AUTO',
            `Auto-shutdown: ${maxPercent.toFixed(1)}% of budget used`
          );
        } else {
          await this.activateEmergency(
            'critical',
            'SYSTEM_AUTO',
            `Auto-critical: ${maxPercent.toFixed(1)}% of budget used`
          );
        }
      }
    }
    // Warning threshold
    else if (maxPercent >= settings.warningThreshold) {
      if (this.state.level === 'normal') {
        if (settings.autoDowngradeOnWarning) {
          await this.activateEmergency(
            'warning',
            'SYSTEM_AUTO',
            `Auto-warning: ${maxPercent.toFixed(1)}% of budget used`
          );
        }
      }
    }
    // Normal - desativa se estiver em warning por auto
    else if (this.state.level === 'warning' && this.state.activatedBy === 'SYSTEM_AUTO') {
      await this.deactivateEmergency('SYSTEM_AUTO');
    }
  }
  
  /**
   * Atualiza configurações
   */
  updateSettings(newSettings: Partial<EmergencySettings>): void {
    this.state.settings = {
      ...this.state.settings,
      ...newSettings,
    };
    
    this.emit('settings:updated', this.state.settings);
  }
  
  // ============================================================================
  // HELPERS
  // ============================================================================
  
  /**
   * Registra ação no banco de dados
   */
  private async logEmergencyAction(
    action: string,
    details: Record<string, unknown>
  ): Promise<void> {
    try {
      await prisma.auditLog.create({
        data: {
          action: `EMERGENCY:${action}`,
          actorId: 'system',
          actorEmail: 'system@aethel.io',
          details: details as any,
          timestamp: new Date(),
        },
      });
    } catch (error) {
      console.error('[EmergencyController] Failed to log action:', error);
    }
  }
  
  /**
   * Envia alertas por email/webhook
   */
  private async sendAlerts(title: string, message: string): Promise<void> {
    const { alertEmails, webhookUrl } = this.state.settings;
    
    // Webhook
    if (webhookUrl) {
      try {
        await fetch(webhookUrl, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            title,
            message,
            level: this.state.level,
            metrics: this.state.metrics,
            timestamp: new Date().toISOString(),
          }),
        });
      } catch (error) {
        console.error('[EmergencyController] Failed to send webhook:', error);
      }
    }
    
    // Emails seriam enviados via serviço de email (Resend, SendGrid, etc)
    // Implementação simplificada - em produção usar queue
    if (alertEmails.length > 0) {
      console.log(`[EmergencyController] Would send email to: ${alertEmails.join(', ')}`);
      console.log(`  Title: ${title}`);
      console.log(`  Message: ${message}`);
    }
  }
  
  /**
   * Registra uso de IA para tracking
   */
  async trackAIUsage(
    userId: string,
    model: string,
    inputTokens: number,
    outputTokens: number
  ): Promise<void> {
    const config = MODEL_CONFIGS[model];
    if (!config) return;
    
    const inputCost = (inputTokens / 1_000_000) * config.inputCostPer1M;
    const outputCost = (outputTokens / 1_000_000) * config.outputCostPer1M;
    const totalCost = inputCost + outputCost;
    
    // Converte USD para créditos
    const credits = Math.ceil(totalCost * 1000);
    
    try {
      await prisma.creditLedgerEntry.create({
        data: {
          userId,
          amount: -credits,
          type: 'ai_generation',
          description: `AI usage: ${model}`,
          metadata: {
            model,
            inputTokens,
            outputTokens,
            costUSD: totalCost,
          },
        },
      });
    } catch (error) {
      console.error('[EmergencyController] Failed to track usage:', error);
    }
    
    // Atualiza métricas (invalidando cache)
    this.lastMetricsUpdate = 0;
  }
}

// ============================================================================
// SINGLETON
// ============================================================================

const globalForEmergency = globalThis as unknown as {
  emergencyController: EmergencyController | undefined;
};

export const emergencyController = 
  globalForEmergency.emergencyController ?? new EmergencyController();

if (process.env.NODE_ENV !== 'production') {
  globalForEmergency.emergencyController = emergencyController;
}

// ============================================================================
// API HELPERS
// ============================================================================

/**
 * Wrapper para chamadas de IA que respeita o modo de emergência
 */
export async function safeAICall<T>(
  requestedModel: string,
  userId: string,
  aiFunction: (model: string) => Promise<T>
): Promise<T> {
  const state = emergencyController.getState();
  
  // Shutdown total
  if (state.level === 'shutdown') {
    throw new Error('AI services are temporarily unavailable. Please try again later.');
  }
  
  // Pega modelo efetivo (fallback se necessário)
  const effectiveModel = emergencyController.getEffectiveModel(requestedModel);
  
  // Log se houve downgrade
  if (effectiveModel !== requestedModel) {
    console.log(`[EmergencyController] Model downgraded: ${requestedModel} -> ${effectiveModel}`);
  }
  
  return aiFunction(effectiveModel);
}

export default emergencyController;
