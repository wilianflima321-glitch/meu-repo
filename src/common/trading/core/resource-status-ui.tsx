/**
 * Resource Status UI Components
 * Componentes React para exibição do status de recursos do usuário
 * Focado em UX clara e transparente sobre consumo de tokens
 */

import * as React from 'react';
import { ResourceStatus, UserTier, AnalysisLevel, ResourceUsageReport } from './resource-manager';
import { UserNotification, ResourceStatusUI, formatResourceStatusForUI } from './resource-aware-orchestrator';

// ============================================
// STYLES (CSS-in-JS compatible)
// ============================================

export const ResourceUIStyles = {
  container: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '12px',
    padding: '16px',
    borderRadius: '8px',
    backgroundColor: 'var(--vscode-editor-background, #1e1e1e)',
    border: '1px solid var(--vscode-panel-border, #3c3c3c)',
  },
  
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  
  title: {
    fontSize: '14px',
    fontWeight: 600,
    color: 'var(--vscode-foreground, #cccccc)',
  },
  
  tierBadge: {
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '11px',
    fontWeight: 500,
  },
  
  progressContainer: {
    width: '100%',
    height: '8px',
    backgroundColor: 'var(--vscode-progressBar-background, #3c3c3c)',
    borderRadius: '4px',
    overflow: 'hidden',
  },
  
  progressBar: {
    height: '100%',
    borderRadius: '4px',
    transition: 'width 0.3s ease',
  },
  
  statsGrid: {
    display: 'grid',
    gridTemplateColumns: '1fr 1fr',
    gap: '8px',
  },
  
  statItem: {
    display: 'flex',
    flexDirection: 'column' as const,
    gap: '2px',
  },
  
  statLabel: {
    fontSize: '11px',
    color: 'var(--vscode-descriptionForeground, #8b8b8b)',
  },
  
  statValue: {
    fontSize: '14px',
    fontWeight: 500,
    color: 'var(--vscode-foreground, #cccccc)',
  },
  
  warning: {
    padding: '8px 12px',
    borderRadius: '6px',
    fontSize: '12px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
  },
  
  notification: {
    padding: '12px',
    borderRadius: '6px',
    marginBottom: '8px',
  },
  
  notificationTitle: {
    fontWeight: 600,
    marginBottom: '4px',
  },
  
  notificationMessage: {
    fontSize: '12px',
    opacity: 0.9,
  },
  
  button: {
    padding: '6px 12px',
    borderRadius: '4px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 500,
  },
  
  buttonPrimary: {
    backgroundColor: 'var(--vscode-button-background, #0e639c)',
    color: 'var(--vscode-button-foreground, #ffffff)',
  },
  
  buttonSecondary: {
    backgroundColor: 'var(--vscode-button-secondaryBackground, #3a3d41)',
    color: 'var(--vscode-button-secondaryForeground, #ffffff)',
  },
};

// ============================================
// COLOR HELPERS
// ============================================

export function getProgressColor(color: 'green' | 'yellow' | 'orange' | 'red'): string {
  const colors = {
    green: '#4caf50',
    yellow: '#ffeb3b',
    orange: '#ff9800',
    red: '#f44336',
  };
  return colors[color];
}

export function getTierColor(tier: UserTier): string {
  const colors: Record<UserTier, string> = {
    free: '#9e9e9e',
    starter: '#2196f3',
    basic: '#4caf50',
    pro: '#9c27b0',
    studio: '#ff9800',
    enterprise: '#ffd700',
  };
  return colors[tier];
}

export function getNotificationColor(type: 'info' | 'warning' | 'critical' | 'success'): {
  background: string;
  border: string;
  text: string;
} {
  const colors = {
    info: { background: '#1e3a5f', border: '#2196f3', text: '#90caf9' },
    warning: { background: '#5f4b1e', border: '#ff9800', text: '#ffcc80' },
    critical: { background: '#5f1e1e', border: '#f44336', text: '#ef9a9a' },
    success: { background: '#1e5f2f', border: '#4caf50', text: '#a5d6a7' },
  };
  return colors[type];
}

