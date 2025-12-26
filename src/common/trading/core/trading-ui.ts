/**
 * Trading UI - Interface Minimalista
 * Status bar compacta + Preview sob demanda + Integração chat
 */

import { injectable } from 'inversify';
import { EventEmitter } from 'events';
import { TradingService } from './trading-service';
import { AutonomyLevel } from './trading-types';
import { AITradingState, TradingEvent, Position, TradeDecision } from './trading-types';

/**
 * Status Bar Data - Dados para exibição na status bar
 */
export interface StatusBarData {
  isActive: boolean;
  status: string;
  statusIcon: string;
  pnl: {
    daily: number;
    dailyPct: string;
    color: 'green' | 'red' | 'neutral';
  };
  positions: {
    count: number;
    winning: number;
    losing: number;
  };
  activity: {
    signalsToday: number;
    tradesExecuted: number;
  };
  risk: {
    level: 'low' | 'medium' | 'high' | 'critical';
    color: 'green' | 'yellow' | 'orange' | 'red';
  };
  humanScore: number;
  tooltip: string;
}

/**
 * Preview Panel Data - Dados para o painel de preview
 */
export interface PreviewPanelData {
  // Summary
  summary: {
    status: string;
    autonomyLevel: string;
    activeSince: Date | null;
    brokerConnected: boolean;
    paperTrading: boolean;
  };

  // Performance
  performance: {
    dailyPnL: number;
    weeklyPnL: number;
    monthlyPnL: number;
    totalPnL: number;
    winRate: number;
    profitFactor: number;
    sharpeRatio: number;
  };

  // Positions
  positions: PositionDisplay[];

  // Recent Activity
  recentActivity: ActivityItem[];

  // Risk Status
  riskStatus: {
    overallRisk: string;
    drawdown: number;
    maxDrawdown: number;
    dailyLossUsed: number;
    dailyLossLimit: number;
    circuitBreakers: CircuitBreakerStatus[];
  };

  // Anti-Detection
  antiDetection: {
    humanScore: number;
    patternVariance: number;
    timingRandomness: number;
    warnings: string[];
  };

  // Pending Decisions
  pendingDecisions: DecisionDisplay[];

  // Active Strategies
  strategies: StrategyStatus[];
}

interface PositionDisplay {
  asset: string;
  side: 'long' | 'short';
  quantity: number;
  entryPrice: number;
  currentPrice: number;
  unrealizedPnL: number;
  unrealizedPnLPct: number;
  color: 'green' | 'red';
}

interface ActivityItem {
  timestamp: Date;
  type: string;
  message: string;
  icon: string;
}

interface CircuitBreakerStatus {
  type: string;
  triggered: boolean;
  cooldownRemaining?: number;
}

interface DecisionDisplay {
  asset: string;
  action: 'buy' | 'sell';
  confidence: number;
  reasoning: string;
  awaitingConfirmation: boolean;
}

interface StrategyStatus {
  id: string;
  name: string;
  active: boolean;
  performance: number;
  lastSignal: string;
}

/**
 * Chat Command - Comando recebido do chat
 */
export interface ChatCommand {
  action: 'start' | 'stop' | 'status' | 'buy' | 'sell' | 'positions' | 'pnl' | 
          'risk' | 'set_autonomy' | 'confirm' | 'reject' | 'analyze' | 'help';
  params?: Record<string, any>;
}

/**
 * Chat Response - Resposta para o chat
 */
export interface ChatResponse {
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
  data?: any;
}

/**
 * Trading UI Controller
 * Controla toda a interface minimalista do sistema de trading
 */
@injectable()
export class TradingUIController extends EventEmitter {
  private tradingService: TradingService;
  private previewPanelVisible: boolean = false;
  private lastStatusUpdate: Date = new Date();

  constructor(tradingService: TradingService) {
    super();
    this.tradingService = tradingService;
    this.setupEventListeners();
  }

  // ============================================
  // STATUS BAR (200x30px, bottom-right)
  // ============================================

