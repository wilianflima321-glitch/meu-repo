import { parseRepairedJson } from './json-repair';
import { aiService } from '../ai-service';
import type {
  AgentAction,
  AgentPlan,
  AgentReflection,
  AgentStep,
  AgentTask,
  AgentThinking,
  AgentToolDescriptor,
  MemoryEntry,
} from './agent-mode-contracts';
import { EXECUTOR_PROMPT, PLANNER_PROMPT, REFLECTOR_PROMPT } from './agent-mode-prompts';

type AddStep = (taskId: string, type: AgentStep['type'], content: string) => AgentStep;



export async function planAgentTask(params: {
  addStep: AddStep;
  onPlanned(plan: AgentPlan): void;
  task: AgentTask;
  thinkingBudget: number;
  tools: AgentToolDescriptor[];
}): Promise<AgentPlan> {
  const { addStep, onPlanned, task, thinkingBudget, tools } = params;
  const step = addStep(task.id, 'plan', 'Analyzing task and creating plan...');

  const response = await aiService.chat({
    taskKind: 'planning',
    messages: [
      { role: 'system', content: PLANNER_PROMPT },
      {
        role: 'user',
        content: `TASK: ${task.description}\n\nAVAILABLE TOOLS:\n${tools.map((tool) => `- ${tool.name}: ${tool.description}`).join('\n')}`,
      },
    ],
    temperature: 0.3,
    maxTokens: thinkingBudget,
  });

  try {
    const plan = await parseRepairedJson<AgentPlan>(response.content, 'AgentPlan: { subtasks: [...], analysis: string, ... }');
    step.content = `Plan created: ${plan.subtasks.length} subtasks`;
    onPlanned(plan);
    return plan;
  } catch (error) {
    return {
      analysis: 'Simple task, direct execution',
      approach: 'Sequential execution',
      subtasks: [{
        id: '1',
        description: task.description,
        tools: [],
        dependencies: [],
        estimatedSteps: 5,
        riskLevel: 'medium',
      }],
      successCriteria: 'Task completed without errors',
      potentialIssues: [],
    };
  }
}

export async function thinkAgentNextStep(params: {
  addStep: AddStep;
  context: string;
  memory: MemoryEntry[];
  subtask: AgentTask;
  task: AgentTask;
  tools: AgentToolDescriptor[];
}): Promise<AgentThinking> {
  const { addStep, context, memory, subtask, task, tools } = params;
  const step = addStep(task.id, 'think', 'Thinking about the next step...');

  const prompt = EXECUTOR_PROMPT
    .replace('{context}', context)
    .replace('{task}', subtask.description)
    .replace('{tools}', tools.map((tool) => `- ${tool.name}: ${tool.description}\n  Input: ${JSON.stringify(tool.inputSchema)}`).join('\n\n'))
    .replace('{memory}', memory.map((entry) => `- [${entry.type}] ${entry.content}`).join('\n'));

  const response = await aiService.chat({
    taskKind: 'tool-use',
    messages: [
      { role: 'system', content: prompt },
      { role: 'user', content: 'What is the next step?' },
    ],
    temperature: 0.2,
    maxTokens: 2000,
  });

  try {
    const thinking = await parseRepairedJson<AgentThinking>(response.content, 'AgentThinking: { thinking: string, action: { ... }, nextSteps: [...] }');
    step.content = thinking.thinking;
    return thinking;
  } catch (error) {
    return {
      thinking: 'Failed to process thinking',
      action: {
        type: 'error',
        reason: 'Failed to parse thinking response',
      },
      confidence: 0,
      nextSteps: [],
    };
  }
}

export async function reflectAgentAction(params: {
  action: AgentAction;
  addStep: AddStep;
  result: unknown;
  steps: AgentStep[];
  task: AgentTask;
}): Promise<AgentReflection> {
  const { action, addStep, result, steps, task } = params;
  const step = addStep(task.id, 'reflect', 'Analyzing result...');
  const history = steps.slice(-10).map((item) => `[${item.type}] ${item.content}`).join('\n');

  const prompt = REFLECTOR_PROMPT
    .replace('{task}', task.description)
    .replace('{action}', JSON.stringify(action))
    .replace('{result}', JSON.stringify(result))
    .replace('{history}', history);

  const response = await aiService.chat({
    taskKind: 'critic',
    messages: [
      { role: 'system', content: prompt },
      { role: 'user', content: 'Analyze the result and decide the next step.' },
    ],
    temperature: 0.2,
    maxTokens: 1500,
  });

  try {
    const reflection = await parseRepairedJson<AgentReflection>(response.content, 'AgentReflection: { assessment: string, success: boolean, issues: [...], ... }');
    step.content = reflection.assessment;
    return reflection;
  } catch (error) {
    return {
      assessment: 'Failed to process reflection',
      success: false,
      progress: 0,
      issues: ['Failed to parse reflection'],
      corrections: [],
      nextAction: 'abort',
      adjustments: '',
    };
  }
}
