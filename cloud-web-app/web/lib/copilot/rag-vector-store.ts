import type { CodeChunk, SearchResult } from './rag-types'

export class VectorStore {
  private vectors: Map<string, { embedding: number[]; chunk: CodeChunk }> = new Map()
  
  add(id: string, embedding: number[], chunk: CodeChunk) {
    this.vectors.set(id, { embedding, chunk })
  }
  
  remove(id: string) {
    this.vectors.delete(id)
  }
  
  search(queryEmbedding: number[], topK: number = 10): SearchResult[] {
    const results: Array<{ id: string; score: number; chunk: CodeChunk }> = []
    
    this.vectors.forEach(({ embedding, chunk }, id) => {
      const score = this.cosineSimilarity(queryEmbedding, embedding)
      results.push({ id, score, chunk })
    })
    
    results.sort((a, b) => b.score - a.score)
    
    return results.slice(0, topK).map(r => ({
      chunk: r.chunk,
      score: r.score,
      context: this.buildContext(r.chunk),
    }))
  }
  
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0
    
    let dotProduct = 0
    let normA = 0
    let normB = 0
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i]
      normA += a[i] * a[i]
      normB += b[i] * b[i]
    }
    
    const denominator = Math.sqrt(normA) * Math.sqrt(normB)
    return denominator === 0 ? 0 : dotProduct / denominator
  }
  
  private buildContext(chunk: CodeChunk): string {
    return `// File: ${chunk.filePath} (${chunk.type}${chunk.name ? `: ${chunk.name}` : ''})
// Lines ${chunk.startLine}-${chunk.endLine}

${chunk.content}`
  }
  
  get size(): number {
    return this.vectors.size
  }
  
  clear() {
    this.vectors.clear()
  }
  
  serialize(): string {
    const data: Array<{ id: string; embedding: number[]; chunk: CodeChunk }> = []
    this.vectors.forEach((value, key) => {
      data.push({ id: key, ...value })
    })
    return JSON.stringify(data)
  }
  
  deserialize(data: string) {
    const parsed = JSON.parse(data)
    this.vectors.clear()
    parsed.forEach((item: { id: string; embedding: number[]; chunk: CodeChunk }) => {
      this.vectors.set(item.id, { embedding: item.embedding, chunk: item.chunk })
    })
  }
}

// ============= Code Parser =============
