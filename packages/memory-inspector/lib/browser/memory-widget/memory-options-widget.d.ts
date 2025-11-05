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
/// <reference types="node" />
/// <reference types="react" />
/// <reference types="lodash" />
import { DisposableCollection, Emitter } from '@theia/core';
import { Message, ReactWidget, StatefulWidget } from '@theia/core/lib/browser';
import { Deferred } from '@theia/core/lib/common/promise-util';
import * as React from '@theia/core/shared/react';
import { DebugSession } from '@theia/debug/lib/browser/debug-session';
import { DebugSessionManager } from '@theia/debug/lib/browser/debug-session-manager';
import { MemoryProviderService } from '../memory-provider/memory-provider-service';
import { Recents } from '../utils/memory-recents';
import { Interfaces, MemoryWidgetOptions } from '../utils/memory-widget-utils';
import { VariableRange } from '../utils/memory-widget-variable-utils';
import { SingleSelectItemProps } from '../utils/multi-select-bar';
export declare const EMPTY_MEMORY: Interfaces.MemoryReadResult;
export declare const LOCATION_FIELD_ID = "t-mv-location";
export declare const LENGTH_FIELD_ID = "t-mv-length";
export declare const LOCATION_OFFSET_FIELD_ID = "t-mv-location-offset";
export declare const BYTES_PER_ROW_FIELD_ID = "t-mv-bytesrow";
export declare const BYTES_PER_GROUP_FIELD_ID = "t-mv-bytesgroup";
export declare const ENDIAN_SELECT_ID = "t-mv-endiannesss";
export declare const ASCII_TOGGLE_ID = "t-mv-ascii-toggle";
export declare const AUTO_UPDATE_TOGGLE_ID = "t-mv-auto-update-toggle";
export declare class MemoryOptionsWidget extends ReactWidget implements StatefulWidget {
    static ID: string;
    static LABEL: string;
    iconClass: string;
    lockIconClass: string;
    static WIDGET_H2_CLASS: string;
    static WIDGET_HEADER_INPUT_CLASS: string;
    protected additionalColumnSelectLabel: string;
    protected sessionListeners: DisposableCollection;
    protected readonly onOptionsChangedEmitter: Emitter<string | undefined>;
    readonly onOptionsChanged: import("@theia/core").Event<string | undefined>;
    protected readonly onMemoryChangedEmitter: Emitter<Interfaces.MemoryReadResult>;
    readonly onMemoryChanged: import("@theia/core").Event<Interfaces.MemoryReadResult>;
    protected pinnedMemoryReadResult: Deferred<Interfaces.MemoryReadResult | false> | undefined;
    protected memoryReadResult: Interfaces.MemoryReadResult;
    protected columnsDisplayed: Interfaces.ColumnsDisplayed;
    protected byteSize: number;
    protected bytesPerGroup: number;
    protected groupsPerRow: number;
    protected variables: VariableRange[];
    protected endianness: Interfaces.Endianness;
    protected memoryReadError: string;
    protected address: string | number;
    protected offset: number;
    protected readLength: number;
    protected doDisplaySettings: boolean;
    protected doUpdateAutomatically: boolean;
    protected showMemoryError: boolean;
    protected errorTimeout: NodeJS.Timeout | undefined;
    protected addressField: HTMLInputElement | undefined;
    protected offsetField: HTMLInputElement | undefined;
    protected readLengthField: HTMLInputElement | undefined;
    protected headerInputField: HTMLInputElement | undefined;
    protected recentLocations: Recents;
    protected showTitleEditIcon: boolean;
    protected isTitleEditable: boolean;
    protected readonly memoryProvider: MemoryProviderService;
    protected readonly sessionManager: DebugSessionManager;
    protected readonly memoryWidgetOptions: MemoryWidgetOptions;
    get memory(): Interfaces.WidgetMemoryState;
    get options(): Interfaces.MemoryOptions;
    protected init(): void;
    setAddressAndGo(newAddress: string, newOffset?: number, newLength?: number, direction?: 'above' | 'below'): Promise<Interfaces.MemoryReadResult | false | undefined>;
    protected setUpListeners(session?: DebugSession): void;
    protected handleActiveSessionChange(): void;
    protected handleSessionChange(): void;
    protected onActivateRequest(msg: Message): void;
    protected acceptFocus(): void;
    protected handleColumnSelectionChange: (columnLabel: string, doShow: boolean) => void;
    protected doHandleColumnSelectionChange(columnLabel: string, doShow: boolean): void;
    protected toggleAutoUpdate: (e: React.MouseEvent<HTMLDivElement> | React.KeyboardEvent<HTMLDivElement>) => void;
    protected onByteSizeChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
    protected onAfterAttach(msg: Message): void;
    protected toggleDoShowSettings: (e: React.MouseEvent<HTMLDivElement> | React.KeyboardEvent<HTMLDivElement>) => void;
    protected render(): React.ReactNode;
    protected renderInputContainer(): React.ReactNode;
    protected renderByteDisplayGroup(): React.ReactNode;
    protected getObligatoryColumnIds(): string[];
    protected getOptionalColumns(): SingleSelectItemProps[];
    protected assignLocationRef: React.LegacyRef<HTMLInputElement>;
    protected assignReadLengthRef: React.LegacyRef<HTMLInputElement>;
    protected assignOffsetRef: React.LegacyRef<HTMLInputElement>;
    protected setAddressFromSelect: (e: React.ChangeEvent<HTMLSelectElement>) => void;
    protected renderMemoryLocationGroup(): React.ReactNode;
    protected activateHeaderInputField: (e: React.MouseEvent<HTMLDivElement> | React.KeyboardEvent<HTMLDivElement>) => void;
    protected saveHeaderInputValue: (e: React.MouseEvent<HTMLDivElement> | React.KeyboardEvent<HTMLDivElement>) => void;
    protected assignHeaderInputRef: (element: HTMLInputElement) => void;
    protected updateHeader(isCancelKey: boolean): void;
    protected renderToolbar(): React.ReactNode;
    protected renderSettingsContainer(): React.ReactNode;
    protected renderLockIcon(): React.ReactNode;
    protected renderEditableTitleField(): React.ReactNode;
    storeState(): Interfaces.MemoryOptions;
    restoreState(oldState: Interfaces.MemoryOptions): void;
    protected doShowMemoryErrors: (doClearError?: boolean) => void;
    fetchNewMemory(): void;
    protected doRefresh: (event: React.KeyboardEvent<HTMLInputElement> | React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
    protected updateMemoryView: import("lodash").DebouncedFunc<any>;
    protected doUpdateMemoryView(): Promise<void>;
    protected getUserError(err: unknown): string;
    protected getMemory(memoryReference: string, count: number, offset: number): Promise<Interfaces.MemoryReadResult>;
    protected retrieveMemory(memoryReference: string, count: number, offset: number): Promise<Interfaces.MemoryReadResult>;
    protected updateDefaults(address: string, readLength: number, offset: number): void;
    /**
     * Handle bytes per row changed event.
     */
    protected onGroupsPerRowChange: (event: React.ChangeEvent<HTMLInputElement>) => void;
    /**
     * Handle bytes per group changed event.
     */
    protected onBytesPerGroupChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
    /**
     * Handle endianness changed event.
     */
    protected onEndiannessChange: (event: React.ChangeEvent<HTMLSelectElement>) => void;
    protected fireDidChangeOptions(targetId?: string): void;
    protected fireDidChangeMemory(): void;
}
//# sourceMappingURL=memory-options-widget.d.ts.map