/**
 * Vitest Configuration
 *
 * Configures test environment with jsdom for DOM APIs.
 *
 * Round 82: keeps coverage executable with a focused 70% ratchet over tested
 * production contracts, viewport modules, and canonical UI helpers.
 * primitives whose tests are already green â€” the goal is to ratchet
 * coverage up each round without hiding behind a broken coverage command.
 */

import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    include: [
      '**/*.test.{ts,tsx}',
      '**/*.spec.{ts,tsx}',
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/e2e/**', // E2E tests use Playwright
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'json', 'json-summary', 'html', 'lcov'],
      reportsDirectory: 'reports/coverage',
      // Focused scope â€” expand as the test suite grows.
      include: [
        'components/agents/chat/AIChatCostMeter.tsx',
        'components/ai-chat/AIChatEconomicsPanel.tsx',
        'components/agents/AgentEvidenceCard.tsx',
        'components/ai-chat/AIChatLedgerStrip.tsx',
        'components/ai-chat/AIChatPendingDiffTray.tsx',
        'components/ai-chat/AIChatProposalPreview.tsx',
        'components/agents/chat/activity/AIChatTimeline.tsx',
        'components/agents/chat/activity/AgentBoard.tsx',
        'components/agents/chat/activity/RunCard.tsx',
        'components/agents/evidence-artifacts.ts',
        'components/agents/chat/utils.ts',
        'components/ai-chat/useAIChatOpsArtifacts.ts',
        'components/collaboration/CollaboratorsBar.tsx',
        'components/ide/fullscreen/WorkbenchEditorToolbar.tsx',
        'components/ide/fullscreen/WorkbenchPreviewProposalOverlay.tsx',
        'components/ide/fullscreen/WorkbenchPreviewRuntimeSurface.tsx',
        'components/ide/fullscreen/WorkbenchSidebar.tsx',
        'components/ide/fullscreen/workbench-entry-triage.ts',
        'components/ide/fullscreen/workbench-helpers.ts',
        'components/ui/ThemeToggle.tsx',
        'lib/agent-orchestrator.ts',
        'lib/observability/logger.ts',
        'lib/server/magic-link.ts',
        'lib/server/webauthn-passkeys.ts',
        'lib/production/agent-tool-bus.ts',
        'lib/production/browser-operator-safety.ts',
        'lib/production/high-risk-action-firewall.ts',
        'lib/production/multi-resolution-project-memory.ts',
        'lib/production/task-evidence-ledger.ts',
        'lib/production/engine-module-integration-plan.ts',
        'lib/production/repository-cartography.ts',
        'lib/production/repository-cartography-scanner.ts',
        'lib/production/research-intelligence-bridge.ts',
        'lib/viewport/gizmo-transform-operation.ts',
        'lib/viewport/gizmo-transform-persistence.ts',
        'lib/viewport/gizmo-elite-controls.ts',
        'lib/viewport/viewport-asset-import.ts',
        'lib/viewport/viewport-asset-import-persistence.ts',
        'lib/viewport/viewport-render-artifact-access.ts',
        'lib/viewport/viewport-render-backend.ts',
        'lib/viewport/viewport-render-contract.ts',
        'lib/viewport/viewport-render-persistence.ts',
        'lib/viewport/viewport-render-queue.ts',
        'lib/viewport/viewport-render-readiness.ts',
      ],
      exclude: [
        'node_modules/',
        'vitest.setup.ts',
        '**/*.d.ts',
        '**/*.stories.{ts,tsx}',
        '**/index.ts',
        '**/__tests__/**',
      ],
      // Progressive thresholds â€” ratchet up each round. Do NOT lower these numbers.
      thresholds: {
        statements: 70,
        branches: 70,
        functions: 70,
        lines: 70,
        // Per-file ratchets for modules already well-covered.
        'components/agents/chat/utils.ts': {
          statements: 90,
          branches: 80,
          functions: 100,
          lines: 90,
        },
        'components/ide/fullscreen/workbench-helpers.ts': {
          statements: 85,
          branches: 70,
          functions: 100,
          lines: 85,
        },
      },
    },
    testTimeout: 10000,
    hookTimeout: 10000,
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './'),
    },
  },
});
