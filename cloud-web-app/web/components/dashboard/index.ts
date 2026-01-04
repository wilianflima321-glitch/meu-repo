// Dashboard Components - Refactored from monolithic AethelDashboard.tsx
// Professional modular architecture

export { DashboardSidebar, type DashboardTab } from './DashboardSidebar'
export { DashboardLayout } from './DashboardLayout'

// Tabs
export { OverviewTab } from './tabs/OverviewTab'
export { ProjectsTab, type Project } from './tabs/ProjectsTab'
export { AIChatTab, type ChatMessage, type ChatThread } from './tabs/AIChatTab'
export { BillingTab, type Plan } from './tabs/BillingTab'
