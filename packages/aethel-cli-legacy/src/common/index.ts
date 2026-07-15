/**
 * AETHEL ENGINE - src/common entrypoint
 *
 * Exporta módulos principais do runtime "common".
 */

// Namespaced exports avoid symbol collisions across submodules.
export * as llm from './llm';
export * as mission from './mission-system/mission-executor';
export * as trading from './trading/core';
export * as media from './media';
