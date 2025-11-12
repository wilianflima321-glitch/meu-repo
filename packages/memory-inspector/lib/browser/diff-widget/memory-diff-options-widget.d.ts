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
import { ThemeType } from '@theia/core/lib/common/theme';
import { MemoryOptionsWidget } from '../memory-widget/memory-options-widget';
import { Interfaces, MemoryDiffWidgetData } from '../utils/memory-widget-utils';
export interface DiffMemoryOptions extends Interfaces.MemoryOptions {
    beforeOffset: number;
    afterOffset: number;
}
export declare class MemoryDiffOptionsWidget extends MemoryOptionsWidget {
    protected memoryWidgetOptions: MemoryDiffWidgetData;
    protected themeType: ThemeType;
    get options(): DiffMemoryOptions;
    updateDiffData(newDiffData: Partial<MemoryDiffWidgetData>): void;
    protected init(): void;
    protected acceptFocus(): void;
    protected renderMemoryLocationGroup(): React.ReactNode;
    protected getObligatoryColumnIds(): string[];
    protected doRefresh: (event: React.KeyboardEvent<HTMLInputElement> | React.MouseEvent<HTMLButtonElement, MouseEvent>) => void;
    storeState(): DiffMemoryOptions;
}
//# sourceMappingURL=memory-diff-options-widget.d.ts.map