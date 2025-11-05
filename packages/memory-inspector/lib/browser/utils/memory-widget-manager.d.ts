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
import { Disposable, DisposableCollection, Emitter, MessageService } from '@theia/core';
import { ApplicationShell, WidgetManager } from '@theia/core/lib/browser';
import { MemoryDiffWidget } from '../diff-widget/memory-diff-table-widget';
import { MemoryWidget } from '../memory-widget/memory-widget';
import { MemoryDiffWidgetData, MemoryWidgetOptions } from './memory-widget-utils';
export declare class MemoryWidgetManager implements Disposable {
    protected createdWidgetCount: number;
    protected widgetDisplayId: number;
    protected readonly toDispose: DisposableCollection;
    protected readonly widgetManager: WidgetManager;
    protected readonly shell: ApplicationShell;
    protected readonly messageService: MessageService;
    protected readonly onNewWidgetCreated: Emitter<MemoryWidget<import("../memory-widget/memory-options-widget").MemoryOptionsWidget, import("../memory-widget/memory-table-widget").MemoryTableWidget>>;
    readonly onDidCreateNewWidget: import("@theia/core").Event<MemoryWidget<import("../memory-widget/memory-options-widget").MemoryOptionsWidget, import("../memory-widget/memory-table-widget").MemoryTableWidget>>;
    protected readonly onSelectedWidgetChanged: Emitter<MemoryWidget<import("../memory-widget/memory-options-widget").MemoryOptionsWidget, import("../memory-widget/memory-table-widget").MemoryTableWidget> | undefined>;
    readonly onDidChangeSelectedWidget: import("@theia/core").Event<MemoryWidget<import("../memory-widget/memory-options-widget").MemoryOptionsWidget, import("../memory-widget/memory-table-widget").MemoryTableWidget> | undefined>;
    protected readonly onChangedEmitter: Emitter<void>;
    readonly onChanged: import("@theia/core").Event<void>;
    protected readonly _availableWidgets: Map<string, MemoryWidget<import("../memory-widget/memory-options-widget").MemoryOptionsWidget, import("../memory-widget/memory-table-widget").MemoryTableWidget>>;
    protected _focusedWidget: MemoryWidget | undefined;
    protected _canCompare: boolean;
    get availableWidgets(): MemoryWidget[];
    get canCompare(): boolean;
    protected init(): void;
    get focusedWidget(): MemoryWidget | undefined;
    set focusedWidget(title: MemoryWidget | undefined);
    protected setCanCompare(): void;
    createNewMemoryWidget<T extends MemoryWidget>(kind?: 'register' | 'memory' | 'writable' | string): Promise<T>;
    protected getWidgetOfKind<T extends MemoryWidget>(kind: string): Promise<T>;
    protected getWidgetIdForKind(kind: string): string;
    protected getWidgetOptionsForId(widgetId: string): MemoryWidgetOptions;
    dispose(): void;
    protected fireNewWidget(widget: MemoryWidget): void;
    doDiff(options: Omit<MemoryDiffWidgetData, 'dynamic' | 'identifier'>): Promise<MemoryDiffWidget | undefined>;
}
//# sourceMappingURL=memory-widget-manager.d.ts.map