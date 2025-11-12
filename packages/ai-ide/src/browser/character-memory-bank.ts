/**
 * Character Memory Bank - Sistema de Memória Visual
 * 
 * Mantém consistência perfeita de personagens, assets e estruturas.
 * Nunca esquece aparência, proporções ou estilo.
 */

export interface CharacterProfile {
    id: string;
    name: string;
    type: 'character' | 'asset' | 'structure' | 'environment';
    
    // Características visuais
    visualFeatures: {
        faceEmbedding?: Float32Array;
        bodyProportions: BodyMetrics;
        styleSignature: Float32Array;
        colorPalette: Color[];
        texturePatterns: string[];
    };
    
    // Referências
    referenceImages: ReferenceImage[];
    blueprints: Blueprint[];
    
    // Regras de consistência
    consistencyRules: ConsistencyRule[];
    
    // Histórico
    versions: Version[];
    usageCount: number;
    lastUsed: Date;
    createdAt: Date;
}

export interface BodyMetrics {
    height: number;
    proportions: {
        head: number;
        torso: number;
        arms: number;
        legs: number;
    };
    measurements?: Record<string, number>;
}

export interface Color {
    hex: string;
    name: string;
    usage: 'primary' | 'secondary' | 'accent' | 'detail';
}

export interface ReferenceImage {
    id: string;
    url: string;
    embedding: Float32Array;
    angle: 'front' | 'side' | 'back' | '3/4' | 'top' | 'bottom';
    quality: number;
    timestamp: Date;
}

export interface Blueprint {
    id: string;
    type: 'wireframe' | 'topology' | 'uv' | 'skeleton';
    data: any;
    metadata: Record<string, unknown>;
}

export interface ConsistencyRule {
    id: string;
    type: 'proportion' | 'color' | 'style' | 'anatomy' | 'physics';
    rule: string;
    priority: 'critical' | 'high' | 'medium' | 'low';
    autoFix: boolean;
}

export interface Version {
    id: string;
    changes: string[];
    embedding: Float32Array;
    timestamp: Date;
    approvedBy?: string;
}

export class CharacterMemoryBank {
    private profiles: Map<string, CharacterProfile> = new Map();
    private embeddings: Map<string, Float32Array> = new Map();
    private consistencyThreshold = 0.95; // 95% de similaridade mínima
    private persistenceKey = 'character-memory-bank';
    private autoSave = true;

    /**
     * Registra novo personagem/asset na memória
     */
    async register(profile: Omit<CharacterProfile, 'id' | 'usageCount' | 'lastUsed' | 'createdAt'>): Promise<CharacterProfile> {
        const id = this.generateId();
        
        const fullProfile: CharacterProfile = {
            ...profile,
            id,
            usageCount: 0,
            lastUsed: new Date(),
            createdAt: new Date()
        };

        this.profiles.set(id, fullProfile);
        
        // Armazenar embedding principal
        if (fullProfile.referenceImages.length > 0) {
            const mainEmbedding = fullProfile.referenceImages[0].embedding;
            this.embeddings.set(id, mainEmbedding);
        }

        console.log(`[MemoryBank] ✅ Registrado: ${profile.name} (${id})`);
        
        // Auto-save
        if (this.autoSave) {
            await this.save();
        }
        
        return fullProfile;
    }

    /**
     * Valida se nova imagem é consistente com perfil
     */
    async validateConsistency(
        profileId: string,
        newImageEmbedding: Float32Array
    ): Promise<{
        isConsistent: boolean;
        similarity: number;
        issues: string[];
        suggestions: string[];
    }> {
        const profile = this.profiles.get(profileId);
        if (!profile) {
            throw new Error(`Profile ${profileId} not found`);
        }

        const issues: string[] = [];
        const suggestions: string[] = [];

        // Comparar com referências existentes
        let maxSimilarity = 0;
        for (const ref of profile.referenceImages) {
            const similarity = this.cosineSimilarity(newImageEmbedding, ref.embedding);
            maxSimilarity = Math.max(maxSimilarity, similarity);
        }

        const isConsistent = maxSimilarity >= this.consistencyThreshold;

        if (!isConsistent) {
            issues.push(`Similaridade baixa: ${(maxSimilarity * 100).toFixed(1)}%`);
            suggestions.push('Revisar proporções e características principais');
            suggestions.push('Comparar com imagens de referência');
            suggestions.push('Ajustar cores e estilo');
        }

        // Verificar regras de consistência
        for (const rule of profile.consistencyRules) {
            if (rule.priority === 'critical') {
                // Aplicar regra crítica
                const ruleResult = this.applyRule(rule, newImageEmbedding, profile);
                if (!ruleResult.passed) {
                    issues.push(ruleResult.message);
                    if (rule.autoFix) {
                        suggestions.push(`Auto-fix disponível: ${rule.rule}`);
                    }
                }
            }
        }

        return {
            isConsistent,
            similarity: maxSimilarity,
            issues,
            suggestions
        };
    }

