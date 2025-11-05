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
const tslib_1 = require("tslib");
const util_1 = require("./util");
const chai_1 = require("chai");
const long_1 = tslib_1.__importDefault(require("long"));
describe('utils', function () {
    it('#hexStrToUnsignedLong', function () {
        let val = (0, util_1.hexStrToUnsignedLong)('');
        (0, chai_1.expect)(val).eql(new long_1.default(0, 0, true));
        val = (0, util_1.hexStrToUnsignedLong)('0x');
        (0, chai_1.expect)(val).eql(new long_1.default(0, 0, true));
        val = (0, util_1.hexStrToUnsignedLong)('0x0');
        (0, chai_1.expect)(val).eql(new long_1.default(0, 0, true));
        val = (0, util_1.hexStrToUnsignedLong)('0x1');
        (0, chai_1.expect)(val).eql(new long_1.default(0x1, 0, true));
        val = (0, util_1.hexStrToUnsignedLong)('0x12345678abcd');
        (0, chai_1.expect)(val).eql(new long_1.default(0x5678abcd, 0x1234, true));
        val = (0, util_1.hexStrToUnsignedLong)('0x12345678abcd1234');
        (0, chai_1.expect)(val).eql(new long_1.default(0xabcd1234, 0x12345678, true));
    });
    it('should handle -1 correctly', () => {
        const val = (0, util_1.hexStrToUnsignedLong)('-0x1');
        (0, chai_1.expect)(val).eql(long_1.default.fromInt(-1, true));
    });
    it('should handle long decimal numbers (up to 2^64-1)', () => {
        const input = '18446744073709551615';
        const val = long_1.default.fromString(input, true, 10);
        (0, chai_1.expect)(val.toString(10)).eql(input);
    });
});
//# sourceMappingURL=utils.spec.js.map