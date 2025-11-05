import { PreferenceProxy, PreferenceSchema, PreferenceService } from '@theia/core/lib/common/preferences';
import { interfaces } from '@theia/core/shared/inversify';
export type ChatToolPreferences = PreferenceProxy<ChatToolConfiguration>;
export declare const ChatToolPreferenceContribution: unique symbol;
export declare const ChatToolPreferences: unique symbol;
export declare function createChatToolPreferences(preferences: PreferenceService, schema?: PreferenceSchema): ChatToolPreferences;
export declare function bindChatToolPreferences(bind: interfaces.Bind): void;
/**
 * Enum for tool confirmation modes
 */
export declare enum ToolConfirmationMode {
    ALWAYS_ALLOW = "always_allow",
    CONFIRM = "confirm",
    DISABLED = "disabled"
}
export declare const TOOL_CONFIRMATION_PREFERENCE = "ai-features.chat.toolConfirmation";
export declare const chatToolPreferences: PreferenceSchema;
export interface ChatToolConfiguration {
    [TOOL_CONFIRMATION_PREFERENCE]: {
        [toolId: string]: ToolConfirmationMode;
    };
}
//# sourceMappingURL=chat-tool-preferences.d.ts.map