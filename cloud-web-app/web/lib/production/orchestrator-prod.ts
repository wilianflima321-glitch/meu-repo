/**
 * J.12 — Orchestrator Prod
 *
 * STATUS: STOPPED / HELD — this module is NOT production-ready and MUST NOT be
 * advertised as such (see Master Map: J.11/J.12 STOPPED). It is a working
 * scaffold that translates Maestro DAG plans into ACP task dispatches, but it
 * still lacks the guarantees a production orchestrator requires:
 *  - no load-aware scheduling (naive first-available assignment);
 *  - no retry / backoff / deadline policy — a delegated task that never reports
 *    remains in flight until sibling tasks reach terminal state and reap it;
 *  - downstream fan-out is fire-and-forget (not awaited by dispatchJob).
 *
 * Fail-closed contract (Zero-MVP / Anti-Mock): whenever a task cannot be
 * delegated (no registered agents, missing connection, rejected send) the
 * orchestrator records an honest `held` / `failed` outcome instead of silently
 * returning. Downstream tasks only run once ALL dependencies hold terminal
 * `completed` outcomes, and a job is evicted from activeJobs (with its task
 * results pruned) only when every task has reached a terminal state — bounding
 * long-lived server memory.
 */

import { createComponentLogger } from '@/lib/observability/logger'
import type { AcpConnection, AcpMessage } from './agent-control-protocol'
import { createAcpRequest } from './agent-control-protocol'

const log = createComponentLogger('orchestrator-prod')

export type OrchestratorTask = {
  taskId: string
  command: string
  payload: Record<string, any>
  dependsOn?: string[]
}

export type OrchestratorJob = {
  jobId: string
  tasks: OrchestratorTask[]
}

export type OrchestratorTaskOutcome = {
  status: 'completed' | 'failed' | 'held'
  result?: unknown
  reason?: string
  at: string
}

export class OrchestratorProd {
  private activeJobs = new Map<string, OrchestratorJob>()
  private connections = new Map<string, AcpConnection>()
  private taskResults = new Map<string, OrchestratorTaskOutcome>()

  constructor() {}

  registerAgentConnection(agentId: string, connection: AcpConnection) {
    this.connections.set(agentId, connection)
    connection.onMessage((msg) => this.handleAgentMessage(agentId, msg))
    log.info('agent_registered', { agentId })
  }

  unregisterAgentConnection(agentId: string) {
    const connection = this.connections.get(agentId)
    if (connection) {
      connection.close()
      this.connections.delete(agentId)
      log.info('agent_unregistered', { agentId })
    }
  }

  async dispatchJob(job: OrchestratorJob) {
    log.info('job_dispatch_start', { jobId: job.jobId, taskCount: job.tasks.length })
    this.activeJobs.set(job.jobId, job)

    const rootTasks = job.tasks.filter((t) => !t.dependsOn || t.dependsOn.length === 0)

    // Fail-closed: a non-empty DAG with no root tasks is malformed. Mark every
    // task `held` so the job can be reaped instead of silently stalling.
    if (job.tasks.length > 0 && rootTasks.length === 0) {
      log.error('job_no_root_tasks', { jobId: job.jobId })
      for (const task of job.tasks) {
        this.recordTaskOutcome(task.taskId, {
          status: 'held',
          reason: 'no_root_tasks',
          at: new Date().toISOString()
        })
      }
      return
    }

    await Promise.all(rootTasks.map((t) => this.scheduleTask(t)))

    // If every task already reached a terminal state (e.g. all held/failed
    // synchronously) reap immediately; otherwise reaping happens on the last
    // agent/report outcome via recordTaskOutcome.
    this.reapFinishedJobs()
  }

  private async scheduleTask(task: OrchestratorTask) {
    const agentIds = Array.from(this.connections.keys())
    if (agentIds.length === 0) {
      // Fail-closed: no silent success. Record an honest `held` outcome so
      // downstream tasks do not run against phantom results and the job can
      // still be reaped.
      this.recordTaskOutcome(task.taskId, {
        status: 'held',
        reason: 'no_agents_available',
        at: new Date().toISOString()
      })
      log.error('no_agents_available', { taskId: task.taskId })
      return
    }

    // Naive first-available assignment. J.12 is STOPPED: load-aware routing is
    // an explicit open item before this module may claim production readiness.
    const assignedAgent = agentIds[0]
    const connection = this.connections.get(assignedAgent)

    if (!connection) {
      this.recordTaskOutcome(task.taskId, {
        status: 'failed',
        reason: 'agent_connection_missing',
        at: new Date().toISOString()
      })
      log.error('task_delegate_connection_missing', { taskId: task.taskId, agentId: assignedAgent })
      return
    }

    const msg = createAcpRequest('agent/delegate', {
      taskId: task.taskId,
      command: task.command,
      payload: task.payload
    })

    try {
      log.info('task_delegated', { taskId: task.taskId, agentId: assignedAgent })
      await connection.send(msg)
    } catch (err) {
      // Fail-closed: a rejected send is a failed task, and the agent is
      // presumed unhealthy — unregister it so it stops receiving work.
      this.recordTaskOutcome(task.taskId, {
        status: 'failed',
        reason: err instanceof Error ? err.message : 'send_failed',
        at: new Date().toISOString()
      })
      this.unregisterAgentConnection(assignedAgent)
      log.error('task_delegate_failed', { taskId: task.taskId, agentId: assignedAgent, error: String(err) })
    }
  }

  private handleAgentMessage(agentId: string, msg: AcpMessage) {
    log.debug('acp_message_received', { agentId, type: msg.type })

    if (msg.type === 'notification' && msg.method === 'agent/report') {
      const { taskId, result, status } = msg.params || {}

      if (typeof taskId === 'string') {
        if (status === 'completed') {
          this.recordTaskOutcome(taskId, { status: 'completed', result, at: new Date().toISOString() })
        } else if (status === 'failed') {
          this.recordTaskOutcome(taskId, {
            status: 'failed',
            reason: msg.params?.error ?? 'agent_reported_failure',
            at: new Date().toISOString()
          })
        }
      }
    }
  }

  private recordTaskOutcome(taskId: string, outcome: OrchestratorTaskOutcome) {
    this.taskResults.set(taskId, outcome)
    this.triggerDownstreamTasks(taskId)
    this.reapFinishedJobs()
  }

  private triggerDownstreamTasks(completedTaskId: string) {
    for (const job of this.activeJobs.values()) {
      const ready = (dep: string): boolean => {
        const outcome = this.taskResults.get(dep)
        return Boolean(outcome && outcome.status === 'completed')
      }

      const pendingTasks = job.tasks.filter(
        (t) =>
          // Never re-dispatch a task that already has an outcome.
          !this.taskResults.has(t.taskId) &&
          t.dependsOn?.includes(completedTaskId) &&
          t.dependsOn.every(ready)
      )

      // Fire-and-forget fan-out is a documented STOPPED limitation.
      pendingTasks.forEach((t) => void this.scheduleTask(t))
    }
  }

  private reapFinishedJobs() {
    for (const [jobId, job] of this.activeJobs) {
      const allTerminal = job.tasks.every((t) => this.taskResults.has(t.taskId))
      if (!allTerminal) continue

      this.activeJobs.delete(jobId)
      for (const task of job.tasks) {
        this.taskResults.delete(task.taskId)
      }
      log.info('job_reaped', { jobId, taskCount: job.tasks.length })
    }
  }
}
