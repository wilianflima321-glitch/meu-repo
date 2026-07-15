'use client'

/** Canonical Codebase Indexing & RAG orchestration API. */

import { CodeParser } from './rag-parser'
import { LocalEmbeddingProvider, OpenAIEmbeddingProvider } from './rag-embeddings'
import { VectorStore } from './rag-vector-store'
import type { CodeChunk, EmbeddingProvider, IndexedFile, IndexStats, SearchResult } from './rag-types'
export type { CodeChunk, EmbeddingProvider, IndexedFile, IndexStats, SearchResult } from './rag-types'

export class RAGIndex {
  private indexedFiles: Map<string, IndexedFile> = new Map()
  private vectorStore: VectorStore
  private embeddingProvider: EmbeddingProvider
  private parser: CodeParser
  private indexing: boolean = false
  
  constructor(options: {
    embeddingProvider?: 'openai' | 'local'
    openAIKey?: string
  } = {}) {
    this.vectorStore = new VectorStore()
    this.parser = new CodeParser()
    
    if (options.embeddingProvider === 'openai' && options.openAIKey) {
      this.embeddingProvider = new OpenAIEmbeddingProvider(options.openAIKey)
    } else {
      this.embeddingProvider = new LocalEmbeddingProvider()
    }
  }
  
  /**
   * Index a single file
   */
  async indexFile(filePath: string, content: string, language: string): Promise<void> {
    // Parse file into chunks
    const chunks = this.parser.parseFile(content, filePath, language)
    
    // Get embeddings for all chunks
    const texts = chunks.map(c => `${c.name || ''}\n${c.content}`)
    const embeddings = await this.embeddingProvider.embed(texts)
    
    // Add to vector store
    chunks.forEach((chunk, i) => {
      chunk.embedding = embeddings[i]
      this.vectorStore.add(chunk.id, embeddings[i], chunk)
    })
    
    // Store indexed file info
    this.indexedFiles.set(filePath, {
      path: filePath,
      language,
      lastModified: Date.now(),
      size: content.length,
      chunks,
      imports: chunks.filter(c => c.type === 'import').map(c => c.content),
      exports: chunks.filter(c => c.metadata.exported).map(c => c.name || '').filter(Boolean),
    })
  }
  
  /**
   * Index multiple files
   */
  async indexFiles(files: Array<{ path: string; content: string; language: string }>): Promise<void> {
    this.indexing = true
    
    const BATCH_SIZE = 10
    for (let i = 0; i < files.length; i += BATCH_SIZE) {
      const batch = files.slice(i, i + BATCH_SIZE)
      await Promise.all(batch.map(f => this.indexFile(f.path, f.content, f.language)))
    }
    
    this.indexing = false
  }
  
  /**
   * Update a file (remove old chunks, add new ones)
   */
  async updateFile(filePath: string, content: string, language: string): Promise<void> {
    // Remove old chunks
    const existingFile = this.indexedFiles.get(filePath)
    if (existingFile) {
      existingFile.chunks.forEach(chunk => {
        this.vectorStore.remove(chunk.id)
      })
    }
    
    // Index new content
    await this.indexFile(filePath, content, language)
  }
  
  /**
   * Remove a file from index
   */
  removeFile(filePath: string): void {
    const file = this.indexedFiles.get(filePath)
    if (file) {
      file.chunks.forEach(chunk => {
        this.vectorStore.remove(chunk.id)
      })
      this.indexedFiles.delete(filePath)
    }
  }
  
  /**
   * Semantic search across codebase
   */
  async search(query: string, options: {
    topK?: number
    fileFilter?: string[]
    typeFilter?: CodeChunk['type'][]
    minScore?: number
  } = {}): Promise<SearchResult[]> {
    const { topK = 10, fileFilter, typeFilter, minScore = 0.5 } = options
    
    // Get query embedding
    const [queryEmbedding] = await this.embeddingProvider.embed([query])
    
    // Search vector store
    let results = this.vectorStore.search(queryEmbedding, topK * 2)
    
    // Apply filters
    if (fileFilter && fileFilter.length > 0) {
      results = results.filter(r => 
        fileFilter.some(f => r.chunk.filePath.includes(f))
      )
    }
    
    if (typeFilter && typeFilter.length > 0) {
      results = results.filter(r => typeFilter.includes(r.chunk.type))
    }
    
    results = results.filter(r => r.score >= minScore)
    
    return results.slice(0, topK)
  }
  
  /**
   * Get context for a specific file and line
   */
  getContextAt(filePath: string, line: number): CodeChunk | null {
    const file = this.indexedFiles.get(filePath)
    if (!file) return null
    
    return file.chunks.find(c => 
      c.startLine <= line && c.endLine >= line
    ) || null
  }
  
  /**
   * Build context string for AI chat
   */
  async buildContextForQuery(query: string, maxTokens: number = 4000): Promise<string> {
    const results = await this.search(query, { topK: 10 })
    
    let context = ''
    let tokenCount = 0
    const avgCharsPerToken = 4
    
    for (const result of results) {
      const chunkText = result.context
      const estimatedTokens = Math.ceil(chunkText.length / avgCharsPerToken)
      
      if (tokenCount + estimatedTokens > maxTokens) break
      
      context += chunkText + '\n\n---\n\n'
      tokenCount += estimatedTokens
    }
    
    return context
  }
  
  /**
   * Get index statistics
   */
  getStats(): IndexStats {
    const languages: Record<string, number> = {}
    let totalChunks = 0
    let totalTokens = 0
    
    this.indexedFiles.forEach(file => {
      languages[file.language] = (languages[file.language] || 0) + 1
      totalChunks += file.chunks.length
      totalTokens += Math.ceil(file.size / 4) // rough estimate
    })
    
    return {
      totalFiles: this.indexedFiles.size,
      totalChunks,
      totalTokens,
      lastIndexed: new Date(),
      languages,
    }
  }
  
  /**
   * Check if currently indexing
   */
  isIndexing(): boolean {
    return this.indexing
  }
  
  /**
   * Clear entire index
   */
  clear(): void {
    this.vectorStore.clear()
    this.indexedFiles.clear()
  }
  
  /**
   * Serialize index for persistence
   */
  serialize(): string {
    return JSON.stringify({
      files: Array.from(this.indexedFiles.entries()),
      vectors: this.vectorStore.serialize(),
    })
  }
  
  /**
   * Deserialize index from storage
   */
  deserialize(data: string): void {
    const parsed = JSON.parse(data)
    this.indexedFiles = new Map(parsed.files)
    this.vectorStore.deserialize(parsed.vectors)
  }
}

// ============= React Hook for RAG =============

export { useRAGIndex } from './rag-hook'

export default RAGIndex
