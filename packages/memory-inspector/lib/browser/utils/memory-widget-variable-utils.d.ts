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
import { DebugVariable } from '@theia/debug/lib/browser/console/debug-console-items';
import { DebugSession } from '@theia/debug/lib/browser/debug-session';
import Long from 'long';
export interface VariableRange {
    name: string;
    address: Long;
    pastTheEndAddress: Long;
    type?: string;
    value?: string;
}
export interface VariableDecoration {
    name: string;
    color: string;
    firstAppearance?: boolean;
}
export interface RegisterReadResult {
    threadId: string | undefined;
    registers: DebugVariable[];
}
export declare class VariableFinder {
    protected readonly HIGH_CONTRAST_COLORS: string[];
    protected readonly NON_HC_COLORS: string[];
    protected readonly variables: VariableRange[];
    protected currentIndex: number;
    protected currentVariable: VariableRange | undefined;
    protected handledVariables: Map<string, Long.Long>;
    protected workingColors: string[];
    protected lastCall: Long.Long;
    constructor(variables: VariableRange[], highContrast?: boolean);
    /**
     * @param address the address of interest.
     *
     * This function should be called with a sequence of addresses in increasing order
     */
    getVariableForAddress(address: Long): VariableDecoration | undefined;
    protected initialize(address: Long): void;
    searchForVariable(addressOrName: Long | string): VariableRange | undefined;
}
/**
 * Get the Registers of the currently selected frame.
 */
export declare function getRegisters(session: DebugSession | undefined): Promise<DebugVariable[]>;
//# sourceMappingURL=memory-widget-variable-utils.d.ts.map