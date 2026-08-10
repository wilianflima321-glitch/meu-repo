/**
 * Onda M — Runtime Immunity scaffolds (AethelPack, Console HAL trait, AAA probes).
 * Letter bo: Zstd WASM cook compression + JS pack writer.
 */

export {
  AETHEL_PACK_MAGIC,
  AETHEL_PACK_VERSION,
  createEmptyAethelPackManifest,
  validateAethelPackManifest,
  type AethelPackManifest,
  type AethelPackValidationResult,
  type AethelTextureCodec,
  type AethelCompression,
} from './aethel-pack-manifest'

export {
  writeAethelPack,
  readAethelPack,
  proveJsAethelPackCookRoundTrip,
  type AethelPackWriteInput,
  type AethelPackWriteResult,
  type AethelPackReadResult,
} from './aethel-pack-writer'

export {
  probeZstdEncoder,
  ensureZstdEncoder,
  compressAethelPackPayload,
  decompressAethelPackPayload,
  resolveJsCookCompression,
} from './aethel-pack-compress'

export {
  probeAethelPackRustCookWorker,
  type AethelPackRustCookProbe,
} from './aethel-pack-rust-probe'

export {
  runAethelPackCookPublishStage,
  proveCookPackReadyFromJsWriter,
  type CookPublishStageInput,
  type CookPublishStageResult,
} from './cook-publish-stage'

export {
  CONSOLE_HAL_DESKTOP_WIRED,
  CONSOLE_HAL_DOCUMENTED_DESKTOP_BACKENDS,
  createWgpuPortableHalScaffold,
  createVulkanDesktopHalPartial,
  createDx12DesktopHalPartial,
  createPs5GnmHalHeld,
  negotiateConsoleHal,
  proveConsoleHalDesktopReady,
  evaluateConsoleHalHonesty,
  type ConsoleHalBackend,
  type ConsoleHalTrait,
  type ConsoleHalHonestyReport,
  type ConsoleHalNegotiateResult,
} from './console-hal'

export {
  probeAaaProductionCapability,
  evaluateAaaProductionHonesty,
  probeAaaProductionHonesty,
  type AaaProductionCapabilitySnapshot,
  type AaaProductionHonestyReport,
  type AaaProductionHonestyInput,
} from './aaa-production-capability'

export {
  GPU_PSO_CACHE_READY,
  ZERO_STUTTER_FROM_PSO_VAULT,
  createPsoVault,
  sealPsoFingerprint,
  exportPsoVaultToPackSlots,
  claimGpuPsoCacheReady,
  claimZeroStutterFromPsoVault,
  assertPsoVaultNotEmptyForCook,
  probePsoVaultReadiness,
  type PsoVault,
  type PsoVaultEntry,
  type PsoFingerprintInput,
} from './pso-vault'

export {
  WASM_MARKETPLACE_READY,
  V8_WINIT_HOST_READY,
  enforceWasmPluginLoad,
  enforceAgentHostPtyDenied,
  claimWasmMarketplaceReady,
  listWasmShieldDenyEvidence,
  clearWasmShieldDenyEvidenceForTests,
  probeWasmShieldEnforceReadiness,
  type WasmShieldDenyEvidence,
  type WasmShieldEnforceResult,
} from './wasm-shield-enforce'

export {
  DIRECT_STORAGE_READY,
  DIRECT_STORAGE_MARKETING_ALLOWED,
  WEB_DIRECT_STORAGE_FORBIDDEN,
  createZeroCopyAssetStream,
  fulfillAssetStreamRange,
  claimDirectStorageReady,
  claimWebDirectStorageMarketing,
  probeZeroCopyAssetStreamReadiness,
  type ZeroCopyAssetStream,
  type AssetStreamPageView,
  type AssetStreamPageRequest,
} from './zero-copy-asset-stream'
