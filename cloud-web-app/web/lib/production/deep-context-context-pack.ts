import { createHash } from 'node:crypto'

import type { ContextCategory, ContextChunk, DeepContextMemorySnapshot } from '@/lib/ai/deep-context-manager'

export type DeepContextPackMode = 'plan' | 'code' | 'research' | 'creative' | 'gameplay' | 'release'
export type DeepContextPackSurface = 'web' | 'ide' | 'studio-local' | 'cloud-agent'
export type DeepContextPackStatus = 'available' | 'held' | 'blocked' | 'needs-review'

export interface DeepContextPackInput {
  snapshot: DeepContextMemorySnapshot | null
  query: string
  mode?: DeepContextPackMode
  surface?: DeepContextPackSurface
  model?: string
  modelMaxInputTokens?: number
  maxTokens?: number
  maxChunks?: number
  requireEvidence?: boolean
  includeHeld?: boolean
  responseReserveTokens?: number
  toolSchemaTokens?: number
  conversationHistoryChars?: number
  queryEmbedding?: number[]
  readReceiptRefs?: string[]
  evidenceRefs?: string[]
}

export interface DeepContextPackItem {
  chunk: ContextChunk
  score: number
  reasons: string[]
}

export interface DeepContextPack {
  version: 1
  projectId: string | null
  mode: DeepContextPackMode
  surface: DeepContextPackSurface
  status: DeepContextPackStatus
  model: string
  modelMaxInputTokens: number
  usableInputTokens: number
  contextBudgetTokens: number
  selectedTokens: number
  selectedItems: DeepContextPackItem[]
  heldItems: DeepContextPackItem[]
  context: string
  cacheKey: string
  requiresEvidence: boolean
  requiresReadReceipts: boolean
  warnings: string[]
  hallucinationControls: string[]
  nextAction: string
}

const DEFAULT_MODEL_WINDOW = 128_000
const RESPONSE_RESERVE_TOKENS = 4_000
const TOOL_SCHEMA_TOKENS = 2_000

const MODE_CATEGORIES: Record<DeepContextPackMode, ContextCategory[]> = {
  plan: ['rules', 'decision', 'system', 'research', 'evidence', 'world', 'story', 'gameplay', 'asset'],
  code: ['code', 'rules', 'decision', 'system', 'evidence'],
  research: ['research', 'evidence', 'decision', 'system'],
  creative: ['story', 'character', 'world', 'scene', 'shot', 'asset', 'decision', 'rules'],
  gameplay: ['gameplay', 'rules', 'world', 'asset', 'decision', 'evidence'],
  release: ['evidence', 'decision', 'rules', 'asset', 'gameplay', 'system'],
}

function estimateTokens(text: string): number {
  return Math.max(0, Math.ceil(String(text || '').length / 4))
}

function estimateTokensFromChars(chars: number): number {
  return Math.max(0, Math.ceil(Math.max(0, chars) / 4))
}

function inferModelWindow(model: string | undefined): number {
  const normalized = String(model || '').toLowerCase()
  if (normalized.includes('gemini')) return 1_000_000
  if (normalized.includes('claude')) return 200_000
  if (normalized.includes('gpt-5') || normalized.includes('gpt-4.1')) return 400_000
  if (normalized.includes('gpt-4') || normalized.includes('o3') || normalized.includes('o4')) return 128_000
  return DEFAULT_MODEL_WINDOW
}

function defaultContextBudget(surface: DeepContextPackSurface, mode: DeepContextPackMode): number {
  if (mode === 'release') return 12_000
  switch (surface) {
    case 'web':
      return 8_000
    case 'ide':
      return 16_000
    case 'studio-local':
      return 48_000
    case 'cloud-agent':
      return 96_000
  }
}

function tokenize(text: string): string[] {
  return Array.from(
    new Set(
      text
        .toLowerCase()
        .split(/[^a-z0-9_-]+/i)
        .map((term) => term.trim())
        .filter((term) => term.length >= 3)
    )
  )
}

function cosineSimilarity(a: number[] | undefined, b: number[] | undefined): number {
  if (!a?.length || !b?.length || a.length !== b.length) return 0
  let dot = 0
  let normA = 0
  let normB = 0
  for (let index = 0; index < a.length; index += 1) {
    dot += a[index] * b[index]
    normA += a[index] * a[index]
    normB += b[index] * b[index]
  }
  return normA && normB ? dot / (Math.sqrt(normA) * Math.sqrt(normB)) : 0
}

