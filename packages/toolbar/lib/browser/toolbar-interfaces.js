"use strict";
// *****************************************************************************
// Copyright (C) 2022 Ericsson and others.
//
// This program and the accompanying materials are made available under the
// terms of the Eclipse Public License v. 2.0 which is available at
// http://www.eclipse.org/legal/epl-2.0.
//
// This Source Code may also be made available under the following Secondary
// Licenses when the conditions for such availability set forth in the Eclipse
// Public License v. 2.0 are satisfied: GNU General Public License, version 2
// with the GNU Classpath Exception which is available at
// https://www.gnu.org/software/classpath/license.html.
//
// SPDX-License-Identifier: EPL-2.0 OR GPL-2.0-only WITH Classpath-exception-2.0
// *****************************************************************************
Object.defineProperty(exports, "__esModule", { value: true });
exports.IconSet = exports.lateInjector = exports.LateInjector = exports.ToolbarFactory = exports.Toolbar = exports.ToolbarContribution = exports.ToolbarAlignmentString = exports.ToolbarAlignment = void 0;
var ToolbarAlignment;
(function (ToolbarAlignment) {
    ToolbarAlignment["LEFT"] = "left";
    ToolbarAlignment["CENTER"] = "center";
    ToolbarAlignment["RIGHT"] = "right";
})(ToolbarAlignment || (exports.ToolbarAlignment = ToolbarAlignment = {}));
var ToolbarAlignmentString;
(function (ToolbarAlignmentString) {
    ToolbarAlignmentString.is = (obj) => obj === ToolbarAlignment.LEFT
        || obj === ToolbarAlignment.CENTER
        || obj === ToolbarAlignment.RIGHT;
})(ToolbarAlignmentString || (exports.ToolbarAlignmentString = ToolbarAlignmentString = {}));
exports.ToolbarContribution = Symbol('ToolbarContribution');
exports.Toolbar = Symbol('Toolbar');
exports.ToolbarFactory = Symbol('ToolbarFactory');
;
exports.LateInjector = Symbol('LateInjector');
const lateInjector = (context, serviceIdentifier) => context.get(serviceIdentifier);
exports.lateInjector = lateInjector;
var IconSet;
(function (IconSet) {
    IconSet["FA"] = "fa";
    IconSet["CODICON"] = "codicon";
})(IconSet || (exports.IconSet = IconSet = {}));
//# sourceMappingURL=toolbar-interfaces.js.map