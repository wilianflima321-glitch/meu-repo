/**
 * =================================================================
 * SUPREME AI DASHBOARD - Painel de Controle Central
 * =================================================================
 * 
 * Interface visual para monitorar e controlar todos os sistemas
 * da Aethel Supreme AI.
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';

// ═══════════════════════════════════════════════════════════════
// TIPOS
// ═══════════════════════════════════════════════════════════════

interface SystemStatus {
  mode: 'autonomous' | 'supervised' | 'manual';
  running: boolean;
  uptime: number;
  taskQueue: number;
  webAutomation: {
    browserReady: boolean;
    currentUrl: string | null;
    activeSessions: number;
    pageLoads: number;
  };
  trading: {
    running: boolean;
    activeTrades: number;
    todayPnL: number;
    winRate: number;
    totalTrades: number;
  };
  accounts: {
    totalAccounts: number;
    activeServices: string[];
    recentActivity: string[];
  };
  missions: {
    active: number;
    completed: number;
    failed: number;
    queue: number;
  };
  cloudDeploy: {
    activeDeployments: number;
    providers: string[];
    lastDeploy: string | null;
  };
  learning: {
    totalExperiences: number;
    patternsLearned: number;
    preferences: number;
    improvementRate: number;
  };
}

interface TaskRequest {
  type: 'web' | 'trading' | 'account' | 'mission' | 'deploy' | 'learning';
  description: string;
  parameters: Record<string, unknown>;
  priority: 'critical' | 'high' | 'medium' | 'low';
}

// ═══════════════════════════════════════════════════════════════
// COMPONENTES AUXILIARES
// ═══════════════════════════════════════════════════════════════

const StatusBadge: React.FC<{ status: boolean | string; label: string }> = ({ status, label }) => {
  const isActive = typeof status === 'boolean' ? status : status === 'active';
  return (
    <div className={`status-badge ${isActive ? 'active' : 'inactive'}`}>
      <span className="status-dot" />
      <span className="status-label">{label}</span>
    </div>
  );
};

const MetricCard: React.FC<{
  title: string;
  value: string | number;
  subtitle?: string;
  trend?: 'up' | 'down' | 'neutral';
  icon: string;
}> = ({ title, value, subtitle, trend, icon }) => (
  <div className="metric-card">
    <div className="metric-header">
      <span className="metric-icon">{icon}</span>
      <span className="metric-title">{title}</span>
    </div>
    <div className="metric-value">
      {value}
      {trend && (
        <span className={`trend ${trend}`}>
          {trend === 'up' ? '↑' : trend === 'down' ? '↓' : '→'}
        </span>
      )}
    </div>
    {subtitle && <div className="metric-subtitle">{subtitle}</div>}
  </div>
);

const ProgressBar: React.FC<{ value: number; max: number; label?: string }> = ({ value, max, label }) => (
  <div className="progress-container">
    {label && <span className="progress-label">{label}</span>}
    <div className="progress-bar">
      <div 
        className="progress-fill" 
        style={{ width: `${Math.min((value / max) * 100, 100)}%` }}
      />
    </div>
    <span className="progress-value">{value}/{max}</span>
  </div>
);

const ActionButton: React.FC<{
  onClick: () => void;
  variant: 'primary' | 'secondary' | 'danger';
  icon?: string;
  children: React.ReactNode;
  disabled?: boolean;
}> = ({ onClick, variant, icon, children, disabled }) => (
  <button
    className={`action-btn ${variant}`}
    onClick={onClick}
    disabled={disabled}
  >
    {icon && <span className="btn-icon">{icon}</span>}
    {children}
  </button>
);

// ═══════════════════════════════════════════════════════════════
// SEÇÕES DO DASHBOARD
// ═══════════════════════════════════════════════════════════════

const WebAutomationSection: React.FC<{ data: SystemStatus['webAutomation'] }> = ({ data }) => (
  <div className="dashboard-section">
    <h3>🌐 Web Automation</h3>
    <div className="section-content">
      <StatusBadge status={data.browserReady} label="Browser" />
      <div className="info-grid">
        <div className="info-item">
          <span className="info-label">URL Atual:</span>
          <span className="info-value">{data.currentUrl || 'Nenhuma'}</span>
        </div>
        <div className="info-item">
          <span className="info-label">Sessões Ativas:</span>
          <span className="info-value">{data.activeSessions}</span>
        </div>
        <div className="info-item">
          <span className="info-label">Pages Carregadas:</span>
          <span className="info-value">{data.pageLoads}</span>
        </div>
      </div>
    </div>
  </div>
);

const TradingSection: React.FC<{ data: SystemStatus['trading'] }> = ({ data }) => (
  <div className="dashboard-section">
    <h3>📈 Trading HFT</h3>
    <div className="section-content">
      <StatusBadge status={data.running} label={data.running ? 'Operando' : 'Parado'} />
      <div className="metrics-row">
        <MetricCard
          icon="💰"
          title="PnL Hoje"
          value={`${data.todayPnL > 0 ? '+' : ''}${data.todayPnL.toFixed(2)}%`}
          trend={data.todayPnL > 0 ? 'up' : data.todayPnL < 0 ? 'down' : 'neutral'}
        />
        <MetricCard
          icon="🎯"
          title="Win Rate"
          value={`${data.winRate.toFixed(1)}%`}
          subtitle={`${data.totalTrades} trades`}
        />
        <MetricCard
          icon="⚡"
          title="Trades Ativos"
          value={data.activeTrades}
        />
      </div>
    </div>
  </div>
);

const MissionsSection: React.FC<{ data: SystemStatus['missions'] }> = ({ data }) => (
  <div className="dashboard-section">
    <h3>🎯 Missões</h3>
    <div className="section-content">
      <div className="missions-grid">
        <div className="mission-stat active">
          <span className="stat-value">{data.active}</span>
          <span className="stat-label">Ativas</span>
        </div>
        <div className="mission-stat completed">
          <span className="stat-value">{data.completed}</span>
          <span className="stat-label">Completas</span>
        </div>
        <div className="mission-stat failed">
          <span className="stat-value">{data.failed}</span>
          <span className="stat-label">Falhas</span>
        </div>
        <div className="mission-stat queue">
          <span className="stat-value">{data.queue}</span>
          <span className="stat-label">Na Fila</span>
        </div>
      </div>
      <ProgressBar 
        value={data.completed} 
        max={data.completed + data.failed + data.active + data.queue}
        label="Progresso Total"
      />
    </div>
  </div>
);

const LearningSection: React.FC<{ data: SystemStatus['learning'] }> = ({ data }) => (
  <div className="dashboard-section">
    <h3>🧠 Learning System</h3>
    <div className="section-content">
      <div className="learning-grid">
        <MetricCard
          icon="📚"
          title="Experiências"
          value={data.totalExperiences}
        />
        <MetricCard
          icon="🔍"
          title="Padrões"
          value={data.patternsLearned}
        />
        <MetricCard
          icon="⭐"
          title="Preferências"
          value={data.preferences}
        />
        <MetricCard
          icon="📊"
          title="Melhoria"
          value={`${data.improvementRate.toFixed(1)}%`}
          trend={data.improvementRate > 0 ? 'up' : 'neutral'}
        />
      </div>
    </div>
  </div>
);

const CloudDeploySection: React.FC<{ data: SystemStatus['cloudDeploy'] }> = ({ data }) => (
  <div className="dashboard-section">
    <h3>☁️ Cloud Deploy</h3>
    <div className="section-content">
      <div className="providers-list">
        {data.providers.map(provider => (
          <span key={provider} className="provider-tag">{provider}</span>
        ))}
      </div>
      <div className="info-grid">
        <div className="info-item">
          <span className="info-label">Deploys Ativos:</span>
          <span className="info-value">{data.activeDeployments}</span>
        </div>
        <div className="info-item">
          <span className="info-label">Último Deploy:</span>
          <span className="info-value">{data.lastDeploy || 'Nenhum'}</span>
        </div>
      </div>
    </div>
  </div>
);

// ═══════════════════════════════════════════════════════════════
// PAINEL DE COMANDOS
// ═══════════════════════════════════════════════════════════════

const CommandPanel: React.FC<{
  onExecuteTask: (task: TaskRequest) => void;
  onModeChange: (mode: 'autonomous' | 'supervised' | 'manual') => void;
  currentMode: string;
}> = ({ onExecuteTask, onModeChange, currentMode }) => {
  const [taskType, setTaskType] = useState<TaskRequest['type']>('mission');
  const [taskDescription, setTaskDescription] = useState('');

  const handleQuickAction = (action: string) => {
    switch (action) {
      case 'start_trading':
        onExecuteTask({
          type: 'trading',
          description: 'Iniciar trading automático',
          parameters: { action: 'start' },
          priority: 'high'
        });
        break;
      case 'stop_trading':
        onExecuteTask({
          type: 'trading',
          description: 'Parar trading',
          parameters: { action: 'stop' },
          priority: 'critical'
        });
        break;
      case 'new_mission':
        onExecuteTask({
          type: 'mission',
          description: taskDescription || 'Nova missão',
          parameters: { action: 'create', description: taskDescription },
          priority: 'medium'
        });
        setTaskDescription('');
        break;
    }
  };

  return (
    <div className="command-panel">
      <h3>⚡ Comandos</h3>
      
      <div className="mode-selector">
        <span className="mode-label">Modo:</span>
        <div className="mode-buttons">
          {(['autonomous', 'supervised', 'manual'] as const).map(mode => (
            <button
              key={mode}
              className={`mode-btn ${currentMode === mode ? 'active' : ''}`}
              onClick={() => onModeChange(mode)}
            >
              {mode === 'autonomous' ? '🤖 Auto' : mode === 'supervised' ? '👁️ Super' : '✋ Manual'}
            </button>
          ))}
        </div>
      </div>

      <div className="quick-actions">
        <h4>Ações Rápidas</h4>
        <div className="actions-grid">
          <ActionButton variant="primary" icon="▶️" onClick={() => handleQuickAction('start_trading')}>
            Iniciar Trading
          </ActionButton>
          <ActionButton variant="danger" icon="⏹️" onClick={() => handleQuickAction('stop_trading')}>
            Parar Trading
          </ActionButton>
        </div>
      </div>

      <div className="new-task">
        <h4>Nova Tarefa</h4>
        <select 
          value={taskType} 
          onChange={(e) => setTaskType(e.target.value as TaskRequest['type'])}
          className="task-select"
        >
          <option value="mission">🎯 Missão</option>
          <option value="web">🌐 Web</option>
          <option value="trading">📈 Trading</option>
          <option value="deploy">☁️ Deploy</option>
          <option value="account">👤 Conta</option>
        </select>
        <textarea
          value={taskDescription}
          onChange={(e) => setTaskDescription(e.target.value)}
          placeholder="Descreva a tarefa..."
          className="task-input"
        />
        <ActionButton 
          variant="primary" 
          icon="🚀" 
          onClick={() => handleQuickAction('new_mission')}
          disabled={!taskDescription}
        >
          Executar
        </ActionButton>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// DASHBOARD PRINCIPAL
// ═══════════════════════════════════════════════════════════════

export const SupremeAIDashboard: React.FC = () => {
  const startedAtRef = useRef<number>(Date.now());
  const [status, setStatus] = useState<SystemStatus>({
    mode: 'supervised',
    // Sem backend conectado, o dashboard não consegue afirmar estado "online" do sistema.
    running: false,
    uptime: 0,
    taskQueue: 0,
    webAutomation: {
      browserReady: false,
      currentUrl: null,
      activeSessions: 0,
      pageLoads: 0
    },
    trading: {
      running: false,
      activeTrades: 0,
      todayPnL: 0,
      winRate: 0,
      totalTrades: 0
    },
    accounts: {
      totalAccounts: 0,
      activeServices: [],
      recentActivity: []
    },
    missions: {
      active: 0,
      completed: 0,
      failed: 0,
      queue: 0
    },
    cloudDeploy: {
      activeDeployments: 0,
      providers: ['vercel', 'netlify', 'railway'],
      lastDeploy: null
    },
    learning: {
      totalExperiences: 0,
      patternsLearned: 0,
      preferences: 0,
      improvementRate: 0
    }
  });

  const [logs, setLogs] = useState<Array<{ time: string; message: string; type: string }>>([]);

  // Uptime real (do dashboard), sem simular telemetria do sistema.
  useEffect(() => {
    const interval = setInterval(() => {
      setStatus(prev => ({
        ...prev,
        uptime: Math.floor((Date.now() - startedAtRef.current) / 1000),
      }));
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const handleExecuteTask = useCallback((task: TaskRequest) => {
    const logEntry = {
      time: new Date().toLocaleTimeString(),
      message: `[${task.type.toUpperCase()}] ${task.description}`,
      type: task.type
    };
    setLogs(prev => [logEntry, ...prev.slice(0, 49)]);

    // Sem backend/orchestrator, não há execução real.
    setLogs(prev => [{
      time: new Date().toLocaleTimeString(),
      message: 'Execução indisponível: dashboard não está conectado ao backend/orchestrator.',
      type: 'system'
    }, ...prev.slice(0, 49)]);
  }, []);

  const handleModeChange = useCallback((mode: 'autonomous' | 'supervised' | 'manual') => {
    setStatus(prev => ({ ...prev, mode }));
    const logEntry = {
      time: new Date().toLocaleTimeString(),
      message: `Modo alterado para: ${mode}`,
      type: 'system'
    };
    setLogs(prev => [logEntry, ...prev.slice(0, 49)]);
  }, []);

  const formatUptime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="supreme-dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-title">
          <h1>🚀 Aethel Supreme AI</h1>
          <span className="version">v2.0.0</span>
        </div>
        <div className="header-status">
          <StatusBadge status={status.running} label={status.running ? 'Online' : 'Offline'} />
          <span className="uptime">⏱️ {formatUptime(status.uptime)}</span>
          <span className="mode-indicator">
            {status.mode === 'autonomous' ? '🤖' : status.mode === 'supervised' ? '👁️' : '✋'} 
            {status.mode}
          </span>
        </div>
      </header>

      {/* Main Content */}
      <main className="dashboard-main">
        {/* Left Panel - Metrics */}
        <div className="metrics-panel">
          <WebAutomationSection data={status.webAutomation} />
          <TradingSection data={status.trading} />
          <MissionsSection data={status.missions} />
        </div>

        {/* Center Panel - Commands */}
        <div className="center-panel">
          <CommandPanel
            onExecuteTask={handleExecuteTask}
            onModeChange={handleModeChange}
            currentMode={status.mode}
          />
          
          {/* Activity Log */}
          <div className="activity-log">
            <h3>📋 Log de Atividades</h3>
            <div className="log-entries">
              {logs.length === 0 ? (
                <div className="log-empty">Nenhuma atividade ainda</div>
              ) : (
                logs.map((log, i) => (
                  <div key={i} className={`log-entry ${log.type}`}>
                    <span className="log-time">{log.time}</span>
                    <span className="log-message">{log.message}</span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Panel - Additional Info */}
        <div className="info-panel">
          <LearningSection data={status.learning} />
          <CloudDeploySection data={status.cloudDeploy} />
          
          {/* Accounts Summary */}
          <div className="dashboard-section">
            <h3>👤 Contas</h3>
            <div className="section-content">
              <MetricCard
                icon="📊"
                title="Total de Contas"
                value={status.accounts.totalAccounts}
              />
              <div className="services-list">
                {status.accounts.activeServices.map(service => (
                  <span key={service} className="service-tag">{service}</span>
                ))}
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="dashboard-footer">
        <span>Aethel AI Engine © 2025</span>
        <span>Tasks na Fila: {status.taskQueue}</span>
        <span>Experiências: {status.learning.totalExperiences}</span>
      </footer>

      <style>{`
        .supreme-dashboard {
          display: flex;
          flex-direction: column;
          height: 100vh;
          background: linear-gradient(135deg, #0a0a0f 0%, #1a1a2e 100%);
          color: #fff;
          font-family: 'Inter', -apple-system, sans-serif;
        }

        .dashboard-header {
          display: flex;
          justify-content: space-between;
          align-items: center;
          padding: 16px 24px;
          background: rgba(255, 255, 255, 0.05);
          border-bottom: 1px solid rgba(255, 255, 255, 0.1);
        }

        .header-title {
          display: flex;
          align-items: center;
          gap: 12px;
        }

        .header-title h1 {
          font-size: 24px;
          font-weight: 700;
          margin: 0;
          background: linear-gradient(120deg, #00d4ff, #7c3aed);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
        }

        .version {
          padding: 4px 8px;
          background: rgba(124, 58, 237, 0.3);
          border-radius: 4px;
          font-size: 12px;
        }

        .header-status {
          display: flex;
          align-items: center;
          gap: 20px;
        }

        .status-badge {
          display: flex;
          align-items: center;
          gap: 8px;
          padding: 6px 12px;
          border-radius: 20px;
          font-size: 14px;
        }

        .status-badge.active {
          background: rgba(34, 197, 94, 0.2);
          color: #22c55e;
        }

        .status-badge.inactive {
          background: rgba(239, 68, 68, 0.2);
          color: #ef4444;
        }

        .status-dot {
          width: 8px;
          height: 8px;
          border-radius: 50%;
          background: currentColor;
          animation: pulse 2s infinite;
        }

        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }

        .uptime, .mode-indicator {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.7);
        }

        .dashboard-main {
          flex: 1;
          display: grid;
          grid-template-columns: 1fr 1.2fr 1fr;
          gap: 20px;
          padding: 20px;
          overflow: auto;
        }

        .dashboard-section {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          padding: 16px;
          margin-bottom: 16px;
        }

        .dashboard-section h3 {
          font-size: 16px;
          font-weight: 600;
          margin: 0 0 12px 0;
          color: #fff;
        }

        .metric-card {
          background: rgba(255, 255, 255, 0.03);
          border-radius: 8px;
          padding: 12px;
          text-align: center;
        }

        .metric-header {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          margin-bottom: 8px;
        }

        .metric-icon {
          font-size: 16px;
        }

        .metric-title {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.6);
        }

        .metric-value {
          font-size: 24px;
          font-weight: 700;
          color: #fff;
        }

        .metric-subtitle {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.5);
          margin-top: 4px;
        }

        .trend {
          font-size: 14px;
          margin-left: 4px;
        }

        .trend.up { color: #22c55e; }
        .trend.down { color: #ef4444; }
        .trend.neutral { color: #f59e0b; }

        .metrics-row {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 12px;
        }

        .info-grid {
          display: flex;
          flex-direction: column;
          gap: 8px;
          margin-top: 12px;
        }

        .info-item {
          display: flex;
          justify-content: space-between;
          font-size: 13px;
        }

        .info-label {
          color: rgba(255, 255, 255, 0.6);
        }

        .info-value {
          color: #fff;
          font-weight: 500;
        }

        .missions-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          gap: 8px;
          margin-bottom: 12px;
        }

        .mission-stat {
          text-align: center;
          padding: 8px;
          border-radius: 8px;
        }

        .mission-stat.active { background: rgba(59, 130, 246, 0.2); }
        .mission-stat.completed { background: rgba(34, 197, 94, 0.2); }
        .mission-stat.failed { background: rgba(239, 68, 68, 0.2); }
        .mission-stat.queue { background: rgba(245, 158, 11, 0.2); }

        .stat-value {
          display: block;
          font-size: 20px;
          font-weight: 700;
        }

        .stat-label {
          font-size: 11px;
          color: rgba(255, 255, 255, 0.6);
        }

        .progress-container {
          display: flex;
          align-items: center;
          gap: 8px;
        }

        .progress-label {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.6);
          min-width: 100px;
        }

        .progress-bar {
          flex: 1;
          height: 6px;
          background: rgba(255, 255, 255, 0.1);
          border-radius: 3px;
          overflow: hidden;
        }

        .progress-fill {
          height: 100%;
          background: linear-gradient(90deg, #00d4ff, #7c3aed);
          border-radius: 3px;
          transition: width 0.3s ease;
        }

        .progress-value {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.6);
          min-width: 40px;
          text-align: right;
        }

        .learning-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 12px;
        }

        .providers-list, .services-list {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
          margin-bottom: 12px;
        }

        .provider-tag, .service-tag {
          padding: 4px 8px;
          background: rgba(124, 58, 237, 0.3);
          border-radius: 4px;
          font-size: 11px;
          text-transform: capitalize;
        }

        .command-panel {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          padding: 16px;
        }

        .command-panel h3, .command-panel h4 {
          margin: 0 0 12px 0;
          font-weight: 600;
        }

        .command-panel h4 {
          font-size: 14px;
          color: rgba(255, 255, 255, 0.8);
        }

        .mode-selector {
          margin-bottom: 16px;
        }

        .mode-label {
          font-size: 12px;
          color: rgba(255, 255, 255, 0.6);
          display: block;
          margin-bottom: 8px;
        }

        .mode-buttons {
          display: flex;
          gap: 8px;
        }

        .mode-btn {
          flex: 1;
          padding: 8px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: transparent;
          color: rgba(255, 255, 255, 0.7);
          border-radius: 6px;
          cursor: pointer;
          font-size: 12px;
          transition: all 0.2s;
        }

        .mode-btn.active {
          background: rgba(124, 58, 237, 0.3);
          border-color: #7c3aed;
          color: #fff;
        }

        .quick-actions, .new-task {
          margin-bottom: 16px;
        }

        .actions-grid {
          display: grid;
          grid-template-columns: repeat(2, 1fr);
          gap: 8px;
        }

        .action-btn {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 6px;
          padding: 10px 16px;
          border: none;
          border-radius: 8px;
          font-weight: 500;
          cursor: pointer;
          transition: all 0.2s;
        }

        .action-btn.primary {
          background: linear-gradient(135deg, #00d4ff, #7c3aed);
          color: #fff;
        }

        .action-btn.secondary {
          background: rgba(255, 255, 255, 0.1);
          color: #fff;
        }

        .action-btn.danger {
          background: rgba(239, 68, 68, 0.3);
          color: #ef4444;
        }

        .action-btn:disabled {
          opacity: 0.5;
          cursor: not-allowed;
        }

        .task-select, .task-input {
          width: 100%;
          padding: 10px;
          border: 1px solid rgba(255, 255, 255, 0.1);
          background: rgba(255, 255, 255, 0.05);
          color: #fff;
          border-radius: 6px;
          margin-bottom: 8px;
          font-size: 14px;
        }

        .task-input {
          min-height: 80px;
          resize: vertical;
        }

        .activity-log {
          background: rgba(255, 255, 255, 0.05);
          border-radius: 12px;
          padding: 16px;
          margin-top: 16px;
        }

        .log-entries {
          max-height: 200px;
          overflow-y: auto;
        }

        .log-entry {
          display: flex;
          gap: 12px;
          padding: 8px 0;
          border-bottom: 1px solid rgba(255, 255, 255, 0.05);
          font-size: 12px;
        }

        .log-time {
          color: rgba(255, 255, 255, 0.5);
          min-width: 70px;
        }

        .log-message {
          color: rgba(255, 255, 255, 0.8);
        }

        .log-empty {
          text-align: center;
          padding: 20px;
          color: rgba(255, 255, 255, 0.4);
        }

        .dashboard-footer {
          display: flex;
          justify-content: space-between;
          padding: 12px 24px;
          background: rgba(255, 255, 255, 0.03);
          border-top: 1px solid rgba(255, 255, 255, 0.05);
          font-size: 12px;
          color: rgba(255, 255, 255, 0.5);
        }

        @media (max-width: 1200px) {
          .dashboard-main {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </div>
  );
};

export default SupremeAIDashboard;
