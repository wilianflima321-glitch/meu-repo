/**
 * AETHEL ENGINE - Health Status Widget Component
 * 
 * Widget React para exibição do status de saúde do sistema.
 * Mostra status de Ollama, Blender, GPU e outros serviços.
 * 
 * Features:
 * - Status em tempo real via WebSocket
 * - Indicadores visuais de status
 * - Detalhes expandíveis
 * - Ações de diagnóstico
 * - Alertas proativos
 */

import React, { useState, useEffect, useCallback } from 'react';
import { useSystemHealth, useWebSocketState } from '../hooks/useWebSocket';

// ============================================================================
// TYPES
// ============================================================================

export interface ServiceStatus {
  name: string;
  status: 'online' | 'offline' | 'degraded' | 'checking';
  message?: string;
  version?: string;
  lastCheck: Date;
  actions?: {
    label: string;
    action: () => void;
  }[];
}

export interface HealthWidgetProps {
  compact?: boolean;
  services?: string[];
  showAlerts?: boolean;
  onServiceClick?: (service: string) => void;
  className?: string;
}

// ============================================================================
// SERVICE CHECKER HOOK
// ============================================================================

function useServiceStatus(serviceName: string): ServiceStatus {
  const [status, setStatus] = useState<ServiceStatus>({
    name: serviceName,
    status: 'checking',
    lastCheck: new Date(),
  });

  const checkService = useCallback(async () => {
    setStatus(prev => ({ ...prev, status: 'checking' }));
    
    try {
      const response = await fetch(`/api/health/${serviceName.toLowerCase()}`);
      const data = await response.json();
      
      setStatus({
        name: serviceName,
        status: data.available ? 'online' : 'offline',
        message: data.message,
        version: data.version,
        lastCheck: new Date(),
        actions: getServiceActions(serviceName, data.available),
      });
    } catch {
      setStatus({
        name: serviceName,
        status: 'offline',
        message: 'Não foi possível verificar o serviço',
        lastCheck: new Date(),
        actions: getServiceActions(serviceName, false),
      });
    }
  }, [serviceName]);

  useEffect(() => {
    checkService();
    const interval = setInterval(checkService, 30000); // Check every 30s
    return () => clearInterval(interval);
  }, [checkService]);

  return status;
}

function getServiceActions(service: string, isOnline: boolean): ServiceStatus['actions'] {
  if (isOnline) return [];
  
  const actions: Record<string, ServiceStatus['actions']> = {
    Ollama: [
      { label: 'Instalar Ollama', action: () => window.open('https://ollama.ai/download', '_blank') },
      { label: 'Verificar novamente', action: () => fetch('/api/health/ollama') },
    ],
    Blender: [
      { label: 'Instalar Blender', action: () => window.open('https://www.blender.org/download/', '_blank') },
      { label: 'Configurar caminho', action: () => window.dispatchEvent(new CustomEvent('open-settings', { detail: 'paths' })) },
    ],
    GPU: [
      { label: 'Atualizar drivers', action: () => window.open('https://www.nvidia.com/drivers', '_blank') },
      { label: 'Verificar compatibilidade', action: () => window.dispatchEvent(new CustomEvent('check-gpu')) },
    ],
  };
  
  return actions[service] || [];
}

// ============================================================================
// SUBCOMPONENTS
// ============================================================================

interface StatusIndicatorProps {
  status: ServiceStatus['status'];
  size?: 'sm' | 'md' | 'lg';
  pulse?: boolean;
}

const StatusIndicator: React.FC<StatusIndicatorProps> = ({ status, size = 'md', pulse = true }) => {
  const colors = {
    online: '#10b981',
    offline: '#ef4444',
    degraded: '#f59e0b',
    checking: '#6b7280',
  };
  
  const sizes = {
    sm: 8,
    md: 12,
    lg: 16,
  };
  
  return (
    <span
      className={`status-indicator ${status} ${pulse && status === 'online' ? 'pulse' : ''}`}
      style={{
        display: 'inline-block',
        width: sizes[size],
        height: sizes[size],
        borderRadius: '50%',
        backgroundColor: colors[status],
        boxShadow: status === 'online' ? `0 0 8px ${colors[status]}` : 'none',
      }}
    />
  );
};

