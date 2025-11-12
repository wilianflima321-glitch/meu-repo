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
import Long from 'long';
import { VariableRange, VariableDecoration } from './memory-widget-variable-utils';
export declare namespace Constants {
    const DEBOUNCE_TIME = 200;
    const ERROR_TIMEOUT = 5000;
}
export declare namespace Utils {
    const validateNumericalInputs: (e: React.ChangeEvent<HTMLInputElement>, allowNegative?: boolean) => void;
    const isPrintableAsAscii: (byte: number) => boolean;
}
export declare namespace Interfaces {
    interface MemoryReadResult {
        bytes: LabeledUint8Array;
        address: Long;
    }
    interface WidgetMemoryState extends MemoryReadResult {
        variables: VariableRange[];
    }
    interface MemoryOptions {
        address: string | number;
        offset: number;
        length: number;
        byteSize: number;
        bytesPerGroup: number;
        groupsPerRow: number;
        endianness: Endianness;
        doDisplaySettings: boolean;
        doUpdateAutomatically: boolean;
        columnsDisplayed: ColumnsDisplayed;
        recentLocationsArray: string[];
        isFrozen: boolean;
    }
    interface MoreMemoryOptions {
        numBytes: number;
        direction: 'above' | 'below';
    }
    enum Endianness {
        Little = "Little Endian",
        Big = "Big Endian"
    }
    interface LabeledUint8Array extends Uint8Array {
        label?: string;
    }
    interface StylableNodeAttributes {
        className?: string;
        style?: React.CSSProperties;
        variable?: VariableDecoration;
        title?: string;
        isHighlighted?: boolean;
    }
    interface FullNodeAttributes extends StylableNodeAttributes {
        content: string;
    }
    interface BitDecorator {
        (...args: any[]): Partial<FullNodeAttributes>;
    }
    interface RowDecorator {
        (...args: any[]): Partial<StylableNodeAttributes>;
    }
    interface ByteFromChunkData {
        address: Long;
        /**
         * A single eight-bit byte
         */
        value: string;
    }
    interface Column {
        label: string;
        doRender: boolean;
    }
    interface ColumnIDs {
        label: string;
        id: string;
    }
    interface ColumnsDisplayed {
        [id: string]: Column;
    }
}
export declare const MemoryWidgetOptions: unique symbol;
export interface MemoryWidgetOptions {
    identifier: string | number;
    displayId?: string | number;
    dynamic?: boolean;
}
export declare const MemoryDiffWidgetData: unique symbol;
export interface MemoryDiffWidgetData extends MemoryWidgetOptions {
    beforeAddress: Long;
    beforeBytes: Interfaces.LabeledUint8Array;
    beforeVariables: VariableRange[];
    afterAddress: Long;
    afterBytes: Interfaces.LabeledUint8Array;
    afterVariables: VariableRange[];
    dynamic: false;
    titles: [string, string];
}
export declare const RegisterWidgetOptions: unique symbol;
export type RegisterWidgetOptions = MemoryWidgetOptions;
//# sourceMappingURL=memory-widget-utils.d.ts.map