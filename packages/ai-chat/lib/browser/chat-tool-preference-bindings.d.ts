import { PreferenceService } from '@theia/core/lib/common/preferences';
import { ToolConfirmationMode, ChatToolPreferences } from '../common/chat-tool-preferences';
/**
 * Utility class to manage tool confirmation settings
 */
export declare class ToolConfirmationManager {
    protected readonly preferences: ChatToolPreferences;
    protected readonly preferenceService: PreferenceService;
    protected sessionOverrides: Map<string, Map<string, ToolConfirmationMode>>;
    /**
     * Get the confirmation mode for a specific tool, considering session overrides first (per chat)
     */
    getConfirmationMode(toolId: string, chatId: string): ToolConfirmationMode;
    /**
     * Set the confirmation mode for a specific tool (persisted)
     */
    setConfirmationMode(toolId: string, mode: ToolConfirmationMode): void;
    /**
     * Set the confirmation mode for a specific tool for this session only (not persisted, per chat)
     */
    setSessionConfirmationMode(toolId: string, mode: ToolConfirmationMode, chatId: string): void;
    /**
     * Clear all session overrides for a specific chat, or all if no chatId is given
     */
    clearSessionOverrides(chatId?: string): void;
    /**
     * Get all tool confirmation settings
     */
    getAllConfirmationSettings(): {
        [toolId: string]: ToolConfirmationMode;
    };
    resetAllConfirmationModeSettings(): void;
}
//# sourceMappingURL=chat-tool-preference-bindings.d.ts.map