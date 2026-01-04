/**
 * DEEP CONTEXT ENGINE - Sistema de Contexto Profundo
 *
 * Este sistema mantém consciência total do projeto, garantindo que a IA
 * nunca se perca ou crie inconsistências. Cada decisão, cada elemento,
 * cada relação é rastreada e validada.
 *
 * Princípios:
 * 1. TUDO é rastreado - nada se perde
 * 2. Relações são bidirecionais - A afeta B, B sabe que foi afetado por A
 * 3. Histórico completo - saber o que foi e por que mudou
 * 4. Validação contínua - detectar inconsistências em tempo real
 */
export type ElementType = 'scene' | 'shot' | 'frame' | 'layer' | 'track' | 'clip' | 'sample' | 'effect' | 'canvas' | 'artboard' | 'shape' | 'path' | 'mesh' | 'material' | 'texture' | 'bone' | 'file' | 'class' | 'function' | 'variable' | 'chapter' | 'section' | 'paragraph' | 'sentence' | 'character' | 'location' | 'prop' | 'event' | 'node' | 'connection' | 'graph' | 'workflow';
export type RelationType = 'parent' | 'child' | 'sibling' | 'depends-on' | 'required-by' | 'references' | 'referenced-by' | 'derives-from' | 'base-for' | 'transforms-to' | 'transforms-from' | 'synchronizes-with' | 'constrains' | 'constrained-by' | 'triggers' | 'triggered-by' | 'contains' | 'contained-in' | 'conflicts-with' | 'complements';
/**
 * Elemento base rastreável
 */
export interface TrackedElement {
    id: string;
    type: ElementType;
    name: string;
    description?: string;
    created: number;
    modified: number;
    version: number;
    checksum: string;
    data: Record<string, unknown>;
    metadata: ElementMetadata;
    state: ElementState;
    tags: string[];
}
/**
 * Metadados de elemento
 */
export interface ElementMetadata {
    createdBy: string;
    modifiedBy: string;
    source?: string;
    aiModel?: string;
    aiPrompt?: string;
    confidence?: number;
    qualityScore?: number;
    locked: boolean;
    approved: boolean;
    approvedBy?: string;
    approvedAt?: number;
}
/**
 * Estado do elemento
 */
export interface ElementState {
    status: 'draft' | 'review' | 'approved' | 'published' | 'archived';
    visibility: 'visible' | 'hidden' | 'deleted';
    editMode: 'editable' | 'readonly' | 'locked';
    validationStatus: 'pending' | 'valid' | 'invalid' | 'warning';
    validationErrors?: string[];
}
/**
 * Relação entre elementos
 */
export interface ElementRelation {
    id: string;
    sourceId: string;
    targetId: string;
    type: RelationType;
    strength: number;
    bidirectional: boolean;
    metadata: RelationMetadata;
    created: number;
    createdBy: string;
}
/**
 * Metadados de relação
 */
export interface RelationMetadata {
    description?: string;
    automatic: boolean;
    validated: boolean;
    dependencies?: string[];
}
/**
 * Snapshot do contexto (para comparação/rollback)
 */
export interface ContextSnapshot {
    id: string;
    projectId: string;
    timestamp: number;
    description: string;
    elements: Map<string, TrackedElement>;
    relations: Map<string, ElementRelation>;
    checksum: string;
    size: number;
}
/**
 * Resultado de busca no contexto
 */
export interface ContextSearchResult {
    element: TrackedElement;
    relevance: number;
    matchedFields: string[];
    relations: ElementRelation[];
}
/**
 * Diferença entre estados
 */
export interface ContextDiff {
    added: TrackedElement[];
    removed: TrackedElement[];
    modified: Array<{
        before: TrackedElement;
        after: TrackedElement;
        changes: string[];
    }>;
    relationsAdded: ElementRelation[];
    relationsRemoved: ElementRelation[];
}
/**
 * Consulta de contexto
 */
export interface ContextQuery {
    types?: ElementType[];
    tags?: string[];
    status?: ElementState['status'][];
    createdAfter?: number;
    createdBefore?: number;
    modifiedAfter?: number;
    modifiedBefore?: number;
    createdBy?: string;
    textSearch?: string;
    relatedTo?: string;
    relationType?: RelationType;
    limit?: number;
    offset?: number;
}
/**
 * Regra de consistência
 */
export interface ConsistencyRule {
    id: string;
    name: string;
    description: string;
    elementTypes: ElementType[];
    check: (element: TrackedElement, context: DeepContextEngine) => Promise<ConsistencyResult>;
    autoFix?: (element: TrackedElement, context: DeepContextEngine) => Promise<void>;
}
/**
 * Resultado de verificação de consistência
 */
