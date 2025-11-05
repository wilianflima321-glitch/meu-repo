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
import { Interfaces } from './memory-widget-utils';
export interface MWLabelProps {
    id: string;
    label: string;
    disabled?: boolean;
    classNames?: string[];
}
export declare const MWLabel: React.FC<MWLabelProps>;
export interface InputProps<T extends HTMLElement = HTMLElement> {
    id: string;
    label: string;
    defaultValue?: string;
    value?: string;
    onChange?: React.EventHandler<React.ChangeEvent>;
    onKeyDown?: React.EventHandler<React.KeyboardEvent<HTMLInputElement>>;
    passRef?: React.ClassAttributes<T>['ref'];
    title?: string;
    disabled?: boolean;
    placeholder?: string;
}
export declare const MWInput: React.FC<InputProps<HTMLInputElement>>;
export interface LabelAndSelectProps extends InputProps<HTMLSelectElement> {
    options: string[];
}
export declare const MWSelect: React.FC<LabelAndSelectProps>;
export interface LabelAndSelectWithNameProps extends InputProps<HTMLSelectElement> {
    options: Array<[string, string]>;
}
export declare const MWSelectWithName: React.FC<LabelAndSelectWithNameProps>;
export interface InputWithSelectProps<T extends HTMLElement> extends InputProps<T> {
    options: string[];
    onSelectChange?(e: React.ChangeEvent): void;
    onInputChange?(e: React.ChangeEvent<HTMLInputElement>): void;
}
export declare const MWInputWithSelect: React.FC<InputWithSelectProps<HTMLInputElement>>;
export interface MoreMemoryProps {
    options: number[];
    direction: 'above' | 'below';
    handler(opts: Interfaces.MoreMemoryOptions): void;
}
export declare const MWMoreMemorySelect: React.FC<MoreMemoryProps>;
//# sourceMappingURL=memory-widget-components.d.ts.map