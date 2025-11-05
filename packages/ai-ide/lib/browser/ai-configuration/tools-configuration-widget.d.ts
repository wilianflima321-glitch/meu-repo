import { ReactWidget } from '@theia/core/lib/browser';
import * as React from '@theia/core/shared/react';
import { ToolInvocationRegistry } from '@theia/ai-core';
import { PreferenceService } from '@theia/core';
import { ToolConfirmationManager } from '@theia/ai-chat/lib/browser/chat-tool-preference-bindings';
import { ToolConfirmationMode } from '@theia/ai-chat/lib/common/chat-tool-preferences';
export declare class AIToolsConfigurationWidget extends ReactWidget {
    static readonly ID = "ai-tools-configuration-widget";
    static readonly LABEL = "Tools";
    protected readonly confirmationManager: ToolConfirmationManager;
    protected readonly preferenceService: PreferenceService;
    protected readonly toolInvocationRegistry: ToolInvocationRegistry;
    protected tools: string[];
    protected toolConfirmationModes: Record<string, ToolConfirmationMode>;
    protected defaultState: ToolConfirmationMode;
    protected loading: boolean;
    protected init(): void;
    protected loadData(): Promise<void>;
    protected loadTools(): Promise<string[]>;
    protected loadDefaultConfirmation(): Promise<ToolConfirmationMode>;
    protected loadToolConfigurationModes(): Promise<Record<string, ToolConfirmationMode>>;
    protected updateToolConfirmationMode(tool: string, state: ToolConfirmationMode): Promise<void>;
    protected updateDefaultConfirmation(state: ToolConfirmationMode): Promise<void>;
    protected handleToolConfirmationModeChange: (tool: string, event: React.ChangeEvent<HTMLSelectElement>) => Promise<void>;
    protected handleDefaultStateChange: (event: React.ChangeEvent<HTMLSelectElement>) => Promise<void>;
    protected resetAllToolsToDefault(): Promise<void>;
    protected render(): React.ReactNode;
}
//# sourceMappingURL=tools-configuration-widget.d.ts.map