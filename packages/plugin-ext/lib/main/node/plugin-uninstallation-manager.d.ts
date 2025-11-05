import { Emitter, Event } from '@theia/core';
import { PluginIdentifiers } from '../../common';
import { SettingService } from '@theia/core/lib/node';
import { Deferred } from '@theia/core/lib/common/promise-util';
export declare class PluginUninstallationManager {
    static DISABLED_PLUGINS: string;
    protected readonly settingService: SettingService;
    protected readonly onDidChangeUninstalledPluginsEmitter: Emitter<readonly `${string}.${string}@${string}`[]>;
    onDidChangeUninstalledPlugins: Event<readonly PluginIdentifiers.VersionedId[]>;
    protected readonly onDidChangeDisabledPluginsEmitter: Emitter<readonly `${string}.${string}@${string}`[]>;
    onDidChangeDisabledPlugins: Event<readonly PluginIdentifiers.VersionedId[]>;
    protected uninstalledPlugins: Set<PluginIdentifiers.VersionedId>;
    protected disabledPlugins: Set<PluginIdentifiers.VersionedId>;
    protected readonly initialized: Deferred<void>;
    init(): void;
    protected load(): Promise<void>;
    protected save(): Promise<void>;
    markAsUninstalled(...pluginIds: PluginIdentifiers.VersionedId[]): Promise<boolean>;
    markAsInstalled(...pluginIds: PluginIdentifiers.VersionedId[]): Promise<boolean>;
    isUninstalled(pluginId: PluginIdentifiers.VersionedId): boolean;
    getUninstalledPluginIds(): readonly PluginIdentifiers.VersionedId[];
    markAsDisabled(...pluginIds: PluginIdentifiers.VersionedId[]): Promise<boolean>;
    markAsEnabled(...pluginIds: PluginIdentifiers.VersionedId[]): Promise<boolean>;
    isDisabled(pluginId: PluginIdentifiers.VersionedId): Promise<boolean>;
    getDisabledPluginIds(): Promise<readonly PluginIdentifiers.VersionedId[]>;
}
//# sourceMappingURL=plugin-uninstallation-manager.d.ts.map