import { createComponentLogger } from '@/lib/observability/logger'

const log = createComponentLogger('ai/deep-context-manager')

export type ContextCategory =
  | 'story'
  | 'code'
  | 'rules'
  | 'character'
  | 'world'
  | 'scene'
  | 'shot'
  | 'gameplay'
  | 'asset'
  | 'research'
  | 'evidence'
  | 'decision'
  | 'system'

export interface ContextChunk {
  id: string
  projectId: string
  category: ContextCategory
  content: string
  tags: string[]
  title?: string
  sourceRefs: string[]
  evidenceRefs: string[]
  importance: number
  tokenEstimate: number
  createdAt: string
  updatedAt: string
  embedding?: number[]
  astDeclarations?: Array<{ type: string; name: string }>
}

export interface DeepContextMemorySnapshot {
  version: 1
  projectId: string
  updatedAt: string
  chunks: ContextChunk[]
}

export interface DeepContextPersistenceAdapter {
  load(projectId: string): Promise<DeepContextMemorySnapshot | null>
  save(projectId: string, snapshot: DeepContextMemorySnapshot): Promise<void>
}

export interface DeepContextMemorizeOptions {
  projectId?: string
  id?: string
  title?: string
  sourceRefs?: string[]
  evidenceRefs?: string[]
  importance?: number
  now?: string
  embedding?: number[]
}

export interface DeepContextRecallOptions {
  projectId?: string
  categories?: ContextCategory[]
  maxChunks?: number
  maxTokens?: number
  requireEvidence?: boolean
  includeHeld?: boolean
}

export interface DeepContextRecallResult {
  projectId: string
  query: string
  context: string
  chunks: ContextChunk[]
  heldChunks: ContextChunk[]
  estimatedTokens: number
  warnings: string[]
}

const DEFAULT_PROJECT_ID = 'default'
const DEFAULT_MAX_CHUNKS = 8
const DEFAULT_MAX_TOKENS = 6_000

function isoNow(now?: string): string {
  return now ?? new Date().toISOString()
}

function estimateTokens(content: string): number {
  return Math.max(1, Math.ceil(String(content || '').length / 4))
}

function normalizeTags(tags: string[]): string[] {
  return Array.from(new Set(tags.map((tag) => tag.trim().toLowerCase()).filter(Boolean))).slice(0, 48)
}

function normalizeRefs(refs: string[] | undefined, limit = 40): string[] {
  return Array.from(new Set((refs ?? []).map((ref) => ref.trim()).filter(Boolean))).slice(0, limit)
}

function clampImportance(value: number | undefined): number {
  if (!Number.isFinite(value)) return 0.5
  return Math.max(0, Math.min(1, Number(value)))
}

function queryTerms(query: string): string[] {
  return Array.from(
    new Set(
      query
        .toLowerCase()
        .split(/[^a-z0-9_-]+/i)
        .map((term) => term.trim())
        .filter((term) => term.length >= 3)
    )
  )
}

function chunkMatchesCategory(chunk: ContextChunk, categories?: ContextCategory[]): boolean {
  return !categories?.length || categories.includes(chunk.category)
}

function scoreChunk(chunk: ContextChunk, query: string): number {
  const terms = queryTerms(query)
  const haystack = `${chunk.title ?? ''} ${chunk.category} ${chunk.tags.join(' ')} ${chunk.content}`.toLowerCase()
  const tagMatches = terms.filter((term) => chunk.tags.some((tag) => tag.includes(term) || term.includes(tag))).length
  const contentMatches = terms.filter((term) => haystack.includes(term)).length
  const categoryMatch = terms.some((term) => chunk.category.includes(term)) ? 1 : 0
  const evidenceBonus = chunk.evidenceRefs.length > 0 ? 2 : 0
  const sourceBonus = chunk.sourceRefs.length > 0 ? 1 : 0

  return tagMatches * 10 + contentMatches * 4 + categoryMatch * 5 + evidenceBonus + sourceBonus + chunk.importance * 6
}

function createSnapshot(projectId: string, chunks: ContextChunk[], now?: string): DeepContextMemorySnapshot {
  return {
    version: 1,
    projectId,
    updatedAt: isoNow(now),
    chunks: chunks.slice().sort((a, b) => Date.parse(b.updatedAt) - Date.parse(a.updatedAt)),
  }
}

export class InMemoryDeepContextPersistenceAdapter implements DeepContextPersistenceAdapter {
  private snapshots = new Map<string, DeepContextMemorySnapshot>()

