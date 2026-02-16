'use client'

import { type ReactNode, type HTMLAttributes } from 'react'

export interface CardProps extends HTMLAttributes<HTMLDivElement> {
  variant?: 'default' | 'elevated' | 'bordered' | 'gradient' | 'glass' | 'glow'
  padding?: 'none' | 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  hoverable?: boolean
  rounded?: 'md' | 'lg' | 'xl' | '2xl'
  children: ReactNode
}

const variantClasses: Record<string, string> = {
  default: `
    bg-slate-900/70 
    border border-slate-800/80 
    shadow-lg shadow-black/10
  `,
  elevated: `
    bg-gradient-to-b from-slate-800/90 to-slate-900/90 
    shadow-2xl shadow-black/30 
    border border-slate-700/40
  `,
  bordered: `
    bg-slate-900/40 
    border-2 border-slate-700/60 
    hover:border-slate-600/80
  `,
  gradient: `
    bg-gradient-to-br from-slate-800/80 via-slate-850/80 to-slate-900/90 
    border border-slate-700/50
    shadow-xl shadow-black/20
  `,
  glass: `
    bg-slate-900/40 
    backdrop-blur-xl backdrop-saturate-150 
    border border-slate-700/30
    shadow-2xl shadow-black/20
  `,
  glow: `
    bg-gradient-to-b from-slate-800/90 to-slate-900/90 
    border border-sky-500/20
    shadow-[0_0_30px_rgba(99,102,241,0.15)]
    hover:shadow-[0_0_40px_rgba(99,102,241,0.25)]
    hover:border-sky-500/40
  `,
}

const paddingClasses: Record<string, string> = {
  none: '',
  xs: 'p-3',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
  xl: 'p-10',
}

const roundedClasses: Record<string, string> = {
  md: 'rounded-md',
  lg: 'rounded-lg',
  xl: 'rounded-xl',
  '2xl': 'rounded-2xl',
}

export function Card({
  variant = 'default',
  padding = 'md',
  hoverable = false,
  rounded = 'xl',
  children,
  className = '',
  ...props
}: CardProps) {
  return (
    <div
      className={`
        ${roundedClasses[rounded]}
        transition-all duration-300 ease-out
        ${variantClasses[variant]}
        ${paddingClasses[padding]}
        ${hoverable ? `
          hover:translate-y-[-2px] 
          hover:shadow-2xl hover:shadow-sky-500/10 
          hover:border-sky-500/30 
          cursor-pointer
          active:translate-y-0 active:shadow-xl
        ` : ''}
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  )
}

export interface CardHeaderProps extends HTMLAttributes<HTMLDivElement> {
  title?: string
  description?: string
  action?: ReactNode
  icon?: ReactNode
  size?: 'sm' | 'md' | 'lg'
  children?: ReactNode
}

const headerSizes = {
  sm: { title: 'text-base font-semibold', desc: 'text-xs' },
  md: { title: 'text-lg font-semibold', desc: 'text-sm' },
  lg: { title: 'text-xl font-bold', desc: 'text-sm' },
}

export function CardHeader({ 
  title, 
  description, 
  action, 
  icon,
  size = 'md',
  children,
  className = '', 
  ...props 
}: CardHeaderProps) {
  return (
    <div className={`flex items-start justify-between gap-4 mb-5 ${className}`} {...props}>
      {children ? (
        children
      ) : (
        <>
          <div className="flex items-start gap-3 min-w-0">
            {icon && (
              <div className="flex-shrink-0 p-2 rounded-lg bg-sky-500/10 text-sky-400">
                {icon}
              </div>
            )}
            <div className="min-w-0">
              {title && (
                <h3 className={`${headerSizes[size].title} text-slate-100 leading-tight`}>
                  {title}
                </h3>
              )}
              {description && (
                <p className={`mt-1 ${headerSizes[size].desc} text-slate-400 leading-relaxed`}>
                  {description}
                </p>
              )}
            </div>
          </div>
          {action && <div className="flex-shrink-0">{action}</div>}
        </>
      )}
    </div>
  )
}

export function CardTitle({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <h3 className={`text-lg font-semibold text-slate-100 ${className}`}>{children}</h3>;
}

export function CardDescription({ children, className = '' }: { children: ReactNode; className?: string }) {
  return <p className={`text-sm text-slate-400 ${className}`}>{children}</p>;
}

export interface CardFooterProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  justify?: 'start' | 'end' | 'between' | 'center'
}

const justifyClasses = {
  start: 'justify-start',
  end: 'justify-end',
  between: 'justify-between',
  center: 'justify-center',
}

export function CardFooter({ 
  children, 
  justify = 'end',
  className = '', 
  ...props 
}: CardFooterProps) {
  return (
    <div
      className={`
        mt-6 pt-5 
        border-t border-slate-800/80 
        flex items-center ${justifyClasses[justify]} gap-3 
        ${className}
      `}
      {...props}
    >
      {children}
    </div>
  )
}

export interface CardContentProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
}

export function CardContent({ children, className = '', ...props }: CardContentProps) {
  return (
    <div className={`text-slate-300 ${className}`} {...props}>
      {children}
    </div>
  )
}

export default Card
