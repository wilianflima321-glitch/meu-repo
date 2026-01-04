/**
 * Aethel RAG Vector Store
 * 
 * Sistema de indexação vetorial para RAG (Retrieval Augmented Generation)
 * usando embeddings para busca semântica de código e documentação.
 * 
 * Features:
 * - Indexação de código por embeddings
 * - Busca semântica híbrida (vector + keyword)
 * - Cache de embeddings
 * - Suporte a múltiplos modelos de embedding
 */

// ============================================================================
// TYPES
// ============================================================================

export interface VectorDocument {
  id: string;
  content: string;
  metadata: {
    filePath?: string;
    language?: string;
    type: 'code' | 'doc' | 'comment' | 'function' | 'class' | 'interface' | 'module' | 'variable' | 'type';
    startLine?: number;
    endLine?: number;
    symbols?: string[];
    imports?: string[];
    exports?: string[];
    projectId?: string;
  };
  embedding?: number[];
}

export interface SearchResult {
  document: VectorDocument;
  score: number;
  matchType: 'semantic' | 'keyword' | 'hybrid';
}

export interface VectorStoreConfig {
  embeddingModel: 'openai' | 'voyage' | 'cohere' | 'local';
  embeddingDimensions: number;
  similarityThreshold: number;
  maxResults: number;
  hybridWeight: number; // 0 = pure keyword, 1 = pure semantic
}

// ============================================================================
// EMBEDDING PROVIDERS
// ============================================================================

interface EmbeddingProvider {
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
  dimensions: number;
}

class OpenAIEmbeddings implements EmbeddingProvider {
  dimensions = 1536; // text-embedding-3-small
  
  async embed(text: string): Promise<number[]> {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text,
      }),
    });
    
    const data = await response.json();
    return data.data[0].embedding;
  }
  
  async embedBatch(texts: string[]): Promise<number[][]> {
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: texts,
      }),
    });
    
    const data = await response.json();
    return data.data.map((d: any) => d.embedding);
  }
}

class VoyageEmbeddings implements EmbeddingProvider {
  dimensions = 1024; // voyage-code-2
  
  async embed(text: string): Promise<number[]> {
    const response = await fetch('https://api.voyageai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.VOYAGE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'voyage-code-2',
        input: text,
      }),
    });
    
    const data = await response.json();
    return data.data[0].embedding;
  }
  
  async embedBatch(texts: string[]): Promise<number[][]> {
    const response = await fetch('https://api.voyageai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${process.env.VOYAGE_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: 'voyage-code-2',
        input: texts,
      }),
    });
    
    const data = await response.json();
    return data.data.map((d: any) => d.embedding);
  }
}

class LocalEmbeddings implements EmbeddingProvider {
  dimensions = 384; // Simple local model
  
  // Simple TF-IDF-like embedding for fallback
  async embed(text: string): Promise<number[]> {
    const tokens = this.tokenize(text);
    const vector = new Array(this.dimensions).fill(0);
    
    tokens.forEach((token, idx) => {
      const hash = this.hashToken(token);
      const position = hash % this.dimensions;
      vector[position] += 1 / (idx + 1); // Position weighting
    });
    
    // Normalize
    const magnitude = Math.sqrt(vector.reduce((sum, v) => sum + v * v, 0));
    return vector.map(v => v / (magnitude || 1));
  }
  
  async embedBatch(texts: string[]): Promise<number[][]> {
    return Promise.all(texts.map(t => this.embed(t)));
  }
  
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 2);
  }
  
  private hashToken(token: string): number {
    let hash = 0;
    for (let i = 0; i < token.length; i++) {
      hash = ((hash << 5) - hash) + token.charCodeAt(i);
      hash = hash & hash;
    }
    return Math.abs(hash);
  }
}

// ============================================================================
// VECTOR STORE
// ============================================================================

export class VectorStore {
  private documents: Map<string, VectorDocument> = new Map();
  private embeddings: Map<string, number[]> = new Map();
  private provider: EmbeddingProvider;
  private config: VectorStoreConfig;
  
  // Inverted index for keyword search
  private invertedIndex: Map<string, Set<string>> = new Map();
  
  constructor(config: Partial<VectorStoreConfig> = {}) {
    this.config = {
      embeddingModel: config.embeddingModel || 'local',
      embeddingDimensions: config.embeddingDimensions || 384,
      similarityThreshold: config.similarityThreshold || 0.5,
      maxResults: config.maxResults || 10,
      hybridWeight: config.hybridWeight || 0.7,
    };
    
    this.provider = this.createProvider();
  }
  
