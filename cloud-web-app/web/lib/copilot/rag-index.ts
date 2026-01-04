'use client'

/**
 * Codebase Indexing & RAG (Retrieval-Augmented Generation) System
 * 
 * Like Cursor/GitHub Copilot - indexes codebase for intelligent context retrieval
 * 
 * Features:
 * - File indexing with embeddings
 * - Semantic code search
 * - Context retrieval for AI chat
 * - Incremental updates
 * - Symbol extraction
 */

// ============= Types =============

export interface CodeChunk {
  id: string
  filePath: string
  content: string
  type: 'function' | 'class' | 'interface' | 'variable' | 'import' | 'comment' | 'other'
  name?: string
  startLine: number
  endLine: number
  language: string
  embedding?: number[]
  metadata: {
    exported?: boolean
    async?: boolean
    params?: string[]
    returnType?: string
    extends?: string
    implements?: string[]
  }
}

export interface IndexedFile {
  path: string
  language: string
  lastModified: number
  size: number
  chunks: CodeChunk[]
  imports: string[]
  exports: string[]
}

export interface SearchResult {
  chunk: CodeChunk
  score: number
  context: string
}

export interface IndexStats {
  totalFiles: number
  totalChunks: number
  totalTokens: number
  lastIndexed: Date
  languages: Record<string, number>
}

// ============= Embedding Provider =============

interface EmbeddingProvider {
  embed(texts: string[]): Promise<number[][]>
  embeddingDimension: number
}

class OpenAIEmbeddingProvider implements EmbeddingProvider {
  embeddingDimension = 1536
  private apiKey: string
  
  constructor(apiKey: string) {
    this.apiKey = apiKey
  }
  
  async embed(texts: string[]): Promise<number[][]> {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: texts,
      }),
    })
    
    const data = await response.json()
    return data.data.map((d: any) => d.embedding)
  }
}

class LocalEmbeddingProvider implements EmbeddingProvider {
  embeddingDimension = 384
  
  async embed(texts: string[]): Promise<number[][]> {
    // Simple bag-of-words style embedding for local/offline use
    // In production, use something like ONNX runtime with a small model
    return texts.map(text => {
      const words = text.toLowerCase().split(/\W+/).filter(w => w.length > 2)
      const embedding = new Array(this.embeddingDimension).fill(0)
      
      words.forEach((word, i) => {
        const hash = this.simpleHash(word)
        const idx = Math.abs(hash) % this.embeddingDimension
        embedding[idx] += 1 / Math.sqrt(words.length)
      })
      
      // Normalize
      const norm = Math.sqrt(embedding.reduce((sum, v) => sum + v * v, 0)) || 1
      return embedding.map(v => v / norm)
    })
  }
  
  private simpleHash(str: string): number {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
      const char = str.charCodeAt(i)
      hash = ((hash << 5) - hash) + char
      hash = hash & hash
    }
    return hash
  }
}

// ============= Vector Store =============

class VectorStore {
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

class CodeParser {
  parseFile(content: string, filePath: string, language: string): CodeChunk[] {
    const chunks: CodeChunk[] = []
    const lines = content.split('\n')
    
    switch (language) {
      case 'typescript':
      case 'javascript':
        return this.parseTypeScript(content, filePath, language)
      case 'python':
        return this.parsePython(content, filePath)
      default:
        return this.parseGeneric(content, filePath, language)
    }
  }
  
  private parseTypeScript(content: string, filePath: string, language: string): CodeChunk[] {
    const chunks: CodeChunk[] = []
    const lines = content.split('\n')
    
    // Regex patterns for TypeScript/JavaScript
    const patterns = {
      function: /^(?:export\s+)?(?:async\s+)?function\s+(\w+)/,
      arrowFunction: /^(?:export\s+)?(?:const|let|var)\s+(\w+)\s*=\s*(?:async\s+)?\([^)]*\)\s*(?::\s*[^=]+)?\s*=>/,
      class: /^(?:export\s+)?(?:abstract\s+)?class\s+(\w+)/,
      interface: /^(?:export\s+)?interface\s+(\w+)/,
      type: /^(?:export\s+)?type\s+(\w+)/,
      import: /^import\s+/,
      export: /^export\s+/,
    }
    
    let currentChunk: (Partial<CodeChunk> & { content: string }) | null = null
    let braceCount = 0
    let chunkStartLine = 0
    
    lines.forEach((line, lineIndex) => {
      const trimmedLine = line.trim()
      
      // Check for new chunk start
      if (!currentChunk) {
        for (const [type, pattern] of Object.entries(patterns)) {
          const match = trimmedLine.match(pattern)
          if (match) {
            currentChunk = {
              id: `${filePath}:${lineIndex}`,
              filePath,
              type: type as CodeChunk['type'],
              name: match[1],
              startLine: lineIndex + 1,
              language,
              content: '',
              metadata: {
                exported: trimmedLine.startsWith('export'),
                async: trimmedLine.includes('async'),
              },
            }
            chunkStartLine = lineIndex
            braceCount = 0
            break
          }
        }
      }
      
      // Track braces for function/class/interface boundaries
      if (currentChunk) {
        currentChunk.content += line + '\n'
        braceCount += (line.match(/{/g) || []).length
        braceCount -= (line.match(/}/g) || []).length
        
        // Check if chunk is complete
        const isImport = currentChunk.type === 'import'
        const isComplete = isImport 
          ? !line.endsWith(',') && (line.includes(';') || line.includes('from'))
          : braceCount === 0 && lineIndex > chunkStartLine
        
        if (isComplete && currentChunk.content.trim()) {
          const chunk = currentChunk
          chunks.push({
            ...chunk,
            endLine: lineIndex + 1,
            content: chunk.content.trim(),
          } as CodeChunk)
          currentChunk = null
        }
      }
    })
    
