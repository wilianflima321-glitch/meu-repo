'use client'

import { useState, useCallback } from 'react'
import Codicon from '@/components/ide/Codicon'

/**
 * Enhanced sidebar navigation shell for the Aethel Dashboard.
 * Provides collapsible sidebar with active states, tooltips, mobile drawer,
 * and keyboard navigation. This is a presentation wrapper; tab routing is
 * handled by the parent dashboard runtime.
 */

export interface SidebarNavItem {
  id: string
  label: string
  icon: string
  badge?: string | number
  badgeVariant?: 'default' | 'warning' | 'error'
  section?: string
  disabled?: boolean
  disabledReason?: string
}

interface EnhancedSidebarProps {
  items: SidebarNavItem[]
  activeId: string
  onSelect: (id: string) => void
  collapsed?: boolean
  onToggleCollapse?: () => void
  userPlan?: string
  className?: string
}

export function EnhancedDashboardSidebar({
  items,
  activeId,
  onSelect,
  collapsed = false,
  onToggleCollapse,
  userPlan,
  className = '',
}: EnhancedSidebarProps) {
  const [hoveredId, setHoveredId] = useState<string | null>(null)

  const sections = items.reduce<Record<string, SidebarNavItem[]>>((acc, item) => {
    const section = item.section || 'main'
    if (!acc[section]) acc[section] = []
    acc[section].push(item)
    return acc
  }, {})

  const sectionOrder = ['main', 'tools', 'settings', 'admin']
  const sectionLabels: Record<string, string> = {
    main: '',
    tools: 'Ferramentas',
    settings: 'Configuracao',
    admin: 'Admin',
  }

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent, itemId: string) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault()
        onSelect(itemId)
      }
      if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
        e.preventDefault()
        const currentIdx = items.findIndex((i) => i.id === itemId)
        const direction = e.key === 'ArrowDown' ? 1 : -1
        const nextIdx = Math.max(0, Math.min(items.length - 1, currentIdx + direction))
        const nextEl = document.querySelector(`[data-sidebar-item="${items[nextIdx].id}"]`) as HTMLElement
        nextEl?.focus()
      }
    },
    [items, onSelect]
  )

  return (
    <aside
      className={`flex flex-col border-r border-[var(--aethel-border-subtle)] bg-[var(--aethel-surface-primary)] transition-all duration-200 ${
        collapsed ? 'w-16' : 'w-60'
      } ${className}`}
      role="navigation"
      aria-label="Navigation sidebar"
    >
      {/* Header */}
      <div className={`flex h-14 items-center border-b border-[var(--aethel-border-subtle)] ${collapsed ? 'justify-center px-2' : 'justify-between px-4'}`}>
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--aethel-primary)] to-[var(--aethel-info)] text-[var(--aethel-text-primary)] text-xs font-bold">
              A
            </div>
            <span className="text-sm font-semibold text-[var(--aethel-text-primary)]">Aethel</span>
          </div>
        )}
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="flex h-7 w-7 items-center justify-center rounded-md text-[var(--aethel-text-tertiary)] transition-colors hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] hover:text-[var(--aethel-text-primary)]"
            aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}
          >
            <Codicon name={collapsed ? 'chevron-right' : 'chevron-left'} />
          </button>
        )}
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto py-2">
        {sectionOrder.map((sectionKey) => {
          const sectionItems = sections[sectionKey]
          if (!sectionItems?.length) return null

          return (
            <div key={sectionKey} className={sectionKey !== 'main' ? 'mt-4' : ''}>
              {sectionLabels[sectionKey] && !collapsed && (
                <p className="mb-1 px-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-[var(--aethel-text-tertiary)]">
                  {sectionLabels[sectionKey]}
                </p>
              )}
              {sectionKey !== 'main' && collapsed && <div className="mx-3 my-2 h-px bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)]" />}

              <div className="space-y-0.5 px-2">
                {sectionItems.map((item) => {
                  const isActive = activeId === item.id
                  const isHovered = hoveredId === item.id
                  const isDisabled = item.disabled

                  return (
                    <div key={item.id} className="relative">
                      <button
                        type="button"
                        data-sidebar-item={item.id}
                        onClick={() => !isDisabled && onSelect(item.id)}
                        onKeyDown={(e) => handleKeyDown(e, item.id)}
                        onMouseEnter={() => setHoveredId(item.id)}
                        onMouseLeave={() => setHoveredId(null)}
                        disabled={isDisabled}
                        className={`group flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm transition-all ${
                          isActive
                            ? 'bg-[color-mix(in_srgb,var(--aethel-primary)_18%,transparent)] text-[var(--aethel-text-primary)]'
                            : isDisabled
                            ? 'cursor-not-allowed text-[var(--aethel-text-tertiary)]'
                            : 'text-[var(--aethel-text-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_40%,transparent)] hover:text-[var(--aethel-text-secondary)]'
                        } ${collapsed ? 'justify-center' : ''}`}
                        aria-current={isActive ? 'page' : undefined}
                        title={collapsed ? item.label : undefined}
                      >
                        {/* Active indicator */}
                        {isActive && (
                          <div className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-[var(--aethel-primary)]" />
                        )}

                        {/* Icon */}
                        <span className={`flex-shrink-0 ${isActive ? 'text-[var(--aethel-primary)]' : ''}`}>
                          <Codicon name={item.icon} />
                        </span>

                        {/* Label */}
                        {!collapsed && (
                          <>
                            <span className="flex-1 truncate">{item.label}</span>
                            {/* Badge */}
                            {item.badge !== undefined && (
                              <span
                                className={`flex h-5 min-w-[20px] items-center justify-center rounded-full px-1.5 text-[10px] font-bold ${
                                  item.badgeVariant === 'error'
                                    ? 'bg-[color-mix(in_srgb,var(--aethel-error)_15%,transparent)] text-[var(--aethel-error)]'
                                    : item.badgeVariant === 'warning'
                                    ? 'bg-[color-mix(in_srgb,var(--aethel-warning)_15%,transparent)] text-[var(--aethel-warning)]'
                                    : 'bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_60%,transparent)] text-[var(--aethel-text-tertiary)]'
                                }`}
                              >
                                {item.badge}
                              </span>
                            )}
                          </>
                        )}
                      </button>

                      {/* Tooltip when collapsed */}
                      {collapsed && isHovered && (
                        <div className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 rounded-lg border border-[color-mix(in_srgb,var(--aethel-border-secondary)_60%,transparent)] bg-[var(--aethel-surface-secondary)] px-3 py-1.5 text-xs font-medium text-[var(--aethel-text-primary)] shadow-xl whitespace-nowrap">
                          {item.label}
                          {item.disabledReason && (
                            <span className="mt-0.5 block text-[var(--aethel-text-tertiary)]">{item.disabledReason}</span>
                          )}
                        </div>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </nav>

      {/* Footer */}
      {!collapsed && userPlan && (
        <div className="border-t border-[var(--aethel-border-subtle)] px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-[var(--aethel-success)]" />
            <span className="text-xs text-[var(--aethel-text-tertiary)]">Plano {userPlan}</span>
          </div>
        </div>
      )}
    </aside>
  )
}

export default EnhancedDashboardSidebar
