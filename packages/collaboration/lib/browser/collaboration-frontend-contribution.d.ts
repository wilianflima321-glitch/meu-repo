import '../../src/browser/style/index.css';
import { CancellationToken, Command, CommandContribution, CommandRegistry, MessageService, PreferenceService, QuickInputService, QuickPickItem } from '@theia/core';
import { AuthMetadata, AuthProvider, ConnectionProvider, FormAuthProvider, WebAuthProvider } from 'open-collaboration-protocol';
import { WindowService } from '@theia/core/lib/browser/window/window-service';
import { CollaborationInstance, CollaborationInstanceFactory } from './collaboration-instance';
import { EnvVariablesServer } from '@theia/core/lib/common/env-variables';
import { CollaborationWorkspaceService } from './collaboration-workspace-service';
import { StatusBar, StatusBarEntry } from '@theia/core/lib/browser/status-bar';
export declare const COLLABORATION_CATEGORY = "Collaboration";
export declare namespace CollaborationCommands {
    const CREATE_ROOM: Command;
    const JOIN_ROOM: Command;
    const SIGN_OUT: Command;
}
export interface CollaborationAuthQuickPickItem extends QuickPickItem {
    provider: AuthProvider;
}
export declare const COLLABORATION_STATUS_BAR_ID = "statusBar.collaboration";
export declare const COLLABORATION_AUTH_TOKEN = "THEIA_COLLAB_AUTH_TOKEN";
export declare const COLLABORATION_SERVER_URL = "COLLABORATION_SERVER_URL";
export declare const DEFAULT_COLLABORATION_SERVER_URL = "https://api.open-collab.tools/";
export declare class CollaborationFrontendContribution implements CommandContribution {
    protected readonly windowService: WindowService;
    protected readonly quickInputService?: QuickInputService;
    protected readonly envVariables: EnvVariablesServer;
    protected readonly workspaceService: CollaborationWorkspaceService;
    protected readonly messageService: MessageService;
    protected readonly commands: CommandRegistry;
    protected readonly preferenceService: PreferenceService;
    protected readonly statusBar: StatusBar;
    protected readonly collaborationInstanceFactory: CollaborationInstanceFactory;
    protected currentInstance?: CollaborationInstance;
    protected init(): void;
    protected createConnectionProvider(): Promise<ConnectionProvider>;
    protected handleAuth(serverUrl: string, token: string, metaData: AuthMetadata): Promise<boolean>;
    protected handleFormAuth(serverUrl: string, token: string, provider: FormAuthProvider): Promise<boolean>;
    protected handleWebAuth(serverUrl: string, token: string, provider: WebAuthProvider): Promise<boolean>;
    protected onStatusDefaultClick(): Promise<void>;
    protected onStatusSharedClick(code: string): Promise<void>;
    protected onStatusConnectedClick(code: string): Promise<void>;
    protected setStatusBarEntryDefault(): Promise<void>;
    protected setStatusBarEntryShared(code: string): Promise<void>;
    protected setStatusBarEntryConnected(code: string): Promise<void>;
    protected setStatusBarEntry(entry: Omit<StatusBarEntry, 'alignment'>): Promise<void>;
    protected getCollaborationServerUrl(): Promise<string>;
    registerCommands(commands: CommandRegistry): void;
    protected toAbortSignal(...tokens: CancellationToken[]): AbortSignal;
    protected displayCopyNotification(code: string, firstTime?: boolean): Promise<void>;
}
//# sourceMappingURL=collaboration-frontend-contribution.d.ts.map