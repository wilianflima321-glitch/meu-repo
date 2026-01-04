'use client'

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'outline'
  size?: 'sm' | 'md' | 'lg' | 'icon'
  loading?: boolean
  icon?: ReactNode
  iconPosition?: 'left' | 'right'
  fullWidth?: boolean
}

const variantClasses: Record<string, string> = {
  primary: 'bg-indigo-600 text-white hover:bg-indigo-700 focus:ring-indigo-500 border-transparent',
  secondary: 'bg-slate-700 text-slate-100 hover:bg-slate-600 focus:ring-slate-500 border-slate-600',
  ghost: 'bg-transparent text-slate-300 hover:bg-slate-800 hover:text-white focus:ring-slate-500 border-transparent',
  danger: 'bg-red-600 text-white hover:bg-red-700 focus:ring-red-500 border-transparent',
  success: 'bg-emerald-600 text-white hover:bg-emerald-700 focus:ring-emerald-500 border-transparent',
  outline: 'bg-transparent text-slate-300 hover:bg-slate-800/50 focus:ring-slate-500 border-slate-600 hover:border-slate-500',
}

const sizeClasses: Record<string, string> = {
  sm: 'px-3 py-1.5 text-xs gap-1.5',
  md: 'px-4 py-2 text-sm gap-2',
  lg: 'px-6 py-3 text-base gap-2.5',
  icon: 'p-2 aspect-square',
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      children,
      variant = 'primary',
      size = 'md',
      loading = false,
      icon,
      iconPosition = 'left',
      fullWidth = false,
      disabled,
      className = '',
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={`
          inline-flex items-center justify-center font-medium rounded-lg
          border transition-all duration-200 ease-out
          focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-slate-900
          disabled:opacity-50 disabled:cursor-not-allowed
          ${variantClasses[variant]}
          ${sizeClasses[size]}
          ${fullWidth ? 'w-full' : ''}
          ${className}
        `}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="animate-spin h-4 w-4" />
            <span>Carregando...</span>
          </>
        ) : (
          <>
            {icon && iconPosition === 'left' && <span className="flex-shrink-0">{icon}</span>}
            {children}
            {icon && iconPosition === 'right' && <span className="flex-shrink-0">{icon}</span>}
          </>
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'

export default Button