    // Handle remaining chunk - type assertion needed after forEach mutation
    const remainingChunk = currentChunk as (Partial<CodeChunk> & { content: string }) | null
    if (remainingChunk) {
      if (remainingChunk.content) {
        chunks.push({
          ...remainingChunk,
          endLine: lines.length,
          content: remainingChunk.content.trim(),
        } as CodeChunk)
      }
    }
    
    return chunks
  }
  
  private parsePython(content: string, filePath: string): CodeChunk[] {
    const chunks: CodeChunk[] = []
    const lines = content.split('\n')
    
    const patterns = {
      function: /^(?:async\s+)?def\s+(\w+)/,
      class: /^class\s+(\w+)/,
      import: /^(?:from\s+\S+\s+)?import\s+/,
    }
    
    let currentChunk: (Partial<CodeChunk> & { content: string }) | null = null
    let chunkIndent = 0
    
    lines.forEach((line, lineIndex) => {
      const trimmedLine = line.trim()
      const currentIndent = line.length - line.trimStart().length
      
      // Check for new chunk
      if (trimmedLine && !trimmedLine.startsWith('#')) {
        for (const [type, pattern] of Object.entries(patterns)) {
          const match = trimmedLine.match(pattern)
          if (match) {
            // Save previous chunk
            if (currentChunk && currentChunk.content) {
              chunks.push({
                ...currentChunk,
                endLine: lineIndex,
                content: currentChunk.content.trim(),
              } as CodeChunk)
            }
            
            currentChunk = {
              id: `${filePath}:${lineIndex}`,
              filePath,
              type: type as CodeChunk['type'],
              name: match[1],
              startLine: lineIndex + 1,
              language: 'python',
              content: '',
              metadata: {
                async: trimmedLine.startsWith('async'),
              },
            }
            chunkIndent = currentIndent
            break
          }
        }
      }
      
      // Add line to current chunk
      if (currentChunk) {
        // Check if we've dedented (chunk complete)
        if (trimmedLine && currentIndent <= chunkIndent && lineIndex > (currentChunk.startLine || 0)) {
          const chunk = currentChunk
          chunks.push({
            ...chunk,
            endLine: lineIndex,
            content: chunk.content.trim(),
          } as CodeChunk)
          currentChunk = null
        } else {
          currentChunk.content += line + '\n'
        }
      }
    })
    
    // Handle remaining chunk - type assertion needed after forEach mutation
    const remainingChunk = currentChunk as (Partial<CodeChunk> & { content: string }) | null
    if (remainingChunk) {
      if (remainingChunk.content) {
        chunks.push({
          ...remainingChunk,
          endLine: lines.length,
          content: remainingChunk.content.trim(),
        } as CodeChunk)
      }
    }
    
    return chunks
  }
  
  private parseGeneric(content: string, filePath: string, language: string): CodeChunk[] {
    // Simple chunking by lines for unknown languages
    const CHUNK_SIZE = 50 // lines
    const chunks: CodeChunk[] = []
    const lines = content.split('\n')
    
    for (let i = 0; i < lines.length; i += CHUNK_SIZE) {
      const chunkLines = lines.slice(i, i + CHUNK_SIZE)
      chunks.push({
        id: `${filePath}:${i}`,
        filePath,
        type: 'other',
        startLine: i + 1,
        endLine: Math.min(i + CHUNK_SIZE, lines.length),
        language,
        content: chunkLines.join('\n'),
        metadata: {},
      })
    }
    
    return chunks
  }
}

// ============= Main RAG Index Class =============

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

import { useState, useEffect, useCallback, useRef } from 'react'

export function useRAGIndex(options: {
  embeddingProvider?: 'openai' | 'local'
  openAIKey?: string
} = {}) {
  const indexRef = useRef<RAGIndex | null>(null)
  const [stats, setStats] = useState<IndexStats | null>(null)
  const [isIndexing, setIsIndexing] = useState(false)
  
  // Initialize index
  useEffect(() => {
    indexRef.current = new RAGIndex(options)
  }, [])
  
  // Index files
  const indexFiles = useCallback(async (files: Array<{ path: string; content: string; language: string }>) => {
    if (!indexRef.current) return
    
    setIsIndexing(true)
    try {
      await indexRef.current.indexFiles(files)
      setStats(indexRef.current.getStats())
    } finally {
      setIsIndexing(false)
    }
  }, [])
  
  // Search
  const search = useCallback(async (query: string, options?: Parameters<RAGIndex['search']>[1]) => {
    if (!indexRef.current) return []
    return indexRef.current.search(query, options)
  }, [])
  
  // Build context
  const buildContext = useCallback(async (query: string, maxTokens?: number) => {
    if (!indexRef.current) return ''
    return indexRef.current.buildContextForQuery(query, maxTokens)
  }, [])
  
  // Update file
  const updateFile = useCallback(async (path: string, content: string, language: string) => {
    if (!indexRef.current) return
    await indexRef.current.updateFile(path, content, language)
    setStats(indexRef.current.getStats())
  }, [])
  
  // Remove file
  const removeFile = useCallback((path: string) => {
    if (!indexRef.current) return
    indexRef.current.removeFile(path)
    setStats(indexRef.current.getStats())
  }, [])
  
  // Clear index
  const clearIndex = useCallback(() => {
    if (!indexRef.current) return
    indexRef.current.clear()
    setStats(null)
  }, [])
  
  return {
    indexFiles,
    search,
    buildContext,
    updateFile,
    removeFile,
    clearIndex,
    stats,
    isIndexing,
  }
}

export default RAGIndex