function lexicalScore(chunk: ContextChunk, queryTerms: string[], allowedCategories: ContextCategory[]): DeepContextPackItem {
  const reasons: string[] = []
  const title = chunk.title ?? ''
  const haystack = `${title} ${chunk.category} ${chunk.tags.join(' ')} ${chunk.content}`.toLowerCase()
  const tagMatches = queryTerms.filter((term) => chunk.tags.some((tag) => tag.includes(term) || term.includes(tag))).length
  const contentMatches = queryTerms.filter((term) => haystack.includes(term)).length
  const categoryBoost = allowedCategories.includes(chunk.category) ? 8 : 0
  const evidenceBoost = chunk.evidenceRefs.length > 0 ? 8 : 0
  const sourceBoost = chunk.sourceRefs.length > 0 ? 3 : 0
  const titleBoost = title && queryTerms.some((term) => title.toLowerCase().includes(term)) ? 6 : 0
  if (tagMatches) reasons.push(`tag-match:${tagMatches}`)
  if (contentMatches) reasons.push(`content-match:${contentMatches}`)
  if (categoryBoost) reasons.push(`mode-category:${chunk.category}`)
  if (evidenceBoost) reasons.push('evidence-backed')
  if (sourceBoost) reasons.push('source-backed')
  if (titleBoost) reasons.push('title-match')

  return {
    chunk,
    score: tagMatches * 12 + contentMatches * 5 + categoryBoost + evidenceBoost + sourceBoost + titleBoost + chunk.importance * 8,
    reasons,
  }
}

function scoreChunk(
  chunk: ContextChunk,
  queryTerms: string[],
  allowedCategories: ContextCategory[],
  queryEmbedding?: number[]
): DeepContextPackItem {
  const item = lexicalScore(chunk, queryTerms, allowedCategories)
  const vectorScore = cosineSimilarity(queryEmbedding, chunk.embedding)
  if (vectorScore > 0) {
    item.score += vectorScore * 30
    item.reasons.push(`embedding:${vectorScore.toFixed(2)}`)
  }
  return item
}

function unique(items: string[]): string[] {
  return Array.from(new Set(items.map((item) => item.trim()).filter(Boolean)))
}

function hashPack(input: {
  projectId: string | null
  updatedAt?: string
  query: string
  mode: DeepContextPackMode
  surface: DeepContextPackSurface
  model: string
  selectedIds: string[]
}): string {
  return createHash('sha256')
    .update(JSON.stringify(input))
    .digest('hex')
    .slice(0, 24)
}

function buildContext(items: DeepContextPackItem[], controls: string[]): string {
  const chunks = items.map(({ chunk, score, reasons }) => {
    const refs = [...chunk.sourceRefs.map((ref) => `source:${ref}`), ...chunk.evidenceRefs.map((ref) => `evidence:${ref}`)]
    return [
      `### ${chunk.title ?? `${chunk.category}:${chunk.id}`}`,
      `id=${chunk.id}; category=${chunk.category}; score=${score.toFixed(2)}; reasons=${reasons.join(', ') || 'baseline'}`,
      `tags=${chunk.tags.join(', ') || 'none'}; tokens=${chunk.tokenEstimate}; refs=${refs.join('; ') || 'none'}`,
      chunk.content,
    ].join('\n')
  })

  return [
    'CONTEXT GOVERNANCE:',
    ...controls.map((control) => `- ${control}`),
    '',
    'SELECTED PROJECT MEMORY:',
    chunks.join('\n\n') || 'No governed project memory selected.',
  ].join('\n')
}

