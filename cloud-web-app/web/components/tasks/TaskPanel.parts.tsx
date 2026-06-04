import React, { useState, useEffect, useMemo, useRef } from 'react';
import type { TaskDefinition } from '../../lib/tasks/task-runner';

// ============================================================================
// CATPPUCCIN MOCHA THEME
// ============================================================================

export const theme = {
  base: 'var(--aethel-surface-primary)',
  surface: 'var(--aethel-surface-tertiary)',
  surface1: 'var(--aethel-surface-quaternary)',
  surface2: 'var(--aethel-text-quaternary)',
  text: 'var(--aethel-text-primary)',
  subtext: 'var(--aethel-text-tertiary)',
  primary: 'var(--aethel-info)',
  success: 'var(--aethel-success-light)',
  warning: 'var(--aethel-warning)',
  error: 'var(--aethel-error-light)',
  overlay: 'var(--aethel-text-muted)',
  lavender: 'var(--aethel-primary-light)',
  mauve: 'var(--aethel-accent-light)',
};

// ============================================================================
// STYLES
// ============================================================================

export const styles: Record<string, React.CSSProperties> = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    height: '100%',
    backgroundColor: theme.base,
    color: theme.text,
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    fontSize: '13px',
  },
  header: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px 16px',
    borderBottom: `1px solid ${theme.surface1}`,
    backgroundColor: theme.surface,
  },
  title: {
    fontSize: '16px',
    fontWeight: 600,
    color: theme.primary,
    margin: 0,
  },
  tabs: {
    display: 'flex',
    gap: '4px',
    padding: '8px 16px',
    backgroundColor: theme.surface,
    borderBottom: `1px solid ${theme.surface1}`,
  },
  tab: {
    padding: '8px 16px',
    border: 'none',
    background: 'transparent',
    color: theme.subtext,
    cursor: 'pointer',
    borderRadius: '6px',
    transition: 'all 0.2s ease',
    fontSize: '13px',
  },
  tabActive: {
    backgroundColor: theme.primary,
    color: theme.base,
    fontWeight: 500,
  },
  content: {
    flex: 1,
    overflow: 'auto',
    padding: '16px',
  },
  taskGroup: {
    marginBottom: '20px',
  },
  groupHeader: {
    fontSize: '12px',
    fontWeight: 600,
    color: theme.subtext,
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '8px',
    padding: '4px 0',
    borderBottom: `1px solid ${theme.surface1}`,
  },
  taskItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px',
    backgroundColor: theme.surface,
    borderRadius: '8px',
    marginBottom: '8px',
    cursor: 'pointer',
    transition: 'all 0.2s ease',
    border: `1px solid transparent`,
  },
  taskItemHover: {
    borderColor: theme.primary,
    backgroundColor: theme.surface1,
  },
  taskInfo: {
    display: 'flex',
    flexDirection: 'column',
    gap: '4px',
  },
  taskLabel: {
    fontWeight: 500,
    color: theme.text,
  },
  taskCommand: {
    fontSize: '11px',
    color: theme.subtext,
    fontFamily: 'monospace',
  },
  taskControls: {
    display: 'flex',
    gap: '8px',
  },
  button: {
    padding: '6px 12px',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: 500,
    transition: 'all 0.2s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  buttonPrimary: {
    backgroundColor: theme.primary,
    color: theme.base,
  },
  buttonSuccess: {
    backgroundColor: theme.success,
    color: theme.base,
  },
  buttonWarning: {
    backgroundColor: theme.warning,
    color: theme.base,
  },
  buttonDanger: {
    backgroundColor: theme.error,
    color: theme.base,
  },
  buttonGhost: {
    backgroundColor: 'transparent',
    color: theme.subtext,
    border: `1px solid ${theme.surface1}`,
  },
  terminal: {
    backgroundColor: 'var(--aethel-surface-primary)',
    borderRadius: '8px',
    padding: '12px',
    fontFamily: "'JetBrains Mono', monospace",
    fontSize: '12px',
    lineHeight: 1.6,
    maxHeight: '300px',
    overflow: 'auto',
    border: `1px solid ${theme.surface1}`,
  },
  terminalLine: {
    margin: 0,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-all',
  },
  badge: {
    padding: '2px 8px',
    borderRadius: '12px',
    fontSize: '10px',
    fontWeight: 600,
    textTransform: 'uppercase',
  },
  statusRunning: {
    backgroundColor: theme.primary,
    color: theme.base,
  },
  statusCompleted: {
    backgroundColor: theme.success,
    color: theme.base,
  },
  statusFailed: {
    backgroundColor: theme.error,
    color: theme.base,
  },
  statusCancelled: {
    backgroundColor: theme.warning,
    color: theme.base,
  },
  emptyState: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '48px',
    color: theme.subtext,
    textAlign: 'center',
  },
  problemMatch: {
    padding: '8px 12px',
    backgroundColor: theme.surface,
    borderRadius: '6px',
    marginTop: '8px',
    borderLeft: `3px solid ${theme.error}`,
  },
  configView: {
    backgroundColor: theme.surface,
    borderRadius: '8px',
    padding: '16px',
    marginTop: '12px',
  },
  configItem: {
    display: 'flex',
    justifyContent: 'space-between',
    padding: '8px 0',
    borderBottom: `1px solid ${theme.surface1}`,
  },
  configLabel: {
    color: theme.subtext,
    fontSize: '12px',
  },
  configValue: {
    color: theme.text,
    fontFamily: 'monospace',
    fontSize: '12px',
  },
  historyItem: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: '12px',
    backgroundColor: theme.surface,
    borderRadius: '8px',
    marginBottom: '8px',
  },
  historyTime: {
    fontSize: '11px',
    color: theme.subtext,
  },
  historyDuration: {
    fontSize: '11px',
    color: theme.overlay,
  },
};

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

