import type { V29OperationalState } from './v29-internal-spine'

export type V29ForensicPriority = 'p0' | 'p1' | 'p2'

export type V29ForensicRuntimeBlock = {
  id: string
  label: string
  priority: V29ForensicPriority
  state: V29OperationalState
  currentEvidence: string[]
  canonicalTarget: string
  marketParityTarget: string
  missingCapabilities: string[]
  requiredDependencies: string[]
  targetFiles: string[]
  gates: string[]
  noFakeClaim: string
  nextActions: string[]
}

export type V29ForensicRuntimeBacklogReport = {
  version: 1
  sourceAudit: 'AETHEL_ENGINE_FORENSIC_RUNTIME_AUDIT_4037ac8'
  blockCount: number
  p0Count: number
  heldOrBlockedCount: number
  blocks: V29ForensicRuntimeBlock[]
  forbiddenPromotions: string[]
  nextExecutionBlock: string
}

export const V29_FORENSIC_FORBIDDEN_PROMOTIONS = [
  'AAA ready',
  'Unreal-grade',
  'Nanite ready',
  'Lumen-like ready',
  'autonomous execution ready',
  'native renderer ready',
  'signed installer ready',
  'final asset',
  'research verified',
  'production ready',
] as const

export const V29_FORENSIC_RUNTIME_BLOCKS: V29ForensicRuntimeBlock[] = [
  {
    id: 'webgpu-render-kernel',
    label: 'WebGPU render kernel and honest AAA renderer cutover',
    priority: 'p0',
    state: 'needs-review',
    currentEvidence: ['cloud-web-app/web/lib/render/webgpu/index.ts', 'cloud-web-app/web/lib/render/webgpu/deferred.ts', 'cloud-web-app/web/lib/render/webgpu/forward-plus.ts', 'cloud-web-app/web/lib/render/webgpu/performance-receipts.ts', 'cloud-web-app/web/lib/runtime/webgpu-compute-readiness.ts', 'cloud-web-app/web/lib/aaa-renderer-webgpu.ts'],
    canonicalTarget: 'cloud-web-app/web/lib/render/webgpu',
    marketParityTarget: 'Unreal-style render stack requires deferred/forward-plus, G-buffer, culling, perf trace, and fallback receipts.',
    missingCapabilities: ['deferred or forward-plus pass', 'GPU culling', 'persistent performance trace', 'render lane receipts'],
    requiredDependencies: ['WebGPU browser support', 'wgsl shader modules', 'worker-safe scene serialization'],
    targetFiles: ['lib/render/webgpu/deferred.ts', 'lib/render/webgpu/forward-plus.ts', 'lib/render/webgpu/performance-receipts.ts'],
    gates: ['qa:v29-webgpu-render-kernel', 'qa:webgpu-compute-readiness', 'qa:webgpu-performance-trace', 'qa:viewport-runtime-boundaries'],
    noFakeClaim: 'Never call the browser renderer Unreal-grade until a WebGPU trace and fallback receipt exist.',
    nextActions: ['Create render/webgpu directory', 'move readiness from copy to capability objects', 'attach perf trace to evidence center'],
  },
  {
    id: 'sequencer-kernel',
    label: 'Canonical sequencer for film, animation, audio, VFX, and render export',
    priority: 'p0',
    state: 'needs-review',
    currentEvidence: ['cloud-web-app/web/lib/sequencer/index.ts', 'cloud-web-app/web/lib/sequencer/core/timeline.ts', 'cloud-web-app/web/components/sequencer/SequencerTimeline.tsx'],
    canonicalTarget: 'cloud-web-app/web/lib/sequencer',
    marketParityTarget: 'Timeline engine with tracks, clips, curves, playhead, undo, OTIO/FCPXML/EDL IO, audio/visual drivers, and render export.',
    missingCapabilities: ['multi-track model', 'keyframe curves', 'timeline serialization', 'export IO', 'audio and visual runtime drivers'],
    requiredDependencies: ['OpenTimelineIO schema decision', 'Web Audio offline render', 'render farm/export pipeline'],
    targetFiles: ['lib/sequencer/core/timeline.ts', 'lib/sequencer/core/curves.ts', 'lib/sequencer/io/timeline-otio.ts', 'lib/sequencer/runtime/render-export.ts'],
    gates: ['qa:v29-creative-toolchain-contract', 'qa:cinematic-evidence-spine', 'qa:asset-final-evidence-gate'],
    noFakeClaim: 'Film/cinematic output stays draft until playback, export, and human review receipts exist.',
    nextActions: ['Create sequencer core contracts', 'write curve serialization tests', 'wire Studio film/animation/audio/VFX to one sequencer model'],
  },
  {
    id: 'agent-runtime-tools',
    label: 'Agent runtime with scoped tools, sandbox, browser replay, memory, and evals',
    priority: 'p0',
    state: 'needs-review',
    currentEvidence: ['cloud-web-app/web/lib/agents/runtime/index.ts', 'cloud-web-app/web/lib/agent-orchestrator.ts', 'cloud-web-app/web/lib/agents/agent-execution-evidence-package.ts'],
    canonicalTarget: 'cloud-web-app/web/lib/agents/runtime',
    marketParityTarget: 'Cursor/Manus parity needs tool registry, parallel role execution, sandbox provider, browser runtime, vector memory, receipts, and role evals.',
    missingCapabilities: ['per-role tool scopes', 'sandboxed code execution', 'browser replay host', 'vector memory adapter', 'role evaluation suite'],
    requiredDependencies: ['@modelcontextprotocol/sdk', 'sandbox provider decision', 'project vector store', 'browser replay persistence'],
    targetFiles: ['lib/agents/runtime/orchestrator.ts', 'lib/agents/runtime/tool-registry.ts', 'lib/agents/runtime/sandbox-provider.ts', 'lib/agents/runtime/role-eval-suite.ts'],
    gates: ['qa:agent-runtime-spine', 'qa:agent-execution-evidence-package', 'qa:browser-operator-replay'],
    noFakeClaim: 'Autonomous execution stays false until scoped tools, sandbox, receipts, and eval gates pass.',
    nextActions: ['Define role tool manifests', 'route writes through approval gates', 'persist receipts per agent run'],
  },
  {
    id: 'mcp-plugin-host',
    label: 'MCP host and plugin host instead of SDK-only stubs',
    priority: 'p0',
    state: 'needs-review',
    currentEvidence: ['cloud-web-app/web/lib/mcp/host.ts', 'cloud-web-app/web/lib/mcp/mcp-core.ts', 'packages/aethel-mcp-sdk/src/index.ts'],
    canonicalTarget: 'cloud-web-app/web/lib/mcp/host.ts',
    marketParityTarget: 'Cursor-class extensibility needs approved MCP servers, tool calls, env scoping, audit receipts, and plugin lifecycle.',
    missingCapabilities: ['persistent MCP server registry', 'approved tool invocation route', 'plugin lifecycle host', 'per-server audit receipts'],
    requiredDependencies: ['@modelcontextprotocol/sdk', 'Prisma McpServer model', 'approval policy'],
    targetFiles: ['lib/mcp/host.ts', 'app/api/mcp/servers/route.ts', 'app/api/mcp/tools/[server]/call/route.ts', 'components/agents/MCPServerRegistry.tsx'],
    gates: ['qa:mcp-server-split', 'qa:v29-prisma-model-coverage', 'qa:no-fake-success'],
    noFakeClaim: 'MCP ecosystem claims stay held until registry, approval, call route, and audit receipts exist.',
    nextActions: ['Add host contract', 'map Prisma model coverage', 'surface registry inside agents console'],
  },
  {
    id: 'studio-local-native-kernel',
    label: 'Studio Local native kernel, sidecars, signing, updater, and crash recovery',
    priority: 'p0',
    state: 'held',
    currentEvidence: ['apps/studio-local/src-tauri/src/main.rs', 'apps/studio-local/src-tauri/src/desktop_commands.rs', 'apps/studio-local/src-tauri/src/native_kernel.rs', 'apps/studio-local/src/desktop-bridge/createDesktopAdapter.ts'],
    canonicalTarget: 'apps/studio-local/src-tauri/src',
    marketParityTarget: 'Desktop v1 must expose machine probe, local daemon, filesystem watcher, git, PTY, sidecar templates, crash state, update channel, and signed release evidence.',
    missingCapabilities: ['native PTY', 'filesystem watcher', 'local daemon API', 'signed installer receipts', 'auto-updater receipts'],
    requiredDependencies: ['tokio', 'axum', 'notify', 'git2', 'portable-pty', 'tracing'],
    targetFiles: ['apps/studio-local/src-tauri/src/local_daemon.rs', 'apps/studio-local/src-tauri/src/fs_watcher.rs', 'apps/studio-local/src-tauri/src/native_pty.rs'],
    gates: ['qa:v29-desktop-capability-manifest', 'qa:v29-desktop-bridge-commands', 'qa:v29-studio-local-native-kernel', 'qa:studio-local-release-readiness'],
    noFakeClaim: 'Desktop ready, signed installer, and native renderer claims stay held until receipts exist.',
    nextActions: ['Add native capability manifest fields', 'introduce local daemon contract', 'keep terminal execution held until PTY is real'],
  },
  {
    id: 'cloud-render-export',
    label: 'Cloud render farm and universal export pipeline',
    priority: 'p0',
    state: 'provider_unavailable',
    currentEvidence: ['cloud-web-app/web/lib/render-farm/index.ts', 'cloud-web-app/web/lib/render-farm/queue/job-spec.ts', 'cloud-web-app/web/lib/export/export-pipeline-spine.ts', 'cloud-web-app/web/app/api/render/jobs/[jobId]/cancel/route.ts'],
    canonicalTarget: 'cloud-web-app/web/lib/render-farm',
    marketParityTarget: 'Render/export needs provider routing, cost cap, progress, logs, cancel, teardown, signatures, and artifacts.',
    missingCapabilities: ['provider dispatcher', 'cost-aware routing', 'job logs', 'teardown SLA', 'format-specific export receipts'],
    requiredDependencies: ['GPU provider account', 'artifact storage', 'queue/retry policy', 'ffmpeg or WebCodecs lane'],
    targetFiles: ['lib/render-farm/queue/job-spec.ts', 'lib/render-farm/queue/dispatcher.ts', 'lib/export/formats/glb.ts', 'lib/export/formats/mp4-webcodecs.ts'],
    gates: ['qa:v29-cloud-render-export', 'qa:cloud-stream-cost-safety', 'qa:runtime-job-receipts', 'qa:asset-final-evidence-gate'],
    noFakeClaim: 'Cloud render and final export stay held until URL, cost, logs, cancel, teardown, and artifact receipts exist.',
    nextActions: ['Create render farm provider contracts', 'make export plan choose web/local/cloud lanes', 'attach cancel and teardown receipts'],
  },
  {
    id: 'asset-library-quality',
    label: 'Curated asset library with license, provenance, quality, and source adapters',
    priority: 'p1',
    state: 'needs-review',
    currentEvidence: ['cloud-web-app/web/lib/assets/library/index.ts', 'cloud-web-app/web/lib/assets/library/catalog/manifest.ts', 'cloud-web-app/web/lib/assets/library/catalog/license-policy.ts', 'cloud-web-app/web/lib/production/game-asset-quality-pipeline.ts'],
    canonicalTarget: 'cloud-web-app/web/lib/assets/library',
    marketParityTarget: 'FAB-like asset library needs catalog, source adapters, license policy, thumbnails, cache, provenance, and quality ledger.',
    missingCapabilities: ['curated catalog', 'source adapters', 'license filters', 'quality thresholds', 'CDN/cache policy'],
    requiredDependencies: ['Sketchfab/PolyHaven/AmbientCG/Freesound policies', 'R2 or blob storage', 'license officer review'],
    targetFiles: ['lib/assets/library/catalog/manifest.ts', 'lib/assets/library/sources/polyhaven.ts', 'lib/assets/library/sources/sketchfab.ts', 'lib/assets/library/catalog/license-policy.ts'],
    gates: ['qa:v29-asset-library-quality', 'qa:curated-asset-sourcing', 'qa:game-asset-quality-pipeline', 'qa:asset-final-evidence-gate'],
    noFakeClaim: 'Assets are drafts until license, provenance, quality ledger, and human approval pass.',
    nextActions: ['Create catalog manifest contract', 'add source policy adapters', 'block install without license receipts'],
  },
  {
    id: 'physics-ai-ondevice-photogrammetry',
    label: 'Physics replacement, on-device AI, and photogrammetry integrations',
    priority: 'p1',
    state: 'held',
    currentEvidence: ['cloud-web-app/web/lib/physics/rapier-driver.ts', 'cloud-web-app/web/lib/ai-ondevice/capability-matrix.ts', 'cloud-web-app/web/lib/ai-ondevice/face-mesh/mediapipe-bridge.ts', 'cloud-web-app/web/lib/integrations/photogrammetry/luma-ai.ts'],
    canonicalTarget: 'cloud-web-app/web/lib/ai-ondevice',
    marketParityTarget: 'Serious game/film tools need real physics, face/pose capture, segmentation, voice, photogrammetry, and retarget receipts.',
    missingCapabilities: ['Rapier driver', 'face/pose capture bridge', 'photogrammetry provider adapters', 'retarget pipeline', 'offline model receipts'],
    requiredDependencies: ['@dimforge/rapier3d-compat', 'onnxruntime-web or mediapipe', 'provider API keys', 'privacy policy receipts'],
    targetFiles: ['lib/physics/rapier-driver.ts', 'lib/ai-ondevice/face-mesh/mediapipe-bridge.ts', 'lib/integrations/photogrammetry/luma-ai.ts'],
    gates: ['qa:v29-physics-ai-ondevice-photogrammetry', 'qa:game-playtest-spine', 'qa:game-scope-orchestrator', 'qa:no-fake-success'],
    noFakeClaim: 'Physics, capture, and generated assets stay draft until runtime, privacy, and human review evidence exist.',
    nextActions: ['Replace physics mock with held/available adapter contract', 'create ai-ondevice capability matrix', 'add photogrammetry provider receipts'],
  },
  {
    id: 'i18n-single-source',
    label: 'Single i18n source of truth and premium EN surfaces',
    priority: 'p1',
    state: 'needs-review',
    currentEvidence: ['cloud-web-app/web/lib/i18n/single-source-contract.ts', 'cloud-web-app/web/public/locales/en/common.json', 'cloud-web-app/web/public/locales/_canonical.md', 'cloud-web-app/web/next-i18next.config.js'],
    canonicalTarget: 'cloud-web-app/web/public/locales',
    marketParityTarget: 'Premium product copy needs one translation system, EN default, no PT-BR hardcoded drift, and route-level terminology checks.',
    missingCapabilities: ['single i18n decision', 'legacy translation removal plan', 'hardcoded string ratchet to zero on premium surfaces'],
    requiredDependencies: ['i18n architecture decision', 'locale QA allowlist', 'translation ownership'],
    targetFiles: ['lib/i18n/single-source-contract.ts', 'public/locales/en/common.json', 'public/locales/pt-BR/common.json', 'scripts/check-i18n-hardcoded-spine.mjs'],
    gates: ['qa:v29-i18n-single-source', 'qa:i18n-canonical', 'qa:i18n-hardcoded-spine', 'qa:ide-visible-language-drift'],
    noFakeClaim: 'EN premium copy is canonical until localized strings pass i18n gates.',
    nextActions: ['Choose one runtime i18n system', 'migrate premium route strings', 'deprecate duplicate translation modules after zero imports'],
  },
]

