import { interfaces } from '@theia/core/shared/inversify';
import { ExternalTerminalService, ExternalTerminalConfiguration } from '../common/external-terminal';
import { PreferenceProxy, PreferenceSchema, PreferenceSchemaService } from '@theia/core';
export declare const ExternalTerminalPreferences: unique symbol;
export type ExternalTerminalPreferences = PreferenceProxy<ExternalTerminalConfiguration>;
export declare const ExternalTerminalSchemaProvider: unique symbol;
export type ExternalTerminalSchemaProvider = () => Promise<PreferenceSchema>;
export declare function bindExternalTerminalPreferences(bind: interfaces.Bind): void;
export declare class ExternalTerminalPreferenceService {
    protected readonly preferences: ExternalTerminalPreferences;
    protected readonly preferenceSchemaProvider: PreferenceSchemaService;
    protected readonly promisedSchema: ExternalTerminalSchemaProvider;
    protected init(): void;
    protected doInit(): Promise<void>;
    /**
     * Get the external terminal configurations from preferences.
     */
    getExternalTerminalConfiguration(): ExternalTerminalConfiguration;
}
/**
 * Use the backend {@link ExternalTerminalService} to establish the schema for the `ExternalTerminalPreferences`.
 *
 * @param externalTerminalService the external terminal backend service.
 * @returns a preference schema with the OS default exec set by the backend service.
 */
export declare function getExternalTerminalSchema(externalTerminalService: ExternalTerminalService): Promise<PreferenceSchema>;
//# sourceMappingURL=external-terminal-preference.d.ts.map