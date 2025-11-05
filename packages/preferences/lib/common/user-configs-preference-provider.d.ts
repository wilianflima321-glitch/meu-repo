import URI from '@theia/core/lib/common/uri';
import { UserPreferenceProvider, UserPreferenceProviderFactory } from '../common/user-preference-provider';
import { PreferenceProviderImpl, PreferenceConfigurations, PreferenceResolveResult } from '@theia/core';
export declare const UserStorageLocationProvider: unique symbol;
/**
 * Binds together preference section prefs providers for user-level preferences.
 */
export declare class UserConfigsPreferenceProvider extends PreferenceProviderImpl {
    protected readonly providerFactory: UserPreferenceProviderFactory;
    private userStorageLocationProvider;
    protected readonly configurations: PreferenceConfigurations;
    protected readonly providers: Map<string, UserPreferenceProvider>;
    protected init(): void;
    protected doInit(): Promise<void>;
    protected createProviders(userStorageLocation: URI): void;
    getConfigUri(resourceUri?: string, sectionName?: string): URI | undefined;
    resolve<T>(preferenceName: string, resourceUri?: string): PreferenceResolveResult<T>;
    getPreferences(resourceUri?: string): {
        [p: string]: any;
    };
    setPreference(preferenceName: string, value: any, resourceUri?: string): Promise<boolean>;
    protected createProvider(uri: URI, sectionName: string): UserPreferenceProvider;
}
//# sourceMappingURL=user-configs-preference-provider.d.ts.map