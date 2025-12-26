# 🏦 Aethel Trading AI System - Arquitetura Interna Completa

> **Filosofia**: Interface minimalista, robustez interna máxima.
> **Objetivo**: IAs autônomas que operam como traders profissionais humanos.

---

## 📐 Visão Geral da Arquitetura

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        AETHEL TRADING AI SYSTEM                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐         │
│  │   USER LAYER    │    │   AI LAYER      │    │  MARKET LAYER   │         │
│  │  (Minimalista)  │◄──►│  (Autônoma)     │◄──►│  (Real-time)    │         │
│  └─────────────────┘    └─────────────────┘    └─────────────────┘         │
│         │                       │                       │                   │
│         ▼                       ▼                       ▼                   │
│  ┌─────────────────────────────────────────────────────────────────┐       │
│  │                    EXECUTION ENGINE                              │       │
│  │  Anti-Detection │ Risk Management │ Order Routing │ Compliance   │       │
│  └─────────────────────────────────────────────────────────────────┘       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 🎯 Princípios Fundamentais

### 1. Interface Minimalista (User Layer)
```
┌─────────────────────────────────────────┐
│ IDE Principal (não poluída)             │
│                                         │
│  Chat: "Analise PETR4 e opere se       │
│         identificar oportunidade"       │
│                                         │
│  [Preview Button] ← Só aparece quando   │
│                     necessário          │
│                                         │
│  Status: 🟢 Monitorando | 💰 +2.3%     │
│         (barra mínima, não intrusiva)   │
└─────────────────────────────────────────┘
```

### 2. Robustez Interna (AI Layer)
- IA opera com **autonomia total** quando autorizada
- **Auto-questionamento** constante
- **Adaptação em tempo real**
- **Proteção de patrimônio** como prioridade

### 3. Anti-Detecção (Parecer Humano)
- Padrões de comportamento humanizados
- Delays variáveis e naturais
- Horários de operação realistas
- Movimentação orgânica

---

## 🧠 CORE: Trading AI Brain

### Módulo 1: Market Intelligence Engine

```typescript
interface MarketIntelligenceEngine {
  // Análise multi-dimensional em tempo real
  realTimeAnalysis: {
    technical: TechnicalAnalysis;      // Indicadores, padrões
    fundamental: FundamentalAnalysis;  // Balanços, notícias
    sentiment: SentimentAnalysis;      // Redes sociais, fluxo
    microstructure: MarketMicrostructure; // Order flow, book
    macro: MacroeconomicAnalysis;      // Juros, câmbio, ciclos
  };
  
  // Cobertura de mercados
  markets: {
    equities: StockMarket[];           // B3, NYSE, NASDAQ
    crypto: CryptoExchange[];          // Binance, Coinbase
    forex: ForexBroker[];              // MT5 compatível
    futures: FuturesExchange[];        // CME, B3 derivativos
    options: OptionsMarket[];          // Opções e estruturas
    commodities: CommodityMarket[];    // Ouro, petróleo, agrícolas
  };
  
  // Adaptação contínua
  adaptation: {
    strategyMutation: StrategyEvolver;
    marketRegimeDetection: RegimeDetector;
    anomalyResponse: AnomalyHandler;
    correlationTracker: CorrelationEngine;
  };
}
```

### Módulo 2: Autonomous Decision System

```typescript
interface AutonomousDecisionSystem {
  // Níveis de autonomia (usuário escolhe)
  autonomyLevels: {
    ADVISORY: 'Sugere, não executa';
    SEMI_AUTO: 'Executa com confirmação';
    FULL_AUTO: 'Opera autonomamente';
    GUARDIAN: 'Protege patrimônio apenas';
  };
  
  // Processo de decisão
  decisionProcess: {
    // 1. Coleta de dados
    dataGathering: () => MarketSnapshot;
    
    // 2. Análise multi-modelo
    multiModelAnalysis: (data: MarketSnapshot) => AnalysisResult[];
    
    // 3. Consenso entre modelos
    consensusBuilding: (analyses: AnalysisResult[]) => Consensus;
    
    // 4. Auto-questionamento
    selfQuestioning: (consensus: Consensus) => ValidationResult;
    
    // 5. Decisão final
    finalDecision: (validated: ValidationResult) => TradeDecision;
    
    // 6. Execução humanizada
    humanizedExecution: (decision: TradeDecision) => ExecutionPlan;
  };
  
  // Critérios de auto-questionamento
  selfQuestioningCriteria: {
    'Por que este trade e não outro?': ReasoningCheck;
    'Qual o risco real vs. percebido?': RiskAssessment;
    'O mercado mudou desde a análise?': FreshnessCheck;
    'Estou seguindo viés ou dados?': BiasDetection;
    'Qual o custo de oportunidade?': OpportunityCost;
    'E se eu estiver errado?': WrongScenarioPlanning;
  };
}
```

