// UI Components - Professional Design System v2.0
// Aethel Platform - Enterprise Grade UI

// Core Components
export { Button, type ButtonProps } from './Button'
export { Input, type InputProps } from './Input'
export { Card, CardHeader, CardFooter, CardContent, type CardProps } from './Card'
export { Textarea, type TextareaProps } from './Textarea'

// Selection & Dropdown
export { Select, type SelectProps, type SelectOption } from './Select'
export { Dropdown, DropdownButton, type DropdownProps, type DropdownItem } from './Dropdown'

// Navigation & Layout
export { Tabs, TabList, TabTrigger, TabContent, type TabsProps } from './Tabs'
export { ScrollArea, type ScrollAreaProps } from './ScrollArea'
export { VirtualList, type VirtualListProps } from './VirtualList'

// Feedback
export { ToastProvider, useToast, type Toast, type ToastType } from './Toast'
export { Modal, ConfirmModal, type ModalProps, type ConfirmModalProps } from './Modal'
export { Tooltip, type TooltipProps } from './Tooltip'

// Loading States
export { Skeleton, SkeletonCard, SkeletonTable, SkeletonList, type SkeletonProps } from './Skeleton'
export { LoadingScreen, PageLoader, InlineLoader, DotsLoader, PulseLoader } from './LoadingScreen'

// Advanced Skeleton Loading (UX Strategy)
export {
  SkeletonBox,
  SkeletonText,
  SkeletonAvatar,
  SkeletonAssetCard,
  SkeletonContentBrowser,
  SkeletonProjectCard,
  SkeletonDashboard,
  SkeletonChatMessage,
  SkeletonChatPanel,
  SkeletonEditorPanel,
  SkeletonHierarchyTree,
  SkeletonPropertiesPanel,
  SkeletonIDELayout,
  useSkeleton,
  WithSkeleton,
} from './SkeletonLoading'

// Empty States
export { EmptyState, EmptyProjects, EmptySearch, EmptyChat, EmptyWorkflows, type EmptyStateProps } from './EmptyState'

// Data Display
export { Badge, PlanBadge, StatusBadge, type BadgeProps } from './Badge'
export { Avatar, AvatarGroup, type AvatarProps, type AvatarGroupProps } from './Avatar'

// Design System (full component library)
export * from './DesignSystem'

