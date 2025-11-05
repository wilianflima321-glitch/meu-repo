"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.getRegisters = exports.VariableFinder = void 0;
const tslib_1 = require("tslib");
const debug_console_items_1 = require("@theia/debug/lib/browser/console/debug-console-items");
const long_1 = tslib_1.__importDefault(require("long"));
class VariableFinder {
    constructor(variables, highContrast = false) {
        this.HIGH_CONTRAST_COLORS = [
            'var(--theia-contrastActiveBorder)',
            'var(--theia-contrastBorder)',
        ];
        this.NON_HC_COLORS = [
            'var(--theia-terminal-ansiBlue)',
            'var(--theia-terminal-ansiGreen)',
            'var(--theia-terminal-ansiRed)',
            'var(--theia-terminal-ansiYellow)',
            'var(--theia-terminal-ansiMagenta)',
        ];
        this.currentIndex = -1;
        this.currentVariable = undefined;
        this.handledVariables = new Map();
        this.lastCall = long_1.default.MAX_UNSIGNED_VALUE;
        this.variables = variables.sort((a, b) => a.address.lessThan(b.address) ? -1 : 1);
        this.workingColors = highContrast ? this.HIGH_CONTRAST_COLORS : this.NON_HC_COLORS;
    }
    /**
     * @param address the address of interest.
     *
     * This function should be called with a sequence of addresses in increasing order
     */
    getVariableForAddress(address) {
        if (address.lessThan(this.lastCall)) {
            this.initialize(address);
        }
        this.lastCall = address;
        if (this.currentVariable && address.greaterThanOrEqual(this.currentVariable.pastTheEndAddress)) {
            this.currentIndex += 1;
            this.currentVariable = this.variables[this.currentIndex];
        }
        if (!this.currentVariable) {
            return undefined;
        }
        const { name } = this.currentVariable;
        // const color = `hsl(${HSL_BASIS * this.currentIndex / this.variables.length}, 60%, 60%)`;
        const color = this.workingColors[this.currentIndex % this.workingColors.length];
        const decoration = {
            name,
            color,
            firstAppearance: this.handledVariables.get(name) === address || !this.handledVariables.has(name),
        };
        if (address.greaterThanOrEqual(this.currentVariable.address) && address.lessThan(this.currentVariable.pastTheEndAddress)) {
            this.handledVariables.set(name, address);
            return decoration;
        }
        return undefined;
    }
    initialize(address) {
        this.handledVariables.clear();
        const firstCandidateIndex = this.variables.findIndex(variable => address.lessThan(variable.pastTheEndAddress));
        if (firstCandidateIndex === -1) {
            this.currentIndex = this.variables.length;
        }
        else {
            this.currentVariable = this.variables[firstCandidateIndex];
            this.currentIndex = firstCandidateIndex;
        }
    }
    searchForVariable(addressOrName) {
        if (typeof addressOrName === 'string') {
            return this.variables.find(variable => variable.name === addressOrName);
        }
        let upperLimit = this.variables.length - 1;
        let lowerLimit = 0;
        while (upperLimit >= lowerLimit) {
            const target = Math.floor((lowerLimit + upperLimit) / 2);
            const candidate = this.variables[target];
            if (addressOrName >= candidate.address && addressOrName < candidate.pastTheEndAddress) {
                return candidate;
            }
            if (addressOrName < candidate.address) {
                upperLimit = target - 1;
            }
            if (addressOrName >= candidate.pastTheEndAddress) {
                lowerLimit = target + 1;
            }
        }
        return undefined;
    }
}
exports.VariableFinder = VariableFinder;
/**
 * Get the Registers of the currently selected frame.
 */
async function getRegisters(session) {
    if (session === undefined) {
        console.warn('No active debug session.');
        return [];
    }
    const frame = session.currentFrame;
    if (frame === undefined) {
        throw new Error('No active stack frame.');
    }
    const registers = [];
    const scopes = await frame.getScopes();
    const regScope = scopes.find(x => x.render() === 'Registers');
    if (regScope !== undefined) {
        const handleRegisterScope = async (scope) => {
            const variables = await scope.getElements();
            for (const v of variables) {
                if (v instanceof debug_console_items_1.DebugVariable) {
                    try {
                        BigInt(v.value); // Make sure the value looks like a numerical value
                        registers.push(v);
                    }
                    catch {
                        handleRegisterScope(v);
                    }
                }
            }
        };
        handleRegisterScope(regScope);
    }
    else {
        throw new Error('No Register scope in active stack frame.');
    }
    return registers;
}
exports.getRegisters = getRegisters;
//# sourceMappingURL=memory-widget-variable-utils.js.map