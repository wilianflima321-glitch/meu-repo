import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'

const root = join(__dirname, '..', '..', '..', '..')

function read(path: string) {
  return readFileSync(join(root, path), 'utf8')
}

describe('public trust center contract', () => {
  const page = read('cloud-web-app/web/app/trust/page.tsx')
  const footer = read('cloud-web-app/web/components/ui/PublicFooter.tsx')
  const nav = read('cloud-web-app/web/lib/navigation/surfaces.ts')

  it('keeps the due-diligence map centralized without hiding deep proof pages', () => {
    expect(page).toContain('TrustCenterPageShell')
    expect(page).toContain("href: '/security'")
    expect(page).toContain("href: '/security-policy'")
    expect(page).toContain("href: '/compliance'")
    expect(page).toContain("href: '/status'")
    expect(page).toContain("href: '/privacy'")
    expect(page).toContain("href: '/terms'")
  })

  it('keeps compliance language honest and avoids fake certification claims', () => {
    expect(page).toContain('SOC 2 preparation')
    expect(page).toContain('responsible disclosure')
    expect(page).toContain('audit activity')
    expect(page).toContain('SLO/SLA')
    expect(page).not.toMatch(/\bSOC 2 certified\b/i)
    expect(page).not.toMatch(/\bISO 27001 certified\b/i)
    expect(page).not.toMatch(/\b99\.9+%/)
  })

  it('surfaces trust without adding another noisy public navigation family', () => {
    expect(nav).toContain("href: '/trust'")
    expect(nav).toContain("label: 'Trust'")
    expect(footer).toContain("href: '/trust'")
    expect(footer).toContain('Trust center')
  })
})
