/// <reference types="react" />
import * as React from '@theia/core/shared/react';
import { CommandService, Emitter } from '@theia/core';
import { ContextMenuRenderer, KeybindingRegistry } from '@theia/core/lib/browser';
import { DeflatedContributedToolbarItem, ToolbarContribution } from './toolbar-interfaces';
export declare abstract class AbstractToolbarContribution implements ToolbarContribution {
    protected readonly keybindingRegistry: KeybindingRegistry;
    protected readonly contextMenuRenderer: ContextMenuRenderer;
    protected readonly commandService: CommandService;
    abstract id: string;
    protected didChangeEmitter: Emitter<void>;
    readonly onDidChange: import("@theia/core").Event<void>;
    abstract render(): React.ReactNode;
    toJSON(): DeflatedContributedToolbarItem;
    protected resolveKeybindingForCommand(commandID: string | undefined): string;
}
//# sourceMappingURL=abstract-toolbar-contribution.d.ts.map