// Dashboard components
// Canonical shell exports are explicit to reduce accidental reuse of legacy shell primitives.

export { AethelDashboardSidebar as DashboardSidebarCanonical } from './AethelDashboardSidebar'

export { NewProjectWizard } from './NewProjectWizard'
export { ProjectsDashboard } from './ProjectsDashboard'

// Tabs
export { OverviewTab } from './tabs/OverviewTab'
export { ProjectsTab, type Project } from './tabs/ProjectsTab'

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