export interface ConsistencyResult {
    consistent: boolean;
    issues: ConsistencyIssue[];
}
/**
 * Problema de consistência
 */
export interface ConsistencyIssue {
    elementId: string;
    relatedElementIds: string[];
    type: 'missing-relation' | 'orphan' | 'circular' | 'conflict' | 'mismatch' | 'stale';
    severity: 'info' | 'warning' | 'error' | 'critical';
    message: string;
    autoFixable: boolean;
}
export declare class DeepContextEngine {
    private elements;
    private relations;
    private snapshots;
    private consistencyRules;
    private indices;
    constructor();
    /**
     * Registra um novo elemento no contexto
     */
    createElement(type: ElementType, name: string, data: Record<string, unknown>, metadata?: Partial<ElementMetadata>): Promise<TrackedElement>;
    /**
     * Atualiza um elemento existente
     */
    updateElement(id: string, updates: Partial<Pick<TrackedElement, 'name' | 'data' | 'tags' | 'description'>>, updatedBy?: string): Promise<TrackedElement>;
    /**
     * Remove um elemento (soft delete)
     */
    deleteElement(id: string, deletedBy?: string): Promise<void>;
    /**
     * Obtém um elemento por ID
     */
    getElement(id: string): TrackedElement | undefined;
    /**
     * Busca elementos por query
     */
    queryElements(query: ContextQuery): TrackedElement[];
    /**
     * Busca semântica por similaridade
     */
    searchSemantic(searchText: string, options?: {
        types?: ElementType[];
        limit?: number;
    }): Promise<ContextSearchResult[]>;
    /**
     * Cria uma relação entre elementos
     */
    createRelation(sourceId: string, targetId: string, type: RelationType, metadata?: Partial<RelationMetadata>): ElementRelation;
    /**
     * Remove uma relação
     */
    removeRelation(relationId: string): void;
    /**
     * Obtém todas as relações de um elemento
     */
    getRelationsFor(elementId: string): ElementRelation[];
    /**
     * Obtém elementos relacionados
     */
    getRelatedElements(elementId: string, relationType?: RelationType): TrackedElement[];
    /**
     * Obtém IDs de elementos relacionados
     */
    private getRelatedElementIds;
    /**
     * Encontra relação específica
     */
    private findRelation;
    /**
     * Remove todas as relações de um elemento
     */
    private removeRelationsFor;
    /**
     * Verifica se tipo de relação é bidirecional
     */
    private isBidirectionalType;
    /**
     * Cria snapshot do estado atual
     */
    createSnapshot(description: string): ContextSnapshot;
    /**
     * Restaura um snapshot
     */
    restoreSnapshot(snapshotId: string): void;
    /**
     * Compara estado atual com um snapshot
     */
    diffWithSnapshot(snapshotId: string): ContextDiff;
    /**
     * Lista todos os snapshots
     */
    listSnapshots(): Array<{
        id: string;
        timestamp: number;
        description: string;
        size: number;
    }>;
    /**
     * Verifica consistência de todo o contexto
     */
    checkConsistency(): Promise<ConsistencyResult>;
    /**
     * Corrige problemas de consistência automaticamente
     */
    autoFixConsistency(): Promise<{
        fixed: number;
        remaining: ConsistencyIssue[];
    }>;
    /**
     * Corrige um problema específico
     */
    private fixConsistencyIssue;
    /**
     * Detecta ciclos em dependências
     */
    private detectCycles;
    /**
     * Detecta e cria relações automáticas para um elemento
     */
    private detectAutoRelations;
    private detectSceneRelations;
    private detectCharacterRelations;
    private detectCodeRelations;
    private detectMediaRelations;
    /**
     * Notifica elementos relacionados sobre mudanças
     */
    private notifyRelatedElements;
    private generateId;
    private calculateChecksum;
    private calculateContextChecksum;
    private detectChanges;
    private rebuildIndices;
    private registerBuiltInRules;
    /**
     * Registra uma regra de consistência customizada
     */
    registerConsistencyRule(rule: ConsistencyRule): void;
    /**
     * Exporta contexto completo para JSON
     */
    exportToJSON(): string;
    /**
     * Importa contexto de JSON
     */
    importFromJSON(json: string): void;
    /**
     * Obtém estatísticas do contexto
     */
    getStatistics(): {
        totalElements: number;
        totalRelations: number;
        elementsByType: Record<string, number>;
        relationsByType: Record<string, number>;
        averageRelationsPerElement: number;
    };
}