  /**
   * Get data for status bar display
   */
  getStatusBarData(): StatusBarData {
    const state = this.tradingService.getState();
    const metrics = this.tradingService.getAntiDetectionMetrics();

    // Status icon mapping
    const statusIcons: Record<string, string> = {
      'idle': '⏸️',
      'active': '▶️',
      'analyzing': '🔍',
      'cooldown': '⏳',
      'outside_hours': '🌙',
      'error': '❌',
    };

    // Risk color mapping
    const riskColors: Record<string, 'green' | 'yellow' | 'orange' | 'red'> = {
      'low': 'green',
      'medium': 'yellow',
      'high': 'orange',
      'critical': 'red',
    };

    // Calculate PnL color
    const pnlColor: 'green' | 'red' | 'neutral' = 
      state.dailyPnL > 0 ? 'green' : state.dailyPnL < 0 ? 'red' : 'neutral';

    // Count winning/losing positions
    const positions = state.activePositions || [];
    const winning = positions.filter(p => (p.unrealizedPnL || 0) > 0).length;
    const losing = positions.filter(p => (p.unrealizedPnL || 0) < 0).length;

    return {
      isActive: state.isActive,
      status: state.status,
      statusIcon: statusIcons[state.status] || '❓',
      pnl: {
        daily: state.dailyPnL,
        dailyPct: this.formatPct(state.dailyPnL / 10000), // Assuming 10k account
        color: pnlColor,
      },
      positions: {
        count: positions.length,
        winning,
        losing,
      },
      activity: {
        signalsToday: state.signalsToday,
        tradesExecuted: state.tradesExecuted,
      },
      risk: {
        level: state.riskLevel,
        color: riskColors[state.riskLevel],
      },
      humanScore: metrics.humanScore,
      tooltip: this.buildTooltip(state),
    };
  }

  /**
   * Get formatted status bar text (compact)
   */
  getStatusBarText(): string {
    const data = this.getStatusBarData();
    
    // Format: 🔍 +$123 (2/0) | Risk: Low | H:95
    const pnlStr = data.pnl.daily >= 0 ? `+$${data.pnl.daily.toFixed(0)}` : `-$${Math.abs(data.pnl.daily).toFixed(0)}`;
    const posStr = `${data.positions.winning}/${data.positions.losing}`;
    
    return `${data.statusIcon} ${pnlStr} (${posStr}) | ${data.risk.level.toUpperCase()} | H:${data.humanScore}`;
  }

  // ============================================
  // PREVIEW PANEL (on-demand, 400px width)
  // ============================================

  /**
   * Show preview panel
   */
  showPreviewPanel(): void {
    this.previewPanelVisible = true;
    this.emit('previewPanelVisibilityChanged', true);
  }

  /**
   * Hide preview panel
   */
  hidePreviewPanel(): void {
    this.previewPanelVisible = false;
    this.emit('previewPanelVisibilityChanged', false);
  }

  /**
   * Toggle preview panel
   */
  togglePreviewPanel(): void {
    this.previewPanelVisible = !this.previewPanelVisible;
    this.emit('previewPanelVisibilityChanged', this.previewPanelVisible);
  }

