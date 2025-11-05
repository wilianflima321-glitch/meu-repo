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
exports.hexStrToUnsignedLong = void 0;
const tslib_1 = require("tslib");
const long_1 = tslib_1.__importDefault(require("long"));
/**
 * Parse `hexStr` as an hexadecimal string (with or without the leading 0x)
 * and return the value as a Long.
 */
function hexStrToUnsignedLong(hexStr) {
    if (hexStr.trim().length === 0) {
        return new long_1.default(0, 0, true);
    }
    return long_1.default.fromString(hexStr, true, 16);
}
exports.hexStrToUnsignedLong = hexStrToUnsignedLong;
//# sourceMappingURL=util.js.map