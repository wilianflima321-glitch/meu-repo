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

export interface EmbeddingProvider {
  embed(texts: string[]): Promise<number[][]>
  embeddingDimension: number
}
