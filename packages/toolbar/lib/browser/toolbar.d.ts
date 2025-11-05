/// <reference types="react" />
import * as React from '@theia/core/shared/react';
import { Anchor, ContextMenuAccess, KeybindingRegistry, Widget, WidgetManager } from '@theia/core/lib/browser';
import { TabBarToolbar, TabBarToolbarFactory } from '@theia/core/lib/browser/shell/tab-bar-toolbar';
import { MenuPath, PreferenceService, ProgressService } from '@theia/core';
import { FrontendApplicationStateService } from '@theia/core/lib/browser/frontend-application-state';
import { ProgressBarFactory } from '@theia/core/lib/browser/progress-bar-factory';
import { Deferred } from '@theia/core/lib/common/promise-util';
import { ToolbarAlignment, ToolbarItemPosition } from './toolbar-interfaces';
import { ToolbarController } from './toolbar-controller';
import { TabBarToolbarItem } from '@theia/core/lib/browser/shell/tab-bar-toolbar/tab-toolbar-item';
export declare const TOOLBAR_PROGRESSBAR_ID = "main-toolbar-progress";
export declare class ToolbarImpl extends TabBarToolbar {
    protected readonly tabbarToolbarFactory: TabBarToolbarFactory;
    protected readonly widgetManager: WidgetManager;
    protected readonly appState: FrontendApplicationStateService;
    protected readonly model: ToolbarController;
    protected readonly preferenceService: PreferenceService;
    protected readonly keybindingRegistry: KeybindingRegistry;
    protected readonly progressFactory: ProgressBarFactory;
    protected readonly progressService: ProgressService;
    protected currentlyDraggedItem: HTMLDivElement | undefined;
    protected draggedStartingPosition: ToolbarItemPosition | undefined;
    protected deferredRef: Deferred<HTMLDivElement>;
    protected isBusyDeferred: Deferred<void>;
    protected init(): void;
    protected doInit(): Promise<void>;
    protected updateInlineItems(): void;
    protected handleContextMenu: (e: React.MouseEvent<HTMLDivElement>) => ContextMenuAccess;
    protected doHandleContextMenu(event: React.MouseEvent<HTMLDivElement>): ContextMenuAccess;
    protected getMenuDetailsForClick(event: React.MouseEvent<HTMLDivElement>): {
        menuPath: MenuPath;
        anchor: Anchor;
    };
    protected getContextMenuArgs(event: React.MouseEvent): Array<string | Widget>;
    protected renderGroupsInColumn(groups: TabBarToolbarItem[][], alignment: ToolbarAlignment): React.ReactNode[];
    protected assignRef: (element: HTMLDivElement) => void;
    protected doAssignRef(element: HTMLDivElement): void;
    protected render(): React.ReactNode;
    protected renderColumnWrapper(alignment: ToolbarAlignment, columnGroup: TabBarToolbarItem[][]): React.ReactNode;
    protected renderColumnSpace(alignment: ToolbarAlignment, position?: 'left' | 'right'): React.ReactNode;
    protected renderItemWithDraggableWrapper(item: TabBarToolbarItem, position: ToolbarItemPosition): React.ReactNode;
    protected handleOnDragStart: (e: React.DragEvent<HTMLDivElement>) => void;
    protected doHandleOnDragStart(e: React.DragEvent<HTMLDivElement>): void;
    protected handleOnDragEnter: (e: React.DragEvent<HTMLDivElement>) => void;
    protected doHandleItemOnDragEnter(e: React.DragEvent<HTMLDivElement>): void;
    protected handleOnDragLeave: (e: React.DragEvent<HTMLDivElement>) => void;
    protected doHandleOnDragLeave(e: React.DragEvent<HTMLDivElement>): void;
    protected handleOnDrop: (e: React.DragEvent<HTMLDivElement>) => void;
    protected doHandleOnDrop(e: React.DragEvent<HTMLDivElement>): void;
    protected handleDropInExistingGroup(element: EventTarget & HTMLDivElement): void;
    protected handleDropInEmptySpace(element: EventTarget & HTMLDivElement): void;
    protected arePositionsEquivalent(start: ToolbarItemPosition, end: ToolbarItemPosition): boolean;
    protected handleOnDragEnd: (e: React.DragEvent<HTMLDivElement>) => void;
    protected doHandleOnDragEnd(e: React.DragEvent<HTMLDivElement>): void;
}
//# sourceMappingURL=toolbar.d.ts.map