### Módulo 3: Anti-Detection System (Human Mimicry)

```typescript
interface AntiDetectionSystem {
  // Comportamento humanizado
  humanBehavior: {
    // Delays naturais (não mecânicos)
    reactionTime: {
      base: '200-800ms';  // Tempo de reação humano
      variance: 'gaussian'; // Distribuição natural
      fatigueFactor: true;  // Fica mais lento ao longo do dia
    };
    
    // Padrões de operação
    tradingPatterns: {
      // Não opera 24/7
      activeHours: '9:00-17:30 (com pausas)';
      lunchBreak: '12:00-13:30 (reduz atividade)';
      weekendMode: 'apenas monitoramento';
      
      // Não opera em bloco
      orderSplitting: true;  // Divide ordens grandes
      iceberg: true;         // Esconde tamanho real
      randomization: true;   // Varia tamanhos/tempos
    };
    
    // Mouse/Keyboard simulation (para web brokers)
    inputSimulation: {
      mouseMovement: 'bezier curves + tremor';
      typingSpeed: 'variable 40-80 WPM';
      mistakes: 'occasional typos + corrections';
      scrollBehavior: 'natural reading patterns';
    };
  };
  
  // Fingerprint management
  fingerprint: {
    browserRotation: true;
    ipRotation: 'residential proxies';
    deviceEmulation: 'consistent per session';
    cookieManagement: 'persistent but aged';
  };
  
  // Detection avoidance
  avoidance: {
    rateLimiting: 'self-imposed below thresholds';
    patternBreaking: 'intentional irregularity';
    volumeDistribution: 'matches market profile';
    timeDistribution: 'follows human patterns';
  };
}
```

---

## 💹 Estratégias Adaptativas

### Strategy Evolution Engine

```typescript
interface StrategyEvolutionEngine {
  // Biblioteca de estratégias base
  strategyLibrary: {
    // Trend Following
    trendFollowing: {
      movingAverageCrossover: Strategy;
      breakoutTrading: Strategy;
      momentumRiding: Strategy;
    };
    
    // Mean Reversion
    meanReversion: {
      bollingerBandsMeanReversion: Strategy;
      rsiOversoldOverbought: Strategy;
      pairTrading: Strategy;
    };
    
    // Arbitrage
    arbitrage: {
      statisticalArbitrage: Strategy;
      cryptoArbitrage: Strategy;
      triangularArbitrage: Strategy;
    };
    
    // Market Making (para cripto)
    marketMaking: {
      spreadCapture: Strategy;
      inventoryManagement: Strategy;
    };
    
    // Event Driven
    eventDriven: {
      earningsPlay: Strategy;
      newsTrading: Strategy;
      macroEvents: Strategy;
    };
  };
  
  // Evolução em tempo real
  realTimeEvolution: {
    // Detecta regime de mercado
    regimeDetection: () => MarketRegime;
    
    // Seleciona estratégias adequadas
    strategySelection: (regime: MarketRegime) => Strategy[];
    
    // Combina estratégias
    ensembleBuilding: (strategies: Strategy[]) => EnsembleStrategy;
    
    // Ajusta parâmetros
    parameterTuning: (strategy: Strategy, performance: Metrics) => Strategy;
    
    // Abandona estratégias falhas
    strategyPruning: (strategy: Strategy, drawdown: number) => boolean;
  };
  
  // Aprendizado contínuo
  continuousLearning: {
    reinforcementLearning: true;      // Aprende com resultados
    transferLearning: true;           // Aplica conhecimento entre mercados
    metaLearning: true;               // Aprende a aprender
    adversarialTraining: true;        // Treina contra si mesma
  };
}
```

---

## 🛡️ Risk Management System

### Multi-Layer Protection

