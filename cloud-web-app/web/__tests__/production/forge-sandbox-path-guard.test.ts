import { describe, expect, it, beforeAll, afterAll } from 'vitest'
import fs from 'fs'
import os from 'os'
import path from 'path'
import {
  confinePathToProjectRoot,
  guardArgsWithinProjectRoot,
  guardCommandAllowlist,
  normalizeCommandBasename,
} from '@/lib/production/forge-sandbox-path-guard'

describe('L.1 forge-sandbox-path-guard', () => {
  let root: string

  beforeAll(() => {
    root = fs.mkdtempSync(path.join(os.tmpdir(), 'forge-sandbox-guard-'))
    fs.mkdirSync(path.join(root, 'src'))
    fs.writeFileSync(path.join(root, 'src', 'a.ts'), 'export const a = 1\n')
  })

  afterAll(() => {
    fs.rmSync(root, { recursive: true, force: true })
  })

  it('allows a relative path that resolves inside the project root', () => {
    const result = confinePathToProjectRoot(root, 'src')
    expect(result.ok).toBe(true)
  })

  it('allows the root itself when no path is given', () => {
    const result = confinePathToProjectRoot(root, undefined)
    expect(result.ok).toBe(true)
  })

  it('denies traversal that escapes the project root', () => {
    const result = confinePathToProjectRoot(root, '../../etc')
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe('outside_project_root')
  })

  it('denies an absolute path outside the project root', () => {
    const outside = os.platform() === 'win32' ? 'C:\\Windows' : '/etc'
    const result = confinePathToProjectRoot(root, outside)
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe('outside_project_root')
  })

  it('denies when the project root itself does not exist', () => {
    const result = confinePathToProjectRoot(path.join(root, 'ghost-root'), '.')
    expect(result.ok).toBe(false)
    if (result.ok) return
    expect(result.reason).toBe('root_not_found')
  })

  it('guardArgsWithinProjectRoot passes plain non-path args', () => {
    const result = guardArgsWithinProjectRoot(root, ['install', '--save-dev', 'typescript'])
    expect(result.ok).toBe(true)
    expect(result.violations).toHaveLength(0)
  })

  it('guardArgsWithinProjectRoot catches a traversal hidden in a --flag=value arg', () => {
    const result = guardArgsWithinProjectRoot(root, ['--prefix=../../secrets'])
    expect(result.ok).toBe(false)
    expect(result.violations.length).toBeGreaterThan(0)
  })

  it('guardArgsWithinProjectRoot catches a raw absolute path arg outside root', () => {
    const outside = os.platform() === 'win32' ? 'C:\\Windows\\System32' : '/etc/passwd'
    const result = guardArgsWithinProjectRoot(root, [outside])
    expect(result.ok).toBe(false)
  })

  it('normalizes Windows executable suffixes for allowlist comparison', () => {
    expect(normalizeCommandBasename('npm.cmd')).toBe('npm')
    expect(normalizeCommandBasename('node.exe')).toBe('node')
    expect(normalizeCommandBasename('/usr/bin/git')).toBe('git')
  })

  it('guardCommandAllowlist allows a listed command and denies an unlisted one', () => {
    const allowed = guardCommandAllowlist('node')
    expect(allowed.ok).toBe(true)

    const denied = guardCommandAllowlist('powershell')
    expect(denied.ok).toBe(false)
    if (denied.ok) return
    expect(denied.reason).toBe('command_not_allowlisted')
  })

  it('guardCommandAllowlist never allows shells even implicitly', () => {
    for (const shell of ['cmd', 'powershell', 'bash', 'sh', 'pwsh']) {
      const result = guardCommandAllowlist(shell)
      expect(result.ok).toBe(false)
    }
  })
})
