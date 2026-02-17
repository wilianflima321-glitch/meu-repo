'use client'

import { createContext, useContext, useState, type ReactNode } from 'react'

interface TabsContextType {
  activeTab: string
  setActiveTab: (tab: string) => void
}

const TabsContext = createContext<TabsContextType | undefined>(undefined)

function useTabsContext() {
  const context = useContext(TabsContext)
  if (!context) {
    throw new Error('Tab components must be used within a Tabs provider')
  }
  return context
}

/* ============================================
   Tabs Root Component
============================================ */
export interface TabsProps {
  defaultValue?: string
  value?: string
  onChange?: (value: string) => void
  onValueChange?: (value: string) => void
  children: ReactNode
  className?: string
}

export function Tabs({ 
  defaultValue, 
  value, 
  onChange, 
  onValueChange,
  children, 
  className = '' 
}: TabsProps) {
  const [internalValue, setInternalValue] = useState(defaultValue ?? value ?? '')
  
  const activeTab = value ?? internalValue
  const setActiveTab = (tab: string) => {
    setInternalValue(tab)
    onChange?.(tab)
    onValueChange?.(tab)
  }

  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={className}>
        {children}
      </div>
    </TabsContext.Provider>
  )
}

/* ============================================
   Tab List Component
============================================ */
export interface TabListProps {
  children: ReactNode
  variant?: 'default' | 'pills' | 'underline' | 'enclosed'
  size?: 'sm' | 'md' | 'lg'
  fullWidth?: boolean
  className?: string
}

const variantClasses = {
  default: `
    bg-slate-900/60 p-1 rounded-xl 
    border border-slate-800/80
  `,
  pills: `
    bg-transparent gap-2
  `,
  underline: `
    bg-transparent border-b border-slate-800 pb-0
  `,
  enclosed: `
    bg-slate-900/40 p-1.5 rounded-xl gap-1
  `,
}

export function TabList({ 
  children, 
  variant = 'default',
  size = 'md',
  fullWidth = false,
  className = '' 
}: TabListProps) {
  return (
    <div 
      role="tablist"
      className={`
        flex items-center
        ${variantClasses[variant]}
        ${fullWidth ? 'w-full' : 'w-fit'}
        ${className}
      `}
      data-variant={variant}
      data-size={size}
    >
      {children}
    </div>
  )
}

/* ============================================
   Tab Trigger Component
============================================ */
export interface TabTriggerProps {
  value: string
  children: ReactNode
  icon?: ReactNode
  badge?: string | number
  disabled?: boolean
  className?: string
}

const triggerSizeClasses = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-5 py-2.5 text-base gap-2',
}

export function TabTrigger({ 
  value, 
  children, 
  icon,
  badge,
  disabled = false,
  className = '' 
}: TabTriggerProps) {
  const { activeTab, setActiveTab } = useTabsContext()
  const isActive = activeTab === value

  // Get size from parent TabList via data attribute (default to 'md')
  const size = 'md'

  return (
    <button
      role="tab"
      aria-selected={isActive}
      aria-controls={`panel-${value}`}
      disabled={disabled}
      onClick={() => !disabled && setActiveTab(value)}
      className={`
        ${triggerSizeClasses[size]}
        relative flex items-center justify-center gap-2
        font-medium rounded-lg
        transition-all duration-200 ease-out
        focus:outline-none focus-visible:ring-2 focus-visible:ring-sky-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900
        disabled:opacity-40 disabled:cursor-not-allowed
        ${isActive 
          ? `
            bg-gradient-to-b from-slate-700/90 to-slate-800/90
            text-white
            shadow-lg shadow-black/20
            border border-slate-600/50
          ` 
          : `
            bg-transparent
            text-slate-400 hover:text-slate-200
            hover:bg-slate-800/40
            border border-transparent
          `
        }
        ${className}
      `}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span>{children}</span>
      {badge !== undefined && (
        <span 
          className={`
            px-1.5 py-0.5 text-[10px] font-semibold rounded-full
            ${isActive 
              ? 'bg-sky-500/20 text-sky-300' 
              : 'bg-slate-700/80 text-slate-400'
            }
          `}
        >
          {badge}
        </span>
      )}
    </button>
  )
}

/* ============================================
   Tab Content Component
============================================ */
export interface TabContentProps {
  value: string
  children: ReactNode
  className?: string
  forceMount?: boolean
}

export function TabContent({ 
  value, 
  children, 
  className = '',
  forceMount = false 
}: TabContentProps) {
  const { activeTab } = useTabsContext()
  const isActive = activeTab === value

  if (!isActive && !forceMount) return null

  return (
    <div
      role="tabpanel"
      id={`panel-${value}`}
      aria-labelledby={`tab-${value}`}
      hidden={!isActive && forceMount}
      className={`
        mt-4
        animate-in fade-in-0 slide-in-from-bottom-2 duration-200
        ${className}
      `}
    >
      {children}
    </div>
  )
}

export default Tabs
