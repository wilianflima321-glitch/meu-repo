/********************************************************************************
 * Copyright (C) 2021 Ericsson and others.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Eclipse Public License v. 2.0 which is available at
 * http://www.eclipse.org/legal/epl-2.0.
 *
 * This Source Code may also be made available under the following Secondary
 * Licenses when the conditions for such availability set forth in the Eclipse
 * Public License v. 2.0 are satisfied: GNU General Public License, version 2
 * with the GNU Classpath Exception which is available at
 * https://www.gnu.org/software/classpath/license.html.
 *
 * SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
 ********************************************************************************/
import { Disposable, DisposableCollection, Emitter } from '@theia/core';
import { ApplicationShell, Message, Panel, Widget, WidgetManager } from '@theia/core/lib/browser';
import { MemoryDiffSelectWidget } from '../diff-widget/memory-diff-select-widget';
import { MemoryWidgetManager } from '../utils/memory-widget-manager';
import { MemoryDockPanel } from './memory-dock-panel';
import { MemoryDockpanelPlaceholder } from './memory-dockpanel-placeholder-widget';
export declare class MemoryLayoutWidget extends Panel implements Disposable, ApplicationShell.TrackableWidgetProvider {
    static readonly ID = "memory-layout-widget";
    static readonly LABEL: string;
    static readonly DOCK_PANEL_ID = "theia-main-content-panel";
    static readonly THEIA_TABBAR_CLASSES: string[];
    static readonly MEMORY_INSPECTOR_TABBAR_CLASS = "memory-dock-tabbar";
    static readonly DOCK_PANEL_CLASS = "memory-dock-panel";
    protected readonly widgetManager: WidgetManager;
    protected readonly memoryWidgetManager: MemoryWidgetManager;
    protected readonly diffSelectWidget: MemoryDiffSelectWidget;
    protected readonly placeholderWidget: MemoryDockpanelPlaceholder;
    protected readonly shell: ApplicationShell;
    protected readonly onDidChangeTrackableWidgetsEmitter: Emitter<Widget[]>;
    readonly onDidChangeTrackableWidgets: import("@theia/core").Event<Widget[]>;
    protected readonly toDispose: DisposableCollection;
    protected dockPanel: MemoryDockPanel;
    protected hasGeneratedWidgetAutomatically: boolean;
    protected init(): void;
    protected doInit(): Promise<void>;
    toggleComparisonVisibility(): void;
    dispose(): void;
    protected dockPanelHoldsWidgets(): boolean;
    protected handleWidgetsChanged(): void;
    protected handleWidgetRemoved(_sender: Widget, widgetRemoved: Widget): void;
    protected createAndFocusWidget(): Promise<void>;
    protected onAfterShow(msg: Message): Promise<void>;
    getTrackableWidgets(): Widget[];
    activateWidget(id: string): Widget | undefined;
    onActivateRequest(msg: Message): void;
}
//# sourceMappingURL=memory-layout-widget.d.ts.map