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
      className={`flex flex-col border-r border-white/[0.06] bg-zinc-950 transition-all duration-200 ${
        collapsed ? 'w-16' : 'w-60'
      } ${className}`}
      role="navigation"
      aria-label="Sidebar de navegacao"
    >
      {/* Header */}
      <div className={`flex h-14 items-center border-b border-white/[0.04] ${collapsed ? 'justify-center px-2' : 'justify-between px-4'}`}>
        {!collapsed && (
          <div className="flex items-center gap-2">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-gradient-to-br from-blue-500 to-cyan-500 text-white text-xs font-bold">
              A
            </div>
            <span className="text-sm font-semibold text-white">Aethel</span>
          </div>
        )}
        {onToggleCollapse && (
          <button
            type="button"
            onClick={onToggleCollapse}
            className="flex h-7 w-7 items-center justify-center rounded-md text-zinc-500 transition-colors hover:bg-white/[0.06] hover:text-white"
            aria-label={collapsed ? 'Expandir sidebar' : 'Recolher sidebar'}
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
                <p className="mb-1 px-4 text-[10px] font-semibold uppercase tracking-[0.14em] text-zinc-600">
                  {sectionLabels[sectionKey]}
                </p>
              )}
              {sectionKey !== 'main' && collapsed && <div className="mx-3 my-2 h-px bg-white/[0.04]" />}

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
                            ? 'bg-blue-500/10 text-blue-300'
                            : isDisabled
                            ? 'cursor-not-allowed text-zinc-700'
                            : 'text-zinc-400 hover:bg-white/[0.04] hover:text-zinc-200'
                        } ${collapsed ? 'justify-center' : ''}`}
                        aria-current={isActive ? 'page' : undefined}
                        title={collapsed ? item.label : undefined}
                      >
                        {/* Active indicator */}
                        {isActive && (
                          <div className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-blue-400" />
                        )}

                        {/* Icon */}
                        <span className={`flex-shrink-0 ${isActive ? 'text-blue-400' : ''}`}>
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
                                    ? 'bg-red-500/15 text-red-400'
                                    : item.badgeVariant === 'warning'
                                    ? 'bg-amber-500/15 text-amber-400'
                                    : 'bg-white/[0.06] text-zinc-500'
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
                        <div className="pointer-events-none absolute left-full top-1/2 z-50 ml-2 -translate-y-1/2 rounded-lg border border-white/[0.08] bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white shadow-xl whitespace-nowrap">
                          {item.label}
                          {item.disabledReason && (
                            <span className="mt-0.5 block text-zinc-500">{item.disabledReason}</span>
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
        <div className="border-t border-white/[0.04] px-4 py-3">
          <div className="flex items-center gap-2">
            <span className="inline-block h-2 w-2 rounded-full bg-emerald-500" />
            <span className="text-xs text-zinc-500">Plano {userPlan}</span>
          </div>
        </div>
      )}
    </aside>
  )
}

export default EnhancedDashboardSidebar
