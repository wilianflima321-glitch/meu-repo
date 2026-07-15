import { describe, expect, it } from 'vitest'
import { RAGIndex } from '@/lib/copilot/rag-index'
import { LocalEmbeddingProvider } from '@/lib/copilot/rag-embeddings'
import { CodeParser } from '@/lib/copilot/rag-parser'
import { VectorStore } from '@/lib/copilot/rag-vector-store'
import type { CodeChunk } from '@/lib/copilot/rag-types'

describe('RAG index runtime spine', () => {
  it('parses TypeScript symbols into chunks', () => {
    const parser = new CodeParser()
    const chunks = parser.parseFile(
      `import { x } from './x'\nexport async function runTask(input: string) {\n  return input.toUpperCase()\n}\nexport interface RunOptions {\n  dryRun: boolean\n}`,
      'src/run.ts',
      'typescript',
    )

    expect(chunks.some((chunk) => chunk.type === 'import')).toBe(true)
    expect(chunks.some((chunk) => chunk.type === 'function' && chunk.name === 'runTask')).toBe(true)
    expect(chunks.some((chunk) => chunk.type === 'interface' && chunk.name === 'RunOptions')).toBe(true)
  })

  it('stores vectors and returns contextual search results', async () => {
    const embedder = new LocalEmbeddingProvider()
    const [embedding] = await embedder.embed(['render queue evidence'])
    const chunk: CodeChunk = {
      id: 'chunk-1',
      filePath: 'src/render.ts',
      content: 'export function renderQueueEvidence() {}',
      type: 'function',
      name: 'renderQueueEvidence',
      startLine: 1,
      endLine: 1,
      language: 'typescript',
      metadata: { exported: true },
    }
    const store = new VectorStore()

    store.add(chunk.id, embedding, chunk)
    const results = store.search(embedding, 1)

    expect(results).toHaveLength(1)
    expect(results[0].chunk.name).toBe('renderQueueEvidence')
    expect(results[0].context).toContain('src/render.ts')
  })

  it('indexes files and builds bounded context for local search', async () => {
    const index = new RAGIndex({ embeddingProvider: 'local' })

    await index.indexFile(
      'src/copilot/context.ts',
      `export function buildContextPack() {\n  return 'governed evidence context'\n}`,
      'typescript',
    )

    const results = await index.search('governed evidence context', { topK: 1, minScore: 0 })
    const context = await index.buildContextForQuery('governed evidence context', 200)

    expect(results[0].chunk.filePath).toBe('src/copilot/context.ts')
    expect(context).toContain('buildContextPack')
    expect(index.getStats().totalFiles).toBe(1)
  })
})