  /**
   * Get preview panel data
   */
  async getPreviewPanelData(): Promise<PreviewPanelData> {
    const state = this.tradingService.getState();
    const positions = await this.tradingService.getPositions();
    const metrics = await this.tradingService.getPortfolioMetrics();
    const antiDetection = this.tradingService.getAntiDetectionMetrics();
    const events = this.tradingService.getEventHistory(20);

    const broker = this.tradingService.getBrokerConnectionStatus();
    const pnl = this.tradingService.getPnLSummary();
    const riskParams = this.tradingService.getRiskParameters();
    const breakers = this.tradingService.getCircuitBreakerStatus();
    const strategies = this.tradingService.getActiveStrategiesSnapshot();

    const perfWeek = state.performance?.week;
    const perfMonth = state.performance?.month;
    const perfAny = state.performance?.today ?? perfWeek ?? perfMonth;
    const winRate = (() => {
      const t = perfAny?.trades?.total;
      const w = perfAny?.trades?.winners;
      if (typeof t !== 'number' || typeof w !== 'number' || t <= 0) return 0;
      return w / t;
    })();
    const profitFactor = perfAny?.ratios?.profitFactor ?? 0;
    const sharpeRatio = perfAny?.ratios?.sharpeRatio ?? 0;

    const dailyLossLimit = Math.max(0, pnl.currentEquity * riskParams.daily.maxDailyLoss);

    return {
      summary: {
        status: state.status,
        autonomyLevel: state.autonomyLevel,
        activeSince: state.isActive ? state.lastAnalysisTime : null,
        brokerConnected: broker.connected,
        paperTrading: this.tradingService.isPaperTradingEnabled(),
      },

      performance: {
        dailyPnL: state.dailyPnL,
        weeklyPnL: pnl.weeklyPnL,
        monthlyPnL: pnl.monthlyPnL,
        totalPnL: state.totalPnL,
        winRate,
        profitFactor,
        sharpeRatio,
      },

      positions: positions.map(p => this.formatPosition(p)),

      recentActivity: events.map(e => this.formatActivity(e)),

      riskStatus: {
        overallRisk: state.riskLevel,
        drawdown: metrics.drawdown,
        maxDrawdown: metrics.maxDrawdown,
        dailyLossUsed: Math.abs(state.dailyPnL),
        dailyLossLimit,
        circuitBreakers: breakers.map(b => ({
          type: b.type,
          triggered: b.triggered,
          cooldownRemaining: b.cooldownEndsAt ? Math.max(0, b.cooldownEndsAt.getTime() - Date.now()) : undefined,
        })),
      },

      antiDetection: {
        humanScore: antiDetection.humanScore,
        patternVariance: antiDetection.patternVariance,
        timingRandomness: antiDetection.timingRandomness,
        warnings: antiDetection.warnings,
      },

      pendingDecisions: state.pendingDecisions.map(d => this.formatDecision(d)),

      strategies: strategies.map(s => ({
        id: s.id,
        name: s.name,
        active: true,
        performance: s.performance,
        lastSignal: s.lastSignal,
      })),
    };
  }

  // ============================================
  // CHAT INTEGRATION (@trader prefix)
  // ============================================

  /**
   * Parse chat message and extract command
   */
  parseChatMessage(message: string): ChatCommand | null {
    // Check for @trader prefix
    const traderMatch = message.match(/@trader\s+(.+)/i);
    if (!traderMatch) return null;

    const commandStr = traderMatch[1].toLowerCase().trim();

    // Parse commands
    if (commandStr === 'start' || commandStr === 'iniciar') {
      return { action: 'start' };
    }

    if (commandStr === 'stop' || commandStr === 'parar') {
      return { action: 'stop' };
    }

    if (commandStr === 'status') {
      return { action: 'status' };
    }

    if (commandStr.startsWith('buy') || commandStr.startsWith('comprar')) {
      const parts = commandStr.split(/\s+/);
      return {
        action: 'buy',
        params: {
          quantity: parts[1] ? parseFloat(parts[1]) : undefined,
          asset: parts[2] || parts[1],
        },
      };
    }

    if (commandStr.startsWith('sell') || commandStr.startsWith('vender')) {
      const parts = commandStr.split(/\s+/);
      return {
        action: 'sell',
        params: {
          quantity: parts[1] ? parseFloat(parts[1]) : undefined,
          asset: parts[2] || parts[1],
        },
      };
    }

    if (commandStr === 'positions' || commandStr === 'posições') {
      return { action: 'positions' };
    }

    if (commandStr === 'pnl' || commandStr === 'resultado') {
      return { action: 'pnl' };
    }

    if (commandStr === 'risk' || commandStr === 'risco') {
      return { action: 'risk' };
    }

    if (commandStr.startsWith('autonomy') || commandStr.startsWith('autonomia')) {
      const level = commandStr.split(/\s+/)[1];
      return {
        action: 'set_autonomy',
        params: { level },
      };
    }

    if (commandStr === 'confirm' || commandStr === 'confirmar') {
      return { action: 'confirm' };
    }

    if (commandStr === 'reject' || commandStr === 'rejeitar') {
      return { action: 'reject' };
    }

    if (commandStr.startsWith('analyze') || commandStr.startsWith('analisar')) {
      const asset = commandStr.split(/\s+/)[1];
      return {
        action: 'analyze',
        params: { asset },
      };
    }

    if (commandStr === 'help' || commandStr === 'ajuda') {
      return { action: 'help' };
    }

    return null;
  }