```typescript
interface RiskManagementSystem {
  // Camada 1: Proteção por operação
  perTradeProtection: {
    maxLossPerTrade: '1-2% do capital';
    stopLossObligatory: true;
    takeProfitRatio: 'mínimo 1.5:1';
    positionSizing: 'Kelly Criterion modificado';
  };
  
  // Camada 2: Proteção por dia
  dailyProtection: {
    maxDailyLoss: '3-5% do capital';
    maxDailyTrades: 'baseado em volatilidade';
    coolingPeriod: '30min após loss streak';
    profitLocking: 'protege 50% dos ganhos do dia';
  };
  
  // Camada 3: Proteção por período
  periodProtection: {
    maxWeeklyDrawdown: '10%';
    maxMonthlyDrawdown: '15%';
    quarterlyReview: 'ajusta parâmetros';
    yearlyRebalancing: 'realoca capital';
  };
  
  // Camada 4: Proteção sistêmica
  systemicProtection: {
    correlationLimit: 'max 60% em ativos correlacionados';
    marketExposure: 'max 70% investido';
    cashReserve: 'mínimo 30% em caixa';
    hedging: 'automático em alta volatilidade';
  };
  
  // Camada 5: Circuit breakers
  circuitBreakers: {
    flashCrashDetection: true;
    volatilitySpike: 'para se VIX > 30';
    liquidityDry: 'para se spread > 2x normal';
    newsImpact: 'pausa em notícias críticas';
    systemFailure: 'fecha tudo se conexão instável';
  };
  
  // Proteção de patrimônio (modo Guardian)
  guardianMode: {
    capitalPreservation: 'prioridade máxima';
    drawdownRecovery: 'reduz tamanho após perdas';
    pyramiding: 'só adiciona em winners';
    diversification: 'automática entre mercados';
  };
}
```

---

## 🔌 Broker Integration Layer

### Multi-Broker Connectivity

```typescript
interface BrokerIntegrationLayer {
  // Brokers suportados
  supportedBrokers: {
    // Brasil
    brazil: {
      xp: XPInvestimentos;
      clear: ClearCorretora;
      rico: RicoCorretora;
      nuinvest: NuInvest;
      btg: BTGPactual;
      modal: ModalMais;
    };
    
    // Internacional
    international: {
      interactiveBrokers: IBKR;
      tdAmeritrade: TDAmeritrade;
      alpaca: AlpacaMarkets;  // API-first
      tradeStation: TradeStation;
    };
    
    // Crypto
    crypto: {
      binance: BinanceExchange;
      coinbase: CoinbasePro;
      kraken: KrakenExchange;
      ftx: FTXExchange;
      kucoin: KuCoinExchange;
    };
    
    // Forex
    forex: {
      mt5: MetaTrader5;
      oanda: OandaAPI;
      ig: IGMarkets;
    };
  };
  
  // Métodos de integração
  integrationMethods: {
    // Preferência 1: API oficial
    officialAPI: {
      priority: 1;
      reliability: 'alta';
      speed: 'máxima';
      detection: 'nenhuma';
    };
    
    // Preferência 2: FIX Protocol
    fixProtocol: {
      priority: 2;
      reliability: 'alta';
      speed: 'alta';
      detection: 'baixa';
    };
    
    // Preferência 3: Web automation (último recurso)
    webAutomation: {
      priority: 3;
      reliability: 'média';
      speed: 'média';
      detection: 'possível (mitigada)';
      antiDetection: AntiDetectionSystem;
    };
  };
  
  // Order routing inteligente
  smartOrderRouting: {
    bestExecution: true;        // Melhor preço entre brokers
    latencyOptimization: true;  // Rota mais rápida
    costMinimization: true;     // Menor custo
    liquidityAggregation: true; // Agrega liquidez
  };
}
```

---

## 📊 Data & Analytics Layer

### Real-Time Data Pipeline

