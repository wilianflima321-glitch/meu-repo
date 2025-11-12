import { ToolProvider, ToolRequest } from '@theia/ai-core';
import { DebugConfigurationManager } from '@theia/debug/lib/browser/debug-configuration-manager';
import { DebugSessionManager } from '@theia/debug/lib/browser/debug-session-manager';
export declare class LaunchListProvider implements ToolProvider {
    protected readonly debugConfigurationManager: DebugConfigurationManager;
    getTool(): ToolRequest;
    private getAvailableLaunchConfigurations;
    private getDisplayName;
}
export declare class LaunchRunnerProvider implements ToolProvider {
    protected readonly debugConfigurationManager: DebugConfigurationManager;
    protected readonly debugSessionManager: DebugSessionManager;
    getTool(): ToolRequest;
    private handleRunLaunchConfiguration;
    private findConfigurationByName;
    private getDisplayName;
}
export declare class LaunchStopProvider implements ToolProvider {
    protected readonly debugSessionManager: DebugSessionManager;
    getTool(): ToolRequest;
    private handleStopLaunchConfiguration;
    private findSessionByConfigurationName;
}
//# sourceMappingURL=workspace-launch-provider.d.ts.map