  private createProvider(): EmbeddingProvider {
    switch (this.config.embeddingModel) {
      case 'openai':
        if (process.env.OPENAI_API_KEY) {
          return new OpenAIEmbeddings();
        }
        console.warn('OpenAI API key not found, falling back to local embeddings');
        return new LocalEmbeddings();
        
      case 'voyage':
        if (process.env.VOYAGE_API_KEY) {
          return new VoyageEmbeddings();
        }
        console.warn('Voyage API key not found, falling back to local embeddings');
        return new LocalEmbeddings();
        
      default:
        return new LocalEmbeddings();
    }
  }
  
  /**
   * Indexa um documento
   */
  async index(doc: VectorDocument): Promise<void> {
    // Generate embedding
    const embedding = await this.provider.embed(doc.content);
    
    // Store document and embedding
    this.documents.set(doc.id, doc);
    this.embeddings.set(doc.id, embedding);
    
    // Update inverted index
    this.indexKeywords(doc);
  }
  
  /**
   * Indexa múltiplos documentos em batch
   */
  async indexBatch(docs: VectorDocument[]): Promise<void> {
    const contents = docs.map(d => d.content);
    const embeddings = await this.provider.embedBatch(contents);
    
    docs.forEach((doc, idx) => {
      this.documents.set(doc.id, doc);
      this.embeddings.set(doc.id, embeddings[idx]);
      this.indexKeywords(doc);
    });
  }
  
  /**
   * Busca híbrida (semantic + keyword)
   */
  async search(query: string, options?: Partial<VectorStoreConfig>): Promise<SearchResult[]> {
    const opts = { ...this.config, ...options };
    
    // Semantic search
    const semanticResults = await this.semanticSearch(query, opts);
    
    // Keyword search
    const keywordResults = this.keywordSearch(query, opts);
    
    // Merge results with hybrid scoring
    const mergedResults = this.mergeResults(
      semanticResults,
      keywordResults,
      opts.hybridWeight
    );
    
    return mergedResults.slice(0, opts.maxResults);
  }
  
  /**
   * Busca semântica por embeddings
   */
  private async semanticSearch(
    query: string,
    opts: VectorStoreConfig
  ): Promise<SearchResult[]> {
    const queryEmbedding = await this.provider.embed(query);
    const results: SearchResult[] = [];
    
    this.embeddings.forEach((embedding, id) => {
      const score = this.cosineSimilarity(queryEmbedding, embedding);
      
      if (score >= opts.similarityThreshold) {
        const doc = this.documents.get(id);
        if (doc) {
          results.push({
            document: doc,
            score,
            matchType: 'semantic',
          });
        }
      }
    });
    
    return results.sort((a, b) => b.score - a.score);
  }
  
  /**
   * Busca por keywords usando inverted index
   */
  private keywordSearch(
    query: string,
    opts: VectorStoreConfig
  ): SearchResult[] {
    const queryTokens = this.tokenize(query);
    const docScores: Map<string, number> = new Map();
    
    queryTokens.forEach(token => {
      const docIds = this.invertedIndex.get(token);
      if (docIds) {
        docIds.forEach(id => {
          docScores.set(id, (docScores.get(id) || 0) + 1);
        });
      }
    });
    
    const results: SearchResult[] = [];
    
    docScores.forEach((count, id) => {
      const doc = this.documents.get(id);
      if (doc) {
        // Normalize score by query length
        const score = count / queryTokens.length;
        results.push({
          document: doc,
          score,
          matchType: 'keyword',
        });
      }
    });
    
    return results.sort((a, b) => b.score - a.score);
  }
  
  /**
   * Merge e reranking de resultados
   */
  private mergeResults(
    semantic: SearchResult[],
    keyword: SearchResult[],
    hybridWeight: number
  ): SearchResult[] {
    const combined: Map<string, SearchResult> = new Map();
    
    // Add semantic results
    semantic.forEach(r => {
      combined.set(r.document.id, {
        ...r,
        score: r.score * hybridWeight,
        matchType: 'hybrid',
      });
    });
    
    // Add/merge keyword results
    keyword.forEach(r => {
      const existing = combined.get(r.document.id);
      if (existing) {
        existing.score += r.score * (1 - hybridWeight);
      } else {
        combined.set(r.document.id, {
          ...r,
          score: r.score * (1 - hybridWeight),
          matchType: 'hybrid',
        });
      }
    });
    
    return Array.from(combined.values()).sort((a, b) => b.score - a.score);
  }
  
