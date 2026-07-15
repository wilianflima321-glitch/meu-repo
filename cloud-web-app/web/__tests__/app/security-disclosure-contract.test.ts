import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = join(__dirname, '..', '..', '..', '..')

function read(path: string) {
  return readFileSync(join(root, path), 'utf8')
}

describe('security disclosure public contract', () => {
  const policy = read('cloud-web-app/web/app/security-policy/page.tsx')
  const trustContent = read('cloud-web-app/web/app/trust/trustContent.ts')

  it('publishes the minimum safe-harbor and coordinated disclosure rules', () => {
    expect(policy).toContain('Responsible disclosure')
    expect(policy).toContain('safe harbor')
    expect(policy).toContain('Good-faith coordinated testing')
    expect(policy).toContain('Coordinated disclosure')
    expect(policy).toContain('security@aethel.dev')
    expect(policy).toContain('mailto:security@aethel.dev')
  })

  it('keeps scope, out-of-scope behavior, and AI agent risk explicit', () => {
    expect(policy).toContain('Public pages and your own account')
    expect(policy).toContain('Out of scope')
    expect(policy).toContain('AI / agents')
    expect(policy).toContain('Agent, browser, memory, runtime, tool, prompt, file, and approval issues')
    expect(policy).toContain('no irreversible actions')
  })

  it('states response targets without turning them into a fake SLA or bounty', () => {
    expect(policy).toContain('Response targets, not a contractual SLA')
    expect(policy).toContain('48 business hours')
    expect(policy).toContain('5 business days')
    expect(policy).toContain('not a contractual SLA')
    expect(policy).not.toMatch(/\bpublic bug bounty is live\b/i)
    expect(policy).not.toMatch(/\bguaranteed reward\b/i)
  })

  it('keeps disclosure and trust linked without a separate low-value acknowledgments page', () => {
    expect(policy).toContain("href: '/trust'")
    expect(policy).toContain('Acknowledgment only after real remediation')
    expect(policy).not.toContain("href: '/security-acknowledgments'")
    expect(trustContent).toContain("href: '/security-policy'")
    expect(trustContent).not.toContain("href: '/security-acknowledgments'")
  })
})