```typescript
interface DataPipeline {
  // Fontes de dados
  dataSources: {
    // Market data
    marketData: {
      level1: 'Best bid/ask, last trade';
      level2: 'Full order book';
      level3: 'Individual orders (onde disponível)';
      trades: 'Time & sales';
    };
    
    // Alternative data
    alternativeData: {
      news: ['Bloomberg', 'Reuters', 'Twitter/X'];
      sentiment: ['StockTwits', 'Reddit', 'Fear&Greed'];
      satellite: 'Imagens de estacionamentos, navios';
      webTraffic: 'SimilarWeb, Alexa';
      insiderTrading: 'SEC filings, CVM';
    };
    
    // Fundamental data
    fundamentalData: {
      financials: 'Balanços, DRE, Fluxo de caixa';
      earnings: 'Estimativas, surpresas';
      guidance: 'Projeções da empresa';
      valuations: 'Múltiplos, DCF';
    };
    
    // Macro data
    macroData: {
      economicIndicators: 'PIB, inflação, emprego';
      centralBanks: 'Decisões de juros, atas';
      currencies: 'Taxas de câmbio';
      commodities: 'Preços de referência';
    };
  };
  
  // Processamento
  processing: {
    normalization: true;        // Padroniza formatos
    cleaning: true;             // Remove anomalias
    enrichment: true;           // Adiciona contexto
    featureEngineering: true;   // Cria features
    compression: true;          // Otimiza storage
  };
  
  // Storage
  storage: {
    hotData: 'Redis (últimos 5 min)';
    warmData: 'TimescaleDB (últimos 30 dias)';
    coldData: 'S3/Parquet (histórico)';
    realTime: 'Kafka streams';
  };
}
```

---

## 💬 User Interaction (Chat-Based)

### Minimal Chat Interface

```typescript
interface ChatInterface {
  // Comandos naturais
  naturalCommands: {
    // Análise
    'Analise [ATIVO]': () => FullAnalysis;
    'O que acha de [ATIVO]?': () => Opinion;
    'Compare [ATIVO1] vs [ATIVO2]': () => Comparison;
    
    // Operação
    'Compre [QUANTIDADE] de [ATIVO]': () => BuyOrder;
    'Venda [QUANTIDADE] de [ATIVO]': () => SellOrder;
    'Opere [ATIVO] quando identificar oportunidade': () => AutoMode;
    'Monte uma carteira de [TIPO]': () => PortfolioBuilder;
    
    // Monitoramento
    'Monitore [ATIVO]': () => WatchMode;
    'Alerte quando [CONDIÇÃO]': () => Alert;
    'Status das operações': () => StatusReport;
    
    // Configuração
    'Configure risco [NÍVEL]': () => RiskConfig;
    'Defina stop em [VALOR]': () => StopConfig;
    'Modo [CONSERVADOR/MODERADO/AGRESSIVO]': () => ModeConfig;
    
    // Meta
    'Pare tudo': () => EmergencyStop;
    'Quanto estou ganhando/perdendo?': () => PnLReport;
    'Explique sua última decisão': () => DecisionExplanation;
  };
  
  // Respostas contextuais
  responses: {
    brief: 'Resposta curta no chat';
    detailed: 'Abre preview com análise completa';
    actionable: 'Sugere próximos passos';
    educational: 'Explica o raciocínio';
  };
  
  // Preview on-demand
  previewSystem: {
    trigger: 'Usuário solicita ou situação crítica';
    content: 'Gráficos, análises, métricas';
    position: 'Painel lateral não intrusivo';
    dismissable: true;
  };
}
```

---

## 🎛️ Estado Interno da IA

### Self-Awareness System

```typescript
interface SelfAwarenessSystem {
  // Estado atual
  currentState: {
    marketView: 'bullish' | 'bearish' | 'neutral' | 'uncertain';
    confidence: number;  // 0-100%
    activeStrategies: Strategy[];
    openPositions: Position[];
    pendingOrders: Order[];
    performanceToday: PerformanceMetrics;
  };
  
  // Auto-questionamento contínuo
  continuousSelfQuestioning: {
    everyDecision: [
      'Esta decisão está alinhada com meu mandato?',
      'Estou considerando todos os riscos?',
      'O que mudou desde minha última análise?',
      'Existe viés emocional/cognitivo aqui?',
      'Qual seria o conselho de um trader experiente?',
    ];
    
    everyHour: [
      'Minhas posições ainda fazem sentido?',
      'O regime de mercado mudou?',
      'Preciso ajustar stops/targets?',
      'Estou muito exposto em algum setor?',
    ];
    
    everyDay: [
      'O que aprendi hoje?',
      'Onde errei e por quê?',
      'Devo mudar minha estratégia?',
      'O patrimônio está protegido?',
    ];
  };
  
  // Adaptação
  adaptation: {
    // Muda estratégia se performance cai
    performanceBasedAdaptation: true;
    
    // Muda com regime de mercado
    regimeBasedAdaptation: true;
    
    // Muda com feedback do usuário
    userFeedbackAdaptation: true;
    
    // Não muda por impulso
    cooldownPeriod: '24h antes de mudanças grandes';
    
    // Documenta mudanças
    changeLog: true;
  };
  
  // Memória de longo prazo
  longTermMemory: {
    successfulTrades: 'O que funcionou';
    failedTrades: 'O que não funcionou';
    marketPatterns: 'Padrões identificados';
    userPreferences: 'Preferências do usuário';
    lessonLearned: 'Lições aprendidas';
  };
}
```

