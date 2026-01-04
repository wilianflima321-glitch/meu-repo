/**
 * Keyboard Shortcuts Reference
 * Professional shortcuts for AI IDE features
 */
export interface Shortcut {
    id: string;
    label: string;
    keys: {
        windows: string;
        mac: string;
        linux: string;
    };
    description: string;
    category: string;
}
export declare const AI_IDE_SHORTCUTS: Shortcut[];
export declare function getShortcutsByCategory(category: string): Shortcut[];
export declare function getShortcutKeys(shortcutId: string): string;
export declare function getAllCategories(): string[];
