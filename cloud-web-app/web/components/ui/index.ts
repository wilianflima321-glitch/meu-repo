/**
 * Aethel UI Component Library
 * 
 * Canonical exports for shared UI primitives, layout components, and 
 * accessibility utilities used across the Aethel product surface.
 */

// Layout
export { default as PublicHeader } from './PublicHeader'
export { default as PublicFooter } from './PublicFooter'

// Core controls
export { Button } from './Button'
export type { ButtonProps } from './Button'
export { Input } from './Input'
export type { InputProps } from './Input'
export { Textarea } from './Textarea'
export type { TextareaProps } from './Textarea'

// Data display
export { Card, CardHeader, CardTitle, CardDescription, CardFooter } from './Card'
export type { CardProps, CardHeaderProps, CardFooterProps } from './Card'
export { Badge, PlanBadge } from './Badge'
export type { BadgeProps } from './Badge'
export { Avatar, AvatarGroup, AvatarImage, AvatarFallback } from './Avatar'
export type { AvatarProps, AvatarGroupProps, AvatarImageProps, AvatarFallbackProps } from './Avatar'
export { Dropdown, DropdownButton } from './Dropdown'
export type { DropdownProps, DropdownItem } from './Dropdown'

// Primitives
export {
  EmptyState,
  Skeleton,
  CardSkeleton,
  ListSkeleton,
  StatsSkeleton,
  ProgressStepper,
  Toast,
  StatusBadge,
  Kbd,
} from './UXPrimitives'

// Empty/skeleton specialized helpers
export { EmptyProjects, EmptyChat } from './EmptyState'
export { SkeletonCard } from './Skeleton'

// Toast System
export { ToastProvider, useToast } from './ToastProvider'

// Accessibility
export {
  SkipToContent,
  FocusTrap,
  LiveRegion,
  VisuallyHidden,
  IconButton,
} from './Accessibility'
