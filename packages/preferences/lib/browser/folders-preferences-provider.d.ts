import URI from '@theia/core/lib/common/uri';
import { WorkspaceService } from '@theia/workspace/lib/browser/workspace-service';
import { FolderPreferenceProvider, FolderPreferenceProviderFactory } from './folder-preference-provider';
import { FileStat } from '@theia/filesystem/lib/common/files';
import { PreferenceProviderImpl, PreferenceConfigurations, PreferenceResolveResult, PreferenceScope } from '@theia/core';
export declare class FoldersPreferencesProvider extends PreferenceProviderImpl {
    protected readonly workspaceService: WorkspaceService;
    protected readonly folderPreferenceProviderFactory: FolderPreferenceProviderFactory;
    protected readonly configurations: PreferenceConfigurations;
    protected readonly providers: Map<string, FolderPreferenceProvider>;
    protected init(): void;
    protected doInit(): Promise<void>;
    protected updateProviders(): void;
    getConfigUri(resourceUri?: string, sectionName?: string): URI | undefined;
    getContainingConfigUri(resourceUri?: string, sectionName?: string): URI | undefined;
    getDomain(): string[];
    resolve<T>(preferenceName: string, resourceUri?: string): PreferenceResolveResult<T>;
    getPreferences(resourceUri?: string): {
        [p: string]: any;
    };
    setPreference(preferenceName: string, value: any, resourceUri?: string): Promise<boolean>;
    canHandleScope(scope: PreferenceScope): boolean;
    protected groupProvidersByConfigName(resourceUri?: string): Map<string, FolderPreferenceProvider[]>;
    protected getFolderProviders(resourceUri?: string): FolderPreferenceProvider[];
    protected createProvider(uri: URI, section: string, folder: FileStat): FolderPreferenceProvider;
}
//# sourceMappingURL=folders-preferences-provider.d.ts.map