---

## 📈 Scope: Além de Trading

### Financial AI Capabilities

```typescript
interface FinancialAICapabilities {
  // Trading (core)
  trading: TradingSystem;
  
  // Investimentos
  investing: {
    portfolioManagement: PortfolioManager;
    assetAllocation: AssetAllocator;
    rebalancing: AutoRebalancer;
    taxOptimization: TaxOptimizer;
    dividendStrategy: DividendHunter;
  };
  
  // Análise financeira
  financialAnalysis: {
    companyValuation: ValuationEngine;
    financialModeling: ModelingEngine;
    dueDiligence: DueDiligenceBot;
    earningsAnalysis: EarningsAnalyzer;
  };
  
  // Economia
  economics: {
    macroAnalysis: MacroAnalyzer;
    sectorAnalysis: SectorAnalyzer;
    cycleIdentification: CycleDetector;
    policyImpact: PolicyAnalyzer;
  };
  
  // Finanças pessoais
  personalFinance: {
    budgeting: BudgetAssistant;
    debtManagement: DebtOptimizer;
    savingsStrategy: SavingsPlanner;
    retirementPlanning: RetirementCalculator;
  };
  
  // Crypto & DeFi
  cryptoAndDeFi: {
    yieldFarming: YieldOptimizer;
    liquidityProviding: LPManager;
    stakingStrategy: StakingOptimizer;
    nftAnalysis: NFTAnalyzer;
    defiProtocols: DeFiNavigator;
  };
  
  // Research
  research: {
    marketResearch: MarketResearcher;
    competitorAnalysis: CompetitorTracker;
    industryTrends: TrendSpotter;
    riskAssessment: RiskAnalyzer;
  };
}
```

---

## 🖥️ Interface Minimalista na IDE

### UI Components (Não Intrusivos)

```typescript
interface MinimalTradingUI {
  // Status bar (sempre visível, mas pequena)
  statusBar: {
    position: 'bottom-right corner';
    size: '200px x 30px';
    content: {
      connectionStatus: '🟢';      // Verde = conectado
      pnlToday: '+R$ 1.234,56';    // P&L do dia
      activeMode: '🤖 Auto';       // Modo atual
    };
    expandOnHover: true;
  };
  
  // Chat integration (usa chat existente da IDE)
  chatIntegration: {
    usesExistingChat: true;
    specialPrefix: '@trader';  // @trader analise PETR4
    inlineResponses: true;
  };
  
  // Preview panel (só quando solicitado)
  previewPanel: {
    trigger: 'user request | critical event';
    position: 'right sidebar';
    size: 'collapsible';
    content: {
      chart: 'TradingView-style';
      analysis: 'Summary cards';
      positions: 'Compact table';
      alerts: 'Notification list';
    };
  };
  
  // Notifications (discretas)
  notifications: {
    style: 'toast, bottom-right';
    duration: '5 seconds';
    priority: {
      info: 'silenciosa';
      warning: 'som suave';
      critical: 'som + destaque';
    };
  };
  
  // Quick actions (keyboard)
  keyboardShortcuts: {
    'Ctrl+Shift+T': 'Toggle trading panel';
    'Ctrl+Shift+S': 'Stop all operations';
    'Ctrl+Shift+R': 'Quick status report';
  };
}
```

---

## 🔧 Implementação Técnica

### Arquivos Necessários

