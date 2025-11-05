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
import { ContributionProvider } from '@theia/core';
import { DebugVariable } from '@theia/debug/lib/browser/console/debug-console-items';
import { DebugSession } from '@theia/debug/lib/browser/debug-session';
import { DebugSessionManager } from '@theia/debug/lib/browser/debug-session-manager';
import { DebugProtocol } from '@vscode/debugprotocol';
import { Interfaces } from '../utils/memory-widget-utils';
import { VariableRange } from '../utils/memory-widget-variable-utils';
import { DefaultMemoryProvider, MemoryProvider } from './memory-provider';
export declare class MemoryProviderService {
    protected readonly sessionManager: DebugSessionManager;
    protected readonly defaultProvider: DefaultMemoryProvider;
    protected readonly contributions: ContributionProvider<MemoryProvider>;
    readMemory(readMemoryArguments: DebugProtocol.ReadMemoryArguments): Promise<Interfaces.MemoryReadResult>;
    writeMemory(writeMemoryArguments: DebugProtocol.WriteMemoryArguments): Promise<DebugProtocol.WriteMemoryResponse>;
    getLocals(): Promise<VariableRange[]>;
    supportsVariableReferenceSyntax(variable?: DebugVariable): boolean;
    formatVariableReference(variable?: DebugVariable): string;
    /** @throws with {@link message} if there is no active debug session. */
    protected getSession(message: string): DebugSession;
    protected getProvider(session: DebugSession, ensure?: keyof MemoryProvider): Required<MemoryProvider>;
}
//# sourceMappingURL=memory-provider-service.d.ts.map