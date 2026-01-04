"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.DeepContextEngine = void 0;
const inversify_1 = require("inversify");
// ============================================================================
// DEEP CONTEXT ENGINE - Implementação
// ============================================================================
let DeepContextEngine = class DeepContextEngine {
    constructor() {
        this.elements = new Map();
        this.relations = new Map();
        this.snapshots = new Map();
        this.consistencyRules = new Map();
        this.indices = new ContextIndices();
        this.registerBuiltInRules();
    }
    // ========================================================================
    // GERENCIAMENTO DE ELEMENTOS
    // ========================================================================
    /**
     * Registra um novo elemento no contexto
     */
    async createElement(type, name, data, metadata = {}) {
        const id = this.generateId();
        const now = Date.now();
        const element = {
            id,
            type,
            name,
            data,
            created: now,
            modified: now,
            version: 1,
            checksum: this.calculateChecksum(data),
            metadata: {
                createdBy: metadata.createdBy || 'system',
                modifiedBy: metadata.modifiedBy || metadata.createdBy || 'system',
                source: metadata.source || 'manual',
                aiModel: metadata.aiModel,
                aiPrompt: metadata.aiPrompt,
                confidence: metadata.confidence,
                locked: metadata.locked || false,
                approved: metadata.approved || false,
            },
            state: {
                status: 'draft',
                visibility: 'visible',
                editMode: 'editable',
                validationStatus: 'pending',
            },
            tags: [],
        };
        this.elements.set(id, element);
        this.indices.indexElement(element);
        // Detectar e criar relações automáticas
        await this.detectAutoRelations(element);
        return element;
    }
    /**
     * Atualiza um elemento existente
     */
    async updateElement(id, updates, updatedBy = 'system') {
        const element = this.elements.get(id);
        if (!element) {
            throw new Error(`Element ${id} not found`);
        }
        if (element.metadata.locked) {
            throw new Error(`Element ${id} is locked`);
        }
        const updated = {
            ...element,
            ...updates,
            data: updates.data ? { ...element.data, ...updates.data } : element.data,
            modified: Date.now(),
            version: element.version + 1,
            checksum: updates.data
                ? this.calculateChecksum({ ...element.data, ...updates.data })
                : element.checksum,
            metadata: {
                ...element.metadata,
                modifiedBy: updatedBy,
            },
            state: {
                ...element.state,
                validationStatus: 'pending', // Requer revalidação
            },
        };
        this.elements.set(id, updated);
        this.indices.reindexElement(element, updated);
        // Notificar elementos relacionados
        await this.notifyRelatedElements(id, 'modified');
        return updated;
    }
    /**
     * Remove um elemento (soft delete)
     */
    async deleteElement(id, deletedBy = 'system') {
        const element = this.elements.get(id);
        if (!element) {
            throw new Error(`Element ${id} not found`);
        }
        // Verificar dependências
        const dependents = this.getRelatedElements(id, 'required-by');
        if (dependents.length > 0) {
            throw new Error(`Cannot delete element ${id}: required by ${dependents.map(e => e.name).join(', ')}`);
        }
        // Soft delete
        const updated = {
            ...element,
            modified: Date.now(),
            metadata: {
                ...element.metadata,
                modifiedBy: deletedBy,
            },
            state: {
                ...element.state,
                visibility: 'deleted',
            },
        };
        this.elements.set(id, updated);
        // Remover relações
        this.removeRelationsFor(id);
    }
    /**
     * Obtém um elemento por ID
     */
    getElement(id) {
        return this.elements.get(id);
    }
    /**
     * Busca elementos por query
     */
    queryElements(query) {
        let results = Array.from(this.elements.values());
        // Filtrar por visibilidade (excluir deletados por padrão)
        results = results.filter(e => e.state.visibility !== 'deleted');
        if (query.types && query.types.length > 0) {
            results = results.filter(e => query.types.includes(e.type));
        }
        if (query.tags && query.tags.length > 0) {
            results = results.filter(e => query.tags.some(tag => e.tags.includes(tag)));
        }
        if (query.status && query.status.length > 0) {
            results = results.filter(e => query.status.includes(e.state.status));
        }
        if (query.createdAfter) {
            results = results.filter(e => e.created >= query.createdAfter);
        }
        if (query.createdBefore) {
            results = results.filter(e => e.created <= query.createdBefore);
        }
        if (query.modifiedAfter) {
            results = results.filter(e => e.modified >= query.modifiedAfter);
        }
        if (query.modifiedBefore) {
            results = results.filter(e => e.modified <= query.modifiedBefore);
        }
        if (query.createdBy) {
            results = results.filter(e => e.metadata.createdBy === query.createdBy);
        }
        if (query.textSearch) {
            const searchLower = query.textSearch.toLowerCase();
            results = results.filter(e => e.name.toLowerCase().includes(searchLower) ||
                e.description?.toLowerCase().includes(searchLower) ||
                e.tags.some(t => t.toLowerCase().includes(searchLower)));
        }
        if (query.relatedTo) {
            const relatedIds = this.getRelatedElementIds(query.relatedTo, query.relationType);
            results = results.filter(e => relatedIds.includes(e.id));
        }
        // Aplicar paginação
        if (query.offset) {
            results = results.slice(query.offset);
        }
        if (query.limit) {
            results = results.slice(0, query.limit);
        }
        return results;
    }
    /**
     * Busca semântica por similaridade
     */
    async searchSemantic(searchText, options = {}) {
        const results = [];
        const searchLower = searchText.toLowerCase();
        const searchTerms = searchLower.split(/\s+/);
        for (const element of this.elements.values()) {
            if (element.state.visibility === 'deleted')
                continue;
            if (options.types && !options.types.includes(element.type))
                continue;
            const matchedFields = [];
            let relevance = 0;
            // Nome
            if (element.name.toLowerCase().includes(searchLower)) {
                matchedFields.push('name');
                relevance += 0.4;
            }
            // Descrição
            if (element.description?.toLowerCase().includes(searchLower)) {
                matchedFields.push('description');
                relevance += 0.3;
            }
            // Tags
            const matchedTags = element.tags.filter(t => searchTerms.some(term => t.toLowerCase().includes(term)));
            if (matchedTags.length > 0) {
                matchedFields.push('tags');
                relevance += 0.2 * (matchedTags.length / searchTerms.length);
            }
            // Dados
            const dataStr = JSON.stringify(element.data).toLowerCase();
            if (dataStr.includes(searchLower)) {
                matchedFields.push('data');
                relevance += 0.1;
            }
            if (matchedFields.length > 0) {
                results.push({
                    element,
                    relevance: Math.min(relevance, 1),
                    matchedFields,
                    relations: this.getRelationsFor(element.id),
                });
            }
        }
        // Ordenar por relevância
        results.sort((a, b) => b.relevance - a.relevance);
        // Limitar resultados
        if (options.limit) {
            return results.slice(0, options.limit);
        }
        return results;
    }
    // ========================================================================
    // GERENCIAMENTO DE RELAÇÕES
    // ========================================================================
    /**
     * Cria uma relação entre elementos
     */
    createRelation(sourceId, targetId, type, metadata = {}) {
        const source = this.elements.get(sourceId);
        const target = this.elements.get(targetId);
        if (!source)
            throw new Error(`Source element ${sourceId} not found`);
        if (!target)
            throw new Error(`Target element ${targetId} not found`);
        // Verificar se relação já existe
        const existing = this.findRelation(sourceId, targetId, type);
        if (existing) {
            return existing;
        }
        const relation = {
            id: this.generateId(),
            sourceId,
            targetId,
            type,
            strength: 1,
            bidirectional: this.isBidirectionalType(type),
            metadata: {
                automatic: metadata.automatic || false,
                validated: metadata.validated || false,
                description: metadata.description,
            },
            created: Date.now(),
            createdBy: 'system',
        };
        this.relations.set(relation.id, relation);
        this.indices.indexRelation(relation);
        return relation;
    }
    /**
     * Remove uma relação
     */
    removeRelation(relationId) {
        const relation = this.relations.get(relationId);
        if (relation) {
            this.indices.removeRelationIndex(relation);
            this.relations.delete(relationId);
        }
    }
    /**
     * Obtém todas as relações de um elemento
     */
    getRelationsFor(elementId) {
        return Array.from(this.relations.values()).filter(r => r.sourceId === elementId || r.targetId === elementId);
    }
    /**
     * Obtém elementos relacionados
     */
    getRelatedElements(elementId, relationType) {
        const relatedIds = this.getRelatedElementIds(elementId, relationType);
        return relatedIds
            .map(id => this.elements.get(id))
            .filter((e) => e !== undefined);
    }
    /**
     * Obtém IDs de elementos relacionados
     */
    getRelatedElementIds(elementId, relationType) {
        const relations = this.getRelationsFor(elementId);
        return relations
            .filter(r => !relationType || r.type === relationType)
            .map(r => r.sourceId === elementId ? r.targetId : r.sourceId);
    }
    /**
     * Encontra relação específica
     */
    findRelation(sourceId, targetId, type) {
        return Array.from(this.relations.values()).find(r => r.sourceId === sourceId && r.targetId === targetId && r.type === type);
    }
    /**
     * Remove todas as relações de um elemento
     */
    removeRelationsFor(elementId) {
        const toRemove = Array.from(this.relations.values())
            .filter(r => r.sourceId === elementId || r.targetId === elementId);
        for (const relation of toRemove) {
            this.removeRelation(relation.id);
        }
    }
    /**
     * Verifica se tipo de relação é bidirecional
     */
    isBidirectionalType(type) {
        return ['sibling', 'synchronizes-with', 'conflicts-with', 'complements'].includes(type);
    }
    // ========================================================================
    // SNAPSHOTS E HISTÓRICO
    // ========================================================================
    /**
     * Cria snapshot do estado atual
     */
    createSnapshot(description) {
        const id = this.generateId();
        const snapshot = {
            id,
            projectId: 'current', // TODO: suportar múltiplos projetos
            timestamp: Date.now(),
            description,
            elements: new Map(this.elements),
            relations: new Map(this.relations),
            checksum: this.calculateContextChecksum(),
            size: this.elements.size,
        };
        this.snapshots.set(id, snapshot);
        return snapshot;
    }
    /**
     * Restaura um snapshot
     */
    restoreSnapshot(snapshotId) {
        const snapshot = this.snapshots.get(snapshotId);
        if (!snapshot) {
            throw new Error(`Snapshot ${snapshotId} not found`);
        }
        this.elements = new Map(snapshot.elements);
        this.relations = new Map(snapshot.relations);
        this.rebuildIndices();
    }
    /**
     * Compara estado atual com um snapshot
     */
    diffWithSnapshot(snapshotId) {
        const snapshot = this.snapshots.get(snapshotId);
        if (!snapshot) {
            throw new Error(`Snapshot ${snapshotId} not found`);
        }
        const diff = {
            added: [],
            removed: [],
            modified: [],
            relationsAdded: [],
            relationsRemoved: [],
        };
        // Elementos adicionados e modificados
        for (const [id, element] of this.elements) {
            const snapshotElement = snapshot.elements.get(id);
            if (!snapshotElement) {
                diff.added.push(element);
            }
            else if (element.checksum !== snapshotElement.checksum) {
                diff.modified.push({
                    before: snapshotElement,
                    after: element,
                    changes: this.detectChanges(snapshotElement, element),
                });
            }
        }
        // Elementos removidos
        for (const [id, element] of snapshot.elements) {
            if (!this.elements.has(id)) {
                diff.removed.push(element);
            }
        }
        // Relações adicionadas
        for (const [id, relation] of this.relations) {
            if (!snapshot.relations.has(id)) {
                diff.relationsAdded.push(relation);
            }
        }
        // Relações removidas
        for (const [id, relation] of snapshot.relations) {
            if (!this.relations.has(id)) {
                diff.relationsRemoved.push(relation);
            }
        }
        return diff;
    }
    /**
     * Lista todos os snapshots
     */
    listSnapshots() {
        return Array.from(this.snapshots.values()).map(s => ({
            id: s.id,
            timestamp: s.timestamp,
            description: s.description,
            size: s.size,
        }));
    }
    // ========================================================================
    // VERIFICAÇÃO DE CONSISTÊNCIA
    // ========================================================================
    /**
     * Verifica consistência de todo o contexto
     */
    async checkConsistency() {
        const issues = [];
        for (const element of this.elements.values()) {
            if (element.state.visibility === 'deleted')
                continue;
            // Aplicar regras de consistência
            for (const rule of this.consistencyRules.values()) {
                if (rule.elementTypes.includes(element.type) || rule.elementTypes.length === 0) {
                    const result = await rule.check(element, this);
                    issues.push(...result.issues);
                }
            }
        }
        // Verificar relações órfãs
        for (const relation of this.relations.values()) {
            const source = this.elements.get(relation.sourceId);
            const target = this.elements.get(relation.targetId);
            if (!source || source.state.visibility === 'deleted') {
                issues.push({
                    elementId: relation.sourceId,
                    relatedElementIds: [relation.targetId],
                    type: 'orphan',
                    severity: 'error',
                    message: `Relation ${relation.id} has missing source element`,
                    autoFixable: true,
                });
            }
            if (!target || target.state.visibility === 'deleted') {
                issues.push({
                    elementId: relation.targetId,
                    relatedElementIds: [relation.sourceId],
                    type: 'orphan',
                    severity: 'error',
                    message: `Relation ${relation.id} has missing target element`,
                    autoFixable: true,
                });
            }
        }
        // Detectar ciclos em dependências
        const cycles = this.detectCycles();
        for (const cycle of cycles) {
            issues.push({
                elementId: cycle[0],
                relatedElementIds: cycle.slice(1),
                type: 'circular',
                severity: 'warning',
                message: `Circular dependency detected: ${cycle.join(' -> ')}`,
                autoFixable: false,
            });
        }
        return {
            consistent: issues.filter(i => i.severity === 'error' || i.severity === 'critical').length === 0,
            issues,
        };
    }
    /**
     * Corrige problemas de consistência automaticamente
     */
    async autoFixConsistency() {
        const result = await this.checkConsistency();
        let fixed = 0;
        const remaining = [];
        for (const issue of result.issues) {
            if (issue.autoFixable) {
                try {
                    await this.fixConsistencyIssue(issue);
                    fixed++;
                }
                catch {
                    remaining.push(issue);
                }
            }
            else {
                remaining.push(issue);
            }
        }
        return { fixed, remaining };
    }
    /**
     * Corrige um problema específico
     */
    async fixConsistencyIssue(issue) {
        switch (issue.type) {
            case 'orphan':
                // Remover relações órfãs
                const orphanRelations = Array.from(this.relations.values()).filter(r => r.sourceId === issue.elementId || r.targetId === issue.elementId);
                for (const r of orphanRelations) {
                    this.removeRelation(r.id);
                }
                break;
            case 'stale':
                // Atualizar elemento
                const element = this.elements.get(issue.elementId);
                if (element) {
                    await this.updateElement(issue.elementId, {}, 'auto-fix');
                }
                break;
        }
    }
    /**
     * Detecta ciclos em dependências
     */
    detectCycles() {
        const cycles = [];
        const visited = new Set();
        const recursionStack = new Set();
        const dfs = (elementId, path) => {
            if (recursionStack.has(elementId)) {
                const cycleStart = path.indexOf(elementId);
                cycles.push(path.slice(cycleStart));
                return;
            }
            if (visited.has(elementId))
                return;
            visited.add(elementId);
            recursionStack.add(elementId);
            path.push(elementId);
            const dependsOn = this.getRelatedElementIds(elementId, 'depends-on');
            for (const depId of dependsOn) {
                dfs(depId, [...path]);
            }
            recursionStack.delete(elementId);
        };
        for (const elementId of this.elements.keys()) {
            if (!visited.has(elementId)) {
                dfs(elementId, []);
            }
        }
        return cycles;
    }
    // ========================================================================
    // DETECÇÃO AUTOMÁTICA DE RELAÇÕES
    // ========================================================================
    /**
     * Detecta e cria relações automáticas para um elemento
     */
    async detectAutoRelations(element) {
        // Detectar por tipo
        switch (element.type) {
            case 'scene':
                await this.detectSceneRelations(element);
                break;
            case 'character':
                await this.detectCharacterRelations(element);
                break;
            case 'function':
            case 'class':
                await this.detectCodeRelations(element);
                break;
            case 'layer':
            case 'track':
                await this.detectMediaRelations(element);
                break;
        }
    }
    async detectSceneRelations(element) {
        // Detectar personagens mencionados
        const characters = this.queryElements({ types: ['character'] });
        for (const char of characters) {
            const charName = char.name.toLowerCase();
            const sceneContent = JSON.stringify(element.data).toLowerCase();
            if (sceneContent.includes(charName)) {
                this.createRelation(element.id, char.id, 'contains', { automatic: true });
            }
        }
        // Detectar locações mencionadas
        const locations = this.queryElements({ types: ['location'] });
        for (const loc of locations) {
            const locName = loc.name.toLowerCase();
            const sceneContent = JSON.stringify(element.data).toLowerCase();
            if (sceneContent.includes(locName)) {
                this.createRelation(element.id, loc.id, 'contains', { automatic: true });
            }
        }
    }
    async detectCharacterRelations(element) {
        // Detectar relações entre personagens mencionadas nos dados
        const data = element.data;
        if (data.relationships && Array.isArray(data.relationships)) {
            for (const rel of data.relationships) {
                const relData = rel;
                if (relData.character) {
                    const related = this.queryElements({
                        types: ['character'],
                        textSearch: relData.character,
                        limit: 1,
                    });
                    if (related.length > 0) {
                        this.createRelation(element.id, related[0].id, 'references', {
                            automatic: true,
                            description: relData.type || 'related',
                        });
                    }
                }
            }
        }
    }
    async detectCodeRelations(element) {
        const data = element.data;
        // Detectar imports/dependências
        if (data.imports && Array.isArray(data.imports)) {
            for (const imp of data.imports) {
                const imported = this.queryElements({
                    types: ['file', 'class', 'function'],
                    textSearch: imp,
                    limit: 1,
                });
                if (imported.length > 0) {
                    this.createRelation(element.id, imported[0].id, 'depends-on', { automatic: true });
                }
            }
        }
        // Detectar herança
        if (data.extends) {
            const parent = this.queryElements({
                types: ['class'],
                textSearch: data.extends,
                limit: 1,
            });
            if (parent.length > 0) {
                this.createRelation(element.id, parent[0].id, 'derives-from', { automatic: true });
            }
        }
    }
    async detectMediaRelations(element) {
        const data = element.data;
        // Detectar referências a outros arquivos de mídia
        if (data.sourceFile) {
            const source = this.queryElements({
                types: ['file'],
                textSearch: data.sourceFile,
                limit: 1,
            });
            if (source.length > 0) {
                this.createRelation(element.id, source[0].id, 'references', { automatic: true });
            }
        }
        // Detectar sincronização com outras faixas
        if (data.syncWith) {
            const syncTarget = this.queryElements({
                textSearch: data.syncWith,
                limit: 1,
            });
            if (syncTarget.length > 0) {
                this.createRelation(element.id, syncTarget[0].id, 'synchronizes-with', { automatic: true });
            }
        }
    }
    // ========================================================================
    // NOTIFICAÇÕES
    // ========================================================================
    /**
     * Notifica elementos relacionados sobre mudanças
     */
    async notifyRelatedElements(elementId, changeType) {
        const relations = this.getRelationsFor(elementId);
        for (const relation of relations) {
            const relatedId = relation.sourceId === elementId
                ? relation.targetId
                : relation.sourceId;
            const related = this.elements.get(relatedId);
            if (related && related.state.visibility !== 'deleted') {
                // Marcar como potencialmente desatualizado
                if (['depends-on', 'synchronizes-with', 'references'].includes(relation.type)) {
                    const updated = {
                        ...related,
                        state: {
                            ...related.state,
                            validationStatus: 'pending',
                        },
                    };
                    this.elements.set(relatedId, updated);
                }
            }
        }
    }
    // ========================================================================
    // UTILITÁRIOS
    // ========================================================================
    generateId() {
        return `ctx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    }
    calculateChecksum(data) {
        const str = JSON.stringify(data);
        let hash = 0;
        for (let i = 0; i < str.length; i++) {
            const char = str.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash;
        }
        return Math.abs(hash).toString(16);
    }
    calculateContextChecksum() {
        const elements = Array.from(this.elements.values())
            .map(e => e.checksum)
            .join('');
        return this.calculateChecksum(elements);
    }
    detectChanges(before, after) {
        const changes = [];
        if (before.name !== after.name)
            changes.push('name');
        if (before.description !== after.description)
            changes.push('description');
        if (JSON.stringify(before.data) !== JSON.stringify(after.data))
            changes.push('data');
        if (JSON.stringify(before.tags) !== JSON.stringify(after.tags))
            changes.push('tags');
        if (before.state.status !== after.state.status)
            changes.push('status');
        return changes;
    }
    rebuildIndices() {
        this.indices = new ContextIndices();
        for (const element of this.elements.values()) {
            this.indices.indexElement(element);
        }
        for (const relation of this.relations.values()) {
            this.indices.indexRelation(relation);
        }
    }
    // ========================================================================
    // REGRAS BUILT-IN DE CONSISTÊNCIA
    // ========================================================================
    registerBuiltInRules() {
        // Regra: Cenas devem ter pelo menos um personagem ou localização
        this.consistencyRules.set('scene-not-empty', {
            id: 'scene-not-empty',
            name: 'Cena não vazia',
            description: 'Cenas devem conter elementos',
            elementTypes: ['scene'],
            check: async (element, context) => {
                const relations = context.getRelationsFor(element.id);
                const hasContent = relations.some(r => r.type === 'contains' || r.type === 'references');
                return {
                    consistent: hasContent,
                    issues: hasContent ? [] : [{
                            elementId: element.id,
                            relatedElementIds: [],
                            type: 'missing-relation',
                            severity: 'warning',
                            message: `Cena "${element.name}" não contém elementos`,
                            autoFixable: false,
                        }],
                };
            },
        });
        // Regra: Personagens devem ter descrição
        this.consistencyRules.set('character-has-description', {
            id: 'character-has-description',
            name: 'Personagem com descrição',
            description: 'Personagens devem ter descrição',
            elementTypes: ['character'],
            check: async (element) => {
                const hasDescription = element.description && element.description.length > 10;
                return {
                    consistent: !!hasDescription,
                    issues: hasDescription ? [] : [{
                            elementId: element.id,
                            relatedElementIds: [],
                            type: 'mismatch',
                            severity: 'info',
                            message: `Personagem "${element.name}" sem descrição detalhada`,
                            autoFixable: false,
                        }],
                };
            },
        });
        // Regra: Código deve ter testes
        this.consistencyRules.set('code-has-tests', {
            id: 'code-has-tests',
            name: 'Código testado',
            description: 'Funções e classes devem ter testes',
            elementTypes: ['function', 'class'],
            check: async (element, context) => {
                const relations = context.getRelationsFor(element.id);
                const hasTests = relations.some(r => {
                    const related = context.getElement(r.sourceId === element.id ? r.targetId : r.sourceId);
                    return related?.tags.includes('test');
                });
                return {
                    consistent: hasTests,
                    issues: hasTests ? [] : [{
                            elementId: element.id,
                            relatedElementIds: [],
                            type: 'missing-relation',
                            severity: 'warning',
                            message: `"${element.name}" não possui testes`,
                            autoFixable: false,
                        }],
                };
            },
        });
    }
    /**
     * Registra uma regra de consistência customizada
     */
    registerConsistencyRule(rule) {
        this.consistencyRules.set(rule.id, rule);
    }
    /**
     * Exporta contexto completo para JSON
     */
    exportToJSON() {
        return JSON.stringify({
            elements: Array.from(this.elements.entries()),
            relations: Array.from(this.relations.entries()),
            exportedAt: Date.now(),
        }, null, 2);
    }
    /**
     * Importa contexto de JSON
     */
    importFromJSON(json) {
        const data = JSON.parse(json);
        this.elements = new Map(data.elements);
        this.relations = new Map(data.relations);
        this.rebuildIndices();
    }
    /**
     * Obtém estatísticas do contexto
     */
    getStatistics() {
        const elementsByType = {};
        const relationsByType = {};
        for (const element of this.elements.values()) {
            elementsByType[element.type] = (elementsByType[element.type] || 0) + 1;
        }
        for (const relation of this.relations.values()) {
            relationsByType[relation.type] = (relationsByType[relation.type] || 0) + 1;
        }
        return {
            totalElements: this.elements.size,
            totalRelations: this.relations.size,
            elementsByType,
            relationsByType,
            averageRelationsPerElement: this.elements.size > 0
                ? this.relations.size / this.elements.size
                : 0,
        };
    }
};
exports.DeepContextEngine = DeepContextEngine;
exports.DeepContextEngine = DeepContextEngine = __decorate([
    (0, inversify_1.injectable)(),
    __metadata("design:paramtypes", [])
], DeepContextEngine);
// ============================================================================
// ÍNDICES PARA BUSCA RÁPIDA
// ============================================================================
class ContextIndices {
    constructor() {
        this.byType = new Map();
        this.byTag = new Map();
        this.byStatus = new Map();
        this.relationsBySource = new Map();
        this.relationsByTarget = new Map();
    }
    indexElement(element) {
        // Por tipo
        if (!this.byType.has(element.type)) {
            this.byType.set(element.type, new Set());
        }
        this.byType.get(element.type).add(element.id);
        // Por tag
        for (const tag of element.tags) {
            if (!this.byTag.has(tag)) {
                this.byTag.set(tag, new Set());
            }
            this.byTag.get(tag).add(element.id);
        }
        // Por status
        if (!this.byStatus.has(element.state.status)) {
            this.byStatus.set(element.state.status, new Set());
        }
        this.byStatus.get(element.state.status).add(element.id);
    }
    reindexElement(oldElement, newElement) {
        this.removeElementIndex(oldElement);
        this.indexElement(newElement);
    }
    removeElementIndex(element) {
        this.byType.get(element.type)?.delete(element.id);
        for (const tag of element.tags) {
            this.byTag.get(tag)?.delete(element.id);
        }
        this.byStatus.get(element.state.status)?.delete(element.id);
    }
    indexRelation(relation) {
        if (!this.relationsBySource.has(relation.sourceId)) {
            this.relationsBySource.set(relation.sourceId, new Set());
        }
        this.relationsBySource.get(relation.sourceId).add(relation.id);
        if (!this.relationsByTarget.has(relation.targetId)) {
            this.relationsByTarget.set(relation.targetId, new Set());
        }
        this.relationsByTarget.get(relation.targetId).add(relation.id);
    }
    removeRelationIndex(relation) {
        this.relationsBySource.get(relation.sourceId)?.delete(relation.id);
        this.relationsByTarget.get(relation.targetId)?.delete(relation.id);
    }
    getByType(type) {
        return this.byType.get(type) || new Set();
    }
    getByTag(tag) {
        return this.byTag.get(tag) || new Set();
    }
    getByStatus(status) {
        return this.byStatus.get(status) || new Set();
    }
}
