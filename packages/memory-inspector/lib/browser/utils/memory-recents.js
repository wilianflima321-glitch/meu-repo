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
exports.Recents = void 0;
class Recents {
    get values() {
        return this._values;
    }
    constructor(initialValues, opts) {
        var _a;
        this._values = [];
        this.maxValues = (_a = opts === null || opts === void 0 ? void 0 : opts.maxValues) !== null && _a !== void 0 ? _a : 10;
        if (initialValues) {
            if (initialValues.length <= this.maxValues) {
                this._values = initialValues;
                return;
            }
            console.error('Initial values length is greater than allowed length, resetting to empty array');
        }
        this._values = [];
    }
    add(locationString) {
        const indexOf = this.has(locationString);
        if (indexOf > -1) {
            this._values.splice(indexOf, 1);
        }
        else {
            if (this._values.length === this.maxValues) {
                this._values.shift();
            }
        }
        this._values.push(locationString);
    }
    has(locationString) {
        return this._values.indexOf(locationString);
    }
}
exports.Recents = Recents;
//# sourceMappingURL=memory-recents.js.map