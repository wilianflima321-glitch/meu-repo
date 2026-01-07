'use client'

import { forwardRef, type ButtonHTMLAttributes, type ReactNode } from 'react'
import { Loader2 } from 'lucide-react'

export interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'danger' | 'success' | 'outline' | 'premium'
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl' | 'icon'
  loading?: boolean
  icon?: ReactNode
  iconPosition?: 'left' | 'right'
  fullWidth?: boolean
  rounded?: 'default' | 'full'
  glow?: boolean
}

const variantClasses: Record<string, string> = {
  primary: `
    bg-gradient-to-r from-indigo-600 to-indigo-500 
    text-white font-medium
    hover:from-indigo-500 hover:to-indigo-400
    active:from-indigo-700 active:to-indigo-600
    shadow-lg shadow-indigo-500/25 hover:shadow-indigo-500/40
    border border-indigo-500/20
  `,
  secondary: `
    bg-slate-800/80 text-slate-100 
    hover:bg-slate-700 
    active:bg-slate-800
    border border-slate-600/50 hover:border-slate-500/50
    shadow-md shadow-black/20
  `,
  ghost: `
    bg-transparent text-slate-300 
    hover:bg-slate-800/60 hover:text-white 
    active:bg-slate-800
    border border-transparent hover:border-slate-700/50
  `,
  danger: `
    bg-gradient-to-r from-red-600 to-red-500 
    text-white font-medium
    hover:from-red-500 hover:to-red-400
    active:from-red-700 active:to-red-600
    shadow-lg shadow-red-500/25 hover:shadow-red-500/40
    border border-red-500/20
  `,
  success: `
    bg-gradient-to-r from-emerald-600 to-emerald-500 
    text-white font-medium
    hover:from-emerald-500 hover:to-emerald-400
    active:from-emerald-700 active:to-emerald-600
    shadow-lg shadow-emerald-500/25 hover:shadow-emerald-500/40
    border border-emerald-500/20
  `,
  outline: `
    bg-transparent text-slate-200 
    hover:bg-slate-800/40 hover:text-white
    active:bg-slate-800/60
    border border-slate-600 hover:border-slate-500
  `,
  premium: `
    bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-500 
    text-white font-semibold
    hover:from-indigo-500 hover:via-purple-500 hover:to-pink-400
    active:from-indigo-700 active:via-purple-700 active:to-pink-600
    shadow-xl shadow-purple-500/30 hover:shadow-purple-500/50
    border border-white/10
  `,
}

const sizeClasses: Record<string, string> = {
  xs: 'px-2.5 py-1 text-xs gap-1 min-h-[28px]',
  sm: 'px-3 py-1.5 text-xs gap-1.5 min-h-[32px]',
  md: 'px-4 py-2 text-sm gap-2 min-h-[38px]',
  lg: 'px-5 py-2.5 text-base gap-2 min-h-[44px]',
  xl: 'px-6 py-3 text-base gap-2.5 min-h-[52px]',
  icon: 'p-2 aspect-square min-h-[38px]',
}

const iconSizes: Record<string, string> = {
  xs: 'h-3 w-3',
  sm: 'h-3.5 w-3.5',
  md: 'h-4 w-4',
  lg: 'h-5 w-5',
  xl: 'h-5 w-5',
  icon: 'h-4 w-4',
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
      rounded = 'default',
      glow = false,
      disabled,
      className = '',
      ...props
    },
    ref
  ) => {
    const isDisabled = disabled || loading
    const roundedClass = rounded === 'full' ? 'rounded-full' : 'rounded-lg'

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        className={`
          inline-flex items-center justify-center 
          ${roundedClass}
          transition-all duration-200 ease-out
          transform active:scale-[0.98]
          focus:outline-none focus-visible:ring-2 focus-visible:ring-indigo-500 focus-visible:ring-offset-2 focus-visible:ring-offset-slate-900
          disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none disabled:shadow-none
          ${variantClasses[variant]}
          ${sizeClasses[size]}
          ${fullWidth ? 'w-full' : ''}
          ${glow && !isDisabled ? 'hover:shadow-[0_0_20px_rgba(99,102,241,0.4)]' : ''}
          ${className}
        `}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className={`animate-spin ${iconSizes[size]}`} />
            {size !== 'icon' && <span className="ml-1">Aguarde...</span>}
          </>
        ) : (
          <>
            {icon && iconPosition === 'left' && (
              <span className={`flex-shrink-0 ${iconSizes[size]}`}>{icon}</span>
            )}
            {children}
            {icon && iconPosition === 'right' && (
              <span className={`flex-shrink-0 ${iconSizes[size]}`}>{icon}</span>
            )}
          </>
        )}
      </button>
    )
  }
)

Button.displayName = 'Button'

export default Button
