/**
 * L.2 / L.9 forge commit/CI gate — honest fail-closed on L.5 / L.8 / L.2.
 */
import { describe, it, expect } from 'vitest'
import {
  forgeCommitGateBlocksSuccess,
  runForgeCommitCiGate,
} from '@/lib/production/forge-commit-ci-gate'

describe('ForgeCommitCiGate (L.2/L.9)', () => {
  it('passes when L.2 template + L.8 preview + sandbox are honest', async () => {
    const result = await runForgeCommitCiGate({
      templateId: 'nextjs-14',
      requireDevContainer: true,
      preview: {
        ok: true,
        strategy: 'local-dev-server',
        url: 'http://127.0.0.1:3000',
        ready: true,
      },
      requirePreview: true,
      sandboxAvailable: true,
      requireSandbox: true,
      files: [
        {
          fileName: 'lib/forge-commit-gate-pass.ts',
          content: 'export function add(a: number, b: number): number {\n  return a + b\n}\n',
        },
      ],
      requireL5: true,
    })

    expect(result.ok).toBe(true)
    expect(result.verdict).toBe('PASS')
    expect(result.marketingAllowed).toBe(false)
    expect(forgeCommitGateBlocksSuccess(result)).toBe(false)
    expect(result.checks.find((c) => c.id === 'L2_DEVCONTAINER')?.status).toBe('pass')
    expect(result.checks.find((c) => c.id === 'L8_PREVIEW')?.status).toBe('pass')
  })

  it('blocks success when L.8 preview fails (no theater ok)', async () => {
    const result = await runForgeCommitCiGate({
      templateId: 'vite-react',
      requireDevContainer: true,
      preview: {
        ok: false,
        strategy: 'local-dev-server',
        message: 'Preview URL never became reachable',
      },
      requirePreview: true,
      sandboxAvailable: true,
      requireSandbox: true,
    })

    expect(result.ok).toBe(false)
    expect(result.verdict).toBe('FAIL')
    expect(forgeCommitGateBlocksSuccess(result)).toBe(true)
    expect(result.blockedReasons.some((r) => r.startsWith('L8_PREVIEW'))).toBe(true)
  })

  it('blocks when preview claims ok without URL (Zero-MVP)', async () => {
    const result = await runForgeCommitCiGate({
      requirePreview: true,
      preview: {
        ok: true,
        strategy: 'e2b',
        // url intentionally missing
      },
    })

    expect(result.ok).toBe(false)
    expect(result.blockedReasons.join(' ')).toMatch(/without a reachable URL/i)
  })

  it('blocks when requireL5 but no files provided', async () => {
    const result = await runForgeCommitCiGate({
      requireL5: true,
      files: [],
    })

    expect(result.ok).toBe(false)
    expect(result.blockedReasons.some((r) => r.startsWith('L5_TYPECHECK'))).toBe(true)
  })

  it('blocks when sandbox required but unavailable', async () => {
    const result = await runForgeCommitCiGate({
      requireSandbox: true,
      sandboxAvailable: false,
    })

    expect(result.ok).toBe(false)
    expect(result.blockedReasons.some((r) => r.startsWith('SANDBOX_AVAILABLE'))).toBe(true)
  })

  it('fails L.5 typecheck on bad TS and blocks commit', async () => {
    const result = await runForgeCommitCiGate({
      requireL5: true,
      files: [
        {
          fileName: 'lib/forge-commit-gate-bad.ts',
          content: 'export const x: number = "nope"\n',
        },
      ],
    })

    expect(result.ok).toBe(false)
    expect(result.checks.find((c) => c.id === 'L5_TYPECHECK')?.status).toBe('fail')
  })
})
