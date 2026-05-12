import { describe, expect, it } from 'vitest'

import {
  ADMIN_CONSOLIDATED_SECTIONS,
  findAdminSectionForRoute,
  getCoveredAdminRoutes,
} from '@/lib/admin/admin-consolidation'

describe('admin consolidation registry', () => {
  it('keeps admin navigation compressed into six operating areas', () => {
    expect(ADMIN_CONSOLIDATED_SECTIONS).toHaveLength(6)
    expect(ADMIN_CONSOLIDATED_SECTIONS.map((section) => section.id)).toEqual([
      'users',
      'billing',
      'ops',
      'security',
      'ai',
      'marketplace',
    ])
  })

  it('maps every legacy admin surface to one canonical owner area', () => {
    const routes = getCoveredAdminRoutes()
    expect(routes).toContain('/admin/users')
    expect(routes).toContain('/admin/ai-monitor')
    expect(routes).toContain('/admin/ip-registry')
    expect(routes).toContain('/admin/god-view')
    expect(new Set(routes).size).toBe(routes.length)
  })

  it('finds the section owner for deep links used by support and agents', () => {
    expect(findAdminSectionForRoute('/admin/fine-tuning')?.id).toBe('ai')
    expect(findAdminSectionForRoute('/admin/payments')?.id).toBe('billing')
    expect(findAdminSectionForRoute('/admin/unknown')).toBeUndefined()
  })
})