  /**
   * Indexa keywords para busca
   */
  private indexKeywords(doc: VectorDocument): void {
    const tokens = this.tokenize(doc.content);
    
    // Add symbols
    if (doc.metadata.symbols) {
      tokens.push(...doc.metadata.symbols.map(s => s.toLowerCase()));
    }
    
    tokens.forEach(token => {
      if (!this.invertedIndex.has(token)) {
        this.invertedIndex.set(token, new Set());
      }
      this.invertedIndex.get(token)!.add(doc.id);
    });
  }
  
  /**
   * Tokenização simples
   */
  private tokenize(text: string): string[] {
    return text
      .toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(t => t.length > 2);
  }
  
  /**
   * Cossine similarity entre dois vetores
   */
  private cosineSimilarity(a: number[], b: number[]): number {
    if (a.length !== b.length) return 0;
    
    let dotProduct = 0;
    let normA = 0;
    let normB = 0;
    
    for (let i = 0; i < a.length; i++) {
      dotProduct += a[i] * b[i];
      normA += a[i] * a[i];
      normB += b[i] * b[i];
    }
    
    const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
    return magnitude === 0 ? 0 : dotProduct / magnitude;
  }
  
  /**
   * Remove documento do índice
   */
  delete(id: string): void {
    const doc = this.documents.get(id);
    
    if (doc) {
      // Remove from keyword index
      const tokens = this.tokenize(doc.content);
      tokens.forEach(token => {
        this.invertedIndex.get(token)?.delete(id);
      });
    }
    
    this.documents.delete(id);
    this.embeddings.delete(id);
  }
  
  /**
   * Limpa todo o índice
   */
  clear(): void {
    this.documents.clear();
    this.embeddings.clear();
    this.invertedIndex.clear();
  }
  
  /**
   * Retorna estatísticas do índice
   */
  stats(): {
    documentCount: number;
    tokenCount: number;
    embeddingDimensions: number;
  } {
    return {
      documentCount: this.documents.size,
      tokenCount: this.invertedIndex.size,
      embeddingDimensions: this.provider.dimensions,
    };
  }
}

// ============================================================================
// CODE INDEXER
// ============================================================================

export class CodeIndexer {
  private vectorStore: VectorStore;
  
  constructor(config?: Partial<VectorStoreConfig>) {
    this.vectorStore = new VectorStore(config);
  }
  
  /**
   * Indexa um arquivo de código
   */
  async indexFile(
    filePath: string,
    content: string,
    language: string,
    projectId?: string
  ): Promise<void> {
    const chunks = this.chunkCode(content, language);
    const documents: VectorDocument[] = [];
    
    chunks.forEach((chunk, idx) => {
      documents.push({
        id: `${filePath}:${idx}`,
        content: chunk.content,
        metadata: {
          filePath,
          language,
          type: chunk.type,
          startLine: chunk.startLine,
          endLine: chunk.endLine,
          symbols: chunk.symbols,
          imports: chunk.imports,
          exports: chunk.exports,
          projectId,
        },
      });
    });
    
    await this.vectorStore.indexBatch(documents);
  }
  
