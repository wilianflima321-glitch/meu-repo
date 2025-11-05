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
export declare enum AllOrCustom {
    All = "All",
    Custom = "Custom"
}
export declare const RegisterFilterService: unique symbol;
export interface RegisterFilterService {
    currentFilterLabel: string;
    filterLabels: string[];
    setFilter(filterLabel: string): void;
    shouldDisplayRegister(registerName: string): boolean;
    currentFilterRegisters(): string[];
}
export declare const RegisterFilterServiceOptions: unique symbol;
export interface RegisterFilterServiceOptions {
    [key: string]: string[];
}
export declare class RegisterFilterServiceImpl implements RegisterFilterService {
    protected readonly options: RegisterFilterServiceOptions;
    protected filters: Map<string, Set<string> | undefined>;
    protected currentFilter: string;
    get filterLabels(): string[];
    get currentFilterLabel(): string;
    protected init(): void;
    setFilter(filterLabel: string): void;
    shouldDisplayRegister(registerName: string): boolean;
    currentFilterRegisters(): string[];
}
//# sourceMappingURL=register-filter-service.d.ts.map