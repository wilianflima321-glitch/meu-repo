import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = join(__dirname, '..', '..', '..', '..')

function read(path: string) {
  return readFileSync(join(root, path), 'utf8')
}

describe('security disclosure public contract', () => {
  const policy = read('cloud-web-app/web/app/security-policy/page.tsx')
  const acknowledgments = read('cloud-web-app/web/app/security-acknowledgments/page.tsx')
  const trust = read('cloud-web-app/web/app/trust/page.tsx')

  it('publishes the minimum safe-harbor and coordinated disclosure rules', () => {
    expect(policy).toContain('Responsible disclosure')
    expect(policy).toContain('safe harbor')
    expect(policy).toContain('boa-fe')
    expect(policy).toContain('coordinated disclosure')
    expect(policy).toContain('security@aethel.dev')
    expect(policy).toContain('mailto:security@aethel.dev')
  })

  it('keeps scope, out-of-scope behavior, and AI agent risk explicit', () => {
    expect(policy).toContain('Superficies publicas e contas proprias')
    expect(policy).toContain('Fora de escopo')
    expect(policy).toContain('AI / agentes')
    expect(policy).toContain('browser operator')
    expect(policy).toContain('tool calls')
    expect(policy).toContain('acoes irreversiveis')
  })

  it('states response targets without turning them into a fake SLA or bounty', () => {
    expect(policy).toContain('Response targets, nao SLA juridico')
    expect(policy).toContain('48 horas uteis')
    expect(policy).toContain('5 dias uteis')
    expect(policy).toContain('nao e SLA contratual nem bounty formal')
    expect(policy).not.toMatch(/\bpublic bug bounty is live\b/i)
    expect(policy).not.toMatch(/\bguaranteed reward\b/i)
  })

  it('keeps disclosure, acknowledgments, and trust linked as one public journey', () => {
    expect(policy).toContain("href: '/trust'")
    expect(policy).toContain("href: '/security-acknowledgments'")
    expect(acknowledgments).toContain("href: '/trust'")
    expect(trust).toContain("href: '/security-acknowledgments'")
  })
})