```
src/common/trading/
├── core/
│   ├── trading-ai-brain.ts          # Núcleo de decisão
│   ├── strategy-engine.ts           # Motor de estratégias
│   ├── risk-manager.ts              # Gestão de risco
│   └── execution-engine.ts          # Execução de ordens
│
├── market/
│   ├── market-data-service.ts       # Dados de mercado
│   ├── order-book-analyzer.ts       # Análise de book
│   ├── sentiment-analyzer.ts        # Análise de sentimento
│   └── regime-detector.ts           # Detecção de regime
│
├── brokers/
│   ├── broker-interface.ts          # Interface base
│   ├── broker-binance.ts            # Integração Binance
│   ├── broker-b3.ts                 # Integração B3
│   ├── broker-alpaca.ts             # Integração Alpaca
│   └── anti-detection.ts            # Sistema anti-detecção
│
├── strategies/
│   ├── trend-following.ts           # Estratégias de tendência
│   ├── mean-reversion.ts            # Reversão à média
│   ├── arbitrage.ts                 # Arbitragem
│   └── ensemble.ts                  # Combinação de estratégias
│
├── ui/
│   ├── trading-status-bar.tsx       # Status bar minimalista
│   ├── trading-preview-panel.tsx    # Painel de preview
│   └── trading-chat-handler.ts      # Handler de comandos
│
└── types/
    └── trading-types.ts             # Tipos TypeScript
```

---

## 📋 Checklist de Implementação

### Fase 1: Core Engine (Prioridade Alta)
- [ ] Trading AI Brain base
- [ ] Risk Management System
- [ ] Anti-Detection System
- [ ] Strategy base classes

### Fase 2: Market Integration (Prioridade Alta)
- [ ] Market Data Service
- [ ] Broker interface (Binance primeiro)
- [ ] Order execution
- [ ] Position tracking

### Fase 3: Intelligence (Prioridade Média)
- [ ] Technical analysis engine
- [ ] Sentiment analyzer
- [ ] Regime detector
- [ ] Strategy evolver

### Fase 4: UI Minimal (Prioridade Média)
- [ ] Status bar component
- [ ] Chat command handler
- [ ] Preview panel
- [ ] Notification system

### Fase 5: Advanced (Prioridade Baixa)
- [ ] Multi-broker routing
- [ ] Advanced strategies
- [ ] Machine learning integration
- [ ] Full automation mode

---

## � Integração com Sistema de Credenciais

O Trading AI integra-se com o sistema unificado de credenciais para acesso seguro às corretoras.

### Fluxo de Autenticação

```
1. Usuário solicita início de trading
           │
           ▼
2. Sistema verifica credenciais no Vault
           │
     ┌─────┴─────┐
     │           │
   Existe    Não existe
     │           │
     ▼           ▼
3. Solicita  3. Exibe formulário
   permissão    seguro no LivePreview
     │           │
     ▼           ▼
4. IA conecta à corretora
```

### Schemas de Credenciais Suportados

```typescript
// Binance
'binance': {
  fields: ['api_key', 'api_secret'],
  permissions: ['read', 'use', 'trade'],
  securityLevel: 'critical',
}

// MetaTrader 5
'metatrader': {
  fields: ['server', 'login', 'password'],
  permissions: ['read', 'use', 'trade'],
  securityLevel: 'critical',
}
```

### Uso no Chat

```
@trader conectar binance
  → Sistema verifica se há credenciais
  → Se não, exibe formulário seguro no LivePreview
  → Usuário fornece API Key e Secret
  → Dados são criptografados com AES-256-GCM
  → IA conecta automaticamente

@trader status
  → Mostra conexões ativas e status
```

### Permissões Granulares

- `read`: Ler dados de mercado e posições
- `use`: Usar credencial para autenticação
- `trade`: Executar ordens de compra/venda
- `transfer`: Transferências (requer aprovação adicional)

---

## �💰 Alinhamento com Planos

| Feature | Starter | Basic | Pro | Studio | Enterprise |
|---------|---------|-------|-----|--------|------------|
| Análise de mercado | ✅ | ✅ | ✅ | ✅ | ✅ |
| Alertas básicos | ✅ | ✅ | ✅ | ✅ | ✅ |
| Paper trading | ❌ | ✅ | ✅ | ✅ | ✅ |
| Modo Advisory | ❌ | ✅ | ✅ | ✅ | ✅ |
| Semi-automático | ❌ | ❌ | ✅ | ✅ | ✅ |
| Full automático | ❌ | ❌ | ❌ | ✅ | ✅ |
| Multi-broker | ❌ | ❌ | ❌ | ✅ | ✅ |
| Estratégias avançadas | ❌ | ❌ | ❌ | ❌ | ✅ |
| API dedicada | ❌ | ❌ | ❌ | ❌ | ✅ |

