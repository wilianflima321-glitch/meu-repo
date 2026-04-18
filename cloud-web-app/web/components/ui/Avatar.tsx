'use client'

import { type HTMLAttributes } from 'react'
import Image from 'next/image'

export interface AvatarProps extends HTMLAttributes<HTMLDivElement> {
  src?: string | null
  alt?: string
  name?: string
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl'
  status?: 'online' | 'offline' | 'busy' | 'away'
}

export interface AvatarImageProps extends HTMLAttributes<HTMLImageElement> {
  src?: string | null
  alt?: string
}

export function AvatarImage({ src, alt = 'Avatar', className = '', ...props }: AvatarImageProps) {
  if (!src) return null;
  return (
    <Image
      src={src}
      alt={alt}
      width={96}
      height={96}
      unoptimized
      className={`h-full w-full object-cover ${className}`}
      {...props}
    />
  );
}

export interface AvatarFallbackProps extends HTMLAttributes<HTMLDivElement> {
  children?: string
}

export function AvatarFallback({ children = '?', className = '', ...props }: AvatarFallbackProps) {
  return (
    <div
      className={`flex h-full w-full items-center justify-center text-sm font-medium text-[var(--aethel-text-primary)] ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

const sizeClasses: Record<string, { container: string; text: string; status: string }> = {
  xs: { container: 'w-6 h-6', text: 'text-xs', status: 'w-2 h-2' },
  sm: { container: 'w-8 h-8', text: 'text-sm', status: 'w-2.5 h-2.5' },
  md: { container: 'w-10 h-10', text: 'text-base', status: 'w-3 h-3' },
  lg: { container: 'w-12 h-12', text: 'text-lg', status: 'w-3.5 h-3.5' },
  xl: { container: 'w-16 h-16', text: 'text-xl', status: 'w-4 h-4' },
}

const statusColors: Record<string, string> = {
  online: 'bg-[var(--aethel-success)]',
  offline: 'bg-[var(--aethel-text-tertiary)]',
  busy: 'bg-[var(--aethel-error)]',
  away: 'bg-[var(--aethel-warning)]',
}

function getInitials(name: string): string {
  return name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}

function getColorFromName(name: string): string {
  const colors = [
    'bg-[var(--aethel-primary)]',
    'bg-[var(--aethel-info)]',
    'bg-[var(--aethel-secondary)]',
    'bg-[var(--aethel-accent)]',
    'bg-[var(--aethel-warning)]',
    'bg-[var(--aethel-warning-dark)]',
    'bg-[var(--aethel-success)]',
    'bg-[var(--aethel-primary-dark)]',
    'bg-[var(--aethel-accent)]',
    'bg-[var(--aethel-info)]',
  ]

  const hash = name.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0)
  return colors[hash % colors.length]
}

export function Avatar({
  src,
  alt = 'Avatar',
  name = 'User',
  size = 'md',
  status,
  className = '',
  ...props
}: AvatarProps) {
  const sizeConfig = sizeClasses[size]

  return (
    <div className={`relative inline-block ${className}`} {...props}>
      <div
        className={`${sizeConfig.container} rounded-full overflow-hidden flex items-center justify-center ring-2 ring-[var(--aethel-border-primary)] ${!src ? getColorFromName(name) : 'bg-[var(--aethel-surface-tertiary)]'}`}
      >
        {src ? (
          <Image
            src={src}
            alt={alt}
            fill
            className="object-cover"
          />
        ) : (
          <span className={`font-medium text-[var(--aethel-text-primary)] ${sizeConfig.text}`}>
            {getInitials(name)}
          </span>
        )}
      </div>

      {status && (
        <span
          className={`absolute bottom-0 right-0 ${sizeConfig.status} rounded-full ring-2 ring-[var(--aethel-border-secondary)] ${statusColors[status]}`}
        />
      )}
    </div>
  )
}

export interface AvatarGroupProps {
  avatars: Array<{ src?: string; name: string }>
  max?: number
  size?: AvatarProps['size']
}

export function AvatarGroup({ avatars, max = 4, size = 'sm' }: AvatarGroupProps) {
  const visible = avatars.slice(0, max)
  const remaining = avatars.length - max

  return (
    <div className="flex -space-x-2">
      {visible.map((avatar, i) => (
        <Avatar
          key={i}
          src={avatar.src}
          name={avatar.name}
          size={size}
          className="ring-2 ring-[var(--aethel-border-secondary)]"
        />
      ))}
      {remaining > 0 && (
        <div
          className={`${sizeClasses[size].container} rounded-full bg-[var(--aethel-surface-tertiary)] flex items-center justify-center ring-2 ring-[var(--aethel-border-secondary)] ${sizeClasses[size].text} text-[var(--aethel-text-secondary)] font-medium`}
        >
          +{remaining}
        </div>
      )}
    </div>
  )
}

export default Avatar

