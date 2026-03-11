/**
 * Aethel UI Component Library
 * 
 * Canonical exports for shared UI primitives, layout components, and 
 * accessibility utilities used across the Aethel product surface.
 */

// Layout
export { default as PublicHeader } from './PublicHeader'
export { default as PublicFooter } from './PublicFooter'

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