  /**
   * Execute chat command
   */
  async executeChatCommand(command: ChatCommand): Promise<ChatResponse> {
    switch (command.action) {
      case 'start':
        await this.tradingService.start();
        return { message: '▶️ Trading automatizado iniciado', type: 'success' };

      case 'stop':
        await this.tradingService.stop();
        return { message: '⏸️ Trading automatizado parado', type: 'success' };

      case 'status':
        return this.getStatusResponse();

      case 'buy':
        return await this.executeBuyCommand(command.params);

      case 'sell':
        return await this.executeSellCommand(command.params);

      case 'positions':
        return await this.getPositionsResponse();

      case 'pnl':
        return this.getPnLResponse();

      case 'risk':
        return this.getRiskResponse();

      case 'set_autonomy':
        return this.setAutonomyResponse(command.params?.level);

      case 'confirm':
        return await this.confirmPendingDecision();

      case 'reject':
        return this.rejectPendingDecision();

      case 'analyze':
        return await this.analyzeAsset(command.params?.asset);

      case 'help':
        return this.getHelpResponse();

      default:
        return { message: '❓ Comando não reconhecido. Use @trader help', type: 'warning' };
    }
  }

  // ============================================
  // PRIVATE METHODS - Response Generators
  // ============================================

  private getStatusResponse(): ChatResponse {
    const data = this.getStatusBarData();
    const state = this.tradingService.getState();

    const message = `
📊 **Status do Trading**
• Estado: ${data.statusIcon} ${state.status}
• Autonomia: ${state.autonomyLevel}
• P&L Diário: ${data.pnl.color === 'green' ? '🟢' : data.pnl.color === 'red' ? '🔴' : '⚪'} ${data.pnl.dailyPct}
• Posições: ${data.positions.count} (${data.positions.winning}W/${data.positions.losing}L)
• Sinais hoje: ${data.activity.signalsToday}
• Trades executados: ${data.activity.tradesExecuted}
• Risco: ${data.risk.level}
• Human Score: ${data.humanScore}%
    `.trim();

    return { message, type: 'info' };
  }

  private async executeBuyCommand(params?: Record<string, any>): Promise<ChatResponse> {
    if (!params?.asset) {
      return { message: '❌ Especifique o ativo. Ex: @trader buy 10 AAPL', type: 'error' };
    }

    const result = await this.tradingService.requestTrade(
      params.asset.toUpperCase(),
      'buy',
      params.quantity
    );

    if (result.success) {
      return {
        message: `✅ Ordem de compra enviada: ${params.quantity || 1} ${params.asset.toUpperCase()}`,
        type: 'success',
        data: result.order,
      };
    } else {
      return { message: `❌ Falha: ${result.reason}`, type: 'error' };
    }
  }

  private async executeSellCommand(params?: Record<string, any>): Promise<ChatResponse> {
    if (!params?.asset) {
      return { message: '❌ Especifique o ativo. Ex: @trader sell 10 AAPL', type: 'error' };
    }

    const result = await this.tradingService.requestTrade(
      params.asset.toUpperCase(),
      'sell',
      params.quantity
    );

    if (result.success) {
      return {
        message: `✅ Ordem de venda enviada: ${params.quantity || 1} ${params.asset.toUpperCase()}`,
        type: 'success',
        data: result.order,
      };
    } else {
      return { message: `❌ Falha: ${result.reason}`, type: 'error' };
    }
  }

  private async getPositionsResponse(): Promise<ChatResponse> {
    const positions = await this.tradingService.getPositions();

    if (positions.length === 0) {
      return { message: '📭 Nenhuma posição aberta', type: 'info' };
    }

    let message = '📈 **Posições Abertas**\n';
    for (const pos of positions) {
      const pnl = pos.unrealizedPnL || 0;
      const icon = pnl >= 0 ? '🟢' : '🔴';
      const pnlStr = pnl >= 0 ? `+$${pnl.toFixed(2)}` : `-$${Math.abs(pnl).toFixed(2)}`;
      message += `${icon} ${pos.assetId}: ${pos.quantity} @ $${pos.averagePrice.toFixed(2)} (${pnlStr})\n`;
    }

    return { message: message.trim(), type: 'info', data: positions };
  }

