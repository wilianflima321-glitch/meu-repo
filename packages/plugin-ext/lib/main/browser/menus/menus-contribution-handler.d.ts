import { Disposable, DisposableCollection } from '@theia/core';
import { DeployedPlugin, IconUrl } from '../../../common';
import { KeybindingRegistry } from '@theia/core/lib/browser';
import { PluginMenuCommandAdapter } from './plugin-menu-command-adapter';
import { ContextKeyService } from '@theia/core/lib/browser/context-key-service';
import { PluginSharedStyle } from '../plugin-shared-style';
export declare class MenusContributionPointHandler {
    private readonly menuRegistry;
    private readonly commandRegistry;
    private readonly tabBarToolbar;
    pluginMenuCommandAdapter: PluginMenuCommandAdapter;
    protected readonly contextKeyService: ContextKeyService;
    protected readonly style: PluginSharedStyle;
    keybindingRegistry: KeybindingRegistry;
    private readonly quickCommandService;
    private initialized;
    private initialize;
    private getMatchingTheiaMenuPaths;
    handle(plugin: DeployedPlugin): Disposable;
    private parseGroup;
    private registerCommandPaletteAction;
    protected toIconClass(url: IconUrl, toDispose: DisposableCollection): string | undefined;
}
//# sourceMappingURL=menus-contribution-handler.d.ts.map