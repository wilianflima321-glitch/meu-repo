/**
 * Aethel Engine - Task Panel UI Component
 *
 * Interface completa para gerenciamento e execução de tasks
 * com visualização em tempo real e controles de execução.
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { TaskRunner, TaskDefinition, TaskExecution } from '../../lib/tasks/task-runner';

import {
  OutputTerminal,
  ProblemMatchDisplay,
  TaskConfigView,
  TaskItem,
  styles,
  theme,
} from './TaskPanel.parts';

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
                      <button type="button"
                        style={{ ...styles.button, ...styles.buttonWarning }}
                        onClick={() => handleRestartTask(execution)}
                      >
                        🔄 Restart
                      </button>
                      <button type="button"
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
                      <button type="button"
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
          <button type="button"
            key={tab}
            aria-label={`Abrir aba ${tab}`}
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
