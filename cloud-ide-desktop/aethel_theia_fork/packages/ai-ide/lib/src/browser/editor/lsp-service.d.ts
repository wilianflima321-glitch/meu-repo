/**
 * LSP Service
 * Manages Language Server Protocol features
 */
export interface LSPFeature {
    id: string;
    name: string;
    enabled: boolean;
    shortcut?: string;
}
export interface DiagnosticMessage {
    severity: 'error' | 'warning' | 'info' | 'hint';
    message: string;
    line: number;
    column: number;
    source?: string;
}
export declare class LSPService {
    private features;
    private diagnostics;
    constructor();
    private initializeFeatures;
    /**
     * Get all LSP features
     */
    getFeatures(): LSPFeature[];
    /**
     * Check if feature is enabled
     */
    isFeatureEnabled(featureId: string): boolean;
    /**
     * Enable/disable feature
     */
    setFeatureEnabled(featureId: string, enabled: boolean): void;
    /**
     * Add diagnostic messages for a file
     */
    addDiagnostics(uri: string, diagnostics: DiagnosticMessage[]): void;
    /**
     * Get diagnostics for a file
     */
    getDiagnostics(uri: string): DiagnosticMessage[];
    /**
     * Clear diagnostics for a file
     */
    clearDiagnostics(uri: string): void;
    /**
     * Get all diagnostics
     */
    getAllDiagnostics(): Map<string, DiagnosticMessage[]>;
    /**
     * Get diagnostic counts by severity
     */
    getDiagnosticCounts(): {
        errors: number;
        warnings: number;
        info: number;
        hints: number;
    };
    /**
     * Format document
     */
    formatDocument(uri: string, content: string): Promise<string>;
    /**
     * Format selection
     */
    formatSelection(uri: string, content: string, startLine: number, endLine: number): Promise<string>;
    /**
     * Rename symbol
     */
    renameSymbol(uri: string, line: number, column: number, newName: string): Promise<Map<string, Array<{
        line: number;
        column: number;
        length: number;
    }>>>;
    /**
     * Find references
     */
    findReferences(uri: string, line: number, column: number): Promise<Array<{
        uri: string;
        line: number;
        column: number;
        preview: string;
    }>>;
    /**
     * Go to definition
     */
    goToDefinition(uri: string, line: number, column: number): Promise<{
        uri: string;
        line: number;
        column: number;
    } | null>;
    /**
     * Get hover information
     */
    getHoverInfo(uri: string, line: number, column: number): Promise<{
        contents: string[];
        range?: {
            start: number;
            end: number;
        };
    } | null>;
    /**
     * Get code actions (quick fixes)
     */
    getCodeActions(uri: string, line: number, column: number): Promise<Array<{
        title: string;
        kind: string;
        command?: string;
    }>>;
    /**
     * Get completion items
     */
    getCompletions(uri: string, line: number, column: number, triggerCharacter?: string): Promise<Array<{
        label: string;
        kind: string;
        detail?: string;
        documentation?: string;
        insertText?: string;
    }>>;
    /**
     * Validate LSP server connection
     */
    validateConnection(): Promise<{
        connected: boolean;
        features: string[];
    }>;
    /**
     * Get LSP status for UI
     */
    getStatus(): {
        connected: boolean;
        activeFeatures: number;
        totalFeatures: number;
        diagnosticCounts: {
            errors: number;
            warnings: number;
            info: number;
            hints: number;
        };
    };
}
