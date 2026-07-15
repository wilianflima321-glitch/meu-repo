import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = join(__dirname, '..', '..', '..', '..')

function read(path: string) {
  return readFileSync(join(root, path), 'utf8')
}

describe('reliability incident response public contract', () => {
  const page = read('cloud-web-app/web/app/reliability/page.tsx') + read('cloud-web-app/web/app/reliability/reliabilityContent.ts')
  const trust = read('cloud-web-app/web/app/trust/page.tsx') + read('cloud-web-app/web/app/trust/trustContent.ts')
  const footer = read('cloud-web-app/web/components/ui/PublicFooter.tsx')

  it('publishes public status and incident grammar links', () => {
    expect(page).toContain('Reliability')
    expect(page).toContain('incident response')
    expect(page).toContain('Sev 1')
    expect(page).toContain('Sev 2')
    expect(page).toContain('Sev 3')
    expect(page).toContain("href: '/status'")
    expect(page).toContain("href: '/trust'")
  })

  it('avoids fake SLA or uptime claims', () => {
    expect(page).toContain('response targets')
    expect(page).toContain('not a contractual SLA')
    expect(page).toContain('No rolling uptime')
    expect(page).toContain('public incident history')
    expect(page).not.toMatch(/\b99\.9+%/)
    expect(page).not.toMatch(/five nines/i)
    expect(page).not.toMatch(/SLA guaranteed/i)
  })

  it('keeps reliability in trust/footer, not a new nav family', () => {
    expect(trust).toContain("href: '/reliability'")
    expect(footer).toContain("href: '/reliability'")
  })
})
