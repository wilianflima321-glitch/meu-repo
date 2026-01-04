/**
 * Monaco Editor Configuration
 * Complete LSP features, formatting, and editor settings
 */
export interface EditorConfiguration {
    hover: boolean;
    completion: boolean;
    definition: boolean;
    references: boolean;
    rename: boolean;
    formatting: boolean;
    diagnostics: boolean;
    codeActions: boolean;
    formatOnSave: boolean;
    formatOnPaste: boolean;
    autoSave: 'off' | 'afterDelay' | 'onFocusChange' | 'onWindowChange';
    autoSaveDelay: number;
    minimap: boolean;
    lineNumbers: 'on' | 'off' | 'relative';
    renderWhitespace: 'none' | 'boundary' | 'selection' | 'all';
    wordWrap: 'off' | 'on' | 'wordWrapColumn' | 'bounded';
}
export declare const DEFAULT_EDITOR_CONFIG: EditorConfiguration;
/**
 * Monaco Editor Options
 * Maps to Monaco IEditorOptions
 */
export declare function getMonacoOptions(config: EditorConfiguration): any;
/**
 * Keyboard Shortcuts for Editor
 */
export declare const EDITOR_SHORTCUTS: {
    save: {
        windows: string;
        mac: string;
        linux: string;
    };
    saveAll: {
        windows: string;
        mac: string;
        linux: string;
    };
    closeEditor: {
        windows: string;
        mac: string;
        linux: string;
    };
    undo: {
        windows: string;
        mac: string;
        linux: string;
    };
    redo: {
        windows: string;
        mac: string;
        linux: string;
    };
    cut: {
        windows: string;
        mac: string;
        linux: string;
    };
    copy: {
        windows: string;
        mac: string;
        linux: string;
    };
    paste: {
        windows: string;
        mac: string;
        linux: string;
    };
    format: {
        windows: string;
        mac: string;
        linux: string;
    };
    formatSelection: {
        windows: string;
        mac: string;
        linux: string;
    };
    goToDefinition: {
        windows: string;
        mac: string;
        linux: string;
    };
    peekDefinition: {
        windows: string;
        mac: string;
        linux: string;
    };
    goToReferences: {
        windows: string;
        mac: string;
        linux: string;
    };
    goToImplementation: {
        windows: string;
        mac: string;
        linux: string;
    };
    goToTypeDefinition: {
        windows: string;
        mac: string;
        linux: string;
    };
    rename: {
        windows: string;
        mac: string;
        linux: string;
    };
    quickFix: {
        windows: string;
        mac: string;
        linux: string;
    };
    find: {
        windows: string;
        mac: string;
        linux: string;
    };
    replace: {
        windows: string;
        mac: string;
        linux: string;
    };
    findInFiles: {
        windows: string;
        mac: string;
        linux: string;
    };
    replaceInFiles: {
        windows: string;
        mac: string;
        linux: string;
    };
    addCursorAbove: {
        windows: string;
        mac: string;
        linux: string;
    };
    addCursorBelow: {
        windows: string;
        mac: string;
        linux: string;
    };
    addSelectionToNextMatch: {
        windows: string;
        mac: string;
        linux: string;
    };
    selectAllOccurrences: {
        windows: string;
        mac: string;
        linux: string;
    };
    moveLinesUp: {
        windows: string;
        mac: string;
        linux: string;
    };
    moveLinesDown: {
        windows: string;
        mac: string;
        linux: string;
    };
    copyLinesUp: {
        windows: string;
        mac: string;
        linux: string;
    };
    copyLinesDown: {
        windows: string;
        mac: string;
        linux: string;
    };
    deleteLine: {
        windows: string;
        mac: string;
        linux: string;
    };
    toggleLineComment: {
        windows: string;
        mac: string;
        linux: string;
    };
    toggleBlockComment: {
        windows: string;
        mac: string;
        linux: string;
    };
    fold: {
        windows: string;
        mac: string;
        linux: string;
    };
    unfold: {
        windows: string;
        mac: string;
        linux: string;
    };
    foldAll: {
        windows: string;
        mac: string;
        linux: string;
    };
    unfoldAll: {
        windows: string;
        mac: string;
        linux: string;
    };
    toggleTerminal: {
        windows: string;
        mac: string;
        linux: string;
    };
    toggleSidebar: {
        windows: string;
        mac: string;
        linux: string;
    };
    togglePanel: {
        windows: string;
        mac: string;
        linux: string;
    };
    commandPalette: {
        windows: string;
        mac: string;
        linux: string;
    };
    quickOpen: {
        windows: string;
        mac: string;
        linux: string;
    };
};
/**
 * Get shortcut for current platform
 */
export declare function getShortcut(action: keyof typeof EDITOR_SHORTCUTS): string;
