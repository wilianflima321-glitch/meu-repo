/**
 * Vitest Configuration
 *
 * Configures test environment with jsdom for DOM APIs.
 *
 * Round 82: keeps coverage executable with a focused 70% ratchet over tested
 * production contracts, viewport modules, and canonical UI helpers.
 * primitives whose tests are already green - the goal is to ratchet
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
    // Windows ESM module-identity workaround: the default worker pools mint
    // mixed drive-letter case URLs (file:///E: vs file:///e:) for
    // @vitest/runner, which loads chunk-artifact.js as two module instances
    // and crashes collection with "Vitest failed to find the runner". The VM
    // pool routes module loading through the patched VitestModuleEvaluator
    // (scripts/patch-vitest-win-drive-case.mjs) whose URL canonicalization is
    // proven correct on win32. Linux CI keeps the default pool — the
    // workaround is Windows-only by construction and must not silently change
    // the module-execution semantics of the CI suite.
    pool: process.platform === 'win32' ? 'vmThreads' : undefined,
    include: [
      '**/*.test.{ts,tsx}',
      '**/*.spec.{ts,tsx}',
    ],
    exclude: [
      '**/node_modules/**',
      '**/dist/**',
      '**/.next/**',
      '**/e2e/**', // E2E tests use Playwright
      '**/tests/visual-regression/**',
    ],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'text-summary', 'json', 'json-summary', 'html', 'lcov'],
      reportsDirectory: 'reports/coverage',
      // Focused scope - expand as the test suite grows.
      include: [
        'components/agents/chat/AIChatCostMeter.tsx',
        'components/agents/chat/economics/AIChatEconomicsPanel.tsx',
        'components/agents/AgentEvidenceCard.tsx',
        'components/agents/chat/ledger/AIChatLedgerStrip.tsx',
        'components/agents/chat/review/AIChatPendingDiffTray.tsx',
        'components/agents/chat/review/AIChatProposalPreview.tsx',
        'components/agents/chat/activity/AIChatTimeline.tsx',
        'components/agents/chat/activity/AgentBoard.tsx',
        'components/agents/chat/activity/RunCard.tsx',
        'components/agents/evidence-artifacts.ts',
        'components/agents/chat/utils.ts',
        'components/agents/chat/ops/useAIChatOpsArtifacts.ts',
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
      // Progressive thresholds - ratchet up each round. Do NOT lower these numbers.
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
    server: {
      deps: {
        // Only the websocket runtime (which exercises native `.ts` requires
        // through createRequire) needs to be inlined through Vite's resolver.
        // react/react-dom must NOT be inlined: forcing them through Vite's
        // ESM transform creates a SECOND module instance because react-dom's
        // CJS bundle still `require('react')`s natively, so the reconciler's
        // ReactCurrentDispatcher (set on the inlined react) is invisible to
        // the component's imported react -> `Cannot read properties of null
        // (reading 'useContext')`. Externalizing lets Node's single CJS cache
        // serve both the component `import` and react-dom's `require`, so
        // there is exactly ONE react/react-dom 18.3.1 instance.
        inline: [/lib\/server\/websocket/],
      },
    },
  },
  resolve: {
    // See the `server.deps.inline` comment above: dedupe alone is not
    // sufficient because externalized CJS deps bypass Vite's resolver, so
    // pair it with an explicit alias to the hoisted root copy
    // (`../../node_modules/react*`) — the ONLY copy in this monorepo.
    dedupe: ['react', 'react-dom'],
    alias: {
      'react/jsx-dev-runtime': resolve(__dirname, '../../node_modules/react/jsx-dev-runtime.js'),
      'react/jsx-runtime': resolve(__dirname, '../../node_modules/react/jsx-runtime.js'),
      'react-dom/client': resolve(__dirname, '../../node_modules/react-dom/client.js'),
      'react-dom/test-utils': resolve(__dirname, '../../node_modules/react-dom/test-utils.js'),
      'react-dom': resolve(__dirname, '../../node_modules/react-dom/index.js'),
      react: resolve(__dirname, '../../node_modules/react/index.js'),
      // `next/navigation` must resolve to ONE canonical copy for every importer.
      // `@aethel/ide-ui` declares `next` as a direct dependency, so it carries a
      // NESTED `packages/ide-ui/node_modules/next` copy; Vitest keys
      // `vi.mock('next/navigation')` by the RESOLVED module path, so a component
      // imported through the `@aethel/ide-ui` alias would resolve the nested
      // copy while the mock is keyed to the root copy — the mock silently
      // misses and the REAL `useSearchParams` renders null params under jsdom
      // (WorkbenchSidebar renders the general lane). Pinning the subpath to the
      // single hoisted root copy (like react/react-dom above) unifies resolution.
      'next/navigation': resolve(__dirname, '../../node_modules/next/navigation.js'),
      // Mirrors `tsconfig.json`'s `paths` — Vite/Vitest does not read tsconfig
      // `paths` on its own, so without these aliases any test that
      // transitively imports an `@aethel/*` workspace package (e.g.
      // `studio-local-cook-queue.ts` → `@aethel/runtime/runtime-engine-spine`)
      // fails to resolve under `vitest run` even though `tsc` and Next's
      // webpack build both resolve it fine. Keep in sync with `tsconfig.json`.
      '@aethel/runtime-contracts': resolve(__dirname, '../packages/runtime-contracts/src/index.ts'),
      '@aethel/runtime': resolve(__dirname, '../packages/runtime'),
      '@aethel/ide-ui': resolve(__dirname, '../packages/ide-ui'),
      '@aethel/visual-scripting': resolve(__dirname, '../packages/visual-scripting'),
      '@aethel/engine': resolve(__dirname, '../packages/engine'),
      '@aethel/export': resolve(__dirname, '../packages/export'),
      '@aethel/gameplay-ability-system': resolve(__dirname, './lib/gameplay-ability-system.ts'),
      '@aethel/gameplay': resolve(__dirname, '../packages/gameplay'),
      '@aethel/agents': resolve(__dirname, '../packages/agents'),
      '@': resolve(__dirname, './'),
    },
  },
});
