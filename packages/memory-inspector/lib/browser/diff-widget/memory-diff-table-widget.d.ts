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
import { MemoryTable, MemoryTableWidget } from '../memory-widget/memory-table-widget';
import { MemoryWidget } from '../memory-widget/memory-widget';
import { EasilyMappedObject } from '../utils/memory-hover-renderer';
import { Interfaces, MemoryDiffWidgetData } from '../utils/memory-widget-utils';
import { VariableDecoration, VariableFinder } from '../utils/memory-widget-variable-utils';
import { DiffMemoryOptions, MemoryDiffOptionsWidget } from './memory-diff-options-widget';
import { DiffExtraColumnOptions, DiffLabels, DiffRowOptions, RowData } from './memory-diff-widget-types';
export type MemoryDiffWidget = MemoryWidget<MemoryDiffOptionsWidget, MemoryDiffTableWidget>;
export declare namespace MemoryDiffWidget {
    const ID = "memory.diff.view";
    const is: (widget: MemoryWidget) => boolean;
}
interface DummyCounts {
    leading: number;
    trailing: number;
}
interface OffsetData {
    before: DummyCounts;
    after: DummyCounts;
}
export declare class MemoryDiffTableWidget extends MemoryTableWidget {
    protected diffData: MemoryDiffWidgetData;
    readonly optionsWidget: MemoryDiffOptionsWidget;
    protected diffedSpanCounter: number;
    protected beforeVariableFinder: VariableFinder;
    protected afterVariableFinder: VariableFinder;
    protected isHighContrast: boolean;
    protected options: DiffMemoryOptions;
    protected offsetData: OffsetData;
    updateDiffData(newDiffData: Partial<MemoryDiffWidgetData>): void;
    protected getState(): void;
    protected getOffsetData(): OffsetData;
    protected setTrailing(offsetData: OffsetData): void;
    protected getWrapperClass(): string;
    protected getTableHeaderClass(): string;
    protected renderRows(): IterableIterator<React.ReactNode>;
    protected renderSingleRow(options: DiffRowOptions, getRowAttributes?: Interfaces.RowDecorator): React.ReactNode;
    protected getExtraColumn(options: DiffExtraColumnOptions): React.ReactNode[];
    protected getDiffedAscii(options: DiffExtraColumnOptions): React.ReactNode;
    protected addTextBits(beforeSpans: React.ReactNode[], afterSpans: React.ReactNode[], texts: {
        before: string;
        after: string;
    }): void;
    protected getAsciiSpan({ before, after }: {
        before: string;
        after: string;
    }): [React.ReactNode, React.ReactNode];
    protected getDiffedVariables(options: DiffExtraColumnOptions): React.ReactNode;
    protected getVariableSpan({ name, color }: VariableDecoration, origin: DiffLabels, isChanged: boolean): React.ReactNode;
    protected getDataCellClass(modifier: 'before' | 'after', isModified?: boolean): string;
    protected getNewRowData(): RowData;
    protected aggregate(container: RowData, newData?: MemoryTable.GroupData): void;
    protected renderArrayItems(iteratee?: Interfaces.LabeledUint8Array, getBitAttributes?: Interfaces.BitDecorator): IterableIterator<MemoryTable.ItemData>;
    protected getDummySpan(key: number): MemoryTable.ItemData;
    protected getBitAttributes(arrayOffset: number, iteratee: Interfaces.LabeledUint8Array): Partial<Interfaces.FullNodeAttributes>;
    protected getHighlightStatus(arrayOffset: number, iteratee: Interfaces.LabeledUint8Array): boolean;
    protected translateBetweenShiftedArrays(sourceIndex: number, source: DiffLabels): number;
    protected getHoverForVariable(span: HTMLElement): EasilyMappedObject | undefined;
}
export {};
//# sourceMappingURL=memory-diff-table-widget.d.ts.map