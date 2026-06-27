import { existsSync } from 'node:fs'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import {
  CREATIVE_STUDIO_ROUTE_REDIRECTS,
  CREATIVE_STUDIO_ROUTE_HREFS,
  CREATIVE_STUDIO_ROUTES,
  getCreativeStudioRouteNavigationHref,
} from '@/app/studio/creative-studio-routes'
import { STUDIO_PRIMARY_LINKS } from '@/lib/navigation/surfaces'
import { ROUTE_MATURITY_REGISTRY } from '@/lib/routes/route-maturity-registry'

const root = join(__dirname, '..', '..', '..', '..')

function pagePathFor(href: string) {
  const pathOnly = href.split('?')[0]
  if (pathOnly === '/studio') return 'cloud-web-app/web/app/studio/page.tsx'
  return `cloud-web-app/web/app${pathOnly}/page.tsx`
}

describe('creative studio route contract', () => {
  it('surfaces the previously hidden game, film, VFX, material, animation, terrain, physics, character, and audio editors', () => {
    expect(CREATIVE_STUDIO_ROUTE_HREFS).toEqual([
      '/studio/level',
      '/studio/scene',
      '/studio/material',
      '/studio/animation',
      '/studio/vfx',
      '/studio/quest',
      '/studio/terrain',
      '/studio/landscape',
      '/studio/cloth',
      '/studio/facial',
      '/studio/fluid',
      '/studio/foliage',
      '/studio/hair',
      '/studio/rig',
      '/studio/water',
      '/studio/sprite',
      '/studio/film',
    ])

    for (const href of ['/studio', ...CREATIVE_STUDIO_ROUTE_HREFS]) {
      const navigationHref = getCreativeStudioRouteNavigationHref({ href } as (typeof CREATIVE_STUDIO_ROUTES)[number])
      expect(
        existsSync(join(root, pagePathFor(navigationHref))),
        `${href} should resolve to a physical Studio page through grouped navigation`,
      ).toBe(true)
    }

    expect(Object.keys(CREATIVE_STUDIO_ROUTE_REDIRECTS)).toEqual([
      '/studio/scene',
      '/studio/material',
      '/studio/terrain',
      '/studio/landscape',
      '/studio/foliage',
      '/studio/water',
      '/studio/rig',
      '/studio/facial',
      '/studio/hair',
      '/studio/cloth',
      '/studio/fluid',
      '/studio/sprite',
      '/studio/audio',
      '/studio/cinematic',
    ])
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