// ============================================
// RESOURCE STATUS CARD COMPONENT
// ============================================

export interface ResourceStatusCardProps {
  status: ResourceUsageReport;
  level: AnalysisLevel;
  tier: UserTier;
  onUpgradeClick?: () => void;
  onSettingsClick?: () => void;
  compact?: boolean;
}

export const ResourceStatusCard: React.FC<ResourceStatusCardProps> = ({
  status,
  level,
  tier,
  onUpgradeClick,
  onSettingsClick,
  compact = false,
}) => {
  const uiData = formatResourceStatusForUI(status, level, tier);
  
  if (compact) {
    return (
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        padding: '4px 8px',
        borderRadius: '4px',
        backgroundColor: 'var(--vscode-editor-background)',
      }}>
        <span style={{ fontSize: '12px' }}>{uiData.statusIcon}</span>
        <div style={{
          width: '60px',
          height: '4px',
          backgroundColor: 'var(--vscode-progressBar-background)',
          borderRadius: '2px',
        }}>
          <div style={{
            width: `${100 - uiData.progressPercent}%`,
            height: '100%',
            backgroundColor: getProgressColor(uiData.progressColor),
            borderRadius: '2px',
          }} />
        </div>
        <span style={{ fontSize: '11px', color: 'var(--vscode-descriptionForeground)' }}>
          {uiData.tokensDisplay}
        </span>
      </div>
    );
  }
  
  return (
    <div style={ResourceUIStyles.container}>
      {/* Header */}
      <div style={ResourceUIStyles.header}>
        <span style={ResourceUIStyles.title}>
          {uiData.statusIcon} Recursos
        </span>
        <span style={{
          ...ResourceUIStyles.tierBadge,
          backgroundColor: getTierColor(tier),
          color: '#ffffff',
        }}>
          {uiData.tierDisplay}
        </span>
      </div>
      
      {/* Progress Bar */}
      <div>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          marginBottom: '4px',
          fontSize: '11px',
        }}>
          <span style={{ color: 'var(--vscode-descriptionForeground)' }}>
            Tokens utilizados
          </span>
          <span style={{ color: getProgressColor(uiData.progressColor) }}>
            {uiData.statusText}
          </span>
        </div>
        <div style={ResourceUIStyles.progressContainer}>
          <div style={{
            ...ResourceUIStyles.progressBar,
            width: `${100 - uiData.progressPercent}%`,
            backgroundColor: getProgressColor(uiData.progressColor),
          }} />
        </div>
      </div>
      
      {/* Stats Grid */}
      <div style={ResourceUIStyles.statsGrid}>
        <div style={ResourceUIStyles.statItem}>
          <span style={ResourceUIStyles.statLabel}>Tokens Restantes</span>
          <span style={ResourceUIStyles.statValue}>
            {status.tokensRemaining.toLocaleString()}
          </span>
        </div>
        <div style={ResourceUIStyles.statItem}>
          <span style={ResourceUIStyles.statLabel}>Nível de Análise</span>
          <span style={ResourceUIStyles.statValue}>{uiData.levelDisplay}</span>
        </div>
        <div style={ResourceUIStyles.statItem}>
          <span style={ResourceUIStyles.statLabel}>Tokens Usados</span>
          <span style={ResourceUIStyles.statValue}>
            {status.tokensUsed.toLocaleString()}
          </span>
        </div>
        <div style={ResourceUIStyles.statItem}>
          <span style={ResourceUIStyles.statLabel}>Limite Diário</span>
          <span style={ResourceUIStyles.statValue}>
            {(status.tokensUsed + status.tokensRemaining).toLocaleString()}
          </span>
        </div>
      </div>
      
      {/* Warning Message */}
      {uiData.warningMessage && (
        <div style={{
          ...ResourceUIStyles.warning,
          backgroundColor: getNotificationColor(
            uiData.progressPercent >= 90 ? 'critical' : 'warning'
          ).background,
          color: getNotificationColor(
            uiData.progressPercent >= 90 ? 'critical' : 'warning'
          ).text,
        }}>
          <span>⚠</span>
          <span>{uiData.warningMessage}</span>
        </div>
      )}
      
      {/* Action Buttons */}
      <div style={{ display: 'flex', gap: '8px', marginTop: '4px' }}>
        {uiData.canUpgrade && onUpgradeClick && (
          <button
            style={{ ...ResourceUIStyles.button, ...ResourceUIStyles.buttonPrimary }}
            onClick={onUpgradeClick}
          >
            Fazer Upgrade
          </button>
        )}
        {onSettingsClick && (
          <button
            style={{ ...ResourceUIStyles.button, ...ResourceUIStyles.buttonSecondary }}
            onClick={onSettingsClick}
          >
            Configurações
          </button>
        )}
      </div>
    </div>
  );
};

