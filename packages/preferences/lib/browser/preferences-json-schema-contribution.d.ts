import URI from '@theia/core/lib/common/uri';
import { JsonSchemaRegisterContext, JsonSchemaContribution, JsonSchemaDataStore } from '@theia/core/lib/browser/json-schema-store';
import { WorkspaceService } from '@theia/workspace/lib/browser';
import { PreferenceSchemaService, PreferenceConfigurations, PreferenceScope } from '@theia/core';
export declare class PreferencesJsonSchemaContribution implements JsonSchemaContribution {
    protected readonly schemaProvider: PreferenceSchemaService;
    protected readonly preferenceConfigurations: PreferenceConfigurations;
    protected readonly jsonSchemaData: JsonSchemaDataStore;
    protected readonly workspaceService: WorkspaceService;
    registerSchemas(context: JsonSchemaRegisterContext): void;
    protected registerSchema(scope: PreferenceScope, context: JsonSchemaRegisterContext): void;
    protected updateInMemoryResources(): void;
    protected getSchemaURIForScope(scope: PreferenceScope): URI;
}
//# sourceMappingURL=preferences-json-schema-contribution.d.ts.map