  async load(projectId: string): Promise<DeepContextMemorySnapshot | null> {
    const snapshot = this.snapshots.get(projectId)
    return snapshot ? { ...snapshot, chunks: snapshot.chunks.map((chunk) => ({ ...chunk })) } : null
  }

  async save(projectId: string, snapshot: DeepContextMemorySnapshot): Promise<void> {
    this.snapshots.set(projectId, { ...snapshot, chunks: snapshot.chunks.map((chunk) => ({ ...chunk })) })
  }
}

export class DeepContextManager {
  private memoryBank: Map<string, ContextChunk> = new Map()
  private projectId: string
  private adapter: DeepContextPersistenceAdapter
  private astWorker: Worker | null = null;
  private pendingAstTasks: Map<string, { resolve: (res: any) => void, reject: (err: any) => void }> = new Map();

  constructor(options: { projectId?: string; adapter?: DeepContextPersistenceAdapter } = {}) {
    this.projectId = options.projectId ?? DEFAULT_PROJECT_ID
    this.adapter = options.adapter ?? new InMemoryDeepContextPersistenceAdapter()
    
    // Initialize Web Worker for AST parsing (client-side only)
    if (typeof window !== 'undefined') {
      try {
        this.astWorker = new Worker(new URL('./tree-sitter-worker.ts', import.meta.url));
        this.astWorker.onmessage = (e) => {
          const { type, id, result, error } = e.data;
          const task = this.pendingAstTasks.get(id);
          if (task) {
            this.pendingAstTasks.delete(id);
            if (type.endsWith('_SUCCESS')) task.resolve(result);
            else task.reject(new Error(error));
          }
        };
        // Trigger init
        const initId = crypto.randomUUID();
        this.pendingAstTasks.set(initId, { resolve: () => log.info('AST Worker initialized'), reject: (err) => log.warn('AST Worker init failed', err) });
        this.astWorker.postMessage({ type: 'INIT', id: initId });
      } catch (err) {
        log.warn('Failed to start AST Worker', err);
      }
    }
  }

  async initialize(projectId: string = this.projectId): Promise<DeepContextMemorySnapshot> {
    this.projectId = projectId
    const snapshot = await this.adapter.load(projectId)
    this.memoryBank = new Map((snapshot?.chunks ?? []).map((chunk) => [chunk.id, chunk]))
    log.info('deep_context.initialized', {
      projectId,
      chunks: this.memoryBank.size,
      persisted: Boolean(snapshot),
    })
    return this.snapshot(projectId)
  }

  async memorize(
    category: ContextCategory,
    content: string,
    tags: string[],
    options: DeepContextMemorizeOptions = {}
  ): Promise<ContextChunk> {
    const projectId = options.projectId ?? this.projectId
    if (projectId !== this.projectId) await this.initialize(projectId)

    const now = isoNow(options.now)
    const id = options.id ?? crypto.randomUUID()
    const existing = this.memoryBank.get(id)
    const chunk: ContextChunk = {
      id,
      projectId,
      category,
      content,
      tags: normalizeTags(tags),
      title: options.title ?? existing?.title,
      sourceRefs: normalizeRefs(options.sourceRefs ?? existing?.sourceRefs),
      evidenceRefs: normalizeRefs(options.evidenceRefs ?? existing?.evidenceRefs),
      importance: clampImportance(options.importance ?? existing?.importance),
      tokenEstimate: estimateTokens(content),
      createdAt: existing?.createdAt ?? now,
      updatedAt: now,
      embedding: options.embedding ?? existing?.embedding,
    }

    // AST Enrichment via Worker
    if (this.astWorker && (category === 'code' || category === 'system')) {
      try {
        const taskId = crypto.randomUUID();
        const astPromise = new Promise<any>((resolve, reject) => {
          this.pendingAstTasks.set(taskId, { resolve, reject });
        });
        this.astWorker.postMessage({ type: 'PARSE', payload: { code: content }, id: taskId });
        const declarations = await astPromise;
        if (declarations && declarations.length > 0) {
           chunk.astDeclarations = declarations.map((d: any) => ({ type: d.type, name: d.name }));
           // Inject AST terms into tags automatically
           const astTags = declarations.map((d: any) => d.name);
           chunk.tags = normalizeTags([...chunk.tags, ...astTags]);
        }
      } catch (err) {
        log.warn('AST parsing failed for chunk', id, err);
      }
    }

    this.memoryBank.set(id, chunk)
    await this.persist(projectId)
    log.info('deep_context.memorized', {
      projectId,
      id,
      category,
      tags: chunk.tags.slice(0, 8),
      evidenceRefs: chunk.evidenceRefs.length,
      tokenEstimate: chunk.tokenEstimate,
    })
    return chunk
  }

