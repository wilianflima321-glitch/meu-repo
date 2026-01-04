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
exports.LSPService = void 0;
const inversify_1 = require("inversify");
let LSPService = class LSPService {
    constructor() {
        this.features = new Map();
        this.diagnostics = new Map();
        this.initializeFeatures();
    }
    initializeFeatures() {
        const features = [
            {
                id: 'hover',
                name: 'Hover Information',
                enabled: true,
                shortcut: 'Hover over symbol'
            },
            {
                id: 'completion',
                name: 'Code Completion',
                enabled: true,
                shortcut: 'Ctrl+Space'
            },
            {
                id: 'definition',
                name: 'Go to Definition',
                enabled: true,
                shortcut: 'F12'
            },
            {
                id: 'references',
                name: 'Find References',
                enabled: true,
                shortcut: 'Shift+F12'
            },
            {
                id: 'rename',
                name: 'Rename Symbol',
                enabled: true,
                shortcut: 'F2'
            },
            {
                id: 'formatting',
                name: 'Format Document',
                enabled: true,
                shortcut: 'Shift+Alt+F'
            },
            {
                id: 'diagnostics',
                name: 'Real-time Diagnostics',
                enabled: true
            },
            {
                id: 'codeActions',
                name: 'Code Actions (Quick Fix)',
                enabled: true,
                shortcut: 'Ctrl+.'
            },
            {
                id: 'signatureHelp',
                name: 'Signature Help',
                enabled: true,
                shortcut: 'Ctrl+Shift+Space'
            },
            {
                id: 'documentSymbols',
                name: 'Document Symbols',
                enabled: true,
                shortcut: 'Ctrl+Shift+O'
            },
            {
                id: 'workspaceSymbols',
                name: 'Workspace Symbols',
                enabled: true,
                shortcut: 'Ctrl+T'
            },
            {
                id: 'codeLens',
                name: 'Code Lens',
                enabled: true
            },
            {
                id: 'inlayHints',
                name: 'Inlay Hints',
                enabled: true
            }
        ];
        for (const feature of features) {
            this.features.set(feature.id, feature);
        }
    }
    /**
     * Get all LSP features
     */
    getFeatures() {
        return Array.from(this.features.values());
    }
    /**
     * Check if feature is enabled
     */
    isFeatureEnabled(featureId) {
        return this.features.get(featureId)?.enabled ?? false;
    }
    /**
     * Enable/disable feature
     */
    setFeatureEnabled(featureId, enabled) {
        const feature = this.features.get(featureId);
        if (feature) {
            feature.enabled = enabled;
        }
    }
    /**
     * Add diagnostic messages for a file
     */
    addDiagnostics(uri, diagnostics) {
        this.diagnostics.set(uri, diagnostics);
    }
    /**
     * Get diagnostics for a file
     */
    getDiagnostics(uri) {
        return this.diagnostics.get(uri) || [];
    }
    /**
     * Clear diagnostics for a file
     */
    clearDiagnostics(uri) {
        this.diagnostics.delete(uri);
    }
    /**
     * Get all diagnostics
     */
    getAllDiagnostics() {
        return new Map(this.diagnostics);
    }
    /**
     * Get diagnostic counts by severity
     */
    getDiagnosticCounts() {
        let errors = 0;
        let warnings = 0;
        let info = 0;
        let hints = 0;
        for (const diagnostics of this.diagnostics.values()) {
            for (const diagnostic of diagnostics) {
                switch (diagnostic.severity) {
                    case 'error':
                        errors++;
                        break;
                    case 'warning':
                        warnings++;
                        break;
                    case 'info':
                        info++;
                        break;
                    case 'hint':
                        hints++;
                        break;
                }
            }
        }
        return { errors, warnings, info, hints };
    }
    /**
     * Format document
     */
    async formatDocument(uri, content) {
        // Placeholder - actual formatting would be done by LSP server
        // This would integrate with language-specific formatters
        return content;
    }
    /**
     * Format selection
     */
    async formatSelection(uri, content, startLine, endLine) {
        // Placeholder - actual formatting would be done by LSP server
        return content;
    }
    /**
     * Rename symbol
     */
    async renameSymbol(uri, line, column, newName) {
        // Placeholder - actual rename would be done by LSP server
        // Returns map of file URIs to edit locations
        return new Map();
    }
    /**
     * Find references
     */
    async findReferences(uri, line, column) {
        // Placeholder - actual search would be done by LSP server
        return [];
    }
    /**
     * Go to definition
     */
    async goToDefinition(uri, line, column) {
        // Placeholder - actual navigation would be done by LSP server
        return null;
    }
    /**
     * Get hover information
     */
    async getHoverInfo(uri, line, column) {
        // Placeholder - actual hover would be provided by LSP server
        return null;
    }
    /**
     * Get code actions (quick fixes)
     */
    async getCodeActions(uri, line, column) {
        // Placeholder - actual code actions would be provided by LSP server
        return [];
    }
    /**
     * Get completion items
     */
    async getCompletions(uri, line, column, triggerCharacter) {
        // Placeholder - actual completions would be provided by LSP server
        return [];
    }
    /**
     * Validate LSP server connection
     */
    async validateConnection() {
        // Check which LSP features are actually available
        const availableFeatures = [];
        for (const [id, feature] of this.features) {
            if (feature.enabled) {
                availableFeatures.push(id);
            }
        }
        return {
            connected: true, // Would check actual LSP server connection
            features: availableFeatures
        };
    }
    /**
     * Get LSP status for UI
     */
    getStatus() {
        const features = this.getFeatures();
        const activeFeatures = features.filter(f => f.enabled).length;
        const diagnosticCounts = this.getDiagnosticCounts();
        return {
            connected: true,
            activeFeatures,
            totalFeatures: features.length,
            diagnosticCounts
        };
    }
};
exports.LSPService = LSPService;
exports.LSPService = LSPService = __decorate([
    (0, inversify_1.injectable)(),
    __metadata("design:paramtypes", [])
], LSPService);
