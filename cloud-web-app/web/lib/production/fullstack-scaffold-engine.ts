import { resolveDevContainerTemplate, type SupportedDevContainerTemplate } from './devcontainer-manifest'
import {
  createForgeSandboxSession,
  execInForgeSandbox,
  resolveForgeSandboxAvailability,
  type ForgeSandboxSession
} from './forge-sandbox-executor'
import { orchestratePreviewSession, type PreviewOrchestrationResult, type PreviewStrategy } from './preview-orchestrator'
import type { CostGuardLedgerAdapter } from './creative-cost-guard'
import { createComponentLogger } from '../observability/logger'

const log = createComponentLogger('fullstack-scaffold-engine')

export interface ScaffoldEngineInput {
  userId: string
  projectId: string
  projectRootPath: string
  templateId: SupportedDevContainerTemplate
  preferredStrategy?: PreviewStrategy
  costAdapter: CostGuardLedgerAdapter
}

export interface ScaffoldEngineResult {
  ok: boolean
  message?: string
  preview?: PreviewOrchestrationResult
}

/**
 * L.9 — FullStackScaffoldEngine
 * Provisions a project from a given DevContainer Template directly inside the Sandbox
 * and seamlessly hands it off to the PreviewOrchestrator (L.8).
 */
export async function scaffoldAndPreviewProject(input: ScaffoldEngineInput): Promise<ScaffoldEngineResult> {
  const startedAt = Date.now()
  log.info('scaffold_started', { template: input.templateId, projectId: input.projectId })

  try {
    // 1. Resolve the template (L.2)
    const templateDef = resolveDevContainerTemplate(input.templateId)

    // 2. Determine best provider (same logic as L.8, or just let L.8 decide later, but we need the sandbox now)
    const preferred = input.preferredStrategy ?? 'local-dev-server'
    let provider: 'e2b' | 'local-isolated' | 'firecracker' = 'local-isolated'
    
    if (preferred === 'e2b') {
      const e2bStatus = await resolveForgeSandboxAvailability('e2b')
      if (e2bStatus.available) {
        provider = 'e2b'
      }
    }

    // 3. Provision the Sandbox Session (L.1) for Scaffolding
    const sessionResult = await createForgeSandboxSession({
      userId: input.userId,
      projectId: input.projectId,
      projectRootPath: input.projectRootPath,
      agentMode: 'Builder', 
      costAdapter: input.costAdapter,
      provider,
      estimatedMinutes: 5, // Scaffolding usually takes < 5 min
    })

    if (!sessionResult.ok) {
      log.error('scaffold_sandbox_provision_failed', { error: sessionResult.message })
      return { ok: false, message: `Failed to provision sandbox for scaffolding: ${sessionResult.message}` }
    }

    const session = sessionResult.session

    // 4. Execute the scaffolding command natively in the sandbox
    const scaffoldResult = await executeScaffoldCommands(session, input.projectRootPath, input.templateId)
    
    if (!scaffoldResult.ok) {
      log.error('scaffold_commands_failed', { error: scaffoldResult.error })
      return { ok: false, message: `Scaffolding failed: ${scaffoldResult.error}` }
    }

    // 5. Hand off to L.8 (PreviewOrchestrator) reusing the same session!
    const previewResult = await orchestratePreviewSession({
      userId: input.userId,
      projectId: input.projectId,
      projectRootPath: input.projectRootPath,
      manifest: templateDef.manifest,
      preferredStrategy: preferred,
      costAdapter: input.costAdapter,
      existingSandboxSessionId: session.sessionId, // CRITICAL: Session reuse
    })

    log.info('scaffold_completed', { durationMs: Date.now() - startedAt, previewOk: previewResult.ok })

    // Zero-MVP: scaffolding without a reachable preview is not a successful ship path.
    if (!previewResult.ok || (preferred !== 'inline' && !previewResult.url)) {
      return {
        ok: false,
        message: previewResult.message || 'Scaffold completed but L.8 preview orchestration failed.',
        preview: previewResult,
      }
    }

    return {
      ok: true,
      preview: previewResult,
    }

  } catch (error) {
    const message = error instanceof Error ? error.message : String(error)
    log.error('scaffold_engine_exception', { error: message })
    return { ok: false, message: `Scaffold engine exception: ${message}` }
  }
}

/**
 * Maps the DevContainer template to the actual shell command needed to generate it.
 */
async function executeScaffoldCommands(
  session: ForgeSandboxSession,
  projectRootPath: string,
  templateId: SupportedDevContainerTemplate
): Promise<{ ok: boolean; error?: string }> {
  
  // NOTE: For a truly robust setup, these commands usually run inside an empty directory.
  // CodeSandbox/E2B typically use `create-next-app` or write synthetic package.json directly.
  
  let command = ''
  let args: string[] = []

  switch (templateId) {
    case 'nextjs-14':
      command = 'npx'
      // We use . to install in the current directory. Next.js might complain if it's not empty,
      // but in a fresh sandbox context, it's usually fine or we force it.
      args = ['create-next-app@latest', '.', '--ts', '--eslint', '--tailwind', '--app', '--src-dir', '--import-alias', '"@/*"', '--use-npm', '-y']
      break
    case 'vite-react':
      command = 'npm'
      args = ['create', 'vite@latest', '.', '--', '--template', 'react-ts', '-y']
      break
    case 'node-typescript':
      command = 'npm'
      args = ['init', '-y']
      break
    case 'python-ml':
      command = 'python'
      args = ['-m', 'venv', 'venv'] // Minimal example
      break
    case 'rust-aethel':
      command = 'cargo'
      args = ['init', '.']
      break
    default:
      return { ok: false, error: `No scaffold commands defined for template ${templateId}` }
  }

  const execResult = await execInForgeSandbox({
    sessionId: session.sessionId,
    command,
    args,
    cwd: projectRootPath,
    timeoutMs: 120_000, // Scaffolding can take up to 2 mins
  })

  if (!execResult.ok || (execResult.exitCode !== 0 && execResult.exitCode !== null)) {
    return { ok: false, error: execResult.deniedMessage || execResult.stderr || execResult.stdout }
  }

  // Vite specific: it doesn't run npm install automatically like create-next-app does.
  if (templateId === 'vite-react') {
    const installResult = await execInForgeSandbox({
      sessionId: session.sessionId,
      command: 'npm',
      args: ['install'],
      cwd: projectRootPath,
      timeoutMs: 120_000,
    })
    
    if (!installResult.ok || (installResult.exitCode !== 0 && installResult.exitCode !== null)) {
      return { ok: false, error: `npm install failed: ${installResult.stderr}` }
    }
  }

  return { ok: true }
}