interface TaskItemProps {
  task: TaskDefinition;
  isRunning: boolean;
  onRun: () => void;
  onStop: () => void;
  onShowConfig: () => void;
}

export const TaskItem: React.FC<TaskItemProps> = ({ task, isRunning, onRun, onStop, onShowConfig }) => {
  const [hovered, setHovered] = useState(false);

  const typeIcon = useMemo(() => {
    switch (task.type) {
      case 'npm': return '📦';
      case 'shell': return '💻';
      case 'custom': return '⚙️';
      default: return '▶️';
    }
  }, [task.type]);

  return (
    <div
      style={{ ...styles.taskItem, ...(hovered ? styles.taskItemHover : {}) }}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <div style={styles.taskInfo}>
        <span style={styles.taskLabel}>
          {typeIcon} {task.label}
          {task.isDefault && <span style={{ color: theme.primary, marginLeft: '8px' }}>(default)</span>}
        </span>
        <span style={styles.taskCommand}>{task.command} {task.args?.join(' ') || ''}</span>
      </div>
      <div style={styles.taskControls}>
        <button type="button"
          style={{ ...styles.button, ...styles.buttonGhost }}
          onClick={(e) => { e.stopPropagation(); onShowConfig(); }}
          title="View Configuration"
        >
          ⚙️
        </button>
        {isRunning ? (
          <button type="button"
            style={{ ...styles.button, ...styles.buttonDanger }}
            onClick={(e) => { e.stopPropagation(); onStop(); }}
          >
            ⬛ Stop
          </button>
        ) : (
          <button type="button"
            style={{ ...styles.button, ...styles.buttonPrimary }}
            onClick={(e) => { e.stopPropagation(); onRun(); }}
          >
            ▶️ Run
          </button>
        )}
      </div>
    </div>
  );
};

interface OutputTerminalProps {
  output: string[];
  autoScroll?: boolean;
}

