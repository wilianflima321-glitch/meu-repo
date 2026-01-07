'use client'

import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'
import { AlertCircle, CheckCircle, Info } from 'lucide-react'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  success?: string
  hint?: string
  icon?: ReactNode
  iconPosition?: 'left' | 'right'
  fullWidth?: boolean
  variant?: 'default' | 'filled' | 'flushed'
  inputSize?: 'sm' | 'md' | 'lg'
  required?: boolean
  optional?: boolean
}

const sizeClasses = {
  sm: 'px-3 py-2 text-sm min-h-[36px]',
  md: 'px-4 py-2.5 text-sm min-h-[42px]',
  lg: 'px-4 py-3 text-base min-h-[48px]',
}

const variantClasses = {
  default: `
    bg-slate-900/80 border border-slate-700/80 rounded-lg
    hover:border-slate-600 hover:bg-slate-900/90
    focus:bg-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20
  `,
  filled: `
    bg-slate-800/90 border border-transparent rounded-lg
    hover:bg-slate-800
    focus:bg-slate-900 focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500/20
  `,
  flushed: `
    bg-transparent border-0 border-b-2 border-slate-700 rounded-none px-0
    hover:border-slate-500
    focus:border-indigo-500 focus:ring-0
  `,
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  (
    {
      label,
      error,
      success,
      hint,
      icon,
      iconPosition = 'left',
      fullWidth = true,
      variant = 'default',
      inputSize = 'md',
      required = false,
      optional = false,
      className = '',
      id,
      disabled,
      ...props
    },
    ref
  ) => {
    const inputId = id || `input-${Math.random().toString(36).slice(2, 9)}`
    const hasError = Boolean(error)
    const hasSuccess = Boolean(success) && !hasError

    const stateClasses = hasError
      ? 'border-red-500/70 focus:border-red-500 focus:ring-red-500/20 bg-red-500/5'
      : hasSuccess
      ? 'border-emerald-500/70 focus:border-emerald-500 focus:ring-emerald-500/20 bg-emerald-500/5'
      : ''

    return (
      <div className={`${fullWidth ? 'w-full' : ''} group`}>
        {label && (
          <label
            htmlFor={inputId}
            className="flex items-center gap-2 text-sm font-medium text-slate-300 mb-2 transition-colors group-focus-within:text-slate-100"
          >
            {label}
            {required && <span className="text-red-400 text-xs">*</span>}
            {optional && <span className="text-slate-500 text-xs font-normal">(opcional)</span>}
          </label>
        )}
        
        <div className="relative">
          {icon && iconPosition === 'left' && (
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-slate-500 transition-colors group-focus-within:text-slate-400">
              {icon}
            </div>
          )}
          
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            className={`
              block w-full
              text-slate-100 placeholder-slate-500
              transition-all duration-200 ease-out
              focus:outline-none
              disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-slate-700
              ${variantClasses[variant]}
              ${sizeClasses[inputSize]}
              ${stateClasses}
              ${icon && iconPosition === 'left' ? 'pl-11' : ''}
              ${icon && iconPosition === 'right' || hasError || hasSuccess ? 'pr-11' : ''}
              ${className}
            `}
            {...props}
          />
          
          {icon && iconPosition === 'right' && !hasError && !hasSuccess && (
            <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-slate-500 transition-colors group-focus-within:text-slate-400">
              {icon}
            </div>
          )}
          
          {hasError && (
            <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
              <AlertCircle className="h-5 w-5 text-red-400" />
            </div>
          )}
          
          {hasSuccess && (
            <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
              <CheckCircle className="h-5 w-5 text-emerald-400" />
            </div>
          )}
        </div>
        
        {(error || success || hint) && (
          <div
            className={`mt-2 flex items-start gap-1.5 text-sm ${
              hasError ? 'text-red-400' : hasSuccess ? 'text-emerald-400' : 'text-slate-500'
            }`}
          >
            {hint && !hasError && !hasSuccess && (
              <Info className="h-4 w-4 flex-shrink-0 mt-0.5" />
            )}
            <span>{error || success || hint}</span>
          </div>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export default Input
