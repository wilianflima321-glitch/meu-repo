import type { AgentExecution } from '../../lib/ai-agent-system';

// ============================================================================
// UTILIDADES
// ============================================================================

export function formatExecutionResult(execution: AgentExecution): string {
  if (execution.error) {
    return `**Failure:** ${execution.error}`
  }

  if (execution.finalAnswer) {
    return execution.finalAnswer
  }

  const artifactList = execution.artifacts?.length
    ? `\n\n**Artifacts**\n${execution.artifacts.map((artifact) => `- ${artifact.name}`).join('\n')}`
    : ''

  const statusMap: Record<string, string> = {
    completed: 'completed',
    running: 'running',
    pending: 'pending',
    failed: 'failed',
  }

  const statusLine = execution.status === 'completed'
    ? 'Run completed.'
    : `Current status: ${statusMap[execution.status] || execution.status}.`

  return `${statusLine}${artifactList}`
}

export function formatMarkdown(text: string): string {
  return text
    .replace(/\*\*(.*|)\*\*/g, '<strong>$1</strong>')
    .replace(/\*(.*|)\*/g, '<em>$1</em>')
    .replace(/`(.*|)`/g, '<code class="bg-[var(--aethel-surface-tertiary)] px-1 rounded">$1</code>')
    .replace(/\n/g, '<br/>')
}
