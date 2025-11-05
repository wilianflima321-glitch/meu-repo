/********************************************************************************
 * Copyright (C) 2019 Ericsson and others.
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
import { VariableRange } from '../utils/memory-widget-variable-utils';
import { AbstractMemoryProvider } from './memory-provider';
/**
 * @file this file exists to show the customizations possible for specific debug adapters. Within the confines of the DebugAdapterProtocol, different adapters can behave
 * quite differently. In particular, they can differ in the kinds of expressions that they treat as references (in the `memoryReference` field of MemoryReadArguments, for example)
 * and the kinds of expressions that they can evaluate (for example to assist in determining the size of variables). The `MemoryProvider` type exists to allow applications
 * to enhance the base functionality of the Memory Inspector by tapping into specifics of known adapters.
 */
/**
 * Read memory through the current debug session, using the cdt-gdb-adapter
 * extension to read memory.
 */
export declare class CDTGDBMemoryProvider extends AbstractMemoryProvider {
    canHandle(session: DebugSession): boolean;
    getLocals(session: DebugSession | undefined): Promise<VariableRange[]>;
    supportsVariableReferenceSyntax(session: DebugSession, currentLevel?: DebugVariable): boolean;
    formatVariableReference(session: DebugSession, currentLevel?: DebugVariable): string;
}
//# sourceMappingURL=cdt-gdb-memory-provider.d.ts.map