// Workspace, Studio, Dashboard, and Evidence UX checks for qa:ux-market-standard.

export const WORKSPACE_UX_CHECKS = [
  {
    id: 'preview-canonical-fragmentation',
    description:
      'Preview and Viewport must route through CanonicalPreviewSurface with scene/canvas/runtime as one product grammar, not raw parallel viewport shells.',
    files: [
      'components/preview/CanonicalPreviewSurface.tsx',
      'components/canvas/UnifiedViewport.tsx',
      'components/preview/SceneViewportSurface.tsx',
      'components/preview/CanvasViewportSurface.tsx',
      'components/preview/previewSurfaceRegistry.ts',
    ],
    combined: true,
    test: (content, { read } = {}) => {
      const canonical = read('components/preview/CanonicalPreviewSurface.tsx') ?? ''
      const required = [
        "import UnifiedViewport from '@/components/canvas/UnifiedViewport'",
        '<UnifiedViewport',
        "dynamic(() => import('@/components/preview/SceneViewportSurface')",
        "dynamic(() => import('@/components/preview/CanvasViewportSurface')",
        'data-canonical-preview-surface="scene"',
        'data-canonical-preview-surface="canvas"',
        'data-canonical-preview-surface="runtime"',
        'SceneViewportOutliner',
        'SceneViewportInspector',
        'TimelineOverlay',
        'PREVIEW_SURFACE_REGISTRY',
        'hiddenActions',
        'contextual-drawer',
      ]
      const forbiddenInCanonical = [
        'NexusCanvasV2',
        'AethelViewport3D',
      ]
      return (
        required.filter((token) => !content.includes(token)).length +
        forbiddenInCanonical.filter((token) => canonical.includes(token)).length
      )
    },
    limit: 0,
  },
  {
    id: 'dashboard-sidebar-fragmentation',
    description:
      'Dashboard may expose one canonical sidebar only; legacy/enhanced sidebars must not re-enter the shell.',
    files: [
      'components/dashboard/DashboardShell.tsx',
      'components/dashboard/AethelDashboardSidebar.tsx',
    ],
    combined: true,
    test: (content, { read } = {}) => {
      const shell = read('components/dashboard/DashboardShell.tsx') ?? ''
      const required = [
        'AethelDashboardSidebar',
        'DashboardMainContent',
        'MobileBottomNav',
      ]
      const forbidden = [
        'EnhancedDashboardSidebar',
        "from './DashboardSidebar'",
        '<DashboardSidebar',
      ]
      return required.filter((token) => !content.includes(token)).length + forbidden.filter((token) => shell.includes(token)).length
    },
    limit: 0,
  },
  {
    id: 'ide-workbench-region-fragmentation',
    description:
      'IDE must converge on ModernIDEShell regions: sidebar, editor, preview, AI sidecar, and terminal; each region needs a boundary and no parallel shell grammar.',
    files: [
      'components/ide/modern-shell/types.ts',
      'components/ide/modern-shell/ModernIDEShellPanels.tsx',
      'components/ide/ModernIDEShell.tsx',
    ],
    combined: true,
    test: (content) => {
      const required = [
        'WORKBENCH_REGION_REGISTRY',
        "'sidebar'",
        "'editor'",
        "'preview'",
        "'chat'",
        "'terminal'",
        'getWorkbenchRegionDefinition',
        'PanelErrorBoundary',
        'EditorErrorBoundary',
        'RuntimeFailureSmokeFault',
        'data-modern-ide-shell="true"',
      ]
      const forbidden = [
        'IDELayout as canonical',
        'FullscreenIDE as canonical',
        'new WorkbenchShell',
      ]
      return required.filter((token) => !content.includes(token)).length + forbidden.filter((token) => content.includes(token)).length
    },
    limit: 0,
  },
  {
    id: 'studio-route-fragmentation-ratchet',
    description:
      'Studio must keep five visible groups and route specialized editors through redirects/tools instead of equal-weight pages.',
    files: ['app/studio/creative-studio-routes.ts'],
    test: (content) => {
      const groupCount = (content.match(/id:\s*'(world|character|fx|film|logic)'/g) ?? []).length
      const primaryCount = (content.match(/PRIMARY_CREATIVE_HREFS/g) ?? []).length
      const redirectCount = (content.match(/CREATIVE_STUDIO_ROUTE_REDIRECTS/g) ?? []).length
      const primaryHrefs = [...content.matchAll(/'\/studio\/(level|animation|vfx|film|quest)'/g)].length
      const compressedFilmTools = [
        "'/studio/audio': '/studio/film?tool=audio'",
        "'/studio/cinematic': '/studio/film?tool=cinematic'",
      ]
      return (
        (groupCount === 5 ? 0 : 1) +
        (primaryCount >= 1 ? 0 : 1) +
        (redirectCount >= 1 ? 0 : 1) +
        (primaryHrefs >= 5 ? 0 : 1) +
        compressedFilmTools.filter((token) => !content.includes(token)).length
      )
    },
    limit: 0,
  },
  {
    id: 'marketplace-filter-compression',
    description:
      'Marketplace category taxonomies must stay secondary to search, trust tabs, provenance, and install review.',
    files: ['app/marketplace/MarketplaceFilters.tsx'],
    test: (content, { read } = {}) => {
      const required = [
        'trustFilter',
        'Category filters',
        '<details',
        'selectedCategory',
      ]
      return required.filter((token) => !content.includes(token)).length
    },
    limit: 0,
  },
  {
    id: 'landing-progressive-disclosure',
    description:
      'Landing must keep the hero compressed while allowing only the three canonical start modes below product proof.',
    files: ['app/landing-v3.tsx'],
    test: (content, { read } = {}) => {
      const required = [
        'START_MODES',
        'data-landing-minimal-hero',
        'data-landing-product-proof',
      ]
      const forbidden = [
        'PRIMARY_START_MODES',
        'SECONDARY_START_MODES',
        'More modes',
      ]
      return (
        required.filter((token) => !content.includes(token)).length +
        forbidden.filter((token) => content.includes(token)).length
      )
    },
    limit: 0,
  },
  {
    id: 'pricing-decision-compression',
    description:
      'Pricing must keep the first decision to the common plans and move smaller steps/details out of the primary scan path.',
    files: [
      'app/pricing/_components/PricingPlansGrid.tsx',
      'app/pricing/_components/PricingComparisonTable.tsx',
      'app/pricing/_components/PricingFaq.tsx',
    ],
    combined: true,
    test: (content, { read } = {}) => {
      const required = [
        'featuredPlans',
        'supportingPlans',
        'Most common paths',
        'Smaller steps',
        'Open smaller plans',
        '<details',
        'Detailed comparison',
        'Open only if you need',
      ]
      return required.filter((token) => !content.includes(token)).length
    },
    limit: 0,
  },
  {
    id: 'studio-progressive-navigation',
    description:
      'Studio must not expose every specialized editor as equal-weight chrome; primary editors stay visible and advanced editors move behind a compact route picker.',
    files: [
      'app/studio/CreativeStudioShell.tsx',
      'app/studio/creative-studio-routes.ts',
    ],
    combined: true,
    test: (content, { read } = {}) => {
      const required = [
        'PRIMARY_CREATIVE_HREFS',
        'CREATIVE_STUDIO_GROUPS',
        'groupCreativeStudioRoutes',
        'isPrimaryCreativeStudioRoute',
        'primaryCreativeRoutes',
        'secondaryCreativeRoutes',
        'secondaryCreativeGroups',
        'More editors',
        'data-studio-editor-group',
      ]
      return required.filter((token) => !content.includes(token)).length
    },
    limit: 0,
  },
  {
    id: 'studio-hub-card-compression',
    description:
      'Studio hub must expose primary editors first and collapse specialized editors so the user does not meet the entire editor map at once.',
    files: ['app/studio/page.tsx', 'app/studio/creative-studio-routes.ts'],
    combined: true,
    test: (content, { read } = {}) => {
      const required = [
        'primaryStudioRoutes',
        'advancedStudioRoutes',
        'advancedStudioGroups',
        'Core editors',
        'Advanced editors',
        'groupCreativeStudioRoutes',
        'data-studio-surface-board="operator-density"',
        'data-studio-primary-lanes="5"',
        'data-studio-editor-route',
      ]
      const missing = required.filter(
        (token) => !content.includes(token),
      ).length
      const decorativeDebt = (
        content.match(/bg-\[(linear|radial)-gradient/g) ?? []
      ).length
      return missing + decorativeDebt
    },
    limit: 0,
  },
  {
    id: 'studio-runboard-composition',
    description:
      'Studio mission control must stay Firebase-style: compact runboard shell, typed state, and heavy evidence/actions split behind focused components.',
    files: [
      'app/studio/StudioMissionControl.tsx',
      'app/studio/StudioMissionControlView.tsx',
      'app/studio/StudioMissionControlView.types.ts',
      'app/studio/StudioRunboardHeader.tsx',
      'app/studio/StudioRunboardControls.tsx',
      'app/studio/StudioGameScopeEvidencePanel.tsx',
      'app/studio/StudioRuntimeTruthPanel.tsx',
      'app/studio/StudioRunboardActions.tsx',
    ],
    combined: true,
    test: (content, { read }) => {
      const required = [
        'StudioMissionControlView.types',
        'StudioRunboardHeader',
        'StudioRunboardControls',
        'StudioGameScopeEvidencePanel',
        'StudioRuntimeTruthPanel',
        'StudioRunboardActions',
        'data-studio-mission-runboard="compact"',
      ]
      const main = read('app/studio/StudioMissionControl.tsx') ?? ''
      const view = read('app/studio/StudioMissionControlView.tsx') ?? ''
      const mainLines = main.split('\n').length
      const viewLines = view.split('\n').length
      const forbiddenInMain = [
        'function StudioRunboardHeader',
        'StudioLocalRuntimeCapsule',
        'GAME_SCOPE_OPTIONS',
        'Review receipts',
      ]
      return (
        required.filter((token) => !content.includes(token)).length +
        forbiddenInMain.filter((token) => main.includes(token)).length +
        (mainLines > 240 ? 1 : 0) +
        (viewLines > 120 ? 1 : 0)
      )
    },
    limit: 0,
  },
  {
    id: 'dashboard-first-answer',
    description:
      'Dashboard overview must answer project, run state, cost, approval, evidence, preview, and next action before deep cockpit details.',
    files: [
      'components/dashboard/DashboardOverviewTab.tsx',
      'components/dashboard/DashboardWorkspaceLaunch.tsx',
    ],
    combined: true,
    test: (content, { read } = {}) => {
      const required = [
        'Active runs',
        'Approvals',
        'Evidence',
        'Preview',
        'Next actions',
        'Budget',
        'Review pending proposal',
      ]
      return required.filter((token) => !content.includes(token)).length
    },
    limit: 0,
  },
  {
    id: 'dashboard-firebase-launch-handoff',
    description:
      'Studio Home must behave like a Firebase-style workspace launch: mission input, recent workspaces, and direct handoff into Copilot, IDE, Studio, preview, viewport, and evidence.',
    files: [
      'components/dashboard/DashboardWorkspaceLaunch.tsx',
      'components/dashboard/dashboard-launch-handoff.ts',
    ],
    combined: true,
    test: (content, { read } = {}) => {
      const required = [
        'data-dashboard-firebase-launch="workspace-entry"',
        'DASHBOARD_LAUNCH_MISSION_KEY',
        'persistDashboardLaunchMission',
        'Plan with Copilot',
        'My workspaces',
        'Open IDE',
        'Open Studio',
        'Preview',
        'Viewport 3D',
        'Open receipts',
      ]
      return required.filter((token) => !content.includes(token)).length
    },
    limit: 0,
  },
  {
    id: 'ide-copilot-dashboard-handoff',
    description:
      'IDE Copilot must consume Studio Home missions as real session context, not leave dashboard prompts stranded between surfaces.',
    files: [
      'components/ai-chat/useAIChatSessionContext.ts',
      'components/dashboard/dashboard-launch-handoff.ts',
    ],
    combined: true,
    test: (content, { read } = {}) => {
      const required = [
        'consumeDashboardLaunchMission',
        'buildDashboardLaunchSystemContext',
        'Studio Home mission loaded',
        'dashboard-launch-handoff',
        'Copilot, IDE, preview, Viewport 3D, receipts, and runtime checks',
      ]
      return required.filter((token) => !content.includes(token)).length
    },
    limit: 0,
  },
  {
    id: 'evidence-detail-compression',
    description:
      'Evidence Center must keep the production plan deep internally while showing compact proof and next action first.',
    files: [
      'components/evidence/EvidenceCenter.tsx',
      'components/evidence/EvidenceCenter.parts.tsx',
    ],
    combined: true,
    test: (content, { read } = {}) => {
      const required = [
        'Production plan preview',
        'Open production plan details',
        '<details',
        'uxDisclosure',
        'nextAction',
      ]
      return required.filter((token) => !content.includes(token)).length
    },
    limit: 0,
  },
]
