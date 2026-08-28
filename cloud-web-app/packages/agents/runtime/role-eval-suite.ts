import type { AgentType } from './agent-roles'

export type AgentRoleEvalCase = {
  id: string
  role: AgentType
  prompt: string
  expectedEvidence: string[]
}

export type AgentRoleEvalSuite = {
  version: 1
  cases: AgentRoleEvalCase[]
  minimumCasesPerRole: number
}

export function buildAgentRoleEvalSuite(cases: AgentRoleEvalCase[] = [], minimumCasesPerRole = 30): AgentRoleEvalSuite {
  return { version: 1, cases, minimumCasesPerRole }
}

export function validateAgentRoleEvalSuite(suite: AgentRoleEvalSuite, roles: AgentType[]): string[] {
  const failures: string[] = []
  for (const role of roles) {
    const count = suite.cases.filter((item) => item.role === role).length
    if (count < suite.minimumCasesPerRole) failures.push(`${role}: eval cases ${count}/${suite.minimumCasesPerRole}`)
  }
  return failures
}
