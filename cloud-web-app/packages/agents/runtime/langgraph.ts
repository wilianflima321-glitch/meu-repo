import { StateGraph, Annotation, START, END } from '@langchain/langgraph'
import { BaseMessage, AIMessage, HumanMessage, SystemMessage } from '@langchain/core/messages'
import { ChatOpenAI } from '@langchain/openai'
import { replaceFunctionBlockTool } from './tools/replace-function-block'
import type { AgentType } from '../../../web/lib/agent-orchestrator'

export const StateAnnotation = Annotation.Root({
  messages: Annotation<BaseMessage[]>({
    reducer: (x: BaseMessage[], y: BaseMessage[]) => x.concat(y),
    default: () => [],
  }),
  role: Annotation<AgentType>({
    reducer: (x: AgentType, y: AgentType) => y ?? x,
    default: () => 'engineer' as AgentType,
  }),
  missionScope: Annotation<string>({
    reducer: (x: string, y: string) => y ?? x,
    default: () => '',
  }),
  currentPhase: Annotation<string>({
    reducer: (x: string, y: string) => y ?? x,
    default: () => 'planning',
  }),
  circuitBreakerTokens: Annotation<number>({
    reducer: (x: number, y: number) => x + y,
    default: () => 0,
  }),
  astErrors: Annotation<string[]>({
    reducer: (x: string[], y: string[]) => y,
    default: () => [],
  }),
})

export type AgentGraphState = typeof StateAnnotation.State;

// Node 1: Planner
const planningNode = async (state: AgentGraphState) => {
  const model = new ChatOpenAI({ temperature: 0, modelName: 'gpt-4o' })
  const response = await model.invoke([
    new SystemMessage('You are the Aethel Engine Architect Agent. Create a clear, step-by-step plan for the user mission.'),
    new HumanMessage(`Mission: ${state.missionScope}`)
  ])
  return { messages: [response], currentPhase: 'coding', circuitBreakerTokens: 150 }
}

// Node 2: Coder
const codingNode = async (state: AgentGraphState) => {
  const model = new ChatOpenAI({ temperature: 0.1, modelName: 'gpt-4o' }).bindTools([replaceFunctionBlockTool])
  const response = await model.invoke([
    new SystemMessage('You are the Aethel Engine Engineer Agent. Output the code modification needed using your replace_function_block tool.'),
    ...state.messages
  ])
  return { messages: [response], currentPhase: 'verifying', circuitBreakerTokens: 500 }
}

// Node 3: Verifier (AST Validation)
const verifyingNode = async (state: AgentGraphState) => {
  // Mock AST check
  const hasError = Math.random() > 0.8
  if (hasError) {
    return { astErrors: ['SyntaxError: unexpected token'], currentPhase: 'refactoring' }
  }
  return { astErrors: [], currentPhase: 'done' }
}

// Conditional routing
const routeAfterVerification = (state: AgentGraphState) => {
  if (state.astErrors.length > 0) {
    if (state.circuitBreakerTokens > 5000) {
      return 'handoff' // Circuit breaker triggered
    }
    return 'codingNode'
  }
  return 'end'
}

export const buildAgentGraph = () => {
  const workflow = new StateGraph(StateAnnotation)
    .addNode('planningNode', planningNode)
    .addNode('codingNode', codingNode)
    .addNode('verifyingNode', verifyingNode)
    
    .addEdge(START, 'planningNode')
    .addEdge('planningNode', 'codingNode')
    .addEdge('codingNode', 'verifyingNode')
    
    .addConditionalEdges('verifyingNode', routeAfterVerification, {
      'codingNode': 'codingNode',
      'handoff': END,
      'end': END,
    })

  return workflow.compile()
}

export async function runAgentMission(role: AgentType, missionScope: string) {
  const graph = buildAgentGraph()
  const result = await graph.invoke({
    role,
    missionScope,
    messages: [new HumanMessage(`Mission: ${missionScope}`)],
  })
  return result
}
