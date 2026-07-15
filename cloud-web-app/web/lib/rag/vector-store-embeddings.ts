import { logger } from '@/lib/observability/logger';

export interface EmbeddingProvider {
  embed(text: string): Promise<number[]>;
  embedBatch(texts: string[]): Promise<number[][]>;
  dimensions: number;
}

type EmbeddingResponse = {
  data: Array<{
    embedding: number[];
  }>;
};

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

    const data = await response.json() as EmbeddingResponse;
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

    const data = await response.json() as EmbeddingResponse;
    return data.data.map((d) => d.embedding);
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

    const data = await response.json() as EmbeddingResponse;
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

    const data = await response.json() as EmbeddingResponse;
    return data.data.map((d) => d.embedding);
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

export type EmbeddingModel = 'openai' | 'voyage' | 'cohere' | 'local';

export function createEmbeddingProvider(model: EmbeddingModel): EmbeddingProvider {
  switch (model) {
    case 'openai':
      if (process.env.OPENAI_API_KEY) return new OpenAIEmbeddings();
      logger.warn('OpenAI API key not found, falling back to local embeddings');
      return new LocalEmbeddings();
    case 'voyage':
      if (process.env.VOYAGE_API_KEY) return new VoyageEmbeddings();
      logger.warn('Voyage API key not found, falling back to local embeddings');
      return new LocalEmbeddings();
    default:
      return new LocalEmbeddings();
  }
}
