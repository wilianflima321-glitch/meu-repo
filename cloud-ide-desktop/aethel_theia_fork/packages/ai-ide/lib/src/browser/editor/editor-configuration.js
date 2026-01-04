"use strict";
/**
 * Monaco Editor Configuration
 * Complete LSP features, formatting, and editor settings
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.EDITOR_SHORTCUTS = exports.DEFAULT_EDITOR_CONFIG = void 0;
exports.getMonacoOptions = getMonacoOptions;
exports.getShortcut = getShortcut;
exports.DEFAULT_EDITOR_CONFIG = {
    // LSP Features - all enabled
    hover: true,
    completion: true,
    definition: true,
    references: true,
    rename: true,
    formatting: true,
    diagnostics: true,
    codeActions: true,
    // Editor Behavior
    formatOnSave: true,
    formatOnPaste: false,
    autoSave: 'afterDelay',
    autoSaveDelay: 1000,
    // UI
    minimap: true,
    lineNumbers: 'on',
    renderWhitespace: 'selection',
    wordWrap: 'off'
};
/**
 * Monaco Editor Options
 * Maps to Monaco IEditorOptions
 */
function getMonacoOptions(config) {
    return {
        // LSP Features
        hover: {
            enabled: config.hover,
            delay: 300,
            sticky: true
        },
        quickSuggestions: {
            other: config.completion,
            comments: false,
            strings: false
        },
        suggestOnTriggerCharacters: config.completion,
        acceptSuggestionOnCommitCharacter: config.completion,
        acceptSuggestionOnEnter: 'on',
        tabCompletion: 'on',
        // Go to definition
        gotoLocation: {
            multiple: 'goto',
            multipleDefinitions: 'goto',
            multipleTypeDefinitions: 'goto',
            multipleDeclarations: 'goto',
            multipleImplementations: 'goto',
            multipleReferences: 'goto'
        },
        // Formatting
        formatOnType: true,
        formatOnPaste: config.formatOnPaste,
        // Diagnostics
        'semanticHighlighting.enabled': true,
        // UI
        minimap: {
            enabled: config.minimap,
            maxColumn: 120,
            renderCharacters: true,
            showSlider: 'mouseover'
        },
        lineNumbers: config.lineNumbers,
        renderWhitespace: config.renderWhitespace,
        wordWrap: config.wordWrap,
        // Accessibility
        accessibilitySupport: 'auto',
        accessibilityPageSize: 10,
        // Performance
        smoothScrolling: true,
        cursorBlinking: 'smooth',
        cursorSmoothCaretAnimation: 'on',
        // Font
        fontFamily: 'JetBrains Mono, Fira Code, Consolas, monospace',
        fontSize: 14,
        fontLigatures: true,
        lineHeight: 22,
        letterSpacing: 0.5,
        // Scrolling
        scrollBeyondLastLine: false,
        scrollbar: {
            vertical: 'auto',
            horizontal: 'auto',
            useShadows: true,
            verticalScrollbarSize: 14,
            horizontalScrollbarSize: 14
        },
        // Selection
        selectionHighlight: true,
        occurrencesHighlight: 'singleFile',
        // Bracket matching
        matchBrackets: 'always',
        bracketPairColorization: {
            enabled: true
        },
        // Indentation
        tabSize: 2,
        insertSpaces: true,
        detectIndentation: true,
        trimAutoWhitespace: true,
        // Code lens
        codeLens: true,
        // Folding
        folding: true,
        foldingStrategy: 'auto',
        showFoldingControls: 'mouseover',
        // Find
        find: {
            seedSearchStringFromSelection: 'selection',
            autoFindInSelection: 'never',
            addExtraSpaceOnTop: true
        }
    };
}
/**
 * Keyboard Shortcuts for Editor
 */
