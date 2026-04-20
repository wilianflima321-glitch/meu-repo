/**
 * Integration Index
 * Central export for all integration modules
 */

import { getIDEIntegration } from './ide-integration';

import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('integration')

export { IDEIntegration, getIDEIntegration, resetIDEIntegration } from './ide-integration';
export type { IDEConfig } from './ide-integration';

export { EditorIntegration, getEditorIntegration } from './editor-integration';
export type { EditorDocument, EditorPosition, EditorRange } from './editor-integration';

export { DebugIntegration, getDebugIntegration, resetDebugIntegration } from './debug-integration';
export type { DebugSession, Breakpoint, StackFrame, Variable } from './debug-integration';

/**
 * Initialize all integrations
 */
export async function initializeIntegrations(config: any): Promise<void> {
  const ide = getIDEIntegration(config);
  await ide.initialize();
  log.info('[Integration] All systems initialized');
}
