import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  CREATIVE_STUDIO_ROUTE_HREFS,
  CREATIVE_STUDIO_ROUTES,
} from '@/app/studio/creative-studio-routes'
import { STUDIO_PRIMARY_LINKS } from '@/lib/navigation/surfaces'
import { ROUTE_MATURITY_REGISTRY } from '@/lib/routes/route-maturity-registry'

const root = join(__dirname, '..', '..', '..', '..')

function pagePathFor(href: string) {
  if (href === '/studio') return 'cloud-web-app/web/app/studio/page.tsx'
  return `cloud-web-app/web/app${href}/page.tsx`
}

describe('creative studio route contract', () => {
  it('surfaces the previously hidden game, film, VFX, material, animation, and audio editors', () => {
    expect(CREATIVE_STUDIO_ROUTE_HREFS).toEqual([
      '/studio/level',
      '/studio/scene',
      '/studio/material',
      '/studio/animation',
      '/studio/vfx',
      '/studio/film',
      '/studio/audio',
    ])

    for (const href of ['/studio', ...CREATIVE_STUDIO_ROUTE_HREFS]) {
      expect(existsSync(join(root, pagePathFor(href))), `${href} page should exist`).toBe(true)
    }
  })

  it('keeps creative depth discoverable without replacing the mission-first Studio home', () => {
    expect(STUDIO_PRIMARY_LINKS).toContainEqual({
      href: '/studio',
      label: 'Creative',
      exact: false,
    })

    expect(STUDIO_PRIMARY_LINKS.find((link) => link.href === '/dashboard')).toMatchObject({
      label: 'Mission',
      exact: true,
    })
  })

  it('registers creative surfaces with honest maturity labels', () => {
    const registry = new Map(ROUTE_MATURITY_REGISTRY.map((route) => [route.path, route]))

    expect(registry.get('/studio')).toMatchObject({ maturity: 'BETA', label: 'Creative Studio' })

    for (const route of CREATIVE_STUDIO_ROUTES) {
      expect(registry.get(route.href)).toMatchObject({
        maturity: route.maturity,
        label: route.label,
      })
    }

    expect(registry.get('/studio/film')).toMatchObject({ maturity: 'ALPHA' })
    expect(registry.get('/studio/audio')).toMatchObject({ maturity: 'ALPHA' })
  })
})
