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
import { BaseWidget } from '@theia/core/lib/browser';
import { interfaces } from '@theia/core/shared/inversify';
import { MemoryWidgetOptions } from '../utils/memory-widget-utils';
import { MemoryOptionsWidget } from './memory-options-widget';
import { MemoryTableWidget } from './memory-table-widget';
export declare class MemoryWidget<O extends MemoryOptionsWidget = MemoryOptionsWidget, T extends MemoryTableWidget = MemoryTableWidget> extends BaseWidget {
    static readonly ID = "memory-view-wrapper";
    static readonly LABEL: string;
    protected readonly memoryWidgetOptions: MemoryWidgetOptions;
    readonly optionsWidget: O;
    readonly tableWidget: T;
    static createWidget<Options extends MemoryOptionsWidget = MemoryOptionsWidget, Table extends MemoryTableWidget = MemoryTableWidget>(parent: interfaces.Container, optionsWidget: interfaces.ServiceIdentifier<Options>, tableWidget: interfaces.ServiceIdentifier<Table>, optionSymbol?: interfaces.ServiceIdentifier<MemoryWidgetOptions>, options?: MemoryWidgetOptions): MemoryWidget<Options, Table>;
    static createContainer(parent: interfaces.Container, optionsWidget: interfaces.ServiceIdentifier<MemoryOptionsWidget>, tableWidget: interfaces.ServiceIdentifier<MemoryTableWidget>, optionSymbol?: interfaces.ServiceIdentifier<MemoryWidgetOptions | undefined>, options?: MemoryWidgetOptions): interfaces.Container;
    static getIdentifier(optionsWidgetID: string): string;
    protected init(): void;
    protected doInit(): Promise<void>;
    protected onActivateRequest(): void;
}
//# sourceMappingURL=memory-widget.d.ts.map