exports.EDITOR_SHORTCUTS = {
    // File Operations
    save: { windows: 'Ctrl+S', mac: 'Cmd+S', linux: 'Ctrl+S' },
    saveAll: { windows: 'Ctrl+K S', mac: 'Cmd+K S', linux: 'Ctrl+K S' },
    closeEditor: { windows: 'Ctrl+W', mac: 'Cmd+W', linux: 'Ctrl+W' },
    // Editing
    undo: { windows: 'Ctrl+Z', mac: 'Cmd+Z', linux: 'Ctrl+Z' },
    redo: { windows: 'Ctrl+Y', mac: 'Cmd+Shift+Z', linux: 'Ctrl+Y' },
    cut: { windows: 'Ctrl+X', mac: 'Cmd+X', linux: 'Ctrl+X' },
    copy: { windows: 'Ctrl+C', mac: 'Cmd+C', linux: 'Ctrl+C' },
    paste: { windows: 'Ctrl+V', mac: 'Cmd+V', linux: 'Ctrl+V' },
    // Formatting
    format: { windows: 'Shift+Alt+F', mac: 'Shift+Option+F', linux: 'Ctrl+Shift+I' },
    formatSelection: { windows: 'Ctrl+K Ctrl+F', mac: 'Cmd+K Cmd+F', linux: 'Ctrl+K Ctrl+F' },
    // Navigation
    goToDefinition: { windows: 'F12', mac: 'F12', linux: 'F12' },
    peekDefinition: { windows: 'Alt+F12', mac: 'Option+F12', linux: 'Alt+F12' },
    goToReferences: { windows: 'Shift+F12', mac: 'Shift+F12', linux: 'Shift+F12' },
    goToImplementation: { windows: 'Ctrl+F12', mac: 'Cmd+F12', linux: 'Ctrl+F12' },
    goToTypeDefinition: { windows: 'Ctrl+K Ctrl+T', mac: 'Cmd+K Cmd+T', linux: 'Ctrl+K Ctrl+T' },
    // Refactoring
    rename: { windows: 'F2', mac: 'F2', linux: 'F2' },
    quickFix: { windows: 'Ctrl+.', mac: 'Cmd+.', linux: 'Ctrl+.' },
    // Search
    find: { windows: 'Ctrl+F', mac: 'Cmd+F', linux: 'Ctrl+F' },
    replace: { windows: 'Ctrl+H', mac: 'Cmd+Option+F', linux: 'Ctrl+H' },
    findInFiles: { windows: 'Ctrl+Shift+F', mac: 'Cmd+Shift+F', linux: 'Ctrl+Shift+F' },
    replaceInFiles: { windows: 'Ctrl+Shift+H', mac: 'Cmd+Shift+H', linux: 'Ctrl+Shift+H' },
    // Multi-cursor
    addCursorAbove: { windows: 'Ctrl+Alt+Up', mac: 'Cmd+Option+Up', linux: 'Ctrl+Alt+Up' },
    addCursorBelow: { windows: 'Ctrl+Alt+Down', mac: 'Cmd+Option+Down', linux: 'Ctrl+Alt+Down' },
    addSelectionToNextMatch: { windows: 'Ctrl+D', mac: 'Cmd+D', linux: 'Ctrl+D' },
    selectAllOccurrences: { windows: 'Ctrl+Shift+L', mac: 'Cmd+Shift+L', linux: 'Ctrl+Shift+L' },
    // Lines
    moveLinesUp: { windows: 'Alt+Up', mac: 'Option+Up', linux: 'Alt+Up' },
    moveLinesDown: { windows: 'Alt+Down', mac: 'Option+Down', linux: 'Alt+Down' },
    copyLinesUp: { windows: 'Shift+Alt+Up', mac: 'Shift+Option+Up', linux: 'Shift+Alt+Up' },
    copyLinesDown: { windows: 'Shift+Alt+Down', mac: 'Shift+Option+Down', linux: 'Shift+Alt+Down' },
    deleteLine: { windows: 'Ctrl+Shift+K', mac: 'Cmd+Shift+K', linux: 'Ctrl+Shift+K' },
    // Comments
    toggleLineComment: { windows: 'Ctrl+/', mac: 'Cmd+/', linux: 'Ctrl+/' },
    toggleBlockComment: { windows: 'Shift+Alt+A', mac: 'Shift+Option+A', linux: 'Ctrl+Shift+A' },
    // Folding
    fold: { windows: 'Ctrl+Shift+[', mac: 'Cmd+Option+[', linux: 'Ctrl+Shift+[' },
    unfold: { windows: 'Ctrl+Shift+]', mac: 'Cmd+Option+]', linux: 'Ctrl+Shift+]' },
    foldAll: { windows: 'Ctrl+K Ctrl+0', mac: 'Cmd+K Cmd+0', linux: 'Ctrl+K Ctrl+0' },
    unfoldAll: { windows: 'Ctrl+K Ctrl+J', mac: 'Cmd+K Cmd+J', linux: 'Ctrl+K Ctrl+J' },
    // Panels
    toggleTerminal: { windows: 'Ctrl+`', mac: 'Cmd+`', linux: 'Ctrl+`' },
    toggleSidebar: { windows: 'Ctrl+B', mac: 'Cmd+B', linux: 'Ctrl+B' },
    togglePanel: { windows: 'Ctrl+J', mac: 'Cmd+J', linux: 'Ctrl+J' },
    // Command Palette
    commandPalette: { windows: 'Ctrl+Shift+P', mac: 'Cmd+Shift+P', linux: 'Ctrl+Shift+P' },
    quickOpen: { windows: 'Ctrl+P', mac: 'Cmd+P', linux: 'Ctrl+P' }
};
/**
 * Get shortcut for current platform
 */
function getShortcut(action) {
    const platform = getPlatform();
    return exports.EDITOR_SHORTCUTS[action][platform];
}
function getPlatform() {
    if (typeof navigator === 'undefined')
        return 'linux';
    const ua = navigator.userAgent.toLowerCase();
    if (ua.includes('mac'))
        return 'mac';
    if (ua.includes('win'))
        return 'windows';
    return 'linux';
}
