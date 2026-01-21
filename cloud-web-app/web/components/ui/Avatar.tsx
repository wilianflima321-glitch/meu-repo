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
  return <img src={src} alt={alt} className={`h-full w-full object-cover ${className}`} {...props} />;
}

export interface AvatarFallbackProps extends HTMLAttributes<HTMLDivElement> {
  children?: string
}

export function AvatarFallback({ children = '?', className = '', ...props }: AvatarFallbackProps) {
  return (
    <div
      className={`flex h-full w-full items-center justify-center text-sm font-medium text-white ${className}`}
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
  online: 'bg-emerald-500',
  offline: 'bg-slate-500',
  busy: 'bg-red-500',
  away: 'bg-amber-500',
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
    'bg-indigo-600',
    'bg-purple-600',
    'bg-pink-600',
    'bg-rose-600',
    'bg-orange-600',
    'bg-amber-600',
    'bg-emerald-600',
    'bg-teal-600',
    'bg-cyan-600',
    'bg-blue-600',
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
        className={`
          ${sizeConfig.container}
          rounded-full overflow-hidden
          flex items-center justify-center
          ring-2 ring-slate-700
          ${!src ? getColorFromName(name) : 'bg-slate-700'}
        `}
      >
        {src ? (
          <Image
            src={src}
            alt={alt}
            fill
            className="object-cover"
          />
        ) : (
          <span className={`font-medium text-white ${sizeConfig.text}`}>
            {getInitials(name)}
          </span>
        )}
      </div>
      
      {status && (
        <span
          className={`
            absolute bottom-0 right-0
            ${sizeConfig.status}
            rounded-full
            ring-2 ring-slate-900
            ${statusColors[status]}
          `}
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
          className="ring-2 ring-slate-900"
        />
      ))}
      {remaining > 0 && (
        <div
          className={`
            ${sizeClasses[size].container}
            rounded-full bg-slate-700
            flex items-center justify-center
            ring-2 ring-slate-900
            ${sizeClasses[size].text}
            text-slate-300 font-medium
          `}
        >
          +{remaining}
        </div>
      )}
    </div>
  )
}

export default Avatar
