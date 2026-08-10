/**
 * DEPRECATED parallel surface — Law XVI single choke is production Bridge.
 *
 * Creative Generation Honesty Matrix top deepen #2: collapse dual Bridge.
 * Do not implement a second CostGuard / provider path here.
 *
 * Canonical: `@/lib/production/creative-artifact-bridge` (`dispatchCreativeArtifact`)
 * HTTP choke: `@/lib/production/creative-bridge-http-dispatch`
 */

export {
  dispatchCreativeArtifact,
  type CreativeArtifactDomain,
  type CreativeArtifactRequest,
  type CreativeArtifactResult,
  type CreativeProviderDispatch,
} from '@/lib/production/creative-artifact-bridge'

/** Stable marker for Vitest / honesty probes — must always point at production. */
export const CREATIVE_ARTIFACT_BRIDGE_CANONICAL =
  'lib/production/creative-artifact-bridge' as const

const DEPRECATION =
  '[Law XVI] lib/ai/CreativeArtifactBridge is deprecated. Use dispatchCreativeArtifact from @/lib/production/creative-artifact-bridge (single CostGuard choke).'

/**
 * @deprecated Fail-closed. Former class API bypassed the production ledger adapter.
 * Call `dispatchCreativeArtifact` instead.
 */
export class CreativeArtifactBridge {
  static async generateAndApply(
    ..._args: unknown[]
  ): Promise<never> {
    throw new Error(DEPRECATION)
  }
}
