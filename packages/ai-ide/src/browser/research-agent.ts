/**
 * Research Agent - Pesquisa Profunda Antes de Criar
 * 
 * Faz pesquisa extensiva antes de gerar qualquer conteúdo,
 * garantindo qualidade e reduzindo custos através de cache.
 */

export interface ResearchPlan {
    id: string;
    topic: string;
    depth: 'shallow' | 'medium' | 'deep' | 'exhaustive';
    sources: ResearchSource[];
    estimatedCost: number;
    estimatedTime: number;
    userApproved: boolean;
}

export interface ResearchSource {
    type: 'web' | 'database' | 'api' | 'knowledge_base' | 'memory_bank';
    query: string;
    priority: number;
    estimatedCost: number;
}

export interface ResearchResult {
    id: string;
    planId: string;
    findings: Finding[];
    summary: string;
    confidence: number;
    sources: SourceReference[];
    totalCost: number;
    timestamp: Date;
    cached: boolean;
}

export interface Finding {
    id: string;
    title: string;
    content: string;
    relevance: number;
    source: string;
    metadata: Record<string, unknown>;
}

export interface SourceReference {
    url?: string;
    title: string;
    type: string;
    accessedAt: Date;
}

export class ResearchAgent {
    private cache: Map<string, ResearchResult> = new Map();
    private costPerSource: Record<ResearchSource['type'], number> = {
        web: 0.05,
        database: 0.10,
        api: 0.15,
        knowledge_base: 0.02,
        memory_bank: 0.00 // Grátis - já temos!
    };

    /**
     * Cria plano de pesquisa
     */
    async createPlan(
        topic: string,
        depth: ResearchPlan['depth'] = 'medium',
        context?: string
    ): Promise<ResearchPlan> {
        console.log(`[Research] Criando plano para: "${topic}"`);

        // Verificar cache primeiro
        const cacheKey = this.getCacheKey(topic, depth);
        if (this.cache.has(cacheKey)) {
            console.log(`[Research] ✅ Encontrado em cache!`);
            return {
                id: this.generateId(),
                topic,
                depth,
                sources: [],
                estimatedCost: 0, // Cache é grátis!
                estimatedTime: 0,
                userApproved: false
            };
        }

        // Determinar fontes necessárias
        const sources = this.determineSources(topic, depth, context);

        // Calcular custo
        const estimatedCost = sources.reduce((sum, s) => sum + s.estimatedCost, 0);
        const estimatedTime = this.estimateTime(sources);

        const plan: ResearchPlan = {
            id: this.generateId(),
            topic,
            depth,
            sources,
            estimatedCost,
            estimatedTime,
            userApproved: false
        };

        console.log(`[Research] Plano criado:`, {
            sources: sources.length,
            cost: `$${estimatedCost.toFixed(2)}`,
            time: `${estimatedTime}s`
        });

        return plan;
    }

    /**
     * Executa pesquisa
     */
    async execute(plan: ResearchPlan): Promise<ResearchResult> {
        if (!plan.userApproved) {
            throw new Error('Plano não aprovado pelo usuário');
        }

        console.log(`[Research] Executando pesquisa: "${plan.topic}"`);

        // Verificar cache
        const cacheKey = this.getCacheKey(plan.topic, plan.depth);
        if (this.cache.has(cacheKey)) {
            const cached = this.cache.get(cacheKey)!;
            console.log(`[Research] ✅ Retornando do cache (custo: $0)`);
            return { ...cached, cached: true };
        }

        const findings: Finding[] = [];
        const sourceRefs: SourceReference[] = [];
        let totalCost = 0;

        // Executar cada fonte
        for (const source of plan.sources) {
            console.log(`[Research] Buscando em: ${source.type}`);
            
            const result = await this.querySource(source);
            findings.push(...result.findings);
            sourceRefs.push(...result.sources);
            totalCost += source.estimatedCost;
        }

        // Ordenar por relevância
        findings.sort((a, b) => b.relevance - a.relevance);

        // Gerar resumo
        const summary = await this.generateSummary(findings, plan.topic);

        // Calcular confiança
        const confidence = this.calculateConfidence(findings);

        const result: ResearchResult = {
            id: this.generateId(),
            planId: plan.id,
            findings,
            summary,
            confidence,
            sources: sourceRefs,
            totalCost,
            timestamp: new Date(),
            cached: false
        };

        // Salvar em cache
        this.cache.set(cacheKey, result);

        console.log(`[Research] ✅ Pesquisa concluída:`, {
            findings: findings.length,
            confidence: `${(confidence * 100).toFixed(1)}%`,
            cost: `$${totalCost.toFixed(2)}`
        });

        return result;
    }

