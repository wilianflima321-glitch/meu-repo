/**
 * DEEP CONTEXT MANAGER (A "MEMÓRIA INFINITA")
 * 
 * Resolve o problema da Janela de Contexto Limitada.
 * Em vez de passar o projeto inteiro para a IA, este sistema indexa
 * TODO o conhecimento do projeto e entrega apenas o fragmento exato necessário.
 */

export interface ContextChunk {
  id: string;
  category: 'story' | 'code' | 'rules' | 'character';
  content: string;
  tags: string[];
  embedding?: number[]; // Vetor para busca semântica
}

export class DeepContextManager {
  private memoryBank: Map<string, ContextChunk> = new Map();

  async initialize(projectId: string) {
    console.log(`[DeepContext] Carregando memória para projeto ${projectId}...`);
    // Carregaria do banco de dados vetorial (Pinecone/Postgres pgvector)
  }

  /**
   * Memoriza uma nova informação importante (ex: "O Rei morreu")
   */
  async memorize(category: ContextChunk['category'], content: string, tags: string[]) {
    const id = crypto.randomUUID();
    const chunk: ContextChunk = {
      id,
      category,
      content,
      tags
      // embedding: await generateEmbedding(content)
    };
    this.memoryBank.set(id, chunk);
    console.log(`[DeepContext] Memorizado: [${category}] ${content.substring(0, 50)}...`);
  }

  /**
   * Recupera informações relevantes para uma pergunta/tarefa
   */
  async recallRelevantContext(query: string): Promise<string> {
    // 1. Converter query para vetor
    // 2. Buscar cosseno similaridade no memoryBank
    // 3. Retornar os Top-K chunks mais relevantes
    
    // Fallback simples por tags enquanto não temos Vector DB
    return Array.from(this.memoryBank.values())
      .filter(chunk => chunk.tags.some(tag => query.toLowerCase().includes(tag.toLowerCase())))
      .map(c => c.content)
      .join('\n\n');
  }

  /**
   * Gera o "System Prompt" enriquecido com as regras do mundo atual
   */
  async getSnapshotForAgent(): Promise<string> {
    const rules = await this.recallRelevantContext('world rules physics magic');
    const status = await this.recallRelevantContext('current story status');
    
    return `
      ACTIVE WORLD RULES:
      ${rules}
      
      CURRENT STORY STATUS:
      ${status}
    `;
  }
}

export const deepContext = new DeepContextManager();
