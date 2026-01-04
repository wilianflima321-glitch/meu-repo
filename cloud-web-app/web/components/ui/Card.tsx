'use client'

import { type ReactNode, type HTMLAttributes } from 'react'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'bordered' | 'gradient'
  padding?: 'none' | 'sm' | 'md' | 'lg'
  hoverable?: boolean
  children: ReactNode
}

const variantClasses: Record<string, string> = {
  default: 'bg-slate-800/50 border border-slate-700/50',
  elevated: 'bg-slate-800 shadow-xl shadow-black/20 border border-slate-700/30',
  bordered: 'bg-transparent border-2 border-slate-600',
  gradient: 'bg-gradient-to-br from-slate-800 to-slate-900 border border-slate-700/50',
}

const paddingClasses: Record<string, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
}

export function Card({
  variant = 'default',
  padding = 'md',
  hoverable = false,
  children,
  className = '',
  ...props
}: CardProps) {
  return (
    <div
      className={`
        rounded-xl transition-all duration-300
        ${variantClasses[variant]}
        ${paddingClasses[padding]}
        ${hoverable ? 'hover:border-indigo-500/50 hover:shadow-lg hover:shadow-indigo-500/10 cursor-pointer' : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  )
}

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title: string
  description?: string
  action?: ReactNode
}

export function CardHeader({ title, description, action, className = '', ...props }: CardHeaderProps) {
  return (
    <div className={`flex items-start justify-between mb-4 ${className}`} {...props}>
      <div>
        <h3 className="text-lg font-semibold text-slate-100">{title}</h3>
        {description && <p className="mt-1 text-sm text-slate-400">{description}</p>}
      </div>
      {action && <div className="flex-shrink-0 ml-4">{action}</div>}
    </div>
  )
}

export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export function CardFooter({ children, className = '', ...props }: CardFooterProps) {
  return (
    <div
      className={`mt-6 pt-4 border-t border-slate-700/50 flex items-center justify-end gap-3 ${className}`}
      {...props}
    >
      {children}
    </div>
  )
}

export default Card
