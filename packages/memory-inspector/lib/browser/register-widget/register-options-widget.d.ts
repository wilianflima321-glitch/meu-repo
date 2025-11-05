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
import { Emitter } from '@theia/core';
import * as React from '@theia/core/shared/react';
import { DebugSession } from '@theia/debug/lib/browser/debug-session';
import { MemoryOptionsWidget } from '../memory-widget/memory-options-widget';
import { Interfaces, RegisterWidgetOptions } from '../utils/memory-widget-utils';
import { RegisterReadResult } from '../utils/memory-widget-variable-utils';
import { RegisterFilterService } from './register-filter-service';
export declare const EMPTY_REGISTERS: RegisterReadResult;
export declare const REGISTER_FIELD_ID = "t-mv-register";
export declare const REGISTER_RADIX_ID = "t-mv-radix";
export declare const REGISTER_PRE_SETS_ID = "t-mv-pre-set";
export interface RegisterOptions extends Interfaces.MemoryOptions {
    reg: string;
    noRadixColumnDisplayed: boolean;
}
export declare class RegisterOptionsWidget extends MemoryOptionsWidget {
    iconClass: string;
    lockIconClass: string;
    protected readonly LABEL_PREFIX: string;
    protected readonly onRegisterChangedEmitter: Emitter<[RegisterReadResult, boolean]>;
    readonly onRegisterChanged: import("@theia/core").Event<[RegisterReadResult, boolean]>;
    protected registerReadResult: RegisterReadResult;
    protected reg: string;
    protected registerField: HTMLInputElement | undefined;
    protected registerDisplaySet: Set<unknown>;
    protected registerDisplayAll: boolean;
    protected registerFilterUpdate: boolean;
    protected registerReadError: string;
    protected showRegisterError: boolean;
    protected noRadixColumnDisplayed: boolean;
    protected columnsDisplayed: Interfaces.ColumnsDisplayed;
    protected readonly memoryWidgetOptions: RegisterWidgetOptions;
    protected readonly filterService: RegisterFilterService;
    get registers(): RegisterReadResult;
    get options(): RegisterOptions;
    displayReg(element: string): boolean;
    handleRadixRendering(regVal: string, radix: number, _regName?: string): string;
    protected init(): void;
    setRegAndUpdate(regName: string): void;
    protected setUpListeners(session?: DebugSession): void;
    protected handleActiveSessionChange(): void;
    protected handleSessionChange(): void;
    protected acceptFocus(): void;
    protected assignRegisterRef: React.LegacyRef<HTMLInputElement>;
    protected setRegFilterFromSelect: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    protected radixDisplayed(): boolean;
    protected noRadixDisplayed(): boolean;
    protected renderRegisterFieldGroup(): React.ReactNode;
    protected doHandleColumnSelectionChange(columnLabel: string, doShow: boolean): void;
    protected getObligatoryColumnIds(): string[];
    protected renderInputContainer(): React.ReactNode;
    protected handleRegFromDebugWidgetSelection(regName: string): void;
    protected renderToolbar(): React.ReactNode;
    protected validateInputRegs(input: string): void;
    protected updateRegisterView: import("lodash").DebouncedFunc<any>;
    protected doUpdateRegisterView(): Promise<void>;
    protected updateRegDisplayFilter(): void;
    protected doRefresh: (event: React.KeyboardEvent<HTMLInputElement> | React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
    protected getRegisters(): Promise<RegisterReadResult>;
    protected fireDidChangeRegister(): void;
    storeState(): RegisterOptions;
    restoreState(oldState: RegisterOptions): void;
    protected doShowRegisterErrors: (doClearError?: boolean) => void;
}
//# sourceMappingURL=register-options-widget.d.ts.map