// ============================================
// NOTIFICATION COMPONENT
// ============================================

export interface NotificationCardProps {
  notification: UserNotification;
  onDismiss?: () => void;
  onAction?: (actionId: string) => void;
}

export const NotificationCard: React.FC<NotificationCardProps> = ({
  notification,
  onDismiss,
  onAction,
}) => {
  const colors = getNotificationColor(notification.type);
  
  return (
    <div style={{
      ...ResourceUIStyles.notification,
      backgroundColor: colors.background,
      borderLeft: `3px solid ${colors.border}`,
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div>
          <div style={{ ...ResourceUIStyles.notificationTitle, color: colors.text }}>
            {notification.title}
          </div>
          <div style={{ ...ResourceUIStyles.notificationMessage, color: colors.text }}>
            {notification.message}
          </div>
        </div>
        {onDismiss && (
          <button
            onClick={onDismiss}
            style={{
              background: 'none',
              border: 'none',
              color: colors.text,
              cursor: 'pointer',
              padding: '0',
              fontSize: '16px',
            }}
          >
            ×
          </button>
        )}
      </div>
      
      {/* Action Buttons */}
      {notification.actions && notification.actions.length > 0 && (
        <div style={{ display: 'flex', gap: '8px', marginTop: '8px' }}>
          {notification.actions.map((action) => (
            <button
              key={action.id}
              style={{
                ...ResourceUIStyles.button,
                ...(action.type === 'primary' 
                  ? ResourceUIStyles.buttonPrimary 
                  : ResourceUIStyles.buttonSecondary),
              }}
              onClick={() => {
                action.action();
                onAction?.(action.id);
              }}
            >
              {action.label}
            </button>
          ))}
        </div>
      )}
      
      {/* Timestamp */}
      <div style={{
        fontSize: '10px',
        color: colors.text,
        opacity: 0.7,
        marginTop: '8px',
      }}>
        {notification.timestamp.toLocaleTimeString()}
      </div>
    </div>
  );
};

// ============================================
// NOTIFICATION LIST COMPONENT
// ============================================

export interface NotificationListProps {
  notifications: UserNotification[];
  maxVisible?: number;
  onDismiss?: (index: number) => void;
  onAction?: (notificationIndex: number, actionId: string) => void;
  onClearAll?: () => void;
}

export const NotificationList: React.FC<NotificationListProps> = ({
  notifications,
  maxVisible = 5,
  onDismiss,
  onAction,
  onClearAll,
}) => {
  const visibleNotifications = notifications.slice(-maxVisible).reverse();
  
  if (visibleNotifications.length === 0) {
    return (
      <div style={{
        padding: '16px',
        textAlign: 'center',
        color: 'var(--vscode-descriptionForeground)',
        fontSize: '12px',
      }}>
        Nenhuma notificação
      </div>
    );
  }
  
  return (
    <div>
      {/* Header */}
      <div style={{
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        marginBottom: '8px',
      }}>
        <span style={{ fontSize: '12px', color: 'var(--vscode-descriptionForeground)' }}>
          {notifications.length} notificação(ões)
        </span>
        {onClearAll && notifications.length > 0 && (
          <button
            onClick={onClearAll}
            style={{
              background: 'none',
              border: 'none',
              color: 'var(--vscode-textLink-foreground)',
              cursor: 'pointer',
              fontSize: '11px',
            }}
          >
            Limpar todas
          </button>
        )}
      </div>
      
      {/* Notifications */}
      {visibleNotifications.map((notification, index) => (
        <NotificationCard
          key={`${notification.timestamp.getTime()}-${index}`}
          notification={notification}
          onDismiss={onDismiss ? () => onDismiss(index) : undefined}
          onAction={onAction ? (actionId) => onAction(index, actionId) : undefined}
        />
      ))}
    </div>
  );
};

// ============================================
// ANALYSIS LEVEL SELECTOR
// ============================================

export interface AnalysisLevelSelectorProps {
  currentLevel: AnalysisLevel;
  maxLevel: AnalysisLevel;
  onChange: (level: AnalysisLevel) => void;
  disabled?: boolean;
}

export const AnalysisLevelSelector: React.FC<AnalysisLevelSelectorProps> = ({
  currentLevel,
  maxLevel,
  onChange,
  disabled = false,
}) => {
  const levels: AnalysisLevel[] = ['minimal', 'basic', 'standard', 'full', 'premium'];
  const maxLevelIndex = levels.indexOf(maxLevel);
  
  const levelInfo: Record<AnalysisLevel, { name: string; description: string; cost: number }> = {
    minimal: { name: 'Mínimo', description: 'Indicadores básicos', cost: 10 },
    basic: { name: 'Básico', description: '+ Padrões simples', cost: 25 },
    standard: { name: 'Padrão', description: '+ Análise de regime', cost: 50 },
    full: { name: 'Completo', description: '+ Otimização', cost: 100 },
    premium: { name: 'Premium', description: 'Análise completa', cost: 200 },
  };
  
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
      <div style={{ fontSize: '12px', fontWeight: 500 }}>
        Nível de Análise
      </div>
      
      <div style={{ display: 'flex', gap: '4px' }}>
        {levels.map((level, index) => {
          const info = levelInfo[level];
          const isAvailable = index <= maxLevelIndex;
          const isSelected = level === currentLevel;
          
          return (
            <button
              key={level}
              disabled={disabled || !isAvailable}
              onClick={() => onChange(level)}
              style={{
                flex: 1,
                padding: '8px 4px',
                borderRadius: '4px',
                border: isSelected 
                  ? '2px solid var(--vscode-focusBorder)'
                  : '1px solid var(--vscode-panel-border)',
                backgroundColor: isSelected
                  ? 'var(--vscode-button-background)'
                  : isAvailable
                    ? 'var(--vscode-input-background)'
                    : 'var(--vscode-disabledForeground)',
                color: isAvailable 
                  ? 'var(--vscode-foreground)'
                  : 'var(--vscode-disabledForeground)',
                cursor: isAvailable && !disabled ? 'pointer' : 'not-allowed',
                opacity: isAvailable ? 1 : 0.5,
              }}
              title={isAvailable 
                ? `${info.name}: ${info.description} (~${info.cost} tokens)`
                : 'Faça upgrade para desbloquear'}
            >
              <div style={{ fontSize: '11px', fontWeight: 500 }}>{info.name}</div>
              <div style={{ fontSize: '9px', opacity: 0.7 }}>~{info.cost} tokens</div>
            </button>
          );
        })}
      </div>
      
      <div style={{ fontSize: '10px', color: 'var(--vscode-descriptionForeground)' }}>
        {levelInfo[currentLevel].description}
      </div>
    </div>
  );
};

// ============================================
// SESSION STATS COMPONENT
// ============================================

export interface SessionStatsProps {
  duration: number;
  analysisCount: number;
  tokensUsed: number;
  tokensSaved: number;
  averageCost: number;
}

export const SessionStats: React.FC<SessionStatsProps> = ({
  duration,
  analysisCount,
  tokensUsed,
  tokensSaved,
  averageCost,
}) => {
  const formatDuration = (ms: number): string => {
    const hours = Math.floor(ms / (1000 * 60 * 60));
    const minutes = Math.floor((ms % (1000 * 60 * 60)) / (1000 * 60));
    if (hours > 0) {
      return `${hours}h ${minutes}m`;
    }
    return `${minutes}m`;
  };
  
  return (
    <div style={ResourceUIStyles.container}>
      <div style={ResourceUIStyles.title}>📊 Estatísticas da Sessão</div>
      
      <div style={ResourceUIStyles.statsGrid}>
        <div style={ResourceUIStyles.statItem}>
          <span style={ResourceUIStyles.statLabel}>Duração</span>
          <span style={ResourceUIStyles.statValue}>{formatDuration(duration)}</span>
        </div>
        <div style={ResourceUIStyles.statItem}>
          <span style={ResourceUIStyles.statLabel}>Análises</span>
          <span style={ResourceUIStyles.statValue}>{analysisCount}</span>
        </div>
        <div style={ResourceUIStyles.statItem}>
          <span style={ResourceUIStyles.statLabel}>Tokens Usados</span>
          <span style={ResourceUIStyles.statValue}>{tokensUsed.toLocaleString()}</span>
        </div>
        <div style={ResourceUIStyles.statItem}>
          <span style={ResourceUIStyles.statLabel}>Economia</span>
          <span style={{
            ...ResourceUIStyles.statValue,
            color: tokensSaved > 0 ? '#4caf50' : 'inherit',
          }}>
            {tokensSaved > 0 ? '+' : ''}{tokensSaved.toLocaleString()}
          </span>
        </div>
      </div>
      
      {averageCost > 0 && (
        <div style={{
          fontSize: '11px',
          color: 'var(--vscode-descriptionForeground)',
          textAlign: 'center',
        }}>
          Custo médio por análise: {averageCost.toFixed(1)} tokens
        </div>
      )}
    </div>
  );
};

// ============================================
// UPGRADE PROMPT COMPONENT
// ============================================

export interface UpgradePromptProps {
  currentTier: UserTier;
  suggestedTier: UserTier;
  reason: string;
  benefits: string[];
  onUpgrade: () => void;
  onDismiss: () => void;
}

export const UpgradePrompt: React.FC<UpgradePromptProps> = ({
  currentTier,
  suggestedTier,
  reason,
  benefits,
  onUpgrade,
  onDismiss,
}) => {
  const tierNames: Record<UserTier, string> = {
    free: 'Gratuito',
    starter: 'Iniciante',
    basic: 'Básico',
    pro: 'Profissional',
    studio: 'Estúdio',
    enterprise: 'Enterprise',
  };
  
  return (
    <div style={{
      ...ResourceUIStyles.container,
      borderColor: '#ffd700',
    }}>
      <div style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
      }}>
        <span style={{ fontSize: '20px' }}>⬆️</span>
        <div>
          <div style={{ fontWeight: 600 }}>Upgrade Sugerido</div>
          <div style={{ fontSize: '11px', color: 'var(--vscode-descriptionForeground)' }}>
            {tierNames[currentTier]} → {tierNames[suggestedTier]}
          </div>
        </div>
      </div>
      
      <div style={{ fontSize: '12px' }}>
        {reason}
      </div>
      
      <ul style={{
        margin: '8px 0',
        paddingLeft: '20px',
        fontSize: '12px',
      }}>
        {benefits.map((benefit, index) => (
          <li key={index} style={{ marginBottom: '4px' }}>
            {benefit}
          </li>
        ))}
      </ul>
      
      <div style={{ display: 'flex', gap: '8px' }}>
        <button
          style={{ ...ResourceUIStyles.button, ...ResourceUIStyles.buttonPrimary, flex: 1 }}
          onClick={onUpgrade}
        >
          Ver Planos
        </button>
        <button
          style={{ ...ResourceUIStyles.button, ...ResourceUIStyles.buttonSecondary }}
          onClick={onDismiss}
        >
          Agora não
        </button>
      </div>
    </div>
  );
};

// ============================================
// EXPORTS
// ============================================

export default {
  ResourceStatusCard,
  NotificationCard,
  NotificationList,
  AnalysisLevelSelector,
  SessionStats,
  UpgradePrompt,
  ResourceUIStyles,
  getProgressColor,
  getTierColor,
  getNotificationColor,
};