---

## 🛡️ Sistema de Otimização de Recursos (v2.1)

### Proteção de Tokens do Usuário

O sistema implementa múltiplas camadas de proteção para evitar consumo excessivo de recursos:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                    RESOURCE PROTECTION SYSTEM                           │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────┐    ┌─────────────┐    ┌─────────────┐                 │
│  │   QUOTA     │───▶│   CACHE     │───▶│  ADAPTIVE   │                 │
│  │  MANAGER    │    │   SYSTEM    │    │  ANALYSIS   │                 │
│  └─────────────┘    └─────────────┘    └─────────────┘                 │
│        │                   │                  │                         │
│        ▼                   ▼                  ▼                         │
│  ┌─────────────────────────────────────────────────────────────────┐   │
│  │              USER EXPERIENCE LAYER                               │   │
│  │  • Notificações claras  • Status em tempo real                  │   │
│  │  • Degradação suave     • Sugestões de economia                 │   │
│  └─────────────────────────────────────────────────────────────────┘   │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Limites por Plano (Tokens/Dia)

| Plano | Tokens Diários | Análises Estimadas | Nível Máximo |
|-------|----------------|-------------------|--------------|
| Free | 1.000 | ~40 básicas | Básico |
| Starter | 5.000 | ~100 básicas | Básico |
| Basic | 10.000 | ~200 padrão | Padrão |
| Pro | 50.000 | ~500 completas | Completo |
| Studio | 100.000 | ~1.000 completas | Completo |
| Enterprise | ∞ | Ilimitado | Premium |

### Níveis de Análise Adaptativos

```typescript
const ADAPTIVE_LEVELS = {
  minimal: { cost: 10, features: ['price', 'volume', 'sma'] },
  basic: { cost: 25, features: ['indicators', 'simple_patterns'] },
  standard: { cost: 50, features: ['all_indicators', 'patterns', 'regime'] },
  full: { cost: 100, features: ['everything', 'optimization', 'ai_insights'] },
  premium: { cost: 200, features: ['full + backtesting', 'monte_carlo'] },
};
```

### Comportamento de Degradação Suave

1. **70% usado**: Avisa o usuário, continua normal
2. **90% usado**: Reduz para análise básica, notifica
3. **100% usado**: Usa cache, sugere upgrade

### Cache Inteligente

- Análises cacheadas por 1-10 minutos (gratuito)
- Sistema indica quando usa dados cacheados
- Usuário pode forçar análise nova se necessário

### API Rápida

```typescript
import { createResourceAwareOrchestrator } from './trading';

const orchestrator = createResourceAwareOrchestrator({
  userId: 'user_123',
  userTier: 'pro',
  enableResourceProtection: true,
});

await orchestrator.initialize(broker, ['PETR4', 'VALE3']);
const analysis = await orchestrator.analyzeMarket('PETR4', candles);
```

---

## 📁 Arquivos do Sistema v2.1

```
src/common/trading/core/
├── index.ts                        # Exportações centralizadas
├── trading-types.ts                # Tipos TypeScript
├── technical-indicators.ts         # 20+ indicadores técnicos
├── pattern-recognition.ts          # Reconhecimento de padrões
├── ai-market-vision.ts             # Visão de mercado da IA
├── market-regime-adapter.ts        # Adaptador de regime
├── profit-optimizer.ts             # Otimizador de lucro
├── backtesting-engine.ts           # Motor de backtesting
├── live-chat-integration.ts        # Integração LivePreview/Chat
├── autonomous-orchestrator.ts      # Orquestrador autônomo
├── resource-manager.ts             # Gerenciador de recursos [NEW]
├── economical-analysis.ts          # Análise econômica [NEW]
├── resource-aware-orchestrator.ts  # Orquestrador protegido [NEW]
└── resource-status-ui.tsx          # Componentes de UI [NEW]
```

**Versão: 2.1.0** - Sistema de proteção de recursos e UX aprimorada

---

*Sistema projetado para máxima robustez interna com mínima intrusão na experiência de IDE.*
*Proteção de recursos garante experiência sustentável para todos os usuários.*