    /**
     * Determina fontes necessárias baseado no tópico e profundidade
     */
    private determineSources(
        topic: string,
        depth: ResearchPlan['depth'],
        context?: string
    ): ResearchSource[] {
        const sources: ResearchSource[] = [];

        // Sempre verificar memory bank primeiro (grátis!)
        sources.push({
            type: 'memory_bank',
            query: topic,
            priority: 1,
            estimatedCost: 0
        });

        // Baseado na profundidade
        switch (depth) {
            case 'shallow':
                sources.push({
                    type: 'knowledge_base',
                    query: topic,
                    priority: 2,
                    estimatedCost: this.costPerSource.knowledge_base
                });
                break;

            case 'medium':
                sources.push(
                    {
                        type: 'knowledge_base',
                        query: topic,
                        priority: 2,
                        estimatedCost: this.costPerSource.knowledge_base
                    },
                    {
                        type: 'web',
                        query: topic,
                        priority: 3,
                        estimatedCost: this.costPerSource.web
                    }
                );
                break;

            case 'deep':
                sources.push(
                    {
                        type: 'knowledge_base',
                        query: topic,
                        priority: 2,
                        estimatedCost: this.costPerSource.knowledge_base
                    },
                    {
                        type: 'web',
                        query: topic,
                        priority: 3,
                        estimatedCost: this.costPerSource.web * 2
                    },
                    {
                        type: 'database',
                        query: topic,
                        priority: 4,
                        estimatedCost: this.costPerSource.database
                    }
                );
                break;

            case 'exhaustive':
                sources.push(
                    {
                        type: 'knowledge_base',
                        query: topic,
                        priority: 2,
                        estimatedCost: this.costPerSource.knowledge_base
                    },
                    {
                        type: 'web',
                        query: topic,
                        priority: 3,
                        estimatedCost: this.costPerSource.web * 3
                    },
                    {
                        type: 'database',
                        query: topic,
                        priority: 4,
                        estimatedCost: this.costPerSource.database * 2
                    },
                    {
                        type: 'api',
                        query: topic,
                        priority: 5,
                        estimatedCost: this.costPerSource.api
                    }
                );
                break;
        }

        return sources;
    }

    /**
     * Consulta uma fonte específica
     */
    private async querySource(source: ResearchSource): Promise<{
        findings: Finding[];
        sources: SourceReference[];
    }> {
        // Simula consulta a fonte
        // Em produção, faria chamadas reais a APIs, web scraping, etc.

        const findings: Finding[] = [];
        const sources: SourceReference[] = [];

        // Simular resultados baseado no tipo
        const resultCount = this.getResultCount(source.type);

        for (let i = 0; i < resultCount; i++) {
            findings.push({
                id: this.generateId(),
                title: `Finding ${i + 1} from ${source.type}`,
                content: `Detailed information about ${source.query} from ${source.type}`,
                relevance: Math.random() * 0.5 + 0.5, // 0.5 - 1.0
                source: source.type,
                metadata: {
                    query: source.query,
                    index: i
                }
            });

            sources.push({
                title: `Source ${i + 1}`,
                type: source.type,
                accessedAt: new Date()
            });
        }

        return { findings, sources };
    }

    /**
     * Gera resumo dos findings
     */
    private async generateSummary(findings: Finding[], topic: string): Promise<string> {
        // Em produção, usaria LLM para gerar resumo
        
        const topFindings = findings.slice(0, 5);
        const summary = `
Pesquisa sobre "${topic}":

Encontrados ${findings.length} resultados relevantes.

Principais descobertas:
${topFindings.map((f, i) => `${i + 1}. ${f.title}`).join('\n')}

Confiança geral: ${(this.calculateConfidence(findings) * 100).toFixed(1)}%
        `.trim();

        return summary;
    }

    /**
     * Calcula confiança baseado nos findings
     */
    private calculateConfidence(findings: Finding[]): number {
        if (findings.length === 0) return 0;

        const avgRelevance = findings.reduce((sum, f) => sum + f.relevance, 0) / findings.length;
        const countFactor = Math.min(findings.length / 10, 1); // Mais findings = mais confiança

        return avgRelevance * 0.7 + countFactor * 0.3;
    }

    /**
     * Estima tempo de pesquisa
     */
    private estimateTime(sources: ResearchSource[]): number {
        const timePerSource: Record<ResearchSource['type'], number> = {
            memory_bank: 1,
            knowledge_base: 2,
            web: 5,
            database: 3,
            api: 4
        };

        return sources.reduce((sum, s) => sum + timePerSource[s.type], 0);
    }

    /**
     * Número de resultados por tipo de fonte
     */
    private getResultCount(type: ResearchSource['type']): number {
        const counts: Record<ResearchSource['type'], number> = {
            memory_bank: 3,
            knowledge_base: 5,
            web: 10,
            database: 7,
            api: 8
        };

        return counts[type];
    }

    /**
     * Gera chave de cache
     */
    private getCacheKey(topic: string, depth: ResearchPlan['depth']): string {
        return `${topic.toLowerCase().trim()}_${depth}`;
    }

    private generateId(): string {
        return `research_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Estatísticas de cache
     */
    getCacheStats(): {
        size: number;
        hitRate: number;
        totalSaved: number;
    } {
        // Simula estatísticas
        return {
            size: this.cache.size,
            hitRate: 0.65, // 65% de hits
            totalSaved: this.cache.size * 0.15 // $0.15 por hit
        };
    }

    /**
     * Limpa cache antigo
     */
    clearOldCache(daysOld: number = 7): number {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - daysOld);

        let removed = 0;
        for (const [key, result] of this.cache.entries()) {
            if (result.timestamp < cutoff) {
                this.cache.delete(key);
                removed++;
            }
        }

        console.log(`[Research] 🧹 Cache limpo: ${removed} itens removidos`);
        return removed;
    }
}