  private getPnLResponse(): ChatResponse {
    const state = this.tradingService.getState();
    
    const message = `
💰 **Resultado**
• Diário: ${state.dailyPnL >= 0 ? '+' : ''}$${state.dailyPnL.toFixed(2)}
• Total: ${state.totalPnL >= 0 ? '+' : ''}$${state.totalPnL.toFixed(2)}
    `.trim();

    return { message, type: 'info' };
  }

  private getRiskResponse(): ChatResponse {
    const state = this.tradingService.getState();
    const antiDetection = this.tradingService.getAntiDetectionMetrics();

    const riskIcon = {
      'low': '🟢',
      'medium': '🟡',
      'high': '🟠',
      'critical': '🔴',
    }[state.riskLevel];

    let message = `
⚠️ **Status de Risco**
• Nível: ${riskIcon} ${state.riskLevel}
• Human Score: ${antiDetection.humanScore}%
• Variância de padrão: ${antiDetection.patternVariance.toFixed(2)}
    `.trim();

    if (antiDetection.warnings.length > 0) {
      message += '\n\n**Alertas:**\n' + antiDetection.warnings.map(w => `• ${w}`).join('\n');
    }

    return { message, type: state.riskLevel === 'critical' ? 'error' : 'info' };
  }

  private setAutonomyResponse(level?: string): ChatResponse {
    const validLevels: AutonomyLevel[] = ['advisory', 'semi_auto', 'full_auto', 'guardian'];
    
    const parsed = validLevels.find(l => l === level);
    if (!parsed) {
      return {
        message: `❌ Nível inválido. Use: ${validLevels.join(', ')}`,
        type: 'error',
      };
    }

    this.tradingService.setAutonomyLevel(parsed);
    return {
      message: `✅ Autonomia alterada para: ${parsed}`,
      type: 'success',
    };
  }

  private async confirmPendingDecision(): Promise<ChatResponse> {
    const state = this.tradingService.getState();
    
    if (state.pendingDecisions.length === 0) {
      return { message: '📭 Nenhuma decisão pendente', type: 'info' };
    }

    const result = await this.tradingService.confirmPendingDecision(0);
    if (!result.success) {
      return { message: `❌ Falha ao executar decisão: ${result.reason ?? 'erro desconhecido'}`, type: 'error' };
    }

    return { message: '✅ Decisão confirmada e executada', type: 'success' };
  }

  private rejectPendingDecision(): ChatResponse {
    const state = this.tradingService.getState();
    
    if (state.pendingDecisions.length === 0) {
      return { message: '📭 Nenhuma decisão pendente', type: 'info' };
    }

    const result = this.tradingService.rejectPendingDecision(0);
    if (!result.success) {
      return { message: `❌ Falha ao rejeitar decisão: ${result.reason ?? 'erro desconhecido'}`, type: 'error' };
    }

    return { message: '✅ Decisão rejeitada', type: 'success' };
  }

  private async analyzeAsset(asset?: string): Promise<ChatResponse> {
    if (!asset) {
      return { message: '❌ Especifique o ativo. Ex: @trader analyze AAPL', type: 'error' };
    }

    const symbol = asset.toUpperCase();
    const decision = await this.tradingService.analyzeOnce(symbol);
    if (!decision) {
      return { message: `ℹ️ Sem sinal acionável para ${symbol} agora.`, type: 'info' };
    }

    const qty = decision.quantity ?? decision.size ?? 0;
    return {
      message: `🔍 **Análise ${symbol}**\n• Ação: ${decision.action}\n• Confiança: ${(decision.confidence * 100).toFixed(0)}%\n• Qty: ${qty.toFixed ? qty.toFixed(6) : qty}\n• Entrada: ${decision.entryPrice ?? decision.price ?? 'N/A'}\n• Stop: ${decision.stopLoss ?? 'N/A'}\n• Target: ${decision.takeProfit ?? 'N/A'}`,
      type: 'info',
    };
  }

