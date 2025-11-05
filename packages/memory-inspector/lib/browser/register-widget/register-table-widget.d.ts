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
/// <reference types="react" />
import * as React from '@theia/core/shared/react';
import { DebugVariable } from '@theia/debug/lib/browser/console/debug-console-items';
import { MemoryTable, MemoryTableWidget } from '../memory-widget/memory-table-widget';
import { Interfaces } from '../utils/memory-widget-utils';
import { RegisterReadResult } from '../utils/memory-widget-variable-utils';
import { RegisterOptions, RegisterOptionsWidget } from './register-options-widget';
export declare namespace RegisterTable {
    const ROW_CLASS = "t-mv-view-row";
    const ROW_DIVIDER_CLASS = "t-mv-view-row-highlight";
    const REGISTER_NAME_CLASS = "t-mv-view-address";
    const REGISTER_DATA_CLASS = "t-mv-view-data";
    const EXTRA_COLUMN_DATA_CLASS = "t-mv-view-code";
    const HEADER_ROW_CLASS = "t-mv-header";
    interface RowOptions {
        regName: string;
        regVal: string;
        hexadecimal?: string;
        decimal?: string;
        octal?: string;
        binary?: string;
        doShowDivider?: boolean;
        isChanged?: boolean;
    }
    interface StylableNodeAttributes {
        className?: string;
        style?: React.CSSProperties;
        title?: string;
        isChanged?: boolean;
    }
    interface RowDecorator {
        (...args: any[]): Partial<StylableNodeAttributes>;
    }
}
export declare class RegisterTableWidget extends MemoryTableWidget {
    static CONTEXT_MENU: string[];
    static ID: string;
    readonly optionsWidget: RegisterOptionsWidget;
    protected readonly registerNotSaved = "<not saved>";
    protected registers: RegisterReadResult;
    protected previousRegisters: RegisterReadResult | undefined;
    protected options: RegisterOptions;
    protected memory: Interfaces.WidgetMemoryState;
    protected doInit(): Promise<void>;
    handleSetValue(dVar: DebugVariable | undefined): void;
    protected handleRegisterChange(newRegister: [RegisterReadResult, boolean]): void;
    protected getState(): void;
    protected getTableRows(): React.ReactNode;
    protected renderRegRows(result?: RegisterReadResult): IterableIterator<React.ReactNode>;
    protected getPrevRegVal(regName: string, inRegs: RegisterReadResult): string | undefined;
    protected renderRegRow(options: RegisterTable.RowOptions, getRowAttributes?: RegisterTable.RowDecorator): React.ReactNode;
    protected getRowAttributes(options: Partial<RegisterTable.RowOptions>): Partial<RegisterTable.StylableNodeAttributes>;
    protected getExtraRegColumn(options: Pick<RegisterTable.RowOptions, 'hexadecimal' | 'decimal' | 'octal' | 'binary'>): React.ReactNode[];
    protected getWrapperHandlers(): MemoryTable.WrapperHandlers;
    protected doHandleTableMouseMove(targetElement: React.MouseEvent['target']): void;
    protected handleRowKeyDown: (event: React.KeyboardEvent<HTMLElement>) => void;
    protected openDebugVariableByCurrentTarget: (event: React.KeyboardEvent<HTMLElement> | React.MouseEvent<HTMLElement>) => void;
    protected openDebugVariableByDataId(element: HTMLElement): void;
    protected openDebugVariableByName(registerName: string): void;
    protected doHandleTableRightClick(event: React.MouseEvent): void;
    protected getContextMenuArgs(event: React.MouseEvent): unknown[];
}
//# sourceMappingURL=register-table-widget.d.ts.map