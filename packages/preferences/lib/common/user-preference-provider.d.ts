import URI from '@theia/core/lib/common/uri';
import { SectionPreferenceProvider } from './section-preference-provider';
import { PreferenceScope } from '@theia/core';
export declare const UserPreferenceProviderFactory: unique symbol;
export interface UserPreferenceProviderFactory {
    (uri: URI, section: string): UserPreferenceProvider;
}
/**
 * A @SectionPreferenceProvider that targets the user-level settings
 */
export declare class UserPreferenceProvider extends SectionPreferenceProvider {
    getScope(): PreferenceScope;
}
//# sourceMappingURL=user-preference-provider.d.ts.map