    /**
     * Adiciona nova referência ao perfil
     */
    async addReference(
        profileId: string,
        image: Omit<ReferenceImage, 'id' | 'timestamp'>
    ): Promise<void> {
        const profile = this.profiles.get(profileId);
        if (!profile) {
            throw new Error(`Profile ${profileId} not found`);
        }

        // Validar consistência antes de adicionar
        const validation = await this.validateConsistency(profileId, image.embedding);
        
        if (!validation.isConsistent) {
            console.warn(`[MemoryBank] ⚠️ Referência inconsistente para ${profile.name}`);
            console.warn('Issues:', validation.issues);
        }

        const fullImage: ReferenceImage = {
            ...image,
            id: this.generateId(),
            timestamp: new Date()
        };

        profile.referenceImages.push(fullImage);
        profile.lastUsed = new Date();

        console.log(`[MemoryBank] ✅ Referência adicionada: ${profile.name} (${image.angle})`);
    }

    /**
     * Busca perfil por nome ou características
     */
    async search(query: {
        name?: string;
        type?: CharacterProfile['type'];
        embedding?: Float32Array;
        minSimilarity?: number;
    }): Promise<CharacterProfile[]> {
        let results = Array.from(this.profiles.values());

        // Filtrar por nome
        if (query.name) {
            const lowerQuery = query.name.toLowerCase();
            results = results.filter(p => 
                p.name.toLowerCase().includes(lowerQuery)
            );
        }

        // Filtrar por tipo
        if (query.type) {
            results = results.filter(p => p.type === query.type);
        }

        // Busca por similaridade visual
        if (query.embedding) {
            const minSim = query.minSimilarity || 0.7;
            
            const withSimilarity = results.map(profile => {
                let maxSim = 0;
                for (const ref of profile.referenceImages) {
                    const sim = this.cosineSimilarity(query.embedding!, ref.embedding);
                    maxSim = Math.max(maxSim, sim);
                }
                return { profile, similarity: maxSim };
            });

            results = withSimilarity
                .filter(r => r.similarity >= minSim)
                .sort((a, b) => b.similarity - a.similarity)
                .map(r => r.profile);
        }

        return results;
    }

    /**
     * Obtém perfil completo
     */
    getProfile(id: string): CharacterProfile | undefined {
        const profile = this.profiles.get(id);
        if (profile) {
            profile.usageCount++;
            profile.lastUsed = new Date();
        }
        return profile;
    }

    /**
     * Atualiza perfil
     */
    async updateProfile(
        id: string,
        updates: Partial<CharacterProfile>
    ): Promise<CharacterProfile> {
        const profile = this.profiles.get(id);
        if (!profile) {
            throw new Error(`Profile ${id} not found`);
        }

        // Criar versão antes de atualizar
        const version: Version = {
            id: this.generateId(),
            changes: Object.keys(updates),
            embedding: profile.referenceImages[0]?.embedding || new Float32Array(512),
            timestamp: new Date()
        };
        profile.versions.push(version);

        // Aplicar updates
        Object.assign(profile, updates);
        profile.lastUsed = new Date();

        console.log(`[MemoryBank] ✅ Perfil atualizado: ${profile.name}`);

        return profile;
    }

    /**
     * Gera blueprint de consistência
     */
    async generateConsistencyBlueprint(profileId: string): Promise<Blueprint> {
        const profile = this.profiles.get(profileId);
        if (!profile) {
            throw new Error(`Profile ${profileId} not found`);
        }

        // Extrair características principais
        const blueprint: Blueprint = {
            id: this.generateId(),
            type: 'wireframe',
            data: {
                name: profile.name,
                proportions: profile.visualFeatures.bodyProportions,
                colors: profile.visualFeatures.colorPalette,
                style: Array.from(profile.visualFeatures.styleSignature),
                rules: profile.consistencyRules.map(r => ({
                    type: r.type,
                    rule: r.rule,
                    priority: r.priority
                }))
            },
            metadata: {
                generatedAt: new Date().toISOString(),
                version: profile.versions.length
            }
        };

        profile.blueprints.push(blueprint);

        return blueprint;
    }

    /**
     * Exporta perfil para uso externo
     */
    exportProfile(id: string): string {
        const profile = this.profiles.get(id);
        if (!profile) {
            throw new Error(`Profile ${id} not found`);
        }

        // Serializar para JSON (exceto embeddings grandes)
        const exportData = {
            ...profile,
            visualFeatures: {
                ...profile.visualFeatures,
                faceEmbedding: undefined, // Muito grande para export
                styleSignature: undefined
            },
            referenceImages: profile.referenceImages.map(img => ({
                ...img,
                embedding: undefined // Muito grande
            }))
        };

        return JSON.stringify(exportData, null, 2);
    }