export function buildDeepContextPack(input: DeepContextPackInput): DeepContextPack {
  const mode = input.mode ?? 'plan'
  const surface = input.surface ?? 'web'
  const model = input.model?.trim() || 'default-context-model'
  const modelMaxInputTokens = Math.max(8_000, input.modelMaxInputTokens ?? inferModelWindow(model))
  const responseReserveTokens = Math.max(1_000, input.responseReserveTokens ?? RESPONSE_RESERVE_TOKENS)
  const toolSchemaTokens = Math.max(0, input.toolSchemaTokens ?? TOOL_SCHEMA_TOKENS)
  const historyTokens = estimateTokensFromChars(input.conversationHistoryChars ?? 0)
  const usableInputTokens = Math.max(1_000, modelMaxInputTokens - responseReserveTokens - toolSchemaTokens - historyTokens)
  const contextBudgetTokens = Math.max(
    256,
    Math.min(input.maxTokens ?? defaultContextBudget(surface, mode), usableInputTokens)
  )
  const maxChunks = Math.max(1, Math.min(input.maxChunks ?? 10, 64))
  const requiresEvidence = input.requireEvidence ?? mode === 'release'
  const readReceiptRefs = unique(input.readReceiptRefs ?? [])
  const evidenceRefs = unique(input.evidenceRefs ?? [])
  const warnings: string[] = []
  const snapshot = input.snapshot

  if (!snapshot) {
    const controls = [
      'Project memory is missing; do not invent project facts.',
      'Ask for indexing, project upload, or human-provided evidence before autonomous apply.',
      'Use only user-provided prompt facts until memory exists.',
      'Keep work in planning mode.',
    ]
    return {
      version: 1,
      projectId: null,
      mode,
      surface,
      status: 'blocked',
      model,
      modelMaxInputTokens,
      usableInputTokens,
      contextBudgetTokens,
      selectedTokens: 0,
      selectedItems: [],
      heldItems: [],
      context: buildContext([], controls),
      cacheKey: hashPack({ projectId: null, query: input.query, mode, surface, model, selectedIds: [] }),
      requiresEvidence,
      requiresReadReceipts: false,
      warnings: ['Project memory snapshot is missing.'],
      hallucinationControls: controls,
      nextAction: 'Create or refresh DeepContext memory before running broad agent work.',
    }
  }

  const allowedCategories = MODE_CATEGORIES[mode]
  const queryTerms = tokenize(input.query)
  const ranked = snapshot.chunks
    .filter((chunk) => chunk.projectId === snapshot.projectId)
    .map((chunk) => scoreChunk(chunk, queryTerms, allowedCategories, input.queryEmbedding))
    .filter((item) => allowedCategories.includes(item.chunk.category) || item.score > 0)
    .sort(
      (a, b) =>
        b.score - a.score ||
        b.chunk.importance - a.chunk.importance ||
        Date.parse(b.chunk.updatedAt) - Date.parse(a.chunk.updatedAt)
    )

  const selectedItems: DeepContextPackItem[] = []
  const heldItems: DeepContextPackItem[] = []
  let selectedTokens = 0

  for (const item of ranked) {
    if (requiresEvidence && item.chunk.evidenceRefs.length === 0) {
      heldItems.push({ ...item, reasons: [...item.reasons, 'held:no-evidence'] })
      continue
    }
    if (selectedItems.length >= maxChunks) {
      heldItems.push({ ...item, reasons: [...item.reasons, 'held:max-chunks'] })
      continue
    }
    if (selectedTokens + item.chunk.tokenEstimate > contextBudgetTokens && selectedItems.length > 0) {
      heldItems.push({ ...item, reasons: [...item.reasons, 'held:token-budget'] })
      continue
    }
    selectedItems.push(item)
    selectedTokens += item.chunk.tokenEstimate
  }

  if (heldItems.length > 0) warnings.push(`${heldItems.length} memory chunks held by evidence, chunk, or token budget constraints.`)
  if (selectedItems.length === 0) warnings.push('No memory chunks selected for this query and mode.')
  if (contextBudgetTokens < defaultContextBudget(surface, mode)) warnings.push('Context budget was capped by model, response, tool, or history reserve.')

  const requiresReadReceipts = selectedItems.length > 0 && readReceiptRefs.length === 0
  const selectedEvidenceRefs = unique([
    ...evidenceRefs,
    ...selectedItems.flatMap((item) => item.chunk.evidenceRefs),
  ])
  const hallucinationControls = unique([
    'Use only selected chunk IDs, source refs, and evidence refs for project-specific claims.',
    'If a needed asset, scene, file, dependency, runtime, or approval is absent from selected memory, say it is missing.',
    'Do not treat draft memory as final; release/final work requires evidence-backed chunks and human review.',
    'Create read receipts for every selected chunk before apply, build, publish, or destructive work.',
    'Prefer summary/index lanes over dumping long raw context into prompts.',
  ])

  let status: DeepContextPackStatus = 'available'
  if (selectedItems.length === 0) {
    status = 'blocked'
  } else if (requiresEvidence && heldItems.some((item) => item.reasons.includes('held:no-evidence'))) {
    status = 'held'
  } else if (requiresReadReceipts || selectedEvidenceRefs.length === 0) {
    status = 'needs-review'
  }

  const nextAction =
    status === 'blocked'
      ? 'Refresh memory or broaden the query before agent execution.'
      : status === 'held'
        ? 'Add evidence/human approval for held chunks before final, release, asset, or gameplay execution.'
        : status === 'needs-review'
          ? 'Record read receipts and evidence refs, then run the agent with this bounded context pack.'
          : 'Run the agent using this pack; keep missing facts explicit and auditable.'

  const selectedIds = selectedItems.map((item) => item.chunk.id)

  return {
    version: 1,
    projectId: snapshot.projectId,
    mode,
    surface,
    status,
    model,
    modelMaxInputTokens,
    usableInputTokens,
    contextBudgetTokens,
    selectedTokens,
    selectedItems,
    heldItems: input.includeHeld ? heldItems : [],
    context: buildContext(selectedItems, hallucinationControls),
    cacheKey: hashPack({
      projectId: snapshot.projectId,
      updatedAt: snapshot.updatedAt,
      query: input.query,
      mode,
      surface,
      model,
      selectedIds,
    }),
    requiresEvidence,
    requiresReadReceipts,
    warnings,
    hallucinationControls,
    nextAction,
  }
}

export function validateDeepContextPack(pack: DeepContextPack): string[] {
  const failures: string[] = []
  if (pack.selectedTokens > pack.contextBudgetTokens) failures.push('selectedTokens exceeds contextBudgetTokens')
  if (pack.status === 'available' && pack.requiresReadReceipts) failures.push('available pack cannot require read receipts')
  if (pack.status === 'available' && pack.requiresEvidence && pack.selectedItems.some((item) => item.chunk.evidenceRefs.length === 0)) {
    failures.push('available evidence-required pack contains chunks without evidence')
  }
  if (pack.selectedItems.length > 0 && pack.context.length < 80) failures.push('selected pack context is too thin')
  if (pack.hallucinationControls.length < 5) failures.push('hallucination controls are too thin')
  if (!/^[a-f0-9]{24}$/.test(pack.cacheKey)) failures.push('cacheKey is not deterministic sha256 short hash')
  return failures
}
