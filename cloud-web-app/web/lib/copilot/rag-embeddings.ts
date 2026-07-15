import type { EmbeddingProvider } from './rag-types'

type EmbeddingResponse = {
  data: Array<{ embedding: number[] }>
}

export class OpenAIEmbeddingProvider implements EmbeddingProvider {
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
    
    const data = await response.json() as EmbeddingResponse
    return data.data.map((d) => d.embedding)
  }
}

export class LocalEmbeddingProvider implements EmbeddingProvider {
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
