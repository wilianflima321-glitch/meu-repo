import { CommandContribution, CommandRegistry, MenuContribution, MenuModelRegistry, PreferenceService } from '@theia/core';
import { KeybindingContribution, KeybindingRegistry } from '@theia/core/lib/browser';
import { interfaces } from '@theia/core/shared/inversify';
import { ToolbarCommandQuickInputService } from './toolbar-command-quick-input-service';
import { ToolbarController } from './toolbar-controller';
import { JsonSchemaContribution, JsonSchemaDataStore, JsonSchemaRegisterContext } from '@theia/core/lib/browser/json-schema-store';
import URI from '@theia/core/lib/common/uri';
export declare class ToolbarCommandContribution implements CommandContribution, KeybindingContribution, MenuContribution, JsonSchemaContribution {
    protected readonly controller: ToolbarController;
    protected toolbarCommandPickService: ToolbarCommandQuickInputService;
    protected readonly preferenceService: PreferenceService;
    protected readonly schemaStore: JsonSchemaDataStore;
    protected readonly schemaURI: URI;
    registerSchemas(context: JsonSchemaRegisterContext): void;
    registerCommands(registry: CommandRegistry): void;
    protected isToolbarWidget(arg: unknown): boolean;
    registerKeybindings(keys: KeybindingRegistry): void;
    registerMenus(registry: MenuModelRegistry): void;
}
export declare function bindToolbar(bind: interfaces.Bind): void;
//# sourceMappingURL=toolbar-command-contribution.d.ts.map