  async recallRelevantChunks(query: string, options: DeepContextRecallOptions = {}): Promise<DeepContextRecallResult> {
    const projectId = options.projectId ?? this.projectId
    if (projectId !== this.projectId) await this.initialize(projectId)

    const maxChunks = Math.max(1, options.maxChunks ?? DEFAULT_MAX_CHUNKS)
    const maxTokens = Math.max(256, options.maxTokens ?? DEFAULT_MAX_TOKENS)
    const warnings: string[] = []
    const ranked = Array.from(this.memoryBank.values())
      .filter((chunk) => chunk.projectId === projectId)
      .filter((chunk) => chunkMatchesCategory(chunk, options.categories))
      .map((chunk) => ({ chunk, score: scoreChunk(chunk, query) }))
      .filter((entry) => entry.score > 0 || query.trim().length === 0)
      .sort((a, b) => b.score - a.score || b.chunk.importance - a.chunk.importance || Date.parse(b.chunk.updatedAt) - Date.parse(a.chunk.updatedAt))

    const chunks: ContextChunk[] = []
    const heldChunks: ContextChunk[] = []
    let estimatedTokens = 0

    for (const { chunk } of ranked) {
      if (options.requireEvidence && chunk.evidenceRefs.length === 0) {
        heldChunks.push(chunk)
        continue
      }
      if (chunks.length >= maxChunks) {
        heldChunks.push(chunk)
        continue
      }
      if (estimatedTokens + chunk.tokenEstimate > maxTokens && chunks.length > 0) {
        heldChunks.push(chunk)
        continue
      }
      chunks.push(chunk)
      estimatedTokens += chunk.tokenEstimate
    }

    if (heldChunks.length > 0) warnings.push(`${heldChunks.length} chunks held by evidence, chunk, or token budget constraints.`)
    if (estimatedTokens > maxTokens) warnings.push(`Estimated context ${estimatedTokens} exceeds requested budget ${maxTokens}.`)

    const visibleHeld = options.includeHeld ? heldChunks : []
    const context = chunks
      .map((chunk) => {
        const refs = [...chunk.sourceRefs.map((ref) => `source:${ref}`), ...chunk.evidenceRefs.map((ref) => `evidence:${ref}`)]
        return [
          `### ${chunk.title ?? `${chunk.category}:${chunk.id}`}`,
          `category=${chunk.category}; tags=${chunk.tags.join(', ') || 'none'}; tokens=${chunk.tokenEstimate}`,
          refs.length ? `refs=${refs.join('; ')}` : 'refs=none',
          chunk.content,
        ].join('\n')
      })
      .join('\n\n')

    return {
      projectId,
      query,
      context,
      chunks,
      heldChunks: visibleHeld,
      estimatedTokens,
      warnings,
    }
  }

  async recallRelevantContext(query: string, options: DeepContextRecallOptions = {}): Promise<string> {
    return (await this.recallRelevantChunks(query, options)).context
  }

  async getSnapshotForAgent(options: DeepContextRecallOptions = {}): Promise<string> {
    const rules = await this.recallRelevantChunks('world rules physics magic constraints', {
      ...options,
      categories: options.categories ?? ['rules', 'world', 'system'],
      maxTokens: Math.min(options.maxTokens ?? DEFAULT_MAX_TOKENS, 3_000),
    })
    const status = await this.recallRelevantChunks('current story status scene gameplay character decision', {
      ...options,
      categories: options.categories ?? ['story', 'scene', 'gameplay', 'character', 'decision'],
      maxTokens: Math.min(options.maxTokens ?? DEFAULT_MAX_TOKENS, 3_000),
    })

    return [
      'ACTIVE WORLD RULES:',
      rules.context || 'No approved world rules recalled.',
      '',
      'CURRENT STORY / GAMEPLAY STATUS:',
      status.context || 'No approved story/gameplay status recalled.',
      '',
      'CONTEXT WARNINGS:',
      [...rules.warnings, ...status.warnings].join('\n') || 'none',
    ].join('\n')
  }

  snapshot(projectId: string = this.projectId): DeepContextMemorySnapshot {
    return createSnapshot(
      projectId,
      Array.from(this.memoryBank.values()).filter((chunk) => chunk.projectId === projectId)
    )
  }

  private async persist(projectId: string): Promise<void> {
    await this.adapter.save(projectId, this.snapshot(projectId))
  }
}

export const deepContext = new DeepContextManager()
