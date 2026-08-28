/**
 * Single sanctioned package-boundary seam for agent role identity.
 *
 * The canonical role catalog (`AGENT_ROLE_PROFILES` → `AgentType`) lives in
 * `cloud-web-app/web/lib/agent-orchestrator.ts` — the web product layer owns
 * role names, scopes and guidance copy. `packages/agents` is the policy/runtime
 * kernel and MUST NOT duplicate that catalog (duplication = role drift between
 * the runtime plan builder and the web UI).
 *
 * Every cross-package role reference inside `packages/agents` flows through
 * this one file, so a future catalog migration (e.g. moving profiles into a
 * shared contracts package) changes exactly ONE import.
 */
export type { AgentType } from '../../../web/lib/agent-orchestrator';
export { SUPPORTED_AGENT_TYPES } from '../../../web/lib/agent-orchestrator';
