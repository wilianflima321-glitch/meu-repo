'use client'

import { useState, useRef, useEffect, type ReactNode } from 'react'
import { ChevronDown } from 'lucide-react'

export interface DropdownItem {
  id: string
  label: string
  icon?: ReactNode
  onClick?: () => void
  href?: string
  divider?: boolean
  danger?: boolean
  disabled?: boolean
}

export interface DropdownProps {
  trigger: ReactNode
  items: DropdownItem[]
  align?: 'left' | 'right'
  width?: 'auto' | 'sm' | 'md' | 'lg' | 'full'
}

const widthClasses: Record<string, string> = {
  auto: 'w-auto min-w-[160px]',
  sm: 'w-40',
  md: 'w-56',
  lg: 'w-72',
  full: 'w-full',
}

export function Dropdown({ trigger, items, align = 'right', width = 'auto' }: DropdownProps) {
  const [isOpen, setIsOpen] = useState(false)
  const dropdownRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  useEffect(() => {
    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setIsOpen(false)
      }
    }

    document.addEventListener('keydown', handleEscape)
    return () => document.removeEventListener('keydown', handleEscape)
  }, [])

  return (
    <div className="relative inline-block" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="focus:outline-none"
        aria-expanded={isOpen}
        aria-haspopup="true"
      >
        {trigger}
      </button>

      {isOpen && (
        <div
          className={`
            absolute z-50 mt-2
            ${align === 'right' ? 'right-0' : 'left-0'}
            ${widthClasses[width]}
            py-1 rounded-lg
            bg-slate-800 border border-slate-700
            shadow-xl shadow-black/30
            animate-in fade-in-0 zoom-in-95 duration-200
          `}
          role="menu"
        >
          {items.map((item, index) => {
            if (item.divider) {
              return <div key={index} className="my-1 border-t border-slate-700" />
            }

            const baseClasses = `
              flex items-center gap-3 w-full px-4 py-2 text-sm text-left
              transition-colors duration-150
              ${item.disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
              ${item.danger 
                ? 'text-red-400 hover:bg-red-500/10' 
                : 'text-slate-200 hover:bg-slate-700'
              }
            `

            if (item.href) {
              return (
                <a
                  key={item.id}
                  href={item.href}
                  className={baseClasses}
                  role="menuitem"
                  onClick={() => setIsOpen(false)}
                >
                  {item.icon && <span className="flex-shrink-0 w-5 h-5">{item.icon}</span>}
                  {item.label}
                </a>
              )
            }

            return (
              <button
                key={item.id}
                onClick={() => {
                  if (!item.disabled) {
                    item.onClick?.()
                    setIsOpen(false)
                  }
                }}
                className={baseClasses}
                role="menuitem"
                disabled={item.disabled}
              >
                {item.icon && <span className="flex-shrink-0 w-5 h-5">{item.icon}</span>}
                {item.label}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

// Convenience component for button with chevron
export function DropdownButton({
  children,
  items,
  align,
  width,
}: {
  children: ReactNode
  items: DropdownItem[]
  align?: 'left' | 'right'
  width?: DropdownProps['width']
}) {
  return (
    <Dropdown
      trigger={
        <span className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-slate-200 bg-slate-800 border border-slate-700 rounded-lg hover:bg-slate-700 transition-colors">
          {children}
          <ChevronDown className="w-4 h-4" />
        </span>
      }
      items={items}
      align={align}
      width={width}
    />
  )
}

export default Dropdown
