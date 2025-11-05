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
exports.RegisterWidgetOptions = exports.MemoryDiffWidgetData = exports.MemoryWidgetOptions = exports.Interfaces = exports.Utils = exports.Constants = void 0;
var Constants;
(function (Constants) {
    Constants.DEBOUNCE_TIME = 200;
    Constants.ERROR_TIMEOUT = 5000;
})(Constants || (exports.Constants = Constants = {}));
var Utils;
(function (Utils) {
    Utils.validateNumericalInputs = (e, allowNegative = true) => {
        const toReplace = allowNegative ? /[^\d-]/g : /[^\d]/g;
        e.target.value = e.target.value.replace(toReplace, '');
    };
    Utils.isPrintableAsAscii = (byte) => byte >= 32 && byte < (128 - 1);
})(Utils || (exports.Utils = Utils = {}));
var Interfaces;
(function (Interfaces) {
    let Endianness;
    (function (Endianness) {
        Endianness["Little"] = "Little Endian";
        Endianness["Big"] = "Big Endian";
    })(Endianness = Interfaces.Endianness || (Interfaces.Endianness = {}));
})(Interfaces || (exports.Interfaces = Interfaces = {}));
exports.MemoryWidgetOptions = Symbol('MemoryWidgetOptions');
exports.MemoryDiffWidgetData = Symbol('MemoryDiffWidgetData');
exports.RegisterWidgetOptions = Symbol('RegisterWidgetData');
//# sourceMappingURL=memory-widget-utils.js.map