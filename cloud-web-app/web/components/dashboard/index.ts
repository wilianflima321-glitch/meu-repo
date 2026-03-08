// Dashboard components
// Canonical shell exports are explicit to reduce accidental reuse of legacy shell primitives.

export { AethelDashboardSidebar as DashboardSidebarCanonical } from './AethelDashboardSidebar'

// Legacy shell exports kept only for compatibility with older refactors.
export { DashboardSidebar, type DashboardTab } from './DashboardSidebar'
export { DashboardSidebar as LegacyDashboardSidebar } from './DashboardSidebar'
export { DashboardLayout } from './DashboardLayout'
export { DashboardLayout as LegacyDashboardLayout } from './DashboardLayout'
export { NewProjectWizard } from './NewProjectWizard'
export { ProjectsDashboard } from './ProjectsDashboard'

// Tabs
export { OverviewTab } from './tabs/OverviewTab'
export { ProjectsTab, type Project } from './tabs/ProjectsTab'
export { AIChatTab, type ChatMessage, type ChatThread } from './tabs/AIChatTab'
export { BillingTab, type Plan } from './tabs/BillingTab'

// System Monitoring
export { 
    HealthDashboard, 
    type SystemHealth,
    type ComponentHealth,
    type HealthDashboardProps
} from './HealthDashboard';

// Render Progress
export {
    RenderProgress,
    RenderQueue,
    type RenderJob,
    type RenderJobStatus,
    type RenderFrame,
    type RenderProgressProps,
    type RenderQueueProps
} from './RenderProgress';

// Job Queue & Security Dashboards
export { JobQueueDashboard } from './JobQueueDashboard';
export { SecurityDashboard } from './SecurityDashboard';