  /**
   * Divide código em chunks semânticos
   */
  private chunkCode(content: string, language: string): Array<{
    content: string;
    type: VectorDocument['metadata']['type'];
    startLine: number;
    endLine: number;
    symbols: string[];
    imports: string[];
    exports: string[];
  }> {
    type ChunkType = VectorDocument['metadata']['type'];
    
    const lines = content.split('\n');
    const chunks: Array<{
      content: string;
      type: ChunkType;
      startLine: number;
      endLine: number;
      symbols: string[];
      imports: string[];
      exports: string[];
    }> = [];
    
    // Simple chunking by functions/classes
    let currentChunk: {
      content: string;
      type: ChunkType;
      startLine: number;
      endLine: number;
      symbols: string[];
      imports: string[];
      exports: string[];
    } = {
      content: '',
      type: 'code',
      startLine: 1,
      endLine: 1,
      symbols: [],
      imports: [],
      exports: [],
    };
    
    let braceDepth = 0;
    let inFunction = false;
    let inClass = false;
    
    const patterns = this.getLanguagePatterns(language);
    
    lines.forEach((line, idx) => {
      const lineNum = idx + 1;
      
      // Check for imports
      if (patterns.import.test(line)) {
        const match = line.match(patterns.importName);
        if (match) currentChunk.imports.push(match[1]);
      }
      
      // Check for exports
      if (patterns.export.test(line)) {
        const match = line.match(patterns.exportName);
        if (match) currentChunk.exports.push(match[1]);
      }
      
      // Check for function/class start
      const funcMatch = line.match(patterns.function);
      const classMatch = line.match(patterns.class);
      
      if (funcMatch && braceDepth === 0) {
        // Save previous chunk if not empty
        if (currentChunk.content.trim()) {
          chunks.push({ ...currentChunk });
        }
        
        currentChunk = {
          content: line + '\n',
          type: 'function',
          startLine: lineNum,
          endLine: lineNum,
          symbols: [funcMatch[1]],
          imports: [],
          exports: [],
        };
        inFunction = true;
      } else if (classMatch && braceDepth === 0) {
        if (currentChunk.content.trim()) {
          chunks.push({ ...currentChunk });
        }
        
        currentChunk = {
          content: line + '\n',
          type: 'class',
          startLine: lineNum,
          endLine: lineNum,
          symbols: [classMatch[1]],
          imports: [],
          exports: [],
        };
        inClass = true;
      } else {
        currentChunk.content += line + '\n';
        currentChunk.endLine = lineNum;
      }
      
      // Track brace depth
      braceDepth += (line.match(/\{/g) || []).length;
      braceDepth -= (line.match(/\}/g) || []).length;
      
      // End of function/class
      if ((inFunction || inClass) && braceDepth === 0 && line.includes('}')) {
        chunks.push({ ...currentChunk });
        currentChunk = {
          content: '',
          type: 'code',
          startLine: lineNum + 1,
          endLine: lineNum + 1,
          symbols: [],
          imports: [],
          exports: [],
        };
        inFunction = false;
        inClass = false;
      }
    });
    
    // Add remaining chunk
    if (currentChunk.content.trim()) {
      chunks.push(currentChunk);
    }
    
    return chunks;
  }
  
  private getLanguagePatterns(language: string) {
    const patterns = {
      typescript: {
        function: /(?:function|const|let|var)\s+(\w+)\s*(?:=\s*(?:async\s*)?(?:\([^)]*\)|[^=])*=>|\([^)]*\)\s*(?::\s*\w+)?\s*\{)/,
        class: /class\s+(\w+)/,
        import: /import\s+/,
        importName: /import\s+(?:\{[^}]*\}|[\w*]+)\s+from\s+['"]([^'"]+)['"]/,
        export: /export\s+/,
        exportName: /export\s+(?:default\s+)?(?:class|function|const|let|var|interface|type)\s+(\w+)/,
      },
      python: {
        function: /def\s+(\w+)\s*\(/,
        class: /class\s+(\w+)/,
        import: /(?:from|import)\s+/,
        importName: /(?:from\s+(\S+)\s+import|import\s+(\S+))/,
        export: /__all__/,
        exportName: /__all__\s*=\s*\[([^\]]+)\]/,
      },
    };
    
    return patterns[language as keyof typeof patterns] || patterns.typescript;
  }
  
  /**
   * Busca código relacionado à query
   */
  async search(query: string, options?: {
    language?: string;
    projectId?: string;
    type?: VectorDocument['metadata']['type'];
    maxResults?: number;
  }): Promise<SearchResult[]> {
    let results = await this.vectorStore.search(query, { maxResults: options?.maxResults });
    
    // Filter by metadata
    if (options?.language) {
      results = results.filter(r => r.document.metadata.language === options.language);
    }
    
    if (options?.projectId) {
      results = results.filter(r => r.document.metadata.projectId === options.projectId);
    }
    
    if (options?.type) {
      results = results.filter(r => r.document.metadata.type === options.type);
    }
    
    return results;
  }
  
  /**
   * Retorna o vector store interno
   */
  getVectorStore(): VectorStore {
    return this.vectorStore;
  }
}

// ============================================================================
// SINGLETON INSTANCE
// ============================================================================

export const codeIndexer = new CodeIndexer({
  embeddingModel: process.env.OPENAI_API_KEY ? 'openai' : 'local',
  hybridWeight: 0.7,
  similarityThreshold: 0.4,
  maxResults: 20,
});

export default codeIndexer;
