import { IconThemeContribution, IconContribution, IconUrl, PluginCommand, PluginContribution, PluginEngine, PluginLifecycle, PluginModel, PluginPackage, PluginPackageCommand, PluginScanner, PluginTaskDefinitionContribution, SnippetContribution, ThemeContribution, PluginPackageLocalization, Localization, PluginPackageTranslation, Translation, TerminalProfile, PluginEntryPoint, PluginPackageContribution } from '../../../common/plugin-protocol';
import { GrammarsReader } from './grammars-reader';
import { IJSONSchema } from '@theia/core/lib/common/json-schema';
import { ColorDefinition } from '@theia/core/lib/common/color';
import { PluginUriFactory } from './plugin-uri-factory';
import { PreferenceScope } from '@theia/core/lib/common/preferences/preference-scope';
type PluginPackageWithContributes = PluginPackage & {
    contributes: PluginPackageContribution;
};
type ScopeString = 'machine-overridable' | 'window' | 'resource' | 'language-overridable' | 'application' | 'machine';
type EditPresentationTypes = 'multilineText' | 'singleLineText';
export interface IConfigurationPropertySchema extends IJSONSchema {
    scope?: ScopeString;
    /**
     * When `false` this property is excluded from the registry. Default is to include.
     */
    included?: boolean;
    /**
     * List of tags associated to the property.
     *  - A tag can be used for filtering
     *  - Use `experimental` tag for marking the setting as experimental.
     *  - Use `onExP` tag for marking that the default of the setting can be changed by running experiments.
     */
    tags?: string[];
    /**
     * When specified, controls the presentation format of string settings.
     * Otherwise, the presentation format defaults to `singleline`.
     */
    editPresentation?: EditPresentationTypes;
    /**
     * When specified, gives an order number for the setting
     * within the settings editor. Otherwise, the setting is placed at the end.
     */
    order?: number;
}
export interface IExtensionInfo {
    id: string;
    displayName?: string;
}
export interface IConfigurationNode {
    title?: string;
    description?: string;
    properties?: Record<string, IConfigurationPropertySchema>;
    scope?: ScopeString;
}
export declare abstract class AbstractPluginScanner implements PluginScanner {
    private readonly _apiType;
    private readonly _backendInitPath?;
    protected readonly grammarsReader: GrammarsReader;
    protected readonly pluginUriFactory: PluginUriFactory;
    constructor(_apiType: PluginEngine, _backendInitPath?: string | undefined);
    get apiType(): PluginEngine;
    getModel(plugin: PluginPackage): PluginModel;
    protected abstract getEntryPoint(plugin: PluginPackage): PluginEntryPoint;
    getLifecycle(plugin: PluginPackage): PluginLifecycle;
    getDependencies(rawPlugin: PluginPackage): Map<string, string> | undefined;
    getContribution(rawPlugin: PluginPackage): Promise<PluginContribution | undefined>;
    protected readContributions(rawPlugin: PluginPackageWithContributes, contributions: PluginContribution): Promise<PluginContribution>;
}
export declare class TheiaPluginScanner extends AbstractPluginScanner {
    constructor();
    protected getEntryPoint(plugin: PluginPackage): PluginEntryPoint;
    static getScope(monacoScope: string | undefined): {
        scope: PreferenceScope | undefined;
        overridable: boolean;
    };
    protected readContributions(rawPlugin: PluginPackageWithContributes, contributions: PluginContribution): Promise<PluginContribution>;
    protected readTerminals(pck: PluginPackage): TerminalProfile[] | undefined;
    protected readLocalizations(pck: PluginPackage): Localization[] | undefined;
    protected readLocalization({ languageId, languageName, localizedLanguageName, translations }: PluginPackageLocalization, pluginPath: string): Localization;
    protected readTranslation(packageTranslation: PluginPackageTranslation, pluginPath: string): Translation;
    protected readCommand({ command, title, shortTitle, original, category, icon, enablement }: PluginPackageCommand, pck: PluginPackage): PluginCommand;
    protected transformIconUrl(plugin: PluginPackage, original?: IconUrl): {
        iconUrl?: IconUrl;
        themeIcon?: string;
    } | undefined;
    protected toPluginUrl(pck: PluginPackage, relativePath: string): string;
    protected readColors(pck: PluginPackage): ColorDefinition[] | undefined;
    protected readThemes(pck: PluginPackage): ThemeContribution[] | undefined;
    protected readIconThemes(pck: PluginPackage): IconThemeContribution[] | undefined;
    protected readIcons(pck: PluginPackage): IconContribution[] | undefined;
    protected readSnippets(pck: PluginPackage): SnippetContribution[] | undefined;
    protected readJson<T>(filePath: string): Promise<T | undefined>;
    protected readFile(filePath: string): Promise<string>;
    private readConfiguration;
    private readKeybinding;
    private readCustomEditors;
    private readCustomEditor;
    private readViewsContainers;
    private readViewContainer;
    private readViews;
    private readView;
    private readViewsWelcome;
    private readViewWelcome;
    private extractPluginViewsIds;
    private readMenus;
    private readMenu;
    private readLanguages;
    private readSubmenus;
    private readSubmenu;
    private readLanguage;
    private readDebuggers;
    private readDebugger;
    private readTaskDefinition;
    protected toSchema(definition: PluginTaskDefinitionContribution): IJSONSchema;
    private extractValidAutoClosingPairs;
    private extractValidSurroundingPairs;
}
export {};
//# sourceMappingURL=scanner-theia.d.ts.map