// Workspace, Studio, Dashboard, and Evidence UX checks for qa:ux-market-standard.

export const WORKSPACE_UX_CHECKS = [
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
