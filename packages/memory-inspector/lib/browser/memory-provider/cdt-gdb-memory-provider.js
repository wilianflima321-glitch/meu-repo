"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.CDTGDBMemoryProvider = void 0;
const tslib_1 = require("tslib");
const inversify_1 = require("@theia/core/shared/inversify");
const debug_console_items_1 = require("@theia/debug/lib/browser/console/debug-console-items");
const util_1 = require("../../common/util");
const memory_provider_1 = require("./memory-provider");
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
let CDTGDBMemoryProvider = class CDTGDBMemoryProvider extends memory_provider_1.AbstractMemoryProvider {
    canHandle(session) {
        return session.configuration.type === 'gdb';
    }
    async getLocals(session) {
        if (session === undefined) {
            console.warn('No active debug session.');
            return [];
        }
        const frame = session.currentFrame;
        if (frame === undefined) {
            throw new Error('No active stack frame.');
        }
        const ranges = [];
        const scopes = await frame.getScopes();
        const scopesWithoutRegisters = scopes.filter(x => x.render() !== 'Registers');
        for (const scope of scopesWithoutRegisters) {
            const variables = await scope.getElements();
            for (const v of variables) {
                if (v instanceof debug_console_items_1.DebugVariable) {
                    const addrExp = `&${v.name}`;
                    const sizeExp = `sizeof(${v.name})`;
                    const addrResp = await session.sendRequest('evaluate', {
                        expression: addrExp,
                        context: 'watch',
                        frameId: frame.raw.id,
                    }).catch(e => { console.warn(`Failed to evaluate ${addrExp}. Corresponding variable will be omitted from Memory Inspector display.`, e); });
                    if (!addrResp) {
                        continue;
                    }
                    const sizeResp = await session.sendRequest('evaluate', {
                        expression: sizeExp,
                        context: 'watch',
                        frameId: frame.raw.id,
                    }).catch(e => { console.warn(`Failed to evaluate ${sizeExp}. Corresponding variable will be omitted from Memory Inspector display.`, e); });
                    if (!sizeResp) {
                        continue;
                    }
                    // Make sure the address is in the format we expect.
                    const addressPart = /0x[0-9a-f]+/i.exec(addrResp.body.result);
                    if (!addressPart) {
                        continue;
                    }
                    if (!/^[0-9]+$/.test(sizeResp.body.result)) {
                        continue;
                    }
                    const size = parseInt(sizeResp.body.result);
                    const address = (0, util_1.hexStrToUnsignedLong)(addressPart[0]);
                    const pastTheEndAddress = address.add(size);
                    ranges.push({
                        name: v.name,
                        address,
                        pastTheEndAddress,
                        type: v.type,
                        value: v.value,
                    });
                }
            }
        }
        return ranges;
    }
    supportsVariableReferenceSyntax(session, currentLevel) {
        if (this.canHandle(session)) {
            if (!currentLevel) {
                return false;
            }
            while (currentLevel.parent instanceof debug_console_items_1.DebugVariable) {
                currentLevel = currentLevel.parent;
            }
            return currentLevel.parent instanceof debug_console_items_1.DebugScope && currentLevel.parent['raw'].name === 'Local';
        }
        return false;
    }
    formatVariableReference(session, currentLevel) {
        if (currentLevel && this.canHandle(session)) {
            let { name } = currentLevel;
            while (currentLevel.parent instanceof debug_console_items_1.DebugVariable) {
                const separator = name.startsWith('[') ? '' : '.';
                currentLevel = currentLevel.parent;
                if (name.startsWith(`*${currentLevel.name}.`)) { // Theia has added a layer of pointer dereferencing
                    name = name.replace(`*${currentLevel.name}.`, `(*${currentLevel.name})->`);
                }
                else if (name.startsWith(`*${currentLevel.name}`)) {
                    // that's fine, it's what you clicked on and probably what you want to see.
                }
                else {
                    name = `${currentLevel.name}${separator}${name}`;
                }
            }
            return `&(${name})`;
        }
        return '';
    }
};
exports.CDTGDBMemoryProvider = CDTGDBMemoryProvider;
exports.CDTGDBMemoryProvider = CDTGDBMemoryProvider = tslib_1.__decorate([
    (0, inversify_1.injectable)()
], CDTGDBMemoryProvider);
//# sourceMappingURL=cdt-gdb-memory-provider.js.map