  private getHelpResponse(): ChatResponse {
    const message = `
📚 **Comandos @trader**
• \`start\` / \`iniciar\` - Iniciar trading automático
• \`stop\` / \`parar\` - Parar trading
• \`status\` - Ver status atual
• \`buy [qtd] ATIVO\` - Comprar
• \`sell [qtd] ATIVO\` - Vender
• \`positions\` / \`posições\` - Ver posições
• \`pnl\` / \`resultado\` - Ver P&L
• \`risk\` / \`risco\` - Ver status de risco
• \`autonomy NIVEL\` - Definir autonomia
• \`confirm\` / \`reject\` - Confirmar/rejeitar decisão
• \`analyze ATIVO\` - Analisar ativo

**Níveis de Autonomia:**
• \`advisory\` - Apenas sugestões
• \`semi_auto\` - Executa com confirmação
• \`full_auto\` - Totalmente autônomo
• \`guardian\` - Só ações protetivas
    `.trim();

    return { message, type: 'info' };
  }

  // ============================================
  // PRIVATE METHODS - Formatting
  // ============================================

  private formatPct(value: number): string {
    const sign = value >= 0 ? '+' : '';
    return `${sign}${(value * 100).toFixed(2)}%`;
  }

  private buildTooltip(state: AITradingState): string {
    return `Status: ${state.status}\nAutonomia: ${state.autonomyLevel}\nClique para detalhes`;
  }

  private formatPosition(position: Position): PositionDisplay {
    const pnl = position.unrealizedPnL || 0;
    const pnlPct = position.averagePrice > 0 
      ? (pnl / (position.quantity * position.averagePrice)) * 100 
      : 0;

    return {
      asset: position.assetId,
      side: (position.side === 'flat' ? 'long' : position.side) || 'long',
      quantity: position.quantity,
      entryPrice: position.averagePrice,
      currentPrice: position.marketValue / position.quantity,
      unrealizedPnL: pnl,
      unrealizedPnLPct: pnlPct,
      color: pnl >= 0 ? 'green' : 'red',
    };
  }

  private formatActivity(event: TradingEvent): ActivityItem {
    const icons: Record<string, string> = {
      'order': '📝',
      'trade': '💹',
      'analysis': '🔍',
      'risk': '⚠️',
      'error': '❌',
      'system': '⚙️',
      'circuit_breaker': '🛑',
    };

    return {
      timestamp: typeof event.timestamp === 'number' ? new Date(event.timestamp) : event.timestamp,
      type: event.type,
      message: event.data?.message || String(event.type),
      icon: icons[event.type] || '📌',
    };
  }

  private formatDecision(decision: TradeDecision): DecisionDisplay {
    return {
      asset: decision.assetId,
      action: decision.action as 'buy' | 'sell',
      confidence: decision.confidence,
      reasoning: decision.reasoning?.[0] || 'Sem descrição',
      awaitingConfirmation: true,
    };
  }

  // ============================================
  // EVENT HANDLING
  // ============================================

  private setupEventListeners(): void {
    // Update status bar when state changes
    this.tradingService.on('event', () => {
      this.emit('statusBarUpdate', this.getStatusBarData());
    });

    // Notify about trade suggestions
    this.tradingService.on('tradeSuggestion', (decision: TradeDecision) => {
      this.emit('notification', {
        type: 'suggestion',
        message: `💡 Sugestão: ${decision.action.toUpperCase()} ${decision.assetId} (${(decision.confidence * 100).toFixed(0)}% confiança)`,
        decision,
      });
    });

    // Notify about confirmation requests
    this.tradingService.on('tradeConfirmationRequired', (decision: TradeDecision) => {
      this.emit('notification', {
        type: 'confirmation',
        message: `❓ Confirmar: ${decision.action.toUpperCase()} ${decision.assetId}?`,
        decision,
        actions: ['confirm', 'reject'],
      });
    });

    // Notify about circuit breakers
    this.tradingService.on('circuitBreaker', ({ type, reason }) => {
      this.emit('notification', {
        type: 'warning',
        message: `🛑 Circuit Breaker: ${type} - ${reason}`,
      });
    });
  }
}
