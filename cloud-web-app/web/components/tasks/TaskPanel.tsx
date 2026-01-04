/**
 * Aethel Engine - Task Panel UI Component
 * 
 * Interface completa para gerenciamento e execução de tasks
 * com visualização em tempo real e controles de execução.
 */

import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { TaskRunner, TaskDefinition, TaskExecution } from '../../lib/tasks/task-runner';

// ============================================================================
// CATPPUCCIN MOCHA THEME
// ============================================================================

const theme = {
  base: '#1e1e2e',
  surface: '#313244',
  surface1: '#45475a',
  surface2: '#585b70',
  text: '#cdd6f4',
  subtext: '#a6adc8',
  primary: '#89b4fa',
  success: '#a6e3a1',
  warning: '#fab387',
  error: '#f38ba8',
  overlay: '#6c7086',
  lavender: '#b4befe',
  mauve: '#cba6f7',
};

// ============================================================================
// STYLES
// ============================================================================

const styles: Record<string, React.CSSProperties> = {
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
    backgroundColor: '#11111b',
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

const TaskItem: React.FC<TaskItemProps> = ({ task, isRunning, onRun, onStop, onShowConfig }) => {
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
        <button
          style={{ ...styles.button, ...styles.buttonGhost }}
          onClick={(e) => { e.stopPropagation(); onShowConfig(); }}
          title="View Configuration"
        >
          ⚙️
        </button>
        {isRunning ? (
          <button
            style={{ ...styles.button, ...styles.buttonDanger }}
            onClick={(e) => { e.stopPropagation(); onStop(); }}
          >
            ⬛ Stop
          </button>
        ) : (
          <button
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

const OutputTerminal: React.FC<OutputTerminalProps> = ({ output, autoScroll = true }) => {
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

const ProblemMatchDisplay: React.FC<ProblemMatchDisplayProps> = ({ problems }) => {
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

const TaskConfigView: React.FC<TaskConfigViewProps> = ({ task, onClose }) => {
  return (
    <div style={styles.configView}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
        <h4 style={{ margin: 0, color: theme.primary }}>Task Configuration</h4>
        <button style={{ ...styles.button, ...styles.buttonGhost }} onClick={onClose}>✕</button>
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

// ============================================================================
// MAIN COMPONENT
// ============================================================================

type TabType = 'available' | 'running' | 'history';

interface TaskPanelProps {
  taskRunner?: TaskRunner;
  tasks?: TaskDefinition[];
  onTaskRun?: (task: TaskDefinition) => void;
  onTaskStop?: (executionId: string) => void;
}

export const TaskPanel: React.FC<TaskPanelProps> = ({
  taskRunner,
  tasks = [],
  onTaskRun,
  onTaskStop,
}) => {
  const [activeTab, setActiveTab] = useState<TabType>('available');
  const [runningTasks, setRunningTasks] = useState<TaskExecution[]>([]);
  const [taskHistory, setTaskHistory] = useState<TaskExecution[]>([]);
  const [selectedTask, setSelectedTask] = useState<TaskDefinition | null>(null);
  const [showConfig, setShowConfig] = useState<string | null>(null);
  const [selectedExecution, setSelectedExecution] = useState<TaskExecution | null>(null);

  // Group tasks by type
  const groupedTasks = useMemo(() => {
    const groups: Record<string, TaskDefinition[]> = {
      npm: [],
      shell: [],
      custom: [],
      process: [],
    };

    tasks.forEach((task) => {
      if (groups[task.type]) {
        groups[task.type].push(task);
      }
    });

    return groups;
  }, [tasks]);

  // Subscribe to task runner events
  useEffect(() => {
    if (!taskRunner) return;

    const handleTaskStart = (execution: TaskExecution) => {
      setRunningTasks((prev) => [...prev, execution]);
    };

    const handleTaskOutput = (executionId: string, line: string) => {
      setRunningTasks((prev) =>
        prev.map((exec) =>
          exec.id === executionId
            ? { ...exec, output: [...exec.output, line] }
            : exec
        )
      );
    };

    const handleTaskEnd = (execution: TaskExecution) => {
      setRunningTasks((prev) => prev.filter((exec) => exec.id !== execution.id));
      setTaskHistory((prev) => [execution, ...prev].slice(0, 50)); // Keep last 50
    };

    taskRunner.on('taskStart', handleTaskStart);
    taskRunner.on('taskOutput', handleTaskOutput);
    taskRunner.on('taskEnd', handleTaskEnd);

    return () => {
      taskRunner.off('taskStart', handleTaskStart);
      taskRunner.off('taskOutput', handleTaskOutput);
      taskRunner.off('taskEnd', handleTaskEnd);
    };
  }, [taskRunner]);

  const handleRunTask = useCallback((task: TaskDefinition) => {
    if (onTaskRun) {
      onTaskRun(task);
    } else if (taskRunner) {
      taskRunner.runTask(task.label);
    }
  }, [onTaskRun, taskRunner]);

  const handleStopTask = useCallback((executionId: string) => {
    if (onTaskStop) {
      onTaskStop(executionId);
    } else if (taskRunner) {
      taskRunner.cancelTask(executionId);
    }
  }, [onTaskStop, taskRunner]);

  const handleRestartTask = useCallback((execution: TaskExecution) => {
    handleStopTask(execution.id);
    setTimeout(() => handleRunTask(execution.task), 100);
  }, [handleStopTask, handleRunTask]);

  const isTaskRunning = useCallback((taskLabel: string) => {
    return runningTasks.some((exec) => exec.task.label === taskLabel);
  }, [runningTasks]);

  const getStatusBadge = (status: TaskExecution['status']) => {
    const statusStyles: Record<string, React.CSSProperties> = {
      running: styles.statusRunning,
      completed: styles.statusCompleted,
      failed: styles.statusFailed,
      cancelled: styles.statusCancelled,
    };
    return (
      <span style={{ ...styles.badge, ...statusStyles[status] }}>
        {status}
      </span>
    );
  };

  const formatDuration = (start: number, end?: number) => {
    const duration = (end || Date.now()) - start;
    if (duration < 1000) return `${duration}ms`;
    if (duration < 60000) return `${(duration / 1000).toFixed(1)}s`;
    return `${Math.floor(duration / 60000)}m ${Math.floor((duration % 60000) / 1000)}s`;
  };

  const formatTime = (timestamp: number) => {
    return new Date(timestamp).toLocaleTimeString();
  };

  // Render tab content
  const renderContent = () => {
    switch (activeTab) {
      case 'available':
        return (
          <div>
            {Object.entries(groupedTasks).map(([type, typeTasks]) =>
              typeTasks.length > 0 && (
                <div key={type} style={styles.taskGroup}>
                  <div style={styles.groupHeader}>
                    {type === 'npm' && '📦 NPM Scripts'}
                    {type === 'shell' && '💻 Shell Commands'}
                    {type === 'custom' && '⚙️ Custom Tasks'}
                    {type === 'process' && '🔄 Process Tasks'}
                  </div>
                  {typeTasks.map((task) => (
                    <div key={task.label}>
                      <TaskItem
                        task={task}
                        isRunning={isTaskRunning(task.label)}
                        onRun={() => handleRunTask(task)}
                        onStop={() => {
                          const exec = runningTasks.find((e) => e.task.label === task.label);
                          if (exec) handleStopTask(exec.id);
                        }}
                        onShowConfig={() => setShowConfig(showConfig === task.label ? null : task.label)}
                      />
                      {showConfig === task.label && (
                        <TaskConfigView task={task} onClose={() => setShowConfig(null)} />
                      )}
                    </div>
                  ))}
                </div>
              )
            )}
            {tasks.length === 0 && (
              <div style={styles.emptyState}>
                <span style={{ fontSize: '48px', marginBottom: '16px' }}>📋</span>
                <h3 style={{ margin: '0 0 8px 0' }}>No Tasks Available</h3>
                <p style={{ margin: 0 }}>Add tasks to your tasks.json file to see them here.</p>
              </div>
            )}
          </div>
        );

      case 'running':
        return (
          <div>
            {runningTasks.length === 0 ? (
              <div style={styles.emptyState}>
                <span style={{ fontSize: '48px', marginBottom: '16px' }}>⏸️</span>
                <h3 style={{ margin: '0 0 8px 0' }}>No Running Tasks</h3>
                <p style={{ margin: 0 }}>Start a task from the Available Tasks tab.</p>
              </div>
            ) : (
              runningTasks.map((execution) => (
                <div key={execution.id} style={{ marginBottom: '24px' }}>
                  <div style={styles.taskItem}>
                    <div style={styles.taskInfo}>
                      <span style={styles.taskLabel}>
                        {execution.task.label} {getStatusBadge(execution.status)}
                      </span>
                      <span style={styles.taskCommand}>
                        Running for {formatDuration(execution.startTime)}
                        {execution.pid && ` • PID: ${execution.pid}`}
                      </span>
                    </div>
                    <div style={styles.taskControls}>
                      <button
                        style={{ ...styles.button, ...styles.buttonWarning }}
                        onClick={() => handleRestartTask(execution)}
                      >
                        🔄 Restart
                      </button>
                      <button
                        style={{ ...styles.button, ...styles.buttonDanger }}
                        onClick={() => handleStopTask(execution.id)}
                      >
                        ⬛ Stop
                      </button>
                    </div>
                  </div>
                  <OutputTerminal output={execution.output} autoScroll />
                </div>
              ))
            )}
          </div>
        );

      case 'history':
        return (
          <div>
            {taskHistory.length === 0 ? (
              <div style={styles.emptyState}>
                <span style={{ fontSize: '48px', marginBottom: '16px' }}>📜</span>
                <h3 style={{ margin: '0 0 8px 0' }}>No Task History</h3>
                <p style={{ margin: 0 }}>Completed tasks will appear here.</p>
              </div>
            ) : (
              <>
                {taskHistory.map((execution) => (
                  <div key={execution.id}>
                    <div
                      style={{
                        ...styles.historyItem,
                        cursor: 'pointer',
                        borderLeft: `3px solid ${
                          execution.status === 'completed' ? theme.success :
                          execution.status === 'failed' ? theme.error :
                          theme.warning
                        }`,
                      }}
                      onClick={() => setSelectedExecution(
                        selectedExecution?.id === execution.id ? null : execution
                      )}
                    >
                      <div style={styles.taskInfo}>
                        <span style={styles.taskLabel}>
                          {execution.task.label} {getStatusBadge(execution.status)}
                        </span>
                        <div style={{ display: 'flex', gap: '16px' }}>
                          <span style={styles.historyTime}>
                            {formatTime(execution.startTime)}
                          </span>
                          <span style={styles.historyDuration}>
                            Duration: {formatDuration(execution.startTime, execution.endTime)}
                          </span>
                          {execution.exitCode !== undefined && (
                            <span style={{
                              ...styles.historyDuration,
                              color: execution.exitCode === 0 ? theme.success : theme.error,
                            }}>
                              Exit: {execution.exitCode}
                            </span>
                          )}
                        </div>
                      </div>
                      <button
                        style={{ ...styles.button, ...styles.buttonPrimary }}
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRunTask(execution.task);
                        }}
                      >
                        ▶️ Re-run
                      </button>
                    </div>
                    {selectedExecution?.id === execution.id && (
                      <div style={{ marginBottom: '16px' }}>
                        <OutputTerminal output={execution.output} autoScroll={false} />
                        {execution.status === 'failed' && (
                          <ProblemMatchDisplay
                            problems={[
                              // Mock problem matches - in real implementation parse from output
                            ]}
                          />
                        )}
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}
          </div>
        );
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h2 style={styles.title}>⚡ Task Runner</h2>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          {runningTasks.length > 0 && (
            <span style={{ ...styles.badge, ...styles.statusRunning }}>
              {runningTasks.length} running
            </span>
          )}
        </div>
      </div>

      <div style={styles.tabs}>
        {(['available', 'running', 'history'] as TabType[]).map((tab) => (
          <button
            key={tab}
            style={{
              ...styles.tab,
              ...(activeTab === tab ? styles.tabActive : {}),
            }}
            onClick={() => setActiveTab(tab)}
          >
            {tab === 'available' && '📋 Available Tasks'}
            {tab === 'running' && `🔄 Running${runningTasks.length > 0 ? ` (${runningTasks.length})` : ''}`}
            {tab === 'history' && '📜 History'}
          </button>
        ))}
      </div>

      <div style={styles.content}>
        {renderContent()}
      </div>
    </div>
  );
};

export default TaskPanel;