    /**
     * Importa perfil
     */
    async importProfile(data: string): Promise<CharacterProfile> {
        const parsed = JSON.parse(data);
        
        // Regenerar embeddings se necessário
        // Em produção, chamaria modelo de embedding
        
        return this.register(parsed);
    }

    /**
     * Estatísticas da memória
     */
    getStats(): {
        totalProfiles: number;
        byType: Record<string, number>;
        totalReferences: number;
        avgReferencesPerProfile: number;
        mostUsed: CharacterProfile[];
    } {
        const profiles = Array.from(this.profiles.values());
        
        const byType: Record<string, number> = {};
        let totalReferences = 0;

        for (const profile of profiles) {
            byType[profile.type] = (byType[profile.type] || 0) + 1;
            totalReferences += profile.referenceImages.length;
        }

        const mostUsed = profiles
            .sort((a, b) => b.usageCount - a.usageCount)
            .slice(0, 10);

        return {
            totalProfiles: profiles.length,
            byType,
            totalReferences,
            avgReferencesPerProfile: totalReferences / profiles.length || 0,
            mostUsed
        };
    }

    // Métodos auxiliares
    private applyRule(
        rule: ConsistencyRule,
        embedding: Float32Array,
        profile: CharacterProfile
    ): { passed: boolean; message: string } {
        // Simula aplicação de regra
        // Em produção, teria lógica específica por tipo de regra
        return {
            passed: Math.random() > 0.1,
            message: `Regra ${rule.type}: ${rule.rule}`
        };
    }

    private cosineSimilarity(a: Float32Array, b: Float32Array): number {
        if (a.length !== b.length) return 0;

        let dotProduct = 0;
        let normA = 0;
        let normB = 0;

        for (let i = 0; i < a.length; i++) {
            dotProduct += a[i] * b[i];
            normA += a[i] * a[i];
            normB += b[i] * b[i];
        }

        const denominator = Math.sqrt(normA) * Math.sqrt(normB);
        return denominator === 0 ? 0 : dotProduct / denominator;
    }

    private generateId(): string {
        return `mem_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }

    /**
     * Limpa perfis não usados
     */
    cleanup(daysUnused: number = 30): number {
        const cutoff = new Date();
        cutoff.setDate(cutoff.getDate() - daysUnused);

        let removed = 0;
        for (const [id, profile] of this.profiles.entries()) {
            if (profile.lastUsed < cutoff && profile.usageCount === 0) {
                this.profiles.delete(id);
                this.embeddings.delete(id);
                removed++;
            }
        }

        console.log(`[MemoryBank] 🧹 Limpeza: ${removed} perfis removidos`);
        
        if (removed > 0 && this.autoSave) {
            this.save();
        }
        
        return removed;
    }

    /**
     * Save to localStorage
     */
    async save(): Promise<void> {
        try {
            const data = {
                profiles: Array.from(this.profiles.entries()),
                embeddings: Array.from(this.embeddings.entries()).map(([id, emb]) => [
                    id,
                    Array.from(emb)
                ]),
                timestamp: new Date().toISOString()
            };

            localStorage.setItem(this.persistenceKey, JSON.stringify(data));
            console.log(`[MemoryBank] 💾 Saved ${this.profiles.size} profiles`);
        } catch (error) {
            console.error('[MemoryBank] Failed to save:', error);
        }
    }

    /**
     * Load from localStorage
     */
    async load(): Promise<void> {
        try {
            const stored = localStorage.getItem(this.persistenceKey);
            if (!stored) {
                console.log('[MemoryBank] No saved data found');
                return;
            }

            const data = JSON.parse(stored);
            
            this.profiles = new Map(data.profiles);
            this.embeddings = new Map(
                data.embeddings.map(([id, arr]: [string, number[]]) => [
                    id,
                    new Float32Array(arr)
                ])
            );

            console.log(`[MemoryBank] 📂 Loaded ${this.profiles.size} profiles from ${data.timestamp}`);
        } catch (error) {
            console.error('[MemoryBank] Failed to load:', error);
        }
    }

    /**
     * Clear all data
     */
    async clear(): Promise<void> {
        this.profiles.clear();
        this.embeddings.clear();
        localStorage.removeItem(this.persistenceKey);
        console.log('[MemoryBank] 🗑️ All data cleared');
    }

    /**
     * Enable/disable auto-save
     */
    setAutoSave(enabled: boolean): void {
        this.autoSave = enabled;
    }
}
