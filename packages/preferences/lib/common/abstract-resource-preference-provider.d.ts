import { Disposable } from '@theia/core/lib/common/disposable';
import { PreferenceProviderImpl, PreferenceScope, PreferenceSchemaService, PreferenceConfigurations, PreferenceLanguageOverrideService, Listener } from '@theia/core/lib/common';
import URI from '@theia/core/lib/common/uri';
import { Deferred } from '@theia/core/lib/common/promise-util';
import { Emitter, Event } from '@theia/core';
import { JSONValue } from '@theia/core/shared/@lumino/coreutils';
export interface FileContentStatus {
    content: string;
    fileOK: boolean;
}
/**
 * Abtracts the way to read and write preferences to a given resource
 */
export interface PreferenceStorage extends Disposable {
    /**
     * Write a value to the underlying preference store
     * @param key the preference key
     * @param path the path to the JSON object to change
     * @param value the new preference value
     * @returns a promise that will resolve when all "onStored" listeners have finished
     */
    writeValue(key: string, path: string[], value: JSONValue): Promise<boolean>;
    /**
     * List of listeners that will get a string with the newly stored resource content and should return a promise that resolves when
     * they are done with their processing
     */
    onDidChangeFileContent: Listener.Registration<FileContentStatus, Promise<boolean>>;
    /**
     * Reds the content of the underlying resource
     */
    read(): Promise<string>;
}
export declare const PreferenceStorageFactory: unique symbol;
export type PreferenceStorageFactory = (uri: URI, scope: PreferenceScope) => PreferenceStorage;
export declare abstract class AbstractResourcePreferenceProvider extends PreferenceProviderImpl {
    protected preferenceStorage: PreferenceStorage;
    protected preferences: Record<string, any>;
    protected _fileExists: boolean;
    protected readonly loading: Deferred<void>;
    protected readonly onDidChangeValidityEmitter: Emitter<boolean>;
    set fileExists(exists: boolean);
    get onDidChangeValidity(): Event<boolean>;
    protected readonly schemaProvider: PreferenceSchemaService;
    protected readonly configurations: PreferenceConfigurations;
    protected readonly preferenceOverrideService: PreferenceLanguageOverrideService;
    protected readonly preferenceStorageFactory: PreferenceStorageFactory;
    protected init(): void;
    protected doInit(): Promise<void>;
    protected abstract getUri(): URI;
    abstract getScope(): PreferenceScope;
    get valid(): boolean;
    getConfigUri(): URI;
    getConfigUri(resourceUri: string | undefined): URI | undefined;
    contains(resourceUri: string | undefined): boolean;
    getPreferences(resourceUri?: string): {
        [key: string]: any;
    };
    setPreference(key: string, value: any, resourceUri?: string): Promise<boolean>;
    protected doSetPreference(key: string, path: string[], value: JSONValue): Promise<boolean>;
    protected getPath(preferenceName: string): string[] | undefined;
    protected readPreferencesFromFile(): Promise<void>;
    protected readPreferencesFromContent(content: string): void;
    protected parse(content: string): any;
    protected handlePreferenceChanges(newPrefs: {
        [key: string]: any;
    }): void;
    protected reset(): void;
}
//# sourceMappingURL=abstract-resource-preference-provider.d.ts.map