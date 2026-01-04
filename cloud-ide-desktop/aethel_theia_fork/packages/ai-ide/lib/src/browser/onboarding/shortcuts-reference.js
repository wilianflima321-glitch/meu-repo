"use strict";
/**
 * Keyboard Shortcuts Reference
 * Professional shortcuts for AI IDE features
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AI_IDE_SHORTCUTS = void 0;
exports.getShortcutsByCategory = getShortcutsByCategory;
exports.getShortcutKeys = getShortcutKeys;
exports.getAllCategories = getAllCategories;
exports.AI_IDE_SHORTCUTS = [
    // AI Panel
    {
        id: 'ai.panel.toggle',
        label: 'Toggle AI Panel',
        keys: {
            windows: 'Ctrl+Shift+A',
            mac: 'Cmd+Shift+A',
            linux: 'Ctrl+Shift+A'
        },
        description: 'Open or close the AI assistant panel',
        category: 'AI'
    },
    {
        id: 'ai.agent.select',
        label: 'Select Agent',
        keys: {
            windows: 'Ctrl+Shift+G',
            mac: 'Cmd+Shift+G',
            linux: 'Ctrl+Shift+G'
        },
        description: 'Quick select AI agent',
        category: 'AI'
    },
    // Executor
    {
        id: 'executor.showLogs',
        label: 'Show Executor Logs',
        keys: {
            windows: 'Ctrl+Shift+E',
            mac: 'Cmd+Shift+E',
            linux: 'Ctrl+Shift+E'
        },
        description: 'Open workspace executor output channel',
        category: 'Executor'
    },
    {
        id: 'executor.execute',
        label: 'Execute Command',
        keys: {
            windows: 'Ctrl+Shift+X',
            mac: 'Cmd+Shift+X',
            linux: 'Ctrl+Shift+X'
        },
        description: 'Execute command in workspace',
        category: 'Executor'
    },
    {
        id: 'executor.exportMetrics',
        label: 'Export Executor Metrics',
        keys: {
            windows: 'Ctrl+Shift+M',
            mac: 'Cmd+Shift+M',
            linux: 'Ctrl+Shift+M'
        },
        description: 'Export executor metrics in Prometheus format',
        category: 'Executor'
    },
    // Configuration
    {
        id: 'ai.config.open',
        label: 'Open AI Configuration',
        keys: {
            windows: 'Ctrl+Shift+,',
            mac: 'Cmd+Shift+,',
            linux: 'Ctrl+Shift+,'
        },
        description: 'Open AI configuration panel',
        category: 'Configuration'
    },
    // Health & Observability
    {
        id: 'ai.health.open',
        label: 'Open AI Health',
        keys: {
            windows: 'Ctrl+Shift+H',
            mac: 'Cmd+Shift+H',
            linux: 'Ctrl+Shift+H'
        },
        description: 'View AI system health and metrics',
        category: 'Health'
    },
    // Voice
    {
        id: 'ai.voice.toggle',
        label: 'Toggle Voice Input',
        keys: {
            windows: 'Ctrl+Shift+V',
            mac: 'Cmd+Shift+V',
            linux: 'Ctrl+Shift+V'
        },
        description: 'Start or stop voice input',
        category: 'Voice'
    },
    // Preview
    {
        id: 'ai.preview.toggle',
        label: 'Toggle Live Preview',
        keys: {
            windows: 'Ctrl+Shift+P',
            mac: 'Cmd+Shift+P',
            linux: 'Ctrl+Shift+P'
        },
        description: 'Show or hide live preview panel',
        category: 'Preview'
    }
];
function getShortcutsByCategory(category) {
    return exports.AI_IDE_SHORTCUTS.filter(s => s.category === category);
}
function getShortcutKeys(shortcutId) {
    const shortcut = exports.AI_IDE_SHORTCUTS.find(s => s.id === shortcutId);
    if (!shortcut)
        return '';
    const platform = getPlatform();
    return shortcut.keys[platform];
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
function getAllCategories() {
    const categories = new Set(exports.AI_IDE_SHORTCUTS.map(s => s.category));
    return Array.from(categories);
}
