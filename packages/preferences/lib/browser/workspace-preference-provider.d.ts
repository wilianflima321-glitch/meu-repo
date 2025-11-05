import URI from '@theia/core/lib/common/uri';
import { DisposableCollection } from '@theia/core/lib/common/disposable';
import { WorkspaceService } from '@theia/workspace/lib/browser/workspace-service';
import { WorkspaceFilePreferenceProviderFactory } from './workspace-file-preference-provider';
import { Deferred } from '@theia/core/lib/common/promise-util';
import { Emitter, Event, PreferenceProvider, PreferenceProviderDataChanges, PreferenceProviderProvider, PreferenceScope } from '@theia/core';
import { JSONObject } from '@theia/core/shared/@lumino/coreutils';
export declare class WorkspacePreferenceProvider implements PreferenceProvider {
    protected readonly workspaceService: WorkspaceService;
    protected readonly workspaceFileProviderFactory: WorkspaceFilePreferenceProviderFactory;
    protected readonly preferenceProviderProvider: PreferenceProviderProvider;
    protected readonly onDidPreferencesChangedEmitter: Emitter<PreferenceProviderDataChanges>;
    readonly onDidPreferencesChanged: Event<PreferenceProviderDataChanges>;
    protected readonly toDisposeOnEnsureDelegateUpToDate: DisposableCollection;
    protected _ready: Deferred<void>;
    readonly ready: Promise<void>;
    protected readonly disposables: DisposableCollection;
    protected init(): void;
    dispose(): void;
    canHandleScope(scope: PreferenceScope): boolean;
    getConfigUri(resourceUri?: string | undefined, sectionName?: string): URI | undefined;
    getContainingConfigUri(resourceUri?: string | undefined, sectionName?: string): URI | undefined;
    protected _delegate: PreferenceProvider | undefined;
    protected get delegate(): PreferenceProvider | undefined;
    protected ensureDelegateUpToDate(): void;
    protected createDelegate(): PreferenceProvider | undefined;
    get<T>(preferenceName: string, resourceUri?: string | undefined): T | undefined;
    resolve<T>(preferenceName: string, resourceUri?: string | undefined): {
        value?: T;
        configUri?: URI;
    };
    setPreference(preferenceName: string, value: any, resourceUri?: string | undefined): Promise<boolean>;
    getPreferences(resourceUri?: string | undefined): JSONObject;
    protected ensureResourceUri(): string | undefined;
}
//# sourceMappingURL=workspace-preference-provider.d.ts.map