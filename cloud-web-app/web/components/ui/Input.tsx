'use client'

import { forwardRef, type InputHTMLAttributes, type ReactNode } from 'react'
import { AlertCircle, CheckCircle } from 'lucide-react'

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  label?: string
  error?: string
  success?: string
  hint?: string
  icon?: ReactNode
  iconPosition?: 'left' | 'right'
  fullWidth?: boolean
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
      className = '',
      id,
      ...props
    },
    ref
  ) => {
    const inputId = id || `input-${Math.random().toString(36).slice(2, 9)}`
    const hasError = Boolean(error)
    const hasSuccess = Boolean(success) && !hasError

    const borderColor = hasError
      ? 'border-red-500 focus:border-red-500 focus:ring-red-500'
      : hasSuccess
      ? 'border-emerald-500 focus:border-emerald-500 focus:ring-emerald-500'
      : 'border-slate-600 focus:border-indigo-500 focus:ring-indigo-500'

    return (
      <div className={`${fullWidth ? 'w-full' : ''}`}>
        {label && (
          <label
            htmlFor={inputId}
            className="block text-sm font-medium text-slate-200 mb-1.5"
          >
            {label}
          </label>
        )}
        
        <div className="relative">
          {icon && iconPosition === 'left' && (
            <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
              {icon}
            </div>
          )}
          
          <input
            ref={ref}
            id={inputId}
            className={`
              block w-full px-4 py-2.5 
              bg-slate-800 border rounded-lg
              text-slate-100 placeholder-slate-500
              transition-all duration-200
              focus:outline-none focus:ring-2 focus:ring-offset-0
              disabled:opacity-50 disabled:cursor-not-allowed
              ${borderColor}
              ${icon && iconPosition === 'left' ? 'pl-10' : ''}
              ${icon && iconPosition === 'right' ? 'pr-10' : ''}
              ${className}
            `}
            {...props}
          />
          
          {icon && iconPosition === 'right' && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-slate-400">
              {icon}
            </div>
          )}
          
          {hasError && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <AlertCircle className="h-5 w-5 text-red-500" />
            </div>
          )}
          
          {hasSuccess && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <CheckCircle className="h-5 w-5 text-emerald-500" />
            </div>
          )}
        </div>
        
        {(error || success || hint) && (
          <p
            className={`mt-1.5 text-sm ${
              hasError ? 'text-red-400' : hasSuccess ? 'text-emerald-400' : 'text-slate-400'
            }`}
          >
            {error || success || hint}
          </p>
        )}
      </div>
    )
  }
)

Input.displayName = 'Input'

export default Input
