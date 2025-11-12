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
import { Message, ReactWidget } from '@theia/core/lib/browser';
import * as React from '@theia/core/shared/react';
import Long from 'long';
import { MemoryWidget } from '../memory-widget/memory-widget';
import { MemoryWidgetManager } from '../utils/memory-widget-manager';
import { Interfaces } from '../utils/memory-widget-utils';
import { VariableRange } from '../utils/memory-widget-variable-utils';
export interface DiffMemory {
    beforeAddress: Long;
    beforeBytes: Interfaces.LabeledUint8Array;
    beforeVariables: VariableRange[];
    afterAddress: Long;
    afterBytes: Interfaces.LabeledUint8Array;
    afterVariables: VariableRange[];
}
export declare class MemoryDiffSelectWidget extends ReactWidget {
    static DIFF_SELECT_CLASS: string;
    protected beforeWidgetLabel: string;
    protected afterWidgetLabel: string;
    protected labelToWidgetMap: Map<string, MemoryWidget<import("../memory-widget/memory-options-widget").MemoryOptionsWidget, import("../memory-widget/memory-table-widget").MemoryTableWidget>>;
    protected readonly memoryWidgetManager: MemoryWidgetManager;
    protected init(): void;
    onActivateRequest(msg: Message): void;
    protected assignBaseValue: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    protected assignLaterValue: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    render(): React.ReactNode;
    protected diffIfEnter: (e: React.KeyboardEvent<HTMLInputElement>) => void;
    protected updateWidgetMap(): void;
    protected getBeforeLabel(optionLabels?: string[]): string;
    protected getAfterLabel(optionLabels: string[], beforeWidgetLabel?: string): string;
    protected diff: () => void;
    protected doDiff(): void;
    protected getMemoryArrays(beforeWidget: MemoryWidget, afterWidget: MemoryWidget): DiffMemory;
}
//# sourceMappingURL=memory-diff-select-widget.d.ts.map