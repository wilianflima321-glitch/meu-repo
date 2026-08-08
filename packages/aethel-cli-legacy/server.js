#!/usr/bin/env node
/**
 * AETHEL CLI LEGACY — NON-PRODUCTION / HELD (P2b HIGH #13)
 *
 * This package is archived reference only. It is NOT on the cloud-web-app/web
 * or apps/studio-local ship path. The former mock-core LLM backend has been
 * removed from the runtime entrypoint so it cannot emit mock success by default.
 *
 * Canonical successors:
 *   - cloud-web-app/web (Next.js product)
 *   - packages/aethel-kernel-rust + apps/studio-local (desktop/kernel)
 *   - tools/llm-mock/server.js (explicit local mock tooling, not this package)
 *
 * Override (dev archaeology only): AETHEL_CLI_LEGACY_ALLOW_BOOT=1 still exits —
 * there is no mock-core to serve. Do not wire this into production.
 */

'use strict';

const HELD =
  'AETHEL_CLI_LEGACY_HELD: packages/aethel-cli-legacy/server.js is non-production archive. ' +
  'mock-core LLM backend removed from ship path (fail-closed). ' +
  'Use cloud-web-app/web or tools/llm-mock/server.js for explicit local mocks.';

// Always fail-closed — never listen, never return success:true theater.
// eslint-disable-next-line no-console
console.error(HELD);
process.exit(1);