interface ServiceCardProps {
  service: ServiceStatus;
  expanded?: boolean;
  onClick?: () => void;
}

const ServiceCard: React.FC<ServiceCardProps> = ({ service, expanded, onClick }) => {
  const statusLabels = {
    online: 'Online',
    offline: 'Offline',
    degraded: 'Degradado',
    checking: 'Verificando...',
  };

  return (
    <div 
      className={`service-card ${service.status} ${expanded ? 'expanded' : ''}`}
      onClick={onClick}
    >
      <div className="service-header">
        <StatusIndicator status={service.status} />
        <span className="service-name">{service.name}</span>
        <span className="service-status-label">{statusLabels[service.status]}</span>
      </div>
      
      {expanded && (
        <div className="service-details">
          {service.version && (
            <div className="detail-row">
              <span className="detail-label">Versão:</span>
              <span className="detail-value">{service.version}</span>
            </div>
          )}
          
          {service.message && (
            <div className="detail-row">
              <span className="detail-label">Status:</span>
              <span className="detail-value">{service.message}</span>
            </div>
          )}
          
          <div className="detail-row">
            <span className="detail-label">Última verificação:</span>
            <span className="detail-value">
              {service.lastCheck.toLocaleTimeString()}
            </span>
          </div>
          
          {service.actions && service.actions.length > 0 && (
            <div className="service-actions">
              {service.actions.map((action, i) => (
                <button 
                  key={i} 
                  onClick={(e) => { e.stopPropagation(); action.action(); }}
                  className="action-btn"
                >
                  {action.label}
                </button>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

interface SystemMetricsProps {
  health: ReturnType<typeof useSystemHealth>['health'];
}

const SystemMetrics: React.FC<SystemMetricsProps> = ({ health }) => {
  if (!health) return null;

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const formatPercent = (value: number) => `${value.toFixed(1)}%`;

  return (
    <div className="system-metrics">
      <div className="metric">
        <div className="metric-header">
          <span className="metric-icon">🖥️</span>
          <span className="metric-label">CPU</span>
        </div>
        <div className="metric-bar">
          <div 
            className="metric-fill" 
            style={{ 
              width: `${health.cpu.usage}%`,
              backgroundColor: health.cpu.usage > 80 ? '#ef4444' : '#10b981'
            }} 
          />
        </div>
        <span className="metric-value">{formatPercent(health.cpu.usage)}</span>
      </div>

      <div className="metric">
        <div className="metric-header">
          <span className="metric-icon">💾</span>
          <span className="metric-label">RAM</span>
        </div>
        <div className="metric-bar">
          <div 
            className="metric-fill" 
            style={{ 
              width: `${health.memory.percentage}%`,
              backgroundColor: health.memory.percentage > 85 ? '#ef4444' : '#10b981'
            }} 
          />
        </div>
        <span className="metric-value">
          {formatBytes(health.memory.used)} / {formatBytes(health.memory.total)}
        </span>
      </div>

      {health.gpu && (
        <div className="metric">
          <div className="metric-header">
            <span className="metric-icon">🎮</span>
            <span className="metric-label">GPU</span>
          </div>
          <div className="metric-bar">
            <div 
              className="metric-fill" 
              style={{ 
                width: `${health.gpu.usage}%`,
                backgroundColor: health.gpu.usage > 90 ? '#ef4444' : '#10b981'
              }} 
            />
          </div>
          <span className="metric-value">{formatPercent(health.gpu.usage)}</span>
        </div>
      )}

      <div className="metric">
        <div className="metric-header">
          <span className="metric-icon">📡</span>
          <span className="metric-label">Latência</span>
        </div>
        <span className="metric-value latency">
          {health.network.latency}ms
        </span>
      </div>
    </div>
  );
};

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const HealthStatusWidget: React.FC<HealthWidgetProps> = ({
  compact = false,
  services = ['Ollama', 'Blender', 'GPU'],
  showAlerts = true,
  onServiceClick,
  className = '',
}) => {
  const [expandedService, setExpandedService] = useState<string | null>(null);
  const { health, isHealthy, alerts } = useSystemHealth();
  const wsState = useWebSocketState();
  
  // Status dos serviços
  const ollamaStatus = useServiceStatus('Ollama');
  const blenderStatus = useServiceStatus('Blender');
  const gpuStatus = useServiceStatus('GPU');
  
  const serviceStatuses: Record<string, ServiceStatus> = {
    Ollama: ollamaStatus,
    Blender: blenderStatus,
    GPU: gpuStatus,
  };

  const handleServiceClick = (serviceName: string) => {
    if (onServiceClick) {
      onServiceClick(serviceName);
    } else {
      setExpandedService(prev => prev === serviceName ? null : serviceName);
    }
  };

  // Compact mode
  if (compact) {
    return (
      <div className={`health-widget-compact ${className}`}>
        <div className="compact-indicators">
          {services.map(service => (
            <div 
              key={service} 
              className="compact-service"
              title={`${service}: ${serviceStatuses[service]?.status}`}
              onClick={() => handleServiceClick(service)}
            >
              <StatusIndicator 
                status={serviceStatuses[service]?.status || 'checking'} 
                size="sm" 
              />
              <span>{service}</span>
            </div>
          ))}
        </div>
        
        {!wsState.connected && (
          <span className="ws-status offline" title="WebSocket desconectado">
            ⚡
          </span>
        )}
      </div>
    );
  }

  return (
    <div className={`health-widget ${className}`}>
      <div className="widget-header">
        <h3>Status do Sistema</h3>
        <div className="overall-status">
          <StatusIndicator 
            status={isHealthy && wsState.connected ? 'online' : 'degraded'} 
            size="lg" 
          />
          <span>{isHealthy ? 'Tudo funcionando' : 'Atenção necessária'}</span>
        </div>
      </div>

      {/* Alerts Section */}
      {showAlerts && alerts.length > 0 && (
        <div className="alerts-section">
          {alerts.map((alert, i) => (
            <div key={i} className="alert-item">
              <span className="alert-icon">⚠️</span>
              <span className="alert-message">{alert}</span>
            </div>
          ))}
        </div>
      )}

      {/* WebSocket Status */}
      {!wsState.connected && (
        <div className="ws-alert">
          <span className="alert-icon">⚡</span>
          <span>Conexão em tempo real indisponível</span>
          {wsState.error && <span className="error-detail">{wsState.error}</span>}
        </div>
      )}

      {/* Services Grid */}
      <div className="services-grid">
        {services.map(service => (
          <ServiceCard
            key={service}
            service={serviceStatuses[service] || { 
              name: service, 
              status: 'checking', 
              lastCheck: new Date() 
            }}
            expanded={expandedService === service}
            onClick={() => handleServiceClick(service)}
          />
        ))}
      </div>

      {/* System Metrics */}
      <SystemMetrics health={health} />

      {/* Footer */}
      <div className="widget-footer">
        <span className="last-updated">
          Atualizado em {new Date().toLocaleTimeString()}
        </span>
        <button 
          className="refresh-btn"
          onClick={() => window.location.reload()}
        >
          🔄 Atualizar
        </button>
      </div>
    </div>
  );
};

// ============================================================================
// STYLES
// ============================================================================

export const HealthWidgetStyles = `
.health-widget {
  background: #1a1a2e;
  border-radius: 12px;
  padding: 20px;
  color: #fff;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
}

.widget-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.widget-header h3 {
  margin: 0;
  font-size: 18px;
}

.overall-status {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  opacity: 0.8;
}

.alerts-section {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 16px;
}

.alert-item {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
  margin-bottom: 8px;
}

.alert-item:last-child {
  margin-bottom: 0;
}

.alert-icon {
  font-size: 16px;
}

.ws-alert {
  background: rgba(245, 158, 11, 0.1);
  border: 1px solid rgba(245, 158, 11, 0.3);
  border-radius: 8px;
  padding: 12px;
  margin-bottom: 16px;
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.error-detail {
  font-size: 12px;
  opacity: 0.7;
  margin-left: auto;
}

.services-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
  gap: 12px;
  margin-bottom: 20px;
}

.service-card {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 8px;
  padding: 12px;
  cursor: pointer;
  transition: all 0.2s;
  border: 1px solid transparent;
}

.service-card:hover {
  background: rgba(255, 255, 255, 0.1);
}

.service-card.offline {
  border-color: rgba(239, 68, 68, 0.5);
}

.service-card.online {
  border-color: rgba(16, 185, 129, 0.3);
}

.service-card.expanded {
  grid-column: span 2;
}

.service-header {
  display: flex;
  align-items: center;
  gap: 10px;
}

.service-name {
  font-weight: 500;
  flex: 1;
}

.service-status-label {
  font-size: 12px;
  opacity: 0.6;
}

.service-details {
  margin-top: 12px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.detail-row {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
  margin-bottom: 8px;
}

.detail-label {
  opacity: 0.6;
}

.service-actions {
  display: flex;
  gap: 8px;
  margin-top: 12px;
}

.action-btn {
  background: rgba(139, 92, 246, 0.2);
  border: 1px solid rgba(139, 92, 246, 0.4);
  color: #a78bfa;
  padding: 6px 12px;
  border-radius: 6px;
  font-size: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.action-btn:hover {
  background: rgba(139, 92, 246, 0.3);
}

.system-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(120px, 1fr));
  gap: 12px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.03);
  border-radius: 8px;
  margin-bottom: 16px;
}

.metric {
  display: flex;
  flex-direction: column;
  gap: 6px;
}

.metric-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
}

.metric-icon {
  font-size: 14px;
}

.metric-label {
  opacity: 0.7;
}

.metric-bar {
  height: 6px;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 3px;
  overflow: hidden;
}

.metric-fill {
  height: 100%;
  border-radius: 3px;
  transition: width 0.3s ease;
}

.metric-value {
  font-size: 12px;
  opacity: 0.8;
}

.metric-value.latency {
  font-size: 14px;
  font-weight: 500;
}

.widget-footer {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.1);
}

.last-updated {
  font-size: 12px;
  opacity: 0.5;
}

.refresh-btn {
  background: transparent;
  border: none;
  color: inherit;
  opacity: 0.6;
  cursor: pointer;
  font-size: 13px;
  padding: 4px 8px;
  border-radius: 4px;
  transition: all 0.2s;
}

.refresh-btn:hover {
  opacity: 1;
  background: rgba(255, 255, 255, 0.1);
}

/* Compact Mode */
.health-widget-compact {
  display: flex;
  align-items: center;
  gap: 16px;
  padding: 8px 16px;
  background: rgba(0, 0, 0, 0.3);
  border-radius: 8px;
}

.compact-indicators {
  display: flex;
  gap: 12px;
}

.compact-service {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  cursor: pointer;
  opacity: 0.8;
  transition: opacity 0.2s;
}

.compact-service:hover {
  opacity: 1;
}

.ws-status {
  margin-left: auto;
}

.ws-status.offline {
  color: #f59e0b;
  animation: blink 1s infinite;
}

@keyframes blink {
  50% { opacity: 0.5; }
}

/* Status Indicator Pulse */
.status-indicator.pulse {
  animation: pulse 2s infinite;
}

@keyframes pulse {
  0%, 100% { 
    box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.4);
  }
  50% { 
    box-shadow: 0 0 0 8px rgba(16, 185, 129, 0);
  }
}
`;

// ============================================================================
// EXPORT
// ============================================================================

export default HealthStatusWidget;
