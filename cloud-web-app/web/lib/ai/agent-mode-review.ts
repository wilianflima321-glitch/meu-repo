import type { AgentReview, AgentStep, AgentTask } from './agent-mode-contracts';

export function reviewAgentExecution(
  task: AgentTask,
  steps: AgentStep[],
  iterationCount: number
): AgentReview {
  const completedSubtasks = task.subtasks.filter((subtask) => subtask.status === 'completed');
  const failedSubtasks = task.subtasks.filter((subtask) => subtask.status === 'failed');

  if (failedSubtasks.length > 0) {
    return {
      success: false,
      error: `${failedSubtasks.length} subtasks failed`,
    };
  }

  if (completedSubtasks.length === task.subtasks.length) {
    return {
      success: true,
      result: {
        completedSubtasks: completedSubtasks.length,
        totalSteps: steps.length,
        iterations: iterationCount,
      },
    };
  }

  return {
    success: false,
    error: 'Execution incomplete',
  };
}