export const OutputTerminal: React.FC<OutputTerminalProps> = ({ output, autoScroll = true }) => {
  const terminalRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && terminalRef.current) {
      terminalRef.current.scrollTop = terminalRef.current.scrollHeight;
    }
  }, [output, autoScroll]);

  const colorizedOutput = useMemo(() => {
    return output.map((line, idx) => {
      let color = theme.text;
      if (line.includes('error') || line.includes('Error') || line.includes('ERROR')) {
        color = theme.error;
      } else if (line.includes('warning') || line.includes('Warning') || line.includes('WARN')) {
        color = theme.warning;
      } else if (line.includes('success') || line.includes('Success') || line.includes('✓')) {
        color = theme.success;
      } else if (line.startsWith('>') || line.startsWith('$')) {
        color = theme.primary;
      }
      return (
        <pre key={idx} style={{ ...styles.terminalLine, color }}>
          {line}
        </pre>
      );
    });
  }, [output]);

  return (
    <div ref={terminalRef} style={styles.terminal}>
      {output.length === 0 ? (
        <span style={{ color: theme.subtext }}>Waiting for output...</span>
      ) : (
        colorizedOutput
      )}
    </div>
  );
};

interface ProblemMatchDisplayProps {
  problems: Array<{ file: string; line: number; message: string; severity: string }>;
}

export const ProblemMatchDisplay: React.FC<ProblemMatchDisplayProps> = ({ problems }) => {
  if (problems.length === 0) return null;

  return (
    <div style={{ marginTop: '12px' }}>
      <h4 style={{ color: theme.error, marginBottom: '8px' }}>🔴 Problems ({problems.length})</h4>
      {problems.map((problem, idx) => (
        <div key={idx} style={styles.problemMatch}>
          <div style={{ color: theme.error, fontWeight: 500 }}>
            {problem.file}:{problem.line}
          </div>
          <div style={{ color: theme.text, marginTop: '4px' }}>{problem.message}</div>
        </div>
      ))}
    </div>
  );
};

interface TaskConfigViewProps {
  task: TaskDefinition;
  onClose: () => void;
}

export const TaskConfigView: React.FC<TaskConfigViewProps> = ({ task, onClose }) => {
  return (
    <div style={styles.configView}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
        <h4 style={{ margin: 0, color: theme.primary }}>Task Configuration</h4>
        <button type="button" style={{ ...styles.button, ...styles.buttonGhost }} onClick={onClose}>✕</button>
      </div>
      <div style={styles.configItem}>
        <span style={styles.configLabel}>Label</span>
        <span style={styles.configValue}>{task.label}</span>
      </div>
      <div style={styles.configItem}>
        <span style={styles.configLabel}>Type</span>
        <span style={styles.configValue}>{task.type}</span>
      </div>
      <div style={styles.configItem}>
        <span style={styles.configLabel}>Command</span>
        <span style={styles.configValue}>{task.command}</span>
      </div>
      {task.args && (
        <div style={styles.configItem}>
          <span style={styles.configLabel}>Arguments</span>
          <span style={styles.configValue}>{task.args.join(' ')}</span>
        </div>
      )}
      {task.cwd && (
        <div style={styles.configItem}>
          <span style={styles.configLabel}>Working Directory</span>
          <span style={styles.configValue}>{task.cwd}</span>
        </div>
      )}
      {task.group && (
        <div style={styles.configItem}>
          <span style={styles.configLabel}>Group</span>
          <span style={styles.configValue}>{task.group}</span>
        </div>
      )}
      {task.dependsOn && task.dependsOn.length > 0 && (
        <div style={styles.configItem}>
          <span style={styles.configLabel}>Depends On</span>
          <span style={styles.configValue}>{task.dependsOn.join(', ')}</span>
        </div>
      )}
      {task.problemMatcher && (
        <div style={styles.configItem}>
          <span style={styles.configLabel}>Problem Matcher</span>
          <span style={styles.configValue}>
            {Array.isArray(task.problemMatcher) ? task.problemMatcher.join(', ') : task.problemMatcher}
          </span>
        </div>
      )}
    </div>
  );
};