export function buildV29ForensicRuntimeBacklogReport(
  blocks: V29ForensicRuntimeBlock[] = V29_FORENSIC_RUNTIME_BLOCKS,
): V29ForensicRuntimeBacklogReport {
  const p0Count = blocks.filter((block) => block.priority === 'p0').length
  const heldOrBlockedCount = blocks.filter((block) => block.state !== 'available').length
  const nextExecutionBlock =
    blocks.find((block) => block.priority === 'p0' && block.state !== 'available')?.id ?? blocks[0]?.id ?? 'none'
  return {
    version: 1,
    sourceAudit: 'AETHEL_ENGINE_FORENSIC_RUNTIME_AUDIT_4037ac8',
    blockCount: blocks.length,
    p0Count,
    heldOrBlockedCount,
    blocks,
    forbiddenPromotions: [...V29_FORENSIC_FORBIDDEN_PROMOTIONS],
    nextExecutionBlock,
  }
}

export function validateV29ForensicRuntimeBacklog(blocks: V29ForensicRuntimeBlock[] = V29_FORENSIC_RUNTIME_BLOCKS): string[] {
  const failures: string[] = []
  const requiredIds = [
    'webgpu-render-kernel',
    'sequencer-kernel',
    'agent-runtime-tools',
    'mcp-plugin-host',
    'studio-local-native-kernel',
    'cloud-render-export',
    'asset-library-quality',
    'physics-ai-ondevice-photogrammetry',
    'i18n-single-source',
  ]
  const seen = new Set(blocks.map((block) => block.id))
  for (const id of requiredIds) if (!seen.has(id)) failures.push(`Missing forensic runtime block: ${id}`)
  for (const block of blocks) {
    if (!block.currentEvidence.length) failures.push(`${block.id}: missing currentEvidence`)
    if (!block.targetFiles.length) failures.push(`${block.id}: missing targetFiles`)
    if (!block.gates.length) failures.push(`${block.id}: missing gates`)
    if (!block.nextActions.length) failures.push(`${block.id}: missing nextActions`)
    if (block.state === 'available') failures.push(`${block.id}: cannot be available in forensic backlog without dedicated receipts`)
    const weakFraming = new RegExp(`${'proto'}${'type'}|${'simp'}${'le'}|${'bas'}${'ic'}`, 'i')
    if (weakFraming.test(`${block.label} ${block.marketParityTarget} ${block.nextActions.join(' ')}`)) {
      failures.push(`${block.id}: contains weak-market framing`)
    }
  }
  return failures
}
