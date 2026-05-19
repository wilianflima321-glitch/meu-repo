'use client'

import { useState, useRef, useEffect, type ReactNode } from 'react'
import { ChevronDown, Check } from 'lucide-react'

export interface SelectOption {
  value: string
  label: string
  icon?: ReactNode
  description?: string
  disabled?: boolean
}

export interface SelectProps {
  options: SelectOption[]
  value?: string
  onChange?: (value: string) => void
  placeholder?: string
  label?: string
  error?: string
  disabled?: boolean
  fullWidth?: boolean
  size?: 'sm' | 'md' | 'lg'
  searchable?: boolean
}

const sizeClasses = {
  sm: 'px-3 py-2 text-sm min-h-[36px]',
  md: 'px-4 py-2.5 text-sm min-h-[42px]',
  lg: 'px-4 py-3 text-base min-h-[48px]',
}

export function Select({
  options,
  value,
  onChange,
  placeholder = 'Selecione...',
  label,
  error,
  disabled = false,
  fullWidth = true,
  size = 'md',
  searchable = false,
}: SelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selectedOption = options.find((opt) => opt.value === value)

  // Filter options based on search
  const filteredOptions = searchable && searchQuery
    ? options.filter(opt =>
        opt.label.toLowerCase().includes(searchQuery.toLowerCase()) ||
        opt.description?.toLowerCase().includes(searchQuery.toLowerCase())
      )
    : options

  // Close on click outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false)
        setSearchQuery('')
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Focus input when dropdown opens
  useEffect(() => {
    if (isOpen && searchable && inputRef.current) {
      inputRef.current.focus()
    }
  }, [isOpen, searchable])

  const handleSelect = (optionValue: string) => {
    if (onChange) {
      onChange(optionValue)
    }
    setIsOpen(false)
    setSearchQuery('')
  }

  return (
    <div ref={containerRef} className={`relative ${fullWidth ? 'w-full' : ''}`}>
      {label && (
        <label className="block text-sm font-medium text-[var(--aethel-text-secondary)] mb-2">
          {label}
        </label>
      )}

      {/* Trigger Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        disabled={disabled}
        className={`
          ${sizeClasses[size]}
          w-full flex items-center justify-between gap-2
          bg-[color-mix(in_srgb,var(--aethel-surface-primary)_80%,transparent)]
          border ${error ? 'border-[color-mix(in_srgb,var(--aethel-error)_70%,transparent)]' : isOpen ? 'border-[var(--aethel-info)]' : 'border-[color-mix(in_srgb,var(--aethel-border-primary)_80%,transparent)]'}
          rounded-lg
          text-left
          transition-all duration-200 ease-out
          hover:border-[var(--aethel-border-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-primary)_90%,transparent)]
          focus:outline-none focus:border-[var(--aethel-info)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--aethel-info)_20%,transparent)]
          disabled:opacity-40 disabled:cursor-not-allowed
        `}
      >
        <span className={`flex items-center gap-2 truncate ${!selectedOption ? 'text-[var(--aethel-text-tertiary)]' : 'text-[var(--aethel-text-primary)]'}`}>
          {selectedOption?.icon}
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown
          className={`h-4 w-4 text-[var(--aethel-text-tertiary)] flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className={`
            absolute z-50 w-full mt-1.5
            bg-[var(--aethel-surface-primary)]/95 backdrop-blur-xl
            border border-[color-mix(in_srgb,var(--aethel-border-primary)_80%,transparent)]
            rounded-xl
            shadow-2xl shadow-black/40
            overflow-hidden
            animate-in fade-in slide-in-from-top-2 duration-150
          `}
        >
          {/* Search Input */}
          {searchable && (
            <div className="p-2 border-b border-[var(--aethel-border-primary)]/50">
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search..."
                className="
                  w-full px-3 py-2
                  bg-[var(--aethel-surface-secondary)]/80 border border-[var(--aethel-border-primary)]/50
                  rounded-lg
                  text-sm text-[var(--aethel-text-primary)] placeholder-[var(--aethel-text-quaternary)]
                  focus:outline-none focus:border-[var(--aethel-info)] focus:ring-1 focus:ring-[var(--aethel-info)]/30
                "
              />
            </div>
          )}

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto py-1.5">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-sm text-[var(--aethel-text-tertiary)] text-center">
                No opcao encontrada
              </div>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => !option.disabled && handleSelect(option.value)}
                  disabled={option.disabled}
                  className={`
                    w-full px-4 py-2.5 flex items-center justify-between gap-3
                    text-left text-sm
                    transition-colors duration-100
                    ${option.value === value
                      ? 'bg-[color-mix(in_srgb,var(--aethel-info)_15%,transparent)] text-[var(--aethel-info-light)]'
                      : 'text-[var(--aethel-text-secondary)] hover:bg-[var(--aethel-surface-secondary)]/80'
                    }
                    ${option.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {option.icon && (
                      <span className="flex-shrink-0 text-[var(--aethel-text-tertiary)]">
                        {option.icon}
                      </span>
                    )}
                    <div className="min-w-0">
                      <div className="truncate">{option.label}</div>
                      {option.description && (
                        <div className="text-xs text-[var(--aethel-text-tertiary)] truncate mt-0.5">
                          {option.description}
                        </div>
                      )}
                    </div>
                  </div>
                  {option.value === value && (
                    <Check className="h-4 w-4 flex-shrink-0 text-[var(--aethel-info)]" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <p className="mt-2 text-sm text-[var(--aethel-error)]">{error}</p>
      )}
    </div>
  )
}

export default Select
