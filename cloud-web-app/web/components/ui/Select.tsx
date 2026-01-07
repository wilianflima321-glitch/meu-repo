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
        <label className="block text-sm font-medium text-slate-300 mb-2">
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
          bg-slate-900/80 
          border ${error ? 'border-red-500/70' : isOpen ? 'border-indigo-500' : 'border-slate-700/80'}
          rounded-lg
          text-left
          transition-all duration-200 ease-out
          hover:border-slate-600 hover:bg-slate-900/90
          focus:outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20
          disabled:opacity-40 disabled:cursor-not-allowed
        `}
      >
        <span className={`flex items-center gap-2 truncate ${!selectedOption ? 'text-slate-500' : 'text-slate-100'}`}>
          {selectedOption?.icon}
          {selectedOption?.label || placeholder}
        </span>
        <ChevronDown 
          className={`h-4 w-4 text-slate-400 flex-shrink-0 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`} 
        />
      </button>

      {/* Dropdown */}
      {isOpen && (
        <div
          className={`
            absolute z-50 w-full mt-1.5
            bg-slate-900/95 backdrop-blur-xl
            border border-slate-700/80
            rounded-xl
            shadow-2xl shadow-black/40
            overflow-hidden
            animate-in fade-in slide-in-from-top-2 duration-150
          `}
        >
          {/* Search Input */}
          {searchable && (
            <div className="p-2 border-b border-slate-700/50">
              <input
                ref={inputRef}
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar..."
                className="
                  w-full px-3 py-2
                  bg-slate-800/80 border border-slate-700/50
                  rounded-lg
                  text-sm text-slate-100 placeholder-slate-500
                  focus:outline-none focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500/30
                "
              />
            </div>
          )}

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto py-1.5">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-sm text-slate-500 text-center">
                Nenhuma opção encontrada
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
                      ? 'bg-indigo-500/15 text-indigo-300' 
                      : 'text-slate-200 hover:bg-slate-800/80'
                    }
                    ${option.disabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}
                  `}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {option.icon && (
                      <span className="flex-shrink-0 text-slate-400">
                        {option.icon}
                      </span>
                    )}
                    <div className="min-w-0">
                      <div className="truncate">{option.label}</div>
                      {option.description && (
                        <div className="text-xs text-slate-500 truncate mt-0.5">
                          {option.description}
                        </div>
                      )}
                    </div>
                  </div>
                  {option.value === value && (
                    <Check className="h-4 w-4 flex-shrink-0 text-indigo-400" />
                  )}
                </button>
              ))
            )}
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <p className="mt-2 text-sm text-red-400">{error}</p>
      )}
    </div>
  )
}

export default Select
