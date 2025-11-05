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
import { MWLabelProps } from './memory-widget-components';
export interface SingleSelectItemProps {
    id: string;
    label: string;
    defaultChecked?: boolean;
}
interface MultiSelectBarProps {
    items: SingleSelectItemProps[];
    id?: string;
    onSelectionChanged: (labelSelected: string, newSelectionState: boolean) => unknown;
}
export declare const MultiSelectBar: React.FC<MultiSelectBarProps>;
export declare const MWMultiSelect: React.FC<MWLabelProps & MultiSelectBarProps>;
export {};
//# sourceMappingURL=multi-select-bar.d.ts.map