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
import { Deferred } from '@theia/core/lib/common/promise-util';
import * as React from '@theia/core/shared/react';
import Long from 'long';
import { DebugProtocol } from '@vscode/debugprotocol';
import { MemoryOptionsWidget } from '../memory-widget/memory-options-widget';
import { MemoryTable, MemoryTableWidget } from '../memory-widget/memory-table-widget';
import { MemoryWidget } from '../memory-widget/memory-widget';
import { EasilyMappedObject } from '../utils/memory-hover-renderer';
import { Interfaces } from '../utils/memory-widget-utils';
export type EditableMemoryWidget = MemoryWidget<MemoryOptionsWidget, MemoryEditableTableWidget>;
export declare namespace EditableMemoryWidget {
    const ID = "editable.memory.widget";
}
export declare class MemoryEditableTableWidget extends MemoryTableWidget {
    protected pendingMemoryEdits: Map<string, string>;
    protected previousBytes: Interfaces.LabeledUint8Array | undefined;
    protected memoryEditsCompleted: Deferred<void>;
    protected highlightedField: Long;
    protected writeErrorInfo: {
        location: string;
        error: string;
    } | undefined;
    protected currentErrorTimeout: number | undefined;
    protected doShowMoreMemoryBefore: boolean;
    protected doShowMoreMemoryAfter: boolean;
    protected doInit(): Promise<void>;
    resetModifiedValue(valueAddress: Long): void;
    protected getState(): void;
    protected handleMemoryChange(newMemory: Interfaces.MemoryReadResult): Promise<void>;
    protected areSameRegion(a: Interfaces.MemoryReadResult, b?: Interfaces.MemoryReadResult): boolean;
    protected getTableFooter(): React.ReactNode;
    protected getBitAttributes(arrayOffset: number, iteratee: Interfaces.LabeledUint8Array): Partial<Interfaces.FullNodeAttributes>;
    protected getHoverForChunk(span: HTMLElement): EasilyMappedObject | undefined;
    protected composeByte(addressPlusArrayOffset: Long, usePendingEdits: boolean, dataSource?: Uint8Array): Interfaces.ByteFromChunkData;
    protected getFromMapOrArray(arrayOffset: Long, usePendingEdits: boolean, dataSource?: Uint8Array): string;
    protected handleClearEditClick: () => void;
    protected clearEdits(address?: Long): void;
    protected submitMemoryEdits: () => Promise<void>;
    protected createUniqueEdits(): Array<[string, DebugProtocol.WriteMemoryArguments]>;
    protected doWriteMemory(writeMemoryArgs: DebugProtocol.WriteMemoryArguments): Promise<DebugProtocol.WriteMemoryResponse>;
    protected showWriteError(location: string, error: string): void;
    protected hideWriteError(): void;
    protected getWrapperHandlers(): MemoryTable.WrapperHandlers;
    protected handleTableClick: (event: React.MouseEvent) => void;
    protected doHandleTableRightClick(event: React.MouseEvent): void;
    protected handleTableInput: (event: React.KeyboardEvent) => void;
    protected isInBounds(candidateAddress: Long): boolean;
}
//# sourceMappingURL=memory-editable-table-widget.d.ts.map