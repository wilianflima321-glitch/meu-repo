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
    bg-[color-mix(in_srgb,var(--aethel-surface-primary)_80%,transparent)] border border-[color-mix(in_srgb,var(--aethel-border-primary)_80%,transparent)] rounded-lg
    hover:border-[var(--aethel-border-secondary)] hover:bg-[color-mix(in_srgb,var(--aethel-surface-primary)_90%,transparent)]
    focus:bg-[var(--aethel-surface-primary)] focus:border-[var(--aethel-info)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--aethel-info)_20%,transparent)]
  `,
  filled: `
    bg-[color-mix(in_srgb,var(--aethel-surface-secondary)_90%,transparent)] border border-transparent rounded-lg
    hover:bg-[var(--aethel-surface-secondary)]
    focus:bg-[var(--aethel-surface-primary)] focus:border-[var(--aethel-info)] focus:ring-2 focus:ring-[color-mix(in_srgb,var(--aethel-info)_20%,transparent)]
  `,
  flushed: `
    bg-transparent border-0 border-b-2 border-[var(--aethel-border-primary)] rounded-none px-0
    hover:border-[var(--aethel-border-secondary)]
    focus:border-[var(--aethel-info)] focus:ring-0
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
      ? 'border-[color-mix(in_srgb,var(--aethel-error)_70%,transparent)] focus:border-[var(--aethel-error)] focus:ring-[color-mix(in_srgb,var(--aethel-error)_20%,transparent)] bg-[color-mix(in_srgb,var(--aethel-error)_8%,transparent)]'
      : hasSuccess
      ? 'border-[color-mix(in_srgb,var(--aethel-success)_70%,transparent)] focus:border-[var(--aethel-success)] focus:ring-[color-mix(in_srgb,var(--aethel-success)_20%,transparent)] bg-[color-mix(in_srgb,var(--aethel-success)_8%,transparent)]'
      : ''

    return (
      <div className={`${fullWidth ? 'w-full' : ''} group`}>
        {label && (
          <label
            htmlFor={inputId}
            className="flex items-center gap-2 text-sm font-medium text-[var(--aethel-text-secondary)] mb-2 transition-colors group-focus-within:text-[var(--aethel-text-primary)]"
          >
            {label}
            {required && <span className="text-[var(--aethel-error)] text-xs">*</span>}
            {optional && <span className="text-[var(--aethel-text-tertiary)] text-xs font-normal">(opcional)</span>}
          </label>
        )}
        
        <div className="relative">
          {icon && iconPosition === 'left' && (
            <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-[var(--aethel-text-tertiary)] transition-colors group-focus-within:text-[var(--aethel-text-tertiary)]">
              {icon}
            </div>
          )}
          
          <input
            ref={ref}
            id={inputId}
            disabled={disabled}
            className={`
              block w-full
              text-[var(--aethel-text-primary)] placeholder-[var(--aethel-text-quaternary)]
              transition-all duration-200 ease-out
              focus:outline-none
              disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:border-[var(--aethel-border-primary)]
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
            <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none text-[var(--aethel-text-tertiary)] transition-colors group-focus-within:text-[var(--aethel-text-tertiary)]">
              {icon}
            </div>
          )}
          
          {hasError && (
            <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
              <AlertCircle className="h-5 w-5 text-[var(--aethel-error)]" />
            </div>
          )}
          
          {hasSuccess && (
            <div className="absolute inset-y-0 right-0 pr-3.5 flex items-center pointer-events-none">
              <CheckCircle className="h-5 w-5 text-[var(--aethel-success)]" />
            </div>
          )}
        </div>
        
        {(error || success || hint) && (
          <div
            className={`mt-2 flex items-start gap-1.5 text-sm ${
              hasError ? 'text-[var(--aethel-error)]' : hasSuccess ? 'text-[var(--aethel-success)]' : 'text-[var(--aethel-text-tertiary)]'
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
