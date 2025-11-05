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
/// <reference types="lodash" />
import { ContextMenuRenderer, ReactWidget, Widget } from '@theia/core/lib/browser';
import { ThemeService } from '@theia/core/lib/browser/theming';
import { Deferred } from '@theia/core/lib/common/promise-util';
import { ThemeChangeEvent } from '@theia/core/lib/common/theme';
import * as React from '@theia/core/shared/react';
import { MemoryProviderService } from '../memory-provider/memory-provider-service';
import { EasilyMappedObject, MemoryHoverRendererService } from '../utils/memory-hover-renderer';
import { Interfaces } from '../utils/memory-widget-utils';
import { VariableDecoration, VariableFinder } from '../utils/memory-widget-variable-utils';
import { MemoryOptionsWidget } from './memory-options-widget';
export declare namespace MemoryTable {
    interface WrapperHandlers {
        onKeyDown?: React.KeyboardEventHandler;
        onClick?: React.MouseEventHandler;
        onContextMenu?: React.MouseEventHandler;
        onMouseMove?: React.MouseEventHandler;
        onFocus?(e: React.FocusEvent<HTMLDivElement>): any;
        onBlur?(e: React.FocusEvent<HTMLDivElement>): any;
    }
    interface StylableNodeAttributes {
        className?: string;
        style?: React.CSSProperties;
        variable?: VariableDecoration;
        title?: string;
        isHighlighted?: boolean;
    }
    interface GroupData {
        node: React.ReactNode;
        ascii: string;
        index: number;
        variables: VariableDecoration[];
        isHighlighted?: boolean;
    }
    interface ByteData {
        node: React.ReactNode;
        ascii: string;
        index: number;
        variables: VariableDecoration[];
        isHighlighted?: boolean;
    }
    interface ItemData {
        node: React.ReactNode;
        content: string;
        variable?: VariableDecoration;
        index: number;
        isHighlighted?: boolean;
    }
    interface RowOptions {
        address: string;
        groups: React.ReactNode;
        ascii?: string;
        variables?: VariableDecoration[];
        doShowDivider?: boolean;
        index: number;
        isHighlighted?: boolean;
    }
    const ROW_CLASS = "t-mv-view-row";
    const ROW_DIVIDER_CLASS = "t-mv-view-row-highlight";
    const ADDRESS_DATA_CLASS = "t-mv-view-address";
    const MEMORY_DATA_CLASS = "t-mv-view-data";
    const EXTRA_COLUMN_DATA_CLASS = "t-mv-view-code";
    const GROUP_SPAN_CLASS = "byte-group";
    const BYTE_SPAN_CLASS = "single-byte";
    const EIGHT_BIT_SPAN_CLASS = "eight-bits";
    const HEADER_LABEL_CONTAINER_CLASS = "t-mv-header-label-container";
    const HEADER_LABEL_CLASS = "t-mv-header-label";
    const VARIABLE_LABEL_CLASS = "t-mv-variable-label";
    const HEADER_ROW_CLASS = "t-mv-header";
}
export declare class MemoryTableWidget extends ReactWidget {
    static CONTEXT_MENU: string[];
    static ID: string;
    protected readonly themeService: ThemeService;
    readonly optionsWidget: MemoryOptionsWidget;
    protected readonly memoryProvider: MemoryProviderService;
    protected readonly hoverRenderer: MemoryHoverRendererService;
    protected readonly contextMenuRenderer: ContextMenuRenderer;
    protected previousBytes: Interfaces.LabeledUint8Array | undefined;
    protected memory: Interfaces.WidgetMemoryState;
    protected options: Interfaces.MemoryOptions;
    protected variableFinder: VariableFinder | undefined;
    protected deferredScrollContainer: Deferred<HTMLDivElement>;
    protected init(): void;
    protected doInit(): Promise<void>;
    protected handleOptionChange(_id?: string): Promise<void>;
    update(): void;
    protected onResize(msg: Widget.ResizeMessage): void;
    protected updateColumnWidths: import("lodash").DebouncedFunc<any>;
    protected doUpdateColumnWidths(): void;
    protected areSameRegion(a: Interfaces.MemoryReadResult, b: Interfaces.MemoryReadResult): boolean;
    protected handleMemoryChange(newMemory: Interfaces.MemoryReadResult): void;
    protected handleThemeChange(_themeChange: ThemeChangeEvent): void;
    protected getState(): void;
    protected getStateAndUpdate(): void;
    protected scrollIntoViewIfNecessary(): Promise<void>;
    protected getWrapperHandlers(): MemoryTable.WrapperHandlers;
    protected assignScrollContainerRef: (element: HTMLDivElement) => void;
    getScrollContainer(): Promise<HTMLDivElement>;
    render(): React.ReactNode;
    protected getWrapperClass(): string;
    protected getTableHeaderClass(): string;
    protected getTableHeaderStyle(numLabels: number): React.CSSProperties;
    protected getTableHeaders(labels: Interfaces.ColumnIDs[]): React.ReactNode;
    protected getTableHeader({ label, id }: Interfaces.ColumnIDs): React.ReactNode;
    protected getBeforeTableContent(): React.ReactNode;
    protected getAfterTableContent(): React.ReactNode;
    protected loadMoreMemory: (options: Interfaces.MoreMemoryOptions) => Promise<void>;
    protected getTableFooter(): React.ReactNode;
    protected getTableRows(): React.ReactNode;
    protected renderRows(iteratee?: Interfaces.LabeledUint8Array): IterableIterator<React.ReactNode>;
    protected renderRow(options: MemoryTable.RowOptions, getRowAttributes?: Interfaces.RowDecorator): React.ReactNode;
    protected getRowAttributes(options: Partial<MemoryTable.RowOptions>): Partial<Interfaces.StylableNodeAttributes>;
    protected getExtraColumn(options: Pick<MemoryTable.RowOptions, 'ascii' | 'variables'>): React.ReactNode;
    protected renderGroups(iteratee?: Interfaces.LabeledUint8Array): IterableIterator<MemoryTable.GroupData>;
    protected buildGroupByEndianness(oldBytes: React.ReactNode[], newByte: React.ReactNode): void;
    protected renderBytes(iteratee?: Interfaces.LabeledUint8Array): IterableIterator<MemoryTable.ByteData>;
    protected getASCIIForSingleByte(byte: number | undefined): string;
    protected renderArrayItems(iteratee?: Interfaces.LabeledUint8Array, getBitAttributes?: Interfaces.BitDecorator): IterableIterator<MemoryTable.ItemData>;
    protected getBitAttributes(arrayOffset: number, iteratee: Interfaces.LabeledUint8Array): Partial<Interfaces.FullNodeAttributes>;
    protected handleTableMouseMove: (e: React.MouseEvent) => void;
    protected debounceHandleMouseTableMove: import("lodash").DebouncedFunc<any>;
    protected doHandleTableMouseMove(targetSpan: React.MouseEvent['target']): void;
    protected getHoverForChunk(span: HTMLElement): EasilyMappedObject | undefined;
    protected getPaddedBinary(decimal: number): string;
    protected getHoverForVariable(span: HTMLElement): EasilyMappedObject | undefined;
    protected handleTableRightClick: (e: React.MouseEvent) => void;
    protected doHandleTableRightClick(event: React.MouseEvent): void;
    protected getContextMenuArgs(event: React.MouseEvent): unknown[];
}
//# sourceMappingURL=memory-table-widget.d.ts.map