import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  describeL13MultiLangSoakHonesty,
  L13_DESKTOP_MATRIX_LANGUAGES,
  probeL13LanguageBinary,
  runL13MultiLangSoak,
} from '@/lib/lsp/l13-multi-lang-soak'

vi.mock('@/lib/observability/logger', () => ({
  createComponentLogger: () => ({
    info: vi.fn(),
    error: vi.fn(),
    warn: vi.fn(),
    debug: vi.fn(),
  }),
}))

describe('L.13 / L.C multi-language soak matrix', () => {
  const prevPython = process.env.AETHEL_LSP_PYTHON
  const prevPyright = process.env.AETHEL_LSP_PYRIGHT

  afterEach(() => {
    if (prevPython === undefined) delete process.env.AETHEL_LSP_PYTHON
    else process.env.AETHEL_LSP_PYTHON = prevPython
    if (prevPyright === undefined) delete process.env.AETHEL_LSP_PYRIGHT
    else process.env.AETHEL_LSP_PYRIGHT = prevPyright
  })

  it('matrix languages are typescript + rust + python', () => {
    expect([...L13_DESKTOP_MATRIX_LANGUAGES]).toEqual(['typescript', 'rust', 'python'])
  })

  it('python env override pointing at missing file is HELD — never resolvable', async () => {
    process.env.AETHEL_LSP_PYTHON = 'E:\\definitely-missing-pyright-langserver.exe'
    delete process.env.AETHEL_LSP_PYRIGHT
    const probe = await probeL13LanguageBinary('python')
    expect(probe.status).toBe('HELD')
    expect(probe.resolvedPath).toBeNull()
    expect(probe.message).toContain('LSP_BINARY_HELD')
    expect(probe.envOverrideKeys).toContain('AETHEL_LSP_PYTHON')
  })

  it('soak report covers full matrix and never allows marketing', async () => {
    // Force python HELD via bogus env so the report is deterministic on this host.
    process.env.AETHEL_LSP_PYTHON = 'E:\\definitely-missing-pyright-langserver.exe'
    delete process.env.AETHEL_LSP_PYRIGHT

    const report = await runL13MultiLangSoak()
    expect(report.matrixLanguages).toEqual(['typescript', 'rust', 'python'])
    expect(report.probes).toHaveLength(3)
    expect(report.marketingAllowed).toBe(false)
    expect(report.anyHeld).toBe(true)
    expect(report.allResolvable).toBe(false)

    const byLang = Object.fromEntries(report.probes.map((p) => [p.language, p]))
    expect(byLang.python?.status).toBe('HELD')
    expect(byLang.python?.message).toContain('LSP_BINARY_HELD')
    // rust-analyzer is typically on PATH in this workspace; if not, must still be honest HELD.
    expect(['resolvable', 'HELD']).toContain(byLang.rust?.status)
    expect(['resolvable', 'HELD']).toContain(byLang.typescript?.status)
    for (const probe of report.probes) {
      if (probe.status === 'HELD') {
        expect(probe.resolvedPath).toBeNull()
        expect(probe.message).toMatch(/LSP_BINARY_HELD|not found/)
      } else {
        expect(probe.resolvedPath).toBeTruthy()
      }
    }

    const honesty = describeL13MultiLangSoakHonesty(report)
    expect(honesty.matrixShipped).toBe(true)
    expect(honesty.marketingAllowed).toBe(false)
    expect(honesty.liveAcceptance).toBe('held')
    expect(honesty.message).toContain('AETHEL_LSP_PYTHON')
  })

  it('does not invent resolvable status without PATH/env/node_modules evidence', async () => {
    delete process.env.AETHEL_LSP_PYTHON
    delete process.env.AETHEL_LSP_PYRIGHT
    const probe = await probeL13LanguageBinary('python', {
      cwd: 'E:\\definitely-no-node-modules-for-l13-soak',
    })
    // Without PATH pyright/pylsp (this workstation) → HELD.
    if (probe.status === 'resolvable') {
      expect(probe.resolvedPath).toBeTruthy()
    } else {
      expect(probe.status).toBe('HELD')
      expect(probe.message).toContain('AETHEL_LSP_PYTHON')
    }
  })
})
